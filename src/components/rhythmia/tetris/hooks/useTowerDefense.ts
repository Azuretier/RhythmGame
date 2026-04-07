/**
 * Tower Defense sub-hook: enemy spawning, movement, bullet physics, and wave management.
 * Extracted from useGameState to reduce file size.
 */
import { useState, useRef, useCallback, useEffect, type MutableRefObject } from 'react';
import type { Enemy, Bullet, GamePhase, TDEnemyType, TerrainPhase, ActiveEffects, TDStatusEffect, Piece } from '../types';
import {
    MAX_HEALTH,
    BULLET_SPEED, BULLET_GRAVITY, BULLET_KILL_RADIUS, BULLET_DAMAGE, BULLET_GROUND_Y,
    GRID_TILE_SIZE, GRID_HALF, GRID_SPAWN_RING, GRID_TOWER_RADIUS,
    TD_ENEMY_DEFS,
    TD_SLOW_MAGNITUDE, TD_BURN_DAMAGE, TD_BURN_DURATION, TD_STUN_DURATION,
    TD_HEAL_AURA_RANGE, TD_HEAL_AURA_HP, TD_SHIELD_AURA_RANGE, TD_SHIELD_AURA_ARMOR,
    TD_STEALTH_BEATS, TD_SPLIT_HP_FACTOR,
} from '../constants';
import { generateWave, pickEnemyType, type TDWaveConfig } from '../td-waves';
import { applyGarbageRise } from '../utils/boardUtils';

let nextEnemyId = 0;
let nextBulletId = 0;

/** Create a default enemy with all sophistication fields zeroed */
function createEnemy(
    id: number,
    gx: number, gz: number,
    enemyType: TDEnemyType,
    hp: number, maxHp: number,
    speed: number, armor: number, garbageRows: number,
    abilities: string[], isBoss: boolean,
): Enemy {
    return {
        id,
        x: gx * GRID_TILE_SIZE, y: 0.5, z: gz * GRID_TILE_SIZE,
        gridX: gx, gridZ: gz,
        speed, health: hp, maxHealth: maxHp, alive: true,
        spawnTime: Date.now(),
        enemyType,
        armor,
        garbageRows,
        abilities: abilities as Enemy['abilities'],
        statusEffects: [],
        stealthBeatsLeft: abilities.includes('stealth') ? TD_STEALTH_BEATS : 0,
        isBoss,
    };
}

export interface UseTowerDefenseDeps {
    /** Refs from core game state */
    gameOverRef: MutableRefObject<boolean>;
    gamePhaseRef: MutableRefObject<GamePhase>;
    stageNumberRef: MutableRefObject<number>;
    boardRef: MutableRefObject<(string | null)[][]>;
    currentPieceRef: MutableRefObject<Piece | null>;
    /** State setters from core */
    setBoard: React.Dispatch<React.SetStateAction<(string | null)[][]>>;
    setCurrentPiece: React.Dispatch<React.SetStateAction<Piece | null>>;
    setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
    setTerrainPhase: React.Dispatch<React.SetStateAction<TerrainPhase>>;
    setTdBeatsRemaining: React.Dispatch<React.SetStateAction<number>>;
    /** Ref setters for in-sync updates */
    terrainPhaseRef: MutableRefObject<TerrainPhase>;
    tdBeatsRemainingRef: MutableRefObject<number>;
    towerHealthRef: MutableRefObject<number>;
    /** Card system refs */
    activeEffectsRef: MutableRefObject<ActiveEffects>;
    /** Card system callbacks */
    enterCardSelect: () => void;
    enterTreasureBox: () => void;
    shouldSpawnTreasureBox: (stage: number) => boolean;
}

