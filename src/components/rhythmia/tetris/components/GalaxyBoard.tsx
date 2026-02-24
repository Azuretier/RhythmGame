'use client';

import React, { useMemo } from 'react';
import { Board } from './Board';
import type { Piece, Board as BoardType, FeatureSettings } from '../types';
import type { ColorTheme, } from '../constants';
import { BOARD_WIDTH, VISIBLE_HEIGHT } from '../constants';
import type { GameKeybinds } from '../hooks/useKeybinds';
import type { GalaxyRingEnemy, GalaxyTower, GalaxyGate } from '../galaxy-types';
import {
    GALAXY_RING_DEPTH,
    GALAXY_TOP_WIDTH,
    GALAXY_SIDE_HEIGHT,
    GALAXY_PATH_LENGTH,
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_GATE_POSITIONS,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
} from '../galaxy-constants';
import galaxyStyles from '../Galaxy.module.css';

// ===== Ring cell types for the 2D grid =====
type RingCellType = 'path' | 'tower' | 'buffer' | 'gate' | 'corner';

interface RingCell {
    type: RingCellType;
    side: 'top' | 'right' | 'bottom' | 'left' | 'corner';
    pathIndex?: number;      // 0-based index along the 72-cell path (only for path cells)
    towerSide?: string;      // Which side this tower belongs to
    towerIndex?: number;     // Index of the tower on that side
    gateSide?: string;       // Which gate this cell belongs to
}

// ===== Map path fraction (0-1) to integer path cell index (0-71) =====
function pathFractionToIndex(pathPos: number): number {
    return Math.floor((pathPos % 1.0) * GALAXY_PATH_LENGTH) % GALAXY_PATH_LENGTH;
}

// ===== Map tower side+index to path cell index for rendering =====
function towerToPathIndex(side: string, index: number): number {
    const bounds = GALAXY_SIDE_BOUNDARIES[side as keyof typeof GALAXY_SIDE_BOUNDARIES];
    const count = (side === 'top' || side === 'bottom')
        ? GALAXY_TOWERS_PER_SIDE_TB
        : GALAXY_TOWERS_PER_SIDE_LR;
    const sideLength = bounds.end - bounds.start;
    // For top/bottom, skip 3 corner cells; for left/right, use full range
    const padding = (side === 'top' || side === 'bottom')
        ? sideLength * (GALAXY_RING_DEPTH / GALAXY_TOP_WIDTH)
        : 0;
    const usableLength = sideLength - 2 * padding;
    const fraction = bounds.start + padding + (index + 0.5) * (usableLength / count);
    return Math.floor(fraction * GALAXY_PATH_LENGTH) % GALAXY_PATH_LENGTH;
}

