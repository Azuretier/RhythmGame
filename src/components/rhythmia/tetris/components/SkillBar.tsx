'use client';

import React from 'react';
import type { SkillSlot, SkillDefinition, SkillState, SkillLoadout, ActiveSkillEffect } from '@/lib/character-interaction/types';
import styles from './SkillBar.module.css';

// ===== Individual Skill Button =====

interface SkillButtonProps {
  slot: SkillSlot;
  skill: SkillDefinition | null;
  state: SkillState | null;
  canCast: boolean;
  mana: number;
  onCast: (slot: SkillSlot) => void;
}

function SkillButton({ slot, skill, state, canCast, mana, onCast }: SkillButtonProps) {
  if (!skill || !state) {
    return (
      <div className={`${styles.skillSlot} ${styles.empty}`}>
        <span className={styles.slotKey}>{slot}</span>
      </div>
    );
  }

  const cooldownPct = state.isOnCooldown
    ? Math.min(100, (state.cooldownRemaining / skill.cooldown) * 100)
    : 0;
  const cooldownSec = Math.ceil(state.cooldownRemaining / 1000);
  const hasEnoughMana = mana >= skill.manaCost;

  return (
    <button
      className={`${styles.skillSlot} ${canCast ? styles.ready : ''} ${state.isOnCooldown ? styles.onCooldown : ''} ${state.isActive ? styles.active : ''} ${!hasEnoughMana ? styles.noMana : ''}`}
      style={{
        '--skill-color': skill.color,
        '--skill-glow': skill.glowColor,
        '--cooldown-pct': `${cooldownPct}%`,
      } as React.CSSProperties}
      onClick={() => canCast && onCast(slot)}
      disabled={!canCast}
      title={`${skill.nameJa} - ${skill.descriptionJa}\nCost: ${skill.manaCost} MP | CD: ${skill.cooldown / 1000}s`}
    >
      {/* Cooldown overlay */}
      {state.isOnCooldown && (
        <div className={styles.cooldownOverlay} style={{ height: `${cooldownPct}%` }} />
      )}

      {/* Active effect glow */}
      {state.isActive && <div className={styles.activeGlow} />}

      {/* Skill icon */}
      <span className={styles.skillIcon}>{skill.icon}</span>

      {/* Key binding */}
      <span className={styles.slotKey}>{slot}</span>

      {/* Cooldown timer */}
      {state.isOnCooldown && cooldownSec > 0 && (
        <span className={styles.cooldownTimer}>{cooldownSec}</span>
      )}

      {/* Mana cost indicator */}
      <span className={`${styles.manaCost} ${hasEnoughMana ? styles.affordable : ''}`}>
        {skill.manaCost}
      </span>
    </button>
  );
}

// ===== Skill Bar (Q/W/E/R) =====

interface SkillBarProps {
  loadout: SkillLoadout | null;
  skillStates: Record<SkillSlot, SkillState | null>;
  mana: number;
  canCastSkill: (slot: SkillSlot) => boolean;
  onCastSkill: (slot: SkillSlot) => void;
}

export function SkillBar({ loadout, skillStates, mana, canCastSkill, onCastSkill }: SkillBarProps) {
  if (!loadout) return null;

  const slots: SkillSlot[] = ['Q', 'W', 'E', 'R'];

  return (
    <div className={styles.skillBar}>
      <div className={styles.skillSlots}>
        {slots.map(slot => (
          <SkillButton
            key={slot}
            slot={slot}
            skill={loadout.skills[slot]}
            state={skillStates[slot]}
            canCast={canCastSkill(slot)}
            mana={mana}
            onCast={onCastSkill}
          />
        ))}
      </div>
      <div className={styles.manaBar}>
        <span className={styles.manaLabel}>MP</span>
        <span className={styles.manaValue}>{Math.floor(mana)}</span>
      </div>
    </div>
  );
}

// ===== Active Effects Display =====

interface ActiveEffectsProps {
  effects: ActiveSkillEffect[];
}

export function ActiveEffectsDisplay({ effects }: ActiveEffectsProps) {
  const now = Date.now();
  const active = effects.filter(e => e.endTime > now);

  if (active.length === 0) return null;

  return (
    <div className={styles.activeEffects}>
      {active.map(effect => {
        const remaining = Math.max(0, effect.endTime - now);
        const totalDuration = effect.endTime - effect.startTime;
        const pct = (remaining / totalDuration) * 100;

        return (
          <div key={effect.id} className={styles.effectBadge}>
            <div className={styles.effectProgress} style={{ width: `${pct}%` }} />
            <span className={styles.effectType}>
              {effect.effectType === 'buff_damage' ? 'DMG+' :
               effect.effectType === 'shield' ? 'SHIELD' :
               effect.effectType === 'slow' ? 'SLOW' :
               effect.effectType === 'stun' ? 'STUN' :
               effect.effectType.toUpperCase()}
            </span>
            <span className={styles.effectTimer}>{Math.ceil(remaining / 1000)}s</span>
          </div>
        );
      })}
    </div>
  );
}

// ===== Skill Cast VFX Overlay =====

interface SkillCastVFXProps {
  skillColor: string | null;
  isVisible: boolean;
}

export function SkillCastVFX({ skillColor, isVisible }: SkillCastVFXProps) {
  if (!isVisible || !skillColor) return null;

  return (
    <div
      className={styles.castVFX}
      style={{ '--cast-color': skillColor } as React.CSSProperties}
    />
  );
}
