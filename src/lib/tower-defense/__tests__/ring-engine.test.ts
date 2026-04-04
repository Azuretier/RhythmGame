import { describe, expect, it } from 'vitest';
import type { GalaxyTDState, RingEnemy, RingProjectile } from '@/components/rhythmia/tetris/galaxy-types';
import { createInitialState, updateRingGame, applyTetrisAoE } from '../ring-engine';

function withWaveState(state: GalaxyTDState): GalaxyTDState {
    return {
        ...state,
        phase: 'wave',
        spawnTracker: { groups: [], allDone: true },
    };
}

function createEnemy(partial: Partial<RingEnemy> & Pick<RingEnemy, 'id' | 'type' | 'pathFraction' | 'hp' | 'maxHp' | 'speed' | 'armor' | 'flying'>): RingEnemy {
    return {
        effects: [],
        dead: false,
        ...partial,
    };
}

function createProjectile(partial: Partial<RingProjectile> & Pick<RingProjectile, 'id' | 'towerId' | 'towerType' | 'targetId' | 'pathFraction' | 'damage' | 'speed'>): RingProjectile {
    return {
        ...partial,
    };
}

describe('ring-engine shield aura', () => {
    it('reduces projectile damage for nearby allies', () => {
        const base = withWaveState(createInitialState());
        const target = createEnemy({
            id: 'grunt-1',
            type: 'grunt',
            pathFraction: 0.1,
            hp: 100,
            maxHp: 100,
            speed: 0,
            armor: 0,
            flying: false,
        });
        const shielder = createEnemy({
            id: 'shield-1',
            type: 'shield',
            pathFraction: 0.11,
            hp: 250,
            maxHp: 250,
            speed: 0,
            armor: 8,
            flying: false,
        });
        const projectile = createProjectile({
            id: 'proj-1',
            towerId: 'tower-1',
            towerType: 'archer',
            targetId: target.id,
            pathFraction: target.pathFraction,
            damage: 20,
            speed: 0,
        });

        const next = updateRingGame({
            ...base,
            enemies: [target, shielder],
            projectiles: [projectile],
        }, 0.016);

        expect(next.enemies.find(enemy => enemy.id === target.id)?.hp).toBe(83);
    });

    it('reduces line-clear aoe damage for nearby allies', () => {
        const base = createInitialState();
        const target = createEnemy({
            id: 'grunt-1',
            type: 'grunt',
            pathFraction: 0.1,
            hp: 100,
            maxHp: 100,
            speed: 0,
            armor: 0,
            flying: false,
        });
        const shielder = createEnemy({
            id: 'shield-1',
            type: 'shield',
            pathFraction: 0.11,
            hp: 250,
            maxHp: 250,
            speed: 0,
            armor: 8,
            flying: false,
        });

        const next = applyTetrisAoE({
            ...base,
            enemies: [target, shielder],
        }, 20);

        expect(next.enemies.find(enemy => enemy.id === target.id)?.hp).toBe(83);
    });
});
