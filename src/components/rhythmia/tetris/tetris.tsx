'use client';

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './VanillaGame.module.css';

// Constants and Types
import { WORLDS, BOARD_WIDTH, BOARD_HEIGHT, TERRAIN_DAMAGE_PER_LINE, TERRAIN_PARTICLES_PER_LINE } from './constants';
import type { Piece } from './types';

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
  WorldDisplay,
  ScoreDisplay,
  ComboDisplay,
  TerrainProgress,
  BeatBar,
  StatsPanel,
  ThemeNav,
  JudgmentDisplay,
  TouchControls,
  RhythmVFX,
  FloatingItems,
  ItemSlots,
  CraftingUI,
  TerrainParticles,
  WorldTransition,
  GamePhaseIndicator,
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
  const boardElRef = useRef<HTMLDivElement>(null);

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
    terrainDestroyedCount,
    terrainTotal,
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
    terrainDestroyedCountRef,
    terrainTotalRef,
    beatPhaseRef,
    damageMultiplierRef,
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
    // Game loop actions
    spawnItemDrops,
    spawnTerrainParticles,
    craftCard,
    canCraftCard,
    toggleCraftUI,
    triggerCollapse,
    triggerTransition,
    triggerWorldCreation,
  } = gameState;

  const { initAudio, playTone, playDrum, playLineClear, playHardDropSound, playRotateSound } = audio;

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
      vfx.emit({
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
  }, [currentPiece, gameOver, isPaused, setCurrentPiece, currentPieceRef, boardRef, gameOverRef, isPausedRef, playRotateSound, vfx]);

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

  // Handle piece locking and game advancement — integrates the full game loop
  const handlePieceLock = useCallback((piece: Piece, dropDistance = 0) => {
    // Beat judgment
    const currentBeatPhase = beatPhaseRef.current;
    const onBeat = currentBeatPhase > 0.75 || currentBeatPhase < 0.15;
    let mult = 1;

    if (onBeat) {
      mult = 2;
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      showJudgment('PERFECT!', '#FFD700');
      playTone(1047, 0.2, 'triangle');

      // VFX: combo change event
      vfx.emit({ type: 'comboChange', combo: newCombo, onBeat: true });

      // VFX: fever mode trigger at combo 10+
      if (newCombo >= 10 && comboRef.current < 10) {
        vfx.emit({ type: 'feverStart', combo: newCombo });
      }
    } else {
      // VFX: combo broken — end fever if active
      if (comboRef.current >= 10) {
        vfx.emit({ type: 'feverEnd' });
      }
      setCombo(0);
      vfx.emit({ type: 'comboChange', combo: 0, onBeat: false });
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

    // === DIG PHASE: Terrain destruction with damage multiplier from weapon cards ===
    if (clearedLines > 0) {
      const weaponMult = damageMultiplierRef.current;
      const damage = clearedLines * TERRAIN_DAMAGE_PER_LINE * mult * Math.max(1, comboRef.current) * weaponMult;
      const remaining = destroyTerrain(damage);

      // VFX: line clear equalizer bars + glitch particles
      vfx.emit({
        type: 'lineClear',
        rows: rowsToClear,
        count: clearedLines,
        onBeat,
        combo: comboRef.current,
      });
      // === PARTICLE EFFECTS: Terrain emits particles when destroyed ===
      const center = getBoardCenter();
      spawnTerrainParticles(center.x, center.y, clearedLines * TERRAIN_PARTICLES_PER_LINE);

      // === ITEM DROP: Terrain drops items that float to inventory ===
      spawnItemDrops(damage, center.x, center.y);

      if (remaining <= 0) {
        // === COLLAPSE PHASE: Terrain fully destroyed ===
        triggerCollapse();

        const newStageNumber = stageNumberRef.current + 1;
        // Cycle worlds every 5 stages
        const newWorldIdx = Math.floor((newStageNumber - 1) / 5) % WORLDS.length;
        const currentWorldIdx = worldIdxRef.current;

        if (newWorldIdx !== currentWorldIdx) {
          showJudgment('WORLD CLEAR!', '#00FF00');
          setWorldIdx(newWorldIdx);
        } else {
          showJudgment(`STAGE ${newStageNumber}!`, '#FFD700');
        }

        // Collapse → Transition → World Creation → Playing
        setTimeout(() => {
          triggerTransition();
        }, 1200);

        setTimeout(() => {
          triggerWorldCreation();
          startNewStage(newStageNumber);
        }, 2400);

        setTimeout(() => {
          setGamePhase('PLAYING');
        }, 3800);
      }

      playLineClear(clearedLines);
      triggerBoardShake();
    }

    setLines(prev => {
      const newLines = prev + clearedLines;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });

    const spawned = spawnPiece();
    setCurrentPiece(spawned);
    currentPieceRef.current = spawned;
  }, [
    beatPhaseRef, comboRef, boardRef, levelRef, scoreRef, worldIdxRef, stageNumberRef,
    terrainDestroyedCountRef, terrainTotalRef, damageMultiplierRef,
    setCombo, setBoard, setWorldIdx, setLines, setLevel, setCurrentPiece, setGamePhase,
    showJudgment, updateScore, triggerBoardShake, spawnPiece, playTone, playLineClear,
    currentPieceRef, destroyTerrain, startNewStage, vfx,
    getBoardCenter, spawnTerrainParticles, spawnItemDrops,
    triggerCollapse, triggerTransition, triggerWorldCreation,
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

    // VFX: hard drop impact particles
    if (dropDistance > 0) {
      vfx.emit({
        type: 'hardDrop',
        pieceType: newPiece.type,
        boardX: newPiece.x,
        boardY: newPiece.y,
        dropDistance,
      });
    }

    playHardDropSound();
    handlePieceLock(newPiece, dropDistance);
  }, [currentPiece, gameOver, isPaused, currentPieceRef, gameOverRef, isPausedRef, boardRef, handlePieceLock, playHardDropSound, vfx]);

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

  // Start game
  const startGame = useCallback(() => {
    initAudio();
    initGame();
  }, [initAudio, initGame]);

  // Beat timer for rhythm game
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const world = WORLDS[worldIdx];
    const interval = 60000 / world.bpm;

    lastBeatRef.current = Date.now();

    beatTimerRef.current = window.setInterval(() => {
      lastBeatRef.current = Date.now();
      setBoardBeat(true);
      playDrum();

      // VFX: beat pulse ring — intensity scales with BPM
      const intensity = Math.min(1, (world.bpm - 80) / 100);
      vfx.emit({ type: 'beat', bpm: world.bpm, intensity });

      setTimeout(() => setBoardBeat(false), 100);
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [isPlaying, gameOver, worldIdx, playDrum, lastBeatRef, beatTimerRef, setBoardBeat, vfx]);

  // Beat phase animation
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let animFrame: number;
    const updateBeat = () => {
      if (!gameOverRef.current) {
        const world = WORLDS[worldIdxRef.current];
        const interval = 60000 / world.bpm;
        const elapsed = Date.now() - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        setBeatPhase(phase);
        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, gameOver, gameOverRef, worldIdxRef, lastBeatRef, setBeatPhase]);

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
      {/* Voxel World Background — destructible terrain */}
      <VoxelWorldBackground
        seed={terrainSeed}
        destroyedCount={terrainDestroyedCount}
        onTerrainReady={handleTerrainReady}
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
      />

      {/* Title Screen */}
      {!isPlaying && !gameOver && (
        <TitleScreen onStart={startGame} />
      )}

      {/* Game */}
      {(isPlaying || gameOver) && (
        <div className={styles.game}>
          <WorldDisplay worldIdx={worldIdx} />

          {/* Game phase indicator + Theme Navbar */}
          <GamePhaseIndicator
            phase={gamePhase}
            stageNumber={stageNumber}
            damageMultiplier={damageMultiplier}
          />
          <ThemeNav colorTheme={colorTheme} onThemeChange={setColorTheme} />

          <ScoreDisplay score={score} scorePop={scorePop} />
          <ComboDisplay combo={combo} />
          <TerrainProgress terrainRemaining={terrainTotal - terrainDestroyedCount} terrainTotal={terrainTotal} stageNumber={stageNumber} />

          <div className={styles.gameArea} ref={gameAreaRef}>
            {/* Left side: Hold + Item Slots */}
            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>HOLD (C)</div>
              <HoldPiece pieceType={holdPiece} canHold={canHold} colorTheme={colorTheme} worldIdx={worldIdx} />
              <ItemSlots
                inventory={inventory}
                craftedCards={craftedCards}
                damageMultiplier={damageMultiplier}
                onCraftOpen={toggleCraftUI}
              />
            </div>

            <Board
              board={board}
              currentPiece={currentPiece}
              boardBeat={boardBeat}
              boardShake={boardShake}
              gameOver={gameOver}
              isPaused={isPaused}
              score={score}
              onRestart={startGame}
              colorTheme={colorTheme}
              worldIdx={worldIdx}
              combo={combo}
              beatPhase={beatPhase}
              boardElRef={boardElRef}
            />

            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>NEXT</div>
              {nextPiece && <NextPiece pieceType={nextPiece} colorTheme={colorTheme} worldIdx={worldIdx} />}
            </div>
          </div>

          <BeatBar beatPhase={beatPhase} />

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

          <StatsPanel lines={lines} level={level} />
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
    </div>
  );
}
