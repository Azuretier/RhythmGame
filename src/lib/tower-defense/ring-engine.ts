// ===== Ring-Adapted TD Engine =====
// Maps standalone TD mechanics (7 tower types, 8 enemy types, status effects,
// 30 waves) onto the Galaxy ring coordinate system around the Tetris board.

import type { TowerType, EnemyType, StatusEffect, SpawnTracker } from '@/types/tower-defense';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';
import { WAVES } from './waves';
import type {
    GalaxyRingSide, RingTower, RingEnemy, RingProjectile,
    TowerSlot, GalaxyGate, GalaxyTDState,
} from '@/components/rhythmia/tetris/galaxy-types';
import {
    GALAXY_SIDE_BOUNDARIES,
    GALAXY_TOWERS_PER_SIDE_TB,
    GALAXY_TOWERS_PER_SIDE_LR,
    GALAXY_INITIAL_GOLD,
    GALAXY_INITIAL_LIVES,
    GALAXY_RING_TOTAL_WAVES,
    GALAXY_SPEED_DIVISOR,
    GALAXY_RANGE_DIVISOR,
    GALAXY_SELL_REFUND_RATE,
    GALAXY_GATE_HP,
    GALAXY_RING_DEPTH,
    GALAXY_TOP_WIDTH,
} from '@/components/rhythmia/tetris/galaxy-constants';

let nextId = 1;
function uid(): string {
    return `r${nextId++}`;
}

// ===== Ring distance (wrapping) =====
export function ringDistance(a: number, b: number): number {
    const raw = Math.abs(a - b);
    return Math.min(raw, 1 - raw);
}

// ===== Slot path-fraction computation =====
function computeSlotPathFraction(side: GalaxyRingSide, index: number): number {
    const bounds = GALAXY_SIDE_BOUNDARIES[side];
    const count = (side === 'top' || side === 'bottom')
        ? GALAXY_TOWERS_PER_SIDE_TB
        : GALAXY_TOWERS_PER_SIDE_LR;
    const sideLength = bounds.end - bounds.start;
    const padding = (side === 'top' || side === 'bottom')
        ? sideLength * (GALAXY_RING_DEPTH / GALAXY_TOP_WIDTH)
        : 0;
    const usableLength = sideLength - 2 * padding;
    return bounds.start + padding + (index + 0.5) * (usableLength / count);
}

// ===== Create tower slots =====
function createTowerSlots(): TowerSlot[] {
    const slots: TowerSlot[] = [];
    const sides: { side: GalaxyRingSide; count: number }[] = [
        { side: 'top', count: GALAXY_TOWERS_PER_SIDE_TB },
        { side: 'bottom', count: GALAXY_TOWERS_PER_SIDE_TB },
        { side: 'left', count: GALAXY_TOWERS_PER_SIDE_LR },
        { side: 'right', count: GALAXY_TOWERS_PER_SIDE_LR },
    ];
    for (const { side, count } of sides) {
        for (let i = 0; i < count; i++) {
            slots.push({
                side,
                index: i,
                pathFraction: computeSlotPathFraction(side, i),
                occupied: false,
                towerId: null,
            });
        }
    }
    return slots;
}

// ===== Create initial gates =====
function createInitialGates(): GalaxyGate[] {
    return (['top', 'right', 'bottom', 'left'] as GalaxyRingSide[]).map(side => ({
        side,
        health: GALAXY_GATE_HP,
        maxHealth: GALAXY_GATE_HP,
    }));
}

// ===== Create initial state =====
export function createInitialState(): GalaxyTDState {
    nextId = 1;
    return {
        phase: 'build',
        gold: GALAXY_INITIAL_GOLD,
        lives: GALAXY_INITIAL_LIVES,
        score: 0,
        currentWave: 0,
        totalWaves: GALAXY_RING_TOTAL_WAVES,
        towers: [],
        enemies: [],
        projectiles: [],
        gates: createInitialGates(),
        towerSlots: createTowerSlots(),
        selectedTowerType: null,
        selectedTowerId: null,
        spawnTracker: null,
    };
}

// ===== Tower stat helpers =====
function getTowerRange(tower: RingTower): number {
    const def = TOWER_DEFS[tower.type];
    const gridRange = def.rangePerLevel[tower.level - 1] ?? def.range;
    return gridRange / GALAXY_RANGE_DIVISOR;
}

function getTowerDamage(tower: RingTower): number {
    const def = TOWER_DEFS[tower.type];
    return def.damagePerLevel[tower.level - 1] ?? def.damage;
}

