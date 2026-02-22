import { useState, useCallback, useEffect, useRef } from 'react';
import type { SideBoardSide, SideBoardState, CorruptionNode, SideBoardRaidMob, AnomalyEvent } from '../types';
import {
    SIDE_BOARD_WIDTH,
    SIDE_BOARD_HEIGHT,
    CORRUPTION_SEED_INTERVAL,
    CORRUPTION_GROWTH_INTERVAL,
    CORRUPTION_MAX_LEVEL,
    MAX_CORRUPTION_NODES,
    CORRUPTION_SPREAD_CHANCE,
    RAID_MOB_MOVE_INTERVAL,
    RAID_WAVE_INTERVAL,
    RAID_WAVE_SIZE,
    RAID_MAX_WAVES,
    RAID_MOB_HP,
} from '../constants';

// ===== ID counters =====
let nextCorruptionId = 0;
let nextRaidMobId = 0;
let nextAnomalyId = 0;

function createEmptySideBoard(side: SideBoardSide): SideBoardState {
    return {
        side,
        width: SIDE_BOARD_WIDTH,
        height: SIDE_BOARD_HEIGHT,
        corruption: [],
        raidMobs: [],
    };
}

interface UseCorruptionSystemProps {
    isPlaying: boolean;
    isPaused: boolean;
    gameOver: boolean;
    onRaidReached: (side: SideBoardSide) => void;
}

