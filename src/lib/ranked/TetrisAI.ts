// ===== Tetris AI Engine =====
// Smart AI opponent for ranked matches
// Uses heuristic-based evaluation with configurable difficulty

import { ARR, DAS } from '@/components/rhythmia/multiplayer-battle-engine';
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

export interface AIActivePieceState {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

type AIInputAction = 'hold' | 'moveLeft' | 'moveRight' | 'rotateCW' | 'rotateCCW' | 'hardDrop';

interface AIInputStep {
  action: AIInputAction;
  delayMs: number;
}

interface AIInputPlan {
  actions: AIInputAction[];
  steps: AIInputStep[];
  durationMs: number;
}

interface AIMove {
  rotation: 0 | 1 | 2 | 3;
  x: number;
  score: number;
  inputPlan: AIInputPlan;
}

type AIHoldAction = 'none' | 'swap' | 'store';

interface AIExecutionPlan {
  sourcePieceType: PieceType;
  actualPieceType: PieceType;
  holdAction: AIHoldAction;
  move: AIMove;
}

export interface AIBoardConfig {
  visibleRows?: number;
  hiddenRows?: number;
}

// Board dimensions
const W = 10;
const DEFAULT_VISIBLE_ROWS = 20;
const DEFAULT_HIDDEN_ROWS = 0;
const AI_TAP_MS = 75;
const AI_ACTION_MS = 50;

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

export const BEST_AI_DIFFICULTY = AI_DIFFICULTIES.expert;

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

function getWallKicks(type: PieceType, from: number, to: number): [number, number][] {
  const key = `${ROTATION_NAMES[from]}->${ROTATION_NAMES[to]}`;
  if (type === 'I') return WALL_KICK_I[key] || [[0, 0]];
  if (type === 'O') return [[0, 0]];
  return WALL_KICK_JLSTZ[key] || [[0, 0]];
}

function tryRotate(piece: Piece, direction: 1 | -1, board: (BoardCell | null)[][]): Piece | null {
  const toRotation = ((piece.rotation + direction + 4) % 4) as Piece['rotation'];
  const kicks = getWallKicks(piece.type, piece.rotation, toRotation);

  for (const [dx, dy] of kicks) {
    const candidate: Piece = {
      ...piece,
      rotation: toRotation,
      x: piece.x + dx,
      y: piece.y - dy,
    };
    if (isValid(candidate, board)) return candidate;
  }

  return null;
}

function createSpawnPiece(type: PieceType, hiddenRows = DEFAULT_HIDDEN_ROWS): Piece {
  return {
    type,
    rotation: 0,
    x: Math.floor((W - getShape(type, 0)[0].length) / 2),
    y: getInitialY(type, hiddenRows),
  };
}

function normalizeRotation(type: PieceType, rotation: number): Piece['rotation'] {
  return (type === 'O' ? 0 : rotation) as Piece['rotation'];
}

function estimateHorizontalRunMs(count: number): number {
  if (count <= 0) return 0;
  const tapTime = Math.max(AI_ACTION_MS, (count - 1) * AI_TAP_MS + AI_ACTION_MS);
  const holdTime = count === 1
    ? AI_ACTION_MS
    : AI_ACTION_MS + DAS + Math.max(0, count - 2) * ARR;
  return Math.min(tapTime, holdTime);
}

function buildHorizontalSteps(action: 'moveLeft' | 'moveRight', count: number): AIInputStep[] {
  if (count <= 0) return [];

  const tapTime = Math.max(AI_ACTION_MS, (count - 1) * AI_TAP_MS + AI_ACTION_MS);
  const holdTime = count === 1
    ? AI_ACTION_MS
    : AI_ACTION_MS + DAS + Math.max(0, count - 2) * ARR;

  if (holdTime < tapTime && count > 1) {
    const steps: AIInputStep[] = [{ action, delayMs: AI_ACTION_MS }];
    for (let index = 1; index < count; index++) {
      steps.push({
        action,
        delayMs: index === 1 ? DAS : ARR,
      });
    }
    return steps;
  }

  return Array.from({ length: count }, (_, index) => ({
    action,
    delayMs: index === 0 ? AI_ACTION_MS : AI_TAP_MS,
  }));
}

function buildInputSteps(actions: AIInputAction[]): AIInputStep[] {
  const steps: AIInputStep[] = [];
  let index = 0;

  while (index < actions.length) {
    const action = actions[index];
    if (action === 'moveLeft' || action === 'moveRight') {
      let count = 0;
      while (actions[index] === action) {
        count += 1;
        index += 1;
      }
      steps.push(...buildHorizontalSteps(action, count));
      continue;
    }

    steps.push({
      action,
      delayMs: AI_ACTION_MS,
    });
    index += 1;
  }

  return steps;
}

function estimateInputDuration(actions: AIInputAction[]): number {
  return Math.max(AI_ACTION_MS, buildInputSteps(actions).reduce((sum, step) => sum + step.delayMs, 0));
}

function buildInputPlan(actions: AIInputAction[]): AIInputPlan {
  const steps = buildInputSteps(actions);
  return {
    actions,
    steps,
    durationMs: estimateInputDuration(actions),
  };
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
  const spawnPiece = createSpawnPiece(pieceType, hiddenRows);
  if (!isValid(spawnPiece, board)) return [];

  const movesByPlacement = new Map<string, AIMove>();
  const queue: Array<{ piece: Piece; actions: AIInputAction[] }> = [{ piece: spawnPiece, actions: [] }];
  const visited = new Set<string>([
    `${spawnPiece.x}:${normalizeRotation(pieceType, spawnPiece.rotation)}:${spawnPiece.y}`,
  ]);

  const recordPlacement = (piece: Piece, actions: AIInputAction[]) => {
    const rotation = normalizeRotation(piece.type, piece.rotation);
    const shape = getShape(piece.type, rotation);
    const landedPiece: Piece = { ...piece, rotation, y: getGhostY({ ...piece, rotation }, board) };

    let aboveBoard = true;
    for (let sy = 0; sy < shape.length; sy++) {
      for (let sx = 0; sx < shape[sy].length; sx++) {
        if (shape[sy][sx] && landedPiece.y + sy >= visibleStart) {
          aboveBoard = false;
        }
      }
    }
    if (hiddenRows === 0 && aboveBoard) return;

    const key = `${landedPiece.x}:${rotation}`;
    if (movesByPlacement.has(key)) return;
    movesByPlacement.set(key, {
      rotation,
      x: landedPiece.x,
      score: 0,
      inputPlan: buildInputPlan([...actions, 'hardDrop']),
    });
  };

  while (queue.length > 0) {
    const current = queue.shift()!;
    recordPlacement(current.piece, current.actions);

    const nextStates: Array<{ piece: Piece | null; action: AIInputAction }> = [
      {
        piece: isValid({ ...current.piece, x: current.piece.x - 1 }, board)
          ? { ...current.piece, x: current.piece.x - 1 }
          : null,
        action: 'moveLeft',
      },
      {
        piece: isValid({ ...current.piece, x: current.piece.x + 1 }, board)
          ? { ...current.piece, x: current.piece.x + 1 }
          : null,
        action: 'moveRight',
      },
      { piece: tryRotate(current.piece, 1, board), action: 'rotateCW' },
      { piece: tryRotate(current.piece, -1, board), action: 'rotateCCW' },
    ];

    for (const nextState of nextStates) {
      if (!nextState.piece) continue;
      const normalizedRotation = normalizeRotation(nextState.piece.type, nextState.piece.rotation);
      const key = `${nextState.piece.x}:${normalizedRotation}:${nextState.piece.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        piece: { ...nextState.piece, rotation: normalizedRotation },
        actions: [...current.actions, nextState.action],
      });
    }
  }

  return [...movesByPlacement.values()];
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

function chooseExecutionPlan(
  pieceType: PieceType,
  board: (BoardCell | null)[][],
  difficulty: AIDifficulty,
  holdPiece: PieceType | null,
  nextQueue: PieceType[],
  boardConfig: AIBoardConfig,
): AIExecutionPlan | null {
  const withHoldAction = (move: AIMove): AIMove => ({
    ...move,
    inputPlan: buildInputPlan(['hold', ...move.inputPlan.actions]),
  });

  const currentMove = findBestMove(pieceType, board, difficulty, nextQueue[0], boardConfig);

  if (!difficulty.useHold) {
    return currentMove ? {
      sourcePieceType: pieceType,
      actualPieceType: pieceType,
      holdAction: 'none',
      move: currentMove,
    } : null;
  }

  if (holdPiece !== null) {
    const holdMove = findBestMove(holdPiece, board, difficulty, nextQueue[0], boardConfig);
    const currentScore = currentMove?.score ?? -Infinity;
    const holdScore = holdMove?.score ?? -Infinity;

    if (holdMove && (holdScore > currentScore || !currentMove)) {
      return {
        sourcePieceType: pieceType,
        actualPieceType: holdPiece,
        holdAction: 'swap',
        move: withHoldAction(holdMove),
      };
    }
  } else if (nextQueue.length > 0) {
    const nextLookahead = nextQueue[1] ?? pieceType;
    const nextMove = findBestMove(nextQueue[0], board, difficulty, nextLookahead, boardConfig);
    const currentScore = currentMove?.score ?? -Infinity;
    const nextScore = nextMove?.score ?? -Infinity;

    if (nextMove && (nextScore > currentScore + HOLD_ADVANTAGE_THRESHOLD || !currentMove)) {
      return {
        sourcePieceType: pieceType,
        actualPieceType: nextQueue[0],
        holdAction: 'store',
        move: withHoldAction(nextMove),
      };
    }
  }

  if (!currentMove) return null;

  return {
    sourcePieceType: pieceType,
    actualPieceType: pieceType,
    holdAction: 'none',
    move: currentMove,
  };
}

// ===== AI Game Runner =====
// Runs a complete AI game loop, emitting board updates via callback

export interface AIGameCallbacks {
  onBoardUpdate: (board: (BoardCell | null)[][], score: number, lines: number, combo: number, piece?: string, hold?: string | null) => void;
  onActivePieceUpdate?: (board: (BoardCell | null)[][], piece: AIActivePieceState | null, hold?: string | null) => void;
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
  private paused = false;
  private activePiece: Piece | null = null;
  private inputStepIndex = 0;
  private scheduledPhase: 'thinking' | 'input' | null = null;
  private scheduledPieceType: PieceType | null = null;
  private pendingExecution: AIExecutionPlan | null = null;
  private scheduledAt = 0;
  private scheduledDelayMs = 0;
  private remainingDelayMs = 0;
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
    this.paused = false;
    this.playNextPiece();
  }

  stop(): void {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    this.activePiece = null;
    this.inputStepIndex = 0;
    this.scheduledPhase = null;
    this.scheduledPieceType = null;
    this.pendingExecution = null;
    this.scheduledDelayMs = 0;
    this.remainingDelayMs = 0;
    this.gameOver = true;
  }

  pause(): void {
    if (this.gameOver || this.paused) return;
    this.paused = true;
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
      const elapsed = Math.max(0, Date.now() - this.scheduledAt);
      this.remainingDelayMs = Math.max(0, this.scheduledDelayMs - elapsed);
    }
  }

  resume(): void {
    if (this.gameOver || !this.paused) return;
    this.paused = false;
    const delay = this.remainingDelayMs || this.scheduledDelayMs;
    if (this.scheduledPhase === 'thinking' && this.scheduledPieceType) {
      this.scheduleThinkingPhase(this.scheduledPieceType, delay);
      return;
    }
    if (this.scheduledPhase === 'input' && this.pendingExecution) {
      this.scheduleInputPhase(this.pendingExecution, delay);
      return;
    }
    this.playNextPiece();
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

  private emitActivePieceUpdate(): void {
    this.callbacks.onActivePieceUpdate?.(
      this.board,
      this.activePiece ? { ...this.activePiece } : null,
      this.holdPiece,
    );
  }

  private scheduleThinkingPhase(pieceType: PieceType, delay: number): void {
    if (this.gameOver || this.paused) return;
    this.scheduledPhase = 'thinking';
    this.scheduledPieceType = pieceType;
    this.pendingExecution = null;
    this.scheduledDelayMs = delay;
    this.remainingDelayMs = delay;
    this.scheduledAt = Date.now();
    this.moveTimer = setTimeout(() => {
      this.moveTimer = null;
      this.scheduledDelayMs = 0;
      this.remainingDelayMs = 0;
      if (this.gameOver || this.paused) return;
      this.beginPieceExecution(pieceType);
    }, delay);
  }

  private scheduleInputPhase(executionPlan: AIExecutionPlan, delay: number): void {
    if (this.gameOver || this.paused) return;
    this.scheduledPhase = 'input';
    this.scheduledPieceType = executionPlan.sourcePieceType;
    this.pendingExecution = executionPlan;
    this.scheduledDelayMs = delay;
    this.remainingDelayMs = delay;
    this.scheduledAt = Date.now();
    this.moveTimer = setTimeout(() => {
      this.moveTimer = null;
      this.scheduledDelayMs = 0;
      this.remainingDelayMs = 0;
      if (this.gameOver || this.paused) return;
      if (this.inputStepIndex >= executionPlan.move.inputPlan.steps.length) {
        this.finalizeActivePiece(executionPlan);
        return;
      }
      this.executeInputStep(executionPlan);
    }, delay);
  }

  private playNextPiece(): void {
    if (this.gameOver || this.paused) return;

    const pieceType = this.nextPiece();
    this.holdUsed = false;

    // Add small random delay variation for realism
    const delayVariation = Math.floor(Math.random() * 200) - 50;
    const baseDelay = Math.round(this.difficulty.moveDelay * this.speedMultiplier);
    const delay = Math.max(70, baseDelay + delayVariation);
    this.scheduleThinkingPhase(pieceType, delay);
  }

  private beginPieceExecution(pieceType: PieceType): void {
    if (this.gameOver) return;

    // Apply pending garbage before placing
    if (this.pendingGarbage > 0) {
      this.applyGarbage(this.pendingGarbage);
      this.pendingGarbage = 0;
      if (this.gameOver) return;
    }

    const sourcePiece = createSpawnPiece(pieceType, this.hiddenRows);
    if (!isValid(sourcePiece, this.board)) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    const boardConfig = { visibleRows: this.visibleRows, hiddenRows: this.hiddenRows };
    const executionPlan = chooseExecutionPlan(
      pieceType,
      this.board,
      this.difficulty,
      this.holdPiece,
      this.nextQueue,
      boardConfig,
    );

    if (!executionPlan) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    this.activePiece = sourcePiece;
    this.inputStepIndex = 0;
    this.emitActivePieceUpdate();
    const firstDelay = executionPlan.move.inputPlan.steps[0]?.delayMs ?? AI_ACTION_MS;
    this.scheduleInputPhase(executionPlan, firstDelay);
  }

  private executeInputStep(executionPlan: AIExecutionPlan): void {
    const currentStep = executionPlan.move.inputPlan.steps[this.inputStepIndex];
    if (!currentStep || !this.activePiece || this.gameOver) return;

    switch (currentStep.action) {
      case 'hold':
        this.performHoldAction();
        if (this.gameOver) return;
        break;
      case 'moveLeft': {
        const moved = { ...this.activePiece, x: this.activePiece.x - 1 };
        if (isValid(moved, this.board)) {
          this.activePiece = moved;
        }
        break;
      }
      case 'moveRight': {
        const moved = { ...this.activePiece, x: this.activePiece.x + 1 };
        if (isValid(moved, this.board)) {
          this.activePiece = moved;
        }
        break;
      }
      case 'rotateCW': {
        const rotated = tryRotate(this.activePiece, 1, this.board);
        if (rotated) this.activePiece = rotated;
        break;
      }
      case 'rotateCCW': {
        const rotated = tryRotate(this.activePiece, -1, this.board);
        if (rotated) this.activePiece = rotated;
        break;
      }
      case 'hardDrop':
        this.activePiece = { ...this.activePiece, y: getGhostY(this.activePiece, this.board) };
        this.inputStepIndex = executionPlan.move.inputPlan.steps.length;
        this.emitActivePieceUpdate();
        this.scheduleInputPhase(executionPlan, AI_ACTION_MS);
        return;
    }

    this.inputStepIndex += 1;
    this.emitActivePieceUpdate();

    const nextStep = executionPlan.move.inputPlan.steps[this.inputStepIndex];
    if (nextStep) {
      this.scheduleInputPhase(executionPlan, nextStep.delayMs);
      return;
    }

    this.scheduleInputPhase(executionPlan, AI_ACTION_MS);
  }

  private performHoldAction(): void {
    const piece = this.activePiece;
    if (!piece || this.holdUsed) return;

    this.holdUsed = true;
    const previousHold = this.holdPiece;
    this.holdPiece = piece.type;

    if (previousHold) {
      const swappedPiece = createSpawnPiece(previousHold, this.hiddenRows);
      if (!isValid(swappedPiece, this.board)) {
        this.gameOver = true;
        this.callbacks.onGameOver();
        return;
      }
      this.activePiece = swappedPiece;
      return;
    }

    const nextType = this.nextQueue.shift();
    this.fillQueue();
    if (!nextType) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    const nextPiece = createSpawnPiece(nextType, this.hiddenRows);
    if (!isValid(nextPiece, this.board)) {
      this.gameOver = true;
      this.callbacks.onGameOver();
      return;
    }

    this.activePiece = nextPiece;
  }

  private finalizeActivePiece(executionPlan: AIExecutionPlan): void {
    if (!this.activePiece || this.gameOver) return;

    const piece = {
      ...this.activePiece,
      rotation: normalizeRotation(this.activePiece.type, this.activePiece.rotation),
    } as Piece;
    const landY = getGhostY(piece, this.board);
    const landedPiece: Piece = { ...piece, y: landY };

    // Check if piece is above board
    const shape = getShape(landedPiece.type, landedPiece.rotation);
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
    const tSpin = detectTSpin(landedPiece, boardBeforeLock, landedPiece.type === 'T');

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
      landedPiece.type,
      this.holdPiece,
    );

    this.callbacks.onPlacement?.({
      pieceType: landedPiece.type,
      rotation: landedPiece.rotation,
      x: landedPiece.x,
      y: landY,
      clearedLines: cleared,
      tSpin,
      combo: this.combo,
    });

    this.activePiece = null;
    this.inputStepIndex = 0;
    this.scheduledPhase = null;
    this.scheduledPieceType = null;
    this.pendingExecution = null;

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