function getTowerFireRate(tower: RingTower): number {
    const def = TOWER_DEFS[tower.type];
    return def.fireRate * (1 + (tower.level - 1) * 0.1);
}

// ===== Enemy speed helpers =====
function getBaseRingSpeed(enemySpeed: number): number {
    return enemySpeed / GALAXY_SPEED_DIVISOR;
}

function getEffectiveSpeed(enemy: RingEnemy): number {
    let speed = enemy.speed;
    for (const eff of enemy.effects) {
        if (eff.type === 'slow') speed *= (1 - eff.magnitude);
        if (eff.type === 'stun') speed = 0;
    }
    return Math.max(speed, 0);
}

function hasAmplify(enemy: RingEnemy): number {
    for (const eff of enemy.effects) {
        if (eff.type === 'amplify') return 1 + eff.magnitude;
    }
    return 1;
}

// ===== Place tower =====
export function placeTower(state: GalaxyTDState, type: TowerType, slotIndex: number): GalaxyTDState {
    const slot = state.towerSlots[slotIndex];
    if (!slot || slot.occupied) return state;

    const def = TOWER_DEFS[type];
    if (state.gold < def.cost) return state;

    const tower: RingTower = {
        id: uid(),
        type,
        side: slot.side,
        slotIndex,
        pathFraction: slot.pathFraction,
        level: 1,
        cooldown: 0,
        kills: 0,
        totalDamage: 0,
        targetId: null,
    };

    const newSlots = state.towerSlots.map((s, i) =>
        i === slotIndex ? { ...s, occupied: true, towerId: tower.id } : s
    );

    return {
        ...state,
        gold: state.gold - def.cost,
        towers: [...state.towers, tower],
        towerSlots: newSlots,
        selectedTowerId: tower.id,
    };
}

// ===== Sell tower =====
export function sellTower(state: GalaxyTDState, towerId: string): GalaxyTDState {
    const tower = state.towers.find(t => t.id === towerId);
    if (!tower) return state;

    const def = TOWER_DEFS[tower.type];
    const totalInvested = def.cost + def.upgradeCosts.slice(0, tower.level - 1).reduce((a, b) => a + b, 0);
    const refund = Math.floor(totalInvested * GALAXY_SELL_REFUND_RATE);

    const newSlots = state.towerSlots.map(s =>
        s.towerId === towerId ? { ...s, occupied: false, towerId: null } : s
    );

    return {
        ...state,
        gold: state.gold + refund,
        towers: state.towers.filter(t => t.id !== towerId),
        towerSlots: newSlots,
        selectedTowerId: state.selectedTowerId === towerId ? null : state.selectedTowerId,
    };
}

// ===== Upgrade tower =====
export function upgradeTower(state: GalaxyTDState, towerId: string): GalaxyTDState {
    const tower = state.towers.find(t => t.id === towerId);
    if (!tower) return state;

    const def = TOWER_DEFS[tower.type];
    if (tower.level >= def.maxLevel) return state;

    const cost = def.upgradeCosts[tower.level - 1];
    if (state.gold < cost) return state;

    return {
        ...state,
        gold: state.gold - cost,
        towers: state.towers.map(t =>
            t.id === towerId ? { ...t, level: t.level + 1 } : t
        ),
    };
}

// ===== Start wave =====
export function startWave(state: GalaxyTDState): GalaxyTDState {
    if (state.phase !== 'build') return state;
    const waveIndex = state.currentWave;
    if (waveIndex >= WAVES.length || waveIndex >= state.totalWaves) return state;

    const waveDef = WAVES[waveIndex];
    const tracker: SpawnTracker = {
        groups: waveDef.groups.map(g => ({
            group: g,
            spawned: 0,
            nextSpawn: 0,
            startTimer: g.startDelay,
            done: false,
        })),
        allDone: false,
    };

    return {
        ...state,
        phase: 'wave',
        currentWave: waveIndex + 1,
        spawnTracker: tracker,
    };
}

// ===== Spawn enemy =====
function spawnEnemy(type: EnemyType, hpMult: number = 1, speedMult: number = 1): RingEnemy {
    const def = ENEMY_DEFS[type];
    return {
        id: uid(),
        type,
        pathFraction: Math.random() * 0.01, // slight offset
        hp: Math.round(def.hp * hpMult),
        maxHp: Math.round(def.hp * hpMult),
        speed: getBaseRingSpeed(def.speed * speedMult),
        armor: def.armor,
        effects: [],
        flying: def.flying,
        dead: false,
    };
}

