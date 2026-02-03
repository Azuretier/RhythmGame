import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './VanillaGame.module.css';

// Tetromino definitions with all 4 rotation states (0, R, 2, L)
// Using SRS (Super Rotation System) - the standard Tetris rotation system
const TETROMINOES: Record<string, number[][][]> = {
  I: [
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // 0
    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]], // R
    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]], // 2
    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]], // L
  ],
  O: [
    [[1,1], [1,1]], // 0
    [[1,1], [1,1]], // R
    [[1,1], [1,1]], // 2
    [[1,1], [1,1]], // L
  ],
  T: [
    [[0,1,0], [1,1,1], [0,0,0]], // 0
    [[0,1,0], [0,1,1], [0,1,0]], // R
    [[0,0,0], [1,1,1], [0,1,0]], // 2
    [[0,1,0], [1,1,0], [0,1,0]], // L
  ],
  S: [
    [[0,1,1], [1,1,0], [0,0,0]], // 0
    [[0,1,0], [0,1,1], [0,0,1]], // R
    [[0,0,0], [0,1,1], [1,1,0]], // 2
    [[1,0,0], [1,1,0], [0,1,0]], // L
  ],
  Z: [
    [[1,1,0], [0,1,1], [0,0,0]], // 0
    [[0,0,1], [0,1,1], [0,1,0]], // R
    [[0,0,0], [1,1,0], [0,1,1]], // 2
    [[0,1,0], [1,1,0], [1,0,0]], // L
  ],
  J: [
    [[1,0,0], [1,1,1], [0,0,0]], // 0
    [[0,1,1], [0,1,0], [0,1,0]], // R
    [[0,0,0], [1,1,1], [0,0,1]], // 2
    [[0,1,0], [0,1,0], [1,1,0]], // L
  ],
  L: [
    [[0,0,1], [1,1,1], [0,0,0]], // 0
    [[0,1,0], [0,1,0], [0,1,1]], // R
    [[0,0,0], [1,1,1], [1,0,0]], // 2
    [[1,1,0], [0,1,0], [0,1,0]], // L
  ],
};

// SRS Wall Kick Data
// Format: [dx, dy] offsets to try when rotation fails
// Tests are tried in order until one succeeds
const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0->R': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  'R->2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  '2->L': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
  'L->0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
  'R->0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  '2->R': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  'L->2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
  '0->L': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
};

const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0->R': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
  'R->2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
  '2->L': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
  'L->0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
  'R->0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
  '2->R': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
  'L->2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
  '0->L': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
};

const COLORS: Record<string, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

// ===== Rhythm Game Worlds =====
interface World {
  name: string;
  bpm: number;
  colors: string[];
}

const WORLDS: World[] = [
  { name: '🎀 メロディア', bpm: 100, colors: ['#FF6B9D', '#FF8FAB', '#FFB6C1', '#C44569', '#E8668B', '#D4587D', '#B84A6F'] },
  { name: '🌊 ハーモニア', bpm: 110, colors: ['#4ECDC4', '#45B7AA', '#3DA69B', '#35958C', '#2D847D', '#26736E', '#1A535C'] },
  { name: '☀️ クレシェンダ', bpm: 120, colors: ['#FFE66D', '#FFD93D', '#F7B731', '#ECA700', '#D19600', '#B68600', '#9B7600'] },
  { name: '🔥 フォルティッシモ', bpm: 140, colors: ['#FF6B6B', '#FF5252', '#FF3838', '#FF1F1F', '#E61717', '#CC0F0F', '#B30707'] },
  { name: '✨ 静寂の間', bpm: 160, colors: ['#A29BFE', '#9B8EFD', '#9381FC', '#8B74FB', '#8367FA', '#7B5AF9', '#6C5CE7'] },
];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 28;

