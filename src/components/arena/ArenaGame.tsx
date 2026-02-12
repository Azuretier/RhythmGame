'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useArenaSocket } from '@/hooks/useArenaSocket';
import { useTranslations } from 'next-intl';
import type { ArenaBoardPayload } from '@/types/arena';
import { ARENA_MAX_PLAYERS } from '@/types/arena';

// Tetris engine
import { useGameState } from '@/components/rhythmia/tetris/hooks';
import {
  BOARD_HEIGHT, BOARD_WIDTH, COLORS, LOCK_DELAY, MAX_LOCK_MOVES,
} from '@/components/rhythmia/tetris/constants';
import {
  isValidPosition, lockPiece, clearLines, getShape,
  createSpawnPiece, tryRotation, getGhostY,
} from '@/components/rhythmia/tetris/utils/boardUtils';
import type { Piece } from '@/components/rhythmia/tetris/types';

import styles from './ArenaGame.module.css';

const GIMMICK_LABELS: Record<string, string> = {
  tempo_shift: 'TEMPO SHIFT',
  gravity_surge: 'GRAVITY SURGE',
  mirror_mode: 'MIRROR MODE',
  garbage_rain: 'GARBAGE RAIN',
  blackout: 'BLACKOUT',
  speed_frenzy: 'SPEED FRENZY',
  freeze_frame: 'FREEZE',
  shuffle_preview: 'SHUFFLE',
};

