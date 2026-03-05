'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { TowerType, RingEnemy, RingTower, RingProjectile, TowerSlot, GalaxyGate } from '../galaxy-types';
import { GalaxyRingScene } from './GalaxyScene';
import { LAYER_3D_DEFAULT, LAYER_3D_INTERACTIVE } from '../layer-constants';

// ===== Exported Canvas wrapper =====
export interface GalaxyRing3DProps {
    enemies: RingEnemy[];
    towers: RingTower[];
    gates: GalaxyGate[];
    projectiles: RingProjectile[];
    towerSlots: TowerSlot[];
    waveNumber: number;
    selectedTowerType: TowerType | null;
    selectedTowerId: string | null;
    lineClearPulse?: boolean;
    onSlotClick: (slotIndex: number) => void;
    onTowerClick: (towerId: string) => void;
}

export function GalaxyRing3D({
    enemies, towers, gates, projectiles, towerSlots,
    selectedTowerType, selectedTowerId,
    lineClearPulse = false, onSlotClick, onTowerClick,
}: GalaxyRing3DProps) {
    const hasInteraction = selectedTowerType !== null || selectedTowerId !== null;
    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 5, 7], fov: 50, near: 0.1, far: 100 }}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: hasInteraction ? 'auto' : 'none',
                // When interacting (tower placement/selection), raise above game UI (z-index: 3)
                // so clicks reach the 3D ring instead of being blocked by HTML elements.
                // When not interacting, stay behind game UI for normal tetris controls.
                zIndex: hasInteraction ? LAYER_3D_INTERACTIVE : LAYER_3D_DEFAULT,
            }}
        >
            <GalaxyRingScene
                enemies={enemies}
                towers={towers}
                gates={gates}
                projectiles={projectiles}
                towerSlots={towerSlots}
                selectedTowerType={selectedTowerType}
                selectedTowerId={selectedTowerId}
                lineClearPulse={lineClearPulse}
                onSlotClick={onSlotClick}
                onTowerClick={onTowerClick}
            />
        </Canvas>
    );
}
