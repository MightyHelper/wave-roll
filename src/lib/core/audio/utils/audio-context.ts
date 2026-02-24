import * as Tone from "tone";

export async function configureAudioContext(): Promise<void> {
  const ctxAny = Tone.getContext();
  ctxAny.lookAhead = 0.1; // 100ms lookahead
}

export async function ensureAudioContextReady(): Promise<void> {
  const context = Tone.getContext!();
  if (context.state === "suspended") await context.resume?.();
  if (context.state !== "running") await Tone.start?.();
  await configureAudioContext();
}
