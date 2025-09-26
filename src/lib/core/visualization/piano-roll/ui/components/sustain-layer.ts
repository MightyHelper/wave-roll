import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import { ControlChangeEvent } from "@/lib/midi/types";
import { getColorForFile } from "../../utils/get-color-for-file";
import { SUSTAIN_CONTROLLER } from "@/core/constants";

/**
 * SustainLayer encapsulates sustain pedal overlay rendering.
 */
export class SustainLayer extends PIXI.Container {
  public overlay: PIXI.Graphics;

  constructor() {
    super();
    this.sortableChildren = true;
    this.zIndex = 5;

    this.overlay = new PIXI.Graphics();
    this.overlay.zIndex = -10; // below notes sprites
    this.addChild(this.overlay);
  }

  public render(pr: PianoRoll): void {
    const g = this.overlay;
    g.clear();

    const sustainEvents = pr.controlChanges
      .filter((cc) => cc.controller === SUSTAIN_CONTROLLER)
      .sort((a, b) => a.time - b.time);

    const grouped: Record<string, ControlChangeEvent[]> = {};
    sustainEvents.forEach((cc) => {
      const fid = cc.fileId ?? "_unknown";
      (grouped[fid] = grouped[fid] || []).push(cc);
    });

    const pianoKeysOffset = pr.options.showPianoKeys ? 60 : 0;
    const pxPerSec = pr.timeScale(1) * pr.state.zoomX;

    const colorCache: Record<string, number> = {};

    type Segment = { start: number; end: number; fid: string };
    const segments: Segment[] = [];

    Object.entries(grouped).forEach(([fid, events]) => {
      let isDown = false;
      let segStart = 0;
      events.forEach((cc) => {
        if (cc.value >= 0.5) {
          if (!isDown) {
            isDown = true;
            segStart = cc.time;
          }
        } else if (isDown) {
          segments.push({ start: segStart, end: cc.time, fid });
          isDown = false;
        }
      });

      if (isDown) {
        const lastNoteEnd = pr.notes.length
          ? Math.max(...pr.notes.map((n) => n.time + n.duration))
          : events[events.length - 1].time;
        segments.push({ start: segStart, end: lastNoteEnd, fid });
      }
    });

    segments.forEach(({ start, end, fid }) => {
      if (end <= start) return;
      const x = start * pxPerSec + pr.state.panX + pianoKeysOffset;
      const width = (end - start) * pxPerSec;
      if (width <= 0) return;

      const color = (pr as any).fileColors?.[fid] ?? getColorForFile(pr, fid, colorCache);
      const alpha = 0.2;

      g.rect(x, 0, width, pr.options.height);
      g.fill({ color, alpha });
    });
  }
}
