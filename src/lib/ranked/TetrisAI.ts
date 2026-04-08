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

export interface AIPlacementResult {
  pieceType: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
  clearedLines: number;
  tSpin: 'none' | 'mini' | 'full';
  combo: number;
}

interface AIMove {
  rotation: 0 | 1 | 2 | 3;
  x: number;
  score: number;
}

export interface AIBoardConfig {
  visibleRows?: number;
  hiddenRows?: number;
}

// Board dimensions
const W = 10;
const DEFAULT_VISIBLE_ROWS = 20;
const DEFAULT_HIDDEN_ROWS = 0;

// Minimum score advantage the next/hold piece must have to justify saving the current piece
const HOLD_ADVANTAGE_THRESHOLD = 0.5;

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

// I-pieces start one row above the visible board to allow valid 4-wide placement
function getInitialY(type: PieceType, hiddenRows = DEFAULT_HIDDEN_ROWS): number {
  if (hiddenRows > 0) return hiddenRows - 1;
  return type === 'I' ? -1 : 0;
}

function getBoardHeight(board: (BoardCell | null)[][]): number {
  return board.length;
}

function getVisibleStart(board: (BoardCell | null)[][], visibleRows = DEFAULT_VISIBLE_ROWS): number {
  return Math.max(0, getBoardHeight(board) - visibleRows);
}

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
  // Whether to evaluate the next queued piece for each placement (look-ahead)
  lookAhead: boolean;
  // Whether to use the hold piece strategically
  useHold: boolean;
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
    lookAhead: false,
    useHold: false,
  },
  medium: {
    heightWeight: -0.51,
    holesWeight: -0.76,
    bumpinessWeight: -0.18,
    lineClearWeight: 0.76,
    wellDepthWeight: 0.1,
    moveDelay: 500,
    mistakeRate: 0.1,
    lookAhead: false,
    useHold: false,
  },
  hard: {
    heightWeight: -0.55,
    holesWeight: -1.0,
    bumpinessWeight: -0.20,
    lineClearWeight: 0.80,
    wellDepthWeight: 0.15,
    moveDelay: 250,
    mistakeRate: 0.01,
    lookAhead: true,
    useHold: false,
  },
  expert: {
    heightWeight: -0.66,
    holesWeight: -1.2,
    bumpinessWeight: -0.24,
    lineClearWeight: 1.0,
    wellDepthWeight: 0.20,
    moveDelay: 180,
    mistakeRate: 0.0,
    lookAhead: true,
    useHold: true,
  },
};

// Get AI difficulty based on rank points
export function getDifficultyForRank(points: number): AIDifficulty {
  if (points < 1500) return AI_DIFFICULTIES.easy;
  if (points < 5000) return AI_DIFFICULTIES.medium;
  if (points < 10000) return AI_DIFFICULTIES.hard;
  return AI_DIFFICULTIES.expert;
}

function getShape(type: PieceType, rotation: number): number[][] {
  return SHAPES[type][rotation];
}

function isValid(piece: Piece, board: (BoardCell | null)[][]): boolean {
  const boardHeight = getBoardHeight(board);
  const shape = getShape(piece.type, piece.rotation);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const nx = piece.x + x;
        const ny = piece.y + y;
        if (nx < 0 || nx >= W || ny >= boardHeight) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
    }
  }
  return true;
}

function lockPiece(piece: Piece, board: (BoardCell | null)[][]): (BoardCell | null)[][] {
  const boardHeight = getBoardHeight(board);
  const newBoard = board.map(row => [...row]);
  const shape = getShape(piece.type, piece.rotation);
  const color = COLORS[piece.type];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const ny = piece.y + y;
        const nx = piece.x + x;
        if (ny >= 0 && ny < boardHeight && nx >= 0 && nx < W) {
          newBoard[ny][nx] = { color };
        }
      }
    }
  }
  return newBoard;
}

