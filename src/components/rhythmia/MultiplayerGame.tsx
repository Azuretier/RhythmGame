'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './MultiplayerGame.module.css';
import MultiplayerBattle from './MultiplayerBattle';
import RankedMatch from './RankedMatch';
import type {
  ServerMessage,
  RoomState,
  Player,
  PublicRoomInfo,
} from '@/types/multiplayer';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type GameMode = 'lobby' | 'name-entry' | 'room-browser' | 'waiting-room' | 'countdown' | 'playing' | 'finished' | 'ranked';

const MAX_RECONNECT_ATTEMPTS = 5;
const PING_TIMEOUT = 60000; // Consider connection dead if no ping from server in 60s

export default function MultiplayerGame() {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const playerIdRef = useRef<string>('');
  const reconnectTokenRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingRef = useRef<number>(Date.now());
  const pingCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomCodeRef = useRef<string>('');

  // UI state
  const [mode, setMode] = useState<GameMode>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Room state
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [rooms, setRooms] = useState<PublicRoomInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'code'>('create');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Game state
  const [gameSeed, setGameSeed] = useState<number>(0);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<{ winnerId: string } | null>(null);

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
    console.log(`[WS] Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
    setConnectionStatus('connecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectWebSocketRef.current();
    }, delay);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionStatus('connecting');
    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
      lastPingRef.current = Date.now();

      // If we have a reconnect token, attempt to rejoin
      const token = reconnectTokenRef.current || sessionStorage.getItem('mp_reconnectToken');
      if (token) {
        ws.send(JSON.stringify({ type: 'reconnect', reconnectToken: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnectionStatus('disconnected');
      wsRef.current = null;

      // Auto-reconnect if we were in a room
      if (reconnectTokenRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };

    wsRef.current = ws;
  }, [scheduleReconnect]);

  connectWebSocketRef.current = connectWebSocket;

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ===== Server Message Handler =====
  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected':
        playerIdRef.current = msg.playerId;
        break;

      case 'room_created':
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        roomCodeRef.current = msg.roomCode;
        sessionStorage.setItem('mp_reconnectToken', msg.reconnectToken);
        break;

      case 'joined_room':
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        roomCodeRef.current = msg.roomCode;
        sessionStorage.setItem('mp_reconnectToken', msg.reconnectToken);
        setRoomState(msg.roomState);
        setMode('waiting-room');
        setError(null);
        break;

      case 'room_state':
        setRoomState(msg.roomState);
        break;

      case 'room_list':
        setRooms(msg.rooms);
        break;

      case 'player_joined':
        setRoomState(prev => {
          if (!prev) return prev;
          const exists = prev.players.some(p => p.id === msg.player.id);
          return {
            ...prev,
            players: exists ? prev.players : [...prev.players, msg.player],
          };
        });
        break;

      case 'player_left':
        setRoomState(prev => {
          if (!prev) return prev;
          // Only remove player on explicit leave or grace timeout
          return {
            ...prev,
            players: prev.players.filter(p => p.id !== msg.playerId),
          };
        });
        break;

      case 'player_ready':
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

      case 'countdown':
        setCountdownNumber(msg.count);
        setMode('countdown');
        break;

      case 'game_started':
        setGameSeed(msg.gameSeed);
        setCountdownNumber(null);
        setGameResult(null);
        setMode('playing');
        break;

      case 'reconnected':
        playerIdRef.current = msg.playerId;
        reconnectTokenRef.current = msg.reconnectToken;
        roomCodeRef.current = msg.roomCode;
        sessionStorage.setItem('mp_reconnectToken', msg.reconnectToken);
        setRoomState(msg.roomState);
        if (msg.roomState.status === 'playing') {
          setMode('playing');
        } else {
          setMode('waiting-room');
        }
        break;

      case 'rematch_started':
        setMode('waiting-room');
        setGameResult(null);
        break;

      case 'error':
        setError(msg.message);
        break;

      case 'ping':
        lastPingRef.current = Date.now();
        send({ type: 'pong' });
        break;

      case 'online_count':
        // Handled at page level for lobby display; ignore here
        break;

      case 'server_shutdown':
        setError('Server is restarting. Reconnecting...');
        setConnectionStatus('disconnected');
        break;
    }
  }, [send]);

  // Connect on mount + client-side ping timeout detection
  useEffect(() => {
    connectWebSocket();

    // Periodically check if we're still receiving pings from server
    pingCheckTimerRef.current = setInterval(() => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        Date.now() - lastPingRef.current > PING_TIMEOUT
      ) {
        console.log('[WS] Ping timeout — server may be unreachable');
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

  // Refresh room list when browsing
  useEffect(() => {
    if (mode !== 'room-browser') return;
    send({ type: 'get_rooms' });
    const interval = setInterval(() => send({ type: 'get_rooms' }), 5000);
    return () => clearInterval(interval);
  }, [mode, send]);

  // ===== Actions =====
  const handleNameSubmit = useCallback(() => {
    if (playerName.trim().length < 2) return;
    const nextMode = sessionStorage.getItem('mp_nextMode');
    sessionStorage.removeItem('mp_nextMode');
    if (nextMode === 'ranked') {
      setMode('ranked');
    } else {
      setMode('room-browser');
    }
    setError(null);
  }, [playerName]);

  const createRoom = useCallback(() => {
    send({
      type: 'create_room',
      playerName: playerName.trim(),
      roomName: newRoomName.trim() || undefined,
      isPublic: true,
    });
    setMode('waiting-room');
  }, [send, playerName, newRoomName]);

  const joinRoomByCode = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a valid room code');
      return;
    }
    send({
      type: 'join_room',
      roomCode: code,
      playerName: playerName.trim(),
    });
  }, [send, joinCode, playerName]);

  const joinRoom = useCallback((room: PublicRoomInfo) => {
    send({
      type: 'join_room',
      roomCode: room.code,
      playerName: playerName.trim(),
    });
  }, [send, playerName]);

  const toggleReady = useCallback(() => {
    const me = roomState?.players.find(p => p.id === playerIdRef.current);
    if (me) {
      send({ type: 'set_ready', ready: !me.ready });
    }
  }, [send, roomState]);

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leave_room' });
    reconnectTokenRef.current = '';
    roomCodeRef.current = '';
    sessionStorage.removeItem('mp_reconnectToken');
    setRoomState(null);
    setMode('room-browser');
    setError(null);
  }, [send]);

  const requestRematch = useCallback(() => {
    send({ type: 'rematch' });
  }, [send]);

  const handleGameEnd = useCallback((winnerId: string) => {
    setGameResult({ winnerId });
    setMode('finished');
  }, []);

  const handleBackToLobby = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  // ===== Derived State =====
  const isHost = roomState?.hostId === playerIdRef.current;
  const myPlayer = roomState?.players.find(p => p.id === playerIdRef.current);
  const opponents = roomState?.players.filter(p => p.id !== playerIdRef.current) || [];
  const allReady = roomState?.players.every(p => p.ready || p.id === roomState.hostId) && (roomState?.players.length ?? 0) >= 2;

  return (
    <div className={styles.container}>
      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
          <span>
            {connectionStatus === 'connected' && 'Online'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'disconnected' && 'Offline'}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>x</button>
        </div>
      )}

      {/* Lobby */}
      {mode === 'lobby' && (
        <div className={styles.lobby}>
          <h1 className={styles.title}>BATTLE ARENA</h1>
          <p className={styles.subtitle}>MULTIPLAYER TETRIS BATTLE</p>

          <div className={styles.modeGrid}>
            <div
              className={`${styles.modeCard} ${styles.online}`}
              onClick={() => {
                if (connectionStatus !== 'connected') {
                  connectWebSocket();
                }
                setMode('name-entry');
              }}
            >
              <div className={styles.modeIcon}>VS</div>
              <div className={styles.modeTitle}>Online Battle</div>
              <p className={styles.modeDesc}>Real-time battle against other players</p>
            </div>
            <div
              className={`${styles.modeCard} ${styles.ranked}`}
              onClick={() => {
                if (connectionStatus !== 'connected') {
                  connectWebSocket();
                }
                if (playerName.trim().length >= 2) {
                  setMode('ranked');
                } else {
                  setMode('name-entry');
                  sessionStorage.setItem('mp_nextMode', 'ranked');
                }
              }}
            >
              <div className={styles.modeIcon}>RANK</div>
              <div className={styles.modeTitle}>Ranked Match</div>
              <p className={styles.modeDesc}>Climb the ranks with AI fallback matchmaking</p>
            </div>
          </div>
        </div>
      )}

      {/* Name Entry */}
      {mode === 'name-entry' && (
        <div className={styles.nameEntryScreen}>
          <div className={styles.onlineTitle}>Enter Your Name</div>
          <input
            type="text"
            className={styles.nameInput}
            placeholder="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={12}
            autoFocus
          />
          <button
            className={styles.nameBtn}
            onClick={handleNameSubmit}
            disabled={playerName.trim().length < 2}
          >
            Next
          </button>
          <button className={styles.backBtn} onClick={() => setMode('lobby')}>
            Back
          </button>
        </div>
      )}

      {/* Room Browser */}
      {mode === 'room-browser' && (
        <div className={styles.roomBrowser}>
          <div className={styles.onlineTitle}>Online Lobby</div>

          <div className={styles.playerBadge}>
            <span>{playerName}</span>
          </div>

          <div className={styles.tabWidget}>
            <div className={styles.tabHeader}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'create' ? styles.active : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create Room
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'code' ? styles.active : ''}`}
                onClick={() => setActiveTab('code')}
              >
                Enter Code
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'join' ? styles.active : ''}`}
                onClick={() => setActiveTab('join')}
              >
                Browse
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'create' && (
                <div className={styles.createForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Room Name (optional)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Friendly Match"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <button className={styles.createBtn} onClick={createRoom}>
                    Create Room
                  </button>
                </div>
              )}

              {activeTab === 'code' && (
                <div className={styles.createForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Room Code</label>
                    <input
                      type="text"
                      className={`${styles.formInput} ${styles.codeInput}`}
                      placeholder="ABCD"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      autoFocus
                    />
                  </div>
                  <button
                    className={styles.createBtn}
                    onClick={joinRoomByCode}
                    disabled={joinCode.trim().length < 4}
                  >
                    Join Room
                  </button>
                </div>
              )}

              {activeTab === 'join' && (
                <div className={styles.roomList}>
                  {rooms.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>No rooms available</p>
                      <p>Create a new room or enter a code</p>
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <div key={room.code} className={styles.roomItem} onClick={() => joinRoom(room)}>
                        <div className={styles.roomInfo}>
                          <div className={styles.roomName}>{room.name}</div>
                          <div className={styles.roomHost}>Host: {room.hostName}</div>
                        </div>
                        <div className={styles.roomPlayers}>
                          {room.playerCount}/{room.maxPlayers}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <button className={styles.backBtn} onClick={() => setMode('name-entry')}>
            Back
          </button>
        </div>
      )}

      {/* Waiting Room */}
      {mode === 'waiting-room' && roomState && (
        <div className={styles.waitingRoom}>
          <div className={styles.onlineTitle}>{roomState.name}</div>

          <div className={styles.roomCode}>
            <span className={styles.roomCodeLabel}>Room Code</span>
            <span className={styles.roomCodeValue}>{roomState.code}</span>
            <button
              className={styles.copyBtn}
              onClick={() => {
                navigator.clipboard.writeText(roomState.code);
              }}
            >
              Copy
            </button>
          </div>

          <div className={styles.playersGrid}>
            {roomState.players.map((player) => (
              <div
                key={player.id}
                className={`${styles.playerCard} ${player.ready ? styles.ready : ''} ${player.id === roomState.hostId ? styles.host : ''}`}
                style={!player.connected ? { opacity: 0.5 } : {}}
              >
                <div className={styles.playerCardName}>
                  {player.name}
                  {player.id === roomState.hostId && <span className={styles.hostBadge}>HOST</span>}
                </div>
                <div className={styles.playerStatus}>
                  {!player.connected ? 'Reconnecting...' : player.ready ? 'READY' : 'Not Ready'}
                </div>
              </div>
            ))}
            {roomState.players.length < roomState.maxPlayers && (
              <div className={`${styles.playerCard} ${styles.empty}`}>
                <div className={styles.playerCardName}>Waiting...</div>
              </div>
            )}
          </div>

          <div className={styles.waitingActions}>
            {!isHost && (
              <button
                className={`${styles.readyBtn} ${myPlayer?.ready ? styles.readyActive : ''}`}
                onClick={toggleReady}
              >
                {myPlayer?.ready ? 'Cancel Ready' : 'Ready!'}
              </button>
            )}

            {isHost && (
              <button
                className={styles.startBtn}
                onClick={startGame}
                disabled={!allReady}
              >
                {allReady ? 'Start Game' : 'Waiting for players...'}
              </button>
            )}

            <button className={styles.leaveBtn} onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>
      )}

      {/* Countdown */}
      {mode === 'countdown' && (
        <div className={styles.countdownScreen}>
          <div className={styles.countdownNumber}>
            {countdownNumber}
          </div>
        </div>
      )}

      {/* Playing */}
      {mode === 'playing' && roomState && wsRef.current && (
        <MultiplayerBattle
          ws={wsRef.current}
          roomCode={roomState.code}
          playerId={playerIdRef.current}
          playerName={playerName}
          opponents={opponents}
          gameSeed={gameSeed}
          onGameEnd={handleGameEnd}
          onBackToLobby={handleBackToLobby}
        />
      )}

      {/* Finished */}
      {mode === 'finished' && gameResult && (
        <div className={styles.resultScreen}>
          <h2 className={styles.resultTitle}>
            {gameResult.winnerId === playerIdRef.current ? 'VICTORY!' : 'DEFEAT'}
          </h2>

          <div className={styles.resultActions}>
            {isHost && (
              <button className={styles.rematchBtn} onClick={requestRematch}>
                Rematch
              </button>
            )}
            <button className={styles.leaveBtn} onClick={handleBackToLobby}>
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Ranked */}
      {mode === 'ranked' && (
        <RankedMatch
          playerName={playerName || 'Player'}
          onBack={() => setMode('lobby')}
          ws={wsRef.current}
          connectionStatus={connectionStatus}
          playerId={playerIdRef.current}
        />
      )}
    </div>
  );
}
