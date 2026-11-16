import { getState } from './store';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur = 0.12, type: OscillatorType = 'sine', gain = 0.5, delay = 0, force = false) {
  const s = getState().settings;
  if (!s.sound && !force) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  const vol = Math.max(0.0001, gain * s.volume * 0.4);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  correct() {
    tone(660, 0.12, 'sine', 0.45);
    tone(990, 0.16, 'sine', 0.35, 0.07);
  },
  wrong() {
    tone(196, 0.2, 'triangle', 0.45);
  },
  tick() {
    tone(1200, 0.04, 'sine', 0.2);
  },
  click() {
    tone(520, 0.05, 'sine', 0.2);
  },
  start() {
    [440, 554, 659].forEach((f, i) => tone(f, 0.14, 'sine', 0.35, i * 0.08));
  },
  finish() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'sine', 0.35, i * 0.09));
  },
  level() {
    [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.3, i * 0.07));
  },
  /** Nota distinguible para estímulos auditivos (n-back). */
  note(i: number, force = true) {
    const freqs = [262, 294, 330, 392, 440, 523, 587, 659];
    tone(freqs[i % freqs.length], 0.35, 'triangle', 0.6, 0, force);
  },
  unlock() {
    ac();
  },
};

const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
export const nbackLetters = LETTERS;

/** Dice una letra con síntesis de voz si está disponible; si no, toca una nota. */
export function speakStimulus(i: number) {
  const s = getState().settings;
  try {
    if (s.voice && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(LETTERS[i].toLowerCase());
      u.lang = 'es-ES';
      u.rate = 1.1;
      u.volume = Math.max(0.2, s.volume);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return;
    }
  } catch {
    /* sin voz: usamos notas */
  }
  sfx.note(i);
}
