/**
 * Coordinate transformation utilities for piano roll visualization
 */

import type { PianoRoll } from '../piano-roll';

export interface ViewportBounds {
  timeStart: number;
  timeEnd: number;
  pixelStart: number;
  pixelEnd: number;
}

/**
 * Coordinate transformer for piano roll visualization
 */
export class CoordinateTransform {
  constructor(private pianoRoll: PianoRoll) {}

  /**
   * Convert time to pixel position
   */
  timeToPixel(time: number): number {
    const pianoKeysOffset = this.getPianoKeysOffset();
    return this.pianoRoll.timeScale(time) * this.pianoRoll.state.zoomX + pianoKeysOffset;
  }

  /**
   * Convert pixel position to time
   */
  pixelToTime(pixel: number): number {
    const pianoKeysOffset = this.getPianoKeysOffset();
    return this.pianoRoll.timeScale.invert((pixel - pianoKeysOffset) / this.pianoRoll.state.zoomX);
  }

  /**
   * Convert pitch to pixel position
   */
  pitchToPixel(pitch: number): number {
    return this.pianoRoll.pitchScale(pitch) * this.pianoRoll.state.zoomY;
  }

  /**
   * Convert pixel position to pitch
   */
  pixelToPitch(pixel: number): number {
    return this.pianoRoll.pitchScale.invert(pixel / this.pianoRoll.state.zoomY);
  }

  /**
   * Get the piano keys offset
   */
  getPianoKeysOffset(): number {
    return this.pianoRoll.options.showPianoKeys ? 60 : 0;
  }

  /**
   * Get pixels per second
   */
  getPixelsPerSecond(): number {
    return this.pianoRoll.timeScale(1) * this.pianoRoll.state.zoomX;
  }

  /**
   * Get the visible time range for the current viewport
   */
  getVisibleTimeRange(): ViewportBounds {
    const pianoKeysOffset = this.getPianoKeysOffset();
    
    const timeStart = Math.max(
      0,
      this.pianoRoll.timeScale.invert(
        (-this.pianoRoll.state.panX - pianoKeysOffset) / this.pianoRoll.state.zoomX
      )
    );
    
    const timeEnd = Math.min(
      this.pianoRoll.timeScale.domain()[1],
      this.pianoRoll.timeScale.invert(
        (this.pianoRoll.options.width - pianoKeysOffset - this.pianoRoll.state.panX) / this.pianoRoll.state.zoomX
      )
    );
    
    return {
      timeStart,
      timeEnd,
      pixelStart: this.timeToPixel(timeStart),
      pixelEnd: this.timeToPixel(timeEnd)
    };
  }

  /**
   * Check if a time position is within the viewport
   */
  isTimeInViewport(time: number): boolean {
    const bounds = this.getVisibleTimeRange();
    return time >= bounds.timeStart && time <= bounds.timeEnd;
  }

  /**
   * Check if a pixel position is within the viewport
   */
  isPixelInViewport(x: number, margin: number = 10): boolean {
    return x >= -margin && x <= this.pianoRoll.options.width + margin;
  }
}