function clearLines(board: (BoardCell | null)[][]): { board: (BoardCell | null)[][]; cleared: number } {
  const boardHeight = getBoardHeight(board);
  const remaining = board.filter(row => row.some(cell => cell === null));
  const cleared = boardHeight - remaining.length;
  while (remaining.length < boardHeight) {
    remaining.unshift(Array(W).fill(null));
  }
  return { board: remaining, cleared };
}

function detectTSpin(piece: Piece, board: (BoardCell | null)[][], wasRotation: boolean): 'none' | 'mini' | 'full' {
  if (piece.type !== 'T' || !wasRotation) return 'none';
  const boardHeight = getBoardHeight(board);

  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners: Array<[number, number]> = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];

  let filledCorners = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= W || y < 0 || y >= boardHeight || board[y]?.[x]) {
      filledCorners += 1;
    }
  }

  if (filledCorners < 3) return 'none';

  const frontCorners: Array<[number, number]> = [];
  switch (piece.rotation) {
    case 0:
      frontCorners.push([cx - 1, cy - 1], [cx + 1, cy - 1]);
      break;
    case 1:
      frontCorners.push([cx + 1, cy - 1], [cx + 1, cy + 1]);
      break;
    case 2:
      frontCorners.push([cx - 1, cy + 1], [cx + 1, cy + 1]);
      break;
    case 3:
      frontCorners.push([cx - 1, cy - 1], [cx - 1, cy + 1]);
      break;
  }

  let frontFilled = 0;
  for (const [x, y] of frontCorners) {
    if (x < 0 || x >= W || y < 0 || y >= boardHeight || board[y]?.[x]) {
      frontFilled += 1;
    }
  }

  return frontFilled >= 2 ? 'full' : 'mini';
}

function getGhostY(piece: Piece, board: (BoardCell | null)[][]): number {
  let gy = piece.y;
  while (isValid({ ...piece, y: gy + 1 }, board)) gy++;
  return gy;
}

// ===== Heuristic Evaluation =====

function getColumnHeights(board: (BoardCell | null)[][]): number[] {
  const boardHeight = getBoardHeight(board);
  const heights = new Array(W).fill(0);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < boardHeight; y++) {
      if (board[y][x]) {
        heights[x] = boardHeight - y;
        break;
      }
    }
  }
  return heights;
}

