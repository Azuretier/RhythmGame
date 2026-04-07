'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { BoardCell } from '@/types/multiplayer';
import {
  W,
  H,
  LOCK_DELAY,
  MAX_LOCK_MOVES,
  createRNG,
  create7Bag,
  getShape,
  createEmptyBoard,
  isValid,
  tryRotate,
  lockPiece,
  clearLines,
  getGhostY,
  addGarbageLines,
  detectTSpin,
} from '@/components/rhythmia/multiplayer-battle-engine';
import styles from './Tetris99Game.module.css';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
type TargetMode = 'random' | 'attackers' | 'kos' | 'badges';

type Piece = {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
};

type GarbagePacket = {
  id: string;
  lines: number;
  delay: number;
  from: string;
};

type MatchState = 'countdown' | 'playing' | 'gameOver';

type BotState = {
  id: string;
  name: string;
  alive: boolean;
  board: (BoardCell | null)[][];
  heights: number[];
  pendingGarbage: GarbagePacket[];
  score: number;
  lines: number;
  combo: number;
  badges: number;
  badgePoints: number;
  koCredit: boolean;
  targetingPlayer: boolean;
};

type Snapshot = {
  board: (BoardCell | null)[][];
  hold: PieceType | null;
  queue: PieceType[];
  score: number;
  lines: number;
  combo: number;
  kos: number;
  badgePoints: number;
  badges: number;
  place: number;
  incomingGarbage: number;
  attackers: number;
  targetMode: TargetMode;
  state: MatchState;
  countdown: number;
  statusText: string;
  gameOver: boolean;
  victory: boolean;
};

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#35d0ff',
  O: '#ffd166',
  T: '#b57cff',
  S: '#35e48d',
  Z: '#ff6b6b',
  J: '#5b8dff',
  L: '#ff9f43',
};

const BOT_COUNT = 98;
const GARBAGE_ENTRY_DELAY = 4;
const BOT_NAMES = [
  'ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT',
  'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE', 'QUARTZ', 'RIFT', 'SOL', 'TITAN',
  'UMBRA', 'VANTA', 'WISP', 'XENO', 'YUKI', 'ZENITH',
];

function getInitialY(type: PieceType) {
  return type === 'I' ? -1 : 0;
}

function createSpawnPiece(type: PieceType): Piece {
  return { type, rotation: 0, x: 3, y: getInitialY(type) };
}

function badgeMultiplier(badges: number) {
  return [1, 1.25, 1.5, 1.75, 2][Math.min(4, badges)] ?? 2;
}

function badgeStageFromPoints(points: number) {
  if (points >= 30) return 4;
  if (points >= 14) return 3;
  if (points >= 6) return 2;
  if (points >= 2) return 1;
  return 0;
}

function comboAttack(combo: number) {
  if (combo <= 1) return 0;
  if (combo <= 3) return 1;
  if (combo <= 5) return 2;
  if (combo <= 8) return 3;
  return 4;
}

function computeAttack(cleared: number, tSpin: 'none' | 'mini' | 'full', combo: number, backToBack: boolean, badges: number) {
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
  return Math.max(0, Math.round(attack * badgeMultiplier(badges)));
}

function pickPieceColor(idx: number) {
  return Object.values(PIECE_COLORS)[idx % Object.keys(PIECE_COLORS).length];
}

function heightsToBoard(heights: number[], seed: number) {
  const board = createEmptyBoard();
  for (let x = 0; x < W; x++) {
    const color = pickPieceColor(seed + x);
    for (let y = H - 1; y >= H - Math.max(0, Math.min(H, heights[x])); y--) {
      board[y][x] = { color };
    }
  }
  return board;
}

function cloneBoard(board: (BoardCell | null)[][]) {
  return board.map(row => row.slice());
}

function randomBotName(index: number) {
  return `${BOT_NAMES[index % BOT_NAMES.length]}-${String(index + 1).padStart(2, '0')}`;
}

function createBotState(index: number, rng: () => number): BotState {
  const heights = Array.from({ length: W }, () => 2 + Math.floor(rng() * 7));
  return {
    id: `bot-${index}`,
    name: randomBotName(index),
    alive: true,
    board: heightsToBoard(heights, index),
    heights,
    pendingGarbage: [],
    score: Math.floor(rng() * 9000),
    lines: Math.floor(rng() * 30),
    combo: 0,
    badges: 0,
    badgePoints: Math.floor(rng() * 2),
    koCredit: false,
    targetingPlayer: rng() > 0.72,
  };
}

