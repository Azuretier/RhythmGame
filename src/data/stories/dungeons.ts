// =============================================================
// Minecraft Dungeons Map System — Data & Types
// Defines dungeon locations, isometric map layout, terrain,
// paths, and connections to story chapters
// =============================================================

import type { Chapter } from './chapters';
import { CHAPTERS } from './chapters';

// === Types ===

export type TerrainType =
  | 'grass' | 'dirt' | 'stone' | 'water' | 'sand'
  | 'snow' | 'lava' | 'void' | 'path' | 'bridge'
  | 'tree' | 'flower' | 'rock' | 'mushroom';

export type LocationStatus = 'locked' | 'available' | 'completed';

export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number; // 0-3 height levels for isometric depth
}

export interface MapPath {
  from: string; // location ID
  to: string;   // location ID
  // waypoints for the path curve (isometric grid coords)
  waypoints: { x: number; y: number }[];
}

export interface DungeonLocation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  // Position on the isometric map grid
  mapX: number;
  mapY: number;
  // Visual properties
  icon: string;     // emoji icon for the location marker
  accentColor: string;
  biome: 'forest' | 'village' | 'storm' | 'mountain' | 'cave';
  // Gameplay
  chapterId: string | null;    // links to a Chapter from chapters.ts
  difficulty: number;           // 1-5 stars
  estimatedMinutes: number;
  // Exploration dungeon data
  dungeonWidth: number;
  dungeonHeight: number;
  dungeonTiles: DungeonTile[];
  dungeonMobs: DungeonMob[];
  dungeonItems: DungeonItem[];
  // Prerequisites (location IDs that must be completed first)
  requires: string[];
}

export interface DungeonTile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'water' | 'lava' | 'chest' | 'door' | 'exit' | 'entrance' | 'trap' | 'cracked_wall';
  variant?: number; // visual variation
}

export interface DungeonMob {
  id: string;
  type: 'zombie' | 'skeleton' | 'spider' | 'creeper' | 'enderman';
  x: number;
  y: number;
  health: number;
  damage: number;
  loot?: string;
}

export interface DungeonItem {
  id: string;
  type: 'key' | 'potion' | 'emerald' | 'artifact' | 'bread' | 'arrow';
  x: number;
  y: number;
  name: string;
  nameEn: string;
}

export interface DungeonProgress {
  completedLocations: string[];
  currentLocation: string | null;
  totalEmeralds: number;
  totalDefeated: number;
}

// === Map terrain data (isometric grid 24x16) ===

const MAP_WIDTH = 24;
const MAP_HEIGHT = 16;

function generateMapTerrain(): MapTile[] {
  const tiles: MapTile[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      let terrain: TerrainType = 'grass';
      let elevation = 0;

      // Forest region (left side)
      if (x < 8 && y > 3 && y < 13) {
        terrain = Math.random() > 0.7 ? 'tree' : 'grass';
        elevation = Math.random() > 0.8 ? 1 : 0;
        if (x < 3) terrain = 'tree';
      }

      // Village region (center)
      if (x >= 9 && x <= 15 && y >= 5 && y <= 10) {
        terrain = 'dirt';
        elevation = 0;
      }

      // Storm/mountain region (right side)
      if (x > 16 && y < 10) {
        terrain = Math.random() > 0.5 ? 'stone' : 'rock';
        elevation = Math.min(3, Math.floor((x - 16) / 2) + 1);
      }

      // River flowing through
      if (
        (x >= 7 && x <= 8 && y >= 0 && y <= 7) ||
        (x >= 8 && x <= 10 && y >= 7 && y <= 8) ||
        (x >= 10 && x <= 11 && y >= 8 && y <= 15)
      ) {
        terrain = 'water';
        elevation = 0;
      }

      // Bridges over water at path crossings
      if (terrain === 'water' && ((x === 8 && y === 5) || (x === 10 && y === 10))) {
        terrain = 'bridge';
      }

      // Path connections (will be overridden by paths between locations)
      if (
        (y === 8 && x >= 4 && x <= 18) ||
        (x === 12 && y >= 4 && y <= 12)
      ) {
        if (terrain !== 'water' && terrain !== 'bridge') {
          terrain = 'path';
        }
      }

      // Decorative elements
      if (terrain === 'grass' && Math.random() > 0.92) {
        terrain = 'flower';
      }
      if (terrain === 'grass' && y > 12 && Math.random() > 0.85) {
        terrain = 'mushroom';
      }

      // Sandy edges near water
      if (terrain === 'grass') {
        const nearWater = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        ].some(([nx, ny]) => {
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return false;
          // Check inline (simplified — terrain gen is deterministic by position)
          return (
            (nx >= 7 && nx <= 8 && ny >= 0 && ny <= 7) ||
            (nx >= 8 && nx <= 10 && ny >= 7 && ny <= 8) ||
            (nx >= 10 && nx <= 11 && ny >= 8 && ny <= 15)
          );
        });
        if (nearWater) terrain = 'sand';
      }

      tiles.push({ x, y, terrain, elevation });
    }
  }

  return tiles;
}

