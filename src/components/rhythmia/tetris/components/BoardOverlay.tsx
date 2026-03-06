'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GalaxyBoard } from './GalaxyBoard';
import styles from './BoardOverlay.module.css';

type BoardMode = '2d' | '3d';

const STORAGE_KEY = 'rhythmia-board-mode';

function getStoredMode(): BoardMode {
    if (typeof window === 'undefined') return '2d';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === '3d' ? '3d' : '2d';
}

interface TouchControlsOverlayProps {
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    onRotate?: () => void;
    onSoftDrop?: () => void;
    onHardDrop?: () => void;
}

function TouchControlsOverlay({
    onMoveLeft,
    onMoveRight,
    onRotate,
    onSoftDrop,
    onHardDrop,
}: TouchControlsOverlayProps) {
    return (
        <div className={styles.touchOverlay}>
            <button
                className={`${styles.touchZone} ${styles.touchLeft}`}
                data-label="&#8592;"
                onTouchStart={onMoveLeft}
                aria-label="Move left"
            />
            <button
                className={`${styles.touchZone} ${styles.touchRight}`}
                data-label="&#8594;"
                onTouchStart={onMoveRight}
                aria-label="Move right"
            />
            <button
                className={`${styles.touchZone} ${styles.touchRotate}`}
                data-label="&#8635;"
                onTouchStart={onRotate}
                aria-label="Rotate"
            />
            <button
                className={`${styles.touchZone} ${styles.touchSoftDrop}`}
                data-label="&#8595;"
                onTouchStart={onSoftDrop}
                aria-label="Soft drop"
            />
            <button
                className={`${styles.touchZone} ${styles.touchHardDrop}`}
                data-label="&#8675;"
                onTouchStart={onHardDrop}
                aria-label="Hard drop"
            />
        </div>
    );
}

interface BoardOverlayProps extends React.ComponentProps<typeof GalaxyBoard> {
    /** Override the board display mode */
    mode?: BoardMode;
    /** Camera angle for 3D perspective (degrees) — reserved for future use */
    cameraAngle?: number;
    /** Touch control handlers */
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    onRotate?: () => void;
    onSoftDrop?: () => void;
    onHardDrop?: () => void;
}

/**
 * BoardOverlay — wraps GalaxyBoard with a flexible 2D/3D display mode,
 * responsive sizing, HUD reflow, and mobile touch controls.
 */
export const BoardOverlay = React.memo(function BoardOverlay({
    mode: modeProp,
    cameraAngle: _cameraAngle,
    onMoveLeft,
    onMoveRight,
    onRotate,
    onSoftDrop,
    onHardDrop,
    waveNumber,
    gold,
    lives,
    ...boardProps
}: BoardOverlayProps) {
    const [internalMode, setInternalMode] = useState<BoardMode>('2d');

    useEffect(() => {
        setInternalMode(getStoredMode());
    }, []);

    const mode = modeProp ?? internalMode;
    const is3d = mode === '3d';

    const toggleMode = useCallback(() => {
        const next: BoardMode = mode === '2d' ? '3d' : '2d';
        setInternalMode(next);
        localStorage.setItem(STORAGE_KEY, next);
    }, [mode]);

    const overlayClass = [
        styles.overlay,
        is3d ? styles.overlay3d : '',
    ].filter(Boolean).join(' ');

    const boardInnerClass = [
        styles.boardInner,
        is3d ? styles.board3d : '',
    ].filter(Boolean).join(' ');

    const hudClass = [
        styles.hudIndicators,
        is3d ? styles.hudIndicators3d : '',
    ].filter(Boolean).join(' ');

    const showHud = waveNumber > 0;

    return (
        <div className={overlayClass}>
            {/* Mode toggle button */}
            <button
                className={styles.modeToggle}
                onClick={toggleMode}
                aria-label={`Switch to ${is3d ? '2D' : '3D'} mode`}
            >
                {is3d ? '2D' : '3D'}
            </button>

            {/* HUD indicators (repositioned in 3D mode) */}
            {showHud && (
                <div className={hudClass}>
                    <span>WAVE {waveNumber}</span>
                    {gold !== undefined && <span>&middot; {gold}G</span>}
                    {lives !== undefined && <span>&middot; {lives}HP</span>}
                </div>
            )}

            {/* Board with 3D transform wrapper */}
            <div className={boardInnerClass}>
                <GalaxyBoard
                    waveNumber={0}
                    gold={gold}
                    lives={lives}
                    {...boardProps}
                />

                {/* Touch control zones (visible only on touch devices) */}
                <TouchControlsOverlay
                    onMoveLeft={onMoveLeft}
                    onMoveRight={onMoveRight}
                    onRotate={onRotate}
                    onSoftDrop={onSoftDrop}
                    onHardDrop={onHardDrop}
                />
            </div>
        </div>
    );
});
