'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { GameModeLocation, GameModeStatus } from '@/data/gamemode-map';
import {
  GAMEMODE_LOCATIONS, GAMEMODE_PATHS, GAMEMODE_TERRAIN,
  GAMEMODE_MAP_WIDTH, GAMEMODE_MAP_HEIGHT,
  getGameModeStatus,
} from '@/data/gamemode-map';
import styles from './gameModeMap.module.css';

// Isometric tile dimensions
const TILE_W = 32;
const TILE_H = 16;
const ELEVATION_H = 6;

// Convert grid coords to isometric screen position
function toIso(gx: number, gy: number, elevation = 0): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2) - elevation * ELEVATION_H,
  };
}

// Terrain tile colors (warm Dungeons palette)
const TERRAIN_COLORS: Record<string, string> = {
  grass: '#5a8f3c',
  dirt: '#8B6914',
  stone: '#7a7a7a',
  water: '#3a7fbf',
  sand: '#d4b96a',
  snow: '#e8e8f0',
  lava: '#e84820',
  void: '#0a0812',
  path: '#c4a050',
  bridge: '#9e7a3a',
  tree: '#2d6e2d',
  flower: '#d85a8a',
  rock: '#6a6a6a',
  mushroom: '#b04040',
};

const TERRAIN_DARK: Record<string, string> = {
  grass: '#4a7a30',
  dirt: '#7a5a10',
  stone: '#5a5a5a',
  water: '#2a5f9f',
  sand: '#c4a85a',
  snow: '#d0d0e0',
  lava: '#c03010',
  void: '#060410',
  path: '#b49040',
  bridge: '#8e6a2a',
  tree: '#1a5a1a',
  flower: '#4a7a30',
  rock: '#505050',
  mushroom: '#4a7a30',
};

interface GameModeMapProps {
  isArenaLocked: boolean;
  unlockedCount: number;
  requiredAdvancements: number;
  onlineCount: number;
  onSelectMode: (action: string) => void;
  locale: string;
}

