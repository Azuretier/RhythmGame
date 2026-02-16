import React from 'react';
import { WORLDS, TERRAINS_PER_WORLD, ColorTheme, MAX_HEALTH } from '../constants';
import type { GameMode } from '../types';
import styles from '../VanillaGame.module.css';

interface TitleScreenProps {
    onStart: (mode: GameMode) => void;
}

/**
 * Title screen component with game mode selection (black screen, no world info)
 */
export function TitleScreen({ onStart }: TitleScreenProps) {
    return (
        <div className={styles.titleScreen}>
            <div className={styles.modeSelect}>
                <button className={styles.modeBtn} onClick={() => onStart('vanilla')}>
                    <span className={styles.modeBtnIcon}>🎵</span>
                    <span className={styles.modeBtnTitle}>VANILLA</span>
                    <span className={styles.modeBtnDesc}>地形破壊リズムゲーム</span>
                </button>
                <button className={`${styles.modeBtn} ${styles.modeBtnTd}`} onClick={() => onStart('td')}>
                    <span className={styles.modeBtnIcon}>🏰</span>
                    <span className={styles.modeBtnTitle}>TOWER DEFENSE</span>
                    <span className={styles.modeBtnDesc}>タワーを守れ！</span>
                </button>
            </div>
        </div>
    );
}

interface WorldDisplayProps {
    worldIdx: number;
}

/**
 * Displays current world name
 */
export function WorldDisplay({ worldIdx }: WorldDisplayProps) {
    return (
        <div className={styles.worldDisplay}>{WORLDS[worldIdx].name}</div>
    );
}

interface WorldProgressDisplayProps {
    worldIdx: number;
    stageNumber: number;
}

/**
 * In-game world progression indicator showing terrains cleared toward next world
 */
export function WorldProgressDisplay({ worldIdx, stageNumber }: WorldProgressDisplayProps) {
    const world = WORLDS[worldIdx];
    const terrainsCleared = (stageNumber - 1) % TERRAINS_PER_WORLD;
    const isMaxWorld = worldIdx >= WORLDS.length - 1;

    return (
        <div className={styles.worldProgressDisplay}>
            <span className={styles.worldProgressName}>{world.name}</span>
            <div className={styles.worldProgressPips}>
                {Array.from({ length: TERRAINS_PER_WORLD }).map((_, i) => (
                    <div
                        key={i}
                        className={`${styles.worldProgressPip} ${i < terrainsCleared ? styles.worldProgressPipFilled : ''}`}
                    />
                ))}
            </div>
            <span className={styles.worldProgressLabel}>
                {isMaxWorld
                    ? `${terrainsCleared}/${TERRAINS_PER_WORLD}`
                    : `${terrainsCleared}/${TERRAINS_PER_WORLD} → Next World`}
            </span>
        </div>
    );
}

interface ScoreDisplayProps {
    score: number;
    scorePop: boolean;
}

/**
 * Score display with pop animation
 */
export function ScoreDisplay({ score, scorePop }: ScoreDisplayProps) {
    return (
        <div className={`${styles.scoreDisplay} ${scorePop ? styles.pop : ''}`}>
            {score.toLocaleString()}
        </div>
    );
}

interface ComboDisplayProps {
    combo: number;
}

/**
 * Combo counter display
 */
export function ComboDisplay({ combo }: ComboDisplayProps) {
    return (
        <div className={`${styles.combo} ${combo >= 2 ? styles.show : ''} ${combo >= 5 ? styles.big : ''}`}>
            {combo} COMBO!
        </div>
    );
}

interface TerrainProgressProps {
    terrainRemaining: number;
    terrainTotal: number;
    stageNumber: number;
    gameMode: GameMode;
    towerHealth?: number;
}

/**
 * Progress display — mode-aware
 * Vanilla: terrain destruction progress
 * TD: tower HP bar
 */
export function TerrainProgress({ terrainRemaining, terrainTotal, stageNumber, gameMode, towerHealth }: TerrainProgressProps) {
    if (gameMode === 'td') {
        const hp = towerHealth ?? 0;
        const hpPct = Math.max(0, Math.min(100, (hp / MAX_HEALTH) * 100));
        const hpColor = hpPct > 50 ? '#44ff44' : hpPct > 25 ? '#ffaa00' : '#ff4444';
        return (
            <>
                <div className={styles.terrainLabel}>STAGE {stageNumber} — TOWER DEFENSE</div>
                <div className={styles.terrainBar}>
                    <div className={styles.terrainFill} style={{ width: `${hpPct}%`, background: hpColor }} />
                </div>
                <div style={{ color: '#aaa', fontSize: '0.7em', textAlign: 'center', marginTop: '2px' }}>
                    HP: {Math.ceil(hp)} / {MAX_HEALTH}
                </div>
            </>
        );
    }

    // Vanilla mode: terrain gauge starts full and decreases as blocks are destroyed
    const remainingPct = terrainTotal > 0 ? Math.max(0, (terrainRemaining / terrainTotal) * 100) : 100;
    return (
        <>
            <div className={styles.terrainLabel}>STAGE {stageNumber} — DIG</div>
            <div className={styles.terrainBar}>
                <div className={styles.terrainFill} style={{ width: `${remainingPct}%` }} />
            </div>
            <div style={{ color: '#aaa', fontSize: '0.7em', textAlign: 'center', marginTop: '2px' }}>
                {terrainRemaining} / {terrainTotal} blocks
            </div>
        </>
    );
}

interface BeatBarProps {
    /** Ref attached to the container div — parent's rAF loop sets
     *  --beat-pos CSS var (remapped so center = beat moment) and
     *  data-onbeat attribute directly on this element to bypass
     *  React re-render batching for smooth cross-browser animation. */
    containerRef?: React.Ref<HTMLDivElement>;
}

