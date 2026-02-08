import React, { useEffect, useState } from 'react';
import type { GamePhase, GameMode } from '../types';
import { WORLDS } from '../constants';
import styles from '../VanillaGame.module.css';

interface WorldTransitionProps {
    phase: GamePhase;
    worldIdx: number;
    stageNumber: number;
    gameMode?: GameMode;
}

/**
 * Full-screen overlay for world transitions:
 * - WORLD_CREATION: "World Constructing..." with scanning line effect
 * - COLLAPSE: Shake + flash when terrain is fully destroyed
 * - TRANSITION: Reload/rebuild visual between worlds
 */
export function WorldTransition({ phase, worldIdx, stageNumber, gameMode = 'vanilla' }: WorldTransitionProps) {
    const [visible, setVisible] = useState(false);
    const [text, setText] = useState('');
    const [subText, setSubText] = useState('');

    useEffect(() => {
        if (phase === 'WORLD_CREATION') {
            setVisible(true);
            setText(`STAGE ${stageNumber}`);
            const modeSuffix = gameMode === 'td' ? ' — TOWER DEFENSE' : '';
            setSubText((WORLDS[worldIdx]?.name || '') + modeSuffix);
            const timer = setTimeout(() => setVisible(false), 1400);
            return () => clearTimeout(timer);
        } else if (phase === 'COLLAPSE') {
            setVisible(true);
            setText(gameMode === 'td' ? 'WAVE COMPLETE!' : 'TERRAIN CLEARED!');
            setSubText(gameMode === 'td' ? 'ウェーブクリア！' : '地形破壊完了');
            const timer = setTimeout(() => setVisible(false), 1200);
            return () => clearTimeout(timer);
        } else if (phase === 'TRANSITION') {
            setVisible(true);
            setText(gameMode === 'td' ? 'NEXT WAVE' : 'NEXT WORLD');
            setSubText(gameMode === 'td' ? '次のウェーブ準備中...' : '新世界構築中...');
            const timer = setTimeout(() => setVisible(false), 1200);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [phase, worldIdx, stageNumber, gameMode]);

    if (!visible) return null;

    return (
        <div className={`${styles.worldTransition} ${styles[`wt_${phase.toLowerCase()}`]}`}>
            {/* Scan line effect */}
            <div className={styles.wtScanLine} />

            {/* Content */}
            <div className={styles.wtContent}>
                <div className={styles.wtText}>{text}</div>
                <div className={styles.wtSubText}>{subText}</div>

                {/* Loading bar for WORLD_CREATION and TRANSITION */}
                {(phase === 'WORLD_CREATION' || phase === 'TRANSITION') && (
                    <div className={styles.wtLoadBar}>
                        <div className={styles.wtLoadFill} />
                    </div>
                )}

                {/* Collapse flash effect */}
                {phase === 'COLLAPSE' && (
                    <div className={styles.wtCollapseFlash} />
                )}
            </div>

            {/* Corner decorations */}
            <div className={`${styles.wtCorner} ${styles.wtCornerTL}`} />
            <div className={`${styles.wtCorner} ${styles.wtCornerTR}`} />
            <div className={`${styles.wtCorner} ${styles.wtCornerBL}`} />
            <div className={`${styles.wtCorner} ${styles.wtCornerBR}`} />
        </div>
    );
}

interface GamePhaseIndicatorProps {
    phase: GamePhase;
    stageNumber: number;
    damageMultiplier: number;
}

/**
 * Small HUD indicator showing current game phase
 */
export function GamePhaseIndicator({ phase, stageNumber, damageMultiplier }: GamePhaseIndicatorProps) {
    const phaseLabels: Record<GamePhase, string> = {
        WORLD_CREATION: 'CONSTRUCTING',
        PLAYING: 'DIG',
        CRAFTING: 'FORGE',
        COLLAPSE: 'COLLAPSE',
        TRANSITION: 'RELOAD',
    };

    return (
        <div className={styles.phaseIndicator}>
            <span className={styles.phaseDot} data-phase={phase} />
            <span className={styles.phaseLabel}>{phaseLabels[phase]}</span>
            {damageMultiplier > 1 && (
                <span className={styles.phaseMult}>DMG x{damageMultiplier.toFixed(1)}</span>
            )}
        </div>
    );
}
