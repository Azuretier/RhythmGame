import { useMemo } from 'react';
import {
    LAYER_3D_DEFAULT,
    LAYER_3D_INTERACTIVE,
} from '../layer-constants';

/**
 * Layer interaction state for the Galaxy TD 3D ring.
 *
 * Manages which layer (2D UI vs 3D Canvas) captures pointer input
 * based on the current game state.
 *
 * Hitbox pattern:
 * - 3D clickable objects (tower slots, placed towers) use invisible
 *   expanded meshes (0.28 units) behind smaller visible markers for
 *   reliable raycasting.
 * - 2D UI always receives clicks first (higher z-index) unless the
 *   Canvas is raised to LAYER_3D_INTERACTIVE during tower interaction.
 * - The Canvas is transparent to clicks (pointer-events: none) when
 *   no interaction is active, allowing all clicks to pass through
 *   to the 2D game UI beneath.
 */

interface UseLayerInteractionProps {
    /** A tower type is selected for placement */
    selectedTowerType: unknown | null;
    /** An existing tower is selected (for upgrade/sell) */
    selectedTowerId: string | null;
    /** Game is paused (disable 3D interaction) */
    isPaused?: boolean;
    /** Game is over (disable 3D interaction) */
    gameOver?: boolean;
}

interface LayerInteractionState {
    /** Whether the 3D Canvas should capture pointer events */
    canvasPointerEvents: 'auto' | 'none';
    /** Z-index for the 3D Canvas */
    canvasZIndex: number;
    /** Whether any 3D interaction is active */
    hasInteraction: boolean;
}

/** Manages pointer-event routing between the 2D UI and 3D Canvas based on tower interaction state. */
export function useLayerInteraction({
    selectedTowerType,
    selectedTowerId,
    isPaused = false,
    gameOver = false,
}: UseLayerInteractionProps): LayerInteractionState {
    return useMemo(() => {
        // No 3D interaction when paused or game over
        if (isPaused || gameOver) {
            return {
                canvasPointerEvents: 'none' as const,
                canvasZIndex: LAYER_3D_DEFAULT,
                hasInteraction: false,
            };
        }

        const hasInteraction = selectedTowerType !== null || selectedTowerId !== null;

        return {
            canvasPointerEvents: hasInteraction ? 'auto' as const : 'none' as const,
            canvasZIndex: hasInteraction ? LAYER_3D_INTERACTIVE : LAYER_3D_DEFAULT,
            hasInteraction,
        };
    }, [selectedTowerType, selectedTowerId, isPaused, gameOver]);
}
