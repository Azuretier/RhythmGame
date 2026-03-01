'use client';

// =============================================================================
// Minecraft: Nintendo Switch Edition — Client WebSocket Hook
// Manages connection, room state, player position sync, block updates,
// chat, and game phase transitions.
// =============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  MSServerMessage,
  MSRoomState,
  MSPublicRoom,
  MSGamePhase,
  MSPlayer,
  GameMode,
  Difficulty,
  WorldType,
  BlockId,
  BlockFace,
  PlayerInventory,
  WeatherType,
  DayPhase,
  StatusEffectInstance,
  DamageSource,
} from '@/types/minecraft-switch';

// =============================================================================
// Configuration
// =============================================================================

const MULTIPLAYER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;
const PING_CHECK_INTERVAL = 10000;
const POSITION_SEND_INTERVAL = 100; // 10Hz throttle for position updates
const SESSION_STORAGE_KEY = 'mcs_reconnectToken';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface RemotePlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  sprinting: boolean;
  sneaking: boolean;
  health: number;
  hunger: number;
  armor: number;
  gameMode: GameMode;
}

interface BlockUpdate {
  x: number;
  y: number;
  z: number;
  blockId: BlockId;
}

interface ChatMessage {
  playerId?: string;
  playerName?: string;
  message: string;
  timestamp: number;
  system: boolean;
  color?: string;
}

interface DamageEvent {
  targetId: string;
  damage: number;
  source: DamageSource | string;
  attackerId?: string;
  newHealth: number;
}

interface DeathEvent {
  playerId: string;
  deathMessage: string;
  killerId?: string;
}

// =============================================================================
// Hook
// =============================================================================

