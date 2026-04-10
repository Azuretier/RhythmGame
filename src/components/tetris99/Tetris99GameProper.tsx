'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Board as RhythmBoardState, Piece as RhythmPiece } from '@/components/rhythmia/tetris/types';
import {
  getShape,
} from '@/components/rhythmia/tetris/utils/boardUtils';
import { BOARD_WIDTH, LOCK_DELAY, ROTATION_NAMES, WALL_KICKS_I, WALL_KICKS_JLSTZ } from '@/components/rhythmia/tetris/constants';
import { ARR, DAS, MAX_LOCK_MOVES } from '@/components/rhythmia/multiplayer-battle-engine';
import { useLayoutConfig } from '@/lib/layout/context';
import {
  loadTetris99ShowAllAttackTrails,
  saveTetris99ShowAllAttackTrails,
  shouldShowTetris99AttackTrail,
} from '@/lib/tetris99-settings';
import styles from './Tetris99Game.module.css';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
type TargetMode = 'random' | 'attackers' | 'kos' | 'badges';
type MatchState = 'countdown' | 'playing' | 'gameOver';
type AttackClearType =
  | 'none'
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 'tSpinMiniSingle'
  | 'tSpinMiniDouble'
  | 'tSpinSingle'
  | 'tSpinDouble'
  | 'tSpinTriple';

type RotationKickInfo = {
  dx: number;
  dy: number;
};

type GarbagePacket = {
  id: string;
  lines: number;
  chargeMs: number;
  from: string;
};

type AttackDistribution = {
  targetId: string;
  lines: number;
};

type AttackEffect = {
  id: string;
  x: number;
  y: number;
  length: number;
  angle: number;
  lines: number;
  variant: 'player' | 'incoming' | 'bot';
};

type FinalizeAttackResult = {
  offset: number;
  attackerCount: number;
  attackerBonus: number;
  badgeBoostPercent: number;
  marginBonus: number;
  targetIds: string[];
  distributions: AttackDistribution[];
  nextQueue: GarbagePacket[];
  totalSent: number;
};

type TargetManager = {
  resolveTargets: (sourceId: string, mode: TargetMode, playerTargets?: Set<string>) => string[];
  distributeAttack: (sourceId: string, mode: TargetMode, totalLines: number, targetIds: string[], playerTargets?: Set<string>) => AttackDistribution[];
};

type AttackerManager = {
  countAttackers: (targetId: string, playerTargets?: Set<string>) => number;
  getBonus: (targetId: string, playerTargets?: Set<string>) => number;
};

type BotState = {
  id: string;
  name: string;
  board: RhythmBoardState;
  queue: PieceType[];
  hold: PieceType | null;
  combo: number;
  b2bActive: boolean;
  tSpins: number;
  kos: number;
  lines: number;
  score: number;
  badgePoints: number;
  badges: number;
  alive: boolean;
  targetMode: TargetMode;
  targetIds: string[];
  pendingGarbage: GarbagePacket[];
  lastDamagedBy: string | null;
  aiPoints: number;
  danger: number;
};

type Snapshot = {
  board: RhythmBoardState;
  currentPiece: RhythmPiece | null;
  hold: PieceType | null;
  queue: PieceType[];
  lines: number;
  score: number;
  combo: number;
  kos: number;
  badges: number;
  badgePoints: number;
  badgeBoostPercent: number;
  place: number;
  attackers: number;
  incomingGarbage: number;
  incomingPackets: GarbagePacket[];
  ren: number;
  tSpins: number;
  b2bActive: boolean;
  targetMode: TargetMode;
  state: MatchState;
  countdown: number;
  speedStage: number;
  speedLabel: string;
  gameOver: boolean;
  playerOut: boolean;
  spectating: boolean;
  victory: boolean;
  winnerName: string | null;
  status: string;
};

type MatchServerMessage =
  | { type: 'reset'; matchId: number }
  | { type: 'start'; matchId: number }
  | { type: 'stop'; matchId: number }
  | { type: 'pause'; matchId: number }
  | { type: 'resume'; matchId: number }
  | {
    type: 'sync-player';
    matchId: number;
    player: {
      alive: boolean;
      boardDanger: number;
      pendingGarbage: number;
      badgePoints: number;
      badges: number;
      targetMode: TargetMode;
      targetIds: string[];
      marginBonus: number;
    };
  }
  | { type: 'player-attack'; matchId: number; distributions: AttackDistribution[] }
  | { type: 'player-defeated'; matchId: number; killerId: string | null; victimBadgePoints: number }
  | { type: 'set-speed-stage'; matchId: number; stage: number };

type MatchServerEvent =
  | { type: 'snapshot'; matchId: number; bots: BotState[] }
  | { type: 'attack'; matchId: number; sourceId: string; distributions: AttackDistribution[] }
  | { type: 'player-ko'; matchId: number; victimId: string; badgeGain: number }
  | { type: 'bot-eliminated'; matchId: number; victimId: string; killerId: string | null }
  | { type: 'bot-sfx'; matchId: number; sourceId: string; kind: 'drop' | 'lock' | 'clear' | 'tetris' | 'tSpin' | 'tSpinMini' | 'garbage' | 'ko' | 'lose' }
  | { type: 'match-finished'; matchId: number; winnerId: string | null; winnerName: string | null };

type SpeedProfile = {
  level: number;
  label: string;
  startMs: number;
  gravityFrames: number;
  softDropFrames: number;
  aiDelayScale: number;
};

const BOT_COUNT = 98;
const MAX_PENDING_GARBAGE = 12;
const PLAYER_ID = 'player';
const T99_VISIBLE_HEIGHT = 20;
const T99_BUFFER_ZONE = 20;
const T99_BOARD_HEIGHT = T99_VISIBLE_HEIGHT + T99_BUFFER_ZONE;
const PREVIEW_SLOT_COUNT = 5;
const PREVIEW_GRID_COLUMNS = 4;
const PREVIEW_GRID_ROWS = 2;
const FRAME_MS = 1000 / 60;
const GARBAGE_QUEUE_TICK_MS = 50;
const GARBAGE_TIMER_START_PLAYERS = 50;
const GARBAGE_TIMER_TOP10_PLAYERS = 10;
const GRAVITY_RAMP_START_PLAYERS = 49;
const MARGIN_TIME_START_MS = 10 * 60 * 1000;
const MARGIN_TIME_STEP_MS = 30 * 1000;
const MARGIN_TIME_MAX_BONUS = 11;
const BOT_NAMES = ['ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT', 'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE'];
const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const PLAYER_COLORS: Record<string, string> = {
  I: '#3fd5ff',
  O: '#ffd54a',
  T: '#c084fc',
  S: '#5ee173',
  Z: '#ff6f7d',
  J: '#5f8fff',
  L: '#ffad5a',
  garbage: '#666666',
};
const PREVIEW_SHAPES: Record<PieceType, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};
const SPEED_PROFILES: SpeedProfile[] = [
  { level: 1, label: 'LV 1', startMs: 0, gravityFrames: 60, softDropFrames: 3, aiDelayScale: 1.1 },
  { level: 2, label: 'LV 2', startMs: 10_000, gravityFrames: 50, softDropFrames: 3, aiDelayScale: 1.0 },
  { level: 3, label: 'LV 3', startMs: 30_000, gravityFrames: 40, softDropFrames: 2, aiDelayScale: 0.92 },
  { level: 4, label: 'LV 4', startMs: 50_000, gravityFrames: 30, softDropFrames: 2, aiDelayScale: 0.84 },
  { level: 5, label: 'LV 5', startMs: 70_000, gravityFrames: 20, softDropFrames: 1, aiDelayScale: 0.74 },
  { level: 6, label: 'LV 6', startMs: 90_000, gravityFrames: 10, softDropFrames: 1, aiDelayScale: 0.64 },
  { level: 7, label: 'LV 7', startMs: 110_000, gravityFrames: 8, softDropFrames: 1, aiDelayScale: 0.58 },
  { level: 8, label: 'LV 8', startMs: 130_000, gravityFrames: 6, softDropFrames: 1, aiDelayScale: 0.52 },
  { level: 9, label: 'LV 9', startMs: 150_000, gravityFrames: 4, softDropFrames: 1, aiDelayScale: 0.46 },
  { level: 10, label: 'LV 10', startMs: 170_000, gravityFrames: 2, softDropFrames: 1, aiDelayScale: 0.4 },
  { level: 11, label: 'LV 11', startMs: 190_000, gravityFrames: 1, softDropFrames: 1, aiDelayScale: 0.35 },
];

const badgeStageFromPoints = (points: number) => (points >= 16 ? 4 : points >= 8 ? 3 : points >= 4 ? 2 : points >= 2 ? 1 : 0);
const badgeBoostPercentFromStage = (stage: number) => ([0, 25, 50, 75, 100][Math.max(0, Math.min(4, stage))] ?? 0);
const getSpeedProfile = (stage: number) => SPEED_PROFILES[Math.max(0, Math.min(SPEED_PROFILES.length - 1, stage))] ?? SPEED_PROFILES[0];

function framesToMs(frames: number) {
  return Math.round(frames * FRAME_MS);
}

function getGarbagePhaseMs(alivePlayers: number) {
  if (alivePlayers <= GARBAGE_TIMER_TOP10_PLAYERS) return 500;
  if (alivePlayers <= GARBAGE_TIMER_START_PLAYERS) return 1500;
  return 2500;
}

function getGarbageChargeWindowMs(alivePlayers: number) {
  return getGarbagePhaseMs(alivePlayers) * 2;
}

function shouldRampGravity(alivePlayers: number) {
  return alivePlayers <= GRAVITY_RAMP_START_PLAYERS;
}

function getGravityStage(elapsedMs: number, alivePlayers: number) {
  if (!shouldRampGravity(alivePlayers)) return 0;

  let stage = 0;
  for (let i = 0; i < SPEED_PROFILES.length; i++) {
    if (elapsedMs >= SPEED_PROFILES[i].startMs) {
      stage = i;
    }
  }
  return stage;
}

function getAttackClearType(clearedLines: number, tSpin: 'none' | 'mini' | 'full'): AttackClearType {
  if (tSpin === 'mini') {
    if (clearedLines === 1) return 'tSpinMiniSingle';
    if (clearedLines === 2) return 'tSpinMiniDouble';
  }
  if (tSpin === 'full') {
    if (clearedLines === 1) return 'tSpinSingle';
    if (clearedLines === 2) return 'tSpinDouble';
    if (clearedLines === 3) return 'tSpinTriple';
  }
  if (clearedLines === 1) return 'single';
  if (clearedLines === 2) return 'double';
  if (clearedLines === 3) return 'triple';
  if (clearedLines === 4) return 'tetris';
  return 'none';
}

function getBaseAttack(clearType: AttackClearType) {
  switch (clearType) {
    case 'double':
      return 1;
    case 'triple':
      return 2;
    case 'tetris':
      return 4;
    case 'tSpinMiniDouble':
      return 1;
    case 'tSpinMiniSingle':
      return 0;
    case 'tSpinSingle':
      return 2;
    case 'tSpinDouble':
      return 4;
    case 'tSpinTriple':
      return 6;
    default:
      return 0;
  }
}

function isB2bEligible(clearType: AttackClearType) {
  return clearType === 'tetris'
    || clearType === 'tSpinMiniSingle'
    || clearType === 'tSpinMiniDouble'
    || clearType === 'tSpinSingle'
    || clearType === 'tSpinDouble'
    || clearType === 'tSpinTriple';
}

function getComboBonus(comboChain: number) {
  if (comboChain <= 0) return 0;
  if (comboChain <= 2) return 1;
  if (comboChain <= 4) return 2;
  if (comboChain <= 6) return 3;
  if (comboChain <= 9) return 4;
  return 5;
}

function calculatePlacementAttack(clearType: AttackClearType, currentComboChain: number, isB2bActive: boolean) {
  if (clearType === 'none') {
    return {
      total: 0,
      base: 0,
      b2bBonus: 0,
      comboBonus: 0,
      nextComboChain: 0,
      nextB2bActive: isB2bActive,
    };
  }

  const base = getBaseAttack(clearType);
  const comboBonus = getComboBonus(currentComboChain);
  const b2bEligible = isB2bEligible(clearType);
  const b2bBonus = b2bEligible && isB2bActive ? 1 : 0;

  return {
    total: base + b2bBonus + comboBonus,
    base,
    b2bBonus,
    comboBonus,
    nextComboChain: currentComboChain + 1,
    nextB2bActive: b2bEligible,
  };
}

