// =============================================================
// Game Mode Map — Data & Types
// Isometric map for the gamemode select screen in RhythmiaLobby.
// Adapts the Dungeons map system for game mode selection.
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

// === Map dimensions (smaller, focused map) ===

export const GAMEMODE_MAP_WIDTH = 16;
export const GAMEMODE_MAP_HEIGHT = 12;

// === Seeded PRNG for deterministic terrain ===

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// === Terrain generation ===

function generateGameModeTerrain(): MapTile[] {
  const tiles: MapTile[] = [];
  const rand = seededRandom(12345);

  for (let y = 0; y < GAMEMODE_MAP_HEIGHT; y++) {
    for (let x = 0; x < GAMEMODE_MAP_WIDTH; x++) {
      let terrain: TerrainType = 'grass';
      let elevation = 0;

      // Forest region (top-left, around solo mode)
      if (x < 7 && y < 6) {
        terrain = rand() > 0.65 ? 'tree' : 'grass';
        elevation = rand() > 0.85 ? 1 : 0;
        if (x < 2 && y < 4) terrain = 'tree';
      }

      // Storm/mountain region (top-right, around battle arena)
      if (x > 9 && y < 6) {
        terrain = rand() > 0.45 ? 'stone' : 'rock';
        elevation = Math.min(3, Math.floor((x - 9) / 2) + 1);
        if (x > 13 && y < 3) elevation = 3;
      }

      // Village region (bottom-right, around grand arena)
      if (x > 9 && y > 6) {
        terrain = 'dirt';
        elevation = 0;
        if (rand() > 0.85) terrain = 'path';
      }

      // Cave/mystery region (bottom-left, around stories)
      if (x < 7 && y > 6) {
        if (rand() > 0.6) {
          terrain = 'stone';
        } else if (rand() > 0.7) {
          terrain = 'mushroom';
        }
        elevation = rand() > 0.7 ? 1 : 0;
      }

      // Central river (flowing from top to bottom through middle)
      if (
        (x >= 7 && x <= 8 && y >= 0 && y <= 4) ||
        (x >= 7 && x <= 9 && y >= 4 && y <= 5) ||
        (x >= 7 && x <= 8 && y >= 7 && y <= 11)
      ) {
        terrain = 'water';
        elevation = 0;
      }

      // Bridges at path crossings
      if (terrain === 'water' && ((x === 7 && y === 6) || (x === 8 && y === 6))) {
        terrain = 'bridge';
      }

      // Central hub paths
      if (
        (y === 6 && x >= 3 && x <= 13) ||
        (x === 8 && y >= 3 && y <= 9)
      ) {
        if (terrain !== 'water' && terrain !== 'bridge') {
          terrain = 'path';
          elevation = 0;
        }
      }

      // Decorative flowers in grass areas
      if (terrain === 'grass' && rand() > 0.92) {
        terrain = 'flower';
      }

      // Sandy edges near water
      if (terrain === 'grass' || terrain === 'dirt') {
        const nearWater = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        ].some(([nx, ny]) => {
          if (nx < 0 || nx >= GAMEMODE_MAP_WIDTH || ny < 0 || ny >= GAMEMODE_MAP_HEIGHT) return false;
          return (
            (nx >= 7 && nx <= 8 && ny >= 0 && ny <= 4) ||
            (nx >= 7 && nx <= 9 && ny >= 4 && ny <= 5) ||
            (nx >= 7 && nx <= 8 && ny >= 7 && ny <= 11)
          );
        });
        if (nearWater) terrain = 'sand';
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
    mapX: 8,
    mapY: 6,
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
    mapX: 4,
    mapY: 3,
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
    mapX: 12,
    mapY: 3,
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
    mapX: 12,
    mapY: 9,
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
    mapX: 4,
    mapY: 9,
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
      { x: 8, y: 6 },
      { x: 7, y: 5 },
      { x: 6, y: 4 },
      { x: 5, y: 3 },
      { x: 4, y: 3 },
    ],
  },
  {
    from: 'hub',
    to: 'battle',
    waypoints: [
      { x: 8, y: 6 },
      { x: 9, y: 5 },
      { x: 10, y: 4 },
      { x: 11, y: 3 },
      { x: 12, y: 3 },
    ],
  },
  {
    from: 'hub',
    to: 'arena',
    waypoints: [
      { x: 8, y: 6 },
      { x: 9, y: 7 },
      { x: 10, y: 8 },
      { x: 11, y: 9 },
      { x: 12, y: 9 },
    ],
  },
  {
    from: 'hub',
    to: 'stories',
    waypoints: [
      { x: 8, y: 6 },
      { x: 7, y: 7 },
      { x: 6, y: 8 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
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

  // Hub is always "completed" (decorative)
  if (location.action === 'hub') return 'completed';

  // Check advancement requirements
  if (location.requiresAdvancements && unlockedAdvancements < location.requiresAdvancements) {
    return 'locked';
  }

  return 'available';
}
