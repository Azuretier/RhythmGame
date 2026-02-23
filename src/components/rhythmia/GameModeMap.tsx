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

// --- Layout constants ---
const MAP_W = 700;
const MAP_H = 460;

function toScreen(gx: number, gy: number): { x: number; y: number } {
  return { x: (gx / 16) * MAP_W, y: (gy / 12) * MAP_H };
}

// Smooth bezier path from waypoints
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

// Seeded PRNG for deterministic decoration placement
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// =========================================================
//  Illustrated SVG terrain pieces (3D art in 2D)
// =========================================================

/** Conifer tree with trunk shadow & layered canopy */
function ConiferTree({ x, y, scale = 1, shade = '#1a6e2a' }: { x: number; y: number; scale?: number; shade?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {/* Shadow on ground */}
      <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(0,0,0,0.18)" />
      {/* Trunk */}
      <rect x="-2" y="-8" width="4" height="10" rx="1" fill="#5a3a1a" />
      <rect x="-1.5" y="-7" width="1.5" height="8" rx="0.5" fill="#6e4a28" opacity="0.5" />
      {/* Canopy layers — bottom to top for depth */}
      <polygon points="0,-30 -12,-8 12,-8" fill={shade} />
      <polygon points="0,-30 -9,-14 9,-14" fill="#2a8a3a" />
      <polygon points="0,-36 -7,-20 7,-20" fill="#35a848" />
      {/* Snow cap highlight */}
      <polygon points="0,-36 -3,-28 3,-28" fill="rgba(255,255,255,0.15)" />
    </g>
  );
}

/** Broad-leaf / oak tree */
function OakTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="10" ry="3.5" fill="rgba(0,0,0,0.15)" />
      <rect x="-2.5" y="-12" width="5" height="14" rx="1.5" fill="#5a3a1a" />
      <rect x="-1.5" y="-10" width="2" height="10" rx="0.5" fill="#6e4a28" opacity="0.4" />
      {/* Bushy canopy */}
      <ellipse cx="0" cy="-22" rx="14" ry="12" fill="#3d8c4a" />
      <ellipse cx="-4" cy="-24" rx="10" ry="9" fill="#4aa85a" />
      <ellipse cx="5" cy="-20" rx="8" ry="8" fill="#3d8c4a" />
      {/* Light hitting top */}
      <ellipse cx="-2" cy="-28" rx="7" ry="5" fill="rgba(120,220,120,0.25)" />
    </g>
  );
}

/** Mountain with snow cap & depth shading */
function Mountain({ x, y, w = 80, h = 60, color = '#5a6a7a' }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  const halfW = w / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Base shadow */}
      <ellipse cx="0" cy="4" rx={halfW + 6} ry="8" fill="rgba(0,0,0,0.12)" />
      {/* Dark side */}
      <polygon points={`0,${-h} ${halfW},0 0,0`} fill={color} opacity="0.7" />
      {/* Light side */}
      <polygon points={`0,${-h} ${-halfW},0 0,0`} fill={color} />
      {/* Snow cap */}
      <polygon points={`0,${-h} ${-halfW * 0.25},${-h * 0.6} ${halfW * 0.2},${-h * 0.55}`} fill="#e8e8f0" opacity="0.85" />
      {/* Ridge highlight */}
      <line x1="0" y1={-h} x2={-halfW * 0.05} y2={-h * 0.2} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
    </g>
  );
}

/** Small rock / boulder */
function Rock({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="6" ry="2" fill="rgba(0,0,0,0.12)" />
      <ellipse cx="0" cy="-2" rx="6" ry="5" fill="#6a6e78" />
      <ellipse cx="-1" cy="-4" rx="4" ry="3" fill="#7e8290" opacity="0.6" />
    </g>
  );
}

/** Mushroom cluster */
function Mushrooms({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="1" rx="5" ry="2" fill="rgba(0,0,0,0.1)" />
      <rect x="-1" y="-6" width="2" height="7" rx="0.5" fill="#e0d4c0" />
      <ellipse cx="0" cy="-7" rx="4" ry="3" fill="#c04848" />
      <circle cx="-1.5" cy="-8" r="1" fill="rgba(255,255,255,0.5)" />
      <circle cx="1.5" cy="-6.5" r="0.7" fill="rgba(255,255,255,0.4)" />
      {/* Smaller one */}
      <rect x="4" y="-3" width="1.5" height="4" rx="0.5" fill="#e0d4c0" />
      <ellipse cx="4.8" cy="-4" rx="3" ry="2" fill="#b03838" />
    </g>
  );
}

