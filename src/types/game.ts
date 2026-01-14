// Game room and player types
export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  lastScoreEventTime?: number;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  state: RoomState;
  gameStartTime?: number;
  gameDuration: number; // in seconds
  maxPlayers: number;
}

export enum RoomState {
  LOBBY = 'lobby',
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

// Score event types
export interface ScoreEvent {
  type: 'click' | 'combo' | 'bonus';
  value: number;
  timestamp: number;
}

// Client-Server communication events
export interface ServerToClientEvents {
  // Room events
  'room:created': (data: { roomCode: string; roomId: string }) => void;
  'room:joined': (data: { 
    roomId: string; 
    players: Player[];
    state: RoomState;
  }) => void;
  'room:player-joined': (player: Player) => void;
  'room:player-left': (playerId: string) => void;
  'room:player-disconnected': (playerId: string) => void;
  'room:player-reconnected': (playerId: string) => void;
  'room:state-changed': (state: RoomState) => void;
  'room:error': (error: string) => void;

  // Game events
  'game:starting': (data: { startAt: number; duration: number }) => void;
  'game:started': () => void;
  'game:score-update': (data: { playerId: string; score: number }) => void;
  'game:finished': (leaderboard: Player[]) => void;

  // Connection events
  'connect': () => void;
  'disconnect': () => void;
}

export interface ClientToServerEvents {
  // Room actions
  'room:create': (playerName: string, callback: (response: { 
    success: boolean; 
    roomCode?: string; 
    roomId?: string; 
    error?: string 
  }) => void) => void;
  'room:join': (data: { roomCode: string; playerName: string }, callback: (response: {
    success: boolean;
    roomId?: string;
    players?: Player[];
    state?: RoomState;
    error?: string;
  }) => void) => void;
  'room:leave': () => void;

  // Game actions
  'game:start': (callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:score-event': (event: ScoreEvent) => void;

  // Connection
  'reconnect:attempt': (data: { roomId: string; playerId: string }) => void;
}

// Rate limiting configuration
export const RATE_LIMIT = {
  MAX_EVENTS_PER_SECOND: 10,
  MAX_EVENTS_WINDOW_MS: 1000,
};

// Game configuration
export const GAME_CONFIG = {
  DEFAULT_DURATION: 60, // seconds
  COUNTDOWN_DURATION: 3, // seconds
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 1,
  ROOM_CODE_LENGTH: 6,
  MAX_EVENT_VALUE: 1000, // Maximum points per single event
};
