// =============================================================
// Echoes of Eternity — Type Definitions & Game Data
// The Ultimate Action RPG: Rhythm × Strategy × Exploration
// =============================================================

// === Core Enums & Aliases ===

export type Element =
  | 'fire' | 'water' | 'ice' | 'lightning'
  | 'wind' | 'earth' | 'light' | 'dark' | 'void';

export type Role = 'tank' | 'dps' | 'support' | 'utility';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type GameMode =
  | 'story'           // 1-4 player PvE narrative
  | 'battle_royale'   // 100-player survival
  | 'ranked_match'    // 5v5 MOBA-style
  | 'rhythm_challenge'// Pure rhythm leaderboards
  | 'endless_dungeon' // Hack-and-slash loot grind
  | 'creative';       // Build & share custom content

export type CombatPhase = 'preparation' | 'rhythm_battle' | 'tactical_synergy' | 'reward';

export type HitAccuracy = 'perfect' | 'great' | 'good' | 'miss';

export type BiomeType =
  | 'verdant_plains' | 'crystal_caves' | 'volcanic_ridge'
  | 'frozen_peaks' | 'shadow_abyss' | 'sky_citadel'
  | 'temporal_ruins' | 'void_rift';

export type WorldLayer = 'surface' | 'underground' | 'sky';

export type DungeonDifficulty = 'normal' | 'hard' | 'nightmare' | 'eternity';

export type BannerType = 'standard' | 'featured' | 'elemental' | 'legacy';

export type ResourceType =
  | 'eternium' | 'chrono_shard' | 'void_essence'
  | 'elemental_dust' | 'soul_fragment' | 'rift_crystal'
  | 'iron_ore' | 'mythril_ore' | 'adamantite_ore'
  | 'wood' | 'ancient_wood' | 'spirit_wood'
  | 'herb' | 'moonflower' | 'starbloom'
  | 'gold';

export type EquipSlot = 'weapon' | 'armor' | 'accessory' | 'rune';

export type StatusEffect =
  | 'burn' | 'freeze' | 'shock' | 'poison'
  | 'bleed' | 'stun' | 'silence' | 'haste'
  | 'shield' | 'regen' | 'atk_up' | 'def_up'
  | 'crit_up' | 'rhythm_sync' | 'elemental_surge';

export type EchoesGamePhase =
  | 'main_menu' | 'lobby' | 'character_select' | 'ban_pick'
  | 'exploration' | 'combat' | 'reward' | 'crafting'
  | 'gacha' | 'build' | 'results';

// === Elemental Reaction System (Genshin-inspired) ===

export type ReactionType =
  | 'vaporize'      // Fire + Water → 2x damage
  | 'melt'          // Fire + Ice → 1.5x damage + shatter
  | 'overload'      // Fire + Lightning → AoE explosion
  | 'superconduct'  // Ice + Lightning → DEF shred
  | 'freeze'        // Water + Ice → Immobilize
  | 'electro_charge'// Water + Lightning → Chain damage
  | 'swirl'         // Wind + any element → Spread + amplify
  | 'crystallize'   // Earth + any element → Shield
  | 'eclipse'       // Light + Dark → Massive burst
  | 'annihilate'    // Void + any → True damage
  | 'resonance';    // Same element × 2 → Team buff

export interface ElementalReaction {
  type: ReactionType;
  trigger: [Element, Element];
  damageMultiplier: number;
  statusEffect?: StatusEffect;
  duration?: number;
  description: string;
}

// === Character System ===

export interface CharacterAbility {
  id: string;
  name: string;
  description: string;
  element: Element;
  /** Cooldown in combat turns */
  cooldown: number;
  /** Mana/energy cost */
  cost: number;
  /** Base damage or heal amount */
  basePower: number;
  /** Targets: 'single' | 'aoe' | 'self' | 'ally' | 'all_allies' */
  target: 'single' | 'aoe' | 'self' | 'ally' | 'all_allies';
  /** Status effects applied */
  effects?: { status: StatusEffect; chance: number; duration: number }[];
  /** Rhythm combo: number of perfect hits to activate bonus */
  rhythmComboThreshold?: number;
  /** Bonus damage multiplier when rhythm combo threshold is met */
  rhythmBonusMultiplier?: number;
}