/** Small house / hut for the hub */
function Hut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="6" rx="20" ry="5" fill="rgba(0,0,0,0.15)" />
      {/* Walls */}
      <rect x="-14" y="-12" width="28" height="18" rx="2" fill="#b8966a" />
      <rect x="-14" y="-12" width="14" height="18" rx="2" fill="#c8a878" />
      {/* Roof */}
      <polygon points="-18,-12 0,-26 18,-12" fill="#7a4028" />
      <polygon points="-18,-12 0,-26 0,-12" fill="#8e5035" />
      {/* Door */}
      <rect x="-4" y="-4" width="8" height="10" rx="4" fill="#5a3820" />
      <circle cx="2" cy="2" r="0.8" fill="#c8a050" />
      {/* Window */}
      <rect x="-11" y="-8" width="5" height="5" rx="0.5" fill="#ffeaa0" opacity="0.7" />
      {/* Chimney */}
      <rect x="8" y="-24" width="5" height="10" rx="1" fill="#6a5040" />
      {/* Smoke wisps */}
      <circle cx="10" cy="-28" r="2" fill="rgba(200,200,210,0.25)" />
      <circle cx="12" cy="-32" r="2.5" fill="rgba(200,200,210,0.18)" />
      <circle cx="10" cy="-36" r="3" fill="rgba(200,200,210,0.1)" />
    </g>
  );
}

/** Campfire near the hub */
function Campfire({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(255,120,30,0.12)" />
      {/* Logs */}
      <rect x="-6" y="-1" width="12" height="3" rx="1" fill="#5a3a1a" transform="rotate(-15)" />
      <rect x="-5" y="0" width="10" height="2.5" rx="1" fill="#4a2a10" transform="rotate(20)" />
      {/* Fire */}
      <ellipse cx="0" cy="-4" rx="4" ry="7" fill="#ff8c20" opacity="0.7" />
      <ellipse cx="0" cy="-6" rx="2.5" ry="5" fill="#ffaa30" opacity="0.8" />
      <ellipse cx="0" cy="-7" rx="1.5" ry="3" fill="#ffe080" opacity="0.9" />
      {/* Glow */}
      <circle cx="0" cy="-4" r="14" fill="rgba(255,150,40,0.06)" />
    </g>
  );
}

/** Tower / castle for battle arena */
function Tower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="6" rx="16" ry="4" fill="rgba(0,0,0,0.18)" />
      {/* Base wall */}
      <rect x="-12" y="-30" width="24" height="36" rx="1" fill="#7a7a8a" />
      <rect x="-12" y="-30" width="12" height="36" rx="1" fill="#8a8a9a" />
      {/* Battlement crenellations */}
      {[-10, -5, 0, 5].map(bx => (
        <rect key={bx} x={bx} y="-35" width="4" height="5" fill="#6a6a7a" />
      ))}
      {/* Window slits */}
      <rect x="-3" y="-22" width="2" height="6" rx="1" fill="#2a2a3a" />
      <rect x="-3" y="-10" width="2" height="6" rx="1" fill="#2a2a3a" />
      {/* Red banner */}
      <rect x="4" y="-26" width="1" height="14" fill="#6a3030" />
      <polygon points="5,-26 12,-22 5,-18" fill="#d04040" />
      {/* Door arch */}
      <rect x="-5" y="-2" width="10" height="8" rx="5" fill="#3a3a4a" />
    </g>
  );
}

