// ===== Puzzle Memory Card Game Types =====

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface PuzzleDifficultyConfig {
  cols: number;
  rows: number;
  pairs: number;
}

export const PUZZLE_DIFFICULTIES: Record<PuzzleDifficulty, PuzzleDifficultyConfig> = {
  easy: { cols: 4, rows: 3, pairs: 6 },
  medium: { cols: 4, rows: 4, pairs: 8 },
  hard: { cols: 5, rows: 4, pairs: 10 },
  expert: { cols: 6, rows: 5, pairs: 15 },
};

export const PUZZLE_MAX_PLAYERS = 2;
export const PUZZLE_MATCH_SCORE = 100;
export const PUZZLE_COMBO_BONUS = 50;
export const PUZZLE_WINNER_BONUS = 200;
export const PUZZLE_FLIP_DELAY = 1200; // ms before unmatched cards flip back

// Card symbols — emoji icons for card faces
export const PUZZLE_SYMBOLS = [
  '🎵', '⚔️', '🛡️', '💎', '🔥', '⭐', '🌙', '☀️',
  '🎮', '🏆', '👑', '🗡️', '🧩', '🎯', '🎪', '🌊',
  '🦴', '🍎', '⛏️', '🪓', '🏹', '🧱', '🌲', '🍖',
  '🐉', '🦇', '🕷️', '🐙', '🌸', '💀',
];

// ===== Card & Game State =====

export interface PuzzleCard {
  id: number;
  symbolIndex: number;
  faceUp: boolean;
  matchedBy: string | null; // playerId who matched this card
}

export interface PuzzlePlayerState {
  id: string;
  name: string;
  score: number;
  pairs: number;
  consecutiveMatches: number;
  ready: boolean;
  connected: boolean;
}

export interface PuzzleRoomState {
  code: string;
  name: string;
  hostId: string;
  players: PuzzlePlayerState[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  difficulty: PuzzleDifficulty;
  maxPlayers: number;
  isPublic: boolean;
}

export interface PuzzleGameState {
  cards: PuzzleCard[];
  currentTurnPlayerId: string;
  flippedCardIds: number[]; // 0-2 cards currently flipped this turn
  totalPairs: number;
  matchedPairs: number;
  players: PuzzlePlayerState[];
}

export interface PuzzlePublicRoom {
  code: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  difficulty: PuzzleDifficulty;
}

// ===== Client -> Server Messages =====

export type PuzzleClientMessage =
  | { type: 'puzzle_create_room'; playerName: string; roomName?: string; difficulty?: PuzzleDifficulty }
  | { type: 'puzzle_join_room'; roomCode: string; playerName: string }
  | { type: 'puzzle_get_rooms' }
  | { type: 'puzzle_leave' }
  | { type: 'puzzle_ready'; ready: boolean }
  | { type: 'puzzle_start' }
  | { type: 'puzzle_flip_card'; cardId: number }
  | { type: 'puzzle_set_difficulty'; difficulty: PuzzleDifficulty };

// ===== Server -> Client Messages =====

export type PuzzleServerMessage =
  | { type: 'puzzle_room_created'; roomCode: string; playerId: string; reconnectToken: string }
  | { type: 'puzzle_joined_room'; roomCode: string; playerId: string; roomState: PuzzleRoomState; reconnectToken: string }
  | { type: 'puzzle_room_state'; roomState: PuzzleRoomState }
  | { type: 'puzzle_room_list'; rooms: PuzzlePublicRoom[] }
  | { type: 'puzzle_player_joined'; player: PuzzlePlayerState }
  | { type: 'puzzle_player_left'; playerId: string }
  | { type: 'puzzle_player_ready'; playerId: string; ready: boolean }
  | { type: 'puzzle_countdown'; count: number }
  | { type: 'puzzle_game_started'; gameState: PuzzleGameState }
  | { type: 'puzzle_card_flipped'; cardId: number; symbolIndex: number; playerId: string }
  | { type: 'puzzle_match_found'; cardId1: number; cardId2: number; playerId: string; score: number; combo: number }
  | { type: 'puzzle_match_failed'; cardId1: number; cardId2: number; playerId: string }
  | { type: 'puzzle_turn_change'; playerId: string }
  | { type: 'puzzle_game_over'; winnerId: string | null; players: PuzzlePlayerState[]; isDraw: boolean }
  | { type: 'puzzle_error'; message: string };
