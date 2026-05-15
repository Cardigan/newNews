// Tiny 8-bit blip synth. No audio assets — we generate square waves on the
// fly with the Web Audio API. Browsers won't let us create an AudioContext
// until the user interacts, so we lazy-init on first call.
//
// Sounds are off by default (workplace context); the page exposes a toggle
// that flips this flag and persists it to localStorage.

let ctx: AudioContext | null = null;
let enabled = false;

const STORAGE_KEY = 'newnews:sound';

export function loadSoundPref(): boolean {
  if (typeof window === 'undefined') return true;
  // Default ON: only treat as muted if the user explicitly turned it off.
  enabled = window.localStorage.getItem(STORAGE_KEY) !== '0';
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function blip(freq: number, durMs: number, type: OscillatorType = 'square', gain = 0.04) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Square-wave-y attack + decay envelope.
  const t0 = c.currentTime;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

// SMW-coin-ish: B5 -> E6 quick chirp.
export function playSelect() {
  blip(988, 60);
  setTimeout(() => blip(1319, 90), 60);
}

// Soft confirm.
export function playOpen() {
  blip(659, 50);
  setTimeout(() => blip(880, 70), 50);
}

// Down-step, like closing a menu.
export function playClose() {
  blip(523, 40);
  setTimeout(() => blip(392, 70), 45);
}

// Subtle tick for filter toggles.
export function playTick() {
  blip(740, 30, 'square', 0.025);
}