function buildDisplayBoard(board: (BoardCell | null)[][], piece: Piece | null) {
  const display = cloneBoard(board);
  if (!piece) return display;

  const ghostY = getGhostY(piece, board);
  const shape = getShape(piece.type, piece.rotation);

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gy = ghostY + y;
      const gx = piece.x + x;
      if (gy >= 0 && gy < H && gx >= 0 && gx < W && display[gy][gx] === null) {
        display[gy][gx] = { color: `${PIECE_COLORS[piece.type]}55` };
      }
    }
  }

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const py = piece.y + y;
      const px = piece.x + x;
      if (py >= 0 && py < H && px >= 0 && px < W) {
        display[py][px] = { color: PIECE_COLORS[piece.type] };
      }
    }
  }

  return display;
}

function highestStack(heights: number[]) {
  return Math.max(...heights);
}

function isDanger(board: (BoardCell | null)[][]) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < W; x++) {
      if (board[y][x]) return true;
    }
  }
  return false;
}

function targetLabel(mode: TargetMode) {
  if (mode === 'attackers') return 'Attackers';
  if (mode === 'kos') return 'KOs';
  if (mode === 'badges') return 'Badges';
  return 'Random';
}

function sumGarbage(queue: GarbagePacket[]) {
  return queue.reduce((sum, packet) => sum + packet.lines, 0);
}

function makePacket(id: number, lines: number, from: string): GarbagePacket {
  return { id: `packet-${id}`, lines, delay: GARBAGE_ENTRY_DELAY, from };
}

function progressGarbageQueue(queue: GarbagePacket[]) {
  let due = 0;
  const next = queue
    .map(packet => ({ ...packet, delay: packet.delay - 1 }))
    .filter(packet => {
      if (packet.delay <= 0) {
        due += packet.lines;
        return false;
      }
      return true;
    });
  return { queue: next, due };
}

function cancelGarbage(queue: GarbagePacket[], amount: number) {
  let remaining = amount;
  const next: GarbagePacket[] = [];

  for (const packet of queue) {
    if (remaining <= 0) {
      next.push(packet);
      continue;
    }
    if (packet.lines <= remaining) {
      remaining -= packet.lines;
      continue;
    }
    next.push({ ...packet, lines: packet.lines - remaining });
    remaining = 0;
  }

  return { queue: next, remaining };
}

function PreviewShape({ type }: { type: PieceType | null }) {
  if (!type) return null;
  const shape = getShape(type, 0);
  return (
    <div className={styles.previewShape} style={{ gridTemplateColumns: `repeat(${shape[0].length}, 10px)` }}>
      {shape.flatMap((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <div
            key={`${type}-${rowIndex}-${cellIndex}`}
            className={styles.previewCell}
            style={{ background: cell ? PIECE_COLORS[type] : 'rgba(255,255,255,0.06)' }}
          />
        )),
      )}
    </div>
  );
}

function MicroBoard({ bot, targeted }: { bot: BotState; targeted: boolean }) {
  const className = [
    styles.microCard,
    targeted ? styles.microCardTargeted : '',
    bot.targetingPlayer ? styles.microCardAttacker : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <div className={styles.microHeader}>
        <span>{bot.name}</span>
        <span className={styles.microBadge}>{'★'.repeat(bot.badges)}</span>
      </div>
      <div className={styles.microBoard}>
        {bot.board.flatMap((row, rowIndex) =>
          row.map((cell, cellIndex) => (
            <div
              key={`${bot.id}-${rowIndex}-${cellIndex}`}
              className={styles.microCell}
              style={{ background: cell ? cell.color : 'rgba(255,255,255,0.045)' }}
            />
          )),
        )}
      </div>
      {!bot.alive && <div className={styles.deadOverlay}>KO</div>}
    </div>
  );
}

