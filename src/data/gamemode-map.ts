// =============================================================
// Game Mode Map — Data & Types
// Minecraft Dungeons–style floating island diorama.
// 48×38 grid with 10 distinct biome zones matching Dungeons missions.
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

// === Mountain peaks ===

interface Peak { x: number; y: number; height: number; radius: number }

const PEAKS: Peak[] = [
  { x: 26, y: 13, height: 7, radius: 7 },   // Central (Fiery Forge interior)
  { x: 20, y: 9, height: 6, radius: 6 },    // Left (Obsidian Pinnacle approach)
  { x: 34, y: 11, height: 6, radius: 6.5 }, // Right (Highblock Halls ridge)
  { x: 16, y: 5, height: 5, radius: 5.5 },  // NW (Obsidian Pinnacle summit)
  { x: 30, y: 7, height: 5, radius: 5 },    // NE
  { x: 22, y: 17, height: 4, radius: 4.5 }, // South foothills (Redstone Mines entrance)
  { x: 36, y: 16, height: 4, radius: 4 },   // East foothills
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

// === Biome zone detection ===
// 10 Minecraft Dungeons mission biomes mapped to the 48×38 grid

type BiomeZone =
  | 'creeper_woods'     // NW forest - dense dark trees, spiders, Creepy Crypt
  | 'soggy_swamp'       // SW - witches, slimes, corrupted water
  | 'pumpkin_pastures'  // Center-south - autumn fields, orange palette
  | 'cacti_canyon'      // SE - desert/mesa, cacti, Western theme
  | 'redstone_mines'    // Central mountain base - dark caves, redstone ore
  | 'fiery_forge'       // N central mountains - lava factory inside snow mountain
  | 'desert_temple'     // E - Egyptian architecture, sand, undead
  | 'highblock_halls'   // NE - stone castles, lavish halls
  | 'obsidian_pinnacle' // N/NW peaks - highest altitude, floating structures
  | 'mushroom_fields';  // Secret island off SE coast

function getBiomeZone(x: number, y: number, nx: number, ny: number, mtElev: number): BiomeZone {
  // Mushroom Fields: small island off SE coast
  if (distPt(x, y, 44, 34) < 4) return 'mushroom_fields';

  // Mountain biomes (elevation-based)
  if (mtElev > 0.5) {
    // Obsidian Pinnacle: highest NW peaks
    if (ny < -0.2 && nx < 0.0 && mtElev > 3) return 'obsidian_pinnacle';
    // Fiery Forge: central mountain interior with lava
    if (nx > -0.15 && nx < 0.35 && ny < 0.0 && mtElev > 1.5) return 'fiery_forge';
    // Highblock Halls: NE mountain with castle structures
    if (nx > 0.2 && ny < 0.0) return 'highblock_halls';
    // Redstone Mines: south mountain base, caves
    if (ny > -0.1 && mtElev < 3.5) return 'redstone_mines';
    // Default mountain
    if (ny < -0.2) return 'obsidian_pinnacle';
    return 'fiery_forge';
  }

  // Flat/low biomes (position-based)
  // Creeper Woods: NW forest
  if (nx < -0.1 && ny < 0.1 && ny > -0.55) return 'creeper_woods';
  // Soggy Swamp: SW
  if (nx < 0.05 && ny > 0.25) return 'soggy_swamp';
  // Cacti Canyon: SE
  if (nx > 0.3 && ny > 0.15) return 'cacti_canyon';
  // Desert Temple: E
  if (nx > 0.25 && ny > -0.15 && ny <= 0.15) return 'desert_temple';
  // Highblock Halls: NE lowlands
  if (nx > 0.15 && ny < -0.15) return 'highblock_halls';
  // Pumpkin Pastures: center/south
  if (ny > 0.0 && ny < 0.35 && nx > -0.2 && nx < 0.3) return 'pumpkin_pastures';
  // Snow tundra near Obsidian Pinnacle
  if (ny < -0.4) return 'obsidian_pinnacle';
  // Default: Pumpkin Pastures
  return 'pumpkin_pastures';
}

// === Terrain generation ===

function generateGameModeTerrain(): MapTile[] {
  const tiles: MapTile[] = [];
  const rand = seededRandom(12345);
  const W = GAMEMODE_MAP_WIDTH;
  const H = GAMEMODE_MAP_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;

  // River from mountains through center to south coast
  const riverPts: [number, number][] = [[24, 10], [22, 16], [20, 22], [18, 30]];

  // Mushroom Fields island center
  const mushIslandCx = 44, mushIslandCy = 34;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / cx;
      const ny = (y - cy) / cy;

      // === Island shape ===
      const baseDist = Math.sqrt(nx * nx * 0.75 + ny * ny * 1.0);
      const coastNoise = fractalNoise(x * 0.07, y * 0.07, 54321, 3) * 0.18;

      // Peninsula extensions
      const seAngle = Math.atan2(ny - 0.2, nx - 0.3);
      const sePen = Math.abs(seAngle - 0.3) < 0.4 ? 0.12 : 0;
      const nwAngle = Math.atan2(ny + 0.4, nx + 0.3);
      const nwPen = Math.abs(nwAngle - 3.5) < 0.5 || Math.abs(nwAngle + 2.8) < 0.5 ? 0.08 : 0;

      const islandEdge = 0.80 + coastNoise + sePen + nwPen;

      // Mushroom Fields: separate small island
      const mushDist = distPt(x, y, mushIslandCx, mushIslandCy);
      const mushEdge = 3.5 + smoothNoise(x * 0.2, y * 0.2, 99999) * 0.8;
      const onMushroomIsland = mushDist < mushEdge;

      // Ocean
      if (!onMushroomIsland && baseDist > islandEdge) {
        tiles.push({ x, y, terrain: 'water' as TerrainType, elevation: 0 });
        continue;
      }

      // Mushroom Fields island
      if (onMushroomIsland && baseDist > islandEdge) {
        if (mushDist > mushEdge - 0.5) {
          tiles.push({ x, y, terrain: 'sand' as TerrainType, elevation: 0 });
        } else {
          const mr = rand();
          const terrain: TerrainType = mr > 0.5 ? 'mushroom' : mr > 0.2 ? 'dirt' : 'grass';
          tiles.push({ x, y, terrain, elevation: 0 });
        }
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
      const mtElev = mountainElevation(x, y);
      const biome = getBiomeZone(x, y, nx, ny, mtElev);

      // === Mountain tiles ===
      if (mtElev > 0.5) {
        const elevation = Math.min(7, Math.round(mtElev));

        switch (biome) {
          case 'fiery_forge': {
            // Lava-filled factory inside snowy mountain
            if (mtElev > 1.5 && mtElev < 4 && rand() > 0.5) {
              tiles.push({ x, y, terrain: 'lava' as TerrainType, elevation: Math.min(elevation, 4) });
            } else if (elevation >= 5) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else {
              tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
            }
            break;
          }
          case 'obsidian_pinnacle': {
            // Highest peaks with dark stone and snow caps
            if (elevation >= 5) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else if (elevation >= 3) {
              // Dark obsidian-like stone
              tiles.push({ x, y, terrain: rand() > 0.3 ? 'stone' : 'rock' as TerrainType, elevation });
            } else {
              tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
            }
            break;
          }
          case 'highblock_halls': {
            // Stone brick mountains for castle zone
            tiles.push({ x, y, terrain: rand() > 0.4 ? 'stone' : 'path' as TerrainType, elevation });
            break;
          }
          case 'redstone_mines': {
            // Dark tunnels with redstone ore glow
            if (rand() > 0.8) {
              tiles.push({ x, y, terrain: 'lava' as TerrainType, elevation: Math.min(elevation, 3) });
            } else {
              tiles.push({ x, y, terrain: rand() > 0.5 ? 'stone' : 'rock' as TerrainType, elevation });
            }
            break;
          }
          default: {
            if (elevation >= 5 && y < 16) {
              tiles.push({ x, y, terrain: 'snow' as TerrainType, elevation });
            } else {
              tiles.push({ x, y, terrain: 'stone' as TerrainType, elevation });
            }
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
          // Dense dark forest with spiders and cobwebs
          terrain = rand() > 0.28 ? 'tree' : 'grass';
          elevation = Math.floor(bn * 2);
          if (rand() > 0.97) terrain = 'flower'; // rare flowers
          if (rand() > 0.95) terrain = 'rock'; // mossy rocks
          break;
        }
        case 'soggy_swamp': {
          // Swamp with mushrooms, dead trees, toxic pools
          if (rand() > 0.85) {
            terrain = 'water'; // stagnant pools
          } else if (rand() > 0.55) {
            terrain = 'mushroom';
          } else if (rand() > 0.35) {
            terrain = 'tree'; // swamp trees (will render as dead)
          } else {
            terrain = 'dirt';
          }
          elevation = 0;
          break;
        }
        case 'pumpkin_pastures': {
          // Autumn fields with orange trees, pumpkins, paths
          terrain = 'grass';
          elevation = Math.floor(bn * 1.5);
          if (rand() > 0.72) terrain = 'tree'; // autumn trees
          if (rand() > 0.94) terrain = 'flower'; // pumpkin-colored flowers
          if (rand() > 0.96) terrain = 'path'; // farm paths
          break;
        }
        case 'cacti_canyon': {
          // Desert/mesa with cacti and rocky outcrops
          if (rand() > 0.65) {
            terrain = 'sand';
          } else if (rand() > 0.4) {
            terrain = 'dirt'; // mesa red dirt
          } else {
            terrain = 'rock'; // canyon walls
          }
          elevation = Math.floor(bn * 1.5);
          break;
        }
        case 'redstone_mines': {
          // Cave entrance area with dark stone
          terrain = rand() > 0.5 ? 'stone' : 'rock';
          elevation = Math.floor(bn * 2) + 1;
          if (rand() > 0.9) terrain = 'lava'; // redstone ore glow
          break;
        }
        case 'desert_temple': {
          // Sandy desert with stone pillars
          if (rand() > 0.6) {
            terrain = 'sand';
          } else if (rand() > 0.3) {
            terrain = 'path'; // temple pathways
          } else {
            terrain = 'stone'; // temple foundations
          }
          elevation = Math.floor(bn * 1);
          break;
        }
        case 'highblock_halls': {
          // Stone and paths for castle grounds
          if (rand() > 0.55) {
            terrain = 'stone';
          } else if (rand() > 0.3) {
            terrain = 'path';
          } else {
            terrain = 'grass';
          }
          elevation = Math.floor(bn * 2) + 1;
          break;
        }
        case 'obsidian_pinnacle': {
          // Snow tundra at mountain base
          terrain = rand() > 0.5 ? 'snow' : 'stone';
          elevation = Math.floor(bn * 2) + 1;
          break;
        }
        case 'mushroom_fields': {
          // Already handled above for separate island
          const mr = rand();
          terrain = mr > 0.5 ? 'mushroom' : mr > 0.2 ? 'dirt' : 'grass';
          elevation = 0;
          break;
        }
        default: {
          terrain = 'grass';
          elevation = Math.floor(bn * 2);
          if (rand() > 0.82) terrain = 'tree';
          if (rand() > 0.97) terrain = 'flower';
          break;
        }
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