export interface CharacterUltimate {
  id: string;
  name: string;
  description: string;
  element: Element;
  /** Energy required (builds from combat actions) */
  energyCost: number;
  basePower: number;
  target: 'single' | 'aoe' | 'all_enemies' | 'all_allies' | 'field';
  effects?: { status: StatusEffect; chance: number; duration: number }[];
  /** Animation tier for cinematic display */
  animationTier: 1 | 2 | 3;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  element: Element;
  role: Role;
  rarity: Rarity;
  /** Base stats at level 1 */
  baseStats: CharacterStats;
  /** Stat growth per level */
  growthRates: Partial<CharacterStats>;
  abilities: CharacterAbility[];
  ultimate: CharacterUltimate;
  /** Passive talent description */
  passive: string;
  /** Skill combo chain IDs this character can link with */
  comboPartners: string[];
  /** Lore/backstory */
  lore: string;
  /** Color theme for UI */
  themeColor: string;
  /** Pixel icon representation */
  icon: string;
}

export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  elementalMastery: number;
  energy: number;
  maxEnergy: number;
}

export interface OwnedCharacter {
  characterId: string;
  level: number;
  experience: number;
  /** Constellation/dupe level 0-6 */
  constellation: number;
  /** Equipped items */
  equipment: {
    weapon: Equipment | null;
    armor: Equipment | null;
    accessory: Equipment | null;
    rune: Equipment | null;
  };
  /** Unlocked ability upgrades */
  abilityLevels: Record<string, number>;
}

// === Equipment & Crafting ===

export interface Equipment {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  level: number;
  /** Base stats provided */
  stats: Partial<CharacterStats>;
  /** Special effect description */
  effect?: string;
  /** Enchantment slots used */
  enchantments: Enchantment[];
  /** Max enchantment slots */
  maxEnchantments: number;
}

export interface Enchantment {
  id: string;
  name: string;
  rarity: Rarity;
  stat: keyof CharacterStats;
  value: number;
  /** Percentage-based or flat */
  isPercent: boolean;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'building';
  result: { type: string; quantity: number };
  ingredients: { resource: ResourceType; quantity: number }[];
  /** Crafting station required */
  station: 'basic' | 'forge' | 'arcane' | 'divine';
  /** Level requirement */
  craftingLevel: number;
}

// === Combat System ===

export interface RhythmNote {
  /** Timestamp in ms relative to song start */
  time: number;
  /** Lane position (0-3 for 4 lanes) */
  lane: number;
  /** Note type */
  type: 'tap' | 'hold' | 'slide' | 'critical';
  /** Hold duration in ms (for hold notes) */
  holdDuration?: number;
  /** Element associated with this note */
  element?: Element;
}

export interface RhythmBeatmap {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  notes: RhythmNote[];
}

export interface CombatAction {
  type: 'attack' | 'ability' | 'ultimate' | 'defend' | 'item' | 'swap' | 'build';
  characterId: string;
  /** Ability/item ID if applicable */
  actionId?: string;
  /** Target enemy/ally index */
  targetIndex?: number;
  /** Rhythm accuracy of the action */
  rhythmAccuracy: HitAccuracy;
  /** Beat phase when action was performed */
  beatPhase: number;
  /** Combo count at time of action */
  comboCount: number;
}

export interface CombatState {
  turn: number;
  phase: 'player_turn' | 'enemy_turn' | 'reaction_phase' | 'rhythm_phase';
  /** Party characters in combat */
  party: CombatCharacter[];
  /** Enemy units */
  enemies: CombatEnemy[];
  /** Active elemental auras on the field */
  fieldAuras: { element: Element; duration: number; position: 'player' | 'enemy' | 'field' }[];
  /** Current combo count */
  combo: number;
  /** Max combo achieved this battle */
  maxCombo: number;
  /** Score accumulated */
  score: number;
  /** Current BPM for rhythm phase */
  bpm: number;
  /** Current beat phase 0-1 */
  beatPhase: number;
  /** Active status effects on field */
  activeReactions: { reaction: ReactionType; turnsRemaining: number }[];
  /** Tetris puzzle state for buff generation */
  puzzleBoard: (PuzzleCell | null)[][];
  /** Puzzle lines cleared this combat */
  puzzleLinesCleared: number;
}

