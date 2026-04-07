'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Board as RhythmBoardState, Piece as RhythmPiece } from '@/components/rhythmia/tetris/types';
import {
  createEmptyBoard,
  createSpawnPiece,
  getShape,
  getGhostY,
  isValidPosition,
  lockPiece,
  clearLines,
  tryRotation,
  applyGarbageRise,
} from '@/components/rhythmia/tetris/utils/boardUtils';
import { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ZONE, LOCK_DELAY } from '@/components/rhythmia/tetris/constants';
import { ARR, DAS, MAX_LOCK_MOVES, SOFT_DROP_SPEED } from '@/components/rhythmia/multiplayer-battle-engine';
import { TetrisAIGame, getDifficultyForRank } from '@/lib/ranked/TetrisAI';
import { useLayoutConfig } from '@/lib/layout/context';
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
  targetMode: TargetMode;
  targetIds: string[];
  pendingGarbage: GarbagePacket[];
  lastDamagedBy: string | null;
  aiPoints: number;
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

type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  self: boolean;
};

type PlayerCommand =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'rotate'; direction: 1 | -1 }
  | { type: 'hold' }
  | { type: 'hardDrop' }
  | { type: 'target'; mode: TargetMode };

const BOT_COUNT = 98;
const GARBAGE_DELAY = 3;
const PLAYER_ID = 'player';
const SERVER_ID = 'server';
const BOT_NAMES = ['ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT', 'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE'];
const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const POST_MATCH_CHAT_LINES = ['gg', 'gg wp', 'good game', 'close one', 'well played', 'ggs'];
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
const AI_COLOR_TO_PIECE: Record<string, PieceType | 'garbage'> = {
  '#00f0f0': 'I',
  '#f0f000': 'O',
  '#a000f0': 'T',
  '#00f000': 'S',
  '#f00000': 'Z',
  '#0000f0': 'J',
  '#f0a000': 'L',
  '#555555': 'garbage',
  '#666666': 'garbage',
};
const AI_COLOR_ENTRIES = Object.entries(AI_COLOR_TO_PIECE).filter(([, type]) => type !== 'garbage') as Array<[string, PieceType]>;

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

function hexToRgb(color: string) {
  const hex = color.trim().replace('#', '');
  if (hex.length !== 6) return null;
  const value = Number.parseInt(hex, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function pieceTypeFromAiColor(color: string): PieceType | 'garbage' {
  const normalized = color.trim().toLowerCase();
  const exact = AI_COLOR_TO_PIECE[normalized];
  if (exact) return exact;

  const rgb = hexToRgb(normalized);
  if (!rgb) return 'T';

  let bestType: PieceType = 'T';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [hex, type] of AI_COLOR_ENTRIES) {
    const candidate = hexToRgb(hex);
    if (!candidate) continue;
    const distance =
      (candidate.r - rgb.r) ** 2 +
      (candidate.g - rgb.g) ** 2 +
      (candidate.b - rgb.b) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestType = type;
    }
  }

  return bestType;
}

function getDisplayCellColor(cell: string | null) {
  if (!cell) return 'rgba(255,255,255,0.04)';
  return PLAYER_COLORS[cell] ?? PLAYER_COLORS.T;
}

function aiBoardToRhythmBoard(board: ({ color: string } | null)[][]): RhythmBoardState {
  const visible = board.map(row =>
    row.map(cell => {
      if (!cell) return null;
      return pieceTypeFromAiColor(cell.color);
    }),
  );
  return [...Array.from({ length: BUFFER_ZONE }, () => Array(BOARD_WIDTH).fill(null)), ...visible];
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
  let lastSource: string | null = null;
  const next = queue
    .map(packet => ({ ...packet, delay: packet.delay - 1 }))
    .filter(packet => {
      if (packet.delay <= 0) {
        due += packet.lines;
        lastSource = packet.from;
        return false;
      }
      return true;
    });
  return { queue: next, due, lastSource };
}

