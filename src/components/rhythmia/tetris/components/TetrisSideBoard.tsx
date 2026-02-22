import React from 'react';
import type { SideBoardState, SideBoardSide } from '../types';
import { SIDE_BOARD_CELL_SIZE } from '../constants';
import { CorruptionOverlay } from './CorruptionOverlay';
import { RaidMobIndicator } from './RaidMobIndicator';
import styles from '../SideBoard.module.css';

interface TetrisSideBoardProps {
    board: SideBoardState;
    side: SideBoardSide;
}

/**
 * Simple seeded hash for tile color variation.
 */
function tileHash(x: number, y: number): number {
    const h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
    return (h % 100) / 100;
}

/**
 * Renders one side board as a grid with corruption nodes and raid mobs.
 * Non-interactive — purely visual display flanking the Tetris board.
 */
export function TetrisSideBoard({ board, side }: TetrisSideBoardProps) {
    const containerClass = side === 'left' ? styles.sideBoardLeft : styles.sideBoardRight;

    // Build lookup maps for corruption and raid mobs by position
    const corruptionMap = new Map<string, typeof board.corruption[number]>();
    for (const node of board.corruption) {
        corruptionMap.set(`${node.x},${node.y}`, node);
    }

    const mobMap = new Map<string, typeof board.raidMobs[number]>();
    for (const mob of board.raidMobs) {
        if (mob.alive) {
            mobMap.set(`${mob.x},${mob.y}`, mob);
        }
    }

    return (
        <div className={containerClass}>
            <div
                className={styles.sideBoardGrid}
                style={{
                    gridTemplateColumns: `repeat(${board.width}, ${SIDE_BOARD_CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${board.height}, ${SIDE_BOARD_CELL_SIZE}px)`,
                }}
            >
                {Array.from({ length: board.height * board.width }, (_, i) => {
                    const x = i % board.width;
                    const y = Math.floor(i / board.width);
                    const key = `${x},${y}`;
                    const corruption = corruptionMap.get(key);
                    const mob = mobMap.get(key);
                    const seed = tileHash(x, y);

                    return (
                        <div
                            key={i}
                            className={styles.sideBoardTile}
                            style={{ '--tile-seed': seed } as React.CSSProperties}
                        >
                            {corruption && <CorruptionOverlay node={corruption} />}
                            {mob && <RaidMobIndicator mob={mob} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
