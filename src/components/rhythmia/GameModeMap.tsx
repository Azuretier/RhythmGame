'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Html } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import type { GameModeLocation, GameModeStatus } from '@/data/gamemode-map';
import {
  GAMEMODE_LOCATIONS, GAMEMODE_PATHS, GAMEMODE_TERRAIN,
  GAMEMODE_MAP_WIDTH, GAMEMODE_MAP_HEIGHT,
  getGameModeStatus,
} from '@/data/gamemode-map';
import styles from './gameModeMap.module.css';

// ────────────────────────────────────────────
// Noise helpers (deterministic)
// ────────────────────────────────────────────

function noise2D(x: number, z: number, seed: number): number {
  let s = (Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed) % 2147483647;
  if (s < 0) s += 2147483647;
  return s / 2147483647;
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const n00 = noise2D(ix, iz, seed), n10 = noise2D(ix + 1, iz, seed);
  const n01 = noise2D(ix, iz + 1, seed), n11 = noise2D(ix + 1, iz + 1, seed);
  return (n00 + sx * (n10 - n00)) + sz * ((n01 + sx * (n11 - n01)) - (n00 + sx * (n10 - n00)));
}

function fractalNoise(x: number, z: number, seed: number, octaves = 3): number {
  let v = 0, a = 1, f = 1, m = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * f, z * f, seed + i * 1000) * a;
    m += a; a *= 0.5; f *= 2;
  }
  return v / m;
}

// ────────────────────────────────────────────
// Warm biome palettes
// ────────────────────────────────────────────

type Pal = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

const BIOME: Record<string, Pal> = {
  grass:    { top: new THREE.Color('#7db044'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  dirt:     { top: new THREE.Color('#b89060'), mid: new THREE.Color('#956e42'), deep: new THREE.Color('#7a5530') },
  stone:    { top: new THREE.Color('#8a8480'), mid: new THREE.Color('#706860'), deep: new THREE.Color('#585048') },
  water:    { top: new THREE.Color('#4a7888'), mid: new THREE.Color('#3a6070'), deep: new THREE.Color('#2a4858') },
  sand:     { top: new THREE.Color('#d8c088'), mid: new THREE.Color('#bca068'), deep: new THREE.Color('#a08850') },
  snow:     { top: new THREE.Color('#eaecf0'), mid: new THREE.Color('#ccd0d8'), deep: new THREE.Color('#a8aab4') },
  path:     { top: new THREE.Color('#c8a868'), mid: new THREE.Color('#a88848'), deep: new THREE.Color('#886830') },
  bridge:   { top: new THREE.Color('#8a6030'), mid: new THREE.Color('#6a4820'), deep: new THREE.Color('#503818') },
  tree:     { top: new THREE.Color('#2a6818'), mid: new THREE.Color('#1e5010'), deep: new THREE.Color('#3a5820') },
  flower:   { top: new THREE.Color('#e87830'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  rock:     { top: new THREE.Color('#5a5450'), mid: new THREE.Color('#484240'), deep: new THREE.Color('#383430') },
  mushroom: { top: new THREE.Color('#c04030'), mid: new THREE.Color('#6a4838'), deep: new THREE.Color('#4a3828') },
  lava:     { top: new THREE.Color('#e86830'), mid: new THREE.Color('#c04018'), deep: new THREE.Color('#703020') },
  void:     { top: new THREE.Color('#181418'), mid: new THREE.Color('#100e12'), deep: new THREE.Color('#080608') },
};

function getPal(t: string): Pal { return BIOME[t] || BIOME.grass; }

function layerColor(y: number, maxY: number, p: Pal): THREE.Color {
  const t = maxY > 1 ? y / (maxY - 1) : 1;
  return t > 0.7 ? p.top.clone() : t > 0.3 ? p.mid.clone() : p.deep.clone();
}

// ────────────────────────────────────────────
// Terrain height — MASSIVE Dungeons-scale
// ────────────────────────────────────────────

const SEED = 12345;
interface VB { x: number; y: number; z: number; color: THREE.Color }

function terrainHeight(tile: { x: number; y: number; terrain: string; elevation: number }): number {
  const n = fractalNoise(tile.x * 0.1, tile.y * 0.1, SEED, 4);

  switch (tile.terrain) {
    case 'water': return 1;
    case 'sand': return 2 + Math.floor(n * 1.5);
    case 'snow':
      return Math.max(6, 10 + tile.elevation * 4 + Math.floor(n * 4));
    case 'stone': case 'rock':
      return Math.max(5, 8 + tile.elevation * 4 + Math.floor(n * 5));
    case 'lava':
      return Math.max(5, 8 + tile.elevation * 3 + Math.floor(n * 3));
    case 'tree':
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 3));
    case 'mushroom':
      return Math.max(3, 3 + Math.floor(n * 2));
    case 'dirt':
      return Math.max(3, 3 + tile.elevation + Math.floor(n * 2));
    case 'path': case 'bridge':
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 2));
    default:
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 3));
  }
}

