'use client';

import { UseGameSocketReturn } from '@/hooks/useGameSocket';

interface LeaderboardProps {
  gameSocket: UseGameSocketReturn;
}

export default function Leaderboard({ gameSocket }: LeaderboardProps) {
  const leaderboard = gameSocket.leaderboard.length > 0 
    ? gameSocket.leaderboard 
    : [...gameSocket.players].sort((a, b) => b.score - a.score);
  
  const currentPlayer = gameSocket.currentPlayer;
  const currentPlayerRank = leaderboard.findIndex(p => p.id === currentPlayer?.id) + 1;

  const handleBackToLobby = () => {
    // The server automatically returns to lobby after 10 seconds
    // This is just for UI feedback
  };

  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave?')) {
      gameSocket.leaveRoom();
    }
  };

  return (
    <div className="space-y-6">
      {/* Final Results Header */}
      <div className="text-center bg-gradient-to-r from-yellow-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-8 border border-yellow-500/30 shadow-2xl">
        <h1 className="text-4xl font-bold mb-2">🎉 Game Over! 🎉</h1>
        <p className="text-xl text-gray-300">Final Results</p>
      </div>

      {/* Your Result */}
      {currentPlayer && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 shadow-2xl text-center">
          <div className="text-lg text-gray-300 mb-2">Your Performance</div>
          <div className="flex items-center justify-center gap-8 mb-4">
            <div>
              <div className="text-sm text-gray-400">Rank</div>
              <div className="text-5xl font-bold">
                {currentPlayerRank === 1 && '🥇'}
                {currentPlayerRank === 2 && '🥈'}
                {currentPlayerRank === 3 && '🥉'}
                {currentPlayerRank > 3 && `#${currentPlayerRank}`}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Score</div>
              <div className="text-5xl font-bold">{currentPlayer.score}</div>
            </div>
          </div>
          {currentPlayerRank === 1 && (
            <div className="text-2xl font-bold text-yellow-400 animate-pulse">
              🏆 WINNER! 🏆
            </div>
          )}
        </div>
      )}

      {/* Final Leaderboard */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center">Final Leaderboard</h2>
        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-6 rounded-xl transition-all ${
                player.id === currentPlayer?.id
                  ? 'bg-blue-500/30 border-2 border-blue-500/50 scale-105'
                  : 'bg-white/5 border border-white/10'
              } ${
                index === 0
                  ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20'
                  : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold w-12">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && (
                    <span className="text-gray-400 text-2xl">#{index + 1}</span>
                  )}
                </div>
                <div>
                  <div className="text-xl font-bold flex items-center gap-2">
                    {player.name}
                    {player.id === currentPlayer?.id && (
                      <span className="text-xs bg-blue-500/50 px-2 py-1 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-3xl font-bold">{player.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-gray-300">
            Returning to lobby in a moment...
          </p>
        </div>
        
        <button
          onClick={handleLeaveRoom}
          className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl font-semibold transition-colors"
        >
          Leave Room
        </button>
      </div>

      {/* Share Results */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center">
        <h3 className="text-lg font-semibold mb-2">Share Your Results</h3>
        <p className="text-gray-300 text-sm mb-4">
          Tell your friends about your {currentPlayerRank === 1 ? 'victory' : 'score'}!
        </p>
        <div className="text-xs text-gray-400">
          Room Code: <span className="font-mono font-bold text-white">{gameSocket.roomCode}</span>
        </div>
      </div>
    </div>
  );
}
