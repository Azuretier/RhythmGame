/**
 * Multiplayer Battle Engine: types, constants, piece data, and utility functions.
 * Extracted from MultiplayerBattle.tsx to reduce file size.
 */
import type { BoardCell } from '@/types/multiplayer';
import { getThemedColor, PIECE_TYPES } from './tetris/constants';

// ===== Types =====
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

export interface Piece {
    type: PieceType;
    rotation: 0 | 1 | 2 | 3;
    x: number;
    y: number;
}

// ===== Constants =====
export const W = 10;
export const H = 20;
export const BPM = 120;
export const LOCK_DELAY = 500;
export const MAX_LOCK_MOVES = 15;
export const DAS = 167; // Delayed Auto Shift
export const ARR = 33;  // Auto Repeat Rate
export const SOFT_DROP_SPEED = 50;
export const GARBAGE_COLOR = '#555555';

// All 4 rotation states for each piece (SRS)
export const SHAPES: Record<PieceType, number[][][]> = {
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
export function createRNG(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

// ===== 7-Bag Randomizer =====
export function create7Bag(rng: () => number) {
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
export function getShape(type: PieceType, rotation: number): number[][] {
    return SHAPES[type][rotation];
}

export function createEmptyBoard(): (BoardCell | null)[][] {
    return Array.from({ length: H }, () => Array(W).fill(null));
}

export function isValid(piece: Piece, board: (BoardCell | null)[][]): boolean {
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

export function getWallKicks(type: PieceType, from: number, to: number): [number, number][] {
    const key = `${ROTATION_NAMES[from]}->${ROTATION_NAMES[to]}`;
    if (type === 'I') return WALL_KICK_I[key] || [[0, 0]];
    if (type === 'O') return [[0, 0]];
    return WALL_KICK_JLSTZ[key] || [[0, 0]];
}

export function tryRotate(piece: Piece, direction: 1 | -1, board: (BoardCell | null)[][]): Piece | null {
    const toRotation = ((piece.rotation + direction + 4) % 4) as 0 | 1 | 2 | 3;
    const kicks = getWallKicks(piece.type, piece.rotation, toRotation);

    for (const [dx, dy] of kicks) {
        const test: Piece = { ...piece, rotation: toRotation, x: piece.x + dx, y: piece.y - dy };
        if (isValid(test, board)) return test;
    }
    return null;
}

export function lockPiece(piece: Piece, board: (BoardCell | null)[][], worldIdx: number): (BoardCell | null)[][] {
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

export function clearLines(board: (BoardCell | null)[][]): { board: (BoardCell | null)[][]; cleared: number; clearedRows: number[] } {
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

export function getGhostY(piece: Piece, board: (BoardCell | null)[][]): number {
    let gy = piece.y;
    while (isValid({ ...piece, y: gy + 1 }, board)) gy++;
    return gy;
}

export function addGarbageLines(board: (BoardCell | null)[][], count: number, rng: () => number): (BoardCell | null)[][] {
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
export function detectTSpin(piece: Piece, board: (BoardCell | null)[][], wasRotation: boolean): 'none' | 'mini' | 'full' {
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