// Fast lookup
const tileMap = new Map<string, { x: number; y: number; terrain: string; elevation: number }>();
for (const t of GAMEMODE_TERRAIN) { tileMap.set(`${t.x},${t.y}`, t); }

function heightAt(x: number, y: number): number {
  const tile = tileMap.get(`${x},${y}`);
  return tile ? terrainHeight(tile) : 3;
}

// ────────────────────────────────────────────
// Tree types by biome
// ────────────────────────────────────────────

type TT = 'oak' | 'spruce' | 'autumn' | 'dead';

function treeType(x: number, y: number): TT {
  const nx = (x - GAMEMODE_MAP_WIDTH / 2) / (GAMEMODE_MAP_WIDTH / 2);
  const ny = (y - GAMEMODE_MAP_HEIGHT / 2) / (GAMEMODE_MAP_HEIGHT / 2);
  // Creeper Woods (NW): dark spruce forest
  if (nx < -0.1 && ny < 0.1 && ny > -0.55) return 'spruce';
  // Soggy Swamp (SW): dead trees
  if (nx < 0.05 && ny > 0.25) return 'dead';
  // Pumpkin Pastures (center): autumn/oak mix
  if (ny > 0.0 && ny < 0.35 && nx > -0.2 && nx < 0.3) {
    return noise2D(x * 5, y * 5, SEED + 2222) > 0.4 ? 'autumn' : 'oak';
  }
  // Highblock Halls / cold areas: spruce
  if (ny < -0.15) return 'spruce';
  return 'oak';
}

// ────────────────────────────────────────────
// Structure generators
// ────────────────────────────────────────────

const C = (hex: string) => new THREE.Color(hex);

function mkHut(bx: number, by: number, bz: number): VB[] {
  const b: VB[] = [];
  const w = '#8a6030', d = '#5a3818';
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    b.push({ x: bx + dx, y: by, z: bz + dz, color: C(d) });
    if (Math.abs(dx) === 1 || Math.abs(dz) === 1) {
      b.push({ x: bx + dx, y: by + 1, z: bz + dz, color: C(w) });
      b.push({ x: bx + dx, y: by + 2, z: bz + dz, color: C(w) });
    }
    b.push({ x: bx + dx, y: by + 3, z: bz + dz, color: C(d) });
  }
  b.push({ x: bx, y: by + 4, z: bz, color: C(d) });
  return b;
}

function mkTower(bx: number, by: number, bz: number, h: number): VB[] {
  const b: VB[] = [];
  const s = '#7a7870', ds = '#5a5850';
  for (let dy = 0; dy < h; dy++) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dy > 0 && dy < h - 1 && dx === 0 && dz === 0) continue;
      b.push({ x: bx + dx, y: by + dy, z: bz + dz, color: C(dy < h - 1 ? s : ds) });
    }
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    b.push({ x: bx + dx, y: by + h, z: bz + dz, color: C(s) });
  }
  b.push({ x: bx, y: by + h, z: bz, color: C(ds) });
  b.push({ x: bx, y: by + h + 1, z: bz, color: C('#cc3333') });
  return b;
}

function mkCastle(bx: number, by: number, bz: number): VB[] {
  const b: VB[] = [];
  const s = '#706860', ds = '#585048';
  // Walls
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (Math.abs(dx) < 3 && Math.abs(dz) < 3) continue; // only edges
    for (let dy = 0; dy < 5; dy++) {
      b.push({ x: bx + dx, y: by + dy, z: bz + dz, color: C(s) });
    }
  }
  // Corner towers (taller)
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as [number, number][]) {
    for (let dy = 5; dy < 9; dy++) {
      b.push({ x: bx + dx, y: by + dy, z: bz + dz, color: C(ds) });
    }
    b.push({ x: bx + dx, y: by + 9, z: bz + dz, color: C(s) });
  }
  // Central keep
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (let dy = 0; dy < 7; dy++) {
      b.push({ x: bx + dx, y: by + dy, z: bz + dz, color: C(dy < 6 ? ds : s) });
    }
  }
  return b;
}

