'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  getTierByScore,
  scoreProgress,
  scoreToNextTier,
  formatScoreCompact,
  getRankGroups,
  recordDailyVisit,
  syncGameplayStats,
  SCORE_RANK_TIERS,
} from '@/lib/loyalty';
import type { ScoreRankingState } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState } from '@/lib/advancements';
import styles from './LoyaltyWidget.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function LoyaltyWidget() {
  const t = useTranslations('loyalty');
  const router = useRouter();
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

  const { bestScorePerGame, totalGamesPlayed, advancementsUnlocked, totalLines, currentStreak, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const currentTierIndex = SCORE_RANK_TIERS.indexOf(currentTier);
  const nextTier = currentTierIndex < SCORE_RANK_TIERS.length - 1 ? SCORE_RANK_TIERS[currentTierIndex + 1] : null;
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);


  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${currentTier.color}08 0%, transparent 60%), rgba(255, 255, 255, 0.03)` }}
    >
      {/* Rank Emblem Hero */}
      <div className={styles.rankHero}>
        <div
          className={styles.rankEmblem}
          style={{
            borderColor: currentTier.color,
            boxShadow: `0 0 40px ${currentTier.color}30, 0 0 80px ${currentTier.color}10`,
          }}
        >
          <span className={styles.rankEmblemIcon}>{currentTier.icon}</span>
        </div>
        <div className={styles.rankTitle} style={{ color: currentTier.color }}>
          {t(`tiers.${currentTier.id}`)}
        </div>
        <div className={styles.rankScore}>
          {formatScoreCompact(combinedScore)} SP
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

      {/* Score Gauge Section — 4 rows */}
      <div className={styles.gaugeSection}>
        {/* Row 1: TOTAL SCORE label + big score + next rank requirement */}
        <div className={styles.gaugeRow1}>
          <div className={styles.gaugeHeaderLeft}>
            <span className={styles.gaugeLabel}>{t('totalScore')}</span>
            <span className={styles.gaugeBigScore}>{formatScoreCompact(combinedScore)}</span>
          </div>
          <span className={styles.gaugeNextReq}>
            {nextTierScore !== null
              ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
              : t('maxTier')}
          </span>
        </div>

        {/* Row 2: Current rank (left) — Next rank (right) */}
        <div className={styles.gaugeRow2}>
          <span className={styles.gaugeRankCurrent} style={{ color: currentTier.color }}>
            {currentTier.icon} {t(`tiers.${currentTier.id}`)}
          </span>
          <span className={styles.gaugeRankNext} style={nextTier ? { color: nextTier.color } : undefined}>
            {nextTier ? `${nextTier.icon} ${t(`tiers.${nextTier.id}`)}` : '—'}
          </span>
        </div>

        {/* Row 3: Gauge bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})` }}
          />
        </div>

        {/* Row 4: Score markers for current and next tier */}
        <div className={styles.gaugeRow4}>
          <span className={styles.gaugeScore}>{formatScoreCompact(currentTier.minScore)}</span>
          <span className={styles.gaugeScore}>
            {nextTier ? formatScoreCompact(nextTier.minScore) : '∞'}
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
                // Fill aligned with space-between labels: N labels → (N-1) spans
                const count = group.tiers.length;
                let fillPct = 0;
                if (combinedScore < group.tiers[0].minScore) {
                  fillPct = 0;
                } else if (combinedScore >= group.tiers[count - 1].minScore) {
                  fillPct = 100; // reached or passed the last tier label
                } else {
                  const segmentSize = 100 / (count - 1);
                  for (let i = 0; i < count - 1; i++) {
                    if (combinedScore >= group.tiers[i].minScore && combinedScore < group.tiers[i + 1].minScore) {
                      const spanRange = group.tiers[i + 1].minScore - group.tiers[i].minScore;
                      const progress = (combinedScore - group.tiers[i].minScore) / spanRange;
                      fillPct = segmentSize * i + segmentSize * progress;
                      break;
                    }
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
