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

    return {
        initAudio,
        playTone,
        playDrum,
        playLineClear,
        playMoveSound,
        playRotateSound,
        playHardDropSound,
        playPerfectSound,
    };
}