/** Colosseum / arena structure */
function Colosseum({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="4" rx="24" ry="6" fill="rgba(0,0,0,0.15)" />
      {/* Outer wall ellipse */}
      <ellipse cx="0" cy="-8" rx="22" ry="14" fill="#6688aa" />
      <ellipse cx="0" cy="-8" rx="22" ry="14" fill="rgba(255,255,255,0.08)" />
      {/* Inner arena */}
      <ellipse cx="0" cy="-10" rx="15" ry="9" fill="#3a506a" />
      {/* Tiered seating (arcs) */}
      <ellipse cx="0" cy="-8" rx="18" ry="11" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Pillars */}
      {[-16, -8, 0, 8, 16].map(px => (
        <rect key={px} x={px - 1.5} y="-20" width="3" height="12" rx="1" fill="#8aaac8" opacity="0.7" />
      ))}
      {/* Arena floor highlight */}
      <ellipse cx="0" cy="-10" rx="10" ry="6" fill="rgba(100,200,255,0.08)" />
      {/* Flags */}
      <line x1="-18" y1="-22" x2="-18" y2="-30" stroke="#6a6a7a" strokeWidth="1" />
      <polygon points="-18,-30 -12,-27 -18,-24" fill="#3088d0" opacity="0.8" />
      <line x1="18" y1="-22" x2="18" y2="-30" stroke="#6a6a7a" strokeWidth="1" />
      <polygon points="18,-30 24,-27 18,-24" fill="#3088d0" opacity="0.8" />
    </g>
  );
}

/** Cave entrance for stories */
function CaveEntrance({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="3" rx="18" ry="4" fill="rgba(0,0,0,0.15)" />
      {/* Rock formation around cave */}
      <ellipse cx="-12" cy="-8" rx="10" ry="16" fill="#5a5a6a" />
      <ellipse cx="12" cy="-6" rx="10" ry="14" fill="#4a4a5a" />
      <ellipse cx="0" cy="-18" rx="16" ry="8" fill="#5a5a6a" />
      {/* Cave opening */}
      <ellipse cx="0" cy="-2" rx="10" ry="12" fill="#1a0e2a" />
      <ellipse cx="0" cy="-2" rx="8" ry="10" fill="#0e0818" />
      {/* Inner glow */}
      <ellipse cx="0" cy="0" rx="5" ry="7" fill="rgba(156,39,176,0.15)" />
      <ellipse cx="0" cy="2" rx="3" ry="4" fill="rgba(180,80,220,0.1)" />
      {/* Hanging vines */}
      <path d="M-6,-14 Q-8,-8 -5,-4" fill="none" stroke="#2a6a2a" strokeWidth="1.5" opacity="0.6" />
      <path d="M4,-16 Q6,-10 3,-6" fill="none" stroke="#2a6a2a" strokeWidth="1.5" opacity="0.5" />
      {/* Glowing crystals */}
      <polygon points="-8,-6 -6,-12 -4,-6" fill="#b060e0" opacity="0.5" />
      <polygon points="6,-4 8,-10 10,-4" fill="#a050d0" opacity="0.4" />
    </g>
  );
}

/** Treehouse for solo / Rhythmia */
function Treehouse({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="6" rx="18" ry="5" fill="rgba(0,0,0,0.15)" />
      {/* Large tree trunk */}
      <rect x="-5" y="-20" width="10" height="26" rx="3" fill="#5a3a1a" />
      <rect x="-3" y="-18" width="3" height="22" rx="1" fill="#6e4a28" opacity="0.4" />
      {/* Roots */}
      <path d="M-5,4 Q-12,6 -14,8" stroke="#4a2a10" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M5,4 Q12,6 14,8" stroke="#4a2a10" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Platform */}
      <rect x="-16" y="-24" width="32" height="4" rx="1" fill="#8a6030" />
      <rect x="-16" y="-24" width="16" height="4" rx="1" fill="#9a7040" />
      {/* Little cabin on platform */}
      <rect x="-12" y="-38" width="24" height="14" rx="1" fill="#c8a060" />
      <rect x="-12" y="-38" width="12" height="14" rx="1" fill="#d4b070" />
      {/* Roof */}
      <polygon points="-14,-38 0,-48 14,-38" fill="#5a8a3c" />
      <polygon points="-14,-38 0,-48 0,-38" fill="#6a9a4c" />
      {/* Window */}
      <circle cx="0" cy="-32" r="3" fill="#ffeaa0" opacity="0.6" />
      {/* Big canopy */}
      <ellipse cx="0" cy="-46" rx="24" ry="14" fill="#3d8c4a" opacity="0.85" />
      <ellipse cx="-6" cy="-50" rx="16" ry="10" fill="#4aa85a" opacity="0.7" />
      <ellipse cx="8" cy="-44" rx="14" ry="10" fill="#3d8c4a" opacity="0.6" />
      {/* Light on canopy top */}
      <ellipse cx="-2" cy="-54" rx="10" ry="6" fill="rgba(120,220,120,0.2)" />
      {/* Musical note floating */}
      <g transform="translate(20,-44)" opacity="0.5">
        <circle cx="0" cy="0" r="2.5" fill="#4CAF50" />
        <line x1="2.5" y1="0" x2="2.5" y2="-8" stroke="#4CAF50" strokeWidth="1.2" />
        <path d="M2.5,-8 Q6,-10 4,-6" fill="#4CAF50" />
      </g>
    </g>
  );
}

