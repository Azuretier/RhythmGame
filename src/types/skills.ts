// ===== Skill System Types (League of Legends inspired) =====

/** Skill slot keys (Q, W, E, R) */
export type SkillKey = 'Q' | 'W' | 'E' | 'R';

/** Skill targeting types */
export type SkillTargetType = 
  | 'self'        // Self-cast (no target)
  | 'point'       // Ground-targeted
  | 'direction'   // Skillshot (line/cone)
  | 'target'      // Enemy/unit targeted
  | 'passive';    // Always active

/** Visual effect types for skills */
export type SkillEffectType =
  | 'projectile'  // Moving projectile
  | 'area'        // AoE circle/zone
  | 'beam'        // Line beam
  | 'buff'        // Visual buff indicator
  | 'dash'        // Movement dash trail
  | 'shield';     // Shield effect

/** Damage/heal types */
export type DamageType = 'physical' | 'magical' | 'true' | 'heal';

/** Skill definition */
export interface Skill {
  /** Skill identifier */
  id: string;
  /** Display name */
  name: string;
  /** Skill key binding */
  key: SkillKey;
  /** Skill description */
  description: string;
  /** Cooldown in seconds */
  cooldown: number;
  /** Mana cost */
  manaCost: number;
  /** Cast range (units) */
  range: number;
  /** Targeting type */
  targetType: SkillTargetType;
  /** Effect radius (for AoE) */
  radius?: number;
  /** Damage/heal amount */
  value?: number;
  /** Damage type */
  damageType?: DamageType;
  /** Visual effect */
  effectType?: SkillEffectType;
  /** Effect color */
  effectColor?: string;
  /** Icon path */
  icon?: string;
  /** Animation to trigger on character */
  animation?: string;
  /** Sound effect path */
  sound?: string;
}

/** Skill instance state (for tracking cooldowns) */
export interface SkillState {
  /** The skill definition */
  skill: Skill;
  /** Current cooldown remaining (seconds) */
  cooldownRemaining: number;
  /** Whether skill is currently on cooldown */
  isOnCooldown: boolean;
  /** Whether skill is currently being cast */
  isCasting: boolean;
  /** Skill level (1-5) */
  level: number;
}

/** Player character stats */
export interface PlayerStats {
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Current mana */
  mana: number;
  /** Maximum mana */
  maxMana: number;
  /** Health regeneration per second */
  healthRegen: number;
  /** Mana regeneration per second */
  manaRegen: number;
  /** Movement speed (units per second) */
  movementSpeed: number;
  /** Attack damage */
  attackDamage: number;
  /** Ability power */
  abilityPower: number;
  /** Armor (physical damage reduction) */
  armor: number;
  /** Magic resist (magical damage reduction) */
  magicResist: number;
}

/** Skill cast event */
export interface SkillCastEvent {
  /** The skill being cast */
  skill: Skill;
  /** Caster position */
  position: { x: number; y: number; z: number };
  /** Target position (for point/direction skills) */
  target?: { x: number; y: number; z: number };
  /** Timestamp */
  timestamp: number;
}
