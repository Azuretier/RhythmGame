// =============================================================================
// Minecraft: Nintendo Switch Edition — Combat System
// =============================================================================
// Complete combat calculations for melee, ranged, armor damage reduction,
// shield blocking, enchantment effects, critical hits, knockback, attack
// cooldown, and sweeping edge. Matches Minecraft: Nintendo Switch Edition
// parity for all damage formulas.
// =============================================================================

import type {
  EnchantmentInstance,
  EnchantmentType,
  MobType,
  PlayerState,
  InventorySlot,
  ToolStats,
  ArmorStats,
  DamageSource,
} from '@/types/minecraft-switch';
import { MS_CONFIG, PHYSICS } from '@/types/minecraft-switch';
import { isUndeadMob, isArthropodMob } from './mobs/mob-registry';

// =============================================================================
// WEAPON ATTACK DAMAGE TABLE
// =============================================================================

/**
 * Base attack damage values for each weapon type.
 * These are the additional damage beyond the base player damage (1).
 */
const WEAPON_DAMAGE: Record<string, number> = {
  // Swords
  wooden_sword: 4,
  stone_sword: 5,
  iron_sword: 6,
  golden_sword: 4,
  diamond_sword: 7,
  netherite_sword: 8,
  // Axes
  wooden_axe: 7,
  stone_axe: 9,
  iron_axe: 9,
  golden_axe: 7,
  diamond_axe: 9,
  netherite_axe: 10,
  // Pickaxes
  wooden_pickaxe: 2,
  stone_pickaxe: 3,
  iron_pickaxe: 4,
  golden_pickaxe: 2,
  diamond_pickaxe: 5,
  netherite_pickaxe: 6,
  // Shovels
  wooden_shovel: 2.5,
  stone_shovel: 3.5,
  iron_shovel: 4.5,
  golden_shovel: 2.5,
  diamond_shovel: 5.5,
  netherite_shovel: 6.5,
  // Hoes
  wooden_hoe: 1,
  stone_hoe: 1,
  iron_hoe: 1,
  golden_hoe: 1,
  diamond_hoe: 1,
  netherite_hoe: 1,
  // Trident
  trident: 9,
};

/**
 * Attack speed (attacks per second) for each weapon type.
 * Used to calculate attack cooldown.
 */
const WEAPON_ATTACK_SPEED: Record<string, number> = {
  // Swords
  wooden_sword: 1.6,
  stone_sword: 1.6,
  iron_sword: 1.6,
  golden_sword: 1.6,
  diamond_sword: 1.6,
  netherite_sword: 1.6,
  // Axes
  wooden_axe: 0.8,
  stone_axe: 0.8,
  iron_axe: 0.9,
  golden_axe: 1.0,
  diamond_axe: 1.0,
  netherite_axe: 1.0,
  // Pickaxes
  wooden_pickaxe: 1.2,
  stone_pickaxe: 1.2,
  iron_pickaxe: 1.2,
  golden_pickaxe: 1.2,
  diamond_pickaxe: 1.2,
  netherite_pickaxe: 1.2,
  // Shovels
  wooden_shovel: 1.0,
  stone_shovel: 1.0,
  iron_shovel: 1.0,
  golden_shovel: 1.0,
  diamond_shovel: 1.0,
  netherite_shovel: 1.0,
  // Hoes
  wooden_hoe: 1.0,
  stone_hoe: 2.0,
  iron_hoe: 3.0,
  golden_hoe: 1.0,
  diamond_hoe: 4.0,
  netherite_hoe: 4.0,
  // Trident
  trident: 1.1,
  // Bare hand
  hand: 4.0,
};

// =============================================================================
// ARMOR DEFENSE VALUES
// =============================================================================

/**
 * Armor defense points by item ID.
 */
