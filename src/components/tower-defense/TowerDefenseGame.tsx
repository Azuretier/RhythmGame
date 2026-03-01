'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import type { GameState, TowerType, WaveGroup } from '@/types/tower-defense';
import { TOWER_DEFS } from '@/types/tower-defense';
import {
  createInitialState,
  updateGame,
  placeTower,
  sellTower,
  upgradeTower,
  startWave,
  canPlaceTower,
} from '@/lib/tower-defense/engine';
import { WAVES } from '@/lib/tower-defense/waves';
import * as sfx from '@/lib/tower-defense/sounds';
import TDMenuScreen from './TDMenuScreen';
import TDGameHUD from './TDGameHUD';
import TDTowerPanel from './TDTowerPanel';
import TDTowerInfo from './TDTowerInfo';
import TDEnemyInfo from './TDEnemyInfo';
import TDEndScreen from './TDEndScreen';
import TDWaveBanner from './TDWaveBanner';
import TDParticleOverlay from './TDParticleOverlay';
import TDControlsHint from './TDControlsHint';
import styles from './TowerDefenseGame.module.css';

// Dynamically import 3D renderer to avoid SSR issues
const TowerDefenseRenderer3D = dynamic(
  () => import('./TowerDefenseRenderer3D'),
  { ssr: false }
);

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'frost', 'lightning', 'sniper', 'flame', 'arcane'];

// ===== Main Game Component =====
export default function TowerDefenseGame() {
  const [menuPhase, setMenuPhase] = useState<'menu' | 'playing'>('menu');
  const [selectedMap, setSelectedMap] = useState(0);
  const [state, setState] = useState<GameState>(() => createInitialState(0));
  const [soundOn, setSoundOn] = useState(true);
  const [waveBanner, setWaveBanner] = useState<{
    waveNumber: number;
    groups: WaveGroup[];
    isBoss: boolean;
  } | null>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioInitRef = useRef(false);
  const lastShootSoundRef = useRef<number>(0);
  const prevPhaseRef = useRef(state.phase);

  // Init audio on first user interaction
  const ensureAudio = useCallback(() => {
    if (!audioInitRef.current) {
      sfx.initAudio();
      audioInitRef.current = true;
    }
  }, []);

  // Wave banner trigger: detect phase transitions
  useEffect(() => {
    if (prevPhaseRef.current === 'build' && state.phase === 'wave') {
      const wave = WAVES[state.currentWave - 1];
      if (wave) {
        const isBoss = wave.groups.some(g => g.enemyType === 'boss');
        setWaveBanner({ waveNumber: state.currentWave, groups: wave.groups, isBoss });
      }
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase, state.currentWave]);

  // Game loop with sound event detection
  useEffect(() => {
    if (menuPhase !== 'playing') return;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      setState(prev => {
        const next = updateGame(prev, dt);

        // Sound event detection
        if (audioInitRef.current && !sfx.isMuted()) {
          if (next.projectiles.length > prev.projectiles.length) {
            const now = performance.now();
            if (now - lastShootSoundRef.current > 80) {
              lastShootSoundRef.current = now;
              const newProj = next.projectiles[next.projectiles.length - 1];
              if (newProj) sfx.playShoot(newProj.towerType);
            }
          }
          if (next.phase === 'wave' && next.towers.some(t => t.type === 'cannon' && t.targetId)) {
            sfx.playMagmaAura();
          }
          const prevAlive = prev.enemies.length;
          const nextAlive = next.enemies.length;
          if (nextAlive < prevAlive && next.lives === prev.lives) {
            const prevBossIds = new Set(prev.enemies.filter(e => e.type === 'boss').map(e => e.id));
            const nextBossIds = new Set(next.enemies.map(e => e.id));
            const bossKilled = [...prevBossIds].some(id => !nextBossIds.has(id));
            if (bossKilled) sfx.playBossKill();
            else if (prevAlive - nextAlive > 0) sfx.playEnemyKill();
          }
          if (next.lives < prev.lives) sfx.playLifeLost();
          if (prev.phase === 'build' && next.phase === 'wave') sfx.playWaveStart();
          if (prev.phase === 'wave' && next.phase === 'build') sfx.playWaveComplete();
          if (prev.phase !== 'won' && next.phase === 'won') sfx.playGameWon();
          if (prev.phase !== 'lost' && next.phase === 'lost') sfx.playGameLost();
        }

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
        setState(prev => ({ ...prev, selectedTowerType: null, selectedTowerId: null }));
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
    setWaveBanner(null);
    setState(createInitialState(selectedMap));
  }, [selectedMap]);

  const handleBackToMenu = useCallback(() => {
    setWaveBanner(null);
    setMenuPhase('menu');
  }, []);

  const handleDismissWaveBanner = useCallback(() => {
    setWaveBanner(null);
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
      <TDMenuScreen
        selectedMap={selectedMap}
        onSelectMap={setSelectedMap}
        onStart={handleStart}
      />
    );
  }

  // ===== Game Screen =====
  return (
    <div className={styles.container}>
      {/* Particle Overlay */}
      <TDParticleOverlay phase={state.phase} />

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
      <TDGameHUD
        gold={state.gold}
        lives={state.lives}
        maxLives={state.maxLives}
        score={state.score}
        currentWave={state.currentWave}
        totalWaves={state.totalWaves}
        phase={state.phase}
        enemyCount={state.enemies.length}
        gameSpeed={state.gameSpeed}
        soundOn={soundOn}
        waveCountdown={state.waveCountdown}
        autoStart={state.autoStart}
        onStartWave={handleStartWave}
        onSpeedToggle={handleSpeedToggle}
        onSoundToggle={handleSoundToggle}
        onBackToMenu={handleBackToMenu}
      />

      {/* Wave Banner */}
      <AnimatePresence>
        {waveBanner && (
          <TDWaveBanner
            key={waveBanner.waveNumber}
            waveNumber={waveBanner.waveNumber}
            totalWaves={state.totalWaves}
            groups={waveBanner.groups}
            isBossWave={waveBanner.isBoss}
            onDismiss={handleDismissWaveBanner}
          />
        )}
      </AnimatePresence>

      {/* Tower Selection Panel */}
      <TDTowerPanel
        gold={state.gold}
        selectedTowerType={state.selectedTowerType}
        onSelectTowerType={handleTowerTypeSelect}
      />

      {/* Selected Tower Info */}
      <AnimatePresence>
        {selectedTower && (
          <TDTowerInfo
            key={selectedTower.id}
            tower={selectedTower}
            gold={state.gold}
            onUpgrade={handleUpgrade}
            onSell={handleSell}
            onDeselect={handleDeselect}
          />
        )}
      </AnimatePresence>

      {/* Enemy Info Panel */}
      <AnimatePresence>
        {selectedEnemy && !selectedTower && (
          <TDEnemyInfo
            key={selectedEnemy.id}
            enemy={selectedEnemy}
            onDeselect={handleDeselectEnemy}
          />
        )}
      </AnimatePresence>

      {/* Controls Hint */}
      <TDControlsHint />

      {/* End Screen */}
      <AnimatePresence>
        {(state.phase === 'won' || state.phase === 'lost') && (
          <TDEndScreen
            phase={state.phase}
            score={state.score}
            currentWave={state.currentWave}
            totalWaves={state.totalWaves}
            towers={state.towers}
            lives={state.lives}
            maxLives={state.maxLives}
            onRestart={handleRestart}
            onMenu={handleBackToMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
