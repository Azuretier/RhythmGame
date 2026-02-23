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

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function noise2D(x: number, z: number, seed: number): number {
  const r = seededRandom(Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed);
  return r();
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
// Minecraft Dungeons warm biome palettes
// ────────────────────────────────────────────

type BiomePalette = { top: THREE.Color; mid: THREE.Color; deep: THREE.Color };

const BIOME: Record<string, BiomePalette> = {
  grass:    { top: new THREE.Color('#7db044'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  dirt:     { top: new THREE.Color('#b89060'), mid: new THREE.Color('#956e42'), deep: new THREE.Color('#7a5530') },
  stone:    { top: new THREE.Color('#8a8890'), mid: new THREE.Color('#6a6870'), deep: new THREE.Color('#504e56') },
  water:    { top: new THREE.Color('#4a90c8'), mid: new THREE.Color('#3570a0'), deep: new THREE.Color('#2a5580') },
  sand:     { top: new THREE.Color('#d8c088'), mid: new THREE.Color('#bca068'), deep: new THREE.Color('#a08850') },
  snow:     { top: new THREE.Color('#e8eaf0'), mid: new THREE.Color('#c8ccd8'), deep: new THREE.Color('#a0a4b0') },
  path:     { top: new THREE.Color('#c8a868'), mid: new THREE.Color('#a88848'), deep: new THREE.Color('#886830') },
  bridge:   { top: new THREE.Color('#8a6030'), mid: new THREE.Color('#6a4820'), deep: new THREE.Color('#503818') },
  tree:     { top: new THREE.Color('#3a7828'), mid: new THREE.Color('#2e6020'), deep: new THREE.Color('#4a6828') },
  flower:   { top: new THREE.Color('#d06878'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  rock:     { top: new THREE.Color('#6a6870'), mid: new THREE.Color('#585660'), deep: new THREE.Color('#484650') },
  mushroom: { top: new THREE.Color('#c04030'), mid: new THREE.Color('#5e8a32'), deep: new THREE.Color('#4a6828') },
  lava:     { top: new THREE.Color('#e85020'), mid: new THREE.Color('#c03810'), deep: new THREE.Color('#802808') },
  void:     { top: new THREE.Color('#181418'), mid: new THREE.Color('#100e12'), deep: new THREE.Color('#080608') },
};

function getPalette(t: string): BiomePalette { return BIOME[t] || BIOME.grass; }

function colorForLayer(y: number, maxY: number, pal: BiomePalette): THREE.Color {
  const t = maxY > 1 ? y / (maxY - 1) : 1;
  if (t > 0.7) return pal.top.clone();
  if (t > 0.3) return pal.mid.clone();
  return pal.deep.clone();
}

// ────────────────────────────────────────────
// Terrain height — dramatic Dungeons-style
// ────────────────────────────────────────────

const SEED = 12345;

interface VoxelBlock { x: number; y: number; z: number; color: THREE.Color }

function terrainHeight(tile: { x: number; y: number; terrain: string; elevation: number }): number {
  const n = fractalNoise(tile.x * 0.12, tile.y * 0.12, SEED, 4);

  switch (tile.terrain) {
    case 'water':
      return 1;
    case 'sand':
      return 2 + Math.floor(n * 1.5);
    case 'snow':
      return Math.max(5, 8 + tile.elevation * 2 + Math.floor(n * 5));
    case 'stone': case 'rock':
      return Math.max(4, 7 + tile.elevation * 2 + Math.floor(n * 5));
    case 'tree':
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 3));
    case 'mushroom':
      return Math.max(3, 3 + Math.floor(n * 2));
    case 'dirt':
      return Math.max(3, 3 + tile.elevation + Math.floor(n * 2));
    case 'path': case 'bridge':
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 2));
    case 'lava':
      return Math.max(3, 5 + Math.floor(n * 3));
    default:
      return Math.max(3, 4 + tile.elevation + Math.floor(n * 3));
  }
}

// Fast lookup map for tile heights
const tileMap = new Map<string, { x: number; y: number; terrain: string; elevation: number }>();
for (const t of GAMEMODE_TERRAIN) { tileMap.set(`${t.x},${t.y}`, t); }

function heightAt(x: number, y: number): number {
  const tile = tileMap.get(`${x},${y}`);
  return tile ? terrainHeight(tile) : 3;
}

// ────────────────────────────────────────────
// Tree type determination by biome/position
// ────────────────────────────────────────────

type TreeType = 'oak' | 'spruce' | 'autumn' | 'dead';

function getTreeType(x: number, y: number): TreeType {
  const nx = (x - GAMEMODE_MAP_WIDTH / 2) / (GAMEMODE_MAP_WIDTH / 2);
  const ny = (y - GAMEMODE_MAP_HEIGHT / 2) / (GAMEMODE_MAP_HEIGHT / 2);

  // Near mountains / north → spruce
  if (ny < -0.1 || (nx > 0.1 && ny < 0.2)) return 'spruce';
  // Southwest swamp → dead
  if (nx < -0.1 && ny > 0.3) return 'dead';
  // Center → mix of autumn and oak
  if (Math.abs(nx) < 0.3 && ny > -0.1) {
    return noise2D(x * 5, y * 5, SEED + 2222) > 0.5 ? 'autumn' : 'oak';
  }
  return 'oak';
}

// ────────────────────────────────────────────
// Structure generators
// ────────────────────────────────────────────

function generateHut(bx: number, by: number, bz: number): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const wood = new THREE.Color('#8a6030');
  const darkWood = new THREE.Color('#5a3818');

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      blocks.push({ x: bx + dx, y: by, z: bz + dz, color: darkWood.clone() });
      if (Math.abs(dx) === 1 || Math.abs(dz) === 1) {
        blocks.push({ x: bx + dx, y: by + 1, z: bz + dz, color: wood.clone() });
        blocks.push({ x: bx + dx, y: by + 2, z: bz + dz, color: wood.clone() });
      }
      blocks.push({ x: bx + dx, y: by + 3, z: bz + dz, color: darkWood.clone() });
    }
  }
  // Peaked roof
  blocks.push({ x: bx, y: by + 4, z: bz, color: darkWood.clone() });
  return blocks;
}