// ===== Main update tick =====
export function updateRingGame(state: GalaxyTDState, dt: number): GalaxyTDState {
    if (state.phase !== 'wave' && state.phase !== 'build') return state;
    if (state.phase === 'build') return state;

    let s = { ...state };
    s = tickSpawning(s, dt);
    s = tickEnemyMovement(s, dt);
    s = tickTowerTargeting(s);
    s = tickAuraDamage(s, dt);
    s = tickTowerFiring(s, dt);
    s = tickProjectiles(s, dt);
    s = tickStatusEffects(s, dt);
    s = tickHealerAbility(s, dt);
    s = cleanupDead(s);
    s = checkWaveComplete(s);
    return s;
}

// ===== Spawning =====
function tickSpawning(state: GalaxyTDState, dt: number): GalaxyTDState {
    const tracker = state.spawnTracker;
    if (!tracker || tracker.allDone) return state;

    const newEnemies: RingEnemy[] = [];

    for (const gt of tracker.groups) {
        if (gt.done) continue;
        if (gt.startTimer > 0) {
            gt.startTimer -= dt;
            continue;
        }
        gt.nextSpawn -= dt;
        while (gt.nextSpawn <= 0 && gt.spawned < gt.group.count) {
            newEnemies.push(spawnEnemy(
                gt.group.enemyType,
                gt.group.hpMultiplier ?? 1,
                gt.group.speedMultiplier ?? 1,
            ));
            gt.spawned++;
            gt.nextSpawn += gt.group.spawnDelay;
        }
        if (gt.spawned >= gt.group.count) gt.done = true;
    }

    tracker.allDone = tracker.groups.every(g => g.done);

    if (newEnemies.length > 0) {
        return { ...state, enemies: [...state.enemies, ...newEnemies] };
    }
    return state;
}

// ===== Enemy movement =====
function tickEnemyMovement(state: GalaxyTDState, dt: number): GalaxyTDState {
    let lives = state.lives;

    const enemies = state.enemies.map(enemy => {
        if (enemy.dead) return enemy;
        const speed = getEffectiveSpeed(enemy);
        if (speed === 0) return enemy;

        const newPos = enemy.pathFraction + speed * dt;
        if (newPos >= 1.0) {
            lives -= 1;
            return { ...enemy, pathFraction: 1.0, dead: true };
        }
        return { ...enemy, pathFraction: newPos };
    });

    return { ...state, enemies, lives };
}

// ===== Tower targeting =====
function tickTowerTargeting(state: GalaxyTDState): GalaxyTDState {
    const towers = state.towers.map(tower => {
        const range = getTowerRange(tower);
        let bestTarget: string | null = null;
        let bestDist = Infinity;

        for (const enemy of state.enemies) {
            if (enemy.dead) continue;
            if (enemy.flying && tower.type === 'flame') continue;
            const d = ringDistance(tower.pathFraction, enemy.pathFraction);
            if (d <= range) {
                const priority = enemy.type === 'boss' ? 0 : enemy.type === 'tank' ? 1 : 2;
                const effectiveDist = d + priority * 0.001;
                if (effectiveDist < bestDist) {
                    bestDist = effectiveDist;
                    bestTarget = enemy.id;
                }
            }
        }

        return { ...tower, targetId: bestTarget };
    });

    return { ...state, towers };
}

// ===== Aura damage (Cannon/Magma tower) =====
function tickAuraDamage(state: GalaxyTDState, dt: number): GalaxyTDState {
    const auraTowers = state.towers.filter(t => t.type === 'cannon');
    if (auraTowers.length === 0) return state;

    let enemies = [...state.enemies];
    const towers = [...state.towers];
    let gold = state.gold;
    let score = state.score;

    for (const tower of auraTowers) {
        const range = getTowerRange(tower);
        const dps = getTowerDamage(tower);
        const dmgThisTick = dps * dt;

        enemies = enemies.map(e => {
            if (e.dead) return e;
            const d = ringDistance(tower.pathFraction, e.pathFraction);
            if (d > range) return e;

            const amplify = hasAmplify(e);
            const damage = Math.max(0.5, (dmgThisTick - e.armor * dt) * amplify);

            const tIdx = towers.findIndex(t => t.id === tower.id);
            if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], totalDamage: towers[tIdx].totalDamage + damage };

            const newHp = e.hp - damage;
            if (newHp <= 0 && !e.dead) {
                const reward = ENEMY_DEFS[e.type].reward;
                gold += reward;
                score += reward * 2;
                if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], kills: towers[tIdx].kills + 1 };
                return { ...e, hp: 0, dead: true };
            }
            return { ...e, hp: newHp };
        });
    }

    return { ...state, enemies, towers, gold, score };
}

