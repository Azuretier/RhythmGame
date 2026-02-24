// =============================================================================
// ECHOES OF ETERNITY — Dungeon & Exploration System
// ダンジョン＆探索システム
// =============================================================================

import type {
  DungeonDefinition,
  DungeonFloor,
  DungeonTile,
  DungeonTileType,
  DungeonTrap,
  DungeonPuzzle,
  DungeonDifficulty,
  DungeonReward,
  DungeonStats,
  TreasureChest,
  EnemySpawn,
  WorldRegion,
  SubRegion,
  BiomeType,
  Element,
  Position2D,
  TerrainType,
  WeatherType,
  ItemRarity,
  LootEntry,
} from '@/types/echoes';

// ---------------------------------------------------------------------------
// Dungeon Generation
// ---------------------------------------------------------------------------

export interface DungeonGenerationOptions {
  width?: number;
  height?: number;
  roomCount?: number;
  difficulty: DungeonDifficulty;
  biome: BiomeType;
  floor: number;
  seed?: number;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

/**
 * Generate a dungeon floor with rooms, corridors, enemies, traps, and chests
 */
export function generateDungeonFloor(options: DungeonGenerationOptions): DungeonFloor {
  const {
    width = 30,
    height = 30,
    roomCount = 6,
    difficulty,
    biome,
    floor,
    seed = Date.now(),
  } = options;

  const rng = new SeededRandom(seed + floor * 1000);
  const difficultyMultiplier = getDifficultyMultiplier(difficulty);

  // Initialize grid with walls
  const layout: DungeonTile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      type: 'wall' as DungeonTileType,
      position: { x, y },
      isRevealed: false,
    }))
  );

  // Generate rooms
  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < roomCount; i++) {
    const roomW = rng.nextInt(4, 8);
    const roomH = rng.nextInt(4, 8);
    const roomX = rng.nextInt(1, width - roomW - 1);
    const roomY = rng.nextInt(1, height - roomH - 1);

    // Check for overlap
    const overlaps = rooms.some(
      (r) =>
        roomX < r.x + r.w + 1 &&
        roomX + roomW + 1 > r.x &&
        roomY < r.y + r.h + 1 &&
        roomY + roomH + 1 > r.y
    );
    if (overlaps) continue;

    rooms.push({ x: roomX, y: roomY, w: roomW, h: roomH });

    // Carve room
    for (let ry = roomY; ry < roomY + roomH; ry++) {
      for (let rx = roomX; rx < roomX + roomW; rx++) {
        layout[ry][rx].type = 'floor';
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);

    // Horizontal then vertical corridor
    const startX = Math.min(ax, bx);
    const endX = Math.max(ax, bx);
    for (let x = startX; x <= endX; x++) {
      if (layout[ay] && layout[ay][x]) layout[ay][x].type = 'floor';
    }

    const startY = Math.min(ay, by);
    const endY = Math.max(ay, by);
    for (let y = startY; y <= endY; y++) {
      if (layout[y] && layout[y][bx]) layout[y][bx].type = 'floor';
    }
  }

  // Place entry and exit
  const entryRoom = rooms[0];
  const exitRoom = rooms[rooms.length - 1];
  const entryPosition: Position2D = {
    x: Math.floor(entryRoom.x + entryRoom.w / 2),
    y: Math.floor(entryRoom.y + entryRoom.h / 2),
  };
  const exitPosition: Position2D = {
    x: Math.floor(exitRoom.x + exitRoom.w / 2),
    y: Math.floor(exitRoom.y + exitRoom.h / 2),
  };
  layout[exitPosition.y][exitPosition.x].type = 'stairs';

  // Determine if boss floor (every 5 floors or floor 10/20/30...)
  const isBossFloor = floor % 5 === 0;

  // Place enemies
  const enemies: EnemySpawn[] = [];
  const biomeElement = BIOME_ELEMENTS[biome] || 'fire';
  const enemyCount = Math.floor(2 + floor * 0.5 * difficultyMultiplier);

  for (let i = 0; i < enemyCount; i++) {
    const room = rng.pick(rooms.slice(1)); // skip entry room
    enemies.push({
      enemyId: isBossFloor && i === 0 ? `boss_${biome}` : `mob_${biomeElement}`,
      position: {
        x: rng.nextInt(room.x + 1, room.x + room.w - 2),
        y: rng.nextInt(room.y + 1, room.y + room.h - 2),
      },
      respawnTime: 0, // dungeon enemies don't respawn
      count: 1,
      level: { min: floor, max: floor + Math.floor(difficultyMultiplier * 3) },
    });
  }

  // Place traps
  const traps: DungeonTrap[] = [];
  const trapCount = Math.floor(difficultyMultiplier * floor * 0.3);
  const trapTypes: DungeonTrap['type'][] = ['spike', 'fire', 'poison', 'crush'];

  for (let i = 0; i < trapCount; i++) {
    const room = rng.pick(rooms.slice(1));
    traps.push({
      type: rng.pick(trapTypes),
      position: {
        x: rng.nextInt(room.x, room.x + room.w - 1),
        y: rng.nextInt(room.y, room.y + room.h - 1),
      },
      damage: 20 + floor * 5 * difficultyMultiplier,
      element: biomeElement,
      isActive: true,
      interval: 30, // activates every 3 seconds
    });
  }

  // Place treasure chests
  const chests: TreasureChest[] = [];
  const chestCount = rng.nextInt(1, Math.min(rooms.length - 1, 4));

  for (let i = 0; i < chestCount; i++) {
    const room = rng.pick(rooms.slice(1, -1)); // not in entry or exit room
    const chestRarity: ItemRarity = rng.next() < 0.1 ? 'epic' : rng.next() < 0.3 ? 'rare' : 'uncommon';

    chests.push({
      id: `chest_${floor}_${i}`,
      position: {
        x: Math.floor(room.x + room.w / 2),
        y: Math.floor(room.y + room.h / 2),
      },
      rarity: chestRarity,
      contents: generateChestLoot(floor, chestRarity, difficultyMultiplier),
      isOpened: false,
    });

    // Mark on map
    const cx = Math.floor(room.x + room.w / 2);
    const cy = Math.floor(room.y + room.h / 2);
    if (layout[cy] && layout[cy][cx]) {
      layout[cy][cx].type = 'chest';
    }
  }

  // Place puzzles (1 per floor, harder on later floors)
  const puzzles: DungeonPuzzle[] = [];
  if (rooms.length > 2 && rng.next() < 0.6) {
    const puzzleRoom = rng.pick(rooms.slice(1, -1));
    const puzzleTypes: DungeonPuzzle['type'][] = ['switch', 'sequence', 'rhythm', 'elemental', 'tetris'];
    puzzles.push({
      type: rng.pick(puzzleTypes),
      position: {
        x: Math.floor(puzzleRoom.x + puzzleRoom.w / 2),
        y: puzzleRoom.y + 1,
      },
      solution: null,
      reward: generateChestLoot(floor, 'rare', difficultyMultiplier),
      isSolved: false,
    });
  }

  // Place doors between rooms
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    const midX = Math.floor((a.x + a.w / 2 + b.x + b.w / 2) / 2);
    const midY = Math.floor((a.y + a.h / 2 + b.y + b.h / 2) / 2);
    if (layout[midY] && layout[midY][midX] && layout[midY][midX].type === 'floor') {
      layout[midY][midX].type = 'door';
    }
  }

  // Boss gate before exit on boss floors
  if (isBossFloor && exitPosition.y > 0) {
    const gateY = exitPosition.y - 1;
    if (layout[gateY] && layout[gateY][exitPosition.x]) {
      layout[gateY][exitPosition.x].type = 'boss_gate';
    }
  }

  // Secret room (10% chance)
  if (rng.next() < 0.1 && rooms.length > 2) {
    const secretRoom = rooms[rooms.length - 2]; // near exit
    const sx = secretRoom.x - 1;
    const sy = secretRoom.y;
    if (sx >= 0 && layout[sy] && layout[sy][sx]) {
      layout[sy][sx].type = 'secret';
    }
  }

  // Reveal entry room
  for (let ry = entryRoom.y; ry < entryRoom.y + entryRoom.h; ry++) {
    for (let rx = entryRoom.x; rx < entryRoom.x + entryRoom.w; rx++) {
      if (layout[ry] && layout[ry][rx]) {
        layout[ry][rx].isRevealed = true;
      }
    }
  }

  return {
    floor,
    layout,
    enemies,
    traps,
    puzzles,
    chests,
    isBossFloor,
    exitPosition,
    entryPosition,
  };
}