function mkColosseum(bx: number, by: number, bz: number): VB[] {
  const b: VB[] = [];
  const s = '#c8a868', ds = '#a08040';
  for (let a = 0; a < 12; a++) {
    const dx = Math.round(Math.cos(a * Math.PI / 6) * 3);
    const dz = Math.round(Math.sin(a * Math.PI / 6) * 3);
    for (let dy = 0; dy < 5; dy++) {
      b.push({ x: bx + dx, y: by + dy, z: bz + dz, color: C(s) });
    }
    if (a % 3 === 0) {
      b.push({ x: bx + dx, y: by + 5, z: bz + dz, color: C(ds) });
      b.push({ x: bx + dx, y: by + 6, z: bz + dz, color: C(ds) });
    }
  }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    b.push({ x: bx + dx, y: by, z: bz + dz, color: C(ds) });
  }
  return b;
}

function mkRuins(bx: number, by: number, bz: number): VB[] {
  const b: VB[] = [];
  const s = '#6a6460', m = '#4a6838';
  // Broken archway
  for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) === 2) {
      for (let dy = 0; dy < 6; dy++) b.push({ x: bx + dx, y: by + dy, z: bz, color: C(dy > 4 ? m : s) });
    }
    if (Math.abs(dx) <= 1) b.push({ x: bx + dx, y: by + 5, z: bz, color: C(s) });
  }
  // Scattered rubble
  b.push({ x: bx - 1, y: by, z: bz + 1, color: C(s) });
  b.push({ x: bx + 1, y: by, z: bz - 1, color: C(m) });
  b.push({ x: bx + 2, y: by, z: bz + 2, color: C(s) });
  b.push({ x: bx - 2, y: by, z: bz - 1, color: C(s) });
  // Second broken pillar
  for (let dy = 0; dy < 3; dy++) b.push({ x: bx + 3, y: by + dy, z: bz - 2, color: C(s) });
  return b;
}

function mkCampfire(bx: number, by: number, bz: number): VB[] {
  const b: VB[] = [];
  b.push({ x: bx, y: by, z: bz, color: C('#e88520') });
  b.push({ x: bx, y: by + 1, z: bz, color: C('#f0a030') }); // flame tip
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    b.push({ x: bx + dx, y: by, z: bz + dz, color: C('#5a3818') });
  }
  return b;
}

// ────────────────────────────────────────────
// Voxel generation
// ────────────────────────────────────────────

