import * as PIXI from "pixi.js";
import type { PianoRoll } from "../../piano-roll";
import { renderNotes } from "../../renderers/notes";

/**
 * NotesLayer encapsulates the notes container. For now it delegates drawing to
 * the existing renderNotes() function to avoid large migration risk. Later we can
 * move the renderer logic fully inside this class.
 */
export class NotesLayer extends PIXI.Container {
  constructor() {
    super();
    this.sortableChildren = true;
    this.zIndex = 10;
  }

  public render(pr: PianoRoll): void {
    renderNotes(pr);
  }
}
