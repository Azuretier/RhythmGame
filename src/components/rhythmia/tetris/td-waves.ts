/**
 * TD Wave Engine: generates progressive wave configurations for the Rhythmia TD phase.
 * Pure logic module — no React hooks or side effects.
 */
import type { TDEnemyType } from './types';
import { TD_ENEMY_DEFS, TD_BOSS_INTERVAL } from './constants';

export interface TDWaveConfig {
    beats: number;
    enemiesPerBeat: number;
    pool: TDEnemyType[];
    hpMult: number;
    isBoss: boolean;
}

// Enemy pool unlocks by stage tier
const STANDARD_TYPES: TDEnemyType[] = ['zombie', 'skeleton', 'pig', 'chicken'];
const FAST_TYPES: TDEnemyType[] = ['spider', 'bee', 'rabbit'];
const TANK_TYPES: TDEnemyType[] = ['creeper', 'cow', 'magma_cube'];
const SUPPORT_TYPES: TDEnemyType[] = ['cat', 'wolf'];
const ELITE_TYPES: TDEnemyType[] = ['enderman', 'slime'];
const BOSS_TYPE: TDEnemyType = 'horse';

function getPool(stageNumber: number): TDEnemyType[] {
    const pool = [...STANDARD_TYPES];
    if (stageNumber >= 3) pool.push(...FAST_TYPES);
    if (stageNumber >= 5) pool.push(...TANK_TYPES);
    if (stageNumber >= 7) pool.push(...SUPPORT_TYPES);
    if (stageNumber >= 9) pool.push(...ELITE_TYPES);
    return pool;
}

/**
 * Pick a random enemy type from the pool using weighted random selection.
 */
export function pickEnemyType(pool: TDEnemyType[], _stageNumber: number): TDEnemyType {
    const weights = pool.map(t => TD_ENEMY_DEFS[t].spawnWeight);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight <= 0) return pool[0];

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

/**
 * Generate a wave configuration for the given stage number.
 * - Beats scale from 12 to 16 over stages
 * - Enemies per beat scale from 1 to 3
 * - HP multiplier grows +15% per stage
 * - Boss wave every TD_BOSS_INTERVAL stages
 */
export function generateWave(stageNumber: number): TDWaveConfig {
    const isBoss = stageNumber % TD_BOSS_INTERVAL === 0;

    // Beats: 12 base, +1 every 3 stages, capped at 16
    const beats = Math.min(16, 12 + Math.floor((stageNumber - 1) / 3));

    // Enemies per beat: 1 base, +1 every 4 stages, capped at 3
    const enemiesPerBeat = Math.min(3, 1 + Math.floor((stageNumber - 1) / 4));

    // HP multiplier: +15% per stage (compound)
    const hpMult = Math.pow(1.15, stageNumber - 1);

    const pool = getPool(stageNumber);

    return { beats, enemiesPerBeat, pool, hpMult, isBoss };
}
