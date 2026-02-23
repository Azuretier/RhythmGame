// =============================================================
// Game Mode Map — Data & Types
// Minecraft Dungeons–style floating island diorama.
// 48×38 grid with multi-peak mountains (35+ blocks), lava zone,
// irregular coastline with peninsulas, dense biomes.
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

// === Map dimensions ===

export const GAMEMODE_MAP_WIDTH = 48;
export const GAMEMODE_MAP_HEIGHT = 38;

// === Seeded PRNG ===

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// === Noise ===

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

// === Geometry ===

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function distToPolyline(px: number, py: number, points: [number, number][]): number {
  let minD = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    minD = Math.min(minD, distToSegment(px, py, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]));
  }
  return minD;
}

function distPt(px: number, py: number, qx: number, qy: number): number {
  return Math.sqrt((px - qx) ** 2 + (py - qy) ** 2);
}

// === Mountain peaks ===

interface Peak { x: number; y: number; height: number; radius: number }

const PEAKS: Peak[] = [
  { x: 26, y: 13, height: 7, radius: 7 },   // Central peak (tallest)
  { x: 20, y: 9, height: 6, radius: 6 },    // Left peak
  { x: 34, y: 11, height: 6, radius: 6.5 }, // Right peak
  { x: 18, y: 5, height: 5, radius: 5.5 },  // NW snow peak
  { x: 30, y: 7, height: 5, radius: 5 },    // NE peak
  { x: 22, y: 17, height: 4, radius: 4.5 }, // South foothills
  { x: 36, y: 16, height: 4, radius: 4 },   // East foothills
];

function mountainElevation(x: number, y: number): number {
  let maxElev = 0;
  for (const p of PEAKS) {
    const d = distPt(x, y, p.x, p.y);
    if (d < p.radius) {
      const t = 1 - (d / p.radius);
      // Steep falloff for dramatic cliffs
      const elev = p.height * Math.pow(t, 1.3);
      if (elev > maxElev) maxElev = elev;
    }
  }
  return maxElev;
}

// === Terrain generation ===

