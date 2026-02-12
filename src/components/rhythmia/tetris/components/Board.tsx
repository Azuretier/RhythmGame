import React, { useState, useEffect, useCallback } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS, ColorTheme, getThemedColor } from '../constants';
import { getShape, isValidPosition, getGhostY } from '../utils/boardUtils';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import Advancements from '@/components/rhythmia/Advancements';
import { KeyBindSettings } from './KeyBindSettings';
import type { Piece, Board as BoardType, Keybindings, KeybindAction } from '../types';
import styles from '../VanillaGame.module.css';

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
    keybindings?: Keybindings;
    onKeybindChange?: (action: KeybindAction, key: string) => void;
    onKeybindingsUpdate?: (bindings: Keybindings) => void;
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
    keybindings,
    onKeybindChange,
    onKeybindingsUpdate,
}: BoardProps) {
    const isFever = combo >= 10;
    const [showAdvancements, setShowAdvancements] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showKeyBinds, setShowKeyBinds] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [rebindingAction, setRebindingAction] = useState<KeybindAction | null>(null);

    // Listen for keybind rebinding
    useEffect(() => {
        if (!rebindingAction) return;
        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                setRebindingAction(null);
                return;
            }
            if (onKeybindChange) {
                onKeybindChange(rebindingAction, e.key.toLowerCase());
            }
            setRebindingAction(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [rebindingAction, onKeybindChange]);

    // Load advancement count when pause menu opens
    useEffect(() => {
        if (isPaused && !gameOver) {
            const state = loadAdvancementState();
            setUnlockedCount(state.unlockedIds.length);
        } else {
            setShowAdvancements(false);
            setShowSettings(false);
            setShowKeyBinds(false);
            setRebindingAction(null);
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

    const totalCount = ADVANCEMENTS.length;

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

            {/* Overlay for Paused — main menu, advancements, or key bindings sub-panel */}
            {isPaused && !gameOver && (
                <div className={styles.gameover} style={{ display: 'flex' }}>
                    {showKeyBinds && keybindings && onKeybindingsUpdate ? (
                        <KeyBindSettings
                            bindings={keybindings}
                            onUpdate={onKeybindingsUpdate}
                            onBack={() => setShowKeyBinds(false)}
                        />
                    ) : !showAdvancements ? (
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
                                {keybindings && onKeybindingsUpdate && (
                                    <button
                                        className={styles.pauseMenuBtn}
                                        onClick={() => setShowKeyBinds(true)}
                                    >
                                        <span className={styles.pauseMenuBtnIcon}>⌨</span>
                                        Key Bindings
                                    </button>
                                )}
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
                    ) : showSettings ? (
                        <div className={styles.settingsPanel}>
                            <div className={styles.settingsHeader}>
                                <button className={styles.settingsBack} onClick={() => setShowSettings(false)}>
                                    &#x2190; Back
                                </button>
                                <h3 className={styles.settingsTitle}>KEYBINDINGS</h3>
                            </div>
                            <div className={styles.settingsBody}>
                                {keybindings && (
                                    <>
                                        <div className={styles.keybindRow}>
                                            <span className={styles.keybindLabel}>Inventory</span>
                                            <button
                                                className={`${styles.keybindKey} ${rebindingAction === 'inventory' ? styles.keybindKeyActive : ''}`}
                                                onClick={() => setRebindingAction('inventory')}
                                            >
                                                {rebindingAction === 'inventory' ? 'Press a key...' : keybindings.inventory.toUpperCase()}
                                            </button>
                                        </div>
                                        <div className={styles.keybindRow}>
                                            <span className={styles.keybindLabel}>Shop</span>
                                            <button
                                                className={`${styles.keybindKey} ${rebindingAction === 'shop' ? styles.keybindKeyActive : ''}`}
                                                onClick={() => setRebindingAction('shop')}
                                            >
                                                {rebindingAction === 'shop' ? 'Press a key...' : keybindings.shop.toUpperCase()}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className={styles.settingsHint}>
                                Click a key binding, then press the new key. Press ESC to cancel.
                            </div>
                        </div>
                    ) : (
                        <Advancements onClose={() => setShowAdvancements(false)} />
                    )}
                </div>
            )}
        </div>
    );
}
