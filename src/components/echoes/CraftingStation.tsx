'use client';

// =============================================================
// Echoes of Eternity — Crafting Station
// =============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import { CRAFTING_RECIPES, canCraft, getAvailableRecipes } from '@/lib/echoes/crafting';
import type { CraftingRecipe, ResourceType } from '@/types/echoes';
import { RARITY_COLORS } from '@/types/echoes';

const STATION_COLORS: Record<string, string> = {
  basic: '#9CA3AF',
  forge: '#FF6347',
  arcane: '#8A2BE2',
  divine: '#FFD700',
};

const STATION_NAMES: Record<string, string> = {
  basic: 'Basic Workbench',
  forge: 'Forge',
  arcane: 'Arcane Table',
  divine: 'Divine Altar',
};

export function CraftingStation() {
  const { state, setPhase, dispatch, craftItem } = useEchoes();
  const { playerData } = state;
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [craftResult, setCraftResult] = useState<{ success: boolean; message: string } | null>(null);

  const availableRecipes = getAvailableRecipes(
    playerData.craftingLevel,
    selectedStation || undefined,
  );

  const handleCraft = useCallback(() => {
    if (!selectedRecipe) return;

    const success = craftItem(selectedRecipe.id);
    if (success) {
      setCraftResult({
        success: true,
        message: `Crafted ${selectedRecipe.result.quantity}x ${selectedRecipe.name}!`,
      });
    } else {
      setCraftResult({
        success: false,
        message: 'Missing materials or insufficient crafting level.',
      });
    }

    setTimeout(() => setCraftResult(null), 2500);
  }, [selectedRecipe, craftItem]);

  const stations = ['basic', 'forge', 'arcane', 'divine'];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-3xl mb-6">
        <button onClick={() => setPhase('main_menu')} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &larr; Back
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
          CRAFTING STATION
        </h1>
        <div className="text-xs text-zinc-500">
          Level {playerData.craftingLevel}
        </div>
      </div>

      {/* Craft Result Notification */}
      <AnimatePresence>
        {craftResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-4 px-4 py-2 rounded text-sm font-bold ${
              craftResult.success ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'
            }`}
          >
            {craftResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-4">
        {/* Station Selector */}
        <div className="lg:w-48 space-y-2">
          <div className="text-xs text-zinc-500 mb-2 font-bold">STATION</div>
          <button
            onClick={() => setSelectedStation(null)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
              selectedStation === null ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {stations.map(station => {
            const minLevel = CRAFTING_RECIPES.filter(r => r.station === station).reduce((min, r) => Math.min(min, r.craftingLevel), Infinity);
            const locked = playerData.craftingLevel < minLevel;

            return (
              <button
                key={station}
                onClick={() => !locked && setSelectedStation(station)}
                disabled={locked}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                  selectedStation === station
                    ? 'bg-zinc-800 text-white'
                    : locked
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={selectedStation === station ? { borderLeft: `3px solid ${STATION_COLORS[station]}` } : undefined}
              >
                <span style={{ color: !locked ? STATION_COLORS[station] : undefined }}>
                  {STATION_NAMES[station]}
                </span>
                {locked && <span className="text-xs text-zinc-700 ml-1">(Lv.{minLevel})</span>}
              </button>
            );
          })}

          {/* Resources */}
          <div className="mt-6">
            <div className="text-xs text-zinc-500 mb-2 font-bold">RESOURCES</div>
            <div className="space-y-1 text-xs">
              {Object.entries(playerData.resources)
                .filter(([, qty]) => qty && qty > 0)
                .map(([res, qty]) => (
                  <div key={res} className="flex justify-between text-zinc-400">
                    <span className="capitalize">{res.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-300">{qty}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 space-y-2">
          <div className="text-xs text-zinc-500 mb-2 font-bold">
            RECIPES ({availableRecipes.length})
          </div>

          {availableRecipes.length === 0 && (
            <div className="text-sm text-zinc-600 py-8 text-center">
              No recipes available. Level up crafting to unlock more.
            </div>
          )}

          {availableRecipes.map(recipe => {
            const craftable = canCraft(recipe, playerData.resources, playerData.craftingLevel);
            const isSelected = selectedRecipe?.id === recipe.id;

            return (
              <motion.button
                key={recipe.id}
                onClick={() => setSelectedRecipe(isSelected ? null : recipe)}
                whileHover={{ scale: 1.01 }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : craftable
                      ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                      : 'border-zinc-800/50 bg-zinc-900/30 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-zinc-200">{recipe.name}</span>
                    <span className="text-xs ml-2" style={{ color: STATION_COLORS[recipe.station] }}>
                      [{STATION_NAMES[recipe.station]}]
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 capitalize">{recipe.category}</div>
                </div>

                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-zinc-500">Requires:</span>
                  {recipe.ingredients.map((ing, i) => {
                    const available = playerData.resources[ing.resource] || 0;
                    const hasEnough = available >= ing.quantity;
                    return (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded ${hasEnough ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                      >
                        {ing.resource.replace(/_/g, ' ')} {available}/{ing.quantity}
                      </span>
                    );
                  })}
                </div>

                <div className="text-xs text-zinc-600 mt-1">
                  Result: {recipe.result.quantity}x {recipe.name} &middot; Lv.{recipe.craftingLevel}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Detail/Craft Panel */}
        <AnimatePresence>
          {selectedRecipe && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:w-64 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4"
            >
              <div className="text-lg font-bold text-zinc-200">{selectedRecipe.name}</div>
              <div className="text-xs text-zinc-500 capitalize mt-1">
                {selectedRecipe.category} &middot;{' '}
                <span style={{ color: STATION_COLORS[selectedRecipe.station] }}>
                  {STATION_NAMES[selectedRecipe.station]}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-zinc-500 mb-2">MATERIALS</div>
                <div className="space-y-1">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const available = playerData.resources[ing.resource] || 0;
                    const hasEnough = available >= ing.quantity;
                    return (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="capitalize text-zinc-400">{ing.resource.replace(/_/g, ' ')}</span>
                        <span className={hasEnough ? 'text-green-400' : 'text-red-400'}>
                          {available}/{ing.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-zinc-500 mb-1">OUTPUT</div>
                <div className="text-sm text-zinc-200">
                  {selectedRecipe.result.quantity}x {selectedRecipe.name}
                </div>
              </div>

              <button
                onClick={handleCraft}
                disabled={!canCraft(selectedRecipe, playerData.resources, playerData.craftingLevel)}
                className="w-full mt-6 py-2 rounded font-bold text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-orange-400 hover:to-red-400 transition-all"
              >
                CRAFT
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