function generateTerrainVoxels() {
  const blocks: VB[] = [];
  const hx = GAMEMODE_MAP_WIDTH / 2;
  const hz = GAMEMODE_MAP_HEIGHT / 2;

  for (const tile of GAMEMODE_TERRAIN) {
    if (tile.terrain === 'water') continue;
    const wx = tile.x - hx;
    const wz = tile.y - hz;
    const pal = getPal(tile.terrain);
    const h = terrainHeight(tile);

    // Stack terrain blocks
    for (let y = 0; y < h; y++) {
      const col = layerColor(y, h, pal);
      const cn = (noise2D(tile.x + y * 7, tile.y + y * 13, SEED + 500) - 0.5) * 0.06;
      col.r = Math.max(0, Math.min(1, col.r + cn));
      col.g = Math.max(0, Math.min(1, col.g + cn));
      col.b = Math.max(0, Math.min(1, col.b + cn));
      blocks.push({ x: wx, y, z: wz, color: col });
    }

    // ── TREES ──
    if (tile.terrain === 'tree') {
      const tt = treeType(tile.x, tile.y);
      const dn = smoothNoise(tile.x * 0.4, tile.y * 0.4, SEED + 300);

      if (tt === 'dead') {
        const tc = C('#4a3818');
        for (let ty = 0; ty < 2 + Math.floor(dn * 2); ty++) blocks.push({ x: wx, y: h + ty, z: wz, color: tc.clone() });
      } else if (tt === 'spruce') {
        const tc = C('#5a3818');
        const th = 3 + Math.floor(dn * 2);
        for (let ty = 0; ty < th; ty++) blocks.push({ x: wx, y: h + ty, z: wz, color: tc.clone() });
        const cb = h + th;
        const lc = C('#1a5528');
        // Tall triangular canopy
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (Math.abs(dx) + Math.abs(dz) <= 1) blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: lc.clone() });
        }
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: lc.clone() });
        }
        blocks.push({ x: wx, y: cb + 2, z: wz, color: lc.clone() });
        blocks.push({ x: wx, y: cb + 3, z: wz, color: lc.clone() });
      } else if (tt === 'autumn') {
        const tc = C('#6a4820');
        const th = 2 + Math.floor(dn * 2);
        for (let ty = 0; ty < th; ty++) blocks.push({ x: wx, y: h + ty, z: wz, color: tc.clone() });
        const cb = h + th;
        const lcs = [C('#cc6622'), C('#dd8833'), C('#bb4411'), C('#ee9944')];
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: lcs[Math.floor(noise2D(tile.x + dx * 3, tile.y + dz * 3, SEED + 444) * lcs.length)].clone() });
        }
        blocks.push({ x: wx, y: cb + 1, z: wz, color: lcs[0].clone() });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (noise2D(tile.x + dx * 2, tile.y + dz * 2, SEED + 555) > 0.4) blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: lcs[1].clone() });
        }
      } else {
        // Oak
        const tc = C('#6a4820');
        const th = 2 + Math.floor(dn * 2);
        for (let ty = 0; ty < th; ty++) blocks.push({ x: wx, y: h + ty, z: wz, color: tc.clone() });
        const cb = h + th;
        const lc = C('#2e7a20');
        const lv = noise2D(tile.x * 3, tile.y * 3, SEED + 999) * 0.08;
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          const c = lc.clone(); c.g += lv + (noise2D(tile.x + dx, tile.y + dz, SEED + 888) - 0.5) * 0.05;
          blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: c });
        }
        blocks.push({ x: wx, y: cb + 1, z: wz, color: lc.clone() });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (noise2D(tile.x + dx * 2, tile.y + dz * 2, SEED + 777) > 0.4) {
            const c = lc.clone(); c.g += (noise2D(tile.x + dx, tile.y + dz, SEED + 666) - 0.5) * 0.06;
            blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: c });
          }
        }
      }
    }

    // Mushroom
    if (tile.terrain === 'mushroom') {
      blocks.push({ x: wx, y: h, z: wz, color: C('#e8dcc0') });
      blocks.push({ x: wx, y: h + 1, z: wz, color: C('#c04030') });
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        if (noise2D(tile.x + dx, tile.y + dz, SEED + 444) > 0.5) blocks.push({ x: wx + dx, y: h + 1, z: wz + dz, color: C('#b83828') });
      }
    }

    // Flowers
    if (tile.terrain === 'flower') {
      const fc = [C('#e06878'), C('#e0c040'), C('#8060d0'), C('#e08840')];
      blocks.push({ x: wx, y: h, z: wz, color: fc[Math.floor(noise2D(tile.x, tile.y, SEED + 333) * fc.length)] });
    }

    // Lava glow blocks on top
    if (tile.terrain === 'lava') {
      const glowCol = C('#ff8040');
      glowCol.r += (noise2D(tile.x * 2, tile.y * 2, SEED + 111) - 0.5) * 0.15;
      blocks.push({ x: wx, y: h, z: wz, color: glowCol });
    }
  }

  // ── WATERFALLS ──
  for (const tile of GAMEMODE_TERRAIN) {
    if (tile.terrain !== 'water') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const nb = tileMap.get(`${tile.x + dx},${tile.y + dy}`);
      if (nb && nb.terrain !== 'water') {
        const nh = terrainHeight(nb);
        if (nh > 5) {
          const wc = C('#6a98b0');
          const wx = tile.x - hx, wz = tile.y - hz;
          for (let y = 2; y < nh; y++) {
            const c = wc.clone();
            c.b += (noise2D(tile.x + y, tile.y + y, SEED + 555) - 0.5) * 0.06;
            blocks.push({ x: wx, y, z: wz, color: c });
          }
        }
      }
    }
  }

  // ── STRUCTURES ──
  for (const loc of GAMEMODE_LOCATIONS) {
    const bx = loc.mapX - hx, bz = loc.mapY - hz;
    const by = heightAt(loc.mapX, loc.mapY);
    switch (loc.action) {
      case 'hub':
        // Pumpkin Pastures camp village
        blocks.push(...mkCampfire(bx, by, bz));
        blocks.push(...mkHut(bx - 3, by, bz - 2));
        blocks.push(...mkHut(bx + 3, by, bz + 1));
        blocks.push(...mkHut(bx - 2, by, bz + 3));
        break;
      case 'vanilla':
        // Creeper Woods crypt entrance
        blocks.push(...mkHut(bx, by, bz));
        blocks.push(...mkTower(bx + 3, by, bz - 2, 4));
        break;
      case 'multiplayer':
        // Highblock Halls castle
        blocks.push(...mkCastle(bx, by, bz));
        break;
      case 'arena':
        // Cacti Canyon colosseum
        blocks.push(...mkColosseum(bx, by, bz));
        break;
      case 'stories':
        // Soggy Swamp ruins
        blocks.push(...mkRuins(bx, by, bz));
        break;
    }
  }

  // Biome-themed scattered structures
  const extraBuildings: [number, number, string][] = [
    // Creeper Woods area: forest huts
    [8, 10, 'hut'], [12, 16, 'hut'],
    // Pumpkin Pastures: village buildings
    [20, 26, 'hut'], [25, 22, 'hut'],
    // Highblock Halls: castle towers
    [36, 8, 'tower'], [40, 12, 'tower'],
    // Desert Temple: pillars
    [34, 18, 'tower'], [38, 16, 'tower'],
    // Soggy Swamp: ruined outposts
    [8, 30, 'hut'], [14, 26, 'hut'],
    // Redstone Mines entrance
    [24, 18, 'tower'],
  ];
  for (const [ex, ey, type] of extraBuildings) {
    const t = tileMap.get(`${ex},${ey}`);
    if (t && t.terrain !== 'water') {
      const bx = ex - hx, bz = ey - hz, by = terrainHeight(t);
      if (type === 'hut') blocks.push(...mkHut(bx, by, bz));
      else blocks.push(...mkTower(bx, by, bz, 5));
    }
  }

  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  blocks.forEach((b, i) => {
    positions[i * 3] = b.x; positions[i * 3 + 1] = b.y; positions[i * 3 + 2] = b.z;
    colors[i * 3] = b.color.r; colors[i * 3 + 1] = b.color.g; colors[i * 3 + 2] = b.color.b;
  });
  return { positions, colors, count };
}