function generateChestLoot(floor: number, rarity: ItemRarity, diffMultiplier: number): LootEntry[] {
  const loot: LootEntry[] = [
    {
      itemId: 'gold_coin',
      chance: 1.0,
      minQuantity: 20 + floor * 10,
      maxQuantity: 50 + floor * 20,
      rarity: 'common',
    },
  ];

  if (rarity === 'rare' || rarity === 'epic') {
    loot.push({
      itemId: 'exp_crystal',
      chance: 0.8,
      minQuantity: 1 + Math.floor(floor / 5),
      maxQuantity: 3 + Math.floor(floor / 3),
      rarity: 'uncommon',
    });
  }

  if (rarity === 'epic') {
    loot.push({
      itemId: 'equipment_drop',
      chance: 0.5,
      minQuantity: 1,
      maxQuantity: 1,
      rarity: 'rare',
    });
  }

  return loot;
}

function getDifficultyMultiplier(difficulty: DungeonDifficulty): number {
  switch (difficulty) {
    case 'normal': return 1.0;
    case 'hard': return 1.5;
    case 'expert': return 2.0;
    case 'nightmare': return 3.0;
    case 'abyss': return 5.0;
  }
}

// ---------------------------------------------------------------------------
// Biome → Element mapping
// ---------------------------------------------------------------------------

