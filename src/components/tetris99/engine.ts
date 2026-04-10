import type { BoardCell } from '@/types/multiplayer';
import {
  W,
  H,
  createRNG,
  create7Bag,
  createEmptyBoard,
  getGhostY,
  lockPiece,
  clearLines,
  addGarbageLines,
} from '@/components/rhythmia/multiplayer-battle-engine';
import { BEST_AI_DIFFICULTY, findBestMove, type AIDifficulty } from '@/lib/ranked/TetrisAI';

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
export type TargetMode = 'random' | 'attackers' | 'kos' | 'badges';
export type TargetPreference = 'player' | 'field';

export type GarbagePacket = {
  id: string;
  lines: number;
  delay: number;
  from: string;
};

export type BotState = {
  id: string;
  name: string;
  alive: boolean;
  board: (BoardCell | null)[][];
  hold: PieceType | null;
  queue: PieceType[];
  combo: number;
  lines: number;
  score: number;
  badges: number;
  badgePoints: number;
  koCount: number;
  targetPreference: TargetPreference;
  pendingGarbage: GarbagePacket[];
  recentAttack: number;
};

export const BOT_COUNT = 98;

const BOT_NAMES = [
  'ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT',
  'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE', 'QUARTZ', 'RIFT', 'SOL', 'TITAN',
  'UMBRA', 'VANTA', 'WISP', 'XENO', 'YUKI', 'ZENITH',
];

function randomBotName(index: number) {
  return `${BOT_NAMES[index % BOT_NAMES.length]}-${String(index + 1).padStart(2, '0')}`;
}

function getInitialY(type: PieceType) {
  return type === 'I' ? -1 : 0;
}

function createSpawnPiece(type: PieceType) {
  return { type, rotation: 0 as const, x: 3, y: getInitialY(type) };
}

export function badgeStageFromPoints(points: number) {
  if (points >= 30) return 4;
  if (points >= 14) return 3;
  if (points >= 6) return 2;
  if (points >= 2) return 1;
  return 0;
}

export function badgeMultiplier(stage: number) {
  return [1, 1.25, 1.5, 1.75, 2][Math.min(4, stage)] ?? 2;
}

function comboAttack(combo: number) {
  if (combo <= 1) return 0;
  if (combo <= 3) return 1;
  if (combo <= 5) return 2;
  if (combo <= 8) return 3;
  if (combo <= 11) return 4;
  return 5;
}

export function computeAttack(
  cleared: number,
  tSpin: 'none' | 'mini' | 'full',
  combo: number,
  backToBack: boolean,
  badgeStage: number,
) {
  let attack = 0;
  if (tSpin === 'full') {
    attack = [0, 2, 4, 6, 0][cleared] ?? 0;
  } else if (tSpin === 'mini') {
    attack = cleared >= 1 ? 1 : 0;
  } else {
    attack = [0, 0, 1, 2, 4][cleared] ?? 0;
  }

  if (backToBack && attack > 0) attack += 1;
  attack += comboAttack(combo);
  return Math.max(0, Math.round(attack * badgeMultiplier(badgeStage)));
}

function cloneBoard(board: (BoardCell | null)[][]) {
  return board.map(row => row.slice());
}

export function countFilledCells(board: (BoardCell | null)[][]) {
  return board.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}

export function boardDanger(board: (BoardCell | null)[][]) {
  for (let y = 0; y < H; y++) {
    if (board[y].some(Boolean)) return H - y;
  }
  return 0;
}

function difficultyForPlace(place: number): AIDifficulty {
  void place;
  return BEST_AI_DIFFICULTY;
}

function createBotQueue(rng: () => number) {
  const bag = create7Bag(rng);
  const queue: PieceType[] = [];
  while (queue.length < 6) queue.push(bag());
  return { bag, queue };
}

export function createBotState(index: number, seed: number): BotState {
  const rng = createRNG(seed + index * 31);
  const board = createEmptyBoard();
  const bootstrapLines = 1 + Math.floor(rng() * 6);
  let working = board;
  for (let i = 0; i < bootstrapLines; i++) {
    working = addGarbageLines(working, 1, rng);
  }
  const { bag, queue } = createBotQueue(rng);
  void bag;
  return {
    id: `bot-${index}`,
    name: randomBotName(index),
    alive: true,
    board: working,
    hold: null,
    queue,
    combo: 0,
    lines: Math.floor(rng() * 20),
    score: Math.floor(rng() * 5000),
    badges: 0,
    badgePoints: Math.floor(rng() * 2),
    koCount: 0,
    targetPreference: rng() > 0.74 ? 'player' : 'field',
    pendingGarbage: [],
    recentAttack: 0,
  };
}

