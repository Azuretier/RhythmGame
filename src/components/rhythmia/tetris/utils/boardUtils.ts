import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, WALL_KICKS_I, WALL_KICKS_JLSTZ, ROTATION_NAMES } from '../constants';
import type { Piece, Board } from '../types';

/**
 * Create an empty game board
 */
export const createEmptyBoard = (): Board =>
    Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

/**
 * Seven-bag randomization system (七種一巡)
 */
export const shuffleBag = (): string[] => {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Fisher-Yates shuffle
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
};

/**
 * Get tetromino shape for a given type and rotation
 */
export const getShape = (type: string, rotation: number): number[][] => {
    return TETROMINOES[type][rotation];
};

/**
 * Check if a piece position is valid on the board
 */
export const isValidPosition = (piece: Piece, boardState: Board): boolean => {
    const shape = getShape(piece.type, piece.rotation);
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = piece.x + x;
                const newY = piece.y + y;
                if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                    return false;
                }
                if (newY >= 0 && boardState[newY][newX] !== null) {
                    return false;
                }
            }
        }
    }
    return true;
};

/**
 * Get wall kick offsets for a rotation
 */
export const getWallKicks = (type: string, fromRotation: number, toRotation: number): [number, number][] => {
    const from = ROTATION_NAMES[fromRotation];
    const to = ROTATION_NAMES[toRotation];
    const key = `${from}->${to}`;

    if (type === 'I') {
        return WALL_KICKS_I[key] || [[0, 0]];
    } else if (type === 'O') {
        return [[0, 0]];
    } else {
        return WALL_KICKS_JLSTZ[key] || [[0, 0]];
    }
};

/**
 * Try to rotate a piece with wall kicks
 */
export const tryRotation = (piece: Piece, direction: 1 | -1, boardState: Board): Piece | null => {
    const fromRotation = piece.rotation;
    const toRotation = (piece.rotation + direction + 4) % 4;
    const kicks = getWallKicks(piece.type, fromRotation, toRotation);

    for (const [dx, dy] of kicks) {
        const testPiece: Piece = {
            ...piece,
            rotation: toRotation,
            x: piece.x + dx,
            y: piece.y - dy,
        };
        if (isValidPosition(testPiece, boardState)) {
            return testPiece;
        }
    }
    return null;
};

/**
 * Lock a piece into the board
 */
export const lockPiece = (piece: Piece, boardState: Board): Board => {
    const newBoard = boardState.map(row => [...row]);
    const shape = getShape(piece.type, piece.rotation);

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0 && boardY < BOARD_HEIGHT) {
                    newBoard[boardY][boardX] = piece.type;
                }
            }
        }
    }
    return newBoard;
};

/**
 * Clear completed lines and return new board with cleared line count
 */
export const clearLines = (boardState: Board): { newBoard: Board; clearedLines: number } => {
    const newBoard = boardState.filter(row => row.some(cell => cell === null));
    const clearedLines = BOARD_HEIGHT - newBoard.length;

    while (newBoard.length < BOARD_HEIGHT) {
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }

    return { newBoard, clearedLines };
};

/**
 * Calculate ghost piece position (where piece would land)
 */
export const getGhostY = (piece: Piece, boardState: Board): number => {
    let ghostY = piece.y;
    while (isValidPosition({ ...piece, y: ghostY + 1 }, boardState)) {
        ghostY++;
    }
    return ghostY;
};

/**
 * Create initial piece spawn
 */
export const createSpawnPiece = (type: string): Piece => {
    const shape = getShape(type, 0);
    return {
        type,
        rotation: 0,
        x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
        y: type === 'I' ? -1 : 0,
    };
};
