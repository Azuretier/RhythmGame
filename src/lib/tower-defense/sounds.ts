/**
 * Procedural sound effects for the tower defense game.
 * Uses the Web Audio API — no external audio files needed.
 *
 * All sounds are designed to evoke Minecraft audio:
 * block place thunks, bow twangs, XP orb plinks, mob death poofs,
 * raid horns, stone button clicks, and more.
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

/** Short sine "pop" with very fast decay — the Minecraft XP orb plink. */
function pop(freq: number, vol: number, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.02);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

// ─── Tower Placement (Minecraft block place — woody thunk) ──

export function playTowerPlace() {
  // Low sine pop for the body of the "thunk"
  sweep(180, 90, 0.08, 'sine', 0.2);
  // Short noise burst for woody texture
  noise(0.04, 0.1, 300, 2);
  // Subtle secondary thump
  tone(120, 0.05, 'sine', 0.08, 0.01);
}

// ─── Tower Sell (Minecraft XP orb collection — ascending plinks) ──

export function playTowerSell() {
  // Rapid ascending plinks like collecting multiple XP orbs
  pop(1000, 0.07);
  pop(1400, 0.07, 0.04);
  pop(1800, 0.08, 0.08);
  pop(2200, 0.09, 0.12);
}

// ─── Tower Upgrade (Minecraft anvil + enchantment shimmer) ──

export function playTowerUpgrade() {
  // Metallic anvil clang
  tone(800, 0.08, 'square', 0.06);
  noise(0.05, 0.05, 3500, 6);
  // Enchantment shimmer — ascending ethereal sweep
  sweep(600, 2400, 0.3, 'sine', 0.04, 0.06);
  // Ethereal triangle tones layered on top
  tone(1200, 0.15, 'triangle', 0.04, 0.1);
  tone(1600, 0.12, 'triangle', 0.03, 0.18);
  tone(2000, 0.1, 'triangle', 0.03, 0.24);
}

// ─── Tower Shooting (per tower type) ────────────────────────

export function playShootArcher() {
  // Minecraft bow shoot — string twang with resonant sweep
  sweep(400, 1200, 0.05, 'sawtooth', 0.08);
  // String release thump
  tone(150, 0.03, 'sine', 0.06);
}

export function playShootCannon() {
  // Minecraft TNT explosion — deep bass boom with debris
  sweep(120, 35, 0.2, 'sine', 0.18);
  // Mid-frequency debris layer
  noise(0.15, 0.12, 200, 1);
  // Upper debris scatter
  noise(0.08, 0.06, 800, 3, 0.02);
}

export function playShootFrost() {
  // Minecraft glass/ice break — crystalline crunch + shimmer
  noise(0.06, 0.08, 3000, 6);
  // High crystalline tones
  tone(2000, 0.08, 'sine', 0.05, 0.01);
  tone(2800, 0.06, 'sine', 0.04, 0.02);
}

export function playShootLightning() {
  // Minecraft lightning strike — sharp crack then rumble
  // Initial crack
  noise(0.03, 0.14, 5000, 8);
  // Electrical crackle sweep
  sweep(2000, 200, 0.08, 'square', 0.07, 0.02);
  // Low rumble tail
  tone(60, 0.15, 'sine', 0.1, 0.04);
}

export function playShootSniper() {
  // Minecraft crossbow — tight mechanical snap
  tone(600, 0.03, 'square', 0.08);
  // Sharp mechanical click
  noise(0.02, 0.1, 4000, 8, 0.01);
  // Short thud
  tone(100, 0.02, 'sine', 0.06, 0.02);
}

export function playShootFlame() {
  // Minecraft blaze shoot — breathy fire whoosh
  noise(0.1, 0.08, 600, 1.5);
  // Soft mid-range body
  sweep(200, 500, 0.08, 'sawtooth', 0.04);
  // Upper sizzle
  noise(0.06, 0.03, 2000, 3, 0.02);
}

export function playShootArcane() {
  // Minecraft enderman teleport — reversed warbling, ethereal
  // Descending sweep (reverse feel)
  sweep(1200, 400, 0.12, 'sine', 0.06);
  // Overlapping ascending counter-sweep
  sweep(800, 1600, 0.1, 'sine', 0.04, 0.03);
  // Warbling triangle with slight pitch instability
  tone(600, 0.15, 'triangle', 0.05, 0.02);
  tone(620, 0.12, 'triangle', 0.03, 0.04);
}

// ─── Magma Aura (Minecraft lava bubbling / nether ambient) ──

let lastMagmaAuraTime = 0;
const MAGMA_AURA_INTERVAL = 600; // ms between bubble pulses