function generateTower(bx: number, by: number, bz: number): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const stone = new THREE.Color('#7a7880');
  const darkStone = new THREE.Color('#5a5860');

  for (let dy = 0; dy < 7; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dy > 0 && dy < 6 && dx === 0 && dz === 0) continue;
        blocks.push({ x: bx + dx, y: by + dy, z: bz + dz, color: dy < 6 ? stone.clone() : darkStone.clone() });
      }
    }
  }
  // Battlements at corners
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    blocks.push({ x: bx + dx, y: by + 7, z: bz + dz, color: stone.clone() });
  }
  // Flag pole
  blocks.push({ x: bx, y: by + 7, z: bz, color: darkStone.clone() });
  blocks.push({ x: bx, y: by + 8, z: bz, color: new THREE.Color('#cc3333') });
  return blocks;
}

function generateColosseum(bx: number, by: number, bz: number): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const sand = new THREE.Color('#c8a868');
  const darkSand = new THREE.Color('#a08040');

  // Ring of pillars
  for (let angle = 0; angle < 8; angle++) {
    const dx = Math.round(Math.cos(angle * Math.PI / 4) * 2.5);
    const dz = Math.round(Math.sin(angle * Math.PI / 4) * 2.5);
    for (let dy = 0; dy < 4; dy++) {
      blocks.push({ x: bx + dx, y: by + dy, z: bz + dz, color: sand.clone() });
    }
    if (angle % 2 === 0) {
      blocks.push({ x: bx + dx, y: by + 4, z: bz + dz, color: darkSand.clone() });
    }
  }
  // Floor
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      blocks.push({ x: bx + dx, y: by, z: bz + dz, color: darkSand.clone() });
    }
  }
  return blocks;
}

function generateRuins(bx: number, by: number, bz: number): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const stone = new THREE.Color('#6a6870');
  const moss = new THREE.Color('#4a6838');

  // Broken archway
  for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) === 2) {
      for (let dy = 0; dy < 5; dy++) {
        blocks.push({ x: bx + dx, y: by + dy, z: bz, color: dy > 3 ? moss.clone() : stone.clone() });
      }
    }
    if (Math.abs(dx) <= 1) {
      blocks.push({ x: bx + dx, y: by + 4, z: bz, color: stone.clone() });
    }
  }
  // Rubble
  blocks.push({ x: bx - 1, y: by, z: bz + 1, color: stone.clone() });
  blocks.push({ x: bx + 1, y: by, z: bz - 1, color: moss.clone() });
  return blocks;
}

