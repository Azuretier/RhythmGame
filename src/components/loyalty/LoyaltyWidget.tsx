'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfile } from '@/lib/profile/context';
import { getIconById } from '@/lib/profile/types';
import {
  getTierByScore,
  scoreProgress,
  scoreToNextTier,
  formatScoreCompact,
  getRankGroups,
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
  const { profile } = useProfile();
  const [state, setState] = useState<ScoreRankingState | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const rankGroups = useMemo(() => getRankGroups(), []);

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

  const profileIcon = profile ? getIconById(profile.icon) : undefined;
  const { totalScore, bestScorePerGame, totalGamesPlayed, advancementsUnlocked, totalLines, currentStreak, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);


  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      {/* Profile Hero */}
      <div className={styles.scoreHero}>
        <div
          className={styles.tierBadge}
          style={{
            borderColor: profileIcon?.bgColor ?? currentTier.color,
            background: profileIcon?.bgColor ?? 'rgba(255, 255, 255, 0.04)',
          }}
        >
          <span className={styles.tierIconLarge}>{profileIcon?.emoji ?? '?'}</span>
        </div>
        <div className={styles.scoreInfo}>
          <div className={styles.scoreValue}>{profile?.name ?? '—'}</div>
          <div className={styles.scoreLabel}>{profile?.friendCode ?? ''}</div>
          <div className={styles.tierName} style={{ color: currentTier.color }}>
            <span>{currentTier.icon}</span> {t(`tiers.${currentTier.id}`)}
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
        <div className={styles.scoreLabel} style={{ marginBottom: 8 }}>{t('totalScore')}</div>
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

      {/* Tier roadmap (grouped) */}
      <div className={styles.miniRoadmap}>
        {rankGroups.map((group) => {
          const isActive = group.tiers.some(t => t.id === currentTier.id);
          const isCompleted = combinedScore >= group.maxScore && group.maxScore !== Infinity;
          return (
            <div
              key={group.groupId}
              className={`${styles.miniStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
              onMouseEnter={() => setHoveredGroup(group.groupId)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <span className={styles.miniStepIcon} style={isActive || isCompleted ? { color: group.color } : undefined}>
                {group.icon}
              </span>
              <span className={styles.miniStepName}>
                {t(`tierGroups.${group.groupId}`)}
              </span>
              {/* Hover progress bar popup */}
              {hoveredGroup === group.groupId && group.tiers.length > 1 && (() => {
                // Segment-aware fill: each tier = equal visual segment
                const count = group.tiers.length;
                let fillPct = 0;
                if (combinedScore >= group.maxScore && group.maxScore !== Infinity) {
                  fillPct = 100; // fully completed group
                } else {
                  for (let i = 0; i < count; i++) {
                    const tier = group.tiers[i];
                    if (combinedScore < tier.minScore) break; // haven't reached this tier
                    const tierRange = (tier.maxScore === Infinity ? tier.minScore * 2 : tier.maxScore) - tier.minScore + 1;
                    const segmentSize = 100 / count;
                    if (combinedScore <= tier.maxScore || tier.maxScore === Infinity) {
                      // Currently in this tier — partial fill
                      const progressInTier = (combinedScore - tier.minScore) / tierRange;
                      fillPct = segmentSize * i + segmentSize * Math.min(1, progressInTier);
                      break;
                    }
                    // Completed this tier
                    fillPct = segmentSize * (i + 1);
                  }
                }

                return (
                  <div className={styles.tierBarPopup}>
                    <div className={styles.tierBarHeader}>
                      <span style={{ color: group.color }}>{group.icon}</span>
                      <span className={styles.tierBarTitle}>{t(`tierGroups.${group.groupId}`)}</span>
                    </div>
                    {/* Tier labels */}
                    <div className={styles.tierBarLabels}>
                      {group.tiers.map((tier) => (
                        <span key={tier.id} className={styles.tierBarLabel} style={tier.id === currentTier.id ? { color: tier.color, opacity: 1 } : undefined}>
                          {t(`tiers.${tier.id}`)}
                        </span>
                      ))}
                    </div>
                    {/* Progress bar */}
                    <div className={styles.tierBarTrack}>
                      <div
                        className={styles.tierBarFill}
                        style={{ width: `${fillPct}%`, background: group.color }}
                      />
                    </div>
                    {/* Score labels */}
                    <div className={styles.tierBarScores}>
                      {group.tiers.map((tier) => (
                        <span key={tier.id} className={styles.tierBarScore}>
                          {formatScoreCompact(tier.minScore)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
