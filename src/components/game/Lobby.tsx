'use client';

import { UseGameSocketReturn } from '@/hooks/useGameSocket';
import { GAME_CONFIG } from '@/types/game';
import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';

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
      <GlassCard variant="gradient" gradient="yellow-pink" className="text-center">
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
      </GlassCard>

      {/* Players List */}
      <GlassCard>
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
                <StatusDot connected={player.connected} />
                <span className="text-lg font-semibold">{player.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {player.isHost && (
                  <Badge variant="host">👑 Host</Badge>
                )}
                {player.id === gameSocket.socket?.id && (
                  <Badge variant="you">You</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

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
          <GlassCard variant="subtle" className="text-center">
            <p className="text-gray-300">
              Waiting for host to start the game...
            </p>
          </GlassCard>
        )}

        <button
          onClick={handleLeaveRoom}
          className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl font-semibold transition-colors"
        >
          Leave Room
        </button>
      </div>

      {/* Game Info */}
      <GlassCard variant="subtle" className="text-center">
        <h3 className="text-lg font-semibold mb-2">Game Rules</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>⏱️ Game Duration: 60 seconds</li>
          <li>🎯 Click/Tap to score points</li>
          <li>🏆 Highest score wins</li>
          <li>📊 Live scoreboard updates</li>
        </ul>
      </GlassCard>
    </div>
  );
}
