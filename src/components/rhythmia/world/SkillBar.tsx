'use client';

import { useMemo } from 'react';
import type { SkillState } from '@/types/skills';
import { cn } from '@/lib/utils';
import styles from './SkillBar.module.css';

interface SkillBarProps {
  /** Skill states with cooldown info */
  skillStates: SkillState[];
  /** Current mana amount */
  currentMana: number;
  /** Callback when skill is hovered (for tooltip) */
  onSkillHover?: (skillId: string | null) => void;
}

export default function SkillBar({
  skillStates,
  currentMana,
  onSkillHover,
}: SkillBarProps) {
  // Sort by key (Q, W, E, R)
  const sortedSkills = useMemo(() => {
    const keyOrder: Record<string, number> = { Q: 0, W: 1, E: 2, R: 3 };
    return [...skillStates].sort(
      (a, b) => keyOrder[a.skill.key] - keyOrder[b.skill.key]
    );
  }, [skillStates]);

  return (
    <div className={styles.container}>
      {sortedSkills.map((state) => {
        const { skill, cooldownRemaining, isOnCooldown, isCasting } = state;
        const canAfford = currentMana >= skill.manaCost;
        const cooldownPercent = isOnCooldown
          ? (cooldownRemaining / skill.cooldown) * 100
          : 0;

        return (
          <div
            key={skill.id}
            className={cn(styles.skillSlot, {
              [styles.onCooldown]: isOnCooldown,
              [styles.casting]: isCasting,
              [styles.notEnoughMana]: !canAfford,
            })}
            onMouseEnter={() => onSkillHover?.(skill.id)}
            onMouseLeave={() => onSkillHover?.(null)}
          >
            {/* Skill icon/visual */}
            <div
              className={styles.skillIcon}
              style={{
                background: skill.effectColor
                  ? `linear-gradient(135deg, ${skill.effectColor}22, ${skill.effectColor}44)`
                  : 'rgba(255, 255, 255, 0.1)',
                borderColor: skill.effectColor || 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Icon placeholder (first letter of skill name) */}
              <div className={styles.iconPlaceholder}>{skill.name[0]}</div>

              {/* Cooldown overlay */}
              {isOnCooldown && (
                <div
                  className={styles.cooldownOverlay}
                  style={{
                    height: `${cooldownPercent}%`,
                  }}
                />
              )}

              {/* Cooldown text */}
              {isOnCooldown && (
                <div className={styles.cooldownText}>
                  {cooldownRemaining.toFixed(1)}
                </div>
              )}

              {/* Casting indicator */}
              {isCasting && <div className={styles.castingRing} />}
            </div>

            {/* Key binding */}
            <div className={styles.keyBinding}>{skill.key}</div>

            {/* Mana cost */}
            <div
              className={cn(styles.manaCost, {
                [styles.manaCostInvalid]: !canAfford,
              })}
            >
              {skill.manaCost}
            </div>

            {/* Skill level dots */}
            <div className={styles.levelDots}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(styles.levelDot, {
                    [styles.levelDotActive]: i < state.level,
                  })}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
