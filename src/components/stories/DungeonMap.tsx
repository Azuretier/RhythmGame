'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import type { DungeonLocation, DungeonProgress, LocationStatus, MapTile, MapPath } from '@/data/stories/dungeons';
import {
  DUNGEON_LOCATIONS, MAP_PATHS, MAP_TERRAIN,
  MAP_WIDTH, MAP_HEIGHT, getLocationStatus,
} from '@/data/stories/dungeons';
import styles from './dungeonMap.module.css';

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

// Terrain tile colors (pixel-art palette)
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

interface DungeonMapProps {
  progress: DungeonProgress;
  onSelectLocation: (location: DungeonLocation) => void;
  onBack: () => void;
}

export default function DungeonMap({ progress, onSelectLocation, onBack }: DungeonMapProps) {
  const locale = useLocale();
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Compute location statuses
  const locationStatuses = useMemo(() => {
    const statuses: Record<string, LocationStatus> = {};
    for (const loc of DUNGEON_LOCATIONS) {
      statuses[loc.id] = getLocationStatus(loc.id, progress);
    }
    return statuses;
  }, [progress]);

  // Center of the isometric map
  const mapCenter = useMemo(() => {
    const c = toIso(MAP_WIDTH / 2, MAP_HEIGHT / 2);
    return { x: c.x, y: c.y };
  }, []);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.locationNode}`)) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y });
  }, [cameraOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setCameraOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch drag for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.locationNode}`)) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cameraOffset.x, y: touch.clientY - cameraOffset.y });
  }, [cameraOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setCameraOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  // Render terrain tiles
  const terrainElements = useMemo(() => {
    return MAP_TERRAIN.map((tile) => {
      const pos = toIso(tile.x, tile.y, tile.elevation);
      const color = TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.grass;
      const darkColor = TERRAIN_DARK[tile.terrain] || TERRAIN_DARK.grass;

      // Isometric diamond shape points
      const topY = -TILE_H / 2;
      const bottomY = TILE_H / 2;
      const leftX = -TILE_W / 2;
      const rightX = TILE_W / 2;

      // For elevated tiles, render side faces
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
    return MAP_PATHS.map((path) => {
      const fromStatus = locationStatuses[path.from];
      const toStatus = locationStatuses[path.to];
      const isActive = fromStatus === 'completed' || toStatus === 'completed';
      const isLocked = toStatus === 'locked' && fromStatus !== 'completed';

      const points = path.waypoints.map(wp => {
        const pos = toIso(wp.x, wp.y);
        return `${pos.x},${pos.y}`;
      }).join(' ');

      return (
        <polyline
          key={`${path.from}-${path.to}`}
          points={points}
          fill="none"
          stroke={isLocked ? 'rgba(255,255,255,0.1)' : isActive ? '#FFD700' : 'rgba(255,215,0,0.3)'}
          strokeWidth={isActive ? 3 : 2}
          strokeDasharray={isLocked ? '4 4' : isActive ? 'none' : '6 3'}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isActive ? styles.activePath : ''}
        />
      );
    });
  }, [locationStatuses]);

  // Render location markers
  const locationElements = useMemo(() => {
    return DUNGEON_LOCATIONS.map((location) => {
      const pos = toIso(location.mapX, location.mapY);
      const status = locationStatuses[location.id];
      const isHovered = hoveredLocation === location.id;
      const name = locale === 'en' ? location.nameEn : location.name;
      const desc = locale === 'en' ? location.descriptionEn : location.description;

      return (
        <g
          key={location.id}
          transform={`translate(${pos.x}, ${pos.y})`}
          className={`${styles.locationNode} ${styles[`status_${status}`]}`}
          onClick={() => {
            if (status !== 'locked') onSelectLocation(location);
          }}
          onMouseEnter={() => setHoveredLocation(location.id)}
          onMouseLeave={() => setHoveredLocation(null)}
          style={{ cursor: status === 'locked' ? 'not-allowed' : 'pointer' }}
        >
          {/* Glow ring */}
          <circle
            cx="0"
            cy="-4"
            r={isHovered ? 20 : 16}
            fill="none"
            stroke={status === 'completed' ? '#4CAF50' : status === 'available' ? location.accentColor : 'rgba(255,255,255,0.1)'}
            strokeWidth={isHovered ? 2.5 : 1.5}
            opacity={status === 'locked' ? 0.3 : 0.8}
            className={status === 'available' ? styles.pulseRing : ''}
          />
          {/* Base platform */}
          <polygon
            points="0,-12 14,-4 0,4 -14,-4"
            fill={status === 'locked' ? '#2a2a3a' : location.accentColor}
            stroke={status === 'locked' ? '#3a3a4a' : 'rgba(255,255,255,0.3)'}
            strokeWidth="1"
            opacity={status === 'locked' ? 0.5 : 1}
          />
          {/* Icon */}
          <text
            x="0"
            y="-2"
            textAnchor="middle"
            fontSize="14"
            style={{ pointerEvents: 'none' }}
            opacity={status === 'locked' ? 0.3 : 1}
          >
            {status === 'locked' ? '🔒' : location.icon}
          </text>
          {/* Completion checkmark */}
          {status === 'completed' && (
            <g transform="translate(10, -16)">
              <circle cx="0" cy="0" r="5" fill="#4CAF50" />
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
            y="16"
            textAnchor="middle"
            fill={status === 'locked' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)'}
            fontSize="8"
            fontFamily="'Press Start 2P', monospace"
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>
          {/* Difficulty stars */}
          {location.difficulty > 0 && (
            <text
              x="0"
              y="26"
              textAnchor="middle"
              fill={status === 'locked' ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.7)'}
              fontSize="6"
              style={{ pointerEvents: 'none' }}
            >
              {'★'.repeat(location.difficulty)}{'☆'.repeat(5 - location.difficulty)}
            </text>
          )}

          {/* Hover tooltip */}
          {isHovered && status !== 'locked' && (
            <g transform="translate(0, -36)">
              <rect
                x="-80"
                y="-24"
                width="160"
                height="20"
                rx="3"
                fill="rgba(10,8,20,0.9)"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-12"
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="6"
                fontFamily="'VT323', monospace"
              >
                {desc.length > 35 ? desc.slice(0, 35) + '...' : desc}
              </text>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses, hoveredLocation, locale, onSelectLocation]);

  return (
    <div
      className={styles.mapContainer}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Background gradient */}
      <div className={styles.mapBg} />
      <div className={styles.scanlines} />

      {/* Map title */}
      <div className={styles.mapHeader}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.mapTitle}>MISSION SELECT</h1>
        <div className={styles.mapStats}>
          <span className={styles.statBadge}>
            💎 {progress.totalEmeralds}
          </span>
          <span className={styles.statBadge}>
            ⚔️ {progress.totalDefeated}
          </span>
        </div>
      </div>

      {/* Isometric map SVG */}
      <svg
        className={styles.mapSvg}
        viewBox={`${-MAP_WIDTH * TILE_W / 2 - 60} ${-40} ${MAP_WIDTH * TILE_W + 120} ${MAP_HEIGHT * TILE_H + 100}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
        }}
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
      {hoveredLocation && (
        <div className={styles.infoPanel}>
          {(() => {
            const loc = DUNGEON_LOCATIONS.find(l => l.id === hoveredLocation);
            if (!loc) return null;
            const status = locationStatuses[loc.id];
            const name = locale === 'en' ? loc.nameEn : loc.name;
            const desc = locale === 'en' ? loc.descriptionEn : loc.description;
            return (
              <>
                <div className={styles.infoPanelHeader}>
                  <span className={styles.infoIcon}>{loc.icon}</span>
                  <span className={styles.infoName}>{name}</span>
                  {status === 'completed' && <span className={styles.infoComplete}>CLEARED</span>}
                </div>
                <div className={styles.infoDesc}>{desc}</div>
                {loc.difficulty > 0 && (
                  <div className={styles.infoMeta}>
                    <span>{'★'.repeat(loc.difficulty)}{'☆'.repeat(5 - loc.difficulty)}</span>
                    <span>~{loc.estimatedMinutes}min</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
