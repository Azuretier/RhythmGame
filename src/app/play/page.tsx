'use client';

import { useState } from 'react';
import { useGameSocket } from '@/hooks/useGameSocket';
import { RoomState } from '@/types/game';
import CreateJoinRoom from '@/components/game/CreateJoinRoom';
import Lobby from '@/components/game/Lobby';
import GamePlay from '@/components/game/GamePlay';
import Leaderboard from '@/components/game/Leaderboard';

export default function PlayPage() {
  const gameSocket = useGameSocket();
  const [playerName, setPlayerName] = useState('');

  const renderContent = () => {
    // Not in a room - show create/join interface
    if (!gameSocket.roomId) {
      return (
        <CreateJoinRoom
          gameSocket={gameSocket}
          playerName={playerName}
          setPlayerName={setPlayerName}
        />
      );
    }

    // In lobby - show lobby UI
    if (gameSocket.roomState === RoomState.LOBBY) {
      return <Lobby gameSocket={gameSocket} />;
    }

    // Game is in countdown or active - show game UI
    if (
      gameSocket.roomState === RoomState.COUNTDOWN ||
      gameSocket.roomState === RoomState.ACTIVE
    ) {
      return <GamePlay gameSocket={gameSocket} />;
    }

    // Game finished - show leaderboard
    if (gameSocket.roomState === RoomState.FINISHED) {
      return <Leaderboard gameSocket={gameSocket} />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Score Attack
          </h1>
          <p className="text-gray-300 text-lg">
            Multiplayer Real-Time Challenge
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              gameSocket.isConnected
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-red-500/20 border border-red-500/50'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                gameSocket.isConnected ? 'bg-green-400' : 'bg-red-400'
              } animate-pulse`}
            />
            <span className="text-sm">
              {gameSocket.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">{renderContent()}</div>

        {/* Error Display */}
        {gameSocket.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {gameSocket.error}
          </div>
        )}
      </div>
    </div>
  );
}