// Use a stable seeded generation (call once)
export const MAP_TERRAIN: MapTile[] = generateMapTerrain();
export { MAP_WIDTH, MAP_HEIGHT };

// === Dungeon location definitions ===

export const DUNGEON_LOCATIONS: DungeonLocation[] = [
  {
    id: 'camp',
    name: 'キャンプ',
    nameEn: 'Camp',
    description: '冒険者たちの集う拠点。ここから旅が始まる。',
    descriptionEn: 'The base where adventurers gather. Your journey begins here.',
    mapX: 4,
    mapY: 8,
    icon: '🏕️',
    accentColor: '#8B6914',
    biome: 'forest',
    chapterId: null, // Hub — no chapter
    difficulty: 0,
    estimatedMinutes: 0,
    dungeonWidth: 0,
    dungeonHeight: 0,
    dungeonTiles: [],
    dungeonMobs: [],
    dungeonItems: [],
    requires: [],
  },
  {
    id: 'creeper-woods',
    name: '目覚めの森',
    nameEn: 'Creeper Woods',
    description: '深い森の奥、朝靄が木々の間を漂っている。アズレアとの出会いの場所。',
    descriptionEn: 'Deep in the forest, morning mist drifts between the trees. The place where you meet Azurea.',
    mapX: 6,
    mapY: 5,
    icon: '🌲',
    accentColor: '#4CAF50',
    biome: 'forest',
    chapterId: 'awakening',
    difficulty: 1,
    estimatedMinutes: 5,
    dungeonWidth: 12,
    dungeonHeight: 10,
    dungeonTiles: [
      // Entrance area
      ...Array.from({ length: 4 }, (_, i) => ({ x: 1, y: 4 + i, type: 'floor' as const })),
      { x: 0, y: 5, type: 'entrance' as const },
      // Main corridor
      ...Array.from({ length: 8 }, (_, i) => ({ x: 2 + i, y: 5, type: 'floor' as const })),
      ...Array.from({ length: 8 }, (_, i) => ({ x: 2 + i, y: 6, type: 'floor' as const })),
      // Side rooms
      ...Array.from({ length: 3 }, (_, i) => ({ x: 4 + i, y: 3, type: 'floor' as const })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: 4 + i, y: 4, type: 'floor' as const })),
      { x: 5, y: 3, type: 'chest' as const },
      // Bottom room
      ...Array.from({ length: 4 }, (_, i) => ({ x: 7 + i, y: 7, type: 'floor' as const })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 7 + i, y: 8, type: 'floor' as const })),
      { x: 9, y: 8, type: 'chest' as const },
      // Exit
      { x: 10, y: 5, type: 'door' as const },
      { x: 11, y: 5, type: 'exit' as const },
    ],
    dungeonMobs: [
      { id: 'z1', type: 'zombie', x: 5, y: 5, health: 3, damage: 1 },
      { id: 'z2', type: 'zombie', x: 7, y: 6, health: 3, damage: 1 },
      { id: 's1', type: 'spider', x: 8, y: 8, health: 2, damage: 1 },
    ],
    dungeonItems: [
      { id: 'bread1', type: 'bread', x: 3, y: 6, name: 'パン', nameEn: 'Bread' },
      { id: 'em1', type: 'emerald', x: 5, y: 4, name: 'エメラルド', nameEn: 'Emerald' },
    ],
    requires: ['camp'],
  },
  {
    id: 'soggy-village',
    name: 'メロディア村',
    nameEn: 'Melodia Village',
    description: '青い光に包まれた村。リズミアで最初に生まれた場所。',
    descriptionEn: 'A village bathed in blue light. The first place born in Rhythmia.',
    mapX: 12,
    mapY: 7,
    icon: '🏘️',
    accentColor: '#2196F3',
    biome: 'village',
    chapterId: 'melodia',
    difficulty: 2,
    estimatedMinutes: 8,
    dungeonWidth: 14,
    dungeonHeight: 12,
    dungeonTiles: [
      // Village entrance
      { x: 0, y: 6, type: 'entrance' as const },
      ...Array.from({ length: 12 }, (_, i) => ({ x: 1 + i, y: 6, type: 'floor' as const })),
      ...Array.from({ length: 12 }, (_, i) => ({ x: 1 + i, y: 7, type: 'floor' as const })),
      // Upper area
      ...Array.from({ length: 6 }, (_, i) => ({ x: 3 + i, y: 3, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 3 + i, y: 4, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 3 + i, y: 5, type: 'floor' as const })),
      // Water feature in center
      { x: 6, y: 4, type: 'water' as const },
      { x: 7, y: 4, type: 'water' as const },
      { x: 6, y: 5, type: 'water' as const },
      // Lower area
      ...Array.from({ length: 8 }, (_, i) => ({ x: 3 + i, y: 8, type: 'floor' as const })),
      ...Array.from({ length: 8 }, (_, i) => ({ x: 3 + i, y: 9, type: 'floor' as const })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 5 + i, y: 10, type: 'floor' as const })),
      // Chests
      { x: 4, y: 3, type: 'chest' as const },
      { x: 10, y: 9, type: 'chest' as const },
      // Exit
      { x: 13, y: 6, type: 'door' as const },
      { x: 13, y: 7, type: 'exit' as const },
    ],
    dungeonMobs: [
      { id: 'z3', type: 'zombie', x: 5, y: 6, health: 4, damage: 1 },
      { id: 'sk1', type: 'skeleton', x: 8, y: 4, health: 3, damage: 2 },
      { id: 'z4', type: 'zombie', x: 9, y: 8, health: 4, damage: 1 },
      { id: 'sp1', type: 'spider', x: 6, y: 9, health: 3, damage: 1 },
    ],
    dungeonItems: [
      { id: 'pot1', type: 'potion', x: 4, y: 7, name: 'ポーション', nameEn: 'Potion' },
      { id: 'em2', type: 'emerald', x: 11, y: 7, name: 'エメラルド', nameEn: 'Emerald' },
      { id: 'em3', type: 'emerald', x: 4, y: 3, name: 'エメラルド', nameEn: 'Emerald' },
      { id: 'key1', type: 'key', x: 7, y: 9, name: '鍵', nameEn: 'Key' },
    ],
    requires: ['creeper-woods'],
  },
  {
    id: 'highblock-halls',
    name: '嵐の高台',
    nameEn: 'Highblock Halls',
    description: '空が暗くなり、不穏なリズムが大地を揺らし始めた。ディスコードの波が迫る。',
    descriptionEn: 'The sky darkens, and an ominous rhythm shakes the earth. The wave of Discord approaches.',
    mapX: 18,
    mapY: 5,
    icon: '⛈️',
    accentColor: '#FF6B6B',
    biome: 'storm',
    chapterId: 'crescendo',
    difficulty: 3,
    estimatedMinutes: 10,
    dungeonWidth: 16,
    dungeonHeight: 14,
    dungeonTiles: [
      // Entry hall
      { x: 0, y: 7, type: 'entrance' as const },
      ...Array.from({ length: 6 }, (_, i) => ({ x: 1 + i, y: 7, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 1 + i, y: 8, type: 'floor' as const })),
      // Central chamber
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 4, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 5, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 6, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 7, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 8, type: 'floor' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i, y: 9, type: 'floor' as const })),
      // Lava hazards
      { x: 6, y: 5, type: 'lava' as const },
      { x: 9, y: 5, type: 'lava' as const },
      { x: 7, y: 9, type: 'lava' as const },
      { x: 8, y: 9, type: 'lava' as const },
      // Traps
      { x: 6, y: 7, type: 'trap' as const },
      { x: 9, y: 6, type: 'trap' as const },
      // Right wing
      ...Array.from({ length: 4 }, (_, i) => ({ x: 11 + i, y: 6, type: 'floor' as const })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 11 + i, y: 7, type: 'floor' as const })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 11 + i, y: 8, type: 'floor' as const })),
      // Chests
      { x: 13, y: 6, type: 'chest' as const },
      { x: 8, y: 4, type: 'chest' as const },
      // Boss door and exit
      { x: 14, y: 7, type: 'door' as const },
      { x: 15, y: 7, type: 'exit' as const },
    ],
    dungeonMobs: [
      { id: 'z5', type: 'zombie', x: 6, y: 6, health: 5, damage: 2 },
      { id: 'sk2', type: 'skeleton', x: 9, y: 7, health: 4, damage: 2 },
      { id: 'sk3', type: 'skeleton', x: 12, y: 7, health: 4, damage: 2 },
      { id: 'cr1', type: 'creeper', x: 7, y: 8, health: 5, damage: 3 },
      { id: 'en1', type: 'enderman', x: 13, y: 7, health: 8, damage: 3, loot: 'artifact' },
    ],
    dungeonItems: [
      { id: 'pot2', type: 'potion', x: 5, y: 8, name: 'ポーション', nameEn: 'Potion' },
      { id: 'pot3', type: 'potion', x: 11, y: 8, name: 'ポーション', nameEn: 'Potion' },
      { id: 'em4', type: 'emerald', x: 8, y: 4, name: 'エメラルド', nameEn: 'Emerald' },
      { id: 'em5', type: 'emerald', x: 14, y: 6, name: 'エメラルド', nameEn: 'Emerald' },
      { id: 'art1', type: 'artifact', x: 10, y: 6, name: 'リズムの欠片', nameEn: 'Rhythm Shard' },
    ],
    requires: ['soggy-village'],
  },
];

