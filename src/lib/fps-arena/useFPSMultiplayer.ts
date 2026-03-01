'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { FPSRoomState, FPSPublicRoom, FPSPlayerPosition, FPSServerMessage, FPSGamePhase } from '@/types/fps-arena';
import { FPS_CONFIG } from '@/types/fps-arena';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export interface RemotePlayer {
    id: string;
    name: string;
    color: string;
    position: FPSPlayerPosition;
    lastUpdate: number;
}

export interface FPSMultiplayerState {
    phase: FPSGamePhase;
    myPlayerId: string | null;
    roomState: FPSRoomState | null;
    remotePlayers: Map<string, RemotePlayer>;
    publicRooms: FPSPublicRoom[];
    connected: boolean;
    error: string | null;
    gameSeed: number | null;
    countdown: number | null;
}

export interface FPSMultiplayerActions {
    connect: () => void;
    disconnect: () => void;
    createRoom: (playerName: string, roomName?: string) => void;
    joinRoom: (roomCode: string, playerName: string) => void;
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    startGame: () => void;
    refreshRooms: () => void;
    sendPosition: (x: number, y: number, z: number, rx: number, ry: number, weaponId: string, health: number) => void;
    sendShoot: (x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string) => void;
    sendHit: (targetId: string, damage: number, weaponId: string, headshot: boolean) => void;
    sendDied: (killerId: string, weaponId: string) => void;
    sendRespawn: () => void;
    sendChat: (message: string) => void;
}

