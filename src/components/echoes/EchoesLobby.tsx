'use client';

// =============================================================
// Echoes of Eternity — Multiplayer Lobby
// =============================================================

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import { useEchoesSocket } from '@/hooks/useEchoesSocket';
import { ECHOES_CONFIG, ELEMENT_COLORS } from '@/types/echoes';
import { getCharacter } from '@/lib/echoes/characters';

export function EchoesLobby() {
  const { state, setPhase } = useEchoes();
  const {
    connectionStatus, connectWebSocket, playerId,
    phase, lobbyState, error, countdownNumber,
    createLobby, joinLobby, leaveLobby, setReady, startGame,
    selectCharacter,
  } = useEchoesSocket();

  const [lobbyCode, setLobbyCode] = useState('');
  const [lobbyName, setLobbyName] = useState('');

  // Auto-connect on mount
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      connectWebSocket();
    }
  }, [connectionStatus, connectWebSocket]);

  const handleCreate = useCallback(() => {
    if (!state.playerData.name) return;
    createLobby(state.playerData.name, state.selectedMode || 'story', lobbyName || undefined);
  }, [state.playerData.name, state.selectedMode, lobbyName, createLobby]);

  const handleJoin = useCallback(() => {
    if (!state.playerData.name || !lobbyCode) return;
    joinLobby(lobbyCode, state.playerData.name);
  }, [state.playerData.name, lobbyCode, joinLobby]);

  const handleBack = useCallback(() => {
    leaveLobby();
    setPhase('main_menu');
  }, [leaveLobby, setPhase]);

  const handleCharacterSelect = useCallback((characterId: string) => {
    selectCharacter(characterId);
  }, [selectCharacter]);

  const isHost = lobbyState?.hostId === playerId;
  const allReady = lobbyState?.players.every(p => p.ready) ?? false;
  const canStart = isHost && allReady && (lobbyState?.players.length || 0) >= 1;

  const maxPlayers = (() => {
    switch (state.selectedMode) {
      case 'battle_royale': return ECHOES_CONFIG.MAX_PLAYERS_BR;
      case 'ranked_match': return ECHOES_CONFIG.MAX_PLAYERS_RANKED;
      case 'endless_dungeon': return ECHOES_CONFIG.MAX_PLAYERS_DUNGEON;
      default: return ECHOES_CONFIG.MAX_PLAYERS_STORY;
    }
  })();

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-2xl">
        <button onClick={handleBack} className="text-zinc-500 hover:text-zinc-300 text-sm mb-4">
          &larr; Back to Menu
        </button>

        <h1 className="text-2xl font-bold mb-1">
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Multiplayer Lobby
          </span>
        </h1>
        <p className="text-sm text-zinc-500 mb-6 capitalize">
          Mode: {(state.selectedMode || 'story').replace(/_/g, ' ')}
        </p>

        {/* Connection status */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`} />
          <span className="text-xs text-zinc-500 capitalize">{connectionStatus}</span>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded px-3 py-2 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {/* Pre-join state: create or join */}
        {!lobbyState && phase !== 'countdown' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-zinc-300 mb-3">Create a Lobby</h3>
              <input
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                placeholder="Lobby name (optional)"
                maxLength={30}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 mb-3"
              />
              <button
                onClick={handleCreate}
                disabled={connectionStatus !== 'connected'}
                className="w-full py-2 rounded font-bold text-sm bg-gradient-to-r from-purple-500 to-cyan-500 text-black disabled:opacity-30 hover:from-purple-400 hover:to-cyan-400 transition-all"
              >
                CREATE LOBBY
              </button>
            </div>

            <div className="text-center text-zinc-600 text-xs">— or —</div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-zinc-300 mb-3">Join a Lobby</h3>
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                placeholder="Enter lobby code"
                maxLength={8}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 mb-3 uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={connectionStatus !== 'connected' || !lobbyCode}
                className="w-full py-2 rounded font-bold text-sm bg-zinc-700 text-white disabled:opacity-30 hover:bg-zinc-600 transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        )}

        {/* Lobby View */}
        {lobbyState && (
          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-zinc-300">{lobbyState.name || 'Lobby'}</div>
                  <div className="text-xs text-zinc-500">Code: <span className="font-mono text-purple-400">{lobbyState.code}</span></div>
                </div>
                <div className="text-xs text-zinc-500">
                  {lobbyState.players.length}/{maxPlayers}
                </div>
              </div>

              {/* Player List */}
              <div className="space-y-2">
                {lobbyState.players.map((player) => {
                  const char = player.selectedCharacter ? getCharacter(player.selectedCharacter) : null;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {char && (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `${ELEMENT_COLORS[char.element]}20`,
                              color: ELEMENT_COLORS[char.element],
                            }}
                          >
                            {char.icon}
                          </div>
                        )}
                        <span className="text-sm text-zinc-200">{player.name}</span>
                        {player.id === lobbyState.hostId && (
                          <span className="text-xs text-yellow-500">HOST</span>
                        )}
                      </div>
                      <div className={`text-xs font-bold ${player.ready ? 'text-green-400' : 'text-zinc-600'}`}>
                        {player.ready ? 'READY' : 'NOT READY'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Character Selection */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-zinc-300 mb-3">Select Character</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {state.playerData.characters.map(owned => {
                  const char = getCharacter(owned.characterId);
                  if (!char) return null;
                  const myPlayer = lobbyState.players.find(p => p.id === playerId);
                  const isSelected = myPlayer?.selectedCharacter === char.id;

                  return (
                    <button
                      key={char.id}
                      onClick={() => handleCharacterSelect(char.id)}
                      className={`p-2 rounded border text-center transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className="w-8 h-8 mx-auto rounded flex items-center justify-center text-sm font-bold mb-1"
                        style={{
                          backgroundColor: `${ELEMENT_COLORS[char.element]}20`,
                          color: ELEMENT_COLORS[char.element],
                        }}
                      >
                        {char.icon}
                      </div>
                      <div className="text-xs text-zinc-300 truncate">{char.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setReady(true)}
                className="flex-1 py-2 rounded font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition-all"
              >
                READY
              </button>
              {canStart && (
                <button
                  onClick={startGame}
                  className="flex-1 py-2 rounded font-bold text-sm bg-gradient-to-r from-purple-500 to-cyan-500 text-black hover:from-purple-400 hover:to-cyan-400 transition-all"
                >
                  START GAME
                </button>
              )}
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdownNumber !== null && (
          <motion.div
            key={countdownNumber}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-7xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {countdownNumber}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
