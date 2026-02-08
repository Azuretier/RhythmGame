// ===== Tetris AI Engine =====
// Smart AI opponent for ranked matches
// Uses heuristic-based evaluation with configurable difficulty

import type { BoardCell } from '@/types/multiplayer';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

interface Piece {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

interface AIMove {
  rotation: 0 | 1 | 2 | 3;
  x: number;
  score: number;
}

// Board dimensions
const W = 10;
const H = 20;

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

const COLORS: Record<PieceType, string> = {
  I: '#00F0F0', O: '#F0F000', T: '#A000F0', S: '#00F000',
  Z: '#F00000', J: '#0000F0', L: '#F0A000',
};

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]]],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

// AI difficulty weights
export interface AIDifficulty {
  // Heuristic weights
  heightWeight: number;
  holesWeight: number;
  bumpinessWeight: number;
  lineClearWeight: number;
  wellDepthWeight: number;
  // Timing: ms between moves
  moveDelay: number;
  // Probability of making a suboptimal move (0-1)
  mistakeRate: number;
}

export const AI_DIFFICULTIES: Record<string, AIDifficulty> = {
  easy: {
    heightWeight: -0.3,
    holesWeight: -0.5,
    bumpinessWeight: -0.15,
    lineClearWeight: 0.6,
    wellDepthWeight: 0.05,
    moveDelay: 800,
    mistakeRate: 0.3,
  },
  medium: {
    heightWeight: -0.51,
    holesWeight: -0.76,
    bumpinessWeight: -0.18,
    lineClearWeight: 0.76,
    wellDepthWeight: 0.1,
    moveDelay: 500,
    mistakeRate: 0.1,
  },
  hard: {
    heightWeight: -0.51,
    holesWeight: -0.99,
    bumpinessWeight: -0.18,
    lineClearWeight: 0.76,
    wellDepthWeight: 0.15,
    moveDelay: 300,
    mistakeRate: 0.02,
  },
};

// Get AI difficulty based on rank points
export function getDifficultyForRank(points: number): AIDifficulty {
  if (points < 1500) return AI_DIFFICULTIES.easy;
  if (points < 5000) return AI_DIFFICULTIES.medium;
  return AI_DIFFICULTIES.hard;
}

function getShape(type: PieceType, rotation: number): number[][] {
  return SHAPES[type][rotation];
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

function lockPiece(piece: Piece, board: (BoardCell | null)[][]): (BoardCell | null)[][] {
  const newBoard = board.map(row => [...row]);
  const shape = getShape(piece.type, piece.rotation);
  const color = COLORS[piece.type];
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

function clearLines(board: (BoardCell | null)[][]): { board: (BoardCell | null)[][]; cleared: number } {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const cleared = H - remaining.length;
  while (remaining.length < H) {
    remaining.unshift(Array(W).fill(null));
  }
  return { board: remaining, cleared };
}

function getGhostY(piece: Piece, board: (BoardCell | null)[][]): number {
  let gy = piece.y;
  while (isValid({ ...piece, y: gy + 1 }, board)) gy++;
  return gy;
}

// ===== Heuristic Evaluation =====

function getColumnHeights(board: (BoardCell | null)[][]): number[] {
  const heights = new Array(W).fill(0);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (board[y][x]) {
        heights[x] = H - y;
        break;
      }
    }
  }
  return heights;
}

function countHoles(board: (BoardCell | null)[][]): number {
  let holes = 0;
  for (let x = 0; x < W; x++) {
    let foundBlock = false;
    for (let y = 0; y < H; y++) {
      if (board[y][x]) {
        foundBlock = true;
      } else if (foundBlock) {
        holes++;
      }
    }
  }
  return holes;
}

function getBumpiness(heights: number[]): number {
  let bumpiness = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }
  return bumpiness;
}

function getAggregateHeight(heights: number[]): number {
  return heights.reduce((sum, h) => sum + h, 0);
}

function getWellDepth(heights: number[]): number {
  let maxWell = 0;
  for (let i = 0; i < W; i++) {
    const left = i > 0 ? heights[i - 1] : H;
    const right = i < W - 1 ? heights[i + 1] : H;
    const well = Math.min(left, right) - heights[i];
    if (well > maxWell) maxWell = well;
  }
  return maxWell;
}

