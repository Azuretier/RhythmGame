import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const getRandomPiece = (): string => {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return pieces[Math.floor(Math.random() * pieces.length)];
};

export default function Tetris() {
  const [board, setBoard] = useState<(string | null)[][]>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<string>(getRandomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // DAS/ARR/SDF settings (adjustable)
  const [das, setDas] = useState(DEFAULT_DAS);
  const [arr, setArr] = useState(DEFAULT_ARR);
  const [sdf, setSdf] = useState(DEFAULT_SDF);
  
  const gameLoopRef = useRef<number | null>(null);
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
  const isPausedRef = useRef(isPaused);
  const gameOverRef = useRef(gameOver);

  // Keep refs in sync with state
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { dasRef.current = das; }, [das]);
  useEffect(() => { arrRef.current = arr; }, [arr]);
  useEffect(() => { sdfRef.current = sdf; }, [sdf]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { scoreRef.current = score; }, [score]);

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
          
          // Check horizontal bounds
          if (newX < 0 || newX >= BOARD_WIDTH) {
            return false;
          }
          
          // Check if below the board
          if (newY >= BOARD_HEIGHT) {
            return false;
          }
          
          // Only check collision with existing blocks if within visible board
          // Blocks above the board (newY < 0) are allowed
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

  const lockPiece = useCallback((piece: Piece, boardState: (string | null)[][]): { newBoard: (string | null)[][], isLockOut: boolean } => {
    const newBoard = boardState.map(row => [...row]);
    const shape = getShape(piece.type, piece.rotation);
    let hasBlockInVisibleArea = false;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          
          // Check if this block is in the visible area
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            hasBlockInVisibleArea = true;
            newBoard[boardY][boardX] = piece.type;
          }
          // Blocks above the board (boardY < 0) are not placed - they're outside
        }
      }
    }
    
    // Lock out: game over if NO blocks are in the visible area
    const isLockOut = !hasBlockInVisibleArea;
    
    return { newBoard, isLockOut };
  }, [getShape]);

  const clearLines = useCallback((boardState: (string | null)[][]) => {
    const newBoard = boardState.filter(row => row.some(cell => cell === null));
    const clearedLines = BOARD_HEIGHT - newBoard.length;
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }
    
    return { newBoard, clearedLines };
  }, []);

  // Core movement function (used by DAS/ARR system)
  const movePieceInternal = useCallback((dx: number, dy: number): boolean => {
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
  }, [isValidPosition]);

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
          while (movePieceInternal(dx, 0)) {}
        } else {
          movePieceInternal(dx, 0);
        }
      }
    } else {
      // ARR phase - auto-repeat is active
      if (currentArr === 0) {
        // Instant ARR - move to edge every frame
        while (movePieceInternal(dx, 0)) {}
      } else {
        // Normal ARR with delay between moves
        const timeSinceLastMove = currentTime - state.lastMoveTime;
        if (timeSinceLastMove >= currentArr) {
          movePieceInternal(dx, 0);
          state.lastMoveTime = currentTime;
        }
      }
    }
  }, [movePieceInternal]);

  // Process soft drop (SDF)
  const processSoftDrop = useCallback((currentTime: number) => {
    const state = keyStatesRef.current.down;
    if (!state.pressed || isPausedRef.current || gameOverRef.current) return;

    const currentSdf = sdfRef.current;
    const timeSinceLastMove = currentTime - state.lastMoveTime;

    if (currentSdf === 0) {
      // Instant soft drop (sonic drop without locking)
      while (movePieceInternal(0, 1)) {
        setScore(prev => prev + 1);
      }
    } else if (timeSinceLastMove >= currentSdf) {
      if (movePieceInternal(0, 1)) {
        setScore(prev => prev + 1);
      }
      state.lastMoveTime = currentTime;
    }
  }, [movePieceInternal]);

  const spawnPiece = useCallback((): Piece | null => {
    const type = nextPiece;
    const shape = getShape(type, 0);
    const newPiece: Piece = {
      type,
      rotation: 0,
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: type === 'I' ? -2 : -1, // Start higher to allow more buffer room
    };
    
    setNextPiece(getRandomPiece());
    
    // Check if the piece can exist at spawn position
    // If it immediately collides and cannot move, it will lock on next tick
    // Game over only happens if the locked piece is completely outside the board
    
    return newPiece;
  }, [nextPiece, getShape]);

  const rotatePiece = useCallback((direction: 1 | -1) => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;
    
    const rotatedPiece = tryRotation(piece, direction, boardRef.current);
    if (rotatedPiece) {
      setCurrentPiece(rotatedPiece);
      currentPieceRef.current = rotatedPiece;
    }
  }, [tryRotation]);

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOverRef.current || isPausedRef.current) return;
    
    let newPiece = { ...piece };
    let dropDistance = 0;
    
    while (isValidPosition({ ...newPiece, y: newPiece.y + 1 }, boardRef.current)) {
      newPiece.y++;
      dropDistance++;
    }
    
    const { newBoard, isLockOut } = lockPiece(newPiece, boardRef.current);
    
    // Check for lock out (piece completely outside visible area)
    if (isLockOut) {
      setGameOver(true);
      setIsPlaying(false);
      return;
    }
    
    const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    boardRef.current = clearedBoard;
    setScore(prev => prev + dropDistance * 2 + clearedLines * 100 * levelRef.current);
    setLines(prev => {
      const newLines = prev + clearedLines;
      setLevel(Math.floor(newLines / 10) + 1);
      return newLines;
    });
    
    const spawned = spawnPiece();
    setCurrentPiece(spawned);
    currentPieceRef.current = spawned;
  }, [isValidPosition, lockPiece, clearLines, spawnPiece]);

  const tick = useCallback(() => {
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
      // Lock the piece
      const { newBoard, isLockOut } = lockPiece(piece, boardRef.current);
      
      // Check for lock out (piece completely outside visible area)
      if (isLockOut) {
        setGameOver(true);
        setIsPlaying(false);
        return;
      }
      
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

  // Main game loop using requestAnimationFrame for smooth DAS/ARR
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
            if (!isPaused) movePieceInternal(-1, 0);
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
            if (!isPaused) movePieceInternal(1, 0);
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
            if (!isPaused && movePieceInternal(0, 1)) {
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
  }, [isPlaying, isPaused, gameOver, movePieceInternal, rotatePiece, hardDrop]);

  const startGame = useCallback(() => {
    const emptyBoard = createEmptyBoard();
    setBoard(emptyBoard);
    boardRef.current = emptyBoard;
    setScore(0);
    scoreRef.current = 0;
    setLines(0);
    setLevel(1);
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

  // Check if current piece has any blocks above visible area (danger state)
  const isPieceInDanger = useCallback(() => {
    const piece = currentPiece;
    if (!piece) return false;
    
    const shape = getShape(piece.type, piece.rotation);
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = piece.y + y;
          if (boardY < 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, [currentPiece, getShape]);

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

  // Render blocks that are above the visible board (danger zone preview)
  const renderAboveBoardPreview = () => {
    if (!currentPiece) return null;
    
    const shape = getShape(currentPiece.type, currentPiece.rotation);
    const aboveBlocks: { x: number; y: number }[] = [];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY < 0) {
            aboveBlocks.push({ x: boardX, y: boardY });
          }
        }
      }
    }
    
    if (aboveBlocks.length === 0) return null;
    
    return (
      <div 
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: -CELL_SIZE * 2 - 4 }}
      >
        <div className="relative" style={{ width: BOARD_WIDTH * CELL_SIZE }}>
          {aboveBlocks.map((block, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: block.x * CELL_SIZE,
                top: (block.y + 2) * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: COLORS[currentPiece.type] + '80',
                border: `2px solid ${COLORS[currentPiece.type]}`,
                boxShadow: `0 0 10px ${COLORS[currentPiece.type]}`,
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const dangerState = isPieceInDanger();

  const renderNextPiece = () => {
    const shape = getShape(nextPiece, 0);
    const size = nextPiece === 'I' ? 4 : nextPiece === 'O' ? 2 : 3;
    
    return (
      <div className="flex flex-col items-center">
        {shape.slice(0, size === 4 ? 4 : 2).map((row, y) => (
          <div key={y} className="flex">
            {row.slice(0, size).map((cell, x) => (
              <div
                key={x}
                className="border border-gray-700"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: cell ? COLORS[nextPiece] : '#1a1a2e',
                  boxShadow: cell ? 'inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const displayBoard = renderBoard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="flex gap-6">
        {/* Main Game Board */}
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold text-white mb-4 tracking-wider">TETRIS</h1>
          
          {/* Danger indicator */}
          {dangerState && isPlaying && !gameOver && (
            <div className="mb-2 px-3 py-1 bg-red-600 rounded-full text-sm font-bold animate-pulse">
              ⚠️ DANGER ZONE
            </div>
          )}
          
          <div 
            className="relative border-4 rounded-lg overflow-visible"
            style={{ 
              backgroundColor: '#0f0f1a',
              boxShadow: dangerState 
                ? '0 0 30px rgba(239, 68, 68, 0.7), inset 0 0 20px rgba(0,0,0,0.5)'
                : '0 0 20px rgba(139, 92, 246, 0.5), inset 0 0 20px rgba(0,0,0,0.5)',
              borderColor: dangerState ? '#ef4444' : '#8b5cf6',
              transition: 'box-shadow 0.3s, border-color 0.3s',
            }}
          >
            {/* Above-board preview for pieces in danger zone */}
            {renderAboveBoardPreview()}
            {displayBoard.map((row, y) => (
              <div key={y} className="flex">
                {row.map((cell, x) => {
                  const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
                  const pieceType = isGhost ? cell.replace('ghost-', '') : cell;
                  
                  return (
                    <div
                      key={x}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: cell 
                          ? isGhost 
                            ? 'transparent'
                            : COLORS[pieceType as string]
                          : 'transparent',
                        border: isGhost 
                          ? `2px dashed ${COLORS[pieceType as string]}50`
                          : '1px solid #2d2d4a',
                        boxShadow: cell && !isGhost
                          ? 'inset 3px 3px 6px rgba(255,255,255,0.3), inset -3px -3px 6px rgba(0,0,0,0.4)'
                          : 'none',
                        opacity: isGhost ? 0.5 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            
            {/* Overlay for Game Over / Paused */}
            {(gameOver || isPaused) && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white mb-4">
                    {gameOver ? 'GAME OVER' : 'PAUSED'}
                  </p>
                  {gameOver && (
                    <button
                      onClick={startGame}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Play Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-3 text-white w-44">
          {/* Next Piece */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 border border-purple-500">
            <h3 className="text-sm font-semibold mb-2 text-purple-300">NEXT</h3>
            <div className="flex justify-center items-center h-20">
              {renderNextPiece()}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 border border-purple-500 text-center">
              <h3 className="text-xs font-semibold text-purple-300">SCORE</h3>
              <p className="text-sm font-bold">{score.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 border border-purple-500 text-center">
              <h3 className="text-xs font-semibold text-purple-300">LINES</h3>
              <p className="text-sm font-bold">{lines}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 border border-purple-500 text-center">
              <h3 className="text-xs font-semibold text-purple-300">LEVEL</h3>
              <p className="text-sm font-bold">{level}</p>
            </div>
          </div>

          {/* DAS/ARR/SDF Settings */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 border border-cyan-500">
            <h3 className="text-sm font-semibold mb-2 text-cyan-300">HANDLING</h3>
            <div className="text-xs space-y-3">
              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>DAS</span>
                  <span className="text-cyan-400 font-mono">{das}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={das}
                  onChange={(e) => setDas(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-gray-500 text-xs mt-1">
                  <span>0</span>
                  <span>300</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>ARR</span>
                  <span className="text-cyan-400 font-mono">{arr === 0 ? 'INSTANT' : `${arr}ms`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={arr}
                  onChange={(e) => setArr(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-gray-500 text-xs mt-1">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>SDF</span>
                  <span className="text-cyan-400 font-mono">{sdf === 0 ? 'INSTANT' : `${sdf}ms`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sdf}
                  onChange={(e) => setSdf(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-gray-500 text-xs mt-1">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 border border-purple-500">
            <h3 className="text-sm font-semibold mb-2 text-purple-300">CONTROLS</h3>
            <div className="text-xs space-y-1 text-gray-300">
              <p><span className="text-purple-400">← →</span> Move (DAS/ARR)</p>
              <p><span className="text-purple-400">↓</span> Soft Drop (SDF)</p>
              <p><span className="text-purple-400">↑/X</span> Rotate CW</p>
              <p><span className="text-purple-400">Z/Ctrl</span> Rotate CCW</p>
              <p><span className="text-purple-400">Space</span> Hard Drop</p>
              <p><span className="text-purple-400">P/Esc</span> Pause</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-800 bg-opacity-30 rounded-lg p-2 border border-gray-600 text-xs text-gray-400">
            <p><strong>DAS:</strong> Delay before auto-repeat</p>
            <p><strong>ARR:</strong> Auto-repeat speed (0=instant)</p>
            <p><strong>SDF:</strong> Soft drop speed (0=instant)</p>
            <p className="mt-1 pt-1 border-t border-gray-700"><strong>Lock Out:</strong> Game ends only when a piece locks completely above the board</p>
          </div>

          {/* Start Button */}
          {!isPlaying && !gameOver && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              START GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
