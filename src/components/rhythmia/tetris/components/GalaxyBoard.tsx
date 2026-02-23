'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Board } from './Board';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
import type { ColorTheme } from '../constants';
import type { GameKeybinds } from '../hooks/useKeybinds';
import galaxyStyles from '../Galaxy.module.css';

// Dynamically import the 3D ring (Three.js requires client-side only)
const GalaxyRing3D = dynamic(
    () => import('./GalaxyRing3D').then(mod => ({ default: mod.GalaxyRing3D })),
    { ssr: false }
);

interface GalaxyBoardProps {
    // Galaxy TD state
    galaxyEnemies: GalaxyRingEnemy[];
    galaxyTowers: GalaxyTower[];
    galaxyGates: GalaxyGate[];
    galaxyActive: boolean;
    waveNumber: number;

    // Board props (pass-through)
    board: BoardType;
    currentPiece: Piece | null;
    boardBeat: boolean;
    boardShake: boolean;
    gameOver: boolean;
    isPaused: boolean;
    score: number;
    onRestart: () => void;
    onResume?: () => void;
    onQuit?: () => void;
    colorTheme?: ColorTheme;
    onThemeChange?: (theme: ColorTheme) => void;
    worldIdx?: number;
    combo?: number;
    beatPhase?: number;
    boardElRef?: React.Ref<HTMLDivElement>;
    das?: number;
    arr?: number;
    sdf?: number;
    onDasChange?: (v: number) => void;
    onArrChange?: (v: number) => void;
    onSdfChange?: (v: number) => void;
    keybinds?: GameKeybinds;
    onKeybindChange?: (action: keyof GameKeybinds, key: string) => void;
    onKeybindsReset?: () => void;
    defaultKeybinds?: GameKeybinds;
    featureSettings?: FeatureSettings;
    onFeatureSettingsUpdate?: (settings: FeatureSettings) => void;
    activeAnomaly?: boolean;
}

/**
 * Galaxy Board — wraps the Tetris Board with a 3D floating ring.
 * During the dig phase, a planetary ring orbits around the board showing
 * pixelated Minecraft-style enemies and towers in 3D space.
 * When galaxy TD is inactive, renders the board without the ring.
 */
export function GalaxyBoard({
    galaxyEnemies,
    galaxyTowers,
    galaxyGates,
    galaxyActive,
    waveNumber,
    board,
    currentPiece,
    boardBeat,
    boardShake,
    gameOver,
    isPaused,
    score,
    onRestart,
    onResume,
    onQuit,
    colorTheme,
    onThemeChange,
    worldIdx,
    combo,
    beatPhase,
    boardElRef,
    das,
    arr,
    sdf,
    onDasChange,
    onArrChange,
    onSdfChange,
    keybinds,
    onKeybindChange,
    onKeybindsReset,
    defaultKeybinds,
    featureSettings,
    onFeatureSettingsUpdate,
    activeAnomaly,
}: GalaxyBoardProps) {
    const boardElement = (
        <Board
            board={board}
            currentPiece={currentPiece}
            boardBeat={boardBeat}
            boardShake={boardShake}
            gameOver={gameOver}
            isPaused={isPaused}
            score={score}
            onRestart={onRestart}
            onResume={onResume}
            onQuit={onQuit}
            colorTheme={colorTheme}
            onThemeChange={onThemeChange}
            worldIdx={worldIdx}
            combo={combo}
            beatPhase={beatPhase}
            boardElRef={boardElRef}
            das={das}
            arr={arr}
            sdf={sdf}
            onDasChange={onDasChange}
            onArrChange={onArrChange}
            onSdfChange={onSdfChange}
            keybinds={keybinds}
            onKeybindChange={onKeybindChange}
            onKeybindsReset={onKeybindsReset}
            defaultKeybinds={defaultKeybinds}
            featureSettings={featureSettings}
            onFeatureSettingsUpdate={onFeatureSettingsUpdate}
            activeAnomaly={activeAnomaly}
        />
    );

    if (!galaxyActive) {
        return boardElement;
    }

    return (
        <div className={galaxyStyles.galaxyContainer}>
            {/* Wave label */}
            {waveNumber > 0 && (
                <div className={galaxyStyles.waveLabel}>WAVE {waveNumber}</div>
            )}

            {/* Board sits at the center — the "planet" */}
            <div className={galaxyStyles.boardCenter}>
                {boardElement}
            </div>

            {/* 3D ring overlays around the board — transparent background, no pointer events */}
            <GalaxyRing3D
                enemies={galaxyEnemies}
                towers={galaxyTowers}
                gates={galaxyGates}
                waveNumber={waveNumber}
            />
        </div>
    );
}
