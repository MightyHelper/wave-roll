import * as PIXI from "pixi.js";
import type { NoteData } from "@/lib/midi/types";
import type { PianoRoll } from "../piano-roll";

// Minimal NoteSprite class that encapsulates pointer handlers and
// exposes small helpers for updating geometry and style.
export class NoteSprite extends PIXI.Sprite {
  noteData?: NoteData;
  private readonly pianoRoll?: PianoRoll;

  constructor(baseTexture: PIXI.Texture<PIXI.BufferImageSource>, pianoRoll?: PianoRoll) {
    super(baseTexture as any);
    this.pianoRoll = pianoRoll;
    // Pixi v8: enable hit-testing
    this.eventMode = "static";
    this.cursor = "pointer";


    // Pointer events for tooltip (use pianoRoll methods if provided)
    this.on("pointerover", (e: PIXI.FederatedPointerEvent) => this.pianoRoll.showNoteTooltip(this.noteData, e));
    this.on("pointermove", (e: PIXI.FederatedPointerEvent) => this.pianoRoll.moveTooltip(e));
    this.on("pointerout", () => this.pianoRoll.hideTooltip());
  }

  updateGeometry(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  applyStyle(tint: number, alpha: number, blendMode: PIXI.BLEND_MODES | string) {
    this.tint = tint;
    this.alpha = alpha;
    // allow string blendModes (existing code uses "add"/"normal")
    // but typed BLEND_MODES are numeric - accept either
    // @ts-ignore - assign as any to preserve old usage patterns
    this.blendMode = blendMode as any;
  }
}
