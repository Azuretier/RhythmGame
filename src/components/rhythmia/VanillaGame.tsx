import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './VanillaGame.module.css';

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

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

const SHAPES = [
  [[1, 1, 1, 1]],        // I
  [[1, 1], [1, 1]],      // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]], // S - 3x3 for proper center rotation
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // Z - 3x3 for proper center rotation
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
];

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

// SRS Wall Kick Data - Using rotation state names ('0', 'R', '2', 'L')
// Format: [dx, dy] offsets to try when rotation fails
// Tests are tried in order until one succeeds
// Note: SRS uses inverted Y for kicks (positive Y = up), so we negate dy when applying
const ROTATION_NAMES = ['0', 'R', '2', 'L'] as const;

const WALL_KICK_JLSTZ: Record<string, [number, number][]> = {
  '0->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  'R->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  'L->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  'R->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->R': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  'L->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0->L': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

// Offset tests for I piece (different from JLSTZ)
const WALL_KICK_I: Record<string, [number, number][]> = {
  '0->R': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  'R->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2->L': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  'L->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  'R->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '2->R': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  'L->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '0->L': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export default function Rhythmia() {
  const [board, setBoard] = useState<(string | null)[][]>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<string>(getRandomPiece());
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
  const keysPressed = useRef<Set<string>>(new Set());
  const softDropInterval = useRef<number | null>(null);
  const moveRepeatTimeout = useRef<number | null>(null);
  const moveRepeatInterval = useRef<number | null>(null);
  const lastRotationRef = useRef(lastRotationWasSuccessful);

  // Keep refs in sync with state
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { nextPieceRef.current = nextPiece; }, [nextPiece]);
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

  // ===== Particles =====
  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = styles.particle;
      const size = Math.random() * 10 + 5;
      const angle = (Math.PI * 2 / count) * i;
      const dist = Math.random() * 80 + 40;
      p.style.cssText = `
        left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size}px;
        background:  ${color};
        box-shadow: 0 0 10px ${color};
        transition: all 0.5s ease-out;
      `;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 500);
    }
  }, []);

  // ===== Game Logic =====
  const randomPiece = useCallback((wIdx: number): Piece => {
    const world = WORLDS[wIdx];
    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[shapeIdx];
    const type = PIECE_TYPES[shapeIdx];
    const color = world.colors[Math.floor(Math.random() * world.colors.length)];
    return { shape, color, type, rotation: 0 };
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
    const newRotation = ((p.rotation + 1) % 4) as 0 | 1 | 2 | 3;
    return {
      ...p,
      shape: p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse()),
      rotation: newRotation,
    };
  }, []);

  const rotateCCW = useCallback((p: Piece): Piece => {
    const newRotation = ((p.rotation - 1 + 4) % 4) as 0 | 1 | 2 | 3;
    return {
      ...p,
      shape: p.shape[0].map((_, i) => p.shape.map(row => row[row.length - 1 - i])),
      rotation: newRotation,
    };
  }, []);

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

  // Check if a T-Spin was performed
  // A T-Spin is detected when:
  // 1. The piece is a T piece
  // 2. The last action was a successful rotation
  // 3. At least 3 of the 4 corner cells around the T's bottom center are filled or out of bounds
  const checkTSpin = useCallback((piece: Piece, pos: { x: number; y: number }, board: (PieceCell | null)[][]): 'full' | 'mini' | null => {
    if (piece.type !== 'T' || !lastRotationRef.current) {
      return null;
    }
    
    return newPiece;
  }, [nextPiece, getShape, isValidPosition, board]);

    // Find the bottom center of the T piece for T-spin detection
    // The T piece rotates around its bottom axis
    // We find the center cell (the one with 3 neighbors) and use its position
    // but for T-spin corner checks, we use the bottom row's center as the axis
    let centerX = -1;
    let centerY = -1;
    let bottomY = -1;
    
    // First, find the geometric center (cell with 3 neighbors)
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          // Track the bottommost row with filled cells
          if (pos.y + py > bottomY) {
            bottomY = pos.y + py;
          }
          
          // Count neighbors
          let neighbors = 0;
          // Check up, down, left, right
          if (py > 0 && piece.shape[py - 1][px]) neighbors++;
          if (py < piece.shape.length - 1 && piece.shape[py + 1][px]) neighbors++;
          if (px > 0 && piece.shape[py][px - 1]) neighbors++;
          if (px < piece.shape[py].length - 1 && piece.shape[py][px + 1]) neighbors++;
          
          // The center of T has exactly 3 neighbors
          if (neighbors === 3) {
            centerX = pos.x + px;
            centerY = pos.y + py;
          }
        }
      }
    }
    
    // Use the center X but bottom Y for T-spin axis
    if (centerX !== -1 && bottomY !== -1) {
      centerY = bottomY;
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
  }, [nextPiece, showJudgment, playTone, spawnParticles, randomPiece, collision, updateScore, nextWorld, playLineClear, endGame, completeBoard, checkTSpin]);

  const move = useCallback((dx: number, dy: number) => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    // Movement resets the rotation flag
    if (dx !== 0 || dy > 0) {
      setLastRotationWasSuccessful(false);
      lastRotationRef.current = false;
    }

    if (!collision(currentPiece, currentPos.x + dx, currentPos.y + dy, currentBoard)) {
      const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };
      setPiecePos(newPos);
      piecePosRef.current = newPos;
      if (dx !== 0) playTone(392, 0.05, 'square');
    } else if (dy > 0) {
      lock();
    }
  }, [collision, playTone, lock]);

  // Get wall kicks for a specific rotation transition
  const getWallKicks = useCallback((type: PieceType, fromRotation: number, toRotation: number): [number, number][] => {
    const from = ROTATION_NAMES[fromRotation];
    const to = ROTATION_NAMES[toRotation];
    const key = `${from}->${to}`;
    
    if (type === 'I') {
      return WALL_KICK_I[key] || [[0, 0]];
    } else if (type === 'O') {
      return [[0, 0]]; // O piece doesn't need wall kicks
    } else {
      return WALL_KICK_JLSTZ[key] || [[0, 0]];
    }
  }, []);

  const rotatePiece = useCallback((direction: 1 | -1 = 1) => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    // Get the rotated piece
    const rotated = direction === 1 ? rotate(currentPiece) : rotateCCW(currentPiece);
    
    // Calculate rotation indices
    const fromRotation = currentPiece.rotation;
    const toRotation = rotated.rotation;
    
    // Get SRS wall kick tests for this rotation
    const kicks = getWallKicks(currentPiece.type, fromRotation, toRotation);

    // Try each kick offset until one succeeds
    for (const [dx, dy] of kicks) {
      // SRS uses inverted Y for kicks, so we negate dy
      const testX = currentPos.x + dx;
      const testY = currentPos.y - dy;
      
      if (!collision(rotated, testX, testY, currentBoard)) {
        // Success! Update position and piece
        const newPos = { x: testX, y: testY };
        
        setPiece(rotated);
        pieceRef.current = rotated;
        setPiecePos(newPos);
        piecePosRef.current = newPos;
        
        playTone(direction === 1 ? 523 : 440, 0.08);
        setLastRotationWasSuccessful(true);
        lastRotationRef.current = true; // For T-Spin detection
        return; 
      }
    }
    
    // If we reach here, no kicks worked
    setLastRotationWasSuccessful(false);
    lastRotationRef.current = false;
  }, [rotate, rotateCCW, collision, playTone, getWallKicks]);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    let currentPos = {...piecePosRef.current};
    const currentBoard = boardStateRef.current;

    while (!collision(currentPiece, currentPos.x, currentPos.y + 1, currentBoard)) {
      currentPos.y++;
    }

    setPiecePos(currentPos);
    piecePosRef.current = currentPos;
    playTone(196, 0.1, 'sawtooth');
    const spawned = spawnPiece();
    setCurrentPiece(spawned);
    currentPieceRef.current = spawned;
  }, [isValidPosition, lockPiece, clearLines, spawnPiece]);

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
    
    const next = getRandomPiece();
    setNextPiece(next);
    
    const type = getRandomPiece();
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
          rotatePiece(1);
          break;
        case 'z':
        case 'Z':
          rotatePiece(-1);
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, gameOver, movePiece, rotatePiece, hardDrop]);

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
            {['rotateLeft', 'left', 'down', 'right', 'rotate', 'drop'].map((action) => (
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
                }}
                onClick={() => {
                  if (action === 'left') movePiece(-1, 0);
                  else if (action === 'right') movePiece(1, 0);
                  else if (action === 'down') movePiece(0, 1);
                  else if (action === 'rotate') rotatePiece(1);
                  else if (action === 'rotateLeft') rotatePiece(-1);
                  else if (action === 'drop') hardDrop();
                }}
              >
                {action === 'rotate' ? '↻' : 
                 action === 'rotateLeft' ? '↺' : 
                 action === 'left' ? '←' : 
                 action === 'down' ? '↓' : 
                 action === 'right' ? '→' : '⬇'}
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
