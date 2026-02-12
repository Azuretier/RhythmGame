'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  LOYALTY_TIERS,
  getTierByXP,
  tierProgress,
  xpToNextTier,
  recordDailyVisit,
  syncFromGameplay,
} from '@/lib/loyalty';
import type { LoyaltyState } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState, syncLoyaltyStats } from '@/lib/advancements';
import styles from './LoyaltyWidget.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function LoyaltyWidget() {
  const t = useTranslations('loyalty');
  const router = useRouter();
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [advUnlocked, setAdvUnlocked] = useState(0);

  useEffect(() => {
    let loyaltyState = recordDailyVisit();

    const advState = loadAdvancementState();
    loyaltyState = syncFromGameplay(
      advState.stats.totalGamesPlayed,
      advState.stats.totalScore,
      advState.unlockedIds.length,
    );

    setState(loyaltyState);

    // Sync loyalty stats into advancements system
    const updatedAdv = syncLoyaltyStats({
      totalVisits: loyaltyState.stats.totalVisits,
      bestStreak: loyaltyState.stats.bestStreak,
      pollsVoted: loyaltyState.stats.pollsVoted,
    });
    setAdvUnlocked(updatedAdv.unlockedIds.length);
  }, []);

  if (!state) return null;

  const currentTier = getTierByXP(state.xp);
  const progress = tierProgress(state.xp);
  const nextTierXP = xpToNextTier(state.xp);
  const currentIndex = LOYALTY_TIERS.indexOf(currentTier);

  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      {/* Top row: tier + streak */}
      <div className={styles.topRow}>
        {/* Tier */}
        <div className={styles.tierSection}>
          <span className={styles.tierIcon}>{currentTier.icon}</span>
          <div className={styles.tierInfo}>
            <div className={styles.tierName} style={{ color: currentTier.color }}>
              {t(`tiers.${currentTier.id}`)}
            </div>
            <div className={styles.tierLabel}>{t('currentTier')}</div>
          </div>
        </div>

        {/* Streak */}
        <div className={styles.streakSection}>
          <div className={styles.streakDays}>
            {DAY_LABELS.map((label, i) => {
              const isFilled = i < state.stats.currentStreak % 7 || state.stats.currentStreak >= 7;
              const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
              return (
                <div
                  key={i}
                  className={`${styles.streakDot} ${isFilled ? styles.filled : ''} ${isToday ? styles.today : ''}`}
                >
                  {label}
                </div>
              );
            })}
          </div>
          <div className={styles.streakLabel}>
            {state.stats.currentStreak} {t('streakDays')}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressRow}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%`, background: currentTier.color }}
          />
        </div>
        <div className={styles.progressLabels}>
          <span>{state.xp} XP</span>
          <span>
            {nextTierXP !== null
              ? t('xpToNext', { xp: nextTierXP })
              : t('maxTier')}
          </span>
        </div>
      </div>

      {/* Tier steps (mini roadmap) */}
      <div className={styles.miniRoadmap}>
        {LOYALTY_TIERS.map((tier, i) => {
          const isActive = tier.id === currentTier.id;
          const isCompleted = i < currentIndex;
          return (
            <div
              key={tier.id}
              className={`${styles.miniStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              <span className={styles.miniStepIcon} style={isActive ? { color: tier.color } : undefined}>
                {tier.icon}
              </span>
              <span className={styles.miniStepName}>
                {t(`tiers.${tier.id}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{state.stats.totalVisits}</span>
          <span className={styles.statLabel}>{t('stats.visits')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{state.stats.totalGamesPlayed}</span>
          <span className={styles.statLabel}>{t('stats.games')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{advUnlocked}/{ADVANCEMENTS.length}</span>
          <span className={styles.statLabel}>{t('stats.badges')}</span>
        </div>
      </div>

      {/* View all link */}
      <button className={styles.viewAll} onClick={() => router.push('/loyalty')}>
        {t('viewAll')}
      </button>
    </motion.div>
  );
}