const BIOME_ELEMENTS: Record<BiomeType, Element> = {
  enchanted_forest: 'wind',
  crystal_caverns: 'earth',
  volcanic_peaks: 'fire',
  frozen_wastes: 'ice',
  celestial_islands: 'light',
  abyssal_depths: 'dark',
  ancient_ruins: 'earth',
  shadow_realm: 'dark',
  meadow_plains: 'wind',
  desert_oasis: 'fire',
  storm_highlands: 'thunder',
  void_rift: 'dark',
};

// ---------------------------------------------------------------------------
// World Region Definitions
// ---------------------------------------------------------------------------

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'enchanted_forest',
    name: 'Whisperwood',
    nameJa: '囁きの森',
    biome: 'enchanted_forest',
    level: { min: 1, max: 15 },
    dominantElement: 'wind',
    subRegions: [
      {
        id: 'whisperwood_grove', name: 'Ancient Grove', nameJa: '古の森',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        terrain: 'forest', weather: 'clear',
        enemySpawns: [
          { enemyId: 'forest_slime', position: { x: 50, y: 50 }, respawnTime: 300, count: 3, level: { min: 1, max: 5 } },
          { enemyId: 'wind_spirit', position: { x: 150, y: 100 }, respawnTime: 600, count: 2, level: { min: 3, max: 8 } },
        ],
        treasureChests: [
          { id: 'chest_grove_1', position: { x: 100, y: 30 }, rarity: 'common', contents: [{ itemId: 'herb_green', chance: 1, minQuantity: 3, maxQuantity: 5, rarity: 'common' }], isOpened: false },
        ],
        interactables: [
          { id: 'waypoint_grove', type: 'waypoint', position: { x: 100, y: 100 }, data: {} },
          { id: 'campfire_grove', type: 'campfire', position: { x: 80, y: 80 }, data: {} },
        ],
        waypoint: { x: 100, y: 100 },
      },
    ],
    dungeons: [],
    bosses: ['treant_elder'],
    resources: ['wood_oak', 'herb_green', 'mushroom_glow', 'wind_essence'],
    npcs: [
      {
        id: 'npc_herbalist', name: 'Elder Willow', nameJa: '長老ウィロウ',
        role: 'alchemist',
        dialogue: [{ id: 'd1', text: 'Welcome to Whisperwood, traveler.', textJa: '囁きの森へようこそ、旅人よ。' }],
        sprite: 'npc_herbalist',
      },
    ],
    discoveryReward: 100,
    music: 'bgm_whisperwood',
    ambience: 'sfx_forest_ambient',
  },
  {
    id: 'volcanic_peaks',
    name: 'Ember Summit',
    nameJa: '燼の頂',
    biome: 'volcanic_peaks',
    level: { min: 10, max: 25 },
    dominantElement: 'fire',
    subRegions: [
      {
        id: 'ember_base', name: 'Magma Fields', nameJa: 'マグマ原野',
        bounds: { x: 0, y: 0, width: 250, height: 200 },
        terrain: 'volcano', weather: 'clear',
        enemySpawns: [
          { enemyId: 'fire_elemental', position: { x: 80, y: 60 }, respawnTime: 300, count: 3, level: { min: 10, max: 15 } },
          { enemyId: 'lava_golem', position: { x: 200, y: 150 }, respawnTime: 900, count: 1, level: { min: 15, max: 20 } },
        ],
        treasureChests: [],
        interactables: [
          { id: 'forge_ember', type: 'crafting_station', position: { x: 120, y: 100 }, data: { stationType: 'forge' } },
        ],
      },
    ],
    dungeons: [],
    bosses: ['magma_dragon'],
    resources: ['ore_iron', 'ore_obsidian', 'fire_essence', 'dragon_scale'],
    npcs: [],
    discoveryReward: 200,
    music: 'bgm_ember_summit',
    ambience: 'sfx_volcano_ambient',
  },
  {
    id: 'crystal_caverns',
    name: 'Prismatic Depths',
    nameJa: '虹彩の深部',
    biome: 'crystal_caverns',
    level: { min: 15, max: 35 },
    dominantElement: 'earth',
    subRegions: [
      {
        id: 'crystal_entrance', name: 'Crystal Antechamber', nameJa: '水晶の前室',
        bounds: { x: 0, y: 0, width: 200, height: 300 },
        terrain: 'dungeon', weather: 'clear',
        enemySpawns: [
          { enemyId: 'crystal_bat', position: { x: 60, y: 80 }, respawnTime: 300, count: 5, level: { min: 15, max: 20 } },
          { enemyId: 'gem_golem', position: { x: 150, y: 200 }, respawnTime: 600, count: 2, level: { min: 20, max: 30 } },
        ],
        treasureChests: [
          { id: 'chest_crystal_1', position: { x: 100, y: 250 }, rarity: 'rare', contents: [{ itemId: 'gem_sapphire', chance: 1, minQuantity: 1, maxQuantity: 3, rarity: 'rare' }], isOpened: false },
        ],
        interactables: [],
      },
    ],
    dungeons: [],
    bosses: ['crystal_titan'],
    resources: ['ore_crystal', 'gem_sapphire', 'gem_ruby', 'earth_essence', 'luminite_shard'],
    npcs: [],
    discoveryReward: 300,
    music: 'bgm_crystal_caverns',
    ambience: 'sfx_cave_ambient',
  },
  {
    id: 'frozen_wastes',
    name: 'Everglacier',
    nameJa: '永氷原',
    biome: 'frozen_wastes',
    level: { min: 20, max: 40 },
    dominantElement: 'ice',
    subRegions: [
      {
        id: 'glacier_edge', name: 'Frost Border', nameJa: '霜の境界',
        bounds: { x: 0, y: 0, width: 300, height: 200 },
        terrain: 'tundra', weather: 'snow',
        enemySpawns: [
          { enemyId: 'frost_wolf', position: { x: 100, y: 50 }, respawnTime: 300, count: 4, level: { min: 20, max: 25 } },
          { enemyId: 'ice_wraith', position: { x: 200, y: 100 }, respawnTime: 600, count: 2, level: { min: 25, max: 35 } },
        ],
        treasureChests: [],
        interactables: [
          { id: 'waypoint_glacier', type: 'waypoint', position: { x: 150, y: 100 }, data: {} },
        ],
        waypoint: { x: 150, y: 100 },
      },
    ],
    dungeons: [],
    bosses: ['frost_monarch'],
    resources: ['ice_crystal', 'snowdrop_herb', 'ice_essence', 'frost_ore'],
    npcs: [],
    discoveryReward: 350,
    music: 'bgm_everglacier',
    ambience: 'sfx_blizzard_ambient',
  },
  {
    id: 'celestial_islands',
    name: 'Aetheria',
    nameJa: '天空島アエテリア',
    biome: 'celestial_islands',
    level: { min: 35, max: 55 },
    dominantElement: 'light',
    subRegions: [
      {
        id: 'sky_platform', name: 'Skyreach Platform', nameJa: '天翔台',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        terrain: 'plains', weather: 'aurora',
        enemySpawns: [
          { enemyId: 'sky_sentinel', position: { x: 100, y: 100 }, respawnTime: 600, count: 2, level: { min: 35, max: 45 } },
        ],
        treasureChests: [
          { id: 'chest_sky_1', position: { x: 50, y: 50 }, rarity: 'epic', contents: [{ itemId: 'light_essence', chance: 1, minQuantity: 2, maxQuantity: 5, rarity: 'epic' }], isOpened: false },
        ],
        interactables: [
          { id: 'waypoint_sky', type: 'waypoint', position: { x: 100, y: 100 }, data: {} },
        ],
        waypoint: { x: 100, y: 100 },
      },
    ],
    dungeons: [],
    bosses: ['seraph_prime'],
    resources: ['cloud_feather', 'starlight_shard', 'light_essence', 'celestial_ore'],
    npcs: [],
    discoveryReward: 500,
    music: 'bgm_aetheria',
    ambience: 'sfx_celestial_ambient',
  },
  {
    id: 'shadow_realm',
    name: 'The Umbral Rift',
    nameJa: '影の裂け目',
    biome: 'shadow_realm',
    level: { min: 50, max: 80 },
    dominantElement: 'dark',
    subRegions: [
      {
        id: 'rift_entrance', name: 'Void Threshold', nameJa: '虚空の敷居',
        bounds: { x: 0, y: 0, width: 250, height: 250 },
        terrain: 'void', weather: 'fog',
        enemySpawns: [
          { enemyId: 'void_phantom', position: { x: 125, y: 125 }, respawnTime: 300, count: 5, level: { min: 50, max: 60 } },
          { enemyId: 'shadow_behemoth', position: { x: 200, y: 200 }, respawnTime: 1800, count: 1, level: { min: 65, max: 75 } },
        ],
        treasureChests: [
          { id: 'chest_void_1', position: { x: 50, y: 200 }, rarity: 'legendary', contents: [{ itemId: 'void_crystal', chance: 1, minQuantity: 1, maxQuantity: 1, rarity: 'legendary' }], isOpened: false },
        ],
        interactables: [],
      },
    ],
    dungeons: [],
    bosses: ['oblivion_king'],
    resources: ['dark_essence', 'void_crystal', 'shadow_thread', 'abyssal_ore'],
    npcs: [],
    discoveryReward: 1000,
    music: 'bgm_umbral_rift',
    ambience: 'sfx_void_ambient',
  },
];

