// =============================================================================
// Minecraft: Nintendo Switch Edition — World, Chunk, Player & Gameplay Types
// =============================================================================
// Chunk/terrain types, player state, status effects, enchantments, crafting,
// redstone, particles, sound, weather, and damage.
// =============================================================================

import type { Dimension, ItemCategory } from './items-entities';

// =============================================================================
// 8. WORLD CHUNK & TERRAIN
// =============================================================================

export const CHUNK_WIDTH = 16;
export const CHUNK_DEPTH = 16;
export const CHUNK_HEIGHT = 256;  // Switch Edition world height

export interface ChunkCoord {
  x: number;
  z: number;
}

export interface BlockCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * A chunk is a 16x256x16 column of blocks.
 * `blocks` is a flat Uint16Array indexed as blocks[y * 256 + z * 16 + x].
 * `blockLight` and `skyLight` use nibble packing (4 bits per block).
 */
export interface Chunk {
  coord: ChunkCoord;
  /** 16 x 256 x 16 = 65536 block IDs. */
  blocks: Uint16Array;
  /** Nibble-packed block light (half the block array length). */
  blockLight: Uint8Array;
  /** Nibble-packed sky light. */
  skyLight: Uint8Array;
  /** Biome at each x,z column (16x16 = 256 entries). */
  biomes: Uint8Array;
  /** Highest non-air block at each x,z column. */
  heightMap: Uint8Array;
  /** Whether the chunk has been fully generated. */
  generated: boolean;
  /** Whether the chunk has been modified since generation. */
  dirty: boolean;
  /** Tick of last modification. */
  lastModified: number;
}

/**
 * Noise parameters for terrain generation.
 */
export interface TerrainNoiseConfig {
  /** Frequency for base continent shape. */
  continentalness: number;
  /** Frequency for erosion patterns. */
  erosion: number;
  /** Frequency for peaks and valleys. */
  peaksAndValleys: number;
  /** 3D noise frequency for cave carving. */
  caveFrequency: number;
  /** Threshold for cave air. */
  caveThreshold: number;
  /** Scale of overall terrain height. */
  heightScale: number;
  /** Sea level Y coordinate. */
  seaLevel: number;
}

export const DEFAULT_TERRAIN_NOISE: TerrainNoiseConfig = {
  continentalness: 0.003,
  erosion: 0.006,
  peaksAndValleys: 0.01,
  caveFrequency: 0.05,
  caveThreshold: 0.55,
  heightScale: 64,
  seaLevel: 63,
};

// =============================================================================
// 9. PLAYER STATE
// =============================================================================

export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator';

export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  yaw: number;     // horizontal rotation (0-360)
  pitch: number;   // vertical rotation (-90 to 90)
}

export interface InventorySlot {
  item: string;     // item ID
  count: number;
  durability?: number;
  enchantments?: EnchantmentInstance[];
  nbt?: Record<string, unknown>;
}

export interface PlayerInventory {
  /** Main inventory: 27 slots (indices 0-26). */
  main: (InventorySlot | null)[];
  /** Hotbar: 9 slots (indices 0-8). */
  hotbar: (InventorySlot | null)[];
  /** Armor: 4 slots [helmet, chestplate, leggings, boots]. */
  armor: (InventorySlot | null)[];
  /** Offhand: 1 slot. */
  offhand: InventorySlot | null;
  /** Currently selected hotbar slot (0-8). */
  selectedSlot: number;
}

export interface PlayerState {
  id: string;
  name: string;
  position: PlayerPosition;
  velocity: { x: number; y: number; z: number };
  /** Health points (0-20, each heart = 2). */
  health: number;
  maxHealth: number;
  /** Hunger points (0-20, each shank = 2). */
  hunger: number;
  /** Saturation level. */
  saturation: number;
  /** Experience points in the current level. */
  experience: number;
  /** Current level. */
  level: number;
  /** Total accumulated experience. */
  totalExperience: number;
  /** Armor defense points. */
  armorPoints: number;
  /** Game mode. */
  gameMode: GameMode;
  /** Whether the player is on the ground. */
  onGround: boolean;
  /** Whether the player is sprinting. */
  sprinting: boolean;
  /** Whether the player is sneaking. */
  sneaking: boolean;
  /** Whether the player is swimming. */
  swimming: boolean;
  /** Whether the player is flying (creative mode). */
  flying: boolean;
  /** Whether the player is dead. */
  dead: boolean;
  /** Active status effects. */
  statusEffects: StatusEffectInstance[];
  /** Current dimension. */
  dimension: Dimension;
  /** Spawn point. */
  spawnPoint: BlockCoord;
  /** Inventory. */
  inventory: PlayerInventory;
  /** Whether the player is connected. */
  connected: boolean;
  /** Player display color (multiplayer). */
  color: string;
  /** Ticks since last damage (for damage immunity). */
  invulnerabilityTicks: number;
  /** Fire ticks remaining. */
  fireTicks: number;
  /** Air supply ticks (drowning). */
  airSupply: number;
  /** Maximum air supply. */
  maxAirSupply: number;
}

