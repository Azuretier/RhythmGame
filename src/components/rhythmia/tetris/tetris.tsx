'use client';

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './VanillaGame.module.css';

// Constants and Types
import { WORLDS, BOARD_WIDTH, BOARD_HEIGHT, TERRAIN_DAMAGE_PER_LINE, TERRAIN_PARTICLES_PER_LINE, ENEMIES_PER_BEAT, ENEMIES_KILLED_PER_LINE, ENEMY_REACH_DAMAGE, MAX_HEALTH, BULLET_FIRE_INTERVAL } from './constants';
import type { Piece, GameMode } from './types';

// Advancements
import { recordGameEnd, checkLiveGameAdvancements } from '@/lib/advancements/storage';
import AdvancementToast from '../AdvancementToast';

// Dynamically import VoxelWorldBackground (Three.js requires client-side only)
const VoxelWorldBackground = dynamic(() => import('../VoxelWorldBackground'), {
  ssr: false,
});

// Hooks
import { useAudio, useGameState, useDeviceType, getResponsiveCSSVars, useRhythmVFX } from './hooks';

// Utilities
import {
  getShape,
  isValidPosition,
  tryRotation,
  lockPiece,
  clearLines,
  createSpawnPiece,
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
  TouchControls,
  RhythmVFX,
  FloatingItems,
  ItemSlots,
  CraftingUI,
  TerrainParticles,
  WorldTransition,
  GamePhaseIndicator,
  HealthManaHUD,
} from './components';

/**
 * Rhythmia - A rhythm-based Tetris game with full game loop:
 * World Creation → Dig → Item Drop → Craft → Firepower → Collapse → Reload → Next World
 */
