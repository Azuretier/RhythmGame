import type { Advancement } from './types';

export const ADVANCEMENTS: Advancement[] = [
  // === Lines Cleared (Total) ===
  { id: 'lines_10', category: 'lines', icon: '📏', threshold: 10, statKey: 'totalLines' },
  { id: 'lines_50', category: 'lines', icon: '📏', threshold: 50, statKey: 'totalLines' },
  { id: 'lines_200', category: 'lines', icon: '📏', threshold: 200, statKey: 'totalLines' },
  { id: 'lines_500', category: 'lines', icon: '📏', threshold: 500, statKey: 'totalLines' },
  { id: 'lines_1000', category: 'lines', icon: '📏', threshold: 1000, statKey: 'totalLines' },

  // === Best Lines Per Game ===
  { id: 'best_lines_10', category: 'lines', icon: '🎯', threshold: 10, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_25', category: 'lines', icon: '🎯', threshold: 25, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_50', category: 'lines', icon: '🎯', threshold: 50, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_100', category: 'lines', icon: '🎯', threshold: 100, statKey: 'bestLinesPerGame' },

  // === T-Spin Count (Total) ===
  { id: 'tspin_1', category: 'tspin', icon: '🌀', threshold: 1, statKey: 'totalTSpins' },
  { id: 'tspin_10', category: 'tspin', icon: '🌀', threshold: 10, statKey: 'totalTSpins' },
  { id: 'tspin_50', category: 'tspin', icon: '🌀', threshold: 50, statKey: 'totalTSpins' },
  { id: 'tspin_200', category: 'tspin', icon: '🌀', threshold: 200, statKey: 'totalTSpins' },

  // === Total Score ===
  { id: 'score_10k', category: 'score', icon: '💎', threshold: 10000, statKey: 'totalScore' },
  { id: 'score_100k', category: 'score', icon: '💎', threshold: 100000, statKey: 'totalScore' },
  { id: 'score_1m', category: 'score', icon: '💎', threshold: 1000000, statKey: 'totalScore' },
  { id: 'score_10m', category: 'score', icon: '💎', threshold: 10000000, statKey: 'totalScore' },

  // === Best Score Per Game ===
  { id: 'best_score_5k', category: 'score', icon: '⭐', threshold: 5000, statKey: 'bestScorePerGame' },
  { id: 'best_score_25k', category: 'score', icon: '⭐', threshold: 25000, statKey: 'bestScorePerGame' },
  { id: 'best_score_100k', category: 'score', icon: '⭐', threshold: 100000, statKey: 'bestScorePerGame' },
  { id: 'best_score_500k', category: 'score', icon: '⭐', threshold: 500000, statKey: 'bestScorePerGame' },

  // === Combo ===
  { id: 'combo_3', category: 'combo', icon: '🔥', threshold: 3, statKey: 'bestCombo' },
  { id: 'combo_10', category: 'combo', icon: '🔥', threshold: 10, statKey: 'bestCombo' },
  { id: 'combo_20', category: 'combo', icon: '🔥', threshold: 20, statKey: 'bestCombo' },

  // === General ===
  { id: 'games_1', category: 'general', icon: '🎮', threshold: 1, statKey: 'totalGamesPlayed' },
  { id: 'games_10', category: 'general', icon: '🎮', threshold: 10, statKey: 'totalGamesPlayed' },
  { id: 'games_50', category: 'general', icon: '🎮', threshold: 50, statKey: 'totalGamesPlayed' },
  { id: 'games_100', category: 'general', icon: '🎮', threshold: 100, statKey: 'totalGamesPlayed' },
  { id: 'worlds_5', category: 'general', icon: '🌍', threshold: 5, statKey: 'worldsCleared' },
  { id: 'tetris_1', category: 'general', icon: '💥', threshold: 1, statKey: 'totalTetrisClears' },
  { id: 'tetris_10', category: 'general', icon: '💥', threshold: 10, statKey: 'totalTetrisClears' },
  { id: 'tetris_50', category: 'general', icon: '💥', threshold: 50, statKey: 'totalTetrisClears' },
  { id: 'perfect_beats_10', category: 'general', icon: '🎵', threshold: 10, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'perfect_beats_50', category: 'general', icon: '🎵', threshold: 50, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'hard_drops_100', category: 'general', icon: '⚡', threshold: 100, statKey: 'totalHardDrops' },
  { id: 'hard_drops_1000', category: 'general', icon: '⚡', threshold: 1000, statKey: 'totalHardDrops' },
  { id: 'pieces_100', category: 'general', icon: '🧱', threshold: 100, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_1000', category: 'general', icon: '🧱', threshold: 1000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_10000', category: 'general', icon: '🧱', threshold: 10000, statKey: 'totalPiecesPlaced' },

  // === Multiplayer ===
  { id: 'mp_win_1', category: 'multiplayer', icon: '🏆', threshold: 1, statKey: 'multiplayerWins' },
  { id: 'mp_win_10', category: 'multiplayer', icon: '🏆', threshold: 10, statKey: 'multiplayerWins' },
  { id: 'mp_win_50', category: 'multiplayer', icon: '🏆', threshold: 50, statKey: 'multiplayerWins' },
  { id: 'mp_streak_3', category: 'multiplayer', icon: '👑', threshold: 3, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_5', category: 'multiplayer', icon: '👑', threshold: 5, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_10', category: 'multiplayer', icon: '👑', threshold: 10, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_games_10', category: 'multiplayer', icon: '⚔️', threshold: 10, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_50', category: 'multiplayer', icon: '⚔️', threshold: 50, statKey: 'totalMultiplayerGames' },
];

export const BATTLE_ARENA_REQUIRED_ADVANCEMENTS = 3;