export default function GameModeMap({
  isArenaLocked,
  unlockedCount,
  requiredAdvancements,
  onlineCount,
  onSelectMode,
  locale,
}: GameModeMapProps) {
  const t = useTranslations();
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Compute location statuses
  const locationStatuses = useMemo(() => {
    const statuses: Record<string, GameModeStatus> = {};
    for (const loc of GAMEMODE_LOCATIONS) {
      statuses[loc.id] = getGameModeStatus(loc.id, unlockedCount);
    }
    return statuses;
  }, [unlockedCount]);

  // Render terrain tiles
  const terrainElements = useMemo(() => {
    return GAMEMODE_TERRAIN.map((tile) => {
      const pos = toIso(tile.x, tile.y, tile.elevation);
      const color = TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.grass;
      const darkColor = TERRAIN_DARK[tile.terrain] || TERRAIN_DARK.grass;

      const topY = -TILE_H / 2;
      const bottomY = TILE_H / 2;
      const leftX = -TILE_W / 2;
      const rightX = TILE_W / 2;

      const elevationOffset = tile.elevation * ELEVATION_H;

      return (
        <g
          key={`${tile.x}-${tile.y}`}
          transform={`translate(${pos.x}, ${pos.y})`}
        >
          {/* Left face (elevation) */}
          {tile.elevation > 0 && (
            <polygon
              points={`${leftX},0 0,${bottomY} 0,${bottomY + elevationOffset} ${leftX},${elevationOffset}`}
              fill={darkColor}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.5"
            />
          )}
          {/* Right face (elevation) */}
          {tile.elevation > 0 && (
            <polygon
              points={`${rightX},0 0,${bottomY} 0,${bottomY + elevationOffset} ${rightX},${elevationOffset}`}
              fill={darkColor}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.5"
              opacity="0.85"
            />
          )}
          {/* Top face (main surface) */}
          <polygon
            points={`0,${topY} ${rightX},0 0,${bottomY} ${leftX},0`}
            fill={color}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="0.5"
          />
          {/* Tree decoration */}
          {tile.terrain === 'tree' && (
            <>
              <polygon
                points="0,-14 6,-4 -6,-4"
                fill="#1a5e1a"
                stroke="#0a3e0a"
                strokeWidth="0.5"
              />
              <polygon
                points="0,-20 5,-10 -5,-10"
                fill="#2a7a2a"
                stroke="#0a3e0a"
                strokeWidth="0.5"
              />
              <rect x="-1" y="-4" width="2" height="4" fill="#6a4420" />
            </>
          )}
          {/* Flower decoration */}
          {tile.terrain === 'flower' && (
            <circle cx="0" cy="-2" r="2" fill="#e85a8a" />
          )}
          {/* Mushroom decoration */}
          {tile.terrain === 'mushroom' && (
            <>
              <rect x="-1" y="-3" width="2" height="3" fill="#e8dac0" />
              <ellipse cx="0" cy="-4" rx="3" ry="2" fill="#c04040" />
            </>
          )}
          {/* Water shimmer */}
          {tile.terrain === 'water' && (
            <polygon
              points={`0,${topY} ${rightX},0 0,${bottomY} ${leftX},0`}
              fill="rgba(100,200,255,0.2)"
              className={styles.waterShimmer}
            />
          )}
          {/* Bridge planks */}
          {tile.terrain === 'bridge' && (
            <>
              <line x1="-6" y1="-2" x2="6" y2="-2" stroke="#6a4420" strokeWidth="2" />
              <line x1="-6" y1="2" x2="6" y2="2" stroke="#6a4420" strokeWidth="2" />
            </>
          )}
        </g>
      );
    });
  }, []);

  // Render paths between locations
  const pathElements = useMemo(() => {
    return GAMEMODE_PATHS.map((path) => {
      const toStatus = locationStatuses[path.to];
      const isLocked = toStatus === 'locked';

      const points = path.waypoints.map(wp => {
        const pos = toIso(wp.x, wp.y);
        return `${pos.x},${pos.y}`;
      }).join(' ');

      return (
        <polyline
          key={`${path.from}-${path.to}`}
          points={points}
          fill="none"
          stroke={isLocked ? 'rgba(255,255,255,0.08)' : '#FFD700'}
          strokeWidth={isLocked ? 2 : 3}
          strokeDasharray={isLocked ? '4 4' : '6 3'}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={!isLocked ? styles.activePath : undefined}
          opacity={isLocked ? 0.4 : 0.7}
        />
      );
    });
  }, [locationStatuses]);

  // Render location markers
  const locationElements = useMemo(() => {
    return GAMEMODE_LOCATIONS.map((location) => {
      const pos = toIso(location.mapX, location.mapY);
      const status = locationStatuses[location.id];
      const isHovered = hoveredLocation === location.id;
      const name = locale === 'en' ? location.nameEn : location.name;

      return (
        <g
          key={location.id}
          transform={`translate(${pos.x}, ${pos.y})`}
          className={`${styles.locationNode} ${styles[`status_${status}`]}`}
          onClick={() => {
            if (status !== 'locked' && location.action !== 'hub') {
              onSelectMode(location.action);
            }
          }}
          onMouseEnter={() => {
            if (location.action !== 'hub') setHoveredLocation(location.id);
          }}
          onMouseLeave={() => setHoveredLocation(null)}
          style={{ cursor: status === 'locked' ? 'not-allowed' : location.action === 'hub' ? 'default' : 'pointer' }}
        >
          {/* Outer glow ring */}
          <circle
            cx="0"
            cy="-4"
            r={isHovered ? 22 : 18}
            fill="none"
            stroke={
              status === 'completed' ? '#8B6914'
                : status === 'available' ? location.accentColor
                  : 'rgba(255,255,255,0.08)'
            }
            strokeWidth={isHovered ? 2.5 : 1.5}
            opacity={status === 'locked' ? 0.2 : 0.7}
            className={status === 'available' ? styles.pulseRing : undefined}
          />
          {/* Base platform diamond */}
          <polygon
            points="0,-14 16,-4 0,6 -16,-4"
            fill={status === 'locked' ? '#2a2a3a' : location.accentColor}
            stroke={status === 'locked' ? '#3a3a4a' : 'rgba(255,255,255,0.25)'}
            strokeWidth="1"
            opacity={status === 'locked' ? 0.4 : 0.9}
          />
          {/* Platform highlight */}
          {status !== 'locked' && (
            <polygon
              points="0,-14 16,-4 0,-2 -16,-4"
              fill="rgba(255,255,255,0.12)"
            />
          )}
          {/* Icon */}
          <text
            x="0"
            y="-1"
            textAnchor="middle"
            fontSize="16"
            style={{ pointerEvents: 'none' }}
            opacity={status === 'locked' ? 0.25 : 1}
          >
            {status === 'locked' ? '🔒' : location.icon}
          </text>
          {/* Completion checkmark for hub */}
          {status === 'completed' && location.action === 'hub' && (
            <g transform="translate(12, -18)">
              <circle cx="0" cy="0" r="5" fill="#8B6914" />
              <polyline
                points="-2,0 -1,2 3,-2"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}
          {/* Label */}
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fill={status === 'locked' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)'}
            fontSize="7"
            fontFamily="'Press Start 2P', 'VT323', monospace"
            letterSpacing="1"
            style={{ pointerEvents: 'none', textTransform: 'uppercase' }}
          >
            {name}
          </text>
          {/* Online count badge for multiplayer locations */}
          {(location.action === 'multiplayer' || location.action === 'arena') && onlineCount > 0 && status !== 'locked' && (
            <g transform="translate(18, -18)" className={styles.onlineBadge}>
              <rect
                x="-14"
                y="-7"
                width="28"
                height="14"
                rx="3"
                fill="rgba(10,8,20,0.85)"
                stroke="rgba(76,175,80,0.4)"
                strokeWidth="0.5"
              />
              <circle cx="-8" cy="0" r="2" fill="#4CAF50" opacity="0.8" />
              <text
                x="2"
                y="3"
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="7"
                fontFamily="'VT323', monospace"
              >
                {onlineCount}
              </text>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses, hoveredLocation, locale, onSelectMode, onlineCount]);

  // Get hovered location for info panel
  const hoveredLoc = hoveredLocation
    ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation)
    : null;

  return (
    <motion.div
      className={styles.mapWrapper}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Ambient glow */}
      <div className={styles.mapGlow} />
      <div className={styles.scanlines} />

      {/* Isometric map SVG */}
      <svg
        className={styles.mapSvg}
        viewBox={`${-GAMEMODE_MAP_WIDTH * TILE_W / 2 - 40} ${-30} ${GAMEMODE_MAP_WIDTH * TILE_W + 80} ${GAMEMODE_MAP_HEIGHT * TILE_H + 60}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Terrain tiles */}
        <g className={styles.terrainLayer}>
          {terrainElements}
        </g>

        {/* Paths between locations */}
        <g className={styles.pathLayer}>
          {pathElements}
        </g>

        {/* Location markers */}
        <g className={styles.locationLayer}>
          {locationElements}
        </g>
      </svg>

      {/* Bottom info panel */}
      {hoveredLoc && (() => {
        const status = locationStatuses[hoveredLoc.id];
        const name = locale === 'en' ? hoveredLoc.nameEn : hoveredLoc.name;
        const desc = locale === 'en' ? hoveredLoc.descriptionEn : hoveredLoc.description;

        return (
          <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
              <span className={styles.infoIcon}>{hoveredLoc.icon}</span>
              <span className={styles.infoName}>{name}</span>
            </div>
            <div className={styles.infoDesc}>{desc}</div>

            {/* Feature tags */}
            {hoveredLoc.features.length > 0 && (
              <div className={styles.infoFeatures}>
                {hoveredLoc.features.map((f, i) => (
                  <span key={i} className={styles.infoFeatureTag}>
                    {locale === 'en' ? f.labelEn : f.label}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            {hoveredLoc.stats.length > 0 && (
              <div className={styles.infoStats}>
                {hoveredLoc.stats.map((s, i) => (
                  <div key={i} className={styles.infoStatItem}>
                    <div className={styles.infoStatValue}>{s.value}</div>
                    <div className={styles.infoStatLabel}>
                      {locale === 'en' ? s.labelEn : s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Locked indicator */}
            {status === 'locked' && (
              <div className={styles.infoLocked}>
                <svg className={styles.infoLockedIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className={styles.infoLockedText}>
                  {t('advancements.lockMessage', {
                    current: unlockedCount,
                    required: requiredAdvancements,
                  })}
                </span>
              </div>
            )}

            {/* Play hint */}
            {status === 'available' && (
              <div className={styles.infoHint}>
                {locale === 'en' ? '▶ Click to play' : '▶ クリックでプレイ'}
              </div>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
}
