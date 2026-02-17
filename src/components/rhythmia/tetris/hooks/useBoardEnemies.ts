import { useState, useRef, useCallback, useEffect } from 'react';
import type { BoardEnemy, BoardEnemyKind, Board } from '../types';
import {
    BOARD_WIDTH, VISIBLE_HEIGHT,
    BOARD_ENEMY_DEFS, MAX_BOARD_ENEMIES,
    CORRUPTION_BLOCK_COLOR,
} from '../constants';

let nextBoardEnemyId = 0;

/** Pick a random enemy kind based on spawn weights */
function rollEnemyKind(): BoardEnemyKind {
    const kinds = Object.values(BOARD_ENEMY_DEFS);
    const totalWeight = kinds.reduce((s, k) => s + k.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const def of kinds) {
        roll -= def.spawnWeight;
        if (roll <= 0) return def.kind;
    }
    return 'slime';
}

/** Pick a random spawn position at the board edge (top row, left or right column) */
function pickSpawnPosition(occupied: Set<string>): { col: number; row: number; facing: -1 | 1 } | null {
    const candidates: { col: number; row: number; facing: -1 | 1 }[] = [];

    // Top edge — any column
    for (let c = 0; c < BOARD_WIDTH; c++) {
        const key = `${c},0`;
        if (!occupied.has(key)) {
            candidates.push({ col: c, row: 0, facing: 1 });
        }
    }

    // Left edge — random rows in upper half
    for (let r = 0; r < 6; r++) {
        const key = `0,${r}`;
        if (!occupied.has(key)) {
            candidates.push({ col: 0, row: r, facing: 1 });
        }
    }

    // Right edge — random rows in upper half
    for (let r = 0; r < 6; r++) {
        const key = `${BOARD_WIDTH - 1},${r}`;
        if (!occupied.has(key)) {
            candidates.push({ col: BOARD_WIDTH - 1, row: r, facing: -1 });
        }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Pick the next hop target: move down and optionally sideways */
function pickHopTarget(
    col: number,
    row: number,
    board: Board,
    occupied: Set<string>,
    facing: -1 | 1
): { col: number; row: number } {
    // Priority: move down (gravity-like), then sideways toward center, then stay
    const candidates: { col: number; row: number; priority: number }[] = [];

    // Down
    if (row + 1 < VISIBLE_HEIGHT) {
        const key = `${col},${row + 1}`;
        // Can hop if board cell is empty and no other enemy
        if (!occupied.has(key) && (!board[row + 1 + 4] || board[row + 1 + 4][col] === null)) {
            candidates.push({ col, row: row + 1, priority: 3 });
        }
    }

    // Down-left
    if (row + 1 < VISIBLE_HEIGHT && col - 1 >= 0) {
        const key = `${col - 1},${row + 1}`;
        if (!occupied.has(key) && (!board[row + 1 + 4] || board[row + 1 + 4][col - 1] === null)) {
            candidates.push({ col: col - 1, row: row + 1, priority: 2 });
        }
    }

    // Down-right
    if (row + 1 < VISIBLE_HEIGHT && col + 1 < BOARD_WIDTH) {
        const key = `${col + 1},${row + 1}`;
        if (!occupied.has(key) && (!board[row + 1 + 4] || board[row + 1 + 4][col + 1] === null)) {
            candidates.push({ col: col + 1, row: row + 1, priority: 2 });
        }
    }

    // Sideways (toward center)
    const center = BOARD_WIDTH / 2;
    const sideCol = col < center ? col + 1 : col - 1;
    if (sideCol >= 0 && sideCol < BOARD_WIDTH) {
        const key = `${sideCol},${row}`;
        if (!occupied.has(key) && (!board[row + 4] || board[row + 4][sideCol] === null)) {
            candidates.push({ col: sideCol, row, priority: 1 });
        }
    }

    if (candidates.length === 0) {
        return { col, row }; // Can't move — settle in place
    }

    // Sort by priority descending, pick from top candidates with some randomness
    candidates.sort((a, b) => b.priority - a.priority);
    const topPriority = candidates[0].priority;
    const best = candidates.filter(c => c.priority === topPriority);
    return best[Math.floor(Math.random() * best.length)];
}

export interface UseBoardEnemiesReturn {
    boardEnemies: BoardEnemy[];
    spawnBoardEnemy: () => void;
    updateBoardEnemies: (board: Board, dt: number) => { settledEnemies: BoardEnemy[]; corruptionCells: { col: number; row: number }[] };
    removeBoardEnemy: (id: number) => void;
    clearBoardEnemies: () => void;
    handleLineClear: (rows: number[]) => number;
}

/**
 * Manages enemies that hop onto the Tetris board.
 * Enemies spawn at edges, hop cell-to-cell with squash-and-stretch animation,
 * and after maxHops they settle and place a corruption block.
 */
export function useBoardEnemies(): UseBoardEnemiesReturn {
    const [boardEnemies, setBoardEnemies] = useState<BoardEnemy[]>([]);
    const boardEnemiesRef = useRef<BoardEnemy[]>([]);

    useEffect(() => {
        boardEnemiesRef.current = boardEnemies;
    }, [boardEnemies]);

    const spawnBoardEnemy = useCallback(() => {
        const current = boardEnemiesRef.current;
        if (current.filter(e => e.alive).length >= MAX_BOARD_ENEMIES) return;

        const occupied = new Set<string>();
        for (const e of current) {
            if (e.alive) occupied.add(`${e.col},${e.row}`);
        }

        const spawn = pickSpawnPosition(occupied);
        if (!spawn) return;

        const kind = rollEnemyKind();
        const def = BOARD_ENEMY_DEFS[kind];
        const now = Date.now();

        const enemy: BoardEnemy = {
            id: nextBoardEnemyId++,
            kind,
            col: spawn.col,
            row: spawn.row,
            targetCol: spawn.col,
            targetRow: spawn.row,
            prevCol: spawn.col,
            prevRow: spawn.row - 1, // Appears to hop in from above
            health: def.hp,
            maxHealth: def.hp,
            alive: true,
            hopPhase: 'airborne',
            hopProgress: 0,
            hopStartTime: now,
            hopDuration: def.hopSpeed,
            spawnTime: now,
            hopsCompleted: 0,
            facing: spawn.facing,
            placedBlock: false,
        };

        setBoardEnemies(prev => [...prev, enemy]);
    }, []);

    const updateBoardEnemies = useCallback((board: Board, dt: number) => {
        const settledEnemies: BoardEnemy[] = [];
        const corruptionCells: { col: number; row: number }[] = [];

        setBoardEnemies(prev => {
            const now = Date.now();
            const occupied = new Set<string>();
            const updated: BoardEnemy[] = [];

            // First pass: collect occupied cells
            for (const e of prev) {
                if (e.alive && e.hopPhase !== 'airborne') {
                    occupied.add(`${e.col},${e.row}`);
                }
            }

            for (const e of prev) {
                if (!e.alive) continue;

                const def = BOARD_ENEMY_DEFS[e.kind as BoardEnemyKind];
                const elapsed = now - e.hopStartTime;
                const progress = Math.min(elapsed / e.hopDuration, 1);

                if (e.hopPhase === 'settled') {
                    // Enemy has settled — place corruption block
                    if (!e.placedBlock) {
                        corruptionCells.push({ col: e.col, row: e.row });
                        settledEnemies.push(e);
                        updated.push({ ...e, placedBlock: true, alive: false });
                    }
                    continue;
                }

                if (e.hopPhase === 'idle') {
                    // Ready to pick next target and start hopping
                    if (e.hopsCompleted >= def.maxHops) {
                        // Settle: enemy is done hopping
                        updated.push({
                            ...e,
                            hopPhase: 'settled',
                            hopProgress: 1,
                        });
                        continue;
                    }

                    const target = pickHopTarget(e.col, e.row, board, occupied, e.facing);
                    const newFacing = target.col > e.col ? 1 : target.col < e.col ? -1 : e.facing;

                    updated.push({
                        ...e,
                        targetCol: target.col,
                        targetRow: target.row,
                        prevCol: e.col,
                        prevRow: e.row,
                        hopPhase: 'crouch',
                        hopProgress: 0,
                        hopStartTime: now,
                        hopDuration: def.hopSpeed,
                        facing: newFacing,
                    });
                    continue;
                }

                if (e.hopPhase === 'crouch') {
                    // Squash phase (first 15% of hop duration)
                    if (progress >= 0.15) {
                        updated.push({
                            ...e,
                            hopPhase: 'airborne',
                            hopProgress: progress,
                        });
                    } else {
                        updated.push({ ...e, hopProgress: progress });
                    }
                    continue;
                }

                if (e.hopPhase === 'airborne') {
                    // In the air (15% to 85%)
                    if (progress >= 0.85) {
                        // Remove from old occupied, add to new
                        occupied.delete(`${e.col},${e.row}`);
                        occupied.add(`${e.targetCol},${e.targetRow}`);

                        updated.push({
                            ...e,
                            col: e.targetCol,
                            row: e.targetRow,
                            hopPhase: 'land',
                            hopProgress: progress,
                        });
                    } else {
                        updated.push({ ...e, hopProgress: progress });
                    }
                    continue;
                }

                if (e.hopPhase === 'land') {
                    // Landing squash (85% to 100%)
                    if (progress >= 1) {
                        updated.push({
                            ...e,
                            hopPhase: 'idle',
                            hopProgress: 0,
                            hopsCompleted: e.hopsCompleted + 1,
                            hopStartTime: now + 200, // brief pause before next hop
                        });
                    } else {
                        updated.push({ ...e, hopProgress: progress });
                    }
                    continue;
                }

                updated.push(e);
            }

            boardEnemiesRef.current = updated;
            return updated;
        });

        return { settledEnemies, corruptionCells };
    }, []);

    const removeBoardEnemy = useCallback((id: number) => {
        setBoardEnemies(prev => {
            const updated = prev.filter(e => e.id !== id);
            boardEnemiesRef.current = updated;
            return updated;
        });
    }, []);

    const clearBoardEnemies = useCallback(() => {
        setBoardEnemies([]);
        boardEnemiesRef.current = [];
    }, []);

    /** Kill enemies on cleared rows. Returns number of enemies killed. */
    const handleLineClear = useCallback((rows: number[]): number => {
        let killed = 0;
        const rowSet = new Set(rows);

        setBoardEnemies(prev => {
            const updated = prev.map(e => {
                if (e.alive && rowSet.has(e.row)) {
                    killed++;
                    return { ...e, alive: false };
                }
                // Shift enemies above cleared rows down
                if (e.alive) {
                    let shift = 0;
                    for (const r of rows) {
                        if (e.row < r) shift++;
                    }
                    if (shift > 0) {
                        return { ...e, row: e.row + shift, targetRow: e.targetRow + shift };
                    }
                }
                return e;
            }).filter(e => e.alive);
            boardEnemiesRef.current = updated;
            return updated;
        });

        return killed;
    }, []);

    return {
        boardEnemies,
        spawnBoardEnemy,
        updateBoardEnemies,
        removeBoardEnemy,
        clearBoardEnemies,
        handleLineClear,
    };
}