export default function Rhythmia() {
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

  // Per-game stat tracking for advancements
  const gamePerfectBeatsRef = useRef(0);
  const gameBestComboRef = useRef(0);
  const gameTetrisClearsRef = useRef(0);
  const gameHardDropsRef = useRef(0);
  const gamePiecesPlacedRef = useRef(0);
  const gameWorldsClearedRef = useRef(0);
  const advRecordedRef = useRef(false);
  const liveNotifiedRef = useRef<Set<string>>(new Set());
  const [toastIds, setToastIds] = useState<string[]>([]);

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
    craftedCards,
    showCraftUI,
    damageMultiplier,
    // Game mode
    gameMode,
    // Tower defense
    enemies,
    bullets,
    towerHealth,
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
    damageMultiplierRef,
    enemiesRef,
    gameModeRef,
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
    craftCard,
    canCraftCard,
    toggleCraftUI,
    // Tower defense actions
    spawnEnemies,
    updateEnemies,
    killEnemies,
    fireBullet,
    updateBullets,
    setGameOver,
    setTowerHealth,
    towerHealthRef,
  } = gameState;

  const { initAudio, playTone, playDrum, playLineClear, playHardDropSound, playRotateSound, playShootSound, playKillSound } = audio;

  // Stable refs for tower defense callbacks used in beat timer setInterval
  const spawnEnemiesRef = useRef(spawnEnemies);
  spawnEnemiesRef.current = spawnEnemies;
  const updateEnemiesRef = useRef(updateEnemies);
  updateEnemiesRef.current = updateEnemies;
  const setTowerHealthRef = useRef(setTowerHealth);
  setTowerHealthRef.current = setTowerHealth;
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
  const destroyTerrainRef = useRef(destroyTerrain);
  destroyTerrainRef.current = destroyTerrain;
  const startNewStageRef = useRef(startNewStage);
  startNewStageRef.current = startNewStage;

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
      return true;
    }
    return false;
  }, [currentPiece, gameOver, isPaused, setCurrentPiece, currentPieceRef, boardRef]);

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
      playRotateSound();
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
          while (movePiece(dx, 0)) { }
        } else {
          movePiece(dx, 0);
        }
      }
    } else {
      if (currentArr === 0) {
        while (movePiece(dx, 0)) { }
      } else {
        const timeSinceLastMove = currentTime - state.lastMoveTime;
        if (timeSinceLastMove >= currentArr) {
          movePiece(dx, 0);
          state.lastMoveTime = currentTime;
        }
      }
    }
  }, [movePiece, keyStatesRef, isPausedRef, gameOverRef, dasRef, arrRef]);

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

  // Push-based live advancement check — runs every handlePieceLock(), instant toast on threshold
  const pushLiveAdvancementCheck = useCallback(() => {
    const qualifying = checkLiveGameAdvancements({
      score: scoreRef.current,
      lines: linesRef.current,
      tSpins: 0, // T-spin detection not implemented in this game mode
      bestCombo: gameBestComboRef.current,
      perfectBeats: gamePerfectBeatsRef.current,
      worldsCleared: gameWorldsClearedRef.current,
      tetrisClears: gameTetrisClearsRef.current,
      hardDrops: gameHardDropsRef.current,
      piecesPlaced: gamePiecesPlacedRef.current,
    });
    const fresh = qualifying.filter(id => !liveNotifiedRef.current.has(id));
    if (fresh.length > 0) {
      fresh.forEach(id => liveNotifiedRef.current.add(id));
      setToastIds(prev => [...prev, ...fresh]);
    }
  }, []);

  // Handle piece locking and game advancement — branches by game mode
  const handlePieceLock = useCallback((piece: Piece, dropDistance = 0) => {
    const mode = gameModeRef.current;

    // Beat judgment
    const currentBeatPhase = beatPhaseRef.current;
    const onBeat = currentBeatPhase > 0.75 || currentBeatPhase < 0.15;
    let mult = 1;

    // Track pieces placed for advancements
    gamePiecesPlacedRef.current++;

    if (onBeat) {
      mult = 2;
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      showJudgment('PERFECT!', '#FFD700');
      playTone(1047, 0.2, 'triangle');

      // Track advancement stats
      gamePerfectBeatsRef.current++;
      if (newCombo > gameBestComboRef.current) {
        gameBestComboRef.current = newCombo;
      }

      // VFX: combo change event
      vfxRef.current.emit({ type: 'comboChange', combo: newCombo, onBeat: true });

      // VFX: fever mode trigger at combo 10+
      if (newCombo >= 10 && comboRef.current < 10) {
        vfxRef.current.emit({ type: 'feverStart', combo: newCombo });
      }
    } else {
      // VFX: combo broken — end fever if active
      if (comboRef.current >= 10) {
        vfxRef.current.emit({ type: 'feverEnd' });
      }
      if (comboRef.current > 0) {
        showJudgment('MISS', '#FF4444');
      }
      setCombo(0);
      vfxRef.current.emit({ type: 'comboChange', combo: 0, onBeat: false });
    }

    const newBoard = lockPiece(piece, boardRef.current);

    // Detect which rows will be cleared (before clearing) for VFX positioning
    const rowsToClear: number[] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (newBoard[y].every(cell => cell !== null)) {
        rowsToClear.push(y);
      }
    }

    const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);

    setBoard(clearedBoard);
    boardRef.current = clearedBoard;

    // Calculate score with rhythm multiplier
    const baseScore = dropDistance * 2 + [0, 100, 300, 500, 800][clearedLines] * levelRef.current;
    const finalScore = baseScore * mult * Math.max(1, comboRef.current);
    updateScore(scoreRef.current + finalScore);

    if (clearedLines > 0) {
      // Track tetris clears (4 lines at once) for advancements
      if (clearedLines === 4) {
        gameTetrisClearsRef.current++;
      }

      const weaponMult = damageMultiplierRef.current;
      const center = getBoardCenter();

      if (mode === 'td') {
        // === TOWER DEFENSE: Kill enemies when lines are cleared ===
        const killCount = Math.ceil(clearedLines * ENEMIES_KILLED_PER_LINE * mult * Math.max(1, comboRef.current) * weaponMult);
        killEnemies(killCount);

        // Item drops
        spawnItemDrops(killCount, center.x, center.y);
      } else {
        // === VANILLA: Destroy terrain blocks ===
        const damage = Math.ceil(clearedLines * TERRAIN_DAMAGE_PER_LINE * mult * Math.max(1, comboRef.current) * weaponMult);
        const remaining = destroyTerrain(damage);
        
        // Item drops from terrain
        spawnItemDrops(damage, center.x, center.y);

        // Check if terrain is fully destroyed → next stage
        if (remaining <= 0) {
          gameWorldsClearedRef.current++;
          const nextStage = stageNumberRef.current + 1;
          startNewStage(nextStage);
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

      playLineClear(clearedLines);
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
    gameModeRef, beatPhaseRef, comboRef, boardRef, levelRef, scoreRef, damageMultiplierRef, stageNumberRef,
    setCombo, setBoard, setLines, setLevel, setCurrentPiece,
    showJudgment, updateScore, triggerBoardShake, spawnPiece, playTone, playLineClear,
    currentPieceRef, vfx, killEnemies, destroyTerrain, startNewStage,
    getBoardCenter, spawnTerrainParticles, spawnItemDrops, pushLiveAdvancementCheck,
  ]);

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

    playHardDropSound();
    handlePieceLock(newPiece, dropDistance);
  }, [currentPiece, gameOver, isPaused, currentPieceRef, gameOverRef, isPausedRef, boardRef, handlePieceLock, playHardDropSound]);

  // Hold current piece
  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || !canHold) return;

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

  // Gravity tick
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
    } else {
      handlePieceLock(piece);
    }
  }, [currentPiece, gameOver, isPaused, currentPieceRef, gameOverRef, isPausedRef, boardRef, setCurrentPiece, handlePieceLock]);

  // Stable callback for toast dismiss — avoids resetting the toast timer on every render
  const dismissToast = useCallback(() => setToastIds([]), []);

  // Start game with selected mode
  const startGame = useCallback((mode: GameMode) => {
    initAudio();
    initGame(mode);

    // Reset per-game advancement tracking
    gamePerfectBeatsRef.current = 0;
    gameBestComboRef.current = 0;
    gameTetrisClearsRef.current = 0;
    gameHardDropsRef.current = 0;
    gamePiecesPlacedRef.current = 0;
    gameWorldsClearedRef.current = 0;
    advRecordedRef.current = false;
    liveNotifiedRef.current = new Set();
    setToastIds([]);
  }, [initAudio, initGame]);

  // Record advancement stats when game ends
  useEffect(() => {
    if (gameOver && !advRecordedRef.current) {
      advRecordedRef.current = true;
      const result = recordGameEnd({
        score: scoreRef.current,
        lines: linesRef.current,
        tSpins: 0,
        bestCombo: gameBestComboRef.current,
        perfectBeats: gamePerfectBeatsRef.current,
        worldsCleared: gameWorldsClearedRef.current,
        tetrisClears: gameTetrisClearsRef.current,
        hardDrops: gameHardDropsRef.current,
        piecesPlaced: gamePiecesPlacedRef.current,
      });
      if (result.newlyUnlockedIds.length > 0) {
        setToastIds(prev => [...prev, ...result.newlyUnlockedIds]);
      }
    }
  }, [gameOver]);

  // Reset beat timing when unpausing to avoid desync
  useEffect(() => {
    if (!isPaused && isPlaying && !gameOver) {
      lastBeatRef.current = Date.now();
    }
  }, [isPaused, isPlaying, gameOver, lastBeatRef]);

  // Beat timer for rhythm game — branches by game mode via gameModeRef
  // Uses refs for vfx.emit/spawnEnemies/updateEnemies to keep deps stable
  // (vfx object recreates every render, which would reset the interval)
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const world = WORLDS[worldIdx];
    const interval = 60000 / world.bpm;

    lastBeatRef.current = Date.now();

    beatTimerRef.current = window.setInterval(() => {
      // Skip beat processing while paused
      if (isPausedRef.current) return;

      lastBeatRef.current = Date.now();
      setBoardBeat(true);
      playDrum();

      const mode = gameModeRef.current;

      if (mode === 'td') {
        // === Tower Defense beat logic ===
        // Update existing enemies FIRST (move toward tower)
        const reached = updateEnemiesRef.current();

        // Then spawn new enemies for next beat
        spawnEnemiesRef.current(ENEMIES_PER_BEAT);

        // Move bullets and check collisions — returns kill count
        const kills = updateBulletsRef.current();
        if (kills > 0) {
          playKillSoundRef.current();
        }

        // Apply damage when enemies reach the tower
        if (reached > 0) {
          const damage = reached * ENEMY_REACH_DAMAGE;
          setTowerHealthRef.current(prev => {
            const newHealth = Math.max(0, prev - damage);
            if (newHealth <= 0) {
              setGameOverRef.current(true);
            }
            return newHealth;
          });
        }
      }
      // Vanilla mode: no enemy/bullet/tower logic — just rhythm VFX below

      // VFX: beat pulse ring — intensity scales with BPM (both modes)
      const intensity = Math.min(1, (world.bpm - 80) / 100);
      vfxRef.current.emit({ type: 'beat', bpm: world.bpm, intensity });

      setTimeout(() => setBoardBeat(false), 100);
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [isPlaying, gameOver, worldIdx, playDrum, lastBeatRef, beatTimerRef, setBoardBeat]);

  // Auto-fire bullet every 1 second (independent of beat timer)
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    if (gameModeRef.current !== 'td') return;

    const bulletTimer = window.setInterval(() => {
      if (gameOverRef.current || isPausedRef.current) return;
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
        const interval = 60000 / world.bpm;
        const now = Date.now();
        const elapsed = now - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        beatPhaseRef.current = phase;

        // Direct DOM update — bypasses React for smooth cross-browser animation
        if (beatBarRef.current) {
          beatBarRef.current.style.setProperty('--beat-phase', String(phase));
          if (phase > 0.75 || phase < 0.15) {
            beatBarRef.current.setAttribute('data-onbeat', '');
          } else {
            beatBarRef.current.removeAttribute('data-onbeat');
          }
        }

        // Throttled React state update (~30fps) for Board fever rainbow effect
        if (now - lastStateUpdate > 33) {
          setBeatPhase(phase);
          lastStateUpdate = now;
        }

        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, gameOver, gameOverRef, worldIdxRef, lastBeatRef, beatPhaseRef, setBeatPhase]);

  // Main game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = (currentTime: number) => {
      if (!isPausedRef.current && !gameOverRef.current) {
        processHorizontalDasArr('left', currentTime);
        processHorizontalDasArr('right', currentTime);
        processSoftDrop(currentTime);

        const speed = Math.max(100, 1000 - (levelRef.current - 1) * 100);
        if (currentTime - lastGravityRef.current >= speed) {
          tick();
          lastGravityRef.current = currentTime;
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
  }, [isPlaying, gameOver, tick, processHorizontalDasArr, processSoftDrop, isPausedRef, gameOverRef, levelRef, lastGravityRef, gameLoopRef]);

  // Keyboard input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      if (e.repeat) return;

      // Handle craft UI toggle with 'f' key
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleCraftUI();
        return;
      }

      // Close craft UI with Escape
      if (showCraftUI && (e.key === 'Escape')) {
        e.preventDefault();
        toggleCraftUI();
        return;
      }

      // Don't process game inputs while craft UI is open
      if (showCraftUI) return;

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
            if (!isPaused) movePiece(-1, 0);
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
            if (!isPaused) movePiece(1, 0);
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
  }, [isPlaying, isPaused, gameOver, showCraftUI, movePiece, rotatePiece, hardDrop, holdCurrentPiece, setScore, setIsPaused, keyStatesRef, toggleCraftUI]);

  const world = WORLDS[worldIdx];

  return (
    <div
      className={`${responsiveClassName} ${styles[`w${worldIdx}`]}`}
      style={{ ...responsiveCSSVars, position: 'relative' }}
    >
      {/* Voxel World Background — mode-aware */}
      <VoxelWorldBackground
        seed={terrainSeed}
        gameMode={gameMode}
        terrainDestroyedCount={terrainDestroyedCount}
        enemies={gameMode === 'td' ? enemies : []}
        bullets={gameMode === 'td' ? bullets : []}
        onTerrainReady={handleTerrainReady}
        worldIdx={worldIdx}
      />

      {/* Terrain destruction particle effects */}
      <TerrainParticles particles={terrainParticles} />

      {/* Floating item drops from terrain */}
      <FloatingItems items={floatingItems} />

      {/* World transition overlays (creation / collapse / reload) */}
      <WorldTransition
        phase={gamePhase}
        worldIdx={worldIdx}
        stageNumber={stageNumber}
        gameMode={gameMode}
      />

      {/* Title Screen */}
      {!isPlaying && !gameOver && (
        <TitleScreen onStart={startGame} worldIdx={worldIdx} stageNumber={stageNumber} />
      )}

      {/* Game */}
      {(isPlaying || gameOver) && (
        <div className={styles.game}>
          {/* Game phase indicator */}
          <GamePhaseIndicator
            phase={gamePhase}
            stageNumber={stageNumber}
            damageMultiplier={damageMultiplier}
          />

          <ScoreDisplay score={score} scorePop={scorePop} />
          <ComboDisplay combo={combo} />
          <TerrainProgress
            terrainRemaining={gameMode === 'td' ? enemies.filter(e => e.alive).length : terrainTotal - terrainDestroyedCount}
            terrainTotal={gameMode === 'td' ? enemies.length : terrainTotal}
            stageNumber={stageNumber}
            gameMode={gameMode}
          />
          {gameMode === 'vanilla' && (
            <WorldProgressDisplay worldIdx={worldIdx} stageNumber={stageNumber} />
          )}

          <div className={styles.gameArea} ref={gameAreaRef}>
            {/* Left sidebar: Hold + Inventory (separate containers) */}
            <div className={styles.sidePanelLeft}>
              <div className={styles.nextWrap}>
                <div className={styles.nextLabel}>HOLD (C)</div>
                <HoldPiece pieceType={holdPiece} canHold={canHold} colorTheme={colorTheme} worldIdx={worldIdx} />
              </div>
              <ItemSlots
                inventory={inventory}
                craftedCards={craftedCards}
                damageMultiplier={damageMultiplier}
                onCraftOpen={toggleCraftUI}
              />
            </div>

            {/* Center column: Board + Beat bar + Stats */}
            <div className={styles.centerColumn}>
              <Board
                board={board}
                currentPiece={currentPiece}
                boardBeat={boardBeat}
                boardShake={boardShake}
                gameOver={gameOver}
                isPaused={isPaused}
                score={score}
                onRestart={() => startGame(gameMode)}
                onResume={() => setIsPaused(false)}
                colorTheme={colorTheme}
                onThemeChange={setColorTheme}
                worldIdx={worldIdx}
                combo={combo}
                beatPhase={beatPhase}
                boardElRef={boardElRef}
              />
              <BeatBar containerRef={beatBarRef} />
              <StatsPanel lines={lines} level={level} />
            </div>

            {/* Right sidebar: Next + HP bar */}
            <div className={styles.sidePanelRight}>
              <div className={styles.nextWrap}>
                <div className={styles.nextLabel}>NEXT</div>
                {nextPiece && <NextPiece pieceType={nextPiece} colorTheme={colorTheme} worldIdx={worldIdx} />}
              </div>
              {gameMode === 'td' && <HealthManaHUD health={towerHealth} />}
            </div>
          </div>

          <TouchControls
            onMoveLeft={() => movePiece(-1, 0)}
            onMoveRight={() => movePiece(1, 0)}
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
      <RhythmVFX
        canvasRef={vfx.canvasRef}
        boardRef={boardElRef}
        onBoardGeometry={vfx.updateBoardGeometry}
        isPlaying={isPlaying && !gameOver}
        onStart={vfx.start}
        onStop={vfx.stop}
      />
      {/* Crafting UI overlay */}
      {showCraftUI && (
        <CraftingUI
          inventory={inventory}
          craftedCards={craftedCards}
          onCraft={craftCard}
          canCraft={canCraftCard}
          onClose={toggleCraftUI}
        />
      )}

      {/* Judgment */}
      <JudgmentDisplay
        text={judgmentText}
        color={judgmentColor}
        show={showJudgmentAnim}
      />

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