export function playMagmaAura() {
  const now = performance.now();
  if (now - lastMagmaAuraTime < MAGMA_AURA_INTERVAL) return;
  lastMagmaAuraTime = now;

  // Lava bubble pop — low sine sweep up then down
  sweep(100, 200, 0.08, 'sine', 0.08);
  sweep(200, 120, 0.07, 'sine', 0.05, 0.08);
  // Gurgling noise
  noise(0.12, 0.04, 250, 2, 0.02);
  // Occasional higher bubble
  sweep(200, 350, 0.06, 'sine', 0.04, 0.1);
  sweep(350, 180, 0.05, 'sine', 0.03, 0.16);
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

// ─── Enemy Kill (Minecraft mob death poof + XP plink) ───────

export function playEnemyKill() {
  // Death "poof" — short noise burst
  noise(0.05, 0.08, 600, 2);
  // XP orb plink
  pop(1400, 0.06, 0.04);
}

// ─── Boss Kill (Minecraft Ender Dragon death — dramatic fanfare) ──

export function playBossKill() {
  // Large explosion impact
  sweep(200, 40, 0.2, 'sine', 0.15);
  noise(0.2, 0.1, 200, 1);
  // Dramatic ascending fanfare — C5 → E5 → G5 → C6
  tone(523, 0.15, 'triangle', 0.08, 0.15);
  tone(659, 0.15, 'triangle', 0.08, 0.27);
  tone(784, 0.15, 'triangle', 0.08, 0.39);
  tone(1047, 0.25, 'triangle', 0.1, 0.51);
  // Shimmering sweep at climax
  sweep(1000, 3000, 0.4, 'sine', 0.04, 0.5);
}

// ─── Life Lost (Minecraft player damage "oof") ─────────────

export function playLifeLost() {
  // Very short low "oof" — the classic Minecraft hurt thump
  tone(200, 0.08, 'sine', 0.15);
  // Slight noise for texture
  noise(0.04, 0.06, 300, 2, 0.01);
}

// ─── Wave Start (Minecraft raid horn — deep ominous) ────────

export function playWaveStart() {
  // Deep ominous raid horn — primary note
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;

  // Main horn — sawtooth at ~110Hz with slow attack
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(110, t);
  gain1.gain.setValueAtTime(0.001, t);
  gain1.gain.linearRampToValueAtTime(0.1, t + 0.1);
  gain1.gain.setValueAtTime(0.1, t + 0.35);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  osc1.connect(gain1);
  gain1.connect(c.destination);
  osc1.start(t);
  osc1.stop(t + 0.55);

  // Harmonic fifth above at lower volume for richness
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(165, t);
  gain2.gain.setValueAtTime(0.001, t);
  gain2.gain.linearRampToValueAtTime(0.05, t + 0.1);
  gain2.gain.setValueAtTime(0.05, t + 0.35);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.start(t);
  osc2.stop(t + 0.55);
}

// ─── Wave Complete (Minecraft level up — ascending plinks) ──

export function playWaveComplete() {
  // Series of ascending plinks — Minecraft level up sparkle
  pop(800, 0.06);
  pop(1000, 0.07, 0.06);
  pop(1200, 0.08, 0.12);
  pop(1600, 0.1, 0.18);
  // Gentle shimmer tail
  sweep(1600, 2400, 0.2, 'sine', 0.03, 0.2);
}

// ─── Game Won (Minecraft credits — triumphant fanfare) ──────

export function playGameWon() {
  // Major arpeggio in triangle waves — C5 E5 G5 C6 E6 G6 C7
  const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
  notes.forEach((f, i) => {
    tone(f, 0.18, 'triangle', 0.09, i * 0.1);
  });
  // Gentle shimmer sweep at the end
  sweep(2000, 3500, 0.3, 'sine', 0.03, 0.65);
}

// ─── Game Lost (Minecraft death screen — somber descending) ─

export function playGameLost() {
  // Dark, somber descending sawtooth tones
  tone(300, 0.3, 'sawtooth', 0.07);
  tone(250, 0.3, 'sawtooth', 0.06, 0.25);
  tone(200, 0.3, 'sawtooth', 0.06, 0.5);
  tone(150, 0.5, 'sawtooth', 0.07, 0.75);
  // Final tone fades slowly into silence
  sweep(150, 80, 0.6, 'sine', 0.04, 0.95);
}

// ─── UI Click (Minecraft stone button click — dry, crisp) ───

export function playUIClick() {
  // Extremely short noise burst — no tonal element
  noise(0.02, 0.06, 2000, 4);
}

// ─── Invalid Action (Minecraft villager "hmm" — nasal buzz) ─

export function playInvalid() {
  // Short nasal buzz — two staggered square wave tones
  tone(150, 0.1, 'square', 0.06);
  tone(130, 0.1, 'square', 0.05, 0.06);
}
