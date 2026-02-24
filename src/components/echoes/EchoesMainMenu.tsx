'use client';

// =============================================================
// Echoes of Eternity — Main Menu
// =============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import type { GameMode } from '@/types/echoes';
import { ECHOES_RANKED_TIERS, ELEMENT_COLORS, RARITY_COLORS } from '@/types/echoes';
import { CHARACTERS } from '@/lib/echoes/characters';

const GAME_MODES: { mode: GameMode; label: string; desc: string; players: string; color: string }[] = [
  { mode: 'story', label: 'STORY MODE', desc: 'Traverse timelines and save the multiverse', players: '1-4 Players', color: '#8A2BE2' },
  { mode: 'battle_royale', label: 'BATTLE ROYALE', desc: '100-player survival — scavenge, build, fight', players: '100 Players', color: '#FF4500' },
  { mode: 'ranked_match', label: 'RANKED MATCH', desc: '5v5 tactical combat with ban/pick phase', players: '10 Players', color: '#FFD700' },
  { mode: 'rhythm_challenge', label: 'RHYTHM CHALLENGE', desc: 'Pure rhythm mastery with global rankings', players: '1 Player', color: '#1E90FF' },
  { mode: 'endless_dungeon', label: 'ENDLESS DUNGEON', desc: 'Hack-and-slash for legendary loot', players: '1-4 Players', color: '#FF6347' },
  { mode: 'creative', label: 'CREATIVE MODE', desc: 'Build worlds and share with the community', players: '1-8 Players', color: '#98FB98' },
];