function makeBag(rng: () => number) {
  let bag: PieceType[] = [];
  return () => {
    if (bag.length === 0) {
      bag = [...PIECES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function createT99EmptyBoard(): RhythmBoardState {
  return Array.from({ length: T99_BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

function normalizeT99Board(boardState: RhythmBoardState): RhythmBoardState {
  if (boardState.length === T99_BOARD_HEIGHT) return boardState.map(row => [...row]);
  if (boardState.length > T99_BOARD_HEIGHT) {
    return boardState.slice(boardState.length - T99_BOARD_HEIGHT).map(row => [...row]);
  }
  return [
    ...Array.from({ length: T99_BOARD_HEIGHT - boardState.length }, () => Array(BOARD_WIDTH).fill(null)),
    ...boardState.map(row => [...row]),
  ];
}

function getT99WallKicks(type: PieceType, fromRotation: number, toRotation: number): [number, number][] {
  const from = ROTATION_NAMES[fromRotation];
  const to = ROTATION_NAMES[toRotation];
  const key = `${from}->${to}`;

  if (type === 'I') return WALL_KICKS_I[key] || [[0, 0]];
  if (type === 'O') return [[0, 0]];
  return WALL_KICKS_JLSTZ[key] || [[0, 0]];
}

function isT99ValidPosition(piece: RhythmPiece, boardState: RhythmBoardState): boolean {
  const shape = getShape(piece.type, piece.rotation);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const newX = piece.x + x;
      const newY = piece.y + y;
      if (newX < 0 || newX >= BOARD_WIDTH || newY >= T99_BOARD_HEIGHT) return false;
      if (newY >= 0 && boardState[newY]?.[newX] !== null) return false;
    }
  }
  return true;
}

function tryT99Rotation(piece: RhythmPiece, direction: 1 | -1, boardState: RhythmBoardState): { piece: RhythmPiece; kick: RotationKickInfo } | null {
  const nextRotation = (piece.rotation + direction + 4) % 4;
  const kicks = getT99WallKicks(piece.type as PieceType, piece.rotation, nextRotation);

  for (const [dx, dy] of kicks) {
    const rotated = {
      ...piece,
      rotation: nextRotation,
      x: piece.x + dx,
      y: piece.y - dy,
    };
    if (isT99ValidPosition(rotated, boardState)) return { piece: rotated, kick: { dx, dy } };
  }

  return null;
}

function lockT99Piece(piece: RhythmPiece, boardState: RhythmBoardState): RhythmBoardState {
  const nextBoard = normalizeT99Board(boardState);
  const shape = getShape(piece.type, piece.rotation);

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const boardY = piece.y + y;
      const boardX = piece.x + x;
      if (boardY >= 0 && boardY < T99_BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
        nextBoard[boardY][boardX] = piece.type;
      }
    }
  }

  return nextBoard;
}

function clearT99Lines(boardState: RhythmBoardState): { newBoard: RhythmBoardState; clearedLines: number } {
  const remaining = boardState.filter(row => row.some(cell => cell === null));
  const clearedLines = T99_BOARD_HEIGHT - remaining.length;

  while (remaining.length < T99_BOARD_HEIGHT) {
    remaining.unshift(Array(BOARD_WIDTH).fill(null));
  }

  return { newBoard: remaining, clearedLines };
}

function getT99GhostY(piece: RhythmPiece, boardState: RhythmBoardState): number {
  let ghostY = piece.y;
  while (isT99ValidPosition({ ...piece, y: ghostY + 1 }, boardState)) {
    ghostY += 1;
  }
  return ghostY;
}

function createT99SpawnPiece(type: PieceType): RhythmPiece {
  const shape = getShape(type, 0);
  return {
    type,
    rotation: 0,
    x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
    y: T99_BUFFER_ZONE - 1,
  };
}

function applyT99GarbageRise(
  boardState: RhythmBoardState,
  count: number,
  rng: () => number = Math.random,
): { newBoard: RhythmBoardState; overflowed: boolean } {
  if (count <= 0) {
    return { newBoard: normalizeT99Board(boardState), overflowed: false };
  }

  const normalizedBoard = normalizeT99Board(boardState);
  const rowsToRaise = Math.min(count, T99_BOARD_HEIGHT);
  const overflowed = normalizedBoard
    .slice(0, rowsToRaise)
    .some(row => row.some(Boolean));

  const raisedBoard = normalizedBoard.slice(rowsToRaise);
  for (let i = 0; i < rowsToRaise; i++) {
    const gapCol = Math.floor(rng() * BOARD_WIDTH);
    raisedBoard.push(Array.from({ length: BOARD_WIDTH }, (_, x) => (x === gapCol ? null : 'garbage')));
  }

  return { newBoard: raisedBoard, overflowed };
}

function getDisplayCellColor(cell: string | null) {
  if (!cell) return 'rgba(255,255,255,0.04)';
  return PLAYER_COLORS[cell] ?? PLAYER_COLORS.T;
}

function detectPlayerTSpin(piece: RhythmPiece, board: RhythmBoardState, wasRotation: boolean, lastKick: RotationKickInfo | null): 'none' | 'mini' | 'full' {
  if (piece.type !== 'T' || !wasRotation) return 'none';
  const boardHeight = board.length;

  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners: Array<[number, number]> = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];

  let filledCorners = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= boardHeight || board[y]?.[x]) {
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
    default:
      return 'none';
  }

  let frontFilled = 0;
  for (const [x, y] of frontCorners) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= boardHeight || board[y]?.[x]) {
      frontFilled += 1;
    }
  }

  if (frontFilled >= 2) return 'full';
  if (lastKick && Math.abs(lastKick.dx) === 1 && Math.abs(lastKick.dy) === 2) return 'full';
  return 'mini';
}

function boardDanger(board: RhythmBoardState) {
  for (let y = 0; y < board.length; y++) {
    if (board[y].some(Boolean)) return board.length - y;
  }
  return 0;
}

function targetLabel(mode: TargetMode) {
  if (mode === 'attackers') return 'Attackers';
  if (mode === 'kos') return 'K.O.s';
  if (mode === 'badges') return 'Badges';
  return 'Random';
}

function getTargetModeFromArrow(code: string): TargetMode | null {
  if (code === 'ArrowLeft') return 'random';
  if (code === 'ArrowUp') return 'kos';
  if (code === 'ArrowRight') return 'badges';
  if (code === 'ArrowDown') return 'attackers';
  return null;
}

function clearTypePanelTitle(clearType: AttackClearType) {
  switch (clearType) {
    case 'tetris':
      return 'TETRIS';
    case 'tSpinMiniSingle':
      return 'MINI T-SPIN SINGLE';
    case 'tSpinMiniDouble':
      return 'MINI T-SPIN DOUBLE';
    case 'tSpinSingle':
      return 'T-SPIN SINGLE';
    case 'tSpinDouble':
      return 'T-SPIN DOUBLE';
    case 'tSpinTriple':
      return 'T-SPIN TRIPLE';
    default:
      return null;
  }
}

function sumGarbage(queue: GarbagePacket[]) {
  return queue.reduce((sum, packet) => sum + packet.lines, 0);
}

function tickGarbageQueue(queue: GarbagePacket[], elapsedMs: number, alivePlayers: number) {
  if (!queue.length) return queue;
  const [nextPacket, ...rest] = queue;
  const chargeWindowMs = getGarbageChargeWindowMs(alivePlayers);
  if (nextPacket.chargeMs >= chargeWindowMs) return queue;
  return [{ ...nextPacket, chargeMs: Math.min(chargeWindowMs, nextPacket.chargeMs + elapsedMs) }, ...rest];
}

function collectNextReadyGarbage(queue: GarbagePacket[], alivePlayers: number) {
  if (!queue.length) {
    return { queue, due: 0, lastSource: null as string | null };
  }

  const [nextPacket, ...rest] = queue;
  if (nextPacket.chargeMs < getGarbageChargeWindowMs(alivePlayers)) {
    return { queue, due: 0, lastSource: null as string | null };
  }

  return { queue: rest, due: nextPacket.lines, lastSource: nextPacket.from };
}

function attackerBonus(count: number) {
  if (count <= 1) return 0;
  if (count === 2) return 1;
  if (count === 3) return 3;
  if (count === 4) return 5;
  if (count === 5) return 7;
  return 9;
}

function offsetGarbageQueue(queue: GarbagePacket[], amount: number) {
  let remaining = amount;
  let canceled = 0;
  const next: GarbagePacket[] = [];
  for (const packet of queue) {
    if (remaining <= 0) {
      next.push(packet);
      continue;
    }
    const offset = Math.min(packet.lines, remaining);
    const packetLinesLeft = packet.lines - offset;
    canceled += offset;
    remaining -= offset;
    if (packetLinesLeft > 0) next.push({ ...packet, lines: packetLinesLeft });
  }
  return { next, remaining, canceled };
}

function BadgeMeter({ stage, compact = false }: { stage: number; compact?: boolean }) {
  const pips = Array.from({ length: 4 }, (_, index) => index < stage);
  return (
    <div className={`${styles.badgeMeter} ${compact ? styles.badgeMeterCompact : ''}`}>
      <div className={styles.badgePips}>
        {pips.map((active, index) => (
          <span
            key={`badge-pip-${index}`}
            className={`${styles.badgePip} ${active ? styles.badgePipActive : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function getPacketTimerProgress(packet: GarbagePacket, alivePlayers: number) {
  return Math.max(0, Math.min(1, packet.chargeMs / Math.max(1, getGarbageChargeWindowMs(alivePlayers))));
}

function IncomingGarbageRail({ packets, alivePlayers }: { packets: GarbagePacket[]; alivePlayers: number }) {
  const filledBlocks = packets.flatMap((packet, packetIndex) =>
    Array.from({ length: Math.min(packet.lines, MAX_PENDING_GARBAGE) }, (_, index) => ({
      id: `${packet.id}-${index}`,
      from: packet.from,
      progress: packetIndex === 0 ? getPacketTimerProgress(packet, alivePlayers) : 0,
      active: packetIndex === 0,
    })),
  ).slice(0, MAX_PENDING_GARBAGE);

  const emptyCount = Math.max(0, MAX_PENDING_GARBAGE - filledBlocks.length);
  const displayBlocks = [
    ...Array.from({ length: emptyCount }, () => null),
    ...filledBlocks.slice().reverse(),
  ];

  return (
    <div className={styles.garbageRail}>
      {displayBlocks.map((block, index) => {
        const toneClass = !block || !block.active ? '' :
          block.progress >= 1 ? styles.garbageBlockHot :
            block.progress >= 0.5 ? styles.garbageBlockWarm :
              styles.garbageBlockCool;

        return (
          <div
            key={block?.id ?? `empty-${index}`}
            className={`${styles.garbageBlock} ${block && !block.active ? styles.garbageBlockQueued : ''} ${block?.active ? styles.garbageBlockActive : ''} ${toneClass} ${block?.active && block.progress >= 1 ? styles.garbageBlockFlashing : ''}`}
            title={block ? `${block.from} +1` : undefined}
            style={block?.active ? ({ ['--garbage-progress' as string]: `${Math.max(10, block.progress * 100)}%` }) : undefined}
          >
            {block?.active && (
              <>
                <div className={styles.garbageBlockStripe} />
                <div className={styles.garbageBlockTimer} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MicroBoard({
  bot,
  targeted,
  focused = false,
  clickable = false,
  onSelect,
  boardRef,
}: {
  bot: BotState;
  targeted: boolean;
  focused?: boolean;
  clickable?: boolean;
  onSelect?: (botId: string) => void;
  boardRef?: (node: HTMLDivElement | null) => void;
}) {
  const cls = [
    styles.microCard,
    targeted ? styles.microCardTargeted : '',
    focused ? styles.microCardFocused : '',
    clickable ? styles.microCardClickable : '',
    bot.targetIds.includes(PLAYER_ID) ? styles.microCardAttacker : '',
  ].filter(Boolean).join(' ');
  const visibleBoard = bot.board.slice(bot.board.length - T99_VISIBLE_HEIGHT);
  const handleSelect = () => {
    onSelect?.(bot.id);
  };
  return (
    <div
      ref={boardRef}
      className={cls}
      onClick={clickable ? handleSelect : undefined}
      onKeyDown={clickable ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      } : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? focused || targeted : undefined}
      aria-label={clickable ? `Select ${bot.name}` : undefined}
    >
      <div className={styles.microHeader}>
        <span>{bot.name}</span>
        <BadgeMeter stage={bot.badges} compact />
      </div>
      <div className={styles.microBoard}>
        {visibleBoard.flatMap((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${bot.id}-${y}-${x}`}
              className={styles.microCell}
              style={{ background: getDisplayCellColor(cell) }}
            />
          )),
        )}
      </div>
      {!bot.alive && <div className={styles.deadOverlay}>KO</div>}
    </div>
  );
}