function countHoles(board: (BoardCell | null)[][]): number {
  const boardHeight = getBoardHeight(board);
  let holes = 0;
  for (let x = 0; x < W; x++) {
    let foundBlock = false;
    for (let y = 0; y < boardHeight; y++) {
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
  const boardHeight = Math.max(DEFAULT_VISIBLE_ROWS, ...heights, 0);
  let maxWell = 0;
  for (let i = 0; i < W; i++) {
    const left = i > 0 ? heights[i - 1] : boardHeight;
    const right = i < W - 1 ? heights[i + 1] : boardHeight;
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
  boardConfig: AIBoardConfig = {},
): AIMove[] {
  const hiddenRows = boardConfig.hiddenRows ?? DEFAULT_HIDDEN_ROWS;
  const visibleRows = boardConfig.visibleRows ?? DEFAULT_VISIBLE_ROWS;
  const visibleStart = getVisibleStart(board, visibleRows);
  const moves: AIMove[] = [];
  const rotations: (0 | 1 | 2 | 3)[] = pieceType === 'O' ? [0] : [0, 1, 2, 3];

  for (const rotation of rotations) {
    const shape = getShape(pieceType, rotation);
    const shapeWidth = shape[0].length;

    // Try all x positions
    for (let x = -2; x < W + 2; x++) {
      const piece: Piece = { type: pieceType, rotation, x, y: getInitialY(pieceType, hiddenRows) };

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
          if (shape[sy][sx] && landY + sy >= visibleStart) {
            aboveBoard = false;
          }
        }
      }
      if (hiddenRows === 0 && aboveBoard) continue;

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
  nextPieceType?: PieceType,
  boardConfig: AIBoardConfig = {},
): AIMove | null {
  const hiddenRows = boardConfig.hiddenRows ?? DEFAULT_HIDDEN_ROWS;
  const moves = getAllPossibleMoves(pieceType, board, boardConfig);
  if (moves.length === 0) return null;

  // Score each move
  for (const move of moves) {
    const piece: Piece = { type: pieceType, rotation: move.rotation, x: move.x, y: getInitialY(pieceType, hiddenRows) };
    const landY = getGhostY(piece, board);
    const landedPiece: Piece = { ...piece, y: landY };
    const newBoard = lockPiece(landedPiece, board);
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    let score = evaluateBoard(clearedBoard, cleared, difficulty);

    // 1-piece look-ahead: blend in the best achievable score for the next piece
    if (difficulty.lookAhead && nextPieceType) {
      const nextMoves = getAllPossibleMoves(nextPieceType, clearedBoard, boardConfig);
      if (nextMoves.length > 0) {
        let bestNextScore = -Infinity;
        for (const nextMove of nextMoves) {
          const np: Piece = { type: nextPieceType, rotation: nextMove.rotation, x: nextMove.x, y: getInitialY(nextPieceType, hiddenRows) };
          const nLandY = getGhostY(np, clearedBoard);
          const nLanded: Piece = { ...np, y: nLandY };
          const nBoard = lockPiece(nLanded, clearedBoard);
          const { board: nCleared, cleared: nLines } = clearLines(nBoard);
          const nextScore = evaluateBoard(nCleared, nLines, difficulty);
          if (nextScore > bestNextScore) bestNextScore = nextScore;
        }
        // Weighted blend: 60% current placement, 40% best follow-up
        score = score * 0.6 + bestNextScore * 0.4;
      }
    }

    move.score = score;
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
  onPlacement?: (result: AIPlacementResult) => void;
}

export class TetrisAIGame {
  private board: (BoardCell | null)[][] = [];
  private score = 0;
  private lines = 0;
  private combo = 0;
  private gameOver = false;
  private difficulty: AIDifficulty;
  private speedMultiplier = 1;
  private callbacks: AIGameCallbacks;
  private rng: () => number;
  private bag: PieceType[] = [];
  private garbageRng: () => number;
  private pendingGarbage = 0;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private holdPiece: PieceType | null = null;
  private holdUsed = false;
  private nextQueue: PieceType[] = [];
  private visibleRows: number;
  private hiddenRows: number;

  constructor(
    seed: number,
    difficulty: AIDifficulty,
    callbacks: AIGameCallbacks,
    boardConfig: AIBoardConfig = {},
  ) {
    this.difficulty = difficulty;
    this.callbacks = callbacks;
    this.visibleRows = boardConfig.visibleRows ?? DEFAULT_VISIBLE_ROWS;
    this.hiddenRows = boardConfig.hiddenRows ?? DEFAULT_HIDDEN_ROWS;

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

    this.board = Array.from({ length: this.visibleRows + this.hiddenRows }, () => Array(W).fill(null));
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

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.35, multiplier);
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
    const baseDelay = Math.round(this.difficulty.moveDelay * this.speedMultiplier);
    const delay = Math.max(70, baseDelay + delayVariation);

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
      if (this.gameOver) return;
    }

    // Determine the piece to actually play (may swap with hold)
    let actualPieceType = pieceType;
    let cachedBestMove: AIMove | null | undefined;
    if (this.difficulty.useHold && !this.holdUsed) {
      if (this.holdPiece !== null) {
        // Swap with hold if the hold piece achieves a better score.
        // Cache both evaluations so the winning result is reused directly at execution.
        cachedBestMove = findBestMove(pieceType, this.board, this.difficulty, this.nextQueue[0], { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows });
        const currentScore = cachedBestMove?.score ?? -Infinity;
        const holdBestMove = findBestMove(this.holdPiece, this.board, this.difficulty, this.nextQueue[0], { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows });
        const holdScore = holdBestMove?.score ?? -Infinity;
        if (holdScore > currentScore) {
          const saved = this.holdPiece;
          this.holdPiece = pieceType;
          this.holdUsed = true;
          actualPieceType = saved;
          // Reuse the move evaluated during the decision — same board and look-ahead
          cachedBestMove = holdBestMove;
        }
      } else if (this.nextQueue.length > 0) {
        // No hold piece yet — save current if next piece gives a significantly better placement.
        // Evaluate the next piece with nextQueue[1] as its look-ahead (the piece that follows it).
        cachedBestMove = findBestMove(pieceType, this.board, this.difficulty, this.nextQueue[0], { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows });
        const currentScore = cachedBestMove?.score ?? -Infinity;
        const nextLookahead = this.nextQueue[1] ?? pieceType;
        const nextBestMove = findBestMove(this.nextQueue[0], this.board, this.difficulty, nextLookahead, { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows });
        const nextScore = nextBestMove?.score ?? -Infinity;
        if (nextScore > currentScore + HOLD_ADVANTAGE_THRESHOLD) {
          this.holdPiece = pieceType;
          this.holdUsed = true;
          actualPieceType = this.nextQueue.shift()!;
          this.fillQueue();
          // Reuse the move evaluated during the decision — same board and look-ahead.
          // nextBestMove was computed with nextLookahead = nextQueue[1] before the shift;
          // after shift nextQueue[0] becomes that same piece, but we skip the recompute
          // entirely by reusing the cached result.
          cachedBestMove = nextBestMove;
        }
      }
    }

    const spawnPiece: Piece = {
      type: actualPieceType,
      rotation: 0,
      x: Math.floor((W - getShape(actualPieceType, 0)[0].length) / 2),
      y: getInitialY(actualPieceType, this.hiddenRows),
    };

    if (!isValid(spawnPiece, this.board)) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    // Find best move, with look-ahead when enabled (reuse cached result if available)
    const bestMove = cachedBestMove ?? findBestMove(actualPieceType, this.board, this.difficulty, this.nextQueue[0], { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows });

    if (!bestMove) {
      // Game over - can't place
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    // Create and place piece
    const piece: Piece = {
      type: actualPieceType,
      rotation: bestMove.rotation,
      x: bestMove.x,
      y: getInitialY(actualPieceType, this.hiddenRows),
    };

    const landY = getGhostY(piece, this.board);
    const landedPiece: Piece = { ...piece, y: landY };

    // Check if piece is above board
    const shape = getShape(actualPieceType, bestMove.rotation);
    let aboveBoard = true;
    const visibleStart = getVisibleStart(this.board, this.visibleRows);
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] && landY + y >= visibleStart) aboveBoard = false;
      }
    }

    if (this.hiddenRows === 0 && aboveBoard) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    // Lock piece
    const boardBeforeLock = this.board.map(row => [...row]);
    this.board = lockPiece(landedPiece, this.board);

    // Clear lines
    const { board: clearedBoard, cleared } = clearLines(this.board);
    this.board = clearedBoard;
    const tSpin = detectTSpin(landedPiece, boardBeforeLock, actualPieceType === 'T');

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
      actualPieceType,
      this.holdPiece,
    );

    this.callbacks.onPlacement?.({
      pieceType: actualPieceType,
      rotation: bestMove.rotation,
      x: bestMove.x,
      y: landY,
      clearedLines: cleared,
      tSpin,
      combo: this.combo,
    });

    // Play next piece
    this.playNextPiece();
  }

  private applyGarbage(count: number): void {
    if (count <= 0) return;
    const rowsToRaise = Math.min(count, this.board.length);
    if (this.hiddenRows > 0) {
      const overflowed = this.board.slice(0, rowsToRaise).some(row => row.some(Boolean));
      if (overflowed) {
        this.gameOver = true;
        this.callbacks.onGameOver();
        return;
      }
    }
    const newBoard = this.board.slice(rowsToRaise);
    for (let i = 0; i < rowsToRaise; i++) {
      const row: (BoardCell | null)[] = Array(W).fill({ color: '#555555' } as BoardCell);
      const gap = Math.floor(this.garbageRng() * W);
      row[gap] = null;
      newBoard.push(row);
    }
    this.board = newBoard;
  }
}
