'use client';

import { useState, useEffect } from 'react';
import type { WarfrontSocketState } from '@/hooks/useWarfrontSocket';
import type { WarfrontRole, WarfrontGameMode } from '@/types/warfront';
import { WF_ROLE_INFO } from '@/types/warfront';
import styles from './WarfrontLobby.module.css';

interface WarfrontLobbyProps {
  wf: WarfrontSocketState;
}

export default function WarfrontLobby({ wf }: WarfrontLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameMode, setGameMode] = useState<WarfrontGameMode>('teams');

  useEffect(() => {
    if (wf.phase === 'menu' && wf.connectionStatus === 'connected') {
      wf.getRooms();
    }
  }, [wf.phase, wf.connectionStatus]);

  // Menu phase — create or join
  if (wf.phase === 'menu') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>WARFRONT</h1>
          <p className={styles.subtitle}>Combined Game Mode</p>
          <div className={styles.connectionStatus}>
            {wf.connectionStatus === 'connected' ? '● Connected' : '○ Connecting...'}
          </div>
        </div>

        <div className={styles.menuContent}>
          {/* Create Room */}
          <div className={styles.card}>
            <h2>Create Room</h2>
            <input
              className={styles.input}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
            />
            <div className={styles.modeSelector}>
              <button
                className={`${styles.modeButton} ${gameMode === 'teams' ? styles.modeActive : ''}`}
                onClick={() => setGameMode('teams')}
              >
                Team vs Team
              </button>
              <button
                className={`${styles.modeButton} ${gameMode === 'ffa' ? styles.modeActive : ''}`}
                onClick={() => setGameMode('ffa')}
              >
                Free for All
              </button>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() => wf.createRoom(playerName || 'Player', gameMode)}
              disabled={wf.connectionStatus !== 'connected'}
            >
              Create Room
            </button>
          </div>

          {/* Join Room */}
          <div className={styles.card}>
            <h2>Join Room</h2>
            <input
              className={styles.input}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
            />
            <input
              className={styles.input}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={5}
            />
            <button
              className={styles.primaryButton}
              onClick={() => wf.joinRoom(joinCode, playerName || 'Player')}
              disabled={!joinCode || wf.connectionStatus !== 'connected'}
            >
              Join Room
            </button>
          </div>

          {/* Room List */}
          {wf.rooms.length > 0 && (
            <div className={styles.card}>
              <h2>Open Rooms</h2>
              <div className={styles.roomList}>
                {wf.rooms.map((room) => (
                  <div key={room.code} className={styles.roomItem}>
                    <div className={styles.roomInfo}>
                      <span className={styles.roomName}>{room.name}</span>
                      <span className={styles.roomMeta}>
                        {room.playerCount}/{room.maxPlayers} &bull; {room.mode} &bull; {room.status}
                      </span>
                    </div>
                    <button
                      className={styles.joinButton}
                      onClick={() => wf.joinRoom(room.code, playerName || 'Player')}
                      disabled={room.status !== 'waiting'}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lobby phase — role selection, team selection, ready up
  if (wf.phase === 'lobby' && wf.roomState) {
    const players = Object.values(wf.roomState.players);
    const isHost = wf.roomState.hostId === wf.playerId;
    const myPlayer = wf.playerId ? wf.roomState.players[wf.playerId] : null;
    const allReady = players.length >= 2 && players.every(p => p.ready);

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>WARFRONT</h1>
          <div className={styles.roomCodeDisplay}>
            Room: <span className={styles.code}>{wf.roomCode}</span>
            <span className={styles.modeBadge}>{wf.roomState.mode.toUpperCase()}</span>
          </div>
        </div>

        <div className={styles.lobbyContent}>
          {/* Role Selection */}
          <div className={styles.card}>
            <h2>Select Role</h2>
            <div className={styles.roleGrid}>
              {(Object.keys(WF_ROLE_INFO) as WarfrontRole[]).map((role) => {
                const info = WF_ROLE_INFO[role];
                const isSelected = myPlayer?.role === role;
                return (
                  <button
                    key={role}
                    className={`${styles.roleCard} ${isSelected ? styles.roleSelected : ''}`}
                    onClick={() => wf.selectRole(role)}
                  >
                    <span className={styles.roleIcon}>{info.icon}</span>
                    <span className={styles.roleLabel}>{info.label}</span>
                    <span className={styles.roleDesc}>{info.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Selection (teams mode only) */}
          {wf.roomState.mode === 'teams' && (
            <div className={styles.card}>
              <h2>Select Team</h2>
              <div className={styles.teamSelector}>
                {wf.roomState.teams.map((team) => {
                  const teamPlayers = players.filter(p => p.teamId === team.id);
                  const isMyTeam = myPlayer?.teamId === team.id;
                  return (
                    <button
                      key={team.id}
                      className={`${styles.teamCard} ${isMyTeam ? styles.teamSelected : ''}`}
                      style={{ borderColor: team.color }}
                      onClick={() => wf.selectTeam(team.id)}
                    >
                      <span className={styles.teamName} style={{ color: team.color }}>{team.name}</span>
                      <span className={styles.teamCount}>{teamPlayers.length} players</span>
                      <div className={styles.teamPlayerList}>
                        {teamPlayers.map(p => (
                          <span key={p.id} className={styles.teamPlayerName}>
                            {p.name} ({WF_ROLE_INFO[p.role].label})
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Players List */}
          <div className={styles.card}>
            <h2>Players ({players.length}/{wf.roomState.maxPlayers})</h2>
            <div className={styles.playerList}>
              {players.map((player) => (
                <div key={player.id} className={styles.playerRow}>
                  <span className={styles.playerName}>
                    {player.name}
                    {player.id === wf.roomState!.hostId && <span className={styles.hostBadge}>HOST</span>}
                  </span>
                  <span className={styles.playerRole}>{WF_ROLE_INFO[player.role].label}</span>
                  <span className={player.ready ? styles.readyYes : styles.readyNo}>
                    {player.ready ? 'READY' : 'NOT READY'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={wf.leaveRoom}>
              Leave
            </button>
            <button
              className={myPlayer?.ready ? styles.unreadyButton : styles.readyButton}
              onClick={() => wf.setReady(!myPlayer?.ready)}
            >
              {myPlayer?.ready ? 'Cancel Ready' : 'Ready Up'}
            </button>
            {isHost && (
              <button
                className={styles.startButton}
                onClick={wf.startGame}
                disabled={!allReady}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
