import React from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ZONE, ColorTheme, getThemedColor } from '../constants';
import { getShape, getGhostY } from '../utils/boardUtils';
import { PauseMenu } from './PauseMenu';
import type { GameKeybinds } from '../hooks/useKeybinds';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
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
    onQuit?: () => void;
    colorTheme?: ColorTheme;
    onThemeChange?: (theme: ColorTheme) => void;
    worldIdx?: number;
    combo?: number;
    beatPhase?: number;
    boardElRef?: React.Ref<HTMLDivElement>;
    // Settings props for pause menu
    das?: number;
    arr?: number;
    sdf?: number;
    onDasChange?: (v: number) => void;
    onArrChange?: (v: number) => void;
    onSdfChange?: (v: number) => void;
    // Keybind props for pause menu
    keybinds?: GameKeybinds;
    onKeybindChange?: (action: keyof GameKeybinds, key: string) => void;
    onKeybindsReset?: () => void;
    defaultKeybinds?: GameKeybinds;
    featureSettings?: FeatureSettings;
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
    onQuit,
    colorTheme = 'stage',
    onThemeChange,
    worldIdx = 0,
    combo = 0,
    beatPhase = 0,
    boardElRef,
    das = 167,
    arr = 33,
    sdf = 50,
    onDasChange,
    onArrChange,
    onSdfChange,
    keybinds,
    onKeybindChange,
    onKeybindsReset,
    defaultKeybinds,
    featureSettings,
}: BoardProps) {
    const isFever = combo >= 10;

    // Helper to get color for a piece type, with fever chroma shift
    const getColor = (pieceType: string) => {
        if (isFever) {
            const baseHue = beatPhase * 360;
            const offset = 'IOTSzjl'.indexOf(pieceType.toUpperCase()) * 51;
            return `hsl(${(baseHue + offset) % 360}, 90%, 60%)`;
        }
        return getThemedColor(pieceType, colorTheme, worldIdx);
    };

    // Create display board with current piece and ghost.
    // Only the visible rows (below BUFFER_ZONE) are rendered.
    const displayBoard = React.useMemo(() => {
        const display = board.map(row => [...row]);

        if (currentPiece) {
            const shape = getShape(currentPiece.type, currentPiece.rotation);

            const showGhost = featureSettings?.ghostPiece !== false;
            const ghostY = getGhostY(currentPiece, board);
            if (showGhost && ghostY !== currentPiece.y) {
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

        // Only return visible rows (skip buffer zone)
        return display.slice(BUFFER_ZONE);
    }, [board, currentPiece]);

    const boardWrapClasses = [
        styles.boardWrap,
        boardBeat ? styles.beat : '',
        boardShake ? styles.shake : '',
        isFever ? styles.fever : '',
    ].filter(Boolean).join(' ');

    // Default keybinds fallback
    const fallbackKeybinds: GameKeybinds = { inventory: 'e', shop: 'l' };

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
                    <div className={styles.pauseMenuButtons}>
                        <button className={styles.pauseMenuBtn} onClick={onRestart}>
                            もう一度
                        </button>
                        {onQuit && (
                            <button
                                className={`${styles.pauseMenuBtn} ${styles.pauseMenuQuitBtn}`}
                                onClick={onQuit}
                            >
                                Back to Title
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Pause Menu with side navigation tabs */}
            {isPaused && !gameOver && (
                <PauseMenu
                    score={score}
                    onResume={onResume || onRestart}
                    onQuit={onQuit}
                    das={das}
                    arr={arr}
                    sdf={sdf}
                    onDasChange={onDasChange || (() => { })}
                    onArrChange={onArrChange || (() => { })}
                    onSdfChange={onSdfChange || (() => { })}
                    colorTheme={colorTheme}
                    onThemeChange={onThemeChange}
                    keybinds={keybinds || fallbackKeybinds}
                    onKeybindChange={onKeybindChange || (() => { })}
                    onKeybindsReset={onKeybindsReset || (() => { })}
                    defaultKeybinds={defaultKeybinds || fallbackKeybinds}
                />
            )}
        </div>
    );
}