export function useCorruptionSystem({
    isPlaying,
    isPaused,
    gameOver,
    onRaidReached,
}: UseCorruptionSystemProps) {
    const [leftBoard, setLeftBoard] = useState<SideBoardState>(() => createEmptySideBoard('left'));
    const [rightBoard, setRightBoard] = useState<SideBoardState>(() => createEmptySideBoard('right'));
    const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
    const [activeAnomaly, setActiveAnomaly] = useState(false);
    const [anomalySide, setAnomalySide] = useState<SideBoardSide | null>(null);

    // Refs for stable access in intervals
    const leftBoardRef = useRef(leftBoard);
    const rightBoardRef = useRef(rightBoard);
    const anomaliesRef = useRef(anomalies);
    const isPausedRef = useRef(isPaused);
    const gameOverRef = useRef(gameOver);
    const onRaidReachedRef = useRef(onRaidReached);

    useEffect(() => { leftBoardRef.current = leftBoard; }, [leftBoard]);
    useEffect(() => { rightBoardRef.current = rightBoard; }, [rightBoard]);
    useEffect(() => { anomaliesRef.current = anomalies; }, [anomalies]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { onRaidReachedRef.current = onRaidReached; }, [onRaidReached]);

    // ===== Corruption Seeding =====
    const seedCorruption = useCallback(() => {
        const now = Date.now();
        const seedOnBoard = (board: SideBoardState): SideBoardState => {
            if (board.corruption.length >= MAX_CORRUPTION_NODES) return board;
            // Find a position not already corrupted
            const occupied = new Set(board.corruption.map(c => `${c.x},${c.y}`));
            let x: number, y: number;
            let attempts = 0;
            do {
                x = Math.floor(Math.random() * SIDE_BOARD_WIDTH);
                y = Math.floor(Math.random() * SIDE_BOARD_HEIGHT);
                attempts++;
            } while (occupied.has(`${x},${y}`) && attempts < 20);

            if (occupied.has(`${x},${y}`)) return board;

            const node: CorruptionNode = {
                id: nextCorruptionId++,
                x, y,
                level: 0,
                maxLevel: CORRUPTION_MAX_LEVEL,
                spawnTime: now,
                lastGrowTime: now,
            };
            return { ...board, corruption: [...board.corruption, node] };
        };

        setLeftBoard(prev => seedOnBoard(prev));
        setRightBoard(prev => seedOnBoard(prev));
    }, []);

    // ===== Corruption Growth =====
    const growCorruption = useCallback(() => {
        const now = Date.now();
        const triggeredAnomalies: { side: SideBoardSide }[] = [];

        const growOnBoard = (board: SideBoardState): SideBoardState => {
            const newCorruption: CorruptionNode[] = [];
            const spreadCandidates: CorruptionNode[] = [];

            for (const node of board.corruption) {
                const newLevel = node.level + 1;
                if (newLevel >= CORRUPTION_MAX_LEVEL) {
                    // Mature — trigger anomaly, remove node
                    triggeredAnomalies.push({ side: board.side });
                } else {
                    newCorruption.push({
                        ...node,
                        level: newLevel,
                        lastGrowTime: now,
                    });
                    // Chance to spread
                    if (Math.random() < CORRUPTION_SPREAD_CHANCE) {
                        spreadCandidates.push(node);
                    }
                }
            }

            // Handle spread
            const occupied = new Set(newCorruption.map(c => `${c.x},${c.y}`));
            for (const parent of spreadCandidates) {
                if (newCorruption.length >= MAX_CORRUPTION_NODES) break;
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                const nx = parent.x + dir[0];
                const ny = parent.y + dir[1];
                if (
                    nx >= 0 && nx < SIDE_BOARD_WIDTH &&
                    ny >= 0 && ny < SIDE_BOARD_HEIGHT &&
                    !occupied.has(`${nx},${ny}`)
                ) {
                    newCorruption.push({
                        id: nextCorruptionId++,
                        x: nx, y: ny,
                        level: 0,
                        maxLevel: CORRUPTION_MAX_LEVEL,
                        spawnTime: now,
                        lastGrowTime: now,
                    });
                    occupied.add(`${nx},${ny}`);
                }
            }

            return { ...board, corruption: newCorruption };
        };

        setLeftBoard(prev => growOnBoard(prev));
        setRightBoard(prev => growOnBoard(prev));

        // Trigger anomalies
        if (triggeredAnomalies.length > 0) {
            const newAnomalies: AnomalyEvent[] = triggeredAnomalies.map(({ side }) => ({
                id: nextAnomalyId++,
                side,
                triggerTime: now,
                waveCount: 0,
                maxWaves: RAID_MAX_WAVES,
                nextWaveTime: now, // First wave spawns immediately
                active: true,
            }));
            setAnomalies(prev => [...prev, ...newAnomalies]);
            setActiveAnomaly(true);
            setAnomalySide(triggeredAnomalies[0].side);
        }
    }, []);

    // ===== Spawn Raid Wave =====
    const spawnRaidWave = useCallback((side: SideBoardSide) => {
        const now = Date.now();
        const newMobs: SideBoardRaidMob[] = [];
        for (let i = 0; i < RAID_WAVE_SIZE; i++) {
            // Spawn at far edge: left board far edge = x:3, right board far edge = x:0
            const spawnX = side === 'left' ? SIDE_BOARD_WIDTH - 1 : 0;
            const spawnY = Math.floor(Math.random() * SIDE_BOARD_HEIGHT);
            newMobs.push({
                id: nextRaidMobId++,
                side,
                x: spawnX,
                y: spawnY,
                health: RAID_MOB_HP,
                maxHealth: RAID_MOB_HP,
                alive: true,
                onMainBoard: false,
                spawnTime: now,
            });
        }

        const setter = side === 'left' ? setLeftBoard : setRightBoard;
        setter(prev => ({ ...prev, raidMobs: [...prev.raidMobs, ...newMobs] }));
    }, []);

    // ===== Process Anomalies (spawn waves) =====
    const processAnomalies = useCallback(() => {
        const now = Date.now();
        setAnomalies(prev => {
            let anyActive = false;
            const updated = prev.map(anomaly => {
                if (!anomaly.active) return anomaly;

                // Check if it's time for next wave
                if (anomaly.waveCount < anomaly.maxWaves && now >= anomaly.nextWaveTime) {
                    spawnRaidWave(anomaly.side);
                    const newWaveCount = anomaly.waveCount + 1;
                    const result = {
                        ...anomaly,
                        waveCount: newWaveCount,
                        nextWaveTime: now + RAID_WAVE_INTERVAL,
                    };
                    anyActive = true;
                    return result;
                }

                // Check if anomaly is done (all waves spawned and all mobs dead)
                if (anomaly.waveCount >= anomaly.maxWaves) {
                    const board = anomaly.side === 'left' ? leftBoardRef.current : rightBoardRef.current;
                    const aliveMobs = board.raidMobs.filter(m => m.alive && m.side === anomaly.side);
                    if (aliveMobs.length === 0) {
                        return { ...anomaly, active: false };
                    }
                }

                anyActive = true;
                return anomaly;
            });

            // Clean up completed anomalies
            const active = updated.filter(a => a.active);
            if (!anyActive) {
                setActiveAnomaly(false);
                setAnomalySide(null);
            } else {
                setActiveAnomaly(true);
            }
            return active.length > 0 ? active : [];
        });
    }, [spawnRaidWave]);

    // ===== Move Raid Mobs =====
    const moveRaidMobs = useCallback(() => {
        const moveOnBoard = (board: SideBoardState): SideBoardState => {
            const updatedMobs = board.raidMobs.map(mob => {
                if (!mob.alive || mob.onMainBoard) return mob;

                // Move toward the main board edge
                let newX = mob.x;
                if (board.side === 'left') {
                    newX = mob.x - 1; // Move left toward x=0 (board edge closest to tetris)
                } else {
                    newX = mob.x + 1; // Move right toward x=3 (board edge closest to tetris)
                }

                // Check if reached the edge
                const reachedEdge = board.side === 'left'
                    ? newX < 0
                    : newX >= SIDE_BOARD_WIDTH;

                if (reachedEdge) {
                    // Mob reached the main board
                    onRaidReachedRef.current(board.side);
                    return { ...mob, onMainBoard: true, alive: false };
                }

                return { ...mob, x: newX };
            });

            // Remove dead mobs that have reached the board
            const aliveMobs = updatedMobs.filter(m => m.alive || !m.onMainBoard);
            return { ...board, raidMobs: aliveMobs };
        };

        setLeftBoard(prev => moveOnBoard(prev));
        setRightBoard(prev => moveOnBoard(prev));
    }, []);

    // ===== Kill Raid Mobs (called when lines are cleared) =====
    const killRaidMobs = useCallback((count: number) => {
        // Kill mobs that are on the side boards (closest to edge first)
        let remaining = count;

        const killOnBoard = (board: SideBoardState): SideBoardState => {
            if (remaining <= 0) return board;

            // Sort by distance to edge (closest first)
            const sortedMobs = [...board.raidMobs].filter(m => m.alive);
            sortedMobs.sort((a, b) => {
                const distA = board.side === 'left' ? a.x : SIDE_BOARD_WIDTH - 1 - a.x;
                const distB = board.side === 'left' ? b.x : SIDE_BOARD_WIDTH - 1 - b.x;
                return distA - distB;
            });

            const killedIds = new Set<number>();
            for (const mob of sortedMobs) {
                if (remaining <= 0) break;
                killedIds.add(mob.id);
                remaining--;
            }

            if (killedIds.size === 0) return board;

            return {
                ...board,
                raidMobs: board.raidMobs.map(m =>
                    killedIds.has(m.id) ? { ...m, alive: false } : m
                ).filter(m => m.alive),
            };
        };

        setLeftBoard(prev => killOnBoard(prev));
        setRightBoard(prev => killOnBoard(prev));
    }, []);

    // ===== Reset =====
    const reset = useCallback(() => {
        setLeftBoard(createEmptySideBoard('left'));
        setRightBoard(createEmptySideBoard('right'));
        setAnomalies([]);
        setActiveAnomaly(false);
        setAnomalySide(null);
        nextCorruptionId = 0;
        nextRaidMobId = 0;
        nextAnomalyId = 0;
    }, []);

    // ===== Corruption Seed Timer =====
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            seedCorruption();
        }, CORRUPTION_SEED_INTERVAL);

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, seedCorruption]);

    // ===== Corruption Growth Timer =====
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            growCorruption();
        }, CORRUPTION_GROWTH_INTERVAL);

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, growCorruption]);

    // ===== Raid Mob Movement Timer =====
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            moveRaidMobs();
        }, RAID_MOB_MOVE_INTERVAL);

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, moveRaidMobs]);

    // ===== Anomaly Processing Timer =====
    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const timer = window.setInterval(() => {
            if (isPausedRef.current || gameOverRef.current) return;
            processAnomalies();
        }, 1000); // Check every second

        return () => clearInterval(timer);
    }, [isPlaying, gameOver, processAnomalies]);

    return {
        leftBoard,
        rightBoard,
        activeAnomaly,
        anomalySide,
        killRaidMobs,
        reset,
    };
}
