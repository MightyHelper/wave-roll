import { generateAudioFileId } from "@/lib/core/utils/id";
import { COLOR_WAVEFORM } from "@/lib/core/constants";
import type { PeakDatum, RegisteredAudio } from "./types";
import { toNumberColor } from "@/components/player/wave-roll/evaluation/colors";

class WaveRollAudioAPI {
  private items: RegisteredAudio[] = [];

  getFiles(): RegisteredAudio[] {
    return this.items.slice();
  }

  getVisiblePeaks(): PeakDatum[] {
    const out: PeakDatum[] = [];
    for (const a of this.items) {
      if (!a.isVisible || !a.peaks || !a.audioBuffer) continue;
      const { min, max } = a.peaks;
      const duration = a.audioBuffer.duration;
      for (let i = 0; i < max.length; i++) {
        const time = (i / max.length) * duration;
        out.push({ time, min: min[i], max: max[i], color: a.color });
      }
    }
    return out;
  }

  sampleAtTime(time: number): Omit<PeakDatum, 'time'> | null {
    // Return the max of all visible audio tracks at this time
    let result: Omit<PeakDatum, 'time'> | null = null;
    for (const a of this.items) {
      if (!a.isVisible || !a.peaks || !a.audioBuffer) continue;
      const duration = a.audioBuffer.duration;
      if (duration <= 0) continue;
      const idx = Math.max(0, Math.min(a.peaks.max.length - 1, Math.floor((time / duration) * a.peaks.max.length)));
      const v = {
        min: a.peaks.min[idx],
        max: a.peaks.max[idx],
        color: a.color,
      };
      if (!result || v.max > result.max) result = v;
    }
    return result;
  }

  toggleVisibility(id: string): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.isVisible = !a.isVisible;
  }

  setVisibility(id: string, visible: boolean): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.isVisible = visible;
  }

  toggleMute(id: string): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.isMuted = !a.isMuted;
  }

  setMute(id: string, muted: boolean): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.isMuted = muted;
  }

  setPan(id: string, pan: number): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.pan = Math.max(-1, Math.min(1, pan));
  }

  updateName(id: string, name: string): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.name = name;
  }

  updateColor(id: string, color: number): void {
    const a = this.items.find((x) => x.id === id);
    if (a) a.color = color >>> 0;
  }

  addItem(entry: RegisteredAudio) {
    this.items.push(entry);
  }
}


export function getWaveRollAudioAPI(): WaveRollAudioAPI {
  const w = globalThis as unknown as { _waveRollAudio?: WaveRollAudioAPI };
  if (!w._waveRollAudio) w._waveRollAudio = new WaveRollAudioAPI();
  return w._waveRollAudio;
}

export async function addAudioFileFromUrl(
  _fileManager: any,
  url: string,
  displayName?: string,
  color?: number
): Promise<string> {
  const api = getWaveRollAudioAPI();
  const id = generateAudioFileId();
  const entry: RegisteredAudio = {
    id,
    name: displayName || url.split("/").pop() || "Audio",
    url,
    // Default neutral, high-contrast waveform stroke
    color: color ?? toNumberColor(COLOR_WAVEFORM),
    isVisible: true,
    isMuted: false,
    pan: 0,
  };
  api.addItem(entry);

  // Decode audio and compute peaks lazily
  const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) throw new Error("AudioContext not available");
  const ctx = new AudioContext();
  const resp = await fetch(url);
  const arr = await resp.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr);
  entry.audioBuffer = buf;
  // lightweight peak extraction (match granularity to width * 2)
  const target = Math.min(4000, Math.max(1000, Math.floor(buf.duration * 200)));
  const { getPeaksFromAudioBuffer } = await import("@/lib/core/waveform/peaks");
  entry.peaks = getPeaksFromAudioBuffer(buf, target);
  return id;
}
