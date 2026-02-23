/**
 * World-specific stage sound synthesis functions.
 * Each world has a unique comical, pixelated beat sound that matches its BPM and theme.
 *
 * World 0 — 🎀 メロディア (100 BPM): Bouncy rubber "boing" squeak
 * World 1 — 🌊 ハーモニア (110 BPM): Bubbly underwater "blorp"
 * World 2 — ☀️ クレシェンダ (120 BPM): Bright retro coin "pling"
 * World 3 — 🔥 フォルティッシモ (140 BPM): Aggressive crunchy "pow"
 * World 4 — ✨ 静寂の間 (160 BPM): Ethereal glitchy shimmer chime
 */

/** Play the world-specific beat drum sound. */
export function playWorldDrum(ctx: AudioContext, worldIdx: number): void {
    const t = ctx.currentTime;

    switch (worldIdx) {
        case 0: {
            // 🎀 メロディア — Bouncy rubber "boing" squeak
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(180, t);
            osc1.frequency.exponentialRampToValueAtTime(520, t + 0.06);
            osc1.frequency.exponentialRampToValueAtTime(330, t + 0.14);
            gain1.gain.setValueAtTime(0.35, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.16);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(120, t);
            osc2.frequency.exponentialRampToValueAtTime(60, t + 0.1);
            gain2.gain.setValueAtTime(0.25, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.1);
            break;
        }
        case 1: {
            // 🌊 ハーモニア — Bubbly underwater "blorp"
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(90, t);
            osc1.frequency.exponentialRampToValueAtTime(600, t + 0.08);
            osc1.frequency.exponentialRampToValueAtTime(380, t + 0.12);
            gain1.gain.setValueAtTime(0.3, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.14);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(220, t + 0.02);
            osc2.frequency.exponentialRampToValueAtTime(440, t + 0.06);
            osc2.frequency.exponentialRampToValueAtTime(280, t + 0.12);
            gain2.gain.setValueAtTime(0.01, t);
            gain2.gain.linearRampToValueAtTime(0.2, t + 0.03);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.14);
            break;
        }
        case 2: {
            // ☀️ クレシェンダ — Bright retro coin "pling"
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.setValueAtTime(1320, t + 0.03);
            gain1.gain.setValueAtTime(0.35, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.12);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1600, t);
            osc2.frequency.exponentialRampToValueAtTime(800, t + 0.02);
            gain2.gain.setValueAtTime(0.15, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.04);
            break;
        }
        case 3: {
            // 🔥 フォルティッシモ — Aggressive crunchy "pow"
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(220, t);
            osc1.frequency.exponentialRampToValueAtTime(55, t + 0.1);
            gain1.gain.setValueAtTime(0.45, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.12);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(330, t);
            osc2.frequency.exponentialRampToValueAtTime(40, t + 0.06);
            gain2.gain.setValueAtTime(0.3, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.08);

            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(80, t);
            osc3.frequency.exponentialRampToValueAtTime(30, t + 0.12);
            gain3.gain.setValueAtTime(0.35, t);
            gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.start(t);
            osc3.stop(t + 0.12);
            break;
        }
        case 4: {
            // ✨ 静寂の間 — Ethereal glitchy shimmer chime
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1200, t);
            osc1.frequency.setValueAtTime(1800, t + 0.02);
            osc1.frequency.setValueAtTime(1500, t + 0.05);
            gain1.gain.setValueAtTime(0.2, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.15);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(660, t);
            osc2.frequency.setValueAtTime(990, t + 0.015);
            osc2.frequency.setValueAtTime(440, t + 0.03);
            osc2.frequency.setValueAtTime(1320, t + 0.045);
            osc2.frequency.setValueAtTime(550, t + 0.06);
            gain2.gain.setValueAtTime(0.1, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.08);

            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(165, t);
            osc3.frequency.exponentialRampToValueAtTime(110, t + 0.18);
            gain3.gain.setValueAtTime(0.15, t);
            gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.start(t);
            osc3.stop(t + 0.18);
            break;
        }
        default: {
            // Fallback: original drum sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
            break;
        }
    }
}

/** World-specific line clear chime configurations. */
export const WORLD_LINE_CLEAR_CHIMES: { freqs: number[]; type: OscillatorType; dur: number; delay: number }[] = [
    // 🎀 Melodia — playful bouncy major scale pings
    { freqs: [523, 698, 880, 1047], type: 'square', dur: 0.12, delay: 70 },
    // 🌊 Harmonia — flowing watery pentatonic tones
    { freqs: [440, 587, 740, 880], type: 'sine', dur: 0.18, delay: 80 },
    // ☀️ Crescenda — bright sparkling triangle arpeggios
    { freqs: [660, 880, 1100, 1320], type: 'triangle', dur: 0.14, delay: 55 },
    // 🔥 Fortissimo — aggressive power chord hits
    { freqs: [330, 440, 550, 660], type: 'sawtooth', dur: 0.1, delay: 45 },
    // ✨ 静寂の間 — ethereal crystalline harmonics
    { freqs: [880, 1175, 1397, 1760], type: 'triangle', dur: 0.2, delay: 90 },
];
