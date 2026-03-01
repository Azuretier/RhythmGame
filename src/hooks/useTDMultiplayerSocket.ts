'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  GameState, Tower, Enemy, Projectile, EnemyType, TowerType,
  TDPlayerState, TDMultiplayerRoom,
} from '@/types/tower-defense';

// ===== Exported Types =====

export interface TDMultiplayerPlayer {
  playerId: string;
  playerName: string;
  ready: boolean;
  connected: boolean;
  eliminated: boolean;
  gold: number;
  lives: number;
  maxLives: number;
  score: number;
  sendPoints: number;
  currentWave: number;
  towerCount: number;
  enemyCount: number;
}

export interface TDMultiplayerState {
  roomCode: string | null;
  playerId: string | null;
  isHost: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'waiting' | 'countdown' | 'playing' | 'ended';
  players: TDMultiplayerPlayer[];
  ownGameState: GameState | null;
  opponentStates: Map<string, {
    playerId: string;
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
    gold: number;
    lives: number;
    score: number;
    sendPoints: number;
    phase: string;
  }>;
  selectedTarget: string | null;
  countdown: number;
  winner: string | null;
  rankings: Array<{ playerId: string; playerName: string; rank: number; score: number }>;
  incomingAlerts: Array<{ fromPlayerName: string; enemyType: EnemyType; count: number; timestamp: number }>;
  error: string | null;
}

export interface UseTDMultiplayerReturn {
  state: TDMultiplayerState;
  isConnected: boolean;
  createRoom: (playerName: string, mapIndex?: number) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  placeTower: (towerType: TowerType, gridX: number, gridZ: number) => void;
  sellTower: (towerId: string) => void;
  upgradeTower: (towerId: string) => void;
  startWave: () => void;
  sendEnemy: (targetPlayerId: string, enemyType: EnemyType) => void;
  selectTarget: (targetPlayerId: string) => void;
  connectWebSocket: () => void;
  disconnect: () => void;
}

// ===== Constants =====

const MULTIPLAYER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000;
const PING_CHECK_INTERVAL = 10000;
const SESSION_TOKEN_KEY = 'td_reconnectToken';

// ===== Hook =====

