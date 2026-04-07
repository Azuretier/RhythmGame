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
import { TetrisAIGame, getDifficultyForRank, type AIPlacementResult } from '@/lib/ranked/TetrisAI';
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
  | 'tSpinMini'
  | 'tSpinSingle'
  | 'tSpinDouble'
  | 'tSpinTriple';

type GarbagePacket = {
  id: string;
  lines: number;
  delay: number;
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
  gameOver: boolean;
  victory: boolean;
  status: string;
};

const BOT_COUNT = 98;
const GARBAGE_DELAY = 3;
const MAX_PENDING_GARBAGE = 12;
const PLAYER_ID = 'player';
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

const badgeStageFromPoints = (points: number) => (points >= 16 ? 4 : points >= 8 ? 3 : points >= 4 ? 2 : points >= 2 ? 1 : 0);
const badgeBoostPercentFromStage = (stage: number) => ([0, 25, 50, 75, 100][Math.max(0, Math.min(4, stage))] ?? 0);

function getAttackClearType(clearedLines: number, tSpin: 'none' | 'mini' | 'full'): AttackClearType {
  if (tSpin === 'mini' && clearedLines > 0) return 'tSpinMini';
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
    case 'tSpinMini':
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
    || clearType === 'tSpinMini'
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

function detectPlayerTSpin(piece: RhythmPiece, board: RhythmBoardState, wasRotation: boolean): 'none' | 'mini' | 'full' {
  if (piece.type !== 'T' || !wasRotation) return 'none';

  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners: Array<[number, number]> = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];

  let filledCorners = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y]?.[x]) {
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
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y]?.[x]) {
      frontFilled += 1;
    }
  }

  return frontFilled >= 2 ? 'full' : 'mini';
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

function tickGarbageQueue(queue: GarbagePacket[]) {
  return queue.map(packet => (packet.delay > 0 ? { ...packet, delay: packet.delay - 1 } : packet));
}

