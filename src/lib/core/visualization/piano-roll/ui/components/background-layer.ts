import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import {
  CoordinateTransform,
  DrawingPrimitives,
  textCache,
} from "../../utils";
import { getWaveRollAudioAPI, WaveRollAudioAPI } from "@/core/waveform/register";
import { PeakDatum } from "@/core/waveform/types";

// Loop overlays are handled by LoopOverlayLayer now
const api = getWaveRollAudioAPI();

/**
 * BackgroundLayer encapsulates the grid, labels, waveform band, and loop overlays.
 * It mirrors the previous responsibilities of: backgroundGrid, waveformLayer, waveformKeysLayer,
 * backgroundLabelContainer, loopOverlay, loopLabelContainer, and loopLines.
 */
export class BackgroundLayer extends PIXI.Container {
  public backgroundGrid: PIXI.Graphics;
  public waveformLayer: PIXI.Graphics;
  public waveformKeysLayer: PIXI.Graphics;
  public backgroundLabelContainer: PIXI.Container;

  // Loop overlays removed from this component

  constructor() {
    super();
    this.sortableChildren = true;

    this.backgroundGrid = new PIXI.Graphics();
    this.backgroundGrid.zIndex = 1;
    this.addChild(this.backgroundGrid);

    this.waveformLayer = new PIXI.Graphics();
    this.waveformLayer.zIndex = 0;
    this.addChild(this.waveformLayer);

    this.waveformKeysLayer = new PIXI.Graphics();
    this.waveformKeysLayer.zIndex = 2;
    this.addChild(this.waveformKeysLayer);

    this.backgroundLabelContainer = new PIXI.Container();
    this.backgroundLabelContainer.zIndex = 2;
    this.addChild(this.backgroundLabelContainer);
  }

  public render(pr: PianoRoll): void {
    this.clear();

    // Piano keys background (if enabled)
    if (pr.options.showPianoKeys) this.renderPianoKeyBackground(pr);

    // Time grid
    const timeStep = pr.options.timeStep;
    const minorStep = pr.options.minorTimeStep;
    const maxTime = pr.timeScale.domain()[1];

    const minLabelSpacing = 50;
    const transform = new CoordinateTransform(pr);

    let lastLabelX = -Infinity;
    for (let t = 0; t <= maxTime; t += timeStep) {
      lastLabelX = this.drawGridLine(pr, t, lastLabelX, minLabelSpacing);
    }

    if (minorStep && minorStep < timeStep) {
      const eps = minorStep / 1000;
      for (let t = 0; t <= maxTime + eps; t += minorStep) {
        if (Math.abs(t % timeStep) < eps || Math.abs(timeStep - (t % timeStep)) < eps) continue;
        const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
        const x = pr.timeScale(t) * pr.state.zoomX + pianoKeysOffset + pr.state.panX;
        DrawingPrimitives.drawVerticalLine(this.backgroundGrid, x, pr.options.height, {
          width: 1,
          color: 0xe0e0e0,
          alpha: 0.25,
        });
      }
    }

    // Loop overlays are drawn by LoopOverlayLayer

    // Waveform overlay band
    const height = pr.options.height;
    const pixelsPerSecond = transform.getPixelsPerSecond();
    const secondsPerPixel = 1 / pixelsPerSecond;
    this.waveformLayer.clear();
    this.waveformKeysLayer.clear();
    const visibleRange = transform.getVisibleTimeRange();
    const t0 = visibleRange.timeStart;
    const t1 = visibleRange.timeEnd;
    const step = Math.max(secondsPerPixel, 0.005);
    const bandPadding = 0;
    const bandHeight = Math.max(24, Math.min(96, Math.floor(height * 0.22)));
    const bandTop = height - bandHeight - bandPadding;
    const bandMidY = bandTop + bandHeight * 0.5;
    this.backgroundGrid.moveTo(0, bandTop - 1);
    this.backgroundGrid.lineTo(pr.options.width, bandTop - 1);
    this.backgroundGrid.stroke({ width: 1, color: 0x999999, alpha: 0.5 });
    const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
    this.waveformLayer.rect(pianoKeysOffset, bandTop, Math.max(0, pr.options.width - pianoKeysOffset), bandHeight);
    this.waveformLayer.fill({ color: 0x000000, alpha: 0.04 });
    for (let t = t0; t <= t1; t += step) {
      const x = transform.timeToPixel(t) + pr.state.panX;
      if (x < pianoKeysOffset || x > pr.options.width) continue;
      const p = api.sampleAtTime ? api.sampleAtTime(t) : null;
      if (!p) continue;
      const amp = Math.max(Math.max(0, Math.min(1, p.max)), Math.max(0, Math.min(1, p.min)));
      const halfH = bandHeight * 0.5 * amp;
      this.waveformLayer.moveTo(x, bandMidY - halfH);
      this.waveformLayer.lineTo(x, bandMidY + halfH);
      this.waveformLayer.stroke({ width: 1, color: p.color ?? 0x475569, alpha: 0.8 });
    }
    if (pr.options.showPianoKeys) this.renderPianoKeys(bandHeight, bandTop, bandMidY, pr, pianoKeysOffset, step, transform, api);
  }

