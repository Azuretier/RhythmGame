// =============================================================
// Game Mode Map — Data & Types
// Isometric map for the gamemode select screen in RhythmiaLobby.
// Minecraft Dungeons–style island with distinct biomes, dramatic
// mountains, ocean, rivers, and varied terrain.
// =============================================================

import type { TerrainType, MapTile, MapPath } from './stories/dungeons';

// === Types ===

export interface GameModeLocation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  mapX: number;
  mapY: number;
  icon: string;
  accentColor: string;
  action: 'vanilla' | 'multiplayer' | 'arena' | 'stories' | 'hub';
  requiresAdvancements?: number;
  features: { label: string; labelEn: string }[];
  stats: { label: string; labelEn: string; value: string }[];
}

export type GameModeStatus = 'locked' | 'available' | 'completed';

// === Map dimensions (larger island map) ===

export const GAMEMODE_MAP_WIDTH = 36;
export const GAMEMODE_MAP_HEIGHT = 28;

// === Seeded PRNG for deterministic terrain ===

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// === Noise helpers ===

function hash2D(x: number, y: number, seed: number): number {
  let s = (x * 73856093 ^ y * 19349663 ^ seed) % 2147483647;
  if (s < 0) s += 2147483647;
  return s / 2147483647;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2D(ix, iy, seed), n10 = hash2D(ix + 1, iy, seed);
  const n01 = hash2D(ix, iy + 1, seed), n11 = hash2D(ix + 1, iy + 1, seed);
  return (n00 + sx * (n10 - n00)) + sy * ((n01 + sx * (n11 - n01)) - (n00 + sx * (n10 - n00)));
}

function fractalNoise(x: number, y: number, seed: number, octaves = 3): number {
  let v = 0, a = 1, f = 1, m = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * f, y * f, seed + i * 1000) * a;
    m += a; a *= 0.5; f *= 2;
  }
  return v / m;
}

