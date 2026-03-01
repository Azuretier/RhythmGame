import type {
  CrossModeEffect,
  CrossModeEffectType,
  ActiveEffect,
  WarfrontRole,
} from '@/types/warfront';
import { EFFECT_DURATIONS } from './constants';

let effectIdCounter = 0;

/** Create a new cross-mode effect */
export function createEffect(
  sourcePlayerId: string,
  sourceRole: WarfrontRole,
  effectType: CrossModeEffectType,
  targetScope: CrossModeEffect['targetScope'],
  value: number,
  options?: {
    targetTeamId?: string;
    targetTerritoryId?: number;
  },
): CrossModeEffect {
  const durationMs = EFFECT_DURATIONS[effectType] ?? 0;
  return {
    id: `eff_${++effectIdCounter}_${Date.now().toString(36)}`,
    sourcePlayerId,
    sourceRole,
    effectType,
    targetScope,
    value,
    durationMs,
    timestamp: Date.now(),
    targetTeamId: options?.targetTeamId,
    targetTerritoryId: options?.targetTerritoryId,
  };
}

/** Convert a CrossModeEffect to an ActiveEffect on a player */
export function effectToActive(effect: CrossModeEffect): ActiveEffect | null {
  if (effect.durationMs <= 0) return null; // Instant effects don't create active effects
  return {
    effectId: effect.id,
    effectType: effect.effectType,
    value: effect.value,
    expiresAt: Date.now() + effect.durationMs,
    sourcePlayerId: effect.sourcePlayerId,
  };
}

/** Clean expired effects from a list, return removed effect IDs */
export function cleanExpiredEffects(effects: ActiveEffect[]): string[] {
  const now = Date.now();
  const expired: string[] = [];
  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].expiresAt <= now) {
      expired.push(effects[i].effectId);
      effects.splice(i, 1);
    }
  }
  return expired;
}

/** Check if a player has a specific active effect */
export function hasActiveEffect(effects: ActiveEffect[], effectType: CrossModeEffectType): boolean {
  const now = Date.now();
  return effects.some(e => e.effectType === effectType && e.expiresAt > now);
}

/** Get the total value of a specific active effect (stacks) */
export function getEffectValue(effects: ActiveEffect[], effectType: CrossModeEffectType): number {
  const now = Date.now();
  let total = 0;
  for (const e of effects) {
    if (e.effectType === effectType && e.expiresAt > now) {
      total += e.value;
    }
  }
  return total;
}
