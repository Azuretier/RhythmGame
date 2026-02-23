import { useCallback, useRef } from 'react';
import { playWorldDrum, WORLD_LINE_CLEAR_CHIMES } from '@/lib/rhythmia/stageSounds';

/**
 * Custom hook for audio synthesis and sound effects
 */
export function useAudio() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        // Resume suspended AudioContext (required by browsers after user gesture)
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const playTone = useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    }, []);

    const playDrum = useCallback((worldIdx = 0) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        playWorldDrum(ctx, worldIdx);
    }, []);

    const playLineClear = useCallback((count: number, worldIdx = 0) => {
        const chime = WORLD_LINE_CLEAR_CHIMES[worldIdx] || WORLD_LINE_CLEAR_CHIMES[0];
        chime.freqs.slice(0, count).forEach((f, i) =>
            setTimeout(() => playTone(f, chime.dur, chime.type), i * chime.delay)
        );
    }, [playTone]);

    const playMoveSound = useCallback(() => {
        playTone(196, 0.05, 'square');
    }, [playTone]);

    const playRotateSound = useCallback(() => {
        playTone(392, 0.1, 'square');
    }, [playTone]);

    const playHardDropSound = useCallback(() => {
        playTone(196, 0.1, 'sawtooth');
    }, [playTone]);

    const playPerfectSound = useCallback(() => {
        playTone(1047, 0.2, 'triangle');
    }, [playTone]);

    // Tower defense sounds — layered synth SFX
    const playShootSound = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const t = ctx.currentTime;

        // Layer 1: sharp attack sweep (sawtooth up)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(400, t);
        osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.06);
        gain1.gain.setValueAtTime(0.12, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.12);

        // Layer 2: low thump for body
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(180, t);
        osc2.frequency.exponentialRampToValueAtTime(60, t + 0.08);
        gain2.gain.setValueAtTime(0.15, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.1);
    }, []);

    const playHitSound = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 140;
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }, []);

    const playKillSound = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const t = ctx.currentTime;

        // Impact crunch — descending square
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(300, t);
        osc1.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        gain1.gain.setValueAtTime(0.12, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.12);

        // Ascending confirmation chime
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(523, t + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(1047, t + 0.14);
        gain2.gain.setValueAtTime(0.08, t + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t + 0.04);
        osc2.stop(t + 0.2);
    }, []);

    const playEmptySound = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 80;
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    }, []);

    // ===== Mandarin Fever Dragon Sounds =====

    // Gauge charge tick — metallic ring rising in pitch with gauge level
    const playDragonChargeTick = useCallback((gaugeLevel: number) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const t = ctx.currentTime;
        const freq = 220 + gaugeLevel * 40;

        // Metallic triangle ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.04);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);

        // Harmonic shimmer
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, t);
        gain2.gain.setValueAtTime(0.06, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.06);
    }, []);

    // Gauge full chime — ascending crystal arpeggio
    const playDragonGaugeFull = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const freqs = [880, 1175, 1397, 1760];
        freqs.forEach((f, i) => {
            const t = ctx.currentTime + i * 0.12;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    }, []);

    // Dragon roar — layered sawtooth sweep + noise burst + shimmer
    const playDragonRoar = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const t = ctx.currentTime;

        // Layer 1: Deep sawtooth sweep (80→400Hz over 800ms)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, t);
        osc1.frequency.exponentialRampToValueAtTime(400, t + 0.8);
        gain1.gain.setValueAtTime(0.18, t);
        gain1.gain.setValueAtTime(0.18, t + 0.3);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 1.0);

        // Layer 2: Secondary harmonic sweep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(120, t);
        osc2.frequency.exponentialRampToValueAtTime(600, t + 0.6);
        gain2.gain.setValueAtTime(0.08, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.8);

        // Layer 3: Noise burst for texture
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.10, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(200, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(800, t + 0.2);
        noiseFilter.Q.value = 2;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.3);

        // Layer 4: High shimmer tail
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(880, t + 0.2);
        osc3.frequency.exponentialRampToValueAtTime(1760, t + 0.6);
        gain3.gain.setValueAtTime(0.001, t + 0.2);
        gain3.gain.linearRampToValueAtTime(0.06, t + 0.35);
        gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(t + 0.2);
        osc3.stop(t + 0.8);
    }, []);

    // Dragon fire breath loop — filtered noise with resonant sweep
    const dragonFireNodeRef = useRef<{ noise: AudioBufferSourceNode; gain: GainNode } | null>(null);

    const playDragonFireStart = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx || dragonFireNodeRef.current) return;
        const t = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 1.0);
        filter.frequency.linearRampToValueAtTime(600, t + 2.5);
        filter.Q.value = 3;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.3);

        // Add low rumble
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.type = 'sawtooth';
        rumble.frequency.value = 60;
        rumbleGain.gain.setValueAtTime(0.04, t);
        rumble.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        rumble.start(t);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);

        dragonFireNodeRef.current = { noise, gain };

        // Auto-stop rumble with fire
        noise.onended = () => {
            rumble.stop();
        };
    }, []);

    const playDragonFireStop = useCallback(() => {
        const ctx = audioCtxRef.current;
        const nodes = dragonFireNodeRef.current;
        if (!ctx || !nodes) return;
        const t = ctx.currentTime;

        nodes.gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
        nodes.noise.stop(t + 0.5);
        dragonFireNodeRef.current = null;
    }, []);

    return {
        initAudio,
        playTone,
        playDrum,
        playLineClear,
        playMoveSound,
        playRotateSound,
        playHardDropSound,
        playPerfectSound,
        playShootSound,
        playHitSound,
        playKillSound,
        playEmptySound,
        // Dragon sounds
        playDragonChargeTick,
        playDragonGaugeFull,
        playDragonRoar,
        playDragonFireStart,
        playDragonFireStop,
    };
}