function generateCampfire(bx: number, by: number, bz: number): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const darkWood = new THREE.Color('#5a3818');
  const fire = new THREE.Color('#e88520');

  blocks.push({ x: bx, y: by, z: bz, color: fire });
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    blocks.push({ x: bx + dx, y: by, z: bz + dz, color: darkWood.clone() });
  }
  return blocks;
}

// ────────────────────────────────────────────
// Voxel generation — terrain + decorations + structures
// ────────────────────────────────────────────

function generateTerrainVoxels() {
  const blocks: VoxelBlock[] = [];
  const hx = GAMEMODE_MAP_WIDTH / 2;
  const hz = GAMEMODE_MAP_HEIGHT / 2;

  for (const tile of GAMEMODE_TERRAIN) {
    const wx = tile.x - hx;
    const wz = tile.y - hz;
    const pal = getPalette(tile.terrain);
    const h = terrainHeight(tile);

    // Skip water tiles — they'll be covered by the water plane
    if (tile.terrain === 'water') continue;

    // Stack terrain blocks
    for (let y = 0; y < h; y++) {
      const col = colorForLayer(y, h, pal);
      const cn = (noise2D(tile.x + y * 7, tile.y + y * 13, SEED + 500) - 0.5) * 0.06;
      col.r = Math.max(0, Math.min(1, col.r + cn));
      col.g = Math.max(0, Math.min(1, col.g + cn));
      col.b = Math.max(0, Math.min(1, col.b + cn));
      blocks.push({ x: wx, y, z: wz, color: col });
    }

    // ── TREES ──
    if (tile.terrain === 'tree') {
      const treeType = getTreeType(tile.x, tile.y);
      const dn = smoothNoise(tile.x * 0.4, tile.y * 0.4, SEED + 300);

      if (treeType === 'dead') {
        // Dead tree: just trunk
        const trunkCol = new THREE.Color('#4a3818');
        const trunkH = 2 + Math.floor(dn * 2);
        for (let ty = 0; ty < trunkH; ty++) {
          blocks.push({ x: wx, y: h + ty, z: wz, color: trunkCol.clone() });
        }
      } else if (treeType === 'spruce') {
        // Spruce: tall triangular shape, dark green
        const trunkCol = new THREE.Color('#5a3818');
        const trunkH = 3 + Math.floor(dn * 2);
        for (let ty = 0; ty < trunkH; ty++) {
          blocks.push({ x: wx, y: h + ty, z: wz, color: trunkCol.clone() });
        }
        const cb = h + trunkH;
        const leafCol = new THREE.Color('#1a5528');
        // Bottom layer: 3×3 cross
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
          if (Math.abs(dx) + Math.abs(dz) <= 1) {
            const lc = leafCol.clone();
            lc.g += (noise2D(tile.x + dx, tile.y + dz, SEED + 888) - 0.5) * 0.04;
            blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: lc });
          }
        }
        // Middle layer: cross
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          const lc = leafCol.clone();
          lc.g += 0.02;
          blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: lc });
        }
        // Top: just center
        blocks.push({ x: wx, y: cb + 2, z: wz, color: leafCol.clone() });
        blocks.push({ x: wx, y: cb + 3, z: wz, color: leafCol.clone() });
      } else if (treeType === 'autumn') {
        // Autumn: orange/red canopy
        const trunkCol = new THREE.Color('#6a4820');
        const trunkH = 2 + Math.floor(dn * 2);
        for (let ty = 0; ty < trunkH; ty++) {
          blocks.push({ x: wx, y: h + ty, z: wz, color: trunkCol.clone() });
        }
        const cb = h + trunkH;
        const leafColors = [new THREE.Color('#cc6622'), new THREE.Color('#dd8833'), new THREE.Color('#bb4411'), new THREE.Color('#ee9944')];
        // Lower canopy cross
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          const lc = leafColors[Math.floor(noise2D(tile.x + dx * 3, tile.y + dz * 3, SEED + 444) * leafColors.length)].clone();
          blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: lc });
        }
        // Upper canopy
        blocks.push({ x: wx, y: cb + 1, z: wz, color: leafColors[0].clone() });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (noise2D(tile.x + dx * 2, tile.y + dz * 2, SEED + 555) > 0.4) {
            blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: leafColors[1].clone() });
          }
        }
      } else {
        // Oak: standard green canopy
        const trunkCol = new THREE.Color('#6a4820');
        const trunkH = 2 + Math.floor(dn * 2);
        for (let ty = 0; ty < trunkH; ty++) {
          blocks.push({ x: wx, y: h + ty, z: wz, color: trunkCol.clone() });
        }
        const cb = h + trunkH;
        const leafCol = new THREE.Color('#2e7a20');
        const lv = noise2D(tile.x * 3, tile.y * 3, SEED + 999) * 0.08;
        // Lower canopy cross
        for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          const lc = leafCol.clone();
          lc.g += lv + (noise2D(tile.x + dx, tile.y + dz, SEED + 888) - 0.5) * 0.05;
          blocks.push({ x: wx + dx, y: cb, z: wz + dz, color: lc });
        }
        // Upper canopy
        blocks.push({ x: wx, y: cb + 1, z: wz, color: leafCol.clone() });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (noise2D(tile.x + dx * 2, tile.y + dz * 2, SEED + 777) > 0.4) {
            const lc = leafCol.clone();
            lc.g += (noise2D(tile.x + dx, tile.y + dz, SEED + 666) - 0.5) * 0.06;
            blocks.push({ x: wx + dx, y: cb + 1, z: wz + dz, color: lc });
          }
        }
      }
    }

    // ── MUSHROOM CAPS ──
    if (tile.terrain === 'mushroom') {
      blocks.push({ x: wx, y: h, z: wz, color: new THREE.Color('#e8dcc0') });
      blocks.push({ x: wx, y: h + 1, z: wz, color: new THREE.Color('#c04030') });
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        if (noise2D(tile.x + dx, tile.y + dz, SEED + 444) > 0.5) {
          blocks.push({ x: wx + dx, y: h + 1, z: wz + dz, color: new THREE.Color('#b83828') });
        }
      }
    }

    // ── FLOWERS ──
    if (tile.terrain === 'flower') {
      const fc = [new THREE.Color('#e06878'), new THREE.Color('#e0c040'), new THREE.Color('#8060d0'), new THREE.Color('#e08840')];
      blocks.push({ x: wx, y: h, z: wz, color: fc[Math.floor(noise2D(tile.x, tile.y, SEED + 333) * fc.length)] });
    }
  }

  // ── WATERFALLS ── (where river meets cliff edge)
  const waterCol = new THREE.Color('#4a90c8');
  for (const tile of GAMEMODE_TERRAIN) {
    if (tile.terrain !== 'water') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const nx = tile.x + dx, ny = tile.y + dy;
      const neighbor = tileMap.get(`${nx},${ny}`);
      if (neighbor && neighbor.terrain !== 'water') {
        const nh = terrainHeight(neighbor);
        if (nh > 4) {
          const wx = tile.x - hx;
          const wz = tile.y - hz;
          for (let y = 2; y < nh; y++) {
            const wc = waterCol.clone();
            wc.b += (noise2D(tile.x + y, tile.y + y, SEED + 555) - 0.5) * 0.08;
            wc.r += 0.02;
            blocks.push({ x: wx, y, z: wz, color: wc });
          }
        }
      }
    }
  }

  // ── STRUCTURES at locations ──
  for (const loc of GAMEMODE_LOCATIONS) {
    const bx = loc.mapX - hx;
    const bz = loc.mapY - hz;
    const by = heightAt(loc.mapX, loc.mapY);

    switch (loc.action) {
      case 'hub':
        blocks.push(...generateCampfire(bx, by, bz));
        blocks.push(...generateHut(bx - 3, by, bz - 2));
        blocks.push(...generateHut(bx + 3, by, bz + 1));
        break;
      case 'vanilla':
        blocks.push(...generateHut(bx, by, bz));
        break;
      case 'multiplayer':
        blocks.push(...generateTower(bx, by, bz));
        break;
      case 'arena':
        blocks.push(...generateColosseum(bx, by, bz));
        break;
      case 'stories':
        blocks.push(...generateRuins(bx, by, bz));
        break;
    }
  }

  // Pack into typed arrays
  const count = blocks.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  blocks.forEach((b, i) => {
    positions[i * 3] = b.x; positions[i * 3 + 1] = b.y; positions[i * 3 + 2] = b.z;
    colors[i * 3] = b.color.r; colors[i * 3 + 1] = b.color.g; colors[i * 3 + 2] = b.color.b;
  });
  return { positions, colors, count };
}