// === Geometry helpers ===

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx, projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function distToPolyline(px: number, py: number, points: [number, number][]): number {
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(px, py, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// === Terrain generation — Dungeons-style island ===

function generateGameModeTerrain(): MapTile[] {
  const tiles: MapTile[] = [];
  const rand = seededRandom(12345);
  const W = GAMEMODE_MAP_WIDTH;
  const H = GAMEMODE_MAP_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;

  // Mountain ridge: northwest to center-east
  const mtA: [number, number] = [14, 2];
  const mtB: [number, number] = [27, 13];
  // Secondary ridge branch toward northeast
  const mt2A: [number, number] = [22, 5];
  const mt2B: [number, number] = [32, 8];

  // River polyline: from mountains through center to south coast
  const riverPts: [number, number][] = [[20, 8], [18, 13], [16, 18], [15, 24]];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / cx;
      const ny = (y - cy) / cy;

      // Island shape: elliptical with noise for irregular coastline
      const dist = Math.sqrt(nx * nx * 0.85 + ny * ny * 1.1);
      const coastNoise = fractalNoise(x * 0.09, y * 0.09, 54321, 2) * 0.15;
      const islandEdge = 0.82 + coastNoise;

      // Ocean
      if (dist > islandEdge) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // River
      const riverDist = distToPolyline(x, y, riverPts);
      const riverNoise = smoothNoise(x * 0.3, y * 0.3, 11111) * 0.4;
      if (riverDist < 0.9 + riverNoise) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // Beach ring
      if (dist > islandEdge - 0.06) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      // River banks
      if (riverDist < 1.6 + riverNoise * 0.5) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      // Biome noise
      const bn = fractalNoise(x * 0.06, y * 0.06, 77777, 2);

      // Mountain ridge check
      const mtDist1 = distToSegment(x, y, mtA[0], mtA[1], mtB[0], mtB[1]);
      const mtDist2 = distToSegment(x, y, mt2A[0], mt2A[1], mt2B[0], mt2B[1]);
      const mtDist = Math.min(mtDist1, mtDist2);
      const mtWidth = 5.5 + bn * 2;

      if (mtDist < mtWidth) {
        const mtIntensity = 1 - (mtDist / mtWidth);
        const elevation = Math.min(7, Math.floor(mtIntensity * 7 + bn * 2));

        // Snow on highest peaks in the north
        if (elevation >= 5 && y < 12) {
          tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
        } else {
          tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
        }
        continue;
      }

      // Biome zones
      let terrain: TerrainType = 'grass';
      let elevation = 0;

      // Forest (west, northwest)
      if (nx < -0.05 && ny < 0.15) {
        if (rand() > 0.5) {
          terrain = 'tree';
          elevation = Math.floor(bn * 2);
        } else {
          terrain = 'grass';
          elevation = Math.floor(bn * 1.5);
        }
        if (rand() > 0.94) terrain = 'flower';
      }
      // Desert/ruins (east, southeast)
      else if (nx > 0.25 && ny > 0.1) {
        terrain = rand() > 0.7 ? 'sand' : 'dirt';
        elevation = Math.floor(bn * 1);
        if (rand() > 0.95) terrain = 'rock';
      }
      // Swamp/dark cave (southwest)
      else if (nx < -0.1 && ny > 0.25) {
        if (rand() > 0.7) {
          terrain = 'mushroom';
        } else if (rand() > 0.5) {
          terrain = 'tree';
        } else {
          terrain = 'dirt';
        }
        elevation = 0;
      }
      // Autumn plains/village (center)
      else if (Math.abs(nx) < 0.35 && Math.abs(ny) < 0.35) {
        terrain = 'grass';
        elevation = Math.floor(bn * 1.5);
        if (rand() > 0.85) terrain = 'tree';
        if (rand() > 0.95) terrain = 'flower';
        if (rand() > 0.97) terrain = 'path';
      }
      // Snow/tundra transition (north)
      else if (ny < -0.3) {
        if (rand() > 0.6) {
          terrain = 'snow';
          elevation = Math.floor(bn * 2) + 1;
        } else {
          terrain = 'stone';
          elevation = Math.floor(bn * 2);
        }
      }
      // Default
      else {
        terrain = 'grass';
        elevation = Math.floor(bn * 2);
        if (rand() > 0.88) terrain = 'tree';
        if (rand() > 0.96) terrain = 'flower';
      }

      tiles.push({ x, y, terrain, elevation });
    }
  }

  return tiles;
}

export const GAMEMODE_TERRAIN: MapTile[] = generateGameModeTerrain();

// === Game mode locations ===