// ===== Tower firing =====
function tickTowerFiring(state: GalaxyTDState, dt: number): GalaxyTDState {
    const newProjectiles: RingProjectile[] = [];
    const towers = state.towers.map(tower => {
        const newTower = { ...tower, cooldown: Math.max(0, tower.cooldown - dt) };
        if (newTower.cooldown > 0 || !newTower.targetId) return newTower;

        // Cannon (magma) deals aura damage, no projectiles
        if (tower.type === 'cannon') return newTower;

        const target = state.enemies.find(e => e.id === newTower.targetId && !e.dead);
        if (!target) return newTower;

        const range = getTowerRange(tower);
        if (ringDistance(tower.pathFraction, target.pathFraction) > range) return newTower;

        const damage = getTowerDamage(tower);
        const fireRate = getTowerFireRate(tower);
        const def = TOWER_DEFS[tower.type];

        const effects: StatusEffect[] = [];
        if (tower.type === 'frost') {
            effects.push({ type: 'slow', duration: 2, remaining: 2, magnitude: 0.4 });
        }
        if (tower.type === 'flame') {
            effects.push({ type: 'burn', duration: 3, remaining: 3, magnitude: 5 });
        }
        if (tower.type === 'arcane') {
            effects.push({ type: 'amplify', duration: 4, remaining: 4, magnitude: 0.25 });
        }

        newProjectiles.push({
            id: uid(),
            towerId: tower.id,
            towerType: tower.type,
            targetId: target.id,
            pathFraction: tower.pathFraction,
            damage,
            speed: def.projectileSpeed / GALAXY_SPEED_DIVISOR,
            effects: effects.length > 0 ? effects : undefined,
        });

        return { ...newTower, cooldown: 1 / fireRate };
    });

    return {
        ...state,
        towers,
        projectiles: [...state.projectiles, ...newProjectiles],
    };
}

// ===== Projectile movement and impact =====
function tickProjectiles(state: GalaxyTDState, dt: number): GalaxyTDState {
    let enemies = [...state.enemies];
    const towers = [...state.towers];
    let gold = state.gold;
    let score = state.score;

    const projectiles = state.projectiles.map(proj => {
        const target = enemies.find(e => e.id === proj.targetId);
        if (!target || target.dead) return null;

        const dist = ringDistance(proj.pathFraction, target.pathFraction);

        if (dist < 0.005) {
            // Hit!
            const amplify = hasAmplify(target);
            const isSniper = proj.towerType === 'sniper';
            const armor = isSniper ? 0 : target.armor;
            const damage = Math.max(1, Math.round((proj.damage - armor) * amplify));

            enemies = enemies.map(e => {
                if (e.id !== target.id) return e;
                let newE = { ...e, hp: e.hp - damage };
                const tIdx = towers.findIndex(t => t.id === proj.towerId);
                if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], totalDamage: towers[tIdx].totalDamage + damage };

                // Apply effects
                if (proj.effects) {
                    const newEffects = [...newE.effects];
                    for (const eff of proj.effects) {
                        const existing = newEffects.findIndex(x => x.type === eff.type);
                        if (existing >= 0) {
                            newEffects[existing] = { ...eff };
                        } else {
                            newEffects.push({ ...eff });
                        }
                    }
                    newE = { ...newE, effects: newEffects };
                }

                if (newE.hp <= 0) {
                    const reward = ENEMY_DEFS[e.type].reward;
                    gold += reward;
                    score += reward * 2;
                    if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], kills: towers[tIdx].kills + 1 };
                    return { ...newE, hp: 0, dead: true };
                }
                return newE;
            });

            // Lightning chain
            if (proj.towerType === 'lightning') {
                const chainCount = 2;
                let lastPos = target.pathFraction;
                const hit = new Set<string>([target.id]);
                for (let c = 0; c < chainCount; c++) {
                    let closest: RingEnemy | null = null;
                    let closestDist = 3 / GALAXY_RANGE_DIVISOR; // chain range
                    for (const e of enemies) {
                        if (e.dead || hit.has(e.id)) continue;
                        const cd = ringDistance(lastPos, e.pathFraction);
                        if (cd < closestDist) {
                            closestDist = cd;
                            closest = e;
                        }
                    }
                    if (!closest) break;
                    hit.add(closest.id);
                    const chainDmg = Math.round(damage * 0.6);
                    enemies = enemies.map(e => {
                        if (e.id !== closest!.id) return e;
                        const newHp = e.hp - chainDmg;
                        if (newHp <= 0) {
                            gold += ENEMY_DEFS[e.type].reward;
                            score += ENEMY_DEFS[e.type].reward * 2;
                            return { ...e, hp: 0, dead: true };
                        }
                        return { ...e, hp: newHp };
                    });
                    lastPos = closest.pathFraction;
                }
            }

            return null; // remove projectile
        }

        // Move projectile toward target
        const moveAmount = proj.speed * dt;
        // Determine direction (shortest path on ring)
        let diff = target.pathFraction - proj.pathFraction;
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;
        const sign = diff >= 0 ? 1 : -1;
        let newPos = proj.pathFraction + sign * Math.min(moveAmount, Math.abs(diff));
        // Wrap around
        newPos = ((newPos % 1) + 1) % 1;
        return { ...proj, pathFraction: newPos };
    }).filter(Boolean) as RingProjectile[];

    return { ...state, enemies, towers, projectiles, gold, score };
}

