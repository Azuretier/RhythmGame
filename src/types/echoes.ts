// =============================================================================
// ECHOES OF ETERNITY — Core Type Definitions
// 究極のアクションRPG型システム
// =============================================================================

// ---------------------------------------------------------------------------
// 1. ELEMENTS & REACTIONS (Genshin-inspired elemental system)
// ---------------------------------------------------------------------------

export type Element =
  | 'fire'      // 炎
  | 'water'     // 水
  | 'ice'       // 氷
  | 'thunder'   // 雷
  | 'wind'      // 風
  | 'earth'     // 地
  | 'light'     // 光
  | 'dark';     // 闇

export type ElementalReactionType =
  | 'vaporize'      // 炎+水 → 蒸発 (2x damage)
  | 'melt'          // 炎+氷 → 溶解 (1.5x damage)
  | 'overload'      // 炎+雷 → 過負荷 (AoE explosion)
  | 'superconduct'  // 氷+雷 → 超電導 (DEF down)
  | 'freeze'        // 水+氷 → 凍結 (immobilize)
  | 'electrocharge' // 水+雷 → 感電 (chain damage)
  | 'swirl'         // 風+any → 拡散 (spread element)
  | 'crystallize'   // 地+any → 結晶化 (shield)
  | 'radiance'      // 光+闇 → 輝滅 (massive burst)
  | 'purify'        // 光+any negative → 浄化 (cleanse + heal)
  | 'corrupt'       // 闇+any → 侵蝕 (DoT + debuff)
  | 'sandstorm'     // 地+風 → 砂嵐 (blind + AoE)
  | 'steamcloud'    // 水+炎 in area → 蒸気雲 (vision block + burn)
  | 'permafrost'    // 氷+地 → 永久凍土 (terrain freeze + slow)
  | 'thunderstorm'; // 水+風+雷 → 暴風雨 (triple reaction)

export interface ElementalReaction {
  type: ElementalReactionType;
  trigger: [Element, Element] | [Element, Element, Element];
  damageMultiplier: number;
  effectDuration: number; // ticks
  description: string;
  descriptionJa: string;
  aoeRadius?: number;
  statusEffect?: StatusEffectType;
}

// ---------------------------------------------------------------------------
// 2. STATUS EFFECTS & BUFFS
// ---------------------------------------------------------------------------

export type StatusEffectType =
  | 'burn'          // DoT fire damage
  | 'freeze'        // Immobilized
  | 'shock'         // Periodic stun
  | 'poison'        // DoT + heal reduction
  | 'blind'         // Reduced accuracy / vision
  | 'slow'          // Movement/action speed reduced
  | 'silence'       // Cannot use skills
  | 'stun'          // Cannot act
  | 'bleed'         // DoT physical damage
  | 'def_down'      // Defense reduced
  | 'atk_down'      // Attack reduced
  | 'speed_down'    // Speed reduced
  | 'corrupt'       // Dark DoT + random debuff
  | 'regen'         // Heal over time (buff)
  | 'shield'        // Absorb damage (buff)
  | 'atk_up'        // Attack increased (buff)
  | 'def_up'        // Defense increased (buff)
  | 'speed_up'      // Speed increased (buff)
  | 'crit_up'       // Crit rate increased (buff)
  | 'invincible'    // Cannot take damage (buff)
  | 'stealth';      // Invisible to enemies (buff)

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  maxStacks: number;
  duration: number; // remaining ticks
  sourcePlayerId: string;
  value: number; // effect magnitude (damage per tick, % reduction, etc.)
}

// ---------------------------------------------------------------------------
// 3. CHARACTER SYSTEM (League/Genshin character design)
// ---------------------------------------------------------------------------

export type CharacterRole = 'tank' | 'dps' | 'support' | 'utility';

export type CharacterRarity = 3 | 4 | 5; // ★★★, ★★★★, ★★★★★

export interface CharacterSkill {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  element: Element;
  cooldown: number; // turns
  manaCost: number;
  damageMultiplier: number;
  range: number; // 0 = self, 1 = melee, 2+ = ranged
  aoeRadius: number; // 0 = single target
  skillType: 'normal' | 'skill' | 'burst' | 'passive';
  targetType: 'enemy' | 'ally' | 'self' | 'all_enemies' | 'all_allies' | 'area';
  statusEffects?: { type: StatusEffectType; chance: number; duration: number; value: number }[];
  rhythmDifficulty?: RhythmDifficulty; // rhythm input required to execute
  comboLinks?: string[]; // skill IDs that can chain from this
  animation?: string; // animation key
}

export type RhythmDifficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'master';

export interface CharacterDefinition {
  id: string;
  name: string;
  nameJa: string;
  title: string;
  titleJa: string;
  lore: string;
  loreJa: string;
  element: Element;
  role: CharacterRole;
  rarity: CharacterRarity;
  baseStats: CharacterStats;
  growthStats: CharacterStats; // per-level increase
  skills: CharacterSkill[];
  passives: PassiveAbility[];
  icon: string;
  splashArt: string;
  chibiSprite: string;
  voiceLines?: { trigger: string; line: string; lineJa: string }[];
}

export interface PassiveAbility {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  trigger: 'always' | 'on_hit' | 'on_kill' | 'on_damaged' | 'on_combo' | 'on_perfect' | 'low_hp' | 'full_hp';
  effect: PassiveEffect;
}