export function useMinecraftSwitchSocket() {
  // =========================================================================
  // Connection State
  // =========================================================================

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTokenRef = useRef<string | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const phaseRef = useRef<MSGamePhase>('menu');
  const lastPositionSendRef = useRef<number>(0);

  // =========================================================================
  // Game State
  // =========================================================================

  const [phase, setPhaseRaw] = useState<MSGamePhase>('menu');
  const setPhase = useCallback((p: MSGamePhase) => { phaseRef.current = p; setPhaseRaw(p); }, []);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<MSRoomState | null>(null);
  const [publicRooms, setPublicRooms] = useState<MSPublicRoom[]>([]);
  const [countdownCount, setCountdownCount] = useState(0);
  const [gameSeed, setGameSeed] = useState<number>(0);
  const [worldType, setWorldType] = useState<WorldType>('default');
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // Multiplayer State
  // =========================================================================

  const remotePlayers = useRef<Map<string, RemotePlayer>>(new Map());
  const [remotePlayerList, setRemotePlayerList] = useState<RemotePlayer[]>([]);
  const [blockUpdates, setBlockUpdates] = useState<BlockUpdate[]>([]);
  const blockUpdateBuffer = useRef<BlockUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  // =========================================================================
  // Game World State
  // =========================================================================

  const [dayTime, setDayTime] = useState(1000);
  const [dayPhase, setDayPhase] = useState<DayPhase>('day');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [playerHealth, setPlayerHealth] = useState(20);
  const [playerHunger, setPlayerHunger] = useState(20);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerGameMode, setPlayerGameMode] = useState<GameMode>('survival');
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);

  // =========================================================================
  // Refs for stable closures (avoids stale closure in connectWebSocket)
  // =========================================================================

  const handleServerMessageRef = useRef<(msg: { type: string; [key: string]: unknown }) => void>(() => {});
  const attemptReconnectRef = useRef<() => void>(() => {});

  // =========================================================================
  // WebSocket Connection
  // =========================================================================

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

      // Attempt reconnection with stored token
      const token = reconnectTokenRef.current || sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (token) {
        ws.send(JSON.stringify({ type: 'reconnect', reconnectToken: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessageRef.current(msg);
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setConnectionStatus('disconnected');
      wsRef.current = null;
      attemptReconnectRef.current();
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  const attemptReconnect = useCallback(() => {
    const hasSession = reconnectTokenRef.current || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!hasSession) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
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

  // =========================================================================
  // Server Message Handler
  // =========================================================================

  const handleServerMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    // System messages
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
    if (msg.type === 'online_count' || msg.type === 'online_users') return;

    switch (msg.type) {
      // =====================================================================
      // Room Lifecycle
      // =====================================================================

      case 'ms_room_created': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_room_created' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem(SESSION_STORAGE_KEY, m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setRoomCode(m.roomCode);
        setPhase('lobby');
        break;
      }

      case 'ms_joined_room': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_joined_room' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem(SESSION_STORAGE_KEY, m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setRoomCode(m.roomCode);
        setRoomState(m.roomState);
        setPhase('lobby');
        break;
      }

      case 'ms_room_state': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_room_state' }>;
        setRoomState(m.roomState);
        break;
      }

      case 'ms_room_list': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_room_list' }>;
        setPublicRooms(m.rooms);
        break;
      }

      case 'ms_player_joined': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_joined' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: [...prev.players, m.player] };
        });
        break;
      }

      case 'ms_player_left': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_left' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return { ...prev, players: prev.players.filter(p => p.id !== m.playerId) };
        });
        remotePlayers.current.delete(m.playerId);
        setRemotePlayerList(Array.from(remotePlayers.current.values()));
        break;
      }

      case 'ms_player_ready': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_ready' }>;
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === m.playerId ? { ...p, ready: m.ready } : p,
            ),
          };
        });
        break;
      }

      // =====================================================================
      // Game Start
      // =====================================================================

      case 'ms_countdown': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_countdown' }>;
        if (phaseRef.current !== 'countdown') {
          // Entering countdown: clear state for fresh game
          remotePlayers.current.clear();
          setRemotePlayerList([]);
          setChatMessages([]);
          blockUpdateBuffer.current = [];
          setBlockUpdates([]);
        }
        setPhase('countdown');
        setCountdownCount(m.count);
        break;
      }

      case 'ms_game_started': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_game_started' }>;
        setGameSeed(m.seed);
        setWorldType(m.worldType);
        setPhase('loading');
        // Transition to 'playing' after client finishes loading
        // The client component should call setPhase('playing') when ready
        break;
      }

      // =====================================================================
      // Player Updates
      // =====================================================================

      case 'ms_player_position': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_position' }>;
        if (m.playerId !== playerIdRef.current) {
          const existing = remotePlayers.current.get(m.playerId);
          remotePlayers.current.set(m.playerId, {
            id: m.playerId,
            name: existing?.name || '',
            color: existing?.color || '#FFFFFF',
            x: m.x, y: m.y, z: m.z,
            yaw: m.yaw, pitch: m.pitch,
            onGround: m.onGround,
            sprinting: existing?.sprinting || false,
            sneaking: existing?.sneaking || false,
            health: existing?.health || 20,
            hunger: existing?.hunger || 20,
            armor: existing?.armor || 0,
            gameMode: existing?.gameMode || 'survival',
          });
          setRemotePlayerList(Array.from(remotePlayers.current.values()));
        }
        break;
      }

      case 'ms_player_state': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_state' }>;
        if (m.playerId === playerIdRef.current) {
          setPlayerHealth(m.health);
          setPlayerHunger(m.hunger);
          setPlayerArmor(m.armor);
          setPlayerGameMode(m.gameMode);
        } else {
          const existing = remotePlayers.current.get(m.playerId);
          if (existing) {
            existing.health = m.health;
            existing.hunger = m.hunger;
            existing.armor = m.armor;
            existing.gameMode = m.gameMode;
          }
        }
        break;
      }

      case 'ms_player_sprint': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_sprint' }>;
        const rp = remotePlayers.current.get(m.playerId);
        if (rp) rp.sprinting = m.sprinting;
        break;
      }

      case 'ms_player_sneak': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_sneak' }>;
        const rp = remotePlayers.current.get(m.playerId);
        if (rp) rp.sneaking = m.sneaking;
        break;
      }

      // =====================================================================
      // Block Updates
      // =====================================================================

      case 'ms_block_update': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_block_update' }>;
        blockUpdateBuffer.current.push({ x: m.x, y: m.y, z: m.z, blockId: m.blockId });
        // Flush buffer in batches to avoid excessive re-renders
        if (blockUpdateBuffer.current.length >= 10) {
          setBlockUpdates(prev => [...prev, ...blockUpdateBuffer.current]);
          blockUpdateBuffer.current = [];
        }
        break;
      }

      case 'ms_multi_block_update': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_multi_block_update' }>;
        setBlockUpdates(prev => [...prev, ...m.updates]);
        break;
      }

      case 'ms_block_broken': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_block_broken' }>;
        blockUpdateBuffer.current.push({ x: m.x, y: m.y, z: m.z, blockId: m.newBlockId });
        break;
      }

      case 'ms_block_placed': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_block_placed' }>;
        blockUpdateBuffer.current.push({ x: m.x, y: m.y, z: m.z, blockId: m.blockId });
        break;
      }

      // =====================================================================
      // Combat & Death
      // =====================================================================

      case 'ms_damage': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_damage' }>;
        if (m.targetId === playerIdRef.current) {
          setPlayerHealth(m.newHealth);
        }
        break;
      }

      case 'ms_player_died': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_died' }>;
        setChatMessages(prev => [
          ...prev.slice(-49),
          {
            message: m.deathMessage,
            timestamp: Date.now(),
            system: true,
            color: '#FF4444',
          },
        ]);
        break;
      }

      case 'ms_player_respawned': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_player_respawned' }>;
        if (m.playerId === playerIdRef.current) {
          setPlayerHealth(20);
          setPlayerHunger(20);
        }
        break;
      }

      // =====================================================================
      // World Events
      // =====================================================================

      case 'ms_time_update': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_time_update' }>;
        setDayTime(m.dayTime);
        break;
      }

      case 'ms_weather_change': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_weather_change' }>;
        setWeather(m.weather);
        break;
      }

      case 'ms_day_phase': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_day_phase' }>;
        setDayPhase(m.phase);
        break;
      }

      // =====================================================================
      // Inventory
      // =====================================================================

      case 'ms_inventory_update': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_inventory_update' }>;
        setInventory(m.inventory);
        break;
      }

      // =====================================================================
      // Status Effects
      // =====================================================================

      case 'ms_status_effect': {
        // Status effects handled by game component
        break;
      }

      // =====================================================================
      // Chat & System Messages
      // =====================================================================

      case 'ms_chat_message': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_chat_message' }>;
        setChatMessages(prev => [
          ...prev.slice(-49),
          {
            playerId: m.playerId,
            playerName: m.playerName,
            message: m.message,
            timestamp: Date.now(),
            system: false,
          },
        ]);
        break;
      }

      case 'ms_system_message': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_system_message' }>;
        setChatMessages(prev => [
          ...prev.slice(-49),
          {
            message: m.message,
            timestamp: Date.now(),
            system: true,
            color: m.color,
          },
        ]);
        break;
      }

      case 'ms_title': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_title' }>;
        setGameMessage(m.title);
        setTimeout(() => setGameMessage(null), (m.fadeIn + m.stay + m.fadeOut) * 50);
        break;
      }

      case 'ms_actionbar': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_actionbar' }>;
        setGameMessage(m.message);
        setTimeout(() => setGameMessage(null), 3000);
        break;
      }

      // =====================================================================
      // Reconnection
      // =====================================================================

      case 'ms_reconnected': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_reconnected' }>;
        reconnectTokenRef.current = m.reconnectToken;
        sessionStorage.setItem(SESSION_STORAGE_KEY, m.reconnectToken);
        playerIdRef.current = m.playerId;
        setPlayerId(m.playerId);
        setRoomCode(m.roomCode);
        setRoomState(m.roomState);
        setWorldType(m.roomState.worldType);
        if (m.roomState.status === 'playing') {
          setGameSeed(m.roomState.seed || 0);
          setPhase('playing');
        } else {
          setPhase('lobby');
        }
        break;
      }

      // =====================================================================
      // Error
      // =====================================================================

      case 'ms_error': {
        const m = msg as Extract<MSServerMessage, { type: 'ms_error' }>;
        if (m.code === 'RECONNECT_FAILED' || m.code === 'ROOM_GONE') {
          reconnectTokenRef.current = null;
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setPhase('menu');
          setRoomState(null);
        }
        setError(m.message);
        setGameMessage(m.message);
        setTimeout(() => {
          setError(null);
          setGameMessage(null);
        }, 3000);
        break;
      }

      default:
        break;
    }
  }, [send, setPhase]);

  // Keep refs in sync with latest callbacks
  useEffect(() => { handleServerMessageRef.current = handleServerMessage; }, [handleServerMessage]);
  useEffect(() => { attemptReconnectRef.current = attemptReconnect; }, [attemptReconnect]);

  // =========================================================================
  // Block Update Flush Timer
  // =========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (blockUpdateBuffer.current.length > 0) {
        setBlockUpdates(prev => [...prev, ...blockUpdateBuffer.current]);
        blockUpdateBuffer.current = [];
      }
    }, 100); // Flush every 100ms
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // Ping Timeout Check
  // =========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && Date.now() - lastPingRef.current > PING_TIMEOUT) {
        wsRef.current.close();
      }
    }, PING_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // Action Dispatchers
  // =========================================================================

  const createRoom = useCallback((
    playerName: string,
    roomName?: string,
    config?: { gameMode?: GameMode; difficulty?: Difficulty; worldType?: WorldType },
  ) => {
    send({
      type: 'ms_create_room',
      playerName,
      roomName,
      gameMode: config?.gameMode,
      difficulty: config?.difficulty,
      worldType: config?.worldType,
    });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    send({ type: 'ms_join_room', roomCode: roomCode.toUpperCase(), playerName });
  }, [send]);

  const refreshRooms = useCallback(() => {
    send({ type: 'ms_get_rooms' });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'ms_leave' });
    setPhase('menu');
    setRoomCode(null);
    setRoomState(null);
    remotePlayers.current.clear();
    setRemotePlayerList([]);
    blockUpdateBuffer.current = [];
    setBlockUpdates([]);
    setChatMessages([]);
    reconnectTokenRef.current = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [send, setPhase]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'ms_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'ms_start' });
  }, [send]);

  const sendPosition = useCallback((
    x: number, y: number, z: number,
    yaw: number, pitch: number,
    onGround: boolean,
  ) => {
    const now = Date.now();
    if (now - lastPositionSendRef.current < POSITION_SEND_INTERVAL) return;
    lastPositionSendRef.current = now;
    send({ type: 'ms_position', x, y, z, yaw, pitch, onGround });
  }, [send]);

  const sendBlockBreak = useCallback((x: number, y: number, z: number) => {
    send({ type: 'ms_break_block', x, y, z });
  }, [send]);

  const sendBlockPlace = useCallback((
    x: number, y: number, z: number,
    blockId: BlockId, face: BlockFace,
  ) => {
    send({ type: 'ms_place_block', x, y, z, blockId, face });
  }, [send]);

  const sendChat = useCallback((message: string) => {
    send({ type: 'ms_chat', message });
  }, [send]);

  const sendSprint = useCallback((sprinting: boolean) => {
    send({ type: 'ms_sprint', sprinting });
  }, [send]);

  const sendSneak = useCallback((sneaking: boolean) => {
    send({ type: 'ms_sneak', sneaking });
  }, [send]);

  const sendSelectSlot = useCallback((slot: number) => {
    send({ type: 'ms_select_slot', slot });
  }, [send]);

  const changeGameMode = useCallback((gameMode: GameMode) => {
    send({ type: 'ms_change_gamemode', gameMode });
  }, [send]);

  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    send({ type: 'ms_change_difficulty', difficulty });
  }, [send]);

  /**
   * Clears consumed block updates. The game component should call this
   * after applying updates to the world mesh.
   */
  const clearBlockUpdates = useCallback(() => {
    setBlockUpdates([]);
  }, []);

  /**
   * Transition to 'playing' phase after loading screen finishes.
   */
  const finishLoading = useCallback(() => {
    setPhase('playing');
  }, [setPhase]);

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Connection
    connectionStatus,
    playerId,
    connectWebSocket,
    disconnect,

    // Game phase
    phase,
    setPhase,
    roomCode,
    roomState,
    publicRooms,
    countdownCount,
    gameSeed,
    worldType,
    error,

    // Multiplayer
    remotePlayers,
    remotePlayerList,
    blockUpdates,
    clearBlockUpdates,
    chatMessages,
    gameMessage,

    // World state
    dayTime,
    dayPhase,
    weather,

    // Player state
    playerHealth,
    playerHunger,
    playerArmor,
    playerGameMode,
    inventory,

    // Actions: Room
    createRoom,
    joinRoom,
    refreshRooms,
    leaveRoom,
    setReady,
    startGame,
    finishLoading,

    // Actions: In-Game
    sendPosition,
    sendBlockBreak,
    sendBlockPlace,
    sendChat,
    sendSprint,
    sendSneak,
    sendSelectSlot,

    // Actions: Settings
    changeGameMode,
    changeDifficulty,
  };
}