function collectNextReadyGarbage(queue: GarbagePacket[]) {
  let due = 0;
  let lastSource: string | null = null;
  let consumed = false;
  const next: GarbagePacket[] = [];

  for (const packet of queue) {
    if (!consumed && packet.delay <= 0) {
      due = packet.lines;
      lastSource = packet.from;
      consumed = true;
      continue;
    }
    next.push(packet);
  }

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

function getPacketTimerProgress(packet: GarbagePacket) {
  return Math.max(0, Math.min(1, (GARBAGE_DELAY - packet.delay) / Math.max(1, GARBAGE_DELAY)));
}

function IncomingGarbageRail({ packets }: { packets: GarbagePacket[] }) {
  const filledBlocks = packets.flatMap(packet =>
    Array.from({ length: Math.min(packet.lines, MAX_PENDING_GARBAGE) }, (_, index) => ({
      id: `${packet.id}-${index}`,
      from: packet.from,
      progress: getPacketTimerProgress(packet),
      delay: packet.delay,
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
        const toneClass = !block ? '' :
          block.delay <= 0 ? styles.garbageBlockHot :
            block.delay === 1 ? styles.garbageBlockWarm :
              block.delay === 2 ? styles.garbageBlockReady :
                styles.garbageBlockCool;

        return (
          <div
            key={block?.id ?? `empty-${index}`}
            className={`${styles.garbageBlock} ${block ? styles.garbageBlockActive : ''} ${toneClass}`}
            title={block ? `${block.from} +1` : undefined}
            style={block ? ({ ['--garbage-progress' as string]: `${Math.max(10, block.progress * 100)}%` }) : undefined}
          >
            {block && (
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

function MicroBoard({ bot, targeted, boardRef }: { bot: BotState; targeted: boolean; boardRef?: (node: HTMLDivElement | null) => void }) {
  const cls = [styles.microCard, targeted ? styles.microCardTargeted : '', bot.targetIds.includes(PLAYER_ID) ? styles.microCardAttacker : ''].filter(Boolean).join(' ');
  return (
    <div ref={boardRef} className={cls}>
      <div className={styles.microHeader}>
        <span>{bot.name}</span>
        <BadgeMeter stage={bot.badges} compact />
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
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const playerBoardFrameRef = useRef<HTMLDivElement | null>(null);
  const botBoardRefs = useRef(new Map<string, HTMLDivElement>());
  const attackEffectTimersRef = useRef<number[]>([]);
  const showAllAttackTrailsRef = useRef(false);
  const settingsOpenRef = useRef(false);
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
  const tSpinsRef = useRef(0);
  const incomingRef = useRef<GarbagePacket[]>([]);
  const playerTargetIdsRef = useRef<string[]>([]);
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
  const targetModeRef = useRef<TargetMode>('attackers');
  const stateRef = useRef<MatchState>('countdown');
  const countdownRef = useRef(3);
  const victoryRef = useRef(false);
  const lastDamagedByRef = useRef<string | null>(null);
  const statusRef = useRef('Get ready');
  const [botRenderVersion, setBotRenderVersion] = useState(0);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllAttackTrails, setShowAllAttackTrails] = useState(() => loadTetris99ShowAllAttackTrails());
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

  function closeSettingsMenu() {
    settingsOpenRef.current = false;
    setSettingsOpen(false);
  }

  function openSettingsMenu() {
    clearDAS();
    clearSoftDrop();
    keysRef.current.clear();
    settingsOpenRef.current = true;
    setSettingsOpen(true);
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

  function syncSnapshot(status?: string) {
    const nextStatus = status ?? statusRef.current;
    statusRef.current = nextStatus;
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
      badgeBoostPercent: badgeBoostPercentFromStage(badgesRef.current),
      place: alive + (stateRef.current === 'gameOver' && !victoryRef.current ? 0 : 1),
      attackers,
      incomingGarbage: sumGarbage(incomingRef.current),
      incomingPackets: incomingRef.current.map(packet => ({ ...packet })),
      ren: Math.max(0, comboRef.current - 1),
      tSpins: tSpinsRef.current,
      b2bActive: backToBackRef.current,
      targetMode: targetModeRef.current,
      state: stateRef.current,
      countdown: countdownRef.current,
      gameOver: stateRef.current === 'gameOver',
      victory: victoryRef.current,
      status: nextStatus,
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
    clearDAS();
    clearSoftDrop();
    clearAttackEffects();
    keysRef.current.clear();
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
    tSpinsRef.current = 0;
    incomingRef.current = [];
    playerTargetIdsRef.current = [];
    lastDamagedByRef.current = null;
    backToBackRef.current = false;
    lastMoveRotationRef.current = false;
    statusRef.current = 'Get ready';
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
        b2bActive: false,
        tSpins: 0,
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
    refreshPlayerTargets(true);
    setBotRenderVersion(prev => prev + 1);
    spawnPiece();
    syncSnapshot('Get ready');
  }

  function finish(victory: boolean) {
    if (stateRef.current === 'gameOver') return;
    for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
    botAiGamesRef.current.clear();
    clearDAS();
    clearSoftDrop();
    clearAttackEffects();
    keysRef.current.clear();
    stateRef.current = 'gameOver';
    victoryRef.current = victory;
    playSfx(victory ? 'win' : 'lose');
    syncSnapshot(victory ? 'Winner!' : 'Game over');
  }

  function queuePacket(lines: number, from: string, target: { pendingGarbage: GarbagePacket[] }) {
    const availableSpace = Math.max(0, MAX_PENDING_GARBAGE - sumGarbage(target.pendingGarbage));
    const queuedLines = Math.min(lines, availableSpace);
    if (queuedLines <= 0) return;
    packetIdRef.current += 1;
    target.pendingGarbage.push({ id: `pkt-${packetIdRef.current}`, lines: queuedLines, delay: GARBAGE_DELAY, from });
  }

  function applyPendingGarbage() {
    const collected = collectNextReadyGarbage(incomingRef.current);
    incomingRef.current = collected.queue;
    if (collected.due <= 0) return 0;
    lastDamagedByRef.current = collected.lastSource;
    const { newBoard, adjustedPiece } = applyGarbageRise(boardRef.current, currentPieceRef.current, collected.due, rngRef.current);
    boardRef.current = newBoard;
    currentPieceRef.current = adjustedPiece;
    playSfx('garbage');
    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
    return collected.due;
  }

  function applyBotPendingGarbage(bot: BotState) {
    const collected = collectNextReadyGarbage(bot.pendingGarbage);
    bot.pendingGarbage = collected.queue;
    if (collected.due <= 0) return 0;
    bot.lastDamagedBy = collected.lastSource;
    botAiGamesRef.current.get(bot.id)?.addGarbage(collected.due);
    return collected.due;
  }

  function setTargetMode(mode: TargetMode) {
    targetModeRef.current = mode;
    refreshPlayerTargets(mode === 'random');
    syncSnapshot(`${targetLabel(mode)} selected`);
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

    if (targetId !== PLAYER_ID && stateRef.current !== 'gameOver' && playerTargets.has(targetId)) {
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
      return [...candidates].sort((a, b) => candidateDanger(b) - candidateDanger(a) || candidateBadges(a) - candidateBadges(b)).slice(0, 1);
    }
    if (mode === 'badges') {
      return [...candidates].sort((a, b) => candidateBadges(b) - candidateBadges(a) || candidateDanger(b) - candidateDanger(a)).slice(0, 1);
    }
    return chooseRandomTarget(candidates);
  }

  function resolveStableTargets(sourceId: string, mode: TargetMode, currentTargets: string[], playerTargets = new Set<string>()) {
    const attackFallbackToRandom = mode === 'attackers' && getAttackerIds(sourceId, playerTargets).filter(id => getAliveOpponentIds(sourceId).includes(id)).length === 0;
    if (mode !== 'random' && !attackFallbackToRandom) return chooseTargets(sourceId, mode, playerTargets);
    const aliveCurrent = currentTargets.filter(id => (id === PLAYER_ID ? stateRef.current !== 'gameOver' : !!getBotById(id)?.alive));
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
    const currentTargets = forceRandomRetarget ? [] : playerTargetIdsRef.current;
    playerTargetIdsRef.current = resolveStableTargets(PLAYER_ID, targetModeRef.current, currentTargets);
    return new Set(playerTargetIdsRef.current);
  }

  function finalizeAttack(sourceId: string, mode: TargetMode, lines: number, targetIds: string[], incomingQueue: GarbagePacket[], playerTargets = new Set<string>()): FinalizeAttackResult {
    const attackerCount = attackerManager.countAttackers(sourceId, playerTargets);
    const badgeBoostPercent = badgeBoostPercentFromStage(getBadgeStageForSource(sourceId));
    const attackerBonusLines = attackerManager.getBonus(sourceId, playerTargets);
    const offsetResult = offsetGarbageQueue(incomingQueue, lines + attackerBonusLines);

    if (targetIds.length === 0) {
      return {
        offset: offsetResult.canceled,
        attackerCount,
        attackerBonus: attackerBonusLines,
        badgeBoostPercent,
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
        targetIds,
        distributions: [],
        nextQueue: offsetResult.next,
        totalSent: 0,
      };
    }
    const boostedAttack = Math.max(0, Math.floor(attackWithCounter * (1 + badgeBoostPercent / 100)));
    const distributions = targetManager.distributeAttack(sourceId, mode, boostedAttack, targetIds, playerTargets);

    return {
      offset: offsetResult.canceled,
      attackerCount,
      attackerBonus: attackerBonusLines,
      badgeBoostPercent,
      targetIds,
      distributions,
      nextQueue: offsetResult.next,
      totalSent: distributions.reduce((sum, entry) => sum + entry.lines, 0),
    };
  }

  function updateBotTargeting(bot: BotState, playerTargets: Set<string>) {
    const previousMode = bot.targetMode;
    const pressure = boardDanger(bot.board) + sumGarbage(bot.pendingGarbage);
    if (pressure >= 16) bot.targetMode = 'attackers';
    else if (bot.badges >= 2) bot.targetMode = 'badges';
    else if (botsRef.current.some(entry => entry.alive && entry.id !== bot.id && candidateDanger(entry.id) >= 16)) bot.targetMode = 'kos';
    else if (rngRef.current() > 0.94) bot.targetMode = 'random';
    const currentTargets = previousMode === bot.targetMode ? bot.targetIds : [];
    bot.targetIds = resolveStableTargets(bot.id, bot.targetMode, currentTargets, playerTargets);
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
    const targetIds = resolveStableTargets(PLAYER_ID, targetModeRef.current, playerTargetIdsRef.current);
    playerTargetIdsRef.current = targetIds;
    const attack = finalizeAttack(PLAYER_ID, targetModeRef.current, lines, targetIds, incomingRef.current);
    incomingRef.current = attack.nextQueue;

    for (const distribution of attack.distributions) {
      const bot = getBotById(distribution.targetId);
      if (bot?.alive) queuePacket(distribution.lines, PLAYER_ID, bot);
    }
    queueAttackEffects(PLAYER_ID, attack.distributions);

    return {
      offset: attack.offset,
      sent: attack.totalSent,
      attackerBonus: attack.attackerBonus,
      attackerCount: attack.attackerCount,
      badgeBoostPercent: attack.badgeBoostPercent,
      targetCount: attack.targetIds.length,
    };
  }

  function routeBotAttack(botId: string, lines: number, playerTargets = new Set<string>()) {
    const bot = getBotById(botId);
    if (!bot || !bot.alive) return;
    const attack = finalizeAttack(bot.id, bot.targetMode, lines, bot.targetIds, bot.pendingGarbage, playerTargets);
    bot.pendingGarbage = attack.nextQueue;

    for (const distribution of attack.distributions) {
      if (distribution.targetId === PLAYER_ID) queuePacket(distribution.lines, bot.id, { pendingGarbage: incomingRef.current });
      else {
        const targetBot = getBotById(distribution.targetId);
        if (targetBot?.alive) queuePacket(distribution.lines, bot.id, targetBot);
      }
    }
    queueAttackEffects(bot.id, attack.distributions);
  }

  function startBotAiGames() {
    for (const bot of botsRef.current) {
      if (!bot.alive || botAiGamesRef.current.has(bot.id)) continue;
      const aiGame = new TetrisAIGame(30000 + Number(bot.id.replace('bot-', '')) * 97, getDifficultyForRank(bot.aiPoints), {
        onBoardUpdate: (board, score, lines, _combo, piece, hold) => {
          const currentBot = getBotById(bot.id);
          if (!currentBot || !currentBot.alive) return;
          currentBot.board = aiBoardToRhythmBoard(board);
          currentBot.score = score;
          currentBot.lines = lines;
          currentBot.hold = (hold as PieceType | null | undefined) ?? null;
          if (piece && currentBot.queue.length > 0) {
            currentBot.queue = [...currentBot.queue.slice(1), piece as PieceType];
          }
        },
        onGarbage: () => {
          // Tetris 99 owns combat resolution for bots so it can stay in sync
          // with the player-side Standard attack/B2B/REN/offset rules.
        },
        onPlacement: (placement: AIPlacementResult) => {
          const currentBot = getBotById(bot.id);
          if (!currentBot || !currentBot.alive) return;

          const clearType = getAttackClearType(placement.clearedLines, placement.tSpin);
          const attackResult = calculatePlacementAttack(clearType, currentBot.combo, currentBot.b2bActive);

          if (clearType === 'tSpinMini' || clearType === 'tSpinSingle' || clearType === 'tSpinDouble' || clearType === 'tSpinTriple') {
            currentBot.tSpins += 1;
          }

          currentBot.combo = attackResult.nextComboChain;
          currentBot.b2bActive = attackResult.nextB2bActive;

          const playerTargets = refreshPlayerTargets();
          updateBotTargeting(currentBot, playerTargets);

          if (placement.clearedLines > 0) {
            routeBotAttack(currentBot.id, attackResult.total, playerTargets);
          }

          if (placement.clearedLines === 0) {
            applyBotPendingGarbage(currentBot);
          }
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
    const lockedPiece = currentPieceRef.current;
    const tSpin = detectPlayerTSpin(lockedPiece, boardRef.current, lastMoveRotationRef.current);
    boardRef.current = lockPiece(lockedPiece, boardRef.current);
    const { newBoard, clearedLines } = clearLines(boardRef.current);
    boardRef.current = newBoard;
    linesRef.current += clearedLines;
    scoreRef.current += [0, 100, 300, 500, 800][clearedLines] ?? 0;
    let status = 'Stack stabilized';
    const clearType = getAttackClearType(clearedLines, tSpin);
    const attackResult = calculatePlacementAttack(clearType, comboRef.current, backToBackRef.current);

    if (clearType === 'tSpinMini' || clearType === 'tSpinSingle' || clearType === 'tSpinDouble' || clearType === 'tSpinTriple') {
      tSpinsRef.current += 1;
    }

    comboRef.current = attackResult.nextComboChain;
    backToBackRef.current = attackResult.nextB2bActive;
    let attackOffset = 0;
    let attackBonus = 0;
    let badgeBoostPercent = 0;

    if (clearedLines > 0) {
      const attackResolution = sendAttack(attackResult.total);
      attackOffset = attackResolution.offset;
      attackBonus = attackResolution.attackerBonus;
      badgeBoostPercent = attackResolution.badgeBoostPercent;
      playSfx(clearedLines === 4 ? 'tetris' : 'clear');
      if (tSpin === 'full') {
        status = `T-Spin ${clearedLines === 1 ? 'Single' : clearedLines === 2 ? 'Double' : clearedLines === 3 ? 'Triple' : 'Clear'}`;
      } else if (tSpin === 'mini') {
        status = `T-Spin Mini${clearedLines > 0 ? ` ${clearedLines}` : ''}`;
      } else {
        status = clearedLines === 4 ? 'Tetris' : `${clearedLines} line clear`;
      }
    } else {
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
    if (badgeBoostPercent > 0) {
      status = `${status} | Badges +${badgeBoostPercent}%`;
    }
    if (attackOffset > 0) {
      status = `${status} | Offset ${attackOffset}`;
    }

    currentPieceRef.current = null;
    lastMoveRotationRef.current = false;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    isOnGroundRef.current = false;

    const appliedGarbage = clearedLines === 0 ? applyPendingGarbage() : 0;
    if (appliedGarbage > 0) {
      status = status === 'Stack stabilized' ? `Garbage +${appliedGarbage}` : `${status} | Garbage +${appliedGarbage}`;
    }

    if (boardDanger(boardRef.current) >= 22) {
      awardKo(lastDamagedByRef.current, badgesRef.current);
      finish(false);
      return;
    }

    if (boardDanger(boardRef.current) >= 20) playSfx('danger');
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
    const startY = currentPieceRef.current.y;
    const ghostY = getGhostY(currentPieceRef.current, boardRef.current);
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
    currentPieceRef.current = held ? createSpawnPiece(held) : null;
    lockMovesRef.current = 0;
    clearLockTimer();
    if (!held) spawnPiece();
    playSfx('rotate');
    syncSnapshot('Hold');
  }

  useEffect(() => {
    showAllAttackTrailsRef.current = showAllAttackTrails;
  }, [showAllAttackTrails]);

  useEffect(() => {
    setFullscreen(true);
    resetGame();
    return () => {
      clearAttackEffects();
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
        moveDown();
        softDropTimerRef.current = window.setInterval(() => moveDown(), SOFT_DROP_SPEED);
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
    const gravity = window.setInterval(() => {
      if (settingsOpenRef.current) return;
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
      if (settingsOpenRef.current) return;
      if (stateRef.current !== 'playing') return;
      const playerTargets = refreshPlayerTargets();
      for (const bot of botsRef.current) {
        if (!bot.alive) continue;
        updateBotTargeting(bot, playerTargets);
        bot.pendingGarbage = tickGarbageQueue(bot.pendingGarbage);
        if (boardDanger(bot.board) >= 22) eliminateBot(bot);
      }
      incomingRef.current = tickGarbageQueue(incomingRef.current);
      if (boardDanger(boardRef.current) >= 22) {
        awardKo(lastDamagedByRef.current, badgesRef.current);
        finish(false);
      } else if (botsRef.current.every(bot => !bot.alive)) {
        finish(true);
      } else {
        syncSnapshot(boardDanger(boardRef.current) >= 18 ? 'Danger zone' : 'Battle in progress');
      }
      setBotRenderVersion(prev => prev + 1);
    }, 260);
    return () => {
      window.clearInterval(botLoop);
      for (const aiGame of botAiGamesRef.current.values()) aiGame.stop();
      botAiGamesRef.current.clear();
    };
  }, [snapshot.state]);

  const targetedBots = useMemo(() => {
    return new Set(playerTargetIdsRef.current);
  }, [botRenderVersion, snapshot.targetMode, snapshot.place, snapshot.attackers]);

  const leftBotBoards = useMemo(() => (
    botsRef.current.slice(0, 49).map(bot => <MicroBoard key={bot.id} bot={bot} targeted={targetedBots.has(bot.id)} boardRef={node => registerBotBoardRef(bot.id, node)} />)
  ), [botRenderVersion, targetedBots]);

  const rightBotBoards = useMemo(() => (
    botsRef.current.slice(49).map(bot => <MicroBoard key={bot.id} bot={bot} targeted={targetedBots.has(bot.id)} boardRef={node => registerBotBoardRef(bot.id, node)} />)
  ), [botRenderVersion, targetedBots]);

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
              <div className={styles.heroHeader}>
                <div><div className={styles.heroTitle}>Player Board</div><div className={styles.heroSubtle}>{snapshot.status}</div></div>
                <div className={styles.heroSubtle}>{targetLabel(snapshot.targetMode)} targeting</div>
              </div>
              <div className={styles.heroLayout}>
                <div className={styles.previewColumn}>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>Hold</span><div className={styles.previewBox}><PreviewShape type={snapshot.hold} /></div></div>
                  <div className={styles.miniPanel}><span className={styles.panelHeader}>B2B</span><div className={styles.heroSubtle}>{snapshot.b2bActive ? 'Active' : 'Inactive'}</div></div>
                </div>
                <div ref={playerBoardFrameRef} className={`${styles.boardFrame} ${boardDanger(snapshot.board) >= 18 ? styles.boardFrameDanger : ''}`}>
                  <div className={styles.boardStats}>
                    <div className={styles.boardStat}><span className={styles.statLabel}>Place</span><strong className={styles.boardStatValue}>#{snapshot.place}</strong></div>
                    <div className={styles.boardStat}><span className={styles.statLabel}>Attackers</span><strong className={styles.boardStatValue}>{snapshot.attackers}</strong></div>
                    <div className={styles.boardStat}>
                      <span className={styles.statLabel}>Badge Boost</span>
                      <strong className={styles.boardStatValue}>{`+${snapshot.badgeBoostPercent}%`}</strong>
                      <BadgeMeter stage={snapshot.badges} />
                    </div>
                    <div className={styles.boardStat}><span className={styles.statLabel}>State</span><strong className={styles.boardStatValue}>{snapshot.state === 'countdown' ? snapshot.countdown : snapshot.gameOver ? (snapshot.victory ? 'WIN' : 'OUT') : 'LIVE'}</strong></div>
                  </div>
                  <div className={styles.boardPlayfield}>
                    <IncomingGarbageRail packets={snapshot.incomingPackets} />
                    <PlayerBoard board={snapshot.board} currentPiece={snapshot.currentPiece} />
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
                    {snapshot.gameOver && (
                      <div className={styles.boardGameOver}>
                        <h2 className={styles.boardGameOverTitle}>{snapshot.victory ? 'Victory Royale' : 'Game Over'}</h2>
                        <p className={styles.boardGameOverBody}>
                          {snapshot.victory
                            ? `You closed the lobby with ${snapshot.kos} KOs and ${snapshot.badgePoints} badges.`
                            : `You finished #${snapshot.place} with ${snapshot.kos} KOs and ${snapshot.badgePoints} badges.`}
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
                  <button key={mode} className={`${styles.targetButton} ${snapshot.targetMode === mode ? styles.targetActive : ''}`} onClick={() => setTargetMode(mode)}>{targetLabel(mode)}</button>
                ))}
              </div>
            </div>
            <div className={styles.queueCard}>
              <span className={styles.panelHeader}>Systems</span>
              <div className={styles.queueList}>
                <div className={styles.queueItem}><span>Incoming garbage</span><strong>{snapshot.incomingGarbage}</strong></div>
                <div className={styles.queueItem}><span>Badges</span><strong>{snapshot.badgePoints}</strong></div>
                <div className={styles.queueItem}><span>Badge boost</span><strong>{`+${snapshot.badgeBoostPercent}%`}</strong></div>
                <div className={styles.queueItem}><span>REN</span><strong>{snapshot.ren}</strong></div>
                <div className={styles.queueItem}><span>T-Spins</span><strong>{snapshot.tSpins}</strong></div>
                <div className={styles.queueItem}><span>Target mode</span><strong>{targetLabel(snapshot.targetMode)}</strong></div>
                <div className={styles.queueItem}><span>Status</span><strong>{snapshot.status}</strong></div>
              </div>
            </div>
          </div>
          <div className={styles.sidePanel}>{rightBotBoards}</div>
        </div>
      </div>
    </div>
  );
}
