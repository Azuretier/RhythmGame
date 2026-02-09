import React, { useState, useEffect } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS, ColorTheme, getThemedColor } from '../constants';
import { getShape, isValidPosition, getGhostY } from '../utils/boardUtils';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import type { AdvancementCategory, AdvancementState } from '@/lib/advancements/types';
import type { Piece, Board as BoardType } from '../types';
import styles from '../VanillaGame.module.css';

const CATEGORY_ORDER: AdvancementCategory[] = ['general', 'lines', 'score', 'tspin', 'combo', 'multiplayer'];

const CATEGORY_ICONS: Record<AdvancementCategory, string> = {
    general: '🎮',
    lines: '📏',
    score: '💎',
    tspin: '🌀',
    combo: '🔥',
    multiplayer: '⚔️',
};

const CATEGORY_LABELS: Record<AdvancementCategory, string> = {
    general: 'General',
    lines: 'Lines',
    score: 'Score',
    tspin: 'T-Spin',
    combo: 'Combo',
    multiplayer: 'PvP',
};

function formatThreshold(n: number): string {
    if (n >= 10000000) return `${(n / 1000000).toFixed(0)}M`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
}

interface BoardProps {
    board: BoardType;
    currentPiece: Piece | null;
    boardBeat: boolean;
    boardShake: boolean;
    gameOver: boolean;
    isPaused: boolean;
    score: number;
    onRestart: () => void;
    onResume?: () => void;
    colorTheme?: ColorTheme;
    onThemeChange?: (theme: ColorTheme) => void;
    worldIdx?: number;
    combo?: number;
    beatPhase?: number;
    boardElRef?: React.Ref<HTMLDivElement>;
}

/**
 * Renders the game board with pieces, ghost piece, and overlays.
 * Enhanced with rhythm-reactive VFX: beat ghost glow, fever chroma shift.
 */
