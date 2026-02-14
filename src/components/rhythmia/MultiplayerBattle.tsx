'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MultiplayerBattle.module.css';
import type { Player, ServerMessage, RelayPayload, BoardCell } from '@/types/multiplayer';
import { recordMultiplayerGameEnd, checkLiveMultiplayerAdvancements, saveLiveUnlocks } from '@/lib/advancements/storage';
import AdvancementToast from './AdvancementToast';

// ===== Import shared vanilla architecture =====
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINOES,
  STANDARD_COLORS,
  LOCK_DELAY,
  MAX_LOCK_MOVES,
  DEFAULT_DAS,
  DEFAULT_ARR,
  ROTATION_NAMES,
  WALL_KICKS_I,
  WALL_KICKS_JLSTZ,
  WORLDS,
} from './tetris/constants';
import type { Piece, Board } from './tetris/types';
import {
  createEmptyBoard,
  getShape,
  isValidPosition,
  tryRotation,
  lockPiece,
  clearLines,
  getGhostY,
  createSpawnPiece,
} from './tetris/utils';
import { useAudio } from './tetris/hooks';

// ===== Multiplayer-specific constants =====
const BPM = 120;
const SOFT_DROP_SPEED = 50;
const GARBAGE_MARKER = 'G';
const GARBAGE_COLOR = '#555555';

interface Props {
  ws: WebSocket;
  roomCode: string;
  playerId: string;
  playerName: string;
  opponents: Player[];
  gameSeed: number;
  onGameEnd: (winnerId: string) => void;
  onBackToLobby: () => void;
}

