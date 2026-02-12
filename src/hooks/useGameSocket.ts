'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  RoomState,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type Player,
  type ScoreEvent,
} from '@/types/game';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseGameSocketReturn {
  socket: GameSocket | null;
  isConnected: boolean;
  roomId: string | null;
  roomCode: string | null;
  players: Player[];
  roomState: RoomState | null;
  currentPlayer: Player | null;
  isHost: boolean;
  gameStartTime: number | null;
  gameDuration: number | null;
  
  // Actions
  createRoom: (playerName: string) => Promise<{ success: boolean; error?: string }>;
  joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  submitScoreEvent: (event: ScoreEvent) => void;
  
  // State
  leaderboard: Player[];
  error: string | null;
}

export function useGameSocket(): UseGameSocketReturn {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [gameDuration, setGameDuration] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance: GameSocket = io({
      path: '/socket.io',
    });

    socketInstance.on('connect', () => {
      console.log('Connected to game server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from game server');
      setIsConnected(false);
    });

    // Room events
    socketInstance.on('room:created', ({ roomCode: code, roomId: id }) => {
      setRoomCode(code);
      setRoomId(id);
    });

    socketInstance.on('room:joined', ({ roomId: id, players: roomPlayers, state }) => {
      setRoomId(id);
      setPlayers(roomPlayers);
      setRoomState(state);
    });

    socketInstance.on('room:player-joined', (player) => {
      setPlayers((prev) => {
        const exists = prev.some((p) => p.id === player.id);
        return exists ? prev : [...prev, player];
      });
    });

    socketInstance.on('room:player-left', (playerId) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    socketInstance.on('room:players-sync', (syncedPlayers) => {
      setPlayers(syncedPlayers);
    });

    socketInstance.on('room:player-disconnected', (playerId) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
      );
    });

    socketInstance.on('room:player-reconnected', (playerId) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, connected: true } : p))
      );
    });

    socketInstance.on('room:state-changed', (state) => {
      setRoomState(state);
    });

    socketInstance.on('room:error', (errorMsg) => {
      setError(errorMsg);
    });

    // Game events
    socketInstance.on('game:starting', ({ startAt, duration }) => {
      setGameStartTime(startAt);
      setGameDuration(duration);
    });

    socketInstance.on('game:started', () => {
      setRoomState(RoomState.ACTIVE);
    });

    socketInstance.on('game:score-update', ({ playerId, score }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, score } : p))
      );
    });

    socketInstance.on('game:finished', (finalLeaderboard) => {
      setLeaderboard(finalLeaderboard);
      setRoomState(RoomState.FINISHED);
    });

    setSocket(socketInstance);
    socketRef.current = socketInstance;

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const createRoom = useCallback(
    async (playerName: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socket) {
          resolve({ success: false, error: 'Not connected' });
          return;
        }

        socket.emit('room:create', playerName, (response) => {
          if (response.success && response.roomCode && response.roomId) {
            setRoomCode(response.roomCode);
            setRoomId(response.roomId);
            setRoomState(RoomState.LOBBY);
            if (socket.id) {
              setPlayers([
                {
                  id: socket.id,
                  name: playerName,
                  score: 0,
                  isHost: true,
                  connected: true,
                },
              ]);
            }
          } else {
            setError(response.error || 'Failed to create room');
          }
          resolve(response);
        });
      });
    },
    [socket]
  );

  const joinRoom = useCallback(
    async (
      code: string,
      playerName: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socket) {
          resolve({ success: false, error: 'Not connected' });
          return;
        }

        socket.emit('room:join', { roomCode: code, playerName }, (response) => {
          if (response.success) {
            setRoomCode(code);
            setRoomId(response.roomId!);
            setPlayers(response.players!);
            setRoomState(response.state!);
          } else {
            setError(response.error || 'Failed to join room');
          }
          resolve(response);
        });
      });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('room:leave');
      setRoomId(null);
      setRoomCode(null);
      setPlayers([]);
      setRoomState(null);
      setGameStartTime(null);
      setGameDuration(null);
      setLeaderboard([]);
    }
  }, [socket]);

  const startGame = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected' });
        return;
      }

      socket.emit('game:start', (response) => {
        if (!response.success) {
          setError(response.error || 'Failed to start game');
        }
        resolve(response);
      });
    });
  }, [socket]);

  const submitScoreEvent = useCallback(
    (event: ScoreEvent) => {
      if (socket && roomState === RoomState.ACTIVE) {
        socket.emit('game:score-event', event);
      }
    },
    [socket, roomState]
  );

  const currentPlayer = players.find((p) => p.id === socket?.id) || null;
  const isHost = currentPlayer?.isHost || false;

  return {
    socket,
    isConnected,
    roomId,
    roomCode,
    players,
    roomState,
    currentPlayer,
    isHost,
    gameStartTime,
    gameDuration,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitScoreEvent,
    leaderboard,
    error,
  };
}