// =============================================================================
// 10. STATUS EFFECTS (Potion Effects)
// =============================================================================

export type StatusEffectType =
  | 'speed' | 'slowness' | 'haste' | 'mining_fatigue'
  | 'strength' | 'instant_health' | 'instant_damage'
  | 'jump_boost' | 'nausea' | 'regeneration' | 'resistance'
  | 'fire_resistance' | 'water_breathing' | 'invisibility'
  | 'blindness' | 'night_vision' | 'hunger' | 'weakness'
  | 'poison' | 'wither' | 'health_boost' | 'absorption'
  | 'saturation' | 'levitation' | 'slow_falling'
  | 'conduit_power' | 'bad_omen' | 'hero_of_the_village';

export interface StatusEffectDefinition {
  type: StatusEffectType;
  name: string;
  nameJa: string;
  /** Whether this effect is beneficial. */
  beneficial: boolean;
  /** Whether this effect is applied instantly (instant_health, instant_damage). */
  instant: boolean;
  /** Base color for particles. */
  color: string;
  /** Icon index in the effect spritesheet. */
  iconIndex: number;
}

export interface StatusEffectInstance {
  type: StatusEffectType;
  /** Amplifier level (0 = Level I, 1 = Level II, etc.). */
  amplifier: number;
  /** Duration in ticks (-1 = infinite). */
  duration: number;
  /** Whether particles are visible. */
  showParticles: boolean;
  /** Whether the effect icon is shown in the HUD. */
  showIcon: boolean;
}

// =============================================================================
// 11. ENCHANTMENT SYSTEM
// =============================================================================

export type EnchantmentType =
  // Armor
  | 'protection' | 'fire_protection' | 'blast_protection' | 'projectile_protection'
  | 'thorns' | 'respiration' | 'aqua_affinity' | 'depth_strider'
  | 'frost_walker' | 'feather_falling' | 'soul_speed'
  // Weapon
  | 'sharpness' | 'smite' | 'bane_of_arthropods' | 'knockback'
  | 'fire_aspect' | 'looting' | 'sweeping_edge'
  // Tool
  | 'efficiency' | 'silk_touch' | 'fortune' | 'unbreaking'
  // Bow
  | 'power' | 'punch' | 'flame' | 'infinity'
  // Crossbow
  | 'multishot' | 'piercing' | 'quick_charge'
  // Trident
  | 'loyalty' | 'impaling' | 'riptide' | 'channeling'
  // General
  | 'mending' | 'vanishing_curse' | 'binding_curse';

export interface EnchantmentDefinition {
  type: EnchantmentType;
  name: string;
  nameJa: string;
  maxLevel: number;
  /** Item categories this enchantment can be applied to. */
  applicableTo: ItemCategory[];
  /** Enchantments that conflict with this one. */
  incompatible: EnchantmentType[];
  /** Whether this is a treasure enchantment (only found, not obtainable from enchanting table). */
  treasure: boolean;
  /** Whether this is a curse. */
  curse: boolean;
  /** Rarity weight for enchanting table. */
  weight: number;
  /** Minimum enchanting power required per level. */
  minPowerPerLevel: number[];
}

export interface EnchantmentInstance {
  type: EnchantmentType;
  level: number;
}

// =============================================================================
// 12. CRAFTING SYSTEM
// =============================================================================

export type RecipeType = 'shaped' | 'shapeless' | 'smelting' | 'blasting' | 'smoking' | 'campfire' | 'stonecutting' | 'smithing';

export interface CraftingRecipe {
  id: string;
  type: RecipeType;
  /** For shaped recipes: 3x3 grid pattern using single-char keys. */
  pattern?: string[];
  /** Key mapping characters to item IDs. */
  key?: Record<string, string>;
  /** For shapeless recipes: list of ingredient item IDs. */
  ingredients?: string[];
  /** Output item ID. */
  result: string;
  /** Output quantity. */
  resultCount: number;
  /** For smelting: input item ID. */
  input?: string;
  /** Experience reward (smelting recipes). */
  experience?: number;
  /** Cooking time in ticks (smelting recipes). */
  cookingTime?: number;
  /** Category for recipe book grouping. */
  category: string;
}

