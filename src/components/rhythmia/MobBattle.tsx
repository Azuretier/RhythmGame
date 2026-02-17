'use client';

/**
 * MobBattle — Mob Battle variant of the multiplayer Tetris battle.
 *
 * Currently uses the same underlying MultiplayerBattle component.
 * Mob-specific mechanics (summon monsters, base destruction, etc.)
 * can be layered on top in a future iteration.
 */

import MultiplayerBattle from './MultiplayerBattle';
import type { Player } from '@/types/multiplayer';

interface MobBattleProps {
    ws: WebSocket;
    roomCode: string;
    playerId: string;
    playerName: string;
    opponents: Player[];
    gameSeed: number;
    onGameEnd: (winnerId: string) => void;
    onBackToLobby: () => void;
}

export default function MobBattle(props: MobBattleProps) {
    return <MultiplayerBattle {...props} />;
}
