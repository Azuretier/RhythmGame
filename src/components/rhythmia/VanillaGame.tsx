import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VanillaGame.module.css';
import { useIsMobile } from '@/hooks/use-mobile';
import { recordGameEnd } from '@/lib/advancements/storage';
import AdvancementToast from './AdvancementToast';

// ===== Types =====
interface PieceCell {
  color: string;
  ghost?: boolean;
}

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

interface Piece {
  shape: number[][];
  color: string;
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
}

interface World {
  name: string;
  bpm: number;
  colors: string[];
}

// ===== Constants =====
const W = 10;
const H = 18;

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

// ===== Color Themes =====
type ColorTheme = 'standard' | 'stage' | 'monochrome';

// Standard Tetris colors for each piece type
const STANDARD_COLORS: Record<PieceType, string> = {
  I: '#00F0F0', // Cyan
  O: '#F0F000', // Yellow
  T: '#A000F0', // Purple
  S: '#00F000', // Green
  Z: '#F00000', // Red
  L: '#F0A000', // Orange
  J: '#0000F0', // Blue
};

// Monochrome colors (shades of white/gray)
const MONOCHROME_COLORS: Record<PieceType, string> = {
  I: '#FFFFFF',
  O: '#E0E0E0',
  T: '#C0C0C0',
  S: '#D0D0D0',
  Z: '#B0B0B0',
  L: '#F0F0F0',
  J: '#A0A0A0',
};

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