export function EchoesMainMenu() {
  const { state, setPhase, setMode, setPlayerName } = useEchoes();
  const { playerData } = state;
  const [nameInput, setNameInput] = useState(playerData.name);
  const [showNameEntry, setShowNameEntry] = useState(!playerData.name);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [activeTab, setActiveTab] = useState<'play' | 'characters' | 'inventory' | 'profile'>('play');

  const handleNameSubmit = useCallback(() => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
      setShowNameEntry(false);
    }
  }, [nameInput, setPlayerName]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setMode(mode);
  }, [setMode]);

  const handleStartGame = useCallback(() => {
    if (!selectedMode) return;
    if (selectedMode === 'rhythm_challenge' || selectedMode === 'story' || selectedMode === 'endless_dungeon') {
      setPhase('character_select');
    } else {
      setPhase('lobby');
    }
  }, [selectedMode, setPhase]);

  const ownedCharacterIds = new Set(playerData.characters.map(c => c.characterId));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8 pb-4"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-wider">
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            ECHOES OF ETERNITY
          </span>
        </h1>
        <p className="mt-2 text-zinc-500 text-sm tracking-widest uppercase">
          The Ultimate Action RPG
        </p>
      </motion.div>

      {/* Name Entry Modal */}
      <AnimatePresence>
        {showNameEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Enter the Echoes
              </h2>
              <p className="text-zinc-400 text-center text-sm mb-6">Choose your name, Traveler</p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Your name..."
                maxLength={20}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 mb-4"
                autoFocus
              />
              <button
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
                className="w-full py-3 rounded font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                BEGIN JOURNEY
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Info Bar */}
      {playerData.name && (
        <div className="flex items-center justify-between px-4 md:px-8 py-2 border-b border-zinc-800/50">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              <span className="text-purple-400 font-semibold">{playerData.name}</span>
              {' '}&middot; Lv.{playerData.level}
            </span>
            <span className="text-xs text-zinc-600">
              {playerData.characters.length} Characters &middot;{' '}
              {ECHOES_RANKED_TIERS.find(t => t.tier === playerData.ranked.tier)?.label || 'Unranked'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-yellow-400">{playerData.resources.gold || 0}G</span>
            <span className="text-purple-400">{playerData.resources.eternium || 0} Eternium</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center gap-1 px-4 py-3 border-b border-zinc-800/30">
        {(['play', 'characters', 'inventory', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'play' && (
            <motion.div
              key="play"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-lg font-bold text-zinc-300 mb-4">SELECT GAME MODE</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {GAME_MODES.map(({ mode, label, desc, players, color }) => (
                  <motion.button
                    key={mode}
                    onClick={() => handleModeSelect(mode)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      selectedMode === mode
                        ? 'border-opacity-80 bg-opacity-10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                    style={{
                      borderColor: selectedMode === mode ? color : undefined,
                      backgroundColor: selectedMode === mode ? `${color}15` : undefined,
                    }}
                  >
                    <div className="text-sm font-bold" style={{ color }}>{label}</div>
                    <div className="text-xs text-zinc-400 mt-1">{desc}</div>
                    <div className="text-xs text-zinc-600 mt-2">{players}</div>
                  </motion.button>
                ))}
              </div>

              {selectedMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex justify-center"
                >
                  <button
                    onClick={handleStartGame}
                    className="px-8 py-3 rounded-lg font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 transition-all text-sm tracking-wider"
                  >
                    LAUNCH
                  </button>
                </motion.div>
              )}

              {/* Quick Stats */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Story Progress', value: `Chapter ${playerData.storyProgress}` },
                  { label: 'Dungeon Floor', value: `F${playerData.dungeonFloor}` },
                  { label: 'BR Wins', value: `${playerData.brWins}` },
                  { label: 'Season Pass', value: `Lv.${playerData.seasonPassLevel}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
                    <div className="text-xs text-zinc-500">{label}</div>
                    <div className="text-lg font-bold text-zinc-200">{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'characters' && (
            <motion.div
              key="characters"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-lg font-bold text-zinc-300 mb-4">
                CHARACTER ROSTER ({playerData.characters.length}/{CHARACTERS.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {CHARACTERS.map(character => {
                  const owned = playerData.characters.find(c => c.characterId === character.id);
                  const isOwned = ownedCharacterIds.has(character.id);

                  return (
                    <div
                      key={character.id}
                      className={`relative rounded-lg border p-3 transition-all ${
                        isOwned
                          ? 'border-zinc-700 bg-zinc-900/80'
                          : 'border-zinc-800/50 bg-zinc-900/30 opacity-50'
                      }`}
                    >
                      {/* Rarity indicator */}
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
                        style={{ backgroundColor: RARITY_COLORS[character.rarity] }}
                      />

                      {/* Character icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold mb-2"
                        style={{
                          backgroundColor: `${ELEMENT_COLORS[character.element]}20`,
                          color: ELEMENT_COLORS[character.element],
                        }}
                      >
                        {character.icon}
                      </div>

                      <div className="text-sm font-bold text-zinc-200">{character.name}</div>
                      <div className="text-xs text-zinc-500">{character.title}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${ELEMENT_COLORS[character.element]}20`,
                            color: ELEMENT_COLORS[character.element],
                          }}
                        >
                          {character.element}
                        </span>
                        <span className="text-xs text-zinc-600">{character.role}</span>
                      </div>

                      {owned && (
                        <div className="mt-2 text-xs text-zinc-400">
                          Lv.{owned.level} &middot; C{owned.constellation}
                        </div>
                      )}

                      {!isOwned && (
                        <div className="mt-2 text-xs text-zinc-600 italic">Locked</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-lg font-bold text-zinc-300 mb-4">RESOURCES</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(playerData.resources)
                  .filter(([, qty]) => qty && qty > 0)
                  .map(([resource, quantity]) => (
                    <div key={resource} className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
                      <div className="text-xs text-zinc-500 capitalize">{resource.replace(/_/g, ' ')}</div>
                      <div className="text-lg font-bold text-zinc-200">{quantity}</div>
                    </div>
                  ))
                }
              </div>

              <h2 className="text-lg font-bold text-zinc-300 mt-8 mb-4">
                EQUIPMENT VAULT ({playerData.equipmentVault.length})
              </h2>
              {playerData.equipmentVault.length === 0 ? (
                <div className="text-sm text-zinc-600">No equipment yet. Defeat enemies or craft items to earn gear.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {playerData.equipmentVault.map(equip => (
                    <div
                      key={equip.id}
                      className="bg-zinc-900/50 border border-zinc-800 rounded p-3"
                      style={{ borderLeftColor: RARITY_COLORS[equip.rarity], borderLeftWidth: 3 }}
                    >
                      <div className="text-sm font-bold" style={{ color: RARITY_COLORS[equip.rarity] }}>
                        {equip.name}
                      </div>
                      <div className="text-xs text-zinc-500 capitalize">{equip.slot} &middot; Lv.{equip.level}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {Object.entries(equip.stats).map(([stat, val]) => (
                          <span key={stat} className="mr-2">
                            {stat}: +{val}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-lg font-bold text-zinc-300 mb-4">PROFILE</h2>
              <div className="space-y-3 max-w-md">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                  <div className="text-xs text-zinc-500">Player Name</div>
                  <div className="text-xl font-bold text-purple-400">{playerData.name || 'Unnamed'}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                  <div className="text-xs text-zinc-500">Account Level</div>
                  <div className="text-xl font-bold text-zinc-200">Level {playerData.level}</div>
                  <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                      style={{ width: `${Math.min((playerData.experience / (playerData.level * 150)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                  <div className="text-xs text-zinc-500">Ranked</div>
                  <div className="text-xl font-bold" style={{ color: ECHOES_RANKED_TIERS.find(t => t.tier === playerData.ranked.tier)?.color }}>
                    {ECHOES_RANKED_TIERS.find(t => t.tier === playerData.ranked.tier)?.label || 'Unranked'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {playerData.ranked.points} pts &middot; W{playerData.ranked.wins}/L{playerData.ranked.losses}
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                  <div className="text-xs text-zinc-500">Crafting Level</div>
                  <div className="text-xl font-bold text-zinc-200">{playerData.craftingLevel}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                  <div className="text-xs text-zinc-500">Achievements</div>
                  <div className="text-xl font-bold text-zinc-200">{playerData.achievements.length}</div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setPhase('gacha')}
                    className="flex-1 py-2 rounded bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold text-xs hover:from-yellow-500 hover:to-orange-500"
                  >
                    GACHA
                  </button>
                  <button
                    onClick={() => setPhase('crafting')}
                    className="flex-1 py-2 rounded bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700"
                  >
                    CRAFTING
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
