import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import { createCoordinateTransform, ColorCalculator, DrawingPrimitives, textCache } from "../../utils";
import { COLOR_LOOP_LINE_A, COLOR_LOOP_LINE_B, COLOR_LOOP_SHADE } from "@/lib/core/constants";

/**
 * LoopOverlayLayer renders the A/B loop marker lines, labels, and the shaded overlay.
 */
export class LoopOverlayLayer extends PIXI.Container {
  public overlay: PIXI.Graphics;
  public labelContainer: PIXI.Container;
  public loopLines: { start: PIXI.Graphics; end: PIXI.Graphics };

  constructor() {
    super();
    this.sortableChildren = true;
    this.zIndex = 600;

    this.overlay = new PIXI.Graphics();
    this.overlay.zIndex = 500;
    this.addChild(this.overlay);

    this.labelContainer = new PIXI.Container();
    this.labelContainer.zIndex = 600;
    this.addChild(this.labelContainer);

    const startLine = new PIXI.Graphics();
    const endLine = new PIXI.Graphics();
    startLine.zIndex = 600;
    endLine.zIndex = 600;
    this.addChild(startLine);
    this.addChild(endLine);
    this.loopLines = { start: startLine, end: endLine };
  }

  public render(pr: PianoRoll): void {
    const transform = createCoordinateTransform(pr);

    // Clear previous
    this.labelContainer.removeChildren();
    this.overlay.clear();
    this.overlay.removeChildren();
    this.loopLines.start.clear();
    this.loopLines.start.removeChildren();
    this.loopLines.end.clear();
    this.loopLines.end.removeChildren();

    let startX: number | null = null;
    let endX: number | null = null;

    const lineWidth = 3;

    const drawDashed = (g: PIXI.Graphics, x: number, color: number, segLen = 10, gapLen = 6) => {
      let y = 0;
      while (y < pr.options.height) {
        const y2 = Math.min(y + segLen, pr.options.height);
        g.moveTo(x, y);
        g.lineTo(x, y2);
        g.stroke({ width: lineWidth + 2, color: 0xffffff, alpha: 0.95 });
        g.moveTo(x, y);
        g.lineTo(x, y2);
        g.stroke({ width: lineWidth, color, alpha: 1 });
        y = y2 + gapLen;
      }
    };

    const drawLine = (g: PIXI.Graphics, x: number, color: number, label: string) => {
      g.moveTo(x, 0);
      g.lineTo(x, pr.options.height);
      g.stroke({ width: lineWidth + 2, color: 0xffffff, alpha: 0.95 });
      g.moveTo(x, 0);
      g.lineTo(x, pr.options.height);
      g.stroke({ width: lineWidth, color, alpha: 1 });

      const text = textCache.getText(label, { fontSize: 11, fill: color, align: "center" });
      text.x = x + 2;
      text.y = 0;
      this.labelContainer.addChild(text);
    };

    if (pr.loopStart !== null) {
      startX = transform.timeToPixel(pr.loopStart) + pr.state.panX;
      const colA = ColorCalculator.hexToNumber(COLOR_LOOP_LINE_A);
      drawDashed(this.loopLines.start, startX, colA, 14, 8);
      drawLine(this.loopLines.start, startX, colA, `A(${pr.loopStart.toFixed(1)}s)`);
    }

    if (pr.loopEnd !== null) {
      endX = transform.timeToPixel(pr.loopEnd) + pr.state.panX;
      const colB = ColorCalculator.hexToNumber(COLOR_LOOP_LINE_B);
      drawDashed(this.loopLines.end, endX, colB, 2, 4);
      drawLine(this.loopLines.end, endX, colB, `B(${pr.loopEnd.toFixed(1)}s)`);
    }

    if (startX !== null && endX !== null) {
      const overlayColor = ColorCalculator.hexToNumber(COLOR_LOOP_SHADE);
      DrawingPrimitives.drawRectangle(this.overlay, { x: startX, y: 0, width: Math.max(0, endX - startX), height: pr.options.height }, { color: overlayColor, alpha: 0.22 });
    }
  }
}