const ARMOR_DEFENSE: Record<string, { defense: number; toughness: number }> = {
  // Leather
  leather_helmet: { defense: 1, toughness: 0 },
  leather_chestplate: { defense: 3, toughness: 0 },
  leather_leggings: { defense: 2, toughness: 0 },
  leather_boots: { defense: 1, toughness: 0 },
  // Chainmail
  chainmail_helmet: { defense: 2, toughness: 0 },
  chainmail_chestplate: { defense: 5, toughness: 0 },
  chainmail_leggings: { defense: 4, toughness: 0 },
  chainmail_boots: { defense: 1, toughness: 0 },
  // Iron
  iron_helmet: { defense: 2, toughness: 0 },
  iron_chestplate: { defense: 6, toughness: 0 },
  iron_leggings: { defense: 5, toughness: 0 },
  iron_boots: { defense: 2, toughness: 0 },
  // Gold
  golden_helmet: { defense: 2, toughness: 0 },
  golden_chestplate: { defense: 5, toughness: 0 },
  golden_leggings: { defense: 3, toughness: 0 },
  golden_boots: { defense: 1, toughness: 0 },
  // Diamond
  diamond_helmet: { defense: 3, toughness: 2 },
  diamond_chestplate: { defense: 8, toughness: 2 },
  diamond_leggings: { defense: 6, toughness: 2 },
  diamond_boots: { defense: 3, toughness: 2 },
  // Netherite
  netherite_helmet: { defense: 3, toughness: 3 },
  netherite_chestplate: { defense: 8, toughness: 3 },
  netherite_leggings: { defense: 6, toughness: 3 },
  netherite_boots: { defense: 3, toughness: 3 },
  // Turtle Shell
  turtle_helmet: { defense: 2, toughness: 0 },
};

// =============================================================================
// ENCHANTMENT HELPERS
// =============================================================================

/**
 * Get the level of a specific enchantment from an enchantment list.
 * Returns 0 if the enchantment is not present.
 */
function getEnchantLevel(enchantments: EnchantmentInstance[] | undefined, type: EnchantmentType): number {
  if (!enchantments) return 0;
  const found = enchantments.find(e => e.type === type);
  return found?.level ?? 0;
}

/**
 * Sum an enchantment level across all armor pieces.
 */
function sumArmorEnchant(
  armorSlots: (InventorySlot | null)[],
  type: EnchantmentType,
): number {
  let total = 0;
  for (const slot of armorSlots) {
    if (slot) total += getEnchantLevel(slot.enchantments, type);
  }
  return total;
}

// =============================================================================
// MELEE COMBAT
// =============================================================================

/**
 * Calculate melee attack damage from a weapon with optional enchantments.
 *
 * @param weaponId - Item ID of the weapon (null for bare hand)
 * @param criticalHit - Whether this is a critical hit
 * @param enchantments - Enchantments on the weapon
 * @param targetMobType - Type of mob being hit (for Smite/Bane)
 * @returns Base damage value before armor reduction
 */
export function calculateMeleeDamage(
  weaponId: string | null,
  criticalHit: boolean,
  enchantments: EnchantmentInstance[] = [],
  targetMobType?: MobType,
): number {
  // Base damage
  let damage = weaponId ? (WEAPON_DAMAGE[weaponId] ?? 1) : 1;

  // Sharpness: +0.5 * level + 0.5
  const sharpness = getEnchantLevel(enchantments, 'sharpness');
  if (sharpness > 0) {
    damage += 0.5 * sharpness + 0.5;
  }

  // Smite: +2.5 * level vs undead
  if (targetMobType && isUndeadMob(targetMobType)) {
    const smite = getEnchantLevel(enchantments, 'smite');
    if (smite > 0) {
      damage += 2.5 * smite;
    }
  }

  // Bane of Arthropods: +2.5 * level vs arthropods
  if (targetMobType && isArthropodMob(targetMobType)) {
    const bane = getEnchantLevel(enchantments, 'bane_of_arthropods');
    if (bane > 0) {
      damage += 2.5 * bane;
    }
  }

  // Critical hit: 1.5x damage
  if (criticalHit) {
    damage *= MS_CONFIG.CRITICAL_HIT_MULTIPLIER;
  }

  return damage;
}

