'use client';

// =============================================================
// Echoes of Eternity — In-Game HUD Overlay
// =============================================================

import { useEchoes } from '@/lib/echoes/context';
import { ECHOES_RANKED_TIERS } from '@/types/echoes';

export function GameHUD() {
  const { state } = useEchoes();
  const { playerData, gamePhase } = state;

  const tierInfo = ECHOES_RANKED_TIERS.find(t => t.tier === playerData.ranked.tier);

  return (
    <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
        {/* Left: Player info */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="text-xs">
            <span className="text-purple-400 font-bold">{playerData.name}</span>
            <span className="text-zinc-500 ml-1">Lv.{playerData.level}</span>
          </div>
        </div>

        {/* Center: Game phase */}
        <div className="text-xs text-zinc-500 uppercase tracking-wider">
          {gamePhase.replace(/_/g, ' ')}
        </div>

        {/* Right: Resources */}
        <div className="flex items-center gap-3 text-xs pointer-events-auto">
          <span className="text-yellow-400">{playerData.resources.gold || 0}G</span>
          {tierInfo && (
            <span style={{ color: tierInfo.color }} className="font-bold">
              {tierInfo.icon}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