export interface CombatCharacter {
  characterId: string;
  currentHp: number;
  maxHp: number;
  currentEnergy: number;
  maxEnergy: number;
  statusEffects: ActiveStatusEffect[];
  abilityCooldowns: Record<string, number>;
  /** Position on the combat field (for targeting/AoE) */
  position: number;
  alive: boolean;
}

export interface CombatEnemy {
  id: string;
  name: string;
  element: Element;
  level: number;
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
  statusEffects: ActiveStatusEffect[];
  /** Move pattern for enemy AI */
  pattern: EnemyPattern[];
  patternIndex: number;
  /** Boss flag */
  isBoss: boolean;
  /** Loot table */
  drops: { type: ResourceType | string; chance: number; quantity: number }[];
  themeColor: string;
  icon: string;
}

export interface EnemyPattern {
  action: 'attack' | 'skill' | 'buff' | 'summon' | 'charge';
  element?: Element;
  power: number;
  target: 'random' | 'lowest_hp' | 'highest_atk' | 'all';
  effects?: { status: StatusEffect; chance: number; duration: number }[];
}

export interface ActiveStatusEffect {
  status: StatusEffect;
  duration: number;
  source: string;
  value?: number;
}

export interface PuzzleCell {
  color: string;
  element?: Element;
}

// === World & Exploration ===

export interface WorldTileEchoes {
  biome: BiomeType;
  layer: WorldLayer;
  elevation: number;
  /** Resource nodes present */
  resources: { type: ResourceType; quantity: number; respawnTime: number }[];
  /** Enemy encounters */
  encounters: { enemyId: string; level: number; chance: number }[];
  /** Points of interest */
  poi?: PointOfInterest;
  /** Has been discovered by player */
  discovered: boolean;
  /** Fog of war state */
  visible: boolean;
}

export interface PointOfInterest {
  type: 'chest' | 'dungeon' | 'npc' | 'waypoint' | 'boss' | 'easter_egg' | 'crafting_station' | 'shop';
  id: string;
  name: string;
  description: string;
  /** Whether it's been interacted with */
  completed: boolean;
  /** Rewards for completion */
  rewards?: { type: ResourceType | string; quantity: number }[];
}

export interface ExplorationState {
  /** Player position on world map */
  playerX: number;
  playerY: number;
  playerLayer: WorldLayer;
  /** Discovered tiles */
  discoveredTiles: Set<string>;
  /** Collected POIs */
  collectedPois: Set<string>;
  /** Current biome */
  currentBiome: BiomeType;
  /** Stamina for exploration actions */
  stamina: number;
  maxStamina: number;
}

// === Gacha / Banner System ===

export interface GachaBanner {
  id: string;
  name: string;
  type: BannerType;
  /** Featured character IDs with rate-up */
  featuredCharacters: string[];
  /** Featured equipment IDs with rate-up */
  featuredEquipment: string[];
  /** Start date ISO string */
  startDate: string;
  /** End date ISO string */
  endDate: string;
  /** Pity counter (guaranteed at this count) */
  hardPity: number;
  /** Soft pity starts at this count (increased rates) */
  softPity: number;
  /** Base 5-star rate */
  baseRate: number;
}

export interface GachaState {
  /** Pulls since last highest rarity */
  pityCounter: Record<string, number>;
  /** Total pulls per banner */
  totalPulls: Record<string, number>;
  /** Pull history */
  history: GachaPull[];
}

export interface GachaPull {
  bannerId: string;
  characterId?: string;
  equipmentId?: string;
  rarity: Rarity;
  timestamp: number;
  /** Whether it was the pity pull */
  wasPity: boolean;
}

// === Battle Royale ===

export interface BattleRoyaleState {
  /** Total players alive */
  playersAlive: number;
  /** Total players in match */
  totalPlayers: number;
  /** Current safe zone */
  safeZone: { centerX: number; centerY: number; radius: number };
  /** Next zone shrink timestamp */
  nextShrinkAt: number;
  /** Player's current BR state */
  playerState: BRPlayerState;
  /** Nearby players visible */
  nearbyPlayers: BRVisiblePlayer[];
  /** Phase of the match */
  matchPhase: 'dropping' | 'looting' | 'combat' | 'final_circle' | 'ended';
  /** Elapsed time in seconds */
  elapsedSeconds: number;
}

export interface BRPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  inventory: BRInventoryItem[];
  /** Active character being used */
  characterId: string;
  kills: number;
  placement: number | null;
  alive: boolean;
  /** Build pieces available */
  buildPieces: number;
}

