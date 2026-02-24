'use client';

import { useState, useMemo } from 'react';
import type { useEoESocket } from '@/hooks/useEoESocket';
import type { CharacterInstance, EnemyInstance, CharacterSkill } from '@/types/echoes';
import { ELEMENT_COLORS, ELEMENT_NAMES_JA } from '@/lib/echoes/elements';
import { getCharacterDefinition } from '@/lib/echoes/characters';
import styles from './EoEGame.module.css';

interface Props {
  socket: ReturnType<typeof useEoESocket>;
}

export function EoEBattle({ socket }: Props) {
  const { battleState, lastDamage, lastReaction, comboChain } = socket;
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!battleState) {
    return <div className={styles.battleLoading}>Loading battle...</div>;
  }

  const currentActorId = battleState.turnOrder[battleState.currentActorIndex];
  const isPlayerTurn = battleState.playerParty.some(
    (p) => p.definitionId === currentActorId && p.isAlive
  );
  const currentPlayerChar = battleState.playerParty.find(
    (p) => p.definitionId === currentActorId
  );

  const currentCharDef = currentPlayerChar
    ? getCharacterDefinition(currentPlayerChar.definitionId)
    : null;
  const skills: CharacterSkill[] = currentCharDef?.skills ?? [];

  const handleSkillSelect = (skillId: string) => {
    setSelectedSkill(skillId);
    setSelectedTarget(null);
  };

  const handleTargetSelect = (targetId: string) => {
    setSelectedTarget(targetId);
    if (selectedSkill) {
      socket.selectAction(selectedSkill, targetId);
      setSelectedSkill(null);
      setSelectedTarget(null);
    }
  };

  const hpBar = (current: number, max: number) => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    return (
      <div className={styles.hpBarOuter}>
        <div
          className={styles.hpBarInner}
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444',
          }}
        />
        <span className={styles.hpText}>{current}/{max}</span>
      </div>
    );
  };

  return (
    <div className={styles.battleScreen}>
      {/* Turn indicator */}
      <div className={styles.turnIndicator}>
        <span>Turn {battleState.turn}</span>
        <span className={styles.phaseLabel}>{battleState.phase}</span>
        {isPlayerTurn && <span className={styles.yourTurn}>YOUR TURN</span>}
      </div>

      {/* Combo counter */}
      {comboChain && comboChain.isActive && comboChain.hits > 1 && (
        <div className={styles.comboCounter}>
          <span className={styles.comboNumber}>{comboChain.hits}</span>
          <span className={styles.comboLabel}>COMBO</span>
          <span className={styles.comboMultiplier}>x{comboChain.multiplier.toFixed(1)}</span>
        </div>
      )}

      {/* Damage popup */}
      {lastDamage && (
        <div
          className={`${styles.damagePopup} ${lastDamage.isCritical ? styles.critDamage : ''}`}
          key={Date.now()}
        >
          {lastDamage.resultType === 'evaded' ? 'MISS' : lastDamage.finalDamage}
          {lastDamage.resultType === 'perfect_critical' && <span className={styles.perfectCrit}>PERFECT!</span>}
        </div>
      )}

      {/* Reaction popup */}
      {lastReaction && (
        <div className={styles.reactionPopup} key={`reaction-${Date.now()}`}>
          <span className={styles.reactionType}>
            {lastReaction.type.toUpperCase()}
          </span>
          <span className={styles.reactionDamage}>+{lastReaction.damage}</span>
        </div>
      )}

      {/* Enemy side */}
      <div className={styles.enemySide}>
        {battleState.enemies.map((enemy) => (
          <button
            key={enemy.id}
            className={`${styles.enemyCard} ${!enemy.isAlive ? styles.enemyDead : ''} ${selectedSkill && enemy.isAlive ? styles.enemyTargetable : ''} ${selectedTarget === enemy.id ? styles.enemyTargeted : ''}`}
            onClick={() => enemy.isAlive && selectedSkill && handleTargetSelect(enemy.id)}
            disabled={!enemy.isAlive || !selectedSkill}
          >
            <div className={styles.enemyHeader}>
              <span
                className={styles.enemyElement}
                style={{ color: ELEMENT_COLORS[enemy.element] }}
              >
                {ELEMENT_NAMES_JA[enemy.element]}
              </span>
              <span className={styles.enemyName}>{enemy.nameJa}</span>
              <span className={styles.enemyLevel}>Lv.{enemy.level}</span>
              {enemy.isBoss && <span className={styles.bossBadge}>BOSS</span>}
            </div>
            {hpBar(enemy.stats.hp, enemy.stats.maxHp)}
            {/* Status effects */}
            {enemy.statusEffects.length > 0 && (
              <div className={styles.statusEffects}>
                {enemy.statusEffects.map((se, i) => (
                  <span key={i} className={styles.statusBadge} title={`${se.type} x${se.stacks}`}>
                    {se.type.slice(0, 3).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Player side */}
      <div className={styles.playerSide}>
        {battleState.playerParty.map((char) => {
          const def = getCharacterDefinition(char.definitionId);
          const isCurrent = char.definitionId === currentActorId;

          return (
            <div
              key={char.definitionId}
              className={`${styles.allyCard} ${!char.isAlive ? styles.allyDead : ''} ${isCurrent ? styles.allyCurrent : ''}`}
            >
              <div className={styles.allyHeader}>
                <span
                  className={styles.allyElement}
                  style={{ color: ELEMENT_COLORS[char.currentElement] }}
                >
                  {ELEMENT_NAMES_JA[char.currentElement]}
                </span>
                <span className={styles.allyName}>{def?.nameJa ?? char.definitionId}</span>
                <span className={styles.allyLevel}>Lv.{char.level}</span>
              </div>
              {hpBar(char.stats.hp, char.stats.maxHp)}
              {/* MP bar */}
              <div className={styles.mpBarOuter}>
                <div
                  className={styles.mpBarInner}
                  style={{ width: `${(char.stats.mp / char.stats.maxMp) * 100}%` }}
                />
                <span className={styles.mpText}>{char.stats.mp}/{char.stats.maxMp}</span>
              </div>
              {/* Status effects */}
              {char.statusEffects.length > 0 && (
                <div className={styles.statusEffects}>
                  {char.statusEffects.map((se, i) => (
                    <span key={i} className={styles.statusBadge}>
                      {se.type.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skill bar (only on player turn) */}
      {isPlayerTurn && battleState.phase === 'action_select' && (
        <div className={styles.skillBar}>
          {skills.map((skill) => {
            const isOnCooldown = (currentPlayerChar?.skillCooldowns[skill.id] ?? 0) > 0;
            const hasEnoughMp = (currentPlayerChar?.stats.mp ?? 0) >= skill.manaCost;

            return (
              <button
                key={skill.id}
                className={`${styles.skillButton} ${selectedSkill === skill.id ? styles.skillSelected : ''}`}
                onClick={() => handleSkillSelect(skill.id)}
                disabled={isOnCooldown || !hasEnoughMp}
                style={{ '--skill-color': ELEMENT_COLORS[skill.element] } as React.CSSProperties}
              >
                <span className={styles.skillName}>{skill.nameJa}</span>
                <span className={styles.skillType}>{skill.skillType}</span>
                {skill.manaCost > 0 && (
                  <span className={styles.skillCost}>{skill.manaCost} MP</span>
                )}
                {isOnCooldown && (
                  <span className={styles.skillCooldown}>
                    CD: {currentPlayerChar?.skillCooldowns[skill.id]}
                  </span>
                )}
                <span className={styles.skillMultiplier}>
                  x{skill.damageMultiplier.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* End turn button */}
      {isPlayerTurn && (
        <button className={styles.endTurnButton} onClick={socket.endTurn}>
          End Turn
        </button>
      )}
    </div>
  );
}