/**
 * Determine if an attack qualifies as a critical hit.
 *
 * Requirements: falling (vy < 0), not on ground, not in water,
 * not climbing, not blind, not sprinting.
 */
export function isCriticalHit(player: {
  velocity: { y: number };
  onGround: boolean;
  swimming: boolean;
  sprinting: boolean;
  statusEffects?: { type: string }[];
}): boolean {
  if (player.onGround) return false;
  if (player.velocity.y >= 0) return false; // Must be falling
  if (player.swimming) return false;
  if (player.sprinting) return false;

  // Check for blindness effect
  if (player.statusEffects?.some(e => e.type === 'blindness')) return false;

  return true;
}

/**
 * Calculate knockback vector from an attack.
 *
 * @param baseKb - Base knockback strength (default from PHYSICS)
 * @param enchantKbLevel - Knockback enchantment level
 * @param sprintAttack - Whether the attacker was sprinting
 * @param attackerPos - Position of the attacker
 * @param targetPos - Position of the target
 * @returns Knockback velocity vector
 */
export function calculateKnockback(
  baseKb: number = PHYSICS.KNOCKBACK_HORIZONTAL,
  enchantKbLevel: number,
  sprintAttack: boolean,
  attackerPos: { x: number; z: number },
  targetPos: { x: number; z: number },
): { x: number; y: number; z: number } {
  const dx = targetPos.x - attackerPos.x;
  const dz = targetPos.z - attackerPos.z;
  const len = Math.sqrt(dx * dx + dz * dz);

  if (len < 0.001) {
    return { x: 0, y: PHYSICS.KNOCKBACK_VERTICAL, z: 0 };
  }

  const nx = dx / len;
  const nz = dz / len;

  // Total knockback multiplier
  let kbStrength = baseKb;

  // Knockback enchantment: +1 per level
  kbStrength += enchantKbLevel * 0.4;

  // Sprint attack: +1 knockback
  if (sprintAttack) {
    kbStrength += 0.4;
  }

  return {
    x: nx * kbStrength,
    y: PHYSICS.KNOCKBACK_VERTICAL,
    z: nz * kbStrength,
  };
}

/**
 * Calculate sweeping edge damage to nearby mobs.
 *
 * Sweeping edge deals reduced damage to entities near the primary target.
 * Formula: 1 + Sweeping Edge level * baseDamage / (Sweeping Edge level + 1)
 *
 * @param baseDamage - Damage dealt to the primary target
 * @param enchantLevel - Sweeping Edge enchantment level
 * @returns Damage dealt to secondary targets
 */
export function applySweepingEdge(baseDamage: number, enchantLevel: number): number {
  if (enchantLevel <= 0) return 1;
  return 1 + enchantLevel * baseDamage / (enchantLevel + 1);
}

/**
 * Get the attack cooldown in ticks for a weapon.
 *
 * @param weaponId - Item ID of the weapon (null for bare hand)
 * @returns Cooldown in ticks between full-damage attacks
 */
export function getAttackCooldown(weaponId: string | null): number {
  const attackSpeed = weaponId
    ? (WEAPON_ATTACK_SPEED[weaponId] ?? 4.0)
    : 4.0;

  // Cooldown in ticks = 20 / attackSpeed
  return Math.ceil(20 / attackSpeed);
}

/**
 * Get the attack cooldown progress (0-1).
 * Damage is multiplied by (0.2 + progress^2 * 0.8).
 *
 * @param ticksSinceLastAttack - Ticks since the last attack
 * @param weaponId - Item ID of the weapon
 * @returns Progress value between 0 and 1
 */
export function getAttackCooldownProgress(
  ticksSinceLastAttack: number,
  weaponId: string | null,
): number {
  const cooldown = getAttackCooldown(weaponId);
  return Math.min(1, ticksSinceLastAttack / cooldown);
}

/**
 * Calculate the damage multiplier from attack cooldown progress.
 * Formula: 0.2 + progress^2 * 0.8
 */
export function getAttackCooldownDamageMultiplier(progress: number): number {
  return 0.2 + progress * progress * 0.8;
}

