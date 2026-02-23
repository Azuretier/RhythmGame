'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './MultiplayerBattle.module.css';
import type { Player, ServerMessage, RelayPayload, BoardCell } from '@/types/multiplayer';
import type { FeatureSettings } from './tetris/types';
import { DEFAULT_FEATURE_SETTINGS } from './tetris/types';
import { FeatureCustomizer } from './tetris/components/FeatureCustomizer';
import { recordMultiplayerGameEnd, checkLiveMultiplayerAdvancements, saveLiveUnlocks } from '@/lib/advancements/storage';
import { useSkillTree } from '@/lib/skill-tree/context';
import AdvancementToast from './AdvancementToast';
import { useRhythmVFX } from './tetris/hooks/useRhythmVFX';
import { RhythmVFX } from './tetris/components/RhythmVFX';
import { BUFFER_ZONE, TERRAIN_DAMAGE_PER_LINE, TERRAIN_PARTICLES_PER_LINE, WORLDS, getThemedColor, PIECE_TYPES } from './tetris/constants';
import type { TerrainParticle, FloatingItem } from './tetris/types';
import { TerrainParticles } from './tetris/components/TerrainParticles';
import { FloatingItems } from './tetris/components/FloatingItems';

// Dynamically import VoxelWorldBackground (Three.js requires client-side only)
const VoxelWorldBackground = dynamic(() => import('./VoxelWorldBackground'), {
    ssr: false,
});

// ===== Types =====
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

interface Piece {
    type: PieceType;
    rotation: 0 | 1 | 2 | 3;
    x: number;
    y: number;
}

interface Props {
    ws: WebSocket;
    roomCode: string;
    playerId: string;
    playerName: string;
    opponents: Player[];
    gameSeed: number;
    onGameEnd: (winnerId: string) => void;
    onBackToLobby: () => void;
}

// ===== Constants =====
const W = 10;
const H = 20;
const BPM = 120;
const LOCK_DELAY = 500;
const MAX_LOCK_MOVES = 15;
const DAS = 167; // Delayed Auto Shift
const ARR = 33;  // Auto Repeat Rate
const SOFT_DROP_SPEED = 50;
const GARBAGE_COLOR = '#555555';