function generateGameModeTerrain(): MapTile[] {
  const tiles: MapTile[] = [];
  const rand = seededRandom(12345);
  const W = GAMEMODE_MAP_WIDTH;
  const H = GAMEMODE_MAP_HEIGHT;
  const cx = W / 2; // 24
  const cy = H / 2; // 19

  // River from mountains through center to south coast
  const riverPts: [number, number][] = [[24, 10], [22, 16], [20, 22], [18, 30]];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / cx;
      const ny = (y - cy) / cy;

      // Island shape: elliptical + noise + peninsula extensions
      const baseDist = Math.sqrt(nx * nx * 0.75 + ny * ny * 1.0);
      const coastNoise = fractalNoise(x * 0.07, y * 0.07, 54321, 3) * 0.18;

      // Peninsula extensions (lower distance in certain directions)
      const seAngle = Math.atan2(ny - 0.2, nx - 0.3); // SE peninsula toward desert
      const sePen = Math.abs(seAngle - 0.3) < 0.4 ? 0.12 : 0;
      const nwAngle = Math.atan2(ny + 0.4, nx + 0.3); // NW peninsula
      const nwPen = Math.abs(nwAngle - 3.5) < 0.5 || Math.abs(nwAngle + 2.8) < 0.5 ? 0.08 : 0;

      const islandEdge = 0.80 + coastNoise + sePen + nwPen;

      // Ocean
      if (baseDist > islandEdge) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // River
      const riverDist = distToPolyline(x, y, riverPts);
      const riverNoise = smoothNoise(x * 0.25, y * 0.25, 11111) * 0.4;
      if (riverDist < 0.8 + riverNoise) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // Beach
      if (baseDist > islandEdge - 0.05) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      // River banks
      if (riverDist < 1.4 + riverNoise * 0.3) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      // Biome noise
      const bn = fractalNoise(x * 0.05, y * 0.05, 77777, 3);

      // Mountain check
      const mtElev = mountainElevation(x, y);

      if (mtElev > 0.5) {
        const elevation = Math.min(7, Math.round(mtElev));

        // Lava zone: east side of mountains (between central and right peaks)
        if (nx > 0.1 && nx < 0.4 && ny > -0.2 && ny < 0.15 && mtElev > 1.5 && mtElev < 4) {
          tiles.push({ x, y, terrain: 'lava' as TerrainType, elevation: Math.min(elevation, 4) });
          continue;
        }

        // Snow on highest northern peaks
        if (elevation >= 5 && y < 16) {
          tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
        } else if (elevation >= 4 && y < 10) {
          tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
        } else {
          tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
        }
        continue;
      }

      // === Biome zones ===
      let terrain: TerrainType = 'grass';
      let elevation = 0;

      // Dense forest (west)
      if (nx < -0.1 && ny < 0.15 && ny > -0.55) {
        terrain = rand() > 0.35 ? 'tree' : 'grass';
        elevation = Math.floor(bn * 2);
        if (rand() > 0.96) terrain = 'flower';
      }
      // Desert (far east)
      else if (nx > 0.35 && ny > 0.0) {
        terrain = rand() > 0.6 ? 'sand' : 'dirt';
        elevation = Math.floor(bn * 1);
        if (rand() > 0.93) terrain = 'rock';
      }
      // Swamp (southwest)
      else if (nx < 0.0 && ny > 0.3) {
        if (rand() > 0.65) terrain = 'mushroom';
        else if (rand() > 0.4) terrain = 'tree';
        else terrain = 'dirt';
        elevation = 0;
      }
      // Autumn village (center-south, around hub)
      else if (nx > -0.2 && nx < 0.2 && ny > 0.1 && ny < 0.5) {
        terrain = 'grass';
        elevation = Math.floor(bn * 1.5);
        if (rand() > 0.75) terrain = 'tree'; // dense autumn trees
        if (rand() > 0.96) terrain = 'flower';
        if (rand() > 0.97) terrain = 'path';
      }
      // Snow tundra (far north)
      else if (ny < -0.45) {
        terrain = rand() > 0.5 ? 'snow' : 'stone';
        elevation = Math.floor(bn * 2) + 1;
      }
      // Mountain foothills transition
      else if (mtElev > 0.1) {
        terrain = rand() > 0.6 ? 'stone' : 'rock';
        elevation = Math.floor(bn * 2) + 1;
      }
      // Default grasslands
      else {
        terrain = 'grass';
        elevation = Math.floor(bn * 2);
        if (rand() > 0.82) terrain = 'tree';
        if (rand() > 0.97) terrain = 'flower';
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
    mapX: 22,
    mapY: 24,
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
    mapX: 10,
    mapY: 13,
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
    mapX: 38,
    mapY: 10,
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
    mapX: 38,
    mapY: 26,
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
    mapX: 10,
    mapY: 28,
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

// === Paths ===

export const GAMEMODE_PATHS: MapPath[] = [
  {
    from: 'hub', to: 'solo',
    waypoints: [
      { x: 22, y: 24 }, { x: 20, y: 22 }, { x: 18, y: 20 },
      { x: 16, y: 18 }, { x: 14, y: 16 }, { x: 12, y: 14 }, { x: 10, y: 13 },
    ],
  },
  {
    from: 'hub', to: 'battle',
    waypoints: [
      { x: 22, y: 24 }, { x: 24, y: 22 }, { x: 26, y: 20 },
      { x: 28, y: 18 }, { x: 30, y: 16 }, { x: 33, y: 14 },
      { x: 36, y: 12 }, { x: 38, y: 10 },
    ],
  },
  {
    from: 'hub', to: 'arena',
    waypoints: [
      { x: 22, y: 24 }, { x: 24, y: 24 }, { x: 27, y: 25 },
      { x: 30, y: 25 }, { x: 33, y: 25 }, { x: 36, y: 26 }, { x: 38, y: 26 },
    ],
  },
  {
    from: 'hub', to: 'stories',
    waypoints: [
      { x: 22, y: 24 }, { x: 20, y: 25 }, { x: 18, y: 26 },
      { x: 16, y: 27 }, { x: 14, y: 28 }, { x: 12, y: 28 }, { x: 10, y: 28 },
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