// =========================================================
//  Water rendering
// =========================================================

function RiverBody() {
  return (
    <g>
      {/* River bed (shadow) */}
      <path
        d="M300,-10 Q310,50 315,110 Q320,170 310,230 Q305,290 300,350 Q295,410 290,470"
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth="48"
        strokeLinecap="round"
      />
      {/* Main water body */}
      <path
        d="M300,-10 Q310,50 315,110 Q320,170 310,230 Q305,290 300,350 Q295,410 290,470"
        fill="none"
        stroke="#2a6e9e"
        strokeWidth="40"
        strokeLinecap="round"
      />
      {/* Water surface light */}
      <path
        d="M300,-10 Q310,50 315,110 Q320,170 310,230 Q305,290 300,350 Q295,410 290,470"
        fill="none"
        stroke="#3a8ec0"
        strokeWidth="30"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Specular highlights */}
      <path
        d="M302,20 Q308,70 312,130 Q316,190 308,250"
        fill="none"
        stroke="rgba(140,210,255,0.25)"
        strokeWidth="6"
        strokeLinecap="round"
        className={styles.waterHighlight}
      />
      <path
        d="M306,180 Q302,240 298,310 Q294,370 292,430"
        fill="none"
        stroke="rgba(140,210,255,0.2)"
        strokeWidth="4"
        strokeLinecap="round"
        className={styles.waterHighlight2}
      />
      {/* Ripple lines */}
      {[60, 150, 260, 340, 420].map((ry, i) => (
        <ellipse
          key={i}
          cx={305 + (i % 2 ? 3 : -3)}
          cy={ry}
          rx="12"
          ry="2"
          fill="none"
          stroke="rgba(180,230,255,0.15)"
          strokeWidth="0.8"
        />
      ))}
    </g>
  );
}

// =========================================================
//  Ground regions (painted landmass shapes with depth)
// =========================================================

function GroundRegions() {
  return (
    <g>
      {/* Full base ground */}
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#2a3828" rx="0" />

      {/* Forest region - lush green (top-left) */}
      <path
        d="M0,0 L320,0 Q330,20 325,80 Q315,160 280,200 L260,210 Q200,230 140,220 Q60,200 20,150 L0,120 Z"
        fill="#344a30"
      />
      <path
        d="M0,0 L280,0 Q290,20 285,70 Q275,140 240,180 Q180,210 100,190 Q40,170 10,130 L0,100 Z"
        fill="#3c5438"
        opacity="0.7"
      />

      {/* Mountain region - grey-blue stone (top-right) */}
      <path
        d="M380,0 L700,0 L700,200 Q680,220 620,210 Q540,200 480,170 Q420,130 390,80 Q370,40 380,0 Z"
        fill="#3a3e4a"
      />
      <path
        d="M420,0 L700,0 L700,170 Q670,190 600,185 Q540,175 490,145 Q450,110 430,60 Q415,25 420,0 Z"
        fill="#434856"
        opacity="0.6"
      />

      {/* Village region - warm brown (bottom-right) */}
      <path
        d="M380,260 Q420,240 500,245 Q600,255 680,280 L700,290 L700,460 L380,460 Q360,400 360,340 Q360,290 380,260 Z"
        fill="#3e3828"
      />
      <path
        d="M400,280 Q450,260 530,268 Q620,278 680,300 L700,310 L700,460 L400,460 Q385,390 385,340 Q385,300 400,280 Z"
        fill="#463e2c"
        opacity="0.6"
      />

      {/* Cave region - dark purple-stone (bottom-left) */}
      <path
        d="M0,260 Q40,240 120,248 Q220,260 290,290 Q330,320 320,370 L310,460 L0,460 L0,260 Z"
        fill="#2a2434"
      />
      <path
        d="M0,280 Q50,265 130,272 Q210,282 270,308 Q310,335 300,380 L290,460 L0,460 L0,280 Z"
        fill="#322a3e"
        opacity="0.5"
      />

      {/* Central crossroads - warm tan path */}
      <ellipse cx="350" cy="230" rx="80" ry="50" fill="#4a4030" opacity="0.6" />
    </g>
  );
}

