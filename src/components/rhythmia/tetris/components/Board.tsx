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
}

/**
 * Renders the game board with pieces, ghost piece, and overlays
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
}: BoardProps) {
    // Helper to get color for a piece type
    const getColor = (pieceType: string) => getThemedColor(pieceType, colorTheme, worldIdx);
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

    return (
        <div className={`${styles.boardWrap} ${boardBeat ? styles.beat : ''} ${boardShake ? styles.shake : ''}`}>
            <div className={styles.board} style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}>
                {displayBoard.flat().map((cell, i) => {
                    const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
                    const pieceType = isGhost ? cell.replace('ghost-', '') : cell;

                    return (
                        <div
                            key={i}
                            className={`${styles.cell} ${cell && !isGhost ? styles.filled : ''} ${isGhost ? styles.ghost : ''}`}
                            style={cell && !isGhost ? {
                                backgroundColor: getColor(pieceType as string),
                                boxShadow: `0 0 8px ${getColor(pieceType as string)}`
                            } : isGhost ? {
                                borderColor: `${getColor(pieceType as string)}60`
                            } : {}}
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
