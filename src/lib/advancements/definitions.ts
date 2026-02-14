import type { Advancement } from './types';

export const ADVANCEMENTS: Advancement[] = [
  // === Lines Cleared (Total) ===
  { id: 'lines_10', category: 'lines', icon: '📏', threshold: 10, statKey: 'totalLines' },
  { id: 'lines_50', category: 'lines', icon: '📏', threshold: 50, statKey: 'totalLines' },
  { id: 'lines_200', category: 'lines', icon: '📏', threshold: 200, statKey: 'totalLines' },
  { id: 'lines_500', category: 'lines', icon: '📏', threshold: 500, statKey: 'totalLines' },
  { id: 'lines_1000', category: 'lines', icon: '📏', threshold: 1000, statKey: 'totalLines' },
  { id: 'lines_2500', category: 'lines', icon: '📏', threshold: 2500, statKey: 'totalLines' },
  { id: 'lines_5000', category: 'lines', icon: '📏', threshold: 5000, statKey: 'totalLines' },

  // === Best Lines Per Game ===
  { id: 'best_lines_10', category: 'lines', icon: '🎯', threshold: 10, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_25', category: 'lines', icon: '🎯', threshold: 25, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_50', category: 'lines', icon: '🎯', threshold: 50, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_100', category: 'lines', icon: '🎯', threshold: 100, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_200', category: 'lines', icon: '🎯', threshold: 200, statKey: 'bestLinesPerGame' },

  // === T-Spin Count (Total) ===
  { id: 'tspin_1', category: 'tspin', icon: '🌀', threshold: 1, statKey: 'totalTSpins' },
  { id: 'tspin_10', category: 'tspin', icon: '🌀', threshold: 10, statKey: 'totalTSpins' },
  { id: 'tspin_50', category: 'tspin', icon: '🌀', threshold: 50, statKey: 'totalTSpins' },
  { id: 'tspin_200', category: 'tspin', icon: '🌀', threshold: 200, statKey: 'totalTSpins' },
  { id: 'tspin_500', category: 'tspin', icon: '🌀', threshold: 500, statKey: 'totalTSpins' },
  { id: 'tspin_1000', category: 'tspin', icon: '🌀', threshold: 1000, statKey: 'totalTSpins' },

  // === Best T-Spins Per Game ===
  { id: 'best_tspin_1', category: 'tspin', icon: '💫', threshold: 1, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_5', category: 'tspin', icon: '💫', threshold: 5, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_10', category: 'tspin', icon: '💫', threshold: 10, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_25', category: 'tspin', icon: '💫', threshold: 25, statKey: 'bestTSpinsPerGame' },

  // === Total Score ===
  { id: 'score_10k', category: 'score', icon: '💎', threshold: 10000, statKey: 'totalScore' },
  { id: 'score_100k', category: 'score', icon: '💎', threshold: 100000, statKey: 'totalScore' },
  { id: 'score_1m', category: 'score', icon: '💎', threshold: 1000000, statKey: 'totalScore' },
  { id: 'score_10m', category: 'score', icon: '💎', threshold: 10000000, statKey: 'totalScore' },
  { id: 'score_50m', category: 'score', icon: '💎', threshold: 50000000, statKey: 'totalScore' },
  { id: 'score_100m', category: 'score', icon: '💎', threshold: 100000000, statKey: 'totalScore' },

  // === Best Score Per Game ===
  { id: 'best_score_5k', category: 'score', icon: '⭐', threshold: 5000, statKey: 'bestScorePerGame' },
  { id: 'best_score_25k', category: 'score', icon: '⭐', threshold: 25000, statKey: 'bestScorePerGame' },
  { id: 'best_score_100k', category: 'score', icon: '⭐', threshold: 100000, statKey: 'bestScorePerGame' },
  { id: 'best_score_500k', category: 'score', icon: '⭐', threshold: 500000, statKey: 'bestScorePerGame' },
  { id: 'best_score_1m', category: 'score', icon: '⭐', threshold: 1000000, statKey: 'bestScorePerGame' },

  // === Combo (Best Chain) ===
  { id: 'combo_3', category: 'combo', icon: '🔥', threshold: 3, statKey: 'bestCombo' },
  { id: 'combo_10', category: 'combo', icon: '🔥', threshold: 10, statKey: 'bestCombo' },
  { id: 'combo_20', category: 'combo', icon: '🔥', threshold: 20, statKey: 'bestCombo' },
  { id: 'combo_30', category: 'combo', icon: '🔥', threshold: 30, statKey: 'bestCombo' },
  { id: 'combo_50', category: 'combo', icon: '🔥', threshold: 50, statKey: 'bestCombo' },
  { id: 'combo_75', category: 'combo', icon: '🔥', threshold: 75, statKey: 'bestCombo' },
  { id: 'combo_100', category: 'combo', icon: '🔥', threshold: 100, statKey: 'bestCombo' },
  { id: 'combo_150', category: 'combo', icon: '🔥', threshold: 150, statKey: 'bestCombo' },
  { id: 'combo_200', category: 'combo', icon: '🔥', threshold: 200, statKey: 'bestCombo' },

  // === Total Combos (Accumulated Across Games) ===
  { id: 'total_combo_50', category: 'combo', icon: '💥', threshold: 50, statKey: 'totalCombos' },
  { id: 'total_combo_100', category: 'combo', icon: '💥', threshold: 100, statKey: 'totalCombos' },
  { id: 'total_combo_250', category: 'combo', icon: '💥', threshold: 250, statKey: 'totalCombos' },
  { id: 'total_combo_500', category: 'combo', icon: '💥', threshold: 500, statKey: 'totalCombos' },
  { id: 'total_combo_1000', category: 'combo', icon: '💥', threshold: 1000, statKey: 'totalCombos' },
  { id: 'total_combo_2500', category: 'combo', icon: '💥', threshold: 2500, statKey: 'totalCombos' },
  { id: 'total_combo_5000', category: 'combo', icon: '💥', threshold: 5000, statKey: 'totalCombos' },

  // === General ===
  { id: 'games_1', category: 'general', icon: '🎮', threshold: 1, statKey: 'totalGamesPlayed' },
  { id: 'games_10', category: 'general', icon: '🎮', threshold: 10, statKey: 'totalGamesPlayed' },
  { id: 'games_50', category: 'general', icon: '🎮', threshold: 50, statKey: 'totalGamesPlayed' },
  { id: 'games_100', category: 'general', icon: '🎮', threshold: 100, statKey: 'totalGamesPlayed' },
  { id: 'games_250', category: 'general', icon: '🎮', threshold: 250, statKey: 'totalGamesPlayed' },
  { id: 'games_500', category: 'general', icon: '🎮', threshold: 500, statKey: 'totalGamesPlayed' },
  { id: 'worlds_5', category: 'general', icon: '🌍', threshold: 5, statKey: 'worldsCleared' },
  { id: 'tetris_1', category: 'general', icon: '💥', threshold: 1, statKey: 'totalTetrisClears' },
  { id: 'tetris_10', category: 'general', icon: '💥', threshold: 10, statKey: 'totalTetrisClears' },
  { id: 'tetris_50', category: 'general', icon: '💥', threshold: 50, statKey: 'totalTetrisClears' },
  { id: 'tetris_100', category: 'general', icon: '💥', threshold: 100, statKey: 'totalTetrisClears' },
  { id: 'tetris_200', category: 'general', icon: '💥', threshold: 200, statKey: 'totalTetrisClears' },
  // === Best Tetris Clears Per Game ===
  { id: 'best_tetris_1', category: 'general', icon: '🎆', threshold: 1, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_3', category: 'general', icon: '🎆', threshold: 3, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_5', category: 'general', icon: '🎆', threshold: 5, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_10', category: 'general', icon: '🎆', threshold: 10, statKey: 'bestTetrisClearsPerGame' },
  // === Best Perfect Beats Per Game ===
  { id: 'perfect_beats_10', category: 'general', icon: '🎵', threshold: 10, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'perfect_beats_50', category: 'general', icon: '🎵', threshold: 50, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'perfect_beats_100', category: 'general', icon: '🎵', threshold: 100, statKey: 'bestPerfectBeatsPerGame' },
  // === Total Perfect Beats ===
  { id: 'total_perfect_beats_50', category: 'general', icon: '🎶', threshold: 50, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_200', category: 'general', icon: '🎶', threshold: 200, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_500', category: 'general', icon: '🎶', threshold: 500, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_1000', category: 'general', icon: '🎶', threshold: 1000, statKey: 'totalPerfectBeats' },
  // === Total Hard Drops ===
  { id: 'hard_drops_100', category: 'general', icon: '⚡', threshold: 100, statKey: 'totalHardDrops' },
  { id: 'hard_drops_1000', category: 'general', icon: '⚡', threshold: 1000, statKey: 'totalHardDrops' },
  { id: 'hard_drops_5000', category: 'general', icon: '⚡', threshold: 5000, statKey: 'totalHardDrops' },
  // === Best Hard Drops Per Game ===
  { id: 'best_hard_drops_50', category: 'general', icon: '⚡', threshold: 50, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_100', category: 'general', icon: '⚡', threshold: 100, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_200', category: 'general', icon: '⚡', threshold: 200, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_500', category: 'general', icon: '⚡', threshold: 500, statKey: 'bestHardDropsPerGame' },
  // === Total Pieces Placed ===
  { id: 'pieces_100', category: 'general', icon: '🧱', threshold: 100, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_1000', category: 'general', icon: '🧱', threshold: 1000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_10000', category: 'general', icon: '🧱', threshold: 10000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_50000', category: 'general', icon: '🧱', threshold: 50000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_100000', category: 'general', icon: '🧱', threshold: 100000, statKey: 'totalPiecesPlaced' },
  // === Best Pieces Per Game ===
  { id: 'best_pieces_50', category: 'general', icon: '🧩', threshold: 50, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_100', category: 'general', icon: '🧩', threshold: 100, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_250', category: 'general', icon: '🧩', threshold: 250, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_500', category: 'general', icon: '🧩', threshold: 500, statKey: 'bestPiecesPerGame' },

  // === Multiplayer ===
  { id: 'mp_win_1', category: 'multiplayer', icon: '🏆', threshold: 1, statKey: 'multiplayerWins' },
  { id: 'mp_win_10', category: 'multiplayer', icon: '🏆', threshold: 10, statKey: 'multiplayerWins' },
  { id: 'mp_win_50', category: 'multiplayer', icon: '🏆', threshold: 50, statKey: 'multiplayerWins' },
  { id: 'mp_win_100', category: 'multiplayer', icon: '🏆', threshold: 100, statKey: 'multiplayerWins' },
  { id: 'mp_win_200', category: 'multiplayer', icon: '🏆', threshold: 200, statKey: 'multiplayerWins' },
  { id: 'mp_streak_3', category: 'multiplayer', icon: '👑', threshold: 3, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_5', category: 'multiplayer', icon: '👑', threshold: 5, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_10', category: 'multiplayer', icon: '👑', threshold: 10, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_15', category: 'multiplayer', icon: '👑', threshold: 15, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_20', category: 'multiplayer', icon: '👑', threshold: 20, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_games_10', category: 'multiplayer', icon: '⚔️', threshold: 10, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_50', category: 'multiplayer', icon: '⚔️', threshold: 50, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_100', category: 'multiplayer', icon: '⚔️', threshold: 100, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_200', category: 'multiplayer', icon: '⚔️', threshold: 200, statKey: 'totalMultiplayerGames' },

  // === Loyalty ===
  { id: 'loyalty_streak_3', category: 'loyalty', icon: '🔥', threshold: 3, statKey: 'bestStreak' },
  { id: 'loyalty_streak_7', category: 'loyalty', icon: '🔥', threshold: 7, statKey: 'bestStreak' },
  { id: 'loyalty_streak_14', category: 'loyalty', icon: '🔥', threshold: 14, statKey: 'bestStreak' },
  { id: 'loyalty_streak_30', category: 'loyalty', icon: '🔥', threshold: 30, statKey: 'bestStreak' },
  { id: 'loyalty_streak_60', category: 'loyalty', icon: '🔥', threshold: 60, statKey: 'bestStreak' },
  { id: 'loyalty_streak_100', category: 'loyalty', icon: '🔥', threshold: 100, statKey: 'bestStreak' },
  { id: 'loyalty_visits_5', category: 'loyalty', icon: '👣', threshold: 5, statKey: 'totalVisits' },
  { id: 'loyalty_visits_25', category: 'loyalty', icon: '👣', threshold: 25, statKey: 'totalVisits' },
  { id: 'loyalty_visits_100', category: 'loyalty', icon: '👣', threshold: 100, statKey: 'totalVisits' },
  { id: 'loyalty_visits_250', category: 'loyalty', icon: '👣', threshold: 250, statKey: 'totalVisits' },
  { id: 'loyalty_visits_500', category: 'loyalty', icon: '👣', threshold: 500, statKey: 'totalVisits' },
  { id: 'loyalty_games_10', category: 'loyalty', icon: '🎮', threshold: 10, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_50', category: 'loyalty', icon: '🎮', threshold: 50, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_200', category: 'loyalty', icon: '🎮', threshold: 200, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_500', category: 'loyalty', icon: '🎮', threshold: 500, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_1000', category: 'loyalty', icon: '🎮', threshold: 1000, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_polls_1', category: 'loyalty', icon: '🗳️', threshold: 1, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_5', category: 'loyalty', icon: '🗳️', threshold: 5, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_10', category: 'loyalty', icon: '🗳️', threshold: 10, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_25', category: 'loyalty', icon: '🗳️', threshold: 25, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_50', category: 'loyalty', icon: '🗳️', threshold: 50, statKey: 'pollsVoted' },
];

export const BATTLE_ARENA_REQUIRED_ADVANCEMENTS = 3;