// =========================================================
//  Procedural scattered decorations
// =========================================================

function ScatteredTrees() {
  const rand = seeded(42);
  const trees: JSX.Element[] = [];

  // Forest trees (top-left quadrant)
  for (let i = 0; i < 18; i++) {
    const x = 20 + rand() * 240;
    const y = 15 + rand() * 170;
    // Keep away from location centers
    const distToSolo = Math.hypot(x - toScreen(4, 3).x, y - toScreen(4, 3).y);
    if (distToSolo < 55) continue;
    const sc = 0.6 + rand() * 0.5;
    trees.push(
      rand() > 0.4
        ? <ConiferTree key={`ct-${i}`} x={x} y={y} scale={sc} shade={rand() > 0.5 ? '#1a6e2a' : '#1a5e22'} />
        : <OakTree key={`ot-${i}`} x={x} y={y} scale={sc} />
    );
  }

  // Scattered trees elsewhere
  for (let i = 0; i < 6; i++) {
    const x = 360 + rand() * 300;
    const y = 280 + rand() * 140;
    const distToArena = Math.hypot(x - toScreen(12, 9).x, y - toScreen(12, 9).y);
    if (distToArena < 55) continue;
    trees.push(<OakTree key={`vt-${i}`} x={x} y={y} scale={0.4 + rand() * 0.3} />);
  }

  return <>{trees}</>;
}

function ScatteredRocks() {
  const rand = seeded(99);
  const rocks: JSX.Element[] = [];

  // Mountain rocks (top-right)
  for (let i = 0; i < 10; i++) {
    const x = 400 + rand() * 260;
    const y = 20 + rand() * 150;
    const distToBattle = Math.hypot(x - toScreen(12, 3).x, y - toScreen(12, 3).y);
    if (distToBattle < 55) continue;
    rocks.push(<Rock key={`mr-${i}`} x={x} y={y} scale={0.6 + rand() * 0.8} />);
  }

  // Cave area rocks
  for (let i = 0; i < 6; i++) {
    const x = 30 + rand() * 200;
    const y = 280 + rand() * 140;
    const distToStories = Math.hypot(x - toScreen(4, 9).x, y - toScreen(4, 9).y);
    if (distToStories < 50) continue;
    rocks.push(<Rock key={`cr-${i}`} x={x} y={y} scale={0.5 + rand() * 0.6} />);
  }

  return <>{rocks}</>;
}

function ScatteredMushrooms() {
  const rand = seeded(77);
  const items: JSX.Element[] = [];
  for (let i = 0; i < 5; i++) {
    const x = 40 + rand() * 190;
    const y = 290 + rand() * 120;
    const distToStories = Math.hypot(x - toScreen(4, 9).x, y - toScreen(4, 9).y);
    if (distToStories < 50) continue;
    items.push(<Mushrooms key={`ms-${i}`} x={x} y={y} />);
  }
  return <>{items}</>;
}

// Grass tufts for the forest region
function GrassTufts() {
  const rand = seeded(123);
  const tufts: JSX.Element[] = [];
  for (let i = 0; i < 20; i++) {
    const x = 10 + rand() * 260;
    const y = 20 + rand() * 180;
    const h = 3 + rand() * 4;
    tufts.push(
      <g key={`gt-${i}`} transform={`translate(${x},${y})`} opacity={0.3 + rand() * 0.3}>
        <line x1="-2" y1="0" x2="-3" y2={-h} stroke="#5aaa48" strokeWidth="1" strokeLinecap="round" />
        <line x1="0" y1="0" x2="0" y2={-h - 1} stroke="#4a9a3a" strokeWidth="1" strokeLinecap="round" />
        <line x1="2" y1="0" x2="3" y2={-h} stroke="#5aaa48" strokeWidth="1" strokeLinecap="round" />
      </g>
    );
  }
  return <>{tufts}</>;
}

