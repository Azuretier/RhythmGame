'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MobBattle.module.css';
import type { Player, ServerMessage, BoardCell } from '@/types/multiplayer';
import type { ActiveMob, MobBattleRelayPayload } from '@/lib/mob-battle/types';
import {
  MOB_DEFINITIONS,
  MOB_MAP,
  INITIAL_GOLD,
  MAX_BASE_HP,
  PASSIVE_INCOME_AMOUNT,
  PASSIVE_INCOME_INTERVAL,
  GOLD_PER_LINE,
  LINE_CLEAR_DAMAGE,
  BEAT_DAMAGE_MULTIPLIER,
  COMBO_DAMAGE_BONUS,
  BOARD_RELAY_INTERVAL,
} from '@/lib/mob-battle/constants';

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
const DAS = 167;
const ARR = 33;
const SOFT_DROP_SPEED = 50;

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
    [[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]], [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]], [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

const ROTATION_NAMES = ['0', 'R', '2', 'L'] as const;

const WALL_KICK_JLSTZ: Record<string, [number, number][]> = {
  '0->R': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  'R->2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2->L': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  'L->0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  'R->0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2->R': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  'L->2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0->L': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

const WALL_KICK_I: Record<string, [number, number][]> = {
  '0->R': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  'R->2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2->L': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  'L->0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  'R->0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '2->R': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  'L->2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '0->L': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// ===== Seeded RNG =====
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function create7Bag(rng: () => number) {
  let bag: PieceType[] = [];
  return (): PieceType => {
    if (bag.length === 0) {
      bag = [...PIECE_TYPES];
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

// ===== Component =====
export const MobBattle: React.FC<Props> = ({
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

  // ===== Game State Refs =====
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

  // ===== Mob Battle State Refs =====
  const goldRef = useRef(INITIAL_GOLD);
  const baseHpRef = useRef(MAX_BASE_HP);
  const incomingMobsRef = useRef<ActiveMob[]>([]);
  const mobIdCounterRef = useRef(0);
  const mobsKilledRef = useRef(0);
  const totalGoldEarnedRef = useRef(INITIAL_GOLD);

  // ===== Opponent State Refs =====
  const opponentBoardRef = useRef<(BoardCell | null)[][]>(createEmptyBoard());
  const opponentScoreRef = useRef(0);
  const opponentLinesRef = useRef(0);
  const opponentBaseHpRef = useRef(MAX_BASE_HP);
  const opponentGoldRef = useRef(INITIAL_GOLD);

  // ===== Render State =====
  const [, forceRender] = useState(0);
  const render = useCallback(() => forceRender(c => c + 1), []);

  // ===== RNG =====
  const rngRef = useRef(createRNG(gameSeed));
  const bagRef = useRef(create7Bag(rngRef.current));

  // ===== Rhythm =====
  const lastBeatRef = useRef(Date.now());
  const beatPhaseRef = useRef(0);

  // ===== Audio =====
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ===== Timers =====
  const dropTimerRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);
  const beatAnimRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const incomeTimerRef = useRef<number | null>(null);
  const mobUpdateTimerRef = useRef<number | null>(null);

  // ===== Input =====
  const keysRef = useRef<Set<string>>(new Set());
  const dasTimerRef = useRef<number | null>(null);
  const arrTimerRef = useRef<number | null>(null);
  const softDropTimerRef = useRef<number | null>(null);
  const lastDirRef = useRef<string>('');

  // ===== Shop State =====
  const [shopOpen, setShopOpen] = useState(false);

  // ===== Audio Functions =====
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    } catch {}
  }, []);

  const playDrum = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
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
    } catch {}
  }, []);

  const playLineClear = useCallback((count: number) => {
    const freqs = [523, 659, 784, 1047];
    freqs.slice(0, count).forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle'), i * 60));
  }, [playTone]);

  const playMobKill = useCallback(() => {
    playTone(880, 0.1, 'square');
    setTimeout(() => playTone(1175, 0.08, 'square'), 50);
  }, [playTone]);

  const playBaseDamage = useCallback(() => {
    playTone(110, 0.2, 'sawtooth');
  }, [playTone]);

  const playSummon = useCallback(() => {
    playTone(330, 0.08, 'triangle');
    setTimeout(() => playTone(440, 0.08, 'triangle'), 80);
    setTimeout(() => playTone(550, 0.1, 'triangle'), 160);
  }, [playTone]);

  // ===== Relay =====
  const sendRelay = useCallback((payload: MobBattleRelayPayload) => {
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
      baseHp: baseHpRef.current,
      gold: goldRef.current,
    });
  }, [sendRelay]);

  const sendMobSpawn = useCallback((mobType: string, mobId: number) => {
    sendRelay({ event: 'mob_spawn', mobType, mobId });
  }, [sendRelay]);

  const sendGameOver = useCallback(() => {
    sendRelay({ event: 'game_over' });
  }, [sendRelay]);

  // ===== Mob Management =====
  const spawnIncomingMob = useCallback((defId: string, mobId: number) => {
    const def = MOB_MAP[defId];
    if (!def) return;
    const mob: ActiveMob = {
      id: mobId,
      definitionId: defId,
      hp: def.hp,
      maxHp: def.hp,
      position: 0,
      speed: def.speed,
      damage: def.damage,
      bounty: def.bounty,
      alive: true,
      spawnTime: Date.now(),
      hitFlash: 0,
    };
    incomingMobsRef.current = [...incomingMobsRef.current, mob];
    render();
  }, [render]);

  const summonMob = useCallback((defId: string) => {
    const def = MOB_MAP[defId];
    if (!def || goldRef.current < def.cost || gameOverRef.current) return;

    goldRef.current -= def.cost;
    const mobId = ++mobIdCounterRef.current;
    sendMobSpawn(defId, mobId);
    playSummon();
    render();
  }, [sendMobSpawn, playSummon, render]);

  const damageMobs = useCallback((linesCleared: number, onBeat: boolean, combo: number) => {
    const dmgConfig = LINE_CLEAR_DAMAGE[linesCleared];
    if (!dmgConfig) return;

    let damage = dmgConfig.baseDamage;
    if (onBeat) damage *= BEAT_DAMAGE_MULTIPLIER;
    damage += combo * COMBO_DAMAGE_BONUS;
    damage = Math.floor(damage);

    const mobs = incomingMobsRef.current.filter(m => m.alive);
    if (mobs.length === 0) return;

    // Sort by position (closest to base first)
    const sorted = [...mobs].sort((a, b) => b.position - a.position);

    let targets: ActiveMob[];
    switch (dmgConfig.target) {
      case 'closest':
        targets = sorted.slice(0, 1);
        break;
      case 'front_half':
        targets = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
        break;
      case 'all':
        targets = sorted;
        break;
    }

    let goldEarned = 0;
    for (const mob of targets) {
      mob.hp -= damage;
      mob.hitFlash = Date.now();
      if (mob.hp <= 0) {
        mob.alive = false;
        goldEarned += mob.bounty;
        mobsKilledRef.current++;
        playMobKill();
      }
    }

    if (goldEarned > 0) {
      goldRef.current += goldEarned;
      totalGoldEarnedRef.current += goldEarned;
    }

    // Remove dead mobs
    incomingMobsRef.current = incomingMobsRef.current.filter(m => m.alive);
    render();
  }, [playMobKill, render]);

  // ===== Mob Update Loop =====
  const updateMobs = useCallback(() => {
    if (gameOverRef.current) return;

    const mobs = incomingMobsRef.current;
    let baseDamageTotal = 0;

    for (const mob of mobs) {
      if (!mob.alive) continue;
      mob.position += mob.speed / 60; // 60fps tick

      if (mob.position >= 1.0) {
        mob.alive = false;
        baseDamageTotal += mob.damage;
      }
    }

    if (baseDamageTotal > 0) {
      baseHpRef.current = Math.max(0, baseHpRef.current - baseDamageTotal);
      playBaseDamage();

      if (baseHpRef.current <= 0) {
        gameOverRef.current = true;
        sendGameOver();
        onGameEnd(opponent?.id || '');
      }
    }

    // Remove dead mobs
    incomingMobsRef.current = mobs.filter(m => m.alive);
    render();
  }, [playBaseDamage, sendGameOver, onGameEnd, opponent, render]);

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
      onGameEnd(opponent?.id || '');
      render();
      return false;
    }

    pieceRef.current = piece;
    holdUsedRef.current = false;
    lockMovesRef.current = 0;
    isOnGroundRef.current = false;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    render();
    return true;
  }, [fillQueue, sendGameOver, onGameEnd, opponent, render]);

  // ===== Lock Delay =====
  const startLockTimer = useCallback(() => {
    if (lockTimerRef.current) return;
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      performLockRef.current();
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
      onGameEnd(opponent?.id || '');
      render();
      return;
    }

    // Beat judgment
    const phase = beatPhaseRef.current;
    const onBeat = phase > 0.8 || phase < 0.12;
    let mult = 1;

    if (onBeat) {
      mult = 2;
      comboRef.current++;
      playTone(1047, 0.15, 'triangle');
    } else {
      comboRef.current = 0;
    }

    // Lock to board
    const newBoard = lockPiece(piece, boardRef.current);

    // Clear lines
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    boardRef.current = clearedBoard;

    if (cleared > 0) {
      const base = [0, 100, 300, 500, 800][cleared];
      const pts = base * mult * Math.max(1, comboRef.current);
      scoreRef.current += pts;
      linesRef.current += cleared;

      // Earn gold from line clears
      const lineGold = GOLD_PER_LINE * cleared * mult;
      goldRef.current += lineGold;
      totalGoldEarnedRef.current += lineGold;

      // Damage incoming mobs
      damageMobs(cleared, onBeat, comboRef.current);

      playLineClear(cleared);
    }

    pieceRef.current = null;
    sendBoardUpdate();
    spawnPiece();
  }, [sendGameOver, onGameEnd, opponent, damageMobs, sendBoardUpdate, playLineClear, playTone, spawnPiece, render]);

  const performLockRef = useRef(performLock);
  performLockRef.current = performLock;

  // ===== Movement =====
  const moveHorizontal = useCallback((dx: number) => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return false;

    const moved = { ...piece, x: piece.x + dx };
    if (isValid(moved, boardRef.current)) {
      pieceRef.current = moved;
      playTone(392, 0.04, 'square');

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

    const rotated = tryRotate(piece, direction, boardRef.current);
    if (rotated) {
      pieceRef.current = rotated;
      playTone(523, 0.06);

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
  }, [playTone, resetLockTimer, render]);

  const hardDrop = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return;

    const gy = getGhostY(piece, boardRef.current);
    const dropDist = gy - piece.y;
    pieceRef.current = { ...piece, y: gy };
    scoreRef.current += dropDist * 2;
    playTone(196, 0.08, 'sawtooth');
    performLockRef.current();
  }, [playTone]);

  const holdPieceFn = useCallback(() => {
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
          const payload = msg.payload as unknown as MobBattleRelayPayload;
          if (payload.event === 'board_update' && 'board' in payload) {
            const bp = payload as import('@/lib/mob-battle/types').MobBattleBoardPayload;
            opponentBoardRef.current = bp.board;
            opponentScoreRef.current = bp.score;
            opponentLinesRef.current = bp.lines;
            opponentBaseHpRef.current = bp.baseHp;
            opponentGoldRef.current = bp.gold;
            render();
          } else if (payload.event === 'mob_spawn') {
            const sp = payload as import('@/lib/mob-battle/types').MobSpawnRelayPayload;
            spawnIncomingMob(sp.mobType, sp.mobId);
          } else if (payload.event === 'game_over') {
            if (!gameOverRef.current) {
              gameOverRef.current = true;
              onGameEnd(playerId);
              render();
            }
          }
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {}
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, playerId, onGameEnd, spawnIncomingMob, render]);

  // ===== Initialize Game =====
  useEffect(() => {
    initAudio();

    // Reset all state
    boardRef.current = createEmptyBoard();
    pieceRef.current = null;
    holdRef.current = null;
    holdUsedRef.current = false;
    nextQueueRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    linesRef.current = 0;
    gameOverRef.current = false;
    goldRef.current = INITIAL_GOLD;
    baseHpRef.current = MAX_BASE_HP;
    incomingMobsRef.current = [];
    mobIdCounterRef.current = 0;
    mobsKilledRef.current = 0;
    totalGoldEarnedRef.current = INITIAL_GOLD;
    opponentBoardRef.current = createEmptyBoard();
    opponentScoreRef.current = 0;
    opponentLinesRef.current = 0;
    opponentBaseHpRef.current = MAX_BASE_HP;
    opponentGoldRef.current = INITIAL_GOLD;

    rngRef.current = createRNG(gameSeed);
    bagRef.current = create7Bag(rngRef.current);
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
      if (!gameOverRef.current) moveDown();
    }, speed);

    return () => { if (dropTimerRef.current) clearInterval(dropTimerRef.current); };
  }, [moveDown]);

  // ===== Beat Timer =====
  useEffect(() => {
    if (gameOverRef.current) return;
    const interval = 60000 / BPM;
    lastBeatRef.current = Date.now();

    beatTimerRef.current = window.setInterval(() => {
      lastBeatRef.current = Date.now();
      playDrum();
    }, interval);

    return () => { if (beatTimerRef.current) clearInterval(beatTimerRef.current); };
  }, [playDrum]);

  // ===== Beat Phase Animation =====
  useEffect(() => {
    if (gameOverRef.current) return;
    const update = () => {
      if (!gameOverRef.current) {
        const interval = 60000 / BPM;
        const elapsed = Date.now() - lastBeatRef.current;
        beatPhaseRef.current = (elapsed % interval) / interval;
        beatAnimRef.current = requestAnimationFrame(update);
      }
    };
    beatAnimRef.current = requestAnimationFrame(update);
    return () => { if (beatAnimRef.current) cancelAnimationFrame(beatAnimRef.current); };
  }, []);

  // ===== Periodic Board Sync =====
  useEffect(() => {
    if (gameOverRef.current) return;
    syncTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) sendBoardUpdate();
    }, BOARD_RELAY_INTERVAL);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [sendBoardUpdate]);

  // ===== Passive Income Timer =====
  useEffect(() => {
    if (gameOverRef.current) return;
    incomeTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        goldRef.current += PASSIVE_INCOME_AMOUNT;
        totalGoldEarnedRef.current += PASSIVE_INCOME_AMOUNT;
        render();
      }
    }, PASSIVE_INCOME_INTERVAL);
    return () => { if (incomeTimerRef.current) clearInterval(incomeTimerRef.current); };
  }, [render]);

  // ===== Mob Update Timer (60fps) =====
  useEffect(() => {
    if (gameOverRef.current) return;
    const tick = () => {
      updateMobs();
      mobUpdateTimerRef.current = requestAnimationFrame(tick);
    };
    mobUpdateTimerRef.current = requestAnimationFrame(tick);
    return () => { if (mobUpdateTimerRef.current) cancelAnimationFrame(mobUpdateTimerRef.current); };
  }, [updateMobs]);

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

      // Number keys 1-6 for mob summoning
      if (e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (MOB_DEFINITIONS[idx]) {
          summonMob(MOB_DEFINITIONS[idx].id);
        }
        return;
      }

      // Tab to toggle shop
      if (e.key === 'Tab') {
        e.preventDefault();
        setShopOpen(prev => !prev);
        return;
      }

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
          holdPieceFn();
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
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop, holdPieceFn, summonMob]);

  // ===== Render Computed Values =====
  const board = boardRef.current;
  const piece = pieceRef.current;
  const hold = holdRef.current;
  const nextQueue = nextQueueRef.current;
  const score = scoreRef.current;
  const combo = comboRef.current;
  const lines = linesRef.current;
  const gameOver = gameOverRef.current;
  const gold = goldRef.current;
  const baseHp = baseHpRef.current;
  const incomingMobs = incomingMobsRef.current;
  const opponentBoard = opponentBoardRef.current;
  const opponentScore = opponentScoreRef.current;
  const opponentLines = opponentLinesRef.current;
  const opponentBaseHp = opponentBaseHpRef.current;

  // Build display board
  const displayBoard = board.map(row => row.map(cell => cell ? { ...cell, ghost: false } : null));
  if (piece) {
    const gy = getGhostY(piece, board);
    const shape = getShape(piece.type, piece.rotation);
    const color = COLORS[piece.type];

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
    return (
      <div className={styles.previewGrid} style={{ gridTemplateColumns: `repeat(${shape[0].length}, auto)` }}>
        {shape.flat().map((val, i) => (
          <div
            key={i}
            className={`${styles.previewCell} ${val ? styles.filled : ''}`}
            style={val ? { backgroundColor: COLORS[type], boxShadow: `0 0 6px ${COLORS[type]}` } : {}}
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
      case 'hold': holdPieceFn(); break;
    }
  };

  const hpPercent = Math.max(0, (baseHp / MAX_BASE_HP) * 100);
  const opponentHpPercent = Math.max(0, (opponentBaseHp / MAX_BASE_HP) * 100);

  return (
    <div className={styles.container}>
      <div className={styles.battleArena}>
        {/* === Player Side === */}
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
                <div key={i} className={styles.nextItem}>{renderPreview(type)}</div>
              ))}
            </div>
          </div>

          {/* Board */}
          <div className={styles.boardSection}>
            <div className={styles.playerHeader}>
              <div className={styles.playerName}>{playerName}</div>
              <div className={styles.goldDisplay}>
                <span className={styles.goldIcon}>G</span>
                <span className={styles.goldAmount}>{gold}</span>
              </div>
            </div>

            {/* Base HP Bar */}
            <div className={styles.hpBarContainer}>
              <div className={styles.hpBarLabel}>BASE HP</div>
              <div className={styles.hpBarTrack}>
                <div
                  className={`${styles.hpBarFill} ${hpPercent <= 25 ? styles.hpCritical : hpPercent <= 50 ? styles.hpWarning : ''}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className={styles.hpBarValue}>{baseHp}/{MAX_BASE_HP}</div>
            </div>

            {/* Mob Lane */}
            <div className={styles.mobLane}>
              <div className={styles.mobLaneTrack}>
                {incomingMobs.filter(m => m.alive).map(mob => {
                  const def = MOB_MAP[mob.definitionId];
                  const isHit = mob.hitFlash > 0 && Date.now() - mob.hitFlash < 200;
                  return (
                    <div
                      key={mob.id}
                      className={`${styles.mobUnit} ${isHit ? styles.mobHit : ''}`}
                      style={{
                        left: `${mob.position * 100}%`,
                        color: def?.color || '#fff',
                      }}
                      title={`${def?.name || 'Mob'} HP:${mob.hp}/${mob.maxHp}`}
                    >
                      <span className={styles.mobIcon}>{def?.icon || '?'}</span>
                      <div className={styles.mobHpBar}>
                        <div
                          className={styles.mobHpFill}
                          style={{
                            width: `${(mob.hp / mob.maxHp) * 100}%`,
                            backgroundColor: def?.color || '#4CAF50',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className={styles.mobLaneBase}>BASE</div>
              </div>
            </div>

            <div className={styles.boardWrap}>
              <div className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, auto)` }}>
                {displayBoard.flat().map((cell, i) => (
                  <div
                    key={i}
                    className={`${styles.cell} ${cell && !cell.ghost ? styles.filled : ''} ${cell?.ghost ? styles.ghost : ''}`}
                    style={cell && !cell.ghost ? { backgroundColor: cell.color, boxShadow: `0 0 8px ${cell.color}40` } : cell?.ghost ? { borderColor: `${cell.color}40` } : {}}
                  />
                ))}
              </div>
            </div>

            <div className={styles.statsRow}>
              <span>Lines: {lines}</span>
              <span>Score: {score.toLocaleString()}</span>
              <span>Combo: {combo}</span>
            </div>
          </div>
        </div>

        {/* === VS Divider === */}
        <div className={styles.vsDivider}>
          <div className={styles.vsText}>VS</div>
          <div className={styles.vsSubtext}>MOB BATTLE</div>
        </div>

        {/* === Opponent Side === */}
        <div className={styles.opponentSide}>
          <div className={styles.boardSection}>
            <div className={styles.opponentHeader}>
              <div className={styles.opponentName}>{opponent?.name || 'Opponent'}</div>
              <div className={styles.opponentScore}>{opponentScore.toLocaleString()}</div>
            </div>

            {/* Opponent Base HP Bar */}
            <div className={styles.hpBarContainer}>
              <div className={styles.hpBarLabel}>BASE HP</div>
              <div className={styles.hpBarTrack}>
                <div
                  className={`${styles.hpBarFill} ${styles.hpEnemy} ${opponentHpPercent <= 25 ? styles.hpCritical : opponentHpPercent <= 50 ? styles.hpWarning : ''}`}
                  style={{ width: `${opponentHpPercent}%` }}
                />
              </div>
              <div className={styles.hpBarValue}>{opponentBaseHp}/{MAX_BASE_HP}</div>
            </div>

            <div className={`${styles.boardWrap} ${styles.opponentBoardWrap}`}>
              <div className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, auto)` }}>
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
            </div>
          </div>
        </div>
      </div>

      {/* === Mob Shop === */}
      <div className={`${styles.mobShop} ${shopOpen ? styles.shopOpen : ''}`}>
        <button className={styles.shopToggle} onClick={() => setShopOpen(prev => !prev)}>
          {shopOpen ? 'Close Shop' : 'Summon [Tab]'}
        </button>
        <div className={styles.shopGrid}>
          {MOB_DEFINITIONS.map((def, idx) => {
            const canAfford = gold >= def.cost;
            return (
              <button
                key={def.id}
                className={`${styles.mobCard} ${!canAfford ? styles.mobCardDisabled : ''}`}
                onClick={() => { if (canAfford) summonMob(def.id); }}
                disabled={!canAfford || gameOver}
                title={`${def.name} - ${def.description}`}
              >
                <div className={styles.mobCardIcon}>{def.icon}</div>
                <div className={styles.mobCardInfo}>
                  <div className={styles.mobCardName}>{def.name}</div>
                  <div className={styles.mobCardStats}>
                    HP:{def.hp} DMG:{def.damage} SPD:{(def.speed * 60).toFixed(0)}
                  </div>
                </div>
                <div className={styles.mobCardCost}>
                  <span className={styles.mobCardKey}>{idx + 1}</span>
                  <span className={styles.goldIcon}>G</span>{def.cost}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === Mobile Controls === */}
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
        {/* Mobile mob summon bar */}
        <div className={styles.controlRow}>
          {MOB_DEFINITIONS.slice(0, 4).map((def) => (
            <button
              key={def.id}
              className={`${styles.ctrlBtn} ${gold < def.cost ? styles.ctrlBtnDisabled : ''}`}
              onClick={() => summonMob(def.id)}
              disabled={gold < def.cost || gameOver}
            >
              {def.icon}
            </button>
          ))}
        </div>
      </div>

      {/* === Game Over Overlay === */}
      {gameOver && (
        <div className={styles.gameOverOverlay}>
          <h2 className={styles.gameOverTitle}>
            {baseHp <= 0 ? 'DEFEAT' : 'VICTORY'}
          </h2>
          <div className={styles.finalStats}>
            <div className={styles.statBlock}>
              <div className={styles.statBlockLabel}>{playerName}</div>
              <div>Score: {score.toLocaleString()}</div>
              <div>Lines: {lines}</div>
              <div>Mobs Killed: {mobsKilledRef.current}</div>
              <div>Gold Earned: {totalGoldEarnedRef.current}</div>
            </div>
            <div className={styles.statBlock}>
              <div className={styles.statBlockLabel}>{opponent?.name || 'Opponent'}</div>
              <div>Score: {opponentScore.toLocaleString()}</div>
              <div>Lines: {opponentLines}</div>
            </div>
          </div>
          <button className={styles.backBtn} onClick={onBackToLobby}>
            Back to Lobby
          </button>
        </div>
      )}
    </div>
  );
};

export default MobBattle;
