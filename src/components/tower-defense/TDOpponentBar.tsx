'use client';

import { motion } from 'framer-motion';
import { Heart, Trophy, Zap, Skull, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TDOpponentBarProps {
  opponents: Array<{
    playerId: string;
    playerName: string;
    lives: number;
    maxLives: number;
    score: number;
    sendPoints: number;
    towerCount: number;
    enemyCount: number;
    eliminated: boolean;
  }>;
  selectedTarget: string | null;
  onSelectTarget: (playerId: string) => void;
}

function TowerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="1" width="4" height="2" rx="0.5" fill="currentColor" />
      <rect x="3" y="3" width="6" height="7" rx="0.5" fill="currentColor" />
      <rect x="5" y="7" width="2" height="3" rx="0.3" fill="rgba(15,23,42,0.6)" />
    </svg>
  );
}

function EnemyCountIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="4" r="2.5" fill="currentColor" />
      <ellipse cx="6" cy="10" rx="4" ry="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="5" cy="3.5" r="0.5" fill="rgba(15,23,42,0.8)" />
      <circle cx="7" cy="3.5" r="0.5" fill="rgba(15,23,42,0.8)" />
    </svg>
  );
}

export default function TDOpponentBar({
  opponents,
  selectedTarget,
  onSelectTarget,
}: TDOpponentBarProps) {
  return (
    <motion.div
      className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-20',
        'flex flex-row gap-2 px-3 py-2',
        'bg-slate-900/[0.92] backdrop-blur-2xl',
        'border border-slate-700/50 rounded-2xl'
      )}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
    >
      {opponents.map((opp) => {
        const isSelected = selectedTarget === opp.playerId;
        const livesPercent = opp.maxLives > 0 ? opp.lives / opp.maxLives : 0;
        const livesColor =
          livesPercent > 0.5 ? '#22c55e' : livesPercent > 0.25 ? '#eab308' : '#ef4444';

        return (
          <motion.button
            key={opp.playerId}
            onClick={() => !opp.eliminated && onSelectTarget(opp.playerId)}
            disabled={opp.eliminated}
            className={cn(
              'relative flex flex-col gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 min-w-[140px]',
              opp.eliminated
                ? 'bg-slate-800/30 opacity-50 cursor-not-allowed'
                : isSelected
                  ? 'bg-cyan-500/10 border border-cyan-500/50 cursor-pointer'
                  : 'bg-slate-800/60 border border-transparent hover:bg-slate-700/60 cursor-pointer'
            )}
            whileHover={!opp.eliminated ? { y: -2 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Selected target badge */}
            {isSelected && !opp.eliminated && (
              <div className="absolute -top-1.5 -right-1.5 bg-cyan-500 rounded-full p-0.5">
                <Crosshair size={8} className="text-white" />
              </div>
            )}

            {/* Player name row */}
            <div className="flex items-center gap-1.5">
              {opp.eliminated ? (
                <Skull size={12} className="text-slate-500 flex-shrink-0" />
              ) : (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: livesColor }}
                />
              )}
              <span
                className={cn(
                  'text-xs font-semibold truncate max-w-[80px]',
                  opp.eliminated ? 'text-slate-500 line-through' : 'text-slate-200'
                )}
              >
                {opp.playerName}
              </span>
            </div>

            {opp.eliminated ? (
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Eliminated
              </div>
            ) : (
              <>
                {/* Lives bar */}
                <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${livesPercent * 100}%`,
                      backgroundColor: livesColor,
                    }}
                  />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-0.5" title="Lives">
                    <Heart size={9} className="text-red-400 fill-red-400" />
                    <span className="text-[10px] font-semibold text-slate-300 tabular-nums">
                      {opp.lives}/{opp.maxLives}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5" title="Score">
                    <Trophy size={9} className="text-purple-400" />
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                      {opp.score}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400" title="Towers">
                    <TowerIcon />
                    <span className="text-[10px] font-medium tabular-nums">
                      {opp.towerCount}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400" title="Enemies">
                    <EnemyCountIcon />
                    <span className="text-[10px] font-medium tabular-nums">
                      {opp.enemyCount}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5" title="Send Points">
                    <Zap size={9} className="text-amber-400" />
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                      {opp.sendPoints}
                    </span>
                  </span>
                </div>
              </>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
