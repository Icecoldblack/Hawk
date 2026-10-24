let ctx: AudioContext | null = null;

/** Call from a click handler so browsers allow audio later. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

/** Short two-tone alarm, synthesized so no audio file is needed. */
export function playAlarm() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    for (const [offset, freq] of [[0, 880], [0.16, 660]] as const) {
      const t = now + i * 0.36 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }
  }
}
