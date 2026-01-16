'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './VanillaGame.module.css';

const W = 10, H = 18;

const WORLDS = [
  { name: '🎀 メロディア', bpm: 100, colors: ['#FF6B9D','#FF8FAB','#FFB6C1','#C44569','#E8668B','#D4587D','#B84A6F'] },
  { name: '🌊 ハーモニア', bpm: 110, colors: ['#4ECDC4','#45B7AA','#3DA69B','#35958C','#2D847D','#26736E','#1A535C'] },
  { name: '☀️ クレシェンダ', bpm: 120, colors: ['#FFE66D','#FFD93D','#F7B731','#ECA700','#D19600','#B68600','#9B7600'] },
  { name: '🔥 フォルティッシモ', bpm: 140, colors: ['#FF6B6B','#FF5252','#FF3838','#FF1F1F','#E61717','#CC0F0F','#B30707'] },
  { name: '✨ 静寂の間', bpm: 160, colors: ['#A29BFE','#9B8EFD','#9381FC','#8B74FB','#8367FA','#7B5AF9','#6C5CE7'] }
];

const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[0,1,0],[1,1,1]], // T
  [[0,1,1],[1,1,0]], // S
  [[1,1,0],[0,1,1]], // Z
  [[1,0,0],[1,1,1]], // J
  [[0,0,1],[1,1,1]]  // L
];

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const WALL_KICKS: Record<string, number[][]> = {
  '0>1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
  '1>0': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
  '1>2': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
  '2>1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
  '2>3': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  '3>2': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  '3>0': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  '0>3': [[0,0], [1,0], [1,-1], [0,2], [1,2]]
};

const I_WALL_KICKS: Record<string, number[][]> = {
  '0>1': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
  '1>0': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
  '1>2': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]],
  '2>1': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
  '2>3': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
  '3>2': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
  '3>0': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
  '0>3': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]]
};

const DEFAULT_KEYBINDS = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  rotateLeft: 'z',
  rotateRight: 'x',
  drop: ' '
};

