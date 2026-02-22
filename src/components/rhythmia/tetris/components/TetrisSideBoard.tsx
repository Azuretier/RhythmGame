'use client';

import React, { useMemo } from 'react';
import type { CorruptionNode, Enemy } from '../types';
import { SIDE_BOARD_COLS, SIDE_BOARD_ROWS, SIDE_BOARD_CELL_SIZE, TERRAIN_RADIUS } from '../constants';
import styles from '../SideBoard.module.css';

interface TetrisSideBoardProps {
    side: 'left' | 'right';
    corruptedCells: Map<string, CorruptionNode>;
    enemies: Enemy[];
    terrainPhase: string;
}

/**
 * Map terrain grid coordinates to a minimap cell index.
 * Left board covers gx [-TERRAIN_RADIUS, -1], right board covers gx [0, TERRAIN_RADIUS].
 * Returns null if the coordinate falls outside this side's range.
 */
function toMinimapCell(
    gx: number,
    gz: number,
    side: 'left' | 'right',
): { col: number; row: number } | null {
    const R = TERRAIN_RADIUS;

    if (side === 'left') {
        if (gx >= 0 || gx < -R) return null;
    } else {
        if (gx < 0 || gx > R) return null;
    }

    const col = side === 'left'
        ? Math.min(SIDE_BOARD_COLS - 1, Math.floor((gx + R) * SIDE_BOARD_COLS / R))
        : Math.min(SIDE_BOARD_COLS - 1, Math.floor(gx * SIDE_BOARD_COLS / (R + 1)));

    const row = Math.min(
        SIDE_BOARD_ROWS - 1,
        Math.floor((gz + R) * SIDE_BOARD_ROWS / (2 * R + 1)),
    );

    if (col < 0 || col >= SIDE_BOARD_COLS || row < 0 || row >= SIDE_BOARD_ROWS) return null;
    return { col, row };
}

/**
 * Terrain corruption minimap — shows a top-down 2D view of one half of the
 * circular TD terrain. Corrupted cells are purple, enemies are red dots.
 */
export function TetrisSideBoard({ side, corruptedCells, enemies, terrainPhase }: TetrisSideBoardProps) {
    const containerClass = side === 'left' ? styles.sideBoardLeft : styles.sideBoardRight;

    const { corruptionMap, enemySet } = useMemo(() => {
        const corruptionMap = new Map<string, number>();
        const enemySet = new Set<string>();

        for (const [, node] of corruptedCells) {
            const cell = toMinimapCell(node.gx, node.gz, side);
            if (cell) {
                const key = `${cell.col},${cell.row}`;
                const existing = corruptionMap.get(key) ?? -1;
                if (node.level > existing) {
                    corruptionMap.set(key, node.level);
                }
            }
        }

        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const cell = toMinimapCell(enemy.gridX, enemy.gridZ, side);
            if (cell) {
                enemySet.add(`${cell.col},${cell.row}`);
            }
        }

        return { corruptionMap, enemySet };
    }, [corruptedCells, enemies, side]);

    const isActive = terrainPhase === 'td';

    return (
        <div className={containerClass}>
            <div
                className={styles.sideBoardGrid}
                style={{
                    gridTemplateColumns: `repeat(${SIDE_BOARD_COLS}, ${SIDE_BOARD_CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${SIDE_BOARD_ROWS}, ${SIDE_BOARD_CELL_SIZE}px)`,
                }}
            >
                {Array.from({ length: SIDE_BOARD_ROWS * SIDE_BOARD_COLS }, (_, i) => {
                    const col = i % SIDE_BOARD_COLS;
                    const row = Math.floor(i / SIDE_BOARD_COLS);
                    const key = `${col},${row}`;
                    const corruptionLevel = corruptionMap.get(key);
                    const hasEnemy = enemySet.has(key);

                    return (
                        <div
                            key={i}
                            className={`${styles.minimapTile} ${isActive ? styles.minimapTileActive : ''}`}
                        >
                            {corruptionLevel != null && (
                                <div className={
                                    corruptionLevel >= 5
                                        ? styles.minimapCorruptionMature
                                        : styles[`minimapCorruption${corruptionLevel}` as keyof typeof styles] || styles.minimapCorruption0
                                } />
                            )}
                            {hasEnemy && <div className={styles.minimapEnemy} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
