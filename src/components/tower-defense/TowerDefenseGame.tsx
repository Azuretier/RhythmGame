'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { GameState, TowerType, Tower, Enemy, EnemyType } from '@/types/tower-defense';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';
import {
  createInitialState,
  updateGame,
  placeTower,
  sellTower,
  upgradeTower,
  startWave,
  canPlaceTower,
} from '@/lib/tower-defense/engine';
import { MAPS } from '@/lib/tower-defense/maps';
import * as sfx from '@/lib/tower-defense/sounds';
import styles from './TowerDefenseGame.module.css';

// Dynamically import 3D renderer to avoid SSR issues
const TowerDefenseRenderer3D = dynamic(
  () => import('./TowerDefenseRenderer3D'),
  { ssr: false }
);

const TOWER_ICONS: Record<TowerType, string> = {
  archer: '🏹',
  cannon: '💣',
  frost: '❄️',
  lightning: '⚡',
  sniper: '🎯',
  flame: '🔥',
  arcane: '🔮',
};

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'frost', 'lightning', 'sniper', 'flame', 'arcane'];

// ===== Tower Tooltip =====
function TowerTooltip({ type }: { type: TowerType }) {
  const def = TOWER_DEFS[type];
  return (
    <div className={styles.towerTooltip}>
      <h4 style={{ color: def.color }}>{def.name}</h4>
      <p>{def.description}</p>
      <div className={styles.tooltipStats}>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Damage</span>
          <span className={styles.tooltipStatValue}>{def.damage}</span>
        </div>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Range</span>
          <span className={styles.tooltipStatValue}>{def.range}</span>
        </div>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Fire Rate</span>
          <span className={styles.tooltipStatValue}>{def.fireRate}/s</span>
        </div>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Cost</span>
          <span className={styles.tooltipStatValue} style={{ color: '#fbbf24' }}>{def.cost}g</span>
        </div>
      </div>
      {def.special && (
        <div className={styles.tooltipSpecial}>{def.special}</div>
      )}
    </div>
  );
}

// ===== Selected Tower Info =====
function SelectedTowerInfo({ tower, gold, onUpgrade, onSell, onDeselect }: {
  tower: Tower;
  gold: number;
  onUpgrade: () => void;
  onSell: () => void;
  onDeselect: () => void;
}) {
  const def = TOWER_DEFS[tower.type];
  const canUpgrade = tower.level < def.maxLevel;
  const upgradeCost = canUpgrade ? def.upgradeCosts[tower.level - 1] : 0;
  const totalInvested = def.cost + def.upgradeCosts.slice(0, tower.level - 1).reduce((a, b) => a + b, 0);
  const sellValue = Math.floor(totalInvested * 0.7);
  const currentDamage = def.damagePerLevel[tower.level - 1] ?? def.damage;
  const currentRange = def.rangePerLevel[tower.level - 1] ?? def.range;

  return (
    <div className={styles.selectedTowerPanel}>
      <h3 style={{ color: def.color }}>
        {TOWER_ICONS[tower.type]} {def.name} (Lv.{tower.level})
        <span
          onClick={onDeselect}
          style={{ float: 'right', cursor: 'pointer', color: '#64748b', fontSize: '14px' }}
        >
          ✕
        </span>
      </h3>
      <div className={styles.towerInfoRow}>
        <span className={styles.towerInfoLabel}>Damage</span>
        <span className={styles.towerInfoValue}>{currentDamage}</span>
      </div>
      <div className={styles.towerInfoRow}>
        <span className={styles.towerInfoLabel}>Range</span>
        <span className={styles.towerInfoValue}>{currentRange.toFixed(1)}</span>
      </div>
      <div className={styles.towerInfoRow}>
        <span className={styles.towerInfoLabel}>Kills</span>
        <span className={styles.towerInfoValue}>{tower.kills}</span>
      </div>
      <div className={styles.towerInfoRow}>
        <span className={styles.towerInfoLabel}>Total DMG</span>
        <span className={styles.towerInfoValue}>{tower.totalDamage}</span>
      </div>
      {def.special && (
        <div className={styles.towerInfoRow}>
          <span className={styles.towerInfoLabel}>Special</span>
          <span className={styles.towerInfoValue} style={{ color: '#38bdf8', fontSize: '11px' }}>{def.special}</span>
        </div>
      )}
      <div className={styles.towerActions}>
        {canUpgrade && (
          <button
            className={styles.upgradeBtn}
            onClick={onUpgrade}
            disabled={gold < upgradeCost}
          >
            Upgrade ({upgradeCost}g)
          </button>
        )}
        <button className={styles.sellBtn} onClick={onSell}>
          Sell ({sellValue}g)
        </button>
      </div>
    </div>
  );
}

