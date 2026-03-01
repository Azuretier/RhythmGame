'use client';

// =============================================================================
// Minecraft: Switch Edition — Pause Menu
// Displayed when pressing Escape during gameplay.
// Provides resume, settings, statistics, and quit options.
// =============================================================================

import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PlayerPosition } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  seed: number;
  playerPosition: PlayerPosition;
  dayCount: number;
  showCoordinates: boolean;
}

// ---------------------------------------------------------------------------
// Minecraft-style button
// ---------------------------------------------------------------------------

function McButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full py-2.5 px-6 font-pixel text-sm text-white transition-all',
        'border-2 active:translate-y-[1px]',
        'select-none cursor-pointer',
        variant === 'danger'
          ? [
              'bg-gradient-to-b from-red-700 to-red-900',
              'border-t-red-500 border-l-red-500 border-b-red-950 border-r-red-950',
              'hover:from-red-600 hover:to-red-800',
              'active:from-red-800 active:to-red-900',
            ]
          : [
              'bg-gradient-to-b from-gray-500 to-gray-700',
              'border-t-gray-400 border-l-gray-400 border-b-gray-800 border-r-gray-800',
              'hover:from-gray-400 hover:to-gray-600',
              'active:from-gray-600 active:to-gray-700',
            ],
      )}
      style={{
        textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main PauseMenu Component
// ---------------------------------------------------------------------------

export default function PauseMenu({
  onResume,
  onQuit,
  seed,
  playerPosition,
  dayCount,
  showCoordinates,
}: PauseMenuProps) {
  // Resume on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onResume]);

  const handleSettings = useCallback(() => {
    alert('Settings are not yet available in this version.');
  }, []);

  const handleStatistics = useCallback(() => {
    alert('Statistics are not yet available in this version.');
  }, []);

  // Format coordinates
  const coordsText = `XYZ: ${Math.floor(playerPosition.x)} / ${Math.floor(playerPosition.y)} / ${Math.floor(playerPosition.z)}`;
  const facingText = (() => {
    const yaw = ((playerPosition.yaw % 360) + 360) % 360;
    if (yaw >= 315 || yaw < 45) return 'South (+Z)';
    if (yaw >= 45 && yaw < 135) return 'West (-X)';
    if (yaw >= 135 && yaw < 225) return 'North (-Z)';
    return 'East (+X)';
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
    >
      <div className="flex flex-col items-center gap-2 w-full max-w-xs px-4">
        {/* Title */}
        <h2
          className="font-pixel text-xl text-white mb-4"
          style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
        >
          Game Menu
        </h2>

        {/* Menu buttons */}
        <McButton onClick={onResume}>Back to Game</McButton>

        <div className="h-1" />

        <McButton onClick={handleSettings}>Settings</McButton>
        <McButton onClick={handleStatistics}>Statistics</McButton>

        <div className="h-1" />

        <McButton onClick={onQuit} variant="danger">
          Save and Quit to Title
        </McButton>

        {/* Game info at bottom */}
        <div className="mt-6 flex flex-col items-center gap-1">
          <div className="font-pixel text-[10px] text-gray-400">
            Seed: {seed}
          </div>
          {showCoordinates && (
            <>
              <div className="font-pixel text-[10px] text-gray-400">
                {coordsText}
              </div>
              <div className="font-pixel text-[10px] text-gray-400">
                Facing: {facingText}
              </div>
            </>
          )}
          <div className="font-pixel text-[10px] text-gray-400">
            Day {dayCount}
          </div>
        </div>
      </div>
    </div>
  );
}