// ===== Component =====
export const Rhythmia: React.FC = () => {
  // Hook to detect mobile devices
  const isMobile = useIsMobile();

  // Game state
  const [board, setBoard] = useState<(PieceCell | null)[][]>([]);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [piecePos, setPiecePos] = useState({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(0);
  const [lines, setLines] = useState(0);
  const [worldIdx, setWorldIdx] = useState(0);
  const [enemyHP, setEnemyHP] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [beatPhase, setBeatPhase] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [judgmentText, setJudgmentText] = useState('');
  const [judgmentColor, setJudgmentColor] = useState('');
  const [showJudgmentAnim, setShowJudgmentAnim] = useState(false);
  const [boardBeat, setBoardBeat] = useState(false);
  const [boardShake, setBoardShake] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [lastRotationWasSuccessful, setLastRotationWasSuccessful] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('stage');

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatRef = useRef(Date.now());
  const dropTimerRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellSizeRef = useRef(20);
  const pieceRef = useRef(piece);
  const piecePosRef = useRef(piecePos);
  const boardStateRef = useRef(board);
  const gameOverRef = useRef(gameOver);
  const comboRef = useRef(combo);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const enemyHPRef = useRef(enemyHP);
  const worldIdxRef = useRef(worldIdx);
  const beatPhaseRef = useRef(beatPhase);
  const keysPressed = useRef<Set<string>>(new Set());
  const softDropInterval = useRef<number | null>(null);
  const moveRepeatTimeout = useRef<number | null>(null);
  const moveRepeatInterval = useRef<number | null>(null);
  const lastRotationRef = useRef(lastRotationWasSuccessful);

  // Per-game stat tracking for advancements
  const gameTSpinsRef = useRef(0);
  const gamePerfectBeatsRef = useRef(0);
  const gameTetrisClearsRef = useRef(0);
  const gameHardDropsRef = useRef(0);
  const gamePiecesPlacedRef = useRef(0);
  const gameWorldsClearedRef = useRef(0);
  const gameBestComboRef = useRef(0);
  const [toastIds, setToastIds] = useState<string[]>([]);

  // Keep refs in sync
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { piecePosRef.current = piecePos; }, [piecePos]);
  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { enemyHPRef.current = enemyHP; }, [enemyHP]);
  useEffect(() => { worldIdxRef.current = worldIdx; }, [worldIdx]);
  useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);
  useEffect(() => { lastRotationRef.current = lastRotationWasSuccessful; }, [lastRotationWasSuccessful]);

  // ===== Audio =====
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

    // Select color based on theme
    let color: string;
    if (colorTheme === 'standard') {
      color = STANDARD_COLORS[type];
    } else if (colorTheme === 'monochrome') {
      color = MONOCHROME_COLORS[type];
    } else {
      // Stage-dependent colors
      color = world.colors[Math.floor(Math.random() * world.colors.length)];
    }

    return { shape, color, type, rotation: 0 };
  }, [colorTheme]);


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
    gameWorldsClearedRef.current++;
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

  const endGame = useCallback(() => {
    setGameOver(true);
    setShowGameOver(true);
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    playTone(131, 0.5, 'sawtooth');

    // Record game stats for advancements
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
    });
    if (result.newlyUnlockedIds.length > 0) {
      setToastIds(result.newlyUnlockedIds);
    }
  }, [playTone]);

  const completeBoard = useCallback((partialBoard: (PieceCell | null)[][]) => {
    const completed = [...partialBoard];
    while (completed.length < H) {
      completed.unshift(Array(W).fill(null));
    }
    return completed;
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

    if (centerX === -1) return null; // Couldn't find center

    // Check the 4 corners (diagonals from center)
    const corners = [
      [centerX - 1, centerY - 1], // top-left
      [centerX + 1, centerY - 1], // top-right
      [centerX - 1, centerY + 1], // bottom-left
      [centerX + 1, centerY + 1], // bottom-right
    ];

    let filledCorners = 0;
    for (const [cx, cy] of corners) {
      // Corner is considered filled if out of bounds or occupied
      if (cx < 0 || cx >= W || cy < 0 || cy >= H || (cy >= 0 && board[cy] && board[cy][cx])) {
        filledCorners++;
      }
    }

    // T-Spin requires at least 3 corners filled
    if (filledCorners >= 3) {
      // Check front corners vs back corners to determine mini vs full
      // Front corners are determined by rotation direction
      // For simplicity, we'll just return 'full' for any 3+ corner T-Spin
      // A proper implementation would check if the two front corners are filled
      return 'full';
    }

    return null;
  }, []);

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
      gamePerfectBeatsRef.current++;
      if (newCombo > gameBestComboRef.current) {
        gameBestComboRef.current = newCombo;
      }
      showJudgment('PERFECT! ', '#FFD700');
      playTone(1047, 0.2, 'triangle');
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#FFD700', 12);
      }
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
      endGame();
      return;
    }

    // Track pieces placed for advancements
    gamePiecesPlacedRef.current++;

    // Check for T-Spin before locking
    const tSpinType = checkTSpin(currentPiece, currentPos, currentBoard);

    // Line clear
    let cleared = 0;
    const remainingBoard: (PieceCell | null)[][] = [];
    const rowsToClear: number[] = [];

    newBoard.forEach((row, y) => {
      if (row.every(c => c !== null)) {
        cleared++;
        rowsToClear.push(y);
      } else {
        remainingBoard.push(row);
      }
    });

    // Prepare the board state for collision check
    let boardForCollisionCheck = newBoard;
    if (cleared > 0) {
      // Complete the remaining board by adding empty rows at the top
      boardForCollisionCheck = completeBoard(remainingBoard);

      // Update the board state ref immediately to prevent using stale state in subsequent lock() calls
      boardStateRef.current = boardForCollisionCheck;

      setClearingRows(rowsToClear);
      setBoard(newBoard);

      setTimeout(() => {
        const currentCombo = comboRef.current;
        const currentLevel = levelRef.current;

        // Base scoring
        let pts = [0, 100, 300, 500, 800][cleared] * (currentLevel + 1) * mult * Math.max(1, currentCombo);

        // Track tetris clears (4 lines at once)
        if (cleared === 4) {
          gameTetrisClearsRef.current++;
        }

        // T-Spin bonus scoring
        if (tSpinType) {
          gameTSpinsRef.current++;
          const tSpinBonus = tSpinType === 'full' ? 400 : 100;
          const tSpinLineBonus = cleared * 400; // Additional bonus per line cleared with T-Spin
          pts += (tSpinBonus + tSpinLineBonus) * (currentLevel + 1);

          // Show T-Spin judgment
          if (cleared === 0) {
            showJudgment('T-SPIN!', '#FF00FF');
          } else if (tSpinType === 'mini') {
            showJudgment(`T-SPIN MINI ${cleared}!`, '#FF00FF');
          } else {
            showJudgment(`T-SPIN ${cleared}!`, '#FF00FF');
          }
          playTone(880, 0.3, 'square');
        }

        const newScore = scoreRef.current + pts;
        const newLines = linesRef.current + cleared;

        updateScore(newScore);
        scoreRef.current = newScore;
        setLines(newLines);
        linesRef.current = newLines;

        // Enemy damage
        const newEnemyHP = Math.max(0, enemyHPRef.current - cleared * 8 * mult);
        setEnemyHP(newEnemyHP);
        enemyHPRef.current = newEnemyHP;

        if (newEnemyHP <= 0) {
          nextWorld();
        }

        const newLevel = Math.floor(newLines / 10);
        setLevel(newLevel);
        levelRef.current = newLevel;

        playLineClear(cleared);
        setBoardShake(true);
        setTimeout(() => setBoardShake(false), 200);

        setClearingRows([]);
        const completedBoard = completeBoard(remainingBoard);
        setBoard(completedBoard);
        boardStateRef.current = completedBoard;
      }, 300);
    } else {
      setBoard(newBoard);
      boardStateRef.current = newBoard;
    }

    // Next piece
    const currentNextPiece = nextPiece;
    const newNextPiece = randomPiece(worldIdxRef.current);
    const newPos = { x: Math.floor(W / 2) - 1, y: 0 };

    // Reset rotation flag for new piece
    setLastRotationWasSuccessful(false);
    lastRotationRef.current = false;

    setPiece(currentNextPiece);
    pieceRef.current = currentNextPiece;
    setNextPiece(newNextPiece);
    setPiecePos(newPos);
    piecePosRef.current = newPos;

    if (currentNextPiece && collision(currentNextPiece, newPos.x, newPos.y, boardForCollisionCheck)) {
      endGame();
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
    let currentPos = { ...piecePosRef.current };
    const currentBoard = boardStateRef.current;

    while (!collision(currentPiece, currentPos.x, currentPos.y + 1, currentBoard)) {
      currentPos.y++;
    }

    gameHardDropsRef.current++;
    setPiecePos(currentPos);
    piecePosRef.current = currentPos;
    playTone(196, 0.1, 'sawtooth');
    lock();
  }, [collision, playTone, lock]);

  // ===== Start Game =====
  const startGame = useCallback(() => {
    initAudio();

    const initialBoard = Array(H).fill(null).map(() => Array(W).fill(null));
    const initialPiece = randomPiece(0);
    const initialNextPiece = randomPiece(0);
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
    setLevel(0);
    levelRef.current = 0;
    setLines(0);
    linesRef.current = 0;
    setWorldIdx(0);
    worldIdxRef.current = 0;
    setEnemyHP(100);
    enemyHPRef.current = 100;
    setGameOver(false);
    gameOverRef.current = false;
    setShowGameOver(false);
    setGameStarted(true);
    setClearingRows([]);

    // Reset per-game advancement tracking
    gameTSpinsRef.current = 0;
    gamePerfectBeatsRef.current = 0;
    gameTetrisClearsRef.current = 0;
    gameHardDropsRef.current = 0;
    gamePiecesPlacedRef.current = 0;
    gameWorldsClearedRef.current = 0;
    gameBestComboRef.current = 0;
    setToastIds([]);
  }, [initAudio, randomPiece]);

  // ===== Effects =====

  // Drop timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    dropTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        move(0, 1);
      }
    }, 500);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [gameStarted, gameOver, move]);

  // Beat timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const world = WORLDS[worldIdx];
    const interval = 60000 / world.bpm;

    // Initialize lastBeatRef to now so the phase calculation starts correctly
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
  }, [gameStarted, gameOver, worldIdx, playDrum]);

  // Beat phase animation — ref is updated directly for frame-precise judgments
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    let animFrame: number;
    const updateBeat = () => {
      if (!gameOverRef.current) {
        const world = WORLDS[worldIdxRef.current];
        const interval = 60000 / world.bpm;
        const elapsed = Date.now() - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        beatPhaseRef.current = phase;
        setBeatPhase(phase);
        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [gameStarted, gameOver]);

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
  }, [gameStarted]);

  // ===== Render Helpers =====
  const getDisplayBoard = useCallback(() => {
    const display = board.map(r => r.map(c => c ? { ...c } : null));

    // Ghost position
    if (piece) {
      let gy = piecePos.y;
      while (!collision(piece, piecePos.x, gy + 1, board)) gy++;

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
  }, [board, piece, piecePos, collision]);

  const handleControlClick = useCallback((action: string) => {
    switch (action) {
      case 'left': move(-1, 0); break;
      case 'right': move(1, 0); break;
      case 'down': move(0, 1); break;
      case 'rotate': rotatePiece(1); break;
      case 'rotateLeft': rotatePiece(-1); break;
      case 'drop': hardDrop(); break;
    }
  }, [move, rotatePiece, hardDrop]);

  const world = WORLDS[worldIdx];
  const displayBoard = getDisplayBoard();
  const unit = cellSizeRef.current + 1;

  return (
    <div className={`${styles.body} ${styles[`w${worldIdx}`]}`}>
      {/* Title Screen */}
      {!gameStarted && (
        <div className={styles.titleScreen}>
          <h1>RHYTHMIA</h1>
          <p>リズムに乗ってブロックを積め！</p>
          <button className={styles.startBtn} onClick={startGame}>▶ START</button>
        </div>
      )}

      {/* Game */}
      {gameStarted && (
        <div className={styles.game}>
          <div className={styles.worldDisplay}>{world.name}</div>

          {/* Theme Navbar */}
          <div className={styles.themeNav}>
            <span className={styles.themeLabel}>🎨 Theme:</span>
            <button
              className={`${styles.themeBtn} ${colorTheme === 'standard' ? styles.active : ''}`}
              onClick={() => setColorTheme('standard')}
            >
              Standard
            </button>
            <button
              className={`${styles.themeBtn} ${colorTheme === 'stage' ? styles.active : ''}`}
              onClick={() => setColorTheme('stage')}
            >
              Stage
            </button>
            <button
              className={`${styles.themeBtn} ${colorTheme === 'monochrome' ? styles.active : ''}`}
              onClick={() => setColorTheme('monochrome')}
            >
              Mono
            </button>
          </div>


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
            <div
              ref={boardRef}
              className={`${styles.boardWrap} ${boardBeat ? styles.beat : ''} ${boardShake ? styles.shake : ''}`}
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

            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>NEXT</div>
              {nextPiece && (
                <div
                  className={styles.next}
                  style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 1fr)` }}
                >
                  {nextPiece.shape.flat().map((val, i) => (
                    <div
                      key={i}
                      className={styles.nextCell}
                      style={val ? { backgroundColor: nextPiece.color, boxShadow: `0 0 8px ${nextPiece.color}` } : {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.beatBar}>
            <div className={styles.beatTargetLeft} />
            <div className={styles.beatTargetRight} />
            <div
              className={`${styles.beatCursor} ${(beatPhase > 0.75 || beatPhase < 0.15) ? styles.onBeat : ''}`}
              style={{ left: `${beatPhase * 100}%` }}
            />
          </div>

          {isMobile && (
            <div className={styles.controls}>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('rotateLeft'); }}
                onClick={() => handleControlClick('rotateLeft')}
              >
                ↺
              </button>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('drop'); }}
                onClick={() => handleControlClick('drop')}
              >
                ⬇
              </button>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('rotate'); }}
                onClick={() => handleControlClick('rotate')}
              >
                ↻
              </button>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('left'); }}
                onClick={() => handleControlClick('left')}
              >
                ←
              </button>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('down'); }}
                onClick={() => handleControlClick('down')}
              >
                ↓
              </button>
              <button
                className={styles.ctrlBtn}
                onTouchStart={(e) => { e.preventDefault(); handleControlClick('right'); }}
                onClick={() => handleControlClick('right')}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Judgment */}
      <div
        className={`${styles.judgment} ${showJudgmentAnim ? styles.show : ''}`}
        style={{ color: judgmentColor, textShadow: `0 0 30px ${judgmentColor}` }}
      >
        {judgmentText}
      </div>

      {/* Game Over */}
      {showGameOver && (
        <div className={`${styles.gameover} ${styles.show}`}>
          <h2>GAME OVER</h2>
          <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
          <button className={styles.restartBtn} onClick={startGame}>もう一度</button>
        </div>
      )}

      {/* Advancement Toast */}
      {toastIds.length > 0 && (
        <AdvancementToast
          unlockedIds={toastIds}
          onDismiss={() => setToastIds([])}
        />
      )}
    </div>
  );
};

export default Rhythmia;