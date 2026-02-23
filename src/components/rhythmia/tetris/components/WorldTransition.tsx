import React, { useEffect, useState } from 'react';
import type { GamePhase, TerrainPhase } from '../types';
import { WORLDS, TERRAINS_PER_WORLD } from '../constants';
import styles from '../VanillaGame.module.css';

interface WorldTransitionProps {
    phase: GamePhase;
    worldIdx: number;
    stageNumber: number;
    terrainPhase?: TerrainPhase;
    gameOver?: boolean;
}

/**
 * Full-screen overlay for world/phase transitions:
 * - WORLD_CREATION: "World Constructing..." with scanning line effect
 * - COLLAPSE: Shake + flash when terrain/wave is cleared
 * - CHECKPOINT: Ground generating for TD phase
 * - TRANSITION: Reload/rebuild visual between stages
 */
export function WorldTransition({ phase, worldIdx, stageNumber, terrainPhase = 'dig', gameOver = false }: WorldTransitionProps) {
    const [visible, setVisible] = useState(false);
    const [text, setText] = useState('');
    const [subText, setSubText] = useState('');

    // Check if this is the last terrain in the current world
    const terrainsCleared = (stageNumber - 1) % TERRAINS_PER_WORLD;
    const isLastInWorld = terrainsCleared === TERRAINS_PER_WORLD - 1;

    useEffect(() => {
        if (phase === 'WORLD_CREATION') {
            setVisible(true);
            setText(`STAGE ${stageNumber}`);
            setSubText(WORLDS[worldIdx]?.name || '');
            const timer = setTimeout(() => setVisible(false), 1400);
            return () => clearTimeout(timer);
        } else if (phase === 'COLLAPSE') {
            setVisible(true);
            if (terrainPhase === 'dig') {
                // Terrain fully destroyed — entering TD
                setText('TERRAIN CLEARED!');
                setSubText('地形破壊完了');
            } else {
                // TD wave complete
                setText('WAVE COMPLETE!');
                setSubText('ウェーブクリア！');
            }
            const timer = setTimeout(() => setVisible(false), 1200);
            return () => clearTimeout(timer);
        } else if (phase === 'CHECKPOINT') {
            setVisible(true);
            setText(isLastInWorld ? 'FINAL WAVE' : 'CHECKPOINT');
            setSubText(isLastInWorld ? '最終ウェーブ — 戦場展開中...' : '戦場展開中...');
            const timer = setTimeout(() => setVisible(false), 1400);
            return () => clearTimeout(timer);
        } else if (phase === 'TRANSITION') {
            setVisible(true);
            setText('NEXT STAGE');
            setSubText('次のステージ準備中...');
            const timer = setTimeout(() => setVisible(false), 1200);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [phase, worldIdx, stageNumber, terrainPhase, isLastInWorld]);

    // Immediately hide transition overlay when player dies
    useEffect(() => {
        if (gameOver) {
            setVisible(false);
        }
    }, [gameOver]);

    if (!visible || gameOver) return null;

    return (
        <div className={`${styles.worldTransition} ${styles[`wt_${phase.toLowerCase()}`]}`}>
            {/* Scan line effect */}
            <div className={styles.wtScanLine} />

            {/* Content */}
            <div className={styles.wtContent}>
                <div className={styles.wtText}>{text}</div>
                <div className={styles.wtSubText}>{subText}</div>

                {/* Loading bar for WORLD_CREATION, TRANSITION, and CHECKPOINT */}
                {(phase === 'WORLD_CREATION' || phase === 'TRANSITION' || phase === 'CHECKPOINT') && (
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
    equippedCardCount: number;
    terrainPhase?: TerrainPhase;
}

/**
 * Small HUD indicator showing current game phase
 */
export function GamePhaseIndicator({ phase, stageNumber, equippedCardCount, terrainPhase = 'dig' }: GamePhaseIndicatorProps) {
    const phaseLabels: Record<GamePhase, string> = {
        WORLD_CREATION: 'CONSTRUCTING',
        PLAYING: terrainPhase === 'td' ? 'DEFEND' : 'DIG',
        CARD_SELECT: 'CARDS',
        COLLAPSE: 'COLLAPSE',
        TRANSITION: 'RELOAD',
        CHECKPOINT: 'CHECKPOINT',
    };

    return (
        <div className={styles.phaseIndicator}>
            <span className={styles.phaseDot} data-phase={phase} />
            <span className={styles.phaseLabel}>{phaseLabels[phase]}</span>
            {equippedCardCount > 0 && (
                <span className={styles.phaseMult}>{equippedCardCount} CARDS</span>
            )}
        </div>
    );
}