export function useTDMultiplayerSocket(): UseTDMultiplayerReturn {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTokenRef = useRef<string | null>(null);
  const lastPingRef = useRef(Date.now());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State
  const [status, setStatus] = useState<TDMultiplayerState['status']>('disconnected');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<TDMultiplayerPlayer[]>([]);
  const [ownGameState, setOwnGameState] = useState<GameState | null>(null);
  const [opponentStates, setOpponentStates] = useState<TDMultiplayerState['opponentStates']>(new Map());
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [rankings, setRankings] = useState<TDMultiplayerState['rankings']>([]);
  const [incomingAlerts, setIncomingAlerts] = useState<TDMultiplayerState['incomingAlerts']>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for stable access in callbacks
  const roomCodeRef = useRef<string | null>(null);
  const statusRef = useRef<TDMultiplayerState['status']>('disconnected');

  // Keep refs in sync
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ===== Send helper =====

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ===== Server message handler =====

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleServerMessage = useCallback((msg: any) => {
    const type = msg.type as string;

    // Standard multiplayer protocol messages
    if (type === 'ping') {
      lastPingRef.current = Date.now();
      send({ type: 'pong' });
      return;
    }

    if (type === 'connected') {
      playerIdRef.current = msg.playerId;
      setPlayerId(msg.playerId);
      return;
    }

    if (type === 'online_count') return;

    if (type === 'error') {
      setError(msg.message);
      return;
    }

    // ===== TD-specific messages =====

    switch (type) {
      case 'td_room_created': {
        roomCodeRef.current = msg.roomCode;
        setRoomCode(msg.roomCode);
        playerIdRef.current = msg.playerId;
        setPlayerId(msg.playerId);
        setIsHost(true);
        setStatus('waiting');
        setError(null);
        break;
      }

      case 'td_room_joined': {
        roomCodeRef.current = msg.roomCode;
        setRoomCode(msg.roomCode);
        setStatus('waiting');
        setError(null);
        // Room state will come separately via td_room_state
        if (msg.room) {
          applyRoomState(msg.room);
        }
        break;
      }

      case 'td_room_state': {
        applyRoomState(msg.room);
        break;
      }

      case 'td_player_joined': {
        const p = msg.player as TDPlayerState;
        setPlayers(prev => {
          if (prev.some(x => x.playerId === p.playerId)) return prev;
          return [...prev, toMultiplayerPlayer(p)];
        });
        break;
      }

      case 'td_player_left': {
        setPlayers(prev => prev.filter(p => p.playerId !== msg.playerId));
        break;
      }

      case 'td_player_ready': {
        setPlayers(prev =>
          prev.map(p => p.playerId === msg.playerId ? { ...p, ready: msg.ready } : p)
        );
        break;
      }

      case 'td_countdown': {
        setStatus('countdown');
        setCountdown(msg.seconds);
        break;
      }

      case 'td_game_started': {
        setStatus('playing');
        setWinner(null);
        setRankings([]);
        setIncomingAlerts([]);
        setSelectedTarget(null);
        break;
      }

      case 'td_state_update': {
        const playerStates = msg.playerStates as Array<{
          playerId: string;
          towers: Tower[];
          enemies: Enemy[];
          projectiles: Projectile[];
          gold: number;
          lives: number;
          score: number;
          sendPoints: number;
          phase: string;
        }>;

        const myId = playerIdRef.current;

        for (const ps of playerStates) {
          if (ps.playerId === myId) {
            // Update own full game state
            setOwnGameState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                towers: ps.towers,
                enemies: ps.enemies,
                projectiles: ps.projectiles,
                gold: ps.gold,
                lives: ps.lives,
                score: ps.score,
                phase: ps.phase as GameState['phase'],
              };
            });
          }
        }

        // Update opponent states
        setOpponentStates(() => {
          const newMap = new Map<string, typeof playerStates[number]>();
          for (const ps of playerStates) {
            if (ps.playerId !== myId) {
              newMap.set(ps.playerId, ps);
            }
          }
          return newMap;
        });

        // Update player summary data
        setPlayers(prev => prev.map(p => {
          const ps = playerStates.find(s => s.playerId === p.playerId);
          if (!ps) return p;
          return {
            ...p,
            gold: ps.gold,
            lives: ps.lives,
            score: ps.score,
            sendPoints: ps.sendPoints,
            towerCount: ps.towers.length,
            enemyCount: ps.enemies.length,
          };
        }));

        break;
      }

      case 'td_wave_started': {
        // Wave is server-managed; state updates come via td_state_update
        break;
      }

      case 'td_wave_complete': {
        // Wave ended on server side; state updates come via td_state_update
        break;
      }

      case 'td_tower_placed': {
        // Tower placed confirmation — state arrives via td_state_update
        break;
      }

      case 'td_tower_sold': {
        break;
      }

      case 'td_tower_upgraded': {
        break;
      }

      case 'td_enemy_sent': {
        // This is broadcast to all; only matters if we're the target (handled separately via td_enemies_incoming)
        break;
      }

      case 'td_enemies_incoming': {
        const alert = {
          fromPlayerName: msg.fromPlayerName as string,
          enemyType: msg.enemyType as EnemyType,
          count: msg.count as number,
          timestamp: Date.now(),
        };
        setIncomingAlerts(prev => [...prev, alert]);
        break;
      }

      case 'td_player_eliminated': {
        setPlayers(prev =>
          prev.map(p =>
            p.playerId === msg.playerId ? { ...p, eliminated: true } : p
          )
        );
        break;
      }

      case 'td_game_over': {
        setStatus('ended');
        setWinner(msg.winnerId || null);

        // Build rankings with player names
        const rankingsRaw = msg.rankings as Array<{ playerId: string; rank: number; score: number }>;
        setPlayers(prev => {
          const rankingsWithNames = rankingsRaw.map(r => {
            const player = prev.find(p => p.playerId === r.playerId);
            return { ...r, playerName: player?.playerName || 'Unknown' };
          });
          setRankings(rankingsWithNames);
          return prev;
        });
        break;
      }

      default:
        break;
    }
  }, [send]);

  // ===== Room state helper =====

  const applyRoomState = useCallback((room: TDMultiplayerRoom) => {
    setRoomCode(room.code);
    roomCodeRef.current = room.code;
    setIsHost(room.hostId === playerIdRef.current);
    setPlayers(room.players.map(toMultiplayerPlayer));

    if (room.status === 'playing') {
      setStatus('playing');
      // Find own game state from room player data
      const self = room.players.find(p => p.playerId === playerIdRef.current);
      if (self) {
        setOwnGameState(self.gameState);
      }
    } else if (room.status === 'countdown') {
      setStatus('countdown');
    } else if (room.status === 'ended') {
      setStatus('ended');
    }
  }, []);

  // ===== WebSocket connection =====

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus('connecting');
    const ws = new WebSocket(MULTIPLAYER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) { ws.close(); return; }

      setStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
      lastPingRef.current = Date.now();

      // Try reconnect if we had a session
      const token = reconnectTokenRef.current || sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        ws.send(JSON.stringify({ type: 'reconnect', reconnectToken: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;

      const hadSession = reconnectTokenRef.current || sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (hadSession && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 15000);
        setStatus('connecting');
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connectWebSocket();
        }, delay);
      } else {
        setStatus('disconnected');
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [handleServerMessage]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // ===== Ping timeout check =====

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && Date.now() - lastPingRef.current > PING_TIMEOUT) {
        wsRef.current.close();
      }
    }, PING_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ===== Action dispatchers =====

  const createRoom = useCallback((playerName: string, mapIndex: number = 0) => {
    send({ type: 'td_create_room', playerName, mapIndex });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    send({ type: 'td_join_room', roomCode: roomCode.toUpperCase().trim(), playerName });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'td_leave_room' });
    setStatus('connected');
    setRoomCode(null);
    roomCodeRef.current = null;
    setPlayers([]);
    setOwnGameState(null);
    setOpponentStates(new Map());
    setSelectedTarget(null);
    setWinner(null);
    setRankings([]);
    setIncomingAlerts([]);
    setIsHost(false);
    reconnectTokenRef.current = null;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'td_set_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'td_start_game' });
  }, [send]);

  const placeTower = useCallback((towerType: TowerType, gridX: number, gridZ: number) => {
    send({ type: 'td_place_tower', towerType, gridX, gridZ });
  }, [send]);

  const sellTowerAction = useCallback((towerId: string) => {
    send({ type: 'td_sell_tower', towerId });
  }, [send]);

  const upgradeTowerAction = useCallback((towerId: string) => {
    send({ type: 'td_upgrade_tower', towerId });
  }, [send]);

  const startWaveAction = useCallback(() => {
    send({ type: 'td_start_wave' });
  }, [send]);

  const sendEnemy = useCallback((targetPlayerId: string, enemyType: EnemyType) => {
    send({ type: 'td_send_enemy', targetPlayerId, enemyType });
  }, [send]);

  const selectTarget = useCallback((targetPlayerId: string) => {
    setSelectedTarget(targetPlayerId);
    send({ type: 'td_select_target', targetPlayerId });
  }, [send]);

  // ===== Composed state =====

  const state: TDMultiplayerState = {
    roomCode,
    playerId,
    isHost,
    status,
    players,
    ownGameState,
    opponentStates,
    selectedTarget,
    countdown,
    winner,
    rankings,
    incomingAlerts,
    error,
  };

  return {
    state,
    isConnected: status !== 'disconnected',
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    placeTower,
    sellTower: sellTowerAction,
    upgradeTower: upgradeTowerAction,
    startWave: startWaveAction,
    sendEnemy,
    selectTarget,
    connectWebSocket,
    disconnect,
  };
}

// ===== Helpers =====

function toMultiplayerPlayer(p: TDPlayerState): TDMultiplayerPlayer {
  return {
    playerId: p.playerId,
    playerName: p.playerName,
    ready: p.ready,
    connected: p.connected,
    eliminated: p.eliminated,
    gold: p.gameState?.gold ?? 0,
    lives: p.gameState?.lives ?? 20,
    maxLives: p.gameState?.maxLives ?? 20,
    score: p.gameState?.score ?? 0,
    sendPoints: p.sendPoints ?? 0,
    currentWave: p.gameState?.currentWave ?? 0,
    towerCount: p.gameState?.towers?.length ?? 0,
    enemyCount: p.gameState?.enemies?.length ?? 0,
  };
}
