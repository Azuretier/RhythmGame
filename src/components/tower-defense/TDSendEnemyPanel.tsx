'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crosshair, Skull, Heart } from 'lucide-react';
import type { EnemyType } from '@/types/tower-defense';
import { cn } from '@/lib/utils';

const SEND_ENEMY_COSTS = [
  { enemyType: 'grunt' as const, cost: 5, count: 3, label: 'Grunts', icon: '🐷' },
  { enemyType: 'fast' as const, cost: 4, count: 4, label: 'Chickens', icon: '🐔' },
  { enemyType: 'swarm' as const, cost: 3, count: 8, label: 'Swarm', icon: '🐰' },
  { enemyType: 'flying' as const, cost: 8, count: 2, label: 'Flyers', icon: '🐝' },
  { enemyType: 'healer' as const, cost: 12, count: 2, label: 'Healers', icon: '🐱' },
  { enemyType: 'tank' as const, cost: 15, count: 1, label: 'Tank', icon: '🐄' },
  { enemyType: 'shield' as const, cost: 18, count: 1, label: 'Shield', icon: '🐺' },
  { enemyType: 'boss' as const, cost: 50, count: 1, label: 'Boss', icon: '🐴' },
];

interface TDSendEnemyPanelProps {
  sendPoints: number;
  opponents: Array<{
    playerId: string;
    playerName: string;
    lives: number;
    eliminated: boolean;
  }>;
  selectedTarget: string | null;
  onSelectTarget: (playerId: string) => void;
  onSendEnemy: (targetPlayerId: string, enemyType: EnemyType) => void;
}

export default function TDSendEnemyPanel({
  sendPoints,
  opponents,
  selectedTarget,
  onSelectTarget,
  onSendEnemy,
}: TDSendEnemyPanelProps) {
  const [pressedType, setPressedType] = useState<EnemyType | null>(null);
  const [displayPoints, setDisplayPoints] = useState(sendPoints);
  const prevPointsRef = useRef(sendPoints);

  // Animate point counter
  useEffect(() => {
    if (sendPoints === prevPointsRef.current) return;
    const start = prevPointsRef.current;
    const diff = sendPoints - start;
    const steps = Math.min(Math.abs(diff), 10);
    const stepDuration = 200 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayPoints(sendPoints);
        clearInterval(interval);
      } else {
        setDisplayPoints(Math.round(start + (diff * step) / steps));
      }
    }, stepDuration);

    prevPointsRef.current = sendPoints;
    return () => clearInterval(interval);
  }, [sendPoints]);

  const handleSend = useCallback((enemyType: EnemyType, cost: number) => {
    if (!selectedTarget || sendPoints < cost) return;
    setPressedType(enemyType);
    onSendEnemy(selectedTarget, enemyType);
    setTimeout(() => setPressedType(null), 300);
  }, [selectedTarget, sendPoints, onSendEnemy]);

  return (
    <motion.div
      className={cn(
        'absolute right-4 top-20 w-[260px] z-20',
        'bg-slate-900/[0.92] backdrop-blur-2xl',
        'border border-slate-700/50 rounded-xl',
        'flex flex-col overflow-hidden'
      )}
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair size={14} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Send Enemies
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={16} className="text-amber-400" />
          <span className="text-lg font-bold text-amber-400 tabular-nums">
            {displayPoints}
          </span>
          <span className="text-xs text-slate-500 ml-0.5">points</span>
        </div>
      </div>

      {/* Target selector */}
      <div className="px-3 py-2 border-t border-slate-700/40">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 px-1">
          Target
        </div>
        <div className="flex flex-col gap-1">
          {opponents.map((opp) => {
            const isSelected = selectedTarget === opp.playerId;
            const isEliminated = opp.eliminated;

            return (
              <button
                key={opp.playerId}
                onClick={() => !isEliminated && onSelectTarget(opp.playerId)}
                disabled={isEliminated}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-150',
                  isEliminated
                    ? 'opacity-40 cursor-not-allowed bg-slate-800/40'
                    : isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/50 cursor-pointer'
                      : 'bg-slate-800/60 border border-transparent hover:bg-slate-700/60 cursor-pointer'
                )}
              >
                {/* Radio indicator */}
                <div
                  className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    isEliminated
                      ? 'border-slate-600'
                      : isSelected
                        ? 'border-cyan-400'
                        : 'border-slate-500'
                  )}
                >
                  {isSelected && !isEliminated && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                  {isEliminated && (
                    <span className="text-[6px] text-slate-500">×</span>
                  )}
                </div>

                {/* Name */}
                <span
                  className={cn(
                    'text-xs font-medium flex-1 truncate',
                    isEliminated ? 'text-slate-600 line-through' : 'text-slate-200'
                  )}
                >
                  {opp.playerName}
                </span>

                {/* Lives / Eliminated */}
                {isEliminated ? (
                  <Skull size={12} className="text-slate-600 flex-shrink-0" />
                ) : (
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <Heart size={10} className="text-red-400 fill-red-400" />
                    <span className="text-[11px] font-semibold text-slate-300 tabular-nums">
                      {opp.lives}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Enemy send grid */}
      <div className="px-3 pt-2 pb-3 border-t border-slate-700/40 overflow-y-auto max-h-[340px] flex flex-col gap-1">
        {SEND_ENEMY_COSTS.map(({ enemyType, cost, count, label, icon }) => {
          const canAfford = sendPoints >= cost;
          const hasTarget = selectedTarget !== null;
          const enabled = canAfford && hasTarget;
          const isPressed = pressedType === enemyType;

          return (
            <motion.button
              key={enemyType}
              onClick={() => handleSend(enemyType, cost)}
              disabled={!enabled}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors duration-150',
                enabled
                  ? 'bg-slate-800/70 hover:bg-slate-700/80 cursor-pointer'
                  : 'bg-slate-800/30 opacity-40 cursor-not-allowed'
              )}
              animate={
                isPressed
                  ? { scale: [0.95, 1.05, 1] }
                  : { scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {/* Enemy icon */}
              <span className="text-base leading-none flex-shrink-0 w-6 text-center">
                {icon}
              </span>

              {/* Label + count */}
              <div className="flex-1 text-left">
                <span className="text-xs font-semibold text-slate-200">{label}</span>
                <span className="text-[10px] text-slate-500 ml-1">×{count}</span>
              </div>

              {/* Cost badge */}
              <div
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums',
                  enabled
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700/30 text-slate-600'
                )}
              >
                <Zap size={10} />
                {cost}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* No target hint */}
      <AnimatePresence>
        {!selectedTarget && opponents.some((o) => !o.eliminated) && (
          <motion.div
            className="px-3 pb-2 text-center"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-[10px] text-cyan-400/70">
              Select a target above to send enemies
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
