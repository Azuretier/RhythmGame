'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ClientMessage,
  ServerMessage,
  MultiplayerPlayer,
  RoomPhase,
  RoomStateData,
} from '@/types/multiplayer';

export interface UseMultiplayerReturn {
  isConnected: boolean;
  playerId: string | null;
  roomCode: string | null;
  roomState: RoomStateData | null;
  error: string | null;
  
  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  sendRelay: (payload: any) => void;
  
  // Computed
  currentPlayer: MultiplayerPlayer | null;
  isHost: boolean;
  canStartGame: boolean;
}

export function useMultiplayer(wsUrl?: string): UseMultiplayerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomStateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Get WebSocket URL from env or parameter
  const websocketUrl = wsUrl || process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';

  /**
   * Send a message to the server
   */
  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setError('Not connected to server');
    }
  }, []);

  /**
   * Handle incoming messages from server
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'connected':
          setPlayerId(message.playerId);
          console.log('Connected with player ID:', message.playerId);
          break;

        case 'room_created':
          setRoomCode(message.roomCode);
          setPlayerId(message.playerId);
          console.log('Room created:', message.roomCode);
          break;

        case 'joined_room':
          setRoomCode(message.roomCode);
          setPlayerId(message.playerId);
          setRoomState(message.roomState);
          console.log('Joined room:', message.roomCode);
          break;

        case 'room_state':
          setRoomState(message.roomState);
          break;

        case 'player_joined':
          // Update will come via room_state message
          console.log('Player joined:', message.player.name);
          break;

        case 'player_left':
          // Update will come via room_state message
          console.log('Player left:', message.playerId);
          break;

        case 'player_ready':
          // Update will come via room_state message
          console.log('Player ready status changed:', message.playerId, message.ready);
          break;

        case 'game_started':
          console.log('Game started!');
          break;

        case 'relayed':
          // Handle relayed messages (custom game logic)
          console.log('Relayed message from:', message.fromPlayerId, message.payload);
          break;

        case 'error':
          setError(message.message);
          console.error('Server error:', message.message, message.code);
          setTimeout(() => setError(null), 5000);
          break;

        default:
          console.warn('Unknown message type:', (message as any).type);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('Connecting to:', websocketUrl);
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };

      ws.onmessage = handleMessage;
    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect to server');
    }
  }, [websocketUrl, handleMessage]);

  /**
   * Initialize connection
   */
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  /**
   * Create a new room
   */
  const createRoom = useCallback((playerName: string) => {
    sendMessage({
      type: 'create_room',
      playerName,
    });
  }, [sendMessage]);

  /**
   * Join an existing room
   */
  const joinRoom = useCallback((code: string, playerName: string) => {
    sendMessage({
      type: 'join_room',
      roomCode: code.toUpperCase(),
      playerName,
    });
  }, [sendMessage]);

  /**
   * Leave the current room
   */
  const leaveRoom = useCallback(() => {
    sendMessage({
      type: 'leave_room',
    });
    setRoomCode(null);
    setRoomState(null);
  }, [sendMessage]);

  /**
   * Set ready status
   */
  const setReady = useCallback((ready: boolean) => {
    sendMessage({
      type: 'set_ready',
      ready,
    });
  }, [sendMessage]);

  /**
   * Start the game (host only)
   */
  const startGame = useCallback(() => {
    sendMessage({
      type: 'start_game',
    });
  }, [sendMessage]);

  /**
   * Send a relay message to other players in the room
   */
  const sendRelay = useCallback((payload: any) => {
    sendMessage({
      type: 'relay',
      payload,
    });
  }, [sendMessage]);

  // Computed values
  const currentPlayer = roomState?.players.find(p => p.id === playerId) || null;
  const isHost = currentPlayer?.isHost || false;
  
  // Can start if host and all non-host players are ready
  const canStartGame = isHost && roomState?.phase === RoomPhase.LOBBY && 
    roomState.players
      .filter(p => !p.isHost)
      .every(p => p.isReady);

  return {
    isConnected,
    playerId,
    roomCode,
    roomState,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    sendRelay,
    currentPlayer,
    isHost,
    canStartGame,
  };
}