export interface PassiveEffect {
  statModifiers?: Partial<CharacterStats>;
  statusEffect?: { type: StatusEffectType; chance: number; duration: number; value: number };
  healPercent?: number;
  manaRestore?: number;
  cooldownReduction?: number;
  damageReflect?: number;
  comboExtend?: number;
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number;    // 0-1
  critDamage: number;  // multiplier, e.g. 1.5 = 150%
  accuracy: number;    // 0-1
  evasion: number;     // 0-1
  elementalMastery: number; // amplifies reaction damage
}

// ---------------------------------------------------------------------------
// 4. CHARACTER INSTANCE (runtime state during gameplay)
// ---------------------------------------------------------------------------

export interface CharacterInstance {
  definitionId: string;
  level: number;
  experience: number;
  experienceToNext: number;
  constellation: number; // 0-6, like Genshin constellations
  stats: CharacterStats;
  equippedWeapon: WeaponInstance | null;
  equippedArtifacts: ArtifactSet;
  statusEffects: StatusEffect[];
  skillCooldowns: Record<string, number>; // skillId → remaining cooldown
  currentElement: Element; // can be infused
  isAlive: boolean;
  position: Position2D;
  comboCount: number;
  rhythmAccuracy: number; // 0-1, accuracy of rhythm inputs this battle
}

export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D extends Position2D {
  z: number;
}

// ---------------------------------------------------------------------------
// 5. EQUIPMENT SYSTEM (Minecraft Dungeons + Genshin artifacts)
// ---------------------------------------------------------------------------

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type WeaponType = 'sword' | 'bow' | 'staff' | 'spear' | 'dagger' | 'hammer' | 'scythe' | 'gauntlet';

export interface WeaponDefinition {
  id: string;
  name: string;
  nameJa: string;
  type: WeaponType;
  rarity: ItemRarity;
  baseAtk: number;
  subStat: { stat: keyof CharacterStats; value: number };
  passiveAbility?: PassiveAbility;
  element?: Element; // elemental weapons infuse attacks
  icon: string;
  description: string;
  descriptionJa: string;
}

export interface WeaponInstance {
  definitionId: string;
  level: number;
  refinement: number; // 1-5
  experience: number;
}

export type ArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet';

export interface ArtifactDefinition {
  id: string;
  name: string;
  nameJa: string;
  setId: string;
  slot: ArtifactSlot;
  rarity: ItemRarity;
  mainStat: { stat: keyof CharacterStats; value: number };
  subStats: { stat: keyof CharacterStats; value: number }[];
  icon: string;
}

export interface ArtifactSetBonus {
  setId: string;
  setName: string;
  setNameJa: string;
  twoPieceBonus: Partial<CharacterStats>;
  fourPieceBonus: PassiveEffect;
  description: string;
  descriptionJa: string;
}

export type ArtifactSet = {
  [slot in ArtifactSlot]?: ArtifactDefinition;
};

// ---------------------------------------------------------------------------
// 6. CRAFTING & RESOURCES (Minecraft + Terraria)
// ---------------------------------------------------------------------------

export type ResourceCategory = 'ore' | 'wood' | 'herb' | 'monster_drop' | 'gem' | 'essence' | 'food' | 'misc';

