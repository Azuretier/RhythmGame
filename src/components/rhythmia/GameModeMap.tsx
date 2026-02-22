'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { GameModeLocation, GameModeStatus } from '@/data/gamemode-map';
import {
  GAMEMODE_LOCATIONS, GAMEMODE_PATHS,
  getGameModeStatus,
} from '@/data/gamemode-map';
import styles from './gameModeMap.module.css';

// SVG viewBox dimensions for the flat 2D map
const MAP_W = 600;
const MAP_H = 400;

// Map grid → screen position (flat 2D)
function toScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx / 16) * MAP_W,
    y: (gy / 12) * MAP_H,
  };
}

// Build smooth curved path between two points via waypoints
function buildCurvedPath(waypoints: { x: number; y: number }[]): string {
  if (waypoints.length < 2) return '';
  const pts = waypoints.map(wp => toScreen(wp.x, wp.y));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
    const cpy2 = curr.y;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }
  return d;
}

// SVG icons for each game mode (clean line icons)
function ModeIcon({ action, size = 20 }: { action: string; size?: number }) {
  const s = size;
  const half = s / 2;
  const stroke = 'currentColor';
  const sw = 1.5;

  switch (action) {
    case 'hub':
      return (
        <g>
          <path d={`M${half} ${s * 0.2} L${s * 0.85} ${half} L${s * 0.85} ${s * 0.85} L${s * 0.15} ${s * 0.85} L${s * 0.15} ${half} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d={`M${s * 0.38} ${s * 0.85} L${s * 0.38} ${s * 0.6} L${s * 0.62} ${s * 0.6} L${s * 0.62} ${s * 0.85}`} fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'vanilla':
      return (
        <g>
          <circle cx={half} cy={half} r={s * 0.3} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d={`M${half} ${s * 0.25} L${half} ${half} L${s * 0.65} ${s * 0.4}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {/* music notes */}
          <circle cx={s * 0.72} cy={s * 0.28} r={2} fill={stroke} />
          <line x1={s * 0.74} y1={s * 0.28} x2={s * 0.74} y2={s * 0.14} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'multiplayer':
      return (
        <g>
          <path d={`M${s * 0.3} ${s * 0.25} L${half} ${s * 0.45} L${s * 0.7} ${s * 0.25}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${s * 0.3} ${s * 0.75} L${half} ${s * 0.55} L${s * 0.7} ${s * 0.75}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={s * 0.2} y1={s * 0.35} x2={s * 0.8} y2={s * 0.65} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={s * 0.8} y1={s * 0.35} x2={s * 0.2} y2={s * 0.65} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case 'arena':
      return (
        <g>
          <circle cx={half} cy={half} r={s * 0.35} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={half} cy={half} r={s * 0.18} fill="none" stroke={stroke} strokeWidth={sw * 0.8} />
          <circle cx={half} cy={half} r={2} fill={stroke} />
        </g>
      );
    case 'stories':
      return (
        <g>
          <path d={`M${s * 0.25} ${s * 0.2} L${s * 0.25} ${s * 0.8} L${half} ${s * 0.7} L${s * 0.75} ${s * 0.8} L${s * 0.75} ${s * 0.2} L${half} ${s * 0.3} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <line x1={half} y1={s * 0.3} x2={half} y2={s * 0.7} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    default:
      return <circle cx={half} cy={half} r={s * 0.3} fill="none" stroke={stroke} strokeWidth={sw} />;
  }
}

// Biome region definitions — abstract shapes for each map quadrant
const BIOME_REGIONS = [
  // Forest (top-left — solo/rhythmia)
  {
    id: 'forest',
    path: 'M 20,10 Q 80,0 180,30 Q 220,50 200,120 Q 180,170 120,160 Q 40,140 10,100 Q -5,60 20,10 Z',
    fill: 'url(#biomeForest)',
    opacity: 0.4,
  },
  // Mountain (top-right — battle)
  {
    id: 'mountain',
    path: 'M 380,5 Q 450,0 560,20 Q 600,40 590,130 Q 575,170 500,155 Q 420,140 370,100 Q 350,60 380,5 Z',
    fill: 'url(#biomeMountain)',
    opacity: 0.35,
  },
  // Village (bottom-right — arena)
  {
    id: 'village',
    path: 'M 400,260 Q 470,240 570,265 Q 605,290 595,360 Q 580,400 500,395 Q 420,390 385,350 Q 360,310 400,260 Z',
    fill: 'url(#biomeVillage)',
    opacity: 0.35,
  },
  // Cave (bottom-left — stories)
  {
    id: 'cave',
    path: 'M 30,260 Q 90,240 190,260 Q 230,290 215,350 Q 195,400 120,395 Q 40,385 15,340 Q -5,300 30,260 Z',
    fill: 'url(#biomeCave)',
    opacity: 0.35,
  },
  // Central river
  {
    id: 'river',
    path: 'M 275,0 Q 290,60 295,120 Q 300,160 295,200 Q 290,240 285,300 Q 280,360 275,400',
    fill: 'none',
    opacity: 0.5,
    isRiver: true,
  },
];

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

  const locationStatuses = useMemo(() => {
    const statuses: Record<string, GameModeStatus> = {};
    for (const loc of GAMEMODE_LOCATIONS) {
      statuses[loc.id] = getGameModeStatus(loc.id, unlockedCount);
    }
    return statuses;
  }, [unlockedCount]);

  const handleLocationClick = useCallback((location: GameModeLocation, status: GameModeStatus) => {
    if (status !== 'locked' && location.action !== 'hub') {
      onSelectMode(location.action);
    }
  }, [onSelectMode]);

  // Render biome regions
  const biomeElements = useMemo(() => {
    return BIOME_REGIONS.map((region) => {
      if (region.isRiver) {
        return (
          <path
            key={region.id}
            d={region.path}
            fill="none"
            stroke="url(#riverGradient)"
            strokeWidth="24"
            opacity={region.opacity}
            strokeLinecap="round"
          />
        );
      }
      return (
        <path
          key={region.id}
          d={region.path}
          fill={region.fill}
          opacity={region.opacity}
          className={styles.biomeRegion}
        />
      );
    });
  }, []);

  // Render path connections
  const pathElements = useMemo(() => {
    return GAMEMODE_PATHS.map((path) => {
      const toStatus = locationStatuses[path.to];
      const isLocked = toStatus === 'locked';
      const d = buildCurvedPath(path.waypoints);

      return (
        <g key={`${path.from}-${path.to}`}>
          {/* Glow behind path */}
          {!isLocked && (
            <path
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="12"
              strokeLinecap="round"
            />
          )}
          {/* Main path */}
          <path
            d={d}
            fill="none"
            stroke={isLocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.2)'}
            strokeWidth={isLocked ? 2 : 2.5}
            strokeDasharray={isLocked ? '6 8' : '4 6'}
            strokeLinecap="round"
            className={!isLocked ? styles.pathAnimated : undefined}
          />
          {/* Animated dots on active paths */}
          {!isLocked && (
            <circle r="3" fill="rgba(255,255,255,0.5)" className={styles.pathDot}>
              <animateMotion dur="3s" repeatCount="indefinite" path={d} />
            </circle>
          )}
        </g>
      );
    });
  }, [locationStatuses]);

  // Render location nodes
  const locationElements = useMemo(() => {
    return GAMEMODE_LOCATIONS.map((location) => {
      const pos = toScreen(location.mapX, location.mapY);
      const status = locationStatuses[location.id];
      const isHovered = hoveredLocation === location.id;
      const name = locale === 'en' ? location.nameEn : location.name;
      const nodeRadius = 24;

      return (
        <g
          key={location.id}
          transform={`translate(${pos.x}, ${pos.y})`}
          className={`${styles.locationNode} ${styles[`status_${status}`]}`}
          onClick={() => handleLocationClick(location, status)}
          onMouseEnter={() => {
            if (location.action !== 'hub') setHoveredLocation(location.id);
          }}
          onMouseLeave={() => setHoveredLocation(null)}
          style={{ cursor: status === 'locked' ? 'not-allowed' : location.action === 'hub' ? 'default' : 'pointer' }}
        >
          {/* Outer ambient ring */}
          {status !== 'locked' && (
            <circle
              cx="0"
              cy="0"
              r={isHovered ? 38 : 34}
              fill="none"
              stroke={location.accentColor}
              strokeWidth="1"
              opacity={isHovered ? 0.4 : 0.15}
              className={status === 'available' ? styles.pulseRing : undefined}
            />
          )}

          {/* Background glow */}
          {status !== 'locked' && (
            <circle
              cx="0"
              cy="0"
              r={nodeRadius + 8}
              fill={location.accentColor}
              opacity={isHovered ? 0.15 : 0.06}
              className={styles.nodeGlow}
            />
          )}

          {/* Main node circle */}
          <circle
            cx="0"
            cy="0"
            r={nodeRadius}
            fill={status === 'locked' ? 'rgba(30,30,45,0.8)' : 'rgba(20,20,35,0.85)'}
            stroke={
              status === 'locked'
                ? 'rgba(255,255,255,0.06)'
                : isHovered
                  ? location.accentColor
                  : 'rgba(255,255,255,0.12)'
            }
            strokeWidth={isHovered ? 2 : 1}
            className={styles.nodeCircle}
          />

          {/* Inner accent ring */}
          {status !== 'locked' && (
            <circle
              cx="0"
              cy="0"
              r={nodeRadius - 3}
              fill="none"
              stroke={location.accentColor}
              strokeWidth="0.5"
              opacity={isHovered ? 0.5 : 0.2}
            />
          )}

          {/* Icon */}
          <g
            transform={`translate(-10, -10)`}
            style={{
              color: status === 'locked'
                ? 'rgba(255,255,255,0.15)'
                : isHovered
                  ? location.accentColor
                  : 'rgba(255,255,255,0.7)',
              pointerEvents: 'none',
            }}
          >
            {status === 'locked' ? (
              // Lock icon
              <g>
                <rect x="6" y="10" width="8" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 10V7.5a2 2 0 0 1 4 0V10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </g>
            ) : (
              <ModeIcon action={location.action} />
            )}
          </g>

          {/* Label */}
          <text
            x="0"
            y={nodeRadius + 16}
            textAnchor="middle"
            fill={status === 'locked' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)'}
            fontSize="10"
            fontFamily="var(--font-theme-body, 'Inter'), sans-serif"
            fontWeight="500"
            letterSpacing="0.04em"
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>

          {/* Status indicator dot */}
          {status === 'completed' && location.action === 'hub' && (
            <circle cx={nodeRadius - 4} cy={-nodeRadius + 4} r="4" fill="#8B6914" stroke="rgba(20,20,35,0.85)" strokeWidth="1.5" />
          )}

          {/* Online count badge */}
          {(location.action === 'multiplayer' || location.action === 'arena') && onlineCount > 0 && status !== 'locked' && (
            <g transform={`translate(${nodeRadius - 2}, ${-nodeRadius + 2})`}>
              <rect
                x="-12"
                y="-8"
                width="24"
                height="16"
                rx="8"
                fill="rgba(10,10,20,0.9)"
                stroke="rgba(76,175,80,0.4)"
                strokeWidth="1"
              />
              <circle cx="-4" cy="0" r="2.5" fill="#4CAF50" className={styles.onlineDot} />
              <text
                x="5"
                y="3.5"
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize="9"
                fontFamily="var(--font-theme-mono, monospace)"
                fontWeight="600"
              >
                {onlineCount}
              </text>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses, hoveredLocation, locale, handleLocationClick, onlineCount]);

  // Get hovered location for info panel
  const hoveredLoc = hoveredLocation
    ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation)
    : null;

  return (
    <motion.div
      className={styles.mapWrapper}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Background effects */}
      <div className={styles.mapBg} />
      <div className={styles.gridOverlay} />
      <div className={styles.noiseOverlay} />

      {/* SVG Map */}
      <svg
        className={styles.mapSvg}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Biome gradients */}
          <radialGradient id="biomeForest" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="biomeMountain" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="biomeVillage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2196F3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2196F3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="biomeCave" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9C27B0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9C27B0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="riverGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#64B5F6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#42A5F5" stopOpacity="0.3" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Biome region shapes */}
        <g className={styles.biomeLayer}>
          {biomeElements}
        </g>

        {/* Decorative grid dots */}
        <g className={styles.gridDots}>
          {Array.from({ length: 15 }, (_, xi) =>
            Array.from({ length: 10 }, (_, yi) => {
              const x = 40 + xi * 36;
              const y = 40 + yi * 36;
              return (
                <circle
                  key={`dot-${xi}-${yi}`}
                  cx={x}
                  cy={y}
                  r="0.8"
                  fill="rgba(255,255,255,0.06)"
                />
              );
            })
          ).flat()}
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
      <AnimatePresence>
        {hoveredLoc && (() => {
          const status = locationStatuses[hoveredLoc.id];
          const name = locale === 'en' ? hoveredLoc.nameEn : hoveredLoc.name;
          const desc = locale === 'en' ? hoveredLoc.descriptionEn : hoveredLoc.description;

          return (
            <motion.div
              key={hoveredLoc.id}
              className={styles.infoPanel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Accent line */}
              <div
                className={styles.infoPanelAccent}
                style={{ background: hoveredLoc.accentColor }}
              />

              <div className={styles.infoPanelContent}>
                <div className={styles.infoPanelHeader}>
                  <div
                    className={styles.infoIconWrap}
                    style={{ color: hoveredLoc.accentColor }}
                  >
                    <ModeIcon action={hoveredLoc.action} size={16} />
                  </div>
                  <span className={styles.infoName}>{name}</span>
                  {status === 'available' && (
                    <span
                      className={styles.infoStatusBadge}
                      style={{ color: hoveredLoc.accentColor, borderColor: `${hoveredLoc.accentColor}33` }}
                    >
                      {locale === 'en' ? 'PLAY' : 'プレイ'}
                    </span>
                  )}
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
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