export interface BRVisiblePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  characterId: string;
  alive: boolean;
}

export interface BRInventoryItem {
  type: 'weapon' | 'shield_potion' | 'heal' | 'build_material' | 'ammo';
  id: string;
  quantity: number;
  rarity: Rarity;
}

// === Ranked / MOBA Mode ===

export interface RankedState {
  /** Current tier */
  tier: EchoesRankedTier;
  /** Points within current tier */
  points: number;
  /** Points needed for promotion */
  pointsForPromotion: number;
  /** Win/loss record this season */
  wins: number;
  losses: number;
  /** Current win streak */
  winStreak: number;
  /** Best win streak */
  bestWinStreak: number;
  /** Season number */
  season: number;
}

export type EchoesRankedTier =
  | 'echo_bronze' | 'echo_silver' | 'echo_gold'
  | 'echo_platinum' | 'echo_diamond' | 'echo_eternity';

export interface RankedTierDef {
  tier: EchoesRankedTier;
  label: string;
  color: string;
  minPoints: number;
  winReward: number;
  lossDeduction: number;
  icon: string;
}

// === Multiplayer Messages ===

// Client → Server
export type EchoesClientMessage =
  | { type: 'echoes_create_lobby'; playerName: string; mode: GameMode; lobbyName?: string }
  | { type: 'echoes_join_lobby'; lobbyCode: string; playerName: string }
  | { type: 'echoes_leave_lobby' }
  | { type: 'echoes_ready'; ready: boolean }
  | { type: 'echoes_start_game' }
  | { type: 'echoes_select_character'; characterId: string }
  | { type: 'echoes_ban_character'; characterId: string }
  | { type: 'echoes_combat_action'; action: CombatAction }
  | { type: 'echoes_rhythm_hit'; lane: number; accuracy: HitAccuracy; beatPhase: number }
  | { type: 'echoes_puzzle_action'; action: 'move' | 'rotate' | 'drop' | 'hold' }
  | { type: 'echoes_explore_move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'echoes_gather_resource'; tileX: number; tileY: number }
  | { type: 'echoes_craft'; recipeId: string }
  | { type: 'echoes_build'; x: number; y: number; structureId: string }
  | { type: 'echoes_use_item'; itemId: string; targetIndex?: number }
  | { type: 'echoes_emote'; emote: string }
  | { type: 'echoes_chat'; message: string }
  | { type: 'echoes_queue_ranked'; playerName: string; tier: EchoesRankedTier; points: number }
  | { type: 'echoes_cancel_queue' }
  | { type: 'echoes_br_move'; x: number; y: number }
  | { type: 'echoes_br_build'; x: number; y: number; pieceType: string }
  | { type: 'echoes_br_attack'; targetId: string }
  | { type: 'echoes_br_loot'; itemId: string };

// Server → Client
export type EchoesServerMessage =
  | { type: 'echoes_lobby_created'; lobbyCode: string; playerId: string; reconnectToken: string }
  | { type: 'echoes_joined_lobby'; lobbyCode: string; playerId: string; lobbyState: EchoesLobbyState; reconnectToken: string }
  | { type: 'echoes_lobby_state'; lobbyState: EchoesLobbyState }
  | { type: 'echoes_player_joined'; player: EchoesLobbyPlayer }
  | { type: 'echoes_player_left'; playerId: string }
  | { type: 'echoes_countdown'; count: number }
  | { type: 'echoes_game_started'; seed: number; mode: GameMode; serverTime: number }
  | { type: 'echoes_ban_pick_phase'; phase: 'ban' | 'pick'; currentTeam: number; timeRemaining: number; banned: string[] }
  | { type: 'echoes_combat_state'; state: CombatState }
  | { type: 'echoes_rhythm_phase'; bpm: number; beatPhase: number; notes: RhythmNote[] }
  | { type: 'echoes_rhythm_result'; playerId: string; accuracy: HitAccuracy; combo: number; score: number; element?: Element }
  | { type: 'echoes_reaction_triggered'; reaction: ElementalReaction; damage: number; source: string }
  | { type: 'echoes_enemy_action'; enemyId: string; action: EnemyPattern; targets: string[] }
  | { type: 'echoes_damage_dealt'; sourceId: string; targetId: string; damage: number; isCrit: boolean; element?: Element }
  | { type: 'echoes_status_applied'; targetId: string; effect: ActiveStatusEffect }
  | { type: 'echoes_character_defeated'; characterId: string; isEnemy: boolean }
  | { type: 'echoes_combat_end'; victory: boolean; rewards: CombatReward }
  | { type: 'echoes_puzzle_state'; board: (PuzzleCell | null)[][]; linesCleared: number; buffs: string[] }
  | { type: 'echoes_exploration_state'; state: ExplorationState; visibleTiles: WorldTileEchoes[] }
  | { type: 'echoes_resource_gathered'; resource: ResourceType; quantity: number }
  | { type: 'echoes_poi_discovered'; poi: PointOfInterest }
  | { type: 'echoes_encounter'; enemies: CombatEnemy[] }
  | { type: 'echoes_craft_result'; success: boolean; item: string; quantity: number }
  | { type: 'echoes_gacha_result'; pulls: GachaPull[] }
  | { type: 'echoes_br_state'; state: BattleRoyaleState }
  | { type: 'echoes_br_zone_shrink'; safeZone: BattleRoyaleState['safeZone']; nextShrinkAt: number }
  | { type: 'echoes_br_kill'; killerId: string; killerName: string; victimId: string; victimName: string }
  | { type: 'echoes_br_placement'; placement: number; kills: number; playersAlive: number }
  | { type: 'echoes_ranked_match_found'; opponentTeam: string[]; roomCode: string }
  | { type: 'echoes_ranked_result'; victory: boolean; pointsChange: number; newTier?: EchoesRankedTier }
  | { type: 'echoes_season_pass_progress'; level: number; xp: number; rewards: string[] }
  | { type: 'echoes_emote_broadcast'; playerId: string; playerName: string; emote: string }
  | { type: 'echoes_chat_message'; playerId: string; playerName: string; message: string }
  | { type: 'echoes_error'; message: string };

// === Lobby State ===

export interface EchoesLobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  selectedCharacter: string | null;
  team: number;
  color: string;
}