export interface ResourceDefinition {
  id: string;
  name: string;
  nameJa: string;
  category: ResourceCategory;
  rarity: ItemRarity;
  icon: string;
  description: string;
  descriptionJa: string;
  maxStack: number;
  sellValue: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  nameJa: string;
  category: 'weapon' | 'armor' | 'consumable' | 'building' | 'upgrade' | 'furniture';
  ingredients: { resourceId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  craftingTime: number; // seconds
  requiredStation?: string; // crafting station type
  requiredLevel?: number;
  description: string;
  descriptionJa: string;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  itemType: 'resource' | 'weapon' | 'artifact' | 'consumable' | 'key' | 'building';
  instanceData?: WeaponInstance | ArtifactDefinition; // for unique items
}

export interface PlayerInventory {
  items: InventoryItem[];
  maxSlots: number;
  gold: number;
  premiumCurrency: number; // "Eternity Crystals"
}

// ---------------------------------------------------------------------------
// 7. COMBAT SYSTEM (Hybrid turn-based + rhythm + action)
// ---------------------------------------------------------------------------

export type BattlePhase =
  | 'initiative'      // Determine turn order
  | 'rhythm_input'    // Player performs rhythm sequence
  | 'action_select'   // Choose skill/attack
  | 'target_select'   // Choose target
  | 'execution'       // Animate and resolve
  | 'reaction_check'  // Check for elemental reactions
  | 'counter_phase'   // Enemies may counter
  | 'end_turn';       // Cleanup and next turn

export type CombatResultType = 'miss' | 'hit' | 'critical' | 'perfect_critical' | 'blocked' | 'evaded';

export interface DamageInstance {
  sourceId: string;
  targetId: string;
  baseDamage: number;
  element: Element;
  resultType: CombatResultType;
  finalDamage: number;
  rhythmBonus: number; // multiplier from rhythm accuracy
  comboBonus: number;  // multiplier from combo chain
  reactionTriggered?: ElementalReactionType;
  reactionDamage?: number;
  statusEffectsApplied: StatusEffect[];
  isCritical: boolean;
  overkill: boolean;
}

export interface RhythmSequence {
  notes: RhythmNote[];
  bpm: number;
  duration: number; // ms
  difficulty: RhythmDifficulty;
  perfectWindow: number; // ms
  greatWindow: number;   // ms
  goodWindow: number;    // ms
}

export interface RhythmNote {
  time: number;      // ms from start
  lane: number;      // 0-3 for 4-lane
  type: 'tap' | 'hold' | 'slide' | 'flick';
  holdDuration?: number; // ms for hold notes
  slideDirection?: 'left' | 'right' | 'up' | 'down';
}

export type RhythmJudgement = 'perfect' | 'great' | 'good' | 'miss';

export interface RhythmResult {
  judgements: RhythmJudgement[];
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  accuracy: number; // 0-1
  damageMultiplier: number; // based on accuracy
  bonusEffects: string[]; // special effects from perfect runs
}

export interface BattleState {
  id: string;
  phase: BattlePhase;
  turn: number;
  turnOrder: string[]; // character instance IDs
  currentActorIndex: number;
  playerParty: CharacterInstance[];
  enemies: EnemyInstance[];
  fieldElements: FieldElement[]; // lingering elements on the field
  comboChain: ComboChain;
  rhythmSequence: RhythmSequence | null;
  rhythmResult: RhythmResult | null;
  battleLog: BattleLogEntry[];
  environment: BattleEnvironment;
  isBossEncounter: boolean;
}

export interface EnemyInstance {
  id: string;
  definitionId: string;
  name: string;
  nameJa: string;
  level: number;
  stats: CharacterStats;
  element: Element;
  statusEffects: StatusEffect[];
  position: Position2D;
  isAlive: boolean;
  isBoss: boolean;
  lootTable: LootEntry[];
  skills: CharacterSkill[];
  ai: EnemyAIType;
  sprite: string;
}

export type EnemyAIType = 'aggressive' | 'defensive' | 'support' | 'random' | 'boss_pattern';

export interface FieldElement {
  element: Element;
  position: Position2D;
  radius: number;
  duration: number; // remaining ticks
  sourceId: string;
}

export interface ComboChain {
  hits: number;
  elements: Element[];
  damage: number;
  lastActorId: string;
  multiplier: number;
  isActive: boolean;
}

export interface BattleLogEntry {
  turn: number;
  timestamp: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'reaction' | 'death' | 'revival' | 'item' | 'rhythm';
  message: string;
  messageJa: string;
  data?: DamageInstance;
}

export interface BattleEnvironment {
  terrain: TerrainType;
  weather: WeatherType;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  ambientElement?: Element;
  hazards: EnvironmentHazard[];
}

export type TerrainType = 'plains' | 'forest' | 'mountain' | 'desert' | 'ocean' | 'volcano' | 'tundra' | 'void' | 'dungeon' | 'arena';
export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'sandstorm' | 'aurora';

export interface EnvironmentHazard {
  type: string;
  element: Element;
  damage: number;
  position: Position2D;
  radius: number;
  interval: number; // ticks between activations
}

export interface LootEntry {
  itemId: string;
  chance: number; // 0-1
  minQuantity: number;
  maxQuantity: number;
  rarity: ItemRarity;
}

// ---------------------------------------------------------------------------
// 8. EXPLORATION & WORLD (Genshin + Minecraft + Terraria)
// ---------------------------------------------------------------------------

export type BiomeType =
  | 'enchanted_forest'
  | 'crystal_caverns'
  | 'volcanic_peaks'
  | 'frozen_wastes'
  | 'celestial_islands'
  | 'abyssal_depths'
  | 'ancient_ruins'
  | 'shadow_realm'
  | 'meadow_plains'
  | 'desert_oasis'
  | 'storm_highlands'
  | 'void_rift';

export interface WorldRegion {
  id: string;
  name: string;
  nameJa: string;
  biome: BiomeType;
  level: { min: number; max: number };
  dominantElement: Element;
  subRegions: SubRegion[];
  dungeons: DungeonDefinition[];
  bosses: string[]; // boss enemy definition IDs
  resources: string[]; // available resource IDs
  npcs: NPCDefinition[];
  discoveryReward: number; // exploration XP
  music: string; // background music track
  ambience: string; // ambient sound
}

export interface SubRegion {
  id: string;
  name: string;
  nameJa: string;
  bounds: { x: number; y: number; width: number; height: number };
  terrain: TerrainType;
  weather: WeatherType;
  enemySpawns: EnemySpawn[];
  treasureChests: TreasureChest[];
  interactables: WorldInteractable[];
  waypoint?: Position2D; // fast travel point
}

export interface EnemySpawn {
  enemyId: string;
  position: Position2D;
  respawnTime: number; // seconds
  count: number;
  level: { min: number; max: number };
}

export interface TreasureChest {
  id: string;
  position: Position2D;
  rarity: ItemRarity;
  contents: LootEntry[];
  requiresKey?: string;
  puzzle?: string; // puzzle type to unlock
  isOpened: boolean;
}

export interface WorldInteractable {
  id: string;
  type: 'resource_node' | 'npc' | 'portal' | 'crafting_station' | 'shop' | 'quest_marker' | 'puzzle' | 'campfire' | 'waypoint';
  position: Position2D;
  data: Record<string, unknown>;
}

export interface NPCDefinition {
  id: string;
  name: string;
  nameJa: string;
  role: 'merchant' | 'quest_giver' | 'blacksmith' | 'alchemist' | 'storyteller' | 'trainer';
  dialogue: DialogueLine[];
  shopInventory?: string[];
  quests?: string[];
  sprite: string;
}

export interface DialogueLine {
  id: string;
  text: string;
  textJa: string;
  responses?: { text: string; textJa: string; nextId: string; condition?: string }[];
}

// ---------------------------------------------------------------------------
// 9. DUNGEON SYSTEM (Minecraft Dungeons + Terraria + Honkai)
// ---------------------------------------------------------------------------

export type DungeonDifficulty = 'normal' | 'hard' | 'expert' | 'nightmare' | 'abyss';

export interface DungeonDefinition {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  regionId: string;
  floors: DungeonFloor[];
  difficulty: DungeonDifficulty;
  recommendedLevel: number;
  maxPlayers: number; // 1-4
  timeLimit?: number; // seconds, for timed dungeons
  isEndless: boolean;
  bossId?: string;
  rewards: DungeonReward;
  weeklyReset: boolean;
  music: string;
}

export interface DungeonFloor {
  floor: number;
  layout: DungeonTile[][];
  enemies: EnemySpawn[];
  traps: DungeonTrap[];
  puzzles: DungeonPuzzle[];
  chests: TreasureChest[];
  isBossFloor: boolean;
  exitPosition: Position2D;
  entryPosition: Position2D;
}

export type DungeonTileType = 'floor' | 'wall' | 'door' | 'trap' | 'chest' | 'stairs' | 'boss_gate' | 'secret' | 'void';

export interface DungeonTile {
  type: DungeonTileType;
  position: Position2D;
  isRevealed: boolean;
  interactable?: WorldInteractable;
  element?: Element; // elemental tiles
}

export interface DungeonTrap {
  type: 'spike' | 'fire' | 'poison' | 'crush' | 'teleport' | 'alarm';
  position: Position2D;
  damage: number;
  element: Element;
  isActive: boolean;
  interval: number;
}

export interface DungeonPuzzle {
  type: 'switch' | 'sequence' | 'rhythm' | 'elemental' | 'tetris' | 'sliding';
  position: Position2D;
  solution: unknown;
  reward: LootEntry[];
  isSolved: boolean;
}

export interface DungeonReward {
  experience: number;
  gold: number;
  guaranteedLoot: LootEntry[];
  bonusLoot: LootEntry[]; // difficulty-based bonus
  firstClearBonus?: LootEntry[];
}

// ---------------------------------------------------------------------------
// 10. GACHA & BANNER SYSTEM (Genshin-inspired with pity)
// ---------------------------------------------------------------------------

export type BannerType = 'character' | 'weapon' | 'standard' | 'limited';

export interface GachaBanner {
  id: string;
  name: string;
  nameJa: string;
  type: BannerType;
  featuredItems: string[]; // character/weapon definition IDs
  rateUp: { itemId: string; rateMultiplier: number }[];
  basePullRates: {
    fiveStar: number;   // base 0.6%
    fourStar: number;   // base 5.1%
    threeStar: number;  // remainder
  };
  pitySystem: PitySystem;
  costPerPull: number; // premium currency
  costPer10Pull: number; // discounted 10-pull
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface PitySystem {
  softPityStart: number;  // e.g., 74 pulls
  hardPity: number;       // e.g., 90 pulls (guaranteed 5★)
  rateIncreasePer: number; // rate increase per pull after soft pity
  guaranteedFeatured: boolean; // 50/50 then guaranteed system
  fourStarPity: number; // guaranteed 4★ every N pulls
}

export interface GachaPullResult {
  itemId: string;
  itemType: 'character' | 'weapon';
  rarity: CharacterRarity;
  isNew: boolean;
  isFeatured: boolean;
  pullNumber: number;
  isPity: boolean;
  animation: 'standard' | 'golden' | 'rainbow'; // pull animation type
}

export interface PlayerGachaState {
  pullCounts: Record<string, number>; // bannerId → total pulls
  pityCounters: Record<string, number>; // bannerId → pulls since last 5★
  fourStarPityCounters: Record<string, number>;
  guaranteedFeatured: Record<string, boolean>; // lost 50/50 flag
  pullHistory: GachaPullResult[];
}

// ---------------------------------------------------------------------------
// 11. BATTLE PASS & SEASON SYSTEM (Fortnite)
// ---------------------------------------------------------------------------

export interface BattlePassSeason {
  id: string;
  name: string;
  nameJa: string;
  seasonNumber: number;
  startDate: string;
  endDate: string;
  maxLevel: number;
  freeRewards: BattlePassReward[];
  premiumRewards: BattlePassReward[];
  experiencePerLevel: number;
  weeklyMissions: SeasonMission[];
  dailyMissions: SeasonMission[];
  seasonalEvents: SeasonEvent[];
}

export interface BattlePassReward {
  level: number;
  itemId: string;
  itemType: 'character' | 'weapon' | 'skin' | 'emote' | 'resource' | 'currency' | 'title' | 'namecard';
  quantity: number;
  isPremium: boolean;
}

export interface SeasonMission {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  objective: MissionObjective;
  reward: { experience: number; items?: LootEntry[] };
  isCompleted: boolean;
  progress: number;
  maxProgress: number;
}

export interface MissionObjective {
  type: 'kill' | 'collect' | 'explore' | 'craft' | 'combo' | 'rhythm_score' | 'win_battle' | 'complete_dungeon' | 'build' | 'reaction';
  target: string; // specific enemy/item/region
  count: number;
  conditions?: Record<string, unknown>;
}

export interface SeasonEvent {
  id: string;
  name: string;
  nameJa: string;
  type: 'limited_dungeon' | 'boss_rush' | 'rhythm_festival' | 'pvp_tournament' | 'exploration_race' | 'building_contest';
  startDate: string;
  endDate: string;
  rewards: LootEntry[];
  leaderboard: boolean;
}

// ---------------------------------------------------------------------------
// 12. PLAYER PROGRESSION & RANK (League + Honkai + VALORANT)
// ---------------------------------------------------------------------------

export type PlayerRank =
  | 'bronze_1' | 'bronze_2' | 'bronze_3'
  | 'silver_1' | 'silver_2' | 'silver_3'
  | 'gold_1' | 'gold_2' | 'gold_3'
  | 'platinum_1' | 'platinum_2' | 'platinum_3'
  | 'diamond_1' | 'diamond_2' | 'diamond_3'
  | 'master'
  | 'grandmaster'
  | 'eternity'; // top rank — 永遠

export interface PlayerProgression {
  accountLevel: number;
  accountExperience: number;
  rank: PlayerRank;
  rankPoints: number;
  seasonWins: number;
  seasonLosses: number;
  characters: Record<string, CharacterInstance>; // characterId → instance
  inventory: PlayerInventory;
  gachaState: PlayerGachaState;
  battlePassLevel: number;
  battlePassExperience: number;
  battlePassPremium: boolean;
  explorationProgress: Record<string, number>; // regionId → % explored
  dungeonClears: Record<string, { difficulty: DungeonDifficulty; bestTime?: number; cleared: boolean }[]>;
  achievements: string[]; // unlocked achievement IDs
  titles: string[]; // unlocked title IDs
  activeTitle?: string;
  stats: EchoesPlayerStats;
  dailyMissions: SeasonMission[];
  weeklyMissions: SeasonMission[];
  lastLogin: number;
  loginStreak: number;
  totalPlaytime: number; // seconds
}

export interface EchoesPlayerStats {
  totalBattles: number;
  totalWins: number;
  totalDeaths: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealing: number;
  totalElementalReactions: number;
  bestCombo: number;
  totalPerfectRhythms: number;
  totalRhythmNotes: number;
  rhythmAccuracy: number; // lifetime average
  dungeonsCleared: number;
  deepestEndlessFloor: number;
  bossesDefeated: number;
  resourcesCollected: number;
  itemsCrafted: number;
  chestsOpened: number;
  regionsExplored: number;
  pvpWins: number;
  pvpLosses: number;
  battleRoyaleWins: number;
  battleRoyaleTop10: number;
  blocksPlaced: number;
  buildingsCreated: number;
  customBeatmapsPlayed: number;
  totalGachaPulls: number;
}

// ---------------------------------------------------------------------------
// 13. GAME MODES (All integrated modes)
// ---------------------------------------------------------------------------

export type GameMode =
  | 'story'           // PvE story campaign (1-4 players)
  | 'battle_royale'   // 100-player survival
  | 'ranked_5v5'      // MOBA-style ranked
  | 'rhythm_challenge' // Pure rhythm mode
  | 'endless_dungeon' // Roguelike dungeon
  | 'creative'        // Building/crafting sandbox
  | 'arena_pvp'       // 1v1 / 2v2 PvP
  | 'co_op_dungeon'   // 4-player dungeon run
  | 'boss_rush'       // Sequential boss fights
  | 'daily_challenge'; // Rotating daily content

export interface GameModeConfig {
  mode: GameMode;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  minPlayers: number;
  maxPlayers: number;
  ranked: boolean;
  rewards: DungeonReward;
  timeLimit?: number;
  icon: string;
  color: string;
  unlockRequirement?: { level?: number; achievement?: string; storyChapter?: number };
}

// ---------------------------------------------------------------------------
// 14. BUILDING / CREATIVE SYSTEM (Minecraft + Fortnite)
// ---------------------------------------------------------------------------

export type BuildBlockType =
  | 'stone' | 'wood' | 'metal' | 'glass' | 'crystal'
  | 'brick' | 'sand' | 'ice' | 'obsidian' | 'luminite'
  | 'wall' | 'floor' | 'ramp' | 'roof' | 'pillar'
  | 'door' | 'window' | 'stairs' | 'fence' | 'lamp';

export interface BuildBlock {
  type: BuildBlockType;
  position: Position3D;
  rotation: number; // 0, 90, 180, 270
  health: number;
  maxHealth: number;
  material: 'wood' | 'stone' | 'metal' | 'crystal';
  placedBy: string; // player ID
}

export interface Blueprint {
  id: string;
  name: string;
  nameJa: string;
  blocks: BuildBlock[];
  dimensions: Position3D;
  category: 'shelter' | 'fortress' | 'decoration' | 'trap' | 'custom';
  creatorId: string;
  likes: number;
  isPublic: boolean;
}

export interface BuildingState {
  blocks: Map<string, BuildBlock>; // "x,y,z" → block
  totalBlocksPlaced: number;
  buildMode: boolean;
  selectedBlock: BuildBlockType;
  previewPosition: Position3D | null;
  canPlace: boolean;
}

// ---------------------------------------------------------------------------
// 15. MULTIPLAYER / PARTY SYSTEM
// ---------------------------------------------------------------------------

export type PartyRole = 'leader' | 'member';

export interface PartyMember {
  playerId: string;
  playerName: string;
  character: CharacterInstance;
  role: PartyRole;
  isReady: boolean;
  isOnline: boolean;
}

export interface Party {
  id: string;
  members: PartyMember[];
  maxSize: number;
  currentActivity?: GameMode;
  isPublic: boolean;
  inviteCode?: string;
}

// ---------------------------------------------------------------------------
// 16. BATTLE ROYALE MODE (Fortnite-inspired)
// ---------------------------------------------------------------------------

export interface BattleRoyaleState {
  roomId: string;
  phase: 'waiting' | 'dropping' | 'playing' | 'shrinking' | 'final_circle' | 'ended';
  players: BattleRoyalePlayer[];
  alivePlayers: number;
  totalPlayers: number;
  stormCircle: { center: Position2D; radius: number; shrinkRate: number; damage: number };
  nextCircle: { center: Position2D; radius: number } | null;
  circlePhase: number;
  timeToNextShrink: number;
  lootSpawns: Position2D[];
  supplyDrops: SupplyDrop[];
  worldSeed: number;
}

export interface BattleRoyalePlayer {
  playerId: string;
  playerName: string;
  character: CharacterInstance;
  position: Position2D;
  isAlive: boolean;
  kills: number;
  placement: number;
  inventory: PlayerInventory;
  buildingState: BuildingState;
  shield: number;
  maxShield: number;
}

export interface SupplyDrop {
  id: string;
  position: Position2D;
  contents: LootEntry[];
  isOpened: boolean;
  dropTime: number;
}

// ---------------------------------------------------------------------------
// 17. MOBA / RANKED 5v5 MODE (League-inspired)
// ---------------------------------------------------------------------------

export interface MobaState {
  roomId: string;
  phase: 'ban_pick' | 'loading' | 'playing' | 'ended';
  teamBlue: MobaTeam;
  teamRed: MobaTeam;
  bannedCharacters: string[];
  pickedCharacters: Record<string, string>; // playerId → characterId
  pickPhase: { team: 'blue' | 'red'; action: 'ban' | 'pick'; timeRemaining: number };
  towers: MobaTower[];
  minions: MobaMinion[];
  jungle: JungleCamp[];
  gameTime: number;
  killFeed: KillFeedEntry[];
}

export interface MobaTeam {
  players: MobaPlayer[];
  totalKills: number;
  totalGold: number;
  towersDestroyed: number;
  nexusHealth: number;
}

export interface MobaPlayer {
  playerId: string;
  playerName: string;
  character: CharacterInstance;
  lane: 'top' | 'mid' | 'bot' | 'jungle' | 'support';
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number; // creep score
  items: string[];
  level: number;
}

export interface MobaTower {
  id: string;
  team: 'blue' | 'red';
  lane: 'top' | 'mid' | 'bot';
  tier: 1 | 2 | 3;
  health: number;
  maxHealth: number;
  position: Position2D;
  isDestroyed: boolean;
}

export interface MobaMinion {
  id: string;
  team: 'blue' | 'red';
  type: 'melee' | 'ranged' | 'siege' | 'super';
  health: number;
  position: Position2D;
  lane: 'top' | 'mid' | 'bot';
}

export interface JungleCamp {
  id: string;
  type: 'small' | 'large' | 'epic'; // epic = dragon/baron equivalent
  position: Position2D;
  enemies: EnemyInstance[];
  respawnTime: number;
  isAlive: boolean;
  reward: { gold: number; experience: number; buff?: StatusEffect };
}

export interface KillFeedEntry {
  timestamp: number;
  killerId: string;
  victimId: string;
  assistIds: string[];
  weapon?: string;
  isFirstBlood: boolean;
  multiKill?: number;
}

// ---------------------------------------------------------------------------
// 18. WEBSOCKET MESSAGE PROTOCOL
// ---------------------------------------------------------------------------

// Client → Server messages
export type EchoesClientMessage =
  // Connection & Lobby
  | { type: 'eoe_set_profile'; playerName: string; icon: string }
  | { type: 'eoe_create_party'; gameMode: GameMode; maxSize: number }
  | { type: 'eoe_join_party'; partyCode: string }
  | { type: 'eoe_leave_party' }
  | { type: 'eoe_set_ready'; ready: boolean }
  | { type: 'eoe_select_character'; characterId: string }
  | { type: 'eoe_start_game' }

