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

// ─── Layout ───
const MAP_W = 700;
const MAP_H = 460;

function toScreen(gx: number, gy: number): { x: number; y: number } {
  return { x: (gx / 16) * MAP_W, y: (gy / 12) * MAP_H };
}

function buildCurvedPath(wps: { x: number; y: number }[]): string {
  if (wps.length < 2) return '';
  const pts = wps.map(w => toScreen(w.x, w.y));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const mx = (p.x + c.x) / 2;
    d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`;
  }
  return d;
}

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── Minecraft color palette (exact block colors) ───
const MC = {
  grassTop: '#5b8731',
  grassTopLight: '#7cbd39',
  grassSide: '#866043',
  dirt: '#a0713c',
  dirtDark: '#7a5230',
  stone: '#7d7d7d',
  stoneDark: '#5a5a5a',
  stoneLight: '#929292',
  cobble: '#828282',
  cobbleDark: '#636363',
  water: '#3f76e4',
  waterDark: '#2a5ad0',
  waterLight: '#5a9af0',
  sand: '#e3d59e',
  sandDark: '#c4b47a',
  oakPlanks: '#b4905a',
  oakPlanksLight: '#c8a46e',
  oakPlanksDark: '#8a6a3a',
  sprucePlanks: '#6b5430',
  sprucePlanksDark: '#4a3a20',
  log: '#6b4226',
  logDark: '#4b2e18',
  logLight: '#8a5a34',
  leaves: '#3ea63a',
  leavesDark: '#2d8a2b',
  leavesLight: '#55c050',
  snow: '#f0f0f0',
  snowDark: '#d8d8d8',
  lava: '#cf5b11',
  lavaBright: '#fc8820',
  obsidian: '#1a1028',
  gold: '#fcee4b',
  diamond: '#2de8d2',
  redstone: '#aa0000',
  nether: '#6b3636',
  netherDark: '#4a2020',
  iron: '#d8d8d8',
};

// ═══════════════════════════════════════════════
//  Low-poly geometric terrain pieces
// ═══════════════════════════════════════════════

/** Low-poly spruce/conifer tree — stacked pyramids on rectangular trunk */
function LPTree({ x, y, s = 1, variant = 0 }: { x: number; y: number; s?: number; variant?: number }) {
  const topCol = variant === 0 ? MC.leaves : MC.leavesDark;
  const midCol = variant === 0 ? MC.leavesDark : MC.leaves;
  const edgeCol = 'rgba(0,0,0,0.2)';
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* Shadow — flat polygon on ground */}
      <polygon points="-8,3 0,6 8,3 0,0" fill="rgba(0,0,0,0.18)" />
      {/* Trunk — rectangular prism faces */}
      <rect x="-2" y="-10" width="4" height="12" fill={MC.log} stroke={edgeCol} strokeWidth="0.5" />
      <rect x="-2" y="-10" width="2" height="12" fill={MC.logLight} stroke={edgeCol} strokeWidth="0.5" />
      {/* Bottom pyramid */}
      <polygon points="0,-16 -11,-6 11,-6" fill={midCol} stroke={edgeCol} strokeWidth="0.5" />
      <polygon points="0,-16 -11,-6 0,-6" fill={topCol} stroke={edgeCol} strokeWidth="0.5" />
      {/* Top pyramid */}
      <polygon points="0,-26 -8,-14 8,-14" fill={midCol} stroke={edgeCol} strokeWidth="0.5" />
      <polygon points="0,-26 -8,-14 0,-14" fill={topCol} stroke={edgeCol} strokeWidth="0.5" />
      {/* Peak */}
      <polygon points="0,-32 -5,-22 5,-22" fill={MC.leavesLight} stroke={edgeCol} strokeWidth="0.5" />
    </g>
  );
}

/** Low-poly oak tree — rectangular trunk + blocky cube canopy */
function LPOak({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const edgeCol = 'rgba(0,0,0,0.2)';
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <polygon points="-8,3 0,6 8,3 0,0" fill="rgba(0,0,0,0.15)" />
      {/* Trunk */}
      <rect x="-2.5" y="-14" width="5" height="16" fill={MC.log} stroke={edgeCol} strokeWidth="0.5" />
      <rect x="-2.5" y="-14" width="2.5" height="16" fill={MC.logLight} stroke={edgeCol} strokeWidth="0.5" />
      {/* Blocky canopy — cube front/top/side faces */}
      {/* Front face */}
      <rect x="-12" y="-32" width="24" height="20" fill={MC.leavesDark} stroke={edgeCol} strokeWidth="0.5" />
      {/* Top face (isometric) */}
      <polygon points="-12,-32 0,-38 12,-32 0,-26" fill={MC.leavesLight} stroke={edgeCol} strokeWidth="0.5" />
      {/* Left face */}
      <polygon points="-12,-32 -12,-12 -18,-18 -18,-38" fill={MC.leaves} stroke={edgeCol} strokeWidth="0.5" />
      {/* Highlight facet */}
      <polygon points="-4,-32 4,-35 12,-32 4,-29" fill="rgba(255,255,255,0.08)" />
    </g>
  );
}

/** Low-poly mountain — triangulated facets */
function LPMountain({ x, y, w = 80, h = 60, baseCol = MC.stone }: { x: number; y: number; w?: number; h?: number; baseCol?: string }) {
  const hw = w / 2;
  const edgeCol = 'rgba(0,0,0,0.15)';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Left face (lit) */}
      <polygon points={`0,${-h} ${-hw},0 ${-hw * 0.3},${-h * 0.3}`} fill={MC.stoneLight} stroke={edgeCol} strokeWidth="0.8" />
      <polygon points={`0,${-h} ${-hw * 0.3},${-h * 0.3} 0,0`} fill={baseCol} stroke={edgeCol} strokeWidth="0.8" />
      <polygon points={`${-hw},0 ${-hw * 0.3},${-h * 0.3} 0,0`} fill={MC.stoneDark} stroke={edgeCol} strokeWidth="0.8" />
      {/* Right face (shadow) */}
      <polygon points={`0,${-h} ${hw},0 ${hw * 0.35},${-h * 0.25}`} fill={MC.stoneDark} stroke={edgeCol} strokeWidth="0.8" />
      <polygon points={`0,${-h} ${hw * 0.35},${-h * 0.25} 0,0`} fill={baseCol} stroke={edgeCol} strokeWidth="0.8" />
      <polygon points={`${hw},0 ${hw * 0.35},${-h * 0.25} 0,0`} fill={MC.stoneDark} stroke={edgeCol} strokeWidth="0.8" opacity="0.8" />
      {/* Snow cap — flat facet */}
      <polygon points={`0,${-h} ${-hw * 0.2},${-h * 0.65} ${hw * 0.15},${-h * 0.6}`} fill={MC.snow} stroke={edgeCol} strokeWidth="0.5" />
    </g>
  );
}

/** Low-poly rock — faceted polyhedron */
function LPRock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const e = 'rgba(0,0,0,0.18)';
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <polygon points="-5,2 5,2 3,-1 -3,-1" fill="rgba(0,0,0,0.12)" />
      {/* Facets */}
      <polygon points="0,-6 -6,-1 -4,3 4,3 6,-1" fill={MC.cobble} stroke={e} strokeWidth="0.5" />
      <polygon points="0,-6 -6,-1 0,-1" fill={MC.stoneLight} stroke={e} strokeWidth="0.5" />
      <polygon points="0,-6 6,-1 0,-1" fill={MC.stoneDark} stroke={e} strokeWidth="0.5" />
    </g>
  );
}

/** Low-poly mushroom — Minecraft red mushroom */
function LPMushroom({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.15)';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Stem */}
      <rect x="-1.5" y="-6" width="3" height="7" fill="#e8dcc8" stroke={e} strokeWidth="0.4" />
      {/* Cap — faceted dome */}
      <polygon points="0,-10 -5,-6 5,-6" fill={MC.redstone} stroke={e} strokeWidth="0.4" />
      <polygon points="0,-10 -5,-6 -3,-8" fill="#cc2020" stroke={e} strokeWidth="0.4" />
      {/* White spots */}
      <circle cx="-1" cy="-7.5" r="0.8" fill="rgba(255,255,255,0.6)" />
      <circle cx="2" cy="-7" r="0.6" fill="rgba(255,255,255,0.5)" />
    </g>
  );
}

// ─── Location structures (low-poly blocky buildings) ───

/** Hub — Minecraft oak plank house with cobblestone chimney */
function BlockHouse({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.18)';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Ground shadow */}
      <polygon points="-18,6 0,12 18,6 0,0" fill="rgba(0,0,0,0.2)" />
      {/* Front wall */}
      <rect x="-16" y="-14" width="32" height="20" fill={MC.oakPlanks} stroke={e} strokeWidth="0.8" />
      {/* Left side wall */}
      <polygon points="-16,-14 -16,6 -24,0 -24,-20" fill={MC.oakPlanksDark} stroke={e} strokeWidth="0.8" />
      {/* Top wall edge */}
      <polygon points="-16,-14 0,-20 16,-14 0,-8" fill={MC.oakPlanksLight} stroke={e} strokeWidth="0.5" />
      {/* Roof — front face */}
      <polygon points="-18,-14 0,-28 18,-14" fill={MC.sprucePlanks} stroke={e} strokeWidth="0.8" />
      {/* Roof — left face */}
      <polygon points="-18,-14 0,-28 -26,-20" fill={MC.sprucePlanksDark} stroke={e} strokeWidth="0.8" />
      {/* Door (dark oak) */}
      <rect x="-4" y="-6" width="8" height="12" fill={MC.logDark} stroke={e} strokeWidth="0.5" />
      <rect x="-4" y="-6" width="4" height="12" fill={MC.log} stroke={e} strokeWidth="0.5" />
      {/* Door handle */}
      <rect x="2" y="0" width="1.5" height="1.5" rx="0.3" fill={MC.gold} />
      {/* Window */}
      <rect x="-13" y="-10" width="6" height="5" fill="#5a90c0" stroke={e} strokeWidth="0.5" />
      <line x1="-10" y1="-10" x2="-10" y2="-5" stroke={MC.oakPlanksDark} strokeWidth="0.5" />
      <line x1="-13" y1="-7.5" x2="-7" y2="-7.5" stroke={MC.oakPlanksDark} strokeWidth="0.5" />
      {/* Window glow */}
      <rect x="-12.5" y="-9.5" width="2.5" height="2" fill="rgba(255,238,160,0.3)" />
      {/* Chimney — cobblestone */}
      <rect x="8" y="-32" width="6" height="14" fill={MC.cobble} stroke={e} strokeWidth="0.5" />
      <rect x="8" y="-32" width="3" height="14" fill={MC.cobbleDark} stroke={e} strokeWidth="0.5" />
      {/* Chimney cap */}
      <rect x="7" y="-33" width="8" height="2" fill={MC.stoneDark} stroke={e} strokeWidth="0.5" />
    </g>
  );
}

/** Campfire — logs + lava-colored fire facets */
function BlockFire({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.12)';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Ground glow */}
      <polygon points="-8,2 0,5 8,2 0,-1" fill="rgba(255,120,20,0.12)" />
      {/* Log cross */}
      <rect x="-7" y="-1" width="14" height="3" rx="0.5" fill={MC.log} stroke={e} strokeWidth="0.4" transform="rotate(-20)" />
      <rect x="-6" y="0" width="12" height="2.5" rx="0.5" fill={MC.logDark} stroke={e} strokeWidth="0.4" transform="rotate(25)" />
      {/* Fire facets */}
      <polygon points="0,-12 -4,-2 4,-2" fill={MC.lava} stroke={e} strokeWidth="0.3" />
      <polygon points="0,-12 -4,-2 0,-2" fill={MC.lavaBright} stroke={e} strokeWidth="0.3" />
      <polygon points="-2,-8 -5,-1 1,-1" fill={MC.lavaBright} opacity="0.7" />
      <polygon points="2,-9 -1,-2 5,-2" fill={MC.lava} opacity="0.8" />
      {/* Sparks */}
      <rect x="-1" y="-15" width="1.5" height="1.5" fill={MC.gold} opacity="0.6" />
      <rect x="3" y="-13" width="1" height="1" fill={MC.lavaBright} opacity="0.5" />
    </g>
  );
}

/** Tower — cobblestone castle tower */
function BlockTower({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.18)';
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-14,6 0,12 14,6 0,0" fill="rgba(0,0,0,0.2)" />
      {/* Main wall — front */}
      <rect x="-12" y="-34" width="24" height="40" fill={MC.cobble} stroke={e} strokeWidth="0.8" />
      {/* Left face */}
      <polygon points="-12,-34 -12,6 -18,0 -18,-40" fill={MC.cobbleDark} stroke={e} strokeWidth="0.8" />
      {/* Top face */}
      <polygon points="-12,-34 0,-40 12,-34 0,-28" fill={MC.stoneLight} stroke={e} strokeWidth="0.5" />
      {/* Battlements — blocky crenellations */}
      {[-10, -4, 2, 8].map(bx => (
        <g key={bx}>
          <rect x={bx} y="-40" width="5" height="6" fill={MC.cobble} stroke={e} strokeWidth="0.5" />
          <rect x={bx} y="-40" width="2.5" height="6" fill={MC.cobbleDark} stroke={e} strokeWidth="0.5" />
        </g>
      ))}
      {/* Arrow slits */}
      <rect x="-2" y="-26" width="2" height="6" fill={MC.obsidian} />
      <rect x="-2" y="-14" width="2" height="6" fill={MC.obsidian} />
      {/* Banner pole + flag */}
      <line x1="6" y1="-40" x2="6" y2="-50" stroke={MC.logDark} strokeWidth="1.5" />
      <polygon points="6,-50 14,-46 6,-42" fill={MC.redstone} stroke={e} strokeWidth="0.4" />
      <polygon points="6,-50 14,-46 10,-48" fill="#cc1010" stroke={e} strokeWidth="0.3" />
      {/* Door arch — stone */}
      <rect x="-5" y="-4" width="10" height="10" fill={MC.stoneDark} stroke={e} strokeWidth="0.5" />
      <rect x="-4" y="-3" width="8" height="9" fill={MC.obsidian} stroke={e} strokeWidth="0.3" />
    </g>
  );
}

/** Arena — blocky colosseum made of stone blocks */
function BlockArena({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.15)';
  // Build a ring of blocky pillars
  const pillars = [-22, -14, -6, 2, 10, 18];
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-26,6 0,14 26,6 0,-2" fill="rgba(0,0,0,0.18)" />
      {/* Outer wall base */}
      <rect x="-24" y="-16" width="48" height="22" rx="0" fill={MC.stone} stroke={e} strokeWidth="0.8" />
      {/* Left depth face */}
      <polygon points="-24,-16 -24,6 -30,2 -30,-20" fill={MC.stoneDark} stroke={e} strokeWidth="0.8" />
      {/* Top face */}
      <polygon points="-24,-16 0,-22 24,-16 0,-10" fill={MC.stoneLight} stroke={e} strokeWidth="0.5" />
      {/* Inner arena floor */}
      <polygon points="-16,-8 0,-14 16,-8 0,-2" fill={MC.sandDark || MC.dirt} stroke={e} strokeWidth="0.5" />
      <polygon points="-16,-8 0,-2 16,-8" fill={MC.sand} stroke={e} strokeWidth="0.5" />
      {/* Pillars */}
      {pillars.map(px => (
        <g key={px}>
          <rect x={px} y="-22" width="5" height="8" fill={MC.iron} stroke={e} strokeWidth="0.5" />
          <rect x={px} y="-22" width="2.5" height="8" fill={MC.snowDark} stroke={e} strokeWidth="0.5" />
        </g>
      ))}
      {/* Pillar tops */}
      {pillars.map(px => (
        <rect key={`t${px}`} x={px - 0.5} y="-23" width="6" height="2" fill={MC.stoneLight} stroke={e} strokeWidth="0.3" />
      ))}
      {/* Flags on ends */}
      <line x1="-22" y1="-22" x2="-22" y2="-32" stroke={MC.logDark} strokeWidth="1" />
      <polygon points="-22,-32 -16,-29 -22,-26" fill={MC.water} stroke={e} strokeWidth="0.3" />
      <line x1="22" y1="-22" x2="22" y2="-32" stroke={MC.logDark} strokeWidth="1" />
      <polygon points="22,-32 28,-29 22,-26" fill={MC.water} stroke={e} strokeWidth="0.3" />
      {/* Center diamond marker */}
      <polygon points="0,-9 -3,-7 0,-5 3,-7" fill={MC.diamond} opacity="0.6" />
    </g>
  );
}

/** Cave entrance — faceted dark stone */
function BlockCave({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.18)';
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-16,4 0,8 16,4 0,0" fill="rgba(0,0,0,0.18)" />
      {/* Surrounding rock facets */}
      <polygon points="-16,-14 -10,-22 -4,-14" fill={MC.stoneDark} stroke={e} strokeWidth="0.6" />
      <polygon points="-4,-14 0,-26 4,-14" fill={MC.stone} stroke={e} strokeWidth="0.6" />
      <polygon points="4,-14 10,-22 16,-14" fill={MC.cobbleDark} stroke={e} strokeWidth="0.6" />
      <polygon points="-16,-14 -4,-14 -10,-8" fill={MC.cobble} stroke={e} strokeWidth="0.6" />
      <polygon points="4,-14 16,-14 10,-8" fill={MC.cobbleDark} stroke={e} strokeWidth="0.6" />
      {/* Connecting rock at top */}
      <polygon points="-10,-22 0,-26 10,-22 0,-18" fill={MC.stoneLight} stroke={e} strokeWidth="0.5" />
      {/* Cave opening */}
      <polygon points="-10,-8 0,-14 10,-8 0,2" fill={MC.obsidian} stroke={e} strokeWidth="0.5" />
      <polygon points="-8,-6 0,-12 8,-6 0,0" fill="#0c0616" />
      {/* Nether glow inside */}
      <polygon points="-5,-4 0,-8 5,-4 0,0" fill={MC.nether} opacity="0.25" />
      <polygon points="-3,-2 0,-5 3,-2 0,1" fill="rgba(180,60,220,0.15)" />
      {/* Glowing ores on rocks */}
      <rect x="-14" y="-16" width="2" height="2" fill={MC.diamond} opacity="0.5" />
      <rect x="10" y="-18" width="2" height="2" fill="#b050e0" opacity="0.4" />
      <rect x="-8" y="-20" width="1.5" height="1.5" fill={MC.gold} opacity="0.35" />
    </g>
  );
}

/** Treehouse — blocky Minecraft tree with platform & cabin */
function BlockTreehouse({ x, y }: { x: number; y: number }) {
  const e = 'rgba(0,0,0,0.18)';
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-14,6 0,10 14,6 0,2" fill="rgba(0,0,0,0.18)" />
      {/* Thick trunk — 2×2 block style */}
      <rect x="-4" y="-22" width="8" height="28" fill={MC.log} stroke={e} strokeWidth="0.6" />
      <rect x="-4" y="-22" width="4" height="28" fill={MC.logLight} stroke={e} strokeWidth="0.6" />
      {/* Platform — oak planks */}
      <rect x="-16" y="-24" width="32" height="4" fill={MC.oakPlanks} stroke={e} strokeWidth="0.6" />
      {/* Platform left face */}
      <polygon points="-16,-20 -16,-24 -20,-26 -20,-22" fill={MC.oakPlanksDark} stroke={e} strokeWidth="0.5" />
      {/* Platform top face */}
      <polygon points="-16,-24 0,-28 16,-24 0,-20" fill={MC.oakPlanksLight} stroke={e} strokeWidth="0.5" />
      {/* Cabin walls — front face */}
      <rect x="-12" y="-38" width="24" height="14" fill={MC.oakPlanks} stroke={e} strokeWidth="0.6" />
      {/* Cabin left face */}
      <polygon points="-12,-38 -12,-24 -16,-26 -16,-40" fill={MC.oakPlanksDark} stroke={e} strokeWidth="0.6" />
      {/* Roof */}
      <polygon points="-14,-38 0,-46 14,-38" fill={MC.leaves} stroke={e} strokeWidth="0.6" />
      <polygon points="-14,-38 0,-46 -18,-40" fill={MC.leavesDark} stroke={e} strokeWidth="0.6" />
      {/* Window */}
      <rect x="-3" y="-35" width="5" height="4" fill="#5a90c0" stroke={e} strokeWidth="0.4" />
      <rect x="-2.5" y="-34.5" width="2" height="1.5" fill="rgba(255,238,160,0.3)" />
      {/* Big leaf canopy — blocky cube above */}
      <rect x="-18" y="-58" width="36" height="14" fill={MC.leavesDark} stroke={e} strokeWidth="0.6" />
      <polygon points="-18,-58 0,-64 18,-58 0,-52" fill={MC.leavesLight} stroke={e} strokeWidth="0.5" />
      <polygon points="-18,-58 -18,-44 -24,-48 -24,-62" fill={MC.leaves} stroke={e} strokeWidth="0.5" />
      {/* Musical note block */}
      <g transform="translate(22,-48)">
        <rect x="-3" y="-3" width="6" height="6" fill={MC.grassTop} stroke={e} strokeWidth="0.4" />
        <text x="0" y="2" textAnchor="middle" fill={MC.leavesLight} fontSize="5" fontFamily="monospace">♪</text>
      </g>
    </g>
  );
}

// ─── Triangulated ground mesh ───

function GroundMesh() {
  const rand = seeded(555);
  const cols = 14;
  const rows = 10;
  const cw = MAP_W / cols;
  const ch = MAP_H / rows;
  const e = 'rgba(0,0,0,0.08)';

  // Generate a grid of slightly jittered points
  const pts: { x: number; y: number }[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c <= cols; c++) {
      const jx = (r === 0 || r === rows || c === 0 || c === cols) ? 0 : (rand() - 0.5) * cw * 0.3;
      const jy = (r === 0 || r === rows || c === 0 || c === cols) ? 0 : (rand() - 0.5) * ch * 0.3;
      row.push({ x: c * cw + jx, y: r * ch + jy });
    }
    pts.push(row);
  }

  // Determine biome color per cell
  function biomeColor(c: number, r: number, light: boolean): string {
    // Forest (top-left)
    if (c < 6 && r < 5) return light ? MC.grassTopLight : MC.grassTop;
    // Mountain (top-right)
    if (c >= 8 && r < 5) return light ? MC.stoneLight : MC.stone;
    // Village (bottom-right)
    if (c >= 8 && r >= 5) return light ? MC.dirt : MC.dirtDark;
    // Cave (bottom-left)
    if (c < 6 && r >= 5) return light ? MC.stoneDark : MC.netherDark;
    // Transition center
    return light ? MC.grassTop : MC.grassSide;
  }

  // River cells
  function isRiver(c: number, r: number): boolean {
    return c >= 6 && c <= 7 && (r < 4 || r > 5);
  }

  const triangles: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = pts[r][c], tr = pts[r][c + 1];
      const bl = pts[r + 1][c], br = pts[r + 1][c + 1];

      if (isRiver(c, r)) {
        // Water block
        const waterColor = (c + r) % 2 === 0 ? MC.water : MC.waterDark;
        const waterLight = (c + r) % 2 === 0 ? MC.waterLight : MC.water;
        triangles.push(
          <polygon key={`w1-${c}-${r}`} points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${bl.x},${bl.y}`} fill={waterColor} stroke={e} strokeWidth="0.5" />,
          <polygon key={`w2-${c}-${r}`} points={`${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`} fill={waterLight} stroke={e} strokeWidth="0.5" />,
        );
      } else {
        // Two triangles per cell, each a slightly different shade
        const col1 = biomeColor(c, r, true);
        const col2 = biomeColor(c, r, false);
        triangles.push(
          <polygon key={`t1-${c}-${r}`} points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${bl.x},${bl.y}`} fill={col1} stroke={e} strokeWidth="0.5" />,
          <polygon key={`t2-${c}-${r}`} points={`${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`} fill={col2} stroke={e} strokeWidth="0.5" />,
        );
      }
    }
  }

  // Bridge blocks over river at center row
  const bridgeY = 5 * ch;
  triangles.push(
    <rect key="bridge1" x={6 * cw} y={bridgeY - 3} width={2 * cw} height={ch + 6} fill={MC.oakPlanks} stroke={e} strokeWidth="0.8" />,
    <rect key="bridge2" x={6 * cw} y={bridgeY - 3} width={cw} height={ch + 6} fill={MC.oakPlanksDark} stroke={e} strokeWidth="0.5" />,
    // Planks lines
    <line key="bl1" x1={6 * cw} y1={bridgeY + 4} x2={8 * cw} y2={bridgeY + 4} stroke={MC.sprucePlanksDark} strokeWidth="0.8" />,
    <line key="bl2" x1={6 * cw} y1={bridgeY + 14} x2={8 * cw} y2={bridgeY + 14} stroke={MC.sprucePlanksDark} strokeWidth="0.8" />,
    <line key="bl3" x1={6 * cw} y1={bridgeY + 24} x2={8 * cw} y2={bridgeY + 24} stroke={MC.sprucePlanksDark} strokeWidth="0.8" />,
  );

  return <g>{triangles}</g>;
}

// ─── Scattered decorations ───

function ScatteredTrees() {
  const rand = seeded(42);
  const items: JSX.Element[] = [];
  for (let i = 0; i < 16; i++) {
    const x = 20 + rand() * 240;
    const y = 20 + rand() * 170;
    const d = Math.hypot(x - toScreen(4, 3).x, y - toScreen(4, 3).y);
    if (d < 60) continue;
    const sc = 0.6 + rand() * 0.5;
    items.push(
      rand() > 0.45
        ? <LPTree key={`lt-${i}`} x={x} y={y} s={sc} variant={rand() > 0.5 ? 0 : 1} />
        : <LPOak key={`lo-${i}`} x={x} y={y} s={sc} />
    );
  }
  // A few trees in village area
  for (let i = 0; i < 4; i++) {
    const x = 400 + rand() * 240;
    const y = 300 + rand() * 110;
    const d = Math.hypot(x - toScreen(12, 9).x, y - toScreen(12, 9).y);
    if (d < 55) continue;
    items.push(<LPOak key={`vo-${i}`} x={x} y={y} s={0.35 + rand() * 0.25} />);
  }
  return <>{items}</>;
}

function ScatteredRocks() {
  const rand = seeded(99);
  const items: JSX.Element[] = [];
  for (let i = 0; i < 10; i++) {
    const x = 400 + rand() * 250;
    const y = 20 + rand() * 150;
    const d = Math.hypot(x - toScreen(12, 3).x, y - toScreen(12, 3).y);
    if (d < 55) continue;
    items.push(<LPRock key={`r-${i}`} x={x} y={y} s={0.7 + rand() * 0.8} />);
  }
  for (let i = 0; i < 5; i++) {
    const x = 30 + rand() * 200;
    const y = 280 + rand() * 130;
    const d = Math.hypot(x - toScreen(4, 9).x, y - toScreen(4, 9).y);
    if (d < 50) continue;
    items.push(<LPRock key={`cr-${i}`} x={x} y={y} s={0.5 + rand() * 0.6} />);
  }
  return <>{items}</>;
}

function ScatteredMushrooms() {
  const rand = seeded(77);
  const items: JSX.Element[] = [];
  for (let i = 0; i < 5; i++) {
    const x = 40 + rand() * 180;
    const y = 290 + rand() * 110;
    const d = Math.hypot(x - toScreen(4, 9).x, y - toScreen(4, 9).y);
    if (d < 50) continue;
    items.push(<LPMushroom key={`m-${i}`} x={x} y={y} />);
  }
  return <>{items}</>;
}

// ═══════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════

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

  const handleClick = useCallback((loc: GameModeLocation, status: GameModeStatus) => {
    if (status !== 'locked' && loc.action !== 'hub') onSelectMode(loc.action);
  }, [onSelectMode]);

  // Dirt-path roads
  const pathElements = useMemo(() => {
    return GAMEMODE_PATHS.map((path) => {
      const toStatus = locationStatuses[path.to];
      const isLocked = toStatus === 'locked';
      const d = buildCurvedPath(path.waypoints);
      const edgeCol = 'rgba(0,0,0,0.15)';

      return (
        <g key={`${path.from}-${path.to}`}>
          {/* Path shadow */}
          <path d={d} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="14" strokeLinecap="round" />
          {/* Dirt base */}
          <path d={d} fill="none" stroke={isLocked ? MC.stoneDark : MC.dirtDark} strokeWidth="10" strokeLinecap="round" opacity={isLocked ? 0.3 : 1} />
          {/* Surface */}
          <path d={d} fill="none" stroke={isLocked ? MC.stone : MC.dirt} strokeWidth="6" strokeLinecap="round" opacity={isLocked ? 0.25 : 1} />
          {/* Edge lines for blocky feel */}
          <path d={d} fill="none" stroke={edgeCol} strokeWidth="10" strokeLinecap="round" strokeDasharray="1 0" opacity="0.08" />
          {/* Gravel dots on path */}
          {!isLocked && (
            <path d={d} fill="none" stroke={MC.sand} strokeWidth="1" strokeDasharray="2 12" strokeLinecap="round" className={styles.pathAnimated} />
          )}
          {/* Traveling torch */}
          {!isLocked && (
            <g className={styles.pathDot}>
              <circle r="3" fill={MC.lavaBright} opacity="0.6">
                <animateMotion dur="4s" repeatCount="indefinite" path={d} />
              </circle>
              <circle r="6" fill={MC.lava} opacity="0.1">
                <animateMotion dur="4s" repeatCount="indefinite" path={d} />
              </circle>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses]);

  // Location structures
  const locationElements = useMemo(() => {
    const structs: Record<string, (p: { x: number; y: number }) => JSX.Element> = {
      hub: (p) => (<g><BlockHouse x={p.x} y={p.y} /><BlockFire x={p.x + 30} y={p.y + 4} /></g>),
      solo: (p) => <BlockTreehouse x={p.x} y={p.y} />,
      battle: (p) => <BlockTower x={p.x} y={p.y} />,
      arena: (p) => <BlockArena x={p.x} y={p.y} />,
      stories: (p) => <BlockCave x={p.x} y={p.y} />,
    };

    return GAMEMODE_LOCATIONS.map((loc) => {
      const pos = toScreen(loc.mapX, loc.mapY);
      const status = locationStatuses[loc.id];
      const isHovered = hoveredLocation === loc.id;
      const name = locale === 'en' ? loc.nameEn : loc.name;
      const Struct = structs[loc.id];

      return (
        <g
          key={loc.id}
          className={`${styles.locationNode} ${styles[`status_${status}`]}`}
          onClick={() => handleClick(loc, status)}
          onMouseEnter={() => { if (loc.action !== 'hub') setHoveredLocation(loc.id); }}
          onMouseLeave={() => setHoveredLocation(null)}
          style={{ cursor: status === 'locked' ? 'not-allowed' : loc.action === 'hub' ? 'default' : 'pointer' }}
        >
          {status === 'locked' ? (
            <g filter="url(#lockedDesat)" opacity="0.35">
              {Struct && Struct(pos)}
            </g>
          ) : (
            Struct && Struct(pos)
          )}

          {/* Hover selection ring — blocky diamond shape */}
          {status !== 'locked' && (
            <polygon
              points={`${pos.x},${pos.y - (isHovered ? 50 : 44)} ${pos.x + (isHovered ? 44 : 38)},${pos.y - 6} ${pos.x},${pos.y + (isHovered ? 38 : 32)} ${pos.x - (isHovered ? 44 : 38)},${pos.y - 6}`}
              fill="none"
              stroke={loc.accentColor}
              strokeWidth={isHovered ? 2.5 : 1}
              opacity={isHovered ? 0.6 : 0.1}
              className={status === 'available' ? styles.pulseRing : undefined}
            />
          )}

          {/* Name plate — Minecraft tooltip style */}
          <g transform={`translate(${pos.x},${pos.y + 20})`}>
            <rect
              x="-38"
              y="-2"
              width="76"
              height="16"
              fill={isHovered ? 'rgba(16,0,16,0.92)' : 'rgba(16,0,16,0.72)'}
              stroke={isHovered ? loc.accentColor : 'rgba(80,40,120,0.3)'}
              strokeWidth={isHovered ? 1.5 : 1}
            />
            {/* Inner highlight like MC tooltip */}
            <rect
              x="-37"
              y="-1"
              width="74"
              height="14"
              fill="none"
              stroke="rgba(40,0,80,0.4)"
              strokeWidth="0.5"
            />
            <text
              x="0" y="10"
              textAnchor="middle"
              fill={status === 'locked' ? 'rgba(170,170,170,0.3)' : '#fcfcfc'}
              fontSize="8"
              fontFamily="var(--font-pixel, 'Press Start 2P', monospace)"
              letterSpacing="0.5px"
              style={{ pointerEvents: 'none' }}
            >
              {name}
            </text>
          </g>

          {/* Lock icon */}
          {status === 'locked' && (
            <g transform={`translate(${pos.x},${pos.y - 14})`}>
              <rect x="-10" y="-10" width="20" height="20" fill="rgba(16,0,16,0.85)" stroke="rgba(80,40,120,0.4)" strokeWidth="1" />
              <svg x="-6" y="-7" width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(170,170,170,0.5)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </g>
          )}

          {/* Online badge */}
          {(loc.action === 'multiplayer' || loc.action === 'arena') && onlineCount > 0 && status !== 'locked' && (
            <g transform={`translate(${pos.x + 28},${pos.y - 32})`}>
              <rect x="-14" y="-8" width="28" height="16" fill="rgba(16,0,16,0.9)" stroke="rgba(76,175,80,0.5)" strokeWidth="1" />
              <rect x="-6" y="-2" width="4" height="4" fill="#4CAF50" className={styles.onlineDot} />
              <text x="6" y="3.5" textAnchor="middle" fill="#fcfcfc" fontSize="9" fontFamily="var(--font-pixel, monospace)" fontWeight="600">
                {onlineCount}
              </text>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses, hoveredLocation, locale, handleClick, onlineCount]);

  const hoveredLoc = hoveredLocation ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation) : null;

  return (
    <motion.div
      className={styles.mapWrapper}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className={styles.ambientLight} />
      <div className={styles.vignetteOverlay} />

      <svg className={styles.mapSvg} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="lockedDesat"><feColorMatrix type="saturate" values="0.08" /></filter>
        </defs>

        {/* Triangulated low-poly ground */}
        <GroundMesh />

        {/* Scattered decorations */}
        <g className={styles.decorLayer}>
          <ScatteredRocks />
          <ScatteredMushrooms />
        </g>
        <g className={styles.decorLayer}>
          <ScatteredTrees />
        </g>

        {/* Mountains — low-poly faceted */}
        <LPMountain x={570} y={90} w={90} h={80} />
        <LPMountain x={500} y={115} w={70} h={55} />
        <LPMountain x={640} y={75} w={65} h={60} baseCol={MC.cobble} />
        <LPMountain x={450} y={130} w={50} h={38} />

        {/* Road paths */}
        <g className={styles.pathLayer}>{pathElements}</g>

        {/* Location structures */}
        <g className={styles.locationLayer}>{locationElements}</g>
      </svg>

      {/* Info panel — Minecraft inventory tooltip style */}
      <AnimatePresence>
        {hoveredLoc && (() => {
          const status = locationStatuses[hoveredLoc.id];
          const name = locale === 'en' ? hoveredLoc.nameEn : hoveredLoc.name;
          const desc = locale === 'en' ? hoveredLoc.descriptionEn : hoveredLoc.description;

          return (
            <motion.div
              key={hoveredLoc.id}
              className={styles.infoPanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <div className={styles.infoPanelContent}>
                <div className={styles.infoPanelHeader}>
                  <span className={styles.infoIcon}>{hoveredLoc.icon}</span>
                  <span className={styles.infoName} style={{ color: hoveredLoc.accentColor }}>{name}</span>
                  {status === 'available' && (
                    <span className={styles.infoPlayBadge}>
                      {locale === 'en' ? '[ PLAY ]' : '[ プレイ ]'}
                    </span>
                  )}
                </div>

                <div className={styles.infoDesc}>{desc}</div>

                {hoveredLoc.features.length > 0 && (
                  <div className={styles.infoFeatures}>
                    {hoveredLoc.features.map((f, i) => (
                      <span key={i} className={styles.infoFeatureTag}>
                        {locale === 'en' ? f.labelEn : f.label}
                      </span>
                    ))}
                  </div>
                )}

                {hoveredLoc.stats.length > 0 && (
                  <div className={styles.infoStats}>
                    {hoveredLoc.stats.map((s, i) => (
                      <div key={i} className={styles.infoStatItem}>
                        <div className={styles.infoStatValue}>{s.value}</div>
                        <div className={styles.infoStatLabel}>{locale === 'en' ? s.labelEn : s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {status === 'locked' && (
                  <div className={styles.infoLocked}>
                    <svg className={styles.infoLockedIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span className={styles.infoLockedText}>
                      {t('advancements.lockMessage', { current: unlockedCount, required: requiredAdvancements })}
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
