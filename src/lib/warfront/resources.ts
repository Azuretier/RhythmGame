import type { ResourcePool } from '@/types/warfront';
import { WF_INITIAL_RESOURCES } from '@/types/warfront';
import { COMMANDER_COSTS } from './constants';

/** Create a fresh resource pool */
export function createResourcePool(): ResourcePool {
  return { ...WF_INITIAL_RESOURCES };
}

/** Add resources to a pool */
export function addResources(pool: ResourcePool, additions: Partial<ResourcePool>): void {
  if (additions.iron) pool.iron += additions.iron;
  if (additions.diamond) pool.diamond += additions.diamond;
  if (additions.wood) pool.wood += additions.wood;
  if (additions.stone) pool.stone += additions.stone;
  if (additions.energy) pool.energy += additions.energy;
}

/** Check if a pool has enough resources for a cost */
export function canAfford(pool: ResourcePool, cost: Partial<ResourcePool>): boolean {
  if (cost.iron && pool.iron < cost.iron) return false;
  if (cost.diamond && pool.diamond < cost.diamond) return false;
  if (cost.wood && pool.wood < cost.wood) return false;
  if (cost.stone && pool.stone < cost.stone) return false;
  if (cost.energy && pool.energy < cost.energy) return false;
  return true;
}

/** Spend resources from a pool (returns false if insufficient) */
export function spendResources(pool: ResourcePool, cost: Partial<ResourcePool>): boolean {
  if (!canAfford(pool, cost)) return false;
  if (cost.iron) pool.iron -= cost.iron;
  if (cost.diamond) pool.diamond -= cost.diamond;
  if (cost.wood) pool.wood -= cost.wood;
  if (cost.stone) pool.stone -= cost.stone;
  if (cost.energy) pool.energy -= cost.energy;
  return true;
}

/** Get the cost for a commander ability */
export function getAbilityCost(abilityId: string): Partial<ResourcePool> | null {
  const costs = COMMANDER_COSTS as Record<string, Partial<ResourcePool>>;
  return costs[abilityId] ?? null;
}

/** Resource values by block type (used when engineer mines) */
export function getResourceForBlock(blockType: number): Partial<ResourcePool> | null {
  // Block types from the minecraft-world texture system
  // These map to the Block enum values
  switch (blockType) {
    case 5: return { wood: 4 };      // LOG
    case 8: return { iron: 2 };      // IRON_ORE
    case 10: return { diamond: 1 };  // DIAMOND_ORE
    case 3: return { stone: 2 };     // STONE
    case 12: return { stone: 1 };    // COBBLESTONE
    default: return null;
  }
}
