import type { PlayerStats, AdvancementState } from './types';
import { ADVANCEMENTS } from './definitions';
import { syncToFirestore, writeNotification } from './firestore';

const STORAGE_KEY = 'rhythmia_advancements';

function getDefaultStats(): PlayerStats {
  return {
    totalLines: 0,
    bestLinesPerGame: 0,
    totalTSpins: 0,
    bestTSpinsPerGame: 0,
    totalScore: 0,
    bestScorePerGame: 0,
    totalGamesPlayed: 0,
    bestCombo: 0,
    totalPerfectBeats: 0,
    bestPerfectBeatsPerGame: 0,
    worldsCleared: 0,
    totalTetrisClears: 0,
    bestTetrisClearsPerGame: 0,
    multiplayerWins: 0,
    multiplayerWinStreak: 0,
    bestMultiplayerWinStreak: 0,
    totalMultiplayerGames: 0,
    totalHardDrops: 0,
    bestHardDropsPerGame: 0,
    totalPiecesPlaced: 0,
    bestPiecesPerGame: 0,
    totalVisits: 0,
    bestStreak: 0,
    pollsVoted: 0,
  };
}

export function loadAdvancementState(): AdvancementState {
  if (typeof window === 'undefined') {
    return { stats: getDefaultStats(), unlockedIds: [], newlyUnlockedIds: [] };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        stats: { ...getDefaultStats(), ...parsed.stats },
        unlockedIds: parsed.unlockedIds || [],
        newlyUnlockedIds: [],
      };
    }
  } catch {}

  return { stats: getDefaultStats(), unlockedIds: [], newlyUnlockedIds: [] };
}

export function saveAdvancementState(state: AdvancementState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stats: state.stats,
        unlockedIds: state.unlockedIds,
      })
    );
  } catch {}
}

export function checkNewAdvancements(state: AdvancementState): AdvancementState {
  const newlyUnlocked: string[] = [];

  for (const adv of ADVANCEMENTS) {
    if (state.unlockedIds.includes(adv.id)) continue;
    if (state.stats[adv.statKey] >= adv.threshold) {
      newlyUnlocked.push(adv.id);
    }
  }

  if (newlyUnlocked.length === 0) return state;

  return {
    ...state,
    unlockedIds: [...state.unlockedIds, ...newlyUnlocked],
    newlyUnlockedIds: newlyUnlocked,
  };
}

export interface GameEndStats {
  score: number;
  lines: number;
  tSpins: number;
  bestCombo: number;
  perfectBeats: number;
  worldsCleared: number;
  tetrisClears: number;
  hardDrops: number;
  piecesPlaced: number;
}

export function recordGameEnd(stats: GameEndStats): AdvancementState {
  const state = loadAdvancementState();

  state.stats.totalScore += stats.score;
  state.stats.totalLines += stats.lines;
  state.stats.totalTSpins += stats.tSpins;
  state.stats.totalPerfectBeats += stats.perfectBeats;
  state.stats.totalTetrisClears += stats.tetrisClears;
  state.stats.totalHardDrops += stats.hardDrops;
  state.stats.totalPiecesPlaced += stats.piecesPlaced;
  state.stats.totalGamesPlayed += 1;
  state.stats.worldsCleared += stats.worldsCleared;

  if (stats.score > state.stats.bestScorePerGame) {
    state.stats.bestScorePerGame = stats.score;
  }
  if (stats.lines > state.stats.bestLinesPerGame) {
    state.stats.bestLinesPerGame = stats.lines;
  }
  if (stats.bestCombo > state.stats.bestCombo) {
    state.stats.bestCombo = stats.bestCombo;
  }
  if (stats.perfectBeats > state.stats.bestPerfectBeatsPerGame) {
    state.stats.bestPerfectBeatsPerGame = stats.perfectBeats;
  }
  if (stats.tSpins > state.stats.bestTSpinsPerGame) {
    state.stats.bestTSpinsPerGame = stats.tSpins;
  }
  if (stats.tetrisClears > state.stats.bestTetrisClearsPerGame) {
    state.stats.bestTetrisClearsPerGame = stats.tetrisClears;
  }
  if (stats.hardDrops > state.stats.bestHardDropsPerGame) {
    state.stats.bestHardDropsPerGame = stats.hardDrops;
  }
  if (stats.piecesPlaced > state.stats.bestPiecesPerGame) {
    state.stats.bestPiecesPerGame = stats.piecesPlaced;
  }

  const updated = checkNewAdvancements(state);
  saveAdvancementState(updated);

  // Sync to Firestore and write notifications for newly unlocked
  syncToFirestore(updated);
  for (const advId of updated.newlyUnlockedIds) {
    writeNotification(advId);
  }

  return updated;
}

