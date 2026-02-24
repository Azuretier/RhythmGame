'use client';

// =============================================================
// Echoes of Eternity — Gacha / Wish Screen
// =============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import { DEFAULT_BANNERS, getCharacter } from '@/lib/echoes/characters';
import { RARITY_COLORS, ELEMENT_COLORS } from '@/types/echoes';
import type { GachaPull, GachaBanner } from '@/types/echoes';

export function GachaScreen() {
  const { state, setPhase, pullGacha } = useEchoes();
  const { playerData } = state;
  const [selectedBanner, setSelectedBanner] = useState<GachaBanner>(DEFAULT_BANNERS[0]);
  const [results, setResults] = useState<GachaPull[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [revealIndex, setRevealIndex] = useState(-1);

  const PULL_COST = 160; // Eternium per pull
  const eternium = playerData.resources.eternium || 0;
  const pity = playerData.gacha.pityCounter[selectedBanner.id] || 0;

  const handlePull = useCallback((count: number) => {
    const cost = PULL_COST * count;
    if (eternium < cost) return;

    // Spend eternium
    const pulls = pullGacha(selectedBanner.id, count);
    setResults(pulls);
    setShowResults(true);
    setRevealIndex(-1);

    // Animate reveal
    pulls.forEach((_, i) => {
      setTimeout(() => setRevealIndex(i), (i + 1) * 600);
    });
  }, [eternium, selectedBanner, pullGacha]);

  const handleCloseResults = useCallback(() => {
    setShowResults(false);
    setResults([]);
    setRevealIndex(-1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl mb-6">
        <button onClick={() => setPhase('main_menu')} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &larr; Back
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
          ETERNAL ECHOES
        </h1>
        <div className="text-xs text-purple-400">
          {eternium} Eternium
        </div>
      </div>

      {/* Banner Selection */}
      <div className="flex gap-2 mb-6 w-full max-w-2xl overflow-x-auto">
        {DEFAULT_BANNERS.map(banner => (
          <button
            key={banner.id}
            onClick={() => setSelectedBanner(banner)}
            className={`flex-shrink-0 px-4 py-3 rounded-lg border transition-all ${
              selectedBanner.id === banner.id
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
            }`}
          >
            <div className="text-sm font-bold text-zinc-200">{banner.name}</div>
            <div className="text-xs text-zinc-500 capitalize">{banner.type}</div>
            {banner.featuredCharacters.length > 0 && (
              <div className="text-xs text-yellow-400 mt-1">
                Featured: {banner.featuredCharacters.map(id => getCharacter(id)?.name).join(', ')}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Banner Info */}
      <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-bold text-zinc-200">{selectedBanner.name}</div>
          <div className="text-xs text-zinc-500">
            Pity: {pity}/{selectedBanner.hardPity}
          </div>
        </div>

        {/* Pity bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(pity / selectedBanner.hardPity) * 100}%`,
              backgroundColor: pity >= selectedBanner.softPity ? '#FFD700' : '#8A2BE2',
            }}
          />
        </div>

        <div className="text-xs text-zinc-500">
          Base rate: {(selectedBanner.baseRate * 100).toFixed(1)}% &middot;
          Soft pity at {selectedBanner.softPity} &middot;
          Guaranteed at {selectedBanner.hardPity}
        </div>

        {pity >= selectedBanner.softPity && (
          <div className="text-xs text-yellow-400 mt-1 font-bold">
            Soft pity active! Increased rates!
          </div>
        )}
      </div>

      {/* Pull Buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => handlePull(1)}
          disabled={eternium < PULL_COST}
          className="px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-30 hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Pull x1
          <div className="text-xs opacity-70">{PULL_COST} Eternium</div>
        </button>
        <button
          onClick={() => handlePull(10)}
          disabled={eternium < PULL_COST * 10}
          className="px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-yellow-600 to-orange-600 text-white disabled:opacity-30 hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Pull x10
          <div className="text-xs opacity-70">{PULL_COST * 10} Eternium</div>
        </button>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-lg w-full"
            >
              <div className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                RESULTS
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {results.map((pull, i) => {
                  const character = pull.characterId ? getCharacter(pull.characterId) : null;
                  const revealed = i <= revealIndex;

                  return (
                    <motion.div
                      key={i}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={revealed ? { rotateY: 0, opacity: 1 } : { rotateY: 180, opacity: 0.3 }}
                      transition={{ duration: 0.5 }}
                      className="relative rounded-lg border p-2 text-center"
                      style={{
                        borderColor: revealed ? RARITY_COLORS[pull.rarity] : '#333',
                        backgroundColor: revealed ? `${RARITY_COLORS[pull.rarity]}10` : '#111',
                      }}
                    >
                      {revealed && character ? (
                        <>
                          <div
                            className="w-8 h-8 mx-auto rounded flex items-center justify-center text-sm font-bold mb-1"
                            style={{
                              backgroundColor: `${ELEMENT_COLORS[character.element]}20`,
                              color: ELEMENT_COLORS[character.element],
                            }}
                          >
                            {character.icon}
                          </div>
                          <div className="text-xs font-bold truncate" style={{ color: RARITY_COLORS[pull.rarity] }}>
                            {character.name}
                          </div>
                          <div className="text-xs text-zinc-500 capitalize">{pull.rarity}</div>
                          {pull.wasPity && (
                            <div className="text-xs text-yellow-400 font-bold">PITY!</div>
                          )}
                        </>
                      ) : revealed ? (
                        <>
                          <div className="w-8 h-8 mx-auto rounded bg-zinc-800 flex items-center justify-center text-sm font-bold mb-1 text-zinc-500">
                            ?
                          </div>
                          <div className="text-xs text-zinc-500 capitalize">{pull.rarity}</div>
                        </>
                      ) : (
                        <div className="w-8 h-8 mx-auto rounded bg-zinc-800 flex items-center justify-center text-zinc-700 text-sm">
                          ?
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={handleCloseResults}
                className="w-full py-2 rounded font-bold text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull History */}
      <div className="w-full max-w-2xl">
        <div className="text-xs text-zinc-500 mb-2">RECENT PULLS ({playerData.gacha.history.length} total)</div>
        <div className="flex flex-wrap gap-1">
          {playerData.gacha.history.slice(-20).reverse().map((pull, i) => {
            const character = pull.characterId ? getCharacter(pull.characterId) : null;
            return (
              <div
                key={i}
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: `${RARITY_COLORS[pull.rarity]}20`,
                  color: RARITY_COLORS[pull.rarity],
                }}
                title={character?.name || pull.rarity}
              >
                {character?.icon || '?'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