function ensureQueue(bot: BotState, bag: () => PieceType) {
  while (bot.queue.length < 6) bot.queue.push(bag());
}

function applyGarbagePackets(board: (BoardCell | null)[][], lines: number, rng: () => number) {
  if (lines <= 0) return board;
  return addGarbageLines(board, lines, rng);
}

export function progressGarbageQueue<T extends { pendingGarbage: GarbagePacket[] }>(
  target: T,
  ticks = 1,
) {
  let due = 0;
  target.pendingGarbage = target.pendingGarbage
    .map(packet => ({ ...packet, delay: packet.delay - ticks }))
    .filter(packet => {
      if (packet.delay <= 0) {
        due += packet.lines;
        return false;
      }
      return true;
    });
  return due;
}

export function queueGarbage<T extends { pendingGarbage: GarbagePacket[] }>(
  target: T,
  packet: GarbagePacket,
) {
  target.pendingGarbage.push(packet);
}

export function cancelPendingGarbage<T extends { pendingGarbage: GarbagePacket[] }>(
  target: T,
  amount: number,
) {
  let remaining = amount;
  const queue: GarbagePacket[] = [];

  for (const packet of target.pendingGarbage) {
    if (remaining <= 0) {
      queue.push(packet);
      continue;
    }

    if (packet.lines <= remaining) {
      remaining -= packet.lines;
      continue;
    }

    queue.push({ ...packet, lines: packet.lines - remaining });
    remaining = 0;
  }

  target.pendingGarbage = queue;
  return remaining;
}

export type BotTickResult = {
  sentAttack: number;
  wasKOd: boolean;
  hadThreat: boolean;
  scoredKO: boolean;
};

export function runBotTick(
  bot: BotState,
  bag: () => PieceType,
  garbageRng: () => number,
  place: number,
) : BotTickResult {
  if (!bot.alive) {
    return { sentAttack: 0, wasKOd: false, hadThreat: false, scoredKO: false };
  }

  ensureQueue(bot, bag);
  const dueGarbage = progressGarbageQueue(bot);
  if (dueGarbage > 0) {
    bot.board = applyGarbagePackets(bot.board, dueGarbage, garbageRng);
  }

  const current = bot.queue.shift()!;
  ensureQueue(bot, bag);
  const next = bot.queue[0];
  const difficulty = difficultyForPlace(place);
  const move = findBestMove(current, cloneBoard(bot.board), difficulty, next);

  if (!move) {
    bot.alive = false;
    bot.board = createEmptyBoard();
    return { sentAttack: 0, wasKOd: true, hadThreat: true, scoredKO: false };
  }

  const spawned = createSpawnPiece(current);
  const landed = { ...spawned, rotation: move.rotation, x: move.x, y: getGhostY({ ...spawned, rotation: move.rotation, x: move.x }, bot.board) };
  const locked = lockPiece(landed, bot.board, 0);
  const { board: clearedBoard, cleared } = clearLines(locked);
  bot.board = clearedBoard;

  let attack = 0;
  if (cleared > 0) {
    bot.combo += 1;
    bot.lines += cleared;
    bot.score += [0, 100, 300, 500, 800][cleared] ?? 0;
    attack = computeAttack(cleared, 'none', bot.combo, cleared === 4, bot.badges);
  } else {
    bot.combo = 0;
  }

  bot.recentAttack = attack;
  const danger = boardDanger(bot.board);
  bot.targetPreference = danger >= 12 || bot.badges >= 2 || Math.random() > 0.82 ? 'player' : 'field';

  if (countFilledCells(bot.board) > 170 || boardDanger(bot.board) >= H) {
    bot.alive = false;
    bot.board = createEmptyBoard();
    return { sentAttack: 0, wasKOd: true, hadThreat: true, scoredKO: false };
  }

  return { sentAttack: attack, wasKOd: false, hadThreat: danger >= 12, scoredKO: false };
}
