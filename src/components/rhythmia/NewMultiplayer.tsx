'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VanillaGame.module.css';

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

interface PlayerControls {
  left: string;
  right: string;
  down: string;
  rotate: string;
  rotateLeft: string;
  drop: string;
}

interface PlayerBoardProps {
  playerId: number;
  playerName: string;
  controls: PlayerControls;
  audioCtx: AudioContext | null;
  gameStarted: boolean;
  onGameOver?: (playerId: number, score: number) => void;
  worldIdx: number;
  beatPhase: number;
  boardBeat: boolean;
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
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
];

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

// Default control schemes
const PLAYER1_CONTROLS: PlayerControls = {
  left: 'a',
  right: 'd',
  down: 's',
  rotate: 'w',
  rotateLeft: 'q',
  drop: 'e',
};

const PLAYER2_CONTROLS: PlayerControls = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  rotateLeft: '/',
  drop: '.',
};

// ===== PlayerBoard Component =====
const PlayerBoard: React.FC<PlayerBoardProps> = ({
  playerId,
  playerName,
  controls,
  audioCtx,
  gameStarted,
  onGameOver,
  worldIdx,
  beatPhase,
  boardBeat,
}) => {
  // Game state
  const [board, setBoard] = useState<(PieceCell | null)[][]>([]);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [piecePos, setPiecePos] = useState({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [judgmentText, setJudgmentText] = useState('');
  const [judgmentColor, setJudgmentColor] = useState('');
  const [showJudgmentAnim, setShowJudgmentAnim] = useState(false);
  const [boardShake, setBoardShake] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [lastRotationWasSuccessful, setLastRotationWasSuccessful] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Refs
  const dropTimerRef = useRef<number | null>(null);
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
  const beatPhaseRef = useRef(beatPhase);
  const lastRotationRef = useRef(lastRotationWasSuccessful);

  // Keep refs in sync
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { piecePosRef.current = piecePos; }, [piecePos]);
  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);
  useEffect(() => { lastRotationRef.current = lastRotationWasSuccessful; }, [lastRotationWasSuccessful]);

  // ===== Audio =====
  const playTone = useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
    const ctx = audioCtx;
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
  }, [audioCtx]);

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
    return {
      ...p,
      shape: p.shape[0].map((_, i) => p.shape.map(row => row[row.length - 1 - i])),
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

  const completeBoard = useCallback((partialBoard: (PieceCell | null)[][]) => {
    const completed = [...partialBoard];
    while (completed.length < H) {
      completed.unshift(Array(W).fill(null));
    }
    return completed;
  }, []);

  const endGame = useCallback(() => {
    setGameOver(true);
    setShowGameOver(true);
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    playTone(131, 0.5, 'sawtooth');
    onGameOver?.(playerId, scoreRef.current);
  }, [playTone, onGameOver, playerId]);

  // Check if a T-Spin was performed
  // A T-Spin is detected when:
  // 1. The piece is a T piece
  // 2. The last action was a successful rotation
  // 3. At least 3 of the 4 corner cells around the T's center are filled or out of bounds
  const checkTSpin = useCallback((piece: Piece, pos: { x: number; y: number }, board: (PieceCell | null)[][]): 'full' | 'mini' | null => {
    if (piece.type !== 'T' || !lastRotationRef.current) {
      return null;
    }

    // Find the center of the T piece by looking for the cell that has 3 neighbors
    // In a T piece, the center is the only cell with 3 filled neighbors
    let centerX = -1;
    let centerY = -1;
    
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
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
            break;
          }
        }
      }
      if (centerX !== -1) break;
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
      showJudgment('PERFECT!', '#FFD700');
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
            pieceExtendsAboveBoard = true;
          } else if (by >= 0 && by < H) {
            newBoard[by][bx] = { color: currentPiece.color };
          }
        }
      });
    });

    if (pieceExtendsAboveBoard) {
      endGame();
      return;
    }

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

    let boardForCollisionCheck = newBoard;
    if (cleared > 0) {
      boardForCollisionCheck = completeBoard(remainingBoard);
      boardStateRef.current = boardForCollisionCheck;

      setClearingRows(rowsToClear);
      setBoard(newBoard);

      setTimeout(() => {
        const currentCombo = comboRef.current;
        const currentLevel = levelRef.current;
        
        let pts = [0, 100, 300, 500, 800][cleared] * (currentLevel + 1) * mult * Math.max(1, currentCombo);
        
        if (tSpinType) {
          const tSpinBonus = tSpinType === 'full' ? 400 : 100;
          const tSpinLineBonus = cleared * 400;
          pts += (tSpinBonus + tSpinLineBonus) * (currentLevel + 1);
          
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
    const newNextPiece = randomPiece(worldIdx);
    const newPos = { x: Math.floor(W / 2) - 1, y: 0 };

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
  }, [nextPiece, showJudgment, playTone, randomPiece, collision, updateScore, playLineClear, endGame, completeBoard, checkTSpin, worldIdx]);

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

  const rotatePiece = useCallback((direction: 1 | -1 = 1) => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    const rotated = direction === 1 ? rotate(currentPiece) : rotateCCW(currentPiece);
    const kickTests = [[0, 0], [-1, 0], [1, 0], [0, -1]];

    for (const [offsetX, offsetY] of kickTests) {
      if (!collision(rotated, currentPos.x + offsetX, currentPos.y + offsetY, currentBoard)) {
        const newPos = { x: currentPos.x + offsetX, y: currentPos.y + offsetY };
        
        setPiece(rotated);
        pieceRef.current = rotated;
        setPiecePos(newPos);
        piecePosRef.current = newPos;
        
        playTone(direction === 1 ? 523 : 440, 0.08);
        lastRotationRef.current = true;
        return;
      }
    }
    
    lastRotationRef.current = false;
  }, [rotate, rotateCCW, collision, playTone]);

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
    lock();
  }, [collision, playTone, lock]);

  // ===== Initialize Game =====
  useEffect(() => {
    if (gameStarted && !initialized) {
      const initialBoard = Array(H).fill(null).map(() => Array(W).fill(null));
      const initialPiece = randomPiece(worldIdx);
      const initialNextPiece = randomPiece(worldIdx);
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
      setGameOver(false);
      gameOverRef.current = false;
      setShowGameOver(false);
      setClearingRows([]);
      setInitialized(true);
    }
  }, [gameStarted, initialized, randomPiece, worldIdx]);

  // ===== Effects =====

  // Drop timer
  useEffect(() => {
    if (!gameStarted || gameOver || !initialized) return;

    dropTimerRef.current = window.setInterval(() => {
      if (!gameOverRef.current) {
        move(0, 1);
      }
    }, 500);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [gameStarted, gameOver, initialized, move]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      const key = e.key.toLowerCase() === e.key ? e.key : e.key;
      
      if (key === controls.left || key === controls.left.toLowerCase()) {
        e.preventDefault();
        move(-1, 0);
      } else if (key === controls.right || key === controls.right.toLowerCase()) {
        e.preventDefault();
        move(1, 0);
      } else if (key === controls.down || key === controls.down.toLowerCase()) {
        e.preventDefault();
        move(0, 1);
      } else if (key === controls.rotate || key === controls.rotate.toLowerCase()) {
        e.preventDefault();
        rotatePiece(1);
      } else if (key === controls.rotateLeft || key === controls.rotateLeft.toLowerCase()) {
        e.preventDefault();
        rotatePiece(-1);
      } else if (key === controls.drop || key === controls.drop.toLowerCase()) {
        e.preventDefault();
        hardDrop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [controls, move, rotatePiece, hardDrop, gameOver]);

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
  }, [initialized]);

  // ===== Render Helpers =====
  const getDisplayBoard = useCallback(() => {
    const display = board.map(r => r.map(c => c ? { ...c } : null));

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

  if (!initialized) {
    return null;
  }

  return (
    <div className={styles.playerBoard}>
      <div className={styles.playerName}>{playerName}</div>
      
      <div className={`${styles.scoreDisplay} ${scorePop ? styles.pop : ''}`}>
        {score.toLocaleString()}
      </div>

      <div className={`${styles.combo} ${combo >= 2 ? styles.show : ''} ${combo >= 5 ? styles.big : ''}`}>
        {combo} COMBO!
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
        <div className={styles.beatTarget} />
        <div className={styles.beatFill} style={{ width: `${beatPhase * 100}%` }} />
      </div>

      <div className={styles.controlsHint}>
        {controls.left}/{controls.right}/{controls.down} Move | {controls.rotate}/{controls.rotateLeft} Rotate | {controls.drop} Drop
      </div>

      {/* Judgment */}
      <div
        className={`${styles.judgment} ${showJudgmentAnim ? styles.show : ''}`}
        style={{ color: judgmentColor, textShadow: `0 0 30px ${judgmentColor}` }}
      >
        {judgmentText}
      </div>

      {/* Game Over */}
      {showGameOver && (
        <div className={`${styles.playerGameover} ${styles.show}`}>
          <h3>GAME OVER</h3>
          <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
        </div>
      )}
    </div>
  );
};

// ===== Main Two-Player Component =====
export const Rhythmia: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [worldIdx, setWorldIdx] = useState(0);
  const [beatPhase, setBeatPhase] = useState(0);
  const [boardBeat, setBoardBeat] = useState(false);
  const [gameResults, setGameResults] = useState<{ playerId: number; score: number }[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatRef = useRef(Date.now());
  const beatTimerRef = useRef<number | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
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

  const handleGameOver = useCallback((playerId: number, score: number) => {
    setGameResults(prev => [...prev, { playerId, score }]);
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    setGameStarted(true);
    setGameResults([]);
    setWorldIdx(0);
  }, [initAudio]);

  // Beat timer (shared between players)
  useEffect(() => {
    if (!gameStarted) return;

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
  }, [gameStarted, worldIdx, playDrum]);

  // Beat phase animation (shared between players)
  useEffect(() => {
    if (!gameStarted) return;

    let animFrame: number;
    const updateBeat = () => {
      const world = WORLDS[worldIdx];
      const interval = 60000 / world.bpm;
      const elapsed = Date.now() - lastBeatRef.current;
      const phase = (elapsed % interval) / interval;
      setBeatPhase(phase);
      animFrame = requestAnimationFrame(updateBeat);
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [gameStarted, worldIdx]);

  const world = WORLDS[worldIdx];
  const winner = gameResults.length === 2 
    ? gameResults.reduce((a, b) => a.score > b.score ? a : b)
    : null;

  return (
    <div className={`${styles.body} ${styles[`w${worldIdx}`]}`}>
      {/* Title Screen */}
      {!gameStarted && (
        <div className={styles.titleScreen}>
          <h1>RHYTHMIA</h1>
          <p>2人対戦モード</p>
          <div className={styles.controlsInfo}>
            <div>
              <strong>Player 1:</strong> WASD + Q/E
            </div>
            <div>
              <strong>Player 2:</strong> Arrow Keys + / .
            </div>
          </div>
          <button className={styles.startBtn} onClick={startGame}>▶ START</button>
        </div>
      )}

      {/* Game */}
      {gameStarted && (
        <div className={styles.multiplayerGame}>
          <div className={styles.worldDisplay}>{world.name}</div>

          <div className={styles.playersContainer}>
            <PlayerBoard
              playerId={1}
              playerName="Player 1"
              controls={PLAYER1_CONTROLS}
              audioCtx={audioCtxRef.current}
              gameStarted={gameStarted}
              onGameOver={handleGameOver}
              worldIdx={worldIdx}
              beatPhase={beatPhase}
              boardBeat={boardBeat}
            />
            
            <div className={styles.vsIndicator}>VS</div>
            
            <PlayerBoard
              playerId={2}
              playerName="Player 2"
              controls={PLAYER2_CONTROLS}
              audioCtx={audioCtxRef.current}
              gameStarted={gameStarted}
              onGameOver={handleGameOver}
              worldIdx={worldIdx}
              beatPhase={beatPhase}
              boardBeat={boardBeat}
            />
          </div>

          {/* Winner announcement */}
          {winner && (
            <div className={styles.winnerAnnouncement}>
              <h2>🎉 Player {winner.playerId} Wins! 🎉</h2>
              <p>Score: {winner.score.toLocaleString()}</p>
              <button className={styles.restartBtn} onClick={startGame}>もう一度</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Rhythmia;