// =========================================================
//  Main Component
// =========================================================

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

  // Road paths
  const pathElements = useMemo(() => {
    return GAMEMODE_PATHS.map((path) => {
      const toStatus = locationStatuses[path.to];
      const isLocked = toStatus === 'locked';
      const d = buildCurvedPath(path.waypoints);

      return (
        <g key={`${path.from}-${path.to}`}>
          {/* Road shadow */}
          <path d={d} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="14" strokeLinecap="round" />
          {/* Road base */}
          <path
            d={d}
            fill="none"
            stroke={isLocked ? 'rgba(80,70,60,0.25)' : '#6a5838'}
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Road surface */}
          <path
            d={d}
            fill="none"
            stroke={isLocked ? 'rgba(100,90,70,0.2)' : '#8a7448'}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Road center line (dashes) */}
          <path
            d={d}
            fill="none"
            stroke={isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,200,0.15)'}
            strokeWidth="1"
            strokeDasharray="6 8"
            strokeLinecap="round"
            className={!isLocked ? styles.pathAnimated : undefined}
          />
          {/* Traveling light on active paths */}
          {!isLocked && (
            <circle r="3.5" fill="rgba(255,230,150,0.5)" className={styles.pathDot}>
              <animateMotion dur="4s" repeatCount="indefinite" path={d} />
            </circle>
          )}
        </g>
      );
    });
  }, [locationStatuses]);

  // Location structure buildings & interactive markers
  const locationElements = useMemo(() => {
    // Map each location to its illustrated structure
    const structureMap: Record<string, (pos: { x: number; y: number }) => JSX.Element> = {
      hub: (pos) => (
        <g>
          <Hut x={pos.x} y={pos.y} />
          <Campfire x={pos.x + 28} y={pos.y + 4} />
        </g>
      ),
      solo: (pos) => <Treehouse x={pos.x} y={pos.y} />,
      battle: (pos) => <Tower x={pos.x} y={pos.y} />,
      arena: (pos) => <Colosseum x={pos.x} y={pos.y} />,
      stories: (pos) => <CaveEntrance x={pos.x} y={pos.y} />,
    };

    return GAMEMODE_LOCATIONS.map((location) => {
      const pos = toScreen(location.mapX, location.mapY);
      const status = locationStatuses[location.id];
      const isHovered = hoveredLocation === location.id;
      const name = locale === 'en' ? location.nameEn : location.name;
      const Structure = structureMap[location.id];

      return (
        <g
          key={location.id}
          className={`${styles.locationNode} ${styles[`status_${status}`]}`}
          onClick={() => handleClick(location, status)}
          onMouseEnter={() => { if (location.action !== 'hub') setHoveredLocation(location.id); }}
          onMouseLeave={() => setHoveredLocation(null)}
          style={{ cursor: status === 'locked' ? 'not-allowed' : location.action === 'hub' ? 'default' : 'pointer' }}
        >
          {/* Locked overlay for whole structure */}
          {status === 'locked' && (
            <g filter="url(#lockedGrayscale)" opacity="0.35">
              {Structure && Structure(pos)}
            </g>
          )}
          {status !== 'locked' && Structure && Structure(pos)}

          {/* Hover glow ring around the structure */}
          {status !== 'locked' && (
            <circle
              cx={pos.x}
              cy={pos.y - 8}
              r={isHovered ? 42 : 36}
              fill="none"
              stroke={location.accentColor}
              strokeWidth={isHovered ? 2 : 1}
              opacity={isHovered ? 0.5 : 0.12}
              className={status === 'available' ? styles.pulseRing : undefined}
            />
          )}

          {/* Location name plate */}
          <g transform={`translate(${pos.x},${pos.y + 18})`}>
            {/* Name plate background */}
            <rect
              x="-36"
              y="-2"
              width="72"
              height="16"
              rx="8"
              fill={isHovered ? 'rgba(10,8,20,0.85)' : 'rgba(10,8,20,0.65)'}
              stroke={isHovered ? location.accentColor : 'rgba(255,255,255,0.08)'}
              strokeWidth={isHovered ? 1 : 0.5}
            />
            <text
              x="0"
              y="10.5"
              textAnchor="middle"
              fill={status === 'locked' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)'}
              fontSize="8"
              fontFamily="var(--font-theme-body, 'Inter'), sans-serif"
              fontWeight="600"
              letterSpacing="0.05em"
              style={{ pointerEvents: 'none' }}
            >
              {name}
            </text>
          </g>

          {/* Lock icon for locked locations */}
          {status === 'locked' && (
            <g transform={`translate(${pos.x},${pos.y - 14})`}>
              <circle cx="0" cy="0" r="12" fill="rgba(10,8,20,0.8)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <svg x="-6" y="-7" width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </g>
          )}

          {/* Online count badge */}
          {(location.action === 'multiplayer' || location.action === 'arena') && onlineCount > 0 && status !== 'locked' && (
            <g transform={`translate(${pos.x + 26},${pos.y - 30})`}>
              <rect x="-14" y="-8" width="28" height="16" rx="8" fill="rgba(10,10,20,0.9)" stroke="rgba(76,175,80,0.5)" strokeWidth="1" />
              <circle cx="-5" cy="0" r="2.5" fill="#4CAF50" className={styles.onlineDot} />
              <text x="5" y="3.5" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="9" fontFamily="var(--font-theme-mono, monospace)" fontWeight="600">
                {onlineCount}
              </text>
            </g>
          )}
        </g>
      );
    });
  }, [locationStatuses, hoveredLocation, locale, handleClick, onlineCount]);

  const hoveredLoc = hoveredLocation
    ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation)
    : null;

  return (
    <motion.div
      className={styles.mapWrapper}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Ambient light overlay (HTML layer) */}
      <div className={styles.ambientLight} />
      <div className={styles.vignetteOverlay} />

      {/* Main SVG map */}
      <svg
        className={styles.mapSvg}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Atmospheric gradient applied over everything */}
          <linearGradient id="atmosphericFog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a6080" stopOpacity="0.15" />
            <stop offset="50%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="#2a1a30" stopOpacity="0.2" />
          </linearGradient>

          {/* Top-down light source */}
          <radialGradient id="topLight" cx="45%" cy="35%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,230,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Greyscale filter for locked structures */}
          <filter id="lockedGrayscale">
            <feColorMatrix type="saturate" values="0.1" />
          </filter>

          {/* Soft shadow filter */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Layer 0: Ground regions */}
        <GroundRegions />

        {/* Layer 1: River */}
        <RiverBody />

        {/* Layer 2: Scattered background decorations */}
        <g className={styles.decorLayer}>
          <GrassTufts />
          <ScatteredRocks />
          <ScatteredMushrooms />
        </g>

        {/* Layer 3: Trees (mid-ground, behind locations) */}
        <g className={styles.decorLayer}>
          <ScatteredTrees />
        </g>

        {/* Layer 4: Mountain range in top-right */}
        <Mountain x={580} y={90} w={90} h={80} color="#505868" />
        <Mountain x={510} y={110} w={70} h={60} color="#4a5260" />
        <Mountain x={640} y={70} w={60} h={55} color="#585e6a" />
        <Mountain x={460} y={130} w={50} h={40} color="#4a5260" />

        {/* Layer 5: Road paths */}
        <g className={styles.pathLayer}>
          {pathElements}
        </g>

        {/* Layer 6: Location structures & markers */}
        <g className={styles.locationLayer}>
          {locationElements}
        </g>

        {/* Layer 7: Atmospheric overlays */}
        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#atmosphericFog)" />
        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#topLight)" />
      </svg>

      {/* Info panel */}
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
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className={styles.infoPanelAccent} style={{ background: hoveredLoc.accentColor }} />
              <div className={styles.infoPanelContent}>
                <div className={styles.infoPanelHeader}>
                  <span className={styles.infoIcon}>{hoveredLoc.icon}</span>
                  <span className={styles.infoName}>{name}</span>
                  {status === 'available' && (
                    <span className={styles.infoPlayBadge} style={{ color: hoveredLoc.accentColor, borderColor: `${hoveredLoc.accentColor}40` }}>
                      {locale === 'en' ? 'PLAY' : 'プレイ'}
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
