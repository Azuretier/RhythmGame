// =============================================================================
// CS:GO WEAPONS — Type Definitions
// カウンターストライク武器システム
// =============================================================================

// ---------------------------------------------------------------------------
// 1. WEAPON CATEGORIES & SLOTS
// ---------------------------------------------------------------------------

export type CsgoWeaponCategory =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'heavy'
  | 'equipment';

export type CsgoWeaponSlot = 'primary' | 'secondary' | 'melee' | 'grenade';

export type CsgoTeam = 'terrorist' | 'counter_terrorist' | 'both';

// ---------------------------------------------------------------------------
// 2. SKIN QUALITY / RARITY (matching CS:GO skin grades)
// ---------------------------------------------------------------------------

export type CsgoSkinGrade =
  | 'consumer'       // White — Consumer Grade
  | 'industrial'     // Light Blue — Industrial Grade
  | 'mil_spec'       // Blue — Mil-Spec
  | 'restricted'     // Purple — Restricted
  | 'classified'     // Pink — Classified
  | 'covert'         // Red — Covert
  | 'contraband';    // Gold — Contraband (★)

export interface CsgoSkinGradeConfig {
  label: string;
  labelJa: string;
  color: string;
  badgeBg: string;
  glowIntensity: number;
}

// ---------------------------------------------------------------------------
// 3. WEAPON STATS
// ---------------------------------------------------------------------------

export interface CsgoWeaponStats {
  damage: number;           // Base damage per bullet
  armorPenetration: number; // 0-1, fraction of damage through armor
  fireRate: number;         // Rounds per minute
  reloadTime: number;       // Seconds
  magazineSize: number;     // Rounds per magazine
  reserveAmmo: number;      // Total reserve ammo
  moveSpeed: number;        // Movement speed (units/s, knife = 250)
  range: number;            // Effective range in meters
  accuracy: number;         // 0-1, base accuracy (higher = more accurate)
  recoilControl: number;    // 0-1, how controllable the recoil is
}

// ---------------------------------------------------------------------------
// 4. WEAPON DEFINITION
// ---------------------------------------------------------------------------

export interface CsgoWeaponDefinition {
  id: string;
  name: string;
  nameJa: string;
  category: CsgoWeaponCategory;
  slot: CsgoWeaponSlot;
  team: CsgoTeam;
  price: number;            // In-game buy price ($)
  killReward: number;       // Money earned per kill ($)
  stats: CsgoWeaponStats;
  skinGrade: CsgoSkinGrade;
  color: string;            // Display color
  glowColor: string;        // Glow effect color
  description: string;
  descriptionJa: string;
  icon: string;             // Emoji or icon key
}

// ---------------------------------------------------------------------------
// 5. WEAPON SKIN
// ---------------------------------------------------------------------------

export type CsgoWearLevel =
  | 'factory_new'     // 0.00–0.07
  | 'minimal_wear'    // 0.07–0.15
  | 'field_tested'    // 0.15–0.38
  | 'well_worn'       // 0.38–0.45
  | 'battle_scarred'; // 0.45–1.00

export interface CsgoWeaponSkin {
  id: string;
  name: string;
  nameJa: string;
  weaponId: string;
  grade: CsgoSkinGrade;
  collection: string;
  isStatTrak: boolean;
  isSouvenir: boolean;
  wear: CsgoWearLevel;
  wearValue: number;        // 0.00-1.00 float
  description: string;
  descriptionJa: string;
}

// ---------------------------------------------------------------------------
// 6. PLAYER LOADOUT
// ---------------------------------------------------------------------------

export interface CsgoLoadoutSlot {
  weaponId: string;
  skinId?: string;
}

export interface CsgoLoadout {
  primary: CsgoLoadoutSlot | null;
  secondary: CsgoLoadoutSlot;
  melee: CsgoLoadoutSlot;
  grenades: CsgoLoadoutSlot[];
}

// ---------------------------------------------------------------------------
// 7. ECONOMY
// ---------------------------------------------------------------------------

export interface CsgoEconomy {
  money: number;
  maxMoney: number;          // $16000
  roundLossBonus: number;    // Increments on consecutive losses
  equipmentValue: number;    // Total value of equipped items
}

