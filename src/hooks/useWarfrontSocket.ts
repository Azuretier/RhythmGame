'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  WarfrontRoomState,
  WarfrontTerritory,
  WarfrontTeam,
  WarfrontRole,
  WarfrontGameMode,
  WarfrontPlayer,
  CrossModeEffect,
  ResourcePool,
  WFPublicRoom,
  WFServerMessage,
  WFRanking,
} from '@/types/warfront';
import { WF_POSITION_BROADCAST_RATE } from '@/types/warfront';

const WS_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';

export type WFConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type WFGamePhase = 'menu' | 'lobby' | 'countdown' | 'playing' | 'ended';

export interface WarfrontSocketState {
  connectionStatus: WFConnectionStatus;
  playerId: string | null;
  phase: WFGamePhase;
  roomCode: string | null;
  roomState: WarfrontRoomState | null;
  myRole: WarfrontRole | null;
  myTeamId: string | null;
  territories: WarfrontTerritory[];
  teams: WarfrontTeam[];
  teamResources: ResourcePool | null;
  recentEffects: CrossModeEffect[];
  countdown: number;
  seed: number | null;
  rooms: WFPublicRoom[];
  gameResult: { reason: string; winnerId: string; rankings: WFRanking[] } | null;
  chatMessages: { playerId: string; playerName: string; message: string }[];

  // Remote player state (for 3D views)
  remoteSoldierPositions: Map<string, { x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number }>;
  remoteEngineerPositions: Map<string, { x: number; y: number; z: number; rx: number; ry: number }>;