// ===== Seeded RNG (for synchronized piece distribution) =====
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ===== Seeded 7-Bag Randomizer =====
function createSeeded7Bag(rng: () => number) {
  const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
  let bag: string[] = [];

  return (): string => {
    if (bag.length === 0) {
      bag = [...PIECE_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}

// ===== Board conversion helpers (vanilla Board <-> multiplayer BoardCell) =====
function boardToRelay(board: Board): (BoardCell | null)[][] {
  return board.map(row =>
    row.map(cell => {
      if (cell === null) return null;
      if (cell === GARBAGE_MARKER) return { color: GARBAGE_COLOR };
      return { color: STANDARD_COLORS[cell] || '#FFFFFF' };
    })
  );
}

function addGarbageLines(board: Board, count: number, rng: () => number): Board {
  if (count <= 0) return board;
  const newBoard = board.slice(count);
  for (let i = 0; i < count; i++) {
    const row: (string | null)[] = Array(BOARD_WIDTH).fill(GARBAGE_MARKER);
    const gap = Math.floor(rng() * BOARD_WIDTH);
    row[gap] = null;
    newBoard.push(row);
  }
  return newBoard;
}

// ===== Component =====
export const MultiplayerBattle: React.FC<Props> = ({
  ws,
  roomCode,
  playerId,
  playerName,
  opponents,
  gameSeed,
  onGameEnd,
  onBackToLobby,
}) => {
  const opponent = opponents[0];

  // Shared audio hook from vanilla architecture
  const audio = useAudio();

  // Game state — using vanilla Board type (string | null cells)
  const boardRef = useRef<Board>(createEmptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const holdRef = useRef<string | null>(null);
  const holdUsedRef = useRef(false);
  const nextQueueRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const linesRef = useRef(0);
  const gameOverRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
  const lockMovesRef = useRef(0);
  const isOnGroundRef = useRef(false);
  const pendingGarbageRef = useRef(0);

  // Per-game stat tracking for advancements
  const gameHardDropsRef = useRef(0);
  const gamePiecesPlacedRef = useRef(0);
  const advRecordedRef = useRef(false);
  const liveNotifiedRef = useRef<Set<string>>(new Set());
  const [toastIds, setToastIds] = useState<string[]>([]);

  // Opponent state (kept as relay BoardCell for display)
  const opponentBoardRef = useRef<(BoardCell | null)[][]>(
    Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null))
  );
  const opponentScoreRef = useRef(0);
  const opponentLinesRef = useRef(0);

  // For re-rendering
  const [, forceRender] = useState(0);
  const render = useCallback(() => forceRender(c => c + 1), []);

  // Seeded RNG
  const rngRef = useRef(createRNG(gameSeed));
  const bagRef = useRef(createSeeded7Bag(rngRef.current));
  const garbageRngRef = useRef(createRNG(gameSeed + 1));

  // Rhythm
  const lastBeatRef = useRef(Date.now());
  const beatPhaseRef = useRef(0);

  // Timers
  const dropTimerRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);
  const beatAnimRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  // Input state
  const keysRef = useRef<Set<string>>(new Set());
  const dasTimerRef = useRef<number | null>(null);
  const arrTimerRef = useRef<number | null>(null);
  const softDropTimerRef = useRef<number | null>(null);
  const lastDirRef = useRef<string>('');

  // ===== Relay =====
  const sendRelay = useCallback((payload: RelayPayload) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'relay', payload }));
    }
  }, [ws]);

  const sendBoardUpdate = useCallback(() => {
    sendRelay({
      event: 'board_update',
      board: boardToRelay(boardRef.current),
      score: scoreRef.current,
      lines: linesRef.current,
      combo: comboRef.current,
      piece: pieceRef.current?.type,
      hold: holdRef.current,
    });
  }, [sendRelay]);

  const sendGarbage = useCallback((lines: number) => {
    if (lines > 0) {
      sendRelay({ event: 'garbage', lines });
    }
  }, [sendRelay]);

  const sendGameOver = useCallback(() => {
    sendRelay({ event: 'game_over' });
  }, [sendRelay]);

  // ===== Piece Queue =====
  const fillQueue = useCallback(() => {
    while (nextQueueRef.current.length < 5) {
      nextQueueRef.current.push(bagRef.current());
    }
  }, []);

  const spawnPiece = useCallback((): boolean => {
    fillQueue();
    const type = nextQueueRef.current.shift()!;
    fillQueue();

    const piece = createSpawnPiece(type);

    if (!isValidPosition(piece, boardRef.current)) {
      gameOverRef.current = true;
      sendGameOver();
      if (!advRecordedRef.current) {
        advRecordedRef.current = true;
        const result = recordMultiplayerGameEnd({
          score: scoreRef.current,
          lines: linesRef.current,
          won: false,
          hardDrops: gameHardDropsRef.current,
          piecesPlaced: gamePiecesPlacedRef.current,
        });
        if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
      }
      onGameEnd(opponent?.id || '');
      render();
      return false;
    }

    pieceRef.current = piece;
    holdUsedRef.current = false;
    lockMovesRef.current = 0;
    isOnGroundRef.current = false;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    render();
    return true;
  }, [fillQueue, sendGameOver, onGameEnd, opponent, render]);

  // ===== Lock Delay =====
  const startLockTimer = useCallback(() => {
    if (lockTimerRef.current) return;
    lockTimerRef.current = window.setTimeout(() => {
      lockTimerRef.current = null;
      performLockRef.current();
    }, LOCK_DELAY);
  }, []);

  const resetLockTimer = useCallback(() => {
    if (lockMovesRef.current >= MAX_LOCK_MOVES) return;
    lockMovesRef.current++;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    if (pieceRef.current && !isValidPosition({ ...pieceRef.current, y: pieceRef.current.y + 1 }, boardRef.current)) {
      startLockTimer();
    }
  }, [startLockTimer]);

  // Stable callback for toast dismiss
  const dismissToast = useCallback(() => setToastIds([]), []);

  // Push-based live advancement check
  const pushLiveAdvancementCheck = useCallback(() => {
    const qualifying = checkLiveMultiplayerAdvancements({
      score: scoreRef.current,
      lines: linesRef.current,
      won: false,
      hardDrops: gameHardDropsRef.current,
      piecesPlaced: gamePiecesPlacedRef.current,
    });
    const fresh = qualifying.filter(id => !liveNotifiedRef.current.has(id));
    if (fresh.length > 0) {
      fresh.forEach(id => liveNotifiedRef.current.add(id));
      setToastIds(prev => [...prev, ...fresh]);
      saveLiveUnlocks(fresh);
    }
  }, []);

  // ===== Core Game Logic =====
  const performLock = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return;

    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    // Check if piece is above board
    const shape = getShape(piece.type, piece.rotation);
    let aboveBoard = false;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] && piece.y + y < 0) {
          aboveBoard = true;
        }
      }
    }

    if (aboveBoard) {
      gameOverRef.current = true;
      sendGameOver();
      if (!advRecordedRef.current) {
        advRecordedRef.current = true;
        const result = recordMultiplayerGameEnd({
          score: scoreRef.current,
          lines: linesRef.current,
          won: false,
          hardDrops: gameHardDropsRef.current,
          piecesPlaced: gamePiecesPlacedRef.current,
        });
        if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
      }
      onGameEnd(opponent?.id || '');
      render();
      return;
    }

    // Beat judgment (same rhythm system as vanilla)
    const phase = beatPhaseRef.current;
    const onBeat = phase > 0.8 || phase < 0.12;
    let mult = 1;

    if (onBeat) {
      mult = 2;
      comboRef.current++;
      audio.playPerfectSound();
    } else {
      comboRef.current = 0;
    }

    // Track pieces placed
    gamePiecesPlacedRef.current++;

    // Lock to board using vanilla utility
    let newBoard = lockPiece(piece, boardRef.current);

    // Apply pending garbage before clearing
    const garbage = pendingGarbageRef.current;
    if (garbage > 0) {
      newBoard = addGarbageLines(newBoard, garbage, garbageRngRef.current);
      pendingGarbageRef.current = 0;
    }

    // Clear lines using vanilla utility
    const { newBoard: clearedBoard, clearedLines: cleared } = clearLines(newBoard);
    boardRef.current = clearedBoard;

    if (cleared > 0) {
      const base = [0, 100, 300, 500, 800][cleared];
      const pts = base * mult * Math.max(1, comboRef.current);
      scoreRef.current += pts;
      linesRef.current += cleared;

      // Send garbage to opponent
      const garbageToSend = [0, 0, 1, 2, 4][cleared] + Math.floor(comboRef.current / 3);
      sendGarbage(garbageToSend);
      audio.playLineClear(cleared);
    }

    pieceRef.current = null;

    // Live advancement check after stats update
    pushLiveAdvancementCheck();

    // Send state update
    sendBoardUpdate();

    // Spawn next piece
    spawnPiece();
  }, [sendGameOver, onGameEnd, opponent, sendGarbage, sendBoardUpdate, audio, spawnPiece, render, pushLiveAdvancementCheck]);

  // Stable ref for performLock (circular dependency with startLockTimer)
  const performLockRef = useRef(performLock);
  performLockRef.current = performLock;

  // ===== Movement (using vanilla utilities) =====
  const moveHorizontal = useCallback((dx: number) => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return false;

    const moved = { ...piece, x: piece.x + dx };
    if (isValidPosition(moved, boardRef.current)) {
      pieceRef.current = moved;
      audio.playMoveSound();

      const onGround = !isValidPosition({ ...moved, y: moved.y + 1 }, boardRef.current);
      if (onGround) {
        resetLockTimer();
      } else if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }

      render();
      return true;
    }
    return false;
  }, [audio, resetLockTimer, render]);

  const moveDown = useCallback((): boolean => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return false;

    const moved = { ...piece, y: piece.y + 1 };
    if (isValidPosition(moved, boardRef.current)) {
      pieceRef.current = moved;

      if (!isValidPosition({ ...moved, y: moved.y + 1 }, boardRef.current)) {
        if (!isOnGroundRef.current) {
          isOnGroundRef.current = true;
          startLockTimer();
        }
      }

      render();
      return true;
    } else {
      if (!isOnGroundRef.current) {
        isOnGroundRef.current = true;
        startLockTimer();
      }
      return false;
    }
  }, [startLockTimer, render]);

  const rotatePiece = useCallback((direction: 1 | -1) => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return;

    // Use vanilla tryRotation utility (shared SRS wall kicks)
    const rotated = tryRotation(piece, direction, boardRef.current);
    if (rotated) {
      pieceRef.current = rotated;
      audio.playRotateSound();

      const onGround = !isValidPosition({ ...rotated, y: rotated.y + 1 }, boardRef.current);
      if (onGround) {
        resetLockTimer();
      } else if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
        isOnGroundRef.current = false;
      }

      render();
    }
  }, [audio, resetLockTimer, render]);

  const hardDrop = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return;

    gameHardDropsRef.current++;
    // Use vanilla getGhostY utility
    const gy = getGhostY(piece, boardRef.current);
    const dropDist = gy - piece.y;
    pieceRef.current = { ...piece, y: gy };
    scoreRef.current += dropDist * 2;
    audio.playHardDropSound();
    performLockRef.current();
  }, [audio]);

  const holdPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current || holdUsedRef.current) return;

    holdUsedRef.current = true;
    const prevHold = holdRef.current;
    holdRef.current = piece.type;

    if (prevHold) {
      // Use vanilla createSpawnPiece utility
      pieceRef.current = createSpawnPiece(prevHold);
      lockMovesRef.current = 0;
      isOnGroundRef.current = false;
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
    } else {
      pieceRef.current = null;
      spawnPiece();
    }

    audio.playTone(440, 0.08);
    render();
  }, [spawnPiece, audio, render]);

  // ===== WebSocket Message Handler =====
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'relayed' && msg.fromPlayerId !== playerId) {
          const payload = msg.payload;
          if (payload.event === 'board_update') {
            opponentBoardRef.current = payload.board;
            opponentScoreRef.current = payload.score;
            opponentLinesRef.current = payload.lines;
            render();
          } else if (payload.event === 'garbage') {
            pendingGarbageRef.current += payload.lines;
            render();
          } else if (payload.event === 'game_over') {
            if (!gameOverRef.current) {
              gameOverRef.current = true;
              if (!advRecordedRef.current) {
                advRecordedRef.current = true;
                const result = recordMultiplayerGameEnd({
                  score: scoreRef.current,
                  lines: linesRef.current,
                  won: true,
                  hardDrops: gameHardDropsRef.current,
                  piecesPlaced: gamePiecesPlacedRef.current,
                });
                if (result.newlyUnlockedIds.length > 0) setToastIds(result.newlyUnlockedIds);
              }
              onGameEnd(playerId);
              render();
            }
          }
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {}
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, playerId, onGameEnd, render]);

  // ===== Initialize Game =====
  useEffect(() => {
    audio.initAudio();

    // Reset state
    boardRef.current = createEmptyBoard();
    pieceRef.current = null;
    holdRef.current = null;
    holdUsedRef.current = false;
    nextQueueRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    linesRef.current = 0;
    gameOverRef.current = false;
    pendingGarbageRef.current = 0;
    gameHardDropsRef.current = 0;
    gamePiecesPlacedRef.current = 0;
    advRecordedRef.current = false;
    liveNotifiedRef.current = new Set();
    setToastIds([]);
    opponentBoardRef.current = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
    opponentScoreRef.current = 0;
    opponentLinesRef.current = 0;

    // Reset seeded RNG
    rngRef.current = createRNG(gameSeed);
    bagRef.current = createSeeded7Bag(rngRef.current);
    garbageRngRef.current = createRNG(gameSeed + 1);

    lastBeatRef.current = Date.now();

    // Fill queue and spawn first piece
    fillQueue();
    spawnPiece();

    // Send initial state
    setTimeout(() => sendBoardUpdate(), 100);

    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSeed]);

  // ===== Drop Timer =====
  useEffect(() => {
    if (gameOverRef.current) return;

    const level = Math.floor(linesRef.current / 10) + 1;
    const speed = Math.max(100, 1000 - (level - 1) * 80);

    dropTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        moveDown();
      }
    }, speed);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [moveDown]);

  // ===== Beat Timer =====
  useEffect(() => {
    if (gameOverRef.current) return;

    const interval = 60000 / BPM;
    lastBeatRef.current = Date.now();

    beatTimerRef.current = window.setInterval(() => {
      lastBeatRef.current = Date.now();
      audio.playDrum();
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [audio]);

  // ===== Beat Phase Animation =====
  useEffect(() => {
    if (gameOverRef.current) return;

    const update = () => {
      if (!gameOverRef.current) {
        const interval = 60000 / BPM;
        const elapsed = Date.now() - lastBeatRef.current;
        beatPhaseRef.current = (elapsed % interval) / interval;
        beatAnimRef.current = requestAnimationFrame(update);
      }
    };
    beatAnimRef.current = requestAnimationFrame(update);

    return () => {
      if (beatAnimRef.current) cancelAnimationFrame(beatAnimRef.current);
    };
  }, []);

  // ===== Periodic Board Sync =====
  useEffect(() => {
    if (gameOverRef.current) return;

    syncTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        sendBoardUpdate();
      }
    }, 500);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [sendBoardUpdate]);

  // ===== Keyboard Controls =====
  useEffect(() => {
    const clearDAS = () => {
      if (dasTimerRef.current) { clearTimeout(dasTimerRef.current); dasTimerRef.current = null; }
      if (arrTimerRef.current) { clearInterval(arrTimerRef.current); arrTimerRef.current = null; }
    };

    const startDAS = (dir: string, dx: number) => {
      clearDAS();
      lastDirRef.current = dir;
      moveHorizontal(dx);
      dasTimerRef.current = window.setTimeout(() => {
        dasTimerRef.current = null;
        arrTimerRef.current = window.setInterval(() => moveHorizontal(dx), DEFAULT_ARR);
      }, DEFAULT_DAS);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;
      if (keysRef.current.has(e.key)) return;
      keysRef.current.add(e.key);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          startDAS('left', -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          startDAS('right', 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDropTimerRef.current = window.setInterval(() => moveDown(), SOFT_DROP_SPEED);
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
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'Shift':
        case 'c':
        case 'C':
          e.preventDefault();
          holdPiece();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);

      switch (e.key) {
        case 'ArrowLeft':
          if (lastDirRef.current === 'left') clearDAS();
          break;
        case 'ArrowRight':
          if (lastDirRef.current === 'right') clearDAS();
          break;
        case 'ArrowDown':
          if (softDropTimerRef.current) {
            clearInterval(softDropTimerRef.current);
            softDropTimerRef.current = null;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      clearDAS();
      if (softDropTimerRef.current) clearInterval(softDropTimerRef.current);
    };
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop, holdPiece]);

  // Persist advancement stats on unmount
  useEffect(() => {
    return () => {
      if (!gameOverRef.current) {
        recordMultiplayerGameEnd({
          score: scoreRef.current,
          lines: linesRef.current,
          won: false,
          hardDrops: gameHardDropsRef.current,
          piecesPlaced: gamePiecesPlacedRef.current,
        });
      }
    };
  }, []);

  // ===== Render =====
  const board = boardRef.current;
  const piece = pieceRef.current;
  const hold = holdRef.current;
  const nextQueue = nextQueueRef.current;
  const score = scoreRef.current;
  const combo = comboRef.current;
  const lines = linesRef.current;
  const gameOver = gameOverRef.current;
  const pendingGarbage = pendingGarbageRef.current;
  const opponentBoard = opponentBoardRef.current;
  const opponentScore = opponentScoreRef.current;
  const opponentLines = opponentLinesRef.current;

  // Build display board using vanilla utilities
  const displayBoard: ({ color: string; ghost: boolean } | null)[][] = board.map(row =>
    row.map(cell => {
      if (cell === null) return null;
      const color = cell === GARBAGE_MARKER ? GARBAGE_COLOR : (STANDARD_COLORS[cell] || '#FFFFFF');
      return { color, ghost: false };
    })
  );

  if (piece) {
    const gy = getGhostY(piece, board);
    const shape = getShape(piece.type, piece.rotation);
    const color = STANDARD_COLORS[piece.type] || '#FFFFFF';

    // Ghost piece
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const by = gy + y;
          const bx = piece.x + x;
          if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH && !displayBoard[by][bx]) {
            displayBoard[by][bx] = { color, ghost: true };
          }
        }
      }
    }

    // Active piece
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const by = piece.y + y;
          const bx = piece.x + x;
          if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
            displayBoard[by][bx] = { color, ghost: false };
          }
        }
      }
    }
  }

  // Opponent display board
  const opponentDisplay = opponentBoard.map(row =>
    row.map(cell => cell ? { ...cell, ghost: false } : null)
  );

  // Next piece preview using vanilla getShape
  const renderPreview = (type: string) => {
    const shape = getShape(type, 0);
    return (
      <div className={styles.previewGrid} style={{ gridTemplateColumns: `repeat(${shape[0].length}, auto)` }}>
        {shape.flat().map((val, i) => (
          <div
            key={i}
            className={`${styles.previewCell} ${val ? styles.filled : ''}`}
            style={val ? { backgroundColor: STANDARD_COLORS[type], boxShadow: `0 0 6px ${STANDARD_COLORS[type]}` } : {}}
          />
        ))}
      </div>
    );
  };

  const handleControlClick = (action: string) => {
    if (gameOver) return;
    switch (action) {
      case 'left': moveHorizontal(-1); break;
      case 'right': moveHorizontal(1); break;
      case 'down': moveDown(); break;
      case 'rotateCW': rotatePiece(1); break;
      case 'rotateCCW': rotatePiece(-1); break;
      case 'drop': hardDrop(); break;
      case 'hold': holdPiece(); break;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.battleArena}>
        {/* Player Side */}
        <div className={styles.playerSide}>
          {/* Hold + Next */}
          <div className={styles.sidePanel}>
            <div className={styles.holdBox}>
              <div className={styles.panelLabel}>HOLD</div>
              {hold ? renderPreview(hold) : <div className={styles.emptyPreview} />}
            </div>
            <div className={styles.nextBox}>
              <div className={styles.panelLabel}>NEXT</div>
              {nextQueue.slice(0, 3).map((type, i) => (
                <div key={i} className={styles.nextItem}>
                  {renderPreview(type)}
                </div>
              ))}
            </div>
          </div>

          {/* Board */}
          <div className={styles.boardSection}>
            <div className={styles.playerHeader}>
              <div className={styles.playerName}>{playerName}</div>
              <div className={styles.playerScore}>{score.toLocaleString()}</div>
            </div>

            <div className={styles.boardWrap}>
              {/* Garbage meter */}
              {pendingGarbage > 0 && (
                <div className={styles.garbageMeter}>
                  <div
                    className={styles.garbageFill}
                    style={{ height: `${Math.round(Math.min(100, (pendingGarbage / BOARD_HEIGHT) * 100))}%` }}
                  />
                </div>
              )}

              <div className={styles.board} style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, auto)` }}>
                {displayBoard.flat().map((cell, i) => (
                  <div
                    key={i}
                    className={`${styles.cell} ${cell && !cell.ghost ? styles.filled : ''} ${cell?.ghost ? styles.ghost : ''}`}
                    style={cell && !cell.ghost ? { backgroundColor: cell.color, boxShadow: `0 0 8px ${cell.color}40` } : cell?.ghost ? { borderColor: `${cell.color}40` } : {}}
                  />
                ))}
              </div>
            </div>

            <div className={styles.statsRow}>
              <span>Lines: {lines}</span>
              <span>Combo: {combo}</span>
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className={styles.vsDivider}>VS</div>

        {/* Opponent Side */}
        <div className={styles.opponentSide}>
          <div className={styles.boardSection}>
            <div className={styles.opponentHeader}>
              <div className={styles.opponentName}>{opponent?.name || 'Opponent'}</div>
              <div className={styles.opponentScore}>{opponentScore.toLocaleString()}</div>
            </div>

            <div className={`${styles.boardWrap} ${styles.opponentBoardWrap}`}>
              <div className={styles.board} style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, auto)` }}>
                {opponentDisplay.flat().map((cell, i) => (
                  <div
                    key={i}
                    className={`${styles.cell} ${cell ? styles.filled : ''}`}
                    style={cell ? { backgroundColor: cell.color, boxShadow: `0 0 6px ${cell.color}40` } : {}}
                  />
                ))}
              </div>
            </div>

            <div className={styles.statsRow}>
              <span>Lines: {opponentLines}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('hold'); }} onClick={() => handleControlClick('hold')}>H</button>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('rotateCCW'); }} onClick={() => handleControlClick('rotateCCW')}>&#x21BA;</button>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('rotateCW'); }} onClick={() => handleControlClick('rotateCW')}>&#x21BB;</button>
          <button className={`${styles.ctrlBtn} ${styles.dropBtn}`} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('drop'); }} onClick={() => handleControlClick('drop')}>&#x2B07;</button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('left'); }} onClick={() => handleControlClick('left')}>&#x2190;</button>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('down'); }} onClick={() => handleControlClick('down')}>&#x2193;</button>
          <button className={styles.ctrlBtn} onTouchEnd={(e) => { e.preventDefault(); handleControlClick('right'); }} onClick={() => handleControlClick('right')}>&#x2192;</button>
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <div className={styles.gameOverOverlay}>
          <h2 className={styles.gameOverTitle}>
            GAME OVER
          </h2>
          <div className={styles.finalScores}>
            <div>{playerName}: {score.toLocaleString()}</div>
            <div>{opponent?.name || 'Opponent'}: {opponentScore.toLocaleString()}</div>
          </div>
          <button className={styles.backBtn} onClick={onBackToLobby}>
            Back to Lobby
          </button>
        </div>
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
};

export default MultiplayerBattle;