  // Combat
  | { type: 'eoe_rhythm_result'; result: RhythmResult }
  | { type: 'eoe_select_action'; skillId: string; targetId: string }
  | { type: 'eoe_use_item'; itemId: string; targetId?: string }
  | { type: 'eoe_end_turn' }

  // Exploration
  | { type: 'eoe_move'; position: Position2D }
  | { type: 'eoe_interact'; targetId: string }
  | { type: 'eoe_enter_dungeon'; dungeonId: string; difficulty: DungeonDifficulty }
  | { type: 'eoe_collect_resource'; resourceId: string; position: Position2D }

  // Building
  | { type: 'eoe_place_block'; block: BuildBlockType; position: Position3D; rotation: number }
  | { type: 'eoe_remove_block'; position: Position3D }

  // Battle Royale
  | { type: 'eoe_br_drop'; position: Position2D }
  | { type: 'eoe_br_move'; position: Position2D; velocity: Position2D }
  | { type: 'eoe_br_attack'; targetId: string; skillId: string }
  | { type: 'eoe_br_build'; block: BuildBlockType; position: Position3D }

  // MOBA
  | { type: 'eoe_moba_ban'; characterId: string }
  | { type: 'eoe_moba_pick'; characterId: string }
  | { type: 'eoe_moba_move'; position: Position2D }
  | { type: 'eoe_moba_attack'; targetId: string }
  | { type: 'eoe_moba_ability'; skillId: string; targetPosition?: Position2D; targetId?: string }