// Path blocks
function generateTrackVoxels(statuses: Record<string, GameModeStatus>) {
  const blocks: VB[] = [];
  const hx = GAMEMODE_MAP_WIDTH / 2, hz = GAMEMODE_MAP_HEIGHT / 2;

  for (const path of GAMEMODE_PATHS) {
    const isActive = statuses[path.to] !== 'locked';
    const col = isActive ? C('#e8c878') : C('#c8a060');
    for (const wp of path.waypoints) {
      const c = col.clone();
      const cn = (noise2D(wp.x * 3, wp.y * 3, SEED + 700) - 0.5) * 0.05;
      c.r = Math.max(0, Math.min(1, c.r + cn));
      c.g = Math.max(0, Math.min(1, c.g + cn));
      blocks.push({ x: wp.x - hx, y: heightAt(wp.x, wp.y), z: wp.y - hz, color: c });
    }
  }

  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  blocks.forEach((b, i) => {
    positions[i * 3] = b.x; positions[i * 3 + 1] = b.y; positions[i * 3 + 2] = b.z;
    colors[i * 3] = b.color.r; colors[i * 3 + 1] = b.color.g; colors[i * 3 + 2] = b.color.b;
  });
  return { positions, colors, count };
}

// ────────────────────────────────────────────
// Three.js components
// ────────────────────────────────────────────

function VoxelTerrain({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.96, 0.96, 0.96), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04, flatShading: true }), []);

  useEffect(() => {
    const m = ref.current; if (!m) return;
    m.raycast = () => {};
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < data.count; i++) {
      d.position.set(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]);
      d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      c.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  return <instancedMesh ref={ref} args={[geo, mat, data.count]} castShadow receiveShadow />;
}

function TrackBlocks({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.85, 0.35, 0.85), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05, flatShading: true }), []);

  useEffect(() => {
    const m = ref.current; if (!m) return;
    m.raycast = () => {};
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < data.count; i++) {
      d.position.set(data.positions[i * 3], data.positions[i * 3 + 1] + 0.15, data.positions[i * 3 + 2]);
      d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      c.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  return <instancedMesh ref={ref} args={[geo, mat, data.count]} />;
}

// Silver-gray water with subtle animation
function WaterPlane() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 0.4) * 0.03;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#8898a8" transparent opacity={0.55} roughness={0.25} metalness={0.08} />
    </mesh>
  );
}

