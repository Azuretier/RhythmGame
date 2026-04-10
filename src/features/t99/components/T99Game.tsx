'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import styles from './T99Game.module.css';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type CellValue = PieceType | 'G' | null;
type AttackMode = 'random' | 'ko' | 'attackers' | 'badges';
type GameStatus = 'playing' | 'paused' | 'gameover' | 'victory';

type Piece = {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
};

type Opponent = {
  id: number;
  alive: boolean;
  damage: number;
  badges: number;
  targeting: boolean;
};

type PendingGarbage = {
  amount: number;
  delay: number;
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const VISIBLE_OPPONENTS = 98;
const TARGET_MODES: AttackMode[] = ['random', 'ko', 'attackers', 'badges'];
const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const TETROMINOES: Record<PieceType, number[][][]> = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  'R->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  'L->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  'R->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  'L->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0->R': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  'R->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2->L': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  'L->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  'R->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '2->R': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  'L->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '0->L': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const CELL_COLORS: Record<Exclude<CellValue, null>, string> = {
  I: '#4fe7ff',
  O: '#ffd84d',
  T: '#c76bff',
  S: '#52ff93',
  Z: '#ff6178',
  J: '#6fa9ff',
  L: '#ffb359',
  G: '#728195',
};

const ROTATION_NAMES = ['0', 'R', '2', 'L'];

function createEmptyBoard(): CellValue[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<CellValue>(BOARD_WIDTH).fill(null));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function fillQueue(queue: PieceType[], bagRef: MutableRefObject<PieceType[]>, desiredLength: number): PieceType[] {
  const next = [...queue];
  while (next.length < desiredLength) {
    if (bagRef.current.length === 0) {
      bagRef.current = shuffle(PIECES);
    }
    const piece = bagRef.current.pop();
    if (piece) next.push(piece);
  }
  return next;
}

function spawnPiece(type: PieceType): Piece {
  return { type, rotation: 0, x: type === 'O' ? 4 : 3, y: -1 };
}

function getShape(piece: Piece): number[][] {
  return TETROMINOES[piece.type][piece.rotation];
}

function isValidPosition(piece: Piece, board: CellValue[][]): boolean {
  const shape = getShape(piece);
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) continue;
      const boardX = piece.x + x;
      const boardY = piece.y + y;

      if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) return false;
      if (boardY >= 0 && board[boardY][boardX] !== null) return false;
    }
  }
  return true;
}

function tryRotate(piece: Piece, board: CellValue[][], direction: 1 | -1): Piece | null {
  const nextRotation = (piece.rotation + direction + 4) % 4;
  const key = `${ROTATION_NAMES[piece.rotation]}->${ROTATION_NAMES[nextRotation]}`;
  const kicks = piece.type === 'I' ? WALL_KICKS_I[key] : piece.type === 'O' ? [[0, 0]] : WALL_KICKS_JLSTZ[key];

  for (const [dx, dy] of kicks) {
    const candidate: Piece = {
      ...piece,
      rotation: nextRotation,
      x: piece.x + dx,
      y: piece.y - dy,
    };
    if (isValidPosition(candidate, board)) return candidate;
  }

  return null;
}

function mergePiece(board: CellValue[][], piece: Piece): CellValue[][] {
  const next = board.map((row) => [...row]);
  const shape = getShape(piece);
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) continue;
      const boardY = piece.y + y;
      const boardX = piece.x + x;
      if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
        next[boardY][boardX] = piece.type;
      }
    }
  }
  return next;
}

function clearLines(board: CellValue[][]): { board: CellValue[][]; cleared: number } {
  const survivors = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_HEIGHT - survivors.length;
  if (cleared === 0) return { board, cleared: 0 };

  const filled = Array.from({ length: cleared }, () => Array<CellValue>(BOARD_WIDTH).fill(null));
  return { board: [...filled, ...survivors], cleared };
}

