import React from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ZONE, ColorTheme, getThemedColor } from '../constants';
import { getShape, getGhostY } from '../utils/boardUtils';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
import styles from '../VanillaGame.module.css';

// ===== Memoized Cell Component =====
// Each cell only re-renders when its own visual state changes, not on every board render.
interface CellProps {
    cell: string | null;
    boardBeat: boolean;
    isFever: boolean;
    colorTheme: ColorTheme;
    worldIdx: number;
    beatPhase: number;
}

const Cell = React.memo(function Cell({ cell, boardBeat, isFever, colorTheme, worldIdx, beatPhase }: CellProps) {
    if (!cell) {
        return <div className={styles.cell} />;
    }

    const isGhost = cell.startsWith('ghost-');
    const pieceType = isGhost ? cell.slice(6) : cell;

    // Compute color
    let color: string;
    if (isFever) {
        const baseHue = beatPhase * 360;
        const offset = 'IOTSzjl'.indexOf(pieceType.toUpperCase()) * 51;
        color = `hsl(${(baseHue + offset) % 360}, 90%, 60%)`;
    } else {
        color = getThemedColor(pieceType, colorTheme, worldIdx);
    }

    if (isGhost) {
        const className = `${styles.cell} ${styles.ghost}${boardBeat ? ` ${styles.ghostBeat}` : ''}`;
        const style = {
            borderColor: boardBeat ? `${color}CC` : `${color}60`,
            boxShadow: boardBeat ? `0 0 12px ${color}80, inset 0 0 6px ${color}40` : 'none',
            transition: 'border-color 0.1s, box-shadow 0.1s',
        };
        return <div className={className} style={style} />;
    }

    const style = {
        backgroundColor: color,
        boxShadow: isFever
            ? `0 0 12px ${color}, 0 0 4px ${color}`
            : `0 0 8px ${color}`,
    };
    return <div className={`${styles.cell} ${styles.filled}`} style={style} />;
});

interface BoardProps {
    board: BoardType;
    currentPiece: Piece | null;
    boardBeat: boolean;
    boardShake: boolean;
    colorTheme?: ColorTheme;
    worldIdx?: number;
    combo?: number;
    beatPhase?: number;
    boardElRef?: React.Ref<HTMLDivElement>;
    featureSettings?: FeatureSettings;
    activeAnomaly?: boolean;
}

/**
 * Renders the game board with pieces, ghost piece, and overlays.
 * Enhanced with rhythm-reactive VFX: beat ghost glow, fever chroma shift.
 * Wrapped in React.memo to prevent re-renders from parent state changes
 * that don't affect the board (e.g., score updates, inventory changes).
 */
export const Board = React.memo(function Board({
    board,
    currentPiece,
    boardBeat,
    boardShake,
    colorTheme = 'stage',
    worldIdx = 0,
    combo = 0,
    beatPhase = 0,
    boardElRef,
    featureSettings,
    activeAnomaly = false,
}: BoardProps) {
    const isFever = combo >= 10;

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
    }, [board, currentPiece, featureSettings?.ghostPiece]);

    const boardWrapClasses = React.useMemo(() => [
        styles.boardWrap,
        boardBeat ? styles.beat : '',
        boardShake ? styles.shake : '',
        isFever ? styles.fever : '',
        activeAnomaly ? styles.anomaly : '',
    ].filter(Boolean).join(' '), [boardBeat, boardShake, isFever, activeAnomaly]);

    return (
        <div className={boardWrapClasses}>
            <div
                ref={boardElRef}
                className={styles.board}
                style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
            >
                {displayBoard.map((row, rowIdx) =>
                    row.map((cell, colIdx) => (
                        <Cell
                            key={`${rowIdx}-${colIdx}`}
                            cell={cell}
                            boardBeat={boardBeat}
                            isFever={isFever}
                            colorTheme={colorTheme}
                            worldIdx={worldIdx}
                            beatPhase={beatPhase}
                        />
                    ))
                )}
            </div>
        </div>
    );
});
