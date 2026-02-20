export type AdvancementCategory =
  | 'lines'
  | 'score'
  | 'tspin'
  | 'combo'
  | 'general'
  | 'multiplayer'
  | 'loyalty'
  | 'treasure';

export interface Advancement {
  id: string;
  category: AdvancementCategory;
  icon: string;
  threshold: number;
  statKey: keyof PlayerStats;
}

export interface PlayerStats {
  totalLines: number;
  bestLinesPerGame: number;
  totalTSpins: number;
  bestTSpinsPerGame: number;
  totalScore: number;
  bestScorePerGame: number;
  totalGamesPlayed: number;
  bestCombo: number;
  totalCombos: number;
  totalPerfectBeats: number;
  bestPerfectBeatsPerGame: number;
  worldsCleared: number;
  totalTetrisClears: number;
  bestTetrisClearsPerGame: number;
  multiplayerWins: number;
  multiplayerWinStreak: number;
  bestMultiplayerWinStreak: number;
  totalMultiplayerGames: number;
  totalHardDrops: number;
  bestHardDropsPerGame: number;
  totalPiecesPlaced: number;
  bestPiecesPerGame: number;
  // Speed stats (time-windowed bests)
  bestTSpinsIn30s: number;
  bestTetrisIn60s: number;
  // Loyalty stats
  totalVisits: number;
  bestStreak: number;
  pollsVoted: number;
  // Treasure stats
  totalGoldEarned: number;
  totalTreasuresCollected: number;
}

export interface AdvancementState {
  stats: PlayerStats;
  unlockedIds: string[];
  newlyUnlockedIds: string[];
}
