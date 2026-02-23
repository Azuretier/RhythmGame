'use client';

import React, { useMemo } from 'react';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate, GalaxyRingSide } from '../galaxy-types';
import {
    GALAXY_RING_DEPTH,
    GALAXY_PATH_LAYER,
    GALAXY_TOWER_LAYER,
    GALAXY_TOWER_MAX_CHARGE,
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
    GALAXY_TOP_WIDTH,
    GALAXY_SIDE_HEIGHT,
} from '../galaxy-constants';
import styles from '../Galaxy.module.css';

interface GalaxyRingStripProps {
    side: GalaxyRingSide;
    enemies: GalaxyRingEnemy[];
    towers: GalaxyTower[];
    gate: GalaxyGate;
}

/**
 * Convert a path-fraction position into (col, row) index for this side's strip.
 * Returns null if the position falls outside this side's segment.
 */
function pathToStripCell(
    pathPos: number,
    side: GalaxyRingSide,
): { col: number; row: number } | null {
    const bounds = GALAXY_SIDE_BOUNDARIES[side];
    if (pathPos < bounds.start || pathPos >= bounds.end) return null;

    const fraction = (pathPos - bounds.start) / (bounds.end - bounds.start);
    const isHorizontal = side === 'top' || side === 'bottom';
    const length = isHorizontal ? GALAXY_TOP_WIDTH : GALAXY_SIDE_HEIGHT;
    const cellIndex = Math.min(Math.floor(fraction * length), length - 1);

    if (isHorizontal) {
        // Horizontal strips: columns span the length, rows span ring depth
        // Path is on the outer edge: top strip row 0, bottom strip row (DEPTH-1)
        const pathRow = side === 'top' ? GALAXY_PATH_LAYER : (GALAXY_RING_DEPTH - 1 - GALAXY_PATH_LAYER);
        return { col: cellIndex, row: pathRow };
    } else {
        // Vertical strips: columns span ring depth, rows span the length
        // Path is on the outer edge: left strip col 0, right strip col (DEPTH-1)
        const pathCol = side === 'left' ? GALAXY_PATH_LAYER : (GALAXY_RING_DEPTH - 1 - GALAXY_PATH_LAYER);
        return { col: pathCol, row: cellIndex };
    }
}

/**
 * Get the strip (col, row) for a tower on this side.
 */
function towerToStripCell(
    tower: GalaxyTower,
    side: GalaxyRingSide,
): { col: number; row: number } | null {
    if (tower.side !== side) return null;
    const isHorizontal = side === 'top' || side === 'bottom';

    if (isHorizontal) {
        // Tower row is the middle layer
        const towerRow = side === 'top' ? GALAXY_TOWER_LAYER : (GALAXY_RING_DEPTH - 1 - GALAXY_TOWER_LAYER);
        // Offset tower index by ring depth to skip corner cells
        const col = GALAXY_RING_DEPTH + tower.index;
        if (col >= GALAXY_TOP_WIDTH) return null;
        return { col, row: towerRow };
    } else {
        const towerCol = side === 'left' ? GALAXY_TOWER_LAYER : (GALAXY_RING_DEPTH - 1 - GALAXY_TOWER_LAYER);
        return { col: towerCol, row: tower.index };
    }
}

/**
 * Renders one side of the galaxy ring — a grid of path, tower, and buffer cells.
 */