export function useTowerDefense(deps: UseTowerDefenseDeps) {
    const {
        gameOverRef, gamePhaseRef, stageNumberRef, boardRef, currentPieceRef,
        setBoard, setCurrentPiece, setGamePhase, setTerrainPhase, setTdBeatsRemaining,
        terrainPhaseRef, tdBeatsRemainingRef, towerHealthRef,
        activeEffectsRef,
        enterCardSelect, enterTreasureBox, shouldSpawnTreasureBox,
    } = deps;

    // ===== Tower Defense State =====
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [towerHealth, setTowerHealth] = useState(MAX_HEALTH);
    const enemiesRef = useRef<Enemy[]>(enemies);
    const bulletsRef = useRef<Bullet[]>(bullets);

    // Wave config ref (set on checkpoint entry)
    const waveConfigRef = useRef<TDWaveConfig | null>(null);

    // Keep refs in sync
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
    useEffect(() => { towerHealthRef.current = towerHealth; }, [towerHealth, towerHealthRef]);

    // Collect grid cells occupied by alive enemies
    const getOccupiedCells = useCallback((): Set<string> => {
        const set = new Set<string>();
        for (const e of enemiesRef.current) {
            if (e.alive) set.add(`${e.gridX},${e.gridZ}`);
        }
        return set;
    }, []);

    // Spawn enemies on the grid perimeter using wave config
    const spawnEnemies = useCallback((count: number) => {
        const occupied = getOccupiedCells();
        const newEnemies: Enemy[] = [];
        const waveConfig = waveConfigRef.current;
        const effects = activeEffectsRef.current;

        for (let i = 0; i < count; i++) {
            const candidates: { gx: number; gz: number }[] = [];
            for (let gx = -GRID_HALF; gx <= GRID_HALF; gx++) {
                for (let gz = -GRID_HALF; gz <= GRID_HALF; gz++) {
                    if (Math.abs(gx) + Math.abs(gz) === GRID_SPAWN_RING) {
                        const key = `${gx},${gz}`;
                        if (!occupied.has(key)) {
                            candidates.push({ gx, gz });
                        }
                    }
                }
            }

            if (candidates.length === 0) break;

            const cell = candidates[Math.floor(Math.random() * candidates.length)];
            occupied.add(`${cell.gx},${cell.gz}`);

            // Pick enemy type from wave pool or fallback
            const pool = waveConfig?.pool ?? ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'] as TDEnemyType[];
            const stageNum = stageNumberRef.current;
            const enemyType = pickEnemyType(pool, stageNum);
            const def = TD_ENEMY_DEFS[enemyType];

            // Apply wave HP multiplier and enemy HP reduction from cards
            const hpMult = waveConfig?.hpMult ?? 1;
            const hpReduction = 1 - effects.tdEnemyHpReduction;
            const finalHp = Math.max(1, Math.round(def.hp * hpMult * hpReduction));

            newEnemies.push(createEnemy(
                nextEnemyId++,
                cell.gx, cell.gz,
                enemyType,
                finalHp, finalHp,
                def.speed, def.armor, def.garbageRows,
                [...def.abilities],
                false,
            ));
        }
        setEnemies(prev => [...prev, ...newEnemies]);
    }, [getOccupiedCells, activeEffectsRef, stageNumberRef]);

    // Spawn a boss enemy (horse) at a random perimeter cell
    const spawnBoss = useCallback(() => {
        const occupied = getOccupiedCells();
        const candidates: { gx: number; gz: number }[] = [];
        for (let gx = -GRID_HALF; gx <= GRID_HALF; gx++) {
            for (let gz = -GRID_HALF; gz <= GRID_HALF; gz++) {
                if (Math.abs(gx) + Math.abs(gz) === GRID_SPAWN_RING && !occupied.has(`${gx},${gz}`)) {
                    candidates.push({ gx, gz });
                }
            }
        }
        if (candidates.length === 0) return;
        const cell = candidates[Math.floor(Math.random() * candidates.length)];

        const def = TD_ENEMY_DEFS.horse;
        const waveConfig = waveConfigRef.current;
        const hpMult = waveConfig?.hpMult ?? 1;
        const hpReduction = 1 - activeEffectsRef.current.tdEnemyHpReduction;
        const finalHp = Math.max(1, Math.round(def.hp * hpMult * hpReduction));

        const boss = createEnemy(
            nextEnemyId++,
            cell.gx, cell.gz,
            'horse', finalHp, finalHp,
            def.speed, def.armor, def.garbageRows,
            [...def.abilities], true,
        );
        setEnemies(prev => [...prev, boss]);
        enemiesRef.current = [...enemiesRef.current, boss];
    }, [getOccupiedCells, activeEffectsRef]);

    // Compute shield aura bonus for an enemy from nearby wolf allies
    const getShieldAuraBonus = useCallback((enemy: Enemy): number => {
        let bonus = 0;
        for (const ally of enemiesRef.current) {
            if (!ally.alive || ally.id === enemy.id) continue;
            if (!ally.abilities.includes('shield_aura')) continue;
            const dist = Math.abs(ally.gridX - enemy.gridX) + Math.abs(ally.gridZ - enemy.gridZ);
            if (dist <= TD_SHIELD_AURA_RANGE) {
                bonus = TD_SHIELD_AURA_ARMOR; // doesn't stack from multiple wolves
                break;
            }
        }
        return bonus;
    }, []);

    // Move enemies 1 tile toward tower, process status effects, apply auras
    const updateEnemies = useCallback((): { reached: number; garbageTotal: number } => {
        const current = enemiesRef.current;
        let reached = 0;
        let garbageTotal = 0;
        const updated: Enemy[] = [];

        // Process status effects and auras first
        for (const e of current) {
            if (!e.alive) continue;

            // Tick status effects
            const newEffects: TDStatusEffect[] = [];
            for (const eff of e.statusEffects) {
                if (eff.type === 'burn') {
                    e.health -= TD_BURN_DAMAGE;
                    if (e.health <= 0) {
                        e.alive = false;
                    }
                }
                const remaining = eff.remaining - 1;
                if (remaining > 0) {
                    newEffects.push({ ...eff, remaining });
                }
            }
            e.statusEffects = newEffects;

            // Decrement stealth timer
            if (e.stealthBeatsLeft > 0) {
                e.stealthBeatsLeft--;
            }

            // Heal aura: heal nearby allies
            if (e.alive && e.abilities.includes('heal_aura')) {
                for (const ally of current) {
                    if (!ally.alive || ally.id === e.id) continue;
                    const dist = Math.abs(ally.gridX - e.gridX) + Math.abs(ally.gridZ - e.gridZ);
                    if (dist <= TD_HEAL_AURA_RANGE && ally.health < ally.maxHealth) {
                        ally.health = Math.min(ally.maxHealth, ally.health + TD_HEAL_AURA_HP);
                    }
                }
            }
        }

        // Sort by manhattan distance for movement priority
        const sorted = current
            .filter(e => e.alive)
            .sort((a, b) => (Math.abs(a.gridX) + Math.abs(a.gridZ)) - (Math.abs(b.gridX) + Math.abs(b.gridZ)));

        const claimed = new Set<string>();
        const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const e of sorted) {
            const manhattan = Math.abs(e.gridX) + Math.abs(e.gridZ);

            if (manhattan <= GRID_TOWER_RADIUS) {
                reached++;
                garbageTotal += e.garbageRows;
                continue;
            }

            // Stunned enemies skip movement
            const isStunned = e.statusEffects.some(eff => eff.type === 'stun');
            if (isStunned) {
                claimed.add(`${e.gridX},${e.gridZ}`);
                updated.push({ ...e });
                continue;
            }

            // Determine movement steps (fast enemies move 2 tiles)
            const isSlowed = e.statusEffects.some(eff => eff.type === 'slow');
            const moveSteps = isSlowed ? 1 : e.speed;

            let curGx = e.gridX;
            let curGz = e.gridZ;

            for (let step = 0; step < moveSteps; step++) {
                const curManhattan = Math.abs(curGx) + Math.abs(curGz);
                if (curManhattan <= GRID_TOWER_RADIUS) break;

                let bestDist = curManhattan;
                let bestGx = curGx;
                let bestGz = curGz;

                const shuffled = [...dirs].sort(() => Math.random() - 0.5);
                for (const [dx, dz] of shuffled) {
                    const nx = curGx + dx;
                    const nz = curGz + dz;
                    const nd = Math.abs(nx) + Math.abs(nz);
                    if (nd >= curManhattan) continue;
                    const key = `${nx},${nz}`;
                    if (claimed.has(key)) continue;
                    if (nd < bestDist) {
                        bestDist = nd;
                        bestGx = nx;
                        bestGz = nz;
                    }
                }
                curGx = bestGx;
                curGz = bestGz;
            }

            claimed.add(`${curGx},${curGz}`);

            // Check if this movement brought enemy to tower
            if (Math.abs(curGx) + Math.abs(curGz) <= GRID_TOWER_RADIUS) {
                reached++;
                garbageTotal += e.garbageRows;
                continue;
            }

            updated.push({
                ...e,
                gridX: curGx,
                gridZ: curGz,
                x: curGx * GRID_TILE_SIZE,
                z: curGz * GRID_TILE_SIZE,
            });
        }

        setEnemies(updated);
        enemiesRef.current = updated;
        return { reached, garbageTotal };
    }, []);

    // Kill closest enemies
    const killEnemies = useCallback((count: number) => {
        setEnemies(prev => {
            const alive = prev.filter(e => e.alive);
            alive.sort((a, b) => {
                const distA = Math.abs(a.gridX) + Math.abs(a.gridZ);
                const distB = Math.abs(b.gridX) + Math.abs(b.gridZ);
                return distA - distB;
            });

            const toKill = Math.min(count, alive.length);
            const survivors = alive.slice(toKill);
            return survivors;
        });
    }, []);

    // Roll a status effect for a bullet based on active effects
    const rollStatusEffect = useCallback((): TDStatusEffect | null => {
        const effects = activeEffectsRef.current;
        // Try each chance (slow > burn > stun priority)
        if (effects.towerSlowChance > 0 && Math.random() < effects.towerSlowChance) {
            return { type: 'slow', remaining: 2, magnitude: TD_SLOW_MAGNITUDE };
        }
        if (effects.towerBurnChance > 0 && Math.random() < effects.towerBurnChance) {
            return { type: 'burn', remaining: TD_BURN_DURATION, magnitude: TD_BURN_DAMAGE };
        }
        if (effects.towerStunChance > 0 && Math.random() < effects.towerStunChance) {
            return { type: 'stun', remaining: TD_STUN_DURATION, magnitude: 0 };
        }
        return null;
    }, [activeEffectsRef]);

    // Fire a bullet from tower at the closest non-stealth enemy
    const fireBullet = useCallback((): boolean => {
        const effects = activeEffectsRef.current;
        // Skip stealth enemies from targeting
        const targetable = enemiesRef.current.filter(e => e.alive && e.stealthBeatsLeft <= 0);
        if (targetable.length === 0) return false;

        let closest = targetable[0];
        let closestDist = Math.abs(closest.gridX) + Math.abs(closest.gridZ);
        for (let i = 1; i < targetable.length; i++) {
            const d = Math.abs(targetable[i].gridX) + Math.abs(targetable[i].gridZ);
            if (d < closestDist) {
                closest = targetable[i];
                closestDist = d;
            }
        }

        const startY = 11;
        const targetY = 1.5;
        const dx = closest.gridX * GRID_TILE_SIZE;
        const dz = closest.gridZ * GRID_TILE_SIZE;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        const T = Math.max(0.3, horizontalDist / BULLET_SPEED);
        const vx = dx / T;
        const vz = dz / T;
        const vy = (targetY - startY + 0.5 * BULLET_GRAVITY * T * T) / T;

        const bullet: Bullet = {
            id: nextBulletId++,
            x: 0, y: startY, z: 0,
            vx, vy, vz,
            targetEnemyId: closest.id,
            alive: true,
            damage: BULLET_DAMAGE + effects.towerDamageBonus,
            aoeRadius: effects.towerAoeRadius,
            statusOnHit: rollStatusEffect(),
            pierce: effects.towerPierce,
            hitEnemyIds: [],
        };
        setBullets(prev => [...prev, bullet]);

        return true;
    }, [activeEffectsRef, rollStatusEffect]);

    // Apply damage to an enemy, considering armor and shield aura
    const applyDamage = useCallback((enemy: Enemy, rawDamage: number, statusOnHit: TDStatusEffect | null): boolean => {
        const shieldBonus = getShieldAuraBonus(enemy);
        const effectiveDamage = Math.max(1, rawDamage - enemy.armor - shieldBonus);
        enemy.health -= effectiveDamage;

        // Apply status effect
        if (statusOnHit && !enemy.statusEffects.some(e => e.type === statusOnHit.type)) {
            enemy.statusEffects.push({ ...statusOnHit });
        }

        if (enemy.health <= 0) {
            enemy.alive = false;
            return true; // killed
        }
        return false;
    }, [getShieldAuraBonus]);

    // Apply AoE splash damage to enemies near an impact point
    const applyAoeSplash = useCallback((
        impactX: number, impactZ: number,
        aoeRadius: number, damage: number,
        statusOnHit: TDStatusEffect | null,
        excludeIds: Set<number>,
    ): { kills: number; pendingSpawns: Enemy[] } => {
        let kills = 0;
        const pendingSpawns: Enemy[] = [];

        for (const e of enemiesRef.current) {
            if (!e.alive || excludeIds.has(e.id)) continue;
            const dist = Math.abs(e.gridX * GRID_TILE_SIZE - impactX) + Math.abs(e.gridZ * GRID_TILE_SIZE - impactZ);
            if (dist <= aoeRadius * GRID_TILE_SIZE) {
                const killed = applyDamage(e, damage, statusOnHit);
                excludeIds.add(e.id);
                if (killed) {
                    kills++;
                    // Handle split on kill
                    if (e.abilities.includes('split')) {
                        const spawns = createSplitChildren(e);
                        pendingSpawns.push(...spawns);
                    }
                }
            }
        }
        return { kills, pendingSpawns };
    }, [applyDamage]);

    // Create split children from a slime enemy
    const createSplitChildren = useCallback((parent: Enemy): Enemy[] => {
        const childHp = Math.max(1, Math.floor(parent.maxHealth * TD_SPLIT_HP_FACTOR));
        const offsets: [number, number][] = [[1, 0], [-1, 0]];
        const children: Enemy[] = [];
        for (const [dx, dz] of offsets) {
            const gx = parent.gridX + dx;
            const gz = parent.gridZ + dz;
            if (Math.abs(gx) > GRID_HALF || Math.abs(gz) > GRID_HALF) continue;
            children.push(createEnemy(
                nextEnemyId++,
                gx, gz,
                'slime', childHp, childHp,
                1, 0, 1,
                [], false,
            ));
        }
        return children;
    }, []);

    // Move bullets with gravity and check collision with enemies
    const lastBulletUpdateRef = useRef(Date.now());
    const updateBullets = useCallback((): number => {
        const currentBullets = bulletsRef.current;
        if (currentBullets.length === 0) {
            lastBulletUpdateRef.current = Date.now();
            return 0;
        }

        const now = Date.now();
        const dt = Math.min((now - lastBulletUpdateRef.current) / 1000, 0.5);
        lastBulletUpdateRef.current = now;

        const updatedBullets: Bullet[] = [];
        const damagedEnemyIds: Set<number> = new Set();
        let totalKills = 0;
        const pendingSpawns: Enemy[] = [];

        const handleHit = (b: Bullet, enemy: Enemy): boolean => {
            damagedEnemyIds.add(enemy.id);
            b.hitEnemyIds.push(enemy.id);
            const killed = applyDamage(enemy, b.damage, b.statusOnHit);
            if (killed) {
                totalKills++;
                // Handle split on kill
                if (enemy.abilities.includes('split')) {
                    pendingSpawns.push(...createSplitChildren(enemy));
                }
            }

            // AoE splash
            if (b.aoeRadius > 0) {
                const splash = applyAoeSplash(
                    enemy.x, enemy.z,
                    b.aoeRadius, b.damage, b.statusOnHit,
                    damagedEnemyIds,
                );
                totalKills += splash.kills;
                pendingSpawns.push(...splash.pendingSpawns);
            }

            // Pierce: bullet continues if pierces remain
            if (b.pierce > 0) {
                b.pierce--;
                return false; // bullet stays alive
            }
            return true; // bullet consumed
        };

        for (const b of currentBullets) {
            if (!b.alive) continue;

            const newVy = b.vy - BULLET_GRAVITY * dt;
            const newX = b.x + b.vx * dt;
            const newY = b.y + b.vy * dt - 0.5 * BULLET_GRAVITY * dt * dt;
            const newZ = b.z + b.vz * dt;

            // Ground impact
            if (newY <= BULLET_GROUND_Y) {
                const targetEnemy = enemiesRef.current.find(
                    e => e.id === b.targetEnemyId && e.alive && !b.hitEnemyIds.includes(e.id)
                );
                if (targetEnemy && !damagedEnemyIds.has(targetEnemy.id)) {
                    handleHit(b, targetEnemy);
                } else if (b.aoeRadius > 0) {
                    // AoE splash at ground impact even without direct hit
                    const splash = applyAoeSplash(newX, newZ, b.aoeRadius, b.damage, b.statusOnHit, damagedEnemyIds);
                    totalKills += splash.kills;
                    pendingSpawns.push(...splash.pendingSpawns);
                }
                continue;
            }

            // Check collision with target enemy
            let bulletConsumed = false;
            const targetEnemy = enemiesRef.current.find(
                e => e.id === b.targetEnemyId && e.alive && !b.hitEnemyIds.includes(e.id)
            );
            if (targetEnemy) {
                const targetDist = Math.sqrt(
                    (targetEnemy.x - newX) ** 2 + (targetEnemy.y - newY) ** 2 + (targetEnemy.z - newZ) ** 2
                );
                if (targetDist < BULLET_KILL_RADIUS) {
                    bulletConsumed = handleHit(b, targetEnemy);
                    if (bulletConsumed) continue;
                }
            }

            // If target dead/missing, check any nearby enemy
            if (!targetEnemy && !bulletConsumed) {
                const alive = enemiesRef.current.filter(
                    e => e.alive && !damagedEnemyIds.has(e.id) && !b.hitEnemyIds.includes(e.id)
                );
                let hitEnemy: Enemy | null = null;
                let bestDist = Infinity;
                for (const e of alive) {
                    const ed = Math.sqrt(
                        (e.x - newX) ** 2 + (e.y - newY) ** 2 + (e.z - newZ) ** 2
                    );
                    if (ed < bestDist) {
                        bestDist = ed;
                        hitEnemy = e;
                    }
                }
                if (hitEnemy && bestDist < BULLET_KILL_RADIUS) {
                    bulletConsumed = handleHit(b, hitEnemy);
                    if (bulletConsumed) continue;
                }
            }

            updatedBullets.push({
                ...b,
                x: newX,
                y: newY,
                z: newZ,
                vy: newVy,
            });
        }

        setBullets(updatedBullets);
        bulletsRef.current = updatedBullets;

        // Add split children
        if (pendingSpawns.length > 0) {
            const allEnemies = [...enemiesRef.current, ...pendingSpawns];
            const aliveEnemies = allEnemies.filter(e => e.alive);
            setEnemies(aliveEnemies);
            enemiesRef.current = aliveEnemies;
        } else {
            const deadEnemies = enemiesRef.current.filter(e => !e.alive);
            if (deadEnemies.length > 0) {
                const newEnemies = enemiesRef.current.filter(e => e.alive);
                setEnemies(newEnemies);
                enemiesRef.current = newEnemies;
            }
        }

        return totalKills;
    }, [applyDamage, applyAoeSplash, createSplitChildren]);

    // Add garbage rows to the bottom of the board
    const addGarbageRows = useCallback((count: number) => {
        const { newBoard, adjustedPiece } = applyGarbageRise(boardRef.current, currentPieceRef.current, count);
        boardRef.current = newBoard;
        currentPieceRef.current = adjustedPiece;
        setBoard(newBoard);
        setCurrentPiece(adjustedPiece);
    }, [boardRef, currentPieceRef, setBoard, setCurrentPiece]);

    // Spawn an enemy at a specific grid cell (for corruption spawning)
    const spawnEnemyAtCell = useCallback((gx: number, gz: number) => {
        const occupied = getOccupiedCells();
        const key = `${gx},${gz}`;
        if (occupied.has(key)) return;

        const pool = waveConfigRef.current?.pool ?? ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'] as TDEnemyType[];
        const enemyType = pickEnemyType(pool, stageNumberRef.current);
        const def = TD_ENEMY_DEFS[enemyType];
        const hpMult = waveConfigRef.current?.hpMult ?? 1;
        const hpReduction = 1 - activeEffectsRef.current.tdEnemyHpReduction;
        const finalHp = Math.max(1, Math.round(def.hp * hpMult * hpReduction));

        const enemy = createEnemy(
            nextEnemyId++,
            gx, gz,
            enemyType,
            finalHp, finalHp,
            def.speed, def.armor, def.garbageRows,
            [...def.abilities], false,
        );
        setEnemies(prev => [...prev, enemy]);
        enemiesRef.current = [...enemiesRef.current, enemy];
    }, [getOccupiedCells, activeEffectsRef, stageNumberRef]);

    // Enter checkpoint: transition from dig phase to TD phase
    const enterCheckpoint = useCallback(() => {
        if (gamePhaseRef.current !== 'PLAYING') return;

        // Generate wave config for this stage
        const waveConfig = generateWave(stageNumberRef.current);
        waveConfigRef.current = waveConfig;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        setTimeout(() => {
            if (gameOverRef.current) return;

            setGamePhase('CHECKPOINT');
            gamePhaseRef.current = 'CHECKPOINT';

            setTerrainPhase('td');
            terrainPhaseRef.current = 'td';

            setEnemies([]);
            enemiesRef.current = [];
            setBullets([]);
            bulletsRef.current = [];
            setTowerHealth(MAX_HEALTH);
            towerHealthRef.current = MAX_HEALTH;
            setTdBeatsRemaining(waveConfig.beats);
            tdBeatsRemainingRef.current = waveConfig.beats;

            // Spawn boss if boss wave (at start of wave)
            if (waveConfig.isBoss) {
                setTimeout(() => {
                    if (gameOverRef.current) return;
                    spawnBoss();
                }, 200);
            }

            setTimeout(() => {
                if (gameOverRef.current) return;

                setGamePhase('PLAYING');
                gamePhaseRef.current = 'PLAYING';
            }, 1500);
        }, 1200);
    }, [gamePhaseRef, gameOverRef, setGamePhase, setTerrainPhase, terrainPhaseRef, setTdBeatsRemaining, tdBeatsRemainingRef, towerHealthRef, stageNumberRef, spawnBoss]);

    // Complete TD wave: transition back to dig phase
    const completeWave = useCallback(() => {
        if (gamePhaseRef.current !== 'PLAYING') return;

        setGamePhase('COLLAPSE');
        gamePhaseRef.current = 'COLLAPSE';

        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];

        setTimeout(() => {
            if (gameOverRef.current) return;

            if (shouldSpawnTreasureBox(stageNumberRef.current)) {
                enterTreasureBox();
            } else {
                enterCardSelect();
            }
        }, 1200);
    }, [gamePhaseRef, gameOverRef, setGamePhase, stageNumberRef, enterCardSelect, shouldSpawnTreasureBox, enterTreasureBox]);

    // Reset TD state for new game
    const resetTowerDefense = useCallback(() => {
        setEnemies([]);
        enemiesRef.current = [];
        setBullets([]);
        bulletsRef.current = [];
        setTowerHealth(MAX_HEALTH);
        towerHealthRef.current = MAX_HEALTH;
        waveConfigRef.current = null;
        nextEnemyId = 0;
        nextBulletId = 0;
    }, [towerHealthRef]);

    return {
        // State
        enemies,
        bullets,
        towerHealth,
        enemiesRef,
        bulletsRef,
        // Wave config
        waveConfigRef,
        // Actions
        spawnEnemies,
        updateEnemies,
        killEnemies,
        fireBullet,
        updateBullets,
        addGarbageRows,
        spawnEnemyAtCell,
        enterCheckpoint,
        completeWave,
        resetTowerDefense,
        // Setters
        setEnemies,
        setTowerHealth,
    };
}
