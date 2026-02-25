'use client';

// Main Tetris/Rhythmia game component
import React from 'react';
import TetrisGame from './tetris';
import { EquipmentProvider } from '@/lib/equipment/context';
import type { ComponentProps } from 'react';

type RhythmiaProps = ComponentProps<typeof TetrisGame>;

function VanillaGame(props: RhythmiaProps) {
    return (
        <EquipmentProvider>
            <TetrisGame {...props} />
        </EquipmentProvider>
    );
}

export { TetrisGame as Rhythmia };
export default VanillaGame;

// Re-export types and constants for external use
export * from './types';
export * from './constants';
