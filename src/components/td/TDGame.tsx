'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TD_GRID_ROWS, TD_GRID_COLS, TD_CELL_PX,
  TD_TOWERS, TD_ENEMIES, TD_WAVES,
  TDLayoutCell, TDCell, TDTower, TDEnemy, TDBullet,
  TDGarbageProjectile, TDLineClearAura, TDGameState, TDPhase,
  formatHP,
  GOAL_DAMAGE_HP_PERCENTAGE, GOAL_DAMAGE_BASE,
  GARBAGE_ARC_MIN, GARBAGE_ARC_VARIANCE,
  MIN_GARBAGE_LINES, MAX_GARBAGE_LINES,
  FREEZE_DURATION_MS,
  AURA_DAMAGE_MULTIPLIER,
  LINE_CLEAR_AURA_BASE_DAMAGE,
} from '@/types/tower-defense';
import styles from './TowerDefense.module.css';

// ── Path helper ──────────────────────────────────────────────────

const DEFAULT_PATH: { x: number; y: number }[] = [
  { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 },
  { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
  { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 },
  { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 8, y: 8 },
  { x: 8, y: 7 }, { x: 8, y: 6 }, { x: 8, y: 5 }, { x: 8, y: 4 },
  { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 },
  { x: 11, y: 5 }, { x: 11, y: 6 }, { x: 11, y: 7 }, { x: 11, y: 8 },
  { x: 11, y: 9 }, { x: 11, y: 10 }, { x: 11, y: 11 }, { x: 11, y: 12 },
  { x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }, { x: 7, y: 12 },
  { x: 7, y: 13 }, { x: 7, y: 14 }, { x: 7, y: 15 },
  { x: 8, y: 15 }, { x: 9, y: 15 }, { x: 10, y: 15 }, { x: 11, y: 15 },
  { x: 12, y: 15 }, { x: 13, y: 15 },
];

// ── Build initial game state from saved layout ───────────────────

function buildGameState(layout: TDLayoutCell[][]): TDGameState {
  const grid: TDCell[][] = layout.map(row =>
    row.map(cell => {
      if (cell === 'empty') return { type: 'empty' };
      if (cell === 'path')  return { type: 'path' };
      if (cell === 'spawn') return { type: 'spawn' };
      if (cell === 'goal')  return { type: 'goal' };
      // Tower cell
      return { type: 'tower', towerId: undefined, towerType: cell };
    })
  );

  const towers: TDTower[] = [];
  let towerId = 0;

  // Place main tower at goal
  const goalTower: TDTower = {
    id: 'main',
    type: 'main_tower',
    gridX: 13, gridY: 15,
    hp: TD_TOWERS.main_tower.hp, maxHp: TD_TOWERS.main_tower.hp,
    damage: TD_TOWERS.main_tower.damage, range: TD_TOWERS.main_tower.range,
    attackSpeed: TD_TOWERS.main_tower.attackSpeed,
    lastShotAt: 0, auraBoost: 1, frozen: false,
  };
  towers.push(goalTower);

  // Build player-placed towers from layout
  for (let r = 0; r < TD_GRID_ROWS; r++) {
    for (let c = 0; c < TD_GRID_COLS; c++) {
      const cell = layout[r][c];
      if (cell === 'empty' || cell === 'path' || cell === 'spawn' || cell === 'goal') continue;
      const def = TD_TOWERS[cell];
      const id = `t${++towerId}`;
      towers.push({
        id,
        type: cell,
        gridX: c, gridY: r,
        hp: def.hp, maxHp: def.hp,
        damage: def.damage, range: def.range,
        attackSpeed: def.attackSpeed,
        lastShotAt: 0, auraBoost: 1, frozen: false,
      });
      grid[r][c].towerId = id;
    }
  }

  // Apply aura boosts
  for (const tower of towers) {
    if (tower.type !== 'aura') continue;
    for (const other of towers) {
      if (other.id === tower.id) continue;
      const dx = Math.abs(other.gridX - tower.gridX);
      const dy = Math.abs(other.gridY - tower.gridY);
      if (dx <= TD_TOWERS.aura.range && dy <= TD_TOWERS.aura.range) {
        other.auraBoost = Math.min(other.auraBoost * 1.5, 3);
        other.damage = Math.round(other.damage * 1.25);
      }
    }
  }

  return {
    phase: 'interlude',
    grid,
    towers,
    enemies: [],
    bullets: [],
    garbageProjectiles: [],
    lineClearAuras: [],
    path: DEFAULT_PATH,
    gold: 150,
    wave: 0,
    mainTowerHp: TD_TOWERS.main_tower.hp,
    mainTowerMaxHp: TD_TOWERS.main_tower.hp,
    totalEnemiesKilled: 0,
  };
}

// ── Lerp helper ──────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

// ── Distance helper ──────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ── Main game component ──────────────────────────────────────────

interface TDGameProps {
  layout: TDLayoutCell[][];
  onExit: () => void;
  locale: string;
  /** Called when the player clears Tetris lines — triggers the aura burst */
  externalLineClear?: number; // increases by cleared-line count each time
}

export default function TDGame({ layout, onExit, locale, externalLineClear = 0 }: TDGameProps) {
  const isEn = locale === 'en';
  const stateRef = useRef<TDGameState>(buildGameState(layout));
  const [, forceRender] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<{ waveIdx: number; enemyIdx: number; nextSpawnAt: number; spawnQueue: { type: string; hpMul: number }[]; waveCleared: boolean }>({
    waveIdx: 0, enemyIdx: 0, nextSpawnAt: 0, spawnQueue: [], waveCleared: false,
  });
  const lineClearRef = useRef(externalLineClear);

  // ── Tick loop ────────────────────────────────────────────────

  const tick = useCallback(() => {
    const gs = stateRef.current;
    const now = Date.now();

    if (gs.phase === 'game_over' || gs.phase === 'victory') return;

    // ── Start new wave (interlude → wave) ────────────────────
    if (gs.phase === 'interlude') {
      const waveIdx = spawnRef.current.waveIdx;
      if (waveIdx >= TD_WAVES.length) {
        gs.phase = 'victory';
        forceRender(n => n + 1);
        return;
      }
      const waveDef = TD_WAVES[waveIdx];
      if (now >= spawnRef.current.nextSpawnAt) {
        gs.phase = 'wave';
        gs.wave = waveDef.waveNumber;
        // Build spawn queue
        const queue: { type: string; hpMul: number }[] = [];
        for (const e of waveDef.enemies) {
          for (let i = 0; i < e.count; i++) {
            queue.push({ type: e.type, hpMul: e.hpMultiplier });
          }
        }
        // Shuffle queue slightly
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        spawnRef.current.spawnQueue = queue;
        spawnRef.current.enemyIdx = 0;
        spawnRef.current.nextSpawnAt = now + 500;
        spawnRef.current.waveCleared = false;
      }
      forceRender(n => n + 1);
      return;
    }

    if (gs.phase !== 'wave') return;

    // ── Spawn enemies ────────────────────────────────────────
    const spawn = spawnRef.current;
    const waveDef = TD_WAVES[spawn.waveIdx];
    if (spawn.enemyIdx < spawn.spawnQueue.length && now >= spawn.nextSpawnAt) {
      const { type, hpMul } = spawn.spawnQueue[spawn.enemyIdx];
      const def = TD_ENEMIES[type as keyof typeof TD_ENEMIES];
      const id = `e${now}_${spawn.enemyIdx}`;
      gs.enemies.push({
        id, type: def.type,
        hp: Math.round(def.baseHp * hpMul),
        maxHp: Math.round(def.baseHp * hpMul),
        pathProgress: 0,
        x: DEFAULT_PATH[0].x, y: DEFAULT_PATH[0].y,
        frozen: false, frozenUntil: 0, lastGarbageAt: 0,
      });
      spawn.enemyIdx++;
      // Vary interval between enemies for same type batches
      const baseInterval = waveDef.enemies.find(e => e.type === type)?.spawnInterval ?? 1000;
      spawn.nextSpawnAt = now + baseInterval * (0.8 + Math.random() * 0.4);
    }

    const DT = 0.05; // 50ms tick → 20 ticks/s

    // ── Move enemies ─────────────────────────────────────────
    const arrivedEnemyIds = new Set<string>();
    for (const enemy of gs.enemies) {
      if (enemy.frozen && now < enemy.frozenUntil) continue;
      if (enemy.frozen) enemy.frozen = false;

      const def = TD_ENEMIES[enemy.type];
      const speed = def.speed;
      const pathLen = DEFAULT_PATH.length - 1;
      enemy.pathProgress = Math.min(1, enemy.pathProgress + (speed * DT) / pathLen);

      // Interpolate position
      const rawIdx = enemy.pathProgress * pathLen;
      const idx0 = Math.floor(rawIdx);
      const idx1 = Math.min(idx0 + 1, pathLen);
      const frac = rawIdx - idx0;
      enemy.x = lerp(DEFAULT_PATH[idx0].x, DEFAULT_PATH[idx1].x, frac);
      enemy.y = lerp(DEFAULT_PATH[idx0].y, DEFAULT_PATH[idx1].y, frac);

      if (enemy.pathProgress >= 1) {
        arrivedEnemyIds.add(enemy.id);
        const dmg = Math.round(enemy.maxHp * GOAL_DAMAGE_HP_PERCENTAGE + GOAL_DAMAGE_BASE);
        gs.mainTowerHp = Math.max(0, gs.mainTowerHp - dmg);
      }

      // Garbage throw
      if (def.throwsGarbage && now - enemy.lastGarbageAt > def.garbageInterval) {
        enemy.lastGarbageAt = now;
        gs.garbageProjectiles.push({
          id: `g${now}_${enemy.id}`,
          enemyId: enemy.id,
          startX: enemy.x, startY: enemy.y,
          arcHeight: GARBAGE_ARC_MIN + Math.random() * GARBAGE_ARC_VARIANCE,
          progress: 0,
          garbageLines: MIN_GARBAGE_LINES + Math.floor(Math.random() * MAX_GARBAGE_LINES),
          startTime: now,
          duration: 1500 + Math.random() * 500,
        });
      }
    }
    gs.enemies = gs.enemies.filter(e => !arrivedEnemyIds.has(e.id));

    // ── Towers shoot ─────────────────────────────────────────
    for (const tower of gs.towers) {
      if (tower.type === 'aura' || tower.type === 'wall') continue;
      if (tower.hp <= 0) continue;
      const interval = (1 / (tower.attackSpeed * tower.auraBoost)) * 1000;
      if (now - tower.lastShotAt < interval) continue;

      // Find nearest enemy in range
      let target: TDEnemy | null = null;
      let bestDist = Infinity;
      for (const enemy of gs.enemies) {
        const d = dist(enemy.x, enemy.y, tower.gridX, tower.gridY);
        if (d <= tower.range && d < bestDist) { bestDist = d; target = enemy; }
      }
      if (!target) continue;

      tower.lastShotAt = now;

      if (tower.type === 'freeze') {
        // Freeze all enemies in range
        for (const enemy of gs.enemies) {
          const d = dist(enemy.x, enemy.y, tower.gridX, tower.gridY);
          if (d <= tower.range) {
            enemy.frozen = true;
            enemy.frozenUntil = now + FREEZE_DURATION_MS;
          }
        }
      } else if (tower.type === 'cannon') {
        // AoE shot: fire a bullet toward target, on hit damages nearby enemies
        gs.bullets.push({
          id: `b${now}_${tower.id}`,
          fromTowerId: tower.id, toEnemyId: target.id,
          fromX: tower.gridX, fromY: tower.gridY,
          toX: target.x, toY: target.y,
          progress: 0, damage: tower.damage,
          startTime: now, duration: 400,
        });
      } else {
        gs.bullets.push({
          id: `b${now}_${tower.id}`,
          fromTowerId: tower.id, toEnemyId: target.id,
          fromX: tower.gridX, fromY: tower.gridY,
          toX: target.x, toY: target.y,
          progress: 0, damage: tower.damage,
          startTime: now, duration: 300,
        });
      }
    }

    // ── Animate bullets ──────────────────────────────────────
    const hitBullets = new Set<string>();
    for (const bullet of gs.bullets) {
      bullet.progress = (now - bullet.startTime) / bullet.duration;
      if (bullet.progress >= 1) {
        hitBullets.add(bullet.id);
        // Apply damage
        const tower = gs.towers.find(t => t.id === bullet.fromTowerId);
        if (tower?.type === 'cannon') {
          // AoE: damage all enemies near hit point
          for (const enemy of gs.enemies) {
            const d = dist(enemy.x, enemy.y, bullet.toX, bullet.toY);
            if (d <= 2) {
              enemy.hp -= bullet.damage;
            }
          }
        } else {
          const enemy = gs.enemies.find(e => e.id === bullet.toEnemyId);
          if (enemy) enemy.hp -= bullet.damage;
        }
      }
    }
    gs.bullets = gs.bullets.filter(b => !hitBullets.has(b.id));

    // ── Remove dead enemies ──────────────────────────────────
    const deadIds = new Set<string>();
    for (const enemy of gs.enemies) {
      if (enemy.hp <= 0) {
        deadIds.add(enemy.id);
        const def = TD_ENEMIES[enemy.type];
        gs.gold += def.reward;
        gs.totalEnemiesKilled++;
      }
    }
    gs.enemies = gs.enemies.filter(e => !deadIds.has(e.id));
    gs.garbageProjectiles = gs.garbageProjectiles.filter(p => !deadIds.has(p.enemyId));

    // ── Animate garbage projectiles ──────────────────────────
    gs.garbageProjectiles = gs.garbageProjectiles.filter(p => {
      p.progress = (now - p.startTime) / p.duration;
      return p.progress < 1;
    });

    // ── Animate aura bursts ──────────────────────────────────
    gs.lineClearAuras = gs.lineClearAuras.filter(a => {
      const elapsed = now - a.startTime;
      a.currentRadius = (elapsed / a.duration) * a.maxRadius;
      if (elapsed > a.duration) return false;
      // Damage enemies within current radius
      for (const enemy of gs.enemies) {
        const d = dist(enemy.x, enemy.y, a.centerX, a.centerY);
        if (d <= a.currentRadius) {
          enemy.hp -= a.damage * DT * AURA_DAMAGE_MULTIPLIER;
        }
      }
      return true;
    });

    // ── Line clear aura trigger ──────────────────────────────
    if (lineClearRef.current !== externalLineClear) {
      const newClears = externalLineClear - lineClearRef.current;
      lineClearRef.current = externalLineClear;
      if (newClears > 0) {
        gs.lineClearAuras.push({
          id: `aura${now}`,
          centerX: TD_GRID_COLS / 2, centerY: TD_GRID_ROWS / 2,
          maxRadius: TD_GRID_COLS,
          currentRadius: 0,
          damage: LINE_CLEAR_AURA_BASE_DAMAGE * newClears,
          startTime: now, duration: 1200,
        });
      }
    }

    // ── Main tower destroyed ─────────────────────────────────
    if (gs.mainTowerHp <= 0) {
      gs.phase = 'game_over';
      forceRender(n => n + 1);
      return;
    }

    // ── Wave cleared? ────────────────────────────────────────
    const allSpawned = spawn.enemyIdx >= spawn.spawnQueue.length;
    if (allSpawned && gs.enemies.length === 0 && !spawn.waveCleared) {
      spawn.waveCleared = true;
      gs.gold += waveDef.reward;
      spawn.waveIdx++;
      if (spawn.waveIdx >= TD_WAVES.length) {
        gs.phase = 'victory';
      } else {
        gs.phase = 'interlude';
        spawn.nextSpawnAt = now + TD_WAVES[spawn.waveIdx].interludeMs;
      }
    }

    forceRender(n => n + 1);
  }, [externalLineClear]);

  useEffect(() => {
    spawnRef.current.nextSpawnAt = Date.now() + 3000; // 3s before wave 1
    tickRef.current = setInterval(tick, 50);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [tick]);

  // Sync external line clears
  useEffect(() => {
    lineClearRef.current = externalLineClear;
  }, [externalLineClear]);

  const gs = stateRef.current;

  // ── Render helpers ───────────────────────────────────────────

  const cellBg = (cell: TDCell): string => {
    if (cell.type === 'path')  return '#c8a868';
    if (cell.type === 'spawn') return '#44cc88';
    if (cell.type === 'goal')  return '#c0a030';
    if (cell.type === 'tower' && cell.towerType) return TD_TOWERS[cell.towerType]?.color ?? '#444';
    return '#1e2533';
  };

  const phaseColor: Record<TDPhase, string> = {
    setup: '#888', wave: '#ff4444', interlude: '#44cc88',
    game_over: '#ff0000', victory: '#ffd700',
  };

  // ── Time until next wave ─────────────────────────────────────
  const msLeft = Math.max(0, spawnRef.current.nextSpawnAt - Date.now());
  const secsLeft = Math.ceil(msLeft / 1000);

  return (
    <div className={styles.gameRoot}>
      {/* Header HUD */}
      <div className={styles.gameHUD}>
        <button className={styles.backBtn} onClick={onExit}>← {isEn ? 'Exit' : '終了'}</button>
        <div className={styles.hudCenter}>
          <span className={styles.hudWave}>
            {isEn ? `Wave ${gs.wave} / ${TD_WAVES.length}` : `ウェーブ ${gs.wave} / ${TD_WAVES.length}`}
          </span>
          <span
            className={styles.hudPhase}
            style={{ color: phaseColor[gs.phase] }}
          >
            {gs.phase === 'wave' && (isEn ? '⚔️ Battle!' : '⚔️ バトル！')}
            {gs.phase === 'interlude' && (isEn ? `⏳ Next wave in ${secsLeft}s` : `⏳ 次のウェーブまで ${secsLeft}秒`)}
            {gs.phase === 'game_over' && (isEn ? '💀 Defeated' : '💀 敗北')}
            {gs.phase === 'victory' && (isEn ? '🏆 Victory!' : '🏆 勝利！')}
          </span>
        </div>
        <div className={styles.hudRight}>
          <span className={styles.hudGold}>💰 {gs.gold}</span>
          <div className={styles.hudHPBar}>
            <div
              className={styles.hudHPFill}
              style={{ width: `${(gs.mainTowerHp / gs.mainTowerMaxHp) * 100}%` }}
            />
          </div>
          <span className={styles.hudHP}>
            🏰 {formatHP(gs.mainTowerHp)} / {formatHP(gs.mainTowerMaxHp)}
          </span>
        </div>
      </div>

      {/* Game over / victory overlay */}
      {(gs.phase === 'game_over' || gs.phase === 'victory') && (
        <div className={`${styles.gameOverlay} ${gs.phase === 'victory' ? styles.gameOverlayVictory : ''}`}>
          <div className={styles.gameOverlayContent}>
            <div className={styles.gameOverlayIcon}>
              {gs.phase === 'victory' ? '🏆' : '💀'}
            </div>
            <div className={styles.gameOverlayTitle}>
              {gs.phase === 'victory'
                ? (isEn ? 'Victory!' : '勝利！')
                : (isEn ? 'Tower Destroyed' : 'タワー崩壊')}
            </div>
            <div className={styles.gameOverlayStats}>
              <span>{isEn ? `Enemies defeated: ${gs.totalEnemiesKilled}` : `倒した敵: ${gs.totalEnemiesKilled}`}</span>
              <span>{isEn ? `Waves survived: ${gs.wave}` : `生存ウェーブ: ${gs.wave}`}</span>
            </div>
            <button className={styles.startBtn} onClick={onExit}>
              {isEn ? 'Return to Menu' : 'メニューへ戻る'}
            </button>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div className={styles.gameArea}>
        {/* TD Grid */}
        <div className={styles.tdGridWrapper}>
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${TD_GRID_COLS}, ${TD_CELL_PX}px)`,
              gridTemplateRows: `repeat(${TD_GRID_ROWS}, ${TD_CELL_PX}px)`,
              position: 'relative',
            }}
          >
            {gs.grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={styles.cell}
                  style={{ background: cellBg(cell) }}
                >
                  {cell.type === 'tower' && cell.towerType && (
                    <span className={styles.cellIcon}>{TD_TOWERS[cell.towerType]?.icon}</span>
                  )}
                  {cell.type === 'goal' && <span className={styles.cellIcon}>🏰</span>}
                  {cell.type === 'spawn' && <span className={styles.cellIcon}>⚡</span>}
                </div>
              ))
            )}

            {/* Render aura rings */}
            {gs.lineClearAuras.map(a => (
              <div
                key={a.id}
                className={styles.auraRing}
                style={{
                  left: `${a.centerX * TD_CELL_PX}px`,
                  top: `${a.centerY * TD_CELL_PX}px`,
                  width: `${a.currentRadius * TD_CELL_PX * 2}px`,
                  height: `${a.currentRadius * TD_CELL_PX * 2}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: 1 - (a.currentRadius / a.maxRadius),
                }}
              />
            ))}

            {/* Render enemies */}
            {gs.enemies.map(enemy => {
              const def = TD_ENEMIES[enemy.type];
              const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
              const frozen = enemy.frozen;
              return (
                <div
                  key={enemy.id}
                  className={`${styles.enemy} ${frozen ? styles.enemyFrozen : ''}`}
                  style={{
                    left: `${enemy.x * TD_CELL_PX}px`,
                    top: `${enemy.y * TD_CELL_PX}px`,
                    width: `${def.size * TD_CELL_PX}px`,
                    height: `${def.size * TD_CELL_PX}px`,
                    background: def.color,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className={styles.enemyIcon}>{def.icon}</span>
                  <div className={styles.enemyHPBar}>
                    <div
                      className={styles.enemyHPFill}
                      style={{
                        width: `${hpPct * 100}%`,
                        background: hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#ffaa00' : '#ff2222',
                      }}
                    />
                  </div>
                  <div className={styles.enemyHPLabel}>{formatHP(enemy.hp)}</div>
                </div>
              );
            })}

            {/* Render bullets */}
            {gs.bullets.map(bullet => {
              const bx = lerp(bullet.fromX, bullet.toX, bullet.progress);
              const by = lerp(bullet.fromY, bullet.toY, bullet.progress);
              return (
                <div
                  key={bullet.id}
                  className={styles.bullet}
                  style={{
                    left: `${bx * TD_CELL_PX}px`,
                    top: `${by * TD_CELL_PX}px`,
                  }}
                />
              );
            })}

            {/* Render garbage projectiles (parabolic arc) */}
            {gs.garbageProjectiles.map(proj => {
              // Destination: center of the grid (Tetris board side)
              const destX = -4;
              const destY = TD_GRID_ROWS / 2;
              const t = proj.progress;
              const px = lerp(proj.startX, destX, t);
              const arcOffset = -proj.arcHeight * 4 * t * (1 - t);
              const py = lerp(proj.startY, destY, t) + arcOffset;
              const scale = 0.8 + t * 0.6;
              return (
                <div
                  key={proj.id}
                  className={styles.garbageProjectile}
                  style={{
                    left: `${px * TD_CELL_PX}px`,
                    top: `${py * TD_CELL_PX}px`,
                    transform: `translate(-50%, -50%) scale(${scale}) rotate(${t * 720}deg)`,
                    opacity: Math.min(1, (1 - t) * 3),
                  }}
                >
                  🧱×{proj.garbageLines}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel: towers info & wave progress */}
        <div className={styles.sidePanel}>
          <div className={styles.sidePanelSection}>
            <div className={styles.sidePanelTitle}>
              {isEn ? '🗼 Towers' : '🗼 タワー'}
            </div>
            {gs.towers.filter(t => t.type !== 'main_tower').map(tower => {
              const def = TD_TOWERS[tower.type];
              const hpPct = tower.hp / tower.maxHp;
              return (
                <div key={tower.id} className={styles.towerInfo}>
                  <span>{def.icon}</span>
                  <div className={styles.towerHPBar}>
                    <div
                      className={styles.towerHPFill}
                      style={{
                        width: `${hpPct * 100}%`,
                        background: hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#ffaa00' : '#ff2222',
                      }}
                    />
                  </div>
                  <span className={styles.towerHPText}>
                    {formatHP(tower.hp)}
                  </span>
                  {tower.auraBoost > 1 && (
                    <span className={styles.towerAuraBadge}>✨×{tower.auraBoost.toFixed(1)}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.sidePanelSection}>
            <div className={styles.sidePanelTitle}>
              {isEn ? '📊 Wave Progress' : '📊 ウェーブ進行'}
            </div>
            {TD_WAVES.map(w => (
              <div
                key={w.waveNumber}
                className={`${styles.waveRow} ${w.waveNumber === gs.wave ? styles.waveRowActive : ''} ${w.waveNumber < gs.wave ? styles.waveRowDone : ''}`}
              >
                <span className={styles.waveNum}>W{w.waveNumber}</span>
                <span className={styles.waveEnemies}>
                  {w.enemies.map(e => `${TD_ENEMIES[e.type].icon}×${e.count}`).join(' ')}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.sidePanelSection}>
            <div className={styles.sidePanelTitle}>
              {isEn ? '💡 Line Clear Tip' : '💡 ライン消去のヒント'}
            </div>
            <div className={styles.lineClearTip}>
              {isEn
                ? 'Clear Tetris lines to release an aura wave that deals massive damage to all enemies on the field!'
                : 'テトリスのラインを消すと、フィールド上の全敵に大ダメージを与えるオーラ波が発生します！'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for lerp in garbage projectile rendering — defined above as module-level lerp