// ===== Effect Labels =====
const EFFECT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  slow: { label: 'Slowed', color: '#7dd3fc', icon: '🧊' },
  burn: { label: 'Burning', color: '#f97316', icon: '🔥' },
  stun: { label: 'Stunned', color: '#fbbf24', icon: '💫' },
  poison: { label: 'Poisoned', color: '#a3e635', icon: '☠️' },
  amplify: { label: 'Amplified', color: '#c084fc', icon: '🔮' },
};

const ABILITY_LABELS: Record<string, { label: string; description: string; color: string }> = {
  heal_aura: { label: 'Heal Aura', description: 'Heals nearby allies 2% HP/s', color: '#86efac' },
  shield_aura: { label: 'Shield Aura', description: 'Reduces damage for nearby allies', color: '#60a5fa' },
  split: { label: 'Split', description: 'Splits into smaller enemies on death', color: '#d8b4fe' },
  teleport: { label: 'Teleport', description: 'Periodically blinks forward', color: '#67e8f9' },
  stealth: { label: 'Stealth', description: 'Invisible until attacked', color: '#94a3b8' },
};

const ENEMY_ICONS: Record<EnemyType, string> = {
  grunt: '🐷',
  fast: '🐔',
  tank: '🐄',
  flying: '🐝',
  healer: '🐱',
  boss: '🐴',
  swarm: '🐰',
  shield: '🐺',
};