// === Map paths connecting locations ===

export const MAP_PATHS: MapPath[] = [
  {
    from: 'camp',
    to: 'creeper-woods',
    waypoints: [
      { x: 4, y: 8 },
      { x: 5, y: 7 },
      { x: 5, y: 6 },
      { x: 6, y: 5 },
    ],
  },
  {
    from: 'creeper-woods',
    to: 'soggy-village',
    waypoints: [
      { x: 6, y: 5 },
      { x: 7, y: 6 },
      { x: 8, y: 6 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 12, y: 7 },
    ],
  },
  {
    from: 'soggy-village',
    to: 'highblock-halls',
    waypoints: [
      { x: 12, y: 7 },
      { x: 13, y: 7 },
      { x: 14, y: 6 },
      { x: 15, y: 6 },
      { x: 16, y: 5 },
      { x: 18, y: 5 },
    ],
  },
];

// === Helpers ===

export function getChapterForLocation(location: DungeonLocation): Chapter | null {
  if (!location.chapterId) return null;
  return CHAPTERS.find(c => c.id === location.chapterId) ?? null;
}

export function getLocationStatus(
  locationId: string,
  progress: DungeonProgress
): LocationStatus {
  if (progress.completedLocations.includes(locationId)) return 'completed';

  const location = DUNGEON_LOCATIONS.find(l => l.id === locationId);
  if (!location) return 'locked';

  // Camp is always available
  if (location.requires.length === 0) return 'available';

  // Check if all prerequisites are completed
  const allRequirementsMet = location.requires.every(
    req => progress.completedLocations.includes(req)
  );

  return allRequirementsMet ? 'available' : 'locked';
}

export const DEFAULT_PROGRESS: DungeonProgress = {
  completedLocations: ['camp'], // Camp starts as completed
  currentLocation: null,
  totalEmeralds: 0,
  totalDefeated: 0,
};
