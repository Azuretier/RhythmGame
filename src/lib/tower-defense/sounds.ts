/**
 * Procedural sound effects for the tower defense game.
 * Uses the Web Audio API — no external audio files needed.
 */

let audioCtx: AudioContext | null = null;
let muted = false;

function ctx(): AudioContext | null {
  if (muted) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function initAudio() {
  ctx();
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

// ─── Helpers ────────────────────────────────────────────────

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

function sweep(from: number, to: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

function noise(dur: number, vol: number, filterFreq: number, filterQ: number, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

// ─── Tower Placement ────────────────────────────────────────

export function playTowerPlace() {
  // Satisfying "thunk" + confirmation chime
  sweep(200, 80, 0.1, 'sine', 0.2);
  noise(0.06, 0.08, 400, 2);
  tone(523, 0.12, 'triangle', 0.1, 0.05);
  tone(784, 0.15, 'triangle', 0.08, 0.1);
}

// ─── Tower Sell ─────────────────────────────────────────────

export function playTowerSell() {
  // Coins jingling — descending metallic tones
  tone(1200, 0.08, 'square', 0.06);
  tone(900, 0.08, 'square', 0.05, 0.06);
  tone(600, 0.1, 'square', 0.04, 0.12);
  sweep(300, 100, 0.12, 'sine', 0.08, 0.05);
}

// ─── Tower Upgrade ──────────────────────────────────────────

export function playTowerUpgrade() {
  // Ascending power-up arpeggio
  tone(440, 0.12, 'triangle', 0.1);
  tone(554, 0.12, 'triangle', 0.1, 0.08);
  tone(659, 0.12, 'triangle', 0.1, 0.16);
  tone(880, 0.2, 'triangle', 0.12, 0.24);
  // Shimmer overlay
  sweep(880, 1760, 0.3, 'sine', 0.04, 0.2);
}

// ─── Tower Shooting (per tower type) ────────────────────────

export function playShootArcher() {
  // Quick twang
  sweep(600, 1200, 0.06, 'sawtooth', 0.08);
  tone(200, 0.04, 'sine', 0.06);
}

export function playShootCannon() {
  // Deep boom + crunch
  sweep(150, 40, 0.15, 'sine', 0.18);
  noise(0.1, 0.12, 200, 1);
  sweep(300, 80, 0.08, 'sawtooth', 0.06);
}

export function playShootFrost() {
  // Crystalline ping
  tone(1400, 0.15, 'sine', 0.06);
  tone(1800, 0.1, 'sine', 0.04, 0.03);
  sweep(2200, 800, 0.12, 'triangle', 0.03, 0.02);
}

export function playShootLightning() {
  // Electric zap
  sweep(300, 2000, 0.04, 'sawtooth', 0.1);
  sweep(2000, 400, 0.06, 'square', 0.06, 0.04);
  noise(0.05, 0.06, 3000, 5);
}

export function playShootSniper() {
  // High-velocity crack
  noise(0.03, 0.15, 5000, 8);
  sweep(1000, 200, 0.08, 'sawtooth', 0.07, 0.02);
  tone(100, 0.06, 'sine', 0.1);
}

export function playShootFlame() {
  // Whoosh — filtered noise burst
  noise(0.12, 0.1, 800, 1.5);
  sweep(200, 600, 0.1, 'sawtooth', 0.04);
}

export function playShootArcane() {
  // Mystical pulse
  tone(660, 0.15, 'sine', 0.07);
  tone(990, 0.12, 'sine', 0.05, 0.04);
  sweep(400, 800, 0.1, 'triangle', 0.04, 0.02);
}

// ─── Magma Aura (volcano emit rumble) ─────────────────────

let lastMagmaAuraTime = 0;
const MAGMA_AURA_INTERVAL = 800; // ms between rumble pulses

export function playMagmaAura() {
  const now = performance.now();
  if (now - lastMagmaAuraTime < MAGMA_AURA_INTERVAL) return;
  lastMagmaAuraTime = now;

  // Deep volcanic rumble — low-frequency sub-bass pulse
  sweep(60, 35, 0.5, 'sine', 0.08);
  // Crackling magma surface — filtered noise burst
  noise(0.3, 0.04, 250, 1.5);
  // Mid-range lava bubble pop
  sweep(180, 100, 0.2, 'sine', 0.04, 0.1);
  // High hiss — steam vent
  noise(0.15, 0.02, 3500, 4, 0.15);
}

const SHOOT_SOUNDS: Record<string, () => void> = {
  archer: playShootArcher,
  cannon: playShootCannon,
  frost: playShootFrost,
  lightning: playShootLightning,
  sniper: playShootSniper,
  flame: playShootFlame,
  arcane: playShootArcane,
};

export function playShoot(towerType: string) {
  const fn = SHOOT_SOUNDS[towerType];
  if (fn) fn();
}

// ─── Enemy Kill ─────────────────────────────────────────────

export function playEnemyKill() {
  // Impact crunch + reward chime
  sweep(300, 80, 0.08, 'square', 0.1);
  noise(0.05, 0.06, 500, 2);
  tone(698, 0.1, 'triangle', 0.06, 0.06);
  tone(880, 0.12, 'triangle', 0.05, 0.1);
}

// ─── Boss Kill ──────────────────────────────────────────────

export function playBossKill() {
  // Big explosion + fanfare
  sweep(200, 30, 0.3, 'sawtooth', 0.15);
  noise(0.2, 0.12, 300, 1);
  tone(523, 0.15, 'triangle', 0.08, 0.15);
  tone(659, 0.15, 'triangle', 0.08, 0.25);
  tone(784, 0.15, 'triangle', 0.08, 0.35);
  tone(1047, 0.3, 'triangle', 0.1, 0.45);
}

// ─── Life Lost ──────────────────────────────────────────────

export function playLifeLost() {
  // Warning alarm — descending dissonant tones
  sweep(800, 200, 0.2, 'square', 0.1);
  sweep(600, 150, 0.2, 'square', 0.08, 0.1);
  tone(100, 0.15, 'sine', 0.12, 0.05);
}

// ─── Wave Start ─────────────────────────────────────────────

export function playWaveStart() {
  // War horn — layered ascending tones
  sweep(150, 300, 0.4, 'sawtooth', 0.08);
  sweep(225, 450, 0.35, 'sawtooth', 0.05, 0.05);
  tone(300, 0.3, 'triangle', 0.06, 0.15);
  noise(0.15, 0.04, 600, 2);
}

// ─── Wave Complete ──────────────────────────────────────────

export function playWaveComplete() {
  // Victory jingle
  tone(523, 0.12, 'triangle', 0.08);
  tone(659, 0.12, 'triangle', 0.08, 0.1);
  tone(784, 0.12, 'triangle', 0.08, 0.2);
  tone(1047, 0.25, 'triangle', 0.1, 0.3);
  sweep(1047, 2094, 0.3, 'sine', 0.03, 0.3);
}

// ─── Game Won ───────────────────────────────────────────────

export function playGameWon() {
  // Grand fanfare
  const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
  notes.forEach((f, i) => {
    tone(f, 0.2, 'triangle', 0.1, i * 0.12);
  });
  sweep(200, 100, 0.8, 'sine', 0.06, 0.2);
  noise(0.3, 0.03, 1000, 2, 0.5);
}

// ─── Game Lost ──────────────────────────────────────────────

export function playGameLost() {
  // Somber descending tones
  tone(400, 0.3, 'sawtooth', 0.08);
  tone(350, 0.3, 'sawtooth', 0.07, 0.25);
  tone(300, 0.3, 'sawtooth', 0.06, 0.5);
  tone(200, 0.5, 'sawtooth', 0.08, 0.75);
  sweep(200, 50, 0.6, 'sine', 0.06, 0.9);
}

// ─── UI Click ───────────────────────────────────────────────

export function playUIClick() {
  tone(800, 0.05, 'square', 0.04);
  tone(1200, 0.04, 'square', 0.03, 0.02);
}

// ─── Invalid Action ─────────────────────────────────────────

export function playInvalid() {
  tone(150, 0.12, 'square', 0.06);
  tone(120, 0.15, 'square', 0.05, 0.08);
}
