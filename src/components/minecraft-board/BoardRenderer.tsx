'use client';

// =============================================================
// Minecraft Board Game - 2D Grid Board Renderer
// Renders the game world with fog of war, players, and mobs
// =============================================================

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type {
  WorldTile, MCTileUpdate, MCVisiblePlayer, MCMobState,
  MCPlayerState, DayPhase, BlockType, Direction,
} from '@/types/minecraft-board';
import {
  MC_BOARD_CONFIG, BLOCK_COLORS, BLOCK_ICONS,
  MOB_COLORS, MOB_ICONS, BLOCK_PROPERTIES,
} from '@/types/minecraft-board';
import styles from './MinecraftBoard.module.css';

interface BoardRendererProps {
  visibleTiles: MCTileUpdate[];
  exploredTilesRef: React.MutableRefObject<Map<string, WorldTile>>;
  visiblePlayers: MCVisiblePlayer[];
  visibleMobs: MCMobState[];
  selfState: MCPlayerState;
  dayPhase: DayPhase;
  playerId: string;
  onTileClick: (x: number, y: number) => void;
  onMobClick: (mobId: string) => void;
  onPlayerClick: (targetPlayerId: string) => void;
  onMove: (direction: Direction) => void;
}

const TILE_SIZE = 40;
const VIEWPORT = MC_BOARD_CONFIG.VIEWPORT_SIZE;
const HALF_VP = Math.floor(VIEWPORT / 2);