// =============================================================================
// RANGED COMBAT
// =============================================================================

/**
 * Calculate arrow damage based on bow charge level and Power enchantment.
 *
 * @param bowCharge - Charge level (0.0 to 1.0, based on draw time 0.2s to 1.0s)
 * @param powerLevel - Power enchantment level
 * @returns Arrow damage
 */
export function calculateArrowDamage(bowCharge: number, powerLevel: number): number {
  // Base damage scales with charge
  // Minimum charge: 0.2s = 0.2 charge, minimum damage
  // Full charge: 1.0 = max damage (6)
  const baseDamage = bowCharge * 6;

  // Power enchantment: +25% per level
  const powerBonus = powerLevel > 0 ? baseDamage * 0.25 * (powerLevel + 1) : 0;

  // Critical shot (fully charged): 25% bonus
  const critBonus = bowCharge >= 1.0 ? baseDamage * 0.25 : 0;

  return baseDamage + powerBonus + critBonus;
}

/**
 * Calculate a projectile's trajectory with gravity.
 *
 * @param origin - Starting position
 * @param direction - Normalized direction vector
 * @param velocity - Initial velocity in blocks/tick
 * @param ticks - Number of ticks to simulate
 * @param gravity - Gravity acceleration per tick^2
 * @returns Array of positions along the trajectory
 */
export function calculateArrowTrajectory(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  velocity: number,
  ticks: number = 40,
  gravity: number = 0.05,
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];

  let x = origin.x;
  let y = origin.y;
  let z = origin.z;
  let vx = direction.x * velocity;
  let vy = direction.y * velocity;
  let vz = direction.z * velocity;

  for (let t = 0; t < ticks; t++) {
    x += vx;
    y += vy;
    z += vz;

    // Apply gravity
    vy -= gravity;

    // Air drag
    vx *= 0.99;
    vy *= 0.99;
    vz *= 0.99;

    positions.push({ x, y, z });

    // Stop if below world
    if (y < 0) break;
  }

  return positions;
}

/**
 * Calculate projectile damage based on type and velocity.
 *
 * @param projectileType - Type of projectile
 * @param velocity - Current velocity magnitude
 * @returns Damage value
 */
export function calculateProjectileDamage(
  projectileType: 'arrow' | 'trident' | 'snowball' | 'egg' | 'fireball',
  velocity: number,
): number {
  switch (projectileType) {
    case 'arrow':
      // Damage scales with velocity, base ~6 at full speed
      return Math.ceil(velocity * 2);
    case 'trident':
      return 8;
    case 'snowball':
      return 0; // Knockback only (3 damage to blazes)
    case 'egg':
      return 0; // Knockback only
    case 'fireball':
      return 6;
    default:
      return 0;
  }
}

// =============================================================================
// ARMOR DAMAGE REDUCTION
// =============================================================================

/**
 * Calculate damage after armor reduction.
 *
 * Minecraft armor formula:
 * damage * (1 - min(20, max(armorPoints/5, armorPoints - 4*damage/(toughness+8))) / 25)
 *
 * @param damage - Incoming damage before armor
 * @param armorPoints - Total armor defense points (0-20)
 * @param toughness - Total armor toughness value
 * @returns Damage after armor reduction
 */
export function calculateDamageAfterArmor(
  damage: number,
  armorPoints: number,
  toughness: number,
): number {
  // Armor formula from Minecraft wiki
  const defensePoints = Math.min(
    20,
    Math.max(armorPoints / 5, armorPoints - 4 * damage / (toughness + 8)),
  );
  return damage * (1 - defensePoints / 25);
}

/**
 * Calculate damage after enchantment protection reduction.
 *
 * @param damage - Damage after armor reduction
 * @param protectionLevel - Total protection enchantment level across all armor
 * @returns Damage after enchantment protection
 */
export function calculateDamageAfterEnchants(
  damage: number,
  protectionLevel: number,
): number {
  // Each level of Protection reduces damage by 4%, capped at 80% (level 20)
  const reduction = Math.min(20, 4 * protectionLevel);
  return damage * (1 - reduction / 25);
}

