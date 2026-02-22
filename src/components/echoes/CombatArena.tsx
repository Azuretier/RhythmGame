'use client';

// =============================================================
// Echoes of Eternity — Combat Arena
// Hybrid rhythm-based + turn-based strategic combat
// =============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import { getCharacter, calculateCharacterStats } from '@/lib/echoes/characters';
import { findReaction, getReactionName } from '@/lib/echoes/elements';
import {
  initCombatState,
  processCombatAction,
  processEnemyTurn,
  checkRhythmAccuracy,
  generateRhythmNotes,
  generateEncounter,
  calculateCombatRewards,
} from '@/lib/echoes/combat';
import {
  ELEMENT_COLORS,
  HIT_ACCURACY_COLORS,
  ROLE_COLORS,
  RARITY_COLORS,
  type CombatState,
  type HitAccuracy,
  type CombatAction,
  type RhythmNote,
  type CombatReward,
  type ReactionType,
} from '@/types/echoes';

interface FeedbackMessage {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

export function CombatArena() {
  const { state, dispatch, setPhase } = useEchoes();
  const { party, playerData } = state;

  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedAction, setSelectedAction] = useState<'attack' | 'ability' | 'ultimate' | 'defend' | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [isRhythmPhase, setIsRhythmPhase] = useState(false);
  const [rhythmNotes, setRhythmNotes] = useState<RhythmNote[]>([]);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [lastAccuracy, setLastAccuracy] = useState<HitAccuracy | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackMessage[]>([]);
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [rewards, setRewards] = useState<CombatReward | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const feedbackIdRef = useRef(0);
  const rhythmStartTimeRef = useRef(0);
  const currentNoteIndexRef = useRef(0);

  // Initialize combat
  useEffect(() => {
    if (combat) return;
    if (party.length === 0) return;

    const partyLevels = party.map(id => {
      const owned = playerData.characters.find(c => c.characterId === id);
      return owned?.level || 1;
    });

    const enemies = generateEncounter('verdant_plains', playerData.level);
    const initialState = initCombatState(party, partyLevels, enemies, 120);
    setCombat(initialState);
  }, [party, playerData, combat]);

  // Add feedback message
  const addFeedback = useCallback((text: string, color: string) => {
    const id = feedbackIdRef.current++;
    setFeedbacks(prev => [...prev, { id, text, color, x: 50 + Math.random() * 200, y: 100 + Math.random() * 100 }]);
    setTimeout(() => {
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    }, 1500);
  }, []);

  // Handle rhythm input
  const handleRhythmHit = useCallback((lane: number) => {
    if (!isRhythmPhase) return;

    const elapsed = Date.now() - rhythmStartTimeRef.current;
    const currentNote = rhythmNotes[currentNoteIndexRef.current];

    if (!currentNote) return;

    const accuracy = checkRhythmAccuracy(elapsed, currentNote.time);

    if (accuracy === 'miss') {
      setCombo(0);
      addFeedback('MISS', HIT_ACCURACY_COLORS.miss);
    } else {
      setCombo(prev => prev + 1);
      const scoreGain = accuracy === 'perfect' ? 300 : accuracy === 'great' ? 200 : 100;
      setScore(prev => prev + scoreGain);
      addFeedback(accuracy.toUpperCase(), HIT_ACCURACY_COLORS[accuracy]);
    }

    setLastAccuracy(accuracy);
    currentNoteIndexRef.current++;

    if (currentNoteIndexRef.current >= rhythmNotes.length) {
      setIsRhythmPhase(false);
    }
  }, [isRhythmPhase, rhythmNotes, addFeedback]);

  // Start rhythm phase
  const startRhythmPhase = useCallback(() => {
    const notes = generateRhythmNotes(120, 5, 3);
    setRhythmNotes(notes);
    setIsRhythmPhase(true);
    rhythmStartTimeRef.current = Date.now();
    currentNoteIndexRef.current = 0;
  }, []);