// All 4 rotation states for each piece (SRS)
const SHAPES: Record<PieceType, number[][][]> = {
    I: [
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
        [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    ],
    O: [
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1], [1, 1]],
    ],
    T: [
        [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
        [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
    ],
    S: [
        [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
        [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
        [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
    ],
    Z: [
        [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
        [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
    ],
    J: [
        [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
        [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
        [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    ],
    L: [
        [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
        [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
        [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
    ],
};

// SRS Wall Kick Data
const ROTATION_NAMES = ['0', 'R', '2', 'L'] as const;

const WALL_KICK_JLSTZ: Record<string, [number, number][]> = {
    '0->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'R->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    'L->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    'R->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'L->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const WALL_KICK_I: Record<string, [number, number][]> = {
    '0->R': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    'R->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2->L': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    'L->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    'R->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '2->R': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    'L->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '0->L': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// ===== Seeded RNG =====
function createRNG(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

// ===== 7-Bag Randomizer =====
function create7Bag(rng: () => number) {
    let bag: PieceType[] = [];

    return (): PieceType => {
        if (bag.length === 0) {
            bag = [...PIECE_TYPES] as PieceType[];
            // Fisher-Yates shuffle
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        return bag.pop()!;
    };
}

// ===== Helper Functions =====
function getShape(type: PieceType, rotation: number): number[][] {
    return SHAPES[type][rotation];
}

function createEmptyBoard(): (BoardCell | null)[][] {
    return Array.from({ length: H }, () => Array(W).fill(null));
}

function isValid(piece: Piece, board: (BoardCell | null)[][]): boolean {
    const shape = getShape(piece.type, piece.rotation);
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const nx = piece.x + x;
                const ny = piece.y + y;
                if (nx < 0 || nx >= W || ny >= H) return false;
                if (ny >= 0 && board[ny][nx]) return false;
            }
        }
    }
    return true;
}

function getWallKicks(type: PieceType, from: number, to: number): [number, number][] {
    const key = `${ROTATION_NAMES[from]}->${ROTATION_NAMES[to]}`;
    if (type === 'I') return WALL_KICK_I[key] || [[0, 0]];
    if (type === 'O') return [[0, 0]];
    return WALL_KICK_JLSTZ[key] || [[0, 0]];
}

function tryRotate(piece: Piece, direction: 1 | -1, board: (BoardCell | null)[][]): Piece | null {
    const toRotation = ((piece.rotation + direction + 4) % 4) as 0 | 1 | 2 | 3;
    const kicks = getWallKicks(piece.type, piece.rotation, toRotation);

    for (const [dx, dy] of kicks) {
        const test: Piece = { ...piece, rotation: toRotation, x: piece.x + dx, y: piece.y - dy };
        if (isValid(test, board)) return test;
    }
    return null;
}

function lockPiece(piece: Piece, board: (BoardCell | null)[][], worldIdx: number): (BoardCell | null)[][] {
    const newBoard = board.map(row => [...row]);
    const shape = getShape(piece.type, piece.rotation);
    const color = getThemedColor(piece.type, 'stage', worldIdx);

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const ny = piece.y + y;
                const nx = piece.x + x;
                if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                    newBoard[ny][nx] = { color };
                }
            }
        }
    }
    return newBoard;
}

function clearLines(board: (BoardCell | null)[][]): { board: (BoardCell | null)[][]; cleared: number; clearedRows: number[] } {
    const clearedRows: number[] = [];
    const remaining: (BoardCell | null)[][] = [];
    for (let y = 0; y < board.length; y++) {
        if (board[y].every(cell => cell !== null)) {
            clearedRows.push(y);
        } else {
            remaining.push(board[y]);
        }
    }
    const cleared = H - remaining.length;
    while (remaining.length < H) {
        remaining.unshift(Array(W).fill(null));
    }
    return { board: remaining, cleared, clearedRows };
}

function getGhostY(piece: Piece, board: (BoardCell | null)[][]): number {
    let gy = piece.y;
    while (isValid({ ...piece, y: gy + 1 }, board)) gy++;
    return gy;
}

function addGarbageLines(board: (BoardCell | null)[][], count: number, rng: () => number): (BoardCell | null)[][] {
    if (count <= 0) return board;
    const newBoard = board.slice(count);
    for (let i = 0; i < count; i++) {
        const row: (BoardCell | null)[] = Array(W).fill({ color: GARBAGE_COLOR } as BoardCell);
        const gap = Math.floor(rng() * W);
        row[gap] = null;
        newBoard.push(row);
    }
    return newBoard;
}

// ===== T-Spin Detection =====
function detectTSpin(piece: Piece, board: (BoardCell | null)[][], wasRotation: boolean): 'none' | 'mini' | 'full' {
    if (piece.type !== 'T' || !wasRotation) return 'none';

    // Check 4 corners around T-piece center
    const cx = piece.x + 1;
    const cy = piece.y + 1;
    const corners = [
        [cx - 1, cy - 1], [cx + 1, cy - 1],
        [cx - 1, cy + 1], [cx + 1, cy + 1],
    ];

    let filledCorners = 0;
    for (const [x, y] of corners) {
        if (x < 0 || x >= W || y < 0 || y >= H || (y >= 0 && board[y]?.[x])) {
            filledCorners++;
        }
    }

    if (filledCorners >= 3) {
        // Check front corners based on rotation to distinguish full vs mini
        const frontCorners: [number, number][] = [];
        switch (piece.rotation) {
            case 0: frontCorners.push([cx - 1, cy - 1], [cx + 1, cy - 1]); break;
            case 1: frontCorners.push([cx + 1, cy - 1], [cx + 1, cy + 1]); break;
            case 2: frontCorners.push([cx - 1, cy + 1], [cx + 1, cy + 1]); break;
            case 3: frontCorners.push([cx - 1, cy - 1], [cx - 1, cy + 1]); break;
        }
        let frontFilled = 0;
        for (const [x, y] of frontCorners) {
            if (x < 0 || x >= W || y < 0 || y >= H || (y >= 0 && board[y]?.[x])) {
                frontFilled++;
            }
        }
        return frontFilled >= 2 ? 'full' : 'mini';
    }
    return 'none';
}

// ===== Component =====
export const MultiplayerBattle: React.FC<Props> = ({
    ws,
    roomCode,
    playerId,
    playerName,
    opponents,
    gameSeed,
    onGameEnd,
    onBackToLobby,
}) => {
    const opponent = opponents[0];
    const { awardGamePoints, awardMultiplayerWinPoints } = useSkillTree();

    // Game state
    const boardRef = useRef<(BoardCell | null)[][]>(createEmptyBoard());
    const pieceRef = useRef<Piece | null>(null);
    const holdRef = useRef<PieceType | null>(null);
    const holdUsedRef = useRef(false);
    const nextQueueRef = useRef<PieceType[]>([]);
    const scoreRef = useRef(0);
    const comboRef = useRef(0);
    const linesRef = useRef(0);
    const gameOverRef = useRef(false);
    const lockTimerRef = useRef<number | null>(null);
    const lockMovesRef = useRef(0);
    const isOnGroundRef = useRef(false);
    const pendingGarbageRef = useRef(0);

    // T-Spin tracking
    const lastMoveWasRotationRef = useRef(false);
    const tSpinCountRef = useRef(0);

    // Back-to-Back tracking — consecutive difficult clears (Tetris or T-spin clear)
    const lastClearWasDifficultRef = useRef(false);

    // Action display (T-spin, Tetris, Back-to-Back) — stacking toasts
    const [actionToasts, setActionToasts] = useState<{ id: number; lines: string[]; color: string }[]>([]);
    const actionIdRef = useRef(0);

    // Speed tracking — sliding window timestamps for T-spin (30s) and Tetris (60s)
    const tSpinTimestampsRef = useRef<number[]>([]);
    const tetrisTimestampsRef = useRef<number[]>([]);
    const bestTSpinsIn30sRef = useRef(0);
    const bestTetrisIn60sRef = useRef(0);

    // Per-game stat tracking for advancements
    const gameHardDropsRef = useRef(0);
    const gamePiecesPlacedRef = useRef(0);
    const advRecordedRef = useRef(false);
    const liveNotifiedRef = useRef<Set<string>>(new Set());
    const [toastIds, setToastIds] = useState<string[]>([]);

    // Judgment display
    const [judgmentText, setJudgmentText] = useState('');
    const [judgmentColor, setJudgmentColor] = useState('#ffffff');
    const [showJudgment, setShowJudgment] = useState(false);
    const judgmentTimerRef = useRef<number | null>(null);

    // Beat phase for UI indicator
    const [beatPhaseDisplay, setBeatPhaseDisplay] = useState(0);

    // Voxel terrain state
    const [worldIdx, setWorldIdx] = useState(0);
    const [terrainSeed, setTerrainSeed] = useState(gameSeed);
    const [terrainTotal, setTerrainTotal] = useState(0);
    const [terrainDestroyedCount, setTerrainDestroyedCount] = useState(0);
    const [terrainParticles, setTerrainParticles] = useState<TerrainParticle[]>([]);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const nextParticleId = useRef(0);
    const nextFloatingId = useRef(0);

    // Feature settings (persisted in localStorage)
    const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('rhythmia_features');
                if (stored) return { ...DEFAULT_FEATURE_SETTINGS, ...JSON.parse(stored) };
            } catch { /* ignore */ }
        }
        return DEFAULT_FEATURE_SETTINGS;
    });
    const [showFeatures, setShowFeatures] = useState(false);

    const handleFeatureSettingsUpdate = useCallback((newSettings: FeatureSettings) => {
        setFeatureSettings(newSettings);
        try { localStorage.setItem('rhythmia_features', JSON.stringify(newSettings)); } catch { /* ignore */ }
    }, []);

    // Opponent state
    const opponentBoardRef = useRef<(BoardCell | null)[][]>(createEmptyBoard());
    const opponentScoreRef = useRef(0);
    const opponentLinesRef = useRef(0);
    const opponentComboRef = useRef(0);

    // For re-rendering
    const [, forceRender] = useState(0);
    const render = useCallback(() => forceRender(c => c + 1), []);

    // RNG
    const rngRef = useRef(createRNG(gameSeed));
    const bagRef = useRef(create7Bag(rngRef.current));
    const garbageRngRef = useRef(createRNG(gameSeed + 1));

    // Rhythm
    const lastBeatRef = useRef(Date.now());
    const beatPhaseRef = useRef(0);

    // Audio
    const audioCtxRef = useRef<AudioContext | null>(null);

    // VFX system
    const vfx = useRhythmVFX();
    const playerBoardDomRef = useRef<HTMLDivElement | null>(null);

    // Timers
    const dropTimerRef = useRef<number | null>(null);
    const beatTimerRef = useRef<number | null>(null);
    const beatAnimRef = useRef<number | null>(null);
    const syncTimerRef = useRef<number | null>(null);

    // Input state
    const keysRef = useRef<Set<string>>(new Set());
    const dasTimerRef = useRef<number | null>(null);
    const arrTimerRef = useRef<number | null>(null);
    const softDropTimerRef = useRef<number | null>(null);
    const lastDirRef = useRef<string>('');

    // ===== Judgment Display Helper =====
    const showJudgmentText = useCallback((text: string, color: string) => {
        if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
        setJudgmentText(text);
        setJudgmentColor(color);
        setShowJudgment(true);
        judgmentTimerRef.current = window.setTimeout(() => {
            setShowJudgment(false);
            judgmentTimerRef.current = null;
        }, 600);
    }, []);

    // ===== Action Display Helper =====
    const showActionMessage = useCallback((lines: string[], color: string) => {
        const id = ++actionIdRef.current;
        setActionToasts(prev => [...prev, { id, lines, color }]);
        window.setTimeout(() => {
            setActionToasts(prev => prev.filter(t => t.id !== id));
        }, 2500);
    }, []);

    // ===== Audio =====
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const playTone = useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + dur);
        } catch { }
    }, []);

    const playDrum = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        try {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch { }
    }, []);

    const playLineClear = useCallback((count: number) => {
        const freqs = [523, 659, 784, 1047];
        freqs.slice(0, count).forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle'), i * 60));
    }, [playTone]);

    const playPerfectSound = useCallback(() => {
        playTone(1047, 0.2, 'triangle');
    }, [playTone]);

    const playTSpinSound = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        try {
            const t = ctx.currentTime;
            // Ascending confirmation chime for T-Spin
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(523, t);
            osc1.frequency.exponentialRampToValueAtTime(1047, t + 0.15);
            gain1.gain.setValueAtTime(0.3, t);
            gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(t);
            osc1.stop(t + 0.2);
            // Lower crunch layer
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(300, t);
            osc2.frequency.exponentialRampToValueAtTime(100, t + 0.1);
            gain2.gain.setValueAtTime(0.15, t);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.12);
        } catch { }
    }, []);

    // ===== Terrain Ready Handler =====
    const handleTerrainReady = useCallback((totalBlocks: number) => {
        setTerrainTotal(totalBlocks);
    }, []);

    // ===== Terrain Particles =====
    const spawnTerrainParticles = useCallback((clearedRows: number[], boardCenterX: number, boardCenterY: number) => {
        if (clearedRows.length === 0) return;

        const newParticles: TerrainParticle[] = [];
        clearedRows.forEach(row => {
            const count = TERRAIN_PARTICLES_PER_LINE;
            for (let i = 0; i < count; i++) {
                const x = boardCenterX + (Math.random() - 0.5) * 400;
                const y = boardCenterY + (row - 10) * 30 + (Math.random() - 0.5) * 20;
                const vx = (Math.random() - 0.5) * 4;
                const vy = -2 - Math.random() * 3;
                const color = WORLDS[worldIdx]?.colors[Math.floor(Math.random() * 7)] || '#888888';
                const maxLife = 1.0;
                newParticles.push({
                    id: nextParticleId.current++,
                    x,
                    y,
                    vx,
                    vy,
                    size: 3 + Math.random() * 4,
                    color,
                    opacity: 1.0,
                    life: maxLife,
                    maxLife,
                });
            }
        });

        setTerrainParticles(prev => [...prev, ...newParticles]);
    }, [worldIdx]);

    // ===== Destroy Terrain =====
    const destroyTerrain = useCallback((linesCleared: number) => {
        const damage = linesCleared * TERRAIN_DAMAGE_PER_LINE;
        setTerrainDestroyedCount(prev => Math.min(prev + damage, terrainTotal));
    }, [terrainTotal]);

    // ===== Relay =====
    const sendRelay = useCallback((payload: RelayPayload) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'relay', payload }));
        }
    }, [ws]);

    const sendBoardUpdate = useCallback(() => {
        sendRelay({
            event: 'board_update',
            board: boardRef.current,
            score: scoreRef.current,
            lines: linesRef.current,
            combo: comboRef.current,
            piece: pieceRef.current?.type,
            hold: holdRef.current,
        });
    }, [sendRelay]);

    const sendGarbage = useCallback((lines: number) => {
        if (lines > 0) {
            sendRelay({ event: 'garbage', lines });
        }
    }, [sendRelay]);

    const sendGameOver = useCallback(() => {
        sendRelay({ event: 'game_over' });
    }, [sendRelay]);

    // ===== Piece Queue =====
    const fillQueue = useCallback(() => {
        while (nextQueueRef.current.length < 5) {
            nextQueueRef.current.push(bagRef.current());
        }
    }, []);

    const spawnPiece = useCallback((): boolean => {
        fillQueue();
        const type = nextQueueRef.current.shift()!;
        fillQueue();

        const shape = getShape(type, 0);
        const piece: Piece = {
            type,
            rotation: 0,
            x: Math.floor((W - shape[0].length) / 2),
            y: type === 'I' ? -1 : 0,
        };

        if (!isValid(piece, boardRef.current)) {
            gameOverRef.current = true;
            sendGameOver();
            if (!advRecordedRef.current) {
                advRecordedRef.current = true;
                const result = recordMultiplayerGameEnd({
                    score: scoreRef.current,
                    lines: linesRef.current,
                    won: false,
                    hardDrops: gameHardDropsRef.current,
                    piecesPlaced: gamePiecesPlacedRef.current,
                    bestTSpinsIn30s: bestTSpinsIn30sRef.current,
                    bestTetrisIn60s: bestTetrisIn60sRef.current,
                });
                if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
                awardGamePoints();
            }
            onGameEnd(opponent?.id || '');
            render();
            return false;
        }

        pieceRef.current = piece;
        holdUsedRef.current = false;
        lockMovesRef.current = 0;
        isOnGroundRef.current = false;
        lastMoveWasRotationRef.current = false;
        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }
        render();
        return true;
    }, [fillQueue, sendGameOver, onGameEnd, opponent, render, awardGamePoints]);

    // ===== Lock Delay =====
    const startLockTimer = useCallback(() => {
        if (lockTimerRef.current) return;
        lockTimerRef.current = window.setTimeout(() => {
            lockTimerRef.current = null;
            performLock();
        }, LOCK_DELAY);
    }, []);

    const resetLockTimer = useCallback(() => {
        if (lockMovesRef.current >= MAX_LOCK_MOVES) return;
        lockMovesRef.current++;
        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }
        if (pieceRef.current && !isValid({ ...pieceRef.current, y: pieceRef.current.y + 1 }, boardRef.current)) {
            startLockTimer();
        }
    }, [startLockTimer]);

    const dismissToast = useCallback(() => setToastIds([]), []);

    const pushLiveAdvancementCheck = useCallback(() => {
        const qualifying = checkLiveMultiplayerAdvancements({
            score: scoreRef.current,
            lines: linesRef.current,
            won: false,
            hardDrops: gameHardDropsRef.current,
            piecesPlaced: gamePiecesPlacedRef.current,
            bestTSpinsIn30s: bestTSpinsIn30sRef.current,
            bestTetrisIn60s: bestTetrisIn60sRef.current,
        });
        const fresh = qualifying.filter(id => !liveNotifiedRef.current.has(id));
        if (fresh.length > 0) {
            fresh.forEach(id => liveNotifiedRef.current.add(id));
            setToastIds(prev => [...prev, ...fresh]);
            saveLiveUnlocks(fresh);
        }
    }, []);

    // ===== Core Game Logic =====
    const performLock = useCallback(() => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current) return;

        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }

        // Check if piece is above board
        const shape = getShape(piece.type, piece.rotation);
        let aboveBoard = false;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] && piece.y + y < 0) {
                    aboveBoard = true;
                }
            }
        }

        if (aboveBoard) {
            gameOverRef.current = true;
            sendGameOver();
            if (!advRecordedRef.current) {
                advRecordedRef.current = true;
                const result = recordMultiplayerGameEnd({
                    score: scoreRef.current,
                    lines: linesRef.current,
                    won: false,
                    hardDrops: gameHardDropsRef.current,
                    piecesPlaced: gamePiecesPlacedRef.current,
                    bestTSpinsIn30s: bestTSpinsIn30sRef.current,
                    bestTetrisIn60s: bestTetrisIn60sRef.current,
                });
                if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
            }
            onGameEnd(opponent?.id || '');
            render();
            return;
        }

        // T-Spin detection (before locking to board)
        const tSpin = detectTSpin(piece, boardRef.current, lastMoveWasRotationRef.current);

        // Beat judgment
        const phase = beatPhaseRef.current;
        const onBeat = phase > 0.8 || phase < 0.12;
        let mult = 1;

        if (onBeat) {
            mult = 2;
            comboRef.current++;
            playPerfectSound();
            showJudgmentText('PERFECT', '#00FFFF');

            // VFX: combo change
            vfx.emit({ type: 'comboChange', combo: comboRef.current, onBeat: true });
            if (comboRef.current === 10) {
                vfx.emit({ type: 'feverStart', combo: comboRef.current });
            }
        } else {
            if (comboRef.current >= 10) {
                vfx.emit({ type: 'feverEnd' });
            }
            comboRef.current = 0;
        }

        // T-Spin tracking
        if (tSpin !== 'none') {
            tSpinCountRef.current++;
            playTSpinSound();
        }

        gamePiecesPlacedRef.current++;

        // Lock to board
        let newBoard = lockPiece(piece, boardRef.current, worldIdx);

        // Apply pending garbage before clearing
        const garbage = pendingGarbageRef.current;
        if (garbage > 0) {
            newBoard = addGarbageLines(newBoard, garbage, garbageRngRef.current);
            pendingGarbageRef.current = 0;
        }

        // Clear lines
        const { board: clearedBoard, cleared, clearedRows } = clearLines(newBoard);
        boardRef.current = clearedBoard;

        // Compose and show action messages (T-spin, Tetris, Back-to-Back)
        {
            const isDifficultClear = cleared > 0 && (cleared === 4 || tSpin !== 'none');
            const msgLines: string[] = [];
            let msgColor = '#ffffff';

            // Back-to-Back detection
            if (isDifficultClear && lastClearWasDifficultRef.current) {
                msgLines.push('BACK-TO-BACK');
            }

            // T-spin message + speed tracking
            if (tSpin !== 'none') {
                const mini = tSpin === 'mini' ? 'MINI ' : '';
                const clearName = cleared === 0 ? '' :
                                  cleared === 1 ? ' SINGLE' :
                                  cleared === 2 ? ' DOUBLE' :
                                  cleared === 3 ? ' TRIPLE' :
                                  cleared === 4 ? ' QUAD' : '';
                msgLines.push(`T-SPIN ${mini}${clearName}`.trim() + '!');
                msgColor = tSpin === 'full' ? '#A000F0' : '#C070FF';
                // Speed tracking: T-spins in 30s window
                const now = Date.now();
                tSpinTimestampsRef.current.push(now);
                tSpinTimestampsRef.current = tSpinTimestampsRef.current.filter(t => now - t <= 30000);
                if (tSpinTimestampsRef.current.length > bestTSpinsIn30sRef.current) {
                    bestTSpinsIn30sRef.current = tSpinTimestampsRef.current.length;
                }
            } else if (cleared === 4) {
                msgLines.push('TETRIS!');
                msgColor = '#00F0F0';
                // Speed tracking: Tetris clears in 60s window
                const now = Date.now();
                tetrisTimestampsRef.current.push(now);
                tetrisTimestampsRef.current = tetrisTimestampsRef.current.filter(t => now - t <= 60000);
                if (tetrisTimestampsRef.current.length > bestTetrisIn60sRef.current) {
                    bestTetrisIn60sRef.current = tetrisTimestampsRef.current.length;
                }
            }

            // Update B2B state (only affected by line clears)
            if (cleared > 0) {
                lastClearWasDifficultRef.current = isDifficultClear;
            }

            if (msgLines.length > 0) {
                showActionMessage(msgLines, msgColor);
            }
        }

        if (cleared > 0) {
            // Destroy terrain blocks
            destroyTerrain(cleared);

            // Spawn terrain particles at board center
            const boardCenterX = window.innerWidth / 2;
            const boardCenterY = window.innerHeight / 2;
            spawnTerrainParticles(clearedRows, boardCenterX, boardCenterY);

            // Base scoring with T-Spin bonuses
            let base = [0, 100, 300, 500, 800][cleared];
            if (tSpin === 'full') {
                base += 400 + 400 * cleared;
            } else if (tSpin === 'mini') {
                base += 100 + 200 * cleared;
            }

            const pts = base * mult * Math.max(1, comboRef.current);
            scoreRef.current += pts;
            linesRef.current += cleared;

            // Enhanced garbage calculation with T-Spin bonus
            let garbageToSend = [0, 0, 1, 2, 4][cleared];
            if (tSpin === 'full') {
                garbageToSend += [0, 2, 4, 6, 6][cleared]; // T-Spin bonus garbage
            } else if (tSpin === 'mini') {
                garbageToSend += 1;
            }
            garbageToSend += Math.floor(comboRef.current / 3);
            sendGarbage(garbageToSend);
            playLineClear(cleared);

            // VFX: line clear (offset rows by BUFFER_ZONE for VFX hook coordinate system)
            vfx.emit({
                type: 'lineClear',
                rows: clearedRows.map(r => r + BUFFER_ZONE),
                count: cleared,
                onBeat,
                combo: comboRef.current,
            });
        }

        pieceRef.current = null;
        lastMoveWasRotationRef.current = false;

        pushLiveAdvancementCheck();
        sendBoardUpdate();
        spawnPiece();
    }, [sendGameOver, onGameEnd, opponent, sendGarbage, sendBoardUpdate, playLineClear, playPerfectSound, playTSpinSound, spawnPiece, render, pushLiveAdvancementCheck, showJudgmentText, vfx, destroyTerrain, spawnTerrainParticles, showActionMessage]);

    // Wire up startLockTimer -> performLock circular dependency
    const startLockTimerRef = useRef(startLockTimer);
    startLockTimerRef.current = startLockTimer;

    const performLockRef = useRef(performLock);
    performLockRef.current = performLock;

    // ===== Movement =====
    const moveHorizontal = useCallback((dx: number) => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current) return false;

        const moved = { ...piece, x: piece.x + dx };
        if (isValid(moved, boardRef.current)) {
            pieceRef.current = moved;
            lastMoveWasRotationRef.current = false;
            playTone(196, 0.05, 'square');

            const onGround = !isValid({ ...moved, y: moved.y + 1 }, boardRef.current);
            if (onGround) {
                resetLockTimer();
            } else if (lockTimerRef.current) {
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = null;
            }

            render();
            return true;
        }
        return false;
    }, [playTone, resetLockTimer, render]);

    const moveDown = useCallback((): boolean => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current) return false;

        const moved = { ...piece, y: piece.y + 1 };
        if (isValid(moved, boardRef.current)) {
            pieceRef.current = moved;
            lastMoveWasRotationRef.current = false;

            if (!isValid({ ...moved, y: moved.y + 1 }, boardRef.current)) {
                if (!isOnGroundRef.current) {
                    isOnGroundRef.current = true;
                    startLockTimer();
                }
            }

            render();
            return true;
        } else {
            if (!isOnGroundRef.current) {
                isOnGroundRef.current = true;
                startLockTimer();
            }
            return false;
        }
    }, [startLockTimer, render]);

    const rotatePiece = useCallback((direction: 1 | -1) => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current) return;

        const fromRotation = piece.rotation;
        const rotated = tryRotate(piece, direction, boardRef.current);
        if (rotated) {
            pieceRef.current = rotated;
            lastMoveWasRotationRef.current = true;
            playTone(392, 0.1, 'square');

            // VFX: rotation trail (offset Y by BUFFER_ZONE for VFX hook coordinate system)
            vfx.emit({
                type: 'rotation',
                pieceType: piece.type,
                boardX: rotated.x,
                boardY: rotated.y + BUFFER_ZONE,
                fromRotation,
                toRotation: rotated.rotation,
            });

            const onGround = !isValid({ ...rotated, y: rotated.y + 1 }, boardRef.current);
            if (onGround) {
                resetLockTimer();
            } else if (lockTimerRef.current) {
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = null;
                isOnGroundRef.current = false;
            }

            render();
        }
    }, [playTone, resetLockTimer, render, vfx]);

    const hardDrop = useCallback(() => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current) return;

        gameHardDropsRef.current++;
        const gy = getGhostY(piece, boardRef.current);
        const dropDist = gy - piece.y;
        pieceRef.current = { ...piece, y: gy };
        scoreRef.current += dropDist * 2;
        playTone(196, 0.08, 'sawtooth');

        // VFX: hard drop particles (offset Y by BUFFER_ZONE for VFX hook coordinate system)
        vfx.emit({
            type: 'hardDrop',
            pieceType: piece.type,
            boardX: piece.x,
            boardY: gy + BUFFER_ZONE,
            dropDistance: dropDist,
        });

        performLockRef.current();
    }, [playTone, vfx]);

    const holdPiece = useCallback(() => {
        const piece = pieceRef.current;
        if (!piece || gameOverRef.current || holdUsedRef.current) return;

        holdUsedRef.current = true;
        const prevHold = holdRef.current;
        holdRef.current = piece.type;

        if (prevHold) {
            const shape = getShape(prevHold, 0);
            pieceRef.current = {
                type: prevHold,
                rotation: 0,
                x: Math.floor((W - shape[0].length) / 2),
                y: prevHold === 'I' ? -1 : 0,
            };
            lockMovesRef.current = 0;
            isOnGroundRef.current = false;
            lastMoveWasRotationRef.current = false;
            if (lockTimerRef.current) {
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = null;
            }
        } else {
            pieceRef.current = null;
            spawnPiece();
        }

        playTone(440, 0.08);
        render();
    }, [spawnPiece, playTone, render]);

    // ===== WebSocket Message Handler =====
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);
                if (msg.type === 'relayed' && msg.fromPlayerId !== playerId) {
                    const payload = msg.payload;
                    if (payload.event === 'board_update') {
                        opponentBoardRef.current = payload.board;
                        opponentScoreRef.current = payload.score;
                        opponentLinesRef.current = payload.lines;
                        opponentComboRef.current = payload.combo ?? 0;
                        render();
                    } else if (payload.event === 'garbage') {
                        pendingGarbageRef.current += payload.lines;
                        render();
                    } else if (payload.event === 'game_over') {
                        if (!gameOverRef.current) {
                            gameOverRef.current = true;
                            if (!advRecordedRef.current) {
                                advRecordedRef.current = true;
                                const result = recordMultiplayerGameEnd({
                                    score: scoreRef.current,
                                    lines: linesRef.current,
                                    won: true,
                                    hardDrops: gameHardDropsRef.current,
                                    piecesPlaced: gamePiecesPlacedRef.current,
                                    bestTSpinsIn30s: bestTSpinsIn30sRef.current,
                                    bestTetrisIn60s: bestTetrisIn60sRef.current,
                                });
                                if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
                                awardGamePoints();
                                awardMultiplayerWinPoints();
                            }
                            onGameEnd(playerId);
                            render();
                        }
                    }
                } else if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch { }
        };

        ws.addEventListener('message', handler);
        return () => ws.removeEventListener('message', handler);
    }, [ws, playerId, onGameEnd, render, awardGamePoints, awardMultiplayerWinPoints]);

    // ===== Initialize Game =====
    useEffect(() => {
        initAudio();

        // Reset state
        boardRef.current = createEmptyBoard();
        pieceRef.current = null;
        holdRef.current = null;
        holdUsedRef.current = false;
        nextQueueRef.current = [];
        scoreRef.current = 0;
        comboRef.current = 0;
        linesRef.current = 0;
        gameOverRef.current = false;
        pendingGarbageRef.current = 0;
        gameHardDropsRef.current = 0;
        gamePiecesPlacedRef.current = 0;
        tSpinCountRef.current = 0;
        lastMoveWasRotationRef.current = false;
        lastClearWasDifficultRef.current = false;
        tSpinTimestampsRef.current = [];
        tetrisTimestampsRef.current = [];
        bestTSpinsIn30sRef.current = 0;
        bestTetrisIn60sRef.current = 0;
        advRecordedRef.current = false;
        liveNotifiedRef.current = new Set();
        setToastIds([]);
        opponentBoardRef.current = createEmptyBoard();
        opponentScoreRef.current = 0;
        opponentLinesRef.current = 0;
        opponentComboRef.current = 0;

        // Reset RNG
        rngRef.current = createRNG(gameSeed);
        bagRef.current = create7Bag(rngRef.current);
        garbageRngRef.current = createRNG(gameSeed + 1);

        lastBeatRef.current = Date.now();

        fillQueue();
        spawnPiece();

        setTimeout(() => sendBoardUpdate(), 100);

        return () => {
            if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSeed]);

    // ===== Drop Timer =====
    useEffect(() => {
        if (gameOverRef.current) return;

        const level = Math.floor(linesRef.current / 10) + 1;
        const speed = Math.max(100, 1000 - (level - 1) * 80);

        dropTimerRef.current = window.setInterval(() => {
            if (!gameOverRef.current) {
                moveDown();
            }
        }, speed);

        return () => {
            if (dropTimerRef.current) clearInterval(dropTimerRef.current);
        };
    }, [moveDown]);

    // ===== Beat Timer =====
    useEffect(() => {
        if (gameOverRef.current) return;

        const interval = 60000 / BPM;
        lastBeatRef.current = Date.now();

        beatTimerRef.current = window.setInterval(() => {
            lastBeatRef.current = Date.now();
            playDrum();

            // VFX: beat pulse
            vfx.emit({ type: 'beat', bpm: BPM, intensity: 0.6 + Math.min(0.4, comboRef.current * 0.04) });
        }, interval);

        return () => {
            if (beatTimerRef.current) clearInterval(beatTimerRef.current);
        };
    }, [playDrum, vfx]);

    // ===== Beat Phase Animation =====
    useEffect(() => {
        if (gameOverRef.current) return;

        let frameCount = 0;
        const update = () => {
            if (!gameOverRef.current) {
                const interval = 60000 / BPM;
                const elapsed = Date.now() - lastBeatRef.current;
                beatPhaseRef.current = (elapsed % interval) / interval;

                // Update display at reduced frequency to avoid excessive re-renders
                frameCount++;
                if (frameCount % 2 === 0) {
                    setBeatPhaseDisplay(beatPhaseRef.current);
                }

                beatAnimRef.current = requestAnimationFrame(update);
            }
        };
        beatAnimRef.current = requestAnimationFrame(update);

        return () => {
            if (beatAnimRef.current) cancelAnimationFrame(beatAnimRef.current);
        };
    }, []);

    // ===== Periodic Board Sync =====
    useEffect(() => {
        if (gameOverRef.current) return;

        syncTimerRef.current = window.setInterval(() => {
            if (!gameOverRef.current) {
                sendBoardUpdate();
            }
        }, 500);

        return () => {
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        };
    }, [sendBoardUpdate]);

    // ===== Keyboard Controls =====
    useEffect(() => {
        const clearDAS = () => {
            if (dasTimerRef.current) { clearTimeout(dasTimerRef.current); dasTimerRef.current = null; }
            if (arrTimerRef.current) { clearInterval(arrTimerRef.current); arrTimerRef.current = null; }
        };

        const startDAS = (dir: string, dx: number) => {
            clearDAS();
            lastDirRef.current = dir;
            moveHorizontal(dx);
            dasTimerRef.current = window.setTimeout(() => {
                dasTimerRef.current = null;
                arrTimerRef.current = window.setInterval(() => moveHorizontal(dx), ARR);
            }, DAS);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOverRef.current) return;
            if (keysRef.current.has(e.key)) return;
            keysRef.current.add(e.key);

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    startDAS('left', -1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    startDAS('right', 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    softDropTimerRef.current = window.setInterval(() => moveDown(), SOFT_DROP_SPEED);
                    break;
                case 'ArrowUp':
                case 'x':
                case 'X':
                    e.preventDefault();
                    rotatePiece(1);
                    break;
                case 'z':
                case 'Z':
                case 'Control':
                    e.preventDefault();
                    rotatePiece(-1);
                    break;
                case ' ':
                    e.preventDefault();
                    hardDrop();
                    break;
                case 'Shift':
                case 'c':
                case 'C':
                    e.preventDefault();
                    holdPiece();
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key);

            switch (e.key) {
                case 'ArrowLeft':
                    if (lastDirRef.current === 'left') clearDAS();
                    break;
                case 'ArrowRight':
                    if (lastDirRef.current === 'right') clearDAS();
                    break;
                case 'ArrowDown':
                    if (softDropTimerRef.current) {
                        clearInterval(softDropTimerRef.current);
                        softDropTimerRef.current = null;
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            clearDAS();
            if (softDropTimerRef.current) clearInterval(softDropTimerRef.current);
        };
    }, [moveHorizontal, moveDown, rotatePiece, hardDrop, holdPiece]);

    // Persist advancement stats on unmount
    useEffect(() => {
        return () => {
            if (!gameOverRef.current) {
                recordMultiplayerGameEnd({
                    score: scoreRef.current,
                    lines: linesRef.current,
                    won: false,
                    hardDrops: gameHardDropsRef.current,
                    piecesPlaced: gamePiecesPlacedRef.current,
                    bestTSpinsIn30s: bestTSpinsIn30sRef.current,
                    bestTetrisIn60s: bestTetrisIn60sRef.current,
                });
            }
        };
    }, []);

    // Cleanup judgment timer on unmount
    useEffect(() => {
        return () => {
            if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
        };
    }, []);

    // Animate terrain particles with fixed interval
    useEffect(() => {
        if (terrainParticles.length === 0) return;

        const interval = setInterval(() => {
            setTerrainParticles(prev => {
                if (prev.length === 0) return prev;

                return prev
                    .map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        vy: p.vy + 0.2, // gravity
                        life: p.life - 0.02,
                        opacity: Math.max(0, p.life / p.maxLife),
                    }))
                    .filter(p => p.life > 0);
            });
        }, 16); // ~60 FPS

        return () => clearInterval(interval);
    }, [terrainParticles.length > 0]);

    // ===== Render =====
    const board = boardRef.current;
    const piece = pieceRef.current;
    const hold = holdRef.current;
    const nextQueue = nextQueueRef.current;
    const score = scoreRef.current;
    const combo = comboRef.current;
    const lines = linesRef.current;
    const gameOver = gameOverRef.current;
    const pendingGarbage = pendingGarbageRef.current;
    const opponentBoard = opponentBoardRef.current;
    const opponentScore = opponentScoreRef.current;
    const opponentLines = opponentLinesRef.current;
    const opponentCombo = opponentComboRef.current;

    // Beat phase indicator position (0 = start of beat, 1 = end)
    const beatIndicatorPos = beatPhaseDisplay;
    const isInPerfectWindow = beatIndicatorPos > 0.8 || beatIndicatorPos < 0.12;

    // Build display board with ghost + active piece
    const displayBoard = board.map(row => row.map(cell => cell ? { ...cell, ghost: false } : null));

    if (piece) {
        const gy = getGhostY(piece, board);
        const shape = getShape(piece.type, piece.rotation);
        const color = getThemedColor(piece.type, 'stage', worldIdx);

        // Ghost piece (conditional on feature setting)
        if (featureSettings.ghostPiece) {
            const gy = getGhostY(piece, board);
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const by = gy + y;
                        const bx = piece.x + x;
                        if (by >= 0 && by < H && bx >= 0 && bx < W && !displayBoard[by][bx]) {
                            displayBoard[by][bx] = { color, ghost: true };
                        }
                    }
                }
            }
        }

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const by = piece.y + y;
                    const bx = piece.x + x;
                    if (by >= 0 && by < H && bx >= 0 && bx < W) {
                        displayBoard[by][bx] = { color, ghost: false };
                    }
                }
            }
        }
    }

    const opponentDisplay = opponentBoard.map(row =>
        row.map(cell => cell ? { ...cell, ghost: false } : null)
    );

    const renderPreview = (type: PieceType) => {
        const shape = getShape(type, 0);
        const color = getThemedColor(type, 'stage', worldIdx);
        return (
            <div className={styles.previewGrid} style={{ gridTemplateColumns: `repeat(${shape[0].length}, auto)` }}>
                {shape.flat().map((val, i) => (
                    <div
                        key={i}
                        className={`${styles.previewCell} ${val ? styles.filled : ''}`}
                        style={val ? { backgroundColor: color, boxShadow: `0 0 6px ${color}` } : {}}
                    />
                ))}
            </div>
        );
    };

    const handleControlClick = (action: string) => {
        if (gameOver) return;
        switch (action) {
            case 'left': moveHorizontal(-1); break;
            case 'right': moveHorizontal(1); break;
            case 'down': moveDown(); break;
            case 'rotateCW': rotatePiece(1); break;
            case 'rotateCCW': rotatePiece(-1); break;
            case 'drop': hardDrop(); break;
            case 'hold': holdPiece(); break;
        }
    };

    return (
        <div className={styles.container}>
            {/* Settings gear button */}
            <button
                className={styles.settingsGearBtn}
                onClick={() => setShowFeatures(prev => !prev)}
                aria-label="Feature settings"
            >
                🎛
            </button>

            {/* Feature Customizer Overlay */}
            {showFeatures && (
                <div className={styles.featureOverlay}>
                    <FeatureCustomizer
                        settings={featureSettings}
                        onUpdate={handleFeatureSettingsUpdate}
                        onBack={() => setShowFeatures(false)}
                        mode="multiplayer"
                    />
                </div>
            )}

            {/* Voxel World Background */}
            <VoxelWorldBackground
                seed={terrainSeed}
                terrainPhase="dig"
                terrainDestroyedCount={terrainDestroyedCount}
                onTerrainReady={handleTerrainReady}
                worldIdx={worldIdx}
            />

            {/* Terrain destruction particle effects */}
            <TerrainParticles particles={terrainParticles} />

            {/* Floating item drops from terrain */}
            <FloatingItems items={floatingItems} />

            <div className={styles.battleArena}>
                {/* Player Side */}
                <div className={styles.playerSide}>
                    {/* Hold + Next */}
                    <div className={styles.sidePanel}>
                        <div className={styles.holdBox}>
                            <div className={styles.panelLabel}>HOLD</div>
                            {hold ? renderPreview(hold) : <div className={styles.emptyPreview} />}
                        </div>
                        <div className={styles.nextBox}>
                            <div className={styles.panelLabel}>NEXT</div>
                            {nextQueue.slice(0, 3).map((type, i) => (
                                <div key={i} className={styles.nextItem}>
                                    {renderPreview(type)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Board */}
                    <div className={styles.boardSection}>
                        <div className={styles.playerHeader}>
                            <div className={styles.playerName}>{playerName}</div>
                            <div className={styles.playerScore}>{score.toLocaleString()}</div>
                        </div>

                        <div className={styles.boardActionArea}>
                        <div className={styles.boardWrap}>
                            {/* Garbage meter */}
                            {featureSettings.garbageMeter && pendingGarbage > 0 && (
                                <div className={styles.garbageMeter}>
                                    <div
                                        className={styles.garbageFill}
                                        style={{ height: `${Math.round(Math.min(100, (pendingGarbage / H) * 100))}%` }}
                                    />
                                </div>
                            )}

                            {/* Judgment text overlay */}
                            {showJudgment && (
                                <div
                                    className={styles.judgmentOverlay}
                                    style={{ color: judgmentColor, textShadow: `0 0 20px ${judgmentColor}, 0 0 40px ${judgmentColor}` }}
                                >
                                    {judgmentText}
                                </div>
                            )}

                            {/* Combo counter overlay */}
                            {combo >= 3 && (
                                <div
                                    className={styles.comboOverlay}
                                    style={{
                                        fontSize: `${Math.min(1.4, 0.8 + combo * 0.06)}rem`,
                                        color: combo >= 10 ? '#FFD700' : combo >= 5 ? '#00FFFF' : 'rgba(255,255,255,0.7)',
                                        textShadow: combo >= 10
                                            ? '0 0 12px #FFD700, 0 0 24px #FFD700'
                                            : combo >= 5
                                                ? '0 0 8px #00FFFF'
                                                : 'none',
                                    }}
                                >
                                    {combo} COMBO
                                </div>
                            )}

                            <div ref={playerBoardDomRef} className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
                                {displayBoard.flat().map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`${styles.cell} ${cell && !cell.ghost ? styles.filled : ''} ${cell?.ghost ? styles.ghost : ''}`}
                                        style={cell && !cell.ghost ? { backgroundColor: cell.color, boxShadow: `0 0 8px ${cell.color}40` } : cell?.ghost ? { borderColor: `${cell.color}40` } : {}}
                                    />
                                ))}
                            </div>

                            {/* VFX Canvas Overlay */}
                            <RhythmVFX
                                canvasRef={vfx.canvasRef}
                                boardRef={playerBoardDomRef}
                                onBoardGeometry={vfx.updateBoardGeometry}
                                isPlaying={!gameOver}
                                onStart={vfx.start}
                                onStop={vfx.stop}
                            />
                        </div>
                        {/* Action display toasts (T-spin, Tetris, Back-to-Back) — stacking */}
                        {actionToasts.length > 0 && (
                            <div className={styles.actionToastContainer}>
                                {actionToasts.map(toast => (
                                    <div key={toast.id} className={styles.actionToast} style={{ '--action-color': toast.color } as React.CSSProperties}>
                                        {toast.lines.map((line, i) => (
                                            <div key={`${line}-${i}`} className={styles.actionLine}>
                                                {line}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>

                        {/* Beat Timing Indicator */}
                        <div className={styles.beatIndicator}>
                            <div className={styles.beatTrack}>
                                <div className={styles.beatPerfectZoneLeft} />
                                <div className={styles.beatPerfectZoneRight} />
                                <div
                                    className={`${styles.beatCursor} ${isInPerfectWindow ? styles.beatCursorPerfect : ''}`}
                                    style={{ left: `${beatIndicatorPos * 100}%` }}
                                />
                            </div>
                            <div className={styles.beatLabel}>
                                {isInPerfectWindow ? 'PERFECT' : 'BEAT'}
                            </div>
                        </div>

                        <div className={styles.statsRow}>
                            <span>Lines: {lines}</span>
                            <span>Combo: {combo}</span>
                            {tSpinCountRef.current > 0 && <span>T-Spins: {tSpinCountRef.current}</span>}
                        </div>
                    </div>
                </div>

                {/* VS Divider */}
                <div className={styles.vsDivider}>VS</div>

                {/* Opponent Side */}
                <div className={styles.opponentSide}>
                    <div className={styles.boardSection}>
                        <div className={styles.opponentHeader}>
                            <div className={styles.opponentName}>{opponent?.name || 'Opponent'}</div>
                            <div className={styles.opponentScore}>{opponentScore.toLocaleString()}</div>
                        </div>

                        <div className={`${styles.boardWrap} ${styles.opponentBoardWrap}`}>
                            {/* Opponent combo indicator */}
                            {opponentCombo >= 5 && (
                                <div className={styles.opponentComboIndicator}>
                                    {opponentCombo} COMBO
                                </div>
                            )}

                            <div className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
                                {opponentDisplay.flat().map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`${styles.cell} ${cell ? styles.filled : ''}`}
                                        style={cell ? { backgroundColor: cell.color, boxShadow: `0 0 6px ${cell.color}40` } : {}}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={styles.statsRow}>
                            <span>Lines: {opponentLines}</span>
                            {opponentCombo >= 3 && <span>Combo: {opponentCombo}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Controls */}
            <div className={styles.controls}>
                <div className={styles.controlRow}>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('hold'); }} onClick={() => handleControlClick('hold')}>H</button>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('rotateCCW'); }} onClick={() => handleControlClick('rotateCCW')}>&#x21BA;</button>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('rotateCW'); }} onClick={() => handleControlClick('rotateCW')}>&#x21BB;</button>
                    <button className={`${styles.ctrlBtn} ${styles.dropBtn}`} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('drop'); }} onClick={() => handleControlClick('drop')}>&#x2B07;</button>
                </div>
                <div className={styles.controlRow}>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('left'); }} onClick={() => handleControlClick('left')}>&#x2190;</button>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('down'); }} onClick={() => handleControlClick('down')}>&#x2193;</button>
                    <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('right'); }} onClick={() => handleControlClick('right')}>&#x2192;</button>
                </div>
            </div>

            {/* Game Over Overlay */}
            {
                gameOver && (
                    <div className={styles.gameOverOverlay}>
                        <h2 className={styles.gameOverTitle}>
                            GAME OVER
                        </h2>
                        <div className={styles.finalScores}>
                            <div>{playerName}: {score.toLocaleString()}</div>
                            <div>{opponent?.name || 'Opponent'}: {opponentScore.toLocaleString()}</div>
                        </div>
                        <button className={styles.backBtn} onClick={onBackToLobby}>
                            Back to Lobby
                        </button>
                    </div>
                )
            }

            {/* Advancement Toast */}
            {
                toastIds.length > 0 && (
                    <AdvancementToast
                        unlockedIds={toastIds}
                        onDismiss={dismissToast}
                    />
                )
            }
        </div >
    );
};

export default MultiplayerBattle;