/**
 * Calculate total armor points and toughness from armor slots.
 *
 * @param armorSlots - The 4 armor slots [helmet, chestplate, leggings, boots]
 * @returns Object with total armorPoints and toughness
 */
export function calculateArmorValues(
  armorSlots: (InventorySlot | null)[],
): { armorPoints: number; toughness: number } {
  let armorPoints = 0;
  let toughness = 0;

  for (const slot of armorSlots) {
    if (!slot) continue;
    const armorData = ARMOR_DEFENSE[slot.item];
    if (armorData) {
      armorPoints += armorData.defense;
      toughness += armorData.toughness;
    }
  }

  return { armorPoints, toughness };
}

/**
 * Calculate total protection enchantment level from all armor pieces.
 * Considers: Protection, Fire Protection, Blast Protection, Projectile Protection.
 *
 * @param armorSlots - The 4 armor slots
 * @param damageSource - The type of damage being reduced
 * @returns Effective protection level
 */
export function calculateProtectionLevel(
  armorSlots: (InventorySlot | null)[],
  damageSource: DamageSource,
): number {
  let totalProtection = 0;

  for (const slot of armorSlots) {
    if (!slot || !slot.enchantments) continue;

    // Generic Protection works against all damage
    totalProtection += getEnchantLevel(slot.enchantments, 'protection');

    // Specific protection types
    if (damageSource === 'fire' || damageSource === 'lava') {
      totalProtection += getEnchantLevel(slot.enchantments, 'fire_protection') * 2;
    }
    if (damageSource === 'explosion') {
      totalProtection += getEnchantLevel(slot.enchantments, 'blast_protection') * 2;
    }
    if (damageSource === 'projectile') {
      totalProtection += getEnchantLevel(slot.enchantments, 'projectile_protection') * 2;
    }
  }

  return totalProtection;
}

/**
 * Apply durability damage to armor pieces when the player takes damage.
 *
 * Each armor piece takes max(1, floor(damage/4)) durability damage.
 * Unbreaking enchantment gives a chance to not reduce durability.
 *
 * @param armorSlots - The 4 armor slots (mutated in-place)
 * @param damage - Damage dealt to the player
 * @returns Array of slot indices where armor broke
 */
export function damageArmorDurability(
  armorSlots: (InventorySlot | null)[],
  damage: number,
): number[] {
  const brokenSlots: number[] = [];
  const durabilityDamage = Math.max(1, Math.floor(damage / 4));

  for (let i = 0; i < armorSlots.length; i++) {
    const slot = armorSlots[i];
    if (!slot || slot.durability === undefined) continue;

    // Unbreaking enchantment: chance to not take damage
    const unbreaking = getEnchantLevel(slot.enchantments, 'unbreaking');
    if (unbreaking > 0) {
      const skipChance = unbreaking / (unbreaking + 1);
      if (Math.random() < skipChance) continue;
    }

    slot.durability -= durabilityDamage;

    if (slot.durability <= 0) {
      // Armor piece broke
      armorSlots[i] = null;
      brokenSlots.push(i);
    }
  }

  return brokenSlots;
}

// =============================================================================
// SHIELD
// =============================================================================

/**
 * Check if a player can block incoming damage with their shield.
 *
 * The shield blocks damage from the front 180 degrees.
 *
 * @param playerYaw - Player's facing direction in degrees
 * @param damageDirection - Direction the damage is coming from (in degrees)
 * @param isShieldActive - Whether the player is actively holding up the shield
 * @returns Whether the shield blocks the damage
 */
export function canBlock(
  playerYaw: number,
  damageDirection: number,
  isShieldActive: boolean,
): boolean {
  if (!isShieldActive) return false;

  // Calculate angle between player facing and damage direction
  let angleDiff = Math.abs(((playerYaw - damageDirection + 540) % 360) - 180);

  // Shield blocks front 180 degrees
  return angleDiff <= 90;
}

