export type AdvancementCategory =
  | 'lines'
  | 'score'
  | 'tspin'
  | 'combo'
  | 'general'
  | 'multiplayer';

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
  totalScore: number;
  bestScorePerGame: number;
  totalGamesPlayed: number;
  bestCombo: number;
  totalPerfectBeats: number;
  bestPerfectBeatsPerGame: number;
  worldsCleared: number;
  totalTetrisClears: number;
  multiplayerWins: number;
  multiplayerWinStreak: number;
  bestMultiplayerWinStreak: number;
  totalMultiplayerGames: number;
  totalHardDrops: number;
  totalPiecesPlaced: number;
}

export interface AdvancementState {
  stats: PlayerStats;
  unlockedIds: string[];
  newlyUnlockedIds: string[];
}
