'use client';

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './VanillaGame.module.css';

// Constants and Types
import { WORLDS, BOARD_WIDTH, BOARD_HEIGHT, BUFFER_ZONE, TERRAIN_DAMAGE_PER_LINE, TERRAIN_PARTICLES_PER_LINE, ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE, ENEMY_REACH_DAMAGE, MAX_HEALTH, BULLET_FIRE_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES, DRAGON_BREATH_DURATION, BEAT_GOOD_WINDOW } from './constants';
import type { Piece, GameMode, FeatureSettings } from './types';
import { DEFAULT_FEATURE_SETTINGS } from './types';
import { getModifiers } from './protocol';
import SkinAmbientEffects from '@/components/profile/SkinAmbientEffects';

// Advancements
import { recordGameEnd, checkLiveGameAdvancements } from '@/lib/advancements/storage';
import AdvancementToast from '../AdvancementToast';

// Dynamically import VoxelWorldBackground (Three.js requires client-side only)
const VoxelWorldBackground = dynamic(() => import('../VoxelWorldBackground'), {
  ssr: false,
});

// Dynamically import GalaxyRing3D (Three.js requires client-side only)
const GalaxyRing3D = dynamic(
  () => import('./components/GalaxyRing3D').then(mod => ({ default: mod.GalaxyRing3D })),
  { ssr: false }
);

// Hooks
import { useAudio, useGameState, useDeviceType, getResponsiveCSSVars, useRhythmVFX } from './hooks';
import { useKeybinds } from './hooks/useKeybinds';
import { useCorruptionSystem } from './hooks/useCorruptionSystem';
import { useGalaxyTD } from './hooks/useGalaxyTD';

// Corruption system

// Utilities
import {
  isValidPosition,
  tryRotation,
  lockPiece,
  clearLines,
  createSpawnPiece,
  getShape,
  getBeatJudgment,
  getBeatMultiplier,
} from './utils';

// Components
import {
  Board,
  NextPiece,
  HoldPiece,
  TitleScreen,
  WorldProgressDisplay,
  ScoreDisplay,
  ComboDisplay,
  TerrainProgress,
  BeatBar,
  StatsPanel,
  JudgmentDisplay,
  JudgmentModeToggle,
  TouchControls,
  RhythmVFX,
  FloatingItems,
  ItemSlots,
  CardSelectUI,
  TreasureBoxUI,
  TerrainParticles,
  WorldTransition,
  GamePhaseIndicator,
  TutorialGuide,
  hasTutorialBeenSeen,
  DragonGauge,
  GalaxyBoard,
} from './components';
import type { JudgmentDisplayMode } from './components';

// ===== T-Spin Detection =====
function detectTSpin(
  piece: Piece,
  board: ReturnType<typeof import('./utils/boardUtils').createEmptyBoard>,
  wasRotation: boolean
): 'none' | 'mini' | 'full' {
  if (piece.type !== 'T' || !wasRotation) return 'none';

  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];

  let filledCorners = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || (y >= 0 && board[y]?.[x])) {
      filledCorners++;
    }
  }

  if (filledCorners >= 3) {
    const frontCorners: [number, number][] = [];
    switch (piece.rotation) {
      case 0: frontCorners.push([cx - 1, cy - 1], [cx + 1, cy - 1]); break;
      case 1: frontCorners.push([cx + 1, cy - 1], [cx + 1, cy + 1]); break;
      case 2: frontCorners.push([cx - 1, cy + 1], [cx + 1, cy + 1]); break;
      case 3: frontCorners.push([cx - 1, cy - 1], [cx - 1, cy + 1]); break;
    }
    let frontFilled = 0;
    for (const [x, y] of frontCorners) {
      if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || (y >= 0 && board[y]?.[x])) {
        frontFilled++;
      }
    }
    return frontFilled >= 2 ? 'full' : 'mini';
  }
  return 'none';
}

interface RhythmiaProps {
  onQuit?: () => void;
  onGameEnd?: (stats: { score: number; lines: number; bestCombo: number }) => void;
}

/**
 * Rhythmia - A rhythm-based Tetris game with full game loop:
 * World Creation → Dig → Item Drop → Craft → Firepower → Collapse → Reload → Next World
 */