  // Execute combat action
  const executeAction = useCallback(() => {
    if (!combat || !selectedAction) return;

    const activeChar = combat.party[activeCharIndex];
    if (!activeChar || !activeChar.alive) return;

    const accuracy: HitAccuracy = combo >= 10 ? 'perfect' : combo >= 5 ? 'great' : combo > 0 ? 'good' : 'miss';

    const action: CombatAction = {
      type: selectedAction,
      characterId: activeChar.characterId,
      actionId: selectedAbilityId || undefined,
      targetIndex,
      rhythmAccuracy: accuracy,
      beatPhase: 0,
      comboCount: combo,
    };

    const result = processCombatAction(combat, action);

    // Apply results to combat state
    const newCombat = { ...combat };

    // Apply damage to enemies
    if (result.damage > 0) {
      const target = newCombat.enemies[targetIndex];
      if (target) {
        target.currentHp = Math.max(0, target.currentHp - result.damage);
        addFeedback(`-${result.damage}`, result.isCrit ? '#FFD700' : '#FF4444');

        if (result.reactionTriggered && result.reactionType) {
          addFeedback(getReactionName(result.reactionType as ReactionType), '#FF88FF');
          setTurnLog(prev => [...prev, `${result.reactionType} triggered! ${result.reactionDamage} bonus damage`]);
        }
      }
    }

    // Apply healing
    if (result.healing > 0) {
      for (const tid of result.targetIds) {
        const allyIdx = newCombat.party.findIndex(p => p.characterId === tid);
        if (allyIdx >= 0) {
          newCombat.party[allyIdx].currentHp = Math.min(
            newCombat.party[allyIdx].maxHp,
            newCombat.party[allyIdx].currentHp + result.healing,
          );
        }
      }
      addFeedback(`+${result.healing}`, '#44DD44');
    }

    // Update energy
    newCombat.party[activeCharIndex].currentEnergy = Math.min(
      newCombat.party[activeCharIndex].maxEnergy,
      newCombat.party[activeCharIndex].currentEnergy + result.energyGained,
    );

    // Update combo
    newCombat.combo = Math.max(0, newCombat.combo + result.comboChange);
    newCombat.maxCombo = Math.max(newCombat.maxCombo, newCombat.combo);
    newCombat.score += result.scoreGained;

    // Apply cooldown
    if (selectedAbilityId) {
      const char = getCharacter(activeChar.characterId);
      const ability = char?.abilities.find(a => a.id === selectedAbilityId);
      if (ability) {
        newCombat.party[activeCharIndex].abilityCooldowns = {
          ...newCombat.party[activeCharIndex].abilityCooldowns,
          [selectedAbilityId]: ability.cooldown,
        };
      }
    }

    // Spend energy for ultimate
    if (selectedAction === 'ultimate') {
      const char = getCharacter(activeChar.characterId);
      if (char) {
        newCombat.party[activeCharIndex].currentEnergy = Math.max(
          0,
          newCombat.party[activeCharIndex].currentEnergy - char.ultimate.energyCost,
        );
      }
    }

    // Check for defeated enemies
    const allEnemiesDead = newCombat.enemies.every(e => e.currentHp <= 0);

    if (allEnemiesDead) {
      const combatRewards = calculateCombatRewards(newCombat.enemies, newCombat.score, newCombat.maxCombo, true);
      setRewards(combatRewards);
      setVictory(true);
      setGameOver(true);

      // Apply rewards
      dispatch({ type: 'ADD_EXPERIENCE', amount: combatRewards.experience });
      if (combatRewards.gold > 0) {
        dispatch({ type: 'ADD_RESOURCES', resources: { gold: combatRewards.gold } });
      }
      for (const res of combatRewards.resources) {
        dispatch({ type: 'ADD_RESOURCES', resources: { [res.type]: res.quantity } });
      }
      dispatch({ type: 'ADD_SEASON_PASS_XP', xp: combatRewards.seasonPassXp });

      setCombat(newCombat);
      setSelectedAction(null);
      setSelectedAbilityId(null);
      return;
    }

    // Move to next alive character or enemy turn
    let nextIndex = activeCharIndex + 1;
    while (nextIndex < newCombat.party.length && !newCombat.party[nextIndex].alive) {
      nextIndex++;
    }

    if (nextIndex >= newCombat.party.length) {
      // Enemy turn
      setCombat(newCombat);
      setSelectedAction(null);
      setSelectedAbilityId(null);
      setIsEnemyTurn(true);

      setTimeout(() => {
        processAllEnemyTurns(newCombat);
      }, 800);
    } else {
      setActiveCharIndex(nextIndex);
      setCombat(newCombat);
      setSelectedAction(null);
      setSelectedAbilityId(null);
    }
  }, [combat, selectedAction, selectedAbilityId, targetIndex, activeCharIndex, combo, addFeedback, dispatch]);

