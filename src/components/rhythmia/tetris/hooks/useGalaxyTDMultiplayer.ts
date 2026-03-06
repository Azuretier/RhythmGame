// ===== useGalaxyTDMultiplayer =====
// Stub hook that wraps useGalaxyTD with multiplayer capability.
// Currently delegates entirely to single-player useGalaxyTD.
// Future: connects to WebSocket server for cooperative/competitive play.

import { useCallback } from 'react';
import { useGalaxyTD } from './useGalaxyTD';

interface UseGalaxyTDMultiplayerProps {
    isPaused: boolean;
    gameOver: boolean;
}

/** Wraps useGalaxyTD with multiplayer stubs (connect/disconnect). Currently delegates entirely to single-player. */
export function useGalaxyTDMultiplayer(props: UseGalaxyTDMultiplayerProps) {
    const galaxyTD = useGalaxyTD(props);

    // Placeholder: connect to a multiplayer room (no-op for now)
    const connect = useCallback((_roomId: string) => {
        // Future: establish WebSocket connection and join room
    }, []);

    // Placeholder: disconnect from multiplayer room (no-op for now)
    const disconnect = useCallback(() => {
        // Future: leave room and close WebSocket connection
    }, []);

    return {
        ...galaxyTD,
        isMultiplayer: false as const,
        playerId: null as string | null,
        roomId: null as string | null,
        connect,
        disconnect,
    };
}