function PreviewShape({ type }: { type: PieceType | null }) {
  const pieceColor = type ? (PLAYER_COLORS[type] ?? PLAYER_COLORS.T) : 'transparent';
  const shape = type ? PREVIEW_SHAPES[type] : null;
  const display = Array.from({ length: PREVIEW_GRID_ROWS }, () => Array<number>(PREVIEW_GRID_COLUMNS).fill(0));

  if (shape) {
    const xOffset = Math.max(0, Math.round((PREVIEW_GRID_COLUMNS - shape[0].length) / 2));
    const yOffset = Math.max(0, Math.round((PREVIEW_GRID_ROWS - shape.length) / 2));

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const displayY = y + yOffset;
        const displayX = x + xOffset;
        if (displayY >= 0 && displayY < PREVIEW_GRID_ROWS && displayX >= 0 && displayX < PREVIEW_GRID_COLUMNS) {
          display[displayY][displayX] = 1;
        }
      }
    }
  }

  return (
    <div
      className={`${styles.previewShape} ${!type ? styles.previewShapeEmpty : ''}`}
      style={{ gridTemplateColumns: `repeat(${PREVIEW_GRID_COLUMNS}, 10px)` }}
    >
      {display.flatMap((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <div
            key={`${type ?? 'empty'}-${rowIndex}-${cellIndex}`}
            className={styles.previewCell}
            style={{
              background: cell ? pieceColor : 'transparent',
              boxShadow: cell ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)' : 'none',
            }}
          />
        )),
      )}
    </div>
  );
}

function PlayerBoard({ board, currentPiece }: { board: RhythmBoardState; currentPiece: RhythmPiece | null }) {
  const displayBoard = useMemo(() => {
    const display = board.map(row => [...row]);

    if (currentPiece) {
      const shape = getShape(currentPiece.type, currentPiece.rotation);
      const ghostY = getT99GhostY(currentPiece, board);

      if (ghostY !== currentPiece.y) {
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const boardY = ghostY + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < display.length && boardX >= 0 && boardX < BOARD_WIDTH && display[boardY][boardX] === null) {
              display[boardY][boardX] = `ghost-${currentPiece.type}`;
            }
          }
        }
      }

      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (!shape[y][x]) continue;
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY >= 0 && boardY < display.length && boardX >= 0 && boardX < BOARD_WIDTH) {
            display[boardY][boardX] = currentPiece.type;
          }
        }
      }
    }

    return display.slice(display.length - T99_VISIBLE_HEIGHT);
  }, [board, currentPiece]);

  return (
    <div className={styles.playerBoard}>
      {displayBoard.flatMap((row, y) =>
        row.map((cell, x) => {
          const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
          const pieceType = isGhost ? cell.slice(6) : cell;
          const color = pieceType ? PLAYER_COLORS[pieceType] ?? '#ffffff' : 'transparent';
          const style = pieceType ? ({ ['--player-cell-color' as string]: color } as CSSProperties) : undefined;
          return (
            <div
              key={`${y}-${x}`}
              className={`${styles.playerCell} ${pieceType ? styles.playerCellFilled : ''} ${isGhost ? styles.playerCellGhost : ''}`}
              style={style}
            />
          );
        }),
      )}
    </div>
  );
}