// ---------------------------------------------------------------------------
// Dungeon Presets
// ---------------------------------------------------------------------------

export const DUNGEON_PRESETS: DungeonDefinition[] = [
  {
    id: 'dungeon_whisperwood_crypt',
    name: 'Mosscovered Crypt',
    nameJa: '苔むした地下聖堂',
    description: 'An ancient burial ground beneath the forest',
    descriptionJa: '森の下に眠る古代の墓地',
    regionId: 'enchanted_forest',
    floors: [], // generated dynamically
    difficulty: 'normal',
    recommendedLevel: 5,
    maxPlayers: 4,
    isEndless: false,
    bossId: 'crypt_guardian',
    rewards: {
      experience: 500,
      gold: 200,
      guaranteedLoot: [{ itemId: 'wind_essence', chance: 1, minQuantity: 3, maxQuantity: 5, rarity: 'uncommon' }],
      bonusLoot: [{ itemId: 'rare_weapon_box', chance: 0.2, minQuantity: 1, maxQuantity: 1, rarity: 'rare' }],
      firstClearBonus: [{ itemId: 'gacha_ticket', chance: 1, minQuantity: 1, maxQuantity: 1, rarity: 'rare' }],
    },
    weeklyReset: false,
    music: 'bgm_crypt',
  },
  {
    id: 'dungeon_ember_forge',
    name: 'Dragon\'s Forge',
    nameJa: '竜の鍛冶場',
    description: 'A forge built inside an active volcano',
    descriptionJa: '活火山の中に建てられた鍛冶場',
    regionId: 'volcanic_peaks',
    floors: [],
    difficulty: 'hard',
    recommendedLevel: 15,
    maxPlayers: 4,
    isEndless: false,
    bossId: 'forge_master',
    rewards: {
      experience: 1000,
      gold: 500,
      guaranteedLoot: [{ itemId: 'fire_essence', chance: 1, minQuantity: 5, maxQuantity: 8, rarity: 'uncommon' }],
      bonusLoot: [{ itemId: 'dragon_scale', chance: 0.3, minQuantity: 1, maxQuantity: 2, rarity: 'epic' }],
    },
    weeklyReset: true,
    music: 'bgm_forge',
  },
  {
    id: 'dungeon_abyss_spiral',
    name: 'Spiral Abyss',
    nameJa: '螺旋の深淵',
    description: 'An endless descent into the unknown',
    descriptionJa: '未知への果てなき降下',
    regionId: 'shadow_realm',
    floors: [],
    difficulty: 'nightmare',
    recommendedLevel: 40,
    maxPlayers: 4,
    isEndless: true,
    rewards: {
      experience: 0, // scales with floor
      gold: 0,
      guaranteedLoot: [],
      bonusLoot: [],
    },
    weeklyReset: true,
    music: 'bgm_abyss',
  },
];

