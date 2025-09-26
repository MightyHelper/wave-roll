// Shared types for the global waveform/audio registry used by the UI and
// playback utilities. Keeping them here avoids ad-hoc duplications.

export interface RegisteredAudio {
  id: string;
  name: string;
  url: string;
  color: number;
  isVisible: boolean;
  isMuted: boolean;
  pan: number;
  audioBuffer?: AudioBuffer;
  peaks?: { min: number[]; max: number[] };
  volume?: number;
}


export interface PeakDatum {
  time: number;
  min: number;
  max: number;
  color: number;
}
