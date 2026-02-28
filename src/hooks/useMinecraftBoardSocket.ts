'use client';

// =============================================================
// Minecraft Board Game - Client WebSocket Hook
// =============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  MCServerMessage, MCGameStateUpdate, MCRoomState, MCLobbyPlayer,
  MCPublicRoom, MCGamePhase, Direction, MCTileUpdate, WorldTile,
  MCVisiblePlayer, MCMobState, MCPlayerState, DayPhase, ItemType,
  SideBoardVisibleState, AnomalyAlert,
} from '@/types/minecraft-board';
import { BLOCK_PROPERTIES, MC_BOARD_CONFIG } from '@/types/minecraft-board';

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

export function useMinecraftBoardSocket() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTokenRef = useRef<string | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const phaseRef = useRef<MCGamePhase>('menu');

  // Game state
  const [phase, setPhaseRaw] = useState<MCGamePhase>('menu');
  const setPhase = useCallback((p: MCGamePhase) => { phaseRef.current = p; setPhaseRaw(p); }, []);
  const [roomState, setRoomState] = useState<MCRoomState | null>(null);
  const [publicRooms, setPublicRooms] = useState<MCPublicRoom[]>([]);
  const [countdownCount, setCountdownCount] = useState(0);

  // World state
  const exploredTilesRef = useRef<Map<string, WorldTile>>(new Map());
  const [visibleTiles, setVisibleTiles] = useState<MCTileUpdate[]>([]);
  const [visiblePlayers, setVisiblePlayers] = useState<MCVisiblePlayer[]>([]);
  const [visibleMobs, setVisibleMobs] = useState<MCMobState[]>([]);
  const [selfState, setSelfState] = useState<MCPlayerState | null>(null);
  const [dayPhase, setDayPhase] = useState<DayPhase>('day');
  const [timeOfDay, setTimeOfDay] = useState(0);

  // UI state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);

  // Side board & anomaly state
  const [leftSideBoard, setLeftSideBoard] = useState<SideBoardVisibleState | null>(null);
  const [rightSideBoard, setRightSideBoard] = useState<SideBoardVisibleState | null>(null);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);

  // === WebSocket Connection ===

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(MULTIPLAYER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Ignore if a newer WebSocket has replaced this one
      if (wsRef.current !== ws) { ws.close(); return; }

      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      lastPingRef.current = Date.now();

      // Try reconnect with token if we were in a room
      const token = reconnectTokenRef.current || sessionStorage.getItem('mc_reconnectToken');
      if (token) {
        ws.send(JSON.stringify({ type: 'reconnect', reconnectToken: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as MCServerMessage | { type: string; [key: string]: unknown };
        handleServerMessage(msg as MCServerMessage);
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      // Ignore if a newer WebSocket has replaced this one
      if (wsRef.current !== ws) return;
      setConnectionStatus('disconnected');
      wsRef.current = null;
      attemptReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const attemptReconnect = useCallback(() => {
    // Only auto-reconnect if we were in a room (have a session token)
    const hasSession = reconnectTokenRef.current || sessionStorage.getItem('mc_reconnectToken');
    if (!hasSession) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 15000);
    setConnectionStatus('reconnecting');
    setTimeout(connectWebSocket, delay);
  }, [connectWebSocket]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // === Message Sender ===

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // === Server Message Handler ===

  const handleServerMessage = useCallback((msg: MCServerMessage) => {
    // Handle common messages
    if ('type' in msg && (msg as { type: string }).type === 'ping') {
      lastPingRef.current = Date.now();
      send({ type: 'pong' });
      return;
    }
    if ('type' in msg && (msg as { type: string }).type === 'connected') {
      const connMsg = msg as unknown as { playerId: string };
      playerIdRef.current = connMsg.playerId;
      setPlayerId(connMsg.playerId);
      return;
    }
    if ('type' in msg && (msg as { type: string }).type === 'online_count') return;

    switch (msg.type) {
      case 'mc_room_created': {
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('mc_reconnectToken', msg.reconnectToken);
        playerIdRef.current = msg.playerId;
        setPlayerId(msg.playerId);
        setPhase('lobby');
        break;
      }

      case 'mc_joined_room': {
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('mc_reconnectToken', msg.reconnectToken);
        playerIdRef.current = msg.playerId;
        setPlayerId(msg.playerId);
        setRoomState(msg.roomState);
        setPhase('lobby');
        break;
      }

      case 'mc_room_state': {
        setRoomState(msg.roomState);
        break;
      }

      case 'mc_room_list': {
        setPublicRooms(msg.rooms);
        break;
      }

      case 'mc_player_joined': {
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: [...prev.players, msg.player] };
        });
        break;
      }

      case 'mc_player_left': {
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: prev.players.filter(p => p.id !== msg.playerId) };
        });
        break;
      }

      case 'mc_player_ready': {
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
      }

      case 'mc_countdown': {
        if (phaseRef.current !== 'countdown') {
          // First countdown message — reset game state for new game
          exploredTilesRef.current = new Map();
          setSelfState(null);
          setChatMessages([]);
          setWinner(null);
        }
        setPhase('countdown');
        setCountdownCount(msg.count);
        break;
      }

      case 'mc_game_started': {
        setPhase('playing');
        break;
      }

      case 'mc_state_update': {
        const state = msg.state;
        // Update explored tiles cache
        for (const tu of state.visibleTiles) {
          exploredTilesRef.current.set(`${tu.x},${tu.y}`, tu.tile);
        }
        setVisibleTiles(state.visibleTiles);
        setVisiblePlayers(state.players);
        setVisibleMobs(state.mobs);
        setSelfState(state.self);
        setDayPhase(state.dayPhase);
        setTimeOfDay(state.timeOfDay);
        if (state.gameMessage) {
          setGameMessage(state.gameMessage);
          setTimeout(() => setGameMessage(null), 3000);
        }
        // Side board updates
        if (state.sideBoards) {
          const left = state.sideBoards.find(sb => sb.side === 'left');
          const right = state.sideBoards.find(sb => sb.side === 'right');
          if (left) setLeftSideBoard(left);
          if (right) setRightSideBoard(right);
        }
        if (state.anomalyAlerts) {
          setAnomalyAlerts(state.anomalyAlerts);
        } else {
          setAnomalyAlerts([]);
        }
        break;
      }

      case 'mc_player_moved': {
        setVisiblePlayers(prev =>
          prev.map(p => p.id === msg.playerId ? { ...p, x: msg.x, y: msg.y } : p)
        );
        break;
      }

      case 'mc_tile_mined': {
        // Update explored tiles cache
        const key = `${msg.x},${msg.y}`;
        const existing = exploredTilesRef.current.get(key);
        if (existing) {
          exploredTilesRef.current.set(key, { ...existing, block: msg.newBlock });
        }
        break;
      }

      case 'mc_block_placed': {
        const key = `${msg.x},${msg.y}`;
        const existing = exploredTilesRef.current.get(key);
        if (existing) {
          exploredTilesRef.current.set(key, { ...existing, block: msg.block });
        }
        break;
      }

      case 'mc_item_gained': {
        setGameMessage(`+${msg.quantity} ${msg.item.replace(/_/g, ' ')}`);
        setTimeout(() => setGameMessage(null), 2000);
        break;
      }

      case 'mc_damage': {
        // Could add damage flash effect
        break;
      }

      case 'mc_player_died': {
        if (msg.playerId === playerIdRef.current) {
          setGameMessage('You died! Respawning...');
          setTimeout(() => setGameMessage(null), 3000);
        }
        break;
      }

      case 'mc_crafted': {
        if (msg.playerId === playerIdRef.current) {
          setGameMessage(`Crafted ${msg.item.replace(/_/g, ' ')}!`);
          setTimeout(() => setGameMessage(null), 2000);
        }
        break;
      }

      case 'mc_chat_message': {
        setChatMessages(prev => [
          ...prev.slice(-49), // Keep last 50 messages
          { playerId: msg.playerId, playerName: msg.playerName, message: msg.message, timestamp: Date.now() },
        ]);
        break;
      }

      case 'mc_day_phase': {
        setDayPhase(msg.phase);
        const phaseNames: Record<string, string> = { day: 'Day', dusk: 'Dusk', night: 'Night', dawn: 'Dawn' };
        setGameMessage(phaseNames[msg.phase] || '');
        setTimeout(() => setGameMessage(null), 2000);
        break;
      }

      case 'mc_game_over': {
        setPhase('ended');
        setWinner({ id: msg.winnerId, name: msg.winnerName });
        break;
      }

      case 'mc_reconnected' as MCServerMessage['type']: {
        const rcMsg = msg as unknown as { roomCode: string; playerId: string; roomState: MCRoomState; reconnectToken: string; status?: string };
        reconnectTokenRef.current = rcMsg.reconnectToken;
        sessionStorage.setItem('mc_reconnectToken', rcMsg.reconnectToken);
        playerIdRef.current = rcMsg.playerId;
        setPlayerId(rcMsg.playerId);
        setRoomState(rcMsg.roomState);
        if (rcMsg.status === 'playing') {
          setPhase('playing');
        } else {
          setPhase('lobby');
        }
        break;
      }

      case 'mc_error': {
        const errorCode = (msg as unknown as { code?: string }).code;
        if (errorCode === 'RECONNECT_FAILED' || errorCode === 'ROOM_GONE') {
          // Stale reconnect token — clear it and reset to menu
          reconnectTokenRef.current = null;
          sessionStorage.removeItem('mc_reconnectToken');
          setPhase('menu');
          setRoomState(null);
        }
        setGameMessage(msg.message);
        setTimeout(() => setGameMessage(null), 3000);
        break;
      }

      default:
        break;
    }
  }, [send]);

  // === Ping timeout check ===

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && Date.now() - lastPingRef.current > PING_TIMEOUT) {
        wsRef.current.close();
      }
    }, PING_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // === Action Dispatchers ===

  const createRoom = useCallback((playerName: string, roomName?: string) => {
    send({ type: 'mc_create_room', playerName, roomName });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    send({ type: 'mc_join_room', roomCode: roomCode.toUpperCase(), playerName });
  }, [send]);

  const getRooms = useCallback(() => {
    send({ type: 'mc_get_rooms' });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'mc_leave' });
    setPhase('menu');
    setRoomState(null);
    reconnectTokenRef.current = null;
    sessionStorage.removeItem('mc_reconnectToken');
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'mc_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'mc_start' });
  }, [send]);

  const move = useCallback((direction: Direction) => {
    send({ type: 'mc_move', direction });

    // Client-side prediction: optimistically update local position
    setSelfState(prev => {
      if (!prev || prev.dead) return prev;
      const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      const nx = prev.x + dx;
      const ny = prev.y + dy;
      // Bounds check
      if (nx < 0 || nx >= MC_BOARD_CONFIG.WORLD_SIZE || ny < 0 || ny >= MC_BOARD_CONFIG.WORLD_SIZE) return prev;
      // Walkability check using explored tiles
      const tile = exploredTilesRef.current.get(`${nx},${ny}`);
      if (tile) {
        const blockProps = BLOCK_PROPERTIES[tile.block];
        if (blockProps && !blockProps.walkable && blockProps.solid) return prev;
      }
      return { ...prev, x: nx, y: ny };
    });
    // Also update self in visible players for 3D renderer
    const pid = playerIdRef.current;
    if (pid) {
      setVisiblePlayers(prev => {
        const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
        const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
        return prev.map(p => {
          if (p.id !== pid) return p;
          const nx = p.x + dx;
          const ny = p.y + dy;
          if (nx < 0 || nx >= MC_BOARD_CONFIG.WORLD_SIZE || ny < 0 || ny >= MC_BOARD_CONFIG.WORLD_SIZE) return p;
          const tile = exploredTilesRef.current.get(`${nx},${ny}`);
          if (tile) {
            const blockProps = BLOCK_PROPERTIES[tile.block];
            if (blockProps && !blockProps.walkable && blockProps.solid) return p;
          }
          return { ...p, x: nx, y: ny };
        });
      });
    }
  }, [send]);

  const mine = useCallback((x: number, y: number) => {
    send({ type: 'mc_mine', x, y });
  }, [send]);

  const cancelMine = useCallback(() => {
    send({ type: 'mc_cancel_mine' });
  }, [send]);

  const craft = useCallback((recipeId: string) => {
    send({ type: 'mc_craft', recipeId });
  }, [send]);

  const attack = useCallback((targetId: string) => {
    send({ type: 'mc_attack', targetId });
  }, [send]);

  const placeBlock = useCallback((x: number, y: number, itemIndex: number) => {
    send({ type: 'mc_place_block', x, y, itemIndex });
  }, [send]);

  const eat = useCallback((itemIndex: number) => {
    send({ type: 'mc_eat', itemIndex });
  }, [send]);

  const selectSlot = useCallback((slot: number) => {
    send({ type: 'mc_select_slot', slot });
  }, [send]);

  const sendChat = useCallback((message: string) => {
    send({ type: 'mc_chat', message });
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
    countdownCount,

    // World state
    exploredTilesRef,
    visibleTiles,
    visiblePlayers,
    visibleMobs,
    selfState,
    dayPhase,
    timeOfDay,

    // UI state
    chatMessages,
    gameMessage,
    winner,

    // Side board & anomaly
    leftSideBoard,
    rightSideBoard,
    anomalyAlerts,

    // Actions
    createRoom,
    joinRoom,
    getRooms,
    leaveRoom,
    setReady,
    startGame,
    move,
    mine,
    cancelMine,
    craft,
    attack,
    placeBlock,
    eat,
    selectSlot,
    sendChat,
  };
}