// ---------------------------------------------------------------------------
// Fog of War & Exploration
// ---------------------------------------------------------------------------

/**
 * Reveal tiles around a position (line of sight)
 */
export function revealTiles(
  layout: DungeonTile[][],
  position: Position2D,
  viewRadius: number = 5
): Position2D[] {
  const revealed: Position2D[] = [];

  for (let dy = -viewRadius; dy <= viewRadius; dy++) {
    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > viewRadius) continue;

      const x = position.x + dx;
      const y = position.y + dy;

      if (y < 0 || y >= layout.length || x < 0 || x >= layout[0].length) continue;

      // Simple line-of-sight: check if wall blocks view
      if (!isBlockedByWall(layout, position, { x, y })) {
        if (!layout[y][x].isRevealed) {
          layout[y][x].isRevealed = true;
          revealed.push({ x, y });
        }
      }
    }
  }

  return revealed;
}

function isBlockedByWall(layout: DungeonTile[][], from: Position2D, to: Position2D): boolean {
  // Simple Bresenham's line check
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let err = dx - dy;
  let cx = from.x;
  let cy = from.y;

  while (cx !== to.x || cy !== to.y) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }

    if (cx === to.x && cy === to.y) break;
    if (cy < 0 || cy >= layout.length || cx < 0 || cx >= layout[0].length) return true;
    if (layout[cy][cx].type === 'wall') return true;
  }

  return false;
}

