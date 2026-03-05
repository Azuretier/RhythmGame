'use client';

// ===== GameStateSync Context =====
// Wraps Galaxy TD state with a dispatch-based interface.
// Single-player mode: dispatch calls local engine functions directly.
// Multiplayer mode (future): dispatch sends actions to server, state from server.

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { GalaxyTDState } from '../galaxy-types';
import type { GameAction } from '../galaxy-actions';

interface GameStateSyncContextValue {
    state: GalaxyTDState;
    dispatch: (action: GameAction) => void;
    isMultiplayer: boolean;
    playerId: string | null;
}

const GameStateSyncContext = createContext<GameStateSyncContextValue | null>(null);

interface GameStateSyncProviderProps {
    children: ReactNode;
    state: GalaxyTDState;
    dispatch: (action: GameAction) => void;
    isMultiplayer?: boolean;
    playerId?: string | null;
}

/** Provides Galaxy TD game state and dispatch to the component tree via React Context. */
export function GameStateSyncProvider({
    children,
    state,
    dispatch,
    isMultiplayer = false,
    playerId = null,
}: GameStateSyncProviderProps) {
    const wrappedDispatch = useCallback((action: GameAction) => {
        // In single-player, dispatch directly.
        // In multiplayer (future), this would send to server instead.
        dispatch(action);
    }, [dispatch]);

    return (
        <GameStateSyncContext.Provider
            value={{ state, dispatch: wrappedDispatch, isMultiplayer, playerId }}
        >
            {children}
        </GameStateSyncContext.Provider>
    );
}

/** Consumes the Galaxy TD game state and dispatch from the nearest GameStateSyncProvider. */
export function useGameStateSync(): GameStateSyncContextValue {
    const ctx = useContext(GameStateSyncContext);
    if (!ctx) {
        throw new Error('useGameStateSync must be used within a GameStateSyncProvider');
    }
    return ctx;
}
