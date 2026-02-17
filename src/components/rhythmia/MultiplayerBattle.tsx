'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styles from './MultiplayerBattle.module.css';
import type { Player, BoardCell, ServerMessage, RelayPayload } from '@/types/multiplayer';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    COLORS,
    TETROMINOES,
    LOCK_DELAY,
    MAX_LOCK_MOVES,
    DEFAULT_DAS,
    DEFAULT_ARR,
    DEFAULT_SDF,
    PIECE_TYPES,
} from './tetris/constants';
import type { Piece, Board, KeyState } from './tetris/types';
import {
    createEmptyBoard,
    shuffleBag,
    getShape,
    isValidPosition,
    tryRotation,
    lockPiece,
    clearLines,
    createSpawnPiece,
    getGhostY,
} from './tetris/utils/boardUtils';

// ===== Garbage Calculation =====
// Standard competitive Tetris: 1-line=0, 2-line=1, 3-line=2, 4-line(Tetris)=4
const GARBAGE_TABLE = [0, 0, 1, 2, 4];

// ===== Seeded RNG for deterministic piece bags =====
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

function seededShuffleBag(rng: () => number): string[] {
    const pieces = [...PIECE_TYPES];
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
}

// ===== Opponent Board State =====
interface OpponentState {
    board: (BoardCell | null)[][];
    score: number;
    lines: number;
    combo: number;
    piece?: string;
    hold?: string | null;
    dead: boolean;
}

// ===== Props Interface =====
interface MultiplayerBattleProps {
    ws: WebSocket;
    roomCode: string;
    playerId: string;
    playerName: string;
    opponents: Player[];
    gameSeed: number;
    onGameEnd: (winnerId: string) => void;
    onBackToLobby: () => void;
}

