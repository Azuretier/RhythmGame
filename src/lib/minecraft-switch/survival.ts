// =============================================================================
// Minecraft: Nintendo Switch Edition — Survival Mechanics
// =============================================================================
// Core survival system managing health, hunger, food consumption, and status
// effects. Implements Minecraft's exhaustion-driven hunger model, natural
// regeneration, starvation, armor damage reduction, and the full food/effect
// registry matching Nintendo Switch Edition parity.
// =============================================================================

import type {
  DamageSource,
  Difficulty,
  GameMode,
  StatusEffectType,
  StatusEffectInstance,
  FoodProperties,
} from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';

// =============================================================================
// FOOD VALUES REGISTRY
// =============================================================================

/**
 * Food properties for every edible item in the game.
 * `hunger` = hunger points restored (each shank icon = 2 points).
 * `saturation` = saturation points restored.
 * `effects` = status effects applied on consumption (with chance).
 */
export interface FoodEntry {
  hunger: number;
  saturation: number;
  alwaysEdible: boolean;
  effects: {
    type: StatusEffectType;
    amplifier: number;
    duration: number;
    chance: number; // 0-1
  }[];
}

export const FOOD_VALUES: Record<string, FoodEntry> = {
  apple:                  { hunger: 4,  saturation: 2.4,  alwaysEdible: false, effects: [] },
  baked_potato:           { hunger: 5,  saturation: 6.0,  alwaysEdible: false, effects: [] },
  bread:                  { hunger: 5,  saturation: 6.0,  alwaysEdible: false, effects: [] },
  cooked_beef:            { hunger: 8,  saturation: 12.8, alwaysEdible: false, effects: [] },
  cooked_chicken:         { hunger: 6,  saturation: 7.2,  alwaysEdible: false, effects: [] },
  cooked_porkchop:        { hunger: 8,  saturation: 12.8, alwaysEdible: false, effects: [] },
  cooked_mutton:          { hunger: 6,  saturation: 9.6,  alwaysEdible: false, effects: [] },
  cooked_salmon:          { hunger: 6,  saturation: 9.6,  alwaysEdible: false, effects: [] },
  cooked_cod:             { hunger: 5,  saturation: 6.0,  alwaysEdible: false, effects: [] },
  cookie:                 { hunger: 2,  saturation: 0.4,  alwaysEdible: false, effects: [] },
  golden_apple:           { hunger: 4,  saturation: 9.6,  alwaysEdible: true, effects: [
    { type: 'absorption',    amplifier: 1, duration: 2400, chance: 1.0 }, // Absorption II, 2 min
    { type: 'regeneration',  amplifier: 1, duration: 100,  chance: 1.0 }, // Regeneration II, 5 sec
  ]},
  enchanted_golden_apple: { hunger: 4,  saturation: 9.6,  alwaysEdible: true, effects: [
    { type: 'absorption',       amplifier: 3, duration: 2400, chance: 1.0 }, // Absorption IV, 2 min
    { type: 'regeneration',     amplifier: 4, duration: 600,  chance: 1.0 }, // Regeneration V, 30 sec
    { type: 'fire_resistance',  amplifier: 0, duration: 6000, chance: 1.0 }, // Fire Resistance I, 5 min
    { type: 'resistance',       amplifier: 0, duration: 6000, chance: 1.0 }, // Resistance I, 5 min
  ]},
  melon_slice:            { hunger: 2,  saturation: 1.2,  alwaysEdible: false, effects: [] },
  mushroom_stew:          { hunger: 6,  saturation: 7.2,  alwaysEdible: false, effects: [] },
  pumpkin_pie:            { hunger: 8,  saturation: 4.8,  alwaysEdible: false, effects: [] },
  raw_beef:               { hunger: 3,  saturation: 1.8,  alwaysEdible: false, effects: [] },
  raw_chicken:            { hunger: 2,  saturation: 1.2,  alwaysEdible: false, effects: [
    { type: 'hunger', amplifier: 0, duration: 600, chance: 0.3 }, // 30% Hunger for 30s
  ]},
  raw_porkchop:           { hunger: 3,  saturation: 1.8,  alwaysEdible: false, effects: [] },
  carrot:                 { hunger: 3,  saturation: 3.6,  alwaysEdible: false, effects: [] },
  golden_carrot:          { hunger: 6,  saturation: 14.4, alwaysEdible: false, effects: [] },
  potato:                 { hunger: 1,  saturation: 0.6,  alwaysEdible: false, effects: [] },
  sweet_berries:          { hunger: 2,  saturation: 0.4,  alwaysEdible: false, effects: [] },
  dried_kelp:             { hunger: 1,  saturation: 0.6,  alwaysEdible: false, effects: [] },
  rotten_flesh:           { hunger: 4,  saturation: 0.8,  alwaysEdible: false, effects: [
    { type: 'hunger', amplifier: 0, duration: 600, chance: 0.8 }, // 80% Hunger for 30s
  ]},
  spider_eye:             { hunger: 2,  saturation: 3.2,  alwaysEdible: false, effects: [
    { type: 'poison', amplifier: 0, duration: 80, chance: 1.0 }, // Poison I for 4s
  ]},
  chorus_fruit:           { hunger: 4,  saturation: 2.4,  alwaysEdible: true, effects: [] },
  // Chorus fruit also causes random teleport; handled separately in eat()
  cake_slice:             { hunger: 2,  saturation: 0.4,  alwaysEdible: false, effects: [] },
  rabbit_stew:            { hunger: 10, saturation: 12.0, alwaysEdible: false, effects: [] },
  raw_rabbit:             { hunger: 3,  saturation: 1.8,  alwaysEdible: false, effects: [] },
  cooked_rabbit:          { hunger: 5,  saturation: 6.0,  alwaysEdible: false, effects: [] },
  beetroot:               { hunger: 1,  saturation: 1.2,  alwaysEdible: false, effects: [] },
  beetroot_soup:          { hunger: 6,  saturation: 7.2,  alwaysEdible: false, effects: [] },
  raw_mutton:             { hunger: 2,  saturation: 1.2,  alwaysEdible: false, effects: [] },
  raw_salmon:             { hunger: 2,  saturation: 0.4,  alwaysEdible: false, effects: [] },
  raw_cod:                { hunger: 2,  saturation: 0.4,  alwaysEdible: false, effects: [] },
  tropical_fish:          { hunger: 1,  saturation: 0.2,  alwaysEdible: false, effects: [] },
  pufferfish:             { hunger: 1,  saturation: 0.2,  alwaysEdible: false, effects: [
    { type: 'hunger',  amplifier: 2, duration: 300,  chance: 1.0 }, // Hunger III, 15s
    { type: 'nausea',  amplifier: 0, duration: 300,  chance: 1.0 }, // Nausea I, 15s
    { type: 'poison',  amplifier: 1, duration: 1200, chance: 1.0 }, // Poison II, 60s (IV in Java, II in Bedrock)
  ]},
  honey_bottle:           { hunger: 6,  saturation: 1.2,  alwaysEdible: false, effects: [] },
  // Honey bottle also removes Poison effect; handled in eat()
};