// ===== Build the full grid layout (top strip, left strip, right strip, bottom strip) =====
// Returns a 2D array for the full composite grid: (VISIBLE_HEIGHT + 2*RING_DEPTH) tall × (BOARD_WIDTH + 2*RING_DEPTH) wide
function buildGridLayout(): (RingCell | null)[][] {
    const totalW = BOARD_WIDTH + 2 * GALAXY_RING_DEPTH; // 16
    const totalH = VISIBLE_HEIGHT + 2 * GALAXY_RING_DEPTH; // 26
    const grid: (RingCell | null)[][] = Array.from({ length: totalH }, () => Array(totalW).fill(null));

    // Path cell index counter (clockwise: top→right→bottom→left)
    let pathIdx = 0;

    // ===== TOP strip (rows 0..2, cols 0..15) =====
    for (let row = 0; row < GALAXY_RING_DEPTH; row++) {
        for (let col = 0; col < totalW; col++) {
            const layer = row; // 0=outer(path), 1=tower, 2=buffer
            // Corners
            if (col < GALAXY_RING_DEPTH || col >= totalW - GALAXY_RING_DEPTH) {
                grid[row][col] = { type: 'corner', side: 'corner' };
                continue;
            }
            if (layer === 0) {
                grid[row][col] = { type: 'path', side: 'top', pathIndex: pathIdx++ };
            } else if (layer === 1) {
                grid[row][col] = { type: 'tower', side: 'top' };
            } else {
                grid[row][col] = { type: 'buffer', side: 'top' };
            }
        }
    }

    // ===== RIGHT strip (rows 3..22, cols 13..15) =====
    for (let row = GALAXY_RING_DEPTH; row < GALAXY_RING_DEPTH + VISIBLE_HEIGHT; row++) {
        for (let layer = 0; layer < GALAXY_RING_DEPTH; layer++) {
            const col = totalW - GALAXY_RING_DEPTH + layer;
            if (layer === 0) {
                grid[row][col] = { type: 'path', side: 'right', pathIndex: pathIdx++ };
            } else if (layer === 1) {
                grid[row][col] = { type: 'tower', side: 'right' };
            } else {
                grid[row][col] = { type: 'buffer', side: 'right' };
            }
        }
    }

    // ===== BOTTOM strip (rows 23..25, cols 0..15) — right to left =====
    for (let row = totalH - 1; row >= totalH - GALAXY_RING_DEPTH; row--) {
        const layer = totalH - 1 - row; // 0=outer(path), 1=tower, 2=buffer
        for (let col = totalW - 1; col >= 0; col--) {
            if (col >= totalW - GALAXY_RING_DEPTH || col < GALAXY_RING_DEPTH) {
                grid[row][col] = { type: 'corner', side: 'corner' };
                continue;
            }
            if (layer === 0) {
                grid[row][col] = { type: 'path', side: 'bottom', pathIndex: pathIdx++ };
            } else if (layer === 1) {
                grid[row][col] = { type: 'tower', side: 'bottom' };
            } else {
                grid[row][col] = { type: 'buffer', side: 'bottom' };
            }
        }
    }

    // ===== LEFT strip (rows 22..3, cols 0..2) — bottom to top =====
    for (let row = GALAXY_RING_DEPTH + VISIBLE_HEIGHT - 1; row >= GALAXY_RING_DEPTH; row--) {
        for (let layer = 0; layer < GALAXY_RING_DEPTH; layer++) {
            const col = GALAXY_RING_DEPTH - 1 - layer;
            if (layer === 0) {
                grid[row][col] = { type: 'path', side: 'left', pathIndex: pathIdx++ };
            } else if (layer === 1) {
                grid[row][col] = { type: 'tower', side: 'left' };
            } else {
                grid[row][col] = { type: 'buffer', side: 'left' };
            }
        }
    }

    return grid;
}

interface GalaxyBoardProps {
    galaxyActive: boolean;
    waveNumber: number;
    // Galaxy TD state for grid overlay
    enemies?: GalaxyRingEnemy[];
    towers?: GalaxyTower[];
    gates?: GalaxyGate[];
    // Board props (pass-through)
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
    das?: number;
    arr?: number;
    sdf?: number;
    onDasChange?: (v: number) => void;
    onArrChange?: (v: number) => void;
    onSdfChange?: (v: number) => void;
    keybinds?: GameKeybinds;
    onKeybindChange?: (action: keyof GameKeybinds, key: string) => void;
    onKeybindsReset?: () => void;
    defaultKeybinds?: GameKeybinds;
    featureSettings?: FeatureSettings;
    onFeatureSettingsUpdate?: (settings: FeatureSettings) => void;
    activeAnomaly?: boolean;
}

/**
 * Galaxy Board — wraps the Tetris Board with a 2D grid terrain overlay
 * showing the TD ring (path, towers, gates, enemies) around the board during dig phase.
 */
