'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  SCORE_RANK_TIERS,
  getTierByScore,
  scoreProgress,
  scoreToNextTier,
  formatScore,
  formatScoreCompact,
  recordDailyVisit,
  syncGameplayStats,
} from '@/lib/loyalty';
import type { ScoreRankingState } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState } from '@/lib/advancements';
import styles from './LoyaltyWidget.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function LoyaltyWidget() {
  const t = useTranslations('loyalty');
  const router = useRouter();
  const [state, setState] = useState<ScoreRankingState | null>(null);

  useEffect(() => {
    // Record daily visit first (awards XP for visits/streaks)
    let dailyState = recordDailyVisit();

    // Sync with gameplay stats
    const advState = loadAdvancementState();
    dailyState = syncGameplayStats(
      advState.stats.totalScore,
      advState.stats.bestScorePerGame,
      advState.stats.totalGamesPlayed,
      advState.unlockedIds.length,
      advState.stats.totalLines,
    );

    setState(dailyState);
  }, []);

  if (!state) return null;

  const { totalScore, bestScorePerGame, totalGamesPlayed, advancementsUnlocked, totalLines, currentStreak, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);
  const currentIndex = SCORE_RANK_TIERS.indexOf(currentTier);

  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      {/* Score Hero */}
      <div className={styles.scoreHero}>
        <div className={styles.tierBadge} style={{ borderColor: currentTier.color }}>
          <span className={styles.tierIconLarge}>{currentTier.icon}</span>
        </div>
        <div className={styles.scoreInfo}>
          <div className={styles.scoreValue}>{formatScore(combinedScore)}</div>
          <div className={styles.scoreLabel}>{t('totalScore')}</div>
          <div className={styles.tierName} style={{ color: currentTier.color }}>
            {t(`tiers.${currentTier.id}`)}
          </div>
        </div>
      </div>

      {/* Daily Streak Section */}
      <div className={styles.streakSection}>
        <div className={styles.streakDays}>
          {DAY_LABELS.map((label, i) => {
            const isFilled = i < currentStreak % 7 || currentStreak >= 7;
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
        <div className={styles.streakInfo}>
          <span className={styles.streakLabel}>
            {currentStreak} {t('streakDays')}
          </span>
          <span className={styles.bonusXP}>
            +{dailyBonusXP} {t('bonusXP')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressRow}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})` }}
          />
        </div>
        <div className={styles.progressLabels}>
          <span>{formatScoreCompact(combinedScore)}</span>
          <span>
            {nextTierScore !== null
              ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
              : t('maxTier')}
          </span>
        </div>
      </div>

      {/* Tier roadmap */}
      <div className={styles.miniRoadmap}>
        {SCORE_RANK_TIERS.map((tier, i) => {
          const isActive = tier.id === currentTier.id;
          const isCompleted = i < currentIndex;
          return (
            <div
              key={tier.id}
              className={`${styles.miniStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              <span className={styles.miniStepIcon} style={isActive || isCompleted ? { color: tier.color } : undefined}>
                {tier.icon}
              </span>
              <span className={styles.miniStepName}>
                {t(`tiers.${tier.id}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatScoreCompact(bestScorePerGame)}</span>
          <span className={styles.statLabel}>{t('stats.bestScore')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalGamesPlayed}</span>
          <span className={styles.statLabel}>{t('stats.games')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalLines.toLocaleString()}</span>
          <span className={styles.statLabel}>{t('stats.lines')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{advancementsUnlocked}/{ADVANCEMENTS.length}</span>
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