export const GAMEMODE_LOCATIONS: GameModeLocation[] = [
  {
    id: 'hub',
    name: 'ホーム',
    nameEn: 'Home',
    description: '全ての冒険はここから始まる。',
    descriptionEn: 'All adventures begin here.',
    mapX: 18,
    mapY: 16,
    icon: '🏕️',
    accentColor: '#8B6914',
    action: 'hub',
    features: [],
    stats: [],
  },
  {
    id: 'solo',
    name: 'リズミア',
    nameEn: 'Rhythmia',
    description: 'リズムに合わせてブロックを操る、ソロモード。5つの世界が待っている。',
    descriptionEn: 'Master the blocks to the rhythm in solo mode. Five worlds await.',
    mapX: 8,
    mapY: 8,
    icon: '🎵',
    accentColor: '#4CAF50',
    action: 'vanilla',
    features: [
      { label: 'ソロ', labelEn: 'Solo' },
      { label: '5ワールド', labelEn: '5 Worlds' },
      { label: 'リズム', labelEn: 'Rhythm' },
    ],
    stats: [
      { label: 'モード', labelEn: 'Mode', value: 'SOLO' },
      { label: 'ワールド', labelEn: 'Worlds', value: '5' },
    ],
  },
  {
    id: 'battle',
    name: 'バトルアリーナ',
    nameEn: 'Battle Arena',
    description: 'リアルタイムで他のプレイヤーと対戦。ランクマッチやモブバトルも。',
    descriptionEn: 'Battle other players in real-time. Ranked matches and mob battles available.',
    mapX: 29,
    mapY: 7,
    icon: '⚔️',
    accentColor: '#FF6B6B',
    action: 'multiplayer',
    requiresAdvancements: 3,
    features: [
      { label: 'VS', labelEn: 'VS' },
      { label: 'WebSocket', labelEn: 'WebSocket' },
      { label: 'ランク', labelEn: 'Ranked' },
    ],
    stats: [
      { label: 'モード', labelEn: 'Mode', value: 'VS' },
      { label: 'バトル', labelEn: 'Battle', value: '1v1' },
      { label: 'ステータス', labelEn: 'Status', value: 'LIVE' },
    ],
  },
  {
    id: 'arena',
    name: 'グランドアリーナ',
    nameEn: 'Grand Arena',
    description: '9人のプレイヤーが同時に戦う大規模バトル。カオスシステムとギミックが待つ。',
    descriptionEn: '9 players battle simultaneously. Chaos system and gimmicks await.',
    mapX: 29,
    mapY: 21,
    icon: '🏟️',
    accentColor: '#2196F3',
    action: 'arena',
    features: [
      { label: '9人', labelEn: '9 Players' },
      { label: 'カオス', labelEn: 'Chaos' },
      { label: '同期テンポ', labelEn: 'Sync Tempo' },
    ],
    stats: [
      { label: 'プレイヤー', labelEn: 'Players', value: '9' },
      { label: 'BPM', labelEn: 'BPM', value: '120+' },
      { label: 'ステータス', labelEn: 'Status', value: 'LIVE' },
    ],
  },
  {
    id: 'stories',
    name: '冒険の書',
    nameEn: 'Adventures',
    description: 'ダンジョンを探索し、物語を紡ぐ。リズミアの世界を冒険しよう。',
    descriptionEn: 'Explore dungeons and weave stories. Adventure through the world of Rhythmia.',
    mapX: 8,
    mapY: 22,
    icon: '📖',
    accentColor: '#9C27B0',
    action: 'stories',
    features: [
      { label: 'ストーリー', labelEn: 'Story' },
      { label: 'ダンジョン', labelEn: 'Dungeon' },
      { label: '探索', labelEn: 'Explore' },
    ],
    stats: [
      { label: 'タイプ', labelEn: 'Type', value: 'RPG' },
      { label: 'マップ', labelEn: 'Maps', value: '4+' },
    ],
  },
];

// === Paths connecting hub to each game mode ===

export const GAMEMODE_PATHS: MapPath[] = [
  {
    from: 'hub',
    to: 'solo',
    waypoints: [
      { x: 18, y: 16 }, { x: 16, y: 14 }, { x: 14, y: 12 },
      { x: 12, y: 10 }, { x: 10, y: 9 }, { x: 8, y: 8 },
    ],
  },
  {
    from: 'hub',
    to: 'battle',
    waypoints: [
      { x: 18, y: 16 }, { x: 20, y: 14 }, { x: 22, y: 12 },
      { x: 24, y: 10 }, { x: 27, y: 8 }, { x: 29, y: 7 },
    ],
  },
  {
    from: 'hub',
    to: 'arena',
    waypoints: [
      { x: 18, y: 16 }, { x: 20, y: 17 }, { x: 22, y: 18 },
      { x: 24, y: 19 }, { x: 27, y: 20 }, { x: 29, y: 21 },
    ],
  },
  {
    from: 'hub',
    to: 'stories',
    waypoints: [
      { x: 18, y: 16 }, { x: 16, y: 17 }, { x: 14, y: 18 },
      { x: 12, y: 20 }, { x: 10, y: 21 }, { x: 8, y: 22 },
    ],
  },
];

// === Helpers ===

export function getGameModeStatus(
  locationId: string,
  unlockedAdvancements: number
): GameModeStatus {
  const location = GAMEMODE_LOCATIONS.find(l => l.id === locationId);
  if (!location) return 'locked';
  if (location.action === 'hub') return 'completed';
  if (location.requiresAdvancements && unlockedAdvancements < location.requiresAdvancements) {
    return 'locked';
  }
  return 'available';
}
