'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useProfile } from '@/lib/profile/context';
import { getIconById } from '@/lib/profile/types';
import { loadAdvancementState } from '@/lib/advancements/storage';
import {
  SCORE_TIERS,
  getTierByScore,
  scoreTierProgress,
  scoreToNextTier,
  loadScoreState,
  syncFromGameplay,
} from '@/lib/score';
import type { ScoreState } from '@/lib/score';
import styles from './ScoreWidget.module.css';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function ScoreWidget() {
  const t = useTranslations('score');
  const { profile } = useProfile();
  const [state, setState] = useState<ScoreState | null>(null);

  useEffect(() => {
    // Sync score state from advancements data
    const advState = loadAdvancementState();
    const scoreState = syncFromGameplay(
      advState.stats.totalGamesPlayed,
      advState.stats.totalScore,
      advState.stats.totalLines,
    );
    setState(scoreState);
  }, []);

  if (!state) return null;

  const totalScore = state.stats.totalScore;
  const currentTier = getTierByScore(totalScore);
  const progress = scoreTierProgress(totalScore);
  const nextTierScore = scoreToNextTier(totalScore);
  const currentIndex = SCORE_TIERS.indexOf(currentTier);

  const profileIcon = profile?.icon ? getIconById(profile.icon) : null;

  const winRate = state.stats.totalGamesPlayed > 0
    ? Math.round((state.stats.wins / state.stats.totalGamesPlayed) * 100)
    : 0;

  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      {/* Profile section */}
      <div className={styles.profileSection}>
        {profileIcon && (
          <div
            className={styles.profileIcon}
            style={{ background: profileIcon.bgColor, color: profileIcon.color }}
          >
            {profileIcon.emoji}
          </div>
        )}
        <div className={styles.profileDetails}>
          <div className={styles.profileName}>
            {profile?.name || 'Player'}
          </div>
          {profile?.friendCode && (
            <div className={styles.profileFriendCode}>
              {profile.friendCode}
            </div>
          )}
        </div>
        <div className={styles.profileMoney}>
          <span className={styles.moneyIcon}>♪</span>
          <div>
            <div className={styles.moneyAmount}>{formatNumber(state.money)}</div>
            <div className={styles.moneyLabel}>{t('money')}</div>
          </div>
        </div>
      </div>

      {/* Score + tier display */}
      <div className={styles.scoreSection}>
        <div className={styles.scorePrimary}>
          <div className={styles.scoreValue} style={{ color: currentTier.color }}>
            {formatNumber(totalScore)}
          </div>
          <div className={styles.scoreLabel}>{t('totalScore')}</div>
        </div>
        <div className={styles.tierDisplay}>
          <div className={styles.tierBadge} style={{ borderColor: `${currentTier.color}30` }}>
            <span className={styles.tierIcon} style={{ color: currentTier.color }}>
              {currentTier.icon}
            </span>
            <div>
              <div className={styles.tierName} style={{ color: currentTier.color }}>
                {t(`tiers.${currentTier.id}`)}
              </div>
              <div className={styles.tierLabel}>{t('currentRank')}</div>
            </div>
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
          <span>{formatNumber(totalScore)}</span>
          <span>
            {nextTierScore !== null
              ? t('scoreToNext', { score: formatNumber(nextTierScore) })
              : t('maxRank')}
          </span>
        </div>
      </div>

      {/* Tier roadmap */}
      <div className={styles.tierRoadmap}>
        {SCORE_TIERS.map((tier, i) => {
          const isActive = tier.id === currentTier.id;
          const isCompleted = i < currentIndex;
          return (
            <div
              key={tier.id}
              className={`${styles.tierStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              <span
                className={styles.tierStepIcon}
                style={isActive ? { color: tier.color } : undefined}
              >
                {tier.icon}
              </span>
              <span className={styles.tierStepName}>
                {t(`tiers.${tier.id}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{state.stats.totalGamesPlayed}</div>
          <div className={styles.statCardLabel}>{t('stats.games')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{formatNumber(state.stats.bestScore)}</div>
          <div className={styles.statCardLabel}>{t('stats.bestScore')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{formatNumber(state.stats.totalLinesCleared)}</div>
          <div className={styles.statCardLabel}>{t('stats.lines')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{winRate}%</div>
          <div className={styles.statCardLabel}>{t('stats.winRate')}</div>
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        {state.stats.currentStreak > 0 && (
          <div className={styles.streakDisplay}>
            <span className={styles.streakIcon}>🔥</span>
            <span className={styles.streakValue}>{state.stats.currentStreak}</span>
            <span className={styles.streakLabel}>{t('winStreak')}</span>
          </div>
        )}
        {state.stats.currentStreak === 0 && <div />}
        <button className={styles.viewAll}>
          {t('viewDetails')}
        </button>
      </div>
    </motion.div>
  );
}
