'use client';

import { useState, useEffect, useCallback } from 'react';
import { UseGameSocketReturn } from '@/hooks/useGameSocket';
import { RoomState } from '@/types/game';

interface GamePlayProps {
  gameSocket: UseGameSocketReturn;
}

export default function GamePlay({ gameSocket }: GamePlayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isCountdown, setIsCountdown] = useState(true);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(0);

  // Calculate time remaining
  useEffect(() => {
    if (!gameSocket.gameStartTime || !gameSocket.gameDuration) return;

    const updateTimer = () => {
      const now = Date.now();
      const startTime = gameSocket.gameStartTime!;
      const gameEnd = startTime + gameSocket.gameDuration! * 1000;

      if (now < startTime) {
        // Countdown phase
        const countdown = Math.ceil((startTime - now) / 1000);
        setCountdownValue(countdown);
        setIsCountdown(true);
      } else if (now < gameEnd) {
        // Game active
        const remaining = Math.ceil((gameEnd - now) / 1000);
        setTimeRemaining(remaining);
        setIsCountdown(false);
        setCountdownValue(null);
      } else {
        // Game ended
        setTimeRemaining(0);
        setIsCountdown(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [gameSocket.gameStartTime, gameSocket.gameDuration]);

  const handleClick = useCallback(() => {
    if (gameSocket.roomState === RoomState.ACTIVE && timeRemaining && timeRemaining > 0) {
      setClickCount((prev) => prev + 1);
      gameSocket.submitScoreEvent({
        type: 'click',
        value: 10,
        timestamp: Date.now(),
      });
    }
  }, [gameSocket, timeRemaining]);

  const sortedPlayers = [...gameSocket.players].sort((a, b) => b.score - a.score);
  const currentPlayer = gameSocket.currentPlayer;

  if (isCountdown && countdownValue !== null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-8">Game Starting In</h2>
          <div className="text-9xl font-bold animate-pulse bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            {countdownValue}
          </div>
          <p className="text-2xl mt-8 text-gray-300">Get Ready!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer and Score HUD */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Timer */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-6 border border-red-500/30 shadow-2xl text-center">
          <div className="text-sm text-gray-300 mb-2">Time Remaining</div>
          <div className="text-6xl font-bold font-mono">
            {timeRemaining !== null ? `${timeRemaining}s` : '--'}
          </div>
        </div>

        {/* Your Score */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 shadow-2xl text-center">
          <div className="text-sm text-gray-300 mb-2">Your Score</div>
          <div className="text-6xl font-bold">
            {currentPlayer?.score || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {clickCount} clicks
          </div>
        </div>
      </div>

      {/* Click Area */}
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={gameSocket.roomState !== RoomState.ACTIVE || !timeRemaining}
          className="w-full h-64 bg-gradient-to-br from-yellow-400/30 to-pink-500/30 backdrop-blur-lg rounded-2xl border-4 border-yellow-500/50 shadow-2xl hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
        >
          <div className="text-4xl font-bold mb-2">CLICK ME!</div>
          <div className="text-lg text-gray-300">+10 Points per Click</div>
        </button>
        
        {gameSocket.roomState !== RoomState.ACTIVE && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
            <div className="text-2xl font-bold">Game Ended</div>
          </div>
        )}
      </div>

      {/* Live Scoreboard */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Live Scoreboard</h2>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl ${
                player.id === gameSocket.socket?.id
                  ? 'bg-blue-500/30 border-2 border-blue-500/50'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`text-2xl font-bold w-8 ${
                    index === 0
                      ? 'text-yellow-400'
                      : index === 1
                      ? 'text-gray-300'
                      : index === 2
                      ? 'text-orange-400'
                      : 'text-gray-500'
                  }`}
                >
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <span className="text-lg font-semibold">{player.name}</span>
                {player.id === gameSocket.socket?.id && (
                  <span className="text-xs bg-blue-500/50 px-2 py-1 rounded">YOU</span>
                )}
              </div>
              <div className="text-2xl font-bold">{player.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