// Path / track blocks
function generateTrackVoxels(statuses: Record<string, GameModeStatus>) {
  const blocks: VoxelBlock[] = [];
  const hx = GAMEMODE_MAP_WIDTH / 2;
  const hz = GAMEMODE_MAP_HEIGHT / 2;
  const pathCol = new THREE.Color('#c8a060');
  const activeCol = new THREE.Color('#e8c878');

  for (const path of GAMEMODE_PATHS) {
    const toStatus = statuses[path.to];
    const isActive = toStatus !== 'locked';
    for (const wp of path.waypoints) {
      const wx = wp.x - hx;
      const wz = wp.y - hz;
      const baseY = heightAt(wp.x, wp.y);
      const col = isActive ? activeCol.clone() : pathCol.clone();
      const cn = (noise2D(wp.x * 3, wp.y * 3, SEED + 700) - 0.5) * 0.05;
      col.r = Math.max(0, Math.min(1, col.r + cn));
      col.g = Math.max(0, Math.min(1, col.g + cn));
      col.b = Math.max(0, Math.min(1, col.b + cn));
      blocks.push({ x: wx, y: baseY, z: wz, color: col });
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
// Three.js sub-components
// ────────────────────────────────────────────

function VoxelTerrain({ data }: { data: { positions: Float32Array; colors: Float32Array; count: number } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.95, 0.95, 0.95), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, flatShading: true, vertexColors: true }), []);

  useEffect(() => {
    const m = ref.current; if (!m) return;
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
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05, flatShading: true, vertexColors: true }), []);

  useEffect(() => {
    const m = ref.current; if (!m) return;
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

// Animated water plane surrounding the island
function WaterPlane() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 0.5) * 0.04;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        color="#3a7ab8"
        transparent
        opacity={0.82}
        roughness={0.15}
        metalness={0.1}
      />
    </mesh>
  );
}