// =============================================================================
// ACTIVE EFFECT STATE
// =============================================================================

export interface ActiveEffect {
  level: number;    // amplifier + 1 (Level I = 1, Level II = 2, etc.)
  duration: number; // remaining ticks (-1 = infinite)
  ambient: boolean; // ambient effects have translucent particles
}

// =============================================================================
// SURVIVAL MANAGER
// =============================================================================

/**
 * Core survival system. Manages health, hunger, food consumption, armor
 * damage reduction, and status effects for a single player. Call `tick()`
 * every game tick (20/sec) to drive exhaustion, regeneration, starvation,
 * eat progress, and effect processing.
 */
export class SurvivalManager {
  // ---- Health ----
  health: number = MS_CONFIG.MAX_HEALTH;
  maxHealth: number = MS_CONFIG.MAX_HEALTH;
  private absorptionAmount: number = 0;
  invulnerabilityTicks: number = 0;

  // ---- Hunger ----
  hunger: number = MS_CONFIG.MAX_HUNGER;
  saturation: number = 5; // Default starting saturation
  exhaustion: number = 0;

  // ---- Eating ----
  isEating: boolean = false;
  eatProgress: number = 0; // 0-32 ticks
  eatingItem: string | null = null;

  // ---- Status Effects ----
  activeEffects: Map<StatusEffectType, ActiveEffect> = new Map();