export function GalaxyRingStrip({ side, enemies, towers, gate }: GalaxyRingStripProps) {
    const isHorizontal = side === 'top' || side === 'bottom';
    const cols = isHorizontal ? GALAXY_TOP_WIDTH : GALAXY_RING_DEPTH;
    const rows = isHorizontal ? GALAXY_RING_DEPTH : GALAXY_SIDE_HEIGHT;
    const towerCount = isHorizontal ? GALAXY_TOWERS_PER_SIDE_TB : GALAXY_TOWERS_PER_SIDE_LR;

    // Pre-compute which cells contain enemies/towers for fast lookup
    const { enemyMap, towerMap } = useMemo(() => {
        const enemyMap = new Map<string, GalaxyRingEnemy>();
        const towerMap = new Map<string, GalaxyTower>();

        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const cell = pathToStripCell(enemy.pathPosition, side);
            if (cell) {
                const key = `${cell.col},${cell.row}`;
                // Only keep the first enemy per cell (they overlap visually)
                if (!enemyMap.has(key)) {
                    enemyMap.set(key, enemy);
                }
            }
        }

        for (const tower of towers) {
            const cell = towerToStripCell(tower, side);
            if (cell) {
                towerMap.set(`${cell.col},${cell.row}`, tower);
            }
        }

        return { enemyMap, towerMap };
    }, [enemies, towers, side]);

    // Track angle for path cells (direction of enemy travel)
    const trackAngle = isHorizontal
        ? (side === 'top' ? '90deg' : '270deg')
        : (side === 'right' ? '180deg' : '0deg');

    // Buffer gradient angle (pointing toward the board)
    const bufferAngle = side === 'top' ? '180deg' : side === 'bottom' ? '0deg' : side === 'left' ? '90deg' : '270deg';

    // Gate health ratio
    const gateRatio = gate.maxHealth > 0 ? gate.health / gate.maxHealth : 1;
    const gateHealthClass = gateRatio <= 0.25 ? styles.gateHealthCritical
        : gateRatio <= 0.5 ? styles.gateHealthLow
        : styles.gateHealth;

    // Determine which row/col is path, tower, or buffer for this side
    const getLayerForCell = (col: number, row: number): 'path' | 'tower' | 'buffer' => {
        if (isHorizontal) {
            const layerRow = side === 'top' ? row : (GALAXY_RING_DEPTH - 1 - row);
            if (layerRow === GALAXY_PATH_LAYER) return 'path';
            if (layerRow === GALAXY_TOWER_LAYER) return 'tower';
            return 'buffer';
        } else {
            const layerCol = side === 'left' ? col : (GALAXY_RING_DEPTH - 1 - col);
            if (layerCol === GALAXY_PATH_LAYER) return 'path';
            if (layerCol === GALAXY_TOWER_LAYER) return 'tower';
            return 'buffer';
        }
    };

    const containerClass = side === 'top' ? styles.stripTop
        : side === 'bottom' ? styles.stripBottom
        : side === 'left' ? styles.stripLeft
        : styles.stripRight;

    return (
        <div className={containerClass}>
            <div
                className={styles.stripGrid}
                style={{
                    gridTemplateColumns: `repeat(${cols}, var(--galaxy-cell-size, 28px))`,
                    gridTemplateRows: `repeat(${rows}, var(--galaxy-cell-size, 28px))`,
                }}
            >
                {Array.from({ length: rows * cols }, (_, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const key = `${col},${row}`;
                    const layer = getLayerForCell(col, row);
                    const enemy = enemyMap.get(key);
                    const tower = towerMap.get(key);

                    const now = Date.now();
                    const isFiring = tower && (now - tower.lastFireTime < 300);
                    const isCharged = tower && tower.charge > 0;

                    const cellClass = layer === 'path'
                        ? (enemy ? styles.pathCellWithTrack : styles.pathCell)
                        : layer === 'tower'
                        ? styles.towerCell
                        : styles.bufferCell;

                    const cellStyle: React.CSSProperties = layer === 'path'
                        ? { '--track-angle': trackAngle } as React.CSSProperties
                        : layer === 'buffer'
                        ? { '--buffer-angle': bufferAngle } as React.CSSProperties
                        : {};

                    return (
                        <div key={i} className={cellClass} style={cellStyle}>
                            {enemy && <div className={styles.galaxyEnemy} />}
                            {tower && (
                                <>
                                    <div className={
                                        isFiring ? styles.galaxyTowerFiring
                                        : isCharged ? styles.galaxyTowerCharged
                                        : styles.galaxyTower
                                    }>
                                        {tower.level > 1 ? `${tower.level}` : '◆'}
                                    </div>
                                    {tower.charge > 0 && (
                                        <div className={styles.towerChargeBar}>
                                            <div
                                                className={styles.towerChargeFill}
                                                style={{ width: `${(tower.charge / tower.maxCharge) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Gate indicator at midpoint of this strip */}
            <div className={
                side === 'top' ? styles.galaxyGateTop
                : side === 'bottom' ? styles.galaxyGateBottom
                : side === 'left' ? styles.galaxyGateLeft
                : styles.galaxyGateRight
            }>
                <div
                    className={gateHealthClass}
                    style={{ width: isHorizontal ? `${gateRatio * 100}%` : '100%', height: !isHorizontal ? `${gateRatio * 100}%` : '100%' }}
                />
            </div>
        </div>
    );
}