// ===== Enemy Info Panel =====
function EnemyInfoPanel({ enemy, onDeselect }: {
  enemy: Enemy;
  onDeselect: () => void;
}) {
  const def = ENEMY_DEFS[enemy.type];
  const hpPercent = enemy.hp / enemy.maxHp;
  const hpColor = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
  const effectiveSpeed = (() => {
    let speed = enemy.speed;
    for (const eff of enemy.effects) {
      if (eff.type === 'slow') speed *= (1 - eff.magnitude);
      if (eff.type === 'stun') speed = 0;
    }
    return Math.max(speed, 0);
  })();

  return (
    <div className={styles.enemyInfoPanel}>
      <h3 className={styles.enemyInfoHeader}>
        <span className={styles.enemyInfoIcon}>{ENEMY_ICONS[enemy.type]}</span>
        <span style={{ color: def.color }}>{def.name}</span>
        <span className={styles.enemyInfoClose} onClick={onDeselect}>✕</span>
      </h3>

      {/* HP bar */}
      <div className={styles.enemyHpBarWrap}>
        <div className={styles.enemyHpBar}>
          <div
            className={styles.enemyHpFill}
            style={{ width: `${hpPercent * 100}%`, background: hpColor }}
          />
        </div>
        <span className={styles.enemyHpText}>
          {Math.ceil(enemy.hp)} / {enemy.maxHp}
        </span>
      </div>

      {/* Stats grid */}
      <div className={styles.enemyStatsGrid}>
        <div className={styles.enemyStatItem}>
          <span className={styles.enemyStatLabel}>Speed</span>
          <span className={styles.enemyStatVal}>
            {effectiveSpeed.toFixed(1)}
            {effectiveSpeed < enemy.speed && (
              <span style={{ color: '#7dd3fc', fontSize: '10px', marginLeft: '3px' }}>
                ({enemy.speed.toFixed(1)})
              </span>
            )}
          </span>
        </div>
        <div className={styles.enemyStatItem}>
          <span className={styles.enemyStatLabel}>Armor</span>
          <span className={styles.enemyStatVal}>{enemy.armor}</span>
        </div>
        <div className={styles.enemyStatItem}>
          <span className={styles.enemyStatLabel}>Reward</span>
          <span className={styles.enemyStatVal} style={{ color: '#fbbf24' }}>{def.reward}g</span>
        </div>
        <div className={styles.enemyStatItem}>
          <span className={styles.enemyStatLabel}>Type</span>
          <span className={styles.enemyStatVal}>{enemy.flying ? 'Flying' : 'Ground'}</span>
        </div>
      </div>

      {/* Active effects */}
      {enemy.effects.length > 0 && (
        <div className={styles.enemySection}>
          <div className={styles.enemySectionTitle}>Active Effects</div>
          <div className={styles.enemyEffects}>
            {enemy.effects.map((eff, i) => {
              const info = EFFECT_LABELS[eff.type];
              return (
                <div key={i} className={styles.enemyEffect} style={{ borderColor: info?.color ?? '#64748b' }}>
                  <span className={styles.enemyEffectIcon}>{info?.icon ?? '?'}</span>
                  <div className={styles.enemyEffectInfo}>
                    <span style={{ color: info?.color ?? '#e2e8f0' }}>{info?.label ?? eff.type}</span>
                    <span className={styles.enemyEffectDetail}>
                      {eff.type === 'slow' && `${Math.round(eff.magnitude * 100)}% slow`}
                      {eff.type === 'burn' && `${eff.magnitude} DPS`}
                      {eff.type === 'amplify' && `+${Math.round(eff.magnitude * 100)}% dmg taken`}
                      {eff.type === 'stun' && 'Cannot move'}
                      {eff.type === 'poison' && `${eff.magnitude} DPS`}
                      {' · '}{eff.remaining.toFixed(1)}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abilities */}
      {def.abilities && def.abilities.length > 0 && (
        <div className={styles.enemySection}>
          <div className={styles.enemySectionTitle}>Abilities</div>
          <div className={styles.enemyAbilities}>
            {def.abilities.map((ability, i) => {
              const info = ABILITY_LABELS[ability];
              return (
                <div key={i} className={styles.enemyAbility}>
                  <span className={styles.enemyAbilityName} style={{ color: info?.color ?? '#e2e8f0' }}>
                    {info?.label ?? ability}
                  </span>
                  <span className={styles.enemyAbilityDesc}>{info?.description ?? ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Game Component =====
export default function TowerDefenseGame() {
  const [menuPhase, setMenuPhase] = useState<'menu' | 'playing'>('menu');
  const [selectedMap, setSelectedMap] = useState(0);
  const [state, setState] = useState<GameState>(() => createInitialState(0));
  const [hoveredTower, setHoveredTower] = useState<TowerType | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevStateRef = useRef<GameState | null>(null);
  const audioInitRef = useRef(false);
  // Throttle shooting sounds to avoid overwhelming audio
  const lastShootSoundRef = useRef<number>(0);

  // Init audio on first user interaction
  const ensureAudio = useCallback(() => {
    if (!audioInitRef.current) {
      sfx.initAudio();
      audioInitRef.current = true;
    }
  }, []);

  // Game loop with sound event detection
  useEffect(() => {
    if (menuPhase !== 'playing') return;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // cap at 100ms
      lastTimeRef.current = time;

      setState(prev => {
        const next = updateGame(prev, dt);

        // Sound event detection — compare prev vs next
        if (audioInitRef.current && !sfx.isMuted()) {
          // New projectiles = tower firing
          if (next.projectiles.length > prev.projectiles.length) {
            const now = performance.now();
            if (now - lastShootSoundRef.current > 80) {
              lastShootSoundRef.current = now;
              const newProj = next.projectiles[next.projectiles.length - 1];
              if (newProj) sfx.playShoot(newProj.towerType);
            }
          }

          // Enemy killed — fewer alive enemies (not from reaching base)
          const prevAlive = prev.enemies.length;
          const nextAlive = next.enemies.length;
          if (nextAlive < prevAlive && next.lives === prev.lives) {
            const killed = prevAlive - nextAlive;
            // Check if a boss died
            const prevBossIds = new Set(prev.enemies.filter(e => e.type === 'boss').map(e => e.id));
            const nextBossIds = new Set(next.enemies.map(e => e.id));
            const bossKilled = [...prevBossIds].some(id => !nextBossIds.has(id));
            if (bossKilled) {
              sfx.playBossKill();
            } else if (killed > 0) {
              sfx.playEnemyKill();
            }
          }

          // Life lost
          if (next.lives < prev.lives) {
            sfx.playLifeLost();
          }

          // Phase transitions
          if (prev.phase === 'build' && next.phase === 'wave') {
            sfx.playWaveStart();
          }
          if (prev.phase === 'wave' && next.phase === 'build') {
            sfx.playWaveComplete();
          }
          if (prev.phase !== 'won' && next.phase === 'won') {
            sfx.playGameWon();
          }
          if (prev.phase !== 'lost' && next.phase === 'lost') {
            sfx.playGameLost();
          }
        }

        prevStateRef.current = prev;
        return next;
      });
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [menuPhase]);

  const handleSoundToggle = useCallback(() => {
    setSoundOn(prev => {
      const next = !prev;
      sfx.setMuted(!next);
      if (next) sfx.playUIClick();
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (menuPhase !== 'playing') return;

      // Number keys 1-7 to select tower types
      const num = parseInt(e.key);
      if (num >= 1 && num <= TOWER_ORDER.length) {
        ensureAudio();
        sfx.playUIClick();
        const type = TOWER_ORDER[num - 1];
        setState(prev => ({
          ...prev,
          selectedTowerType: prev.selectedTowerType === type ? null : type,
          selectedTowerId: null,
        }));
        return;
      }

      if (e.key === 'Escape') {
        setState(prev => ({
          ...prev,
          selectedTowerType: null,
          selectedTowerId: null,
        }));
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        ensureAudio();
        setState(prev => {
          if (prev.phase === 'build') return startWave(prev);
          return prev;
        });
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        ensureAudio();
        setState(prev => {
          if (prev.selectedTowerId) {
            sfx.playTowerSell();
            return sellTower(prev, prev.selectedTowerId);
          }
          return prev;
        });
      }

      if (e.key === 'u' || e.key === 'U') {
        ensureAudio();
        setState(prev => {
          if (prev.selectedTowerId) {
            const next = upgradeTower(prev, prev.selectedTowerId);
            if (next !== prev) sfx.playTowerUpgrade();
            else sfx.playInvalid();
            return next;
          }
          return prev;
        });
      }

      if (e.key === 'm' || e.key === 'M') {
        handleSoundToggle();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menuPhase, ensureAudio, handleSoundToggle]);

  const handleCellClick = useCallback((x: number, z: number) => {
    ensureAudio();
    setState(prev => {
      if (prev.selectedTowerType) {
        if (canPlaceTower(prev, x, z)) {
          sfx.playTowerPlace();
          const newState = placeTower(prev, prev.selectedTowerType!, x, z);
          return { ...newState, selectedTowerType: null };
        }
        sfx.playInvalid();
        return prev;
      }
      // Check if clicking on a tower
      const cell = prev.map.grid[z]?.[x];
      if (cell?.towerId) {
        sfx.playUIClick();
        return { ...prev, selectedTowerId: cell.towerId, selectedTowerType: null };
      }
      return { ...prev, selectedTowerId: null };
    });
  }, [ensureAudio]);

  const handleSelectTower = useCallback((id: string) => {
    ensureAudio();
    sfx.playUIClick();
    setState(prev => ({ ...prev, selectedTowerId: id, selectedTowerType: null, selectedEnemyId: null }));
  }, [ensureAudio]);

  const handleSelectEnemy = useCallback((id: string) => {
    ensureAudio();
    sfx.playUIClick();
    setState(prev => ({ ...prev, selectedEnemyId: prev.selectedEnemyId === id ? null : id, selectedTowerId: null, selectedTowerType: null }));
  }, [ensureAudio]);

  const handleDeselectEnemy = useCallback(() => {
    setState(prev => ({ ...prev, selectedEnemyId: null }));
  }, []);

  const handleTowerTypeSelect = useCallback((type: TowerType) => {
    ensureAudio();
    sfx.playUIClick();
    setState(prev => {
      if (prev.gold < TOWER_DEFS[type].cost) return prev;
      return {
        ...prev,
        selectedTowerType: prev.selectedTowerType === type ? null : type,
        selectedTowerId: null,
      };
    });
  }, [ensureAudio]);

  const handleStartWave = useCallback(() => {
    ensureAudio();
    setState(prev => startWave(prev));
  }, [ensureAudio]);

  const handleUpgrade = useCallback(() => {
    ensureAudio();
    setState(prev => {
      if (!prev.selectedTowerId) return prev;
      const next = upgradeTower(prev, prev.selectedTowerId);
      if (next !== prev) sfx.playTowerUpgrade();
      else sfx.playInvalid();
      return next;
    });
  }, [ensureAudio]);

  const handleSell = useCallback(() => {
    ensureAudio();
    setState(prev => {
      if (!prev.selectedTowerId) return prev;
      sfx.playTowerSell();
      return sellTower(prev, prev.selectedTowerId);
    });
  }, [ensureAudio]);

  const handleDeselect = useCallback(() => {
    setState(prev => ({ ...prev, selectedTowerId: null, selectedTowerType: null }));
  }, []);

  const handleSpeedToggle = useCallback(() => {
    ensureAudio();
    sfx.playUIClick();
    setState(prev => ({
      ...prev,
      gameSpeed: prev.gameSpeed === 1 ? 2 : prev.gameSpeed === 2 ? 3 : 1,
    }));
  }, [ensureAudio]);

  const handleStart = useCallback(() => {
    ensureAudio();
    sfx.playUIClick();
    lastTimeRef.current = 0;
    setState(createInitialState(selectedMap));
    setMenuPhase('playing');
  }, [selectedMap, ensureAudio]);

  const handleRestart = useCallback(() => {
    lastTimeRef.current = 0;
    setState(createInitialState(selectedMap));
  }, [selectedMap]);

  const handleBackToMenu = useCallback(() => {
    setMenuPhase('menu');
  }, []);

  const selectedTower = useMemo(() => {
    if (!state.selectedTowerId) return null;
    return state.towers.find(t => t.id === state.selectedTowerId) ?? null;
  }, [state.selectedTowerId, state.towers]);

  const selectedEnemy = useMemo(() => {
    if (!state.selectedEnemyId) return null;
    return state.enemies.find(e => e.id === state.selectedEnemyId) ?? null;
  }, [state.selectedEnemyId, state.enemies]);

  // ===== Menu Screen =====
  if (menuPhase === 'menu') {
    return (
      <div className={styles.menuScreen}>
        <h1 className={styles.menuTitle}>Tower Defense</h1>
        <p className={styles.menuSubtitle}>Defend your base against waves of enemies</p>

        <div className={styles.menuMapSelect}>
          {MAPS.map((map, i) => (
            <div
              key={i}
              className={`${styles.mapCard} ${selectedMap === i ? styles.mapCardSelected : ''}`}
              onClick={() => setSelectedMap(i)}
            >
              <div className={styles.mapCardTitle}>{map.name}</div>
              <div className={styles.mapCardDesc}>
                {map.width}x{map.height} &middot; {map.waypoints.length} turns
              </div>
            </div>
          ))}
        </div>

        <button className={styles.startBtn} onClick={handleStart}>
          Start Game
        </button>
      </div>
    );
  }

  // ===== Game Screen =====
  return (
    <div className={styles.container}>
      {/* 3D Canvas */}
      <div className={styles.canvasWrapper}>
        <TowerDefenseRenderer3D
          state={state}
          onCellClick={handleCellClick}
          onSelectTower={handleSelectTower}
          onSelectEnemy={handleSelectEnemy}
        />
      </div>

      {/* Top HUD */}
      <div className={styles.topHud}>
        <div className={styles.hudLeft}>
          <div className={`${styles.stat} ${styles.gold}`}>
            <span className={styles.statIcon}>💰</span>
            {state.gold}
          </div>
          <div className={`${styles.stat} ${styles.lives}`}>
            <span className={styles.statIcon}>❤️</span>
            {state.lives}/{state.maxLives}
          </div>
          <div className={`${styles.stat} ${styles.score}`}>
            <span className={styles.statIcon}>⭐</span>
            {state.score}
          </div>
        </div>

        <div className={styles.hudCenter}>
          <div className={styles.waveText}>
            Wave {state.currentWave}/{state.totalWaves}
          </div>
          <div className={styles.waveSubtext}>
            {state.phase === 'build' && 'Build Phase'}
            {state.phase === 'wave' && `${state.enemies.length} enemies remaining`}
          </div>
        </div>

        <div className={styles.hudRight}>
          <button
            className={`${styles.speedBtn} ${soundOn ? styles.speedBtnActive : ''}`}
            onClick={handleSoundToggle}
            title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundOn ? 'SFX ON' : 'SFX OFF'}
          </button>
          <button
            className={`${styles.speedBtn} ${state.gameSpeed > 1 ? styles.speedBtnActive : ''}`}
            onClick={handleSpeedToggle}
          >
            {state.gameSpeed === 1 ? '1x' : state.gameSpeed === 2 ? '2x' : '3x'}
          </button>
          <button className={styles.speedBtn} onClick={handleBackToMenu}>
            Menu
          </button>
        </div>
      </div>

      {/* Wave Start Button */}
      {state.phase === 'build' && (
        <button className={styles.waveBtn} onClick={handleStartWave}>
          {state.currentWave === 0 ? 'Start Wave 1' : `Start Wave ${state.currentWave + 1}`}
          {state.autoStart && (
            <div className={styles.waveBtnCountdown}>
              Auto-start in {Math.ceil(state.waveCountdown)}s
            </div>
          )}
        </button>
      )}

      {/* Tower Selection Panel */}
      <div className={styles.towerPanel}>
        {TOWER_ORDER.map((type, i) => {
          const def = TOWER_DEFS[type];
          const affordable = state.gold >= def.cost;
          const isSelected = state.selectedTowerType === type;
          const isHovered = hoveredTower === type;

          return (
            <div
              key={type}
              className={`${styles.towerCard} ${isSelected ? styles.towerCardSelected : ''} ${!affordable ? styles.towerCardDisabled : ''}`}
              onClick={() => affordable && handleTowerTypeSelect(type)}
              onMouseEnter={() => setHoveredTower(type)}
              onMouseLeave={() => setHoveredTower(null)}
            >
              {isHovered && <TowerTooltip type={type} />}
              <div className={styles.towerCardIcon} style={{ background: `${def.color}22` }}>
                {TOWER_ICONS[type]}
              </div>
              <div className={styles.towerCardName}>{def.name.split(' ')[0]}</div>
              <div className={styles.towerCardCost}>{def.cost}g</div>
              <div style={{ position: 'absolute', top: 2, right: 4, fontSize: '9px', color: '#64748b' }}>
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Tower Info */}
      {selectedTower && (
        <SelectedTowerInfo
          tower={selectedTower}
          gold={state.gold}
          onUpgrade={handleUpgrade}
          onSell={handleSell}
          onDeselect={handleDeselect}
        />
      )}

      {/* Enemy Info Panel */}
      {selectedEnemy && !selectedTower && (
        <EnemyInfoPanel
          enemy={selectedEnemy}
          onDeselect={handleDeselectEnemy}
        />
      )}

      {/* Controls Hint */}
      <div className={styles.controlsHint}>
        <div>1-7: Select tower &middot; Space: Start wave</div>
        <div>U: Upgrade &middot; Del: Sell &middot; Esc: Deselect &middot; M: Mute</div>
        <div>Click enemy: View stats &middot; Drag: Rotate &middot; Scroll: Zoom</div>
      </div>

      {/* Win/Lose Overlay */}
      {(state.phase === 'won' || state.phase === 'lost') && (
        <div className={styles.endOverlay}>
          <div className={`${styles.endTitle} ${state.phase === 'won' ? styles.endTitleWon : styles.endTitleLost}`}>
            {state.phase === 'won' ? 'Victory!' : 'Defeated'}
          </div>
          <div className={styles.endStats}>
            <div className={styles.endStat}>
              <div className={styles.endStatValue}>{state.score}</div>
              <div className={styles.endStatLabel}>Score</div>
            </div>
            <div className={styles.endStat}>
              <div className={styles.endStatValue}>{state.currentWave}</div>
              <div className={styles.endStatLabel}>Waves</div>
            </div>
            <div className={styles.endStat}>
              <div className={styles.endStatValue}>{state.towers.length}</div>
              <div className={styles.endStatLabel}>Towers</div>
            </div>
            <div className={styles.endStat}>
              <div className={styles.endStatValue}>
                {state.towers.reduce((sum, t) => sum + t.kills, 0)}
              </div>
              <div className={styles.endStatLabel}>Kills</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className={styles.restartBtn} onClick={handleRestart}>
              Play Again
            </button>
            <button className={styles.restartBtn} onClick={handleBackToMenu} style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', borderColor: 'rgba(148, 163, 184, 0.5)' }}>
              Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
