import { useEffect, useRef, useState, useCallback } from 'react';
import { useGalaxyTD } from './useGalaxyTD';

interface UseGalaxyTDIntegrationProps {
    isPaused: boolean;
    gameOver: boolean;
    terrainPhase: string;
    setGameOver: (v: boolean) => void;
}

/**
 * Thin integration layer between the core Galaxy TD system (useGalaxyTD)
 * and the Rhythmia tetris component.
 *
 * Encapsulates:
 * - Stable refs for tick/onLineClear/placeTower (safe for setInterval closures)
 * - Galaxy TD game-over detection (lives <= 0 triggers main game over)
 * - Line-clear pulse state for tower aura visual
 * - Beat-timer helper that ticks the ring and processes ring kills
 */
export function useGalaxyTDIntegration({
    isPaused,
    gameOver,
    terrainPhase,
    setGameOver,
}: UseGalaxyTDIntegrationProps) {
    const galaxyTD = useGalaxyTD({ isPaused, gameOver, terrainPhase });

    // Stable refs for callbacks used inside setInterval (avoids stale closures)
    const galaxyTDTickRef = useRef(galaxyTD.tick);
    galaxyTDTickRef.current = galaxyTD.tick;
    const galaxyTDOnLineClearRef = useRef(galaxyTD.onLineClear);
    galaxyTDOnLineClearRef.current = galaxyTD.onLineClear;
    const galaxyTDPlaceTowerRef = useRef(galaxyTD.placeTower);
    galaxyTDPlaceTowerRef.current = galaxyTD.placeTower;

    // Galaxy TD game over — trigger main game over when TD lives reach 0
    useEffect(() => {
        if (galaxyTD.lives <= 0 && !gameOver) {
            setGameOver(true);
        }
    }, [galaxyTD.lives, gameOver, setGameOver]);

    // Line clear pulse for tower aura visual
    const [lineClearPulse, setLineClearPulse] = useState(false);
    const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Forward a line clear to Galaxy TD and flash the tower aura pulse. */
    const handleLineClear = useCallback((clearedLines: number) => {
        galaxyTDOnLineClearRef.current(clearedLines);

        setLineClearPulse(true);
        if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = setTimeout(() => setLineClearPulse(false), 600);
    }, []);

    /**
     * Beat-timer helper: tick the Galaxy ring and return the number of
     * ring-enemy kills this beat (for item drops + SE).
     */
    const tickBeat = useCallback((dtSeconds: number): number => {
        galaxyTDTickRef.current(dtSeconds);
        return galaxyTD.recentKillsRef.current;
    }, [galaxyTD.recentKillsRef]);

    return {
        /** The full Galaxy TD state and actions from useGalaxyTD */
        galaxyTD,
        /** Stable ref for tick — safe for setInterval */
        galaxyTDTickRef,
        /** Stable ref for onLineClear — safe for setInterval */
        galaxyTDOnLineClearRef,
        /** Stable ref for placeTower — safe for setInterval */
        galaxyTDPlaceTowerRef,
        /** Whether a line-clear aura pulse is active */
        lineClearPulse,
        /** Forward line clears to Galaxy TD + trigger aura pulse */
        handleLineClear,
        /** Tick the ring for the beat timer; returns ring kill count */
        tickBeat,
    };
}
