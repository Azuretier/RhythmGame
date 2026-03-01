import type { WarfrontTerritory } from '@/types/warfront';
import {
  WF_TERRITORY_GRID,
  WF_TERRITORY_MAX_HEALTH,
  WF_TERRITORY_MAX_FORTIFICATION,
  WF_CAPTURE_THRESHOLD,
  WF_CAPTURE_RATE,
} from '@/types/warfront';
import { EFFECT_VALUES } from './constants';

/** Create the initial 4x4 territory grid, all neutral */
export function createTerritories(): WarfrontTerritory[] {
  const territories: WarfrontTerritory[] = [];
  for (let z = 0; z < WF_TERRITORY_GRID; z++) {
    for (let x = 0; x < WF_TERRITORY_GRID; x++) {
      territories.push({
        id: z * WF_TERRITORY_GRID + x,
        gridX: x,
        gridZ: z,
        ownerId: null,
        health: 50,
        maxHealth: WF_TERRITORY_MAX_HEALTH,
        fortificationLevel: 0,
        captureProgress: {},
      });
    }
  }
  return territories;
}

/** Assign starting territories for teams mode (each team gets 4 corners/edges) */
export function assignTeamTerritories(
  territories: WarfrontTerritory[],
  teamIds: string[],
): void {
  if (teamIds.length !== 2) return;

  // Team alpha gets top-left quadrant, team bravo gets bottom-right
  for (const t of territories) {
    if (t.gridX < 2 && t.gridZ < 2) {
      t.ownerId = teamIds[0];
      t.health = WF_TERRITORY_MAX_HEALTH;
    } else if (t.gridX >= 2 && t.gridZ >= 2) {
      t.ownerId = teamIds[1];
      t.health = WF_TERRITORY_MAX_HEALTH;
    }
    // Middle territories stay neutral at 50 health
  }
}

/** Get territory ID from world coordinates (128x128 world, 32-block zones) */
export function getTerritoryIdFromPosition(x: number, z: number): number {
  const gridX = Math.min(WF_TERRITORY_GRID - 1, Math.max(0, Math.floor(x / 32)));
  const gridZ = Math.min(WF_TERRITORY_GRID - 1, Math.max(0, Math.floor(z / 32)));
  return gridZ * WF_TERRITORY_GRID + gridX;
}

/** Process one tick of capture progress for a soldier in a territory */
export function tickCapture(
  territory: WarfrontTerritory,
  teamId: string,
  soldierCount: number,
): boolean {
  // Can't capture own territory
  if (territory.ownerId === teamId) return false;

  // Fortification slows capture
  const slowFactor = 1 - (territory.fortificationLevel * EFFECT_VALUES.fortification_capture_slow);
  const progressPerTick = WF_CAPTURE_RATE * soldierCount * Math.max(0.1, slowFactor);

  if (!territory.captureProgress[teamId]) {
    territory.captureProgress[teamId] = 0;
  }
  territory.captureProgress[teamId] += progressPerTick;

  // Decay other teams' progress
  for (const otherTeam of Object.keys(territory.captureProgress)) {
    if (otherTeam !== teamId) {
      territory.captureProgress[otherTeam] = Math.max(0, territory.captureProgress[otherTeam] - 0.5);
    }
  }

  // Check if captured
  if (territory.captureProgress[teamId] >= WF_CAPTURE_THRESHOLD) {
    territory.ownerId = teamId;
    territory.health = WF_TERRITORY_MAX_HEALTH;
    territory.fortificationLevel = 0;
    territory.captureProgress = {};
    return true; // Captured!
  }

  return false;
}

/** Apply healing to a territory */
export function healTerritory(territory: WarfrontTerritory, amount: number): void {
  territory.health = Math.min(territory.maxHealth, territory.health + amount);
}

/** Apply damage to a territory */
export function damageTerritory(territory: WarfrontTerritory, amount: number): boolean {
  territory.health = Math.max(0, territory.health - amount);
  if (territory.health <= 0) {
    territory.ownerId = null;
    territory.fortificationLevel = 0;
    territory.captureProgress = {};
    return true; // Territory lost
  }
  return false;
}

/** Increase fortification level */
export function fortifyTerritory(territory: WarfrontTerritory): boolean {
  if (territory.fortificationLevel >= WF_TERRITORY_MAX_FORTIFICATION) return false;
  territory.fortificationLevel++;
  return true;
}

/** Count territories owned by each team */
export function countTerritories(territories: WarfrontTerritory[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of territories) {
    if (t.ownerId) {
      counts[t.ownerId] = (counts[t.ownerId] || 0) + 1;
    }
  }
  return counts;
}
