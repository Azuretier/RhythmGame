import React from 'react';
import { COLORS, ColorTheme, getThemedColor } from '../constants';
import { getShape } from '../utils/boardUtils';
import styles from '../VanillaGame.module.css';

interface NextPieceProps {
    pieceType: string;
    colorTheme?: ColorTheme;
    worldIdx?: number;
}

/**
 * Renders the next piece preview
 */
export function NextPiece({ pieceType, colorTheme = 'stage', worldIdx = 0 }: NextPieceProps) {
    const shape = getShape(pieceType, 0);
    const color = getThemedColor(pieceType, colorTheme, worldIdx);

    return (
        <div
            className={styles.next}
            style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}
        >
            {shape.flat().map((val, i) => (
                <div
                    key={i}
                    className={styles.nextCell}
                    style={val ? {
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`
                    } : {}}
                />
            ))}
        </div>
    );
}

interface HoldPieceProps {
    pieceType: string | null;
    canHold: boolean;
    colorTheme?: ColorTheme;
    worldIdx?: number;
}

/**
 * Renders the hold piece preview
 */
export function HoldPiece({ pieceType, canHold, colorTheme = 'stage', worldIdx = 0 }: HoldPieceProps) {
    if (!pieceType) {
        return (
            <div className={styles.next} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {Array(16).fill(null).map((_, i) => (
                    <div key={i} className={styles.nextCell} />
                ))}
            </div>
        );
    }

    const shape = getShape(pieceType, 0);
    const color = getThemedColor(pieceType, colorTheme, worldIdx);

    return (
        <div
            className={styles.next}
            style={{
                gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`,
                opacity: canHold ? 1 : 0.5
            }}
        >
            {shape.flat().map((val, i) => (
                <div
                    key={i}
                    className={styles.nextCell}
                    style={val ? {
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`
                    } : {}}
                />
            ))}
        </div>
    );
}