export default function BoardRenderer({
  visibleTiles,
  exploredTilesRef,
  visiblePlayers,
  visibleMobs,
  selfState,
  dayPhase,
  playerId,
  onTileClick,
  onMobClick,
  onPlayerClick,
  onMove,
}: BoardRendererProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  // Build visible tiles lookup
  const visibleTileMap = useMemo(() => {
    const map = new Map<string, WorldTile>();
    for (const tu of visibleTiles) {
      map.set(`${tu.x},${tu.y}`, tu.tile);
    }
    return map;
  }, [visibleTiles]);

  // Build player position lookup
  const playerMap = useMemo(() => {
    const map = new Map<string, MCVisiblePlayer>();
    for (const p of visiblePlayers) {
      map.set(`${p.x},${p.y}`, p);
    }
    return map;
  }, [visiblePlayers]);

  // Build mob position lookup
  const mobMap = useMemo(() => {
    const map = new Map<string, MCMobState>();
    for (const m of visibleMobs) {
      map.set(`${m.x},${m.y}`, m);
    }
    return map;
  }, [visibleMobs]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); onMove('up'); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); onMove('down'); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); onMove('left'); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); onMove('right'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove]);

  // Night overlay opacity
  const nightOpacity = useMemo(() => {
    switch (dayPhase) {
      case 'night': return 0.4;
      case 'dusk': return 0.2;
      case 'dawn': return 0.15;
      default: return 0;
    }
  }, [dayPhase]);

  // Generate grid cells
  const gridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    const cx = selfState.x;
    const cy = selfState.y;

    for (let vy = 0; vy < VIEWPORT; vy++) {
      for (let vx = 0; vx < VIEWPORT; vx++) {
        const wx = cx - HALF_VP + vx;
        const wy = cy - HALF_VP + vy;
        const key = `${wx},${wy}`;

        // Out of world bounds
        if (wx < 0 || wx >= MC_BOARD_CONFIG.WORLD_SIZE || wy < 0 || wy >= MC_BOARD_CONFIG.WORLD_SIZE) {
          cells.push(
            <div key={`${vx}-${vy}`} className={styles.tile} style={{ backgroundColor: '#111' }} />
          );
          continue;
        }

        // Check if tile is in current vision
        const visibleTile = visibleTileMap.get(key);
        const exploredTile = exploredTilesRef.current.get(key);
        const tile = visibleTile || exploredTile;
        const isVisible = !!visibleTile;
        const isExplored = !!exploredTile;

        // Player on this tile
        const playerOnTile = playerMap.get(key);
        const mobOnTile = mobMap.get(key);

        // Mining indicator
        const isMining = selfState.mining &&
          selfState.mining.x === wx && selfState.mining.y === wy;

        if (!tile) {
          // Unexplored - black
          cells.push(
            <div key={`${vx}-${vy}`} className={styles.tile} style={{ backgroundColor: '#0a0a0a' }} />
          );
          continue;
        }

        const blockColor = BLOCK_COLORS[tile.block] || '#333';
        const blockIcon = BLOCK_ICONS[tile.block];
        const isWalkable = BLOCK_PROPERTIES[tile.block].walkable;

        cells.push(
          <div
            key={`${vx}-${vy}`}
            className={`${styles.tile} ${isVisible ? '' : styles.tileFog} ${isMining ? styles.tileMining : ''}`}
            style={{ backgroundColor: blockColor }}
            onClick={() => {
              if (mobOnTile && mobOnTile.hostile) {
                onMobClick(mobOnTile.id);
              } else if (playerOnTile && playerOnTile.id !== playerId) {
                onPlayerClick(playerOnTile.id);
              } else {
                onTileClick(wx, wy);
              }
            }}
            title={`${tile.block} (${wx}, ${wy})${tile.biome !== 'plains' ? ` [${tile.biome}]` : ''}`}
          >
            {/* Block icon */}
            {blockIcon && isVisible && (
              <span className={styles.tileIcon}>{blockIcon}</span>
            )}

            {/* Mining progress bar */}
            {isMining && selfState.mining && (
              <div className={styles.miningBar}>
                <div
                  className={styles.miningProgress}
                  style={{ width: `${(selfState.mining.progress / selfState.mining.total) * 100}%` }}
                />
              </div>
            )}

            {/* Mob on tile */}
            {mobOnTile && isVisible && (
              <div
                className={`${styles.entity} ${mobOnTile.hostile ? styles.entityHostile : styles.entityPassive}`}
                style={{ backgroundColor: MOB_COLORS[mobOnTile.type] }}
                title={`${mobOnTile.type} HP:${mobOnTile.health}/${mobOnTile.maxHealth}`}
              >
                <span className={styles.entityIcon}>{MOB_ICONS[mobOnTile.type]}</span>
                <div className={styles.entityHealthBar}>
                  <div
                    className={styles.entityHealth}
                    style={{ width: `${(mobOnTile.health / mobOnTile.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Player on tile */}
            {playerOnTile && isVisible && !playerOnTile.dead && (
              <div
                className={`${styles.entity} ${styles.entityPlayer}`}
                style={{ borderColor: playerOnTile.color }}
              >
                <span
                  className={styles.playerDot}
                  style={{ backgroundColor: playerOnTile.color }}
                />
                <span className={styles.playerName}>
                  {playerOnTile.id === playerId ? 'You' : playerOnTile.name.slice(0, 3)}
                </span>
                {playerOnTile.id !== playerId && (
                  <div className={styles.entityHealthBar}>
                    <div
                      className={styles.entityHealth}
                      style={{
                        width: `${(playerOnTile.health / playerOnTile.maxHealth) * 100}%`,
                        backgroundColor: playerOnTile.color,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Dead player marker */}
            {playerOnTile && isVisible && playerOnTile.dead && (
              <div className={`${styles.entity} ${styles.entityDead}`}>
                <span className={styles.entityIcon}>x</span>
              </div>
            )}

            {/* Not walkable indicator for explored non-visible tiles */}
            {!isVisible && isExplored && !isWalkable && tile.block !== 'water' && tile.block !== 'deep_water' && (
              <span className={styles.tileIconDim}>{blockIcon || ''}</span>
            )}
          </div>
        );
      }
    }

    return cells;
  }, [visibleTileMap, exploredTilesRef, playerMap, mobMap, selfState, playerId, onTileClick, onMobClick, onPlayerClick]);

  // Mobile touch controls
  const handleTouchMove = useCallback((dir: Direction) => {
    onMove(dir);
  }, [onMove]);

  return (
    <div className={styles.boardWrapper}>
      <div
        ref={boardRef}
        className={styles.board}
        style={{
          gridTemplateColumns: `repeat(${VIEWPORT}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${VIEWPORT}, ${TILE_SIZE}px)`,
        }}
      >
        {gridCells}

        {/* Night overlay */}
        {nightOpacity > 0 && (
          <div className={styles.nightOverlay} style={{ opacity: nightOpacity }} />
        )}
      </div>

      {/* Coordinates display */}
      <div className={styles.coordsDisplay}>
        X: {selfState.x} Y: {selfState.y} | {dayPhase.toUpperCase()}
      </div>

      {/* Mobile D-pad */}
      <div className={styles.dpad}>
        <button className={`${styles.dpadBtn} ${styles.dpadUp}`} onClick={() => handleTouchMove('up')}>W</button>
        <button className={`${styles.dpadBtn} ${styles.dpadLeft}`} onClick={() => handleTouchMove('left')}>A</button>
        <button className={`${styles.dpadBtn} ${styles.dpadDown}`} onClick={() => handleTouchMove('down')}>S</button>
        <button className={`${styles.dpadBtn} ${styles.dpadRight}`} onClick={() => handleTouchMove('right')}>D</button>
      </div>
    </div>
  );
}