/**
 * Calculate the result of blocking damage with a shield.
 *
 * @param damage - Incoming damage amount
 * @param shieldDurability - Current shield durability
 * @returns Object with blocked status, remaining damage, and durability cost
 */
export function blockDamage(
  damage: number,
  shieldDurability: number,
): { blocked: boolean; remainingDamage: number; durabilityCost: number; shieldBroken: boolean } {
  // Shield fully absorbs damage
  const durabilityCost = 1 + Math.floor(damage);
  const newDurability = shieldDurability - durabilityCost;

  return {
    blocked: true,
    remainingDamage: 0,
    durabilityCost,
    shieldBroken: newDurability <= 0,
  };
}

// =============================================================================
// FULL DAMAGE PIPELINE
// =============================================================================

/** Result of a complete damage calculation. */
export interface DamageCalculationResult {
  /** Original damage before any modifiers. */
  rawDamage: number;
  /** Whether the hit was a critical hit. */
  isCritical: boolean;
  /** Damage after attack cooldown multiplier. */
  damageAfterCooldown: number;
  /** Damage after armor reduction. */
  damageAfterArmor: number;
  /** Damage after enchantment protection. */
  damageAfterEnchants: number;
  /** Whether the shield blocked the damage. */
  shieldBlocked: boolean;
  /** Final damage applied to the target. */
  finalDamage: number;
  /** Knockback vector. */
  knockback: { x: number; y: number; z: number };
  /** Whether Fire Aspect sets the target on fire. */
  setsOnFire: boolean;
  /** Fire duration in ticks. */
  fireDuration: number;
  /** Sweeping edge damage (for nearby mobs). */
  sweepingDamage: number;
  /** Durability damage to armor slots. */
  armorDurabilityDamage: number;
}

/**
 * Run the complete damage calculation pipeline for a player-to-mob melee attack.
 *
 * @param weaponId - Weapon item ID (null for bare hand)
 * @param weaponEnchantments - Enchantments on the weapon
 * @param ticksSinceLastAttack - Ticks since the player's last attack
 * @param playerState - Attacker player state
 * @param targetArmorPoints - Target's total armor points
 * @param targetToughness - Target's total armor toughness
 * @param targetProtectionLevel - Target's total protection enchantment level
 * @param targetMobType - Type of mob being hit (for Smite/Bane)
 * @param attackerPos - Attacker position
 * @param targetPos - Target position
 * @returns Complete damage calculation result
 */
export function calculateFullDamage(
  weaponId: string | null,
  weaponEnchantments: EnchantmentInstance[] = [],
  ticksSinceLastAttack: number,
  playerState: {
    velocity: { y: number };
    onGround: boolean;
    swimming: boolean;
    sprinting: boolean;
    statusEffects?: { type: string }[];
    position: { x: number; z: number };
  },
  targetArmorPoints: number,
  targetToughness: number,
  targetProtectionLevel: number,
  targetMobType?: MobType,
  attackerPos?: { x: number; z: number },
  targetPos?: { x: number; z: number },
): DamageCalculationResult {
  // 1. Critical hit check
  const critical = isCriticalHit(playerState);

  // 2. Base damage with enchantments
  const rawDamage = calculateMeleeDamage(weaponId, critical, weaponEnchantments, targetMobType);

  // 3. Attack cooldown multiplier
  const cooldownProgress = getAttackCooldownProgress(ticksSinceLastAttack, weaponId);
  const cooldownMultiplier = getAttackCooldownDamageMultiplier(cooldownProgress);
  const damageAfterCooldown = rawDamage * cooldownMultiplier;

  // 4. Armor reduction
  const damageAfterArmor = calculateDamageAfterArmor(
    damageAfterCooldown,
    targetArmorPoints,
    targetToughness,
  );

  // 5. Enchantment protection
  const damageAfterEnchants = calculateDamageAfterEnchants(
    damageAfterArmor,
    targetProtectionLevel,
  );

  // 6. Final damage (minimum 0)
  const finalDamage = Math.max(0, damageAfterEnchants);

  // 7. Knockback
  const knockbackLevel = getEnchantLevel(weaponEnchantments, 'knockback');
  const kb = calculateKnockback(
    PHYSICS.KNOCKBACK_HORIZONTAL,
    knockbackLevel,
    playerState.sprinting,
    attackerPos ?? playerState.position,
    targetPos ?? { x: 0, z: 0 },
  );

  // 8. Fire Aspect
  const fireAspect = getEnchantLevel(weaponEnchantments, 'fire_aspect');
  const setsOnFire = fireAspect > 0;
  const fireDuration = fireAspect * 80; // 4 seconds per level

  // 9. Sweeping Edge
  const sweepingLevel = getEnchantLevel(weaponEnchantments, 'sweeping_edge');
  const sweepingDamage = applySweepingEdge(finalDamage, sweepingLevel);

  // 10. Armor durability
  const armorDurabilityDamage = Math.max(1, Math.floor(damageAfterCooldown / 4));

  return {
    rawDamage,
    isCritical: critical,
    damageAfterCooldown,
    damageAfterArmor,
    damageAfterEnchants,
    shieldBlocked: false,
    finalDamage,
    knockback: kb,
    setsOnFire,
    fireDuration,
    sweepingDamage,
    armorDurabilityDamage,
  };
}

