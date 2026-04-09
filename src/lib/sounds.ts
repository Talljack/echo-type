let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Short rising chime for module completion (e.g. shadow reading step done).
 * Uses Web Audio API — no external files needed.
 */
export function playModuleCompleteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — major triad
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(notes[i], now + i * 0.1);
    osc.connect(gain);
    osc.start(now + i * 0.1);
    osc.stop(now + 0.5 + i * 0.1);
  }
}

/**
 * Grand celebration sound for full session completion.
 */
export function playSessionCompleteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(notes[i], now + i * 0.15);
    osc.connect(gain);
    osc.start(now + i * 0.15);
    osc.stop(now + 0.8 + i * 0.15);
  }
}