// Mini board renderer for opponent preview
function MiniBoardView({ board }: { board: (null | { color: string })[][] }) {
  if (!board || !Array.isArray(board)) return null;
  const visibleRows = board.slice(Math.max(0, board.length - 16));

  return (
    <div className={styles.opponentMiniBoard}>
      {visibleRows.map((row, ri) => (
        <div key={ri} className={styles.miniRow}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`${styles.miniCell} ${cell ? styles.filled : ''}`}
              style={cell ? { background: cell.color } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Small piece preview for next/hold display
function PiecePreview({ pieceType }: { pieceType: string | null }) {
  if (!pieceType) return <div className={styles.piecePreviewEmpty} />;
  const shape = getShape(pieceType, 0);
  return (
    <div className={styles.piecePreviewGrid}>
      {shape.map((row, ri) => (
        <div key={ri} className={styles.piecePreviewRow}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`${styles.piecePreviewCell} ${cell ? styles.filled : ''}`}
              style={cell ? { background: COLORS[pieceType] } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ArenaGame() {
  const t = useTranslations('arena');

  // ===== Arena Socket =====
  const {
    connectionStatus,
    connectWebSocket,
    playerId,
    phase,
    setPhase,
    arenaState,
    error,
    setError,
    countdownNumber,
    gameSeed,
    queuePosition,
    queueSize,
    bpm,
    beatPhase,
    chaosLevel,
    activeGimmick,
    syncMap,
    lastPlayerAction,
    lastElimination,
    lastTempoCollapse,
    sessionResult,
    opponentBoards,
    queueForArena,
    cancelQueue,
    createArena,
    joinArena,
    setReady,
    startArena,
    sendAction,
    sendBoardRelay,
    leaveArena,
  } = useArenaSocket();

  // ===== Tetris Game State =====
  const gs = useGameState();
  const {
    board, currentPiece, nextPiece, holdPiece, canHold,
    score, combo, lines, level, gameOver, isPlaying,
    boardRef, currentPieceRef, scoreRef, comboRef,
    linesRef, levelRef, gameOverRef, isPausedRef,
    keyStatesRef, gameLoopRef, lastGravityRef,
    dasRef, arrRef, sdfRef,
    setBoard, setCurrentPiece, setHoldPiece, setCanHold,
    setScore, setCombo, setLines, setLevel,
    spawnPiece, initGame,
  } = gs;

  // ===== UI State =====
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showElimBanner, setShowElimBanner] = useState(false);
  const [showCollapse, setShowCollapse] = useState(false);
  const elimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock delay
  const lockStartTimeRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);

  // Game init tracking
  const gameInitRef = useRef(false);

  // Beat indicator
  const onBeat = beatPhase > 0.75 || beatPhase < 0.15;
  const mySync = syncMap[playerId] ?? 1.0;
  const chaosClass = chaosLevel >= 75 ? styles.chaosHigh
    : chaosLevel >= 40 ? styles.chaosMedium : styles.chaosLow;

  // Show elimination banner briefly
  useEffect(() => {
    if (lastElimination) {
      setShowElimBanner(true);
      if (elimTimerRef.current) clearTimeout(elimTimerRef.current);
      elimTimerRef.current = setTimeout(() => setShowElimBanner(false), 3000);
    }
    return () => { if (elimTimerRef.current) clearTimeout(elimTimerRef.current); };
  }, [lastElimination]);

  // Show tempo collapse flash
  useEffect(() => {
    if (lastTempoCollapse) {
      setShowCollapse(true);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => setShowCollapse(false), 1000);
    }
    return () => { if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current); };
  }, [lastTempoCollapse]);

  // ===== Derived state =====
  const isHost = arenaState?.hostId === playerId;
  const myPlayer = arenaState?.players.find(p => p.id === playerId);
  const opponents = useMemo(
    () => arenaState?.players.filter(p => p.id !== playerId) || [],
    [arenaState, playerId],
  );
  const allReady = arenaState?.players.every(p => p.ready || p.id === arenaState.hostId)
    && (arenaState?.players.length ?? 0) >= 3;

  // ===== Lobby Handlers =====
  const handleNameSubmit = useCallback(() => {
    if (playerName.trim().length < 2) return;
    const next = sessionStorage.getItem('arena_nextMode');
    sessionStorage.removeItem('arena_nextMode');
    if (next === 'queue') {
      queueForArena(playerName.trim());
    } else if (next === 'create') {
      createArena(playerName.trim());
    } else {
      queueForArena(playerName.trim());
    }
  }, [playerName, queueForArena, createArena]);

  const handleJoinByCode = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a valid arena code');
      return;
    }
    joinArena(code, playerName.trim());
  }, [joinCode, joinArena, playerName, setError]);

  // ===== Game Engine Integration =====

  // Initialize game when arena phase becomes 'playing'
  useEffect(() => {
    if (phase === 'playing' && !gameInitRef.current) {
      gameInitRef.current = true;
      lockStartTimeRef.current = null;
      lockMovesRef.current = 0;
      initGame('vanilla');
    }
    if (phase !== 'playing' && phase !== 'ended') {
      gameInitRef.current = false;
    }
  }, [phase, initGame]);

  // ===== Game Mechanics =====

  const movePiece = useCallback((dx: number, dy: number): boolean => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current) return false;
    const newPiece: Piece = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (isValidPosition(newPiece, boardRef.current)) {
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      return true;
    }
    return false;
  }, [setCurrentPiece, currentPieceRef, boardRef, gameOverRef]);

  const moveHorizontal = useCallback((dx: number): boolean => {
    const result = movePiece(dx, 0);
    if (result && lockStartTimeRef.current !== null) {
      const piece = currentPieceRef.current;
      if (piece) {
        if (isValidPosition({ ...piece, y: piece.y + 1 }, boardRef.current)) {
          lockStartTimeRef.current = null;
        } else if (lockMovesRef.current < MAX_LOCK_MOVES) {
          lockMovesRef.current++;
          lockStartTimeRef.current = performance.now();
        }
      }
    }
    return result;
  }, [movePiece, currentPieceRef, boardRef]);

  const rotatePiece = useCallback((direction: 1 | -1) => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current) return;
    const rotated = tryRotation(piece, direction, boardRef.current);
    if (rotated) {
      setCurrentPiece(rotated);
      currentPieceRef.current = rotated;
      if (lockStartTimeRef.current !== null) {
        if (isValidPosition({ ...rotated, y: rotated.y + 1 }, boardRef.current)) {
          lockStartTimeRef.current = null;
        } else if (lockMovesRef.current < MAX_LOCK_MOVES) {
          lockMovesRef.current++;
          lockStartTimeRef.current = performance.now();
        }
      }
    }
  }, [setCurrentPiece, currentPieceRef, boardRef, gameOverRef]);

  // Stable ref for beatPhase to avoid stale closure in handlePieceLock
  const beatPhaseRef = useRef(beatPhase);
  beatPhaseRef.current = beatPhase;

  // Stable ref for holdPiece
  const holdPieceRef = useRef(holdPiece);
  holdPieceRef.current = holdPiece;

  const handlePieceLock = useCallback((piece: Piece, dropDistance = 0) => {
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;

    const newBoard = lockPiece(piece, boardRef.current);
    const { newBoard: clearedBoard, clearedLines: cleared } = clearLines(newBoard);

    setBoard(clearedBoard);
    boardRef.current = clearedBoard;

    // Beat judgment
    const bp = beatPhaseRef.current;
    const beatHit = bp > 0.75 || bp < 0.15;
    const mult = beatHit ? 2 : 1;
    if (beatHit) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(0);
    }

    // Score calculation
    const base = dropDistance * 2 + [0, 100, 300, 500, 800][cleared] * levelRef.current;
    const finalScore = base * mult * Math.max(1, comboRef.current);
    setScore(prev => prev + finalScore);

    setLines(prev => {
      const newLines = prev + cleared;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });

    // Send to arena server
    sendAction({ action: 'piece_placed', beatPhase: bp, value: 0 });
    if (cleared > 0) {
      sendAction({ action: 'line_clear', beatPhase: bp, value: cleared });
      if (cleared === 4) {
        sendAction({ action: 'tetris_clear', beatPhase: bp, value: 4 });
      }
    }

    // Relay board state (convert piece types to colors for multiplayer protocol)
    const relayBoard = clearedBoard.map(row =>
      row.map(cell => cell ? { color: COLORS[cell] || '#ffffff' } : null)
    );
    sendBoardRelay({
      board: relayBoard,
      score: scoreRef.current + finalScore,
      lines: linesRef.current + cleared,
      combo: comboRef.current,
      piece: undefined,
      hold: holdPieceRef.current,
      alive: true,
    });

    // Spawn next piece
    const spawned = spawnPiece();
    if (spawned) {
      setCurrentPiece(spawned);
      currentPieceRef.current = spawned;
    }
    // If spawned is null, spawnPiece sets gameOver = true
  }, [
    boardRef, levelRef, comboRef, scoreRef, linesRef,
    setBoard, setCombo, setScore, setLines, setLevel, setCurrentPiece,
    currentPieceRef, spawnPiece, sendAction, sendBoardRelay,
  ]);

  const handlePieceLockRef = useRef(handlePieceLock);
  handlePieceLockRef.current = handlePieceLock;

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current) return;
    const newPiece = { ...piece };
    let dropDist = 0;
    while (isValidPosition({ ...newPiece, y: newPiece.y + 1 }, boardRef.current)) {
      newPiece.y++;
      dropDist++;
    }
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;
    sendAction({ action: 'hard_drop', beatPhase: beatPhaseRef.current, value: dropDist });
    handlePieceLock(newPiece, dropDist);
  }, [currentPieceRef, gameOverRef, boardRef, handlePieceLock, sendAction]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || gameOver || !canHold) return;
    lockStartTimeRef.current = null;
    lockMovesRef.current = 0;
    const currentType = currentPiece.type;
    if (holdPiece === null) {
      setHoldPiece(currentType);
      const spawned = spawnPiece();
      if (spawned) {
        setCurrentPiece(spawned);
        currentPieceRef.current = spawned;
      }
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
  }, [currentPiece, gameOver, canHold, holdPiece, board,
    setHoldPiece, setCurrentPiece, setCanHold, spawnPiece, currentPieceRef]);

  const tick = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current) return;
    const newPiece: Piece = { ...piece, y: piece.y + 1 };
    if (isValidPosition(newPiece, boardRef.current)) {
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
    }
  }, [currentPieceRef, gameOverRef, boardRef, setCurrentPiece]);

  // DAS/ARR processing
  const processHorizontalDasArr = useCallback((direction: 'left' | 'right', currentTime: number) => {
    const state = keyStatesRef.current[direction];
    if (!state.pressed || gameOverRef.current) return;
    const dx = direction === 'left' ? -1 : 1;
    const timeSincePress = currentTime - state.pressTime;
    const currentDas = dasRef.current;
    const currentArr = arrRef.current;

    if (!state.dasCharged) {
      if (timeSincePress >= currentDas) {
        state.dasCharged = true;
        state.lastMoveTime = currentTime;
        if (currentArr === 0) {
          while (moveHorizontal(dx)) { /* instant */ }
        } else {
          moveHorizontal(dx);
        }
      }
    } else {
      if (currentArr === 0) {
        while (moveHorizontal(dx)) { /* instant */ }
      } else if (currentTime - state.lastMoveTime >= currentArr) {
        moveHorizontal(dx);
        state.lastMoveTime = currentTime;
      }
    }
  }, [moveHorizontal, keyStatesRef, gameOverRef, dasRef, arrRef]);

  const processSoftDrop = useCallback((currentTime: number) => {
    const state = keyStatesRef.current.down;
    if (!state.pressed || gameOverRef.current) return;
    const currentSdf = sdfRef.current;
    if (currentSdf === 0) {
      while (movePiece(0, 1)) { setScore(prev => prev + 1); }
    } else if (currentTime - state.lastMoveTime >= currentSdf) {
      if (movePiece(0, 1)) setScore(prev => prev + 1);
      state.lastMoveTime = currentTime;
    }
  }, [movePiece, setScore, keyStatesRef, gameOverRef, sdfRef]);

  // ===== Game Loop =====
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || gameOver) return;

    const gameLoop = (currentTime: number) => {
      if (!gameOverRef.current) {
        processHorizontalDasArr('left', currentTime);
        processHorizontalDasArr('right', currentTime);
        processSoftDrop(currentTime);

        const speed = Math.max(100, 1000 - (levelRef.current - 1) * 100);
        if (currentTime - lastGravityRef.current >= speed) {
          tick();
          lastGravityRef.current = currentTime;
        }

        // Lock delay
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
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastGravityRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [phase, isPlaying, gameOver, tick, processHorizontalDasArr, processSoftDrop,
    gameOverRef, levelRef, lastGravityRef, gameLoopRef, currentPieceRef, boardRef]);

  // ===== Keyboard Input =====
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const currentTime = performance.now();

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!keyStatesRef.current.left.pressed) {
            keyStatesRef.current.right = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            keyStatesRef.current.left = { pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime };
            moveHorizontal(-1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!keyStatesRef.current.right.pressed) {
            keyStatesRef.current.left = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            keyStatesRef.current.right = { pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime };
            moveHorizontal(1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!keyStatesRef.current.down.pressed) {
            keyStatesRef.current.down = { pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime };
            if (movePiece(0, 1)) setScore(prev => prev + 1);
          }
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault();
          rotatePiece(1);
          break;
        case 'z':
        case 'Z':
        case 'Control':
          e.preventDefault();
          rotatePiece(-1);
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          holdCurrentPiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
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
  }, [phase, isPlaying, gameOver, moveHorizontal, movePiece, rotatePiece,
    hardDrop, holdCurrentPiece, setScore, keyStatesRef]);

  // ===== Game Over → Notify Arena Server =====
  useEffect(() => {
    if (gameOver && phase === 'playing') {
      const relayBoard = boardRef.current.map(row =>
        row.map(cell => cell ? { color: COLORS[cell] || '#ffffff' } : null)
      );
      sendAction({ action: 'game_over', beatPhase: beatPhaseRef.current, value: scoreRef.current });
      sendBoardRelay({
        board: relayBoard,
        score: scoreRef.current,
        lines: linesRef.current,
        combo: 0,
        alive: false,
      });
    }
  }, [gameOver, phase, sendAction, sendBoardRelay, scoreRef, boardRef, linesRef]);

  // ===== Visual Board (board + ghost + current piece) =====
  const visualBoard = useMemo(() => {
    const result: (null | { color: string })[][] = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      const row: (null | { color: string })[] = [];
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cell = board[r]?.[c];
        row.push(cell ? { color: COLORS[cell] || '#ffffff' } : null);
      }
      result.push(row);
    }

    if (currentPiece) {
      // Ghost piece
      const ghostY = getGhostY(currentPiece, board);
      if (ghostY !== currentPiece.y) {
        const shape = getShape(currentPiece.type, currentPiece.rotation);
        const ghostColor = (COLORS[currentPiece.type] || '#ffffff') + '30';
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
              const by = ghostY + y;
              const bx = currentPiece.x + x;
              if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH && !result[by][bx]) {
                result[by][bx] = { color: ghostColor };
              }
            }
          }
        }
      }

      // Current piece
      const shape = getShape(currentPiece.type, currentPiece.rotation);
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const by = currentPiece.y + y;
            const bx = currentPiece.x + x;
            if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
              result[by][bx] = { color: COLORS[currentPiece.type] || '#ffffff' };
            }
          }
        }
      }
    }

    return result;
  }, [board, currentPiece]);

  return (
    <div className={styles.container}>
      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
          <span>
            {connectionStatus === 'connected' && t('online')}
            {connectionStatus === 'connecting' && t('connecting')}
            {connectionStatus === 'error' && t('connectionError')}
            {connectionStatus === 'disconnected' && t('offline')}
          </span>
        </div>
        {phase === 'playing' && (
          <div className={styles.tempoDisplay}>
            <div
              className={`${styles.beatIndicator} ${onBeat ? styles.onBeat : ''}`}
            />
            <div className={styles.bpmValue}>{Math.round(bpm)}</div>
            <span>BPM</span>
            <span className={styles.syncValue}>
              {t('sync')}: {Math.round(mySync * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>x</button>
        </div>
      )}

      {/* ===== LOBBY ===== */}
      {phase === 'lobby' && (
        <div className={styles.lobby}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <p className={styles.playerCount}>{t('maxPlayers', { count: ARENA_MAX_PLAYERS })}</p>

          <div className={styles.lobbyActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                if (playerName.trim().length >= 2) {
                  queueForArena(playerName.trim());
                } else {
                  sessionStorage.setItem('arena_nextMode', 'queue');
                  setPhase('name-entry');
                }
              }}
            >
              {t('quickMatch')}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                if (playerName.trim().length >= 2) {
                  createArena(playerName.trim());
                } else {
                  sessionStorage.setItem('arena_nextMode', 'create');
                  setPhase('name-entry');
                }
              }}
            >
              {t('createArena')}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                setPhase('name-entry');
                sessionStorage.setItem('arena_nextMode', 'join');
              }}
            >
              {t('joinByCode')}
            </button>
          </div>
        </div>
      )}

      {/* ===== NAME ENTRY ===== */}
      {phase === 'name-entry' && (
        <div className={styles.nameEntry}>
          <div className={styles.sectionTitle}>{t('enterName')}</div>
          <input
            type="text"
            className={styles.nameInput}
            placeholder={t('namePlaceholder')}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={12}
            autoFocus
          />

          {sessionStorage.getItem('arena_nextMode') === 'join' && (
            <>
              <div className={styles.sectionTitle} style={{ fontSize: '0.9rem', marginTop: 12 }}>
                {t('enterCode')}
              </div>
              <input
                type="text"
                className={styles.nameInput}
                placeholder="AXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                style={{ letterSpacing: '0.3em', textTransform: 'uppercase' }}
              />
              <button
                className={styles.primaryBtn}
                onClick={handleJoinByCode}
                disabled={playerName.trim().length < 2 || joinCode.trim().length < 4}
              >
                {t('join')}
              </button>
            </>
          )}

          {sessionStorage.getItem('arena_nextMode') !== 'join' && (
            <button
              className={styles.primaryBtn}
              onClick={handleNameSubmit}
              disabled={playerName.trim().length < 2}
            >
              {t('next')}
            </button>
          )}

          <button className={styles.secondaryBtn} onClick={() => setPhase('lobby')}>
            {t('back')}
          </button>
        </div>
      )}

      {/* ===== QUEUE ===== */}
      {phase === 'queue' && (
        <div className={styles.queueScreen}>
          <div className={styles.queuePulse} />
          <div className={styles.sectionTitle}>{t('searching')}</div>
          <div className={styles.queueInfo}>
            {t('queueInfo')}
          </div>
          <div className={styles.queueCount}>
            {t('playersInQueue', { count: queueSize })}
          </div>
          <button className={styles.secondaryBtn} onClick={cancelQueue}>
            {t('cancel')}
          </button>
        </div>
      )}

      {/* ===== WAITING ROOM ===== */}
      {phase === 'waiting-room' && arenaState && (
        <div className={styles.waitingRoom}>
          <div className={styles.sectionTitle}>{arenaState.name}</div>

          <div className={styles.arenaCode}>
            <span className={styles.arenaCodeLabel}>{t('arenaCode')}</span>
            <span className={styles.arenaCodeValue}>{arenaState.code}</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(arenaState.code)}
            >
              {t('copy')}
            </button>
          </div>

          <div className={styles.playersGrid}>
            {arenaState.players.map((player) => (
              <div
                key={player.id}
                className={`${styles.playerSlot} ${player.ready ? styles.ready : ''} ${player.id === arenaState.hostId ? styles.host : ''}`}
                style={!player.connected ? { opacity: 0.5 } : {}}
              >
                <div className={styles.playerSlotName}>
                  {player.name}
                  {player.id === arenaState.hostId && (
                    <span className={styles.hostBadge}>HOST</span>
                  )}
                </div>
                <div className={styles.playerSlotStatus}>
                  {!player.connected ? t('reconnecting') : player.ready ? t('ready') : t('notReady')}
                </div>
              </div>
            ))}
            {Array.from({ length: ARENA_MAX_PLAYERS - arenaState.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.playerSlot} ${styles.empty}`}>
                <div className={styles.playerSlotName}>{t('waiting')}</div>
              </div>
            ))}
          </div>

          <div className={styles.waitingActions}>
            {!isHost && (
              <button
                className={myPlayer?.ready ? styles.secondaryBtn : styles.primaryBtn}
                onClick={() => setReady(!myPlayer?.ready)}
              >
                {myPlayer?.ready ? t('cancelReady') : t('readyUp')}
              </button>
            )}

            {isHost && (
              <button
                className={styles.primaryBtn}
                onClick={startArena}
                disabled={!allReady}
              >
                {allReady ? t('startArena') : t('waitingForPlayers')}
              </button>
            )}

            <button className={styles.secondaryBtn} onClick={leaveArena}>
              {t('leave')}
            </button>
          </div>
        </div>
      )}

      {/* ===== COUNTDOWN ===== */}
      {phase === 'countdown' && (
        <div className={styles.countdownScreen}>
          <div className={styles.countdownNumber}>{countdownNumber}</div>
          <div className={styles.countdownLabel}>{t('getReady')}</div>
        </div>
      )}

      {/* ===== PLAYING ===== */}
      {phase === 'playing' && arenaState && (
        <div className={styles.arenaPlayfield}>
          {/* HUD */}
          <div className={styles.hudBar}>
            <div className={styles.chaosBar}>
              <div className={styles.chaosLabel}>
                <span>{t('chaos')}</span>
                <span>{Math.round(chaosLevel)}%</span>
              </div>
              <div className={styles.chaosTrack}>
                <div
                  className={`${styles.chaosFill} ${chaosClass}`}
                  style={{ width: `${Math.min(100, chaosLevel)}%` }}
                />
              </div>
            </div>

            {activeGimmick && (
              <div className={styles.gimmickBanner}>
                {GIMMICK_LABELS[activeGimmick.type] || activeGimmick.type}
              </div>
            )}

            <div className={styles.arenaGameStats}>
              <span><span className={styles.arenaStatValue}>{score}</span> PTS</span>
              <span><span className={styles.arenaStatValue}>{lines}</span> LINES</span>
              <span><span className={styles.arenaStatValue}>{combo}</span> COMBO</span>
              <span>LV <span className={styles.arenaStatValue}>{level}</span></span>
            </div>

            <div className={styles.tempoDisplay}>
              <div className={`${styles.beatIndicator} ${onBeat ? styles.onBeat : ''}`} />
              <div className={styles.bpmValue}>{Math.round(bpm)}</div>
              <span>BPM</span>
            </div>
          </div>

          {/* Main Content: My Board + Opponents */}
          <div className={styles.arenaContent}>
            {/* My board with hold/next side panels */}
            <div className={styles.myBoardArea}>
              {/* Hold piece */}
              <div className={styles.arenaSidePanel}>
                <div className={styles.arenaSidePanelLabel}>HOLD</div>
                <PiecePreview pieceType={holdPiece} />
              </div>

              {/* Game board */}
              <div className={styles.myBoard} style={{ '--cell-size': '24px' } as React.CSSProperties}>
                {visualBoard.map((row, ri) => (
                  <div key={ri} className={styles.boardRow}>
                    {row.map((cell, ci) => (
                      <div
                        key={ci}
                        className={`${styles.boardCell} ${cell ? styles.filled : ''}`}
                        style={cell ? { background: cell.color } : { background: 'rgba(255,255,255,0.02)' }}
                      />
                    ))}
                  </div>
                ))}

                {/* Game over overlay */}
                {gameOver && (
                  <div className={styles.boardGameOver}>
                    <div className={styles.boardGameOverText}>GAME OVER</div>
                  </div>
                )}
              </div>

              {/* Next piece */}
              <div className={styles.arenaSidePanel}>
                <div className={styles.arenaSidePanelLabel}>NEXT</div>
                <PiecePreview pieceType={nextPiece || null} />
              </div>
            </div>

            {/* Opponents mini boards */}
            <div className={styles.opponentsSidebar}>
              {opponents.map((opp) => {
                const oppBoard = opponentBoards.get(opp.id);
                const oppSync = syncMap[opp.id] ?? 1.0;

                return (
                  <div
                    key={opp.id}
                    className={`${styles.opponentMini} ${!opp.alive ? styles.eliminated : ''}`}
                  >
                    <div className={styles.opponentName}>{opp.name}</div>
                    {oppBoard?.board ? (
                      <MiniBoardView board={oppBoard.board} />
                    ) : (
                      <div className={styles.opponentMiniBoard}>
                        {Array.from({ length: 10 }).map((_, ri) => (
                          <div key={ri} className={styles.miniRow}>
                            {Array.from({ length: 10 }).map((__, ci) => (
                              <div key={ci} className={styles.miniCell} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.opponentStats}>
                      <span>{oppBoard?.score ?? 0}</span>
                      <span>{oppBoard?.lines ?? 0}L</span>
                    </div>
                    <div className={styles.opponentSync}>
                      <div
                        className={styles.opponentSyncFill}
                        style={{ width: `${Math.round(oppSync * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overlays */}
          {showCollapse && <div className={styles.tempoCollapseOverlay} />}
          {showElimBanner && lastElimination && (
            <div className={styles.eliminationBanner}>
              {lastElimination.playerName} {t('eliminated')} #{lastElimination.placement}
            </div>
          )}
        </div>
      )}

      {/* ===== RESULTS ===== */}
      {phase === 'ended' && sessionResult && (
        <div className={styles.resultsScreen}>
          <div className={styles.resultReason}>
            {sessionResult.reason === 'last_standing' && t('resultLastStanding')}
            {sessionResult.reason === 'tempo_collapse' && t('resultTempoCollapse')}
            {sessionResult.reason === 'chaos_overload' && t('resultChaosOverload')}
          </div>

          <h2 className={`${styles.resultTitle} ${sessionResult.winnerId !== playerId ? styles.defeat : ''}`}>
            {sessionResult.winnerId === playerId
              ? t('victory')
              : sessionResult.winnerId
                ? `${sessionResult.winnerName} ${t('wins')}`
                : t('noWinner')}
          </h2>

          {/* Rankings */}
          <div className={styles.rankingsTable}>
            {sessionResult.rankings.map((r) => (
              <div
                key={r.playerId}
                className={`${styles.rankingRow} ${r.playerId === playerId ? styles.isMe : ''} ${r.placement === 1 ? styles.first : ''}`}
              >
                <div className={styles.rankingPlace}>#{r.placement}</div>
                <div className={styles.rankingName}>{r.playerName}</div>
                <div className={styles.rankingStat}>{r.score} pts</div>
                <div className={styles.rankingStat}>{r.kills} KO</div>
                <div className={styles.rankingStat}>{Math.round(r.avgSync * 100)}%</div>
              </div>
            ))}
          </div>

          {/* Session Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                {Math.floor(sessionResult.stats.totalDurationMs / 1000)}s
              </div>
              <div className={styles.statLabel}>{t('duration')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.peakBpm)}</div>
              <div className={styles.statLabel}>{t('peakBpm')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{sessionResult.stats.totalGimmicks}</div>
              <div className={styles.statLabel}>{t('gimmicks')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.peakChaos)}</div>
              <div className={styles.statLabel}>{t('peakChaos')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{sessionResult.stats.tempoCollapses}</div>
              <div className={styles.statLabel}>{t('tempoCollapses')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.lowestBpm)}</div>
              <div className={styles.statLabel}>{t('lowestBpm')}</div>
            </div>
          </div>

          <div className={styles.resultActions}>
            <button className={styles.primaryBtn} onClick={() => { leaveArena(); }}>
              {t('backToLobby')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