export default function Rhythmia({ onQuit, onGameEnd }: RhythmiaProps) {
  // Device type detection for responsive layouts
  const deviceInfo = useDeviceType();
  const { type: deviceType, isLandscape } = deviceInfo;

  // Ref for board area to compute particle spawn positions
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Compute responsive CSS class names
  const responsiveClassName = useMemo(() => {
    const classes = [styles.body];

    if (deviceType === 'mobile') {
      classes.push(styles.deviceMobile);
    } else if (deviceType === 'tablet') {
      classes.push(styles.deviceTablet);
    } else {
      classes.push(styles.deviceDesktop);
      if (deviceInfo.viewportWidth >= 1800) {
        classes.push(styles.deviceDesktopLarge);
      }
    }

    if (isLandscape && deviceType !== 'desktop') {
      classes.push(styles.landscape);
    }

    return classes.filter(Boolean).join(' ');
  }, [deviceType, isLandscape, deviceInfo.viewportWidth]);

  // Get CSS custom properties for responsive sizing
  const responsiveCSSVars = useMemo(() => getResponsiveCSSVars(deviceInfo), [deviceInfo]);

  // Game state and refs
  const gameState = useGameState();
  const audio = useAudio();
  const vfx = useRhythmVFX();
  // Stable ref for vfx — useRhythmVFX() returns a new object every render,
  // so using vfx directly as an effect dependency would restart those effects
  // on every render. The ref always holds the latest value without triggering re-runs.
  const vfxRef = useRef(vfx);
  vfxRef.current = vfx;
  const boardElRef = useRef<HTMLDivElement>(null);
  const beatBarRef = useRef<HTMLDivElement>(null);

  const [pauseStateBeforeOverlay, setPauseStateBeforeOverlay] = useState(false);

  // Judgment display mode: 'text' (PERFECT!, GREAT!, etc.) or 'score' (+1600, etc.)
  const [judgmentDisplayMode, setJudgmentDisplayMode] = useState<JudgmentDisplayMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rhythmia_judgment_mode');
        if (stored === 'score' || stored === 'text') return stored;
      } catch { /* ignore */ }
    }
    return 'text';
  });

  const toggleJudgmentMode = useCallback(() => {
    setJudgmentDisplayMode(prev => {
      const next = prev === 'text' ? 'score' : 'text';
      try { localStorage.setItem('rhythmia_judgment_mode', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Show action message (T-spin, Tetris, Back-to-Back) on the board
  const showActionMessage = useCallback((lines: string[], color: string) => {
    const id = ++actionIdRef.current;
    setActionToasts(prev => [...prev, { id, lines, color }]);
    window.setTimeout(() => {
      setActionToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  // Feature settings (persisted in localStorage)
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rhythmia_features');
        if (stored) return { ...DEFAULT_FEATURE_SETTINGS, ...JSON.parse(stored) };
      } catch { /* ignore */ }
    }
    return DEFAULT_FEATURE_SETTINGS;
  });

  const handleFeatureSettingsUpdate = useCallback((newSettings: FeatureSettings) => {
    setFeatureSettings(newSettings);
    try { localStorage.setItem('rhythmia_features', JSON.stringify(newSettings)); } catch { /* ignore */ }
  }, []);

  // Per-game stat tracking for advancements
  const gamePerfectBeatsRef = useRef(0);
  const gameBestComboRef = useRef(0);
  const gameTetrisClearsRef = useRef(0);
  const gameTSpinsRef = useRef(0);
  const gameHardDropsRef = useRef(0);
  const gamePiecesPlacedRef = useRef(0);
  const gameWorldsClearedRef = useRef(0);
  const pendingCheckpointRef = useRef(false);
  const advRecordedRef = useRef(false);
  const liveNotifiedRef = useRef<Set<string>>(new Set());
  const [toastIds, setToastIds] = useState<string[]>([]);

  // Speed tracking — sliding window timestamps for T-spin (30s) and Tetris (60s)
  const tSpinTimestampsRef = useRef<number[]>([]);
  const tetrisTimestampsRef = useRef<number[]>([]);
  const bestTSpinsIn30sRef = useRef(0);
  const bestTetrisIn60sRef = useRef(0);

  // T-Spin tracking
  const lastMoveWasRotationRef = useRef(false);

  // Back-to-Back tracking — consecutive difficult clears (Tetris or T-spin clear)
  const lastClearWasDifficultRef = useRef(false);

  // Action display (T-spin, Tetris, Back-to-Back) — stacking toasts
  const [actionToasts, setActionToasts] = useState<{ id: number; lines: string[]; color: string }[]>([]);
  const actionIdRef = useRef(0);

  // Lock delay — grace period after piece lands before locking
  const lockStartTimeRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);

  // Mouse controls state — tracks last column to avoid redundant moves,
  // last soft drop time to rate-limit to match keyboard SDF,
  // and held-button flag for game-loop-driven soft drop
  const mouseLastColRef = useRef<number | null>(null);
  const mouseLastSoftDropRef = useRef(0);
  const mouseHeldRef = useRef(false);

  // Stable refs for callbacks used inside setInterval (avoids stale closures + dep churn)
  const vfxEmitRef = useRef(vfx.emit);
  vfxEmitRef.current = vfx.emit;

  const {
    board,
    currentPiece,
    nextPiece,
    holdPiece,
    canHold,
    score,
    combo,
    lines,
    level,
    gameOver,
    isPaused,
    isPlaying,
    worldIdx,
    stageNumber,
    terrainSeed,
    beatPhase,
    judgmentText,
    judgmentColor,
    judgmentScore,
    showJudgmentAnim,
    boardBeat,
    boardShake,
    scorePop,
    colorTheme,
    // Game loop
    gamePhase,
    inventory,
    floatingItems,
    terrainParticles,
    // Rogue-like cards
    equippedCards,
    showCardSelect,
    offeredCards,
    activeEffects,
    absorbingCardId,
    // Game mode
    gameMode,
    // Protocol modifiers
    protocolMods,
    protocolModsRef,
    // Terrain phase
    terrainPhase,
    tdBeatsRemaining,
    // Dragon gauge
    dragonGauge,
    // Treasure box
    currentTreasureBox,
    showTreasureBox,
    // Tower defense
    enemies,
    bullets,
    // Terrain (vanilla)
    terrainDestroyedCount,
    terrainTotal,
    // Refs
    boardRef,
    currentPieceRef,
    canHoldRef,
    scoreRef,
    comboRef,
    linesRef,
    dasRef,
    arrRef,
    sdfRef,
    levelRef,
    gameOverRef,
    isPausedRef,
    worldIdxRef,
    stageNumberRef,
    beatPhaseRef,
    activeEffectsRef,
    enemiesRef,
    gameModeRef,
    terrainPhaseRef,
    tdBeatsRemainingRef,
    gamePhaseRef,
    keyStatesRef,
    gameLoopRef,
    beatTimerRef,
    lastBeatRef,
    lastGravityRef,
    // Actions
    setBoard,
    setCurrentPiece,
    setHoldPiece,
    setCanHold,
    setScore,
    setCombo,
    setLines,
    setLevel,
    setIsPaused,
    setWorldIdx,
    setBeatPhase,
    setBoardBeat,
    setColorTheme,
    setGamePhase,
    spawnPiece,
    showJudgment,
    updateScore,
    triggerBoardShake,
    initGame,
    handleTerrainReady,
    destroyTerrain,
    startNewStage,
    terrainDestroyedCountRef,
    terrainTotalRef,
    // Game loop actions
    spawnItemDrops,
    spawnTerrainParticles,
    enterCardSelect,
    selectCard,
    skipCardSelect,
    finishAbsorption,
    consumeComboGuard,
    consumeShield,
    // Dragon gauge actions
    chargeDragonFury,
    chargeDragonMight,
    isDragonBreathReady,
    triggerDragonBreath,
    endDragonBreath,
    dragonGaugeRef,
    // Treasure box actions
    openTreasureBox,
    finishTreasureBox,
    // Elemental actions
    spawnElementOrbs,
    tryTriggerReaction,
    // Terrain phase actions
    enterCheckpoint,
    completeWave,
    setTdBeatsRemaining,
    // Tower defense actions
    spawnEnemies,
    updateEnemies,
    killEnemies,
    fireBullet,
    updateBullets,
    setGameOver,
  } = gameState;

  const {
    das, arr, sdf,
    setDas, setArr, setSdf,
  } = gameState;

  const { keybinds, setKeybind, resetKeybinds, defaults: defaultKeybinds } = useKeybinds();

  const { initAudio, playTone, playDrum, playLineClear, playHardDropSound, playRotateSound, playShootSound, playKillSound, playDragonChargeTick, playDragonGaugeFull, playDragonRoar, playDragonFireStart, playDragonFireStop } = audio;

  // ===== Corruption & Anomaly System =====
  const handleCorruptionSpawnEnemy = useCallback((gx: number, gz: number) => {
    gameState.spawnEnemyAtCell(gx, gz);
  }, [gameState]);

  const corruption = useCorruptionSystem({
    isPlaying,
    isPaused,
    gameOver,
    terrainPhase,
    onCorruptionSpawnEnemy: handleCorruptionSpawnEnemy,
  });

  // ===== Galaxy TD System (ring around board during dig phase) =====
  const galaxyTD = useGalaxyTD({
    isPlaying,
    isPaused,
    gameOver,
    terrainPhase,
  });
  const galaxyTDTickRef = useRef(galaxyTD.tick);
  galaxyTDTickRef.current = galaxyTD.tick;
  const galaxyTDOnLineClearRef = useRef(galaxyTD.onLineClear);
  galaxyTDOnLineClearRef.current = galaxyTD.onLineClear;

  // Line clear pulse for tower aura visual
  const [galaxyLineClearPulse, setGalaxyLineClearPulse] = useState(false);
  const galaxyPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs for tower defense callbacks used in beat timer setInterval
  const spawnEnemiesRef = useRef(spawnEnemies);
  spawnEnemiesRef.current = spawnEnemies;
  const updateEnemiesRef = useRef(updateEnemies);
  updateEnemiesRef.current = updateEnemies;
  const setGameOverRef = useRef(setGameOver);
  setGameOverRef.current = setGameOver;
  const fireBulletRef = useRef(fireBullet);
  fireBulletRef.current = fireBullet;
  const updateBulletsRef = useRef(updateBullets);
  updateBulletsRef.current = updateBullets;
  const playShootSoundRef = useRef(playShootSound);
  playShootSoundRef.current = playShootSound;
  const playKillSoundRef = useRef(playKillSound);
  playKillSoundRef.current = playKillSound;
  const playDragonChargeTickRef = useRef(playDragonChargeTick);
  playDragonChargeTickRef.current = playDragonChargeTick;
  const playDragonGaugeFullRef = useRef(playDragonGaugeFull);
  playDragonGaugeFullRef.current = playDragonGaugeFull;
  const playDragonRoarRef = useRef(playDragonRoar);
  playDragonRoarRef.current = playDragonRoar;
  const playDragonFireStartRef = useRef(playDragonFireStart);
  playDragonFireStartRef.current = playDragonFireStart;
  const playDragonFireStopRef = useRef(playDragonFireStop);
  playDragonFireStopRef.current = playDragonFireStop;
  const destroyTerrainRef = useRef(destroyTerrain);
  destroyTerrainRef.current = destroyTerrain;
  const startNewStageRef = useRef(startNewStage);
  startNewStageRef.current = startNewStage;
  const enterCheckpointRef = useRef(enterCheckpoint);
  enterCheckpointRef.current = enterCheckpoint;
  const completeWaveRef = useRef(completeWave);
  completeWaveRef.current = completeWave;
  const addGarbageRowsRef = useRef(gameState.addGarbageRows);
  addGarbageRowsRef.current = gameState.addGarbageRows;
  const triggerBoardShakeRef = useRef(triggerBoardShake);
  triggerBoardShakeRef.current = triggerBoardShake;
  const spawnFromCorruptionRef = useRef(corruption.spawnFromCorruption);
  spawnFromCorruptionRef.current = corruption.spawnFromCorruption;

  // Helper: get center of board area for particle/item spawn origin
  const getBoardCenter = useCallback((): { x: number; y: number } => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, []);

  // Move piece in given direction
  const movePiece = useCallback((dx: number, dy: number): boolean => {
    if (!currentPiece || gameOver || isPaused) return false;
    const piece = currentPieceRef.current;
    const boardState = boardRef.current;

    if (!piece) return false;

    const newPiece: Piece = {
      ...piece,
      x: piece.x + dx,
      y: piece.y + dy,
    };

    if (isValidPosition(newPiece, boardState)) {
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      lastMoveWasRotationRef.current = false;
      return true;
    }
    return false;
  }, [currentPiece, gameOver, isPaused, setCurrentPiece, currentPieceRef, boardRef]);

  // Horizontal move with lock delay reset
  const moveHorizontal = useCallback((dx: number): boolean => {
    const result = movePiece(dx, 0);
    if (result && lockStartTimeRef.current !== null) {
      const piece = currentPieceRef.current;
      if (piece) {
        if (isValidPosition({ ...piece, y: piece.y + 1 }, boardRef.current)) {
          // Moved off ground
          lockStartTimeRef.current = null;
        } else if (lockMovesRef.current < MAX_LOCK_MOVES) {
          // Still on ground — reset lock timer
          lockMovesRef.current++;
          lockStartTimeRef.current = performance.now();
        }
      }
    }
    return result;
  }, [movePiece, currentPieceRef, boardRef]);

  // Rotate piece
  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (!currentPiece || gameOver || isPaused) return;
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;

    const rotatedPiece = tryRotation(piece, direction, boardRef.current);
    if (rotatedPiece) {
      // Emit rotation trail VFX before updating piece
      vfxRef.current.emit({
        type: 'rotation',
        pieceType: piece.type,
        boardX: piece.x,
        boardY: piece.y,
        fromRotation: piece.rotation,
        toRotation: rotatedPiece.rotation,
      });

      setCurrentPiece(rotatedPiece);
      currentPieceRef.current = rotatedPiece;
      lastMoveWasRotationRef.current = true;
      playRotateSound();

      // Reset lock delay on successful rotation
      if (lockStartTimeRef.current !== null) {
        if (isValidPosition({ ...rotatedPiece, y: rotatedPiece.y + 1 }, boardRef.current)) {
          // Rotation moved piece off ground (e.g. wall kick)
          lockStartTimeRef.current = null;
        } else if (lockMovesRef.current < MAX_LOCK_MOVES) {
          // Still on ground — reset lock timer
          lockMovesRef.current++;
          lockStartTimeRef.current = performance.now();
        }
      }
    }
  }, [currentPiece, gameOver, isPaused, setCurrentPiece, currentPieceRef, boardRef, gameOverRef, isPausedRef, playRotateSound]);

  // Process horizontal DAS/ARR
  const processHorizontalDasArr = useCallback((direction: 'left' | 'right', currentTime: number) => {
    const state = keyStatesRef.current[direction];
    if (!state.pressed || isPausedRef.current || gameOverRef.current) return;

    const dx = direction === 'left' ? -1 : 1;
    const timeSincePress = currentTime - state.pressTime;
    const currentDas = dasRef.current;
    const currentArr = arrRef.current;

    if (!state.dasCharged) {
      if (timeSincePress >= currentDas) {
        state.dasCharged = true;
        state.lastMoveTime = currentTime;

        if (currentArr === 0) {
          while (moveHorizontal(dx)) { }
        } else {
          moveHorizontal(dx);
        }
      }
    } else {
      if (currentArr === 0) {
        while (moveHorizontal(dx)) { }
      } else {
        const timeSinceLastMove = currentTime - state.lastMoveTime;
        if (timeSinceLastMove >= currentArr) {
          moveHorizontal(dx);
          state.lastMoveTime = currentTime;
        }
      }
    }
  }, [moveHorizontal, keyStatesRef, isPausedRef, gameOverRef, dasRef, arrRef]);

  // Process soft drop (SDF)
  const processSoftDrop = useCallback((currentTime: number) => {
    const state = keyStatesRef.current.down;
    if (!state.pressed || isPausedRef.current || gameOverRef.current) return;

    const currentSdf = sdfRef.current;
    const timeSinceLastMove = currentTime - state.lastMoveTime;

    if (currentSdf === 0) {
      while (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
    } else if (timeSinceLastMove >= currentSdf) {
      if (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
      state.lastMoveTime = currentTime;
    }
  }, [movePiece, setScore, keyStatesRef, isPausedRef, gameOverRef, sdfRef]);

  // Process mouse-button soft drop (driven by game loop, same SDF rate as keyboard)
  const processMouseSoftDrop = useCallback((currentTime: number) => {
    if (!mouseHeldRef.current || isPausedRef.current || gameOverRef.current) return;

    const currentSdf = sdfRef.current;
    if (currentSdf === 0) {
      // SDF=0: instant drop to bottom (matches keyboard behaviour)
      while (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
      mouseHeldRef.current = false; // one-shot instant drop
      return;
    }

    const timeSinceLastDrop = currentTime - mouseLastSoftDropRef.current;
    if (timeSinceLastDrop >= currentSdf) {
      if (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
      mouseLastSoftDropRef.current = currentTime;
    }
  }, [movePiece, setScore, sdfRef, isPausedRef, gameOverRef]);

  // Push-based live advancement check — runs every handlePieceLock(), instant toast on threshold
  const pushLiveAdvancementCheck = useCallback(() => {
    const qualifying = checkLiveGameAdvancements({
      score: scoreRef.current,
      lines: linesRef.current,
      tSpins: gameTSpinsRef.current,
      bestCombo: gameBestComboRef.current,
      perfectBeats: gamePerfectBeatsRef.current,
      worldsCleared: gameWorldsClearedRef.current,
      tetrisClears: gameTetrisClearsRef.current,
      hardDrops: gameHardDropsRef.current,
      piecesPlaced: gamePiecesPlacedRef.current,
      bestTSpinsIn30s: bestTSpinsIn30sRef.current,
      bestTetrisIn60s: bestTetrisIn60sRef.current,
    });
    const fresh = qualifying.filter(id => !liveNotifiedRef.current.has(id));
    if (fresh.length > 0) {
      fresh.forEach(id => liveNotifiedRef.current.add(id));
      setToastIds(prev => [...prev, ...fresh]);
    }
  }, []);

  // Handle piece locking and game advancement — branches by terrain phase
  const handlePieceLock = useCallback((piece: Piece, dropDistance = 0) => {
    // Clear lock state for new piece
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;
    // Reset mouse column so the new piece picks up cursor position immediately
    mouseLastColRef.current = null;

    const phase = terrainPhaseRef.current;

    // Beat judgment — centralised via getBeatJudgment() utility
    const currentBeatPhase = beatPhaseRef.current;
    const beatExtend = activeEffectsRef.current.beatExtendBonus || 0;
    const beatWindowMod = protocolModsRef.current.beatWindowMultiplier;
    const timing = getBeatJudgment(currentBeatPhase, beatExtend, beatWindowMod);
    let mult = getBeatMultiplier(timing);

    // Track pieces placed for advancements
    gamePiecesPlacedRef.current++;

    // Determine combo for this placement (before updating state)
    const prevCombo = comboRef.current;
    let newCombo = 0;
    const onBeat = timing !== 'miss';

    if (timing !== 'miss') {
      // On-beat — multiplier already set by getBeatMultiplier above
      newCombo = prevCombo + 1;
      setCombo(newCombo);
    } else {
      // Combo guard / shield — try to preserve combo before breaking
      let comboSaved = false;
      if (comboRef.current > 0) {
        if (consumeComboGuard()) {
          comboSaved = true;
          showJudgment('GUARD!', '#4FC3F7');
        } else if (consumeShield()) {
          comboSaved = true;
          showJudgment('SHIELD!', '#CE93D8');
        }
      }

      if (comboSaved) {
        // Keep combo alive — don't break
        vfxRef.current.emit({ type: 'comboChange', combo: comboRef.current, onBeat: false });
      } else {
        // VFX: combo broken — end fever if active
        if (prevCombo >= 10) {
          vfxRef.current.emit({ type: 'feverEnd' });
        }
        if (prevCombo > 0) {
          showJudgment('MISS', '#FF4444');
          // Emit combo break particle effect — intensity scales with lost combo
          vfxRef.current.emit({ type: 'comboBreak', lostCombo: prevCombo });
        }
        setCombo(0);
        vfxRef.current.emit({ type: 'comboChange', combo: 0, onBeat: false });
      }
    }

    // T-Spin detection (before locking to board)
    const tSpin = detectTSpin(piece, boardRef.current, lastMoveWasRotationRef.current);

    // Lock piece onto the board — blocks above the visible area (in the
    // buffer zone) are saved in memory, matching standard Tetris behaviour.
    // Only Block Out (piece can't spawn) ends the game; locking above
    // the skyline does not.
    const newBoard = lockPiece(piece, boardRef.current);

    // Detect which rows will be cleared (before clearing) for VFX positioning
    const rowsToClear: number[] = [];
    for (let y = BUFFER_ZONE; y < BOARD_HEIGHT; y++) {
      if (newBoard[y].every(cell => cell !== null)) {
        rowsToClear.push(y);
      }
    }

    const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);

    setBoard(clearedBoard);
    boardRef.current = clearedBoard;

    // Calculate score with rhythm multiplier, combo_amplify, and protocol score bonus
    const amplifiedCombo = Math.max(1, Math.floor(comboRef.current * activeEffectsRef.current.comboAmplifyFactor));
    const baseScore = dropDistance * 2 + [0, 100, 300, 500, 800][clearedLines] * levelRef.current;
    const finalScore = Math.round(baseScore * mult * amplifiedCombo * protocolModsRef.current.scoreMultiplier);
    updateScore(scoreRef.current + finalScore);

    // Show judgment with earned score — called after score calc so score display mode works
    if (timing !== 'miss') {
      const judgmentConfig = {
        perfect: { text: 'PERFECT!', color: '#FFD700' },
        great: { text: 'GREAT!', color: '#00E5FF' },
        good: { text: 'GOOD', color: '#76FF03' },
      } as const;

      showJudgment(judgmentConfig[timing].text, judgmentConfig[timing].color, finalScore);

      if (timing === 'perfect') {
        playTone(1047, 0.2, 'triangle');
      } else if (timing === 'great') {
        playTone(880, 0.15, 'triangle');
      } else {
        playTone(660, 0.1, 'triangle');
      }

      // Track advancement stats
      if (timing === 'perfect') {
        gamePerfectBeatsRef.current++;
      }
      if (newCombo > gameBestComboRef.current) {
        gameBestComboRef.current = newCombo;
      }

      // VFX: combo change event
      vfxRef.current.emit({ type: 'comboChange', combo: newCombo, onBeat: true });

      // VFX: fever mode trigger at combo 10+
      if (newCombo >= 10 && prevCombo < 10) {
        vfxRef.current.emit({ type: 'feverStart', combo: newCombo });
      }
    } else if (prevCombo > 0) {
      showJudgment('MISS', '#FF4444', 0);
    }

    // Compose and show action messages (T-spin, Tetris, Back-to-Back)
    {
      const isDifficultClear = clearedLines > 0 && (clearedLines === 4 || tSpin !== 'none');
      const msgLines: string[] = [];
      let msgColor = '#ffffff';

      // Back-to-Back detection
      if (isDifficultClear && lastClearWasDifficultRef.current) {
        msgLines.push('BACK-TO-BACK');
      }

      // T-spin message + speed tracking + per-game count
      if (tSpin !== 'none') {
        const mini = tSpin === 'mini' ? 'MINI ' : '';
        const clearName = clearedLines === 0 ? '' :
                          clearedLines === 1 ? ' SINGLE' :
                          clearedLines === 2 ? ' DOUBLE' :
                          clearedLines === 3 ? ' TRIPLE' : '';
        msgLines.push(`T-SPIN ${mini}${clearName}`.trim() + '!');
        msgColor = tSpin === 'full' ? '#A000F0' : '#C070FF';
        gameTSpinsRef.current++;
        // Speed tracking: T-spins in 30s window
        const now = Date.now();
        tSpinTimestampsRef.current.push(now);
        tSpinTimestampsRef.current = tSpinTimestampsRef.current.filter(t => now - t <= 30000);
        if (tSpinTimestampsRef.current.length > bestTSpinsIn30sRef.current) {
          bestTSpinsIn30sRef.current = tSpinTimestampsRef.current.length;
        }
      } else if (clearedLines === 4) {
        msgLines.push('TETRIS!');
        msgColor = '#00F0F0';
        // Speed tracking: Tetris clears in 60s window
        const now = Date.now();
        tetrisTimestampsRef.current.push(now);
        tetrisTimestampsRef.current = tetrisTimestampsRef.current.filter(t => now - t <= 60000);
        if (tetrisTimestampsRef.current.length > bestTetrisIn60sRef.current) {
          bestTetrisIn60sRef.current = tetrisTimestampsRef.current.length;
        }
      }

      // Update B2B state (only affected by line clears)
      if (clearedLines > 0) {
        lastClearWasDifficultRef.current = isDifficultClear;
      }

      if (msgLines.length > 0) {
        showActionMessage(msgLines, msgColor);
      }
    }

    // ===== Mandarin Fever Dragon Gauge Charging =====
    if (dragonGaugeRef.current.enabled && !dragonGaugeRef.current.isBreathing) {
      let gaugeChanged = false;

      // Charge Fury from T-spins
      if (tSpin !== 'none') {
        const tSpinType = tSpin === 'mini' ? 'mini' : 'full';
        const oldFury = dragonGaugeRef.current.furyGauge;
        const newFury = chargeDragonFury(tSpinType as 'mini' | 'full', clearedLines);
        if (newFury > oldFury) {
          vfxRef.current.emit({ type: 'dragonGaugeCharge', gauge: 'fury', amount: newFury - oldFury, newValue: newFury });
          playDragonChargeTickRef.current(newFury);
          gaugeChanged = true;
        }
      }

      // Charge Might from Tetrises (4-line) and Triples (3-line)
      if (clearedLines >= 3) {
        const oldMight = dragonGaugeRef.current.mightGauge;
        const newMight = chargeDragonMight(clearedLines);
        if (newMight > oldMight) {
          vfxRef.current.emit({ type: 'dragonGaugeCharge', gauge: 'might', amount: newMight - oldMight, newValue: newMight });
          playDragonChargeTickRef.current(newMight);
          gaugeChanged = true;
        }
      }

      // Check if Dragon Breath should trigger
      if (gaugeChanged && isDragonBreathReady()) {
        playDragonGaugeFullRef.current();

        // Delay breath slightly for gauge-full chime to play
        setTimeout(() => {
          triggerDragonBreath();
          triggerBoardShake();
          playDragonRoarRef.current();
          playDragonFireStartRef.current();
          vfxRef.current.emit({ type: 'dragonBreathStart' });
          showActionMessage(['DRAGON BREATH!', '龍のブレス！'], '#FFB300');

          // End breath after duration
          setTimeout(() => {
            endDragonBreath();
            playDragonFireStopRef.current();
            vfxRef.current.emit({ type: 'dragonBreathEnd' });
          }, DRAGON_BREATH_DURATION);
        }, 500);
      }
    }

    // Reset rotation tracking for next piece
    lastMoveWasRotationRef.current = false;

    if (clearedLines > 0) {
      // Track tetris clears (4 lines at once) for advancements
      if (clearedLines === 4) {
        gameTetrisClearsRef.current++;
      }

      const center = getBoardCenter();

      if (phase === 'td') {
        // === TD PHASE: Kill enemies when lines are cleared ===
        const killCount = Math.ceil(clearedLines * ENEMIES_KILLED_PER_LINE * mult * amplifiedCombo);
        killEnemies(killCount);

        // Item drops
        spawnItemDrops(killCount, center.x, center.y);
      } else {
        // === DIG PHASE: Destroy terrain blocks ===
        // terrain_surge bonus only applies on perfect beats
        const surgeBonus = timing === 'perfect' ? activeEffectsRef.current.terrainSurgeBonus : 0;
        const damage = Math.ceil(clearedLines * TERRAIN_DAMAGE_PER_LINE * mult * amplifiedCombo * (1 + surgeBonus));
        const remaining = destroyTerrain(damage);

        // Galaxy TD: line clears power up towers on the ring
        galaxyTDOnLineClearRef.current(clearedLines);

        // Flash tower aura pulse
        setGalaxyLineClearPulse(true);
        if (galaxyPulseTimerRef.current) clearTimeout(galaxyPulseTimerRef.current);
        galaxyPulseTimerRef.current = setTimeout(() => setGalaxyLineClearPulse(false), 600);

        // Item drops from terrain
        spawnItemDrops(damage, center.x, center.y);

        // Check if terrain is fully destroyed → enter checkpoint for TD phase
        if (remaining <= 0) {
          if (gamePhaseRef.current === 'PLAYING') {
            gameWorldsClearedRef.current++;
            enterCheckpoint();
          } else {
            // Terrain fully destroyed during a non-PLAYING phase (e.g. WORLD_CREATION).
            // Defer the checkpoint until the game phase returns to PLAYING.
            pendingCheckpointRef.current = true;
          }
        }
      }

      // VFX: line clear equalizer bars + glitch particles
      vfxRef.current.emit({
        type: 'lineClear',
        rows: rowsToClear,
        count: clearedLines,
        onBeat,
        combo: comboRef.current,
      });

      // Particle effects (both modes)
      spawnTerrainParticles(center.x, center.y, clearedLines * TERRAIN_PARTICLES_PER_LINE);

      // ===== Elemental Orb Spawning =====
      const orbVfxEvents = spawnElementOrbs(piece.type, clearedLines, onBeat, center.x, center.y);
      for (const orbEvt of orbVfxEvents) {
        vfxRef.current.emit({ type: 'elementOrbSpawn', element: orbEvt.element, boardX: orbEvt.boardX, boardY: orbEvt.boardY });
      }

      // Try to trigger an elemental reaction
      const reactionResult = tryTriggerReaction();
      if (reactionResult) {
        vfxRef.current.emit({ type: 'reactionTrigger', reaction: reactionResult.reactionType, intensity: 1.0 });

        if (!reactionResult.success) {
          // Corruption backfire
          vfxRef.current.emit({ type: 'corruptionBackfire' });
        }
      }

      playLineClear(clearedLines, worldIdxRef.current);
      triggerBoardShake();
    }

    setLines(prev => {
      const newLines = prev + clearedLines;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });

    // Live advancement check after stats update
    pushLiveAdvancementCheck();

    const spawned = spawnPiece();
    setCurrentPiece(spawned);
    currentPieceRef.current = spawned;
  }, [
    terrainPhaseRef, beatPhaseRef, comboRef, boardRef, levelRef, scoreRef, activeEffectsRef, stageNumberRef,
    setCombo, setBoard, setLines, setLevel, setCurrentPiece, setGameOver,
    showJudgment, updateScore, triggerBoardShake, spawnPiece, playTone, playLineClear,
    currentPieceRef, vfx, killEnemies, destroyTerrain, enterCheckpoint,
    getBoardCenter, spawnTerrainParticles, spawnItemDrops, pushLiveAdvancementCheck,
    consumeComboGuard, consumeShield, showActionMessage,
    chargeDragonFury, chargeDragonMight, isDragonBreathReady, triggerDragonBreath, endDragonBreath,
    spawnElementOrbs, tryTriggerReaction,
  ]);

  // Stable ref for handlePieceLock — used in game loop to avoid dep churn
  const handlePieceLockRef = useRef(handlePieceLock);
  handlePieceLockRef.current = handlePieceLock;

  // Hard drop
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;

    let newPiece = { ...piece };
    let dropDistance = 0;

    while (isValidPosition({ ...newPiece, y: newPiece.y + 1 }, boardRef.current)) {
      newPiece.y++;
      dropDistance++;
    }

    // Track hard drops for advancements
    gameHardDropsRef.current++;

    // VFX: hard drop impact particles
    if (dropDistance > 0) {
      vfxRef.current.emit({
        type: 'hardDrop',
        pieceType: newPiece.type,
        boardX: newPiece.x,
        boardY: newPiece.y,
        dropDistance,
      });
    }

    // Hard drop bypasses lock delay — lock immediately
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;

    playHardDropSound();
    handlePieceLock(newPiece, dropDistance);
  }, [currentPiece, gameOver, isPaused, currentPieceRef, gameOverRef, isPausedRef, boardRef, handlePieceLock, playHardDropSound]);

  // Hold current piece
  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || !canHold) return;

    // Clear lock state — swapping to a new piece
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;
    lastMoveWasRotationRef.current = false;

    const currentType = currentPiece.type;

    if (holdPiece === null) {
      setHoldPiece(currentType);
      const spawned = spawnPiece();
      setCurrentPiece(spawned);
      currentPieceRef.current = spawned;
    } else {
      const heldType = holdPiece;
      setHoldPiece(currentType);

      const newPiece = createSpawnPiece(heldType);

      if (isValidPosition(newPiece, board)) {
        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
      } else {
        setHoldPiece(heldType);
        return;
      }
    }

    setCanHold(false);
    playRotateSound();
  }, [
    currentPiece, gameOver, isPaused, canHold, holdPiece, board,
    setHoldPiece, setCurrentPiece, setCanHold, spawnPiece,
    currentPieceRef, playRotateSound,
  ]);

  // Gravity tick — moves piece down; lock delay is handled in the game loop
  const tick = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;

    const newPiece: Piece = {
      ...piece,
      y: piece.y + 1,
    };

    if (isValidPosition(newPiece, boardRef.current)) {
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
    }
    // If piece can't move down, do nothing — lock delay check in game loop handles it
  }, [currentPiece, gameOver, isPaused, currentPieceRef, gameOverRef, isPausedRef, boardRef, setCurrentPiece]);

  // Stable callback for toast dismiss — avoids resetting the toast timer on every render
  const dismissToast = useCallback(() => setToastIds([]), []);

  // Tutorial state — shows on first play
  const [showTutorial, setShowTutorial] = useState(false);

  // Pending protocol ID for tutorial flow (stores selection until tutorial completes)
  const pendingProtocolIdRef = useRef(0);

  // Actually start the game (after tutorial or directly)
  const launchGame = useCallback((protocolId: number = 0) => {
    initAudio();
    const mods = getModifiers(protocolId);
    initGame('vanilla', mods);

    // Reset per-game advancement tracking
    gamePerfectBeatsRef.current = 0;
    gameBestComboRef.current = 0;
    gameTetrisClearsRef.current = 0;
    gameTSpinsRef.current = 0;
    gameHardDropsRef.current = 0;
    gamePiecesPlacedRef.current = 0;
    gameWorldsClearedRef.current = 0;
    pendingCheckpointRef.current = false;
    advRecordedRef.current = false;
    liveNotifiedRef.current = new Set();
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;
    lastMoveWasRotationRef.current = false;
    lastClearWasDifficultRef.current = false;
    tSpinTimestampsRef.current = [];
    tetrisTimestampsRef.current = [];
    bestTSpinsIn30sRef.current = 0;
    bestTetrisIn60sRef.current = 0;
    setToastIds([]);
    setActionToasts([]);
    corruption.reset();
    galaxyTD.reset();
  }, [initAudio, initGame, corruption, galaxyTD]);

  // Start game — intercept for tutorial on first play
  const startGame = useCallback((protocolId: number = 0) => {
    if (!hasTutorialBeenSeen()) {
      pendingProtocolIdRef.current = protocolId;
      setShowTutorial(true);
      return;
    }
    launchGame(protocolId);
  }, [launchGame]);

  // Tutorial completion — proceed with game launch using stored protocol
  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    launchGame(pendingProtocolIdRef.current);
  }, [launchGame]);

  // Record advancement stats when game ends
  useEffect(() => {
    if (gameOver && !advRecordedRef.current) {
      advRecordedRef.current = true;
      const result = recordGameEnd({
        score: scoreRef.current,
        lines: linesRef.current,
        tSpins: gameTSpinsRef.current,
        bestCombo: gameBestComboRef.current,
        perfectBeats: gamePerfectBeatsRef.current,
        worldsCleared: gameWorldsClearedRef.current,
        tetrisClears: gameTetrisClearsRef.current,
        hardDrops: gameHardDropsRef.current,
        piecesPlaced: gamePiecesPlacedRef.current,
        bestTSpinsIn30s: bestTSpinsIn30sRef.current,
        bestTetrisIn60s: bestTetrisIn60sRef.current,
      });
      if (result.newlyUnlockedIds.length > 0) {
        setToastIds(prev => [...prev, ...result.newlyUnlockedIds]);
      }
      // Fire onGameEnd callback with stats for external consumers
      onGameEnd?.({
        score: scoreRef.current,
        lines: linesRef.current,
        bestCombo: gameBestComboRef.current,
      });
    }
  }, [gameOver, onGameEnd]);

  // Reset beat timing when unpausing to avoid desync
  useEffect(() => {
    if (!isPaused && isPlaying && !gameOver) {
      lastBeatRef.current = Date.now();
      // Reset lock delay timer on unpause to prevent instant lock from elapsed time
      if (lockStartTimeRef.current !== null) {
        lockStartTimeRef.current = performance.now();
      }
    }
  }, [isPaused, isPlaying, gameOver, lastBeatRef]);

  // Beat timer for rhythm game — branches by terrain phase via terrainPhaseRef
  // Uses refs for vfx.emit/spawnEnemies/updateEnemies to keep deps stable
  // (vfx object recreates every render, which would reset the interval)
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const world = WORLDS[worldIdx];
    const effectiveBpm = world.bpm * protocolModsRef.current.bpmMultiplier;
    const interval = 60000 / effectiveBpm;

    lastBeatRef.current = Date.now();

    beatTimerRef.current = window.setInterval(() => {
      // Skip beat processing while paused
      if (isPausedRef.current) return;

      lastBeatRef.current = Date.now();
      setBoardBeat(true);
      playDrum(worldIdx);

      const currentTerrainPhase = terrainPhaseRef.current;

      if (currentTerrainPhase === 'td') {
        // === TD phase beat logic ===
        // Update existing enemies FIRST (move toward tower)
        const reached = updateEnemiesRef.current();

        // Spawn new enemies if wave beats remaining
        if (tdBeatsRemainingRef.current > 0) {
          spawnEnemiesRef.current(ENEMIES_PER_BEAT);
          tdBeatsRemainingRef.current--;
          setTdBeatsRemaining(tdBeatsRemainingRef.current);
        }

        // Move bullets and check collisions — returns kill count
        const kills = updateBulletsRef.current();
        if (kills > 0) {
          playKillSoundRef.current();
        }

        // Enemies reaching tower → add garbage rows instead of HP damage
        if (reached > 0) {
          addGarbageRowsRef.current(reached);
          triggerBoardShakeRef.current();
        }

        // Corruption: mature cells may spawn additional enemies (only while wave active)
        if (tdBeatsRemainingRef.current > 0) {
          spawnFromCorruptionRef.current();
        }

        // Check wave complete: no more spawning and all enemies dead
        if (!gameOverRef.current && tdBeatsRemainingRef.current <= 0 && gamePhaseRef.current === 'PLAYING') {
          const aliveCount = enemiesRef.current.filter(e => e.alive).length;
          if (aliveCount === 0) {
            completeWaveRef.current();
          }
        }
      } else {
        // === Dig phase: Galaxy TD ring tick ===
        galaxyTDTickRef.current();
      }

      // VFX: beat pulse ring — intensity scales with BPM (both modes)
      const intensity = Math.min(1, (effectiveBpm - 80) / 100);
      vfxRef.current.emit({ type: 'beat', bpm: effectiveBpm, intensity });

      setTimeout(() => setBoardBeat(false), 100);
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [isPlaying, gameOver, worldIdx, playDrum, lastBeatRef, beatTimerRef, setBoardBeat]);

  // Auto-fire bullet during TD phase (independent of beat timer)
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const bulletTimer = window.setInterval(() => {
      if (gameOverRef.current || isPausedRef.current) return;
      // Only fire during TD phase
      if (terrainPhaseRef.current !== 'td') return;
      const fired = fireBulletRef.current();
      if (fired) {
        playShootSoundRef.current();
      }
    }, BULLET_FIRE_INTERVAL);

    return () => clearInterval(bulletTimer);
  }, [isPlaying, gameOver]);

  // Beat phase animation — drives cursor via direct DOM manipulation (CSS var + data attr)
  // to avoid React re-render batching issues that cause inconsistent/missing animation on
  // some browsers. React state is updated at a throttled rate for Board's fever rainbow effect.
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let animFrame: number;
    let lastStateUpdate = 0;
    const updateBeat = () => {
      if (!gameOverRef.current) {
        // Skip phase updates while paused (freeze the beat cursor)
        if (isPausedRef.current) {
          animFrame = requestAnimationFrame(updateBeat);
          return;
        }

        const world = WORLDS[worldIdxRef.current];
        const effectiveBpm = world.bpm * protocolModsRef.current.bpmMultiplier;
        const interval = 60000 / effectiveBpm;
        const now = Date.now();
        const elapsed = now - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        beatPhaseRef.current = phase;

        // Direct DOM update — bypasses React for smooth cross-browser animation
        if (beatBarRef.current) {
          beatBarRef.current.style.setProperty('--beat-phase', String(phase));
          const beatExtend = activeEffectsRef.current?.beatExtendBonus || 0;
          const beatWindowMod = protocolModsRef.current.beatWindowMultiplier;
          const zone = getBeatJudgment(phase, beatExtend, beatWindowMod);
          if (zone !== 'miss') {
            beatBarRef.current.setAttribute('data-onbeat', zone);
          } else {
            beatBarRef.current.removeAttribute('data-onbeat');
          }
        }

        // Throttled React state update (~30fps) — only needed during fever mode
        // (combo >= 10) for the rainbow hue-shift effect. During normal play,
        // skip the state update to avoid ~30 re-renders/second on the entire tree.
        if (comboRef.current >= 10 && now - lastStateUpdate > 33) {
          setBeatPhase(phase);
          lastStateUpdate = now;
        }

        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, gameOver, gameOverRef, worldIdxRef, lastBeatRef, beatPhaseRef, comboRef, setBeatPhase]);

  // Main game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = (currentTime: number) => {
      if (!isPausedRef.current && !gameOverRef.current) {
        processHorizontalDasArr('left', currentTime);
        processHorizontalDasArr('right', currentTime);
        processSoftDrop(currentTime);
        processMouseSoftDrop(currentTime);

        const baseSpeed = Math.max(100, 1000 - (levelRef.current - 1) * 100);
        const speed = baseSpeed / ((activeEffectsRef.current?.gravitySlowFactor || 1) * protocolModsRef.current.gravityMultiplier);
        if (currentTime - lastGravityRef.current >= speed) {
          tick();
          lastGravityRef.current = currentTime;
        }

        // Lock delay check — piece gets a grace period on ground before locking
        const piece = currentPieceRef.current;
        if (piece) {
          const onGround = !isValidPosition({ ...piece, y: piece.y + 1 }, boardRef.current);
          if (onGround) {
            if (lockStartTimeRef.current === null) {
              lockStartTimeRef.current = currentTime;
            } else if (currentTime - lockStartTimeRef.current >= LOCK_DELAY) {
              handlePieceLockRef.current(piece);
            }
          } else {
            lockStartTimeRef.current = null;
          }
        }

        // Process deferred terrain checkpoint when game returns to PLAYING
        if (pendingCheckpointRef.current && gamePhaseRef.current === 'PLAYING') {
          pendingCheckpointRef.current = false;
          gameWorldsClearedRef.current++;
          enterCheckpointRef.current();
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastGravityRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, gameOver, tick, processHorizontalDasArr, processSoftDrop, processMouseSoftDrop, isPausedRef, gameOverRef, levelRef, lastGravityRef, gameLoopRef]);

  // Keyboard input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      if (e.repeat) return;

      // Don't process game inputs while card select or treasure box is showing
      if (showCardSelect || showTreasureBox) return;

      const currentTime = performance.now();

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!keyStatesRef.current.left.pressed) {
            keyStatesRef.current.right = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            keyStatesRef.current.left = {
              pressed: true,
              dasCharged: false,
              lastMoveTime: currentTime,
              pressTime: currentTime,
            };
            if (!isPaused) moveHorizontal(-1);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (!keyStatesRef.current.right.pressed) {
            keyStatesRef.current.left = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            keyStatesRef.current.right = {
              pressed: true,
              dasCharged: false,
              lastMoveTime: currentTime,
              pressTime: currentTime,
            };
            if (!isPaused) moveHorizontal(1);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!keyStatesRef.current.down.pressed) {
            keyStatesRef.current.down = {
              pressed: true,
              dasCharged: false,
              lastMoveTime: currentTime,
              pressTime: currentTime,
            };
            if (!isPaused && movePiece(0, 1)) {
              setScore(prev => prev + 1);
            }
          }
          break;

        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault();
          if (!isPaused) rotatePiece(1);
          break;

        case 'z':
        case 'Z':
        case 'Control':
          e.preventDefault();
          if (!isPaused) rotatePiece(-1);
          break;

        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          if (!isPaused) holdCurrentPiece();
          break;

        case ' ':
          e.preventDefault();
          if (!isPaused) hardDrop();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;

        case 'Escape':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          keyStatesRef.current.left = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
          break;
        case 'ArrowRight':
          keyStatesRef.current.right = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
          break;
        case 'ArrowDown':
          keyStatesRef.current.down = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, gameOver, showCardSelect, showTreasureBox, moveHorizontal, movePiece, rotatePiece, hardDrop, holdCurrentPiece, setScore, setIsPaused, keyStatesRef]);

  // Mouse input handlers — move piece by hovering over board columns,
  // hold left/right button to soft drop (driven by game loop via mouseHeldRef),
  // scroll to rotate.
  // Movement only fires when the target column actually changes to keep
  // lock delay and DAS state stable.
  useEffect(() => {
    const boardEl = boardElRef.current;
    if (!boardEl || !isPlaying || gameOver || !featureSettings.mouseControls) return;

    // Reset column tracking when effect re-mounts
    mouseLastColRef.current = null;

    // Helper: compute piece center from actual filled columns (not shape matrix width).
    // This fixes pieces like I-rotation-L where filled cells sit at column 1
    // inside a 4-wide matrix — using matrix width would place the center at
    // column 2 and prevent the piece from reaching the right wall.
    const getPieceCenter = (piece: Piece): number => {
      const shape = getShape(piece.type, piece.rotation);
      let minCol = shape[0].length;
      let maxCol = 0;
      for (const row of shape) {
        for (let c = 0; c < row.length; c++) {
          if (row[c]) {
            if (c < minCol) minCol = c;
            if (c > maxCol) maxCol = c;
          }
        }
      }
      return piece.x + Math.floor((minCol + maxCol) / 2);
    };

    // Helper: move piece center toward a target column
    const movePieceToCol = (targetCol: number) => {
      const piece = currentPieceRef.current;
      if (!piece) return;
      const pieceCenter = getPieceCenter(piece);
      const dx = targetCol - pieceCenter;
      if (dx !== 0) {
        const dir = dx > 0 ? 1 : -1;
        for (let i = 0; i < Math.abs(dx); i++) {
          if (!moveHorizontal(dir)) break;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPausedRef.current || gameOverRef.current || showCardSelect) return;
      if (!currentPieceRef.current) return;

      const rect = boardEl.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const cellWidth = rect.width / BOARD_WIDTH;
      const targetCol = Math.max(0, Math.min(BOARD_WIDTH - 1, Math.floor(relativeX / cellWidth)));

      // Skip if the target column hasn't changed — avoids redundant
      // moveHorizontal calls that would churn lock delay resets
      if (targetCol === mouseLastColRef.current) return;
      mouseLastColRef.current = targetCol;

      movePieceToCol(targetCol);
    };

    // When cursor leaves the board, push piece to the nearest wall.
    // Compare against board center to determine direction — this handles
    // exits from any edge (left, right, top, bottom corners).
    const handleMouseLeave = (e: MouseEvent) => {
      if (isPausedRef.current || gameOverRef.current || showCardSelect) return;
      if (!currentPieceRef.current) return;

      const rect = boardEl.getBoundingClientRect();
      const boardCenterX = rect.left + rect.width / 2;
      if (e.clientX < boardCenterX) {
        while (moveHorizontal(-1)) { /* push left */ }
      } else {
        while (moveHorizontal(1)) { /* push right */ }
      }
      mouseLastColRef.current = null;
    };

    // Hold button = continuous soft drop (processed by game loop via mouseHeldRef)
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      if (isPausedRef.current || gameOverRef.current || showCardSelect) return;
      mouseHeldRef.current = true;
      mouseLastSoftDropRef.current = 0; // allow immediate first drop
    };

    // Release button anywhere on the page stops soft drop
    const handleMouseUp = () => {
      mouseHeldRef.current = false;
    };

    // Prevent browser context menu over the board
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isPausedRef.current || gameOverRef.current || showCardSelect) return;
      if (e.deltaY > 0) {
        rotatePiece(1);
      } else if (e.deltaY < 0) {
        rotatePiece(-1);
      }
    };

    boardEl.addEventListener('mousemove', handleMouseMove);
    boardEl.addEventListener('mouseleave', handleMouseLeave);
    boardEl.addEventListener('mousedown', handleMouseDown);
    boardEl.addEventListener('contextmenu', handleContextMenu);
    boardEl.addEventListener('wheel', handleWheel, { passive: false });
    // Listen for mouseup on window so releasing outside the board still stops soft drop
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      boardEl.removeEventListener('mousemove', handleMouseMove);
      boardEl.removeEventListener('mouseleave', handleMouseLeave);
      boardEl.removeEventListener('mousedown', handleMouseDown);
      boardEl.removeEventListener('contextmenu', handleContextMenu);
      boardEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPlaying, gameOver, showCardSelect, showTreasureBox, featureSettings.mouseControls, moveHorizontal, rotatePiece, isPausedRef, gameOverRef, currentPieceRef]);

  // Clean up action toasts on unmount
  useEffect(() => {
    return () => { setActionToasts([]); };
  }, []);

  // Persist advancement stats and unlocks on component unmount (e.g., player leaves mid-game)
  useEffect(() => {
    return () => {
      // Only record stats if game hasn't ended normally (player left via back button)
      if (!gameOverRef.current && !advRecordedRef.current) {
        recordGameEnd({
          score: scoreRef.current,
          lines: linesRef.current,
          tSpins: gameTSpinsRef.current,
          bestCombo: gameBestComboRef.current,
          perfectBeats: gamePerfectBeatsRef.current,
          worldsCleared: gameWorldsClearedRef.current,
          tetrisClears: gameTetrisClearsRef.current,
          hardDrops: gameHardDropsRef.current,
          piecesPlaced: gamePiecesPlacedRef.current,
          bestTSpinsIn30s: bestTSpinsIn30sRef.current,
          bestTetrisIn60s: bestTetrisIn60sRef.current,
        });
      }
    };
  }, []);

  const world = WORLDS[worldIdx];

  // Map game phase to skin ambient effect intensity
  const skinEffectIntensity = useMemo((): 'idle' | 'playing' | 'intense' => {
    if (!isPlaying) return 'idle';
    if (gamePhase === 'COLLAPSE' || gamePhase === 'TRANSITION' || gamePhase === 'WORLD_CREATION') return 'intense';
    if (gamePhase === 'PLAYING') return 'playing';
    return 'idle';
  }, [isPlaying, gamePhase]);

  // Memoize alive enemy count to avoid re-filtering enemies on every render
  const aliveEnemyCount = useMemo(
    () => enemies.filter(e => e.alive).length,
    [enemies]
  );

  return (
    <div
      className={`${responsiveClassName} ${styles[`w${worldIdx}`]}`}
      style={{ ...responsiveCSSVars, position: 'relative' }}
    >
      {/* Skin ambient effects (sakura petals, sunset embers) — intensity follows game phase */}
      <SkinAmbientEffects intensity={skinEffectIntensity} />

      {/* Voxel World Background — only render during gameplay */}
      {isPlaying && featureSettings.voxelBackground && (
        <VoxelWorldBackground
          seed={terrainSeed}
          terrainPhase={terrainPhase}
          terrainDestroyedCount={terrainPhase === 'dig' ? terrainDestroyedCount : 0}
          enemies={terrainPhase === 'td' ? enemies : []}
          bullets={terrainPhase === 'td' ? bullets : []}
          corruptedCells={terrainPhase === 'td' ? corruption.corruptedCells : undefined}
          onTerrainReady={handleTerrainReady}
          worldIdx={worldIdx}
        />
      )}

      {/* Terrain destruction particle effects */}
      {featureSettings.particles && <TerrainParticles particles={terrainParticles} />}

      {/* Floating item drops from terrain */}
      <FloatingItems items={floatingItems} />

      {/* World transition overlays (creation / collapse / reload) — only during gameplay */}
      {isPlaying && (
        <WorldTransition
          phase={gamePhase}
          worldIdx={worldIdx}
          stageNumber={stageNumber}
          terrainPhase={terrainPhase}
          gameOver={gameOver}
        />
      )}

      {/* Tutorial Guide — shown on first vanilla play */}
      {showTutorial && (
        <TutorialGuide onComplete={handleTutorialComplete} />
      )}

      {/* Title Screen */}
      {!isPlaying && !gameOver && !showTutorial && (
        <TitleScreen onStart={startGame} />
      )}

      {/* Game */}
      {(isPlaying || gameOver) && (
        <div className={styles.game}>
          {/* Galaxy TD 3D ring — fullscreen behind game UI, only during dig phase */}
          {terrainPhase === 'dig' && (
            <GalaxyRing3D
              enemies={galaxyTD.enemies}
              towers={galaxyTD.towers}
              gates={galaxyTD.gates}
              waveNumber={galaxyTD.waveNumber}
              lineClearPulse={galaxyLineClearPulse}
            />
          )}

          {/* Game phase indicator */}
          <GamePhaseIndicator
            phase={gamePhase}
            stageNumber={stageNumber}
            equippedCardCount={equippedCards.length}
            terrainPhase={terrainPhase}
          />

          <ScoreDisplay score={score} scorePop={scorePop} />
          <ComboDisplay combo={combo} />
          <TerrainProgress
            terrainRemaining={terrainTotal - terrainDestroyedCount}
            terrainTotal={terrainTotal}
            stageNumber={stageNumber}
            terrainPhase={terrainPhase}
            tdBeatsRemaining={tdBeatsRemaining}
            enemyCount={aliveEnemyCount}
          />
          <WorldProgressDisplay worldIdx={worldIdx} stageNumber={stageNumber} />

          <div className={styles.gameArea} ref={gameAreaRef}>

            {/* Left sidebar: Hold + Inventory (separate containers) */}
            <div className={styles.sidePanelLeft}>
              <div className={styles.nextWrap}>
                <div className={styles.nextLabel}>HOLD (C)</div>
                <HoldPiece pieceType={holdPiece} canHold={canHold} colorTheme={colorTheme} worldIdx={worldIdx} />
              </div>
              <ItemSlots
                inventory={inventory}
                equippedCards={equippedCards}
                activeEffects={activeEffects}
              />
              {/* Mandarin Fever Dragon Gauge */}
              <DragonGauge gauge={dragonGauge} />
            </div>

            {/* Center column: Board + Beat bar + Stats */}
            <div className={styles.centerColumn}>
              <div className={styles.boardActionArea}>
              <GalaxyBoard
                galaxyActive={terrainPhase === 'dig'}
                waveNumber={galaxyTD.waveNumber}
                board={board}
                currentPiece={currentPiece}
                boardBeat={boardBeat}
                boardShake={boardShake}
                gameOver={gameOver}
                isPaused={isPaused && !showCardSelect}
                score={score}
                onRestart={() => startGame()}
                onResume={() => setIsPaused(false)}
                onQuit={onQuit}
                colorTheme={colorTheme}
                onThemeChange={setColorTheme}
                worldIdx={worldIdx}
                combo={combo}
                beatPhase={beatPhase}
                boardElRef={boardElRef}
                das={das}
                arr={arr}
                sdf={sdf}
                onDasChange={setDas}
                onArrChange={setArr}
                onSdfChange={setSdf}
                keybinds={keybinds}
                onKeybindChange={setKeybind}
                onKeybindsReset={resetKeybinds}
                defaultKeybinds={defaultKeybinds}
                featureSettings={featureSettings}
                onFeatureSettingsUpdate={handleFeatureSettingsUpdate}
                activeAnomaly={corruption.activeAnomaly}
              />
              {/* Action display toasts (T-spin, Tetris, Back-to-Back) — stacking */}
              {actionToasts.length > 0 && (
                <div className={styles.actionToastContainer}>
                  {actionToasts.map(toast => (
                    <div key={toast.id} className={styles.actionToast} style={{ '--action-color': toast.color } as React.CSSProperties}>
                      {toast.lines.map((line, i) => (
                        <div key={`${line}-${i}`} className={styles.actionLine}>
                          {line}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              </div>
              {featureSettings.beatBar && (
                <BeatBar
                  containerRef={beatBarRef}
                  beatZoneWidth={(BEAT_GOOD_WINDOW + activeEffects.beatExtendBonus) * protocolMods.beatWindowMultiplier}
                />
              )}
              <StatsPanel lines={lines} level={level} />
            </div>

            {/* Right sidebar: Next + HP bar */}
            <div className={styles.sidePanelRight}>
              <div className={styles.nextWrap}>
                <div className={styles.nextLabel}>NEXT</div>
                {nextPiece && !protocolMods.advancedRules.includes('invisible_preview') && (
                  <NextPiece pieceType={nextPiece} colorTheme={colorTheme} worldIdx={worldIdx} />
                )}
              </div>
            </div>

          </div>

          <TouchControls
            onMoveLeft={() => moveHorizontal(-1)}
            onMoveRight={() => moveHorizontal(1)}
            onMoveDown={() => movePiece(0, 1)}
            onRotateCW={() => rotatePiece(1)}
            onRotateCCW={() => rotatePiece(-1)}
            onHardDrop={hardDrop}
            onHold={holdCurrentPiece}
            isMobile={deviceType !== 'desktop'}
          />
        </div>
      )}

      {/* Rhythm VFX Canvas Overlay */}
      {featureSettings.beatVfx && (
        <RhythmVFX
          canvasRef={vfx.canvasRef}
          boardRef={boardElRef}
          onBoardGeometry={vfx.updateBoardGeometry}
          isPlaying={isPlaying && !gameOver}
          onStart={vfx.start}
          onStop={vfx.stop}
        />
      )}

      {/* Treasure box overlay */}
      {showTreasureBox && currentTreasureBox && (
        <TreasureBoxUI
          box={currentTreasureBox}
          onOpen={openTreasureBox}
          onFinish={finishTreasureBox}
        />
      )}

      {/* Rogue-like card selection overlay */}
      {(showCardSelect || gamePhase === 'CARD_ABSORBING') && (
        <CardSelectUI
          offers={offeredCards}
          inventory={inventory}
          equippedCards={equippedCards}
          onSelect={selectCard}
          onSkip={skipCardSelect}
          worldIdx={worldIdx}
          stageNumber={stageNumber}
          absorbingCardId={absorbingCardId}
          onAbsorptionComplete={finishAbsorption}
        />
      )}

      {/* Judgment */}
      <JudgmentDisplay
        text={judgmentText}
        color={judgmentColor}
        show={showJudgmentAnim}
        score={judgmentScore}
        displayMode={judgmentDisplayMode}
      />

      {/* Judgment mode toggle (text vs score) — only shown during gameplay */}
      {isPlaying && !gameOver && (
        <JudgmentModeToggle mode={judgmentDisplayMode} onToggle={toggleJudgmentMode} />
      )}

      {/* Advancement Toast */}
      {toastIds.length > 0 && (
        <AdvancementToast
          unlockedIds={toastIds}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}