export function useFPSMultiplayer(
    onRemoteShot?: (playerId: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string) => void,
    onRemoteHit?: (targetId: string, attackerId: string, damage: number, weaponId: string, headshot: boolean) => void,
    onRemoteDied?: (playerId: string, killerId: string, weaponId: string) => void,
    onRemoteRespawn?: (playerId: string) => void,
    onChatMessage?: (playerId: string, playerName: string, message: string) => void,
): [FPSMultiplayerState, FPSMultiplayerActions] {
    const [phase, setPhase] = useState<FPSGamePhase>('menu');
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
    const [roomState, setRoomState] = useState<FPSRoomState | null>(null);
    const [publicRooms, setPublicRooms] = useState<FPSPublicRoom[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameSeed, setGameSeed] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
    const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());
    const reconnectTokenRef = useRef<string | null>(null);
    const positionThrottleRef = useRef<number>(0);

    // Callback refs to avoid stale closures
    const onRemoteShotRef = useRef(onRemoteShot);
    const onRemoteHitRef = useRef(onRemoteHit);
    const onRemoteDiedRef = useRef(onRemoteDied);
    const onRemoteRespawnRef = useRef(onRemoteRespawn);
    const onChatMessageRef = useRef(onChatMessage);
    useEffect(() => { onRemoteShotRef.current = onRemoteShot; }, [onRemoteShot]);
    useEffect(() => { onRemoteHitRef.current = onRemoteHit; }, [onRemoteHit]);
    useEffect(() => { onRemoteDiedRef.current = onRemoteDied; }, [onRemoteDied]);
    useEffect(() => { onRemoteRespawnRef.current = onRemoteRespawn; }, [onRemoteRespawn]);
    useEffect(() => { onChatMessageRef.current = onChatMessage; }, [onChatMessage]);

    const send = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    const handleMessage = useCallback((msg: FPSServerMessage) => {
        switch (msg.type) {
            case 'fps_room_created':
                setMyPlayerId(msg.playerId);
                reconnectTokenRef.current = msg.reconnectToken;
                setPhase('lobby');
                setError(null);
                break;

            case 'fps_joined_room':
                setMyPlayerId(msg.playerId);
                setRoomState(msg.roomState);
                reconnectTokenRef.current = msg.reconnectToken;
                setPhase('lobby');
                setError(null);
                break;

            case 'fps_room_state':
                setRoomState(msg.roomState);
                break;

            case 'fps_room_list':
                setPublicRooms(msg.rooms);
                break;

            case 'fps_player_joined':
                setRoomState(prev => prev ? { ...prev, players: [...prev.players, msg.player] } : prev);
                break;

            case 'fps_player_left': {
                setRoomState(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== msg.playerId) } : prev);
                remotePlayersRef.current.delete(msg.playerId);
                setRemotePlayers(new Map(remotePlayersRef.current));
                break;
            }

            case 'fps_player_ready':
                setRoomState(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        players: prev.players.map(p => p.id === msg.playerId ? { ...p, ready: msg.ready } : p),
                    };
                });
                break;

            case 'fps_countdown':
                setCountdown(msg.count);
                setPhase('countdown');
                break;

            case 'fps_game_started':
                setGameSeed(msg.seed);
                setCountdown(null);
                setPhase('playing');
                break;

            case 'fps_player_position': {
                const p = msg.player;
                const existing = remotePlayersRef.current.get(p.id);
                if (existing) {
                    existing.position = p;
                    existing.lastUpdate = Date.now();
                } else {
                    // Find player info from room state
                    const playerInfo = roomState?.players.find(pl => pl.id === p.id);
                    remotePlayersRef.current.set(p.id, {
                        id: p.id,
                        name: playerInfo?.name || 'Player',
                        color: playerInfo?.color || '#FF4444',
                        position: p,
                        lastUpdate: Date.now(),
                    });
                }
                setRemotePlayers(new Map(remotePlayersRef.current));
                break;
            }

            case 'fps_player_shot':
                onRemoteShotRef.current?.(msg.playerId, msg.x, msg.y, msg.z, msg.dx, msg.dy, msg.dz, msg.weaponId);
                break;

            case 'fps_player_hit':
                onRemoteHitRef.current?.(msg.targetId, msg.attackerId, msg.damage, msg.weaponId, msg.headshot);
                break;

            case 'fps_player_died':
                onRemoteDiedRef.current?.(msg.playerId, msg.killerId, msg.weaponId);
                break;

            case 'fps_player_respawned':
                onRemoteRespawnRef.current?.(msg.playerId);
                break;

            case 'fps_chat_message':
                onChatMessageRef.current?.(msg.playerId, msg.playerName, msg.message);
                break;

            case 'fps_error':
                setError(msg.message);
                break;

            case 'fps_reconnected':
                setMyPlayerId(msg.playerId);
                setRoomState(msg.roomState);
                reconnectTokenRef.current = msg.reconnectToken;
                if (msg.roomState.status === 'playing') setPhase('playing');
                else setPhase('lobby');
                break;
        }
    }, [roomState]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            setError(null);
            // Try reconnect if we have a token
            if (reconnectTokenRef.current) {
                send({ type: 'reconnect', reconnectToken: reconnectTokenRef.current });
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    setMyPlayerId(data.playerId);
                    return;
                }
                if (data.type?.startsWith('fps_')) {
                    handleMessage(data as FPSServerMessage);
                }
            } catch { /* ignore parse errors */ }
        };

        ws.onclose = () => {
            setConnected(false);
            wsRef.current = null;
        };

        ws.onerror = () => {
            setError('Connection failed');
        };
    }, [send, handleMessage]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
        setPhase('menu');
        setRoomState(null);
        setMyPlayerId(null);
        remotePlayersRef.current.clear();
        setRemotePlayers(new Map());
    }, []);

    const createRoom = useCallback((playerName: string, roomName?: string) => {
        send({ type: 'fps_create_room', playerName, roomName });
    }, [send]);

    const joinRoom = useCallback((roomCode: string, playerName: string) => {
        send({ type: 'fps_join_room', roomCode, playerName });
    }, [send]);

    const leaveRoom = useCallback(() => {
        send({ type: 'fps_leave' });
        setPhase('menu');
        setRoomState(null);
        remotePlayersRef.current.clear();
        setRemotePlayers(new Map());
    }, [send]);

    const setReady = useCallback((ready: boolean) => {
        send({ type: 'fps_ready', ready });
    }, [send]);

    const startGame = useCallback(() => {
        send({ type: 'fps_start' });
    }, [send]);

    const refreshRooms = useCallback(() => {
        send({ type: 'fps_get_rooms' });
    }, [send]);

    const sendPosition = useCallback((x: number, y: number, z: number, rx: number, ry: number, weaponId: string, health: number) => {
        const now = Date.now();
        if (now - positionThrottleRef.current < FPS_CONFIG.POSITION_BROADCAST_RATE) return;
        positionThrottleRef.current = now;
        send({ type: 'fps_position', x, y, z, rx, ry, weaponId, health });
    }, [send]);

    const sendShoot = useCallback((x: number, y: number, z: number, dx: number, dy: number, dz: number, weaponId: string) => {
        send({ type: 'fps_shoot', x, y, z, dx, dy, dz, weaponId });
    }, [send]);

    const sendHit = useCallback((targetId: string, damage: number, weaponId: string, headshot: boolean) => {
        send({ type: 'fps_hit', targetId, damage, weaponId, headshot });
    }, [send]);

    const sendDied = useCallback((killerId: string, weaponId: string) => {
        send({ type: 'fps_died', killerId, weaponId });
    }, [send]);

    const sendRespawn = useCallback(() => {
        send({ type: 'fps_respawn' });
    }, [send]);

    const sendChat = useCallback((message: string) => {
        send({ type: 'fps_chat', message });
    }, [send]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const state: FPSMultiplayerState = {
        phase,
        myPlayerId,
        roomState,
        remotePlayers,
        publicRooms,
        connected,
        error,
        gameSeed,
        countdown,
    };

    const actions: FPSMultiplayerActions = {
        connect, disconnect, createRoom, joinRoom, leaveRoom,
        setReady, startGame, refreshRooms, sendPosition,
        sendShoot, sendHit, sendDied, sendRespawn, sendChat,
    };

    return [state, actions];
}
