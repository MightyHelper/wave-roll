import * as PIXI from "pixi.js";
import type { PianoRoll } from "../piano-roll";
import { BackgroundLayer } from "./components/background-layer";
import { NotesLayer } from "./components/notes-layer";
import { SustainLayer } from "./components/sustain-layer";
import { CompositeTimelineLayer } from "./components/composite-timeline-layer";
import { PlayheadLayer } from "./components/playhead-layer";
import { LoopOverlayLayer } from "./components/loop-overlay-layer";

/**
 * Initialize Pixi containers and display list for the piano roll instance.
 * Keeps layering/zIndex contracts identical to the original inline method.
 */
export function initializeContainers(pr: PianoRoll): void {
  // Main container for all elements
  pr.container = new PIXI.Container();
  pr.container.sortableChildren = true; // Enable z-index sorting
  pr.app.stage.addChild(pr.container);

  // Background component encapsulating grid/labels/waveforms/loop overlays
  const bgLayer = new BackgroundLayer();
  pr.container.addChild(bgLayer);
  // Map legacy fields to internal graphics for compatibility
  pr.backgroundGrid = bgLayer.backgroundGrid;
  pr.waveformLayer = bgLayer.waveformLayer;
  pr.waveformKeysLayer = bgLayer.waveformKeysLayer;
  pr.backgroundLabelContainer = bgLayer.backgroundLabelContainer;
  // Keep a reference to the component for new-style rendering
  // @ts-expect-error attach private ref without changing public API yet
  pr._backgroundLayer = bgLayer as unknown as PIXI.Container;

  // Notes container for all note rectangles
  const notesLayer = new NotesLayer();
  pr.container.addChild(notesLayer);
  pr.notesContainer = notesLayer;
  // Private reference for delegation
  // @ts-expect-error migration-only private field
  pr._notesLayer = notesLayer as unknown as PIXI.Container;

  // Mask that clips out the bottom waveform band area from the notes/sustains (legacy path)
  pr.notesMask = new PIXI.Graphics();
  pr.container.addChild(pr.notesMask);
  pr.notesContainer.mask = pr.notesMask;

  const sustainLayer = new SustainLayer();
  pr.container.addChild(sustainLayer);
  pr.sustainContainer = sustainLayer;
  // Apply same mask so sustain overlays also avoid the waveform area
  pr.sustainContainer.mask = pr.notesMask;
  // Map legacy overlay handle for renderer compatibility (if any)
  pr.sustainOverlay = sustainLayer.overlay;
  // Private reference for delegation
  // @ts-expect-error migration-only private field
  pr._sustainLayer = sustainLayer as unknown as PIXI.Container;

  // Overlay for multi-track overlaps (semi-transparent red)
  pr.overlapOverlay = new PIXI.Graphics();
  pr.overlapOverlay.zIndex = 20; // above grid, below notes
  // This may be rendered inside the composite timeline layer

  if (pr.options.useCompositeRendering) {
    // Composite timeline offscreen blit layer to avoid masks
    const composite = new CompositeTimelineLayer(notesLayer, sustainLayer, pr.overlapOverlay);
    pr.container.addChild(composite);
    // Private ref for render delegation
    // @ts-expect-error migration-only private field
    pr._compositeTimelineLayer = composite as unknown as PIXI.Container;
    // Since we are using offscreen composite rendering, disable runtime masks
    pr.notesContainer.mask = null as unknown as PIXI.Graphics;
    pr.sustainContainer.mask = null as unknown as PIXI.Graphics;
  }

  // Playhead layer (always on top)
  const playheadLayer = new PlayheadLayer();
  pr.container.addChild(playheadLayer);
  pr.playheadLine = playheadLayer.line;
  // Private ref for delegation
  // @ts-expect-error migration-only private field
  pr._playheadLayer = playheadLayer as unknown as PIXI.Container;

  // Loop overlay layer
  const loopLayer = new LoopOverlayLayer();
  pr.container.addChild(loopLayer);
  pr.loopOverlay = loopLayer.overlay;
  pr.loopLabelContainer = loopLayer.labelContainer;
  pr.loopLines = loopLayer.loopLines;
  // Private ref for delegation
  // @ts-expect-error migration-only private field
  pr._loopOverlayLayer = loopLayer as unknown as PIXI.Container;
}


