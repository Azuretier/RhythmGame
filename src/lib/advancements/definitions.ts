import type { Advancement } from './types';

export const ADVANCEMENTS: Advancement[] = [
  // === Lines Cleared (Total) ===
  { id: 'lines_10', category: 'lines', icon: 'lines', threshold: 10, statKey: 'totalLines' },
  { id: 'lines_50', category: 'lines', icon: 'lines', threshold: 50, statKey: 'totalLines' },
  { id: 'lines_200', category: 'lines', icon: 'lines', threshold: 200, statKey: 'totalLines' },
  { id: 'lines_500', category: 'lines', icon: 'lines', threshold: 500, statKey: 'totalLines' },
  { id: 'lines_1000', category: 'lines', icon: 'lines', threshold: 1000, statKey: 'totalLines' },
  { id: 'lines_2500', category: 'lines', icon: 'lines', threshold: 2500, statKey: 'totalLines' },
  { id: 'lines_5000', category: 'lines', icon: 'lines', threshold: 5000, statKey: 'totalLines' },

  // === Best Lines Per Game ===
  { id: 'best_lines_10', category: 'lines', icon: 'target', threshold: 10, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_25', category: 'lines', icon: 'target', threshold: 25, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_50', category: 'lines', icon: 'target', threshold: 50, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_100', category: 'lines', icon: 'target', threshold: 100, statKey: 'bestLinesPerGame' },
  { id: 'best_lines_200', category: 'lines', icon: 'target', threshold: 200, statKey: 'bestLinesPerGame' },

  // === T-Spin Count (Total) ===
  { id: 'tspin_1', category: 'tspin', icon: 'spin', threshold: 1, statKey: 'totalTSpins' },
  { id: 'tspin_10', category: 'tspin', icon: 'spin', threshold: 10, statKey: 'totalTSpins' },
  { id: 'tspin_50', category: 'tspin', icon: 'spin', threshold: 50, statKey: 'totalTSpins' },
  { id: 'tspin_200', category: 'tspin', icon: 'spin', threshold: 200, statKey: 'totalTSpins' },
  { id: 'tspin_500', category: 'tspin', icon: 'spin', threshold: 500, statKey: 'totalTSpins' },
  { id: 'tspin_1000', category: 'tspin', icon: 'spin', threshold: 1000, statKey: 'totalTSpins' },

  // === Best T-Spins Per Game ===
  { id: 'best_tspin_1', category: 'tspin', icon: 'spark', threshold: 1, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_5', category: 'tspin', icon: 'spark', threshold: 5, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_10', category: 'tspin', icon: 'spark', threshold: 10, statKey: 'bestTSpinsPerGame' },
  { id: 'best_tspin_25', category: 'tspin', icon: 'spark', threshold: 25, statKey: 'bestTSpinsPerGame' },

  // === Total Score ===
  { id: 'score_10k', category: 'score', icon: 'gem', threshold: 10000, statKey: 'totalScore' },
  { id: 'score_100k', category: 'score', icon: 'gem', threshold: 100000, statKey: 'totalScore' },
  { id: 'score_1m', category: 'score', icon: 'gem', threshold: 1000000, statKey: 'totalScore' },
  { id: 'score_10m', category: 'score', icon: 'gem', threshold: 10000000, statKey: 'totalScore' },
  { id: 'score_50m', category: 'score', icon: 'gem', threshold: 50000000, statKey: 'totalScore' },
  { id: 'score_100m', category: 'score', icon: 'gem', threshold: 100000000, statKey: 'totalScore' },

  // === Best Score Per Game ===
  { id: 'best_score_5k', category: 'score', icon: 'star', threshold: 5000, statKey: 'bestScorePerGame' },
  { id: 'best_score_25k', category: 'score', icon: 'star', threshold: 25000, statKey: 'bestScorePerGame' },
  { id: 'best_score_100k', category: 'score', icon: 'star', threshold: 100000, statKey: 'bestScorePerGame' },
  { id: 'best_score_500k', category: 'score', icon: 'star', threshold: 500000, statKey: 'bestScorePerGame' },
  { id: 'best_score_1m', category: 'score', icon: 'star', threshold: 1000000, statKey: 'bestScorePerGame' },

  // === Combo (Best Chain) ===
  { id: 'combo_3', category: 'combo', icon: 'flame', threshold: 3, statKey: 'bestCombo' },
  { id: 'combo_10', category: 'combo', icon: 'flame', threshold: 10, statKey: 'bestCombo' },
  { id: 'combo_20', category: 'combo', icon: 'flame', threshold: 20, statKey: 'bestCombo' },
  { id: 'combo_30', category: 'combo', icon: 'flame', threshold: 30, statKey: 'bestCombo' },
  { id: 'combo_50', category: 'combo', icon: 'flame', threshold: 50, statKey: 'bestCombo' },
  { id: 'combo_75', category: 'combo', icon: 'flame', threshold: 75, statKey: 'bestCombo' },
  { id: 'combo_100', category: 'combo', icon: 'flame', threshold: 100, statKey: 'bestCombo' },
  { id: 'combo_150', category: 'combo', icon: 'flame', threshold: 150, statKey: 'bestCombo' },
  { id: 'combo_200', category: 'combo', icon: 'flame', threshold: 200, statKey: 'bestCombo' },

  // === Total Combos (Accumulated Across Games) ===
  { id: 'total_combo_50', category: 'combo', icon: 'burst', threshold: 50, statKey: 'totalCombos' },
  { id: 'total_combo_100', category: 'combo', icon: 'burst', threshold: 100, statKey: 'totalCombos' },
  { id: 'total_combo_250', category: 'combo', icon: 'burst', threshold: 250, statKey: 'totalCombos' },
  { id: 'total_combo_500', category: 'combo', icon: 'burst', threshold: 500, statKey: 'totalCombos' },
  { id: 'total_combo_1000', category: 'combo', icon: 'burst', threshold: 1000, statKey: 'totalCombos' },
  { id: 'total_combo_2500', category: 'combo', icon: 'burst', threshold: 2500, statKey: 'totalCombos' },
  { id: 'total_combo_5000', category: 'combo', icon: 'burst', threshold: 5000, statKey: 'totalCombos' },

  // === General ===
  { id: 'games_1', category: 'general', icon: 'controller', threshold: 1, statKey: 'totalGamesPlayed' },
  { id: 'games_10', category: 'general', icon: 'controller', threshold: 10, statKey: 'totalGamesPlayed' },
  { id: 'games_50', category: 'general', icon: 'controller', threshold: 50, statKey: 'totalGamesPlayed' },
  { id: 'games_100', category: 'general', icon: 'controller', threshold: 100, statKey: 'totalGamesPlayed' },
  { id: 'games_250', category: 'general', icon: 'controller', threshold: 250, statKey: 'totalGamesPlayed' },
  { id: 'games_500', category: 'general', icon: 'controller', threshold: 500, statKey: 'totalGamesPlayed' },
  { id: 'worlds_5', category: 'general', icon: 'globe', threshold: 5, statKey: 'worldsCleared' },
  { id: 'tetris_1', category: 'general', icon: 'burst', threshold: 1, statKey: 'totalTetrisClears' },
  { id: 'tetris_10', category: 'general', icon: 'burst', threshold: 10, statKey: 'totalTetrisClears' },
  { id: 'tetris_50', category: 'general', icon: 'burst', threshold: 50, statKey: 'totalTetrisClears' },
  { id: 'tetris_100', category: 'general', icon: 'burst', threshold: 100, statKey: 'totalTetrisClears' },
  { id: 'tetris_200', category: 'general', icon: 'burst', threshold: 200, statKey: 'totalTetrisClears' },
  // === T-Spin Speed (best count in 30s window) ===
  { id: 'tspin_speed_2', category: 'tspin', icon: 'spark', threshold: 2, statKey: 'bestTSpinsIn30s' },
  { id: 'tspin_speed_3', category: 'tspin', icon: 'spark', threshold: 3, statKey: 'bestTSpinsIn30s' },
  { id: 'tspin_speed_5', category: 'tspin', icon: 'spark', threshold: 5, statKey: 'bestTSpinsIn30s' },
  // === Tetris Speed (best count in 60s window) ===
  { id: 'tetris_speed_2', category: 'general', icon: 'firework', threshold: 2, statKey: 'bestTetrisIn60s' },
  { id: 'tetris_speed_3', category: 'general', icon: 'firework', threshold: 3, statKey: 'bestTetrisIn60s' },
  { id: 'tetris_speed_5', category: 'general', icon: 'firework', threshold: 5, statKey: 'bestTetrisIn60s' },
  // === Best Tetris Clears Per Game ===
  { id: 'best_tetris_1', category: 'general', icon: 'firework', threshold: 1, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_3', category: 'general', icon: 'firework', threshold: 3, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_5', category: 'general', icon: 'firework', threshold: 5, statKey: 'bestTetrisClearsPerGame' },
  { id: 'best_tetris_10', category: 'general', icon: 'firework', threshold: 10, statKey: 'bestTetrisClearsPerGame' },
  // === Best Perfect Beats Per Game ===
  { id: 'perfect_beats_10', category: 'general', icon: 'note', threshold: 10, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'perfect_beats_50', category: 'general', icon: 'note', threshold: 50, statKey: 'bestPerfectBeatsPerGame' },
  { id: 'perfect_beats_100', category: 'general', icon: 'note', threshold: 100, statKey: 'bestPerfectBeatsPerGame' },
  // === Total Perfect Beats ===
  { id: 'total_perfect_beats_50', category: 'general', icon: 'notes', threshold: 50, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_200', category: 'general', icon: 'notes', threshold: 200, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_500', category: 'general', icon: 'notes', threshold: 500, statKey: 'totalPerfectBeats' },
  { id: 'total_perfect_beats_1000', category: 'general', icon: 'notes', threshold: 1000, statKey: 'totalPerfectBeats' },
  // === Total Hard Drops ===
  { id: 'hard_drops_100', category: 'general', icon: 'bolt', threshold: 100, statKey: 'totalHardDrops' },
  { id: 'hard_drops_1000', category: 'general', icon: 'bolt', threshold: 1000, statKey: 'totalHardDrops' },
  { id: 'hard_drops_5000', category: 'general', icon: 'bolt', threshold: 5000, statKey: 'totalHardDrops' },
  // === Best Hard Drops Per Game ===
  { id: 'best_hard_drops_50', category: 'general', icon: 'bolt', threshold: 50, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_100', category: 'general', icon: 'bolt', threshold: 100, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_200', category: 'general', icon: 'bolt', threshold: 200, statKey: 'bestHardDropsPerGame' },
  { id: 'best_hard_drops_500', category: 'general', icon: 'bolt', threshold: 500, statKey: 'bestHardDropsPerGame' },
  // === Total Pieces Placed ===
  { id: 'pieces_100', category: 'general', icon: 'brick', threshold: 100, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_1000', category: 'general', icon: 'brick', threshold: 1000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_10000', category: 'general', icon: 'brick', threshold: 10000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_50000', category: 'general', icon: 'brick', threshold: 50000, statKey: 'totalPiecesPlaced' },
  { id: 'pieces_100000', category: 'general', icon: 'brick', threshold: 100000, statKey: 'totalPiecesPlaced' },
  // === Best Pieces Per Game ===
  { id: 'best_pieces_50', category: 'general', icon: 'puzzle', threshold: 50, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_100', category: 'general', icon: 'puzzle', threshold: 100, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_250', category: 'general', icon: 'puzzle', threshold: 250, statKey: 'bestPiecesPerGame' },
  { id: 'best_pieces_500', category: 'general', icon: 'puzzle', threshold: 500, statKey: 'bestPiecesPerGame' },

  // === Multiplayer ===
  { id: 'mp_win_1', category: 'multiplayer', icon: 'trophy', threshold: 1, statKey: 'multiplayerWins' },
  { id: 'mp_win_10', category: 'multiplayer', icon: 'trophy', threshold: 10, statKey: 'multiplayerWins' },
  { id: 'mp_win_50', category: 'multiplayer', icon: 'trophy', threshold: 50, statKey: 'multiplayerWins' },
  { id: 'mp_win_100', category: 'multiplayer', icon: 'trophy', threshold: 100, statKey: 'multiplayerWins' },
  { id: 'mp_win_200', category: 'multiplayer', icon: 'trophy', threshold: 200, statKey: 'multiplayerWins' },
  { id: 'mp_streak_3', category: 'multiplayer', icon: 'crown', threshold: 3, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_5', category: 'multiplayer', icon: 'crown', threshold: 5, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_10', category: 'multiplayer', icon: 'crown', threshold: 10, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_15', category: 'multiplayer', icon: 'crown', threshold: 15, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_streak_20', category: 'multiplayer', icon: 'crown', threshold: 20, statKey: 'bestMultiplayerWinStreak' },
  { id: 'mp_games_10', category: 'multiplayer', icon: 'swords', threshold: 10, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_50', category: 'multiplayer', icon: 'swords', threshold: 50, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_100', category: 'multiplayer', icon: 'swords', threshold: 100, statKey: 'totalMultiplayerGames' },
  { id: 'mp_games_200', category: 'multiplayer', icon: 'swords', threshold: 200, statKey: 'totalMultiplayerGames' },

  // === Loyalty ===
  { id: 'loyalty_streak_3', category: 'loyalty', icon: 'flame', threshold: 3, statKey: 'bestStreak' },
  { id: 'loyalty_streak_7', category: 'loyalty', icon: 'flame', threshold: 7, statKey: 'bestStreak' },
  { id: 'loyalty_streak_14', category: 'loyalty', icon: 'flame', threshold: 14, statKey: 'bestStreak' },
  { id: 'loyalty_streak_30', category: 'loyalty', icon: 'flame', threshold: 30, statKey: 'bestStreak' },
  { id: 'loyalty_streak_60', category: 'loyalty', icon: 'flame', threshold: 60, statKey: 'bestStreak' },
  { id: 'loyalty_streak_100', category: 'loyalty', icon: 'flame', threshold: 100, statKey: 'bestStreak' },
  { id: 'loyalty_visits_5', category: 'loyalty', icon: 'steps', threshold: 5, statKey: 'totalVisits' },
  { id: 'loyalty_visits_25', category: 'loyalty', icon: 'steps', threshold: 25, statKey: 'totalVisits' },
  { id: 'loyalty_visits_100', category: 'loyalty', icon: 'steps', threshold: 100, statKey: 'totalVisits' },
  { id: 'loyalty_visits_250', category: 'loyalty', icon: 'steps', threshold: 250, statKey: 'totalVisits' },
  { id: 'loyalty_visits_500', category: 'loyalty', icon: 'steps', threshold: 500, statKey: 'totalVisits' },
  { id: 'loyalty_games_10', category: 'loyalty', icon: 'controller', threshold: 10, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_50', category: 'loyalty', icon: 'controller', threshold: 50, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_200', category: 'loyalty', icon: 'controller', threshold: 200, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_500', category: 'loyalty', icon: 'controller', threshold: 500, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_games_1000', category: 'loyalty', icon: 'controller', threshold: 1000, statKey: 'totalGamesPlayed' },
  { id: 'loyalty_polls_1', category: 'loyalty', icon: 'ballot', threshold: 1, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_5', category: 'loyalty', icon: 'ballot', threshold: 5, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_10', category: 'loyalty', icon: 'ballot', threshold: 10, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_25', category: 'loyalty', icon: 'ballot', threshold: 25, statKey: 'pollsVoted' },
  { id: 'loyalty_polls_50', category: 'loyalty', icon: 'ballot', threshold: 50, statKey: 'pollsVoted' },

  // === Treasure (Gold & Treasures) ===
  { id: 'gold_100', category: 'treasure', icon: 'coin', threshold: 100, statKey: 'totalGoldEarned' },
  { id: 'gold_1000', category: 'treasure', icon: 'coin', threshold: 1000, statKey: 'totalGoldEarned' },
  { id: 'gold_5000', category: 'treasure', icon: 'coin', threshold: 5000, statKey: 'totalGoldEarned' },
  { id: 'gold_25000', category: 'treasure', icon: 'coin', threshold: 25000, statKey: 'totalGoldEarned' },
  { id: 'gold_100000', category: 'treasure', icon: 'coin', threshold: 100000, statKey: 'totalGoldEarned' },
  { id: 'treasure_10', category: 'treasure', icon: 'chest', threshold: 10, statKey: 'totalTreasuresCollected' },
  { id: 'treasure_50', category: 'treasure', icon: 'chest', threshold: 50, statKey: 'totalTreasuresCollected' },
  { id: 'treasure_200', category: 'treasure', icon: 'chest', threshold: 200, statKey: 'totalTreasuresCollected' },
  { id: 'treasure_500', category: 'treasure', icon: 'chest', threshold: 500, statKey: 'totalTreasuresCollected' },
  { id: 'treasure_1000', category: 'treasure', icon: 'chest', threshold: 1000, statKey: 'totalTreasuresCollected' },

  // === Puzzle ===
  { id: 'puzzle_games_1', category: 'puzzle', icon: 'puzzle', threshold: 1, statKey: 'puzzleGamesPlayed' },
  { id: 'puzzle_games_10', category: 'puzzle', icon: 'puzzle', threshold: 10, statKey: 'puzzleGamesPlayed' },
  { id: 'puzzle_games_50', category: 'puzzle', icon: 'puzzle', threshold: 50, statKey: 'puzzleGamesPlayed' },
  { id: 'puzzle_wins_1', category: 'puzzle', icon: 'trophy', threshold: 1, statKey: 'puzzleGamesWon' },
  { id: 'puzzle_wins_10', category: 'puzzle', icon: 'trophy', threshold: 10, statKey: 'puzzleGamesWon' },
  { id: 'puzzle_wins_25', category: 'puzzle', icon: 'trophy', threshold: 25, statKey: 'puzzleGamesWon' },
  { id: 'puzzle_pairs_10', category: 'puzzle', icon: 'gem', threshold: 10, statKey: 'puzzlePairsMatched' },
  { id: 'puzzle_pairs_50', category: 'puzzle', icon: 'gem', threshold: 50, statKey: 'puzzlePairsMatched' },
  { id: 'puzzle_pairs_200', category: 'puzzle', icon: 'gem', threshold: 200, statKey: 'puzzlePairsMatched' },
  { id: 'puzzle_combo_3', category: 'puzzle', icon: 'flame', threshold: 3, statKey: 'puzzleBestCombo' },
  { id: 'puzzle_combo_5', category: 'puzzle', icon: 'flame', threshold: 5, statKey: 'puzzleBestCombo' },
  { id: 'puzzle_perfect_1', category: 'puzzle', icon: 'star', threshold: 1, statKey: 'puzzlePerfectGames' },
];

export const BATTLE_ARENA_REQUIRED_ADVANCEMENTS = 3;
