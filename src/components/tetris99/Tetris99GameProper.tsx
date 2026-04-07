'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Board as RhythmBoard } from '@/components/rhythmia/tetris/components/Board';
import type { Board as RhythmBoardState, Piece as RhythmPiece } from '@/components/rhythmia/tetris/types';
import {
  createEmptyBoard,
  createSpawnPiece,
  getGhostY,
  isValidPosition,
  lockPiece,
  clearLines,
  tryRotation,
} from '@/components/rhythmia/tetris/utils/boardUtils';
import { BOARD_WIDTH, BOARD_HEIGHT, LOCK_DELAY } from '@/components/rhythmia/tetris/constants';
import { AI_DIFFICULTIES, findBestMove } from '@/lib/ranked/TetrisAI';
import styles from './Tetris99Game.module.css';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
type TargetMode = 'random' | 'attackers' | 'kos' | 'badges';
type MatchState = 'countdown' | 'playing' | 'gameOver';

type GarbagePacket = {
  id: string;
  lines: number;
  delay: number;
  from: string;
};

type BotState = {
  id: string;
  name: string;
  board: RhythmBoardState;
  queue: PieceType[];
  hold: PieceType | null;
  combo: number;
  lines: number;
  score: number;
  badgePoints: number;
  badges: number;
  alive: boolean;
  targetPlayer: boolean;
  pendingGarbage: GarbagePacket[];
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
  place: number;
  attackers: number;
  incomingGarbage: number;
  targetMode: TargetMode;
  state: MatchState;
  countdown: number;
  gameOver: boolean;
  victory: boolean;
  status: string;
};

const BOT_COUNT = 98;
const GARBAGE_DELAY = 3;
const BOT_NAMES = ['ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT', 'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE'];
const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const badgeStageFromPoints = (points: number) => (points >= 30 ? 4 : points >= 14 ? 3 : points >= 6 ? 2 : points >= 2 ? 1 : 0);
const badgeMultiplier = (stage: number) => [1, 1.25, 1.5, 1.75, 2][Math.min(4, stage)] ?? 2;

function comboAttack(combo: number) {
  if (combo <= 1) return 0;
  if (combo <= 3) return 1;
  if (combo <= 5) return 2;
  if (combo <= 8) return 3;
  return 4;
}

function computeAttack(cleared: number, combo: number, backToBack: boolean, badges: number) {
  let attack = [0, 0, 1, 2, 4][cleared] ?? 0;
  if (backToBack && attack > 0) attack += 1;
  attack += comboAttack(combo);
  return Math.max(0, Math.round(attack * badgeMultiplier(badges)));
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

function seedBoard(rows: number, rng: () => number) {
  let board = createEmptyBoard();
  for (let r = 0; r < rows; r++) {
    const gap = Math.floor(rng() * BOARD_WIDTH);
    board = [...board.slice(1), Array.from({ length: BOARD_WIDTH }, (_, x) => (x === gap ? null : PIECES[(x + r) % PIECES.length]))];
  }
  return board;
}

function addGarbageRows(board: RhythmBoardState, rows: number, rng: () => number) {
  let next = board.map(row => row.slice());
  for (let r = 0; r < rows; r++) {
    const gap = Math.floor(rng() * BOARD_WIDTH);
    next = [
      ...next.slice(1),
      Array.from({ length: BOARD_WIDTH }, (_, x) => (x === gap ? null : PIECES[(x + r) % PIECES.length])),
    ];
  }
  return next;
}

function boardToAi(board: RhythmBoardState) {
  return board.map(row => row.map(cell => (cell ? { color: '#fff' } : null)));
}

function boardDanger(board: RhythmBoardState) {
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].some(Boolean)) return BOARD_HEIGHT - y;
  }
  return 0;
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

function progressGarbage(queue: GarbagePacket[]) {
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
  return { next, remaining };
}

function MicroBoard({ bot, targeted }: { bot: BotState; targeted: boolean }) {
  const cls = [styles.microCard, targeted ? styles.microCardTargeted : '', bot.targetPlayer ? styles.microCardAttacker : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className={styles.microHeader}>
        <span>{bot.name}</span>
        <span className={styles.microBadge}>{'★'.repeat(bot.badges)}</span>
      </div>
      <div className={styles.microBoard}>
        {bot.board.flatMap((row, y) =>
          row.map((cell, x) => (
            <div key={`${bot.id}-${y}-${x}`} className={styles.microCell} style={{ background: cell ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.04)' }} />
          )),
        )}
      </div>
      {!bot.alive && <div className={styles.deadOverlay}>KO</div>}
    </div>
  );
}

function PreviewShape({ type }: { type: PieceType | null }) {
  if (!type) return null;
  const shape = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  }[type];
  return (
    <div className={styles.previewShape} style={{ gridTemplateColumns: `repeat(${shape[0].length}, 10px)` }}>
      {shape.flatMap((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <div key={`${type}-${rowIndex}-${cellIndex}`} className={styles.previewCell} style={{ background: cell ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)' }} />
        )),
      )}
    </div>
  );
}

