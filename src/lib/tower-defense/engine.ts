import type {
  GameState, GamePhase, Tower, Enemy, Projectile, Vec3,
  TowerType, EnemyType, StatusEffect, WaveGroup,
} from '@/types/tower-defense';
import {
  TOWER_DEFS, ENEMY_DEFS, INITIAL_GOLD, INITIAL_LIVES,
  WAVE_PREP_TIME, TOTAL_WAVES,
} from '@/types/tower-defense';
import { MAPS } from './maps';
import { WAVES } from './waves';

let nextId = 1;
function uid(): string {
  return `e${nextId++}`;
}

function dist2d(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function dist3d(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function createInitialState(mapIndex: number = 0): GameState {
  nextId = 1;
  const map = MAPS[mapIndex % MAPS.length];
  return {
    phase: 'build',
    gold: INITIAL_GOLD,
    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    score: 0,
    currentWave: 0,
    totalWaves: TOTAL_WAVES,
    towers: [],
    enemies: [],
    projectiles: [],
    map: JSON.parse(JSON.stringify(map)),
    selectedTowerType: null,
    selectedTowerId: null,
    selectedEnemyId: null,
    waveCountdown: WAVE_PREP_TIME,
    enemiesRemaining: 0,
    autoStart: false,
    gameSpeed: 1,
  };
}

export function canPlaceTower(state: GameState, x: number, z: number): boolean {
  const { map } = state;
  if (x < 0 || x >= map.width || z < 0 || z >= map.height) return false;
  const cell = map.grid[z]?.[x];
  if (!cell) return false;
  if (cell.terrain !== 'grass') return false;
  if (cell.towerId) return false;
  return true;
}

export function placeTower(state: GameState, type: TowerType, x: number, z: number): GameState {
  if (!canPlaceTower(state, x, z)) return state;
  const def = TOWER_DEFS[type];
  if (state.gold < def.cost) return state;

  const tower: Tower = {
    id: uid(),
    type,
    gridX: x,
    gridZ: z,
    level: 1,
    targetId: null,
    cooldown: 0,
    kills: 0,
    totalDamage: 0,
  };

  const newGrid = state.map.grid.map(row => row.map(c => ({ ...c })));
  newGrid[z][x] = { ...newGrid[z][x], towerId: tower.id };

  return {
    ...state,
    gold: state.gold - def.cost,
    towers: [...state.towers, tower],
    map: { ...state.map, grid: newGrid },
  };
}

export function sellTower(state: GameState, towerId: string): GameState {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return state;
  const def = TOWER_DEFS[tower.type];
  const totalInvested = def.cost + def.upgradeCosts.slice(0, tower.level - 1).reduce((a, b) => a + b, 0);
  const refund = Math.floor(totalInvested * 0.7);

  const newGrid = state.map.grid.map(row => row.map(c => ({ ...c })));
  newGrid[tower.gridZ][tower.gridX] = { ...newGrid[tower.gridZ][tower.gridX], towerId: null };

  return {
    ...state,
    gold: state.gold + refund,
    towers: state.towers.filter(t => t.id !== towerId),
    map: { ...state.map, grid: newGrid },
    selectedTowerId: state.selectedTowerId === towerId ? null : state.selectedTowerId,
  };
}

export function upgradeTower(state: GameState, towerId: string): GameState {
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

function getTowerRange(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.rangePerLevel[tower.level - 1] ?? def.range;
}

function getTowerDamage(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.damagePerLevel[tower.level - 1] ?? def.damage;
}

function getTowerFireRate(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.fireRate * (1 + (tower.level - 1) * 0.1);
}

function getTowerPos(tower: Tower): Vec3 {
  return { x: tower.gridX, y: 0.6, z: tower.gridZ };
}

function getEffectiveSpeed(enemy: Enemy): number {
  let speed = enemy.speed;
  for (const eff of enemy.effects) {
    if (eff.type === 'slow') speed *= (1 - eff.magnitude);
    if (eff.type === 'stun') speed = 0;
  }
  return Math.max(speed, 0);
}

function hasAmplify(enemy: Enemy): number {
  for (const eff of enemy.effects) {
    if (eff.type === 'amplify') return 1 + eff.magnitude;
  }
  return 1;
}

// === Spawning ===
interface SpawnTracker {
  groups: {
    group: WaveGroup;
    spawned: number;
    nextSpawn: number; // time until next spawn for this group
    startTimer: number;
    done: boolean;
  }[];
  allDone: boolean;
}

let spawnTracker: SpawnTracker | null = null;

export function startWave(state: GameState): GameState {
  if (state.phase !== 'build') return state;
  const waveIndex = state.currentWave;
  if (waveIndex >= WAVES.length) return state;

  const waveDef = WAVES[waveIndex];
  spawnTracker = {
    groups: waveDef.groups.map(g => ({
      group: g,
      spawned: 0,
      nextSpawn: 0,
      startTimer: g.startDelay,
      done: false,
    })),
    allDone: false,
  };

  const totalEnemies = waveDef.groups.reduce((sum, g) => sum + g.count, 0);

  return {
    ...state,
    phase: 'wave',
    currentWave: waveIndex + 1,
    waveCountdown: WAVE_PREP_TIME,
    enemiesRemaining: totalEnemies,
  };
}

function spawnEnemy(state: GameState, type: EnemyType, hpMult: number = 1, speedMult: number = 1): Enemy {
  const def = ENEMY_DEFS[type];
  const spawnPos = state.map.spawnPoints[0];
  return {
    id: uid(),
    type,
    hp: Math.round(def.hp * hpMult),
    maxHp: Math.round(def.hp * hpMult),
    speed: def.speed * speedMult,
    armor: def.armor,
    position: { ...spawnPos },
    waypointIndex: 0,
    progress: 0,
    effects: [],
    flying: def.flying,
    dead: false,
  };
}

// === Main update tick ===
export function updateGame(state: GameState, dt: number): GameState {
  if (state.phase === 'paused' || state.phase === 'menu' || state.phase === 'won' || state.phase === 'lost') {
    return state;
  }

  const effectiveDt = dt * state.gameSpeed;
  let s = { ...state };

  // Build phase: countdown
  if (s.phase === 'build') {
    if (s.autoStart) {
      s.waveCountdown -= effectiveDt;
      if (s.waveCountdown <= 0) {
        return startWave(s);
      }
    }
    return s;
  }

  // Wave phase
  s = tickSpawning(s, effectiveDt);
  s = tickEnemyMovement(s, effectiveDt);
  s = tickTowerTargeting(s);
  s = tickTowerFiring(s, effectiveDt);
  s = tickProjectiles(s, effectiveDt);
  s = tickStatusEffects(s, effectiveDt);
  s = tickHealerAbility(s, effectiveDt);
  s = cleanupDead(s);
  s = checkWaveComplete(s);

  return s;
}

function tickSpawning(state: GameState, dt: number): GameState {
  if (!spawnTracker || spawnTracker.allDone) return state;

  const newEnemies: Enemy[] = [];

  for (const gt of spawnTracker.groups) {
    if (gt.done) continue;

    if (gt.startTimer > 0) {
      gt.startTimer -= dt;
      continue;
    }

    gt.nextSpawn -= dt;
    while (gt.nextSpawn <= 0 && gt.spawned < gt.group.count) {
      const enemy = spawnEnemy(
        state,
        gt.group.enemyType,
        gt.group.hpMultiplier ?? 1,
        gt.group.speedMultiplier ?? 1,
      );
      newEnemies.push(enemy);
      gt.spawned++;
      gt.nextSpawn += gt.group.spawnDelay;
    }

    if (gt.spawned >= gt.group.count) {
      gt.done = true;
    }
  }

  spawnTracker.allDone = spawnTracker.groups.every(g => g.done);

  if (newEnemies.length > 0) {
    return { ...state, enemies: [...state.enemies, ...newEnemies] };
  }
  return state;
}

function tickEnemyMovement(state: GameState, dt: number): GameState {
  const { map } = state;
  let lives = state.lives;
  let score = state.score;

  const enemies = state.enemies.map(enemy => {
    if (enemy.dead) return enemy;
    const speed = getEffectiveSpeed(enemy);
    if (speed === 0) return enemy;

    const wp = map.waypoints;
    if (enemy.waypointIndex >= wp.length - 1) {
      // Enemy reached the base
      lives -= 1;
      return { ...enemy, dead: true };
    }

    const current = wp[enemy.waypointIndex];
    const next = wp[enemy.waypointIndex + 1];
    const segDist = dist2d(current, next);
    const moveAmount = (speed * dt) / Math.max(segDist, 0.01);

    let newProgress = enemy.progress + moveAmount;
    let newWaypointIndex = enemy.waypointIndex;

    while (newProgress >= 1 && newWaypointIndex < wp.length - 2) {
      newProgress -= 1;
      newWaypointIndex++;
    }

    if (newProgress >= 1 && newWaypointIndex >= wp.length - 2) {
      // Reached end
      lives -= 1;
      return { ...enemy, dead: true };
    }

    const fromWp = wp[newWaypointIndex];
    const toWp = wp[newWaypointIndex + 1];
    const pos = lerp3(fromWp, toWp, newProgress);
    if (enemy.flying) pos.y = 1.5;

    return {
      ...enemy,
      position: pos,
      waypointIndex: newWaypointIndex,
      progress: newProgress,
    };
  });

  return { ...state, enemies, lives, score };
}

function tickTowerTargeting(state: GameState): GameState {
  const towers = state.towers.map(tower => {
    const def = TOWER_DEFS[tower.type];
    const range = getTowerRange(tower);
    const towerPos = getTowerPos(tower);

    // Find closest enemy in range
    let bestTarget: string | null = null;
    let bestDist = Infinity;

    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      if (enemy.flying && tower.type === 'flame') continue; // Flame can't hit flying
      const d = dist2d(towerPos, enemy.position);
      if (d <= range && d < bestDist) {
        // Prioritize: boss > tank > others, then closest
        const priority = enemy.type === 'boss' ? 0 : enemy.type === 'tank' ? 1 : 2;
        const effectiveDist = d + priority * 0.1;
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

function tickTowerFiring(state: GameState, dt: number): GameState {
  const newProjectiles: Projectile[] = [];
  const towers = state.towers.map(tower => {
    const newTower = { ...tower, cooldown: Math.max(0, tower.cooldown - dt) };

    if (newTower.cooldown > 0 || !newTower.targetId) return newTower;

    const target = state.enemies.find(e => e.id === newTower.targetId && !e.dead);
    if (!target) return newTower;

    const def = TOWER_DEFS[tower.type];
    const range = getTowerRange(tower);
    const towerPos = getTowerPos(tower);

    if (dist2d(towerPos, target.position) > range) return newTower;

    const damage = getTowerDamage(tower);
    const fireRate = getTowerFireRate(tower);

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

    const projectile: Projectile = {
      id: uid(),
      towerId: tower.id,
      towerType: tower.type,
      targetId: target.id,
      position: { ...towerPos },
      damage,
      speed: def.projectileSpeed,
      aoe: tower.type === 'cannon' ? 1.5 : 0,
      effects: effects.length > 0 ? effects : undefined,
    };
    newProjectiles.push(projectile);

    return { ...newTower, cooldown: 1 / fireRate };
  });

  return {
    ...state,
    towers,
    projectiles: [...state.projectiles, ...newProjectiles],
  };
}

function tickProjectiles(state: GameState, dt: number): GameState {
  let enemies = [...state.enemies];
  let towers = [...state.towers];
  let gold = state.gold;
  let score = state.score;

  const projectiles = state.projectiles.map(proj => {
    const target = enemies.find(e => e.id === proj.targetId);
    if (!target || target.dead) return null; // remove

    const dir = {
      x: target.position.x - proj.position.x,
      y: target.position.y - proj.position.y,
      z: target.position.z - proj.position.z,
    };
    const d = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

    if (d < 0.3) {
      // Hit!
      const amplify = hasAmplify(target);
      const isSniper = proj.towerType === 'sniper';
      const armor = isSniper ? 0 : target.armor;
      const damage = Math.max(1, Math.round((proj.damage - armor) * amplify));

      if (proj.aoe > 0) {
        // AOE damage
        enemies = enemies.map(e => {
          if (e.dead) return e;
          const eDist = dist2d(e.position, target.position);
          if (eDist <= proj.aoe) {
            const aoeDmg = eDist < 0.5 ? damage : Math.round(damage * 0.6);
            const newHp = e.hp - aoeDmg;
            const tIdx = towers.findIndex(t => t.id === proj.towerId);
            if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], totalDamage: towers[tIdx].totalDamage + aoeDmg };
            if (newHp <= 0 && !e.dead) {
              const reward = ENEMY_DEFS[e.type].reward;
              gold += reward;
              score += reward * 2;
              if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], kills: towers[tIdx].kills + 1 };
              return { ...e, hp: 0, dead: true };
            }
            return { ...e, hp: newHp };
          }
          return e;
        });
      } else {
        // Single target
        enemies = enemies.map(e => {
          if (e.id !== target.id) return e;
          let newE = { ...e, hp: e.hp - damage };
          const tIdx = towers.findIndex(t => t.id === proj.towerId);
          if (tIdx >= 0) towers[tIdx] = { ...towers[tIdx], totalDamage: towers[tIdx].totalDamage + damage };

          // Apply effects
          if (proj.effects) {
            const newEffects = [...newE.effects];
            for (const eff of proj.effects) {
              const existing = newEffects.findIndex(e => e.type === eff.type);
              if (existing >= 0) {
                newEffects[existing] = { ...eff }; // refresh
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
      }

      // Lightning chain
      if (proj.towerType === 'lightning') {
        const chainCount = 2;
        let lastPos = target.position;
        const hit = new Set<string>([target.id]);
        for (let c = 0; c < chainCount; c++) {
          let closest: Enemy | null = null;
          let closestDist = 3; // chain range
          for (const e of enemies) {
            if (e.dead || hit.has(e.id)) continue;
            const cd = dist2d(lastPos, e.position);
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
          lastPos = closest.position;
        }
      }

      return null; // remove projectile
    }

    // Move projectile toward target
    const moveSpeed = proj.speed * dt;
    const ratio = Math.min(moveSpeed / d, 1);
    return {
      ...proj,
      position: {
        x: proj.position.x + dir.x * ratio,
        y: proj.position.y + dir.y * ratio,
        z: proj.position.z + dir.z * ratio,
      },
    };
  }).filter(Boolean) as Projectile[];

  return { ...state, enemies, towers, projectiles, gold, score };
}

function tickStatusEffects(state: GameState, dt: number): GameState {
  const enemies = state.enemies.map(enemy => {
    if (enemy.dead || enemy.effects.length === 0) return enemy;

    let hp = enemy.hp;
    const effects = enemy.effects
      .map(eff => {
        if (eff.type === 'burn') {
          hp -= eff.magnitude * dt;
        }
        if (eff.type === 'poison') {
          hp -= eff.magnitude * dt;
        }
        return { ...eff, remaining: eff.remaining - dt };
      })
      .filter(eff => eff.remaining > 0);

    if (hp <= 0) {
      return { ...enemy, hp: 0, dead: true, effects };
    }

    return { ...enemy, hp, effects };
  });

  // Recalculate gold/score for burn kills
  let gold = state.gold;
  let score = state.score;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const orig = state.enemies[i];
    if (e.dead && !orig.dead) {
      gold += ENEMY_DEFS[e.type].reward;
      score += ENEMY_DEFS[e.type].reward * 2;
    }
  }

  return { ...state, enemies, gold, score };
}

function tickHealerAbility(state: GameState, dt: number): GameState {
  const healers = state.enemies.filter(
    e => !e.dead && e.type === 'healer'
  );
  if (healers.length === 0) return state;

  const enemies = state.enemies.map(enemy => {
    if (enemy.dead || enemy.type === 'healer') return enemy;
    for (const healer of healers) {
      if (dist2d(healer.position, enemy.position) < 2) {
        const healAmount = enemy.maxHp * 0.02 * dt;
        return { ...enemy, hp: Math.min(enemy.maxHp, enemy.hp + healAmount) };
      }
    }
    return enemy;
  });

  return { ...state, enemies };
}

function cleanupDead(state: GameState): GameState {
  const enemies = state.enemies.filter(e => !e.dead);
  const projectiles = state.projectiles.filter(p => {
    const target = enemies.find(e => e.id === p.targetId);
    return !!target;
  });
  // Clear selected enemy if it died
  const selectedEnemyId = state.selectedEnemyId && enemies.some(e => e.id === state.selectedEnemyId)
    ? state.selectedEnemyId
    : null;
  return { ...state, enemies, projectiles, selectedEnemyId };
}

function checkWaveComplete(state: GameState): GameState {
  if (state.lives <= 0) {
    spawnTracker = null;
    return { ...state, phase: 'lost', lives: 0 };
  }

  const spawningDone = !spawnTracker || spawnTracker.allDone;
  const allDead = state.enemies.length === 0;

  if (spawningDone && allDead) {
    const waveDef = WAVES[state.currentWave - 1];
    const reward = waveDef?.reward ?? 0;

    if (state.currentWave >= TOTAL_WAVES) {
      spawnTracker = null;
      return {
        ...state,
        phase: 'won',
        gold: state.gold + reward,
        score: state.score + reward * 5,
      };
    }

    spawnTracker = null;
    return {
      ...state,
      phase: 'build',
      gold: state.gold + reward,
      score: state.score + reward * 5,
      waveCountdown: WAVE_PREP_TIME,
      enemiesRemaining: 0,
    };
  }

  return state;
}
