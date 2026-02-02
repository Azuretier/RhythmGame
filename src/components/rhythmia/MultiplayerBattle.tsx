'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MultiplayerBattle.module.css';
import type { GameAction, TickInputsMessage, GameResyncMessage } from '@/types/multiplayer';

// ===== Types =====
interface PieceCell {
  color: string;
  ghost?: boolean;
}

interface Piece {
  shape: number[][];
  color: string;
}

interface GameState {
  board: (PieceCell | null)[][];
  piece: Piece | null;
  piecePos: { x: number; y: number };
  nextPiece: Piece | null;
  score: number;
  combo: number;
  lines: number;
}

interface Props {
  roomCode: string;
  playerId: string;
  playerName: string;
  opponentId?: string;
  opponentName?: string;
  onGameEnd: (winnerId: string) => void;
  onBackToLobby: () => void;
}

// ===== Constants =====
const W = 10;
const H = 18;
const BPM = 120;

const COLORS = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#FF6B6B', '#A29BFE', '#FF8FAB', '#3DA69B'];
const GARBAGE_COLOR = '#666666';

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
];

// ===== Component =====
export const MultiplayerBattle: React.FC<Props> = ({
  roomCode,
  playerId,
  playerName,
  opponentId,
  opponentName,
  onGameEnd,
  onBackToLobby,
}) => {
  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Game state - Player
  const [board, setBoard] = useState<(PieceCell | null)[][]>([]);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [piecePos, setPiecePos] = useState({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lines, setLines] = useState(0);

  // Game state - Opponent
  const [opponentBoard, setOpponentBoard] = useState<(PieceCell | null)[][]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentLines, setOpponentLines] = useState(0);

  // Game status
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [beatPhase, setBeatPhase] = useState(0);
  const [judgmentText, setJudgmentText] = useState('');
  const [showJudgmentAnim, setShowJudgmentAnim] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [pendingGarbage, setPendingGarbage] = useState(0);
  const [currentTick, setCurrentTick] = useState(0);

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatRef = useRef(Date.now());
  const dropTimerRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellSizeRef = useRef(20);
  const currentTickRef = useRef(0);

  // Refs for current state
  const pieceRef = useRef(piece);
  const piecePosRef = useRef(piecePos);
  const boardStateRef = useRef(board);
  const gameOverRef = useRef(gameOver);
  const comboRef = useRef(combo);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const beatPhaseRef = useRef(beatPhase);
  const pendingGarbageRef = useRef(pendingGarbage);
  const keysPressed = useRef<Set<string>>(new Set());
  const softDropInterval = useRef<number | null>(null);
  const moveRepeatTimeout = useRef<number | null>(null);
  const moveRepeatInterval = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { piecePosRef.current = piecePos; }, [piecePos]);
  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);
  useEffect(() => { pendingGarbageRef.current = pendingGarbage; }, [pendingGarbage]);
  useEffect(() => { currentTickRef.current = currentTick; }, [currentTick]);

  // ===== Audio =====
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playTone = useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }, []);

  const playDrum = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playLineClear = useCallback((count: number) => {
    const freqs = [523, 659, 784, 1047];
    freqs.slice(0, count).forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle'), i * 60));
  }, [playTone]);

  const showJudgment = useCallback((text: string) => {
    setJudgmentText(text);
    setShowJudgmentAnim(false);
    requestAnimationFrame(() => {
      setShowJudgmentAnim(true);
    });
  }, []);

  // ===== WebSocket =====
  const connectWebSocket = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setWsConnected(true);
      
      // Join the room after connection
      ws.send(JSON.stringify({
        type: 'relay',
        payload: {
          type: 'join_room',
          roomCode: roomCode,
          playerId: playerId,
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle tick_inputs - authoritative server inputs
        if (message.type === 'tick_inputs') {
          const tickMsg = message as TickInputsMessage;
          handleTickInputs(tickMsg);
        } 
        // Handle resync message
        else if (message.type === 'game_resync') {
          const resyncMsg = message as GameResyncMessage;
          handleResync(resyncMsg);
        }
        // Fallback to old relay protocol for backward compatibility
        else if (message.type === 'relayed' && message.fromPlayerId !== playerId) {
          const payload = message.payload;
          
          if (payload.type === 'game_state') {
            // Update opponent's board (fallback)
            setOpponentBoard(payload.board);
            setOpponentScore(payload.score);
            setOpponentLines(payload.lines);
          } else if (payload.type === 'garbage') {
            // Receive garbage from opponent (fallback)
            setPendingGarbage(prev => prev + payload.count);
          } else if (payload.type === 'game_over') {
            // Opponent lost - we win! (fallback)
            handleGameEnd(playerId);
          }
        } else if (message.type === 'ping') {
          // Respond to ping to keep connection alive
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [playerId, roomCode, showJudgment, playTone, onGameEnd]);

  // Send input to server for current tick
  const sendInput = useCallback((actions: GameAction[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        tick: currentTickRef.current,
        actions,
      }));
    }
  }, []); // currentTickRef is a ref, so it's safe to omit from dependencies

  // Request resync from server
  const requestResync = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_resync_request',
      }));
    }
  }, []);

  // Handle tick inputs from server
  const handleTickInputs = useCallback((tickMsg: TickInputsMessage) => {
    // Process inputs for all players simultaneously
    const { tick, inputs } = tickMsg;
    
    // Note: Full deterministic opponent simulation requires refactoring
    // game logic to be pure/stateless. For now, we rely on the relay
    // fallback (sendGameState) to sync opponent's board state.
    // Future improvement: implement deterministic replay of opponent inputs.

    // Update current tick
    setCurrentTick(tick + 1);
  }, []);

  // Handle resync message from server
  const handleResync = useCallback((resyncMsg: GameResyncMessage) => {
    console.log('[RESYNC] Received tick', resyncMsg.currentTick);
    setCurrentTick(resyncMsg.currentTick);
    // Could replay tick history here if needed
  }, []);

  const sendGameState = useCallback((state: Partial<GameState>) => {
    // Keep this for backward compatibility / fallback
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay',
        payload: {
          type: 'game_state',
          board: state.board || boardStateRef.current,
          score: state.score !== undefined ? state.score : scoreRef.current,
          lines: state.lines !== undefined ? state.lines : linesRef.current,
        },
      }));
    }
  }, []);

  const sendGarbage = useCallback((count: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay',
        payload: {
          type: 'garbage',
          count,
        },
      }));
    }
  }, []);

  const sendGameOver = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'relay',
        payload: {
          type: 'game_over',
        },
      }));
    }
  }, []);

  // ===== Game Logic =====
  const randomPiece = useCallback((): Piece => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { shape, color };
  }, []);

  const collision = useCallback((p: Piece, x: number, y: number, boardState: (PieceCell | null)[][]): boolean => {
    return p.shape.some((row, py) =>
      row.some((val, px) => {
        if (!val) return false;
        const nx = x + px, ny = y + py;
        return nx < 0 || nx >= W || ny >= H || (ny >= 0 && boardState[ny] && boardState[ny][nx]);
      })
    );
  }, []);

  const rotate = useCallback((p: Piece): Piece => {
    return {
      ...p,
      shape: p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse()),
    };
  }, []);

  const completeBoard = useCallback((partialBoard: (PieceCell | null)[][]) => {
    const completed = [...partialBoard];
    while (completed.length < H) {
      completed.unshift(Array(W).fill(null));
    }
    return completed;
  }, []);

  const addGarbageLines = useCallback((count: number) => {
    if (count <= 0) return boardStateRef.current;

    const newBoard = [...boardStateRef.current];
    
    // Remove top rows
    for (let i = 0; i < count; i++) {
      newBoard.shift();
    }

    // Add garbage rows at bottom
    for (let i = 0; i < count; i++) {
      const garbageRow: (PieceCell | null)[] = Array(W).fill(null).map(() => ({ color: GARBAGE_COLOR } as PieceCell));
      const gapIndex = Math.floor(Math.random() * W);
      garbageRow[gapIndex] = null;
      newBoard.push(garbageRow);
    }

    return newBoard;
  }, []);

  const handleGameEnd = useCallback((winnerId: string) => {
    setGameOver(true);
    setWinner(winnerId);
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    
    if (winnerId === playerId) {
      showJudgment('VICTORY!');
      playTone(523, 0.3, 'triangle');
    } else {
      showJudgment('DEFEAT');
      playTone(131, 0.5, 'sawtooth');
    }

    onGameEnd(winnerId);
  }, [playerId, showJudgment, playTone, onGameEnd]);

  const lock = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;
    const currentBeatPhase = beatPhaseRef.current;

    if (!currentPiece) return;

    // Beat judgment
    const onBeat = currentBeatPhase > 0.75 || currentBeatPhase < 0.15;
    let mult = 1;

    if (onBeat) {
      mult = 2;
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      comboRef.current = newCombo;
      showJudgment('PERFECT!');
      playTone(1047, 0.2, 'triangle');
    } else {
      setCombo(0);
      comboRef.current = 0;
    }

    // Lock piece to board
    const newBoard = currentBoard.map(r => [...r]);
    let pieceExtendsAboveBoard = false;
    currentPiece.shape.forEach((row, py) => {
      row.forEach((val, px) => {
        if (val) {
          const by = currentPos.y + py, bx = currentPos.x + px;
          if (by < 0) {
            // Piece extends above the visible board - game over condition
            pieceExtendsAboveBoard = true;
          } else if (by >= 0 && by < H) {
            newBoard[by][bx] = { color: currentPiece.color };
          }
        }
      });
    });

    // Check if piece extends above board (game over)
    if (pieceExtendsAboveBoard) {
      sendGameOver();
      // Player lost - opponent wins
      // Use opponentId if available, otherwise this player loses to unknown opponent
      const winner = opponentId || playerId; // If no opponent, declare self as loser
      handleGameEnd(winner);
      return;
    }

    // Apply pending garbage
    const currentGarbage = pendingGarbageRef.current;
    let finalBoard = newBoard;
    if (currentGarbage > 0) {
      finalBoard = addGarbageLines(currentGarbage);
      setPendingGarbage(0);
      pendingGarbageRef.current = 0;
    }

    // Line clear
    let cleared = 0;
    const remainingBoard: (PieceCell | null)[][] = [];
    const rowsToClear: number[] = [];

    finalBoard.forEach((row, y) => {
      if (row.every(c => c !== null)) {
        cleared++;
        rowsToClear.push(y);
      } else {
        remainingBoard.push(row);
      }
    });

    // Prepare the board state for collision check
    let boardForCollisionCheck = finalBoard;
    if (cleared > 0) {
      // Complete the remaining board by adding empty rows at the top
      boardForCollisionCheck = completeBoard(remainingBoard);
      
      // Update the board state ref immediately to prevent using stale state in subsequent lock() calls
      boardStateRef.current = boardForCollisionCheck;

      setClearingRows(rowsToClear);
      setBoard(finalBoard);

      setTimeout(() => {
        const currentCombo = comboRef.current;
        const pts = [0, 100, 300, 500, 800][cleared] * mult * Math.max(1, currentCombo);
        const newScore = scoreRef.current + pts;
        const newLines = linesRef.current + cleared;

        setScore(newScore);
        scoreRef.current = newScore;
        setLines(newLines);
        linesRef.current = newLines;

        // Send garbage to opponent
        const garbageToSend = [0, 0, 1, 2, 4][cleared] + Math.floor(currentCombo / 3);
        if (garbageToSend > 0) {
          sendGarbage(garbageToSend);
        }

        playLineClear(cleared);
        setClearingRows([]);
        const completedBoard = completeBoard(remainingBoard);
        setBoard(completedBoard);
        boardStateRef.current = completedBoard;

        // Send updated state
        sendGameState({ board: completedBoard, score: newScore, lines: newLines });
      }, 300);
    } else {
      setBoard(finalBoard);
      boardStateRef.current = finalBoard;
      
      // Send updated state
      sendGameState({ board: finalBoard });
    }

    // Next piece
    const currentNextPiece = nextPiece;
    const newNextPiece = randomPiece();
    const newPos = { x: Math.floor(W / 2) - 1, y: 0 };

    setPiece(currentNextPiece);
    pieceRef.current = currentNextPiece;
    setNextPiece(newNextPiece);
    setPiecePos(newPos);
    piecePosRef.current = newPos;

    if (currentNextPiece && collision(currentNextPiece, newPos.x, newPos.y, boardForCollisionCheck)) {
      sendGameOver();
      // Player lost - opponent wins
      // Use opponentId if available, otherwise this player loses to unknown opponent
      const winner = opponentId || playerId; // If no opponent, declare self as loser
      handleGameEnd(winner);
    }
  }, [nextPiece, showJudgment, playTone, randomPiece, collision, playLineClear, sendGameState, sendGarbage, sendGameOver, handleGameEnd, opponentId, addGarbageLines, completeBoard]);

  const move = useCallback((dx: number, dy: number) => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    if (!collision(currentPiece, currentPos.x + dx, currentPos.y + dy, currentBoard)) {
      const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };
      setPiecePos(newPos);
      piecePosRef.current = newPos;
      if (dx !== 0) playTone(392, 0.05, 'square');
      
      // Send input to server
      if (dx !== 0) {
        sendInput([{ type: 'move', direction: dx < 0 ? 'left' : 'right' }]);
      } else if (dy > 0) {
        sendInput([{ type: 'move', direction: 'down' }]);
      }
    } else if (dy > 0) {
      lock();
    }
  }, [collision, playTone, lock, sendInput]);

  const rotatePiece = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    const rotated = rotate(currentPiece);
    if (!collision(rotated, currentPos.x, currentPos.y, currentBoard)) {
      setPiece(rotated);
      pieceRef.current = rotated;
      playTone(523, 0.08);
      
      // Send input to server
      sendInput([{ type: 'rotate' }]);
    }
  }, [rotate, collision, playTone, sendInput]);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    let currentPos = { ...piecePosRef.current };
    const currentBoard = boardStateRef.current;

    while (!collision(currentPiece, currentPos.x, currentPos.y + 1, currentBoard)) {
      currentPos.y++;
    }

    setPiecePos(currentPos);
    piecePosRef.current = currentPos;
    playTone(196, 0.1, 'sawtooth');
    
    // Send input to server
    sendInput([{ type: 'hard_drop' }]);
    
    setTimeout(lock, 30);
  }, [collision, playTone, lock, sendInput]);

  // ===== Initialize Game =====
  const initGame = useCallback(() => {
    initAudio();

    const initialBoard = Array(H).fill(null).map(() => Array(W).fill(null));
    const initialPiece = randomPiece();
    const initialNextPiece = randomPiece();
    const initialPos = { x: Math.floor(W / 2) - 1, y: 0 };

    setBoard(initialBoard);
    boardStateRef.current = initialBoard;
    setPiece(initialPiece);
    pieceRef.current = initialPiece;
    setNextPiece(initialNextPiece);
    setPiecePos(initialPos);
    piecePosRef.current = initialPos;
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setLines(0);
    linesRef.current = 0;
    setGameOver(false);
    gameOverRef.current = false;
    setClearingRows([]);
    setPendingGarbage(0);
    pendingGarbageRef.current = 0;
    setCurrentTick(0);
    currentTickRef.current = 0;

    // Initialize opponent board
    setOpponentBoard(Array(H).fill(null).map(() => Array(W).fill(null)));
    setOpponentScore(0);
    setOpponentLines(0);

    lastBeatRef.current = Date.now();

    // Send initial state (fallback for old protocol)
    setTimeout(() => {
      sendGameState({ board: initialBoard, score: 0, lines: 0 });
    }, 100);
  }, [initAudio, randomPiece, sendGameState]);

  // ===== Effects =====

  // WebSocket connection
  useEffect(() => {
    const cleanup = connectWebSocket();
    return cleanup;
  }, [connectWebSocket]);

  // Initialize game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Periodic game state sync to opponent
  useEffect(() => {
    if (gameOver || !wsConnected) return;

    const syncInterval = setInterval(() => {
      sendGameState({ board: boardStateRef.current, score: scoreRef.current, lines: linesRef.current });
    }, 1000); // Sync every second

    return () => clearInterval(syncInterval);
  }, [gameOver, wsConnected, sendGameState]);

  // Drop timer
  useEffect(() => {
    if (gameOver) return;

    dropTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        move(0, 1);
      }
    }, 500);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [gameOver, move]);

  // Beat timer
  useEffect(() => {
    if (gameOver) return;

    const interval = 60000 / BPM;

    beatTimerRef.current = window.setInterval(() => {
      lastBeatRef.current = Date.now();
      playDrum();
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [gameOver, playDrum]);

  // Beat phase animation
  useEffect(() => {
    if (gameOver) return;

    let animFrame: number;
    const updateBeat = () => {
      if (!gameOverRef.current) {
        const interval = 60000 / BPM;
        const elapsed = Date.now() - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        setBeatPhase(phase);
        beatPhaseRef.current = phase;
        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent key repeat events
      if (keysPressed.current.has(e.key)) return;
      keysPressed.current.add(e.key);

      switch (e.key) {
        case 'ArrowLeft':
          move(-1, 0);
          // Start repeat interval after 150ms delay
          moveRepeatTimeout.current = window.setTimeout(() => {
            moveRepeatInterval.current = window.setInterval(() => move(-1, 0), 50);
          }, 150);
          break;
        case 'ArrowRight':
          move(1, 0);
          // Start repeat interval after 150ms delay
          moveRepeatTimeout.current = window.setTimeout(() => {
            moveRepeatInterval.current = window.setInterval(() => move(1, 0), 50);
          }, 150);
          break;
        case 'ArrowDown':
          // Start continuous soft drop without immediate move to prevent instant lock
          softDropInterval.current = window.setInterval(() => move(0, 1), 50);
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          if (moveRepeatTimeout.current) {
            clearTimeout(moveRepeatTimeout.current);
            moveRepeatTimeout.current = null;
          }
          if (moveRepeatInterval.current) {
            clearInterval(moveRepeatInterval.current);
            moveRepeatInterval.current = null;
          }
          break;
        case 'ArrowDown':
          if (softDropInterval.current) {
            clearInterval(softDropInterval.current);
            softDropInterval.current = null;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (softDropInterval.current) clearInterval(softDropInterval.current);
      if (moveRepeatTimeout.current) clearTimeout(moveRepeatTimeout.current);
      if (moveRepeatInterval.current) clearInterval(moveRepeatInterval.current);
    };
  }, [move, rotatePiece, hardDrop]);

  // Update cell size on resize
  useEffect(() => {
    const updateCellSize = () => {
      if (boardRef.current) {
        const cell = boardRef.current.querySelector(`.${styles.cell}`) as HTMLElement;
        if (cell) {
          cellSizeRef.current = cell.getBoundingClientRect().width;
        }
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  // ===== Render Helpers =====
  const getDisplayBoard = useCallback((currentBoard: (PieceCell | null)[][], showPiece = true) => {
    // Ensure board has correct dimensions
    if (!currentBoard || currentBoard.length !== H) {
      return Array(H).fill(null).map(() => Array(W).fill(null));
    }
    
    const display = currentBoard.map(r => {
      if (!r || r.length !== W) {
        return Array(W).fill(null);
      }
      return r.map(c => c ? { ...c } : null);
    });

    // Ghost position for player board only
    if (showPiece && piece) {
      let gy = piecePos.y;
      while (!collision(piece, piecePos.x, gy + 1, currentBoard)) gy++;

      piece.shape.forEach((row, py) => {
        row.forEach((val, px) => {
          if (val) {
            const by = gy + py, bx = piecePos.x + px;
            if (by >= 0 && by < H && bx >= 0 && bx < W && !display[by][bx]) {
              display[by][bx] = { color: piece.color, ghost: true };
            }
          }
        });
      });
    }

    return display;
  }, [piece, piecePos, collision]);

  const handleControlClick = useCallback((action: string) => {
    switch (action) {
      case 'left': move(-1, 0); break;
      case 'right': move(1, 0); break;
      case 'down': move(0, 1); break;
      case 'rotate': rotatePiece(); break;
      case 'drop': hardDrop(); break;
    }
  }, [move, rotatePiece, hardDrop]);

  const displayBoard = getDisplayBoard(board);
  const opponentDisplayBoard = getDisplayBoard(opponentBoard, false);
  const unit = cellSizeRef.current + 1;

  return (
    <div className={styles.container}>
      {/* Connection status */}
      <div className={styles.statusBar}>
        <div className={`${styles.statusDot} ${wsConnected ? styles.connected : styles.disconnected}`} />
        <span className={styles.statusText}>
          {wsConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Battle Arena */}
      <div className={styles.battleArena}>
        {/* Player Board */}
        <div className={styles.playerSide}>
          <div className={styles.playerHeader}>
            <div className={styles.playerName}>{playerName}</div>
            <div className={styles.playerScore}>{score.toLocaleString()}</div>
          </div>
          
          <div
            ref={boardRef}
            className={styles.boardWrap}
          >
            <div className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
              {displayBoard.flat().map((cell, i) => {
                const y = Math.floor(i / W);
                const isClearing = clearingRows.includes(y);
                return (
                  <div
                    key={i}
                    className={`${styles.cell} ${cell ? styles.filled : ''} ${cell?.ghost ? styles.ghost : ''} ${isClearing ? styles.clearing : ''}`}
                    style={cell ? { backgroundColor: cell.color, color: cell.color } : {}}
                  />
                );
              })}
            </div>

            {/* Active Piece */}
            {piece && (
              <div
                className={styles.activePiece}
                style={{ transform: `translate(${piecePos.x * unit}px, ${piecePos.y * unit}px)` }}
              >
                {piece.shape.map((row, py) =>
                  row.map((val, px) =>
                    val ? (
                      <div
                        key={`${py}-${px}`}
                        className={styles.pieceCell}
                        style={{
                          width: cellSizeRef.current,
                          height: cellSizeRef.current,
                          backgroundColor: piece.color,
                          color: piece.color,
                          left: px * unit,
                          top: py * unit,
                        }}
                      />
                    ) : null
                  )
                )}
              </div>
            )}
          </div>

          <div className={styles.linesCount}>Lines: {lines}</div>
          
          {pendingGarbage > 0 && (
            <div className={styles.garbageWarning}>
              ⚠️ Incoming: {pendingGarbage} lines
            </div>
          )}
        </div>

        {/* Opponent Board */}
        <div className={styles.opponentSide}>
          <div className={styles.opponentHeader}>
            <div className={styles.opponentName}>{opponentName || 'Opponent'}</div>
            <div className={styles.opponentScore}>{opponentScore.toLocaleString()}</div>
          </div>
          
          <div className={`${styles.boardWrap} ${styles.opponentBoard}`}>
            <div className={styles.board} style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
              {opponentDisplayBoard.flat().map((cell, i) => (
                <div
                  key={i}
                  className={`${styles.cell} ${cell ? styles.filled : ''}`}
                  style={cell ? { backgroundColor: cell.color, color: cell.color } : {}}
                />
              ))}
            </div>
          </div>

          <div className={styles.linesCount}>Lines: {opponentLines}</div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {['rotate', 'left', 'down', 'right', 'drop'].map((action) => (
          <button
            key={action}
            className={styles.ctrlBtn}
            onTouchEnd={(e) => { e.preventDefault(); handleControlClick(action); }}
            onClick={() => handleControlClick(action)}
          >
            {action === 'rotate' ? '↻' : action === 'left' ? '←' : action === 'down' ? '↓' : action === 'right' ? '→' : '⬇'}
          </button>
        ))}
      </div>

      {/* Judgment */}
      <div
        className={`${styles.judgment} ${showJudgmentAnim ? styles.show : ''}`}
      >
        {judgmentText}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className={styles.gameOver}>
          <h2>{winner === playerId ? 'VICTORY!' : 'DEFEAT'}</h2>
          <div className={styles.finalScore}>
            <div>Your Score: {score.toLocaleString()}</div>
            <div>Opponent Score: {opponentScore.toLocaleString()}</div>
          </div>
          <div className={styles.gameOverButtons}>
            <button className={styles.backBtn} onClick={onBackToLobby}>
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerBattle;
