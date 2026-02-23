'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  SCORE_RANK_TIERS,
} from '@/lib/loyalty';
import type { ScoreRankingState } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState } from '@/lib/advancements';
import type { AdvancementState } from '@/lib/advancements';
import { PixelIcon } from '@/components/rhythmia/PixelIcon';
import styles from './LoyaltyWidget.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type TabId = 'summary' | 'streak' | 'stats' | 'roadmap' | 'badges';

const TABS: { id: TabId; icon: string }[] = [
  { id: 'summary', icon: '◈' },
  { id: 'streak', icon: '🔥' },
  { id: 'stats', icon: '📊' },
  { id: 'roadmap', icon: '🗺' },
  { id: 'badges', icon: '🏅' },
];

export default function LoyaltyWidget() {
  const t = useTranslations('loyalty');
  const tAdv = useTranslations('advancements');
  const router = useRouter();
  const { profile } = useProfile();
  const profileIcon = profile ? getIconById(profile.icon) : null;

  const [tab, setTab] = useState<TabId>('summary');
  const [state, setState] = useState<ScoreRankingState | null>(null);
  const [advState, setAdvState] = useState<AdvancementState | null>(null);
  const rankGroups = useMemo(() => getRankGroups(), []);

  useEffect(() => {
    let dailyState = recordDailyVisit();
    const advancementState = loadAdvancementState();
    dailyState = syncGameplayStats(
      advancementState.stats.totalScore,
      advancementState.stats.bestScorePerGame,
      advancementState.stats.totalGamesPlayed,
      advancementState.unlockedIds.length,
      advancementState.stats.totalLines,
    );
    setState(dailyState);
    setAdvState(advancementState);
  }, []);

  if (!state) return null;

  const { bestScorePerGame, totalGamesPlayed, advancementsUnlocked, totalLines, currentStreak, bestStreak, totalVisits, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const currentTierIndex = SCORE_RANK_TIERS.indexOf(currentTier);
  const nextTier = currentTierIndex < SCORE_RANK_TIERS.length - 1 ? SCORE_RANK_TIERS[currentTierIndex + 1] : null;
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);

  // Recent advancements — last 4 unlocked, newest first
  const recentAdvancements = advState
    ? advState.unlockedIds
      .slice(-4)
      .reverse()
      .map((id) => ADVANCEMENTS.find((a) => a.id === id))
      .filter(Boolean)
    : [];

  return (
    <motion.div
      className={styles.widget}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      {/* Named tab bar — right edge */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
            title={t.id}
          >
            {t.id === 'summary' ? currentTier.icon : t.icon}
          </button>
        ))}
      </div>

      {/* ===== SUMMARY — Profile + Score Gauge ===== */}
      {tab === 'summary' && (
        <div className={styles.compact}>
          {/* Row 1: Profile info */}
          <div className={styles.row1}>
            {profile && profileIcon ? (
              <div
                className={styles.profileAvatar}
                style={{ backgroundColor: profileIcon.bgColor, color: profileIcon.color }}
              >
                {profileIcon.emoji}
              </div>
            ) : (
              <div
                className={styles.profileAvatar}
                style={{ backgroundColor: currentTier.color + '20', color: currentTier.color }}
              >
                {currentTier.icon}
              </div>
            )}
            <div className={styles.profileMeta}>
              <span className={styles.profileName}>{profile?.name ?? 'Player'}</span>
              {profile?.friendCode && (
                <span className={styles.profileCode}>{profile.friendCode}</span>
              )}
              <span className={styles.profileTier} style={{ color: currentTier.color }}>
                {currentTier.icon} {t(`tiers.${currentTier.id}`)}
              </span>
            </div>
          </div>

          {/* Row 2: Score gauge */}
          <div className={styles.row3}>
            <div className={styles.gaugeHeader}>
              <div className={styles.gaugeHeaderLeft}>
                <span className={styles.gaugeLabel}>{t('totalScore')}</span>
                <span className={styles.gaugeValue}>{formatScoreCompact(combinedScore)}</span>
              </div>
              <span className={styles.gaugeHeaderRight}>
                {nextTierScore !== null
                  ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
                  : t('maxTier')}
              </span>
            </div>
            <div className={styles.gaugeRanks}>
              <span className={styles.gaugeRankCurrent} style={{ color: currentTier.color }}>
                {currentTier.icon} {t(`tiers.${currentTier.id}`)}
              </span>
              <span className={styles.gaugeRankNext}>
                {nextTier
                  ? <span style={{ color: nextTier.color }}>{nextTier.icon} {t(`tiers.${nextTier.id}`)}</span>
                  : '—'}
              </span>
            </div>
            <div className={styles.gaugeBar}>
              <div
                className={styles.gaugeBarFill}
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}66, ${currentTier.color})` }}
              />
            </div>
            <div className={styles.gaugeThresholds}>
              <span>{formatScoreCompact(currentTier.minScore)}</span>
              <span className={styles.gaugeThresholdNext}>
                {nextTier ? formatScoreCompact(nextTier.minScore) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== STREAK — Daily streak & bonus ===== */}
      {tab === 'streak' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>{t('sections.dailyBonus')}</h3>

          {/* Streak dots with weekday labels */}
          <div className={styles.streakRow}>
            <div className={styles.streakDots}>
              {DAY_LABELS.map((label, i) => {
                const isFilled = i < currentStreak % 7 || currentStreak >= 7;
                const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                return (
                  <div key={i} className={styles.streakDotWrap}>
                    <div
                      className={`${styles.streakDot} ${isFilled ? styles.filled : ''} ${isToday ? styles.today : ''}`}
                    />
                    <span className={styles.streakDayLabel}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bonus stats */}
          <div className={styles.detailGrid4}>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{totalVisits}</div>
              <div className={styles.detailStatLbl}>{t('stats.totalVisits')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{currentStreak}</div>
              <div className={styles.detailStatLbl}>{t('stats.currentStreak')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{bestStreak}</div>
              <div className={styles.detailStatLbl}>{t('stats.bestStreak')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal} style={{ color: '#4CAF50' }}>+{dailyBonusXP}</div>
              <div className={styles.detailStatLbl}>{t('stats.bonusXP')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STATS — Game statistics ===== */}
      {tab === 'stats' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>STATS</h3>
          <div className={styles.detailGrid4}>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{formatScoreCompact(bestScorePerGame)}</div>
              <div className={styles.detailStatLbl}>{t('stats.bestScore')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{totalGamesPlayed}</div>
              <div className={styles.detailStatLbl}>{t('stats.games')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{totalLines.toLocaleString()}</div>
              <div className={styles.detailStatLbl}>{t('stats.lines')}</div>
            </div>
            <div className={styles.detailStat}>
              <div className={styles.detailStatVal}>{advancementsUnlocked}/{ADVANCEMENTS.length}</div>
              <div className={styles.detailStatLbl}>{t('stats.badges')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ROADMAP — Tier progression ===== */}
      {tab === 'roadmap' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>{t('sections.tierRoadmap')}</h3>
          <div className={styles.detailRoadmap}>
            {rankGroups.map((group) => {
              const isActive = group.tiers.some(t => t.id === currentTier.id);
              const isCompleted = combinedScore >= group.maxScore && group.maxScore !== Infinity;
              return (
                <div
                  key={group.groupId}
                  className={`${styles.detailTierStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                >
                  {isCompleted && <span className={styles.detailTierCheck}>✓</span>}
                  <span className={styles.detailTierIcon} style={isActive || isCompleted ? { color: group.color } : undefined}>
                    {group.icon}
                  </span>
                  <div className={styles.detailTierMeta}>
                    <span className={styles.detailTierName}>{t(`tierGroups.${group.groupId}`)}</span>
                    <span className={styles.detailTierXP}>
                      {group.maxScore === Infinity
                        ? `${formatScoreCompact(group.minScore)}+`
                        : `${formatScoreCompact(group.minScore)} – ${formatScoreCompact(group.maxScore)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== BADGES — Recent advancements ===== */}
      {tab === 'badges' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>{t('sections.badges')}</h3>
          {recentAdvancements.length > 0 ? (
            <div className={styles.detailBadges}>
              {recentAdvancements.map((adv) => adv && (
                <div key={adv.id} className={styles.detailBadge}>
                  <span className={styles.detailBadgeIcon}><PixelIcon name={adv.icon} size={16} /></span>
                  <div className={styles.detailBadgeName}>{tAdv(`${adv.id}.name`)}</div>
                  <div className={styles.detailBadgeDesc}>{tAdv(`${adv.id}.desc`)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.detailEmpty}>{tAdv('locked')}</div>
          )}

          <button className={styles.viewAll} onClick={() => router.push('/loyalty')}>
            {t('viewAll')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