// DAS/ARR Settings (in milliseconds)
// These are configurable - typical competitive values shown
const DEFAULT_DAS = 167;  // Delayed Auto Shift - initial delay before auto-repeat (~10 frames at 60fps)
const DEFAULT_ARR = 33;   // Auto Repeat Rate - delay between each auto-repeat move (~2 frames at 60fps)
                          // Set to 0 for instant movement (common in competitive play)
const DEFAULT_SDF = 50;   // Soft Drop Factor - soft drop speed in ms

type Piece = {
  type: string;
  rotation: number;
  x: number;
  y: number;
};

type KeyState = {
  pressed: boolean;
  dasCharged: boolean;
  lastMoveTime: number;
  pressTime: number;
};

const rotationNames = ['0', 'R', '2', 'L'];

const createEmptyBoard = () => 
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

// Seven-bag randomization system (七種一巡)
const shuffleBag = (): string[] => {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // Fisher-Yates shuffle
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
};

export default function Rhythmia() {
  const [board, setBoard] = useState<(string | null)[][]>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<string>('');
  const [holdPiece, setHoldPiece] = useState<string | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [pieceBag, setPieceBag] = useState<string[]>(shuffleBag());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Rhythm game state
  const [worldIdx, setWorldIdx] = useState(0);
  const [enemyHP, setEnemyHP] = useState(100);
  const [beatPhase, setBeatPhase] = useState(0);
  const [judgmentText, setJudgmentText] = useState('');
  const [judgmentColor, setJudgmentColor] = useState('');
  const [showJudgmentAnim, setShowJudgmentAnim] = useState(false);
  const [boardBeat, setBoardBeat] = useState(false);
  const [boardShake, setBoardShake] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [lastRotationWasSuccessful, setLastRotationWasSuccessful] = useState(false);
  
  // Refs for accessing current values in callbacks (avoids stale closures)
  const gameLoopRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);
  const lastBeatRef = useRef(Date.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPieceRef = useRef(nextPiece);
  const pieceBagRef = useRef<string[]>(pieceBag);
  const holdPieceRef = useRef<string | null>(holdPiece);
  const canHoldRef = useRef(canHold);
  const comboRef = useRef(combo);
  const linesRef = useRef(lines);
  
  // DAS/ARR/SDF settings (adjustable)
  const [das, setDas] = useState(DEFAULT_DAS);
  const [arr, setArr] = useState(DEFAULT_ARR);
  const [sdf, setSdf] = useState(DEFAULT_SDF);
  
  const lastGravityRef = useRef<number>(0);
  const currentPieceRef = useRef<Piece | null>(null);
  const boardRef = useRef<(string | null)[][]>(createEmptyBoard());
  const scoreRef = useRef(0);
  
  // Key states for DAS/ARR
  const keyStatesRef = useRef<Record<string, KeyState>>({
    left: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
    right: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
    down: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
  });
  
  // Settings refs for use in game loop
  const dasRef = useRef(das);
  const arrRef = useRef(arr);
  const sdfRef = useRef(sdf);
  const levelRef = useRef(level);
  const gameOverRef = useRef(gameOver);
  const isPausedRef = useRef(isPaused);
  const worldIdxRef = useRef(worldIdx);
  const enemyHPRef = useRef(enemyHP);
  const beatPhaseRef = useRef(beatPhase);
  const lastRotationRef = useRef(lastRotationWasSuccessful);

  // Keep refs in sync with state
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { nextPieceRef.current = nextPiece; }, [nextPiece]);
  useEffect(() => { pieceBagRef.current = pieceBag; }, [pieceBag]);
  useEffect(() => { holdPieceRef.current = holdPiece; }, [holdPiece]);
  useEffect(() => { canHoldRef.current = canHold; }, [canHold]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { dasRef.current = das; }, [das]);
  useEffect(() => { arrRef.current = arr; }, [arr]);
  useEffect(() => { sdfRef.current = sdf; }, [sdf]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { worldIdxRef.current = worldIdx; }, [worldIdx]);
  useEffect(() => { enemyHPRef.current = enemyHP; }, [enemyHP]);
  useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);
  useEffect(() => { lastRotationRef.current = lastRotationWasSuccessful; }, [lastRotationWasSuccessful]);

  // ===== Audio System =====
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  // ===== Judgment & Effects =====
  const showJudgment = useCallback((text: string, color: string) => {
    setJudgmentText(text);
    setJudgmentColor(color);
    setShowJudgmentAnim(false);
    requestAnimationFrame(() => {
      setShowJudgmentAnim(true);
    });
  }, []);

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    setScorePop(true);
    setTimeout(() => setScorePop(false), 100);
  }, []);

  const nextWorld = useCallback(() => {
    const newWorldIdx = worldIdxRef.current + 1;
    if (newWorldIdx >= WORLDS.length) {
      showJudgment('🎉 CLEAR!', '#FFD700');
      setTimeout(() => {
        setWorldIdx(0);
        setEnemyHP(100);
      }, 2000);
    } else {
      showJudgment('WORLD CLEAR!', '#00FF00');
      setWorldIdx(newWorldIdx);
      setEnemyHP(100);
    }
  }, [showJudgment]);

  const getShape = useCallback((type: string, rotation: number) => {
    return TETROMINOES[type][rotation];
  }, []);

  const isValidPosition = useCallback((piece: Piece, boardState: (string | null)[][]) => {
    const shape = getShape(piece.type, piece.rotation);
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = piece.x + x;
          const newY = piece.y + y;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          if (newY >= 0 && boardState[newY][newX] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }, [getShape]);

  const getWallKicks = useCallback((type: string, fromRotation: number, toRotation: number) => {
    const from = rotationNames[fromRotation];
    const to = rotationNames[toRotation];
    const key = `${from}->${to}`;
    
    if (type === 'I') {
      return WALL_KICKS_I[key] || [[0, 0]];
    } else if (type === 'O') {
      return [[0, 0]];
    } else {
      return WALL_KICKS_JLSTZ[key] || [[0, 0]];
    }
  }, []);

  const tryRotation = useCallback((piece: Piece, direction: 1 | -1, boardState: (string | null)[][]) => {
    const fromRotation = piece.rotation;
    const toRotation = (piece.rotation + direction + 4) % 4;
    const kicks = getWallKicks(piece.type, fromRotation, toRotation);

    for (const [dx, dy] of kicks) {
      const testPiece: Piece = {
        ...piece,
        rotation: toRotation,
        x: piece.x + dx,
        y: piece.y - dy,
      };
      if (isValidPosition(testPiece, boardState)) {
        return testPiece;
      }
    }
    return null;
  }, [getWallKicks, isValidPosition]);

  // Get next piece from seven-bag system
  const getNextFromBag = useCallback((): string => {
    let bag = [...pieceBag];
    if (bag.length === 0) {
      bag = shuffleBag();
    }
    const piece = bag.shift()!;
    setPieceBag(bag);
    return piece;
  }, [pieceBag]);

  const spawnPiece = useCallback(() => {
    const type = nextPiece;
    const shape = getShape(type, 0);
    const newPiece: Piece = {
      type,
      rotation: 0,
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: type === 'I' ? -1 : 0,
    };
    
    setNextPiece(getNextFromBag());
    setCanHold(true); // Allow hold for the new piece
    
    if (!isValidPosition(newPiece, board)) {
      setGameOver(true);
      setIsPlaying(false);
      return null;
    }
    
    return newPiece;
  }, [nextPiece, getShape, isValidPosition, board, getNextFromBag]);

  const lockPiece = useCallback((piece: Piece, boardState: (string | null)[][]) => {
    const newBoard = boardState.map(row => [...row]);
    const shape = getShape(piece.type, piece.rotation);
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            newBoard[boardY][boardX] = piece.type;
          }
        }
      }
    }
    return newBoard;
  }, [getShape]);

  const clearLines = useCallback((boardState: (string | null)[][]) => {
    const newBoard = boardState.filter(row => row.some(cell => cell === null));
    const clearedLines = BOARD_HEIGHT - newBoard.length;
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }
    
    return { newBoard, clearedLines };
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
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
  }, [currentPiece, board, isValidPosition, gameOver, isPaused]);

  // Process DAS/ARR for horizontal movement
  const processHorizontalDasArr = useCallback((direction: 'left' | 'right', currentTime: number) => {
    const state = keyStatesRef.current[direction];
    if (!state.pressed || isPausedRef.current || gameOverRef.current) return;

    const dx = direction === 'left' ? -1 : 1;
    const timeSincePress = currentTime - state.pressTime;
    const currentDas = dasRef.current;
    const currentArr = arrRef.current;

    if (!state.dasCharged) {
      // DAS phase - waiting for initial delay to charge
      if (timeSincePress >= currentDas) {
        state.dasCharged = true;
        state.lastMoveTime = currentTime;
        
        // First move after DAS charges
        if (currentArr === 0) {
          // Instant ARR - move all the way instantly
          while (movePiece(dx, 0)) {}
        } else {
          movePiece(dx, 0);
        }
      }
    } else {
      // ARR phase - auto-repeat is active
      if (currentArr === 0) {
        // Instant ARR - move to edge every frame
        while (movePiece(dx, 0)) {}
      } else {
        // Normal ARR with delay between moves
        const timeSinceLastMove = currentTime - state.lastMoveTime;
        if (timeSinceLastMove >= currentArr) {
          movePiece(dx, 0);
          state.lastMoveTime = currentTime;
        }
      }
    }
  }, [movePiece]);

  // Process soft drop (SDF)
  const processSoftDrop = useCallback((currentTime: number) => {
    const state = keyStatesRef.current.down;
    if (!state.pressed || isPausedRef.current || gameOverRef.current) return;

    const currentSdf = sdfRef.current;
    const timeSinceLastMove = currentTime - state.lastMoveTime;

    if (currentSdf === 0) {
      // Instant soft drop (sonic drop without locking)
      while (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
    } else if (timeSinceLastMove >= currentSdf) {
      if (movePiece(0, 1)) {
        setScore(prev => prev + 1);
      }
      state.lastMoveTime = currentTime;
    }
  }, [movePiece]);

  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (!currentPiece || gameOver || isPaused) return;
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;
    
    const rotatedPiece = tryRotation(piece, direction, boardRef.current);
    if (rotatedPiece) {
      setCurrentPiece(rotatedPiece);
      currentPieceRef.current = rotatedPiece;
    }
  }, [currentPiece, board, tryRotation, gameOver, isPaused]);

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
    } else {
      setCombo(0);
    }
    
    const newBoard = lockPiece(newPiece, boardRef.current);
    
    const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);
    
    setBoard(clearedBoard);

    // Calculate score with rhythm multiplier
    const baseScore = dropDistance * 2 + [0, 100, 300, 500, 800][clearedLines] * (level);
    const finalScore = baseScore * mult * Math.max(1, comboRef.current);
    updateScore(scoreRef.current + finalScore);
    
    // Enemy damage
    if (clearedLines > 0) {
      const damage = clearedLines * 8 * mult;
      const newEnemyHP = Math.max(0, enemyHPRef.current - damage);
      setEnemyHP(newEnemyHP);
      
      if (newEnemyHP <= 0) {
        nextWorld();
      }
      
      playLineClear(clearedLines);
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 200);
    }
    
    boardRef.current = clearedBoard;
    setScore(prev => prev + dropDistance * 2 + clearedLines * 100 * levelRef.current);
    setLines(prev => {
      const newLines = prev + clearedLines;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });
    
    playTone(196, 0.1, 'sawtooth');
    const spawned = spawnPiece();
    setCurrentPiece(spawned);
    currentPieceRef.current = spawned;
  }, [isValidPosition, lockPiece, clearLines, spawnPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || !canHold) return;
    
    const currentType = currentPiece.type;
    
    if (holdPiece === null) {
      // First time holding, spawn next piece
      setHoldPiece(currentType);
      const spawned = spawnPiece();
      setCurrentPiece(spawned);
      currentPieceRef.current = spawned;
    } else {
      // Swap with held piece
      const heldType = holdPiece;
      setHoldPiece(currentType);
      
      const shape = getShape(heldType, 0);
      const newPiece: Piece = {
        type: heldType,
        rotation: 0,
        x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
        y: heldType === 'I' ? -1 : 0,
      };
      
      if (isValidPosition(newPiece, board)) {
        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
      } else {
        // If can't spawn held piece (game over state), revert hold
        setHoldPiece(heldType);
        return;
      }
    }
    
    setCanHold(false);
    playTone(392, 0.1, 'square');
  }, [currentPiece, gameOver, isPaused, canHold, holdPiece, spawnPiece, getShape, isValidPosition, board]);

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
      // Beat judgment on lock
      const currentBeatPhase = beatPhaseRef.current;
      const onBeat = currentBeatPhase > 0.75 || currentBeatPhase < 0.15;
      let mult = 1;
      
      if (onBeat) {
        mult = 2;
        const newCombo = comboRef.current + 1;
        setCombo(newCombo);
        showJudgment('PERFECT!', '#FFD700');
        playTone(1047, 0.2, 'triangle');
      } else {
        setCombo(0);
      }
      // Lock the piece
      const newBoard = lockPiece(piece, boardRef.current);
      
      const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);
      
      setBoard(clearedBoard);
      boardRef.current = clearedBoard;
      setScore(prev => prev + clearedLines * 100 * levelRef.current);
      setLines(prev => {
        const newLines = prev + clearedLines;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
      
      const spawned = spawnPiece();
      setCurrentPiece(spawned);
      currentPieceRef.current = spawned;
    }
  }, [isValidPosition, lockPiece, clearLines, spawnPiece]);

  const startGame = useCallback(() => {
    initAudio();
    
    setBoard(createEmptyBoard());
    setScore(0);
    setCombo(0);
    setLines(0);
    setLevel(1);
    setWorldIdx(0);
    setEnemyHP(100);
    setGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    
    // Reset key states
    keyStatesRef.current = {
      left: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
      right: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
      down: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
    };
    
    // Initialize seven-bag system
    const bag = shuffleBag();
    
    // Get first two pieces from bag
    const type = bag[0];
    const next = bag[1];
    setPieceBag(bag.slice(2));
    
    setNextPiece(next);
    setHoldPiece(null);
    setCanHold(true);
    
    const shape = getShape(type, 0);
    
    const initialPiece = {
      type,
      rotation: 0,
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: type === 'I' ? -2 : -1, // Start higher to match new spawn position
    };
    setCurrentPiece(initialPiece);
    currentPieceRef.current = initialPiece;
    lastGravityRef.current = performance.now();
  }, [getShape]);

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
      setTimeout(() => setBoardBeat(false), 100);
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [isPlaying, gameOver, worldIdx, playDrum]);

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
  }, [isPlaying, gameOver]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const gameLoop = (currentTime: number) => {
      if (!isPausedRef.current && !gameOverRef.current) {
        // Process DAS/ARR for horizontal movement
        // Priority: most recently pressed direction wins (handled by canceling opposite on press)
        processHorizontalDasArr('left', currentTime);
        processHorizontalDasArr('right', currentTime);
        
        // Process soft drop
        processSoftDrop(currentTime);

        // Gravity
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
  }, [isPlaying, gameOver, tick, processHorizontalDasArr, processSoftDrop]);

  // Key handlers with proper DAS/ARR initialization
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      if (e.repeat) return; // Ignore OS key repeat - we handle our own
      
      const currentTime = performance.now();

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!keyStatesRef.current.left.pressed) {
            // Cancel opposite direction (directional priority)
            keyStatesRef.current.right = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            
            keyStatesRef.current.left = {
              pressed: true,
              dasCharged: false,
              lastMoveTime: currentTime,
              pressTime: currentTime,
            };
            // Immediate first move on press
            if (!isPaused) movePiece(-1, 0);
          }
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (!keyStatesRef.current.right.pressed) {
            // Cancel opposite direction (directional priority)
            keyStatesRef.current.left = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
            
            keyStatesRef.current.right = {
              pressed: true,
              dasCharged: false,
              lastMoveTime: currentTime,
              pressTime: currentTime,
            };
            // Immediate first move on press
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
            // Immediate first move on press
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
  }, [isPlaying, isPaused, gameOver, movePiece, rotatePiece, hardDrop, holdCurrentPiece]);

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    if (currentPiece) {
      const shape = getShape(currentPiece.type, currentPiece.rotation);
      
      // Add ghost piece first
      let ghostY = currentPiece.y;
      while (isValidPosition({ ...currentPiece, y: ghostY + 1 }, board)) {
        ghostY++;
      }
      if (ghostY !== currentPiece.y) {
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
              const boardY = ghostY + y;
              const boardX = currentPiece.x + x;
              if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                if (displayBoard[boardY][boardX] === null) {
                  displayBoard[boardY][boardX] = `ghost-${currentPiece.type}`;
                }
              }
            }
          }
        }
      }

      // Add current piece on top
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.type;
            }
          }
        }
      }
    }
    
    return displayBoard;
  };

  const renderNextPiece = () => {
    const shape = getShape(nextPiece, 0);
    
    return (
      <div 
        className={styles.next}
        style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}
      >
        {shape.flat().map((val, i) => (
          <div
            key={i}
            className={styles.nextCell}
            style={val ? { 
              backgroundColor: COLORS[nextPiece], 
              boxShadow: `0 0 8px ${COLORS[nextPiece]}` 
            } : {}}
          />
        ))}
      </div>
    );
  };

  const renderHoldPiece = () => {
    if (!holdPiece) {
      return (
        <div className={styles.next} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Array(16).fill(null).map((_, i) => (
            <div key={i} className={styles.nextCell} />
          ))}
        </div>
      );
    }
    
    const shape = getShape(holdPiece, 0);
    
    return (
      <div 
        className={styles.next}
        style={{ 
          gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`,
          opacity: canHold ? 1 : 0.5
        }}
      >
        {shape.flat().map((val, i) => (
          <div
            key={i}
            className={styles.nextCell}
            style={val ? { 
              backgroundColor: COLORS[holdPiece], 
              boxShadow: `0 0 8px ${COLORS[holdPiece]}` 
            } : {}}
          />
        ))}
      </div>
    );
  };

  const displayBoard = renderBoard();
  const world = WORLDS[worldIdx];

  return (
    <div className={`${styles.body} ${styles[`w${worldIdx}`]}`}>
      {/* Title Screen */}
      {!isPlaying && !gameOver && (
        <div className={styles.titleScreen}>
          <h1>RHYTHMIA</h1>
          <p>リズムに乗ってブロックを積め！</p>
          <button className={styles.startBtn} onClick={startGame}>▶ START</button>
        </div>
      )}

      {/* Game */}
      {(isPlaying || gameOver) && (
        <div className={styles.game}>
          <div className={styles.worldDisplay}>{world.name}</div>

          <div className={`${styles.scoreDisplay} ${scorePop ? styles.pop : ''}`}>
            {score.toLocaleString()}
          </div>

          <div className={`${styles.combo} ${combo >= 2 ? styles.show : ''} ${combo >= 5 ? styles.big : ''}`}>
            {combo} COMBO!
          </div>

          <div className={styles.enemyLabel}>👻 ノイズリング</div>
          <div className={styles.enemyBar}>
            <div className={styles.enemyFill} style={{ width: `${enemyHP}%` }} />
          </div>

          <div className={styles.gameArea}>
            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>HOLD (C)</div>
              {renderHoldPiece()}
            </div>

            <div className={`${styles.boardWrap} ${boardBeat ? styles.beat : ''} ${boardShake ? styles.shake : ''}`}>
              <div className={styles.board} style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}>
                {displayBoard.flat().map((cell, i) => {
                  const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
                  const pieceType = isGhost ? cell.replace('ghost-', '') : cell;
                  
                  return (
                    <div
                      key={i}
                      className={`${styles.cell} ${cell && !isGhost ? styles.filled : ''} ${isGhost ? styles.ghost : ''}`}
                      style={cell && !isGhost ? { 
                        backgroundColor: COLORS[pieceType as string], 
                        boxShadow: `0 0 8px ${COLORS[pieceType as string]}` 
                      } : isGhost ? {
                        borderColor: `${COLORS[pieceType as string]}60`
                      } : {}}
                    />
                  );
                })}
              </div>

              {/* Overlay for Game Over / Paused */}
              {(gameOver || isPaused) && (
                <div className={styles.gameover} style={{ display: 'flex' }}>
                  <h2>{gameOver ? 'GAME OVER' : 'PAUSED'}</h2>
                  <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
                  <button className={styles.restartBtn} onClick={startGame}>
                    {gameOver ? 'もう一度' : 'Resume'}
                  </button>
                </div>
              )}
            </div>

            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>NEXT</div>
              {renderNextPiece()}
            </div>
          </div>

          <div className={styles.beatBar}>
            <div className={styles.beatTarget} />
            <div className={styles.beatFill} style={{ width: `${beatPhase * 100}%` }} />
          </div>

          <div className={styles.controls}>
            {['rotateLeft', 'left', 'down', 'right', 'rotate', 'drop', 'hold'].map((action) => (
              <button
                key={action}
                className={styles.ctrlBtn}
                onTouchEnd={(e) => { 
                  e.preventDefault(); 
                  if (action === 'left') movePiece(-1, 0);
                  else if (action === 'right') movePiece(1, 0);
                  else if (action === 'down') movePiece(0, 1);
                  else if (action === 'rotate') rotatePiece(1);
                  else if (action === 'rotateLeft') rotatePiece(-1);
                  else if (action === 'drop') hardDrop();
                  else if (action === 'hold') holdCurrentPiece();
                }}
                onClick={() => {
                  if (action === 'left') movePiece(-1, 0);
                  else if (action === 'right') movePiece(1, 0);
                  else if (action === 'down') movePiece(0, 1);
                  else if (action === 'rotate') rotatePiece(1);
                  else if (action === 'rotateLeft') rotatePiece(-1);
                  else if (action === 'drop') hardDrop();
                  else if (action === 'hold') holdCurrentPiece();
                }}
              >
                {action === 'rotate' ? '↻' : 
                 action === 'rotateLeft' ? '↺' : 
                 action === 'left' ? '←' : 
                 action === 'down' ? '↓' : 
                 action === 'right' ? '→' : 
                 action === 'drop' ? '⬇' : 'HOLD'}
              </button>
            ))}
          </div>

          {/* Stats Panel */}
          <div className={styles.statsPanel || 'flex gap-4 mt-4 text-white text-sm'}>
            <div>LINES: {lines}</div>
            <div>LEVEL: {level}</div>
          </div>
        </div>
      )}

      {/* Judgment */}
      <div
        className={`${styles.judgment} ${showJudgmentAnim ? styles.show : ''}`}
        style={{ color: judgmentColor, textShadow: `0 0 30px ${judgmentColor}` }}
      >
        {judgmentText}
      </div>
    </div>
  );
}
