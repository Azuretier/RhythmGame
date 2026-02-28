'use client';

import { useState } from 'react';
import { UseGameSocketReturn } from '@/hooks/useGameSocket';
import GlassCard from '@/components/ui/GlassCard';

interface CreateJoinRoomProps {
  gameSocket: UseGameSocketReturn;
  playerName: string;
  setPlayerName: (name: string) => void;
}

export default function CreateJoinRoom({
  gameSocket,
  playerName,
  setPlayerName,
}: CreateJoinRoomProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      return;
    }

    setIsCreating(true);
    const result = await gameSocket.createRoom(playerName.trim());
    if (!result.success) {
      alert(result.error || 'Failed to create room');
    }
    setIsCreating(false);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      return;
    }

    setIsJoining(true);
    const result = await gameSocket.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    if (!result.success) {
      alert(result.error || 'Failed to join room');
    }
    setIsJoining(false);
  };

  return (
    <div className="space-y-8">
      {/* Player Name Input */}
      <GlassCard>
        <label className="block text-center mb-4 text-xl font-semibold">
          Enter Your Name
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="w-full px-6 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center text-lg"
        />
      </GlassCard>

      {/* Create or Join */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Room */}
        <GlassCard variant="gradient" gradient="yellow-pink">
          <h2 className="text-2xl font-bold mb-4 text-center">Create Room</h2>
          <p className="text-gray-300 text-center mb-6">
            Start a new game and invite friends
          </p>
          <button
            onClick={handleCreateRoom}
            disabled={!playerName.trim() || isCreating || !gameSocket.isConnected}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </GlassCard>

        {/* Join Room */}
        <GlassCard variant="gradient" gradient="blue-purple">
          <h2 className="text-2xl font-bold mb-4 text-center">Join Room</h2>
          <p className="text-gray-300 text-center mb-4">
            Enter a room code to join
          </p>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
            className="w-full px-6 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-lg font-mono mb-4"
          />
          <button
            onClick={handleJoinRoom}
            disabled={
              !playerName.trim() ||
              !roomCode.trim() ||
              isJoining ||
              !gameSocket.isConnected
            }
            className="w-full py-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </GlassCard>
      </div>

      {/* Info */}
      <GlassCard variant="subtle" className="text-center">
        <h3 className="text-lg font-semibold mb-2">How to Play</h3>
        <p className="text-gray-300 text-sm">
          Create a room or join with a code. The host starts the game, and everyone
          competes to get the highest score within the time limit. Click or tap to
          score points!
        </p>
      </GlassCard>
    </div>
  );
}
