// ===== Character Interaction & Skill Balance Constants =====

// ===== Interaction =====
/** Grid tiles distance for NPC interaction range */
export const INTERACTION_RANGE = 5;

/** Duration to show dialogue line before auto-advance (ms) */
export const DIALOGUE_LINE_DURATION = 4000;

/** Delay before character greeting appears on enter (ms) */
export const CHARACTER_APPEAR_DELAY = 1000;

// ===== Skill System =====
/** Base mana pool — uses score as mana resource */
export const MANA_PER_SCORE_POINT = 1;

/** Global cooldown between any skill cast (ms) */
export const GLOBAL_COOLDOWN = 500;

/** Maximum number of active skill effects at once */
export const MAX_ACTIVE_EFFECTS = 8;

/** Skill VFX particle count */
export const SKILL_VFX_PARTICLES = 20;

/** Skill VFX duration (ms) */
export const SKILL_VFX_DURATION = 800;

// ===== Skill Balance =====

/** Q skill cooldown (ms) — basic attack, short CD */
export const Q_COOLDOWN = 3000;

/** W skill cooldown (ms) — utility, medium CD */
export const W_COOLDOWN = 8000;

/** E skill cooldown (ms) — defensive/mobility, medium CD */
export const E_COOLDOWN = 10000;

/** R skill cooldown (ms) — ultimate, long CD */
export const R_COOLDOWN = 30000;

/** Mana costs per slot */
export const Q_MANA_COST = 50;
export const W_MANA_COST = 100;
export const E_MANA_COST = 150;
export const R_MANA_COST = 300;

// ===== Effect Values =====
export const SLOW_MULTIPLIER = 0.5;       // Enemy speed multiplied by this when slowed
export const STUN_DURATION = 2000;         // Default stun duration (ms)
export const SHIELD_DAMAGE_REDUCTION = 0.5; // 50% damage reduction during shield
export const BUFF_DAMAGE_MULTIPLIER = 1.5; // 50% extra damage during buff
export const EXECUTE_THRESHOLD = 0.2;      // Kill enemies below 20% HP
export const KNOCKBACK_TILES = 3;          // Push enemies back 3 grid tiles
export const HEAL_AMOUNT = 25;             // Base heal amount

// ===== Character Appearance =====
/** Floating bob amplitude (pixels) */
export const CHARACTER_BOB_AMPLITUDE = 4;

/** Floating bob speed (cycles per second) */
export const CHARACTER_BOB_SPEED = 1.5;

/** Interaction prompt fade duration (ms) */
export const PROMPT_FADE_DURATION = 300;