function evaluateBoard(
  board: (BoardCell | null)[][],
  linesCleared: number,
  difficulty: AIDifficulty,
): number {
  const heights = getColumnHeights(board);
  const aggregateHeight = getAggregateHeight(heights);
  const holes = countHoles(board);
  const bumpiness = getBumpiness(heights);
  const wellDepth = getWellDepth(heights);

  return (
    difficulty.heightWeight * aggregateHeight +
    difficulty.holesWeight * holes +
    difficulty.bumpinessWeight * bumpiness +
    difficulty.lineClearWeight * linesCleared +
    difficulty.wellDepthWeight * wellDepth
  );
}

// ===== AI Move Selection =====

function getAllPossibleMoves(
  pieceType: PieceType,
  board: (BoardCell | null)[][],
): AIMove[] {
  const moves: AIMove[] = [];
  const rotations: (0 | 1 | 2 | 3)[] = pieceType === 'O' ? [0] : [0, 1, 2, 3];

  for (const rotation of rotations) {
    const shape = getShape(pieceType, rotation);
    const shapeWidth = shape[0].length;

    // Try all x positions
    for (let x = -2; x < W + 2; x++) {
      const piece: Piece = { type: pieceType, rotation, x, y: pieceType === 'I' ? -1 : 0 };

      if (!isValid(piece, board)) continue;

      // Drop to bottom
      const landY = getGhostY(piece, board);
      const landedPiece: Piece = { ...piece, y: landY };

      // Lock and evaluate
      const newBoard = lockPiece(landedPiece, board);
      const { board: clearedBoard, cleared } = clearLines(newBoard);

      // Check that piece isn't entirely above the board
      let aboveBoard = true;
      for (let sy = 0; sy < shape.length; sy++) {
        for (let sx = 0; sx < shapeWidth; sx++) {
          if (shape[sy][sx] && landY + sy >= 0) {
            aboveBoard = false;
          }
        }
      }
      if (aboveBoard) continue;

      moves.push({ rotation, x, score: 0 });
      // Store cleared board info for later evaluation
      (moves[moves.length - 1] as AIMove & { clearedBoard: (BoardCell | null)[][]; cleared: number }).clearedBoard = clearedBoard;
      (moves[moves.length - 1] as AIMove & { cleared: number }).cleared = cleared;
    }
  }

  return moves;
}

export function findBestMove(
  pieceType: PieceType,
  board: (BoardCell | null)[][],
  difficulty: AIDifficulty,
): AIMove | null {
  const moves = getAllPossibleMoves(pieceType, board);
  if (moves.length === 0) return null;

  // Score each move
  for (const move of moves) {
    const piece: Piece = { type: pieceType, rotation: move.rotation, x: move.x, y: pieceType === 'I' ? -1 : 0 };
    const landY = getGhostY(piece, board);
    const landedPiece: Piece = { ...piece, y: landY };
    const newBoard = lockPiece(landedPiece, board);
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    move.score = evaluateBoard(clearedBoard, cleared, difficulty);
  }

  // Sort by score (highest first)
  moves.sort((a, b) => b.score - a.score);

  // Apply mistake rate: sometimes pick a suboptimal move
  if (Math.random() < difficulty.mistakeRate && moves.length > 1) {
    const index = Math.min(
      Math.floor(Math.random() * Math.min(5, moves.length)),
      moves.length - 1
    );
    return moves[index];
  }

  return moves[0];
}

// ===== AI Game Runner =====
// Runs a complete AI game loop, emitting board updates via callback

export interface AIGameCallbacks {
  onBoardUpdate: (board: (BoardCell | null)[][], score: number, lines: number, combo: number, piece?: string, hold?: string | null) => void;
  onGarbage: (lines: number) => void;
  onGameOver: () => void;
}

