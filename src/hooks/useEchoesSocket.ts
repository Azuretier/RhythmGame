'use client';

// =============================================================
// Echoes of Eternity — WebSocket Multiplayer Hook
// Follows the same pattern as useArenaSocket.ts
// =============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  EchoesLobbyState,
  EchoesLobbyPlayer,
  GameMode,
  CombatState,
  CombatAction,
  HitAccuracy,
  RhythmNote,
  ElementalReaction,
  CombatReward,
  CombatEnemy,
  ExplorationState,
  WorldTileEchoes,
  ResourceType,
  PointOfInterest,
  GachaPull,
  BattleRoyaleState,
  EchoesRankedTier,
} from '@/types/echoes';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type EchoesPhase =
  | 'menu'
  | 'lobby'
  | 'queue'
  | 'waiting-room'
  | 'ban-pick'
  | 'countdown'
  | 'playing'
  | 'combat'
  | 'exploration'
  | 'results'
  | 'ended';

interface RhythmPhaseData {
  bpm: number;
  beatPhase: number;
  notes: RhythmNote[];
}

interface RhythmResultData {
  playerId: string;
  accuracy: HitAccuracy;
  combo: number;
  score: number;
}

interface ReactionEvent {
  reaction: ElementalReaction;
  damage: number;
  source: string;
}

interface DamageEvent {
  sourceId: string;
  targetId: string;
  damage: number;
  isCrit: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;

export function useEchoesSocket() {
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
  const [phase, setPhase] = useState<EchoesPhase>('menu');
  const [lobbyState, setLobbyState] = useState<EchoesLobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [gameSeed, setGameSeed] = useState<number>(0);
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);

  // Combat state
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [rhythmPhase, setRhythmPhase] = useState<RhythmPhaseData | null>(null);
  const [lastRhythmResult, setLastRhythmResult] = useState<RhythmResultData | null>(null);
  const [lastReaction, setLastReaction] = useState<ReactionEvent | null>(null);
  const [lastDamage, setLastDamage] = useState<DamageEvent | null>(null);
  const [combatReward, setCombatReward] = useState<CombatReward | null>(null);
  const [enemies, setEnemies] = useState<CombatEnemy[]>([]);

  // Exploration state
  const [explorationState, setExplorationState] = useState<ExplorationState | null>(null);
  const [visibleTiles, setVisibleTiles] = useState<WorldTileEchoes[]>([]);
  const [lastPoi, setLastPoi] = useState<PointOfInterest | null>(null);
  const [lastResource, setLastResource] = useState<{ resource: ResourceType; quantity: number } | null>(null);

