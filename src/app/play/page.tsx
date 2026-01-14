'use client';

import { useState } from 'react';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { RoomPhase } from '@/types/multiplayer';

export default function PlayPage() {
  const multiplayer = useMultiplayer();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Render connection status
  const renderConnectionStatus = () => (
    <div className="flex justify-center mb-4">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          multiplayer.isConnected
            ? 'bg-green-500/20 border border-green-500/50'
            : 'bg-red-500/20 border border-red-500/50'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            multiplayer.isConnected ? 'bg-green-400' : 'bg-red-400'
          } animate-pulse`}
        />
        <span className="text-sm">
          {multiplayer.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );

  // Render create/join interface
  const renderCreateJoin = () => (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 shadow-xl border border-white/20">
      <h2 className="text-3xl font-bold mb-6 text-center">Join or Create Room</h2>
      
      <div className="space-y-6">
        {/* Player Name Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Create Room */}
        <div>
          <button
            onClick={() => {
              if (playerName.trim()) {
                multiplayer.createRoom(playerName);
              }
            }}
            disabled={!playerName.trim() || !multiplayer.isConnected}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Create New Room
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-sm text-gray-400">OR</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Join Room */}
        <div>
          <label className="block text-sm font-medium mb-2">Room Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            maxLength={6}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 focus:border-purple-500 focus:outline-none uppercase"
          />
        </div>

        <button
          onClick={() => {
            if (playerName.trim() && joinCode.trim()) {
              multiplayer.joinRoom(joinCode, playerName);
            }
          }}
          disabled={!playerName.trim() || !joinCode.trim() || !multiplayer.isConnected}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Join Room
        </button>
      </div>
    </div>
  );

  // Render lobby
  const renderLobby = () => {
    if (!multiplayer.roomState) return null;

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 shadow-xl border border-white/20">
        {/* Room Code Display */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Room Code</h2>
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-4 rounded-lg">
            <span className="text-4xl font-mono font-bold tracking-wider text-white">
              {multiplayer.roomCode}
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-2">Share this code with friends</p>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">
            Players ({multiplayer.roomState.players.length}/{multiplayer.roomState.maxPlayers})
          </h3>
          <div className="space-y-2">
            {multiplayer.roomState.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  player.id === multiplayer.playerId
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      player.connected ? 'bg-green-400' : 'bg-gray-400'
                    }`}
                  />
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/50">
                      HOST
                    </span>
                  )}
                </div>
                <div>
                  {!player.isHost && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        player.isReady
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}
                    >
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready/Start Controls */}
        <div className="space-y-3">
          {!multiplayer.isHost ? (
            <button
              onClick={() => multiplayer.setReady(!multiplayer.currentPlayer?.isReady)}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition ${
                multiplayer.currentPlayer?.isReady
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {multiplayer.currentPlayer?.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          ) : (
            <button
              onClick={() => multiplayer.startGame()}
              disabled={!multiplayer.canStartGame}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {multiplayer.canStartGame ? 'Start Game' : 'Waiting for players...'}
            </button>
          )}

          <button
            onClick={() => multiplayer.leaveRoom()}
            className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg font-semibold transition"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  };

  // Render game in progress
  const renderGame = () => {
    if (!multiplayer.roomState) return null;

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 shadow-xl border border-white/20">
        <h2 className="text-3xl font-bold mb-6 text-center">Game In Progress</h2>
        <div className="text-center">
          <p className="text-lg mb-4">Room: {multiplayer.roomCode}</p>
          <p className="text-gray-300 mb-6">
            Game is running! Implement your game logic here.
          </p>
          
          {/* Player scores or game state could go here */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Players</h3>
            <div className="space-y-2">
              {multiplayer.roomState.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-lg"
                >
                  <span>{player.name}</span>
                  {player.isHost && <span className="text-yellow-400 text-sm">HOST</span>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => multiplayer.leaveRoom()}
            className="px-6 py-3 bg-red-600/80 hover:bg-red-700/80 rounded-lg font-semibold transition"
          >
            Leave Game
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Multiplayer Game
          </h1>
          <p className="text-gray-300 text-lg">
            Host or Join - Play Together!
          </p>
        </div>

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {!multiplayer.roomCode && renderCreateJoin()}
          {multiplayer.roomCode && multiplayer.roomState?.phase === RoomPhase.LOBBY && renderLobby()}
          {multiplayer.roomCode && multiplayer.roomState?.phase === RoomPhase.PLAYING && renderGame()}
        </div>

        {/* Error Display */}
        {multiplayer.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
            {multiplayer.error}
          </div>
        )}
      </div>
    </div>
  );
}