// Island shadow on the water
function IslandShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.5, 2]}>
      <planeGeometry args={[42, 34]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.12} />
    </mesh>
  );
}

// Location beacon
function LocationBeacon({
  location, status, isHovered, locale,
  onClick, onHoverIn, onHoverOut, onlineCount,
}: {
  location: GameModeLocation; status: GameModeStatus; isHovered: boolean; locale: string;
  onClick: () => void; onHoverIn: () => void; onHoverOut: () => void; onlineCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hx = GAMEMODE_MAP_WIDTH / 2, hz = GAMEMODE_MAP_HEIGHT / 2;
  const wx = location.mapX - hx, wz = location.mapY - hz;
  const baseY = heightAt(location.mapX, location.mapY) + 1;
  const name = locale === 'en' ? location.nameEn : location.name;
  const accent = new THREE.Color(location.accentColor);

  const markerColor = status === 'locked' ? new THREE.Color(0.35, 0.35, 0.38) : status === 'completed' ? new THREE.Color(0.55, 0.42, 0.12) : accent;
  const emissive = status === 'locked' ? new THREE.Color(0, 0, 0) : status === 'completed' ? new THREE.Color(0.3, 0.25, 0.08) : accent;
  const emissiveIntensity = status === 'locked' ? 0 : isHovered ? 1.8 : 0.7;
  const scale = isHovered && status !== 'locked' ? 1.15 : 1;

  useFrame(({ clock }) => {
    if (groupRef.current && status !== 'locked') groupRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  const showOnline = (location.action === 'multiplayer' || location.action === 'arena') && onlineCount > 0 && status !== 'locked';

  return (
    <group
      position={[wx, baseY, wz]}
      onClick={(e) => { e.stopPropagation(); if (status !== 'locked' && location.action !== 'hub') onClick(); }}
      onPointerEnter={(e) => { e.stopPropagation(); if (location.action !== 'hub') onHoverIn(); }}
      onPointerLeave={(e) => { e.stopPropagation(); onHoverOut(); }}
    >
      <group ref={groupRef} scale={[scale, scale, scale]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial color={markerColor} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.3} metalness={0.2} flatShading />
        </mesh>
        {status !== 'locked' && <pointLight position={[0, 1.2, 0]} color={markerColor} intensity={isHovered ? 3.5 : 1.2} distance={8} />}
      </group>
      <Html position={[0, 2.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`${styles.locLabel} ${status === 'locked' ? styles.locLocked : ''} ${isHovered ? styles.locHovered : ''}`}>
          <div className={styles.locIconBadge} style={{ borderColor: status === 'locked' ? '#555' : location.accentColor }}>
            {status === 'locked' ? '🔒' : location.icon}
          </div>
          <div className={styles.locName}>{name}</div>
          {status === 'completed' && location.action === 'hub' && <div className={styles.locCheck}>✓</div>}
          {showOnline && <div className={styles.locOnline}><span className={styles.locOnlineDot} />{onlineCount}</div>}
        </div>
      </Html>
    </group>
  );
}

function CameraPan({ isDraggingRef }: { isDraggingRef: React.MutableRefObject<boolean> }) {
  const { camera, gl } = useThree();
  const pan = useRef({ x: 0, z: 0 });
  const drag = useRef({ active: false, sx: 0, sy: 0, px: 0, pz: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const getZoom = () => (camera as THREE.OrthographicCamera).zoom || 13;

    const onDown = (e: PointerEvent) => {
      drag.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.current.x, pz: pan.current.z };
      isDraggingRef.current = false;
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDraggingRef.current = true;
      const s = 0.075 / (getZoom() / 13);
      pan.current.x = d.px + (dx * 0.7 + dy * 0.4) * s;
      pan.current.z = d.pz + (-dx * 0.7 + dy * 0.4) * s;
    };
    const onUp = () => {
      drag.current.active = false;
      setTimeout(() => { isDraggingRef.current = false; }, 80);
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [camera, gl, isDraggingRef]);

  useFrame(() => {
    const p = pan.current;
    camera.position.set(30 + p.x, 38, 30 + p.z);
    camera.lookAt(0 + p.x, 6, 0 + p.z);
  });

  return null;
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────

interface GameModeMapProps {
  isArenaLocked: boolean;
  unlockedCount: number;
  requiredAdvancements: number;
  onlineCount: number;
  onSelectMode: (action: string) => void;
  locale: string;
}

export default function GameModeMap({
  isArenaLocked, unlockedCount, requiredAdvancements, onlineCount, onSelectMode, locale,
}: GameModeMapProps) {
  const t = useTranslations();
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const locationStatuses = useMemo(() => {
    const s: Record<string, GameModeStatus> = {};
    for (const loc of GAMEMODE_LOCATIONS) s[loc.id] = getGameModeStatus(loc.id, unlockedCount);
    return s;
  }, [unlockedCount]);

  const terrainData = useMemo(() => generateTerrainVoxels(), []);
  const trackData = useMemo(() => generateTrackVoxels(locationStatuses), [locationStatuses]);
  const hoveredLoc = hoveredLocation ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation) : null;

  return (
    <div className={styles.mapWrapper}>
      <Canvas shadows gl={{ antialias: true, alpha: false }} style={{ position: 'absolute', inset: 0 }}>
        {/* Warm parchment background */}
        <color attach="background" args={['#d5c4a8']} />
        <CameraPan isDraggingRef={isDraggingRef} />
        <OrthographicCamera makeDefault position={[30, 38, 30]} zoom={13} near={0.1} far={250} />

        {/* Warm golden lighting */}
        <ambientLight intensity={1.5} color="#fff8ee" />
        <hemisphereLight args={['#ffeedd', '#778866', 0.6]} />
        <directionalLight
          position={[20, 45, 15]}
          intensity={2.6}
          color="#fff2d8"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={120}
          shadow-camera-left={-35}
          shadow-camera-right={35}
          shadow-camera-top={35}
          shadow-camera-bottom={-35}
        />
        <directionalLight position={[-15, 20, -8]} intensity={0.4} color="#ffd0a0" />

        {/* Ocean floor (parchment tint visible through water) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#c8b898" roughness={1} />
        </mesh>

        {/* Island shadow */}
        <IslandShadow />

        {/* Water surface */}
        <WaterPlane />

        {/* Terrain */}
        <VoxelTerrain data={terrainData} />
        <TrackBlocks data={trackData} />

        {/* Location beacons */}
        {GAMEMODE_LOCATIONS.map((loc) => (
          <LocationBeacon
            key={loc.id}
            location={loc}
            status={locationStatuses[loc.id]}
            isHovered={hoveredLocation === loc.id}
            locale={locale}
            onlineCount={onlineCount}
            onClick={() => { if (!isDraggingRef.current && locationStatuses[loc.id] !== 'locked' && loc.action !== 'hub') onSelectMode(loc.action); }}
            onHoverIn={() => { if (loc.action !== 'hub') setHoveredLocation(loc.id); }}
            onHoverOut={() => setHoveredLocation(null)}
          />
        ))}
      </Canvas>

      {/* Info panel */}
      {hoveredLoc && (() => {
        const status = locationStatuses[hoveredLoc.id];
        const name = locale === 'en' ? hoveredLoc.nameEn : hoveredLoc.name;
        const desc = locale === 'en' ? hoveredLoc.descriptionEn : hoveredLoc.description;
        return (
          <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
              <span className={styles.infoIcon}>{hoveredLoc.icon}</span>
              <span className={styles.infoName} style={{ color: hoveredLoc.accentColor }}>{name}</span>
              {status === 'available' && <span className={styles.infoPlayBadge}>{locale === 'en' ? 'PLAY' : 'プレイ'}</span>}
            </div>
            <div className={styles.infoDesc}>{desc}</div>
            {hoveredLoc.features.length > 0 && (
              <div className={styles.infoFeatures}>
                {hoveredLoc.features.map((f, i) => <span key={i} className={styles.infoTag}>{locale === 'en' ? f.labelEn : f.label}</span>)}
              </div>
            )}
            {hoveredLoc.stats.length > 0 && (
              <div className={styles.infoStats}>
                {hoveredLoc.stats.map((s, i) => (
                  <div key={i} className={styles.infoStatItem}>
                    <div className={styles.infoStatVal}>{s.value}</div>
                    <div className={styles.infoStatLabel}>{locale === 'en' ? s.labelEn : s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {status === 'locked' && (
              <div className={styles.infoLocked}>🔒 {t('advancements.lockMessage', { current: unlockedCount, required: requiredAdvancements })}</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