// ---------------------------------------------------------------------------
// 8. BUY MENU SECTION
// ---------------------------------------------------------------------------

export interface CsgoBuyMenuSection {
  category: CsgoWeaponCategory;
  label: string;
  labelJa: string;
  weapons: string[];          // weapon IDs
}

// ---------------------------------------------------------------------------
// 9. CONFIG CONSTANTS
// ---------------------------------------------------------------------------

export const CSGO_CONFIG = {
  // Economy
  STARTING_MONEY: 800,
  MAX_MONEY: 16000,
  ROUND_WIN_BONUS: 3250,
  ROUND_LOSS_BASE: 1400,
  ROUND_LOSS_INCREMENT: 500,
  ROUND_LOSS_MAX: 3400,
  BOMB_PLANT_REWARD: 300,
  KNIFE_KILL_REWARD: 1500,

  // Gameplay
  MAX_HEALTH: 100,
  MAX_ARMOR: 100,
  HELMET_COST: 350,
  KEVLAR_COST: 650,
  FULL_ARMOR_COST: 1000,
  DEFUSE_KIT_COST: 400,

  // Round timings (seconds)
  BUY_TIME: 20,
  ROUND_TIME: 115,
  FREEZE_TIME: 15,
  BOMB_TIMER: 40,
  DEFUSE_TIME: 10,
  DEFUSE_TIME_WITH_KIT: 5,

  // Movement
  KNIFE_SPEED: 250,
  BASE_SPEED: 230,
} as const;

// ---------------------------------------------------------------------------
// 10. CATEGORY VISUAL CONFIG
// ---------------------------------------------------------------------------

export interface CsgoCategoryConfig {
  label: string;
  labelJa: string;
  icon: string;
  color: string;
}

export const CSGO_CATEGORY_CONFIG: Record<CsgoWeaponCategory, CsgoCategoryConfig> = {
  pistol:    { label: 'Pistols',   labelJa: 'ピストル',    icon: '🔫', color: '#FFD54F' },
  smg:       { label: 'SMGs',      labelJa: 'サブマシンガン', icon: '🔧', color: '#4FC3F7' },
  rifle:     { label: 'Rifles',    labelJa: 'ライフル',    icon: '🎯', color: '#EF5350' },
  heavy:     { label: 'Heavy',     labelJa: 'ヘビー',      icon: '💥', color: '#FF7043' },
  equipment: { label: 'Equipment', labelJa: '装備',        icon: '🛡️', color: '#66BB6A' },
};

export const CSGO_SKIN_GRADE_CONFIG: Record<CsgoSkinGrade, CsgoSkinGradeConfig> = {
  consumer:    { label: 'Consumer Grade',   labelJa: 'コンシューマーグレード',   color: '#B0BEC5', badgeBg: 'rgba(176,190,197,0.15)', glowIntensity: 0 },
  industrial:  { label: 'Industrial Grade', labelJa: 'インダストリアルグレード', color: '#5D9CEC', badgeBg: 'rgba(93,156,236,0.15)',  glowIntensity: 0.15 },
  mil_spec:    { label: 'Mil-Spec',         labelJa: 'ミルスペック',           color: '#4169E1', badgeBg: 'rgba(65,105,225,0.15)',   glowIntensity: 0.3 },
  restricted:  { label: 'Restricted',       labelJa: 'リストリクテッド',       color: '#8847FF', badgeBg: 'rgba(136,71,255,0.15)',   glowIntensity: 0.5 },
  classified:  { label: 'Classified',       labelJa: 'クラシファイド',         color: '#D32CE6', badgeBg: 'rgba(211,44,230,0.15)',   glowIntensity: 0.7 },
  covert:      { label: 'Covert',           labelJa: 'コバート',              color: '#EB4B4B', badgeBg: 'rgba(235,75,75,0.15)',    glowIntensity: 0.85 },
  contraband:  { label: 'Contraband',       labelJa: 'コントラバンド',         color: '#E4AE39', badgeBg: 'rgba(228,174,57,0.15)',   glowIntensity: 1.0 },
};