  // Actions
  connect: () => void;
  disconnect: () => void;
  createRoom: (playerName: string, mode: WarfrontGameMode, roomName?: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  getRooms: () => void;
  setReady: (ready: boolean) => void;
  selectRole: (role: WarfrontRole) => void;
  selectTeam: (teamId: string) => void;
  startGame: () => void;
  sendChat: (message: string) => void;

  // Role-specific actions
  sendDefenderAction: (actionType: string, value: number) => void;
  sendSoldierPosition: (x: number, y: number, z: number, rx: number, ry: number, weaponId: string, health: number) => void;
  sendSoldierShoot: (x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string) => void;
  sendSoldierHit: (targetId: string, damage: number, weaponId: string, headshot: boolean) => void;
  sendSoldierDied: (killerId: string, weaponId: string) => void;
  sendSoldierRespawn: () => void;
  sendEngineerPosition: (x: number, y: number, z: number, rx: number, ry: number) => void;
  sendEngineerMine: (x: number, y: number, z: number, blockType: number) => void;
  sendEngineerPlace: (x: number, y: number, z: number, blockType: number) => void;
  sendEngineerCraft: (recipeId: string) => void;
  sendCommanderScan: (territoryId: number) => void;
  sendCommanderAbility: (abilityId: string, territoryId: number) => void;
  sendCommanderPing: (x: number, z: number, pingType: string) => void;
}

export function useWarfrontSocket(): WarfrontSocketState {
  const [connectionStatus, setConnectionStatus] = useState<WFConnectionStatus>('disconnected');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<WFGamePhase>('menu');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<WarfrontRoomState | null>(null);
  const [myRole, setMyRole] = useState<WarfrontRole | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [territories, setTerritories] = useState<WarfrontTerritory[]>([]);
  const [teams, setTeams] = useState<WarfrontTeam[]>([]);
  const [teamResources, setTeamResources] = useState<ResourcePool | null>(null);
  const [recentEffects, setRecentEffects] = useState<CrossModeEffect[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [seed, setSeed] = useState<number | null>(null);
  const [rooms, setRooms] = useState<WFPublicRoom[]>([]);
  const [gameResult, setGameResult] = useState<WarfrontSocketState['gameResult']>(null);
  const [chatMessages, setChatMessages] = useState<WarfrontSocketState['chatMessages']>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTokenRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const myTeamIdRef = useRef<string | null>(null);
  const remoteSoldiersRef = useRef(new Map<string, { x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number }>());
  const remoteEngineersRef = useRef(new Map<string, { x: number; y: number; z: number; rx: number; ry: number }>());
  const lastPositionSendRef = useRef(0);

  // Sync refs when state changes to avoid stale closures in handleMessage
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { myTeamIdRef.current = myTeamId; }, [myTeamId]);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const raw = JSON.parse(event.data) as { type: string; playerId?: string; reconnectToken?: string };

    // Handle generic server messages before typed warfront messages
    if (raw.type === 'connected') {
      setPlayerId(raw.playerId || null);
      return;
    }
    if (raw.type === 'ping') {
      send({ type: 'pong' });
      return;
    }

    const msg = raw as unknown as WFServerMessage;

    switch (msg.type) {

      case 'wf_room_created':
        if ('roomCode' in msg) {
          setRoomCode(msg.roomCode as string);
          reconnectTokenRef.current = (msg as { reconnectToken?: string }).reconnectToken || null;
          setPhase('lobby');
        }
        break;

      case 'wf_joined_room':
        if ('roomCode' in msg && 'roomState' in msg) {
          setRoomCode(msg.roomCode as string);
          setRoomState(msg.roomState as WarfrontRoomState);
          reconnectTokenRef.current = (msg as { reconnectToken?: string }).reconnectToken || null;
          setPhase('lobby');
        }
        break;

      case 'wf_room_state':
        if ('roomState' in msg) {
          const state = msg.roomState as WarfrontRoomState;
          setRoomState(state);
          setTeams(state.teams);
          setTerritories(state.territories);
        }
        break;

      case 'wf_room_list':
        if ('rooms' in msg) setRooms(msg.rooms as WFPublicRoom[]);
        break;

      case 'wf_role_selected':
        if ('playerId' in msg && 'role' in msg && msg.playerId === playerIdRef.current) {
          setMyRole(msg.role as WarfrontRole);
        }
        break;

      case 'wf_team_selected':
        if ('playerId' in msg && 'teamId' in msg && msg.playerId === playerIdRef.current) {
          setMyTeamId(msg.teamId as string);
        }
        break;

      case 'wf_countdown':
        if ('count' in msg) {
          setCountdown(msg.count as number);
          setPhase('countdown');
        }
        break;

      case 'wf_game_started':
        if ('seed' in msg) {
          setSeed(msg.seed as number);
          if ('territories' in msg) setTerritories(msg.territories as WarfrontTerritory[]);
          if ('teams' in msg) setTeams(msg.teams as WarfrontTeam[]);
          setPhase('playing');
        }
        break;

      case 'wf_territory_update':
        if ('territories' in msg) setTerritories(msg.territories as WarfrontTerritory[]);
        break;

      case 'wf_resources_update':
        if ('resources' in msg && 'teamId' in msg && msg.teamId === myTeamIdRef.current) {
          setTeamResources(msg.resources as ResourcePool);
        }
        break;

      case 'wf_effect_applied':
        if ('effect' in msg) {
          setRecentEffects(prev => [...prev.slice(-19), msg.effect as CrossModeEffect]);
        }
        break;

      case 'wf_team_scores':
        if ('teams' in msg) {
          setTeams(prev => prev.map(t => {
            const update = (msg.teams as { id: string; score: number; territoryCount: number }[]).find(u => u.id === t.id);
            return update ? { ...t, score: update.score, territoryCount: update.territoryCount } : t;
          }));
        }
        break;

      case 'wf_game_ended':
        if ('reason' in msg) {
          setGameResult({
            reason: msg.reason as string,
            winnerId: msg.winnerId as string,
            rankings: msg.rankings as WFRanking[],
          });
          setPhase('ended');
        }
        break;

      case 'wf_soldier_position_update':
        if ('playerId' in msg) {
          const m = msg as unknown as { playerId: string; x: number; y: number; z: number; rx: number; ry: number; weaponId: string; health: number };
          remoteSoldiersRef.current.set(m.playerId, { x: m.x, y: m.y, z: m.z, rx: m.rx, ry: m.ry, weaponId: m.weaponId, health: m.health });
        }
        break;

      case 'wf_engineer_position_update':
        if ('playerId' in msg) {
          const m = msg as unknown as { playerId: string; x: number; y: number; z: number; rx: number; ry: number };
          remoteEngineersRef.current.set(m.playerId, { x: m.x, y: m.y, z: m.z, rx: m.rx, ry: m.ry });
        }
        break;

      case 'wf_player_left':
        if ('playerId' in msg) {
          remoteSoldiersRef.current.delete(msg.playerId as string);
          remoteEngineersRef.current.delete(msg.playerId as string);
        }
        break;

      case 'wf_chat_message':
        if ('playerName' in msg && 'message' in msg) {
          setChatMessages(prev => [...prev.slice(-49), {
            playerId: msg.playerId as string,
            playerName: (msg as { playerName: string }).playerName,
            message: (msg as { message: string }).message,
          }]);
        }
        break;

      case 'wf_error':
        console.error('[WF]', (msg as { message: string }).message);
        break;
    }
  }, [send]);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    setConnectionStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus('connected');
    ws.onmessage = handleMessage;
    ws.onclose = () => {
      wsRef.current = null;
      setConnectionStatus('disconnected');
    };
    ws.onerror = () => {
      ws.close();
    };
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionStatus('disconnected');
    setPhase('menu');
    setRoomCode(null);
    setRoomState(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  // Actions
  const createRoom = useCallback((playerName: string, mode: WarfrontGameMode, roomName?: string) => {
    send({ type: 'wf_create_room', playerName, mode, roomName });
  }, [send]);

  const joinRoom = useCallback((code: string, playerName: string) => {
    send({ type: 'wf_join_room', roomCode: code, playerName });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'wf_leave' });
    setPhase('menu');
    setRoomCode(null);
    setRoomState(null);
  }, [send]);

  const getRooms = useCallback(() => send({ type: 'wf_get_rooms' }), [send]);
  const setReady = useCallback((ready: boolean) => send({ type: 'wf_ready', ready }), [send]);
  const selectRole = useCallback((role: WarfrontRole) => { send({ type: 'wf_select_role', role }); setMyRole(role); }, [send]);
  const selectTeam = useCallback((teamId: string) => { send({ type: 'wf_select_team', teamId }); setMyTeamId(teamId); }, [send]);
  const startGame = useCallback(() => send({ type: 'wf_start' }), [send]);
  const sendChat = useCallback((message: string) => send({ type: 'wf_chat', message }), [send]);

  // Role actions
  const sendDefenderAction = useCallback((actionType: string, value: number) => {
    send({ type: 'wf_defender_action', actionType, value });
  }, [send]);

  const sendSoldierPosition = useCallback((x: number, y: number, z: number, rx: number, ry: number, weaponId: string, health: number) => {
    const now = Date.now();
    if (now - lastPositionSendRef.current < WF_POSITION_BROADCAST_RATE) return;
    lastPositionSendRef.current = now;
    send({ type: 'wf_soldier_position', x, y, z, rx, ry, weaponId, health });
  }, [send]);

  const sendSoldierShoot = useCallback((x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string) => {
    send({ type: 'wf_soldier_shoot', x, y, z, dx, dy, dz, weaponId });
  }, [send]);

  const sendSoldierHit = useCallback((targetId: string, damage: number, weaponId: string, headshot: boolean) => {
    send({ type: 'wf_soldier_hit', targetId, damage, weaponId, headshot });
  }, [send]);

  const sendSoldierDied = useCallback((killerId: string, weaponId: string) => {
    send({ type: 'wf_soldier_died', killerId, weaponId });
  }, [send]);

  const sendSoldierRespawn = useCallback(() => send({ type: 'wf_soldier_respawn' }), [send]);

  const sendEngineerPosition = useCallback((x: number, y: number, z: number, rx: number, ry: number) => {
    const now = Date.now();
    if (now - lastPositionSendRef.current < WF_POSITION_BROADCAST_RATE) return;
    lastPositionSendRef.current = now;
    send({ type: 'wf_engineer_position', x, y, z, rx, ry });
  }, [send]);

  const sendEngineerMine = useCallback((x: number, y: number, z: number, blockType: number) => {
    send({ type: 'wf_engineer_mine', x, y, z, blockType });
  }, [send]);

  const sendEngineerPlace = useCallback((x: number, y: number, z: number, blockType: number) => {
    send({ type: 'wf_engineer_place', x, y, z, blockType });
  }, [send]);

  const sendEngineerCraft = useCallback((recipeId: string) => {
    send({ type: 'wf_engineer_craft', recipeId });
  }, [send]);

  const sendCommanderScan = useCallback((territoryId: number) => {
    send({ type: 'wf_commander_scan', targetTerritoryId: territoryId });
  }, [send]);

  const sendCommanderAbility = useCallback((abilityId: string, territoryId: number) => {
    send({ type: 'wf_commander_ability', abilityId, targetTerritoryId: territoryId });
  }, [send]);

  const sendCommanderPing = useCallback((x: number, z: number, pingType: string) => {
    send({ type: 'wf_commander_ping', x, z, pingType });
  }, [send]);

  return {
    connectionStatus,
    playerId,
    phase,
    roomCode,
    roomState,
    myRole,
    myTeamId,
    territories,
    teams,
    teamResources,
    recentEffects,
    countdown,
    seed,
    rooms,
    gameResult,
    chatMessages,
    remoteSoldierPositions: remoteSoldiersRef.current,
    remoteEngineerPositions: remoteEngineersRef.current,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    getRooms,
    setReady,
    selectRole,
    selectTeam,
    startGame,
    sendChat,
    sendDefenderAction,
    sendSoldierPosition,
    sendSoldierShoot,
    sendSoldierHit,
    sendSoldierDied,
    sendSoldierRespawn,
    sendEngineerPosition,
    sendEngineerMine,
    sendEngineerPlace,
    sendEngineerCraft,
    sendCommanderScan,
    sendCommanderAbility,
    sendCommanderPing,
  };
}
