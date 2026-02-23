'use client';

// =============================================================
// Minecraft Board Game - Side Board Renderer
// Renders corruption nodes and raid mobs on flanking side boards
// =============================================================

import { useMemo } from 'react';
import type { SideBoardVisibleState, SideBoardSide, RaidMob, CorruptionNode } from '@/types/minecraft-board';
import { MC_BOARD_CONFIG, MOB_COLORS, MOB_ICONS } from '@/types/minecraft-board';
import styles from './MinecraftBoard.module.css';

interface SideBoardRendererProps {
  sideBoard: SideBoardVisibleState;
  side: SideBoardSide;
  mainBoardCenterY: number;
}

const SIDE_TILE_SIZE = 20;
const VIEWPORT = MC_BOARD_CONFIG.VIEWPORT_SIZE;
const HALF_VP = Math.floor(VIEWPORT / 2);

// Seeded hash for terrain color variation
function terrainColor(x: number, y: number): string {
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const r = 18 + (hash % 12);
  const g = 14 + ((hash >> 4) % 10);
  const b = 22 + ((hash >> 8) % 14);
  return `rgb(${r}, ${g}, ${b})`;
}

function getCorruptionLevelClass(level: number): string {
  switch (level) {
    case 0: return styles.corruptionLevel0;
    case 1: return styles.corruptionLevel1;
    case 2: return styles.corruptionLevel2;
    case 3: return styles.corruptionLevel3;
    case 4: return styles.corruptionLevel4;
    default: return styles.corruptionLevel5;
  }
}

export default function SideBoardRenderer({
  sideBoard,
  side,
  mainBoardCenterY,
}: SideBoardRendererProps) {
  // Build corruption lookup
  const corruptionMap = useMemo(() => {
    const map = new Map<string, CorruptionNode>();
    for (const node of sideBoard.corruption) {
      map.set(`${node.x},${node.y}`, node);
    }
    return map;
  }, [sideBoard.corruption]);

  // Build raid mob lookup
  const raidMobMap = useMemo(() => {
    const map = new Map<string, RaidMob>();
    for (const mob of sideBoard.raidMobs) {
      map.set(`${mob.x},${mob.y}`, mob);
    }
    return map;
  }, [sideBoard.raidMobs]);

  // Generate grid cells - viewport aligned with main board
  const gridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];

    for (let vy = 0; vy < VIEWPORT; vy++) {
      for (let vx = 0; vx < sideBoard.width; vx++) {
        const wy = mainBoardCenterY - HALF_VP + vy;
        const key = `${vx},${wy}`;

        // Out of bounds
        if (wy < 0 || wy >= sideBoard.height) {
          cells.push(
            <div key={`${vx}-${vy}`} className={styles.sideBoardTile} style={{ backgroundColor: '#0a000f' }} />
          );
          continue;
        }

        const corruption = corruptionMap.get(key);
        const mob = raidMobMap.get(key);
        const bgColor = terrainColor(vx, wy);

        cells.push(
          <div
            key={`${vx}-${vy}`}
            className={styles.sideBoardTile}
            style={{ backgroundColor: bgColor }}
            title={`Side ${side} (${vx}, ${wy})${corruption ? ` [Corruption Lv.${corruption.level}]` : ''}${mob ? ` [${mob.type}]` : ''}`}
          >
            {/* Corruption glow overlay */}
            {corruption && (
              <div
                className={`${styles.corruptionNode} ${getCorruptionLevelClass(corruption.level)} ${corruption.level >= corruption.maxLevel ? styles.corruptionMature : ''}`}
              />
            )}

            {/* Raid mob indicator */}
            {mob && (
              <div
                className={`${styles.sideBoardEntity}`}
                style={{ backgroundColor: MOB_COLORS[mob.type] }}
              >
                <span className={styles.sideBoardEntityIcon}>{MOB_ICONS[mob.type]}</span>
              </div>
            )}
          </div>
        );
      }
    }

    return cells;
  }, [sideBoard, side, mainBoardCenterY, corruptionMap, raidMobMap]);

  return (
    <div className={`${styles.sideBoard} ${side === 'left' ? styles.sideBoardLeft : styles.sideBoardRight}`}>
      <div className={styles.sideBoardLabel}>{side === 'left' ? 'L' : 'R'}</div>
      <div
        className={styles.sideBoardGrid}
        style={{
          gridTemplateColumns: `repeat(${sideBoard.width}, ${SIDE_TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${VIEWPORT}, ${SIDE_TILE_SIZE}px)`,
        }}
      >
        {gridCells}
      </div>
    </div>
  );
}