export interface MultiplayerGameEndStats {
  score: number;
  lines: number;
  won: boolean;
  hardDrops: number;
  piecesPlaced: number;
}

export function recordMultiplayerGameEnd(stats: MultiplayerGameEndStats): AdvancementState {
  const state = loadAdvancementState();

  state.stats.totalScore += stats.score;
  state.stats.totalLines += stats.lines;
  state.stats.totalHardDrops += stats.hardDrops;
  state.stats.totalPiecesPlaced += stats.piecesPlaced;
  state.stats.totalMultiplayerGames += 1;
  state.stats.totalGamesPlayed += 1;

  if (stats.score > state.stats.bestScorePerGame) {
    state.stats.bestScorePerGame = stats.score;
  }
  if (stats.lines > state.stats.bestLinesPerGame) {
    state.stats.bestLinesPerGame = stats.lines;
  }
  if (stats.hardDrops > state.stats.bestHardDropsPerGame) {
    state.stats.bestHardDropsPerGame = stats.hardDrops;
  }
  if (stats.piecesPlaced > state.stats.bestPiecesPerGame) {
    state.stats.bestPiecesPerGame = stats.piecesPlaced;
  }

  if (stats.won) {
    state.stats.multiplayerWins += 1;
    state.stats.multiplayerWinStreak += 1;
    if (state.stats.multiplayerWinStreak > state.stats.bestMultiplayerWinStreak) {
      state.stats.bestMultiplayerWinStreak = state.stats.multiplayerWinStreak;
    }
  } else {
    state.stats.multiplayerWinStreak = 0;
  }

  const updated = checkNewAdvancements(state);
  saveAdvancementState(updated);

  // Sync to Firestore and write notifications for newly unlocked
  syncToFirestore(updated);
  for (const advId of updated.newlyUnlockedIds) {
    writeNotification(advId);
  }

  return updated;
}

/**
 * Project what advancements would unlock given current in-game session stats,
 * WITHOUT saving anything. Pure, synchronous, cheap — safe to call every lock().
 * Returns advancement IDs that newly qualify (not yet in saved unlockedIds).
 */
export function checkLiveGameAdvancements(sessionStats: GameEndStats): string[] {
  const state = loadAdvancementState();
  const projected = { ...state.stats };

  // Cumulative fields: add session on top of saved
  projected.totalScore += sessionStats.score;
  projected.totalLines += sessionStats.lines;
  projected.totalTSpins += sessionStats.tSpins;
  projected.totalPerfectBeats += sessionStats.perfectBeats;
  projected.totalTetrisClears += sessionStats.tetrisClears;
  projected.totalHardDrops += sessionStats.hardDrops;
  projected.totalPiecesPlaced += sessionStats.piecesPlaced;
  projected.totalGamesPlayed += 1;
  projected.worldsCleared += sessionStats.worldsCleared;

  // Best-of fields: max of saved and session
  if (sessionStats.score > projected.bestScorePerGame) {
    projected.bestScorePerGame = sessionStats.score;
  }
  if (sessionStats.lines > projected.bestLinesPerGame) {
    projected.bestLinesPerGame = sessionStats.lines;
  }
  if (sessionStats.bestCombo > projected.bestCombo) {
    projected.bestCombo = sessionStats.bestCombo;
  }
  if (sessionStats.perfectBeats > projected.bestPerfectBeatsPerGame) {
    projected.bestPerfectBeatsPerGame = sessionStats.perfectBeats;
  }
  if (sessionStats.tSpins > projected.bestTSpinsPerGame) {
    projected.bestTSpinsPerGame = sessionStats.tSpins;
  }
  if (sessionStats.tetrisClears > projected.bestTetrisClearsPerGame) {
    projected.bestTetrisClearsPerGame = sessionStats.tetrisClears;
  }
  if (sessionStats.hardDrops > projected.bestHardDropsPerGame) {
    projected.bestHardDropsPerGame = sessionStats.hardDrops;
  }
  if (sessionStats.piecesPlaced > projected.bestPiecesPerGame) {
    projected.bestPiecesPerGame = sessionStats.piecesPlaced;
  }

  const qualifying: string[] = [];
  for (const adv of ADVANCEMENTS) {
    if (state.unlockedIds.includes(adv.id)) continue;
    if (projected[adv.statKey] >= adv.threshold) {
      qualifying.push(adv.id);
    }
  }
  return qualifying;
}

