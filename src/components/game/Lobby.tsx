'use client';

import { UseGameSocketReturn } from '@/hooks/useGameSocket';
import { GAME_CONFIG } from '@/types/game';
import { useState } from 'react';

interface LobbyProps {
  gameSocket: UseGameSocketReturn;
}

export default function Lobby({ gameSocket }: LobbyProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartGame = async () => {
    setIsStarting(true);
    const result = await gameSocket.startGame();
    if (!result.success) {
      alert(result.error || 'Failed to start game');
      setIsStarting(false);
    }
  };

  const handleCopyCode = () => {
    if (gameSocket.roomCode) {
      navigator.clipboard.writeText(gameSocket.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave the room?')) {
      gameSocket.leaveRoom();
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Code Display */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-8 border border-yellow-500/30 shadow-2xl text-center">
        <h2 className="text-2xl font-bold mb-4">Room Code</h2>
        <div className="flex items-center justify-center gap-4">
          <div className="text-5xl font-bold font-mono tracking-widest bg-white/10 px-8 py-4 rounded-xl">
            {gameSocket.roomCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p className="text-gray-300 mt-4">Share this code with friends to join</p>
      </div>

      {/* Players List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Players ({gameSocket.players.length}/{GAME_CONFIG.MAX_PLAYERS})
        </h2>
        <div className="space-y-3">
          {gameSocket.players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl ${
                player.connected
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    player.connected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-lg font-semibold">{player.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {player.isHost && (
                  <span className="px-3 py-1 bg-yellow-500/30 border border-yellow-500/50 rounded-full text-sm font-semibold">
                    👑 Host
                  </span>
                )}
                {player.id === gameSocket.socket?.id && (
                  <span className="px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full text-sm font-semibold">
                    You
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {gameSocket.isHost && (
          <button
            onClick={handleStartGame}
            disabled={isStarting || gameSocket.players.length < 1}
            className="w-full py-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            {isStarting ? 'Starting...' : 'Start Game'}
          </button>
        )}

        {!gameSocket.isHost && (
          <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-300">
              Waiting for host to start the game...
            </p>
          </div>
        )}

        <button
          onClick={handleLeaveRoom}
          className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl font-semibold transition-colors"
        >
          Leave Room
        </button>
      </div>

      {/* Game Info */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center">
        <h3 className="text-lg font-semibold mb-2">Game Rules</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>⏱️ Game Duration: 60 seconds</li>
          <li>🎯 Click/Tap to score points</li>
          <li>🏆 Highest score wins</li>
          <li>📊 Live scoreboard updates</li>
        </ul>
      </div>
    </div>
  );
}
