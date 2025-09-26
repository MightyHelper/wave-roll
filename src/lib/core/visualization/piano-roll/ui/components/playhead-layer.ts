import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import { COLOR_PLAYHEAD, COLOR_PLAYHEAD_OUTLINE } from "@/lib/core/constants";
import { toNumberColor } from "@/components/player/wave-roll/evaluation/colors";

/**
 * PlayheadLayer encapsulates the playhead graphics and its rendering.
 */
export class PlayheadLayer extends PIXI.Container {
  public line: PIXI.Graphics;

  constructor() {
    super();
    this.sortableChildren = true;
    this.zIndex = 1000;

    this.line = new PIXI.Graphics();
    this.line.zIndex = 1000;
    this.addChild(this.line);
  }

  public render(pr: PianoRoll): void {
    const g = this.line;
    g.clear();

    const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
    // Keep playhead fixed right after the piano-keys column
    const playheadX = pianoKeysOffset;
    pr.playheadX = playheadX;

    const coreColor = pr.options.playheadColor ?? toNumberColor(COLOR_PLAYHEAD);
    const haloColor = toNumberColor(COLOR_PLAYHEAD_OUTLINE);

    // Thicker dual-stroke vertical line (with halo)
    g.moveTo(playheadX, 0);
    g.lineTo(playheadX, pr.options.height);
    g.stroke({ width: 7, color: haloColor, alpha: 0.95 });
    g.moveTo(playheadX, 0);
    g.lineTo(playheadX, pr.options.height);
    g.stroke({ width: 3, color: coreColor, alpha: 1 });

    // Top and bottom ticks
    const tickHalf = 6;
    g.moveTo(playheadX - tickHalf - 1, 0);
    g.lineTo(playheadX + tickHalf + 1, 0);
    g.stroke({ width: 5, color: haloColor, alpha: 0.95 });
    g.moveTo(playheadX - tickHalf, 0);
    g.lineTo(playheadX + tickHalf, 0);
    g.stroke({ width: 3, color: coreColor, alpha: 1 });

    const h = pr.options.height;
    g.moveTo(playheadX - tickHalf - 1, h);
    g.lineTo(playheadX + tickHalf + 1, h);
    g.stroke({ width: 5, color: haloColor, alpha: 0.95 });
    g.moveTo(playheadX - tickHalf, h);
    g.lineTo(playheadX + tickHalf, h);
    g.stroke({ width: 3, color: coreColor, alpha: 1 });
  }
}