  // Process all enemy turns
  const processAllEnemyTurns = useCallback((currentCombat: CombatState) => {
    const newCombat = { ...currentCombat };

    for (let i = 0; i < newCombat.enemies.length; i++) {
      const enemy = newCombat.enemies[i];
      if (enemy.currentHp <= 0) continue;

      const { action, targetIndices, damage } = processEnemyTurn(enemy, newCombat.party);

      for (const ti of targetIndices) {
        if (newCombat.party[ti] && newCombat.party[ti].alive) {
          const defChar = getCharacter(newCombat.party[ti].characterId);
          const defStats = defChar ? calculateCharacterStats(defChar, 1) : { def: 20 };
          const defReduction = defStats.def / (defStats.def + 200);
          const actualDamage = Math.round(damage * (1 - defReduction));
          newCombat.party[ti].currentHp = Math.max(0, newCombat.party[ti].currentHp - actualDamage);

          if (newCombat.party[ti].currentHp <= 0) {
            newCombat.party[ti].alive = false;
            setTurnLog(prev => [...prev, `${defChar?.name || 'Ally'} was defeated!`]);
          }

          addFeedback(`-${actualDamage}`, '#FF6644');
          setTurnLog(prev => [...prev, `${enemy.name} attacks ${defChar?.name || 'you'} for ${actualDamage}`]);
        }
      }

      // Advance enemy pattern
      newCombat.enemies[i] = { ...enemy, patternIndex: enemy.patternIndex + 1 };
    }

    // Check if all party members dead
    const allDead = newCombat.party.every(p => !p.alive);
    if (allDead) {
      const combatRewards = calculateCombatRewards(newCombat.enemies, newCombat.score, newCombat.maxCombo, false);
      setRewards(combatRewards);
      setVictory(false);
      setGameOver(true);
      dispatch({ type: 'ADD_EXPERIENCE', amount: combatRewards.experience });
    }

    // Reduce cooldowns
    for (const char of newCombat.party) {
      for (const key of Object.keys(char.abilityCooldowns)) {
        if (char.abilityCooldowns[key] > 0) {
          char.abilityCooldowns[key]--;
        }
      }
    }

    newCombat.turn++;
    setCombat(newCombat);
    setIsEnemyTurn(false);
    setActiveCharIndex(newCombat.party.findIndex(p => p.alive));
  }, [addFeedback, dispatch]);

