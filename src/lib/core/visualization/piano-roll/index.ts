import { NoteData, ControlChangeEvent } from "@/lib/midi/types";
import { PianoRollConfig, PianoRollInstance as PianoRollInstanceType } from "./types";
import { PianoRoll } from "./piano-roll";
import { NoteInterval } from "@/lib/core/controls/utils/overlap";

class PianoRollInstance implements PianoRollInstanceType {
  private pianoRoll: PianoRoll;
  private resizeObserver: ResizeObserver;
  public _instance: PianoRoll;

  constructor(pianoRoll: PianoRoll, container: HTMLElement) {
    this.pianoRoll = pianoRoll;
    this._instance = pianoRoll;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.pianoRoll.resize(Math.floor(width), Math.floor(height));
        }
      }
    });
    this.resizeObserver.observe(container);
  }

  setNotes(newNotes: NoteData[]) {
    this.pianoRoll.setNotes(newNotes);
  }

  setControlChanges?(cc: ControlChangeEvent[]) {
    if (typeof this.pianoRoll.setControlChanges === "function") {
      this.pianoRoll.setControlChanges(cc);
    }
  }

  setTime(time: number) {
    this.pianoRoll.setTime(time);
  }

  zoomX(factor: number) {
    this.pianoRoll.zoomX(factor);
  }

  zoomY(factor: number) {
    this.pianoRoll.zoomY(factor);
  }

  pan(deltaX: number, deltaY: number) {
    this.pianoRoll.pan(deltaX, deltaY);
  }

  resetView() {
    this.pianoRoll.resetView();
  }

  getState() {
    return this.pianoRoll.getState();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.pianoRoll.destroy();
  }

  setTimeStep(step: number) {
    this.pianoRoll.setTimeStep(step);
  }

  getTimeStep() {
    return this.pianoRoll.getTimeStep();
  }

  setLoopWindow?(start: number | null, end: number | null) {
    if (typeof this.pianoRoll.setLoopWindow === "function") {
      this.pianoRoll.setLoopWindow(start, end);
    }
  }

  onTimeChange(callback: (time: number) => void) {
    this.pianoRoll.onTimeChange(callback);
  }

  setMinorTimeStep(step: number) {
    this.pianoRoll.setMinorTimeStep(step);
  }

  getMinorTimeStep() {
    return this.pianoRoll.getMinorTimeStep();
  }

  setOverlapRegions?(ov: NoteInterval[]) {
    if (typeof this.pianoRoll.setOverlapRegions === "function") {
      this.pianoRoll.setOverlapRegions(ov);
    }
  }

  resize(width: number, height?: number) {
    this.pianoRoll.resize(width, height);
  }
}

/**
 * Factory function to create a piano roll visualizer
 * @param container - HTML element to attach the canvas to
 * @param notes - Array of note data to visualize
 * @param options - Configuration options
 * @returns Piano roll instance and control methods
 */
export async function createPianoRoll(
  container: HTMLElement,
  notes: NoteData[] = [],
  options: PianoRollConfig = {}
): Promise<PianoRollInstance> {
  // Create canvas element
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  // Clear container and add canvas
  container.innerHTML = "";
  container.appendChild(canvas);

  // Create piano roll instance
  const pianoRoll = await PianoRoll.create(canvas, container, options);

  // Set initial notes
  if (notes.length > 0) {
    pianoRoll.setNotes(notes);
  }
  // Return class instance
  return new PianoRollInstance(pianoRoll, container);
}

export { PianoRoll };
export type { PianoRollConfig };