// ===== Component =====
export default function MultiplayerBattle({
    ws,
    roomCode,
    playerId,
    playerName,
    opponents,
    gameSeed,
    onGameEnd,
    onBackToLobby,
}: MultiplayerBattleProps) {
    // ===== Local Game State =====
    const [board, setBoard] = useState<Board>(createEmptyBoard);
    const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
    const [nextPieceType, setNextPieceType] = useState('');
    const [holdPieceType, setHoldPieceType] = useState<string | null>(null);
    const [canHold, setCanHold] = useState(true);
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [combo, setCombo] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameEnded, setGameEnded] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);

    // Garbage queue (pending lines to be added when next piece locks)
    const [garbageQueue, setGarbageQueue] = useState(0);

    // Opponent states
    const [opponentStates, setOpponentStates] = useState<Record<string, OpponentState>>(() => {
        const states: Record<string, OpponentState> = {};
        for (const opp of opponents) {
            states[opp.id] = {
                board: Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null)),
                score: 0,
                lines: 0,
                combo: 0,
                dead: false,
            };
        }
        return states;
    });

    // ===== Refs for game loop access =====
    const boardRef = useRef<Board>(createEmptyBoard());
    const currentPieceRef = useRef<Piece | null>(null);
    const pieceBagRef = useRef<string[]>([]);
    const nextPieceTypeRef = useRef('');
    const holdPieceTypeRef = useRef<string | null>(null);
    const canHoldRef = useRef(true);
    const scoreRef = useRef(0);
    const linesRef = useRef(0);
    const levelRef = useRef(1);
    const comboRef = useRef(0);
    const gameOverRef = useRef(false);
    const gameEndedRef = useRef(false);
    const garbageQueueRef = useRef(0);

    // RNG for deterministic bags
    const rngRef = useRef(seededRandom(gameSeed));

    // DAS/ARR/SDF
    const dasRef = useRef(DEFAULT_DAS);
    const arrRef = useRef(DEFAULT_ARR);
    const sdfRef = useRef(DEFAULT_SDF);

    // Key states
    const keyStatesRef = useRef<Record<string, KeyState>>({
        left: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
        right: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
        down: { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 },
    });

    // Game loop refs
    const gameLoopRef = useRef<number | null>(null);
    const lastGravityRef = useRef(0);
    const lockStartTimeRef = useRef<number | null>(null);
    const lockMovesRef = useRef(0);

    // Relay throttle
    const lastRelayRef = useRef(0);
    const RELAY_INTERVAL = 100; // ms

    // ===== Keep refs in sync =====
    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { linesRef.current = lines; }, [lines]);
    useEffect(() => { levelRef.current = level; }, [level]);
    useEffect(() => { comboRef.current = combo; }, [combo]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { gameEndedRef.current = gameEnded; }, [gameEnded]);
    useEffect(() => { garbageQueueRef.current = garbageQueue; }, [garbageQueue]);

    // ===== WebSocket Send =====
    const send = useCallback((data: object) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }, [ws]);

    const sendRelay = useCallback((payload: RelayPayload) => {
        send({ type: 'relay', payload });
    }, [send]);

    // ===== Piece Bag System =====
    const getNextFromBag = useCallback((): string => {
        if (pieceBagRef.current.length === 0) {
            pieceBagRef.current = seededShuffleBag(rngRef.current);
        }
        return pieceBagRef.current.shift()!;
    }, []);

    // ===== Spawn Piece =====
    const spawnPiece = useCallback((): Piece | null => {
        const type = nextPieceTypeRef.current;
        const newPiece = createSpawnPiece(type);

        const nextType = getNextFromBag();
        setNextPieceType(nextType);
        nextPieceTypeRef.current = nextType;
        setCanHold(true);
        canHoldRef.current = true;

        if (!isValidPosition(newPiece, boardRef.current)) {
            return null; // topped out
        }

        return newPiece;
    }, [getNextFromBag]);

    // ===== Apply Garbage =====
    const applyGarbage = useCallback((count: number, boardState: Board): Board => {
        if (count <= 0) return boardState;
        const newBoard = boardState.map(row => [...row]);
        // Remove top rows
        for (let i = 0; i < count; i++) {
            newBoard.shift();
        }
        // Add garbage rows at bottom with one random gap
        for (let i = 0; i < count; i++) {
            const gapCol = Math.floor(Math.random() * BOARD_WIDTH);
            const garbageRow: (string | null)[] = Array(BOARD_WIDTH).fill('G');
            garbageRow[gapCol] = null;
            newBoard.push(garbageRow);
        }
        return newBoard;
    }, []);

    // ===== Relay Board State =====
    const relayBoardState = useCallback(() => {
        const now = Date.now();
        if (now - lastRelayRef.current < RELAY_INTERVAL) return;
        lastRelayRef.current = now;

        const piece = currentPieceRef.current;
        // Convert board to BoardCell format for relay
        const relayBoard: (BoardCell | null)[][] = boardRef.current.map(row =>
            row.map(cell => (cell ? { color: COLORS[cell] || cell } : null))
        );

        sendRelay({
            event: 'board_update',
            board: relayBoard,
            score: scoreRef.current,
            lines: linesRef.current,
            combo: comboRef.current,
            piece: piece?.type,
            hold: holdPieceTypeRef.current,
        });
    }, [sendRelay]);

    // ===== Handle Piece Lock =====
    const handlePieceLock = useCallback((piece: Piece, dropDistance = 0) => {
        lockStartTimeRef.current = null;
        lockMovesRef.current = 0;

        const newBoard = lockPiece(piece, boardRef.current);
        const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);

        // Apply pending garbage AFTER clearing
        const garbage = garbageQueueRef.current;
        let finalBoard = clearedBoard;
        if (garbage > 0 && clearedLines === 0) {
            finalBoard = applyGarbage(garbage, clearedBoard);
            setGarbageQueue(0);
            garbageQueueRef.current = 0;
        } else if (garbage > 0 && clearedLines > 0) {
            // Cancel out garbage with cleared lines
            const remaining = Math.max(0, garbage - clearedLines);
            setGarbageQueue(remaining);
            garbageQueueRef.current = remaining;
        }

        setBoard(finalBoard);
        boardRef.current = finalBoard;

        // Score
        const baseScore = dropDistance * 2 + [0, 100, 300, 500, 800][clearedLines] * levelRef.current;
        const newCombo = clearedLines > 0 ? comboRef.current + 1 : 0;
        setCombo(newCombo);
        comboRef.current = newCombo;
        const finalScore = baseScore * Math.max(1, newCombo);
        setScore(prev => prev + finalScore);

        // Lines & Level
        if (clearedLines > 0) {
            setLines(prev => {
                const newLines = prev + clearedLines;
                const newLevel = Math.floor(newLines / 10) + 1;
                setLevel(newLevel);
                levelRef.current = newLevel;
                linesRef.current = newLines;
                return newLines;
            });

            // Send garbage to opponents
            const garbageToSend = GARBAGE_TABLE[Math.min(clearedLines, 4)];
            if (garbageToSend > 0) {
                sendRelay({ event: 'garbage', lines: garbageToSend });
            }
        }

        // Spawn next piece
        const spawned = spawnPiece();
        if (!spawned) {
            // Topped out
            setGameOver(true);
            gameOverRef.current = true;
            sendRelay({ event: 'game_over' });
            return;
        }

        setCurrentPiece(spawned);
        currentPieceRef.current = spawned;

        // Relay board state
        relayBoardState();
    }, [applyGarbage, sendRelay, spawnPiece, relayBoardState]);

    const handlePieceLockRef = useRef(handlePieceLock);
    handlePieceLockRef.current = handlePieceLock;

    // ===== Movement Functions =====
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
    }, []);

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
    }, [movePiece]);

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
    }, []);

    const hardDrop = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece || gameOverRef.current) return;

        let newPiece = { ...piece };
        let dropDistance = 0;
        while (isValidPosition({ ...newPiece, y: newPiece.y + 1 }, boardRef.current)) {
            newPiece.y++;
            dropDistance++;
        }

        lockStartTimeRef.current = null;
        lockMovesRef.current = 0;
        handlePieceLockRef.current(newPiece, dropDistance);
    }, []);

    const holdCurrentPiece = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece || gameOverRef.current || !canHoldRef.current) return;

        lockStartTimeRef.current = null;
        lockMovesRef.current = 0;

        const currentType = piece.type;

        if (holdPieceTypeRef.current === null) {
            setHoldPieceType(currentType);
            holdPieceTypeRef.current = currentType;
            const spawned = spawnPiece();
            if (!spawned) {
                setGameOver(true);
                gameOverRef.current = true;
                sendRelay({ event: 'game_over' });
                return;
            }
            setCurrentPiece(spawned);
            currentPieceRef.current = spawned;
        } else {
            const heldType = holdPieceTypeRef.current;
            setHoldPieceType(currentType);
            holdPieceTypeRef.current = currentType;

            const newPiece = createSpawnPiece(heldType);
            if (isValidPosition(newPiece, boardRef.current)) {
                setCurrentPiece(newPiece);
                currentPieceRef.current = newPiece;
            } else {
                setHoldPieceType(heldType);
                holdPieceTypeRef.current = heldType;
                return;
            }
        }

        setCanHold(false);
        canHoldRef.current = false;
    }, [spawnPiece, sendRelay]);

    // ===== DAS/ARR Processing =====
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
                    while (moveHorizontal(dx)) { }
                } else {
                    moveHorizontal(dx);
                }
            }
        } else {
            if (currentArr === 0) {
                while (moveHorizontal(dx)) { }
            } else {
                if (currentTime - state.lastMoveTime >= currentArr) {
                    moveHorizontal(dx);
                    state.lastMoveTime = currentTime;
                }
            }
        }
    }, [moveHorizontal]);

    const processSoftDrop = useCallback((currentTime: number) => {
        const state = keyStatesRef.current.down;
        if (!state.pressed || gameOverRef.current) return;

        const currentSdf = sdfRef.current;
        if (currentSdf === 0) {
            while (movePiece(0, 1)) {
                setScore(prev => prev + 1);
            }
        } else if (currentTime - state.lastMoveTime >= currentSdf) {
            if (movePiece(0, 1)) {
                setScore(prev => prev + 1);
            }
            state.lastMoveTime = currentTime;
        }
    }, [movePiece]);

    // Tick (gravity)
    const tick = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece || gameOverRef.current) return;

        const newPiece: Piece = { ...piece, y: piece.y + 1 };
        if (isValidPosition(newPiece, boardRef.current)) {
            setCurrentPiece(newPiece);
            currentPieceRef.current = newPiece;
        }
    }, []);

    // ===== Initialize Game =====
    useEffect(() => {
        // Set up initial piece bag from seed
        rngRef.current = seededRandom(gameSeed);
        pieceBagRef.current = seededShuffleBag(rngRef.current);

        const boardState = createEmptyBoard();
        setBoard(boardState);
        boardRef.current = boardState;

        // First piece from bag
        const firstType = pieceBagRef.current.shift()!;
        const secondType = pieceBagRef.current.shift()!;

        setNextPieceType(secondType);
        nextPieceTypeRef.current = secondType;

        const piece = createSpawnPiece(firstType);
        setCurrentPiece(piece);
        currentPieceRef.current = piece;

        setScore(0);
        scoreRef.current = 0;
        setLines(0);
        linesRef.current = 0;
        setLevel(1);
        levelRef.current = 1;
        setCombo(0);
        comboRef.current = 0;
        setGameOver(false);
        gameOverRef.current = false;
        setGameEnded(false);
        gameEndedRef.current = false;
        setHoldPieceType(null);
        holdPieceTypeRef.current = null;
        setCanHold(true);
        canHoldRef.current = true;
        setGarbageQueue(0);
        garbageQueueRef.current = 0;
        setWinnerId(null);
    }, [gameSeed]);

    // ===== Game Loop =====
    useEffect(() => {
        if (gameOver) return;

        const gameLoop = (currentTime: number) => {
            if (gameOverRef.current) return;

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

            // Periodic relay
            relayBoardState();

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        lastGravityRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameOver, tick, processHorizontalDasArr, processSoftDrop, relayBoardState]);

    // ===== Keyboard Input =====
    useEffect(() => {
        if (gameOver) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat || gameOverRef.current) return;

            const currentTime = performance.now();

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!keyStatesRef.current.left.pressed) {
                        keyStatesRef.current.right = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
                        keyStatesRef.current.left = {
                            pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime,
                        };
                        moveHorizontal(-1);
                    }
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    if (!keyStatesRef.current.right.pressed) {
                        keyStatesRef.current.left = { pressed: false, dasCharged: false, lastMoveTime: 0, pressTime: 0 };
                        keyStatesRef.current.right = {
                            pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime,
                        };
                        moveHorizontal(1);
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (!keyStatesRef.current.down.pressed) {
                        keyStatesRef.current.down = {
                            pressed: true, dasCharged: false, lastMoveTime: currentTime, pressTime: currentTime,
                        };
                        if (movePiece(0, 1)) {
                            setScore(prev => prev + 1);
                        }
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
    }, [gameOver, moveHorizontal, movePiece, rotatePiece, hardDrop, holdCurrentPiece]);

    // ===== Handle Server Messages =====
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);

                if (msg.type === 'relayed') {
                    const payload = msg.payload;

                    if (payload.event === 'board_update') {
                        setOpponentStates(prev => ({
                            ...prev,
                            [msg.fromPlayerId]: {
                                ...prev[msg.fromPlayerId],
                                board: payload.board,
                                score: payload.score,
                                lines: payload.lines,
                                combo: payload.combo,
                                piece: payload.piece,
                                hold: payload.hold,
                            },
                        }));
                    }

                    if (payload.event === 'garbage') {
                        setGarbageQueue(prev => {
                            const newVal = prev + payload.lines;
                            garbageQueueRef.current = newVal;
                            return newVal;
                        });
                    }

                    if (payload.event === 'game_over') {
                        setOpponentStates(prev => ({
                            ...prev,
                            [msg.fromPlayerId]: {
                                ...prev[msg.fromPlayerId],
                                dead: true,
                            },
                        }));

                        // Check if all opponents are dead → we win
                        setOpponentStates(prevStates => {
                            const updatedStates = {
                                ...prevStates,
                                [msg.fromPlayerId]: { ...prevStates[msg.fromPlayerId], dead: true },
                            };
                            const allDead = Object.values(updatedStates).every(o => o.dead);
                            if (allDead && !gameEndedRef.current) {
                                setGameEnded(true);
                                gameEndedRef.current = true;
                                setWinnerId(playerId);
                                // Defer onGameEnd to avoid state update during render
                                setTimeout(() => onGameEnd(playerId), 100);
                            }
                            return updatedStates;
                        });
                    }

                    if (payload.event === 'ko') {
                        if (!gameEndedRef.current) {
                            setGameEnded(true);
                            gameEndedRef.current = true;
                            setWinnerId(payload.winnerId);
                            setTimeout(() => onGameEnd(payload.winnerId), 100);
                        }
                    }
                }
            } catch (err) {
                console.error('[MultiplayerBattle] Parse error:', err);
            }
        };

        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [ws, playerId, onGameEnd]);

    // When local player dies, check if game should end
    useEffect(() => {
        if (gameOver && !gameEndedRef.current) {
            // If only 1 opponent and they're still alive, they win
            const aliveOpponents = Object.entries(opponentStates).filter(([, o]) => !o.dead);
            if (aliveOpponents.length === 1) {
                setGameEnded(true);
                gameEndedRef.current = true;
                const winnerId = aliveOpponents[0][0];
                setWinnerId(winnerId);
                setTimeout(() => onGameEnd(winnerId), 100);
            }
        }
    }, [gameOver, opponentStates, onGameEnd]);

    // ===== Render Helpers =====

    // Player display board with current piece and ghost
    const displayBoard = useMemo(() => {
        const display = board.map(row => [...row]);

        if (currentPiece) {
            const shape = getShape(currentPiece.type, currentPiece.rotation);

            // Ghost
            const ghostY = getGhostY(currentPiece, board);
            if (ghostY !== currentPiece.y) {
                for (let y = 0; y < shape.length; y++) {
                    for (let x = 0; x < shape[y].length; x++) {
                        if (shape[y][x]) {
                            const boardY = ghostY + y;
                            const boardX = currentPiece.x + x;
                            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                                if (display[boardY][boardX] === null) {
                                    display[boardY][boardX] = `ghost-${currentPiece.type}`;
                                }
                            }
                        }
                    }
                }
            }

            // Current piece
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const boardY = currentPiece.y + y;
                        const boardX = currentPiece.x + x;
                        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                            display[boardY][boardX] = currentPiece.type;
                        }
                    }
                }
            }
        }

        return display;
    }, [board, currentPiece]);

    // ===== Preview Piece Renderer =====
    const renderPreviewPiece = useCallback((type: string | null | undefined) => {
        if (!type) return null;
        const shape = TETROMINOES[type]?.[0];
        if (!shape) return null;

        // Determine grid size for the piece
        const size = shape.length;
        return (
            <div
                className={styles.previewGrid}
                style={{ gridTemplateColumns: `repeat(${size}, 12px)`, gridTemplateRows: `repeat(${size}, 12px)` }}
            >
                {shape.flat().map((val, i) => (
                    <div
                        key={i}
                        className={`${styles.previewCell} ${val ? styles.previewCellFilled : ''}`}
                        style={val ? { backgroundColor: COLORS[type] || '#fff' } : {}}
                    />
                ))}
            </div>
        );
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.battleArena}>
                {/* ===== Player Section ===== */}
                <div className={styles.playerSection}>
                    <div className={styles.playerLabel}>{playerName}</div>

                    <div className={styles.playerBoard}>
                        {/* Left panel: Hold */}
                        <div className={styles.sidePanel}>
                            <div className={styles.previewBox}>
                                <div className={styles.previewLabel}>HOLD</div>
                                {renderPreviewPiece(holdPieceType)}
                            </div>
                        </div>

                        {/* Board */}
                        <div className={styles.boardContainer}>
                            {/* Garbage indicator */}
                            {garbageQueue > 0 && (
                                <div className={styles.garbageIndicator}>
                                    {Array.from({ length: Math.min(garbageQueue, 20) }).map((_, i) => (
                                        <div key={i} className={styles.garbageBar} />
                                    ))}
                                </div>
                            )}

                            <div className={styles.board}>
                                {displayBoard.flat().map((cell, i) => {
                                    const isGhost = typeof cell === 'string' && cell.startsWith('ghost-');
                                    const pieceType = isGhost ? cell.replace('ghost-', '') : cell;
                                    const color = pieceType ? (COLORS[pieceType as string] || (pieceType === 'G' ? '#666' : '#fff')) : '';

                                    return (
                                        <div
                                            key={i}
                                            className={`${styles.cell} ${cell && !isGhost ? styles.cellFilled : ''} ${isGhost ? styles.cellGhost : ''}`}
                                            style={cell && !isGhost ? {
                                                backgroundColor: color,
                                                boxShadow: `0 0 4px ${color}`,
                                            } : isGhost ? {
                                                borderColor: `${color}40`,
                                            } : {}}
                                        />
                                    );
                                })}
                            </div>

                            {/* Game over overlay */}
                            {gameOver && (
                                <div className={styles.gameOverOverlay}>
                                    <div className={`${styles.resultTitle} ${winnerId === playerId ? styles.resultWin : styles.resultLoss}`}>
                                        {winnerId === playerId ? 'VICTORY!' : gameEnded ? 'DEFEAT' : 'K.O.'}
                                    </div>
                                    {gameEnded && (
                                        <button className={styles.backBtn} onClick={onBackToLobby}>
                                            Back to Lobby
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right panel: Next */}
                        <div className={styles.sidePanel}>
                            <div className={styles.previewBox}>
                                <div className={styles.previewLabel}>NEXT</div>
                                {renderPreviewPiece(nextPieceType)}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsHUD}>
                        <div className={styles.stat}>
                            <div className={styles.statValue}>{score.toLocaleString()}</div>
                            <div className={styles.statLabel}>Score</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statValue}>{lines}</div>
                            <div className={styles.statLabel}>Lines</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statValue}>{level}</div>
                            <div className={styles.statLabel}>Level</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statValue}>{combo > 0 ? `${combo}x` : '-'}</div>
                            <div className={styles.statLabel}>Combo</div>
                        </div>
                    </div>
                </div>

                {/* ===== Opponent Section ===== */}
                <div className={styles.opponentSection}>
                    {opponents.map(opp => {
                        const state = opponentStates[opp.id];
                        if (!state) return null;

                        return (
                            <div key={opp.id} className={`${styles.opponentCard} ${state.dead ? styles.opponentDead : ''}`}>
                                <div className={styles.opponentName}>{opp.name}</div>

                                <div style={{ position: 'relative' }}>
                                    <div className={styles.opponentBoard}>
                                        {state.board.flat().map((cell, i) => (
                                            <div
                                                key={i}
                                                className={`${styles.opponentCell} ${cell ? styles.opponentCellFilled : ''}`}
                                                style={cell ? {
                                                    backgroundColor: (cell as BoardCell)?.color || '#666',
                                                } : {}}
                                            />
                                        ))}
                                    </div>

                                    {state.dead && (
                                        <div className={styles.opponentDeadOverlay}>K.O.</div>
                                    )}
                                </div>

                                <div className={styles.opponentStats}>
                                    <span>SCORE: <span className={styles.opponentStatValue}>{state.score.toLocaleString()}</span></span>
                                    <span>LINES: <span className={styles.opponentStatValue}>{state.lines}</span></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