export default function Tetris99GameProper() {
  const router = useRouter();
  const { setFullscreen } = useLayoutConfig();
  const audioRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const garbageSparklePacketRef = useRef<{ packetId: string; yellowPlayed: boolean; redPlayed: boolean } | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const playerBoardFrameRef = useRef<HTMLDivElement | null>(null);
  const botBoardRefs = useRef(new Map<string, HTMLDivElement>());
  const attackEffectTimersRef = useRef<number[]>([]);
  const speedNoticeTimerRef = useRef<number | null>(null);
  const targetModeNoticeTimerRef = useRef<number | null>(null);
  const actionPanelTimerRef = useRef<number | null>(null);
  const snapshotFrameRef = useRef<number | null>(null);
  const matchServerRef = useRef<Worker | null>(null);
  const matchIdRef = useRef(0);
  const showAllAttackTrailsRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const packetIdRef = useRef(0);
  const rngRef = useRef(makeRng(99009));
  const bagRef = useRef(makeBag(rngRef.current));
  const botBagRef = useRef(makeBag(makeRng(44091)));
  const currentPieceRef = useRef<RhythmPiece | null>(null);
  const holdRef = useRef<PieceType | null>(null);
  const canHoldRef = useRef(true);
  const boardRef = useRef<RhythmBoardState>(createT99EmptyBoard());
  const queueRef = useRef<PieceType[]>([]);
  const comboRef = useRef(0);
  const linesRef = useRef(0);
  const scoreRef = useRef(0);
  const kosRef = useRef(0);
  const badgePointsRef = useRef(0);
  const badgesRef = useRef(0);
  const tSpinsRef = useRef(0);
  const incomingRef = useRef<GarbagePacket[]>([]);
  const playerTargetIdsRef = useRef<string[]>([]);
  const backToBackRef = useRef(false);
  const lastMoveRotationRef = useRef(false);
  const lastRotationKickRef = useRef<RotationKickInfo | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);
  const isOnGroundRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const dasTimerRef = useRef<number | null>(null);
  const arrTimerRef = useRef<number | null>(null);
  const softDropTimerRef = useRef<number | null>(null);
  const lastDirRef = useRef<'left' | 'right' | ''>('');
  const botsRef = useRef<BotState[]>([]);
  const targetModeRef = useRef<TargetMode>('attackers');
  const stateRef = useRef<MatchState>('countdown');
  const countdownRef = useRef(3);
  const battleStartedAtRef = useRef<number | null>(null);
  const battleEndedAtRef = useRef<number | null>(null);
  const matchStartedAtRef = useRef<number | null>(null);
  const matchEndedAtRef = useRef<number | null>(null);
  const pauseStartedAtRef = useRef<number | null>(null);
  const pausedDurationMsRef = useRef(0);
  const speedStageRef = useRef(0);
  const playerAliveRef = useRef(true);
  const eliminatedPlaceRef = useRef<number | null>(null);
  const manualTargetIdRef = useRef<string | null>(null);
  const spectatePinnedRef = useRef(false);
  const spectateTargetIdRef = useRef<string | null>(null);
  const victoryRef = useRef(false);
  const winnerNameRef = useRef<string | null>(null);
  const lastDamagedByRef = useRef<string | null>(null);
  const statusRef = useRef('Get ready');
  const [botRenderVersion, setBotRenderVersion] = useState(0);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speedNotice, setSpeedNotice] = useState<string | null>(null);
  const [targetModeNotice, setTargetModeNotice] = useState<string | null>(null);
  const [actionPanel, setActionPanel] = useState<{ eyebrow: string | null; title: string } | null>(null);
  const [showAllAttackTrails, setShowAllAttackTrails] = useState(() => loadTetris99ShowAllAttackTrails());
  const [manualTargetId, setManualTargetId] = useState<string | null>(null);
  const [spectateTargetId, setSpectateTargetId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    board: createT99EmptyBoard(),
    currentPiece: null,
    hold: null,
    queue: [],
    lines: 0,
    score: 0,
    combo: 0,
    kos: 0,
    badges: 0,
    badgePoints: 0,
    badgeBoostPercent: 0,
    place: 99,
    attackers: 0,
    incomingGarbage: 0,
    incomingPackets: [],
    ren: 0,
    tSpins: 0,
    b2bActive: false,
    targetMode: 'attackers',
    state: 'countdown',
    countdown: 3,
    speedStage: 0,
    speedLabel: getSpeedProfile(0).label,
    gameOver: false,
    playerOut: false,
    spectating: false,
    victory: false,
    winnerName: null,
    status: 'Get ready',
  });

  function ensureAudio() {
    if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    return audioRef.current;
  }

  function getNoiseBuffer(ctx: AudioContext) {
    if (!noiseBufferRef.current || noiseBufferRef.current.sampleRate !== ctx.sampleRate) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.8), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseBufferRef.current = buffer;
    }
    return noiseBufferRef.current;
  }

  function playTone(options: {
    freq: number;
    duration: number;
    type: OscillatorType;
    gainValue: number;
    endFreq?: number;
    startDelay?: number;
    attack?: number;
    detune?: number;
    filterType?: BiquadFilterType;
    filterFreq?: number;
    filterQ?: number;
  }) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + (options.startDelay ?? 0);
    const attack = options.attack ?? 0.003;
    osc.type = options.type;
    osc.frequency.setValueAtTime(options.freq, startTime);
    if (options.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFreq), startTime + options.duration);
    }
    if (options.detune) {
      osc.detune.setValueAtTime(options.detune, startTime);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gainValue), startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration);

    if (options.filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = options.filterType;
      filter.frequency.setValueAtTime(options.filterFreq ?? Math.max(200, options.freq * 2), startTime);
      filter.Q.value = options.filterQ ?? 0.7;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + options.duration);
  }

  function playNoiseBurst(options: {
    duration: number;
    gainValue: number;
    startDelay?: number;
    filterType?: BiquadFilterType;
    filterFreq?: number;
    filterQ?: number;
  }) {
    const ctx = ensureAudio();
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer(ctx);
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + (options.startDelay ?? 0);
    const filter = ctx.createBiquadFilter();
    filter.type = options.filterType ?? 'highpass';
    filter.frequency.setValueAtTime(options.filterFreq ?? 1400, startTime);
    filter.Q.value = options.filterQ ?? 0.8;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gainValue), startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(startTime);
    source.stop(startTime + options.duration);
  }

  function playSfx(kind: 'move' | 'rotate' | 'hold' | 'lock' | 'drop' | 'clear' | 'tetris' | 'tSpin' | 'tSpinMini' | 'garbage' | 'garbageSparkleYellow' | 'garbageSparkleRed' | 'ko' | 'koOther' | 'countdown' | 'start' | 'danger' | 'menu' | 'target' | 'win' | 'lose') {
    switch (kind) {
      case 'move':
        playTone({ freq: 300, endFreq: 248, duration: 0.028, type: 'square', gainValue: 0.009, filterType: 'lowpass', filterFreq: 1100 });
        playNoiseBurst({ duration: 0.02, gainValue: 0.0035, filterType: 'highpass', filterFreq: 2600 });
        break;
      case 'rotate':
        playTone({ freq: 530, endFreq: 780, duration: 0.046, type: 'triangle', gainValue: 0.014, filterType: 'highpass', filterFreq: 420 });
        playNoiseBurst({ duration: 0.028, gainValue: 0.0045, startDelay: 0.01, filterType: 'bandpass', filterFreq: 2100, filterQ: 1.6 });
        break;
      case 'hold':
        playTone({ freq: 360, endFreq: 610, duration: 0.06, type: 'triangle', gainValue: 0.018 });
        playTone({ freq: 180, endFreq: 260, duration: 0.07, type: 'square', gainValue: 0.008, startDelay: 0.01, filterType: 'lowpass', filterFreq: 900 });
        break;
      case 'lock':
        playTone({ freq: 176, endFreq: 98, duration: 0.08, type: 'sawtooth', gainValue: 0.018, filterType: 'lowpass', filterFreq: 620 });
        playNoiseBurst({ duration: 0.06, gainValue: 0.009, filterType: 'bandpass', filterFreq: 780, filterQ: 1.4 });
        break;
      case 'drop':
        playTone({ freq: 290, endFreq: 78, duration: 0.12, type: 'sawtooth', gainValue: 0.024, filterType: 'lowpass', filterFreq: 820 });
        playTone({ freq: 610, endFreq: 182, duration: 0.055, type: 'square', gainValue: 0.01, filterType: 'lowpass', filterFreq: 1400 });
        playNoiseBurst({ duration: 0.085, gainValue: 0.012, filterType: 'lowpass', filterFreq: 1200 });
        break;
      case 'clear':
        playTone({ freq: 740, endFreq: 1047, duration: 0.08, type: 'triangle', gainValue: 0.02 });
        playTone({ freq: 1109, endFreq: 1397, duration: 0.085, type: 'triangle', gainValue: 0.015, startDelay: 0.045 });
        playNoiseBurst({ duration: 0.08, gainValue: 0.006, startDelay: 0.035, filterType: 'bandpass', filterFreq: 2300, filterQ: 1.8 });
        break;
      case 'tetris':
        playTone({ freq: 220, endFreq: 140, duration: 0.12, type: 'sawtooth', gainValue: 0.014, filterType: 'lowpass', filterFreq: 540 });
        playTone({ freq: 740, endFreq: 1319, duration: 0.14, type: 'triangle', gainValue: 0.024, startDelay: 0.015 });
        playTone({ freq: 1175, endFreq: 1760, duration: 0.15, type: 'triangle', gainValue: 0.02, startDelay: 0.06 });
        playNoiseBurst({ duration: 0.14, gainValue: 0.01, startDelay: 0.04, filterType: 'bandpass', filterFreq: 2500, filterQ: 1.4 });
        break;
      case 'tSpinMini':
        playTone({ freq: 466, endFreq: 740, duration: 0.055, type: 'triangle', gainValue: 0.018 });
        playTone({ freq: 880, endFreq: 622, duration: 0.075, type: 'square', gainValue: 0.01, startDelay: 0.02 });
        playNoiseBurst({ duration: 0.05, gainValue: 0.004, startDelay: 0.02, filterType: 'bandpass', filterFreq: 1950, filterQ: 1.9 });
        break;
      case 'tSpin':
        playTone({ freq: 415, endFreq: 659, duration: 0.05, type: 'triangle', gainValue: 0.018 });
        playTone({ freq: 659, endFreq: 1245, duration: 0.09, type: 'triangle', gainValue: 0.024, startDelay: 0.03 });
        playTone({ freq: 208, endFreq: 311, duration: 0.09, type: 'square', gainValue: 0.008, startDelay: 0.015, filterType: 'lowpass', filterFreq: 980 });
        playNoiseBurst({ duration: 0.095, gainValue: 0.008, startDelay: 0.045, filterType: 'bandpass', filterFreq: 2200, filterQ: 1.6 });
        break;
      case 'garbage':
        playTone({ freq: 142, endFreq: 76, duration: 0.16, type: 'sawtooth', gainValue: 0.022, filterType: 'lowpass', filterFreq: 420 });
        playTone({ freq: 92, endFreq: 61, duration: 0.13, type: 'square', gainValue: 0.01, startDelay: 0.025, filterType: 'lowpass', filterFreq: 300 });
        playNoiseBurst({ duration: 0.14, gainValue: 0.016, filterType: 'lowpass', filterFreq: 520 });
        break;
      case 'garbageSparkleYellow':
        playTone({ freq: 1175, endFreq: 1568, duration: 0.04, type: 'triangle', gainValue: 0.01 });
        playTone({ freq: 1661, endFreq: 2093, duration: 0.055, type: 'sine', gainValue: 0.009, startDelay: 0.028 });
        playNoiseBurst({ duration: 0.03, gainValue: 0.003, startDelay: 0.01, filterType: 'highpass', filterFreq: 3200 });
        break;
      case 'garbageSparkleRed':
        playTone({ freq: 1319, endFreq: 1760, duration: 0.045, type: 'triangle', gainValue: 0.012 });
        playTone({ freq: 1976, endFreq: 2637, duration: 0.06, type: 'sine', gainValue: 0.011, startDelay: 0.024 });
        playTone({ freq: 2637, endFreq: 3136, duration: 0.05, type: 'triangle', gainValue: 0.007, startDelay: 0.07 });
        playNoiseBurst({ duration: 0.04, gainValue: 0.004, startDelay: 0.018, filterType: 'highpass', filterFreq: 3600 });
        break;
      case 'ko':
        playTone({ freq: 740, endFreq: 988, duration: 0.05, type: 'square', gainValue: 0.015 });
        playTone({ freq: 988, endFreq: 1480, duration: 0.09, type: 'triangle', gainValue: 0.025, startDelay: 0.028 });
        playTone({ freq: 1480, endFreq: 1976, duration: 0.11, type: 'triangle', gainValue: 0.018, startDelay: 0.085 });
        playTone({ freq: 196, endFreq: 104, duration: 0.11, type: 'sawtooth', gainValue: 0.012, filterType: 'lowpass', filterFreq: 460 });
        playNoiseBurst({ duration: 0.09, gainValue: 0.008, startDelay: 0.02, filterType: 'bandpass', filterFreq: 1700, filterQ: 1.2 });
        break;
      case 'koOther':
        playTone({ freq: 205, endFreq: 118, duration: 0.13, type: 'sawtooth', gainValue: 0.014, filterType: 'lowpass', filterFreq: 500 });
        playTone({ freq: 152, endFreq: 82, duration: 0.14, type: 'triangle', gainValue: 0.008, startDelay: 0.03, filterType: 'lowpass', filterFreq: 320 });
        playNoiseBurst({ duration: 0.12, gainValue: 0.012, filterType: 'lowpass', filterFreq: 650 });
        break;
      case 'countdown':
        playTone({ freq: 740, endFreq: 784, duration: 0.05, type: 'square', gainValue: 0.012 });
        break;
      case 'start':
        playTone({ freq: 659, endFreq: 988, duration: 0.08, type: 'triangle', gainValue: 0.022 });
        playTone({ freq: 988, endFreq: 1319, duration: 0.11, type: 'triangle', gainValue: 0.02, startDelay: 0.05 });
        playTone({ freq: 329, endFreq: 220, duration: 0.08, type: 'square', gainValue: 0.008, filterType: 'lowpass', filterFreq: 760 });
        break;
      case 'danger':
        playTone({ freq: 190, endFreq: 154, duration: 0.1, type: 'square', gainValue: 0.016, filterType: 'lowpass', filterFreq: 780 });
        playTone({ freq: 380, endFreq: 320, duration: 0.095, type: 'triangle', gainValue: 0.01, startDelay: 0.01 });
        break;
      case 'menu':
        playTone({ freq: 520, endFreq: 784, duration: 0.045, type: 'triangle', gainValue: 0.012 });
        break;
      case 'target':
        playTone({ freq: 466, endFreq: 699, duration: 0.04, type: 'triangle', gainValue: 0.012 });
        playTone({ freq: 699, endFreq: 932, duration: 0.05, type: 'triangle', gainValue: 0.009, startDelay: 0.02 });
        break;
      case 'win':
        playTone({ freq: 523, endFreq: 784, duration: 0.12, type: 'triangle', gainValue: 0.018 });
        playTone({ freq: 659, endFreq: 1047, duration: 0.14, type: 'triangle', gainValue: 0.016, startDelay: 0.05 });
        playTone({ freq: 784, endFreq: 1568, duration: 0.18, type: 'triangle', gainValue: 0.018, startDelay: 0.11 });
        playNoiseBurst({ duration: 0.14, gainValue: 0.007, startDelay: 0.08, filterType: 'bandpass', filterFreq: 2600, filterQ: 1.4 });
        break;
      case 'lose':
        playTone({ freq: 280, endFreq: 92, duration: 0.22, type: 'sawtooth', gainValue: 0.022, filterType: 'lowpass', filterFreq: 520 });
        playTone({ freq: 139, endFreq: 69, duration: 0.2, type: 'square', gainValue: 0.009, startDelay: 0.02, filterType: 'lowpass', filterFreq: 260 });
        playNoiseBurst({ duration: 0.16, gainValue: 0.012, filterType: 'lowpass', filterFreq: 480 });
        break;
      default:
        break;
    }
  }

  function syncGarbageSparkle(queue: GarbagePacket[]) {
    const nextPacket = queue[0] ?? null;
    if (!nextPacket) {
      garbageSparklePacketRef.current = null;
      return;
    }

    if (!garbageSparklePacketRef.current || garbageSparklePacketRef.current.packetId !== nextPacket.id) {
      garbageSparklePacketRef.current = {
        packetId: nextPacket.id,
        yellowPlayed: false,
        redPlayed: false,
      };
    }

    if (stateRef.current !== 'playing') return;

    const sparkleState = garbageSparklePacketRef.current;
    if (!sparkleState) return;

    const progress = getPacketTimerProgress(nextPacket, getAlivePlayerCount());

    if (!sparkleState.yellowPlayed) {
      sparkleState.yellowPlayed = true;
      playSfx('garbageSparkleYellow');
    }

    if (!sparkleState.redPlayed && progress >= 0.5) {
      sparkleState.redPlayed = true;
      playSfx('garbageSparkleRed');
    }
  }

  function clearDAS() {
    if (dasTimerRef.current !== null) {
      window.clearTimeout(dasTimerRef.current);
      dasTimerRef.current = null;
    }
    if (arrTimerRef.current !== null) {
      window.clearInterval(arrTimerRef.current);
      arrTimerRef.current = null;
    }
    lastDirRef.current = '';
  }

  function clearSoftDrop() {
    if (softDropTimerRef.current !== null) {
      window.clearInterval(softDropTimerRef.current);
      softDropTimerRef.current = null;
    }
  }

  function clearAttackEffects() {
    for (const timer of attackEffectTimersRef.current) {
      window.clearTimeout(timer);
    }
    attackEffectTimersRef.current = [];
    setAttackEffects([]);
  }

  function clearSpeedNotice() {
    if (speedNoticeTimerRef.current !== null) {
      window.clearTimeout(speedNoticeTimerRef.current);
      speedNoticeTimerRef.current = null;
    }
    setSpeedNotice(null);
  }

  function clearTargetModeNotice() {
    if (targetModeNoticeTimerRef.current !== null) {
      window.clearTimeout(targetModeNoticeTimerRef.current);
      targetModeNoticeTimerRef.current = null;
    }
    setTargetModeNotice(null);
  }

  function clearActionPanel() {
    if (actionPanelTimerRef.current !== null) {
      window.clearTimeout(actionPanelTimerRef.current);
      actionPanelTimerRef.current = null;
    }
    setActionPanel(null);
  }

  function showActionPanel(title: string, eyebrow: string | null = null) {
    clearActionPanel();
    setActionPanel({ title, eyebrow });
    actionPanelTimerRef.current = window.setTimeout(() => {
      setActionPanel(null);
      actionPanelTimerRef.current = null;
    }, 1400);
  }

  function showSpeedNoticeForStage(stage: number) {
    clearSpeedNotice();
    setSpeedNotice(`Speed Up! ${getSpeedProfile(stage).label}`);
    speedNoticeTimerRef.current = window.setTimeout(() => {
      setSpeedNotice(null);
      speedNoticeTimerRef.current = null;
    }, 1350);
  }

  function showTargetModeNoticeForMode(mode: TargetMode) {
    clearTargetModeNotice();
    setTargetModeNotice(targetLabel(mode));
    targetModeNoticeTimerRef.current = window.setTimeout(() => {
      setTargetModeNotice(null);
      targetModeNoticeTimerRef.current = null;
    }, 1000);
  }

  function closeSettingsMenu() {
    if (pauseStartedAtRef.current !== null) {
      pausedDurationMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    settingsOpenRef.current = false;
    setSettingsOpen(false);
    postMatchServerMessage({ type: 'resume', matchId: matchIdRef.current });
    playSfx('menu');
  }

  function openSettingsMenu() {
    clearDAS();
    clearSoftDrop();
    keysRef.current.clear();
    if (stateRef.current === 'playing' && pauseStartedAtRef.current === null) {
      pauseStartedAtRef.current = Date.now();
    }
    settingsOpenRef.current = true;
    setSettingsOpen(true);
    postMatchServerMessage({ type: 'pause', matchId: matchIdRef.current });
    playSfx('menu');
  }

  function toggleSettingsMenu() {
    if (settingsOpenRef.current) closeSettingsMenu();
    else openSettingsMenu();
  }

  function toggleAttackTrailPreference() {
    const next = !showAllAttackTrailsRef.current;
    showAllAttackTrailsRef.current = next;
    setShowAllAttackTrails(next);
    saveTetris99ShowAllAttackTrails(next);
  }

  function registerBotBoardRef(id: string, node: HTMLDivElement | null) {
    if (node) botBoardRefs.current.set(id, node);
    else botBoardRefs.current.delete(id);
  }

  function getBoardElement(id: string) {
    if (id === PLAYER_ID) return playerBoardFrameRef.current;
    return botBoardRefs.current.get(id) ?? null;
  }

  function postMatchServerMessage(message: MatchServerMessage) {
    matchServerRef.current?.postMessage(message);
  }

  function pushPlayerStateToServer() {
    if (!matchServerRef.current || matchIdRef.current === 0) return;
    postMatchServerMessage({
      type: 'sync-player',
      matchId: matchIdRef.current,
      player: {
        alive: playerAliveRef.current,
        boardDanger: boardDanger(boardRef.current),
        pendingGarbage: sumGarbage(incomingRef.current),
        badgePoints: badgePointsRef.current,
        badges: badgesRef.current,
        targetMode: targetModeRef.current,
        targetIds: [...playerTargetIdsRef.current],
        marginBonus: getMarginTimeBonus(getBattleElapsedMs()),
      },
    });
  }

  function queueAttackEffects(sourceId: string, distributions: AttackDistribution[]) {
    const arena = arenaRef.current;
    const sourceElement = getBoardElement(sourceId);
    if (!arena || !sourceElement || distributions.length === 0) return;

    const arenaRect = arena.getBoundingClientRect();
    const sourceRect = sourceElement.getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2 - arenaRect.left;
    const startY = sourceRect.top + sourceRect.height / 2 - arenaRect.top;

    const visibleDistributions = distributions.filter(distribution =>
      shouldShowTetris99AttackTrail(sourceId, distribution.targetId, showAllAttackTrailsRef.current),
    );
    if (!visibleDistributions.length) return;

    const sortedDistributions = [...visibleDistributions]
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10);

    const effects = sortedDistributions.flatMap((distribution) => {
      const targetElement = getBoardElement(distribution.targetId);
      if (!targetElement) return [];
      const targetRect = targetElement.getBoundingClientRect();
      const endX = targetRect.left + targetRect.width / 2 - arenaRect.left;
      const endY = targetRect.top + targetRect.height / 2 - arenaRect.top;
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.max(24, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const variant =
        sourceId === PLAYER_ID ? 'player' :
          distribution.targetId === PLAYER_ID ? 'incoming' : 'bot';

      packetIdRef.current += 1;
      return [{
        id: `trail-${packetIdRef.current}`,
        x: startX,
        y: startY,
        length,
        angle,
        lines: distribution.lines,
        variant,
      } satisfies AttackEffect];
    });

    if (!effects.length) return;

    setAttackEffects(prev => [...prev.slice(-18), ...effects]);
    const effectIds = new Set(effects.map(effect => effect.id));
    const timeout = window.setTimeout(() => {
      setAttackEffects(prev => prev.filter(effect => !effectIds.has(effect.id)));
      attackEffectTimersRef.current = attackEffectTimersRef.current.filter(timerId => timerId !== timeout);
    }, 620);
    attackEffectTimersRef.current.push(timeout);
  }

  function getAlivePlayerCount() {
    const aliveBots = botsRef.current.filter(bot => bot.alive).length;
    const playerAlive = playerAliveRef.current ? 1 : 0;
    return aliveBots + playerAlive;
  }

  function getBattleElapsedMs() {
    if (!battleStartedAtRef.current) return 0;
    const end = battleEndedAtRef.current ?? Date.now();
    const pausedForCurrentSession = pauseStartedAtRef.current !== null && battleEndedAtRef.current === null
      ? end - pauseStartedAtRef.current
      : 0;
    return Math.max(0, end - battleStartedAtRef.current - pausedDurationMsRef.current - pausedForCurrentSession);
  }

  function getGravityRampElapsedMs() {
    if (!matchStartedAtRef.current) return 0;
    const end = matchEndedAtRef.current ?? Date.now();
    const pausedForCurrentSession = pauseStartedAtRef.current !== null && matchEndedAtRef.current === null
      ? end - pauseStartedAtRef.current
      : 0;
    return Math.max(0, end - matchStartedAtRef.current - pausedDurationMsRef.current - pausedForCurrentSession);
  }

  function getMarginTimeBonus(elapsedMs: number) {
    if (elapsedMs < MARGIN_TIME_START_MS) return 0;
    const steps = Math.floor((elapsedMs - MARGIN_TIME_START_MS) / MARGIN_TIME_STEP_MS);
    return Math.min(MARGIN_TIME_MAX_BONUS, 1 + steps);
  }

  function applySpeedStage(nextStage: number, announce = false) {
    const normalizedStage = Math.max(0, Math.min(SPEED_PROFILES.length - 1, nextStage));
    const previousStage = speedStageRef.current;
    if (previousStage === normalizedStage) return false;

    speedStageRef.current = normalizedStage;
    postMatchServerMessage({ type: 'set-speed-stage', matchId: matchIdRef.current, stage: normalizedStage });

    if (announce && normalizedStage > previousStage && stateRef.current === 'playing' && playerAliveRef.current) {
      showSpeedNoticeForStage(normalizedStage);
    }

    return true;
  }

  function updateSpeedStage(announce = false) {
    if (stateRef.current !== 'playing') {
      matchStartedAtRef.current = null;
      matchEndedAtRef.current = null;
      return applySpeedStage(0, false);
    }

    const alivePlayers = getAlivePlayerCount();
    if (!shouldRampGravity(alivePlayers)) {
      matchStartedAtRef.current = null;
      matchEndedAtRef.current = null;
      return applySpeedStage(0, false);
    }

    if (!matchStartedAtRef.current) {
      matchStartedAtRef.current = Date.now();
      matchEndedAtRef.current = null;
    }

    return applySpeedStage(getGravityStage(getGravityRampElapsedMs(), alivePlayers), announce);
  }

  function syncSnapshot(status?: string) {
    if (status !== undefined) {
      statusRef.current = status;
    }
    if (snapshotFrameRef.current !== null) return;
    snapshotFrameRef.current = window.requestAnimationFrame(() => {
      snapshotFrameRef.current = null;
      const nextStatus = statusRef.current;
      const alive = botsRef.current.filter(bot => bot.alive).length;
      const alivePlayers = getAlivePlayerCount();
      const attackers = botsRef.current.filter(bot => bot.alive && bot.targetIds.includes(PLAYER_ID)).length;
      const speedStage = speedStageRef.current;
      const speedProfile = getSpeedProfile(speedStage);
      const playerOut = !playerAliveRef.current;
      const gameOver = stateRef.current === 'gameOver';
      const victory = victoryRef.current;
      const place = victory
        ? 1
        : playerOut
          ? (eliminatedPlaceRef.current ?? alive + 1)
          : alive + 1;

      setSnapshot({
        board: boardRef.current,
        currentPiece: currentPieceRef.current,
        hold: holdRef.current,
        queue: queueRef.current.slice(0, 5),
        lines: linesRef.current,
        score: scoreRef.current,
        combo: comboRef.current,
        kos: kosRef.current,
        badges: badgesRef.current,
        badgePoints: badgePointsRef.current,
        badgeBoostPercent: badgeBoostPercentFromStage(badgesRef.current),
        place,
        attackers,
        incomingGarbage: sumGarbage(incomingRef.current),
        incomingPackets: incomingRef.current.map(packet => ({ ...packet })),
        ren: Math.max(0, comboRef.current - 1),
        tSpins: tSpinsRef.current,
        b2bActive: backToBackRef.current,
        targetMode: targetModeRef.current,
        state: stateRef.current,
        countdown: countdownRef.current,
        speedStage,
        speedLabel: `${speedProfile.label} | ${(getGarbageChargeWindowMs(alivePlayers) / 1000).toFixed(1)}s`,
        gameOver,
        playerOut,
        spectating: playerOut && !gameOver,
        victory,
        winnerName: winnerNameRef.current,
        status: nextStatus,
      });

      pushPlayerStateToServer();
    });
  }

  function refillQueue() {
    while (queueRef.current.length < 6) queueRef.current.push(bagRef.current());
  }

  function spawnPiece() {
    refillQueue();
    const type = queueRef.current.shift()!;
    refillQueue();
    const piece = createT99SpawnPiece(type);
    if (!isT99ValidPosition(piece, boardRef.current)) {
      eliminatePlayer();
      return false;
    }
    currentPieceRef.current = piece;
    canHoldRef.current = true;
    lockMovesRef.current = 0;
    isOnGroundRef.current = false;
    lastRotationKickRef.current = null;
    return true;
  }

  function resetGame() {
    clearDAS();
    clearSoftDrop();
    clearAttackEffects();
    clearSpeedNotice();
    clearTargetModeNotice();
    clearActionPanel();
    keysRef.current.clear();
    if (snapshotFrameRef.current !== null) {
      window.cancelAnimationFrame(snapshotFrameRef.current);
      snapshotFrameRef.current = null;
    }
    boardRef.current = createT99EmptyBoard();
    currentPieceRef.current = null;
    holdRef.current = null;
    queueRef.current = [];
    comboRef.current = 0;
    linesRef.current = 0;
    scoreRef.current = 0;
    kosRef.current = 0;
    badgePointsRef.current = 0;
    badgesRef.current = 0;
    tSpinsRef.current = 0;
    incomingRef.current = [];
    garbageSparklePacketRef.current = null;
    playerTargetIdsRef.current = [];
    lastDamagedByRef.current = null;
    backToBackRef.current = false;
    lastMoveRotationRef.current = false;
    lastRotationKickRef.current = null;
    statusRef.current = 'Get ready';
    stateRef.current = 'countdown';
    countdownRef.current = 3;
    battleStartedAtRef.current = null;
    battleEndedAtRef.current = null;
    matchStartedAtRef.current = null;
    matchEndedAtRef.current = null;
    pauseStartedAtRef.current = null;
    pausedDurationMsRef.current = 0;
    speedStageRef.current = 0;
    playerAliveRef.current = true;
    eliminatedPlaceRef.current = null;
    manualTargetIdRef.current = null;
    spectatePinnedRef.current = false;
    victoryRef.current = false;
    winnerNameRef.current = null;
    rngRef.current = makeRng(99009 + Math.floor(Math.random() * 10000));
    bagRef.current = makeBag(rngRef.current);
    botBagRef.current = makeBag(makeRng(44091 + Math.floor(Math.random() * 10000)));
    botsRef.current = Array.from({ length: BOT_COUNT }, (_, i) => {
      const rng = makeRng(20000 + i * 17 + Math.floor(Math.random() * 10000));
      const aiPoints = [900, 2400, 6200, 11000][Math.floor(rng() * 4)] ?? 2400;
      return {
        id: `bot-${i}`,
        name: `${BOT_NAMES[i % BOT_NAMES.length]}-${String(i + 1).padStart(2, '0')}`,
        board: createT99EmptyBoard(),
        queue: Array.from({ length: 6 }, () => botBagRef.current()),
        hold: null,
        combo: 0,
        b2bActive: false,
        tSpins: 0,
        kos: 0,
        lines: 0,
        score: 0,
        badgePoints: 0,
        badges: 0,
        alive: true,
        targetMode: (['random', 'attackers', 'kos', 'badges'] as TargetMode[])[Math.floor(rng() * 4)] ?? 'random',
        targetIds: [],
        pendingGarbage: [],
        lastDamagedBy: null,
        aiPoints,
        danger: 0,
      };
    }).map(bot => ({ ...bot, badges: badgeStageFromPoints(bot.badgePoints) }));
    matchIdRef.current += 1;
    postMatchServerMessage({ type: 'reset', matchId: matchIdRef.current });
    postMatchServerMessage({ type: 'set-speed-stage', matchId: matchIdRef.current, stage: 0 });
    setManualTargetId(null);
    setSpectateTargetId(null);
    refreshPlayerTargets(true);
    setBotRenderVersion(prev => prev + 1);
    spawnPiece();
    syncSnapshot('Get ready');
  }

  function eliminatePlayer() {
    if (!playerAliveRef.current || stateRef.current === 'gameOver') return;
    clearDAS();
    clearSoftDrop();
    clearLockTimer();
    clearSpeedNotice();
    clearTargetModeNotice();
    clearActionPanel();
    keysRef.current.clear();
    garbageSparklePacketRef.current = null;
    playerAliveRef.current = false;
    eliminatedPlaceRef.current = botsRef.current.filter(bot => bot.alive).length + 1;
    manualTargetIdRef.current = null;
    setManualTargetId(null);
    victoryRef.current = false;
    winnerNameRef.current = null;
    currentPieceRef.current = null;
    playerTargetIdsRef.current = [];
    incomingRef.current = [];
    spectatePinnedRef.current = false;
    setSpectateTargetId(getPreferredSpectateBotId(lastDamagedByRef.current));
    syncGarbageSparkle(incomingRef.current);
    pushPlayerStateToServer();
    if (lastDamagedByRef.current && lastDamagedByRef.current !== PLAYER_ID) {
      postMatchServerMessage({
        type: 'player-defeated',
        matchId: matchIdRef.current,
        killerId: lastDamagedByRef.current,
        victimBadgePoints: badgePointsRef.current,
      });
    }
    playSfx('lose');
    syncSnapshot('You were knocked out. Spectating...');
  }

  function finishMatch(victory: boolean, winnerName: string | null = null) {
    if (stateRef.current === 'gameOver') return;
    const lostWhileAlive = !victory && playerAliveRef.current;
    clearDAS();
    clearSoftDrop();
    clearLockTimer();
    clearAttackEffects();
    clearSpeedNotice();
    clearTargetModeNotice();
    clearActionPanel();
    keysRef.current.clear();
    garbageSparklePacketRef.current = null;
    stateRef.current = 'gameOver';
    battleEndedAtRef.current = battleStartedAtRef.current ? Date.now() : null;
    matchEndedAtRef.current = matchStartedAtRef.current ? Date.now() : null;
    victoryRef.current = victory;
    winnerNameRef.current = victory ? 'YOU' : winnerName;
    if (victory) {
      playerAliveRef.current = true;
      eliminatedPlaceRef.current = 1;
    } else if (lostWhileAlive) {
      playerAliveRef.current = false;
      eliminatedPlaceRef.current = botsRef.current.filter(bot => bot.alive).length + 1;
    }
    manualTargetIdRef.current = null;
    setManualTargetId(null);
    spectatePinnedRef.current = false;
    settingsOpenRef.current = false;
    setSettingsOpen(false);
    postMatchServerMessage({ type: 'stop', matchId: matchIdRef.current });
    if (victory) playSfx('win');
    else if (lostWhileAlive) playSfx('lose');
    syncSnapshot(victory ? 'Winner!' : winnerName ? `${winnerName} won the match` : 'Match complete');
  }

  function queuePacket(lines: number, from: string, target: { pendingGarbage: GarbagePacket[] }) {
    const availableSpace = Math.max(0, MAX_PENDING_GARBAGE - sumGarbage(target.pendingGarbage));
    const queuedLines = Math.min(lines, availableSpace);
    if (queuedLines <= 0) return;
    packetIdRef.current += 1;
    target.pendingGarbage.push({ id: `pkt-${packetIdRef.current}`, lines: queuedLines, chargeMs: 0, from });
    if (target.pendingGarbage === incomingRef.current) syncGarbageSparkle(incomingRef.current);
  }

  function applyPendingGarbage() {
    const collected = collectNextReadyGarbage(incomingRef.current, getAlivePlayerCount());
    incomingRef.current = collected.queue;
    syncGarbageSparkle(incomingRef.current);
    if (collected.due <= 0) return { applied: 0, toppedOut: false };
    lastDamagedByRef.current = collected.lastSource;
    const { newBoard, overflowed } = applyT99GarbageRise(boardRef.current, collected.due, rngRef.current);
    boardRef.current = newBoard;
    playSfx('garbage');
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
    return { applied: collected.due, toppedOut: overflowed };
  }

  function setTargetMode(mode: TargetMode) {
    manualTargetIdRef.current = null;
    setManualTargetId(null);
    targetModeRef.current = mode;
    refreshPlayerTargets(mode === 'random');
    pushPlayerStateToServer();
    playSfx('target');
    showTargetModeNoticeForMode(mode);
    syncSnapshot(`${targetLabel(mode)} selected`);
  }

  function getBotById(id: string) {
    return botsRef.current.find(bot => bot.id === id) ?? null;
  }

  function getAliveOpponentIds(sourceId: string) {
    const ids = botsRef.current.filter(bot => bot.alive && bot.id !== sourceId).map(bot => bot.id);
    if (sourceId !== PLAYER_ID && playerAliveRef.current) ids.unshift(PLAYER_ID);
    return ids;
  }

  function candidateDanger(id: string) {
    if (id === PLAYER_ID) return boardDanger(boardRef.current) + sumGarbage(incomingRef.current) * 2;
    const bot = getBotById(id);
    if (!bot || !bot.alive) return -1;
    return bot.danger + sumGarbage(bot.pendingGarbage) * 2;
  }

  function candidateKoDanger(id: string) {
    if (id === PLAYER_ID) return boardDanger(boardRef.current);
    const bot = getBotById(id);
    if (!bot || !bot.alive) return -1;
    return bot.danger;
  }

  function candidateBadges(id: string) {
    if (id === PLAYER_ID) return badgePointsRef.current;
    const bot = getBotById(id);
    if (!bot || !bot.alive) return -1;
    return bot.badgePoints;
  }

  function chooseRandomTarget(candidates: string[]) {
    if (!candidates.length) return [];
    return [candidates[Math.floor(rngRef.current() * candidates.length)] ?? candidates[0]!];
  }

  function getAttackerIds(targetId: string, playerTargets = new Set<string>()) {
    const attackers = botsRef.current
      .filter(bot => bot.alive && bot.id !== targetId && bot.targetIds.includes(targetId))
      .map(bot => bot.id);

    if (targetId !== PLAYER_ID && playerAliveRef.current && playerTargets.has(targetId)) {
      attackers.push(PLAYER_ID);
    }

    return [...new Set(attackers)].filter(id => id === PLAYER_ID || getBotById(id)?.alive);
  }

  function chooseTargets(sourceId: string, mode: TargetMode, playerTargets = new Set<string>()) {
    const candidates = getAliveOpponentIds(sourceId);
    if (!candidates.length) return [];
    if (mode === 'attackers') {
      const attackers = getAttackerIds(sourceId, playerTargets).filter(id => candidates.includes(id));
      return attackers.length ? attackers : chooseRandomTarget(candidates);
    }
    if (mode === 'kos') {
      return [...candidates].sort((a, b) => candidateKoDanger(b) - candidateKoDanger(a) || candidateBadges(a) - candidateBadges(b)).slice(0, 1);
    }
    if (mode === 'badges') {
      return [...candidates].sort((a, b) => candidateBadges(b) - candidateBadges(a) || candidateDanger(b) - candidateDanger(a)).slice(0, 1);
    }
    return chooseRandomTarget(candidates);
  }

  function resolveStableTargets(sourceId: string, mode: TargetMode, currentTargets: string[], playerTargets = new Set<string>()) {
    if (mode === 'attackers') {
      const candidates = getAliveOpponentIds(sourceId);
      const attackers = getAttackerIds(sourceId, playerTargets).filter(id => candidates.includes(id));
      if (attackers.length) return attackers;
      return chooseRandomTarget(candidates);
    }
    if (mode !== 'random') return chooseTargets(sourceId, mode, playerTargets);
    const aliveCurrent = currentTargets.filter(id => (id === PLAYER_ID ? playerAliveRef.current : !!getBotById(id)?.alive));
    return aliveCurrent.length ? aliveCurrent : chooseTargets(sourceId, mode, playerTargets);
  }

  function distributeAttack(sourceId: string, mode: TargetMode, totalLines: number, targetIds: string[], playerTargets = new Set<string>()) {
    if (totalLines <= 0 || targetIds.length === 0) return [];

    const attackerIds = new Set(getAttackerIds(sourceId, playerTargets));
    const sendFullToEach = mode === 'attackers' && targetIds.every(id => attackerIds.has(id));
    if (sendFullToEach) {
      return targetIds.map(targetId => ({ targetId, lines: totalLines }));
    }

    const baseLines = Math.floor(totalLines / targetIds.length);
    let remainder = totalLines % targetIds.length;

    return targetIds
      .map(targetId => {
        const lines = baseLines + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        return { targetId, lines };
      })
      .filter(entry => entry.lines > 0);
  }

  const targetManager: TargetManager = {
    resolveTargets: chooseTargets,
    distributeAttack,
  };

  const attackerManager: AttackerManager = {
    countAttackers: (targetId, playerTargets = new Set<string>()) => getAttackerIds(targetId, playerTargets).length,
    getBonus: (targetId, playerTargets = new Set<string>()) => attackerBonus(getAttackerIds(targetId, playerTargets).length),
  };

  function getBadgeStageForSource(sourceId: string) {
    if (sourceId === PLAYER_ID) return badgesRef.current;
    return getBotById(sourceId)?.badges ?? 0;
  }

  function refreshPlayerTargets(forceRandomRetarget = false) {
    if (!playerAliveRef.current) {
      playerTargetIdsRef.current = [];
      return new Set<string>();
    }
    if (manualTargetIdRef.current) {
      const manualTargetBot = getBotById(manualTargetIdRef.current);
      if (manualTargetBot?.alive) {
        playerTargetIdsRef.current = [manualTargetBot.id];
        return new Set(playerTargetIdsRef.current);
      }
      manualTargetIdRef.current = null;
      setManualTargetId(null);
    }
    const currentTargets = forceRandomRetarget ? [] : playerTargetIdsRef.current;
    playerTargetIdsRef.current = resolveStableTargets(PLAYER_ID, targetModeRef.current, currentTargets);
    return new Set(playerTargetIdsRef.current);
  }

  function getPreferredSpectateBotId(preferredId: string | null = null) {
    const aliveBots = botsRef.current.filter(bot => bot.alive);
    if (!aliveBots.length) return preferredId && getBotById(preferredId) ? preferredId : null;
    if (preferredId && aliveBots.some(bot => bot.id === preferredId)) return preferredId;
    if (lastDamagedByRef.current && aliveBots.some(bot => bot.id === lastDamagedByRef.current)) return lastDamagedByRef.current;
    return aliveBots.sort((a, b) => b.badgePoints - a.badgePoints || b.danger - a.danger)[0]?.id ?? aliveBots[0]?.id ?? null;
  }

  function handleBotBoardClick(botId: string) {
    const bot = getBotById(botId);
    if (!bot || settingsOpenRef.current) return;

    if (playerAliveRef.current && stateRef.current !== 'gameOver') {
      if (!bot.alive) return;
      if (manualTargetIdRef.current === bot.id) {
        manualTargetIdRef.current = null;
        setManualTargetId(null);
        refreshPlayerTargets(targetModeRef.current === 'random');
        pushPlayerStateToServer();
        syncSnapshot('Auto targeting resumed');
        return;
      }

      manualTargetIdRef.current = bot.id;
      setManualTargetId(bot.id);
      playerTargetIdsRef.current = [bot.id];
      pushPlayerStateToServer();
      syncSnapshot(`${bot.name} targeted`);
      return;
    }

    if (!snapshot.spectating) return;
    spectatePinnedRef.current = true;
    setSpectateTargetId(bot.id);
    syncSnapshot(`Spectating ${bot.name}`);
  }

  function finalizeAttack(sourceId: string, mode: TargetMode, lines: number, targetIds: string[], incomingQueue: GarbagePacket[], playerTargets = new Set<string>()): FinalizeAttackResult {
    const attackerCount = attackerManager.countAttackers(sourceId, playerTargets);
    const badgeBoostPercent = badgeBoostPercentFromStage(getBadgeStageForSource(sourceId));
    const attackerBonusLines = attackerManager.getBonus(sourceId, playerTargets);
    const offsetResult = offsetGarbageQueue(incomingQueue, lines + attackerBonusLines);
    const marginBonus = getMarginTimeBonus(getBattleElapsedMs());

    if (targetIds.length === 0) {
      return {
        offset: offsetResult.canceled,
        attackerCount,
        attackerBonus: attackerBonusLines,
        badgeBoostPercent,
        marginBonus: 0,
        targetIds,
        distributions: [],
        nextQueue: offsetResult.next,
        totalSent: 0,
      };
    }

    const attackWithCounter = offsetResult.remaining;
    if (attackWithCounter <= 0) {
      return {
        offset: offsetResult.canceled,
        attackerCount,
        attackerBonus: attackerBonusLines,
        badgeBoostPercent,
        marginBonus: 0,
        targetIds,
        distributions: [],
        nextQueue: offsetResult.next,
        totalSent: 0,
      };
    }
    const boostedAttack = Math.max(0, Math.floor(attackWithCounter * (1 + badgeBoostPercent / 100)));
    const marginAdjustedAttack = marginBonus > 0
      ? targetManager
        .distributeAttack(sourceId, mode, boostedAttack, targetIds, playerTargets)
        .map(distribution => ({ ...distribution, lines: distribution.lines + marginBonus }))
      : targetManager.distributeAttack(sourceId, mode, boostedAttack, targetIds, playerTargets);

    return {
      offset: offsetResult.canceled,
      attackerCount,
      attackerBonus: attackerBonusLines,
      badgeBoostPercent,
      marginBonus,
      targetIds,
      distributions: marginAdjustedAttack,
      nextQueue: offsetResult.next,
      totalSent: marginAdjustedAttack.reduce((sum, entry) => sum + entry.lines, 0),
    };
  }

  function sendAttack(lines: number) {
    const targetIds = resolveStableTargets(PLAYER_ID, targetModeRef.current, playerTargetIdsRef.current);
    playerTargetIdsRef.current = targetIds;
    const attack = finalizeAttack(PLAYER_ID, targetModeRef.current, lines, targetIds, incomingRef.current);
    incomingRef.current = attack.nextQueue;
    syncGarbageSparkle(incomingRef.current);

    if (attack.distributions.length > 0) {
      postMatchServerMessage({ type: 'player-attack', matchId: matchIdRef.current, distributions: attack.distributions });
    }
    queueAttackEffects(PLAYER_ID, attack.distributions);

    return {
      offset: attack.offset,
      sent: attack.totalSent,
      attackerBonus: attack.attackerBonus,
      attackerCount: attack.attackerCount,
      badgeBoostPercent: attack.badgeBoostPercent,
      marginBonus: attack.marginBonus,
      targetCount: attack.targetIds.length,
    };
  }

  function lockCurrentPiece() {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const lockedPiece = currentPieceRef.current;
    const tSpin = detectPlayerTSpin(lockedPiece, boardRef.current, lastMoveRotationRef.current, lastRotationKickRef.current);
    boardRef.current = lockT99Piece(lockedPiece, boardRef.current);
    const { newBoard, clearedLines } = clearT99Lines(boardRef.current);
    boardRef.current = newBoard;
    linesRef.current += clearedLines;
    scoreRef.current += [0, 100, 300, 500, 800][clearedLines] ?? 0;
    let status = 'Stack stabilized';
    const clearType = getAttackClearType(clearedLines, tSpin);
    const attackResult = calculatePlacementAttack(clearType, comboRef.current, backToBackRef.current);

    if (clearType === 'tSpinMiniSingle' || clearType === 'tSpinMiniDouble' || clearType === 'tSpinSingle' || clearType === 'tSpinDouble' || clearType === 'tSpinTriple') {
      tSpinsRef.current += 1;
    }

    comboRef.current = attackResult.nextComboChain;
    backToBackRef.current = attackResult.nextB2bActive;
    let attackOffset = 0;
    let attackBonus = 0;
    let badgeBoostPercent = 0;
    let marginBonus = 0;

    if (clearedLines > 0) {
      const attackResolution = sendAttack(attackResult.total);
      attackOffset = attackResolution.offset;
      attackBonus = attackResolution.attackerBonus;
      badgeBoostPercent = attackResolution.badgeBoostPercent;
      marginBonus = attackResolution.marginBonus;
      playSfx(
        tSpin === 'full'
          ? 'tSpin'
          : tSpin === 'mini'
            ? 'tSpinMini'
            : clearedLines === 4
              ? 'tetris'
              : 'clear',
      );
      if (tSpin === 'full') {
        status = `T-Spin ${clearedLines === 1 ? 'Single' : clearedLines === 2 ? 'Double' : clearedLines === 3 ? 'Triple' : 'Clear'}`;
      } else if (tSpin === 'mini') {
        status = clearedLines === 1 ? 'Mini T-Spin Single' : clearedLines === 2 ? 'Mini T-Spin Double' : 'Mini T-Spin';
      } else {
        status = clearedLines === 4 ? 'Tetris' : `${clearedLines} line clear`;
      }
    } else {
      playSfx('lock');
      if (tSpin === 'full') status = 'T-Spin';
      else if (tSpin === 'mini') status = 'T-Spin Mini';
    }

    if (attackResult.b2bBonus > 0) {
      status = `${status} | B2B`;
    }
    if (attackResult.comboBonus > 0) {
      status = `${status} | REN +${attackResult.comboBonus}`;
    }
    if (attackBonus > 0) {
      status = `${status} | Attackers +${attackBonus}`;
    }
    if (marginBonus > 0) {
      status = `${status} | Margin +${marginBonus}`;
    }
    if (badgeBoostPercent > 0) {
      status = `${status} | Badges +${badgeBoostPercent}%`;
    }
    if (attackOffset > 0) {
      status = `${status} | Offset ${attackOffset}`;
    }

    currentPieceRef.current = null;
    lastMoveRotationRef.current = false;
    lastRotationKickRef.current = null;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    isOnGroundRef.current = false;

    const garbageResult = clearedLines === 0 ? applyPendingGarbage() : { applied: 0, toppedOut: false };
    if (garbageResult.applied > 0) {
      status = status === 'Stack stabilized' ? `Garbage +${garbageResult.applied}` : `${status} | Garbage +${garbageResult.applied}`;
    }

    if (garbageResult.toppedOut) {
      eliminatePlayer();
      return;
    }

    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
    const panelTitle = clearTypePanelTitle(clearType);
    if (panelTitle) {
      showActionPanel(panelTitle, attackResult.b2bBonus > 0 ? 'BACK-TO-BACK' : null);
    }
    if (stateRef.current === 'playing' && !spawnPiece()) return;
    syncSnapshot(status);
  }

  function clearLockTimer() {
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    isOnGroundRef.current = false;
  }

  function startLockTimer() {
    if (lockTimerRef.current !== null) return;
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      lockCurrentPiece();
    }, LOCK_DELAY);
  }

  function resetLockTimer() {
    if (lockMovesRef.current >= MAX_LOCK_MOVES) return;
    lockMovesRef.current += 1;
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    if (currentPieceRef.current && !isT99ValidPosition({ ...currentPieceRef.current, y: currentPieceRef.current.y + 1 }, boardRef.current)) {
      isOnGroundRef.current = true;
      startLockTimer();
    }
  }

  function moveHorizontal(dx: number) {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return false;
    const next = { ...currentPieceRef.current, x: currentPieceRef.current.x + dx };
    if (!isT99ValidPosition(next, boardRef.current)) return false;
    currentPieceRef.current = next;
    lastMoveRotationRef.current = false;
    lastRotationKickRef.current = null;
    playSfx('move');
    const grounded = !isT99ValidPosition({ ...next, y: next.y + 1 }, boardRef.current);
    if (grounded) {
      isOnGroundRef.current = true;
      resetLockTimer();
    } else {
      clearLockTimer();
    }
    syncSnapshot();
    return true;
  }

  function moveDown() {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return false;
    const next = { ...currentPieceRef.current, y: currentPieceRef.current.y + 1 };
    if (isT99ValidPosition(next, boardRef.current)) {
      currentPieceRef.current = next;
      lastMoveRotationRef.current = false;
      lastRotationKickRef.current = null;
      const grounded = !isT99ValidPosition({ ...next, y: next.y + 1 }, boardRef.current);
      if (grounded && !isOnGroundRef.current) {
        isOnGroundRef.current = true;
        startLockTimer();
      } else if (!grounded) {
        clearLockTimer();
      }
      syncSnapshot();
      return true;
    }
    if (!isOnGroundRef.current) {
      isOnGroundRef.current = true;
      startLockTimer();
    }
    return false;
  }

  function rotatePiece(direction: 1 | -1) {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const rotated = tryT99Rotation(currentPieceRef.current, direction, boardRef.current);
    if (!rotated) return;
    currentPieceRef.current = rotated.piece;
    lastMoveRotationRef.current = true;
    lastRotationKickRef.current = rotated.kick;
    const grounded = !isT99ValidPosition({ ...rotated.piece, y: rotated.piece.y + 1 }, boardRef.current);
    if (grounded) {
      isOnGroundRef.current = true;
      resetLockTimer();
    } else {
      clearLockTimer();
    }
    playSfx('rotate');
    syncSnapshot();
  }

  function hardDrop() {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const startY = currentPieceRef.current.y;
    const ghostY = getT99GhostY(currentPieceRef.current, boardRef.current);
    currentPieceRef.current = { ...currentPieceRef.current, y: ghostY };
    scoreRef.current += Math.max(0, ghostY - startY) * 2;
    playSfx('drop');
    lockCurrentPiece();
  }

  function holdPiece() {
    if (!currentPieceRef.current || !canHoldRef.current || stateRef.current !== 'playing') return;
    const current = currentPieceRef.current.type as PieceType;
    const held = holdRef.current;
    holdRef.current = current;
    canHoldRef.current = false;
    if (held) {
      const nextPiece = createT99SpawnPiece(held);
      if (!isT99ValidPosition(nextPiece, boardRef.current)) {
        eliminatePlayer();
        return;
      }
      currentPieceRef.current = nextPiece;
    } else {
      currentPieceRef.current = null;
    }
    lockMovesRef.current = 0;
    clearLockTimer();
    if (!held) spawnPiece();
    playSfx('hold');
    lastMoveRotationRef.current = false;
    lastRotationKickRef.current = null;
    syncSnapshot('Hold');
  }

  useEffect(() => {
    showAllAttackTrailsRef.current = showAllAttackTrails;
  }, [showAllAttackTrails]);

  useEffect(() => {
    spectateTargetIdRef.current = spectateTargetId;
  }, [spectateTargetId]);

  useEffect(() => {
    if (!snapshot.spectating) return;
    if (!spectateTargetId) {
      const fallbackId = getPreferredSpectateBotId();
      if (fallbackId) setSpectateTargetId(fallbackId);
      return;
    }
    if (spectatePinnedRef.current) return;
    const focusedBot = getBotById(spectateTargetId);
    if (focusedBot?.alive) return;
    const fallbackId = getPreferredSpectateBotId(spectateTargetId);
    if (fallbackId !== spectateTargetId) setSpectateTargetId(fallbackId);
  }, [botRenderVersion, snapshot.spectating, spectateTargetId]);

  useEffect(() => {
    const worker = new Worker(new URL('./tetris99BattleServer.worker.ts', import.meta.url));
    matchServerRef.current = worker;

    const handleMatchServerEvent = (event: MessageEvent<MatchServerEvent>) => {
      const message = event.data;
      if (!message || message.matchId !== matchIdRef.current) return;

      if (message.type === 'snapshot') {
        botsRef.current = message.bots.map(bot => ({
          ...bot,
          board: bot.board.map(row => [...row]),
          queue: [...bot.queue],
          targetIds: [...bot.targetIds],
          pendingGarbage: bot.pendingGarbage.map(packet => ({ ...packet })),
        }));
        refreshPlayerTargets();
        setBotRenderVersion(prev => prev + 1);
        syncSnapshot();
        return;
      }

      if (message.type === 'attack') {
        for (const distribution of message.distributions) {
          if (distribution.targetId === PLAYER_ID && playerAliveRef.current) {
            queuePacket(distribution.lines, message.sourceId, { pendingGarbage: incomingRef.current });
          }
        }
        queueAttackEffects(message.sourceId, message.distributions);
        syncGarbageSparkle(incomingRef.current);
        syncSnapshot();
        return;
      }

      if (message.type === 'player-ko') {
        kosRef.current += 1;
        badgePointsRef.current += message.badgeGain;
        badgesRef.current = badgeStageFromPoints(badgePointsRef.current);
        playSfx('ko');
        syncSnapshot('KO!');
        return;
      }

      if (message.type === 'bot-eliminated') {
        if (
          message.killerId
          && message.killerId !== PLAYER_ID
          && (!spectateTargetIdRef.current || spectateTargetIdRef.current !== message.killerId || playerAliveRef.current)
        ) {
          playSfx('koOther');
        }
        return;
      }

      if (message.type === 'bot-sfx') {
        if (!playerAliveRef.current && stateRef.current !== 'gameOver' && spectateTargetIdRef.current === message.sourceId) {
          playSfx(message.kind === 'drop'
            ? 'drop'
            : message.kind === 'lock'
              ? 'lock'
            : message.kind === 'clear'
              ? 'clear'
              : message.kind === 'tetris'
                ? 'tetris'
                : message.kind === 'tSpin'
                  ? 'tSpin'
                  : message.kind === 'tSpinMini'
                    ? 'tSpinMini'
                : message.kind === 'garbage'
                  ? 'garbage'
                  : message.kind === 'ko'
                    ? 'ko'
                    : 'lose');
        }
        return;
      }

      if (message.type === 'match-finished') {
        finishMatch(message.winnerId === PLAYER_ID, message.winnerName);
      }
    };

    worker.addEventListener('message', handleMatchServerEvent);
    setFullscreen(true);
    resetGame();
    return () => {
      worker.removeEventListener('message', handleMatchServerEvent);
      worker.terminate();
      matchServerRef.current = null;
      if (snapshotFrameRef.current !== null) {
        window.cancelAnimationFrame(snapshotFrameRef.current);
        snapshotFrameRef.current = null;
      }
      clearAttackEffects();
      clearSpeedNotice();
      clearTargetModeNotice();
      clearActionPanel();
      setFullscreen(false);
    };
  }, [setFullscreen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (settingsOpenRef.current) return;
      if (stateRef.current !== 'countdown') return;
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = 0;
        stateRef.current = 'playing';
        battleStartedAtRef.current = Date.now();
        battleEndedAtRef.current = null;
        matchEndedAtRef.current = null;
        pauseStartedAtRef.current = null;
        pausedDurationMsRef.current = 0;
        postMatchServerMessage({ type: 'start', matchId: matchIdRef.current });
        pushPlayerStateToServer();
        playSfx('start');
        syncSnapshot('Fight!');
        return;
      }
      playSfx('countdown');
      syncSnapshot(`Starting in ${countdownRef.current}`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onEscapeKey(event: KeyboardEvent) {
      if (event.code !== 'Escape') return;
      event.preventDefault();
      toggleSettingsMenu();
    }

    window.addEventListener('keydown', onEscapeKey);
    return () => {
      window.removeEventListener('keydown', onEscapeKey);
    };
  }, []);

  useEffect(() => {
    const startSoftDrop = () => {
      clearSoftDrop();
      const intervalMs = framesToMs(getSpeedProfile(speedStageRef.current).softDropFrames);
      softDropTimerRef.current = window.setInterval(() => moveDown(), intervalMs);
    };

    const startDAS = (dir: 'left' | 'right', dx: number) => {
      clearDAS();
      lastDirRef.current = dir;
      moveHorizontal(dx);
      dasTimerRef.current = window.setTimeout(() => {
        dasTimerRef.current = null;
        arrTimerRef.current = window.setInterval(() => moveHorizontal(dx), ARR);
      }, DAS);
    };

    function onKeyDown(event: KeyboardEvent) {
      if (settingsOpenRef.current) return;
      if (!playerAliveRef.current) return;
      if (stateRef.current !== 'playing') return;
      if (event.ctrlKey) {
        const nextMode = getTargetModeFromArrow(event.code);
        if (nextMode) {
          event.preventDefault();
          setTargetMode(nextMode);
        }
        return;
      }
      if (keysRef.current.has(event.code)) return;
      keysRef.current.add(event.code);

      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        startDAS('left', -1);
      }
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        startDAS('right', 1);
      }
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        moveDown();
        startSoftDrop();
      }
      else if (event.code === 'ArrowUp' || event.code === 'KeyX') {
        event.preventDefault();
        rotatePiece(1);
      }
      else if (event.code === 'KeyZ') {
        event.preventDefault();
        rotatePiece(-1);
      }
      else if (event.code === 'KeyC' || event.code === 'ShiftLeft') {
        event.preventDefault();
        holdPiece();
      }
      else if (event.code === 'Space') {
        event.preventDefault();
        hardDrop();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.code);
      if (settingsOpenRef.current) return;

      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        if (lastDirRef.current === 'left') clearDAS();
      }
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        if (lastDirRef.current === 'right') clearDAS();
      }
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        clearSoftDrop();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      clearDAS();
      clearSoftDrop();
      keysRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const speedProfile = getSpeedProfile(snapshot.speedStage);
    const gravity = window.setInterval(() => {
      if (settingsOpenRef.current) return;
      if (stateRef.current !== 'playing' || !currentPieceRef.current) return;
      moveDown();
    }, framesToMs(speedProfile.gravityFrames));
    return () => window.clearInterval(gravity);
  }, [snapshot.speedStage]);

  useEffect(() => {
    if (settingsOpenRef.current) return;
    if (stateRef.current !== 'playing') return;
    if (!keysRef.current.has('ArrowDown') && !keysRef.current.has('KeyS')) return;
    clearSoftDrop();
    const intervalMs = framesToMs(getSpeedProfile(snapshot.speedStage).softDropFrames);
    softDropTimerRef.current = window.setInterval(() => moveDown(), intervalMs);
    return () => clearSoftDrop();
  }, [snapshot.speedStage]);

  useEffect(() => {
    if (snapshot.state !== 'playing') return;

      const garbageLoop = window.setInterval(() => {
        if (settingsOpenRef.current) return;
        if (stateRef.current !== 'playing') return;
        if (!playerAliveRef.current) return;
        const hadIncoming = incomingRef.current.length > 0;
        const alivePlayers = getAlivePlayerCount();
        incomingRef.current = tickGarbageQueue(incomingRef.current, GARBAGE_QUEUE_TICK_MS, alivePlayers);
      syncGarbageSparkle(incomingRef.current);
      if (hadIncoming || incomingRef.current.length > 0) syncSnapshot();
    }, GARBAGE_QUEUE_TICK_MS);

    return () => window.clearInterval(garbageLoop);
  }, [snapshot.state]);

  useEffect(() => {
    if (snapshot.state !== 'playing') return;

    updateSpeedStage(false);
    syncSnapshot();

    const speedLoop = window.setInterval(() => {
      if (settingsOpenRef.current) return;
      if (stateRef.current !== 'playing') return;
      const changed = updateSpeedStage(true);
      if (changed) syncSnapshot();
    }, 250);

    return () => window.clearInterval(speedLoop);
  }, [snapshot.state]);

  const targetedBots = useMemo(() => {
    return new Set(playerTargetIdsRef.current);
  }, [botRenderVersion, snapshot.targetMode, snapshot.place, snapshot.attackers, manualTargetId, snapshot.playerOut, snapshot.gameOver]);

  const spectateBot = useMemo(() => {
    if (!snapshot.spectating || !spectateTargetId) return null;
    return getBotById(spectateTargetId);
  }, [botRenderVersion, snapshot.spectating, spectateTargetId]);

  const centerBoard = spectateBot?.board ?? snapshot.board;
  const centerCurrentPiece = spectateBot ? null : snapshot.currentPiece;
  const centerHold = spectateBot?.hold ?? snapshot.hold;
  const centerQueue = spectateBot?.queue.slice(0, PREVIEW_SLOT_COUNT) ?? snapshot.queue;
  const centerBadgeStage = spectateBot?.badges ?? snapshot.badges;
  const centerKos = spectateBot?.kos ?? snapshot.kos;
  const centerBadgeBoostPercent = spectateBot ? badgeBoostPercentFromStage(spectateBot.badges) : snapshot.badgeBoostPercent;
  const centerDanger = spectateBot?.danger ?? boardDanger(snapshot.board);
  const renderAlivePlayers = useMemo(() => (
    botsRef.current.filter(bot => bot.alive).length + (snapshot.playerOut || snapshot.gameOver ? 0 : 1)
  ), [botRenderVersion, snapshot.playerOut, snapshot.gameOver]);

  const leftBotBoards = useMemo(() => (
    botsRef.current.slice(0, 49).map(bot => (
      <MicroBoard
        key={bot.id}
        bot={bot}
        targeted={targetedBots.has(bot.id)}
        focused={snapshot.spectating && spectateTargetId === bot.id}
        clickable
        onSelect={handleBotBoardClick}
        boardRef={node => registerBotBoardRef(bot.id, node)}
      />
    ))
  ), [botRenderVersion, targetedBots, spectateTargetId, snapshot.spectating]);

  const rightBotBoards = useMemo(() => (
    botsRef.current.slice(49).map(bot => (
      <MicroBoard
        key={bot.id}
        bot={bot}
        targeted={targetedBots.has(bot.id)}
        focused={snapshot.spectating && spectateTargetId === bot.id}
        clickable
        onSelect={handleBotBoardClick}
        boardRef={node => registerBotBoardRef(bot.id, node)}
      />
    ))
  ), [botRenderVersion, targetedBots, spectateTargetId, snapshot.spectating]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div ref={arenaRef} className={styles.arena}>
          <div className={styles.attackOverlay} aria-hidden="true">
            {attackEffects.map(effect => (
              <div
                key={effect.id}
                className={[
                  styles.attackTrail,
                  effect.variant === 'player' ? styles.attackTrailPlayer : '',
                  effect.variant === 'incoming' ? styles.attackTrailIncoming : '',
                  effect.variant === 'bot' ? styles.attackTrailBot : '',
                ].filter(Boolean).join(' ')}
                style={{
                  left: `${effect.x}px`,
                  top: `${effect.y}px`,
                  width: `${effect.length}px`,
                  transform: `translateY(-50%) rotate(${effect.angle}deg)`,
                }}
              >
                <span className={styles.attackTrailDot} />
                <span className={styles.attackTrailBeam} />
                <span className={styles.attackTrailArrow} />
                <span className={styles.attackTrailLabel}>{`+${effect.lines}`}</span>
              </div>
            ))}
          </div>
          <div className={styles.sidePanel}>{leftBotBoards}</div>
          <div className={styles.boardStack}>
            <div className={styles.heroCard}>
              <div className={styles.heroLayout}>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Hold</span><div className={styles.previewBox}><PreviewShape type={centerHold} /></div></div>
                </div>
                <div ref={playerBoardFrameRef} className={`${styles.boardFrame} ${centerDanger >= 18 ? styles.boardFrameDanger : ''}`}>
                  <div className={styles.boardPlayfield}>
                    {targetModeNotice && !snapshot.gameOver && !snapshot.playerOut && (
                      <div className={styles.targetModeNoticeOverlay} aria-hidden="true">
                        <div className={styles.targetModeNoticeText}>{targetModeNotice}</div>
                      </div>
                    )}
                    {actionPanel && !snapshot.gameOver && (
                      <div className={styles.actionPanelOverlay} aria-hidden="true">
                        {actionPanel.eyebrow && <div className={styles.actionPanelEyebrow}>{actionPanel.eyebrow}</div>}
                        <div className={styles.actionPanelTitle}>{actionPanel.title}</div>
                      </div>
                    )}
                    {snapshot.state === 'countdown' && !snapshot.gameOver && (
                      <div className={styles.countdownOverlay} aria-hidden="true">
                        <div className={styles.countdownEyebrow}>Ready</div>
                        <div className={styles.countdownValue}>{snapshot.countdown}</div>
                      </div>
                    )}
                    <div className={styles.boardPlayfieldInner}>
                      <div className={styles.garbagePanel}>
                        <span className={styles.garbagePanelLabel}>Incoming</span>
                        <IncomingGarbageRail packets={spectateBot?.pendingGarbage ?? snapshot.incomingPackets} alivePlayers={renderAlivePlayers} />
                      </div>
                      <PlayerBoard board={centerBoard} currentPiece={centerCurrentPiece} />
                    </div>
                    {speedNotice && !snapshot.gameOver && (
                      <div className={styles.speedNoticeOverlay} aria-hidden="true">
                        <div className={styles.speedNoticeEyebrow}>Speed Up</div>
                        <div className={styles.speedNoticeValue}>{speedNotice.replace('Speed Up! ', '')}</div>
                      </div>
                    )}
                    {settingsOpen && (
                      <div className={styles.settingsBoardOverlay} role="dialog" aria-modal="true" aria-label="Tetris 99 settings">
                        <div className={styles.settingsBoardPanel}>
                          <div className={styles.settingsEyebrow}>TETRIS 99</div>
                          <h2 className={styles.settingsTitle}>Settings</h2>
                          <div className={styles.settingsBody}>
                            <div className={styles.settingsOption}>
                              <div>
                                <div className={styles.settingsLabel}>Attack Trail Visibility</div>
                                <div className={styles.settingsHint}>
                                  Off by default. When disabled, only attacks involving you are visible.
                                </div>
                              </div>
                              <button
                                type="button"
                                className={`${styles.settingsToggle} ${showAllAttackTrails ? styles.settingsToggleOn : ''}`}
                                onClick={toggleAttackTrailPreference}
                                aria-pressed={showAllAttackTrails}
                                aria-label="Toggle full attack trail visibility"
                              >
                                <span className={styles.settingsToggleKnob} />
                              </button>
                            </div>
                          </div>
                          <div className={styles.settingsHintLine}>Press ESC to close</div>
                        </div>
                      </div>
                    )}
                    {snapshot.spectating && (
                      <div className={styles.spectatingBanner}>
                        <div className={styles.spectatingCopy}>
                          <div className={styles.spectatingTitle}>Eliminated</div>
                          <div className={styles.spectatingBody}>
                            {spectateBot
                              ? `Watching ${spectateBot.name}. Click another bot board to switch focus.`
                              : `You finished #${snapshot.place}. Click a bot board to start spectating.`}
                          </div>
                        </div>
                        <div className={styles.actionRow}>
                          <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Rematch</button>
                          <button className={styles.ghostButton} onClick={() => router.push('/games')}>Leave Match</button>
                        </div>
                      </div>
                    )}
                    {snapshot.gameOver && (
                      <div className={styles.boardGameOver}>
                        <h2 className={styles.boardGameOverTitle}>
                          {snapshot.victory
                            ? 'Victory Royale'
                            : 'Match Complete'}
                        </h2>
                        <p className={styles.boardGameOverBody}>
                          {snapshot.victory
                            ? `You closed the lobby with ${snapshot.kos} KOs and ${snapshot.badgePoints} badges.`
                            : `${snapshot.winnerName ?? 'Another player'} won the match. You finished #${snapshot.place} with ${snapshot.kos} KOs and ${snapshot.badgePoints} badges.`}
                        </p>
                        <div className={styles.actionRow}>
                          <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Rematch</button>
                          <button className={styles.ghostButton} onClick={() => router.push('/games')}>Leave Match</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Next</span><div className={styles.previewBox}>{Array.from({ length: PREVIEW_SLOT_COUNT }, (_, index) => <PreviewShape key={`next-${index}`} type={centerQueue[index] ?? null} />)}</div></div>
                  <div className={`${styles.miniPanel} ${styles.battleInfoPanel}`}>
                    <div className={styles.battleInfoMetric}>
                      <span className={styles.panelHeader}>K.O.</span>
                      <strong className={styles.battleInfoValue}>{String(centerKos).padStart(2, '0')}</strong>
                    </div>
                    <div className={styles.battleInfoMetric}>
                      <span className={styles.panelHeader}>Players</span>
                      <strong className={styles.battleInfoValue}>{String(renderAlivePlayers).padStart(2, '0')}</strong>
                    </div>
                    <div className={styles.battleInfoMetric}>
                      <span className={styles.panelHeader}>Badges</span>
                      <BadgeMeter stage={centerBadgeStage} />
                      <div className={styles.battleInfoBoost}>{`+${centerBadgeBoostPercent}%`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.sidePanel}>{rightBotBoards}</div>
        </div>
      </div>
    </div>
  );
}