// =============================================================================
// 13. REDSTONE SYSTEM
// =============================================================================

export type RedstoneComponentType =
  | 'wire' | 'torch' | 'repeater' | 'comparator'
  | 'lever' | 'button' | 'pressure_plate' | 'tripwire'
  | 'daylight_detector' | 'observer' | 'target'
  | 'piston' | 'sticky_piston' | 'dispenser' | 'dropper'
  | 'hopper' | 'note_block' | 'tnt' | 'redstone_lamp'
  | 'door' | 'trapdoor' | 'fence_gate' | 'command_block';

export interface RedstoneState {
  /** Signal strength at this position (0-15). */
  power: number;
  /** Whether this component is providing strong power. */
  strongPower: boolean;
  /** Whether this component is providing weak power. */
  weakPower: boolean;
  /** Delay in ticks (for repeaters). */
  delay: number;
  /** Mode (for comparators: 'compare' or 'subtract'). */
  mode: 'compare' | 'subtract' | 'none';
  /** Whether the component is locked. */
  locked: boolean;
  /** Connected faces for wire routing. */
  connections: Record<string, boolean>;
  /** Facing direction (for directional components like comparators, repeaters). */
  facing?: 'north' | 'south' | 'east' | 'west';
}

// =============================================================================
// 14. PARTICLE SYSTEM
// =============================================================================

export type ParticleType =
  | 'block_break' | 'block_dust' | 'bubble' | 'campfire'
  | 'cloud' | 'crit' | 'damage' | 'drip_lava' | 'drip_water'
  | 'dust' | 'enchant' | 'explosion' | 'flame' | 'heart'
  | 'item_break' | 'lava' | 'note' | 'portal' | 'rain'
  | 'redstone' | 'smoke' | 'snow' | 'soul' | 'soul_fire'
  | 'spark' | 'splash' | 'totem' | 'villager_happy'
  | 'villager_angry' | 'witch';

export interface ParticleEmitter {
  type: ParticleType;
  position: BlockCoord;
  velocity: { x: number; y: number; z: number };
  count: number;
  spread: { x: number; y: number; z: number };
  /** Lifetime in ticks. */
  lifetime: number;
  /** Color override (for dust/redstone particles). */
  color?: string;
  /** Size multiplier. */
  scale: number;
}

// =============================================================================
// 15. SOUND SYSTEM
// =============================================================================

export type SoundCategory = 'master' | 'music' | 'record' | 'weather' | 'block' | 'hostile' | 'neutral' | 'player' | 'ambient' | 'voice';

export interface SoundEvent {
  id: string;
  category: SoundCategory;
  volume: number;      // 0.0 - 1.0
  pitch: number;       // 0.5 - 2.0
  /** Whether the sound should attenuate with distance. */
  attenuate: boolean;
  /** Maximum distance at which the sound is audible (blocks). */
  maxDistance: number;
}

// =============================================================================
// 16. WEATHER & TIME
// =============================================================================

export type WeatherType = 'clear' | 'rain' | 'thunder';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface WorldTime {
  /** Total ticks since world creation. */
  totalTicks: number;
  /** Time of day in ticks (0-24000). */
  dayTime: number;
  /** Current day number. */
  day: number;
  /** Current moon phase (0-7). */
  moonPhase: number;
  /** Current day phase. */
  phase: DayPhase;
  /** Sun angle (radians). */
  sunAngle: number;
}

export interface WeatherState {
  type: WeatherType;
  /** Ticks until weather changes. */
  duration: number;
  /** Whether lightning is active (during thunder). */
  lightning: boolean;
  /** Rain/snow intensity (0-1). */
  intensity: number;
}

// =============================================================================
// 17. DAMAGE SYSTEM
// =============================================================================

export type DamageSource =
  | 'player_attack' | 'mob_attack' | 'projectile' | 'explosion'
  | 'fire' | 'lava' | 'drowning' | 'fall' | 'void' | 'starving'
  | 'suffocation' | 'cactus' | 'berry_bush' | 'wither_effect'
  | 'poison' | 'magic' | 'thorns' | 'lightning' | 'anvil'
  | 'falling_block' | 'ender_pearl' | 'dragon_breath' | 'generic';

export interface DamageEvent {
  source: DamageSource;
  amount: number;
  /** ID of the entity that caused the damage (if applicable). */
  attackerId?: string;
  /** Whether the damage bypasses armor. */
  bypassArmor: boolean;
  /** Whether the damage bypasses invulnerability frames. */
  bypassInvulnerability: boolean;
  /** Whether the damage bypasses magic protection. */
  bypassMagic: boolean;
  /** Knockback vector. */
  knockback: { x: number; y: number; z: number };
}