  // Social
  | { type: 'eoe_emote'; emoteId: string }
  | { type: 'eoe_chat'; message: string }

  // Gacha
  | { type: 'eoe_gacha_pull'; bannerId: string; count: 1 | 10 }

  // Queue
  | { type: 'eoe_queue'; gameMode: GameMode }
  | { type: 'eoe_dequeue' };

// Server → Client messages
export type EchoesServerMessage =
  // Connection & Lobby
  | { type: 'eoe_party_created'; partyCode: string; party: Party }
  | { type: 'eoe_party_joined'; party: Party }
  | { type: 'eoe_party_updated'; party: Party }
  | { type: 'eoe_party_left' }
  | { type: 'eoe_queue_status'; position: number; estimatedWait: number; gameMode: GameMode }
  | { type: 'eoe_match_found'; roomId: string; gameMode: GameMode; players: string[] }
  | { type: 'eoe_game_starting'; countdown: number }

  // Combat
  | { type: 'eoe_battle_state'; state: BattleState }
  | { type: 'eoe_rhythm_start'; sequence: RhythmSequence; skillId: string }
  | { type: 'eoe_damage_dealt'; damage: DamageInstance }
  | { type: 'eoe_reaction_triggered'; reaction: ElementalReactionType; damage: number; position: Position2D }
  | { type: 'eoe_turn_start'; actorId: string; timeLimit: number }
  | { type: 'eoe_battle_end'; result: 'victory' | 'defeat' | 'draw'; rewards: DungeonReward; stats: BattleEndStats }
  | { type: 'eoe_combo_update'; combo: ComboChain }
  | { type: 'eoe_status_effect'; targetId: string; effect: StatusEffect; action: 'applied' | 'removed' | 'expired' }

