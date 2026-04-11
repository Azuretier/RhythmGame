/// <reference lib="webworker" />

import { BEST_AI_DIFFICULTY, TetrisAIGame, type AIActivePieceState, type AIPlacementResult } from '@/lib/ranked/TetrisAI';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
type TargetMode = 'random' | 'attackers' | 'kos' | 'badges';
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
type BoardCell = PieceType | 'garbage' | null;
type VisibleBoard = BoardCell[][];

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

type VisiblePiece = {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
};

type BotSnapshot = {
  id: string;
  name: string;
  board: VisibleBoard;
  currentPiece: VisiblePiece | null;
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

type PlayerState = {
  alive: boolean;
  boardDanger: number;
  pendingGarbage: number;
  badgePoints: number;
  badges: number;
  targetMode: TargetMode;
  targetIds: string[];
  marginBonus: number;
};

type ResetMessage = { type: 'reset'; matchId: number };
type StartMessage = { type: 'start'; matchId: number };
type StopMessage = { type: 'stop'; matchId: number };
type PauseMessage = { type: 'pause'; matchId: number };
type ResumeMessage = { type: 'resume'; matchId: number };
type SyncPlayerMessage = {
  type: 'sync-player';
  matchId: number;
  player: PlayerState;
};
type PlayerAttackMessage = {
  type: 'player-attack';
  matchId: number;
  distributions: AttackDistribution[];
};
type PlayerDefeatedMessage = {
  type: 'player-defeated';
  matchId: number;
  killerId: string | null;
  victimBadgePoints: number;
};
type SetSpeedStageMessage = {
  type: 'set-speed-stage';
  matchId: number;
  stage: number;
};

type ServerMessage =
  | ResetMessage
  | StartMessage
  | StopMessage
  | PauseMessage
  | ResumeMessage
  | SyncPlayerMessage
  | PlayerAttackMessage
  | PlayerDefeatedMessage
  | SetSpeedStageMessage;

type BotEliminatedEvent = {
  type: 'bot-eliminated';
  matchId: number;
  victimId: string;
  killerId: string | null;
};

type BotSfxEvent = {
  type: 'bot-sfx';
  matchId: number;
  sourceId: string;
  kind: 'drop' | 'lock' | 'clear' | 'tetris' | 'tSpin' | 'tSpinMini' | 'garbage' | 'ko' | 'lose';
};

const scope = self as DedicatedWorkerGlobalScope;

const BOT_COUNT = 98;
const PLAYER_ID = 'player';
const AUTO_TARGET_MODES: TargetMode[] = ['random', 'attackers', 'kos', 'badges'];
const BOARD_WIDTH = 10;
const BOT_STATE_TICK_MS = 260;
const GARBAGE_QUEUE_TICK_MS = 50;
const GARBAGE_TIMER_START_PLAYERS = 50;
const GARBAGE_TIMER_TOP10_PLAYERS = 10;
const T99_VISIBLE_HEIGHT = 20;
const T99_BUFFER_ZONE = 20;
const T99_BOARD_HEIGHT = T99_VISIBLE_HEIGHT + T99_BUFFER_ZONE;
const MAX_PENDING_GARBAGE = 12;
const SNAPSHOT_THROTTLE_MS = 80;
const BOT_NAMES = ['ALPHA', 'BLAZE', 'COMET', 'DELTA', 'EMBER', 'FROST', 'GLINT', 'HALO', 'ION', 'JOLT', 'KAI', 'LUMEN', 'MIRAGE', 'NOVA', 'ONYX', 'PULSE'];
const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
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
const SPEED_AI_DELAY_SCALES = [1.1, 1.0, 0.92, 0.84, 0.74, 0.64, 0.58, 0.52, 0.46, 0.4, 0.35];
const T99_BOT_AI_POINTS = 11000;

let currentMatchId = 0;
let running = false;
let paused = false;
let matchResolved = false;
let packetId = 0;
let currentSpeedStage = 0;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let garbageTimer: ReturnType<typeof setInterval> | null = null;
let botTimer: ReturnType<typeof setInterval> | null = null;
let botSeedRng = makeRng(44091);
let bots: BotSnapshot[] = [];
let playerState: PlayerState = {
  alive: true,
  boardDanger: 0,
  pendingGarbage: 0,
  badgePoints: 0,
  badges: 0,
  targetMode: 'attackers',
  targetIds: [],
  marginBonus: 0,
};
const aiGames = new Map<string, TetrisAIGame>();

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

function createEmptyVisibleBoard(): VisibleBoard {
  return Array.from({ length: T99_VISIBLE_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

function boardDanger(board: BoardCell[][]) {
  for (let y = 0; y < board.length; y++) {
    if (board[y].some(Boolean)) return board.length - y;
  }
  return 0;
}

function aiBoardToVisibleBoard(board: ({ color: string } | null)[][]) {
  const mapped = board.map(row =>
    row.map(cell => {
      if (!cell) return null;
      return pieceTypeFromAiColor(cell.color);
    }),
  );
  const fullBoard = mapped.length >= T99_BOARD_HEIGHT
    ? mapped.slice(mapped.length - T99_BOARD_HEIGHT)
    : [
      ...Array.from({ length: T99_BOARD_HEIGHT - mapped.length }, () => Array(BOARD_WIDTH).fill(null)),
      ...mapped,
    ];

  return {
    visibleBoard: fullBoard.slice(fullBoard.length - T99_VISIBLE_HEIGHT),
    danger: boardDanger(fullBoard),
  };
}

function aiPieceToVisiblePiece(piece: AIActivePieceState | null): VisiblePiece | null {
  if (!piece) return null;
  return {
    type: piece.type,
    rotation: piece.rotation,
    x: piece.x,
    y: piece.y - T99_BUFFER_ZONE,
  };
}

function badgeStageFromPoints(points: number) {
  if (points >= 16) return 4;
  if (points >= 8) return 3;
  if (points >= 4) return 2;
  if (points >= 2) return 1;
  return 0;
}

function getKoBadgeGain(victimBadgePoints: number) {
  return 1 + Math.max(0, victimBadgePoints);
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
    nextComboChain: currentComboChain + 1,
    nextB2bActive: b2bEligible,
  };
}

function sumGarbage(queue: GarbagePacket[]) {
  return queue.reduce((sum, packet) => sum + packet.lines, 0);
}

function getGarbagePhaseMs(alivePlayers: number) {
  if (alivePlayers <= GARBAGE_TIMER_TOP10_PLAYERS) return 500;
  if (alivePlayers <= GARBAGE_TIMER_START_PLAYERS) return 1500;
  return 2500;
}

function getGarbageChargeWindowMs(alivePlayers: number) {
  return getGarbagePhaseMs(alivePlayers) * 2;
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

function getAlivePlayerCount() {
  return bots.filter(bot => bot.alive).length + (playerState.alive ? 1 : 0);
}

function finishResolvedMatch(winnerId: string | null) {
  if (matchResolved) return;
  matchResolved = true;
  running = false;
  paused = false;
  stopAllAiGames();
  const winnerName = winnerId === PLAYER_ID
    ? 'YOU'
    : (winnerId ? getBotById(winnerId)?.name ?? null : null);
  scope.postMessage({
    type: 'match-finished',
    matchId: currentMatchId,
    winnerId,
    winnerName,
  });
}

function maybeResolveMatch() {
  if (matchResolved || !running) return;
  const aliveBots = bots.filter(bot => bot.alive);
  if (playerState.alive) {
    if (aliveBots.length === 0) finishResolvedMatch(PLAYER_ID);
    return;
  }
  if (aliveBots.length <= 1) {
    finishResolvedMatch(aliveBots[0]?.id ?? null);
  }
}

function emitBotSfx(sourceId: string, kind: BotSfxEvent['kind']) {
  scope.postMessage({
    type: 'bot-sfx',
    matchId: currentMatchId,
    sourceId,
    kind,
  } satisfies BotSfxEvent);
}

function getSpeedAiDelayScale(stage: number) {
  return SPEED_AI_DELAY_SCALES[Math.max(0, Math.min(SPEED_AI_DELAY_SCALES.length - 1, stage))] ?? SPEED_AI_DELAY_SCALES[0];
}

function chooseRandomTarget(candidates: string[]) {
  if (!candidates.length) return [];
  return [candidates[Math.floor(botSeedRng() * candidates.length)] ?? candidates[0]!];
}

function getBotById(id: string) {
  return bots.find(bot => bot.id === id) ?? null;
}

function getAliveOpponentIds(sourceId: string) {
  const ids = bots.filter(bot => bot.alive && bot.id !== sourceId).map(bot => bot.id);
  if (sourceId !== PLAYER_ID && playerState.alive) ids.unshift(PLAYER_ID);
  return ids;
}

function candidateDanger(id: string) {
  if (id === PLAYER_ID) return playerState.boardDanger + playerState.pendingGarbage * 2;
  const bot = getBotById(id);
  if (!bot || !bot.alive) return -1;
  return bot.danger + sumGarbage(bot.pendingGarbage) * 2;
}

function candidateKoDanger(id: string) {
  if (id === PLAYER_ID) return playerState.boardDanger;
  const bot = getBotById(id);
  if (!bot || !bot.alive) return -1;
  return bot.danger;
}

function candidateBadges(id: string) {
  if (id === PLAYER_ID) return playerState.badgePoints;
  const bot = getBotById(id);
  if (!bot || !bot.alive) return -1;
  return bot.badgePoints;
}

function getAttackerIds(targetId: string) {
  const attackers = bots
    .filter(bot => bot.alive && bot.id !== targetId && bot.targetIds.includes(targetId))
    .map(bot => bot.id);

  if (targetId !== PLAYER_ID && playerState.alive && playerState.targetIds.includes(targetId)) {
    attackers.push(PLAYER_ID);
  }

  return [...new Set(attackers)].filter(id => id === PLAYER_ID || getBotById(id)?.alive);
}

function chooseTargets(sourceId: string, mode: TargetMode) {
  const candidates = getAliveOpponentIds(sourceId);
  if (!candidates.length) return [];
  if (mode === 'attackers') {
    const attackers = getAttackerIds(sourceId).filter(id => candidates.includes(id));
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

function resolveStableTargets(sourceId: string, mode: TargetMode, currentTargets: string[]) {
  if (mode === 'attackers') {
    const candidates = getAliveOpponentIds(sourceId);
    const attackers = getAttackerIds(sourceId).filter(id => candidates.includes(id));
    if (attackers.length) return attackers;
    return chooseRandomTarget(candidates);
  }
  if (mode !== 'random') return chooseTargets(sourceId, mode);
  const aliveCurrent = currentTargets.filter(id => (id === PLAYER_ID ? playerState.alive : !!getBotById(id)?.alive));
  return aliveCurrent.length ? aliveCurrent : chooseTargets(sourceId, mode);
}

function distributeAttack(sourceId: string, mode: TargetMode, totalLines: number, targetIds: string[]) {
  if (totalLines <= 0 || targetIds.length === 0) return [];

  const attackerIds = new Set(getAttackerIds(sourceId));
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

function getBadgeStageForSource(sourceId: string) {
  if (sourceId === PLAYER_ID) return playerState.badges;
  return getBotById(sourceId)?.badges ?? 0;
}

function finalizeAttack(sourceId: string, mode: TargetMode, lines: number, targetIds: string[], incomingQueue: GarbagePacket[]) {
  const attackerCount = getAttackerIds(sourceId).length;
  const badgeBoostPercent = [0, 25, 50, 75, 100][Math.max(0, Math.min(4, getBadgeStageForSource(sourceId)))] ?? 0;
  const attackerBonusLines = attackerBonus(attackerCount);
  const offsetResult = offsetGarbageQueue(incomingQueue, lines + attackerBonusLines);

  if (targetIds.length === 0) {
    return {
      nextQueue: offsetResult.next,
      distributions: [] as AttackDistribution[],
    };
  }

  const attackWithCounter = offsetResult.remaining;
  if (attackWithCounter <= 0) {
    return {
      nextQueue: offsetResult.next,
      distributions: [] as AttackDistribution[],
    };
  }

  const boostedAttack = Math.max(0, Math.floor(attackWithCounter * (1 + badgeBoostPercent / 100)));
  const distributed = distributeAttack(sourceId, mode, boostedAttack, targetIds);
  const marginAdjusted = playerState.marginBonus > 0
    ? distributed.map(distribution => ({ ...distribution, lines: distribution.lines + playerState.marginBonus }))
    : distributed;

  return {
    nextQueue: offsetResult.next,
    distributions: marginAdjusted,
  };
}

function queuePacket(lines: number, from: string, target: BotSnapshot) {
  const availableSpace = Math.max(0, MAX_PENDING_GARBAGE - sumGarbage(target.pendingGarbage));
  const queuedLines = Math.min(lines, availableSpace);
  if (queuedLines <= 0) return;
  packetId += 1;
  target.pendingGarbage.push({ id: `pkt-${packetId}`, lines: queuedLines, chargeMs: 0, from });
}

function applyBotPendingGarbage(bot: BotSnapshot) {
  const collected = collectNextReadyGarbage(bot.pendingGarbage, getAlivePlayerCount());
  bot.pendingGarbage = collected.queue;
  if (collected.due <= 0) return;
  bot.lastDamagedBy = collected.lastSource;
  emitBotSfx(bot.id, 'garbage');
  aiGames.get(bot.id)?.addGarbage(collected.due);
}

function refreshBotTargeting(bot: BotSnapshot) {
  const previousMode = bot.targetMode;
  const pressure = bot.danger + sumGarbage(bot.pendingGarbage);
  if (pressure >= 16) bot.targetMode = 'attackers';
  else if (bot.badges >= 2) bot.targetMode = 'badges';
  else if (bots.some(entry => entry.alive && entry.id !== bot.id && candidateKoDanger(entry.id) >= 16)) bot.targetMode = 'kos';
  else if (botSeedRng() > 0.94) bot.targetMode = 'random';
  const currentTargets = previousMode === bot.targetMode ? bot.targetIds : [];
  bot.targetIds = resolveStableTargets(bot.id, bot.targetMode, currentTargets);
}

function awardKo(killerId: string | null, victimBadgePoints: number, victimId: string) {
  if (!killerId) return;
  const badgeGain = getKoBadgeGain(victimBadgePoints);
  if (killerId === PLAYER_ID) {
    scope.postMessage({
      type: 'player-ko',
      matchId: currentMatchId,
      victimId,
      badgeGain,
    });
    return;
  }
  const killer = getBotById(killerId);
  if (!killer || !killer.alive) return;
  killer.kos += 1;
  killer.badgePoints += badgeGain;
  killer.badges = badgeStageFromPoints(killer.badgePoints);
  emitBotSfx(killer.id, 'ko');
}

function eliminateBot(bot: BotSnapshot) {
  if (!bot.alive) return;
  aiGames.get(bot.id)?.stop();
  aiGames.delete(bot.id);
  emitBotSfx(bot.id, 'lose');
  bot.alive = false;
  bot.currentPiece = null;
  bot.targetIds = [];
  scope.postMessage({
    type: 'bot-eliminated',
    matchId: currentMatchId,
    victimId: bot.id,
    killerId: bot.lastDamagedBy,
  } satisfies BotEliminatedEvent);
  awardKo(bot.lastDamagedBy, bot.badgePoints, bot.id);
  scheduleSnapshot();
  maybeResolveMatch();
}

function routeBotAttack(botId: string, lines: number) {
  const bot = getBotById(botId);
  if (!bot || !bot.alive) return;
  const attack = finalizeAttack(bot.id, bot.targetMode, lines, bot.targetIds, bot.pendingGarbage);
  bot.pendingGarbage = attack.nextQueue;

  for (const distribution of attack.distributions) {
    if (distribution.targetId !== PLAYER_ID) {
      const targetBot = getBotById(distribution.targetId);
      if (targetBot?.alive) queuePacket(distribution.lines, bot.id, targetBot);
    }
  }

  if (attack.distributions.length > 0) {
    scope.postMessage({
      type: 'attack',
      matchId: currentMatchId,
      sourceId: bot.id,
      distributions: attack.distributions,
    });
  }

  scheduleSnapshot();
}

function serializeBot(bot: BotSnapshot): BotSnapshot {
  return {
    ...bot,
    board: bot.board.map(row => [...row]),
    currentPiece: bot.currentPiece ? { ...bot.currentPiece } : null,
    queue: [...bot.queue],
    targetIds: [...bot.targetIds],
    pendingGarbage: bot.pendingGarbage.map(packet => ({ ...packet })),
  };
}

function scheduleSnapshot() {
  if (snapshotTimer !== null) return;
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    scope.postMessage({
      type: 'snapshot',
      matchId: currentMatchId,
      bots: bots.map(serializeBot),
    });
  }, SNAPSHOT_THROTTLE_MS);
}

function stopAllAiGames() {
  for (const aiGame of aiGames.values()) {
    aiGame.stop();
  }
  aiGames.clear();
}

function createInitialBot(index: number): BotSnapshot {
  const rng = makeRng(20000 + index * 17 + Math.floor(botSeedRng() * 10000));
  return {
    id: `bot-${index}`,
    name: `${BOT_NAMES[index % BOT_NAMES.length]}-${String(index + 1).padStart(2, '0')}`,
    board: createEmptyVisibleBoard(),
    currentPiece: null,
    queue: Array.from({ length: 6 }, () => PIECES[Math.floor(rng() * PIECES.length)] ?? 'T'),
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
    targetMode: AUTO_TARGET_MODES[Math.floor(rng() * AUTO_TARGET_MODES.length)] ?? 'random',
    targetIds: [],
    pendingGarbage: [],
    lastDamagedBy: null,
    aiPoints: T99_BOT_AI_POINTS,
    danger: 0,
  };
}

function resetMatch(matchId: number) {
  currentMatchId = matchId;
  running = false;
  paused = false;
  matchResolved = false;
  packetId = 0;
  stopAllAiGames();
  botSeedRng = makeRng(44091 + Math.floor(Math.random() * 10000));
  bots = Array.from({ length: BOT_COUNT }, (_, index) => createInitialBot(index));
  for (const bot of bots) {
    bot.targetIds = resolveStableTargets(bot.id, bot.targetMode, []);
  }
  scheduleSnapshot();
}

function startMatch(matchId: number) {
  if (matchId !== currentMatchId || running || matchResolved) return;
  running = true;
  paused = false;

  for (const bot of bots) {
    if (!bot.alive || aiGames.has(bot.id)) continue;
    const aiGame = new TetrisAIGame(30000 + Number(bot.id.replace('bot-', '')) * 97, BEST_AI_DIFFICULTY, {
      onBoardUpdate: (board, score, lines, _combo, piece, hold) => {
        const currentBot = getBotById(bot.id);
        if (!currentBot || !currentBot.alive) return;
        const view = aiBoardToVisibleBoard(board);
        currentBot.board = view.visibleBoard;
        currentBot.currentPiece = null;
        currentBot.danger = view.danger;
        currentBot.score = score;
        currentBot.lines = lines;
        currentBot.hold = (hold as PieceType | null | undefined) ?? null;
        if (piece && currentBot.queue.length > 0) {
          currentBot.queue = [...currentBot.queue.slice(1), piece as PieceType];
        }
        scheduleSnapshot();
      },
      onActivePieceUpdate: (board, piece, hold) => {
        const currentBot = getBotById(bot.id);
        if (!currentBot || !currentBot.alive) return;
        const view = aiBoardToVisibleBoard(board);
        currentBot.board = view.visibleBoard;
        currentBot.currentPiece = aiPieceToVisiblePiece(piece);
        currentBot.danger = view.danger;
        currentBot.hold = (hold as PieceType | null | undefined) ?? currentBot.hold;
        scheduleSnapshot();
      },
      onGarbage: () => {
        // Battle resolution is owned by this worker so combat stays authoritative.
      },
      onPlacement: (placement: AIPlacementResult) => {
        const currentBot = getBotById(bot.id);
        if (!currentBot || !currentBot.alive) return;

        const clearType = getAttackClearType(placement.clearedLines, placement.tSpin);
        const attackResult = calculatePlacementAttack(clearType, currentBot.combo, currentBot.b2bActive);

        if (clearType === 'tSpinMiniSingle' || clearType === 'tSpinMiniDouble' || clearType === 'tSpinSingle' || clearType === 'tSpinDouble' || clearType === 'tSpinTriple') {
          currentBot.tSpins += 1;
        }

        currentBot.combo = attackResult.nextComboChain;
        currentBot.b2bActive = attackResult.nextB2bActive;
        refreshBotTargeting(currentBot);

        if (placement.clearedLines > 0) {
          emitBotSfx(
            currentBot.id,
            placement.tSpin === 'full'
              ? 'tSpin'
              : placement.tSpin === 'mini'
                ? 'tSpinMini'
                : placement.clearedLines === 4
                  ? 'tetris'
                  : 'clear',
          );
          routeBotAttack(currentBot.id, attackResult.total);
        } else {
          emitBotSfx(currentBot.id, 'lock');
          applyBotPendingGarbage(currentBot);
          scheduleSnapshot();
        }
      },
      onGameOver: () => {
        const currentBot = getBotById(bot.id);
        if (currentBot) eliminateBot(currentBot);
      },
    }, { visibleRows: T99_VISIBLE_HEIGHT, hiddenRows: T99_BUFFER_ZONE });

    aiGame.setSpeedMultiplier(getSpeedAiDelayScale(currentSpeedStage));
    aiGames.set(bot.id, aiGame);
    aiGame.start();
  }
}

function pauseMatch(matchId: number) {
  if (matchId !== currentMatchId || paused) return;
  paused = true;
  for (const aiGame of aiGames.values()) {
    aiGame.pause();
  }
}

function resumeMatch(matchId: number) {
  if (matchId !== currentMatchId || !paused) return;
  paused = false;
  for (const aiGame of aiGames.values()) {
    aiGame.resume();
  }
}

function stopMatch(matchId: number) {
  if (matchId !== currentMatchId) return;
  matchResolved = true;
  running = false;
  paused = false;
  stopAllAiGames();
}

function handlePlayerAttack(matchId: number, distributions: AttackDistribution[]) {
  if (matchId !== currentMatchId) return;
  for (const distribution of distributions) {
    const targetBot = getBotById(distribution.targetId);
    if (targetBot?.alive) queuePacket(distribution.lines, PLAYER_ID, targetBot);
  }
  scheduleSnapshot();
}

function handlePlayerDefeated(matchId: number, killerId: string | null, victimBadgePoints: number) {
  if (matchId !== currentMatchId) return;
  if (!killerId || killerId === PLAYER_ID) return;
  const killer = getBotById(killerId);
  if (!killer || !killer.alive) return;
  killer.kos += 1;
  killer.badgePoints += getKoBadgeGain(victimBadgePoints);
  killer.badges = badgeStageFromPoints(killer.badgePoints);
  emitBotSfx(killer.id, 'ko');
  scheduleSnapshot();
  maybeResolveMatch();
}

function handleSyncPlayer(matchId: number, nextPlayerState: PlayerState) {
  if (matchId !== currentMatchId) return;
  playerState = {
    ...nextPlayerState,
    targetIds: [...nextPlayerState.targetIds],
  };
  bots.forEach(bot => {
    if (!bot.alive) return;
    refreshBotTargeting(bot);
  });
  maybeResolveMatch();
  scheduleSnapshot();
}

function handleSetSpeedStage(matchId: number, stage: number) {
  if (matchId !== currentMatchId) return;
  currentSpeedStage = stage;
  const delayScale = getSpeedAiDelayScale(stage);
  for (const aiGame of aiGames.values()) {
    aiGame.setSpeedMultiplier(delayScale);
  }
}

function ensureLoops() {
  if (!garbageTimer) {
    garbageTimer = setInterval(() => {
      if (!running || paused) return;
      const alivePlayers = getAlivePlayerCount();
      let changed = false;
      bots.forEach(bot => {
        if (!bot.alive) return;
        const nextQueue = tickGarbageQueue(bot.pendingGarbage, GARBAGE_QUEUE_TICK_MS, alivePlayers);
        if (nextQueue !== bot.pendingGarbage) {
          bot.pendingGarbage = nextQueue;
          changed = true;
        }
      });
      if (changed) scheduleSnapshot();
    }, GARBAGE_QUEUE_TICK_MS);
  }

  if (!botTimer) {
    botTimer = setInterval(() => {
      if (!running || paused) return;
      bots.forEach(bot => {
        if (!bot.alive) return;
        refreshBotTargeting(bot);
      });
      scheduleSnapshot();
    }, BOT_STATE_TICK_MS);
  }
}

ensureLoops();

scope.onmessage = (event: MessageEvent<ServerMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'reset':
      resetMatch(message.matchId);
      break;
    case 'start':
      startMatch(message.matchId);
      break;
    case 'stop':
      stopMatch(message.matchId);
      break;
    case 'pause':
      pauseMatch(message.matchId);
      break;
    case 'resume':
      resumeMatch(message.matchId);
      break;
    case 'sync-player':
      handleSyncPlayer(message.matchId, message.player);
      break;
    case 'player-attack':
      handlePlayerAttack(message.matchId, message.distributions);
      break;
    case 'player-defeated':
      handlePlayerDefeated(message.matchId, message.killerId, message.victimBadgePoints);
      break;
    case 'set-speed-stage':
      handleSetSpeedStage(message.matchId, message.stage);
      break;
    default:
      break;
  }
};

export {};
