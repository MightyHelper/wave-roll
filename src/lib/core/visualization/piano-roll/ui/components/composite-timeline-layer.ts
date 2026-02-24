import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import { NotesLayer } from "./notes-layer";
import { SustainLayer } from "./sustain-layer";

/**
 * CompositeTimelineLayer
 * Renders timeline elements (notes, sustains, overlaps) into an offscreen
 * RenderTexture sized to the usable height (excluding waveform band), and
 * then blits it as a Sprite on the main stage. This avoids runtime masks.
 */
export class CompositeTimelineLayer extends PIXI.Container {
  private renderTexture: PIXI.RenderTexture | null = null;
  private readonly sprite: PIXI.Sprite;
  private lastWidth = 0;
  private lastUsableHeight = 0;
  private lastZoomX = 0;
  private lastZoomY = 0;// incremented externally via needsNotesRedraw toggles

  // Child layers that hold actual display objects
  public notesLayer: NotesLayer;
  public sustainLayer: SustainLayer;
  public overlapOverlay: PIXI.Graphics;

  constructor(notesLayer: NotesLayer, sustainLayer: SustainLayer, overlapOverlay?: PIXI.Graphics) {
    super();
    this.sortableChildren = true;
    this.zIndex = 9; // below play-head and loop overlays, above background

    this.notesLayer = notesLayer;
    this.sustainLayer = sustainLayer;
    this.overlapOverlay = overlapOverlay ?? new PIXI.Graphics();

    // Internal staging container for offscreen render
    const staging = new PIXI.Container();
    staging.sortableChildren = true;
    staging.addChild(this.notesLayer);
    staging.addChild(this.sustainLayer);
    staging.addChild(this.overlapOverlay);

    // Keep a reference for rendering
    // @ts-expect-error hidden field for internal use
    this._staging = staging;

    // Sprite that displays the offscreen render texture
    this.sprite = new PIXI.Sprite();
    this.sprite.zIndex = 9;
    this.addChild(this.sprite);
  }

  private ensureRenderTexture(pr: PianoRoll): void {
    const bandPadding = 6;
    const bandHeight = Math.max(24, Math.min(96, Math.floor(pr.options.height * 0.22)));
    const usableHeight = Math.max(0, pr.options.height - (bandPadding + bandHeight));

    if (!this.renderTexture || this.renderTexture.width !== pr.options.width || this.renderTexture.height !== usableHeight) {
      if (this.renderTexture) {
        this.renderTexture.destroy(true);
      }
      this.renderTexture = PIXI.RenderTexture.create({
        width: pr.options.width,
        height: usableHeight,
        resolution: pr.app.renderer.resolution
      });
      this.sprite.texture = this.renderTexture;
      this.sprite.x = 0;
      this.sprite.y = 0;
      this.lastWidth = pr.options.width;
      this.lastUsableHeight = usableHeight;
    }
  }

  /**
   * Renders the staging container (notes + sustains + overlaps) into an offscreen
   * texture sized to exclude the waveform band at the bottom.
   */
  public render(pr: PianoRoll): void {
    this.ensureRenderTexture(pr);

    // Determine whether we must re-render the offscreen buffer
    const mustRedraw =
      pr.needsNotesRedraw ||
      pr.needsSustainRedraw ||
      pr._compositeForceRedraw ||
      this.lastZoomX !== pr.state.zoomX ||
      this.lastZoomY !== pr.state.zoomY ||
      this.lastWidth !== pr.options.width ||
      this.lastUsableHeight !== this.renderTexture!.height;

    if (mustRedraw) {
      // Render staging at origin; pan will be applied by moving the sprite only (cheap)
      // @ts-expect-error internal staging reference
      const staging: PIXI.Container = this._staging;
      staging.pivot.set(0, 0);
      staging.position.set(0, 0);
      staging.scale.set(1, 1);
      pr.app.renderer.render({ container: staging, target: this.renderTexture!, clear: true });

      this.lastZoomX = pr.state.zoomX;
      this.lastZoomY = pr.state.zoomY;
      this.lastWidth = pr.options.width;
      // height already set in ensureRenderTexture
      if (pr._compositeForceRedraw) {
        pr._compositeForceRedraw = false;
      }
    }

    // Cheap pan: just move the blitted sprite
    this.sprite.position.set(pr.state.panX, pr.state.panY);
  }
}
