'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  PuzzleRoomState,
  PuzzleGameState,
  PuzzlePlayerState,
  PuzzlePublicRoom,
  PuzzleDifficulty,
  PuzzleCard,
} from '@/types/puzzle';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type PuzzlePhase =
  | 'menu'
  | 'lobby'
  | 'countdown'
  | 'playing'
  | 'ended';

interface PuzzleGameOver {
  winnerId: string | null;
  players: PuzzlePlayerState[];
  isDraw: boolean;
}

interface MatchEvent {
  cardId1: number;
  cardId2: number;
  playerId: string;
  score: number;
  combo: number;
}

interface MatchFailedEvent {
  cardId1: number;
  cardId2: number;
  playerId: string;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;

export function usePuzzleSocket() {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const playerIdRef = useRef<string>('');
  const reconnectTokenRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const pingCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMessagesRef = useRef<object[]>([]);

  // Game state
  const [phase, setPhase] = useState<PuzzlePhase>('menu');
  const [roomState, setRoomState] = useState<PuzzleRoomState | null>(null);
  const [gameState, setGameState] = useState<PuzzleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [publicRooms, setPublicRooms] = useState<PuzzlePublicRoom[]>([]);
  const [gameOverResult, setGameOverResult] = useState<PuzzleGameOver | null>(null);

  // Events
  const [lastMatch, setLastMatch] = useState<MatchEvent | null>(null);
  const [lastMatchFailed, setLastMatchFailed] = useState<MatchFailedEvent | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('');

  // ===== WebSocket Connection =====
  const connectWebSocketRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('Connection lost. Please rejoin manually.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
    reconnectAttemptsRef.current++;
    setConnectionStatus('connecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectWebSocketRef.current();
    }, delay);
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      pendingMessagesRef.current.push(data);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleServerMessage = useCallback((msg: any) => {
    const type = msg.type as string;
    switch (type) {
      case 'connected':
        playerIdRef.current = msg.playerId;
        break;

      case 'ping':
        lastPingRef.current = Date.now();
        send({ type: 'pong' });
        break;

      case 'error':
        setError(msg.message);
        break;

      case 'server_shutdown':
        setError('Server is restarting. Reconnecting...');
        setConnectionStatus('disconnected');
        break;

      // Puzzle messages
      case 'puzzle_room_created':
        reconnectTokenRef.current = msg.reconnectToken;
        playerIdRef.current = msg.playerId;
        setPhase('lobby');
        setError(null);
        break;

      case 'puzzle_joined_room':
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        setRoomState(msg.roomState);
        setPhase('lobby');
        setError(null);
        break;

      case 'puzzle_room_state':
        setRoomState(msg.roomState);
        break;

      case 'puzzle_room_list':
        setPublicRooms(msg.rooms);
        break;

      case 'puzzle_player_joined':
        setRoomState(prev => {
          if (!prev) return prev;
          const exists = prev.players.some(p => p.id === msg.player.id);
          return {
            ...prev,
            players: exists ? prev.players : [...prev.players, msg.player],
          };
        });
        break;

      case 'puzzle_player_left':
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.filter(p => p.id !== msg.playerId),
          };
        });
        break;

      case 'puzzle_player_ready':
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === msg.playerId ? { ...p, ready: msg.ready } : p
            ),
          };
        });
        break;

      case 'puzzle_countdown':
        setCountdownNumber(msg.count);
        setPhase('countdown');
        break;

      case 'puzzle_game_started':
        setGameState(msg.gameState);
        setCurrentTurnPlayerId(msg.gameState.currentTurnPlayerId);
        setCountdownNumber(null);
        setGameOverResult(null);
        setPhase('playing');
        break;

      case 'puzzle_card_flipped':
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map(c =>
              c.id === msg.cardId ? { ...c, faceUp: true, symbolIndex: msg.symbolIndex } : c
            ),
            flippedCardIds: [...prev.flippedCardIds, msg.cardId],
          };
        });
        break;

      case 'puzzle_match_found': {
        setLastMatch({
          cardId1: msg.cardId1,
          cardId2: msg.cardId2,
          playerId: msg.playerId,
          score: msg.score,
          combo: msg.combo,
        });
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map(c =>
              c.id === msg.cardId1 || c.id === msg.cardId2
                ? { ...c, matchedBy: msg.playerId, faceUp: true }
                : c
            ),
            flippedCardIds: [],
            matchedPairs: prev.matchedPairs + 1,
            players: prev.players.map(p =>
              p.id === msg.playerId
                ? { ...p, score: p.score + msg.score, pairs: p.pairs + 1, consecutiveMatches: msg.combo }
                : p
            ),
          };
        });
        break;
      }

      case 'puzzle_match_failed':
        setLastMatchFailed({
          cardId1: msg.cardId1,
          cardId2: msg.cardId2,
          playerId: msg.playerId,
        });
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map(c =>
              c.id === msg.cardId1 || c.id === msg.cardId2
                ? { ...c, faceUp: false }
                : c
            ),
            flippedCardIds: [],
            players: prev.players.map(p =>
              p.id === msg.playerId ? { ...p, consecutiveMatches: 0 } : p
            ),
          };
        });
        break;

      case 'puzzle_turn_change':
        setCurrentTurnPlayerId(msg.playerId);
        setGameState(prev => {
          if (!prev) return prev;
          return { ...prev, currentTurnPlayerId: msg.playerId };
        });
        break;

      case 'puzzle_game_over':
        setGameOverResult({
          winnerId: msg.winnerId,
          players: msg.players,
          isDraw: msg.isDraw,
        });
        setPhase('ended');
        break;

      case 'puzzle_error':
        setError(msg.message);
        break;
    }
  }, [send]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionStatus('connecting');
    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
      lastPingRef.current = Date.now();

      const pending = pendingMessagesRef.current;
      pendingMessagesRef.current = [];
      for (const msg of pending) {
        try {
          ws.send(JSON.stringify(msg));
        } catch {
          // Connection may have closed
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (err) {
        console.error('[PUZZLE WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      if (reconnectTokenRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };

    wsRef.current = ws;
  }, [scheduleReconnect, handleServerMessage]);

  connectWebSocketRef.current = connectWebSocket;

  // Ping timeout check and cleanup
  useEffect(() => {
    pingCheckTimerRef.current = setInterval(() => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        Date.now() - lastPingRef.current > PING_TIMEOUT
      ) {
        wsRef.current.close();
      }
    }, 10000);

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pingCheckTimerRef.current) {
        clearInterval(pingCheckTimerRef.current);
        pingCheckTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      pendingMessagesRef.current = [];
    };
  }, []);

  // ===== Actions =====

  const createRoom = useCallback((playerName: string, roomName?: string, difficulty?: PuzzleDifficulty) => {
    send({ type: 'puzzle_create_room', playerName, roomName, difficulty });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    send({ type: 'puzzle_join_room', roomCode, playerName });
  }, [send]);

  const getRooms = useCallback(() => {
    send({ type: 'puzzle_get_rooms' });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'puzzle_leave' });
    reconnectTokenRef.current = '';
    setRoomState(null);
    setGameState(null);
    setPhase('menu');
    setError(null);
    setGameOverResult(null);
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'puzzle_ready', ready });
  }, [send]);

  const setDifficulty = useCallback((difficulty: PuzzleDifficulty) => {
    send({ type: 'puzzle_set_difficulty', difficulty });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'puzzle_start' });
  }, [send]);

  const flipCard = useCallback((cardId: number) => {
    send({ type: 'puzzle_flip_card', cardId });
  }, [send]);

  return {
    // Connection
    connectionStatus,
    connectWebSocket,
    playerId: playerIdRef.current,

    // State
    phase,
    setPhase,
    roomState,
    gameState,
    error,
    setError,
    countdownNumber,
    publicRooms,
    gameOverResult,

    // Events
    lastMatch,
    lastMatchFailed,
    currentTurnPlayerId,

    // Actions
    createRoom,
    joinRoom,
    getRooms,
    leaveRoom,
    setReady,
    setDifficulty,
    startGame,
    flipCard,
  };
}
