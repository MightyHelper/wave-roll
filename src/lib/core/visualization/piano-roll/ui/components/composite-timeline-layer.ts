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
  private sprite: PIXI.Sprite;

  // Child layers that hold actual display objects
  public notesLayer: NotesLayer;
  public sustainLayer: SustainLayer;
  public overlapOverlay: PIXI.Graphics;

  constructor(notesLayer: NotesLayer, sustainLayer: SustainLayer, overlapOverlay?: PIXI.Graphics) {
    super();
    this.sortableChildren = true;
    this.zIndex = 9; // below playhead and loop overlays, above background

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
      this.renderTexture = PIXI.RenderTexture.create({ width: pr.options.width, height: usableHeight, resolution: pr.app.renderer.resolution });
      this.sprite.texture = this.renderTexture;
      this.sprite.x = 0;
      this.sprite.y = 0;
    }
  }

  /**
   * Renders the staging container (notes + sustains + overlaps) into an offscreen
   * texture sized to exclude the waveform band at the bottom.
   */
  public render(pr: PianoRoll): void {
    this.ensureRenderTexture(pr);

    // Apply pan/zoom via staging transforms around stable anchors
    const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
    const bandPadding = 6;
    const bandHeight = Math.max(24, Math.min(96, Math.floor(pr.options.height * 0.22)));
    const usableHeight = Math.max(0, pr.options.height - (bandPadding + bandHeight));
    const pivotY = Math.floor(usableHeight / 2);

    // @ts-expect-error internal staging reference
    const staging: PIXI.Container = this._staging;
    staging.pivot.set(pianoKeysOffset, pivotY);
    staging.position.set(pianoKeysOffset + pr.state.panX, pivotY + pr.state.panY);
    staging.scale.set(pr.state.zoomX, pr.state.zoomY);

    // Render offscreen
    pr.app.renderer.render({ container: staging, target: this.renderTexture!, clear: true });
  }
}