export interface EchoesLobbyState {
  code: string;
  name: string;
  hostId: string;
  players: EchoesLobbyPlayer[];
  status: 'waiting' | 'ban_pick' | 'countdown' | 'playing' | 'ended';
  mode: GameMode;
  maxPlayers: number;
  /** Banned character IDs (for ranked mode) */
  bannedCharacters: string[];
}

// === Player Progress & Save ===

export interface EchoesPlayerData {
  /** Player display name */
  name: string;
  /** Player level (account-wide) */
  level: number;
  /** Account XP */
  experience: number;
  /** Owned characters with levels/equipment */
  characters: OwnedCharacter[];
  /** Inventory of resources */
  resources: Partial<Record<ResourceType, number>>;
  /** Equipment vault */
  equipmentVault: Equipment[];
  /** Gacha state */
  gacha: GachaState;
  /** Ranked stats */
  ranked: RankedState;
  /** Crafting level */
  craftingLevel: number;
  /** Season pass level */
  seasonPassLevel: number;
  /** Season pass XP */
  seasonPassXp: number;
  /** Total play time in seconds */
  totalPlayTime: number;
  /** Discovery percentage */
  explorationProgress: number;
  /** Achievements unlocked */
  achievements: string[];
  /** Story chapter progress */
  storyProgress: number;
  /** Dungeon highest floor */
  dungeonFloor: number;
  /** Daily quest completion */
  dailyQuestsCompleted: number;
  /** Last daily reset timestamp */
  lastDailyReset: number;
  /** Battle Royale stats */
  brWins: number;
  brTopTen: number;
  brKills: number;
}

// === Combat Rewards ===

export interface CombatReward {
  experience: number;
  gold: number;
  resources: { type: ResourceType; quantity: number }[];
  equipment: Equipment[];
  seasonPassXp: number;
  /** Achievement IDs unlocked */
  achievementsUnlocked: string[];
}

// === Season Pass ===

export interface SeasonPassReward {
  level: number;
  free: { type: string; quantity: number };
  premium: { type: string; quantity: number };
}

// === Game Configuration ===