  // Exploration
  | { type: 'eoe_world_state'; region: WorldRegion; playerPosition: Position2D }
  | { type: 'eoe_discovery'; subRegionId: string; reward: number }
  | { type: 'eoe_chest_opened'; chestId: string; contents: LootEntry[] }
  | { type: 'eoe_resource_collected'; resourceId: string; quantity: number }
  | { type: 'eoe_encounter'; enemies: EnemyInstance[] }
  | { type: 'eoe_npc_dialogue'; npcId: string; dialogue: DialogueLine }

  // Dungeon
  | { type: 'eoe_dungeon_entered'; dungeon: DungeonDefinition; floor: number }
  | { type: 'eoe_floor_revealed'; floor: DungeonFloor }
  | { type: 'eoe_dungeon_complete'; rewards: DungeonReward; stats: DungeonStats }
  | { type: 'eoe_trap_triggered'; trap: DungeonTrap; damage: number }

  // Building
  | { type: 'eoe_block_placed'; block: BuildBlock }
  | { type: 'eoe_block_removed'; position: Position3D }
  | { type: 'eoe_building_state'; state: BuildingState }

  // Battle Royale
  | { type: 'eoe_br_state'; state: BattleRoyaleState }
  | { type: 'eoe_br_circle_shrink'; circle: BattleRoyaleState['stormCircle'] }
  | { type: 'eoe_br_elimination'; killerId: string; victimId: string; weapon: string; remaining: number }
  | { type: 'eoe_br_supply_drop'; drop: SupplyDrop }
  | { type: 'eoe_br_result'; placement: number; kills: number; rewards: LootEntry[] }

