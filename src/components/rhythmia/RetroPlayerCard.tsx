'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfile } from '@/lib/profile/context';
import { getIconById } from '@/lib/profile/types';
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
import { getTierByPoints, tierProgress, pointsToNextTier } from '@/lib/ranked/constants';
import type { RankedState } from '@/lib/ranked/types';
import PixelIcon from './PixelIcon';
import styles from './RetroPlayerCard.module.css';

const RANKED_STORAGE_KEY = 'rhythmia_ranked_state';
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function loadRankedState(): RankedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(RANKED_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        tier: getTierByPoints(parsed.points || 0),
      };
    }
  } catch { /* empty */ }
  return null;
}

export default function RetroPlayerCard() {
  const t = useTranslations('loyalty');
  const router = useRouter();
  const { profile } = useProfile();
  const [scoreState, setScoreState] = useState<ScoreRankingState | null>(null);
  const [rankedState, setRankedState] = useState<RankedState | null>(null);

  useEffect(() => {
    // Load loyalty/score state
    let dailyState = recordDailyVisit();
    const advState = loadAdvancementState();
    dailyState = syncGameplayStats(
      advState.stats.totalScore,
      advState.stats.bestScorePerGame,
      advState.stats.totalGamesPlayed,
      advState.unlockedIds.length,
      advState.stats.totalLines,
    );
    setScoreState(dailyState);

    // Load ranked state
    setRankedState(loadRankedState());
  }, []);

  if (!scoreState) return null;

  const { totalScore, bestScorePerGame, totalGamesPlayed, advancementsUnlocked, totalLines, currentStreak, dailyBonusXP } = scoreState.stats;
  const combinedScore = scoreState.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);
  const currentIndex = SCORE_RANK_TIERS.indexOf(currentTier);

  // Ranked stats
  const rankedTier = rankedState ? rankedState.tier : null;
  const wins = rankedState?.wins ?? 0;
  const losses = rankedState?.losses ?? 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  // Profile data
  const profileIcon = profile ? getIconById(profile.icon) : null;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      {/* Scanline overlay */}
      <div className={styles.scanlines} />

      {/* === HEADER: Profile + Beats === */}
      <div className={styles.header}>
        <div className={styles.profileRow}>
          <div
            className={styles.avatar}
            style={{
              backgroundColor: profileIcon?.bgColor ?? '#007fff',
              color: profileIcon?.color ?? '#ffffff',
            }}
          >
            {profileIcon?.emoji ?? '?'}
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.playerName}>{profile?.name ?? '???'}</div>
            <div className={styles.friendCode}>{profile?.friendCode ?? ''}</div>
          </div>
        </div>
        <div className={styles.beatsCounter}>
          <PixelIcon name="note" size={16} />
          <span className={styles.beatsValue}>{totalGamesPlayed}</span>
          <span className={styles.beatsLabel}>BEATS</span>
        </div>
      </div>

      {/* === SCORE HERO === */}
      <div className={styles.scoreSection}>
        <div className={styles.tierBadge} style={{ borderColor: currentTier.color, boxShadow: `0 0 12px ${currentTier.color}40` }}>
          <span className={styles.tierIcon}>{currentTier.icon}</span>
        </div>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>TOTAL SCORE</div>
          <div className={styles.scoreValue}>{formatScore(combinedScore)}</div>
          <div className={styles.rankName} style={{ color: currentTier.color }}>
            {t(`tiers.${currentTier.id}`)}
          </div>
        </div>
      </div>

      {/* === WEEKLY STREAK === */}
      <div className={styles.streakSection}>
        <div className={styles.streakDays}>
          {DAY_LABELS.map((label, i) => {
            const isFilled = i < currentStreak % 7 || currentStreak >= 7;
            const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
            return (
              <div
                key={i}
                className={`${styles.dayDot} ${isFilled ? styles.dayFilled : ''} ${isToday ? styles.dayToday : ''}`}
              >
                {label}
              </div>
            );
          })}
        </div>
        <div className={styles.streakMeta}>
          <span className={styles.streakCount}>{currentStreak} {t('streakDays')}</span>
          <span className={styles.bonusXP}>+{dailyBonusXP} XP</span>
        </div>
      </div>

      {/* === PROGRESS BAR === */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})`,
            }}
          />
          <div className={styles.progressGlow} style={{ left: `${progress}%`, background: currentTier.color }} />
        </div>
        <div className={styles.progressLabels}>
          <span>{formatScoreCompact(combinedScore)}</span>
          <span>
            {nextTierScore !== null
              ? `${formatScoreCompact(nextTierScore)} to next`
              : 'MAX'}
          </span>
        </div>
      </div>

      {/* === TIER ROADMAP === */}
      <div className={styles.tierRoadmap}>
        {SCORE_RANK_TIERS.map((tier, i) => {
          const isActive = tier.id === currentTier.id;
          const isCompleted = i < currentIndex;
          return (
            <div
              key={tier.id}
              className={`${styles.tierStep} ${isActive ? styles.tierActive : ''} ${isCompleted ? styles.tierCompleted : ''}`}
              style={isActive ? { borderColor: `${tier.color}80`, boxShadow: `0 0 6px ${tier.color}30` } : undefined}
            >
              <span className={styles.tierStepIcon} style={isActive || isCompleted ? { color: tier.color } : undefined}>
                {tier.icon}
              </span>
              <span className={styles.tierStepName}>
                {t(`tiers.${tier.id}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* === STATS GRID (MERGED) === */}
      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <PixelIcon name="star" size={14} />
          <span className={styles.statValue}>{formatScoreCompact(bestScorePerGame)}</span>
          <span className={styles.statLabel}>BEST</span>
        </div>
        <div className={styles.statBox}>
          <PixelIcon name="controller" size={14} />
          <span className={styles.statValue}>{totalGamesPlayed}</span>
          <span className={styles.statLabel}>GAMES</span>
        </div>
        <div className={styles.statBox}>
          <PixelIcon name="lines" size={14} />
          <span className={styles.statValue}>{totalLines.toLocaleString()}</span>
          <span className={styles.statLabel}>LINES</span>
        </div>
        <div className={styles.statBox}>
          <PixelIcon name="trophy" size={14} />
          <span className={styles.statValue}>{winRate}%</span>
          <span className={styles.statLabel}>WIN RATE</span>
        </div>
      </div>

      {/* === RANKED + ADVANCEMENTS ROW === */}
      <div className={styles.bottomRow}>
        {rankedTier && (
          <div className={styles.rankedBadge}>
            <span className={styles.rankedLabel}>RANKED</span>
            <span className={styles.rankedTier} style={{ color: rankedTier.color }}>
              {rankedTier.name}
            </span>
            <span className={styles.rankedRecord}>{wins}W / {losses}L</span>
          </div>
        )}
        <div className={styles.advBadge}>
          <PixelIcon name="gem" size={14} />
          <span className={styles.advCount}>{advancementsUnlocked}/{ADVANCEMENTS.length}</span>
        </div>
      </div>

      {/* === ACTION BUTTON === */}
      <button className={styles.actionBtn} onClick={() => router.push('/loyalty')}>
        {t('viewAll')}
      </button>
    </motion.div>
  );
}