/**
 * Calculate damage direction angle from attacker to target.
 * Used for shield blocking checks and directional damage indicators.
 *
 * @param attackerX - Attacker X position
 * @param attackerZ - Attacker Z position
 * @param targetX - Target X position
 * @param targetZ - Target Z position
 * @returns Angle in degrees (0 = south, 90 = west, 180 = north, 270 = east)
 */
export function getDamageDirection(
  attackerX: number,
  attackerZ: number,
  targetX: number,
  targetZ: number,
): number {
  const dx = attackerX - targetX;
  const dz = attackerZ - targetZ;
  return ((Math.atan2(dx, dz) * 180 / Math.PI) + 360) % 360;
}

// =============================================================================
// THORNS ENCHANTMENT
// =============================================================================

/**
 * Calculate thorns damage reflected back to the attacker.
 *
 * Thorns has a level * 15% chance to deal 1-4 damage back.
 *
 * @param armorSlots - Defender's armor slots
 * @returns Thorns damage to reflect, or 0 if no thorns triggered
 */
export function calculateThornsDamage(
  armorSlots: (InventorySlot | null)[],
): number {
  for (const slot of armorSlots) {
    if (!slot) continue;
    const thornsLevel = getEnchantLevel(slot.enchantments, 'thorns');
    if (thornsLevel <= 0) continue;

    // Chance = level * 15%
    if (Math.random() < thornsLevel * 0.15) {
      // Damage = 1-4
      return 1 + Math.floor(Math.random() * 4);
    }
  }
  return 0;
}

// =============================================================================
// FALL DAMAGE
// =============================================================================

/**
 * Calculate fall damage based on fall distance.
 *
 * @param fallDistance - Distance fallen in blocks
 * @param featherFallingLevel - Feather Falling enchantment level
 * @returns Damage in half-hearts
 */
export function calculateFallDamage(
  fallDistance: number,
  featherFallingLevel: number = 0,
): number {
  // No damage for falls <= 3 blocks
  if (fallDistance <= PHYSICS.FALL_DAMAGE_THRESHOLD) return 0;

  let damage = Math.floor(fallDistance - PHYSICS.FALL_DAMAGE_THRESHOLD);

  // Feather Falling reduces by 12% per level (stacks with Protection)
  if (featherFallingLevel > 0) {
    damage = Math.floor(damage * (1 - 0.12 * featherFallingLevel));
  }

  return Math.max(0, damage);
}

// =============================================================================
// FIRE ASPECT AND FLAME
// =============================================================================

/**
 * Calculate fire duration from Fire Aspect or Flame enchantment.
 *
 * @param enchantLevel - Fire Aspect or Flame level
 * @returns Duration in ticks
 */
export function getFireDuration(enchantLevel: number): number {
  if (enchantLevel <= 0) return 0;
  return enchantLevel * 80; // 4 seconds per level
}