  // MOBA
  | { type: 'eoe_moba_state'; state: MobaState }
  | { type: 'eoe_moba_pick_phase'; phase: MobaState['pickPhase'] }
  | { type: 'eoe_moba_kill'; entry: KillFeedEntry }
  | { type: 'eoe_moba_tower_destroyed'; tower: MobaTower }
  | { type: 'eoe_moba_result'; winner: 'blue' | 'red'; stats: MobaEndStats }

  // Gacha
  | { type: 'eoe_gacha_result'; results: GachaPullResult[] }
  | { type: 'eoe_gacha_state'; state: PlayerGachaState }

  // Progression
  | { type: 'eoe_level_up'; level: number; unlockedFeatures: string[] }
  | { type: 'eoe_rank_change'; oldRank: PlayerRank; newRank: PlayerRank; pointChange: number }
  | { type: 'eoe_achievement_unlocked'; achievementId: string; name: string; nameJa: string }
  | { type: 'eoe_battle_pass_progress'; level: number; experience: number; rewards: BattlePassReward[] }
  | { type: 'eoe_mission_complete'; mission: SeasonMission }

  // Social
  | { type: 'eoe_player_emote'; playerId: string; emoteId: string }
  | { type: 'eoe_chat_message'; playerId: string; playerName: string; message: string }