  private clear() {
    // Clear previous labels
    this.backgroundLabelContainer.removeChildren();

    // Clear grid & waveform layers
    this.backgroundGrid.removeChildren();
    this.backgroundGrid.clear();
    this.waveformLayer.clear();
    this.waveformKeysLayer.clear();
  }

  private drawGridLine(pr: PianoRoll, t: number, lastLabelX: number, minLabelSpacing: number) {
    const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
    const x = pr.timeScale(t) * pr.state.zoomX + pianoKeysOffset + pr.state.panX;
    const showLabel = x - lastLabelX >= minLabelSpacing;
    if (showLabel) lastLabelX = x;
    DrawingPrimitives.drawVerticalLine(this.backgroundGrid, x, pr.options.height, {
      width: 1,
      color: 0xe0e0e0,
      alpha: 1.0,
    });
    if (showLabel) this.showLabel(t, x, pr);
    return lastLabelX;
  }

  private showLabel(t: number, x: number, pr: PianoRoll) {
    const label = textCache.getText(
      t.toFixed(1) + "s",
      {
        fontSize: 10,
        fill: 0x555555,
        align: "center",
      }
    );
    label.x = x + 2;
    label.y = pr.options.height - 14;
    this.backgroundLabelContainer.addChild(label);
  }

  private renderPianoKeys(bandHeight: number, bandTop: number, bandMidY: number, pr: PianoRoll, pianoKeysOffset: number, step: number, transform: CoordinateTransform, api: WaveRollAudioAPI) {
    const keysBandHeight = bandHeight;
    const keysBandTop = bandTop;
    const keysBandMidY = bandMidY;

    this.waveformKeysLayer.rect(0, keysBandTop, Math.max(0, pr.playheadX), keysBandHeight);
    this.waveformKeysLayer.fill({ color: 0x000000, alpha: 0.04 });

    const tKeys0 = Math.max(0, pr.timeScale.invert((0 - pianoKeysOffset - pr.state.panX) / pr.state.zoomX));
    const tKeys1 = Math.min(pr.timeScale.domain()[1], pr.timeScale.invert((pr.playheadX - pianoKeysOffset - pr.state.panX) / pr.state.zoomX));

    for (let t = tKeys0; t <= tKeys1; t += step) {
      const xKeys = transform.timeToPixel(t) + pr.state.panX;
      if (xKeys < 0 || xKeys >= pr.playheadX) continue;
      const p = api.sampleAtTime(t);
      if (!p) continue;
      const amp = Math.max(
        Math.max(0, Math.min(1, p.max)),
        Math.max(0, Math.min(1, p.min))
      );
      const halfH = keysBandHeight * 0.5 * amp;
      this.waveformKeysLayer.moveTo(xKeys, keysBandMidY - halfH);
      this.waveformKeysLayer.lineTo(xKeys, keysBandMidY + halfH);
      this.waveformKeysLayer.stroke({ width: 1, color: p.color ?? 0x475569, alpha: 0.8 });
    }
  }

  private renderPianoKeyBackground(pr: PianoRoll) {
    const pianoKeysWidth = pr.playheadX;
    this.backgroundGrid.rect(0, 0, pianoKeysWidth, pr.options.height);
    this.backgroundGrid.fill({ color: 0xf0f0f0 });

    // Subtle vertical separator
    this.backgroundGrid.moveTo(pianoKeysWidth + 0.5, 0);
    this.backgroundGrid.lineTo(pianoKeysWidth + 0.5, pr.options.height);
    this.backgroundGrid.stroke({ width: 1, color: 0x999999, alpha: 0.6 });

    // Piano key lines
    for (let midi = pr.options.noteRange.min; midi <= pr.options.noteRange.max; midi++) {
      const yBase = pr.pitchScale(midi);
      const canvasMid = pr.options.height / 2;
      const y = (yBase - canvasMid) * pr.state.zoomY + canvasMid;
      this.backgroundGrid.moveTo(0, y);
      this.backgroundGrid.lineTo(pianoKeysWidth, y);
      this.backgroundGrid.stroke({ width: 1, color: 0xcccccc, alpha: 0.3 });
    }
  }
}
