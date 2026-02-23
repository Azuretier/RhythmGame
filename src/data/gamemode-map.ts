// =============================================================
// Game Mode Map — Data & Types
// Minecraft Dungeons–style floating island diorama.
// 80×60 grid with 10 distinct biome zones (Voronoi tessellation).
// Massive mountain scale matching reference image.
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

export const GAMEMODE_MAP_WIDTH = 80;
export const GAMEMODE_MAP_HEIGHT = 60;

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

function distPt(px: number, py: number, qx: number, qy: number): number {
  return Math.sqrt((px - qx) ** 2 + (py - qy) ** 2);
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distPt(px, py, ax, ay);
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

// === Mountain peaks (massive scale) ===

interface Peak { x: number; y: number; height: number; radius: number }

const PEAKS: Peak[] = [
  { x: 44, y: 18, height: 14, radius: 13 },  // Central (Fiery Forge interior)
  { x: 32, y: 12, height: 12, radius: 11 },  // Left (Obsidian Pinnacle approach)
  { x: 58, y: 15, height: 11, radius: 10 },  // Right (Highblock Halls ridge)
  { x: 24, y: 8,  height: 10, radius: 9 },   // NW Summit (Obsidian Pinnacle)
  { x: 50, y: 10, height: 10, radius: 8 },   // NE (between Forge & Halls)
  { x: 38, y: 28, height: 7,  radius: 7 },   // S Foothills (Redstone Mines)
  { x: 62, y: 24, height: 6,  radius: 6 },   // E Foothills
];

function mountainElevation(x: number, y: number): number {
  let maxElev = 0;
  for (const p of PEAKS) {
    const d = distPt(x, y, p.x, p.y);
    if (d < p.radius) {
      const t = 1 - (d / p.radius);
      const elev = p.height * Math.pow(t, 1.3);
      if (elev > maxElev) maxElev = elev;
    }
  }
  return maxElev;
}

// === Biome zone detection (Voronoi tessellation) ===

type BiomeZone =
  | 'creeper_woods'
  | 'soggy_swamp'
  | 'pumpkin_pastures'
  | 'cacti_canyon'
  | 'redstone_mines'
  | 'fiery_forge'
  | 'desert_temple'
  | 'highblock_halls'
  | 'obsidian_pinnacle'
  | 'mushroom_fields';

// Flat biome anchors (scaled for 80×60)
const FLAT_ANCHORS: { zone: BiomeZone; x: number; y: number }[] = [
  { zone: 'creeper_woods', x: 15, y: 18 },
  { zone: 'soggy_swamp', x: 15, y: 48 },
  { zone: 'pumpkin_pastures', x: 38, y: 42 },
  { zone: 'cacti_canyon', x: 68, y: 46 },
  { zone: 'desert_temple', x: 65, y: 30 },
  { zone: 'highblock_halls', x: 68, y: 12 },
];

// Mountain biome anchors
const MTN_ANCHORS: { zone: BiomeZone; x: number; y: number }[] = [
  { zone: 'obsidian_pinnacle', x: 28, y: 8 },
  { zone: 'fiery_forge', x: 44, y: 18 },
  { zone: 'redstone_mines', x: 38, y: 28 },
  { zone: 'highblock_halls', x: 60, y: 16 },
];

function nearestBiome(x: number, y: number, anchors: { zone: BiomeZone; x: number; y: number }[]): BiomeZone {
  let best = anchors[0].zone;
  let bestDist = Infinity;
  for (const a of anchors) {
    const d = distPt(x, y, a.x, a.y);
    if (d < bestDist) { bestDist = d; best = a.zone; }
  }
  return best;
}

// Mushroom Fields: separate small island off SE coast
const MUSH_CX = 72, MUSH_CY = 52;

function getBiome(x: number, y: number, mtElev: number): BiomeZone {
  if (distPt(x, y, MUSH_CX, MUSH_CY) < 6.5) return 'mushroom_fields';
  if (mtElev > 0.5) return nearestBiome(x, y, MTN_ANCHORS);
  return nearestBiome(x, y, FLAT_ANCHORS);
}

// === Terrain generation ===

function generateGameModeTerrain(): MapTile[] {
  const tiles: MapTile[] = [];
  const W = GAMEMODE_MAP_WIDTH;
  const H = GAMEMODE_MAP_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;

  // River from mountains through center to south coast
  const riverPts: [number, number][] = [[40, 16], [36, 24], [32, 32], [28, 40], [24, 48]];
  // Second river (east side)
  const river2Pts: [number, number][] = [[55, 20], [52, 28], [50, 36], [52, 44]];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / cx;
      const ny = (y - cy) / cy;
      const r0 = hash2D(x, y, 10001);
      const r1 = hash2D(x, y, 20002);
      const bn = fractalNoise(x * 0.05, y * 0.05, 77777, 3);

      // === Island shape ===
      const baseDist = Math.sqrt(nx * nx * 0.75 + ny * ny * 1.0);
      const coastNoise = fractalNoise(x * 0.06, y * 0.06, 54321, 3) * 0.20;

      // Peninsula extensions for irregular coastline
      const seAngle = Math.atan2(ny - 0.2, nx - 0.3);
      const sePen = Math.abs(seAngle - 0.3) < 0.4 ? 0.14 : 0;
      const nwAngle = Math.atan2(ny + 0.4, nx + 0.3);
      const nwPen = Math.abs(nwAngle - 3.5) < 0.5 || Math.abs(nwAngle + 2.8) < 0.5 ? 0.10 : 0;
      // SW bay
      const swAngle = Math.atan2(ny - 0.3, nx + 0.4);
      const swPen = Math.abs(swAngle + 0.5) < 0.35 ? 0.08 : 0;
      // NE extension
      const neAngle = Math.atan2(ny + 0.3, nx - 0.4);
      const nePen = Math.abs(neAngle + 0.8) < 0.3 ? 0.10 : 0;

      const islandEdge = 0.82 + coastNoise + sePen + nwPen + swPen + nePen;

      // Mushroom Fields: separate island
      const mushDist = distPt(x, y, MUSH_CX, MUSH_CY);
      const mushEdge = 5.5 + smoothNoise(x * 0.2, y * 0.2, 99999) * 1.2;
      const onMushroomIsland = mushDist < mushEdge;

      // Ocean
      if (!onMushroomIsland && baseDist > islandEdge) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // Mushroom Fields island (separate landmass)
      if (onMushroomIsland && baseDist > islandEdge) {
        if (mushDist > mushEdge - 0.8) {
          tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        } else {
          const t: TerrainType = r0 > 0.55 ? 'mushroom' : r0 > 0.25 ? 'dirt' : r0 > 0.1 ? 'flower' : 'grass';
          tiles.push({ x, y, terrain: t, elevation: 0 });
        }
        continue;
      }

      // Rivers
      const riverDist = distToPolyline(x, y, riverPts);
      const riverNoise = smoothNoise(x * 0.25, y * 0.25, 11111) * 0.5;
      const river2Dist = distToPolyline(x, y, river2Pts);
      const river2Noise = smoothNoise(x * 0.2, y * 0.2, 22222) * 0.4;
      if (riverDist < 1.0 + riverNoise || river2Dist < 0.8 + river2Noise) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // Beach
      if (baseDist > islandEdge - 0.06) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      // River banks
      if (riverDist < 1.8 + riverNoise * 0.3 || river2Dist < 1.4 + river2Noise * 0.3) {
        tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        continue;
      }

      const mtElev = mountainElevation(x, y);
      const biome = getBiome(x, y, mtElev);

      // === Mountain tiles (mtElev > 0.5) ===
      if (mtElev > 0.5) {
        const elevation = Math.min(14, Math.round(mtElev));

        switch (biome) {
          case 'fiery_forge': {
            if (mtElev > 3.0 && mtElev < 8.0 && r0 > 0.40) {
              tiles.push({ x, y, terrain: 'lava' as TerrainType, elevation: Math.min(elevation, 7) });
            } else if (elevation >= 10) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else {
              tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
            }
            break;
          }
          case 'obsidian_pinnacle': {
            if (elevation >= 8) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else if (r0 > 0.85) {
              tiles.push({ x, y, terrain: 'void' as TerrainType, elevation });
            } else {
              tiles.push({ x, y, terrain: r0 > 0.4 ? 'rock' as TerrainType : 'stone' as TerrainType, elevation });
            }
            break;
          }
          case 'highblock_halls': {
            if (elevation >= 8) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else {
              const t: TerrainType = r0 > 0.5 ? 'stone' : 'path';
              tiles.push({ x, y, terrain: t, elevation });
            }
            break;
          }
          case 'redstone_mines': {
            if (r0 > 0.75) {
              tiles.push({ x, y, terrain: 'lava' as TerrainType, elevation: Math.min(elevation, 5) });
            } else {
              const t: TerrainType = r0 > 0.4 ? 'rock' : 'stone';
              tiles.push({ x, y, terrain: t, elevation });
            }
            break;
          }
          default: {
            tiles.push({ x, y, terrain: elevation >= 8 ? 'snow' as TerrainType : 'stone' as TerrainType, elevation });
            break;
          }
        }
        continue;
      }

      // === Flat/low biome tiles ===
      let terrain: TerrainType = 'grass';
      let elevation = 0;

      switch (biome) {
        case 'creeper_woods': {
          if (r0 > 0.25) {
            terrain = 'tree';
          } else if (r0 > 0.15) {
            terrain = 'grass';
          } else if (r0 > 0.08) {
            terrain = 'rock';
          } else {
            terrain = 'flower';
          }
          elevation = Math.floor(bn * 2);
          break;
        }

        case 'soggy_swamp': {
          if (r0 > 0.82) {
            terrain = 'water';
          } else if (r0 > 0.55) {
            terrain = 'mushroom';
          } else if (r0 > 0.38) {
            terrain = 'tree';
          } else if (r0 > 0.15) {
            terrain = 'dirt';
          } else {
            terrain = 'grass';
          }
          elevation = 0;
          break;
        }

        case 'pumpkin_pastures': {
          if (r0 > 0.72) {
            terrain = 'tree';
          } else if (r0 > 0.52) {
            terrain = 'grass';
          } else if (r0 > 0.40) {
            terrain = 'flower';
          } else if (r0 > 0.30) {
            terrain = 'path';
          } else {
            terrain = 'dirt';
          }
          elevation = Math.floor(bn * 1.5);
          break;
        }

        case 'cacti_canyon': {
          if (r0 > 0.60) {
            terrain = 'sand';
          } else if (r0 > 0.35) {
            terrain = 'dirt';
          } else if (r0 > 0.15) {
            terrain = 'rock';
          } else {
            terrain = 'stone';
          }
          elevation = r1 > 0.7 ? 2 : r1 > 0.4 ? 1 : 0;
          break;
        }

        case 'redstone_mines': {
          if (r0 > 0.88) {
            terrain = 'lava';
          } else if (r0 > 0.55) {
            terrain = 'rock';
          } else if (r0 > 0.25) {
            terrain = 'stone';
          } else {
            terrain = 'dirt';
          }
          elevation = Math.floor(bn * 2) + 1;
          break;
        }

        case 'desert_temple': {
          if (r0 > 0.58) {
            terrain = 'sand';
          } else if (r0 > 0.35) {
            terrain = 'path';
          } else if (r0 > 0.15) {
            terrain = 'stone';
          } else {
            terrain = 'rock';
          }
          elevation = Math.floor(bn * 1);
          break;
        }

        case 'highblock_halls': {
          if (r0 > 0.55) {
            terrain = 'stone';
          } else if (r0 > 0.30) {
            terrain = 'path';
          } else {
            terrain = 'grass';
          }
          elevation = Math.floor(bn * 2) + 1;
          break;
        }

        case 'obsidian_pinnacle': {
          if (r0 > 0.55) {
            terrain = 'snow';
          } else if (r0 > 0.30) {
            terrain = 'stone';
          } else {
            terrain = 'rock';
          }
          elevation = Math.floor(bn * 2) + 1;
          break;
        }

        case 'mushroom_fields': {
          terrain = r0 > 0.55 ? 'mushroom' : r0 > 0.25 ? 'dirt' : 'flower';
          elevation = 0;
          break;
        }

        default: {
          terrain = 'grass';
          elevation = Math.floor(bn * 2);
          if (r0 > 0.82) terrain = 'tree';
          if (r1 > 0.97) terrain = 'flower';
          break;
        }
      }

      tiles.push({ x, y, terrain, elevation });
    }
  }

  return tiles;
}

