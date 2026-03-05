// ===== Galaxy TD Multiplayer Protocol Types =====
// WebSocket message types for future Galaxy TD multiplayer mode.
// Follows the same pattern as existing multiplayer.ts protocol types.

import type { GameAction } from '@/components/rhythmia/tetris/galaxy-actions';
import type { GalaxyTDState, GalaxyRingSide } from '@/components/rhythmia/tetris/galaxy-types';

// ===== Player Slot =====

export interface PlayerSlot {
    id: string;
    name: string;
    sides: GalaxyRingSide[];
    ready: boolean;
}

// ===== Client -> Server Messages =====

export type GalaxyTDClientMessage =
    | { type: 'gtd_join_room'; roomId: string; playerId: string }
    | { type: 'gtd_leave_room' }
    | { type: 'gtd_game_action'; action: GameAction }
    | { type: 'gtd_ready' };

// ===== Server -> Client Messages =====

export type GalaxyTDServerMessage =
    | { type: 'gtd_room_joined'; roomId: string; players: PlayerSlot[] }
    | { type: 'gtd_player_joined'; player: PlayerSlot }
    | { type: 'gtd_player_left'; playerId: string }
    | { type: 'gtd_game_state'; state: GalaxyTDState }
    | { type: 'gtd_action_applied'; action: GameAction; playerId: string }
    | { type: 'gtd_game_over'; winnerId: string }
    | { type: 'gtd_error'; message: string };