/**
 * Check if a position is walkable
 */
export function isWalkable(layout: DungeonTile[][], pos: Position2D): boolean {
  if (pos.y < 0 || pos.y >= layout.length || pos.x < 0 || pos.x >= layout[0].length) return false;
  const tile = layout[pos.y][pos.x];
  return tile.type !== 'wall' && tile.type !== 'void';
}

/**
 * Calculate dungeon completion stats
 */
export function calculateDungeonStats(
  floorsCleared: number,
  enemiesDefeated: number,
  startTime: number,
  deathCount: number,
  trapsTriggered: number,
  puzzlesSolved: number,
  chestsOpened: number,
  bestCombo: number,
  enemyLevel: number
): DungeonStats {
  return {
    floorsCleared,
    totalEnemiesDefeated: enemiesDefeated,
    timeTaken: Date.now() - startTime,
    deathCount,
    trapsTriggered,
    puzzlesSolved,
    chestsOpened,
    bestCombo,
    experienceGained: enemiesDefeated * enemyLevel * 10 + floorsCleared * 100 + puzzlesSolved * 50,
  };
}

/**
 * Get a region by ID
 */
export function getRegionById(id: string): WorldRegion | undefined {
  return WORLD_REGIONS.find((r) => r.id === id);
}

/**
 * Get dungeon preset by ID
 */
export function getDungeonPreset(id: string): DungeonDefinition | undefined {
  return DUNGEON_PRESETS.find((d) => d.id === id);
}

/**
 * Get regions appropriate for a player's level
 */
export function getRegionsForLevel(level: number): WorldRegion[] {
  return WORLD_REGIONS.filter((r) => level >= r.level.min - 5); // Allow access 5 levels early
}