export default function Tetris99GameProper() {
  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);
  const packetIdRef = useRef(0);
  const rngRef = useRef(makeRng(99009));
  const bagRef = useRef(makeBag(rngRef.current));
  const botBagRef = useRef(makeBag(makeRng(44091)));
  const currentPieceRef = useRef<RhythmPiece | null>(null);
  const holdRef = useRef<PieceType | null>(null);
  const canHoldRef = useRef(true);
  const boardRef = useRef<RhythmBoardState>(createEmptyBoard());
  const queueRef = useRef<PieceType[]>([]);
  const comboRef = useRef(0);
  const linesRef = useRef(0);
  const scoreRef = useRef(0);
  const kosRef = useRef(0);
  const badgePointsRef = useRef(0);
  const badgesRef = useRef(0);
  const incomingRef = useRef<GarbagePacket[]>([]);
  const backToBackRef = useRef(false);
  const lastMoveRotationRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);
  const botsRef = useRef<BotState[]>([]);
  const targetModeRef = useRef<TargetMode>('attackers');
  const stateRef = useRef<MatchState>('countdown');
  const countdownRef = useRef(3);
  const victoryRef = useRef(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    board: createEmptyBoard(),
    currentPiece: null,
    hold: null,
    queue: [],
    lines: 0,
    score: 0,
    combo: 0,
    kos: 0,
    badges: 0,
    badgePoints: 0,
    place: 99,
    attackers: 0,
    incomingGarbage: 0,
    targetMode: 'attackers',
    state: 'countdown',
    countdown: 3,
    gameOver: false,
    victory: false,
    status: 'Get ready',
  });

  function ensureAudio() {
    if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    return audioRef.current;
  }

  function beep(freq: number, duration: number, type: OscillatorType, gainValue: number, end?: number) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playSfx(kind: 'move' | 'rotate' | 'drop' | 'clear' | 'tetris' | 'garbage' | 'ko' | 'start' | 'danger' | 'win' | 'lose') {
    if (kind === 'move') beep(220, 0.04, 'square', 0.025);
    if (kind === 'rotate') beep(440, 0.05, 'triangle', 0.03, 520);
    if (kind === 'drop') beep(180, 0.08, 'sawtooth', 0.05, 80);
    if (kind === 'clear') { beep(660, 0.12, 'triangle', 0.05, 880); beep(990, 0.1, 'triangle', 0.03); }
    if (kind === 'tetris') { beep(660, 0.18, 'triangle', 0.06, 1320); beep(330, 0.18, 'square', 0.035, 165); }
    if (kind === 'garbage') beep(130, 0.14, 'sawtooth', 0.045, 75);
    if (kind === 'ko') { beep(523, 0.14, 'triangle', 0.05, 1047); beep(783, 0.16, 'triangle', 0.04); }
    if (kind === 'start') beep(440, 0.1, 'triangle', 0.05, 880);
    if (kind === 'danger') beep(150, 0.12, 'square', 0.04, 110);
    if (kind === 'win') { beep(523, 0.18, 'triangle', 0.055, 1047); beep(784, 0.22, 'triangle', 0.045, 1568); }
    if (kind === 'lose') beep(220, 0.26, 'sawtooth', 0.05, 82);
  }

  function syncSnapshot(status?: string) {
    const alive = botsRef.current.filter(bot => bot.alive).length;
    const attackers = botsRef.current.filter(bot => bot.alive && bot.targetPlayer).length;
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
      place: alive + (stateRef.current === 'gameOver' && !victoryRef.current ? 0 : 1),
      attackers,
      incomingGarbage: sumGarbage(incomingRef.current),
      targetMode: targetModeRef.current,
      state: stateRef.current,
      countdown: countdownRef.current,
      gameOver: stateRef.current === 'gameOver',
      victory: victoryRef.current,
      status: status ?? snapshot.status,
    });
  }

  function refillQueue() {
    while (queueRef.current.length < 6) queueRef.current.push(bagRef.current());
  }

  function spawnPiece() {
    refillQueue();
    const type = queueRef.current.shift()!;
    refillQueue();
    const piece = createSpawnPiece(type);
    if (!isValidPosition(piece, boardRef.current)) {
      stateRef.current = 'gameOver';
      victoryRef.current = false;
      playSfx('lose');
      syncSnapshot('Eliminated');
      return false;
    }
    currentPieceRef.current = piece;
    canHoldRef.current = true;
    lockMovesRef.current = 0;
    return true;
  }

  function resetGame() {
    boardRef.current = createEmptyBoard();
    currentPieceRef.current = null;
    holdRef.current = null;
    queueRef.current = [];
    comboRef.current = 0;
    linesRef.current = 0;
    scoreRef.current = 0;
    kosRef.current = 0;
    badgePointsRef.current = 0;
    badgesRef.current = 0;
    incomingRef.current = [];
    backToBackRef.current = false;
    lastMoveRotationRef.current = false;
    stateRef.current = 'countdown';
    countdownRef.current = 3;
    victoryRef.current = false;
    rngRef.current = makeRng(99009 + Math.floor(Math.random() * 10000));
    bagRef.current = makeBag(rngRef.current);
    botBagRef.current = makeBag(makeRng(44091 + Math.floor(Math.random() * 10000)));
    botsRef.current = Array.from({ length: BOT_COUNT }, (_, i) => {
      const rng = makeRng(20000 + i * 17 + Math.floor(Math.random() * 10000));
      return {
        id: `bot-${i}`,
        name: `${BOT_NAMES[i % BOT_NAMES.length]}-${String(i + 1).padStart(2, '0')}`,
        board: seedBoard(1 + Math.floor(rng() * 6), rng),
        queue: Array.from({ length: 6 }, () => botBagRef.current()),
        hold: null,
        combo: 0,
        lines: Math.floor(rng() * 18),
        score: Math.floor(rng() * 4000),
        badgePoints: Math.floor(rng() * 2),
        badges: 0,
        alive: true,
        targetPlayer: rng() > 0.74,
        pendingGarbage: [],
      };
    }).map(bot => ({ ...bot, badges: badgeStageFromPoints(bot.badgePoints) }));
    spawnPiece();
    syncSnapshot('Get ready');
  }

  function finish(victory: boolean) {
    if (stateRef.current === 'gameOver') return;
    stateRef.current = 'gameOver';
    victoryRef.current = victory;
    playSfx(victory ? 'win' : 'lose');
    syncSnapshot(victory ? 'Winner!' : 'Game over');
  }

  function queuePacket(lines: number, from: string, target: { pendingGarbage: GarbagePacket[] }) {
    packetIdRef.current += 1;
    target.pendingGarbage.push({ id: `pkt-${packetIdRef.current}`, lines, delay: GARBAGE_DELAY, from });
  }

  function applyPendingGarbage() {
    const progressed = progressGarbage(incomingRef.current);
    incomingRef.current = progressed.queue;
    if (progressed.due <= 0) return;
    boardRef.current = addGarbageRows(boardRef.current, progressed.due, rngRef.current);
    playSfx('garbage');
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
  }

  function chooseTargets() {
    const alive = botsRef.current.filter(bot => bot.alive);
    if (targetModeRef.current === 'attackers') {
      const attackers = alive.filter(bot => bot.targetPlayer);
      return (attackers.length ? attackers : alive.slice(0, 3)).map(bot => bot.id);
    }
    if (targetModeRef.current === 'kos') {
      return [...alive].sort((a, b) => boardDanger(b.board) - boardDanger(a.board)).slice(0, 3).map(bot => bot.id);
    }
    if (targetModeRef.current === 'badges') {
      return [...alive].sort((a, b) => b.badgePoints - a.badgePoints).slice(0, 3).map(bot => bot.id);
    }
    return alive.length ? [alive[(linesRef.current + scoreRef.current) % alive.length].id] : [];
  }

  function sendAttack(lines: number) {
    const canceled = cancelGarbage(incomingRef.current, lines);
    incomingRef.current = canceled.next;
    if (canceled.remaining <= 0) return;
    const targets = chooseTargets();
    const split = Math.max(1, Math.ceil(canceled.remaining / Math.max(1, targets.length)));
    for (const targetId of targets) {
      const bot = botsRef.current.find(entry => entry.id === targetId && entry.alive);
      if (bot) queuePacket(split, 'player', bot);
    }
  }

  function lockCurrentPiece() {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    boardRef.current = lockPiece(currentPieceRef.current, boardRef.current);
    const { newBoard, clearedLines } = clearLines(boardRef.current);
    boardRef.current = newBoard;
    linesRef.current += clearedLines;
    scoreRef.current += [0, 100, 300, 500, 800][clearedLines] ?? 0;
    if (clearedLines > 0) {
      comboRef.current += 1;
      const difficult = clearedLines === 4;
      const attack = computeAttack(clearedLines, comboRef.current, difficult && backToBackRef.current, badgesRef.current);
      backToBackRef.current = difficult;
      sendAttack(attack);
      playSfx(clearedLines === 4 ? 'tetris' : 'clear');
      syncSnapshot(clearedLines === 4 ? 'Tetris' : `${clearedLines} line clear`);
    } else {
      comboRef.current = 0;
      backToBackRef.current = false;
      applyPendingGarbage();
      syncSnapshot('Stack stabilized');
    }
    currentPieceRef.current = null;
    lastMoveRotationRef.current = false;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
    if (stateRef.current === 'playing') spawnPiece();
  }

  function clearLockTimer() {
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }

  function startLockTimer() {
    if (lockTimerRef.current !== null) return;
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      lockCurrentPiece();
    }, LOCK_DELAY);
  }

  function movePiece(dx: number, dy: number) {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const next = { ...currentPieceRef.current, x: currentPieceRef.current.x + dx, y: currentPieceRef.current.y + dy };
    if (!isValidPosition(next, boardRef.current)) {
      if (dy > 0) startLockTimer();
      return;
    }
    currentPieceRef.current = next;
    const grounded = !isValidPosition({ ...next, y: next.y + 1 }, boardRef.current);
    if (grounded) startLockTimer();
    else clearLockTimer();
    playSfx(dx !== 0 ? 'move' : 'drop');
    syncSnapshot();
  }

  function rotatePiece(direction: 1 | -1) {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const rotated = tryRotation(currentPieceRef.current, direction, boardRef.current);
    if (!rotated) return;
    currentPieceRef.current = rotated;
    lastMoveRotationRef.current = true;
    if (!isValidPosition({ ...rotated, y: rotated.y + 1 }, boardRef.current)) startLockTimer();
    playSfx('rotate');
    syncSnapshot();
  }

  function hardDrop() {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return;
    const ghostY = getGhostY(currentPieceRef.current, boardRef.current);
    currentPieceRef.current = { ...currentPieceRef.current, y: ghostY };
    scoreRef.current += Math.max(0, ghostY - currentPieceRef.current.y) * 2;
    playSfx('drop');
    lockCurrentPiece();
  }

  function holdPiece() {
    if (!currentPieceRef.current || !canHoldRef.current || stateRef.current !== 'playing') return;
    const current = currentPieceRef.current.type as PieceType;
    const held = holdRef.current;
    holdRef.current = current;
    canHoldRef.current = false;
    currentPieceRef.current = held ? createSpawnPiece(held) : null;
    if (!held) spawnPiece();
    playSfx('rotate');
    syncSnapshot('Hold');
  }

  useEffect(() => { resetGame(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (stateRef.current !== 'countdown') return;
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = 0;
        stateRef.current = 'playing';
        playSfx('start');
        syncSnapshot('Fight!');
        return;
      }
      playSfx('move');
      syncSnapshot(`Starting in ${countdownRef.current}`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      ensureAudio();
      if (stateRef.current !== 'playing') return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') { event.preventDefault(); movePiece(-1, 0); }
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') { event.preventDefault(); movePiece(1, 0); }
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') { event.preventDefault(); movePiece(0, 1); }
      else if (event.code === 'ArrowUp' || event.code === 'KeyX') { event.preventDefault(); rotatePiece(1); }
      else if (event.code === 'KeyZ') { event.preventDefault(); rotatePiece(-1); }
      else if (event.code === 'KeyC' || event.code === 'ShiftLeft') { event.preventDefault(); holdPiece(); }
      else if (event.code === 'Space') { event.preventDefault(); hardDrop(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const gravity = window.setInterval(() => {
      if (stateRef.current !== 'playing' || !currentPieceRef.current) return;
      const next = { ...currentPieceRef.current, y: currentPieceRef.current.y + 1 };
      if (isValidPosition(next, boardRef.current)) {
        currentPieceRef.current = next;
        syncSnapshot();
      } else {
        startLockTimer();
      }
    }, snapshot.place <= 10 ? 170 : snapshot.place <= 40 ? 260 : 420);
    return () => window.clearInterval(gravity);
  }, [snapshot.place]);

  useEffect(() => {
    const botLoop = window.setInterval(() => {
      if (stateRef.current !== 'playing') return;
      for (const bot of botsRef.current) {
        if (!bot.alive) continue;
        const progressed = progressGarbage(bot.pendingGarbage);
        bot.pendingGarbage = progressed.queue;
        if (progressed.due > 0) {
          bot.board = addGarbageRows(bot.board, progressed.due, makeRng(progressed.due + bot.lines + bot.score));
        }
        const current = bot.queue.shift()!;
        bot.queue.push(botBagRef.current());
        const next = bot.queue[0];
        const ai = boardToAi(bot.board);
        const difficulty = snapshot.place > 60 ? AI_DIFFICULTIES.medium : snapshot.place > 20 ? AI_DIFFICULTIES.hard : AI_DIFFICULTIES.expert;
        const move = findBestMove(current, ai, difficulty, next);
        if (!move) {
          bot.alive = false;
          continue;
        }
        const piece = createSpawnPiece(current);
        const placed = { ...piece, rotation: move.rotation, x: move.x, y: getGhostY({ ...piece, rotation: move.rotation, x: move.x }, bot.board) };
        const locked = lockPiece(placed, bot.board);
        const { newBoard, clearedLines } = clearLines(locked);
        bot.board = newBoard;
        if (clearedLines > 0) {
          bot.combo += 1;
          bot.lines += clearedLines;
          bot.score += [0, 100, 300, 500, 800][clearedLines] ?? 0;
          const attack = computeAttack(clearedLines, bot.combo, clearedLines === 4, bot.badges);
          bot.targetPlayer = boardDanger(bot.board) >= 14 || bot.badges >= 2 || Math.random() > 0.8;
          if (bot.targetPlayer && attack > 0) queuePacket(attack, bot.id, { pendingGarbage: incomingRef.current });
        } else {
          bot.combo = 0;
        }
        if (boardDanger(bot.board) >= 22) {
          bot.alive = false;
          if (bot.pendingGarbage.some(packet => packet.from === 'player')) {
            kosRef.current += 1;
            badgePointsRef.current += 1 + bot.badges;
            badgesRef.current = badgeStageFromPoints(badgePointsRef.current);
            playSfx('ko');
          }
        }
      }
      applyPendingGarbage();
      if (boardDanger(boardRef.current) >= 22) {
        finish(false);
      } else if (botsRef.current.every(bot => !bot.alive)) {
        finish(true);
      } else {
        syncSnapshot(boardDanger(boardRef.current) >= 18 ? 'Danger zone' : 'Battle in progress');
      }
    }, snapshot.place <= 10 ? 200 : snapshot.place <= 40 ? 330 : 520);
    return () => window.clearInterval(botLoop);
  }, [snapshot.place]);

  const targetedBots = useMemo(() => {
    const alive = botsRef.current.filter(bot => bot.alive);
    if (snapshot.targetMode === 'attackers') return new Set(alive.filter(bot => bot.targetPlayer).map(bot => bot.id));
    if (snapshot.targetMode === 'kos') return new Set([...alive].sort((a, b) => boardDanger(b.board) - boardDanger(a.board)).slice(0, 3).map(bot => bot.id));
    if (snapshot.targetMode === 'badges') return new Set([...alive].sort((a, b) => b.badgePoints - a.badgePoints).slice(0, 3).map(bot => bot.id));
    return new Set(alive.slice(0, 1).map(bot => bot.id));
  }, [snapshot.targetMode, snapshot.place, snapshot.attackers]);

  const leftBots = botsRef.current.slice(0, 49);
  const rightBots = botsRef.current.slice(49);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.eyebrow}><span className={styles.eyebrowDot} />Rhythmia Board + Proper AI</div>
            <h1 className={styles.title}>Ninety-Nine Boards, One Survivor.</h1>
            <p className={styles.subtitle}>The player field now reuses Rhythmia’s real board component and movement rules. CPU rivals run board-based placement AI, send more playable garbage pressure, and the match ends on a proper restart dialog.</p>
            <div className={styles.actionRow}>
              <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Restart Match</button>
              <button className={styles.ghostButton} onClick={() => router.push('/games')}>Back to Games</button>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><span className={styles.statLabel}>Place</span><span className={styles.statValue}>#{snapshot.place}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel}>Attackers</span><span className={styles.statValue}>{snapshot.attackers}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel}>Badges</span><span className={styles.statValue}>{snapshot.badges}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel}>State</span><span className={styles.statValue}>{snapshot.state === 'countdown' ? snapshot.countdown : snapshot.gameOver ? (snapshot.victory ? 'WIN' : 'OUT') : 'LIVE'}</span></div>
            </div>
          </div>
        </div>

        <div className={styles.arena}>
          <div className={styles.sidePanel}>{leftBots.map(bot => <MicroBoard key={bot.id} bot={bot} targeted={targetedBots.has(bot.id)} />)}</div>
          <div className={styles.boardStack}>
            <div className={styles.heroCard}>
              <div className={styles.heroHeader}>
                <div><div className={styles.heroTitle}>Player Board</div><div className={styles.heroSubtle}>{snapshot.status}</div></div>
                <div className={styles.heroSubtle}>{targetLabel(snapshot.targetMode)} targeting</div>
              </div>
              <div className={styles.heroLayout}>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Hold</span><div className={styles.previewBox}><PreviewShape type={snapshot.hold} /></div></div>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Badge Bonus</span><div className={styles.heroSubtle}>{badgeMultiplier(snapshot.badges).toFixed(2)}x</div></div>
                </div>
                <div className={`${styles.boardFrame} ${boardDanger(snapshot.board) >= 18 ? styles.boardFrameDanger : ''}`}>
                  <div className={styles.garbageRail}><div className={styles.garbageFill} style={{ height: `${Math.min(100, snapshot.incomingGarbage * 8)}%` }} /></div>
                  <RhythmBoard board={snapshot.board} currentPiece={snapshot.currentPiece} boardBeat={false} boardShake={false} combo={snapshot.combo} beatPhase={0} />
                </div>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Next</span><div className={styles.previewBox}>{snapshot.queue.map((type, i) => <PreviewShape key={`${type}-${i}`} type={type} />)}</div></div>
                </div>
              </div>
            </div>
            <div className={styles.hudCard}>
              <div className={styles.hudGrid}>
                <div className={styles.hudMetric}><span className={styles.statLabel}>Score</span><span className={styles.hudValue}>{snapshot.score.toLocaleString()}</span></div>
                <div className={styles.hudMetric}><span className={styles.statLabel}>Lines</span><span className={styles.hudValue}>{snapshot.lines}</span></div>
                <div className={styles.hudMetric}><span className={styles.statLabel}>KOs</span><span className={styles.hudValue}>{snapshot.kos}</span></div>
              </div>
              <div className={styles.targetRow}>
                {(['random', 'attackers', 'kos', 'badges'] as TargetMode[]).map(mode => (
                  <button key={mode} className={`${styles.targetButton} ${snapshot.targetMode === mode ? styles.targetActive : ''}`} onClick={() => { ensureAudio(); targetModeRef.current = mode; syncSnapshot(`${targetLabel(mode)} selected`); }}>{targetLabel(mode)}</button>
                ))}
              </div>
            </div>
            <div className={styles.queueCard}>
              <span className={styles.panelHeader}>Systems</span>
              <div className={styles.queueList}>
                <div className={styles.queueItem}><span>Incoming garbage</span><strong>{snapshot.incomingGarbage}</strong></div>
                <div className={styles.queueItem}><span>Badge points</span><strong>{snapshot.badgePoints}</strong></div>
                <div className={styles.queueItem}><span>Target mode</span><strong>{targetLabel(snapshot.targetMode)}</strong></div>
                <div className={styles.queueItem}><span>Status</span><strong>{snapshot.status}</strong></div>
              </div>
            </div>
            {snapshot.gameOver && (
              <div className={styles.resultCard}>
                <h2 className={styles.resultTitle}>{snapshot.victory ? 'Victory Royale' : 'Game Over'}</h2>
                <p className={styles.resultBody}>{snapshot.victory ? `You closed the lobby with ${snapshot.kos} KOs and ${snapshot.badgePoints} badge points.` : `You finished #${snapshot.place} with ${snapshot.kos} KOs and ${snapshot.badgePoints} badge points.`}</p>
                <div className={styles.actionRow}>
                  <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Play Again</button>
                  <button className={styles.ghostButton} onClick={() => router.push('/games')}>Leave Match</button>
                </div>
              </div>
            )}
          </div>
          <div className={styles.sidePanel}>{rightBots.map(bot => <MicroBoard key={bot.id} bot={bot} targeted={targetedBots.has(bot.id)} />)}</div>
        </div>
      </div>
    </div>
  );
}