export class TetrisAIGame {
  private board: (BoardCell | null)[][] = [];
  private score = 0;
  private lines = 0;
  private combo = 0;
  private gameOver = false;
  private difficulty: AIDifficulty;
  private callbacks: AIGameCallbacks;
  private rng: () => number;
  private bag: PieceType[] = [];
  private garbageRng: () => number;
  private pendingGarbage = 0;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private holdPiece: PieceType | null = null;
  private holdUsed = false;
  private nextQueue: PieceType[] = [];

  constructor(
    seed: number,
    difficulty: AIDifficulty,
    callbacks: AIGameCallbacks,
  ) {
    this.difficulty = difficulty;
    this.callbacks = callbacks;

    // Create seeded RNG (same as multiplayer)
    let s = seed;
    this.rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    let gs = seed + 1;
    this.garbageRng = () => {
      gs = (gs * 1103515245 + 12345) & 0x7fffffff;
      return gs / 0x7fffffff;
    };

    this.board = Array.from({ length: H }, () => Array(W).fill(null));
    this.fillQueue();
  }

  private fillQueue(): void {
    while (this.nextQueue.length < 5) {
      if (this.bag.length === 0) {
        this.bag = [...PIECE_TYPES];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.rng() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      this.nextQueue.push(this.bag.pop()!);
    }
  }

  private nextPiece(): PieceType {
    this.fillQueue();
    const p = this.nextQueue.shift()!;
    this.fillQueue();
    return p;
  }

  start(): void {
    this.playNextPiece();
  }

  stop(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    this.gameOver = true;
  }

  addGarbage(count: number): void {
    this.pendingGarbage += count;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  private playNextPiece(): void {
    if (this.gameOver) return;

    const pieceType = this.nextPiece();
    this.holdUsed = false;

    // Add small random delay variation for realism
    const delayVariation = Math.floor(Math.random() * 200) - 50;
    const delay = Math.max(150, this.difficulty.moveDelay + delayVariation);

    this.moveTimer = setTimeout(() => {
      if (this.gameOver) return;
      this.executePiece(pieceType);
    }, delay);
  }

  private executePiece(pieceType: PieceType): void {
    if (this.gameOver) return;

    // Apply pending garbage before placing
    if (this.pendingGarbage > 0) {
      this.applyGarbage(this.pendingGarbage);
      this.pendingGarbage = 0;
    }

    // Find best move
    const bestMove = findBestMove(pieceType, this.board, this.difficulty);

    if (!bestMove) {
      // Game over - can't place
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    // Create and place piece
    const piece: Piece = {
      type: pieceType,
      rotation: bestMove.rotation,
      x: bestMove.x,
      y: pieceType === 'I' ? -1 : 0,
    };

    const landY = getGhostY(piece, this.board);
    const landedPiece: Piece = { ...piece, y: landY };

    // Check if piece is above board
    const shape = getShape(pieceType, bestMove.rotation);
    let aboveBoard = true;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] && landY + y >= 0) aboveBoard = false;
      }
    }

    if (aboveBoard) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    // Lock piece
    this.board = lockPiece(landedPiece, this.board);

    // Clear lines
    const { board: clearedBoard, cleared } = clearLines(this.board);
    this.board = clearedBoard;

    if (cleared > 0) {
      this.combo++;
      const base = [0, 100, 300, 500, 800][cleared];
      this.score += base * Math.max(1, this.combo);
      this.lines += cleared;

      // Send garbage
      const garbageToSend = [0, 0, 1, 2, 4][cleared] + Math.floor(this.combo / 3);
      if (garbageToSend > 0) {
        this.callbacks.onGarbage(garbageToSend);
      }
    } else {
      this.combo = 0;
    }

    // Emit board update
    this.callbacks.onBoardUpdate(
      this.board,
      this.score,
      this.lines,
      this.combo,
      pieceType,
      this.holdPiece,
    );

    // Play next piece
    this.playNextPiece();
  }

  private applyGarbage(count: number): void {
    if (count <= 0) return;
    const newBoard = this.board.slice(count);
    for (let i = 0; i < count; i++) {
      const row: (BoardCell | null)[] = Array(W).fill({ color: '#555555' } as BoardCell);
      const gap = Math.floor(this.garbageRng() * W);
      row[gap] = null;
      newBoard.push(row);
    }
    this.board = newBoard;
  }
}
