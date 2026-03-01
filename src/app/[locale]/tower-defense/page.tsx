'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Swords, Users, Shield } from 'lucide-react';
import TowerDefenseGame from '@/components/tower-defense/TowerDefenseGame';
import TowerDefenseMultiplayer from '@/components/tower-defense/TowerDefenseMultiplayer';
import { cn } from '@/lib/utils';

type GameMode = 'menu' | 'solo' | 'multiplayer';

export default function TowerDefensePage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');

  const [mode, setMode] = useState<GameMode>(() => {
    if (modeParam === 'multiplayer') return 'multiplayer';
    if (modeParam === 'solo') return 'solo';
    return 'menu';
  });

  if (mode === 'solo') return <TowerDefenseGame />;
  if (mode === 'multiplayer') return <TowerDefenseMultiplayer />;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 px-4">
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Shield size={40} className="text-cyan-400 mb-3" />
        <h1 className="text-4xl font-bold mb-1">Tower Defense</h1>
        <p className="text-slate-500 text-sm mb-10">Choose your game mode</p>
      </motion.div>

      <div className="flex gap-4 w-full max-w-lg">
        <motion.button
          onClick={() => setMode('solo')}
          className={cn(
            'flex-1 flex flex-col items-center gap-3 px-6 py-8 rounded-2xl',
            'bg-slate-900/80 border border-slate-700/50',
            'hover:border-cyan-500/40 hover:bg-slate-800/80',
            'transition-colors cursor-pointer'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4 }}
        >
          <Swords size={32} className="text-cyan-400" />
          <span className="text-lg font-bold">Solo</span>
          <span className="text-xs text-slate-500 text-center">
            Defend against 30 waves
          </span>
        </motion.button>

        <motion.button
          onClick={() => setMode('multiplayer')}
          className={cn(
            'flex-1 flex flex-col items-center gap-3 px-6 py-8 rounded-2xl',
            'bg-slate-900/80 border border-slate-700/50',
            'hover:border-amber-500/40 hover:bg-slate-800/80',
            'transition-colors cursor-pointer'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ y: -4 }}
        >
          <Users size={32} className="text-amber-400" />
          <span className="text-lg font-bold">Multiplayer</span>
          <span className="text-xs text-slate-500 text-center">
            2-4 players, send enemies
          </span>
        </motion.button>
      </div>
    </div>
  );
}
