'use client';

import React from 'react';
import { Board } from './Board';
import { GalaxyRingStrip } from './GalaxyRingStrip';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
import type { ColorTheme } from '../constants';
import type { GameKeybinds } from '../hooks/useKeybinds';
import galaxyStyles from '../Galaxy.module.css';

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
 * Galaxy Board — wraps the Tetris Board with a square TD ring.
 * During the dig phase, four ring strips (top, bottom, left, right) surround
 * the board, showing enemies on the outer path and towers on the inner ring.
 * When galaxy TD is inactive, renders the board without the ring.
 */
export function GalaxyBoard({
    galaxyEnemies,
    galaxyTowers,
    galaxyGates,
    galaxyActive,
    waveNumber,
    // Destructure board props
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
    // Helper to find gate for a side
    const getGate = (side: 'top' | 'bottom' | 'left' | 'right') =>
        galaxyGates.find(g => g.side === side) || { side, health: 50, maxHealth: 50 };

    // Filter towers for each side
    const sideTowers = (side: 'top' | 'bottom' | 'left' | 'right') =>
        galaxyTowers.filter(t => t.side === side);

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
        <div className={galaxyStyles.galaxyWrapper}>
            {waveNumber > 0 && (
                <div className={galaxyStyles.waveLabel}>WAVE {waveNumber}</div>
            )}

            <GalaxyRingStrip
                side="top"
                enemies={galaxyEnemies}
                towers={sideTowers('top')}
                gate={getGate('top')}
            />

            <GalaxyRingStrip
                side="left"
                enemies={galaxyEnemies}
                towers={sideTowers('left')}
                gate={getGate('left')}
            />

            <div className={galaxyStyles.boardArea}>
                {boardElement}
            </div>

            <GalaxyRingStrip
                side="right"
                enemies={galaxyEnemies}
                towers={sideTowers('right')}
                gate={getGate('right')}
            />

            <GalaxyRingStrip
                side="bottom"
                enemies={galaxyEnemies}
                towers={sideTowers('bottom')}
                gate={getGate('bottom')}
            />
        </div>
    );
}
