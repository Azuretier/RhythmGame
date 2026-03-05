'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { TowerType, RingEnemy, RingTower, RingProjectile, TowerSlot, GalaxyGate } from '../galaxy-types';
import { GalaxyRingScene } from './GalaxyScene';
import { CameraController } from './CameraController';
import { useLayerInteraction } from '../hooks/useLayerInteraction';

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
    isPaused?: boolean;
    gameOver?: boolean;
    onSlotClick: (slotIndex: number) => void;
    onTowerClick: (towerId: string) => void;
}

export function GalaxyRing3D({
    enemies, towers, gates, projectiles, towerSlots,
    selectedTowerType, selectedTowerId,
    lineClearPulse = false, isPaused = false, gameOver = false,
    onSlotClick, onTowerClick,
}: GalaxyRing3DProps) {
    const { canvasPointerEvents, canvasZIndex } = useLayerInteraction({
        selectedTowerType,
        selectedTowerId,
        isPaused,
        gameOver,
    });

    return (
        <Canvas
            gl={{ antialias: true, alpha: true }}
            camera={{ fov: 50, near: 0.1, far: 100 }}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: canvasPointerEvents,
                zIndex: canvasZIndex,
            }}
        >
            <CameraController />
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