  // Keyboard rhythm input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isRhythmPhase) return;
      const laneMap: Record<string, number> = { d: 0, f: 1, j: 2, k: 3 };
      const lane = laneMap[e.key.toLowerCase()];
      if (lane !== undefined) handleRhythmHit(lane);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRhythmPhase, handleRhythmHit]);

  if (!combat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">Initializing combat...</div>
      </div>
    );
  }

  const activeCharacter = combat.party[activeCharIndex];
  const activeCharDef = activeCharacter ? getCharacter(activeCharacter.characterId) : null;

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Floating Feedback */}
      <AnimatePresence>
        {feedbacks.map(fb => (
          <motion.div
            key={fb.id}
            initial={{ opacity: 1, y: 0, x: fb.x }}
            animate={{ opacity: 0, y: -60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed text-2xl font-bold pointer-events-none z-50"
            style={{ color: fb.color, top: fb.y }}
          >
            {fb.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Combat Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-zinc-500">Turn {combat.turn}</div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-yellow-400">Combo: {combat.combo}</span>
          <span className="text-purple-400">Score: {combat.score}</span>
        </div>
        <button
          onClick={() => setPhase('main_menu')}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          Retreat
        </button>
      </div>

      {/* Rhythm Phase Overlay */}
      <AnimatePresence>
        {isRhythmPhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-40 flex flex-col items-center justify-center"
          >
            <div className="text-2xl font-bold text-purple-400 mb-4">RHYTHM PHASE</div>
            <div className="text-zinc-400 text-sm mb-8">Press D F J K to the beat!</div>

            {/* Rhythm lanes */}
            <div className="flex gap-4 mb-8">
              {['D', 'F', 'J', 'K'].map((key, lane) => (
                <button
                  key={lane}
                  onClick={() => handleRhythmHit(lane)}
                  className="w-16 h-16 rounded-lg border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400 hover:bg-zinc-700 active:bg-purple-600 active:border-purple-400 transition-all"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="text-3xl font-bold text-yellow-400">Combo: {combo}</div>
            {lastAccuracy && (
              <motion.div
                key={combo}
                initial={{ scale: 1.5, opacity: 1 }}
                animate={{ scale: 1, opacity: 0.7 }}
                className="text-xl font-bold mt-2"
                style={{ color: HIT_ACCURACY_COLORS[lastAccuracy] }}
              >
                {lastAccuracy.toUpperCase()}
              </motion.div>
            )}

            <button
              onClick={() => setIsRhythmPhase(false)}
              className="mt-8 text-xs text-zinc-600 hover:text-zinc-400"
            >
              Skip Rhythm Phase
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md w-full text-center"
            >
              <div className={`text-4xl font-bold mb-2 ${victory ? 'text-yellow-400' : 'text-red-400'}`}>
                {victory ? 'VICTORY' : 'DEFEATED'}
              </div>

              {rewards && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="text-zinc-400">Score: <span className="text-white">{combat.score}</span></div>
                  <div className="text-zinc-400">Max Combo: <span className="text-white">{combat.maxCombo}</span></div>
                  <div className="text-zinc-400">EXP: <span className="text-green-400">+{rewards.experience}</span></div>
                  <div className="text-zinc-400">Gold: <span className="text-yellow-400">+{rewards.gold}</span></div>
                  {rewards.resources.map(r => (
                    <div key={r.type} className="text-zinc-400 capitalize">
                      {r.type.replace(/_/g, ' ')}: <span className="text-cyan-400">+{r.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setCombat(null);
                    setGameOver(false);
                    setRewards(null);
                    setCombo(0);
                    setScore(0);
                    setActiveCharIndex(0);
                    setTurnLog([]);
                  }}
                  className="flex-1 py-2 rounded bg-purple-600 text-white font-bold text-sm hover:bg-purple-500"
                >
                  BATTLE AGAIN
                </button>
                <button
                  onClick={() => setPhase('main_menu')}
                  className="flex-1 py-2 rounded bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700"
                >
                  RETURN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enemy Section */}
      <div className="flex justify-center gap-3 mb-6">
        {combat.enemies.map((enemy, i) => {
          const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
          const isDead = enemy.currentHp <= 0;

          return (
            <motion.button
              key={enemy.id}
              onClick={() => setTargetIndex(i)}
              animate={{ opacity: isDead ? 0.3 : 1 }}
              className={`relative p-3 rounded-lg border transition-all min-w-[100px] ${
                targetIndex === i && !isDead
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <div
                className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-2xl font-bold mb-2"
                style={{
                  backgroundColor: `${ELEMENT_COLORS[enemy.element]}20`,
                  color: isDead ? '#555' : ELEMENT_COLORS[enemy.element],
                }}
              >
                {enemy.icon}
              </div>
              <div className="text-xs font-bold text-zinc-300 text-center">{enemy.name}</div>
              <div className="text-xs text-zinc-500 text-center">Lv.{enemy.level}</div>
              {enemy.isBoss && <div className="text-xs text-red-400 text-center font-bold">BOSS</div>}

              {/* HP Bar */}
              <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${hpPercent}%` }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: hpPercent > 50 ? '#44DD44' : hpPercent > 25 ? '#FFDD44' : '#FF4444' }}
                />
              </div>
              <div className="text-xs text-zinc-600 text-center mt-1">
                {enemy.currentHp}/{enemy.maxHp}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Battle Field Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-4" />

      {/* Party Section */}
      <div className="flex justify-center gap-3 mb-6">
        {combat.party.map((char, i) => {
          const charDef = getCharacter(char.characterId);
          if (!charDef) return null;

          const hpPercent = (char.currentHp / char.maxHp) * 100;
          const energyPercent = (char.currentEnergy / char.maxEnergy) * 100;
          const isActive = i === activeCharIndex;

          return (
            <div
              key={char.characterId}
              className={`relative p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-purple-500 bg-purple-500/10'
                  : char.alive
                    ? 'border-zinc-800 bg-zinc-900/50'
                    : 'border-zinc-800/50 bg-zinc-900/30 opacity-50'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-purple-400 font-bold">
                  ACTIVE
                </div>
              )}

              <div
                className="w-10 h-10 mx-auto rounded flex items-center justify-center text-lg font-bold mb-1"
                style={{
                  backgroundColor: `${ELEMENT_COLORS[charDef.element]}20`,
                  color: char.alive ? ELEMENT_COLORS[charDef.element] : '#555',
                }}
              >
                {charDef.icon}
              </div>
              <div className="text-xs font-bold text-zinc-300 text-center">{charDef.name}</div>
              <div className="text-xs text-center" style={{ color: ROLE_COLORS[charDef.role] }}>
                {charDef.role}
              </div>

              {/* HP Bar */}
              <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${hpPercent}%`,
                    backgroundColor: hpPercent > 50 ? '#44DD44' : hpPercent > 25 ? '#FFDD44' : '#FF4444',
                  }}
                />
              </div>
              <div className="text-xs text-zinc-600 text-center">{char.currentHp}/{char.maxHp}</div>

              {/* Energy Bar */}
              <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${energyPercent}%` }} />
              </div>
              <div className="text-xs text-cyan-600 text-center">{char.currentEnergy}/{char.maxEnergy}</div>

              {!char.alive && (
                <div className="text-xs text-red-500 text-center mt-1 font-bold">KO</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Panel */}
      {!isEnemyTurn && !gameOver && activeCharacter?.alive && activeCharDef && (
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-xs text-zinc-500 mb-2 text-center">
            {activeCharDef.name}&apos;s Turn — Choose Action
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => { setSelectedAction('attack'); setSelectedAbilityId(null); }}
              className={`py-2 rounded text-xs font-bold transition-all ${
                selectedAction === 'attack' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              ATTACK
            </button>

            {activeCharDef.abilities.map(ability => {
              const cd = activeCharacter.abilityCooldowns[ability.id] || 0;
              const canUse = cd <= 0;

              return (
                <button
                  key={ability.id}
                  onClick={() => {
                    if (!canUse) return;
                    setSelectedAction('ability');
                    setSelectedAbilityId(ability.id);
                  }}
                  disabled={!canUse}
                  className={`py-2 rounded text-xs font-bold transition-all ${
                    selectedAbilityId === ability.id ? 'text-white' : 'text-zinc-300 hover:bg-zinc-700'
                  } ${!canUse ? 'opacity-30 cursor-not-allowed bg-zinc-800' : 'bg-zinc-800'}`}
                  style={selectedAbilityId === ability.id ? { backgroundColor: ELEMENT_COLORS[ability.element] } : undefined}
                >
                  {ability.name}
                  {cd > 0 && <span className="ml-1 text-zinc-500">({cd}t)</span>}
                </button>
              );
            })}

            <button
              onClick={() => {
                if (activeCharacter.currentEnergy >= activeCharDef.ultimate.energyCost) {
                  setSelectedAction('ultimate');
                  setSelectedAbilityId(null);
                }
              }}
              disabled={activeCharacter.currentEnergy < activeCharDef.ultimate.energyCost}
              className={`py-2 rounded text-xs font-bold transition-all ${
                selectedAction === 'ultimate'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                  : activeCharacter.currentEnergy >= activeCharDef.ultimate.energyCost
                    ? 'bg-gradient-to-r from-purple-900/50 to-cyan-900/50 text-purple-300 hover:from-purple-800/50 hover:to-cyan-800/50'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-30'
              }`}
            >
              ULTIMATE
            </button>

            <button
              onClick={() => { setSelectedAction('defend'); setSelectedAbilityId(null); }}
              className={`py-2 rounded text-xs font-bold transition-all ${
                selectedAction === 'defend' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              DEFEND
            </button>
          </div>

          {/* Execute */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={startRhythmPhase}
              className="px-4 py-2 rounded text-xs font-bold bg-zinc-800 text-purple-400 hover:bg-zinc-700 border border-purple-800/50"
            >
              RHYTHM PHASE
            </button>
            <button
              onClick={executeAction}
              disabled={!selectedAction}
              className="px-6 py-2 rounded font-bold text-sm bg-gradient-to-r from-purple-500 to-cyan-500 text-black disabled:opacity-30 hover:from-purple-400 hover:to-cyan-400 transition-all"
            >
              EXECUTE
            </button>
          </div>
        </div>
      )}

      {/* Enemy Turn Indicator */}
      {isEnemyTurn && (
        <div className="text-center py-4">
          <div className="text-sm text-red-400 animate-pulse font-bold">ENEMY TURN...</div>
        </div>
      )}

      {/* Turn Log */}
      <div className="mt-4 max-w-2xl mx-auto w-full">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2 max-h-24 overflow-y-auto">
          {turnLog.slice(-5).map((log, i) => (
            <div key={i} className="text-xs text-zinc-500">{log}</div>
          ))}
          {turnLog.length === 0 && <div className="text-xs text-zinc-700">Combat started...</div>}
        </div>
      </div>
    </div>
  );
}