export function GalaxyBoard({
    galaxyActive,
    waveNumber,
    enemies = [],
    towers = [],
    gates = [],
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
    colorTheme,
    onThemeChange,
    worldIdx,
    combo,
    beatPhase,
    boardElRef,
    das,
    arr,
    sdf,
    onDasChange,
    onArrChange,
    onSdfChange,
    keybinds,
    onKeybindChange,
    onKeybindsReset,
    defaultKeybinds,
    featureSettings,
    onFeatureSettingsUpdate,
    activeAnomaly,
}: GalaxyBoardProps) {
    const boardElement = (
        <Board
            board={board}
            currentPiece={currentPiece}
            boardBeat={boardBeat}
            boardShake={boardShake}
            gameOver={gameOver}
            isPaused={isPaused}
            score={score}
            onRestart={onRestart}
            onResume={onResume}
            onQuit={onQuit}
            colorTheme={colorTheme}
            onThemeChange={onThemeChange}
            worldIdx={worldIdx}
            combo={combo}
            beatPhase={beatPhase}
            boardElRef={boardElRef}
            das={das}
            arr={arr}
            sdf={sdf}
            onDasChange={onDasChange}
            onArrChange={onArrChange}
            onSdfChange={onSdfChange}
            keybinds={keybinds}
            onKeybindChange={onKeybindChange}
            onKeybindsReset={onKeybindsReset}
            defaultKeybinds={defaultKeybinds}
            featureSettings={featureSettings}
            onFeatureSettingsUpdate={onFeatureSettingsUpdate}
            activeAnomaly={activeAnomaly}
        />
    );

    if (!galaxyActive || waveNumber <= 0) {
        return boardElement;
    }

    // Build static grid layout
    const gridLayout = useMemo(() => buildGridLayout(), []);

    // Map enemy pathPosition → path cell index
    const enemyPathCells = useMemo(() => {
        const set = new Set<number>();
        for (const e of enemies) {
            if (e.alive) set.add(pathFractionToIndex(e.pathPosition));
        }
        return set;
    }, [enemies]);

    // Map enemies to cells for HP display
    const enemyAtCell = useMemo(() => {
        const map = new Map<number, GalaxyRingEnemy>();
        for (const e of enemies) {
            if (e.alive) {
                const idx = pathFractionToIndex(e.pathPosition);
                // Keep the first enemy at each cell
                if (!map.has(idx)) map.set(idx, e);
            }
        }
        return map;
    }, [enemies]);

    // Map charged tower positions
    const towerChargeMap = useMemo(() => {
        const map = new Map<string, { charge: number; maxCharge: number; level: number }>();
        for (const t of towers) {
            const key = `${t.side}-${t.index}`;
            map.set(key, { charge: t.charge, maxCharge: t.maxCharge, level: t.level });
        }
        return map;
    }, [towers]);

    // Gate health by side
    const gateHealth = useMemo(() => {
        const map = new Map<string, { ratio: number }>();
        for (const g of gates) {
            map.set(g.side, { ratio: g.health / g.maxHealth });
        }
        return map;
    }, [gates]);

    // Gate path indices
    const gatePathIndices = useMemo(() => {
        const set = new Set<number>();
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
            const pos = GALAXY_GATE_POSITIONS[side];
            set.add(Math.floor(pos * GALAXY_PATH_LENGTH) % GALAXY_PATH_LENGTH);
        }
        return set;
    }, []);

    // Tower path indices for charge coloring
    const towerPathMap = useMemo(() => {
        const map = new Map<number, { side: string; index: number }>();
        for (const t of towers) {
            const idx = towerToPathIndex(t.side, t.index);
            map.set(idx, { side: t.side, index: t.index });
        }
        return map;
    }, [towers]);

    const totalW = BOARD_WIDTH + 2 * GALAXY_RING_DEPTH;
    const totalH = VISIBLE_HEIGHT + 2 * GALAXY_RING_DEPTH;

    // Render ring cells
    const renderRingCell = (cell: RingCell | null, row: number, col: number) => {
        if (!cell) return null;

        let className = galaxyStyles.ringCell;
        let content: React.ReactNode = null;
        let style: React.CSSProperties = {};

        if (cell.type === 'corner') {
            className += ` ${galaxyStyles.cornerCell}`;
        } else if (cell.type === 'path') {
            className += ` ${galaxyStyles.pathCell}`;
            const pIdx = cell.pathIndex ?? -1;

            // Check for gate
            if (gatePathIndices.has(pIdx)) {
                className += ` ${galaxyStyles.gateCell}`;
                const gateInfo = gateHealth.get(cell.side);
                if (gateInfo) {
                    const r = gateInfo.ratio;
                    style.borderColor = r > 0.5 ? '#44ff88' : r > 0.25 ? '#ffaa44' : '#ff4444';
                    style.boxShadow = `inset 0 0 4px ${style.borderColor}`;
                }
            }

            // Check for enemy
            if (enemyPathCells.has(pIdx)) {
                className += ` ${galaxyStyles.enemyCell}`;
                const enemy = enemyAtCell.get(pIdx);
                if (enemy) {
                    const hpRatio = enemy.health / enemy.maxHealth;
                    const hpColor = hpRatio > 0.5 ? '#44dd66' : hpRatio > 0.25 ? '#ddaa33' : '#dd3333';
                    content = (
                        <span className={galaxyStyles.enemyHP} style={{ color: hpColor }}>
                            {enemy.health}
                        </span>
                    );
                }
            }
        } else if (cell.type === 'tower') {
            className += ` ${galaxyStyles.towerCell}`;
            // Find tower data matching this cell's position
            // Tower cells are the middle layer — determine tower index from position
            const towerSide = cell.side;
            let towerIdx: number;
            if (towerSide === 'top') {
                towerIdx = col - GALAXY_RING_DEPTH;
            } else if (towerSide === 'bottom') {
                towerIdx = (totalW - GALAXY_RING_DEPTH - 1) - col;
            } else if (towerSide === 'right') {
                towerIdx = row - GALAXY_RING_DEPTH;
            } else {
                towerIdx = (GALAXY_RING_DEPTH + VISIBLE_HEIGHT - 1) - row;
            }
            const towerKey = `${towerSide}-${towerIdx}`;
            const tData = towerChargeMap.get(towerKey);
            if (tData && tData.charge > 0) {
                className += ` ${galaxyStyles.towerCharged}`;
                const chargeRatio = tData.charge / tData.maxCharge;
                style.opacity = 0.5 + chargeRatio * 0.5;
                if (tData.level > 1) {
                    className += ` ${galaxyStyles.towerUpgraded}`;
                }
            }
        } else if (cell.type === 'buffer') {
            className += ` ${galaxyStyles.bufferCell}`;
        }

        return (
            <div
                key={`${row}-${col}`}
                className={className}
                style={style}
            >
                {content}
            </div>
        );
    };

    return (
        <div className={galaxyStyles.galaxyContainer}>
            <div className={galaxyStyles.waveLabel}>WAVE {waveNumber}</div>
            <div
                className={galaxyStyles.gridTerrain}
                style={{
                    gridTemplateColumns: `repeat(${totalW}, 1fr)`,
                    gridTemplateRows: `repeat(${totalH}, 1fr)`,
                }}
            >
                {/* Top ring rows */}
                {gridLayout.slice(0, GALAXY_RING_DEPTH).map((row, r) =>
                    row.map((cell, c) => renderRingCell(cell, r, c))
                )}
                {/* Middle rows: left ring + board (spanning) + right ring */}
                {Array.from({ length: VISIBLE_HEIGHT }, (_, r) => {
                    const gridRow = r + GALAXY_RING_DEPTH;
                    const rowCells = gridLayout[gridRow];
                    return (
                        <React.Fragment key={`mid-${r}`}>
                            {/* Left ring cells */}
                            {rowCells.slice(0, GALAXY_RING_DEPTH).map((cell, c) =>
                                renderRingCell(cell, gridRow, c)
                            )}
                            {/* Board cell — only first row places the board element spanning all middle cells */}
                            {r === 0 && (
                                <div
                                    className={galaxyStyles.boardSlot}
                                    style={{
                                        gridColumn: `${GALAXY_RING_DEPTH + 1} / ${GALAXY_RING_DEPTH + BOARD_WIDTH + 1}`,
                                        gridRow: `${GALAXY_RING_DEPTH + 1} / ${GALAXY_RING_DEPTH + VISIBLE_HEIGHT + 1}`,
                                    }}
                                >
                                    {boardElement}
                                </div>
                            )}
                            {/* Right ring cells */}
                            {rowCells.slice(totalW - GALAXY_RING_DEPTH).map((cell, c) =>
                                renderRingCell(cell, gridRow, totalW - GALAXY_RING_DEPTH + c)
                            )}
                        </React.Fragment>
                    );
                })}
                {/* Bottom ring rows */}
                {gridLayout.slice(totalH - GALAXY_RING_DEPTH).map((row, r) =>
                    row.map((cell, c) =>
                        renderRingCell(cell, totalH - GALAXY_RING_DEPTH + r, c)
                    )
                )}
            </div>
        </div>
    );
}
