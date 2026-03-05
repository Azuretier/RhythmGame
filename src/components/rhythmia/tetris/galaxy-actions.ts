// ===== Galaxy TD Game Actions =====
// Discriminated union of all actions that can mutate Galaxy TD state.
// In single-player, these dispatch directly to engine functions.
// In multiplayer (future), these are serialized and sent over WebSocket.

import type { TowerType } from './galaxy-types';

export type GameAction =
    | { type: 'place_tower'; towerType: TowerType; slotIndex: number; playerId?: string }
    | { type: 'upgrade_tower'; towerId: string; playerId?: string }
    | { type: 'sell_tower'; towerId: string; playerId?: string }
    | { type: 'select_tower_type'; towerType: TowerType | null; playerId?: string }
    | { type: 'select_tower'; towerId: string | null; playerId?: string }
    | { type: 'line_clear'; lineCount: number; playerId?: string }
    | { type: 'tick'; dt: number }
    | { type: 'start_wave' }
    | { type: 'reset' };