// ────────────────────────────────────────────
// Location beacon (3D glowing block + HTML label)
// ────────────────────────────────────────────

function LocationBeacon({
  location, status, isHovered, locale,
  onClick, onHoverIn, onHoverOut, onlineCount,
}: {
  location: GameModeLocation;
  status: GameModeStatus;
  isHovered: boolean;
  locale: string;
  onClick: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onlineCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hx = GAMEMODE_MAP_WIDTH / 2;
  const hz = GAMEMODE_MAP_HEIGHT / 2;

  const wx = location.mapX - hx;
  const wz = location.mapY - hz;
  const baseY = heightAt(location.mapX, location.mapY) + 1;

  const name = locale === 'en' ? location.nameEn : location.name;
  const accent = new THREE.Color(location.accentColor);

  const markerColor = status === 'locked'
    ? new THREE.Color(0.35, 0.35, 0.38)
    : status === 'completed'
      ? new THREE.Color(0.55, 0.42, 0.12)
      : accent;

  const emissive = status === 'locked'
    ? new THREE.Color(0, 0, 0)
    : status === 'completed'
      ? new THREE.Color(0.3, 0.25, 0.08)
      : accent;

  const emissiveIntensity = status === 'locked' ? 0 : isHovered ? 1.8 : 0.7;
  const scale = isHovered && status !== 'locked' ? 1.15 : 1;

  useFrame(({ clock }) => {
    if (!groupRef.current || status === 'locked') return;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.12;
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
          <meshStandardMaterial
            color={markerColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={0.3}
            metalness={0.2}
            flatShading
          />
        </mesh>
        {status !== 'locked' && (
          <pointLight position={[0, 1.2, 0]} color={markerColor} intensity={isHovered ? 3.5 : 1.2} distance={8} />
        )}
      </group>

      <Html position={[0, 2.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`${styles.locLabel} ${status === 'locked' ? styles.locLocked : ''} ${isHovered ? styles.locHovered : ''}`}>
          <div className={styles.locIconBadge} style={{ borderColor: status === 'locked' ? '#555' : location.accentColor }}>
            {status === 'locked' ? '🔒' : location.icon}
          </div>
          <div className={styles.locName}>{name}</div>
          {status === 'completed' && location.action === 'hub' && (
            <div className={styles.locCheck}>✓</div>
          )}
          {showOnline && (
            <div className={styles.locOnline}>
              <span className={styles.locOnlineDot} />
              {onlineCount}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// Camera setup for the larger island map
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(25, 30, 25);
    camera.lookAt(0, 4, 0);
  }, [camera]);
  return null;
}

// ────────────────────────────────────────────
// Main GameModeMap component
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
    const s: Record<string, GameModeStatus> = {};
    for (const loc of GAMEMODE_LOCATIONS) { s[loc.id] = getGameModeStatus(loc.id, unlockedCount); }
    return s;
  }, [unlockedCount]);

  const terrainData = useMemo(() => generateTerrainVoxels(), []);
  const trackData = useMemo(() => generateTrackVoxels(locationStatuses), [locationStatuses]);

  const hoveredLoc = hoveredLocation ? GAMEMODE_LOCATIONS.find(l => l.id === hoveredLocation) : null;

  return (
    <div className={styles.mapWrapper}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#1e1812']} />
        <fog attach="fog" args={['#2a2018', 40, 90]} />
        <CameraSetup />
        <OrthographicCamera makeDefault position={[25, 30, 25]} zoom={16} near={0.1} far={200} />

        {/* Warm Minecraft Dungeons lighting */}
        <ambientLight intensity={1.4} color="#fff8f0" />
        <hemisphereLight args={['#ffeedd', '#556644', 0.7]} />
        <directionalLight
          position={[18, 35, 12]}
          intensity={2.8}
          color="#fff0d8"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={100}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight position={[-12, 18, -6]} intensity={0.5} color="#ffd8a0" />

        {/* Deep ocean floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#182028" roughness={1} />
        </mesh>

        {/* Animated water surface */}
        <WaterPlane />

        {/* Voxel terrain */}
        <VoxelTerrain data={terrainData} />

        {/* Path tracks */}
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
            onClick={() => {
              if (locationStatuses[loc.id] !== 'locked' && loc.action !== 'hub') {
                onSelectMode(loc.action);
              }
            }}
            onHoverIn={() => { if (loc.action !== 'hub') setHoveredLocation(loc.id); }}
            onHoverOut={() => setHoveredLocation(null)}
          />
        ))}
      </Canvas>

      {/* Bottom info panel (HTML overlay) */}
      {hoveredLoc && (() => {
        const status = locationStatuses[hoveredLoc.id];
        const name = locale === 'en' ? hoveredLoc.nameEn : hoveredLoc.name;
        const desc = locale === 'en' ? hoveredLoc.descriptionEn : hoveredLoc.description;
        return (
          <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
              <span className={styles.infoIcon}>{hoveredLoc.icon}</span>
              <span className={styles.infoName} style={{ color: hoveredLoc.accentColor }}>{name}</span>
              {status === 'available' && (
                <span className={styles.infoPlayBadge}>
                  {locale === 'en' ? 'PLAY' : 'プレイ'}
                </span>
              )}
            </div>
            <div className={styles.infoDesc}>{desc}</div>
            {hoveredLoc.features.length > 0 && (
              <div className={styles.infoFeatures}>
                {hoveredLoc.features.map((f, i) => (
                  <span key={i} className={styles.infoTag}>{locale === 'en' ? f.labelEn : f.label}</span>
                ))}
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
              <div className={styles.infoLocked}>
                🔒 {t('advancements.lockMessage', { current: unlockedCount, required: requiredAdvancements })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