export default function Tetris99Game() {
  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);
  const packetIdRef = useRef(0);
  const playerSeedRef = useRef(99_009);
  const bagRef = useRef(create7Bag(createRNG(playerSeedRef.current)));
  const garbageRngRef = useRef(createRNG(playerSeedRef.current + 17));
  const botRngRef = useRef(createRNG(playerSeedRef.current + 991));
  const botsRef = useRef<BotState[]>(Array.from({ length: BOT_COUNT }, (_, index) => createBotState(index, botRngRef.current)));

  const boardRef = useRef<(BoardCell | null)[][]>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const holdRef = useRef<PieceType | null>(null);
  const holdUsedRef = useRef(false);
  const queueRef = useRef<PieceType[]>([]);
  const lockTimerRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);
  const lastMoveWasRotationRef = useRef(false);
  const lastClearWasDifficultRef = useRef(false);

  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const comboRef = useRef(0);
  const koRef = useRef(0);
  const badgePointsRef = useRef(0);
  const badgesRef = useRef(0);
  const incomingGarbageRef = useRef<GarbagePacket[]>([]);
  const matchStateRef = useRef<MatchState>('countdown');
  const countdownRef = useRef(3);
  const gameOverRef = useRef(false);
  const victoryRef = useRef(false);
  const targetModeRef = useRef<TargetMode>('random');

  const [snapshot, setSnapshot] = useState<Snapshot>({
    board: boardRef.current,
    hold: null,
    queue: [],
    score: 0,
    lines: 0,
    combo: 0,
    kos: 0,
    badgePoints: 0,
    badges: 0,
    place: 99,
    incomingGarbage: 0,
    attackers: 0,
    targetMode: 'random',
    state: 'countdown',
    countdown: 3,
    statusText: 'Get ready',
    gameOver: false,
    victory: false,
  });

  const targetedBotIds = (() => {
    const aliveBots = botsRef.current.filter(bot => bot.alive);
    if (aliveBots.length === 0) return new Set<string>();
    if (snapshot.targetMode === 'attackers') {
      const attackers = aliveBots.filter(bot => bot.targetingPlayer);
      return new Set((attackers.length ? attackers : aliveBots.slice(0, 3)).map(bot => bot.id));
    }
    if (snapshot.targetMode === 'kos') {
      return new Set([...aliveBots].sort((a, b) => highestStack(b.heights) - highestStack(a.heights)).slice(0, 3).map(bot => bot.id));
    }
    if (snapshot.targetMode === 'badges') {
      return new Set([...aliveBots].sort((a, b) => b.badges - a.badges || highestStack(b.heights) - highestStack(a.heights)).slice(0, 2).map(bot => bot.id));
    }
    return new Set([aliveBots[0]?.id].filter(Boolean));
  })();

  function ensureAudio() {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume();
    }
    return audioRef.current;
  }

  function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    gainValue = 0.05,
    endFrequency?: number,
  ) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playSfx(kind: 'move' | 'rotate' | 'drop' | 'clear' | 'tetris' | 'garbage' | 'ko' | 'danger' | 'start' | 'win' | 'lose') {
    if (typeof window === 'undefined') return;
    if (kind === 'move') playTone(220, 0.04, 'square', 0.025);
    if (kind === 'rotate') playTone(440, 0.05, 'triangle', 0.035, 520);
    if (kind === 'drop') playTone(180, 0.08, 'sawtooth', 0.045, 80);
    if (kind === 'clear') {
      playTone(660, 0.12, 'triangle', 0.05, 880);
      playTone(990, 0.1, 'triangle', 0.03);
    }
    if (kind === 'tetris') {
      playTone(660, 0.18, 'triangle', 0.06, 1320);
      playTone(330, 0.18, 'square', 0.035, 165);
    }
    if (kind === 'garbage') playTone(130, 0.16, 'sawtooth', 0.045, 75);
    if (kind === 'ko') {
      playTone(523, 0.14, 'triangle', 0.05, 1047);
      playTone(783, 0.16, 'triangle', 0.04);
    }
    if (kind === 'danger') playTone(150, 0.12, 'square', 0.04, 110);
    if (kind === 'start') playTone(440, 0.1, 'triangle', 0.05, 880);
    if (kind === 'win') {
      playTone(523, 0.18, 'triangle', 0.055, 1047);
      playTone(784, 0.22, 'triangle', 0.045, 1568);
    }
    if (kind === 'lose') playTone(220, 0.28, 'sawtooth', 0.05, 82);
  }

  function fillQueue() {
    while (queueRef.current.length < 5) {
      queueRef.current.push(bagRef.current());
    }
  }

  function syncSnapshot(statusText?: string) {
    const aliveBots = botsRef.current.filter(bot => bot.alive).length;
    setSnapshot({
      board: buildDisplayBoard(boardRef.current, pieceRef.current),
      hold: holdRef.current,
      queue: queueRef.current.slice(0, 5),
      score: scoreRef.current,
      lines: linesRef.current,
      combo: comboRef.current,
      kos: koRef.current,
      badgePoints: badgePointsRef.current,
      badges: badgesRef.current,
      place: aliveBots + (gameOverRef.current ? 0 : 1),
      incomingGarbage: sumGarbage(incomingGarbageRef.current),
      attackers: botsRef.current.filter(bot => bot.alive && bot.targetingPlayer).length,
      targetMode: targetModeRef.current,
      state: matchStateRef.current,
      countdown: countdownRef.current,
      statusText: statusText ?? snapshot.statusText,
      gameOver: gameOverRef.current,
      victory: victoryRef.current,
    });
  }

  function spawnPiece() {
    fillQueue();
    const type = queueRef.current.shift()!;
    fillQueue();
    const piece = createSpawnPiece(type);
    if (!isValid(piece, boardRef.current)) {
      matchStateRef.current = 'gameOver';
      gameOverRef.current = true;
      victoryRef.current = false;
      playSfx('lose');
      syncSnapshot('Eliminated');
      return false;
    }
    pieceRef.current = piece;
    holdUsedRef.current = false;
    lockMovesRef.current = 0;
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    return true;
  }

  function awardKo(count: number) {
    if (count <= 0) return;
    koRef.current += count;
    badgePointsRef.current += count;
    badgesRef.current = badgeStageFromPoints(badgePointsRef.current);
    playSfx('ko');
  }

  function chooseTargets() {
    const aliveBots = botsRef.current.filter(bot => bot.alive);
    if (aliveBots.length === 0) return [];
    if (targetModeRef.current === 'attackers') {
      const attackers = aliveBots.filter(bot => bot.targetingPlayer);
      return (attackers.length ? attackers : aliveBots.slice(0, 2)).map(bot => bot.id);
    }
    if (targetModeRef.current === 'kos') {
      return [...aliveBots].sort((a, b) => highestStack(b.heights) - highestStack(a.heights)).slice(0, 2).map(bot => bot.id);
    }
    if (targetModeRef.current === 'badges') {
      return [...aliveBots].sort((a, b) => b.badgePoints - a.badgePoints || highestStack(b.heights) - highestStack(a.heights)).slice(0, 2).map(bot => bot.id);
    }
    return [aliveBots[Math.floor(Math.random() * aliveBots.length)].id];
  }

  function sendAttack(lines: number) {
    if (lines <= 0) return;

    const canceled = cancelGarbage(incomingGarbageRef.current, lines);
    incomingGarbageRef.current = canceled.queue;
    const remaining = canceled.remaining;
    if (remaining <= 0) return;

    const targets = chooseTargets();
    const split = Math.max(1, Math.ceil(remaining / Math.max(1, targets.length)));
    let awarded = 0;

    for (const botId of targets) {
      const bot = botsRef.current.find(item => item.id === botId && item.alive);
      if (!bot) continue;
      packetIdRef.current += 1;
      bot.pendingGarbage.push(makePacket(packetIdRef.current, split, 'player'));
      bot.koCredit = true;
      if (highestStack(bot.heights) + sumGarbage(bot.pendingGarbage) >= 22 + Math.floor(Math.random() * 2)) {
        bot.alive = false;
        bot.board = createEmptyBoard();
        badgePointsRef.current += 1 + bot.badges;
        badgesRef.current = badgeStageFromPoints(badgePointsRef.current);
        awarded += 1;
      }
    }

    if (awarded > 0) awardKo(awarded);
  }

  function applyIncomingGarbage() {
    const progressed = progressGarbageQueue(incomingGarbageRef.current);
    incomingGarbageRef.current = progressed.queue;
    if (progressed.due <= 0) return;
    boardRef.current = addGarbageLines(boardRef.current, progressed.due, garbageRngRef.current);
    playSfx('garbage');
    if (isDanger(boardRef.current)) playSfx('danger');
  }

  function lockCurrentPiece() {
    const piece = pieceRef.current;
    if (!piece) return;

    const boardAfterLock = lockPiece(piece, boardRef.current, 0);
    const tSpin = detectTSpin(piece, boardRef.current, lastMoveWasRotationRef.current);
    const { board: clearedBoard, cleared } = clearLines(boardAfterLock);
    boardRef.current = clearedBoard;
    linesRef.current += cleared;
    scoreRef.current += [0, 100, 300, 500, 800][cleared] ?? 0;

    if (cleared > 0) {
      comboRef.current += 1;
      const difficult = cleared === 4 || (tSpin !== 'none' && cleared > 0);
      const attack = computeAttack(cleared, tSpin, comboRef.current, difficult && lastClearWasDifficultRef.current, badgesRef.current);
      lastClearWasDifficultRef.current = difficult;
      sendAttack(attack);
      playSfx(cleared === 4 || tSpin === 'full' ? 'tetris' : 'clear');
      syncSnapshot(tSpin === 'full' ? 'T-Spin' : cleared === 4 ? 'Tetris' : `${cleared} Line Clear`);
    } else {
      comboRef.current = 0;
      lastClearWasDifficultRef.current = false;
      applyIncomingGarbage();
      syncSnapshot('Stack stabilized');
    }

    pieceRef.current = null;
    lastMoveWasRotationRef.current = false;
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    spawnPiece();
    syncSnapshot();
  }

  function startLockTimer() {
    if (lockTimerRef.current !== null) return;
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      lockCurrentPiece();
    }, LOCK_DELAY);
  }

  function clearLockTimer() {
    if (lockTimerRef.current === null) return;
    window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = null;
  }

  function movePiece(dx: number, dy: number) {
    const piece = pieceRef.current;
    if (!piece || matchStateRef.current !== 'playing') return false;
    const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!isValid(next, boardRef.current)) {
      if (dy > 0) startLockTimer();
      return false;
    }
    pieceRef.current = next;
    lastMoveWasRotationRef.current = false;
    if (lockTimerRef.current !== null && lockMovesRef.current < MAX_LOCK_MOVES) {
      lockMovesRef.current += 1;
      clearLockTimer();
    }
    const below = { ...next, y: next.y + 1 };
    if (!isValid(below, boardRef.current)) startLockTimer();
    else clearLockTimer();
    playSfx(dx !== 0 ? 'move' : 'drop');
    syncSnapshot();
    return true;
  }

  function rotatePiece(direction: 1 | -1) {
    const piece = pieceRef.current;
    if (!piece || matchStateRef.current !== 'playing') return;
    const rotated = tryRotate(piece, direction, boardRef.current);
    if (!rotated) return;
    pieceRef.current = rotated;
    lastMoveWasRotationRef.current = true;
    if (lockTimerRef.current !== null && lockMovesRef.current < MAX_LOCK_MOVES) {
      lockMovesRef.current += 1;
      clearLockTimer();
    }
    const below = { ...rotated, y: rotated.y + 1 };
    if (!isValid(below, boardRef.current)) startLockTimer();
    playSfx('rotate');
    syncSnapshot();
  }

  function hardDrop() {
    const piece = pieceRef.current;
    if (!piece || matchStateRef.current !== 'playing') return;
    const y = getGhostY(piece, boardRef.current);
    pieceRef.current = { ...piece, y };
    scoreRef.current += Math.max(0, y - piece.y) * 2;
    playSfx('drop');
    lockCurrentPiece();
  }

  function holdPiece() {
    if (matchStateRef.current !== 'playing' || holdUsedRef.current || !pieceRef.current) return;
    const current = pieceRef.current.type;
    const hold = holdRef.current;
    holdRef.current = current;
    holdUsedRef.current = true;
    pieceRef.current = hold ? createSpawnPiece(hold) : null;
    if (!hold) {
      spawnPiece();
    } else if (pieceRef.current && !isValid(pieceRef.current, boardRef.current)) {
      matchStateRef.current = 'gameOver';
      gameOverRef.current = true;
      victoryRef.current = false;
      playSfx('lose');
    }
    playSfx('rotate');
    syncSnapshot();
  }

  function resetGame() {
    boardRef.current = createEmptyBoard();
    holdRef.current = null;
    holdUsedRef.current = false;
    queueRef.current = [];
    pieceRef.current = null;
    scoreRef.current = 0;
    linesRef.current = 0;
    comboRef.current = 0;
    koRef.current = 0;
    badgePointsRef.current = 0;
    badgesRef.current = 0;
    incomingGarbageRef.current = [];
    matchStateRef.current = 'countdown';
    countdownRef.current = 3;
    gameOverRef.current = false;
    victoryRef.current = false;
    lastMoveWasRotationRef.current = false;
    lastClearWasDifficultRef.current = false;
    botRngRef.current = createRNG(playerSeedRef.current + Math.floor(Math.random() * 10_000));
    botsRef.current = Array.from({ length: BOT_COUNT }, (_, index) => createBotState(index, botRngRef.current));
    botsRef.current.forEach(bot => {
      bot.badges = badgeStageFromPoints(bot.badgePoints);
    });
    bagRef.current = create7Bag(createRNG(playerSeedRef.current + Math.floor(Math.random() * 10_000)));
    garbageRngRef.current = createRNG(playerSeedRef.current + Math.floor(Math.random() * 10_000) + 17);
    fillQueue();
    spawnPiece();
    syncSnapshot('Get ready');
  }

  useEffect(() => {
    resetGame();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (matchStateRef.current !== 'countdown') return;
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = 0;
        matchStateRef.current = 'playing';
        playSfx('start');
        syncSnapshot('Fight!');
        return;
      }
      playSfx('move');
      syncSnapshot(`Starting in ${countdownRef.current}`);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      ensureAudio();
      if (matchStateRef.current !== 'playing') return;
      if (event.repeat && (event.code === 'Space' || event.code === 'KeyC')) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        movePiece(-1, 0);
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        movePiece(1, 0);
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        movePiece(0, 1);
      } else if (event.code === 'ArrowUp' || event.code === 'KeyX') {
        event.preventDefault();
        rotatePiece(1);
      } else if (event.code === 'KeyZ') {
        event.preventDefault();
        rotatePiece(-1);
      } else if (event.code === 'Space') {
        event.preventDefault();
        hardDrop();
      } else if (event.code === 'KeyC' || event.code === 'ShiftLeft') {
        event.preventDefault();
        holdPiece();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (matchStateRef.current !== 'playing' || gameOverRef.current || !pieceRef.current) return;
      const next = { ...pieceRef.current, y: pieceRef.current.y + 1 };
      if (isValid(next, boardRef.current)) {
        pieceRef.current = next;
        syncSnapshot();
      } else {
        startLockTimer();
      }
    }, snapshot.place <= 10 ? 220 : snapshot.place <= 50 ? 360 : 520);

    return () => window.clearInterval(interval);
  }, [snapshot.place]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (matchStateRef.current !== 'playing' || gameOverRef.current) return;

      let playerKos = 0;

      for (const bot of botsRef.current) {
        if (!bot.alive) continue;

        const stack = highestStack(bot.heights);
        bot.targetingPlayer = stack >= 14 || Math.random() > 0.78 || (koRef.current >= 2 && Math.random() > 0.64);

        const progressed = progressGarbageQueue(bot.pendingGarbage);
        bot.pendingGarbage = progressed.queue;
        if (progressed.due > 0) {
          const garbage = progressed.due;
          for (let i = 0; i < garbage; i++) {
            const hole = Math.floor(botRngRef.current() * W);
            bot.heights = bot.heights.map((height, index) => Math.min(H, height + (index === hole ? 0 : 1)));
          }
        }

        const danger = highestStack(bot.heights);
        const clearRoll = botRngRef.current();
        let clearCount = 0;
        if (danger >= 16) {
          clearCount = clearRoll > 0.32 ? 1 + Math.floor(botRngRef.current() * 2) : 0;
        } else if (danger >= 12) {
          clearCount = clearRoll > 0.55 ? 1 + Math.floor(botRngRef.current() * 3) : 0;
        } else if (clearRoll > 0.74) {
          clearCount = clearRoll > 0.96 ? 4 : clearRoll > 0.88 ? 3 : 2;
        }

        if (clearCount > 0) {
          bot.combo += 1;
          bot.lines += clearCount;
          bot.score += clearCount * 400 + bot.combo * 50;
          for (let i = 0; i < clearCount; i++) {
            const column = Math.floor(botRngRef.current() * W);
            bot.heights[column] = Math.max(0, bot.heights[column] - 2 - Math.floor(botRngRef.current() * 3));
            const neighbor = (column + 1 + Math.floor(botRngRef.current() * 3)) % W;
            bot.heights[neighbor] = Math.max(0, bot.heights[neighbor] - 1);
          }

          const attack = computeAttack(clearCount, 'none', bot.combo, clearCount === 4, bot.badges);
          if (bot.targetingPlayer && attack > 0) {
            packetIdRef.current += 1;
            incomingGarbageRef.current.push(makePacket(packetIdRef.current, attack, bot.id));
          } else if (attack > 0) {
            const victims = botsRef.current.filter(candidate => candidate.alive && candidate.id !== bot.id);
            const victim = victims[Math.floor(botRngRef.current() * victims.length)];
            if (victim) {
              packetIdRef.current += 1;
              victim.pendingGarbage.push(makePacket(packetIdRef.current, Math.max(1, Math.floor(attack / 2)), bot.id));
              victim.koCredit = false;
            }
          }
        } else {
          bot.combo = 0;
          const column = Math.floor(botRngRef.current() * W);
          bot.heights[column] = Math.min(H, bot.heights[column] + 1);
        }

        bot.heights = bot.heights.map(height => Math.max(0, Math.min(H, height)));

        if (highestStack(bot.heights) >= H || bot.heights.reduce((sum, value) => sum + value, 0) >= 132) {
          bot.alive = false;
          bot.board = createEmptyBoard();
          bot.badges = badgeStageFromPoints(bot.badgePoints);
          if (bot.koCredit) playerKos += 1;
        } else {
          bot.board = heightsToBoard(bot.heights, bot.lines + bot.score);
        }
      }

      if (playerKos > 0) awardKo(playerKos);

      if (botsRef.current.every(bot => !bot.alive)) {
        victoryRef.current = true;
        matchStateRef.current = 'gameOver';
        gameOverRef.current = true;
        playSfx('win');
      }

      syncSnapshot(isDanger(boardRef.current) ? 'Danger zone' : 'Battle in progress');
    }, 700);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!snapshot.gameOver) return;
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, [snapshot.gameOver]);

  const leftBots = botsRef.current.slice(0, 49);
  const rightBots = botsRef.current.slice(49);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Tetris 99 Style Battle Royale
            </div>
            <h1 className={styles.title}>Ninety-Nine Boards, One Survivor.</h1>
            <p className={styles.subtitle}>
              A browser-built tribute to the Nintendo Switch battle-royale format with countdown flow, queued garbage,
              badge-point scaling, target switching, and synthesized sound effects for movement, clears, danger, KOs, and win/loss states.
            </p>
            <div className={styles.actionRow}>
              <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Restart Match</button>
              <button className={styles.ghostButton} onClick={() => router.push('/games')}>Back to Games</button>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Place</span>
                <span className={styles.statValue}>#{snapshot.place}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Attackers</span>
                <span className={styles.statValue}>{snapshot.attackers}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>State</span>
                <span className={styles.statValue}>{snapshot.state === 'countdown' ? snapshot.countdown : snapshot.gameOver ? (snapshot.victory ? 'WIN' : 'OUT') : 'LIVE'}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Badges</span>
                <span className={styles.statValue}>{snapshot.badges}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.arena}>
          <div className={styles.sidePanel}>
            {leftBots.map(bot => (
              <MicroBoard key={bot.id} bot={bot} targeted={targetedBotIds.has(bot.id)} />
            ))}
          </div>

          <div className={styles.boardStack}>
            <div className={styles.heroCard}>
              <div className={styles.heroHeader}>
                <div>
                  <div className={styles.heroTitle}>Player Board</div>
                  <div className={styles.heroSubtle}>{snapshot.statusText}</div>
                </div>
                <div className={styles.heroSubtle}>{targetLabel(snapshot.targetMode)} targeting</div>
              </div>

              <div className={styles.heroLayout}>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}>
                    <span className={styles.panelHeader}>Hold</span>
                    <div className={styles.previewBox}>
                      <PreviewShape type={snapshot.hold} />
                    </div>
                  </div>
                  <div className={styles.miniPanel}>
                    <span className={styles.panelHeader}>Badge Bonus</span>
                    <div className={styles.heroSubtle}>{badgeMultiplier(snapshot.badges).toFixed(2)}x attack</div>
                  </div>
                </div>

                <div className={`${styles.boardFrame} ${isDanger(snapshot.board) ? styles.boardFrameDanger : ''}`}>
                  <div className={styles.garbageRail}>
                    <div className={styles.garbageFill} style={{ height: `${Math.min(100, snapshot.incomingGarbage * 8)}%` }} />
                  </div>
                  <div className={styles.board}>
                    {snapshot.board.flatMap((row, rowIndex) =>
                      row.map((cell, cellIndex) => (
                        <div
                          key={`player-${rowIndex}-${cellIndex}`}
                          className={styles.cell}
                          style={{ background: cell ? cell.color : 'rgba(255,255,255,0.04)' }}
                        />
                      )),
                    )}
                  </div>
                </div>

                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}>
                    <span className={styles.panelHeader}>Next</span>
                    <div className={styles.previewBox}>
                      {snapshot.queue.slice(0, 5).map((type, index) => (
                        <PreviewShape key={`${type}-${index}`} type={type} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.hudCard}>
              <div className={styles.hudGrid}>
                <div className={styles.hudMetric}>
                  <span className={styles.statLabel}>Score</span>
                  <span className={styles.hudValue}>{snapshot.score.toLocaleString()}</span>
                </div>
                <div className={styles.hudMetric}>
                  <span className={styles.statLabel}>Lines</span>
                  <span className={styles.hudValue}>{snapshot.lines}</span>
                </div>
                <div className={styles.hudMetric}>
                  <span className={styles.statLabel}>KOs</span>
                  <span className={styles.hudValue}>{snapshot.kos}</span>
                </div>
              </div>

              <div className={styles.targetRow}>
                {(['random', 'attackers', 'kos', 'badges'] as TargetMode[]).map(mode => (
                  <button
                    key={mode}
                    className={`${styles.targetButton} ${snapshot.targetMode === mode ? styles.targetActive : ''}`}
                    onClick={() => {
                      ensureAudio();
                      targetModeRef.current = mode;
                      syncSnapshot(`${targetLabel(mode)} selected`);
                    }}
                  >
                    {targetLabel(mode)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.queueCard}>
              <span className={styles.panelHeader}>Systems</span>
              <div className={styles.queueList}>
                <div className={styles.queueItem}><span>Players remaining</span><strong>{snapshot.place}</strong></div>
                <div className={styles.queueItem}><span>Garbage queued</span><strong>{snapshot.incomingGarbage}</strong></div>
                <div className={styles.queueItem}><span>Badge points</span><strong>{snapshot.badgePoints}</strong></div>
                <div className={styles.queueItem}><span>Badge multiplier</span><strong>{badgeMultiplier(snapshot.badges).toFixed(2)}x</strong></div>
                <div className={styles.queueItem}><span>Target mode</span><strong>{targetLabel(snapshot.targetMode)}</strong></div>
                <div className={styles.queueItem}><span>Status</span><strong>{snapshot.statusText}</strong></div>
              </div>
            </div>

            <div className={styles.controlCard}>
              <span className={styles.panelHeader}>Controls + Audio</span>
              <div className={styles.controlGrid}>
                <div className={styles.controlPill}><span className={styles.controlKey}>A D</span>Move</div>
                <div className={styles.controlPill}><span className={styles.controlKey}>S</span>Soft drop</div>
                <div className={styles.controlPill}><span className={styles.controlKey}>X</span>Rotate right</div>
                <div className={styles.controlPill}><span className={styles.controlKey}>Z</span>Rotate left</div>
                <div className={styles.controlPill}><span className={styles.controlKey}>C</span>Hold</div>
                <div className={styles.controlPill}><span className={styles.controlKey}>Space</span>Hard drop</div>
              </div>
            </div>

            {snapshot.gameOver && (
              <div className={styles.resultCard}>
                <h2 className={styles.resultTitle}>{snapshot.victory ? 'Victory Royale' : 'Game Over'}</h2>
                <p className={styles.resultBody}>
                  {snapshot.victory
                    ? `You outlasted every CPU rival and closed the lobby with ${snapshot.kos} KOs, ${snapshot.lines} cleared lines, and ${snapshot.badgePoints} badge points.`
                    : `You finished in place #${snapshot.place} with ${snapshot.kos} KOs and ${snapshot.badgePoints} badge points. Restart to jump straight back into another 99-board run.`}
                </p>
              </div>
            )}
          </div>

          <div className={styles.sidePanel}>
            {rightBots.map(bot => (
              <MicroBoard key={bot.id} bot={bot} targeted={targetedBotIds.has(bot.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