  // Error
  | { type: 'eoe_error'; code: string; message: string };

// ---------------------------------------------------------------------------
// 19. GAME END / STATS
// ---------------------------------------------------------------------------

export interface BattleEndStats {
  duration: number;
  totalDamageDealt: Record<string, number>;
  totalDamageReceived: Record<string, number>;
  totalHealing: Record<string, number>;
  mvpPlayerId: string;
  reactionsTriggered: number;
  bestCombo: number;
  rhythmAccuracy: number;
  experienceGained: number;
  goldEarned: number;
}

export interface DungeonStats {
  floorsCleared: number;
  totalEnemiesDefeated: number;
  timeTaken: number;
  deathCount: number;
  trapsTriggered: number;
  puzzlesSolved: number;
  chestsOpened: number;
  bestCombo: number;
  experienceGained: number;
}

export interface MobaEndStats {
  duration: number;
  mvpPlayerId: string;
  playerStats: Record<string, { kills: number; deaths: number; assists: number; cs: number; gold: number; damageDealt: number }>;
  towersDestroyed: Record<'blue' | 'red', number>;
  totalTeamKills: Record<'blue' | 'red', number>;
}

// ---------------------------------------------------------------------------
// 20. CONFIG CONSTANTS
// ---------------------------------------------------------------------------

export const EOE_CONFIG = {
  // Tick rates
  COMBAT_TICK_RATE: 10,      // 100ms per tick
  WORLD_TICK_RATE: 5,        // 200ms per tick
  BR_TICK_RATE: 20,          // 50ms per tick (fast-paced)
  MOBA_TICK_RATE: 15,        // ~67ms per tick

  // Combat
  MAX_COMBO: 999,
  COMBO_DECAY_TIME: 3000,    // ms before combo resets
  RHYTHM_PERFECT_WINDOW: 50, // ms
  RHYTHM_GREAT_WINDOW: 100,
  RHYTHM_GOOD_WINDOW: 200,
  CRIT_SHAKE_DURATION: 200,
  MAX_PARTY_SIZE: 4,

  // Rhythm bonus multipliers
  RHYTHM_PERFECT_MULTIPLIER: 2.0,
  RHYTHM_GREAT_MULTIPLIER: 1.5,
  RHYTHM_GOOD_MULTIPLIER: 1.0,
  RHYTHM_MISS_MULTIPLIER: 0.5,

  // Progression
  BASE_EXP_PER_LEVEL: 1000,
  EXP_SCALING: 1.15,        // each level requires 15% more
  MAX_CHARACTER_LEVEL: 90,
  MAX_WEAPON_LEVEL: 90,
  MAX_CONSTELLATION: 6,
  MAX_WEAPON_REFINEMENT: 5,

  // Gacha
  FIVE_STAR_BASE_RATE: 0.006,
  FOUR_STAR_BASE_RATE: 0.051,
  SOFT_PITY_START: 74,
  HARD_PITY: 90,
  FOUR_STAR_PITY: 10,
  PITY_RATE_INCREASE: 0.06, // per pull after soft pity

  // Battle Royale
  BR_MAX_PLAYERS: 100,
  BR_STORM_INITIAL_RADIUS: 500,
  BR_STORM_SHRINK_INTERVAL: 60, // seconds
  BR_STORM_PHASES: 7,
  BR_LOOT_DENSITY: 0.3,

  // MOBA
  MOBA_PLAYERS_PER_TEAM: 5,
  MOBA_BAN_COUNT: 4,        // 4 bans per team
  MOBA_PICK_TIME: 30,       // seconds per pick
  MOBA_MINION_SPAWN_INTERVAL: 30, // seconds
  MOBA_TOWER_COUNT: 9,      // per team (3 lanes × 3 tiers)

  // Building
  MAX_BLOCKS_PER_PLAYER: 500,
  BLOCK_PLACE_COOLDOWN: 100, // ms
  BLOCK_HEALTH: { wood: 100, stone: 200, metal: 400, crystal: 300 },

  // World
  REGION_SIZE: 1000,         // units
  ENEMY_RESPAWN_TIME: 300,   // seconds
  CHEST_RESPAWN_TIME: 86400, // 24 hours in seconds
  DAY_NIGHT_CYCLE: 1200,     // seconds for full cycle

  // Economy
  PULL_COST: 160,            // premium currency per pull
  TEN_PULL_COST: 1600,
  DAILY_FREE_CURRENCY: 60,
  BATTLE_PASS_PRICE: 980,
  BATTLE_PASS_PREMIUM_PRICE: 1980,
} as const;

// ---------------------------------------------------------------------------
// 21. UTILITY TYPES
// ---------------------------------------------------------------------------

export type EchoesConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface EchoesRoom {
  id: string;
  code: string;
  gameMode: GameMode;
  players: Map<string, EchoesRoomPlayer>;
  state: 'lobby' | 'character_select' | 'loading' | 'active' | 'paused' | 'ended';
  settings: GameModeConfig;
  createdAt: number;
  maxPlayers: number;
}

export interface EchoesRoomPlayer {
  id: string;
  name: string;
  icon: string;
  character: CharacterInstance | null;
  isReady: boolean;
  isHost: boolean;
  team?: 'blue' | 'red';
  ping: number;
}