  // Battle Royale state
  const [brState, setBrState] = useState<BattleRoyaleState | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ playerId: string; playerName: string; message: string }[]>([]);

  // Gacha results
  const [lastGachaResults, setLastGachaResults] = useState<GachaPull[]>([]);

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
        setError('Server is restarting...');
        setConnectionStatus('disconnected');
        break;

      // === Lobby Messages ===
      case 'echoes_lobby_created':
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('echoes_reconnectToken', msg.reconnectToken);
        break;

      case 'echoes_joined_lobby':
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        sessionStorage.setItem('echoes_reconnectToken', msg.reconnectToken);
        setLobbyState(msg.lobbyState);
        setPhase('waiting-room');
        setError(null);
        break;

      case 'echoes_lobby_state':
        setLobbyState(msg.lobbyState);
        break;

      case 'echoes_player_joined':
        setLobbyState(prev => {
          if (!prev) return prev;
          const exists = prev.players.some((p: EchoesLobbyPlayer) => p.id === msg.player.id);
          return { ...prev, players: exists ? prev.players : [...prev.players, msg.player] };
        });
        break;

      case 'echoes_player_left':
        setLobbyState(prev => {
          if (!prev) return prev;
          return { ...prev, players: prev.players.filter((p: EchoesLobbyPlayer) => p.id !== msg.playerId) };
        });
        break;

      case 'echoes_countdown':
        setCountdownNumber(msg.count);
        setPhase('countdown');
        break;

      case 'echoes_game_started':
        setGameSeed(msg.seed);
        setCurrentMode(msg.mode);
        setCountdownNumber(null);
        setPhase('playing');
        break;

      case 'echoes_ban_pick_phase':
        setPhase('ban-pick');
        break;

      // === Combat Messages ===
      case 'echoes_combat_state':
        setCombatState(msg.state);
        setPhase('combat');
        break;

      case 'echoes_rhythm_phase':
        setRhythmPhase({ bpm: msg.bpm, beatPhase: msg.beatPhase, notes: msg.notes });
        break;

      case 'echoes_rhythm_result':
        setLastRhythmResult(msg);
        break;

      case 'echoes_reaction_triggered':
        setLastReaction(msg);
        break;

      case 'echoes_damage_dealt':
        setLastDamage(msg);
        break;

      case 'echoes_combat_end':
        setCombatReward(msg.rewards);
        setPhase('results');
        break;

      case 'echoes_encounter':
        setEnemies(msg.enemies);
        setPhase('combat');
        break;

      // === Exploration Messages ===
      case 'echoes_exploration_state':
        setExplorationState(msg.state);
        setVisibleTiles(msg.visibleTiles);
        setPhase('exploration');
        break;

      case 'echoes_resource_gathered':
        setLastResource({ resource: msg.resource, quantity: msg.quantity });
        break;

      case 'echoes_poi_discovered':
        setLastPoi(msg.poi);
        break;

      // === Battle Royale Messages ===
      case 'echoes_br_state':
        setBrState(msg.state);
        break;

      case 'echoes_br_zone_shrink':
        setBrState(prev => prev ? { ...prev, safeZone: msg.safeZone, nextShrinkAt: msg.nextShrinkAt } : prev);
        break;

      // === Gacha ===
      case 'echoes_gacha_result':
        setLastGachaResults(msg.pulls);
        break;

      // === Chat ===
      case 'echoes_chat_message':
        setChatMessages(prev => {
          const next = [...prev, { playerId: msg.playerId, playerName: msg.playerName, message: msg.message }];
          return next.length > 50 ? next.slice(-50) : next;
        });
        break;

      case 'echoes_emote_broadcast':
        // Handle emote display
        break;

      case 'echoes_error':
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
        try { ws.send(JSON.stringify(msg)); } catch { /* noop */ }
      }
    };

    ws.onmessage = (event) => {
      try {
        handleServerMessage(JSON.parse(event.data));
      } catch (err) {
        console.error('[ECHOES WS] Parse error:', err);
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
      if (wsRef.current?.readyState === WebSocket.OPEN && Date.now() - lastPingRef.current > PING_TIMEOUT) {
        wsRef.current.close();
      }
    }, 10000);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingCheckTimerRef.current) clearInterval(pingCheckTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      pendingMessagesRef.current = [];
    };
  }, []);

  // ===== Actions =====

  const createLobby = useCallback((playerName: string, mode: GameMode, lobbyName?: string) => {
    send({ type: 'echoes_create_lobby', playerName, mode, lobbyName });
    setPhase('waiting-room');
  }, [send]);

  const joinLobby = useCallback((lobbyCode: string, playerName: string) => {
    send({ type: 'echoes_join_lobby', lobbyCode, playerName });
  }, [send]);

  const leaveLobby = useCallback(() => {
    send({ type: 'echoes_leave_lobby' });
    reconnectTokenRef.current = '';
    sessionStorage.removeItem('echoes_reconnectToken');
    setLobbyState(null);
    setPhase('menu');
    setError(null);
    setCombatState(null);
    setCombatReward(null);
    setEnemies([]);
    setBrState(null);
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'echoes_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'echoes_start_game' });
  }, [send]);

  const selectCharacter = useCallback((characterId: string) => {
    send({ type: 'echoes_select_character', characterId });
  }, [send]);

  const banCharacter = useCallback((characterId: string) => {
    send({ type: 'echoes_ban_character', characterId });
  }, [send]);

  const sendCombatAction = useCallback((action: CombatAction) => {
    send({ type: 'echoes_combat_action', action });
  }, [send]);

  const sendRhythmHit = useCallback((lane: number, accuracy: HitAccuracy, beatPhase: number) => {
    send({ type: 'echoes_rhythm_hit', lane, accuracy, beatPhase });
  }, [send]);

  const sendPuzzleAction = useCallback((action: 'move' | 'rotate' | 'drop' | 'hold') => {
    send({ type: 'echoes_puzzle_action', action });
  }, [send]);

  const exploreMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    send({ type: 'echoes_explore_move', direction });
  }, [send]);

  const gatherResource = useCallback((tileX: number, tileY: number) => {
    send({ type: 'echoes_gather_resource', tileX, tileY });
  }, [send]);

  const craftItem = useCallback((recipeId: string) => {
    send({ type: 'echoes_craft', recipeId });
  }, [send]);

  const buildStructure = useCallback((x: number, y: number, structureId: string) => {
    send({ type: 'echoes_build', x, y, structureId });
  }, [send]);

  const useItem = useCallback((itemId: string, targetIndex?: number) => {
    send({ type: 'echoes_use_item', itemId, targetIndex });
  }, [send]);

  const sendEmote = useCallback((emote: string) => {
    send({ type: 'echoes_emote', emote });
  }, [send]);

  const sendChat = useCallback((message: string) => {
    send({ type: 'echoes_chat', message });
  }, [send]);

  const queueRanked = useCallback((playerName: string, tier: EchoesRankedTier, points: number) => {
    send({ type: 'echoes_queue_ranked', playerName, tier, points });
    setPhase('queue');
  }, [send]);

  const cancelQueue = useCallback(() => {
    send({ type: 'echoes_cancel_queue' });
    setPhase('menu');
  }, [send]);

  // BR Actions
  const brMove = useCallback((x: number, y: number) => {
    send({ type: 'echoes_br_move', x, y });
  }, [send]);

  const brBuild = useCallback((x: number, y: number, pieceType: string) => {
    send({ type: 'echoes_br_build', x, y, pieceType });
  }, [send]);

  const brAttack = useCallback((targetId: string) => {
    send({ type: 'echoes_br_attack', targetId });
  }, [send]);

  return {
    // Connection
    connectionStatus,
    connectWebSocket,
    playerId: playerIdRef.current,

    // Game state
    phase,
    setPhase,
    lobbyState,
    error,
    setError,
    countdownNumber,
    gameSeed,
    currentMode,

    // Combat
    combatState,
    rhythmPhase,
    lastRhythmResult,
    lastReaction,
    lastDamage,
    combatReward,
    enemies,

    // Exploration
    explorationState,
    visibleTiles,
    lastPoi,
    lastResource,

    // Battle Royale
    brState,

    // Chat
    chatMessages,

    // Gacha
    lastGachaResults,

    // Lobby actions
    createLobby,
    joinLobby,
    leaveLobby,
    setReady,
    startGame,
    selectCharacter,
    banCharacter,

    // Combat actions
    sendCombatAction,
    sendRhythmHit,
    sendPuzzleAction,

    // Exploration actions
    exploreMove,
    gatherResource,
    craftItem,
    buildStructure,
    useItem,

    // Social
    sendEmote,
    sendChat,

    // Ranked
    queueRanked,
    cancelQueue,

    // BR actions
    brMove,
    brBuild,
    brAttack,
  };
}