export const GAMEMODE_TERRAIN: MapTile[] = generateGameModeTerrain();

// === Game mode locations (repositioned for 80×60) ===

export const GAMEMODE_LOCATIONS: GameModeLocation[] = [
  {
    id: 'hub',
    name: 'ホーム',
    nameEn: 'Home',
    description: '全ての冒険はここから始まる。',
    descriptionEn: 'All adventures begin here.',
    mapX: 38,
    mapY: 42,
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
    mapX: 16,
    mapY: 20,
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
    mapX: 65,
    mapY: 15,
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
    mapX: 65,
    mapY: 44,
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
    mapX: 16,
    mapY: 48,
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

// === Paths (longer waypoint sequences for 80×60) ===

export const GAMEMODE_PATHS: MapPath[] = [
  {
    from: 'hub', to: 'solo',
    waypoints: [
      { x: 38, y: 42 }, { x: 36, y: 40 }, { x: 34, y: 38 },
      { x: 30, y: 35 }, { x: 26, y: 32 }, { x: 22, y: 28 },
      { x: 20, y: 26 }, { x: 18, y: 24 }, { x: 16, y: 22 }, { x: 16, y: 20 },
    ],
  },
  {
    from: 'hub', to: 'battle',
    waypoints: [
      { x: 38, y: 42 }, { x: 40, y: 40 }, { x: 42, y: 38 },
      { x: 45, y: 35 }, { x: 48, y: 32 }, { x: 52, y: 28 },
      { x: 55, y: 25 }, { x: 58, y: 22 }, { x: 60, y: 20 },
      { x: 62, y: 18 }, { x: 65, y: 15 },
    ],
  },
  {
    from: 'hub', to: 'arena',
    waypoints: [
      { x: 38, y: 42 }, { x: 42, y: 42 }, { x: 46, y: 42 },
      { x: 50, y: 42 }, { x: 54, y: 43 }, { x: 58, y: 43 },
      { x: 62, y: 44 }, { x: 65, y: 44 },
    ],
  },
  {
    from: 'hub', to: 'stories',
    waypoints: [
      { x: 38, y: 42 }, { x: 35, y: 43 }, { x: 32, y: 44 },
      { x: 28, y: 45 }, { x: 24, y: 46 }, { x: 20, y: 47 },
      { x: 18, y: 48 }, { x: 16, y: 48 },
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