// ===== Status effects =====
function tickStatusEffects(state: GalaxyTDState, dt: number): GalaxyTDState {
    let gold = state.gold;
    let score = state.score;

    const enemies = state.enemies.map((enemy) => {
        if (enemy.dead || enemy.effects.length === 0) return enemy;

        let hp = enemy.hp;
        const effects = enemy.effects
            .map(eff => {
                if (eff.type === 'burn') hp -= eff.magnitude * dt;
                if (eff.type === 'poison') hp -= eff.magnitude * dt;
                return { ...eff, remaining: eff.remaining - dt };
            })
            .filter(eff => eff.remaining > 0);

        if (hp <= 0) {
            gold += ENEMY_DEFS[enemy.type].reward;
            score += ENEMY_DEFS[enemy.type].reward * 2;
            return { ...enemy, hp: 0, dead: true, effects };
        }

        return { ...enemy, hp, effects };
    });

    return { ...state, enemies, gold, score };
}

// ===== Healer ability =====
function tickHealerAbility(state: GalaxyTDState, dt: number): GalaxyTDState {
    const healers = state.enemies.filter(e => !e.dead && e.type === 'healer');
    if (healers.length === 0) return state;

    const healRange = 2 / GALAXY_RANGE_DIVISOR;
    const enemies = state.enemies.map(enemy => {
        if (enemy.dead || enemy.type === 'healer') return enemy;
        for (const healer of healers) {
            if (ringDistance(healer.pathFraction, enemy.pathFraction) < healRange) {
                const healAmount = enemy.maxHp * 0.02 * dt;
                return { ...enemy, hp: Math.min(enemy.maxHp, enemy.hp + healAmount) };
            }
        }
        return enemy;
    });

    return { ...state, enemies };
}

// ===== Cleanup dead =====
function cleanupDead(state: GalaxyTDState): GalaxyTDState {
    const enemies = state.enemies.filter(e => !e.dead);
    const projectiles = state.projectiles.filter(p =>
        enemies.some(e => e.id === p.targetId)
    );
    const selectedTowerId = state.selectedTowerId && state.towers.some(t => t.id === state.selectedTowerId)
        ? state.selectedTowerId
        : null;
    return { ...state, enemies, projectiles, selectedTowerId };
}

// ===== Check wave complete =====
function checkWaveComplete(state: GalaxyTDState): GalaxyTDState {
    if (state.lives <= 0) {
        return { ...state, phase: 'lost', lives: 0, spawnTracker: null };
    }

    const spawningDone = !state.spawnTracker || state.spawnTracker.allDone;
    const allDead = state.enemies.length === 0;

    if (spawningDone && allDead) {
        const waveDef = WAVES[state.currentWave - 1];
        const reward = waveDef?.reward ?? 0;

        if (state.currentWave >= state.totalWaves) {
            return {
                ...state,
                phase: 'won',
                gold: state.gold + reward,
                score: state.score + reward * 5,
                spawnTracker: null,
            };
        }

        return {
            ...state,
            phase: 'build',
            gold: state.gold + reward,
            score: state.score + reward * 5,
            spawnTracker: null,
        };
    }

    return state;
}

// ===== AOE damage from Tetris line clear =====
export function applyTetrisAoE(state: GalaxyTDState, damage: number): GalaxyTDState {
    let gold = state.gold;
    let score = state.score;
    const enemies = state.enemies.map(e => {
        if (e.dead) return e;
        const newHp = e.hp - damage;
        if (newHp <= 0) {
            gold += ENEMY_DEFS[e.type].reward;
            score += ENEMY_DEFS[e.type].reward * 2;
            return { ...e, hp: 0, dead: true };
        }
        return { ...e, hp: newHp };
    }).filter(e => !e.dead);
    return { ...state, enemies, gold, score };
}
