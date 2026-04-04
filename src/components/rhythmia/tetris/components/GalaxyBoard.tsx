'use client';

import React from 'react';
import { Board } from './Board';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
import type { ColorTheme } from '../constants';
import type { GameKeybinds } from '../hooks/useKeybinds';
import galaxyStyles from '../Galaxy.module.css';

interface GalaxyBoardProps {
    // Galaxy TD state
    galaxyActive: boolean;
    waveNumber: number;
    gold?: number;
    lives?: number;

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
 * Galaxy Board — wraps the Tetris Board with a wave label during dig phase.
 * The 3D grid terrain ring is rendered separately in GalaxyRing3D.tsx.
 * Wrapped in React.memo to prevent re-renders from parent state changes
 * that don't affect the board area.
 */
export const GalaxyBoard = React.memo(function GalaxyBoard({
    galaxyActive: _galaxyActive,
    waveNumber,
    gold,
    lives,
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
            colorTheme={colorTheme}
            worldIdx={worldIdx}
            combo={combo}
            beatPhase={beatPhase}
            boardElRef={boardElRef}
            featureSettings={featureSettings}
            activeAnomaly={activeAnomaly}
        />
    );

    if (waveNumber <= 0) {
        return boardElement;
    }

    return (
        <div className={galaxyStyles.galaxyContainer}>
            <div className={galaxyStyles.waveLabel}>
                WAVE {waveNumber}
                {gold !== undefined && <span>{' '}&middot; {gold}G</span>}
                {lives !== undefined && <span>{' '}&middot; {lives}HP</span>}
            </div>
            {boardElement}
        </div>
    );
});
