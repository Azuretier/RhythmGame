'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Enemy } from '@/types/tower-defense';
import { ENEMY_DEFS } from '@/types/tower-defense';
import { EnemyIcon, EFFECT_LABELS, ABILITY_LABELS } from './td-icons';
import styles from './TDEnemyInfo.module.css';

interface TDEnemyInfoProps {
  enemy: Enemy;
  onDeselect: () => void;
}

export default function TDEnemyInfo({ enemy, onDeselect }: TDEnemyInfoProps) {
  const def = ENEMY_DEFS[enemy.type];
  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const isCritical = hpPercent < 25;

  const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444';

  const slowEffect = enemy.effects.find(e => e.type === 'slow');
  const effectiveSpeed = slowEffect
    ? enemy.speed * (1 - slowEffect.magnitude)
    : enemy.speed;
  const isSlowed = !!slowEffect;

  const abilities = useMemo(() => def.abilities ?? [], [def]);

  return (
    <motion.div
      className={styles.panel}
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className={styles.header}>
        <EnemyIcon type={enemy.type} size={36} />
        <span className={styles.enemyName} style={{ color: def.color }}>{def.name}</span>
        <button className={styles.closeBtn} onClick={onDeselect} aria-label="Close enemy info">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* HP Bar */}
      <div className={styles.hpBarWrap}>
        <div className={styles.hpBar}>
          <div
            className={`${styles.hpFill}${isCritical ? ` ${styles.hpCritical}` : ''}`}
            style={{
              width: `${hpPercent}%`,
              backgroundColor: hpColor,
            }}
          />
        </div>
        <span className={styles.hpText}>
          {Math.ceil(enemy.hp)} / {enemy.maxHp}
        </span>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Speed</span>
          <span className={styles.statValue}>
            {isSlowed ? effectiveSpeed.toFixed(1) : enemy.speed}
            {isSlowed && (
              <span className={styles.slowedValue}> ({def.speed})</span>
            )}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Armor</span>
          <span className={styles.statValue}>{enemy.armor}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Reward</span>
          <span className={styles.statValue} style={{ color: '#fbbf24' }}>{def.reward}g</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Type</span>
          <span className={styles.statValue}>{enemy.flying ? 'Flying' : 'Ground'}</span>
        </div>
      </div>

      {/* Active Effects */}
      {enemy.effects.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Active Effects</div>
          {enemy.effects.map((effect, idx) => {
            const info = EFFECT_LABELS[effect.type];
            if (!info) return null;

            const detail = effect.type === 'slow'
              ? `${Math.round(effect.magnitude * 100)}% slow`
              : effect.type === 'burn' || effect.type === 'poison'
                ? `${effect.magnitude} DPS`
                : effect.type === 'amplify'
                  ? `${Math.round(effect.magnitude * 100)}% amplify`
                  : 'Stunned';

            return (
              <div
                key={`${effect.type}-${idx}`}
                className={styles.effectPill}
                style={{ borderLeftColor: info.color }}
              >
                <div className={styles.effectIcon}>{info.icon}</div>
                <div className={styles.effectInfo}>
                  <div className={styles.effectLabel}>{info.label}</div>
                  <div className={styles.effectDetail}>
                    {detail} &middot; {effect.remaining.toFixed(1)}s
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Abilities */}
      {abilities.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Abilities</div>
          {abilities.map((ability) => {
            const info = ABILITY_LABELS[ability];
            if (!info) return null;

            return (
              <div
                key={ability}
                className={styles.abilityCard}
                style={{ borderLeftColor: info.color }}
              >
                <div className={styles.abilityName} style={{ color: info.color }}>{info.label}</div>
                <div className={styles.abilityDesc}>{info.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