function addGarbageLines(board: CellValue[][], amount: number): CellValue[][] {
  let next = board.map((row) => [...row]);
  for (let i = 0; i < amount; i += 1) {
    const hole = Math.floor(Math.random() * BOARD_WIDTH);
    const garbageRow = Array.from({ length: BOARD_WIDTH }, (_, x) => (x === hole ? null : 'G' as CellValue));
    next = [...next.slice(1), garbageRow];
  }
  return next;
}

function getGhostPiece(piece: Piece, board: CellValue[][]): Piece {
  let candidate = { ...piece };
  while (isValidPosition({ ...candidate, y: candidate.y + 1 }, board)) {
    candidate = { ...candidate, y: candidate.y + 1 };
  }
  return candidate;
}

function getBadgeTier(kos: number): number {
  if (kos >= 10) return 4;
  if (kos >= 6) return 3;
  if (kos >= 3) return 2;
  if (kos >= 1) return 1;
  return 0;
}

function getAttackPower({
  cleared,
  combo,
  backToBack,
  badgeTier,
  attackers,
  mode,
}: {
  cleared: number;
  combo: number;
  backToBack: boolean;
  badgeTier: number;
  attackers: number;
  mode: AttackMode;
}): number {
  const base = [0, 0, 1, 2, 4][cleared] ?? 0;
  const comboBonus = combo > 1 ? Math.min(4, Math.floor(combo / 2)) : 0;
  const backToBackBonus = backToBack ? 1 : 0;
  const attackerBonus = mode === 'attackers' ? Math.min(6, Math.floor(attackers / 2)) : 0;
  const koBonus = mode === 'ko' && cleared >= 2 ? 1 : 0;
  const badgeMultiplier = 1 + badgeTier * 0.25;

  return Math.round((base + comboBonus + backToBackBonus + attackerBonus + koBonus) * badgeMultiplier);
}

function cancelGarbage(queue: PendingGarbage[], amount: number): PendingGarbage[] {
  let remaining = amount;
  const next = queue.map((packet) => ({ ...packet }));
  for (let i = 0; i < next.length && remaining > 0; i += 1) {
    const blocked = Math.min(next[i].amount, remaining);
    next[i].amount -= blocked;
    remaining -= blocked;
  }
  return next.filter((packet) => packet.amount > 0);
}

function pickTargets(opponents: Opponent[], mode: AttackMode): Opponent[] {
  const alive = opponents.filter((opponent) => opponent.alive);
  if (mode === 'ko') {
    return [...alive].sort((a, b) => b.damage - a.damage);
  }
  if (mode === 'attackers') {
    return [...alive].sort((a, b) => Number(b.targeting) - Number(a.targeting) || b.damage - a.damage);
  }
  if (mode === 'badges') {
    return [...alive].sort((a, b) => b.badges - a.badges || b.damage - a.damage);
  }
  return shuffle(alive);
}