/**
 * Same as checkLiveGameAdvancements but for multiplayer session stats.
 */
export function checkLiveMultiplayerAdvancements(sessionStats: MultiplayerGameEndStats): string[] {
  const state = loadAdvancementState();
  const projected = { ...state.stats };

  projected.totalScore += sessionStats.score;
  projected.totalLines += sessionStats.lines;
  projected.totalHardDrops += sessionStats.hardDrops;
  projected.totalPiecesPlaced += sessionStats.piecesPlaced;
  projected.totalMultiplayerGames += 1;
  projected.totalGamesPlayed += 1;

  if (sessionStats.score > projected.bestScorePerGame) {
    projected.bestScorePerGame = sessionStats.score;
  }
  if (sessionStats.lines > projected.bestLinesPerGame) {
    projected.bestLinesPerGame = sessionStats.lines;
  }
  if (sessionStats.hardDrops > projected.bestHardDropsPerGame) {
    projected.bestHardDropsPerGame = sessionStats.hardDrops;
  }
  if (sessionStats.piecesPlaced > projected.bestPiecesPerGame) {
    projected.bestPiecesPerGame = sessionStats.piecesPlaced;
  }

  const qualifying: string[] = [];
  for (const adv of ADVANCEMENTS) {
    if (state.unlockedIds.includes(adv.id)) continue;
    if (projected[adv.statKey] >= adv.threshold) {
      qualifying.push(adv.id);
    }
  }
  return qualifying;
}

/**
 * Instantly persist newly unlocked advancement IDs mid-game.
 * Only saves the unlock flags (not session stats) so recordGameEnd()
 * can still accumulate stats correctly without double-counting.
 * Syncs to Firestore and writes notifications for each new unlock.
 */
export function saveLiveUnlocks(newIds: string[]): void {
  if (newIds.length === 0) return;

  const state = loadAdvancementState();
  const deduped = newIds.filter(id => !state.unlockedIds.includes(id));
  if (deduped.length === 0) return;

  const updated = {
    ...state,
    unlockedIds: [...state.unlockedIds, ...deduped],
    newlyUnlockedIds: deduped,
  };

  saveAdvancementState(updated);
  syncToFirestore(updated);
  for (const advId of deduped) {
    writeNotification(advId);
  }
}

export function getUnlockedCount(): number {
  const state = loadAdvancementState();
  return state.unlockedIds.length;
}

/**
 * Sync loyalty stats (visits, streaks, polls) into the advancement system.
 * Checks for newly unlocked loyalty advancements, saves, and syncs to Firestore.
 */
export function syncLoyaltyStats(loyaltyStats: { totalVisits: number; bestStreak: number; pollsVoted: number }): AdvancementState {
  const state = loadAdvancementState();

  state.stats.totalVisits = loyaltyStats.totalVisits;
  state.stats.bestStreak = loyaltyStats.bestStreak;
  state.stats.pollsVoted = loyaltyStats.pollsVoted;

  const updated = checkNewAdvancements(state);
  saveAdvancementState(updated);

  syncToFirestore(updated);
  for (const advId of updated.newlyUnlockedIds) {
    writeNotification(advId);
  }

  return updated;
}