export function Board({
    board,
    currentPiece,
    boardBeat,
    boardShake,
    gameOver,
    isPaused,
    score,
    onRestart,
    onResume,
    colorTheme = 'stage',
    onThemeChange,
    worldIdx = 0,
    combo = 0,
    beatPhase = 0,
    boardElRef,
}: BoardProps) {
    const isFever = combo >= 10;
    const [showAdvancements, setShowAdvancements] = useState(false);
    const [advState, setAdvState] = useState<AdvancementState | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<AdvancementCategory>('general');

    // Load advancement state when pause menu opens
    useEffect(() => {
        if (isPaused && !gameOver) {
            setAdvState(loadAdvancementState());
        } else {
            setShowAdvancements(false);
        }
    }, [isPaused, gameOver]);

    // Helper to get color for a piece type, with fever chroma shift
    const getColor = (pieceType: string) => {
        if (isFever) {
            const baseHue = beatPhase * 360;
            const offset = 'IOTSzjl'.indexOf(pieceType.toUpperCase()) * 51;
            return `hsl(${(baseHue + offset) % 360}, 90%, 60%)`;
        }
        return getThemedColor(pieceType, colorTheme, worldIdx);
    };

    // Create display board with current piece and ghost
    const displayBoard = React.useMemo(() => {
        const display = board.map(row => [...row]);

        if (currentPiece) {
            const shape = getShape(currentPiece.type, currentPiece.rotation);

            const ghostY = getGhostY(currentPiece, board);
            if (ghostY !== currentPiece.y) {
                for (let y = 0; y < shape.length; y++) {
                    for (let x = 0; x < shape[y].length; x++) {
                        if (shape[y][x]) {
                            const boardY = ghostY + y;
                            const boardX = currentPiece.x + x;
                            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                                if (display[boardY][boardX] === null) {
                                    display[boardY][boardX] = `ghost-${currentPiece.type}`;
                                }
                            }
                        }
                    }
                }
            }

            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const boardY = currentPiece.y + y;
                        const boardX = currentPiece.x + x;
                        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                            display[boardY][boardX] = currentPiece.type;
                        }
                    }
                }
            }
        }

        return display;
    }, [board, currentPiece]);

    const boardWrapClasses = [
        styles.boardWrap,
        boardBeat ? styles.beat : '',
        boardShake ? styles.shake : '',
        isFever ? styles.fever : '',
    ].filter(Boolean).join(' ');

    // Advancement stats
    const unlockedCount = advState?.unlockedIds.length ?? 0;
    const totalCount = ADVANCEMENTS.length;

    const filteredAdvancements = ADVANCEMENTS.filter(a => a.category === selectedCategory);

    return (
        <div className={boardWrapClasses}>
            <div
                ref={boardElRef}
                className={styles.board}
                style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
            >
                {displayBoard.flat().map((cell, i) => {
                    const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
                    const pieceType = isGhost ? cell.replace('ghost-', '') : cell;
                    const color = pieceType ? getColor(pieceType as string) : '';

                    const ghostStyle = isGhost ? {
                        borderColor: boardBeat ? `${color}CC` : `${color}60`,
                        boxShadow: boardBeat ? `0 0 12px ${color}80, inset 0 0 6px ${color}40` : 'none',
                        transition: 'border-color 0.1s, box-shadow 0.1s',
                    } : {};

                    const filledStyle = cell && !isGhost ? {
                        backgroundColor: color,
                        boxShadow: isFever
                            ? `0 0 12px ${color}, 0 0 4px ${color}`
                            : `0 0 8px ${color}`,
                    } : {};

                    return (
                        <div
                            key={i}
                            className={`${styles.cell} ${cell && !isGhost ? styles.filled : ''} ${isGhost ? styles.ghost : ''} ${isGhost && boardBeat ? styles.ghostBeat : ''}`}
                            style={{ ...filledStyle, ...ghostStyle }}
                        />
                    );
                })}
            </div>

            {/* Overlay for Game Over */}
            {gameOver && (
                <div className={styles.gameover} style={{ display: 'flex' }}>
                    <h2>GAME OVER</h2>
                    <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
                    <button className={styles.restartBtn} onClick={onRestart}>
                        もう一度
                    </button>
                </div>
            )}

            {/* Overlay for Paused — main menu or advancements sub-panel */}
            {isPaused && !gameOver && (
                <div className={styles.gameover} style={{ display: 'flex' }}>
                    {!showAdvancements ? (
                        <>
                            <h2>PAUSED</h2>
                            <div className={styles.finalScore}>{score.toLocaleString()} pts</div>

                            {/* Pause menu buttons */}
                            <div className={styles.pauseMenuButtons}>
                                <button className={styles.pauseMenuBtn} onClick={onResume || onRestart}>
                                    Resume
                                </button>
                                <button
                                    className={styles.pauseMenuBtn}
                                    onClick={() => setShowAdvancements(true)}
                                >
                                    <span className={styles.pauseMenuBtnIcon}>🏆</span>
                                    Advancements
                                    <span className={styles.pauseMenuBtnBadge}>
                                        {unlockedCount}/{totalCount}
                                    </span>
                                </button>
                            </div>

                            {/* Theme selector */}
                            {onThemeChange && (
                                <div className={styles.pauseThemeNav}>
                                    <span className={styles.pauseThemeLabel}>Theme</span>
                                    <div className={styles.pauseThemeButtons}>
                                        <button
                                            className={`${styles.pauseThemeBtn} ${colorTheme === 'standard' ? styles.active : ''}`}
                                            onClick={() => onThemeChange('standard')}
                                        >
                                            Standard
                                        </button>
                                        <button
                                            className={`${styles.pauseThemeBtn} ${colorTheme === 'stage' ? styles.active : ''}`}
                                            onClick={() => onThemeChange('stage')}
                                        >
                                            Stage
                                        </button>
                                        <button
                                            className={`${styles.pauseThemeBtn} ${colorTheme === 'monochrome' ? styles.active : ''}`}
                                            onClick={() => onThemeChange('monochrome')}
                                        >
                                            Mono
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Minecraft Console Edition style Advancements panel */
                        <div className={styles.mcAdvPanel}>
                            {/* Header bar */}
                            <div className={styles.mcAdvHeader}>
                                <button
                                    className={styles.mcAdvBack}
                                    onClick={() => setShowAdvancements(false)}
                                >
                                    ← Back
                                </button>
                                <div className={styles.mcAdvTitle}>ADVANCEMENTS</div>
                                <div className={styles.mcAdvCount}>
                                    {unlockedCount} / {totalCount}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className={styles.mcAdvProgressBar}>
                                <div
                                    className={styles.mcAdvProgressFill}
                                    style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
                                />
                            </div>

                            {/* Category tabs — icon-based like MC Console */}
                            <div className={styles.mcAdvTabs}>
                                {CATEGORY_ORDER.map(cat => {
                                    const catAdvs = ADVANCEMENTS.filter(a => a.category === cat);
                                    const catUnlocked = advState
                                        ? catAdvs.filter(a => advState.unlockedIds.includes(a.id)).length
                                        : 0;
                                    const isActive = selectedCategory === cat;
                                    return (
                                        <button
                                            key={cat}
                                            className={`${styles.mcAdvTab} ${isActive ? styles.mcAdvTabActive : ''}`}
                                            onClick={() => setSelectedCategory(cat)}
                                        >
                                            <span className={styles.mcAdvTabIcon}>{CATEGORY_ICONS[cat]}</span>
                                            <span className={styles.mcAdvTabLabel}>{CATEGORY_LABELS[cat]}</span>
                                            <span className={styles.mcAdvTabCount}>{catUnlocked}/{catAdvs.length}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Advancement grid */}
                            <div className={styles.mcAdvGrid}>
                                {filteredAdvancements.map(adv => {
                                    const unlocked = advState?.unlockedIds.includes(adv.id) ?? false;
                                    const currentValue = advState?.stats[adv.statKey] ?? 0;
                                    const progress = Math.min(1, currentValue / adv.threshold);

                                    return (
                                        <div
                                            key={adv.id}
                                            className={`${styles.mcAdvTile} ${unlocked ? styles.mcAdvTileUnlocked : styles.mcAdvTileLocked}`}
                                        >
                                            <div className={styles.mcAdvTileIcon}>
                                                {unlocked ? adv.icon : '🔒'}
                                            </div>
                                            <div className={styles.mcAdvTileInfo}>
                                                <div className={styles.mcAdvTileName}>
                                                    {adv.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </div>
                                                <div className={styles.mcAdvTileProgress}>
                                                    <div className={styles.mcAdvTileProgressBar}>
                                                        <div
                                                            className={styles.mcAdvTileProgressFill}
                                                            style={{ width: `${progress * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.mcAdvTileProgressText}>
                                                        {formatThreshold(currentValue)}/{formatThreshold(adv.threshold)}
                                                    </span>
                                                </div>
                                            </div>
                                            {unlocked && <div className={styles.mcAdvTileCheck}>✓</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
