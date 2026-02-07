import React from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS, ColorTheme, getThemedColor } from '../constants';
import { getShape, isValidPosition, getGhostY } from '../utils/boardUtils';
import type { Piece, Board as BoardType } from '../types';
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
    colorTheme?: ColorTheme;
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
    colorTheme = 'stage',
    worldIdx = 0,
    combo = 0,
    beatPhase = 0,
    boardElRef,
}: BoardProps) {
    const isFever = combo >= 10;

    // Helper to get color for a piece type, with fever chroma shift
    const getColor = (pieceType: string) => {
        if (isFever) {
            // Rainbow cycle: shift hue based on time (use beatPhase as proxy)
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

            // Add ghost piece first
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

            // Add current piece on top
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

    // Board wrapper classes: beat pulse, shake, fever state
    const boardWrapClasses = [
        styles.boardWrap,
        boardBeat ? styles.beat : '',
        boardShake ? styles.shake : '',
        isFever ? styles.fever : '',
    ].filter(Boolean).join(' ');

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

                    // Ghost piece: enhanced glow on beat
                    const ghostStyle = isGhost ? {
                        borderColor: boardBeat ? `${color}CC` : `${color}60`,
                        boxShadow: boardBeat ? `0 0 12px ${color}80, inset 0 0 6px ${color}40` : 'none',
                        transition: 'border-color 0.1s, box-shadow 0.1s',
                    } : {};

                    // Filled piece style
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

            {/* Overlay for Game Over / Paused */}
            {(gameOver || isPaused) && (
                <div className={styles.gameover} style={{ display: 'flex' }}>
                    <h2>{gameOver ? 'GAME OVER' : 'PAUSED'}</h2>
                    <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
                    <button className={styles.restartBtn} onClick={onRestart}>
                        {gameOver ? 'もう一度' : 'Resume'}
                    </button>
                </div>
            )}
        </div>
    );
}
