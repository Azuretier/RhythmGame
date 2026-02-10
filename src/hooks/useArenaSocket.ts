'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ArenaRoomState,
  ArenaGimmick,
  ArenaAction,
  ArenaRanking,
  ArenaSessionStats,
  ArenaBoardPayload,
} from '@/types/arena';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ArenaPhase =
  | 'lobby'
  | 'name-entry'
  | 'queue'
  | 'waiting-room'
  | 'countdown'
  | 'playing'
  | 'ended';

interface ArenaSessionResult {
  reason: 'last_standing' | 'tempo_collapse' | 'chaos_overload';
  winnerId: string | null;
  winnerName: string | null;
  rankings: ArenaRanking[];
  stats: ArenaSessionStats;
}

interface PlayerActionEvent {
  playerId: string;
  playerName: string;
  action: ArenaAction;
  onBeat: boolean;
}

interface TempoCollapseEvent {
  avgSync: number;
  bpmDeviation: number;
}

interface EliminationEvent {
  playerId: string;
  playerName: string;
  placement: number;
  eliminatedBy: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;

export function useArenaSocket() {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const playerIdRef = useRef<string>('');
  const reconnectTokenRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const pingCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arena state
  const [phase, setPhase] = useState<ArenaPhase>('lobby');
  const [arenaState, setArenaState] = useState<ArenaRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [gameSeed, setGameSeed] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [queueSize, setQueueSize] = useState<number>(0);

  // Tempo state
  const [bpm, setBpm] = useState(120);
  const [beatPhase, setBeatPhase] = useState(0);
  const serverTimeOffsetRef = useRef(0);

  // Chaos and gimmick state
  const [chaosLevel, setChaosLevel] = useState(0);
  const [activeGimmick, setActiveGimmick] = useState<ArenaGimmick | null>(null);
  const [syncMap, setSyncMap] = useState<Record<string, number>>({});

  // Events (for UI reactions)
  const [lastPlayerAction, setLastPlayerAction] = useState<PlayerActionEvent | null>(null);
  const [lastElimination, setLastElimination] = useState<EliminationEvent | null>(null);
  const [lastTempoCollapse, setLastTempoCollapse] = useState<TempoCollapseEvent | null>(null);
  const [sessionResult, setSessionResult] = useState<ArenaSessionResult | null>(null);

  // Opponent boards (relayed)
  const opponentBoardsRef = useRef<Map<string, ArenaBoardPayload>>(new Map());
  const [opponentBoards, setOpponentBoards] = useState<Map<string, ArenaBoardPayload>>(new Map());

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
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleServerMessage = useCallback((msg: any) => {
    const type = msg.type as string;
    switch (type) {
      // Standard multiplayer messages we still need
      case 'connected':
        playerIdRef.current = msg.playerId;
        serverTimeOffsetRef.current = Date.now() - msg.serverTime;
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

      // Arena-specific messages
      case 'arena_created':
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('arena_reconnectToken', msg.reconnectToken);
        break;

      case 'arena_joined': {
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('arena_reconnectToken', msg.reconnectToken);
        setArenaState(msg.arenaState);
        setPhase('waiting-room');
        setError(null);
        break;
      }

      case 'arena_state':
        setArenaState(msg.arenaState);
        break;

      case 'arena_player_joined':
        setArenaState(prev => {
          if (!prev) return prev;
          const p = msg.player;
          const exists = prev.players.some(x => x.id === p.id);
          return {
            ...prev,
            players: exists ? prev.players : [...prev.players, p],
          };
        });
        break;

      case 'arena_player_left':
        setArenaState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.filter(p => p.id !== msg.playerId),
          };
        });
        break;

      case 'arena_countdown':
        setCountdownNumber(msg.count);
        setPhase('countdown');
        break;

      case 'arena_started': {
        setGameSeed(msg.gameSeed);
        setBpm(msg.bpm);
        serverTimeOffsetRef.current = Date.now() - msg.serverTime;
        setCountdownNumber(null);
        setSessionResult(null);
        setPhase('playing');
        break;
      }

      case 'arena_tempo': {
        setBpm(msg.bpm);
        setBeatPhase(msg.beatPhase);
        serverTimeOffsetRef.current = Date.now() - msg.serverTime;
        break;
      }

      case 'arena_gimmick':
        setActiveGimmick(msg.gimmick);
        break;

      case 'arena_chaos': {
        setChaosLevel(msg.chaosLevel);
        setSyncMap(msg.syncMap);
        break;
      }

      case 'arena_player_action': {
        setLastPlayerAction(msg as PlayerActionEvent);
        break;
      }

      case 'arena_player_eliminated': {
        const elim = msg as EliminationEvent;
        setLastElimination(elim);

        setArenaState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === elim.playerId ? { ...p, alive: false, placement: elim.placement } : p
            ),
            aliveCount: prev.aliveCount - 1,
          };
        });
        break;
      }

      case 'arena_relayed': {
        opponentBoardsRef.current.set(msg.fromPlayerId, msg.payload);
        setOpponentBoards(new Map(opponentBoardsRef.current));
        break;
      }

      case 'arena_session_end': {
        setSessionResult(msg as ArenaSessionResult);
        setPhase('ended');
        break;
      }

      case 'arena_queued': {
        setQueuePosition(msg.position);
        setQueueSize(msg.queueSize);
        setPhase('queue');
        break;
      }

      case 'arena_tempo_collapse': {
        setLastTempoCollapse(msg as TempoCollapseEvent);
        break;
      }
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
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (err) {
        console.error('[ARENA WS] Parse error:', err);
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

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

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
    };
  }, [connectWebSocket]);

  // ===== Actions =====

  const queueForArena = useCallback((playerName: string) => {
    send({ type: 'queue_arena', playerName });
  }, [send]);

  const cancelQueue = useCallback(() => {
    send({ type: 'cancel_arena_queue' });
    setPhase('lobby');
  }, [send]);

  const createArena = useCallback((playerName: string, roomName?: string) => {
    send({ type: 'create_arena', playerName, roomName });
    setPhase('waiting-room');
  }, [send]);

  const joinArena = useCallback((arenaCode: string, playerName: string) => {
    send({ type: 'join_arena', arenaCode, playerName });
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'arena_ready', ready });
  }, [send]);

  const startArena = useCallback(() => {
    send({ type: 'arena_start' });
  }, [send]);

  const sendAction = useCallback((action: ArenaAction) => {
    send({ type: 'arena_action', action });
  }, [send]);

  const sendBoardRelay = useCallback((payload: ArenaBoardPayload) => {
    send({ type: 'arena_relay', payload });
  }, [send]);

  const leaveArena = useCallback(() => {
    send({ type: 'arena_leave' });
    reconnectTokenRef.current = '';
    sessionStorage.removeItem('arena_reconnectToken');
    setArenaState(null);
    setPhase('lobby');
    setError(null);
    opponentBoardsRef.current.clear();
    setOpponentBoards(new Map());
  }, [send]);

  return {
    // Connection
    connectionStatus,
    connectWebSocket,
    playerId: playerIdRef.current,

    // Arena state
    phase,
    setPhase,
    arenaState,
    error,
    setError,
    countdownNumber,
    gameSeed,
    queuePosition,
    queueSize,

    // Tempo
    bpm,
    beatPhase,

    // Chaos & gimmicks
    chaosLevel,
    activeGimmick,
    syncMap,

    // Events
    lastPlayerAction,
    lastElimination,
    lastTempoCollapse,
    sessionResult,

    // Opponent boards
    opponentBoards,

    // Actions
    queueForArena,
    cancelQueue,
    createArena,
    joinArena,
    setReady,
    startArena,
    sendAction,
    sendBoardRelay,
    leaveArena,
  };
}
