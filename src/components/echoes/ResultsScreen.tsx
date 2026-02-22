'use client';

// =============================================================
// Echoes of Eternity — Results / Reward Screen
// =============================================================

import { motion } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';

export function ResultsScreen() {
  const { state, setPhase } = useEchoes();
  const { playerData } = state;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md w-full text-center"
      >
        <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
          SESSION COMPLETE
        </div>

        <div className="space-y-3 mt-6 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Account Level</span>
            <span className="text-zinc-200">{playerData.level}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Story Progress</span>
            <span className="text-zinc-200">Chapter {playerData.storyProgress}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Dungeon Floor</span>
            <span className="text-zinc-200">F{playerData.dungeonFloor}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Characters Owned</span>
            <span className="text-zinc-200">{playerData.characters.length}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Season Pass</span>
            <span className="text-zinc-200">Lv.{playerData.seasonPassLevel}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-8">
          <button
            onClick={() => setPhase('main_menu')}
            className="flex-1 py-3 rounded font-bold text-sm bg-gradient-to-r from-purple-500 to-cyan-500 text-black hover:from-purple-400 hover:to-cyan-400 transition-all"
          >
            RETURN TO MENU
          </button>
        </div>
      </motion.div>
    </div>
  );
}
