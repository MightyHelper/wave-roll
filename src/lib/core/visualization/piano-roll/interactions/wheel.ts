import { PianoRoll } from "../piano-roll";
import { clampPanX } from "../utils/clamp-pan";

export function onWheel(event: WheelEvent, pianoRoll: PianoRoll): void {
  event.preventDefault();

  const zoomFactor = 1.1;
  const deltaY = event.deltaY;
  const deltaX = event.deltaX;

  // Always zoom around the cursor position for intuitive control
  // Use DOMRect to get a stable anchor in CSS pixels, then map to options.width space
  const rect = pianoRoll.app.canvas.getBoundingClientRect();
  const cssX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const anchorX = (cssX / rect.width) * pianoRoll.options.width;

  // Alt/Option + wheel => vertical (pitch) zoom for intuitive interaction
  if (event.altKey) {
    if (deltaY < 0) {
      pianoRoll.zoomY(zoomFactor);
    } else {
      pianoRoll.zoomY(1 / zoomFactor);
    }
    return;
  }

  // Shift or explicit horizontal scroll gesture => horizontal pan (x-scroll)
  const preferPan = event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
  if (preferPan) {
    // Use whichever axis has the dominant delta; if Shift is held, map vertical to horizontal.
    const dx = Math.abs(deltaX) > 0.5 ? deltaX : deltaY;
    // Map wheel direction to timeline movement: scroll right -> later time (content moves left)
    pianoRoll.state.panX -= dx;
    clampPanX(pianoRoll.timeScale, pianoRoll.state);
    // Keep UI in sync with new time under playhead
    pianoRoll.state.currentTime = pianoRoll.computeTimeAtPlayhead();
    if (pianoRoll.onTimeChangeCallback) {
      pianoRoll.onTimeChangeCallback(pianoRoll.state.currentTime);
    }
    pianoRoll.requestRender();
    return;
  }

  // Default: zoomX (horizontal time zoom) around cursor
  if (deltaY < 0) {
    pianoRoll.zoomX(zoomFactor, anchorX);
  } else {
    pianoRoll.zoomX(1 / zoomFactor, anchorX);
  }
}