function attackerBonus(count: number) {
  if (count <= 1) return 0;
  if (count === 2) return 1;
  if (count === 3) return 3;
  if (count === 4) return 5;
  if (count === 5) return 7;
  return 9;
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
  const cls = [styles.microCard, targeted ? styles.microCardTargeted : '', bot.targetIds.includes(PLAYER_ID) ? styles.microCardAttacker : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className={styles.microHeader}>
        <span>{bot.name}</span>
        <span className={styles.microBadge}>{'★'.repeat(bot.badges)}</span>
      </div>
      <div className={styles.microBoard}>
        {bot.board.flatMap((row, y) =>
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
  if (!type) return null;
  const pieceColor = PLAYER_COLORS[type] ?? PLAYER_COLORS.T;
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
          <div key={`${type}-${rowIndex}-${cellIndex}`} className={styles.previewCell} style={{ background: cell ? pieceColor : 'rgba(255,255,255,0.06)' }} />
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
      const ghostY = getGhostY(currentPiece, board);

      if (ghostY !== currentPiece.y) {
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const boardY = ghostY + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH && display[boardY][boardX] === null) {
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
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            display[boardY][boardX] = currentPiece.type;
          }
        }
      }
    }

    return display.slice(BUFFER_ZONE);
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
  const isOnGroundRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const dasTimerRef = useRef<number | null>(null);
  const arrTimerRef = useRef<number | null>(null);
  const softDropTimerRef = useRef<number | null>(null);
  const lastDirRef = useRef<'left' | 'right' | ''>('');
  const botsRef = useRef<BotState[]>([]);
  const botAiGamesRef = useRef(new Map<string, TetrisAIGame>());
  const chatIdRef = useRef(0);
  const chatTimersRef = useRef<number[]>([]);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const playerCommandsRef = useRef<PlayerCommand[]>([]);
  const targetModeRef = useRef<TargetMode>('attackers');
  const stateRef = useRef<MatchState>('countdown');
  const countdownRef = useRef(3);
  const victoryRef = useRef(false);
  const lastDamagedByRef = useRef<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('GG');
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

  function clearPostMatchChatTimers() {
    for (const timer of chatTimersRef.current) window.clearTimeout(timer);
    chatTimersRef.current = [];
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

  function appendServerChatMessage(authorId: string, authorName: string, text: string, self = false) {
    chatIdRef.current += 1;
    setChatMessages(prev => [...prev, { id: `chat-${chatIdRef.current}`, authorId, authorName, text, self }].slice(-20));
  }

  function schedulePostMatchChat(victory: boolean) {
    clearPostMatchChatTimers();
    const speakers = [...botsRef.current]
      .filter(bot => bot.badges > 0 || bot.alive || bot.targetIds.includes(PLAYER_ID) || bot.lastDamagedBy === PLAYER_ID)
      .sort((a, b) => Number(b.alive) - Number(a.alive) || b.badgePoints - a.badgePoints || b.score - a.score)
      .slice(0, 8);

    speakers.forEach((bot, index) => {
      const delay = 500 + index * 420 + Math.floor(rngRef.current() * 260);
      const lineIndex = (index + bot.badges + (victory ? 1 : 0)) % POST_MATCH_CHAT_LINES.length;
      const timer = window.setTimeout(() => {
        if (stateRef.current !== 'gameOver') return;
        appendServerChatMessage(bot.id, bot.name, POST_MATCH_CHAT_LINES[lineIndex] ?? 'gg');
      }, delay);
      chatTimersRef.current.push(timer);
    });
  }

  function submitChatMessage() {
    const text = chatInput.trim();
    if (!text || stateRef.current !== 'gameOver') return;
    appendServerChatMessage(PLAYER_ID, 'YOU', text, true);
    setChatInput('');
  }

  function enqueuePlayerCommand(command: PlayerCommand) {
    playerCommandsRef.current.push(command);
  }

  function syncSnapshot(status?: string) {
    const alive = botsRef.current.filter(bot => bot.alive).length;
    const attackers = botsRef.current.filter(bot => bot.alive && bot.targetIds.includes(PLAYER_ID)).length;
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
      finish(false);
      return false;
    }
    currentPieceRef.current = piece;
    canHoldRef.current = true;
    lockMovesRef.current = 0;
    isOnGroundRef.current = false;
    return true;
  }

  function resetGame() {
    for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
    botAiGamesRef.current.clear();
    clearPostMatchChatTimers();
    clearDAS();
    clearSoftDrop();
    keysRef.current.clear();
    playerCommandsRef.current = [];
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
    lastDamagedByRef.current = null;
    setChatMessages([]);
    setChatInput('GG');
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
      const aiPoints = [900, 2400, 6200, 11000][Math.floor(rng() * 4)] ?? 2400;
      return {
        id: `bot-${i}`,
        name: `${BOT_NAMES[i % BOT_NAMES.length]}-${String(i + 1).padStart(2, '0')}`,
        board: createEmptyBoard(),
        queue: Array.from({ length: 6 }, () => botBagRef.current()),
        hold: null,
        combo: 0,
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
      };
    }).map(bot => ({ ...bot, badges: badgeStageFromPoints(bot.badgePoints) }));
    spawnPiece();
    syncSnapshot('Get ready');
  }

  function finish(victory: boolean) {
    if (stateRef.current === 'gameOver') return;
    for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
    botAiGamesRef.current.clear();
    clearPostMatchChatTimers();
    clearDAS();
    clearSoftDrop();
    keysRef.current.clear();
    stateRef.current = 'gameOver';
    victoryRef.current = victory;
    playSfx(victory ? 'win' : 'lose');
    syncSnapshot(victory ? 'Winner!' : 'Game over');
    setChatInput('GG');
    appendServerChatMessage(SERVER_ID, 'SERVER', 'Match finalized. Post-match chat is live.');
    schedulePostMatchChat(victory);
  }

  function queuePacket(lines: number, from: string, target: { pendingGarbage: GarbagePacket[] }) {
    packetIdRef.current += 1;
    target.pendingGarbage.push({ id: `pkt-${packetIdRef.current}`, lines, delay: GARBAGE_DELAY, from });
  }

  function applyPendingGarbage() {
    const progressed = progressGarbage(incomingRef.current);
    incomingRef.current = progressed.queue;
    if (progressed.due <= 0) return;
    lastDamagedByRef.current = progressed.lastSource;
    const { newBoard, adjustedPiece } = applyGarbageRise(boardRef.current, currentPieceRef.current, progressed.due, rngRef.current);
    boardRef.current = newBoard;
    currentPieceRef.current = adjustedPiece;
    playSfx('garbage');
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
  }

  function getBotById(id: string) {
    return botsRef.current.find(bot => bot.id === id) ?? null;
  }

  function getAliveOpponentIds(sourceId: string) {
    const ids = botsRef.current.filter(bot => bot.alive && bot.id !== sourceId).map(bot => bot.id);
    if (sourceId !== PLAYER_ID && stateRef.current !== 'gameOver') ids.unshift(PLAYER_ID);
    return ids;
  }

  function candidateDanger(id: string) {
    if (id === PLAYER_ID) return boardDanger(boardRef.current) + sumGarbage(incomingRef.current) * 2;
    const bot = getBotById(id);
    if (!bot || !bot.alive) return -1;
    return boardDanger(bot.board) + sumGarbage(bot.pendingGarbage) * 2;
  }

  function candidateBadges(id: string) {
    if (id === PLAYER_ID) return badgePointsRef.current + badgesRef.current * 10;
    const bot = getBotById(id);
    if (!bot || !bot.alive) return -1;
    return bot.badgePoints + bot.badges * 10;
  }

  function chooseWeightedRandomTarget(candidates: string[]) {
    if (!candidates.length) return [];
    const weighted = candidates.map(id => ({
      id,
      weight: Math.max(1, (id === PLAYER_ID ? 2 : 1) + Math.floor(candidateDanger(id) / 4) + Math.floor(candidateBadges(id) / 3)),
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rngRef.current() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return [entry.id];
    }
    return [weighted[weighted.length - 1]!.id];
  }

  function chooseTargets(sourceId: string, mode: TargetMode, playerTargets = new Set<string>()) {
    const candidates = getAliveOpponentIds(sourceId);
    if (!candidates.length) return [];
    if (mode === 'attackers') {
      const attackers = botsRef.current
        .filter(bot => bot.alive && bot.id !== sourceId && bot.targetIds.includes(sourceId))
        .map(bot => bot.id);
      if (sourceId !== PLAYER_ID && playerTargets.has(sourceId)) attackers.push(PLAYER_ID);
      const uniqueAttackers = [...new Set(attackers)].filter(id => candidates.includes(id));
      return uniqueAttackers.length ? uniqueAttackers : chooseWeightedRandomTarget(candidates);
    }
    if (mode === 'kos') {
      return [...candidates].sort((a, b) => candidateDanger(b) - candidateDanger(a) || candidateBadges(a) - candidateBadges(b)).slice(0, 1);
    }
    if (mode === 'badges') {
      return [...candidates].sort((a, b) => candidateBadges(b) - candidateBadges(a) || candidateDanger(b) - candidateDanger(a)).slice(0, 1);
    }
    return chooseWeightedRandomTarget(candidates);
  }

  function updateBotTargeting(bot: BotState, playerTargets: Set<string>) {
    const pressure = boardDanger(bot.board) + sumGarbage(bot.pendingGarbage);
    if (pressure >= 16) bot.targetMode = 'attackers';
    else if (bot.badges >= 2) bot.targetMode = 'badges';
    else if (botsRef.current.some(entry => entry.alive && entry.id !== bot.id && candidateDanger(entry.id) >= 16)) bot.targetMode = 'kos';
    else if (rngRef.current() > 0.94) bot.targetMode = 'random';
    bot.targetIds = chooseTargets(bot.id, bot.targetMode, playerTargets);
  }

  function awardKo(killerId: string | null, victimBadges: number) {
    if (!killerId) return;
    if (killerId === PLAYER_ID) {
      kosRef.current += 1;
      badgePointsRef.current += 1 + victimBadges;
      badgesRef.current = badgeStageFromPoints(badgePointsRef.current);
      playSfx('ko');
      return;
    }
    const killer = getBotById(killerId);
    if (!killer || !killer.alive) return;
    killer.badgePoints += 1 + victimBadges;
    killer.badges = badgeStageFromPoints(killer.badgePoints);
  }

  function eliminateBot(bot: BotState) {
    if (!bot.alive) return;
    botAiGamesRef.current.get(bot.id)?.stop();
    botAiGamesRef.current.delete(bot.id);
    bot.alive = false;
    bot.targetIds = [];
    awardKo(bot.lastDamagedBy, bot.badges);
  }

  function sendAttack(lines: number) {
    const canceled = cancelGarbage(incomingRef.current, lines);
    incomingRef.current = canceled.next;
    const targets = chooseTargets(PLAYER_ID, targetModeRef.current);
    let outgoing = canceled.remaining;
    if (targetModeRef.current === 'attackers') outgoing += attackerBonus(targets.length);
    if (outgoing <= 0 || !targets.length) return;
    for (const targetId of targets) {
      const bot = getBotById(targetId);
      if (bot?.alive) queuePacket(outgoing, PLAYER_ID, bot);
    }
  }

  function routeBotAttack(botId: string, lines: number) {
    const bot = getBotById(botId);
    if (!bot || !bot.alive || lines <= 0) return;
    let outgoing = lines;
    if (bot.targetMode === 'attackers') outgoing += attackerBonus(bot.targetIds.length);
    if (outgoing <= 0) return;
    for (const targetId of bot.targetIds) {
      if (targetId === PLAYER_ID) queuePacket(outgoing, bot.id, { pendingGarbage: incomingRef.current });
      else {
        const targetBot = getBotById(targetId);
        if (targetBot?.alive) queuePacket(outgoing, bot.id, targetBot);
      }
    }
  }

  function startBotAiGames() {
    for (const bot of botsRef.current) {
      if (!bot.alive || botAiGamesRef.current.has(bot.id)) continue;
      const aiGame = new TetrisAIGame(30000 + Number(bot.id.replace('bot-', '')) * 97, getDifficultyForRank(bot.aiPoints), {
        onBoardUpdate: (board, score, lines, combo, piece, hold) => {
          const currentBot = getBotById(bot.id);
          if (!currentBot || !currentBot.alive) return;
          currentBot.board = aiBoardToRhythmBoard(board);
          currentBot.score = score;
          currentBot.lines = lines;
          currentBot.combo = combo;
          currentBot.hold = (hold as PieceType | null | undefined) ?? null;
          if (piece && currentBot.queue.length > 0) {
            currentBot.queue = [...currentBot.queue.slice(1), piece as PieceType];
          }
        },
        onGarbage: (lines) => {
          routeBotAttack(bot.id, lines);
        },
        onGameOver: () => {
          const currentBot = getBotById(bot.id);
          if (currentBot) eliminateBot(currentBot);
        },
      });
      botAiGamesRef.current.set(bot.id, aiGame);
      aiGame.start();
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
    isOnGroundRef.current = false;
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
    if (stateRef.current === 'playing') spawnPiece();
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
    if (currentPieceRef.current && !isValidPosition({ ...currentPieceRef.current, y: currentPieceRef.current.y + 1 }, boardRef.current)) {
      isOnGroundRef.current = true;
      startLockTimer();
    }
  }

  function moveHorizontal(dx: number) {
    if (!currentPieceRef.current || stateRef.current !== 'playing') return false;
    const next = { ...currentPieceRef.current, x: currentPieceRef.current.x + dx };
    if (!isValidPosition(next, boardRef.current)) return false;
    currentPieceRef.current = next;
    lastMoveRotationRef.current = false;
    playSfx('move');
    const grounded = !isValidPosition({ ...next, y: next.y + 1 }, boardRef.current);
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
    if (isValidPosition(next, boardRef.current)) {
      currentPieceRef.current = next;
      lastMoveRotationRef.current = false;
      const grounded = !isValidPosition({ ...next, y: next.y + 1 }, boardRef.current);
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
    const rotated = tryRotation(currentPieceRef.current, direction, boardRef.current);
    if (!rotated) return;
    currentPieceRef.current = rotated;
    lastMoveRotationRef.current = true;
    const grounded = !isValidPosition({ ...rotated, y: rotated.y + 1 }, boardRef.current);
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
    lockMovesRef.current = 0;
    clearLockTimer();
    if (!held) spawnPiece();
    playSfx('rotate');
    syncSnapshot('Hold');
  }

  function processPlayerCommands() {
    if (stateRef.current !== 'playing') {
      playerCommandsRef.current = [];
      return;
    }

    const commands = playerCommandsRef.current.splice(0);
    for (const command of commands) {
      if (command.type === 'move') {
        if (command.dx !== 0) moveHorizontal(command.dx);
        else if (command.dy > 0) moveDown();
      }
      else if (command.type === 'rotate') rotatePiece(command.direction);
      else if (command.type === 'hold') holdPiece();
      else if (command.type === 'hardDrop') hardDrop();
      else if (command.type === 'target') {
        targetModeRef.current = command.mode;
        syncSnapshot(`${targetLabel(command.mode)} selected`);
      }
    }
  }

  useEffect(() => {
    setFullscreen(true);
    resetGame();
    return () => {
      clearPostMatchChatTimers();
      setFullscreen(false);
    };
  }, [setFullscreen]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatMessages]);

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
    const startDAS = (dir: 'left' | 'right', dx: number) => {
      clearDAS();
      lastDirRef.current = dir;
      enqueuePlayerCommand({ type: 'move', dx, dy: 0 });
      dasTimerRef.current = window.setTimeout(() => {
        dasTimerRef.current = null;
        arrTimerRef.current = window.setInterval(() => enqueuePlayerCommand({ type: 'move', dx, dy: 0 }), ARR);
      }, DAS);
    };

    function onKeyDown(event: KeyboardEvent) {
      ensureAudio();
      if (stateRef.current !== 'playing') return;
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
        clearSoftDrop();
        softDropTimerRef.current = window.setInterval(() => enqueuePlayerCommand({ type: 'move', dx: 0, dy: 1 }), SOFT_DROP_SPEED);
      }
      else if (event.code === 'ArrowUp' || event.code === 'KeyX') {
        event.preventDefault();
        enqueuePlayerCommand({ type: 'rotate', direction: 1 });
      }
      else if (event.code === 'KeyZ') {
        event.preventDefault();
        enqueuePlayerCommand({ type: 'rotate', direction: -1 });
      }
      else if (event.code === 'KeyC' || event.code === 'ShiftLeft') {
        event.preventDefault();
        enqueuePlayerCommand({ type: 'hold' });
      }
      else if (event.code === 'Space') {
        event.preventDefault();
        enqueuePlayerCommand({ type: 'hardDrop' });
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.code);

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
    const serverTick = window.setInterval(() => {
      processPlayerCommands();
    }, 32);
    return () => window.clearInterval(serverTick);
  }, []);

  useEffect(() => {
    const gravity = window.setInterval(() => {
      if (stateRef.current !== 'playing' || !currentPieceRef.current) return;
      moveDown();
    }, snapshot.place <= 10 ? 170 : snapshot.place <= 40 ? 260 : 420);
    return () => window.clearInterval(gravity);
  }, [snapshot.place]);

  useEffect(() => {
    if (snapshot.state !== 'playing') {
      for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
      botAiGamesRef.current.clear();
      return;
    }

    startBotAiGames();

    const botLoop = window.setInterval(() => {
      if (stateRef.current !== 'playing') return;
      const playerTargets = new Set(chooseTargets(PLAYER_ID, targetModeRef.current));
      for (const bot of botsRef.current) {
        if (!bot.alive) continue;
        updateBotTargeting(bot, playerTargets);
        const progressed = progressGarbage(bot.pendingGarbage);
        bot.pendingGarbage = progressed.queue;
        if (progressed.due > 0) {
          bot.lastDamagedBy = progressed.lastSource;
          botAiGamesRef.current.get(bot.id)?.addGarbage(progressed.due);
        }
        if (boardDanger(bot.board) >= 22) eliminateBot(bot);
      }
      applyPendingGarbage();
      if (boardDanger(boardRef.current) >= 22) {
        awardKo(lastDamagedByRef.current, badgesRef.current);
        finish(false);
      } else if (botsRef.current.every(bot => !bot.alive)) {
        finish(true);
      } else {
        syncSnapshot(boardDanger(boardRef.current) >= 18 ? 'Danger zone' : 'Battle in progress');
      }
    }, 260);
    return () => {
      window.clearInterval(botLoop);
      for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
      botAiGamesRef.current.clear();
    };
  }, [snapshot.state]);

  const targetedBots = useMemo(() => {
    return new Set(chooseTargets(PLAYER_ID, snapshot.targetMode));
  }, [snapshot.targetMode, snapshot.place, snapshot.attackers]);

  const leftBots = botsRef.current.slice(0, 49);
  const rightBots = botsRef.current.slice(49);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
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
                  <div className={styles.boardStats}>
                    <div className={styles.boardStat}><span className={styles.statLabel}>Place</span><strong className={styles.boardStatValue}>#{snapshot.place}</strong></div>
                    <div className={styles.boardStat}><span className={styles.statLabel}>Attackers</span><strong className={styles.boardStatValue}>{snapshot.attackers}</strong></div>
                    <div className={styles.boardStat}><span className={styles.statLabel}>Badges</span><strong className={styles.boardStatValue}>{snapshot.badges}</strong></div>
                    <div className={styles.boardStat}><span className={styles.statLabel}>State</span><strong className={styles.boardStatValue}>{snapshot.state === 'countdown' ? snapshot.countdown : snapshot.gameOver ? (snapshot.victory ? 'WIN' : 'OUT') : 'LIVE'}</strong></div>
                  </div>
                  <div className={styles.boardPlayfield}>
                    <div className={styles.garbageRail}><div className={styles.garbageFill} style={{ height: `${Math.min(100, snapshot.incomingGarbage * 8)}%` }} /></div>
                    <PlayerBoard board={snapshot.board} currentPiece={snapshot.currentPiece} />
                    {snapshot.gameOver && (
                      <div className={styles.boardGameOver}>
                        <h2 className={styles.boardGameOverTitle}>{snapshot.victory ? 'Victory Royale' : 'Game Over'}</h2>
                        <p className={styles.boardGameOverBody}>
                          {snapshot.victory
                            ? `You closed the lobby with ${snapshot.kos} KOs and ${snapshot.badgePoints} badge points.`
                            : `You finished #${snapshot.place} with ${snapshot.kos} KOs and ${snapshot.badgePoints} badge points.`}
                        </p>
                        <div className={styles.actionRow}>
                          <button className={styles.button} onClick={() => { ensureAudio(); resetGame(); }}>Play Again</button>
                          <button className={styles.ghostButton} onClick={() => router.push('/games')}>Leave Match</button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  <button key={mode} className={`${styles.targetButton} ${snapshot.targetMode === mode ? styles.targetActive : ''}`} onClick={() => { ensureAudio(); enqueuePlayerCommand({ type: 'target', mode }); }}>{targetLabel(mode)}</button>
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
          </div>
          <div className={styles.sidePanel}>{rightBots.map(bot => <MicroBoard key={bot.id} bot={bot} targeted={targetedBots.has(bot.id)} />)}</div>
        </div>
      </div>
      <aside className={styles.chatDock}>
        <div className={styles.chatDockHeader}>
          <span>Server Chat</span>
          <span className={styles.chatDockState}>{snapshot.gameOver ? 'Live' : 'Standby'}</span>
        </div>
        <div ref={chatLogRef} className={styles.chatLog}>
          {chatMessages.length > 0 ? chatMessages.map(message => (
            <div key={message.id} className={`${styles.chatMessage} ${message.self ? styles.chatMessageSelf : ''} ${message.authorId === SERVER_ID ? styles.chatMessageServer : ''}`}>
              <span className={styles.chatAuthor}>{message.authorName}</span>
              <span className={styles.chatText}>{message.text}</span>
            </div>
          )) : (
            <div className={styles.chatEmpty}>{snapshot.gameOver ? 'Say GG after the match.' : 'Post-match chat unlocks when the match ends.'}</div>
          )}
        </div>
        <form
          className={styles.chatForm}
          onSubmit={(event) => {
            event.preventDefault();
            submitChatMessage();
          }}
        >
          <input
            className={styles.chatInput}
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            maxLength={48}
            placeholder={snapshot.gameOver ? 'Say GG...' : 'Chat unlocks after game end'}
            disabled={!snapshot.gameOver}
          />
          <button type="submit" className={styles.chatSend} disabled={!snapshot.gameOver}>Send</button>
        </form>
      </aside>
    </div>
  );
}
