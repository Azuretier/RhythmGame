import type { PlayerStats, AdvancementState } from './types';
import { ADVANCEMENTS } from './definitions';

const STORAGE_KEY = 'rhythmia_advancements';

function getDefaultStats(): PlayerStats {
  return {
    totalLines: 0,
    bestLinesPerGame: 0,
    totalTSpins: 0,
    totalScore: 0,
    bestScorePerGame: 0,
    totalGamesPlayed: 0,
    bestCombo: 0,
    totalPerfectBeats: 0,
    bestPerfectBeatsPerGame: 0,
    worldsCleared: 0,
    totalTetrisClears: 0,
    multiplayerWins: 0,
    multiplayerWinStreak: 0,
    bestMultiplayerWinStreak: 0,
    totalMultiplayerGames: 0,
    totalHardDrops: 0,
    totalPiecesPlaced: 0,
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

  const updated = checkNewAdvancements(state);
  saveAdvancementState(updated);
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
  return updated;
}

export function getUnlockedCount(): number {
  const state = loadAdvancementState();
  return state.unlockedIds.length;
}
