// ===== Character Interaction & Skill System Types =====

// ===== Skill System (LoL-style Q/W/E/R) =====

export type SkillSlot = 'Q' | 'W' | 'E' | 'R';

export type SkillTargetType =
  | 'self'        // Affects the caster
  | 'enemy'       // Targets nearest enemy
  | 'area'        // Area of effect around tower
  | 'global';     // Affects all enemies on field

export type SkillEffectType =
  | 'damage'           // Direct damage to enemies
  | 'slow'             // Reduce enemy speed
  | 'stun'             // Freeze enemies in place
  | 'heal'             // Restore tower HP
  | 'shield'           // Temporary damage reduction
  | 'buff_damage'      // Increase terrain/bullet damage
  | 'terrain_destroy'  // Destroy terrain blocks
  | 'execute'          // Kill enemies below HP threshold
  | 'knockback';       // Push enemies back on grid

export interface SkillEffect {
  type: SkillEffectType;
  /** Flat value (damage amount, heal amount, knockback tiles, etc.) */
  value: number;
  /** Duration in ms for timed effects (slow, stun, shield, buff) */
  duration?: number;
  /** Radius in grid tiles for area effects */
  radius?: number;
  /** Threshold for execute (0.0 - 1.0 = percentage of max HP) */
  threshold?: number;
}

export interface SkillDefinition {
  id: string;
  slot: SkillSlot;
  name: string;
  nameJa: string;
  icon: string;
  description: string;
  descriptionJa: string;
  /** Cooldown in milliseconds */
  cooldown: number;
  /** Mana cost (uses score points as mana resource) */
  manaCost: number;
  targetType: SkillTargetType;
  effects: SkillEffect[];
  /** Color theme for VFX */
  color: string;
  /** Glow color for UI */
  glowColor: string;
}

export interface SkillState {
  skillId: string;
  slot: SkillSlot;
  /** Timestamp of last cast (0 if never cast) */
  lastCastTime: number;
  /** Whether currently on cooldown */
  isOnCooldown: boolean;
  /** Remaining cooldown in ms */
  cooldownRemaining: number;
  /** Whether the skill is currently active (for duration-based effects) */
  isActive: boolean;
  /** When the active effect expires */
  activeUntil: number;
}

export interface SkillCastEvent {
  skillId: string;
  slot: SkillSlot;
  timestamp: number;
  effects: SkillEffect[];
  targetType: SkillTargetType;
}

// ===== Character / NPC System =====

export type CharacterRole =
  | 'guide'       // Tutorial/story NPC
  | 'merchant'    // Sells items/skills
  | 'warrior'     // Combat-focused, offensive skills
  | 'mage'        // Magic-focused, AoE/utility skills
  | 'healer';     // Support-focused, healing/shield skills

export interface DialogueLine {
  speaker: string;
  speakerJa: string;
  text: string;
  textJa: string;
  /** Optional condition to show this line */
  condition?: DialogueCondition;
}

export interface DialogueCondition {
  /** Minimum world index to show this dialogue */
  minWorld?: number;
  /** Minimum stage number */
  minStage?: number;
  /** Required crafted card IDs */
  requiredCards?: string[];
  /** Minimum score */
  minScore?: number;
  /** Required game mode */
  gameMode?: 'vanilla' | 'td';
  /** Tower health threshold (show when HP below this) */
  healthBelow?: number;
}

export interface DialogueSequence {
  id: string;
  lines: DialogueLine[];
  /** Whether this dialogue can repeat */
  repeatable: boolean;
  /** Priority — higher priority dialogues are shown first */
  priority: number;
  /** Trigger condition for when to show this dialogue */
  trigger: DialogueTrigger;
}

export type DialogueTrigger =
  | { type: 'world_enter'; worldIdx: number }
  | { type: 'stage_start'; stageNumber: number }
  | { type: 'health_low'; threshold: number }
  | { type: 'first_craft' }
  | { type: 'game_start' }
  | { type: 'boss_encounter' }
  | { type: 'interact' }  // Player manually interacts
  | { type: 'skill_unlock'; skillSlot: SkillSlot };

export interface CharacterDefinition {
  id: string;
  name: string;
  nameJa: string;
  role: CharacterRole;
  icon: string;
  color: string;
  glowColor: string;
  description: string;
  descriptionJa: string;
  /** Which world(s) this character appears in (empty = all worlds) */
  worldAppearance: number[];
  /** Grid position on the game world */
  position: { x: number; z: number };
  /** Skill loadout this character provides */
  skillLoadout: string[];
  /** Dialogue sequences */
  dialogues: DialogueSequence[];
}

export interface CharacterState {
  characterId: string;
  /** Whether the character is currently visible */
  isVisible: boolean;
  /** Whether the player is in interaction range */
  isInRange: boolean;
  /** Currently active dialogue sequence ID */
  activeDialogueId: string | null;
  /** Current line index within active dialogue */
  currentLineIndex: number;
  /** Set of dialogue IDs that have been seen */
  seenDialogues: Set<string>;
  /** Whether the interaction UI is open */
  isInteracting: boolean;
}

// ===== Skill Loadout (Character provides skills) =====

export interface SkillLoadout {
  characterId: string;
  skills: Record<SkillSlot, SkillDefinition | null>;
}

// ===== Active Skill Effects (applied to game state) =====

export interface ActiveSkillEffect {
  id: number;
  skillId: string;
  effectType: SkillEffectType;
  value: number;
  startTime: number;
  endTime: number;
  radius?: number;
}
