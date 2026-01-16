import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VanillaGame.module.css';

// ===== Types =====
interface PieceCell {
  color: string;
  ghost?:  boolean;
}

interface Piece {
  shape: number[][];
  color: string;
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
  { name:  '☀️ クレシェンダ', bpm: 120, colors: ['#FFE66D', '#FFD93D', '#F7B731', '#ECA700', '#D19600', '#B68600', '#9B7600'] },
  { name: '🔥 フォルティッシモ', bpm: 140, colors: ['#FF6B6B', '#FF5252', '#FF3838', '#FF1F1F', '#E61717', '#CC0F0F', '#B30707'] },
  { name: '✨ 静寂の間', bpm: 160, colors: ['#A29BFE', '#9B8EFD', '#9381FC', '#8B74FB', '#8367FA', '#7B5AF9', '#6C5CE7'] },
];

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
export const Rhythmia: React.FC = () => {
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

  // Keep refs in sync
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { piecePosRef.current = piecePos; }, [piecePos]);
  useEffect(() => { boardStateRef. current = board; }, [board]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { enemyHPRef.current = enemyHP; }, [enemyHP]);
  useEffect(() => { worldIdxRef.current = worldIdx; }, [worldIdx]);
  useEffect(() => { beatPhaseRef.current = beatPhase; }, [beatPhase]);

  // ===== Audio =====
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }, []);

  const playTone = useCallback((freq:  number, dur = 0.1, type: OscillatorType = 'sine') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc. frequency.value = freq;
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
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = world.colors[Math.floor(Math.random() * world.colors.length)];
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

  const endGame = useCallback(() => {
    setGameOver(true);
    setShowGameOver(true);
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    playTone(131, 0.5, 'sawtooth');
  }, [playTone]);

  const completeBoard = useCallback((partialBoard: (PieceCell | null)[][]) => {
    const completed = [...partialBoard];
    while (completed.length < H) {
      completed.unshift(Array(W).fill(null));
    }
    return completed;
  }, []);

  const lock = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;
    const currentBeatPhase = beatPhaseRef. current;

    if (! currentPiece) return;

    // Beat judgment
    const onBeat = currentBeatPhase > 0.75 || currentBeatPhase < 0.15;
    let mult = 1;

    if (onBeat) {
      mult = 2;
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      comboRef.current = newCombo;
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

    // Line clear
    let cleared = 0;
    const remainingBoard:  (PieceCell | null)[][] = [];
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
        const pts = [0, 100, 300, 500, 800][cleared] * (currentLevel + 1) * mult * Math.max(1, currentCombo);
        const newScore = scoreRef.current + pts;
        const newLines = linesRef.current + cleared;

        updateScore(newScore);
        scoreRef.current = newScore;
        setLines(newLines);
        linesRef.current = newLines;

        // Enemy damage
        const newEnemyHP = Math. max(0, enemyHPRef.current - cleared * 8 * mult);
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

    setPiece(currentNextPiece);
    pieceRef.current = currentNextPiece;
    setNextPiece(newNextPiece);
    setPiecePos(newPos);
    piecePosRef.current = newPos;

    if (currentNextPiece && collision(currentNextPiece, newPos.x, newPos.y, boardForCollisionCheck)) {
      endGame();
    }
  }, [nextPiece, showJudgment, playTone, spawnParticles, randomPiece, collision, updateScore, nextWorld, playLineClear, endGame]);

  const move = useCallback((dx: number, dy: number) => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef.current;
    const currentBoard = boardStateRef.current;

    if (! collision(currentPiece, currentPos.x + dx, currentPos. y + dy, currentBoard)) {
      const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };
      setPiecePos(newPos);
      piecePosRef.current = newPos;
      if (dx !== 0) playTone(392, 0.05, 'square');
    } else if (dy > 0) {
      lock();
    }
  }, [collision, playTone, lock]);

  const rotatePiece = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    const currentPos = piecePosRef. current;
    const currentBoard = boardStateRef.current;

    const rotated = rotate(currentPiece);
    if (! collision(rotated, currentPos. x, currentPos.y, currentBoard)) {
      setPiece(rotated);
      pieceRef.current = rotated;
      playTone(523, 0.08);
    }
  }, [rotate, collision, playTone]);

  const hardDrop = useCallback(() => {
    if (gameOverRef. current || !pieceRef.current) return;

    const currentPiece = pieceRef.current;
    let currentPos = { ... piecePosRef.current };
    const currentBoard = boardStateRef.current;

    while (! collision(currentPiece, currentPos.x, currentPos.y + 1, currentBoard)) {
      currentPos.y++;
    }

    setPiecePos(currentPos);
    piecePosRef.current = currentPos;
    playTone(196, 0.1, 'sawtooth');
    setTimeout(lock, 30);
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

    lastBeatRef.current = Date.now();
  }, [initAudio, randomPiece]);

  // ===== Effects =====

  // Drop timer
  useEffect(() => {
    if (! gameStarted || gameOver) return;

    dropTimerRef.current = window.setInterval(() => {
      if (! gameOverRef.current) {
        move(0, 1);
      }
    }, 500);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef. current);
    };
  }, [gameStarted, gameOver, move]);

  // Beat timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const world = WORLDS[worldIdx];
    const interval = 60000 / world.bpm;

    beatTimerRef.current = window.setInterval(() => {
      lastBeatRef.current = Date. now();
      setBoardBeat(true);
      playDrum();
      setTimeout(() => setBoardBeat(false), 100);
    }, interval);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [gameStarted, gameOver, worldIdx, playDrum]);

  // Beat phase animation
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    let animFrame: number;
    const updateBeat = () => {
      if (!gameOverRef.current) {
        const world = WORLDS[worldIdxRef.current];
        const interval = 60000 / world.bpm;
        const elapsed = Date.now() - lastBeatRef.current;
        const phase = (elapsed % interval) / interval;
        setBeatPhase(phase);
        beatPhaseRef.current = phase;
        animFrame = requestAnimationFrame(updateBeat);
      }
    };
    animFrame = requestAnimationFrame(updateBeat);

    return () => cancelAnimationFrame(animFrame);
  }, [gameStarted, gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':  move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
        case 'ArrowDown': move(0, 1); break;
        case 'ArrowUp': rotatePiece(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
    const display = board.map(r => r.map(c => c ? { ... c } : null));

    // Ghost position
    if (piece) {
      let gy = piecePos.y;
      while (! collision(piece, piecePos.x, gy + 1, board)) gy++;

      piece.shape.forEach((row, py) => {
        row.forEach((val, px) => {
          if (val) {
            const by = gy + py, bx = piecePos.x + px;
            if (by >= 0 && by < H && bx >= 0 && bx < W && ! display[by][bx]) {
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
      case 'rotate': rotatePiece(); break;
      case 'drop': hardDrop(); break;
    }
  }, [move, rotatePiece, hardDrop]);

  const world = WORLDS[worldIdx];
  const displayBoard = getDisplayBoard();
  const unit = cellSizeRef.current + 1;

  return (
    <div className={`${styles.body} ${styles[`w${worldIdx}`]}`}>
      {/* Title Screen */}
      {! gameStarted && (
        <div className={styles.titleScreen}>
          <h1>RHYTHMIA</h1>
          <p>リズムに乗ってブロックを積め！</p>
          <button className={styles.startBtn} onClick={startGame}>▶ START</button>
        </div>
      )}

      {/* Game */}
      {gameStarted && (
        <div className={styles. game}>
          <div className={styles.worldDisplay}>{world.name}</div>

          <div className={`${styles.scoreDisplay} ${scorePop ? styles.pop : ''}`}>
            {score. toLocaleString()}
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
                      className={`${styles.cell} ${cell ? styles.filled : ''} ${cell?. ghost ? styles.ghost : ''} ${isClearing ? styles.clearing : ''}`}
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
                  style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0]. length}, 1fr)` }}
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
            <div className={styles. beatFill} style={{ width: `${beatPhase * 100}%` }} />
          </div>

          <div className={styles. controls}>
            {['rotate', 'left', 'down', 'right', 'drop'].map((action) => (
              <button
                key={action}
                className={styles.ctrlBtn}
                onTouchEnd={(e) => { e.preventDefault(); handleControlClick(action); }}
                onClick={() => handleControlClick(action)}
              >
                {action === 'rotate' ?  '↻' : action === 'left' ? '←' : action === 'down' ?  '↓' : action === 'right' ? '→' :  '⬇'}
              </button>
            ))}
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

      {/* Game Over */}
      {showGameOver && (
        <div className={`${styles.gameover} ${styles.show}`}>
          <h2>GAME OVER</h2>
          <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
          <button className={styles.restartBtn} onClick={startGame}>もう一度</button>
        </div>
      )}
    </div>
  );
};

export default Rhythmia;