const PRESETS: Record<string, typeof DEFAULT_KEYBINDS> = {
  arrows: { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', rotate: 'ArrowUp', rotateLeft: 'z', rotateRight: 'x', drop: ' ' },
  wasd: { left: 'a', right: 'd', down: 's', rotate: 'w', rotateLeft: 'q', rotateRight: 'e', drop: ' ' },
  vim: { left: 'h', right: 'l', down: 'j', rotate: 'k', rotateLeft: 'u', rotateRight: 'i', drop: ' ' },
  gamer: { left: 's', right: 'f', down: 'd', rotate: 'e', rotateLeft: 'q', rotateRight: 'r', drop: ' ' }
};

type Piece = {
  shape: number[][];
  color: string;
  type: string;
  rotation: number;
};

type Cell = { color: string; ghost?: boolean } | null;

export default function VanillaGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [worldIdx, setWorldIdx] = useState(0);
  const [enemyHP, setEnemyHP] = useState(100);
  const [beatPhase, setBeatPhase] = useState(0);
  const [showKeybindModal, setShowKeybindModal] = useState(false);
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const [judgment, setJudgment] = useState({ text: '', color: '', show: false });
  
  const boardRef = useRef<(Cell)[][]>(Array(H).fill(null).map(() => Array(W).fill(null)));
  const pieceRef = useRef<Piece | null>(null);
  const piecePosRef = useRef({ x: 0, y: 0 });
  const nextPieceRef = useRef<Piece | null>(null);
  const levelRef = useRef(0);
  const linesRef = useRef(0);
  const lastBeatRef = useRef(Date.now());
  const comboRef = useRef(0);
  const pausedRef = useRef(false);
  const lastRotationWasKickRef = useRef(false);
  const lastMoveWasRotationRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dropTimerRef = useRef<NodeJS.Timeout | null>(null);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const beatRafRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const boardElRef = useRef<HTMLDivElement>(null);
  const activePieceElRef = useRef<HTMLDivElement>(null);
  const cellSizeRef = useRef(20);
  
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);
  
  const playTone = useCallback((freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + dur);
  }, []);
  
  const playDrum = useCallback(() => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtxRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtxRef.current.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.1);
  }, []);
  
  const playLineClear = useCallback((count: number) => {
    const freqs = [523, 659, 784, 1047];
    freqs.slice(0, count).forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle'), i * 60));
  }, [playTone]);
  
  const randomPiece = useCallback((): Piece => {
    const world = WORLDS[worldIdx];
    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[shapeIdx].map(row => [...row]);
    const color = world.colors[Math.floor(Math.random() * world.colors.length)];
    const type = PIECE_TYPES[shapeIdx];
    return { shape, color, type, rotation: 0 };
  }, [worldIdx]);
  
  const collision = useCallback((p: Piece, x: number, y: number): boolean => {
    return p.shape.some((row, py) =>
      row.some((val, px) => {
        if (!val) return false;
        const nx = x + px, ny = y + py;
        return nx < 0 || nx >= W || ny >= H || (ny >= 0 && boardRef.current[ny][nx]);
      })
    );
  }, []);
  
  const rotateShapeCW = (shape: number[][]): number[][] => {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  };
  
  const rotateShapeCCW = (shape: number[][]): number[][] => {
    return shape[0].map((_, i) => shape.map(row => row[row.length - 1 - i]));
  };
  
  const rotate = (p: Piece, direction = 1): Piece => {
    const newRotation = (p.rotation + direction + 4) % 4;
    return {
      ...p,
      shape: direction === 1 ? rotateShapeCW(p.shape) : rotateShapeCCW(p.shape),
      rotation: newRotation
    };
  };
  
  const getWallKicks = (pieceType: string, fromRot: number, toRot: number): number[][] => {
    const key = fromRot + '>' + toRot;
    if (pieceType === 'I') return I_WALL_KICKS[key] || [[0,0]];
    if (pieceType === 'O') return [[0,0]];
    return WALL_KICKS[key] || [[0,0]];
  };
  
  const showJudgmentText = useCallback((text: string, color: string) => {
    setJudgment({ text, color, show: true });
    setTimeout(() => setJudgment(prev => ({ ...prev, show: false })), 500);
  }, []);
  
  /**
   * TODO: Complete game implementation
   * 
   * The following functions need to be implemented to complete the game:
   * 
   * 1. tryRotate(direction: number): boolean
   *    - Attempts piece rotation with SRS wall kicks
   *    - Returns true if rotation successful
   * 
   * 2. checkTSpin(): 'none' | 'mini' | 'tspin'
   *    - Detects T-spin moves based on last rotation
   *    - Checks corner fill pattern
   * 
   * 3. lock(): void
   *    - Locks current piece to board
   *    - Checks for line clears
   *    - Updates score with combo bonuses
   *    - Spawns next piece
   * 
   * 4. move(dx: number, dy: number): void
   *    - Moves piece in given direction
   *    - Calls lock() if piece hits bottom
   * 
   * 5. hardDrop(): void
   *    - Instantly drops piece to bottom
   *    - Calls lock() after brief delay
   * 
   * 6. spawnNextPiece(): void
   *    - Makes nextPiece the current piece
   *    - Generates new nextPiece
   *    - Checks for game over
   * 
   * 7. drawBoard(): void
   *    - Renders board cells with current state
   *    - Shows ghost piece preview
   * 
   * 8. drawActivePiece(instant?: boolean): void
   *    - Renders the falling piece
   *    - Animates piece position
   * 
   * 9. createBoard(): void
   *    - Initializes board DOM elements
   *    - Sets up cell grid
   * 
   * 10. Game loop with requestAnimationFrame
   *     - Updates beat phase
   *     - Handles automatic piece dropping
   *     - Updates animations
   * 
   * See the original implementation in /public/rhythmia-nexus.html (lines 1400-2000)
   * for reference implementation of these functions.
   */
  
  const startGame = useCallback(() => {
    initAudio();
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setCombo(0);
    setWorldIdx(0);
    setEnemyHP(100);
    boardRef.current = Array(H).fill(null).map(() => Array(W).fill(null));
    pieceRef.current = randomPiece();
    nextPieceRef.current = randomPiece();
    piecePosRef.current = { x: Math.floor(W/2) - 1, y: 0 };
    levelRef.current = 0;
    linesRef.current = 0;
    comboRef.current = 0;
    pausedRef.current = false;
    lastBeatRef.current = Date.now();
    
    // Start game loops
    // Implementation continues...
  }, [initAudio, randomPiece]);
  
  useEffect(() => {
    // Load keybinds from localStorage
    try {
      const saved = localStorage.getItem('rhythmia-keybinds');
      if (saved) {
        setKeybinds({ ...DEFAULT_KEYBINDS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.log('Failed to load keybinds');
    }
  }, []);
  
  useEffect(() => {
    if (!gameStarted) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (listeningFor && showKeybindModal) {
        e.preventDefault();
        if (e.key === 'Escape') {
          setListeningFor(null);
          return;
        }
        setKeybinds(prev => ({ ...prev, [listeningFor]: e.key }));
        setListeningFor(null);
        playTone(523, 0.1);
        return;
      }
      
      if (showKeybindModal) return;
      
      // Game controls - implementation continues...
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, showKeybindModal, listeningFor, keybinds, playTone]);
  
  return (
    <div className={styles.container} data-world={worldIdx}>
      {!gameStarted ? (
        <div className={styles.titleScreen}>
          <h1 className={styles.title}>RHYTHMIA</h1>
          <p className={styles.subtitle}>リズムに乗ってブロックを積め！</p>
          <button className={styles.startBtn} onClick={startGame}>
            ▶ START
          </button>
        </div>
      ) : (
        <>
          <div className={styles.worldDisplay}>{WORLDS[worldIdx].name}</div>
          <div className={styles.scoreDisplay}>{score.toLocaleString()}</div>
          {combo >= 2 && (
            <div className={`${styles.combo} ${combo >= 5 ? styles.comboBig : ''}`}>
              {combo} COMBO!
            </div>
          )}
          
          <div className={styles.enemyLabel}>👻 ノイズリング</div>
          <div className={styles.enemyBar}>
            <div className={styles.enemyFill} style={{ width: `${enemyHP}%` }} />
          </div>
          
          <div className={styles.gameArea}>
            <div className={styles.boardWrap}>
              <div className={styles.board} ref={boardElRef} />
              <div className={styles.activePiece} ref={activePieceElRef} />
            </div>
            <div className={styles.nextWrap}>
              <div className={styles.nextLabel}>NEXT</div>
              <div className={styles.next} />
            </div>
          </div>
          
          <div className={styles.beatBar}>
            <div className={styles.beatTarget} />
            <div className={styles.beatFill} style={{ width: `${beatPhase * 100}%` }} />
          </div>
          
          <div className={styles.controls}>
            <button className={styles.ctrlBtn}>↻</button>
            <button className={styles.ctrlBtn}>←</button>
            <button className={styles.ctrlBtn}>↓</button>
            <button className={styles.ctrlBtn}>→</button>
            <button className={styles.ctrlBtn}>⬇</button>
          </div>
          
          <button className={styles.settingsBtn} onClick={() => setShowKeybindModal(true)}>
            ⚙
          </button>
        </>
      )}
      
      {judgment.show && (
        <div className={styles.judgment} style={{ color: judgment.color, textShadow: `0 0 30px ${judgment.color}` }}>
          {judgment.text}
        </div>
      )}
      
      {gameOver && (
        <div className={styles.gameover}>
          <h2>GAME OVER</h2>
          <div className={styles.finalScore}>{score.toLocaleString()} pts</div>
          <button className={styles.retryBtn} onClick={startGame}>もう一度</button>
        </div>
      )}
      
      {/* Keybind modal implementation would go here */}
    </div>
  );
}
