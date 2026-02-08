import { useCallback, useRef } from 'react';

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

    const playDrum = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }, []);

    const playLineClear = useCallback((count: number) => {
        const freqs = [523, 659, 784, 1047];
        freqs.slice(0, count).forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle'), i * 60));
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
    };
}
