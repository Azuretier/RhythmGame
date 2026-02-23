import React, { useState, useMemo } from 'react';
import { WORLDS, TERRAINS_PER_WORLD, ColorTheme } from '../constants';
import { PROTOCOLS } from '../protocol';
import type { AdvancedRule } from '../protocol';
import type { TerrainPhase } from '../types';
import styles from '../VanillaGame.module.css';

interface TitleScreenProps {
    onStart: (protocolId: number) => void;
}

const RULE_LABELS: Record<AdvancedRule, string> = {
    enemy_hp_boost: 'Enemy HP+',
    garbage_rows: 'Garbage',
    phase_swap: 'Phase Swap',
    invisible_preview: 'Blind Next',
    shrunk_beat_window: 'Shrunk Beat',
};

/**
 * Protocol Select screen — HSR-inspired left-panel difficulty selection.
 * Left: vertical protocol list. Right: world preview + details + enter.
 */
export function TitleScreen({ onStart }: TitleScreenProps) {
    const [selectedProtocol, setSelectedProtocol] = useState(0);

    const protocol = PROTOCOLS[selectedProtocol];

    const modifiedBpms = useMemo(() =>
        WORLDS.map(w => Math.round(w.bpm * protocol.bpmMultiplier)),
        [protocol.bpmMultiplier]
    );

    const isModified = protocol.bpmMultiplier !== 1;

    return (
        <div className={styles.titleScreen}>
            <div className={styles.protocolLayout}>
                {/* ===== Left Panel: Protocol List ===== */}
                <div
                    className={styles.protocolLeftPanel}
                    style={{ '--protocol-accent': protocol.accentColor } as React.CSSProperties}
                >
                    <div className={styles.circuitGrid} />
                    <div className={styles.scanlineOverlay} />

                    <div className={styles.protocolSectionTitle}>
                        <span className={styles.protocolSectionLabel}>PROTOCOL</span>
                        <div className={styles.protocolHeaderLine} />
                    </div>

                    <div className={styles.protocolList}>
                        {PROTOCOLS.map((p) => {
                            const isSelected = p.id === selectedProtocol;
                            return (
                                <button
                                    key={p.id}
                                    className={`${styles.protocolBtn} ${isSelected ? styles.protocolBtnSelected : ''}`}
                                    style={{ '--protocol-accent': p.accentColor } as React.CSSProperties}
                                    onClick={() => setSelectedProtocol(p.id)}
                                >
                                    {isSelected && (
                                        <>
                                            <div className={`${styles.cornerDecor} ${styles.cornerTL}`} />
                                            <div className={`${styles.cornerDecor} ${styles.cornerTR}`} />
                                            <div className={`${styles.cornerDecor} ${styles.cornerBL}`} />
                                            <div className={`${styles.cornerDecor} ${styles.cornerBR}`} />
                                        </>
                                    )}
                                    <div className={styles.romanBadge}>{p.numeral}</div>
                                    <div className={styles.protocolBtnInfo}>
                                        <div className={styles.protocolBtnName}>{p.name}</div>
                                        <div className={styles.protocolBtnSub}>{p.nameJa}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ===== Right Panel: Details + Worlds + Enter ===== */}
                <div
                    className={styles.protocolRightPanel}
                    style={{ '--protocol-accent': protocol.accentColor } as React.CSSProperties}
                >
                    <div className={styles.circuitGrid} />

                    {/* Protocol detail header */}
                    <div className={styles.protocolDetailHeader}>
                        <div className={styles.protocolDetailNumeral}>{protocol.numeral}</div>
                        <div>
                            <div className={styles.protocolDetailName}>
                                {protocol.name}
                            </div>
                            <div className={styles.protocolDetailNameJa}>
                                {protocol.nameJa}
                            </div>
                        </div>
                    </div>

                    <div className={styles.protocolDetailDesc}>
                        {protocol.description}
                    </div>

                    {/* Modifier stats row */}
                    <div className={styles.protocolDetailStats}>
                        <span className={styles.protocolStat}>
                            BPM <span className={styles.protocolStatValue}>&times;{protocol.bpmMultiplier}</span>
                        </span>
                        <span className={styles.protocolStat}>
                            Gravity <span className={styles.protocolStatValue}>&times;{protocol.gravityMultiplier}</span>
                        </span>
                        <span className={styles.protocolStat}>
                            Beat <span className={styles.protocolStatValue}>&times;{protocol.beatWindowMultiplier}</span>
                        </span>
                        <span className={styles.protocolStat}>
                            Score <span className={styles.protocolStatValue}>&times;{protocol.scoreMultiplier}</span>
                        </span>
                    </div>

                    {protocol.advancedRules.length > 0 && (
                        <div className={styles.protocolRules}>
                            {protocol.advancedRules.map(rule => (
                                <span key={rule} className={styles.protocolRuleTag}>
                                    {RULE_LABELS[rule]}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <div className={styles.protocolDivider} />

                    {/* World preview */}
                    <div className={styles.protocolSectionTitle}>
                        <span className={styles.protocolSectionLabel}>WORLDS</span>
                        <div className={styles.protocolHeaderLine} />
                    </div>

                    <div className={styles.worldRow}>
                        {WORLDS.map((world, idx) => (
                            <div key={idx} className={styles.worldCard}>
                                <div className={styles.worldCardEmoji}>
                                    {world.name.split(' ')[0]}
                                </div>
                                <div className={styles.worldCardName}>
                                    {world.name.split(' ').slice(1).join(' ')}
                                </div>
                                <div className={`${styles.worldCardBpm} ${isModified ? styles.worldCardBpmModified : ''}`}>
                                    {modifiedBpms[idx]} BPM
                                </div>
                                <div className={styles.worldCardStars}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.worldCardStar} ${i <= idx ? styles.worldCardStarFilled : styles.worldCardStarEmpty}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Enter Button */}
                    <button
                        className={styles.protocolEnterBtn}
                        onClick={() => onStart(selectedProtocol)}
                    >
                        <span>&#9654; ENTER</span>
                        <span className={styles.protocolEnterBtnSub}>突入</span>
                    </button>
                </div>
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
    terrainPhase: TerrainPhase;
    tdBeatsRemaining?: number;
    enemyCount?: number;
}

/**
 * Progress display — phase-aware
 * Dig phase: terrain destruction progress ("READY" label)
 * TD phase: enemy count + wave countdown (no HP bar)
 */
export function TerrainProgress({ terrainRemaining, terrainTotal, stageNumber, terrainPhase, tdBeatsRemaining, enemyCount }: TerrainProgressProps) {
    if (terrainPhase === 'td') {
        const alive = enemyCount ?? 0;
        return (
            <>
                <div className={styles.terrainLabel}>STAGE {stageNumber} — DEFEND</div>
                <div style={{ color: '#aaa', fontSize: '0.7em', textAlign: 'center', marginTop: '2px' }}>
                    ENEMIES: {alive}
                    {tdBeatsRemaining != null && tdBeatsRemaining > 0 && (
                        <span style={{ marginLeft: '8px', color: '#ff8888' }}>WAVE {tdBeatsRemaining}</span>
                    )}
                </div>
            </>
        );
    }

    // Dig phase: terrain gauge starts full and decreases as blocks are destroyed
    const remainingPct = terrainTotal > 0 ? Math.max(0, (terrainRemaining / terrainTotal) * 100) : 100;
    return (
        <>
            <div className={styles.terrainLabel}>STAGE {stageNumber} — READY</div>
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
     *  --beat-phase CSS var and data-onbeat attribute directly on this element
     *  to bypass React re-render batching for smooth cross-browser animation. */
    containerRef?: React.Ref<HTMLDivElement>;
}

/**
 * Beat timing indicator bar — cursor sweeps left→right each beat interval.
 * Cursor position is driven by a CSS custom property (--beat-phase) and
 * the on-beat glow by a data-onbeat attribute, both set from the parent's
 * requestAnimationFrame loop for frame-precise, re-render-free animation.
 */
export function BeatBar({ containerRef }: BeatBarProps) {
    return (
        <div ref={containerRef} className={styles.beatBar}>
            <div className={styles.beatTargetLeft} />
            <div className={styles.beatTargetRight} />
            <div className={styles.beatCursor} />
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
