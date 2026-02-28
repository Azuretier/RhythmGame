'use client';

// Minecraft World - Client WebSocket Hook
// Manages connection, room state, and player position sync

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  MWServerMessage, MWRoomState, MWPublicRoom,
  MWGamePhase, MWPlayerPosition,
} from '@/types/minecraft-world';
import {
  saveRoom, listOpenRooms, updateRoomStatus, deleteRoom, cleanupStaleRooms,
} from '@/lib/minecraft-world/firebase';
import type { MWFirestoreRoom } from '@/types/minecraft-world';

const MULTIPLAYER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;
const PING_CHECK_INTERVAL = 10000;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export function useMinecraftWorldSocket() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTokenRef = useRef<string | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const phaseRef = useRef<MWGamePhase>('menu');

  // Game state
  const [phase, setPhaseRaw] = useState<MWGamePhase>('menu');
  const setPhase = useCallback((p: MWGamePhase) => { phaseRef.current = p; setPhaseRaw(p); }, []);
  const [roomState, setRoomState] = useState<MWRoomState | null>(null);
  const [publicRooms, setPublicRooms] = useState<MWPublicRoom[]>([]);
  const [firestoreRooms, setFirestoreRooms] = useState<MWFirestoreRoom[]>([]);
  const [countdownCount, setCountdownCount] = useState(0);
  const [gameSeed, setGameSeed] = useState<number>(0);

  // Multiplayer state
  const remotePlayers = useRef<Map<string, MWPlayerPosition>>(new Map());
  const [remotePlayerList, setRemotePlayerList] = useState<MWPlayerPosition[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  // === WebSocket Connection ===

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(MULTIPLAYER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) { ws.close(); return; }
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      lastPingRef.current = Date.now();

      const token = reconnectTokenRef.current || sessionStorage.getItem('mw_reconnectToken');
      if (token) {
        ws.send(JSON.stringify({ type: 'reconnect', reconnectToken: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setConnectionStatus('disconnected');
      wsRef.current = null;
      attemptReconnect();
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  const attemptReconnect = useCallback(() => {
    const hasSession = reconnectTokenRef.current || sessionStorage.getItem('mw_reconnectToken');
    if (!hasSession) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 15000);
    setConnectionStatus('reconnecting');
    setTimeout(connectWebSocket, delay);
  }, [connectWebSocket]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // === Server Message Handler ===

  const handleServerMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    // Handle common multiplayer messages
    if (msg.type === 'ping') {
      lastPingRef.current = Date.now();
      send({ type: 'pong' });
      return;
    }
    if (msg.type === 'connected') {
      playerIdRef.current = (msg as unknown as { playerId: string }).playerId;
      setPlayerId((msg as unknown as { playerId: string }).playerId);
      return;
    }
    if (msg.type === 'online_count') return;

    switch (msg.type) {
      case 'mw_room_created': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_room_created' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem('mw_reconnectToken', m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setPhase('lobby');
        break;
      }

      case 'mw_joined_room': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_joined_room' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem('mw_reconnectToken', m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setRoomState(m.roomState);
        setPhase('lobby');
        break;
      }

      case 'mw_room_state': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_room_state' }>;
        setRoomState(m.roomState);
        break;
      }

      case 'mw_room_list': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_room_list' }>;
        setPublicRooms(m.rooms);
        break;
      }

      case 'mw_player_joined': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_player_joined' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: [...prev.players, m.player] };
        });
        break;
      }

      case 'mw_player_left': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_player_left' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: prev.players.filter(p => p.id !== m.playerId) };
        });
        remotePlayers.current.delete(m.playerId);
        setRemotePlayerList(Array.from(remotePlayers.current.values()));
        break;
      }

      case 'mw_player_ready': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_player_ready' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === m.playerId ? { ...p, ready: m.ready } : p
            ),
          };
        });
        break;
      }

      case 'mw_countdown': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_countdown' }>;
        if (phaseRef.current !== 'countdown') {
          remotePlayers.current.clear();
          setRemotePlayerList([]);
          setChatMessages([]);
        }
        setPhase('countdown');
        setCountdownCount(m.count);
        break;
      }

      case 'mw_game_started': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_game_started' }>;
        setGameSeed(m.seed);
        setPhase('playing');
        break;
      }

      case 'mw_player_position': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_player_position' }>;
        if (m.player.id !== playerIdRef.current) {
          remotePlayers.current.set(m.player.id, m.player);
          // Throttle React updates to avoid excessive re-renders
          // (position updates come at 10Hz per player)
          setRemotePlayerList(Array.from(remotePlayers.current.values()));
        }
        break;
      }

      case 'mw_chat_message': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_chat_message' }>;
        setChatMessages(prev => [
          ...prev.slice(-49),
          { playerId: m.playerId, playerName: m.playerName, message: m.message, timestamp: Date.now() },
        ]);
        break;
      }

      case 'mw_reconnected': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_reconnected' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem('mw_reconnectToken', m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setRoomState(m.roomState);
        if (m.roomState.status === 'playing') {
          setGameSeed(m.roomState.seed || 0);
          setPhase('playing');
        } else {
          setPhase('lobby');
        }
        break;
      }

      case 'mw_error': {
        const m = msg as Extract<MWServerMessage, { type: 'mw_error' }>;
        if (m.code === 'RECONNECT_FAILED' || m.code === 'ROOM_GONE') {
          reconnectTokenRef.current = null;
          sessionStorage.removeItem('mw_reconnectToken');
          setPhase('menu');
          setRoomState(null);
        }
        setGameMessage(m.message);
        setTimeout(() => setGameMessage(null), 3000);
        break;
      }

      default:
        break;
    }
  }, [send, setPhase]);

  // === Ping timeout check ===

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && Date.now() - lastPingRef.current > PING_TIMEOUT) {
        wsRef.current.close();
      }
    }, PING_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // === Firestore Room Operations ===

  const refreshFirestoreRooms = useCallback(async () => {
    try {
      const rooms = await listOpenRooms();
      setFirestoreRooms(rooms);
    } catch {
      // Firestore may not be configured
    }
  }, []);

  const saveRoomToFirestore = useCallback(async (code: string, name: string, hostName: string) => {
    try {
      await saveRoom({
        code,
        name,
        hostName,
        status: 'open',
        playerCount: 1,
        maxPlayers: 9,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch {
      // Firestore may not be configured
    }
  }, []);

  // === Action Dispatchers ===

  const createRoom = useCallback((playerName: string, roomName?: string) => {
    send({ type: 'mw_create_room', playerName, roomName });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    send({ type: 'mw_join_room', roomCode: roomCode.toUpperCase(), playerName });
  }, [send]);

  const getRooms = useCallback(() => {
    send({ type: 'mw_get_rooms' });
    refreshFirestoreRooms();
  }, [send, refreshFirestoreRooms]);

  const leaveRoom = useCallback(() => {
    send({ type: 'mw_leave' });
    setPhase('menu');
    setRoomState(null);
    remotePlayers.current.clear();
    setRemotePlayerList([]);
    reconnectTokenRef.current = null;
    sessionStorage.removeItem('mw_reconnectToken');
  }, [send, setPhase]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'mw_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'mw_start' });
  }, [send]);

  const sendPosition = useCallback((x: number, y: number, z: number, rx: number, ry: number) => {
    send({ type: 'mw_position', x, y, z, rx, ry });
  }, [send]);

  const sendChat = useCallback((message: string) => {
    send({ type: 'mw_chat', message });
  }, [send]);

  return {
    // Connection
    connectionStatus,
    playerId,
    connectWebSocket,
    disconnect,

    // Game phase
    phase, setPhase,
    roomState,
    publicRooms,
    firestoreRooms,
    countdownCount,
    gameSeed,

    // Multiplayer
    remotePlayers,
    remotePlayerList,
    chatMessages,
    gameMessage,

    // Firestore
    refreshFirestoreRooms,
    saveRoomToFirestore,

    // Actions
    createRoom,
    joinRoom,
    getRooms,
    leaveRoom,
    setReady,
    startGame,
    sendPosition,
    sendChat,
  };
}