export const ECHOES_CONFIG = {
  MAX_PARTY_SIZE: 4,
  MAX_PLAYERS_STORY: 4,
  MAX_PLAYERS_BR: 100,
  MAX_PLAYERS_RANKED: 10,
  MAX_PLAYERS_DUNGEON: 4,
  MAX_LEVEL: 90,
  MAX_CHARACTER_LEVEL: 90,
  MAX_EQUIPMENT_LEVEL: 20,
  MAX_CONSTELLATION: 6,
  MAX_ABILITY_LEVEL: 10,
  MAX_CRAFTING_LEVEL: 50,
  SEASON_PASS_MAX_LEVEL: 100,

  // Rhythm combat
  PERFECT_WINDOW_MS: 50,
  GREAT_WINDOW_MS: 100,
  GOOD_WINDOW_MS: 150,
  COMBO_BREAK_PENALTY: 0.5,
  PERFECT_SCORE: 300,
  GREAT_SCORE: 200,
  GOOD_SCORE: 100,
  MISS_SCORE: 0,

  // Gacha
  BASE_5STAR_RATE: 0.006,
  SOFT_PITY_START: 74,
  HARD_PITY: 90,
  SOFT_PITY_RATE_INCREASE: 0.06,

  // Battle Royale
  BR_MAP_SIZE: 200,
  BR_ZONE_SHRINK_INTERVAL: 120,
  BR_MAX_BUILD_PIECES: 50,

  // Exploration
  WORLD_MAP_SIZE: 64,
  STAMINA_REGEN_RATE: 1,
  MAX_STAMINA: 160,
  STAMINA_REGEN_INTERVAL: 480,

  // Ranked
  RANKED_QUEUE_TIMEOUT: 30000,
  RANKED_POINT_RANGE: 500,

  // Puzzle (Tetris) integration
  PUZZLE_BOARD_WIDTH: 10,
  PUZZLE_BOARD_HEIGHT: 20,
  PUZZLE_LINES_FOR_BUFF: 4,

  // Multiplayer
  TICK_RATE: 10,
  HEARTBEAT_INTERVAL: 15000,

  PLAYER_COLORS: [
    '#FF4444', '#4488FF', '#44DD44', '#FFDD44', '#DD44DD',
    '#44DDDD', '#FF8844', '#FF88AA', '#DDDDDD', '#88FF44',
  ] as readonly string[],
} as const;

// === Ranked Tier Definitions ===

export const ECHOES_RANKED_TIERS: RankedTierDef[] = [
  { tier: 'echo_bronze', label: 'Echo Bronze', color: '#CD7F32', minPoints: 0, winReward: 30, lossDeduction: 10, icon: 'B' },
  { tier: 'echo_silver', label: 'Echo Silver', color: '#C0C0C0', minPoints: 500, winReward: 25, lossDeduction: 15, icon: 'S' },
  { tier: 'echo_gold', label: 'Echo Gold', color: '#FFD700', minPoints: 1000, winReward: 20, lossDeduction: 20, icon: 'G' },
  { tier: 'echo_platinum', label: 'Echo Platinum', color: '#E5E4E2', minPoints: 2000, winReward: 18, lossDeduction: 22, icon: 'P' },
  { tier: 'echo_diamond', label: 'Echo Diamond', color: '#4AEDD9', minPoints: 3500, winReward: 15, lossDeduction: 25, icon: 'D' },
  { tier: 'echo_eternity', label: 'Eternity', color: '#9B59B6', minPoints: 5000, winReward: 12, lossDeduction: 28, icon: 'E' },
];

// === Element Colors & Icons ===

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#FF4500',
  water: '#1E90FF',
  ice: '#87CEEB',
  lightning: '#FFD700',
  wind: '#98FB98',
  earth: '#8B4513',
  light: '#FFFFF0',
  dark: '#4B0082',
  void: '#8A2BE2',
};

export const ELEMENT_ICONS: Record<Element, string> = {
  fire: 'F',
  water: 'W',
  ice: 'I',
  lightning: 'L',
  wind: 'N',
  earth: 'E',
  light: 'S',
  dark: 'D',
  void: 'V',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: '#EF4444',
};

export const HIT_ACCURACY_COLORS: Record<HitAccuracy, string> = {
  perfect: '#FFD700',
  great: '#00FF88',
  good: '#4488FF',
  miss: '#FF4444',
};

export const ROLE_COLORS: Record<Role, string> = {
  tank: '#4488FF',
  dps: '#FF4444',
  support: '#44DD44',
  utility: '#FFDD44',
};