  // ---- Internal counters ----
  private regenTickCounter: number = 0;
  private starvationTickCounter: number = 0;

  // ---- Configuration ----
  private difficulty: Difficulty;
  private gameMode: GameMode;

  // ---- Callbacks for external systems ----
  onChorusTeleport?: () => void;
  onDeath?: (source: DamageSource) => void;

  constructor(config: { difficulty: Difficulty; gameMode: GameMode }) {
    this.difficulty = config.difficulty;
    this.gameMode = config.gameMode;

    // Peaceful mode starts with full hunger and saturation
    if (this.difficulty === 'peaceful') {
      this.hunger = MS_CONFIG.MAX_HUNGER;
      this.saturation = MS_CONFIG.MAX_SATURATION;
    }
  }

  // ===========================================================================
  // DIFFICULTY & GAME MODE
  // ===========================================================================

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    if (difficulty === 'peaceful') {
      // Restore hunger in peaceful
      this.hunger = MS_CONFIG.MAX_HUNGER;
      this.saturation = MS_CONFIG.MAX_SATURATION;
      // Remove hostile-related effects
      this.removeEffect('hunger');
      this.removeEffect('poison');
      this.removeEffect('wither');
    }
  }

  setGameMode(gameMode: GameMode): void {
    this.gameMode = gameMode;
    if (gameMode === 'creative' || gameMode === 'spectator') {
      // Creative/Spectator: full health and hunger, no effects
      this.health = this.maxHealth;
      this.hunger = MS_CONFIG.MAX_HUNGER;
      this.saturation = MS_CONFIG.MAX_SATURATION;
      this.exhaustion = 0;
    }
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getGameMode(): GameMode {
    return this.gameMode;
  }

  // ===========================================================================
  // HEALTH SYSTEM
  // ===========================================================================

  /**
   * Apply damage to the player. Respects invulnerability frames and armor
   * reduction. Returns the actual damage dealt after reductions.
   */
  damage(amount: number, source: DamageSource, bypassArmor: boolean = false, bypassInvulnerability: boolean = false, armorPoints: number = 0, armorToughness: number = 0): number {
    // Creative and spectator modes are immune to most damage
    if (this.gameMode === 'creative' || this.gameMode === 'spectator') {
      // Void damage can still kill in creative
      if (source !== 'void') return 0;
    }

    // Peaceful: no starvation damage
    if (this.difficulty === 'peaceful' && source === 'starving') {
      return 0;
    }

    // Invulnerability frames check
    if (!bypassInvulnerability && this.invulnerabilityTicks > 0) {
      return 0;
    }

    let finalDamage = amount;

    // Difficulty scaling for mob damage
    if (source === 'mob_attack' || source === 'projectile') {
      switch (this.difficulty) {
        case 'peaceful': return 0; // No hostile mob damage in peaceful
        case 'easy':     finalDamage *= 0.5; break;
        case 'normal':   break; // standard
        case 'hard':     finalDamage *= 1.5; break;
      }
    }

    // Armor damage reduction (does not apply to bypass-armor sources)
    if (!bypassArmor && armorPoints > 0) {
      finalDamage = this.applyArmorReduction(finalDamage, armorPoints, armorToughness);
    }

    // Resistance effect reduces damage by 20% per level
    if (this.hasEffect('resistance')) {
      const resistanceLevel = this.getEffectLevel('resistance');
      const reduction = resistanceLevel * 0.2;
      finalDamage *= Math.max(0, 1 - reduction);
    }

    // Protection enchantment would go here (handled by caller passing reduced amount)

    // Fire resistance blocks fire/lava damage
    if (this.hasEffect('fire_resistance') && (source === 'fire' || source === 'lava')) {
      return 0;
    }

    // Round to nearest half-heart
    finalDamage = Math.round(finalDamage * 2) / 2;
    if (finalDamage <= 0) return 0;

    // Absorb damage with absorption hearts first
    if (this.absorptionAmount > 0) {
      const absorbed = Math.min(this.absorptionAmount, finalDamage);
      this.absorptionAmount -= absorbed;
      finalDamage -= absorbed;
    }

    // Apply remaining damage to health
    this.health = Math.max(0, this.health - finalDamage);

    // Set invulnerability frames (10 ticks = 0.5 seconds)
    if (!bypassInvulnerability) {
      this.invulnerabilityTicks = MS_CONFIG.INVULNERABILITY_TICKS;
    }

    // Check for death
    if (this.isDead() && this.onDeath) {
      this.onDeath(source);
    }

    return finalDamage;
  }

  /**
   * Armor damage reduction formula.
   * reduction = min(20, armorPoints) / 25
   * Toughness reduces the effectiveness of high-damage attacks:
   *   effectiveArmor = armorPoints - (4 * damage) / (toughness + 8)
   *   clamped between armorPoints/5 and armorPoints
   *   then reduction = effectiveArmor / 25
   */
  private applyArmorReduction(damage: number, armorPoints: number, toughness: number): number {
    // Calculate effective armor considering toughness
    const effectiveArmor = Math.max(
      armorPoints / 5,
      Math.min(armorPoints, armorPoints - (4 * damage) / (toughness + 8))
    );
    const cappedArmor = Math.min(20, effectiveArmor);
    const reduction = cappedArmor / 25;
    return damage * (1 - reduction);
  }

  /**
   * Heal the player up to max health.
   */
  heal(amount: number): void {
    if (this.isDead()) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Check if the player is dead.
   */
  isDead(): boolean {
    return this.health <= 0;
  }

  /**
   * Get the current absorption (yellow) hearts amount.
   */
  getAbsorptionHearts(): number {
    return this.absorptionAmount;
  }

  /**
   * Set absorption hearts (from golden apple or Absorption effect).
   */
  setAbsorptionHearts(amount: number): void {
    this.absorptionAmount = Math.max(0, amount);
  }

  // ===========================================================================
  // HUNGER SYSTEM
  // ===========================================================================

  /**
   * Add exhaustion from an action. When exhaustion reaches 4, it drains
   * saturation (or hunger if saturation is depleted).
   */
  addExhaustion(amount: number): void {
    // Creative/spectator/peaceful: no exhaustion
    if (this.gameMode !== 'survival' && this.gameMode !== 'adventure') return;
    if (this.difficulty === 'peaceful') return;

    this.exhaustion += amount;

    // Process exhaustion overflow
    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) {
        this.saturation = Math.max(0, this.saturation - 1);
      } else {
        this.hunger = Math.max(0, this.hunger - 1);
      }
    }
  }

  /**
   * Check whether the player can sprint (hunger > 6).
   */
  canSprint(): boolean {
    if (this.gameMode === 'creative' || this.gameMode === 'spectator') return true;
    return this.hunger > MS_CONFIG.SPRINT_THRESHOLD;
  }

  // ===========================================================================
  // FOOD CONSUMPTION
  // ===========================================================================

  /**
   * Check if the player can eat a food item.
   */
  canEat(foodItem: string): boolean {
    const food = FOOD_VALUES[foodItem];
    if (!food) return false;
    if (food.alwaysEdible) return true;
    return this.hunger < MS_CONFIG.MAX_HUNGER;
  }

  /**
   * Begin eating a food item. Takes 32 ticks (1.6 seconds) to consume.
   */
  startEating(item: string): boolean {
    if (this.isEating) return false;
    if (!this.canEat(item)) return false;

    this.isEating = true;
    this.eatProgress = 0;
    this.eatingItem = item;
    return true;
  }

  /**
   * Cancel eating.
   */
  cancelEating(): void {
    this.isEating = false;
    this.eatProgress = 0;
    this.eatingItem = null;
  }

  /**
   * Tick the eating progress. Called once per game tick while eating.
   * Returns true when consumption is complete.
   */
  tickEating(): boolean {
    if (!this.isEating || !this.eatingItem) return false;

    this.eatProgress++;

    if (this.eatProgress >= 32) {
      this.eat(this.eatingItem);
      this.isEating = false;
      this.eatProgress = 0;
      this.eatingItem = null;
      return true;
    }

    return false;
  }

  /**
   * Apply a food item's effects immediately (called when eating completes).
   */
  eat(foodItem: string): void {
    const food = FOOD_VALUES[foodItem];
    if (!food) return;

    // Restore hunger and saturation
    this.hunger = Math.min(MS_CONFIG.MAX_HUNGER, this.hunger + food.hunger);
    // Saturation cannot exceed current hunger level
    this.saturation = Math.min(this.hunger, this.saturation + food.saturation);

    // Apply status effects with chance
    for (const effect of food.effects) {
      if (Math.random() < effect.chance) {
        this.addEffect(effect.type, effect.amplifier, effect.duration);
      }
    }

    // Special food behaviors
    if (foodItem === 'chorus_fruit' && this.onChorusTeleport) {
      this.onChorusTeleport();
    }

    if (foodItem === 'honey_bottle') {
      // Honey removes Poison effect
      this.removeEffect('poison');
    }
  }

  /**
   * Get the FoodProperties for an item (for integration with the item system).
   */
  getFoodProperties(foodItem: string): FoodProperties | null {
    const food = FOOD_VALUES[foodItem];
    if (!food) return null;

    return {
      hunger: food.hunger,
      saturation: food.saturation,
      eatTime: 32,
      alwaysEdible: food.alwaysEdible,
      effects: food.effects
        .filter(e => e.chance >= 1.0) // Only guaranteed effects
        .map(e => ({
          type: e.type,
          amplifier: e.amplifier,
          duration: e.duration,
          showParticles: true,
          showIcon: true,
        })),
    };
  }

  // ===========================================================================
  // STATUS EFFECTS
  // ===========================================================================

  /**
   * Add or upgrade a status effect. Higher amplifier overrides lower.
   * Longer duration overrides shorter at the same amplifier.
   */
  addEffect(type: StatusEffectType, amplifier: number, duration: number, ambient: boolean = false): void {
    const level = amplifier + 1; // Internal: level 1 = amplifier 0
    const existing = this.activeEffects.get(type);

    if (existing) {
      // Higher level always overrides
      if (level > existing.level) {
        this.activeEffects.set(type, { level, duration, ambient });
      } else if (level === existing.level && duration > existing.duration) {
        // Same level: longer duration overrides
        this.activeEffects.set(type, { level, duration, ambient });
      }
      // Lower level or shorter same-level duration: ignore
    } else {
      this.activeEffects.set(type, { level, duration, ambient });
    }

    // Absorption effect sets absorption hearts
    if (type === 'absorption') {
      this.absorptionAmount = level * 4; // 4 absorption HP per level
    }

    // Instant effects apply immediately
    if (type === 'instant_health') {
      this.heal(level * 4); // 4 HP per level
      this.activeEffects.delete(type);
    } else if (type === 'instant_damage') {
      this.damage(level * 6, 'magic', true, true); // 6 damage per level, bypasses armor and invuln
      this.activeEffects.delete(type);
    }
  }

  /**
   * Remove a status effect.
   */
  removeEffect(type: StatusEffectType): void {
    this.activeEffects.delete(type);

    // Removing absorption clears absorption hearts
    if (type === 'absorption') {
      this.absorptionAmount = 0;
    }
  }

  /**
   * Check if a status effect is active.
   */
  hasEffect(type: StatusEffectType): boolean {
    return this.activeEffects.has(type);
  }

  /**
   * Get the level of an active effect (0 if not active).
   * Returns the amplifier + 1 value (Level I = 1, Level II = 2, etc.)
   */
  getEffectLevel(type: StatusEffectType): number {
    const effect = this.activeEffects.get(type);
    return effect ? effect.level : 0;
  }

  /**
   * Get the remaining duration of an active effect in ticks (0 if not active).
   */
  getEffectDuration(type: StatusEffectType): number {
    const effect = this.activeEffects.get(type);
    return effect ? effect.duration : 0;
  }

  /**
   * Get all active effects as StatusEffectInstance array (for network sync).
   */
  getActiveEffectsAsInstances(): StatusEffectInstance[] {
    const instances: StatusEffectInstance[] = [];
    for (const [type, effect] of this.activeEffects) {
      instances.push({
        type,
        amplifier: effect.level - 1,
        duration: effect.duration,
        showParticles: !effect.ambient,
        showIcon: true,
      });
    }
    return instances;
  }

  /**
   * Tick all status effects: decrement durations and apply per-tick effects.
   */
  tickEffects(): void {
    const expired: StatusEffectType[] = [];

    for (const [type, effect] of this.activeEffects) {
      // Apply per-tick effects
      this.applyEffectTick(type, effect);

      // Decrement duration (skip infinite effects)
      if (effect.duration !== -1) {
        effect.duration--;
        if (effect.duration <= 0) {
          expired.push(type);
        }
      }
    }

    // Remove expired effects
    for (const type of expired) {
      this.removeEffect(type);
    }
  }

  /**
   * Apply the per-tick behavior of a status effect.
   */
  private applyEffectTick(type: StatusEffectType, effect: ActiveEffect): void {
    switch (type) {
      case 'regeneration': {
        // Heal 1 HP every (50 / level) ticks
        const interval = Math.max(1, Math.floor(50 / effect.level));
        if (effect.duration % interval === 0) {
          this.heal(1);
        }
        break;
      }

      case 'poison': {
        // Damage 1 HP every (25 / level) ticks, won't kill (stops at 1 HP)
        const interval = Math.max(1, Math.floor(25 / effect.level));
        if (effect.duration % interval === 0) {
          if (this.health > 1) {
            this.health = Math.max(1, this.health - 1);
          }
        }
        break;
      }

      case 'wither': {
        // Damage 1 HP every (40 / level) ticks, CAN kill
        const interval = Math.max(1, Math.floor(40 / effect.level));
        if (effect.duration % interval === 0) {
          this.damage(1, 'wither_effect', true, true);
        }
        break;
      }

      case 'hunger': {
        // Add 0.1 exhaustion per second per level (0.005 per tick per level)
        this.addExhaustion(0.005 * effect.level);
        break;
      }

      // Speed, Slowness, Haste, Mining Fatigue are handled by physics/mining
      // systems that read getEffectLevel() directly.
      default:
        break;
    }
  }

  /**
   * Get the speed multiplier from Speed/Slowness effects.
   * Speed: 1.2^level multiplier.
   * Slowness: (1 - 0.15 * level) multiplier.
   */
  getSpeedMultiplier(): number {
    let multiplier = 1.0;

    if (this.hasEffect('speed')) {
      multiplier *= Math.pow(1.2, this.getEffectLevel('speed'));
    }

    if (this.hasEffect('slowness')) {
      multiplier *= Math.max(0, 1 - 0.15 * this.getEffectLevel('slowness'));
    }

    return multiplier;
  }

  /**
   * Get the mining speed multiplier from Haste/Mining Fatigue effects.
   */
  getMiningSpeedMultiplier(): number {
    let multiplier = 1.0;

    if (this.hasEffect('haste')) {
      multiplier *= 1 + 0.2 * this.getEffectLevel('haste');
    }

    if (this.hasEffect('mining_fatigue')) {
      const level = this.getEffectLevel('mining_fatigue');
      // Mining Fatigue severely reduces mining speed
      multiplier *= Math.pow(0.3, Math.min(level, 4));
    }

    return multiplier;
  }

  // ===========================================================================
  // MAIN TICK
  // ===========================================================================

  /**
   * Called every game tick (20/sec). Drives the full survival loop:
   * 1. Decrement invulnerability frames
   * 2. Process eating progress
   * 3. Tick status effects
   * 4. Process exhaustion overflow (already done in addExhaustion)
   * 5. Natural regeneration
   * 6. Starvation damage
   */
  tick(): void {
    // Creative/spectator: skip survival processing
    if (this.gameMode === 'creative' || this.gameMode === 'spectator') {
      this.tickEffects();
      if (this.invulnerabilityTicks > 0) this.invulnerabilityTicks--;
      return;
    }

    // 1. Decrement invulnerability frames
    if (this.invulnerabilityTicks > 0) {
      this.invulnerabilityTicks--;
    }

    // 2. Process eating
    if (this.isEating) {
      this.tickEating();
    }

    // 3. Tick status effects
    this.tickEffects();

    // 4. Peaceful mode: restore hunger and health rapidly
    if (this.difficulty === 'peaceful') {
      this.hunger = MS_CONFIG.MAX_HUNGER;
      this.saturation = MS_CONFIG.MAX_SATURATION;
      if (this.health < this.maxHealth) {
        this.heal(1); // Heal 1 HP per tick in peaceful
      }
      return;
    }

    // 5. Natural regeneration
    if (!this.isDead()) {
      this.processNaturalRegeneration();
    }

    // 6. Starvation damage
    if (!this.isDead()) {
      this.processStarvation();
    }
  }

  /**
   * Natural regeneration logic.
   * - Hunger >= 20 (full): heal 1 HP every 10 ticks (rapid regen)
   * - Hunger >= 18: heal 1 HP every 80 ticks (4 seconds), costs 6 exhaustion
   */
  private processNaturalRegeneration(): void {
    if (this.health >= this.maxHealth) {
      this.regenTickCounter = 0;
      return;
    }

    if (this.hunger >= MS_CONFIG.MAX_HUNGER) {
      // Rapid regeneration when fully fed
      this.regenTickCounter++;
      if (this.regenTickCounter >= 10) {
        this.heal(1);
        this.addExhaustion(MS_CONFIG.FOOD_EXHAUSTION_REGEN);
        this.regenTickCounter = 0;
      }
    } else if (this.hunger >= MS_CONFIG.NATURAL_REGEN_THRESHOLD) {
      // Normal regeneration
      this.regenTickCounter++;
      if (this.regenTickCounter >= 80) {
        this.heal(1);
        this.addExhaustion(MS_CONFIG.FOOD_EXHAUSTION_REGEN);
        this.regenTickCounter = 0;
      }
    } else {
      this.regenTickCounter = 0;
    }
  }

  /**
   * Starvation damage logic.
   * When hunger = 0, take 1 damage every 80 ticks.
   * - Easy: stops at 10 HP
   * - Normal: stops at 1 HP
   * - Hard: can kill
   */
  private processStarvation(): void {
    if (this.hunger > 0) {
      this.starvationTickCounter = 0;
      return;
    }

    this.starvationTickCounter++;
    if (this.starvationTickCounter >= MS_CONFIG.STARVATION_DAMAGE_INTERVAL) {
      this.starvationTickCounter = 0;

      switch (this.difficulty) {
        case 'easy':
          if (this.health > 10) {
            this.damage(1, 'starving', true, true);
          }
          break;
        case 'normal':
          if (this.health > 1) {
            this.damage(1, 'starving', true, true);
          }
          break;
        case 'hard':
          this.damage(1, 'starving', true, true);
          break;
        default:
          break;
      }
    }
  }

  // ===========================================================================
  // STATE RESET (for respawn)
  // ===========================================================================

  /**
   * Reset survival state for respawn.
   */
  reset(): void {
    this.health = this.maxHealth;
    this.hunger = MS_CONFIG.MAX_HUNGER;
    this.saturation = 5;
    this.exhaustion = 0;
    this.absorptionAmount = 0;
    this.invulnerabilityTicks = 0;
    this.isEating = false;
    this.eatProgress = 0;
    this.eatingItem = null;
    this.activeEffects.clear();
    this.regenTickCounter = 0;
    this.starvationTickCounter = 0;
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Export current survival state for network sync or saving.
   */
  serialize(): SurvivalState {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      absorptionAmount: this.absorptionAmount,
      hunger: this.hunger,
      saturation: this.saturation,
      exhaustion: this.exhaustion,
      invulnerabilityTicks: this.invulnerabilityTicks,
      effects: this.getActiveEffectsAsInstances(),
    };
  }

  /**
   * Restore survival state from serialized data.
   */
  deserialize(state: SurvivalState): void {
    this.health = state.health;
    this.maxHealth = state.maxHealth;
    this.absorptionAmount = state.absorptionAmount;
    this.hunger = state.hunger;
    this.saturation = state.saturation;
    this.exhaustion = state.exhaustion;
    this.invulnerabilityTicks = state.invulnerabilityTicks;

    this.activeEffects.clear();
    for (const effect of state.effects) {
      this.activeEffects.set(effect.type, {
        level: effect.amplifier + 1,
        duration: effect.duration,
        ambient: !effect.showParticles,
      });
    }
  }
}

// =============================================================================
// SERIALIZED STATE TYPE
// =============================================================================

export interface SurvivalState {
  health: number;
  maxHealth: number;
  absorptionAmount: number;
  hunger: number;
  saturation: number;
  exhaustion: number;
  invulnerabilityTicks: number;
  effects: StatusEffectInstance[];
}