function labelForPlace(place: number): string {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

function renderPieceMini(type: PieceType | null): number[][] {
  if (!type) return [[0]];
  return TETROMINOES[type][0];
}

function createInitialGameState() {
  const bagHolder: MutableRefObject<PieceType[]> = { current: [] };
  const initialQueue = fillQueue([], bagHolder, 6);

  return {
    bag: bagHolder.current,
    board: createEmptyBoard(),
    piece: spawnPiece(initialQueue[0]),
    queue: fillQueue(initialQueue.slice(1), bagHolder, 5),
    hold: null as PieceType | null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    backToBack: false,
    kos: 0,
    badgeTier: 0,
    attackMode: 'attackers' as AttackMode,
    opponents: Array.from({ length: VISIBLE_OPPONENTS }, (_, i) => ({
      id: i + 1,
      alive: true,
      damage: Math.floor(Math.random() * 3),
      badges: Math.floor(Math.random() * 3),
      targeting: false,
    })),
    pendingGarbage: [] as PendingGarbage[],
    attackers: 2,
    place: 99,
    status: 'playing' as GameStatus,
    lastAction: 'Target attackers first and ride the midgame chaos.',
    elapsedSeconds: 0,
  };
}

export default function T99Game() {
  const [initialGame] = useState(createInitialGameState);
  const bagRef = useRef<PieceType[]>(initialGame.bag);
  const boardRef = useRef<CellValue[][]>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const queueRef = useRef<PieceType[]>([]);
  const holdRef = useRef<PieceType | null>(null);
  const canHoldRef = useRef(true);
  const comboRef = useRef(0);
  const b2bRef = useRef(false);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const kosRef = useRef(0);
  const badgeTierRef = useRef(0);
  const attackModeRef = useRef<AttackMode>('attackers');
  const opponentsRef = useRef<Opponent[]>([]);
  const pendingGarbageRef = useRef<PendingGarbage[]>([]);
  const attackersRef = useRef(0);
  const statusRef = useRef<GameStatus>('playing');

  const [board, setBoard] = useState<CellValue[][]>(initialGame.board);
  const [piece, setPiece] = useState<Piece | null>(initialGame.piece);
  const [queue, setQueue] = useState<PieceType[]>(initialGame.queue);
  const [hold, setHold] = useState<PieceType | null>(initialGame.hold);
  const [canHold, setCanHold] = useState(initialGame.canHold);
  const [score, setScore] = useState(initialGame.score);
  const [lines, setLines] = useState(initialGame.lines);
  const [level, setLevel] = useState(initialGame.level);
  const [combo, setCombo] = useState(initialGame.combo);
  const [backToBack, setBackToBack] = useState(initialGame.backToBack);
  const [kos, setKos] = useState(initialGame.kos);
  const [badgeTier, setBadgeTier] = useState(initialGame.badgeTier);
  const [attackMode, setAttackMode] = useState<AttackMode>(initialGame.attackMode);
  const [opponents, setOpponents] = useState<Opponent[]>(initialGame.opponents);
  const [pendingGarbage, setPendingGarbage] = useState<PendingGarbage[]>(initialGame.pendingGarbage);
  const [attackers, setAttackers] = useState(initialGame.attackers);
  const [place, setPlace] = useState(initialGame.place);
  const [status, setStatus] = useState<GameStatus>(initialGame.status);
  const [lastAction, setLastAction] = useState(initialGame.lastAction);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialGame.elapsedSeconds);

  useEffect(() => {
    boardRef.current = board;
    pieceRef.current = piece;
    queueRef.current = queue;
    holdRef.current = hold;
    canHoldRef.current = canHold;
    comboRef.current = combo;
    b2bRef.current = backToBack;
    scoreRef.current = score;
    linesRef.current = lines;
    levelRef.current = level;
    kosRef.current = kos;
    badgeTierRef.current = badgeTier;
    attackModeRef.current = attackMode;
    opponentsRef.current = opponents;
    pendingGarbageRef.current = pendingGarbage;
    attackersRef.current = attackers;
    statusRef.current = status;
  }, [attackMode, attackers, backToBack, board, badgeTier, canHold, combo, hold, kos, level, lines, opponents, pendingGarbage, piece, queue, score, status]);

  const spawnFromQueue = useCallback((boardState: CellValue[][]) => {
    const nextQueue = fillQueue(queueRef.current, bagRef, 1);
    const nextType = nextQueue[0];
    const reducedQueue = fillQueue(nextQueue.slice(1), bagRef, 5);
    const nextPiece = spawnPiece(nextType);

    setQueue(reducedQueue);
    setCanHold(true);

    if (!isValidPosition(nextPiece, boardState)) {
      setPiece(null);
      setStatus('gameover');
      setLastAction('Top out. The lobby closes around you.');
      return false;
    }

    setPiece(nextPiece);
    return true;
  }, []);

  const resetGame = useCallback(() => {
    const nextGame = createInitialGameState();
    bagRef.current = nextGame.bag;
    setBoard(nextGame.board);
    setPiece(nextGame.piece);
    setQueue(nextGame.queue);
    setHold(nextGame.hold);
    setCanHold(nextGame.canHold);
    setScore(nextGame.score);
    setLines(nextGame.lines);
    setLevel(nextGame.level);
    setCombo(nextGame.combo);
    setBackToBack(nextGame.backToBack);
    setKos(nextGame.kos);
    setBadgeTier(nextGame.badgeTier);
    setAttackMode(nextGame.attackMode);
    setOpponents(nextGame.opponents);
    setPendingGarbage(nextGame.pendingGarbage);
    setAttackers(nextGame.attackers);
    setPlace(nextGame.place);
    setStatus(nextGame.status);
    setLastAction(nextGame.lastAction);
    setElapsedSeconds(nextGame.elapsedSeconds);
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!pieceRef.current || statusRef.current !== 'playing') return false;
    const candidate = { ...pieceRef.current, x: pieceRef.current.x + dx, y: pieceRef.current.y + dy };
    if (!isValidPosition(candidate, boardRef.current)) return false;
    setPiece(candidate);
    return true;
  }, []);

  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (!pieceRef.current || statusRef.current !== 'playing') return;
    const rotated = tryRotate(pieceRef.current, boardRef.current, direction);
    if (rotated) setPiece(rotated);
  }, []);

  const applyOutgoingAttack = useCallback((attack: number) => {
    if (attack <= 0) return;

    const rankedTargets = pickTargets(opponentsRef.current, attackModeRef.current);
    const selected = rankedTargets.slice(0, Math.max(1, Math.min(attack, 6)));
    const selectedIds = new Set(selected.map((opponent) => opponent.id));
    let kosGained = 0;

    const nextOpponents = opponentsRef.current.map((opponent) => {
      if (!opponent.alive || !selectedIds.has(opponent.id)) return opponent;

      const lethalChance = 0.12 + attack * 0.045 + opponent.damage * 0.03 + (opponent.targeting ? 0.05 : 0);
      if (Math.random() < Math.min(0.85, lethalChance)) {
        kosGained += 1;
        return { ...opponent, alive: false, targeting: false, damage: 10 };
      }

      return {
        ...opponent,
        damage: Math.min(9, opponent.damage + Math.max(1, Math.floor(attack / 2))),
      };
    });

    if (kosGained > 0) {
      const nextKos = kosRef.current + kosGained;
      const nextBadgeTier = getBadgeTier(nextKos);
      setKos(nextKos);
      setBadgeTier(nextBadgeTier);
      setLastAction(`Attack landed. ${kosGained} KO${kosGained > 1 ? 's' : ''} secured.`);
    }

    const aliveOpponents = nextOpponents.filter((opponent) => opponent.alive).length;
    setOpponents(nextOpponents);
    setPlace(aliveOpponents + 1);

    if (aliveOpponents === 0) {
      setStatus('victory');
      setPiece(null);
      setLastAction('Victory royale. The last board standing is yours.');
    }
  }, []);

  const lockCurrentPiece = useCallback((hardDropDistance = 0) => {
    const activePiece = pieceRef.current;
    if (!activePiece || statusRef.current !== 'playing') return;

    let mergedBoard = mergePiece(boardRef.current, activePiece);
    const { board: clearedBoard, cleared } = clearLines(mergedBoard);
    mergedBoard = clearedBoard;

    const nextCombo = cleared > 0 ? comboRef.current + 1 : 0;
    const difficultClear = cleared === 4;
    const nextBackToBack = difficultClear ? true : cleared > 0 ? false : b2bRef.current;
    const attack = getAttackPower({
      cleared,
      combo: nextCombo,
      backToBack: difficultClear && b2bRef.current,
      badgeTier: badgeTierRef.current,
      attackers: attackersRef.current,
      mode: attackModeRef.current,
    });

    const scoreGain =
      ([0, 100, 300, 500, 800][cleared] ?? 0) * levelRef.current +
      hardDropDistance * 2 +
      Math.max(0, nextCombo - 1) * 50;
    const nextScore = scoreRef.current + scoreGain;
    const nextLines = linesRef.current + cleared;
    const nextLevel = Math.min(15, 1 + Math.floor(nextLines / 10));

    let nextPending = pendingGarbageRef.current.map((packet) => ({
      ...packet,
      delay: Math.max(0, packet.delay - 1),
    }));

    if (attack > 0) {
      nextPending = cancelGarbage(nextPending, attack);
      applyOutgoingAttack(attack);
    }

    if (cleared === 0) {
      const dueGarbage = nextPending.filter((packet) => packet.delay === 0).reduce((sum, packet) => sum + packet.amount, 0);
      nextPending = nextPending.filter((packet) => packet.delay > 0);
      if (dueGarbage > 0) {
        mergedBoard = addGarbageLines(mergedBoard, dueGarbage);
        setLastAction(`Incoming spike. ${dueGarbage} garbage line${dueGarbage > 1 ? 's' : ''} rise.`);
      } else {
        setLastAction(hardDropDistance > 0 ? `Hard drop for ${hardDropDistance * 2} points.` : 'No clear. Stay stable.');
      }
    } else {
      const clearText = ['Single', 'Double', 'Triple', 'Tetris'][cleared - 1];
      setLastAction(`${clearText}. Sent ${attack} garbage with x${Math.max(1, badgeTierRef.current * 0.25 + 1).toFixed(2)} badge power.`);
    }

    setBoard(mergedBoard);
    setPendingGarbage(nextPending);
    setCombo(nextCombo);
    setBackToBack(nextBackToBack);
    setScore(nextScore);
    setLines(nextLines);
    setLevel(nextLevel);

    if (!spawnFromQueue(mergedBoard)) return;
  }, [applyOutgoingAttack, spawnFromQueue]);

  const hardDrop = useCallback(() => {
    if (!pieceRef.current || statusRef.current !== 'playing') return;
    const ghost = getGhostPiece(pieceRef.current, boardRef.current);
    const distance = ghost.y - pieceRef.current.y;
    setPiece(ghost);
    pieceRef.current = ghost;
    lockCurrentPiece(distance);
  }, [lockCurrentPiece]);

  const holdSwap = useCallback(() => {
    if (!pieceRef.current || !canHoldRef.current || statusRef.current !== 'playing') return;

    const currentType = pieceRef.current.type;
    const heldType = holdRef.current;
    setCanHold(false);

    if (!heldType) {
      setHold(currentType);
      spawnFromQueue(boardRef.current);
      setCanHold(false);
      return;
    }

    const swappedPiece = spawnPiece(heldType);
    if (!isValidPosition(swappedPiece, boardRef.current)) {
      setStatus('gameover');
      setPiece(null);
      setLastAction('Hold swap caused a lockout.');
      return;
    }

    setHold(currentType);
    setPiece(swappedPiece);
  }, [spawnFromQueue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && (event.code === 'Space' || event.code === 'KeyC')) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyZ', 'KeyX', 'KeyC', 'Escape', 'KeyP'].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === 'Escape' || event.code === 'KeyP') {
        setStatus((current) => (current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current));
        return;
      }

      if (statusRef.current !== 'playing') return;

      switch (event.code) {
        case 'ArrowLeft':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          if (!movePiece(0, 1)) lockCurrentPiece();
          break;
        case 'ArrowUp':
        case 'KeyX':
          rotatePiece(1);
          break;
        case 'KeyZ':
          rotatePiece(-1);
          break;
        case 'Space':
          hardDrop();
          break;
        case 'KeyC':
          holdSwap();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDrop, holdSwap, lockCurrentPiece, movePiece, rotatePiece]);

  useEffect(() => {
    if (status !== 'playing') return undefined;

    const dropDelay = Math.max(90, 900 - (level - 1) * 60 - (99 - place) * 5);
    const interval = window.setInterval(() => {
      if (!movePiece(0, 1)) lockCurrentPiece();
    }, dropDelay);

    return () => window.clearInterval(interval);
  }, [level, lockCurrentPiece, movePiece, place, status]);

  useEffect(() => {
    if (status !== 'playing') return undefined;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);

      const currentOpponents = opponentsRef.current;
      const aliveOpponents = currentOpponents.filter((opponent) => opponent.alive);
      if (aliveOpponents.length === 0) return;

      const pace = aliveOpponents.length > 60 ? 1 : aliveOpponents.length > 25 ? 2 : 3;
      const nextOpponents = currentOpponents.map((opponent) => {
        if (!opponent.alive) return { ...opponent, targeting: false };

        const passiveKOChance = 0.006 * pace + opponent.damage * 0.01;
        if (Math.random() < passiveKOChance) {
          return { ...opponent, alive: false, targeting: false, damage: 10 };
        }

        const nextDamage = Math.max(0, Math.min(9, opponent.damage + (Math.random() < 0.55 ? 1 : -1) + (pace - 1)));
        return {
          ...opponent,
          damage: nextDamage,
          badges: Math.max(0, Math.min(4, opponent.badges + (Math.random() < 0.08 ? 1 : 0))),
          targeting: false,
        };
      });

      const survivors = nextOpponents.filter((opponent) => opponent.alive);
      const nextAttackers = Math.min(
        8,
        survivors.length === 0
          ? 0
          : Math.max(1, Math.floor((99 - (survivors.length + 1)) / 12) + Math.floor(Math.random() * 3))
      );
      const attackerIds = shuffle(survivors.map((opponent) => opponent.id)).slice(0, nextAttackers);
      const attackerSet = new Set(attackerIds);

      const targetedOpponents = nextOpponents.map((opponent) =>
        opponent.alive ? { ...opponent, targeting: attackerSet.has(opponent.id) } : opponent
      );

      const nextPlace = survivors.length + 1;
      const pressure =
        nextAttackers > 0 && Math.random() < 0.72
          ? Math.min(7, Math.max(1, Math.floor(nextAttackers / 2) + (nextPlace <= 50 ? 1 : 0) + (nextPlace <= 10 ? 1 : 0)))
          : 0;

      if (pressure > 0) {
        setPendingGarbage((current) => [...current, { amount: pressure, delay: 2 }]);
      }

      setOpponents(targetedOpponents);
      setAttackers(nextAttackers);
      setPlace(nextPlace);

      if (survivors.length === 0) {
        setStatus('victory');
        setPiece(null);
        setLastAction('Every rival board collapsed. You survived the full ladder.');
      }
    }, 1400);

    return () => window.clearInterval(interval);
  }, [status]);

  const displayBoard = useMemo(() => {
    const next = board.map((row) => [...row]);
    if (!piece) return next;

    const ghost = getGhostPiece(piece, board);
    const ghostShape = getShape(ghost);
    for (let y = 0; y < ghostShape.length; y += 1) {
      for (let x = 0; x < ghostShape[y].length; x += 1) {
        if (!ghostShape[y][x]) continue;
        const boardY = ghost.y + y;
        const boardX = ghost.x + x;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH && next[boardY][boardX] === null) {
          next[boardY][boardX] = 'G';
        }
      }
    }

    const shape = getShape(piece);
    for (let y = 0; y < shape.length; y += 1) {
      for (let x = 0; x < shape[y].length; x += 1) {
        if (!shape[y][x]) continue;
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          next[boardY][boardX] = piece.type;
        }
      }
    }

    return next;
  }, [board, piece]);

  const miniHold = renderPieceMini(hold);
  const garbageTotal = pendingGarbage.reduce((sum, packet) => sum + packet.amount, 0);
  const aliveCount = opponents.filter((opponent) => opponent.alive).length;

  return (
    <div className={styles.page}>
      <div className={styles.chrome}>
        <div>
          <p className={styles.kicker}>Battle Royale Falling Blocks</p>
          <h1 className={styles.title}>T99 Royale</h1>
          <p className={styles.subtitle}>
            A browser-built Nintendo Switch inspired survival mode with 98 simulated rivals, target cycling, badge scaling,
            and constant garbage pressure.
          </p>
        </div>

        <div className={styles.topActions}>
          <button className={styles.actionButton} type="button" onClick={() => setStatus((current) => (current === 'playing' ? 'paused' : 'playing'))}>
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button className={styles.actionButton} type="button" onClick={resetGame}>
            Restart
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <span className={styles.panelLabel}>Hold</span>
            <div className={styles.previewGrid}>
              {miniHold.flatMap((row, rowIndex) =>
                row.map((value, columnIndex) => (
                  <div
                    key={`hold-${rowIndex}-${columnIndex}`}
                    className={`${styles.previewCell} ${value ? styles.previewFilled : ''}`}
                    style={value && hold ? { backgroundColor: CELL_COLORS[hold] } : undefined}
                  />
                ))
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <span className={styles.panelLabel}>Next</span>
            <div className={styles.queueList}>
              {queue.slice(0, 5).map((queueType, index) => (
                <div key={`next-${queueType}-${index}`} className={styles.queuePiece}>
                  {renderPieceMini(queueType).flatMap((row, rowIndex) =>
                    row.map((value, columnIndex) => (
                      <div
                        key={`queue-${index}-${rowIndex}-${columnIndex}`}
                        className={`${styles.previewCell} ${value ? styles.previewFilled : ''}`}
                        style={value ? { backgroundColor: CELL_COLORS[queueType] } : undefined}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <span className={styles.panelLabel}>Targeting</span>
            <div className={styles.targetButtons}>
              {TARGET_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`${styles.targetButton} ${attackMode === mode ? styles.targetButtonActive : ''}`}
                  onClick={() => setAttackMode(mode)}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className={styles.centerStage}>
          <div className={styles.statusBar}>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>Place</span>
              <strong>{labelForPlace(place)}</strong>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>KOs</span>
              <strong>{kos}</strong>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>Badges</span>
              <strong>{badgeTier}/4</strong>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>Incoming</span>
              <strong>{garbageTotal}</strong>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>Attackers</span>
              <strong>{attackers}</strong>
            </div>
          </div>

          <div className={styles.boardShell}>
            <div className={styles.board}>
              {displayBoard.flatMap((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <div
                    key={`cell-${rowIndex}-${columnIndex}`}
                    className={`${styles.cell} ${cell === 'G' ? styles.ghostCell : ''}`}
                    style={cell ? { backgroundColor: CELL_COLORS[cell] } : undefined}
                  />
                ))
              )}
            </div>

            {status !== 'playing' && (
              <div className={styles.overlay}>
                <h2>{status === 'victory' ? 'Winner Winner' : status === 'paused' ? 'Paused' : 'Game Over'}</h2>
                <p>
                  {status === 'victory'
                    ? 'You outlasted the entire field.'
                    : status === 'paused'
                      ? 'Take a breath, then drop back in.'
                      : 'The pressure stack won this round.'}
                </p>
              </div>
            )}
          </div>

          <div className={styles.metaRow}>
            <div className={styles.metricCard}>
              <span>Score</span>
              <strong>{score.toLocaleString()}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Lines</span>
              <strong>{lines}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Level</span>
              <strong>{level}</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Alive</span>
              <strong>{aliveCount + 1}/99</strong>
            </div>
            <div className={styles.metricCard}>
              <span>Clock</span>
              <strong>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</strong>
            </div>
          </div>

          <div className={styles.actionFeed}>{lastAction}</div>

          <div className={styles.controls}>
            <span>Move: Left / Right</span>
            <span>Soft Drop: Down</span>
            <span>Rotate: Up / Z / X</span>
            <span>Hold: C</span>
            <span>Hard Drop: Space</span>
            <span>Pause: P / Esc</span>
          </div>
        </main>

        <aside className={styles.ladder}>
          <div className={styles.ladderHeader}>
            <span className={styles.panelLabel}>Field Radar</span>
            <strong>{aliveCount} opponents alive</strong>
          </div>
          <div className={styles.opponentGrid}>
            {opponents.map((opponent) => (
              <div
                key={opponent.id}
                className={`${styles.opponentCard} ${!opponent.alive ? styles.opponentOut : ''} ${opponent.targeting ? styles.opponentTargeting : ''}`}
              >
                <span className={styles.opponentId}>{opponent.id}</span>
                <div className={styles.damageBar}>
                  <div className={styles.damageFill} style={{ width: `${(opponent.damage / 9) * 100}%` }} />
                </div>
                <span className={styles.opponentBadge}>{'★'.repeat(Math.max(1, opponent.badges))}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