/**
 * Center-target beat bar — the cursor oscillates toward the center target
 * as the beat approaches. Concentric timing zones radiate from center:
 *   CENTER: PERFECT (gold) → GREAT (cyan) → GOOD (green) → MISS (edges)
 *
 * Phase is remapped in the parent's rAF loop:
 *   --beat-pos = (phase + 0.5) % 1
 * so 0.5 (center) = exactly on beat, edges = furthest from beat.
 */
export function BeatBar({ containerRef }: BeatBarProps) {
    return (
        <div ref={containerRef} className={styles.beatBar}>
            {/* Timing zone backgrounds — symmetric from center */}
            <div className={styles.beatZoneGood} />
            <div className={styles.beatZoneGreat} />
            <div className={styles.beatZonePerfect} />
            {/* Center target needle */}
            <div className={styles.beatTarget} />
            {/* Tick marks for visual rhythm reference */}
            <div className={styles.beatTicks}>
                <div className={styles.beatTick} style={{ left: '10%' }} />
                <div className={styles.beatTick} style={{ left: '20%' }} />
                <div className={styles.beatTick} style={{ left: '30%' }} />
                <div className={styles.beatTick} style={{ left: '40%' }} />
                <div className={styles.beatTick} style={{ left: '60%' }} />
                <div className={styles.beatTick} style={{ left: '70%' }} />
                <div className={styles.beatTick} style={{ left: '80%' }} />
                <div className={styles.beatTick} style={{ left: '90%' }} />
            </div>
            {/* Moving cursor */}
            <div className={styles.beatCursor} />
            {/* Beat flash — pulses on hit */}
            <div className={styles.beatFlash} />
        </div>
    );
}

interface StatsProps {
    lines: number;
    level: number;
}

/**
 * Stats panel showing lines and level
 */
export function StatsPanel({ lines, level }: StatsProps) {
    return (
        <div className={styles.statsPanel}>
            <div>LINES: {lines}</div>
            <div>LEVEL: {level}</div>
        </div>
    );
}

interface ThemeNavProps {
    colorTheme: ColorTheme;
    onThemeChange: (theme: ColorTheme) => void;
}

/**
 * Theme selector navbar
 */
export function ThemeNav({ colorTheme, onThemeChange }: ThemeNavProps) {
    return (
        <div className={styles.themeNav}>
            <span className={styles.themeLabel}>🎨 Theme:</span>
            <button
                className={`${styles.themeBtn} ${colorTheme === 'standard' ? styles.active : ''}`}
                onClick={() => onThemeChange('standard')}
            >
                Standard
            </button>
            <button
                className={`${styles.themeBtn} ${colorTheme === 'stage' ? styles.active : ''}`}
                onClick={() => onThemeChange('stage')}
            >
                Stage
            </button>
            <button
                className={`${styles.themeBtn} ${colorTheme === 'monochrome' ? styles.active : ''}`}
                onClick={() => onThemeChange('monochrome')}
            >
                Mono
            </button>
        </div>
    );
}

export type JudgmentDisplayMode = 'text' | 'score';

interface JudgmentDisplayProps {
    text: string;
    color: string;
    show: boolean;
    score?: number;
    displayMode?: JudgmentDisplayMode;
}

/**
 * Judgment text display — switchable between timing text (PERFECT!, GREAT!, etc.)
 * and earned score (+1600, etc.)
 */
export function JudgmentDisplay({ text, color, show, score = 0, displayMode = 'text' }: JudgmentDisplayProps) {
    const displayText = displayMode === 'score' && score > 0
        ? `+${score.toLocaleString()}`
        : text;

    return (
        <div
            className={`${styles.judgment} ${show ? styles.show : ''}`}
            style={{ color, textShadow: `0 0 30px ${color}` }}
        >
            {displayText}
        </div>
    );
}

interface JudgmentModeToggleProps {
    mode: JudgmentDisplayMode;
    onToggle: () => void;
}

/**
 * Toggle button for switching between score and text judgment display
 */
export function JudgmentModeToggle({ mode, onToggle }: JudgmentModeToggleProps) {
    return (
        <button
            className={styles.judgmentModeToggle}
            onClick={onToggle}
            title={mode === 'text' ? 'Switch to score display' : 'Switch to text display'}
        >
            {mode === 'text' ? 'ABC' : '123'}
        </button>
    );
}

interface TouchControlsProps {
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onMoveDown: () => void;
    onRotateCW: () => void;
    onRotateCCW: () => void;
    onHardDrop: () => void;
    onHold: () => void;
    isMobile?: boolean;
}

/**
 * Touch control buttons for mobile
 */
export function TouchControls({
    onMoveLeft,
    onMoveRight,
    onMoveDown,
    onRotateCW,
    onRotateCCW,
    onHardDrop,
    onHold,
    isMobile = true,
}: TouchControlsProps) {
    // Only render on mobile devices
    if (!isMobile) return null;
    const actions = [
        { action: 'rotateLeft', handler: onRotateCCW, label: '↺' },
        { action: 'left', handler: onMoveLeft, label: '←' },
        { action: 'down', handler: onMoveDown, label: '↓' },
        { action: 'right', handler: onMoveRight, label: '→' },
        { action: 'rotate', handler: onRotateCW, label: '↻' },
        { action: 'drop', handler: onHardDrop, label: '⬇' },
        { action: 'hold', handler: onHold, label: 'HOLD' },
    ];

    return (
        <div className={styles.controls}>
            {actions.map(({ action, handler, label }) => (
                <button
                    key={action}
                    className={styles.ctrlBtn}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        handler();
                    }}
                    onClick={handler}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
