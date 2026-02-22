'use client';

// =============================================================
// Echoes of Eternity — Character Selection & Party Builder
// =============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import { CHARACTERS, getCharacter, calculateCharacterStats } from '@/lib/echoes/characters';
import { getElementReactions, getReactionName } from '@/lib/echoes/elements';
import { ECHOES_CONFIG, ELEMENT_COLORS, RARITY_COLORS, ROLE_COLORS } from '@/types/echoes';
import type { Character } from '@/types/echoes';

interface CharacterSelectProps {
  onBack: () => void;
}

export function CharacterSelect({ onBack }: CharacterSelectProps) {
  const { state, setParty, setPhase, dispatch } = useEchoes();
  const { playerData, party } = state;

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [currentParty, setCurrentParty] = useState<string[]>(party.length > 0 ? party : []);

  const ownedCharacterIds = new Set(playerData.characters.map(c => c.characterId));

  const handleToggleParty = useCallback((characterId: string) => {
    setCurrentParty(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      }
      if (prev.length >= ECHOES_CONFIG.MAX_PARTY_SIZE) {
        return prev;
      }
      return [...prev, characterId];
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (currentParty.length === 0) return;
    setParty(currentParty);

    // Start the game with selected party
    const enemies = [];
    // Import combat initialization here would create a circular dependency,
    // so we dispatch and let the combat component handle initialization
    dispatch({ type: 'SET_COMBAT', combat: null });
    setPhase('combat');
  }, [currentParty, setParty, setPhase, dispatch]);

  const partyCharacters = currentParty.map(id => getCharacter(id)).filter(Boolean) as Character[];
  const partyElements = new Set(partyCharacters.map(c => c.element));

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &larr; Back
        </button>
        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          ASSEMBLE YOUR PARTY
        </h1>
        <div className="text-xs text-zinc-500">{currentParty.length}/{ECHOES_CONFIG.MAX_PARTY_SIZE}</div>
      </div>

      {/* Party Bar */}
      <div className="flex gap-2 mb-6 justify-center">
        {Array.from({ length: ECHOES_CONFIG.MAX_PARTY_SIZE }).map((_, i) => {
          const char = partyCharacters[i];
          return (
            <motion.div
              key={i}
              layout
              className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all ${
                char ? 'border-purple-500/50' : 'border-zinc-800 border-dashed'
              }`}
              style={char ? { backgroundColor: `${ELEMENT_COLORS[char.element]}15` } : undefined}
            >
              {char ? (
                <div className="text-center">
                  <div
                    className="text-xl font-bold"
                    style={{ color: ELEMENT_COLORS[char.element] }}
                  >
                    {char.icon}
                  </div>
                  <div className="text-xs text-zinc-400 truncate w-14">{char.name}</div>
                </div>
              ) : (
                <div className="text-zinc-700 text-xs">Empty</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Element Synergies */}
      {partyElements.size > 1 && (
        <div className="mb-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">Party Synergies</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {partyCharacters.map((char, i) =>
              partyCharacters.slice(i + 1).map(other => {
                const reactions = getElementReactions(char.element);
                const reaction = reactions.find(r => r.withElement === other.element);
                if (!reaction || reaction.reaction === 'resonance') return null;
                return (
                  <span key={`${char.id}-${other.id}`} className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                    {char.name} + {other.name} = {getReactionName(reaction.reaction)}
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {CHARACTERS.filter(c => ownedCharacterIds.has(c.id)).map(character => {
              const owned = playerData.characters.find(c => c.characterId === character.id);
              const inParty = currentParty.includes(character.id);

              return (
                <motion.button
                  key={character.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedCharacter(character);
                    handleToggleParty(character.id);
                  }}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    inParty
                      ? 'border-purple-500 bg-purple-500/10'
                      : selectedCharacter?.id === character.id
                        ? 'border-zinc-600 bg-zinc-800/50'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  {inParty && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                      {currentParty.indexOf(character.id) + 1}
                    </div>
                  )}

                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
                    style={{ backgroundColor: RARITY_COLORS[character.rarity] }}
                  />

                  <div
                    className="w-10 h-10 rounded flex items-center justify-center text-lg font-bold mb-2"
                    style={{
                      backgroundColor: `${ELEMENT_COLORS[character.element]}20`,
                      color: ELEMENT_COLORS[character.element],
                    }}
                  >
                    {character.icon}
                  </div>
                  <div className="text-sm font-bold text-zinc-200">{character.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs px-1 rounded" style={{ color: ROLE_COLORS[character.role] }}>
                      {character.role.toUpperCase()}
                    </span>
                  </div>
                  {owned && (
                    <div className="text-xs text-zinc-500 mt-1">Lv.{owned.level}</div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Character Detail Panel */}
        <AnimatePresence mode="wait">
          {selectedCharacter && (
            <motion.div
              key={selectedCharacter.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-80 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 overflow-y-auto max-h-[60vh] lg:max-h-none"
            >
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-bold mb-3"
                style={{
                  backgroundColor: `${ELEMENT_COLORS[selectedCharacter.element]}20`,
                  color: ELEMENT_COLORS[selectedCharacter.element],
                }}
              >
                {selectedCharacter.icon}
              </div>
              <div className="text-xl font-bold text-zinc-100">{selectedCharacter.name}</div>
              <div className="text-sm text-zinc-500">{selectedCharacter.title}</div>

              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${ELEMENT_COLORS[selectedCharacter.element]}20`,
                    color: ELEMENT_COLORS[selectedCharacter.element],
                  }}
                >
                  {selectedCharacter.element}
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: ROLE_COLORS[selectedCharacter.role], backgroundColor: `${ROLE_COLORS[selectedCharacter.role]}15` }}>
                  {selectedCharacter.role}
                </span>
                <span className="text-xs" style={{ color: RARITY_COLORS[selectedCharacter.rarity] }}>
                  {selectedCharacter.rarity.toUpperCase()}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-4">
                <div className="text-xs text-zinc-500 mb-2">BASE STATS</div>
                {(() => {
                  const owned = playerData.characters.find(c => c.characterId === selectedCharacter.id);
                  const stats = calculateCharacterStats(selectedCharacter, owned?.level || 1);
                  return (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="text-zinc-400">HP: <span className="text-zinc-200">{stats.hp}</span></div>
                      <div className="text-zinc-400">ATK: <span className="text-zinc-200">{stats.atk}</span></div>
                      <div className="text-zinc-400">DEF: <span className="text-zinc-200">{stats.def}</span></div>
                      <div className="text-zinc-400">SPD: <span className="text-zinc-200">{stats.spd}</span></div>
                      <div className="text-zinc-400">CRIT: <span className="text-zinc-200">{stats.critRate}%</span></div>
                      <div className="text-zinc-400">C.DMG: <span className="text-zinc-200">{stats.critDmg}%</span></div>
                      <div className="text-zinc-400">EM: <span className="text-zinc-200">{stats.elementalMastery}</span></div>
                      <div className="text-zinc-400">Energy: <span className="text-zinc-200">{stats.maxEnergy}</span></div>
                    </div>
                  );
                })()}
              </div>

              {/* Abilities */}
              <div className="mt-4">
                <div className="text-xs text-zinc-500 mb-2">ABILITIES</div>
                <div className="space-y-2">
                  {selectedCharacter.abilities.map(ability => (
                    <div key={ability.id} className="bg-zinc-800/50 rounded p-2">
                      <div className="text-xs font-bold text-zinc-200">{ability.name}</div>
                      <div className="text-xs text-zinc-400">{ability.description}</div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Power: {ability.basePower} &middot; CD: {ability.cooldown}t &middot; Cost: {ability.cost}
                        {ability.rhythmComboThreshold && (
                          <span className="text-purple-400">
                            {' '}&middot; Rhythm x{ability.rhythmBonusMultiplier} @ {ability.rhythmComboThreshold} combo
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ultimate */}
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-2">ULTIMATE</div>
                <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-800/30 rounded p-2">
                  <div className="text-xs font-bold text-purple-300">{selectedCharacter.ultimate.name}</div>
                  <div className="text-xs text-zinc-400">{selectedCharacter.ultimate.description}</div>
                  <div className="text-xs text-zinc-600 mt-1">
                    Power: {selectedCharacter.ultimate.basePower} &middot; Energy: {selectedCharacter.ultimate.energyCost}
                  </div>
                </div>
              </div>

              {/* Passive */}
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-1">PASSIVE</div>
                <div className="text-xs text-zinc-400">{selectedCharacter.passive}</div>
              </div>

              {/* Lore */}
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-1">LORE</div>
                <div className="text-xs text-zinc-500 italic">{selectedCharacter.lore}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleConfirm}
          disabled={currentParty.length === 0}
          className="px-8 py-3 rounded-lg font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm tracking-wider"
        >
          BEGIN COMBAT ({currentParty.length}/{ECHOES_CONFIG.MAX_PARTY_SIZE})
        </button>
      </div>
    </div>
  );
}
