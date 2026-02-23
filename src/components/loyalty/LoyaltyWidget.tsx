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

export default function LoyaltyWidget() {
  const t = useTranslations('loyalty');
  const tAdv = useTranslations('advancements');
  const router = useRouter();
  const { profile } = useProfile();
  const profileIcon = profile ? getIconById(profile.icon) : null;

  const [tab, setTab] = useState<'summary' | 'details'>('summary');
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
      {/* Tabs — attached to the right side of the widget */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'summary' ? styles.tabActive : ''}`}
          onClick={() => setTab('summary')}
        >
          {currentTier.icon}
        </button>
        <button
          className={`${styles.tab} ${tab === 'details' ? styles.tabActive : ''}`}
          onClick={() => setTab('details')}
        >
          ≡
        </button>
      </div>

      {/* ===== SUMMARY TAB — Compact horizontal card ===== */}
      {tab === 'summary' && (
        <div className={styles.compact}>
          {/* Left: Profile avatar + name + code + tier */}
          <div className={styles.compactLeft}>
            {profile && profileIcon ? (
              <div
                className={styles.compactAvatar}
                style={{ backgroundColor: profileIcon.bgColor, color: profileIcon.color }}
              >
                {profileIcon.emoji}
              </div>
            ) : (
              <div
                className={styles.compactAvatar}
                style={{ backgroundColor: currentTier.color + '20', color: currentTier.color }}
              >
                {currentTier.icon}
              </div>
            )}
            <div className={styles.compactMeta}>
              <span className={styles.compactName}>{profile?.name ?? 'Player'}</span>
              {profile?.friendCode && (
                <span className={styles.compactCode}>{profile.friendCode}</span>
              )}
              <span className={styles.compactTier} style={{ color: currentTier.color }}>
                {currentTier.icon} {t(`tiers.${currentTier.id}`)}
              </span>
            </div>
          </div>

          {/* Center: Score label + progress bar + streak dots */}
          <div className={styles.compactCenter}>
            <div className={styles.compactScoreLabel}>{t('totalScore')}</div>
            <div className={styles.compactBar}>
              <div
                className={styles.compactBarFill}
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}66, ${currentTier.color})` }}
              />
            </div>
            <div className={styles.compactDots}>
              {DAY_LABELS.map((label, i) => {
                const isFilled = i < currentStreak % 7 || currentStreak >= 7;
                const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                return (
                  <div
                    key={i}
                    className={`${styles.compactDot} ${isFilled ? styles.filled : ''} ${isToday ? styles.today : ''}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Streak count + bonus XP + next rank */}
          <div className={styles.compactRight}>
            <span className={styles.compactStreak}>
              {currentStreak} {t('streakDays')}
            </span>
            <span className={styles.compactBonus}>
              +{dailyBonusXP} {t('bonusXP')}
            </span>
            <span className={styles.compactNextReq}>
              {nextTierScore !== null
                ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
                : t('maxTier')}
            </span>
          </div>
        </div>
      )}

      {/* ===== DETAILS TAB — Expanded card ===== */}
      {tab === 'details' && (
        <div className={styles.details}>
          {/* Profile header */}
          <div className={styles.detailProfile}>
            {profile && profileIcon ? (
              <div
                className={styles.detailAvatar}
                style={{ backgroundColor: profileIcon.bgColor, color: profileIcon.color }}
              >
                {profileIcon.emoji}
              </div>
            ) : (
              <div
                className={styles.detailAvatar}
                style={{ backgroundColor: currentTier.color + '20', color: currentTier.color }}
              >
                {currentTier.icon}
              </div>
            )}
            <div className={styles.detailProfileMeta}>
              <span className={styles.detailProfileName}>{profile?.name ?? 'Player'}</span>
              {profile?.friendCode && (
                <span className={styles.detailProfileCode}>{profile.friendCode}</span>
              )}
            </div>
          </div>

          {/* Rank hero */}
          <div className={styles.detailHero}>
            <div
              className={styles.detailEmblem}
              style={{
                borderColor: currentTier.color,
                boxShadow: `0 0 24px ${currentTier.color}20`,
              }}
            >
              <span className={styles.detailEmblemIcon}>{currentTier.icon}</span>
            </div>
            <div>
              <div className={styles.detailRankName} style={{ color: currentTier.color }}>
                {t(`tiers.${currentTier.id}`)}
              </div>
              <div className={styles.detailScore}>{formatScoreCompact(combinedScore)} SP</div>
            </div>
          </div>

          {/* Progress */}
          <div className={styles.detailProgress}>
            <div className={styles.detailProgressMeta}>
              <span style={{ color: currentTier.color }}>{currentTier.icon} {t(`tiers.${currentTier.id}`)}</span>
              <span className={styles.detailProgressNext}>
                {nextTier ? `${nextTier.icon} ${t(`tiers.${nextTier.id}`)}` : '—'}
              </span>
            </div>
            <div className={styles.detailBar}>
              <div
                className={styles.detailBarFill}
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})` }}
              />
            </div>
            <div className={styles.detailProgressReq}>
              {nextTierScore !== null
                ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
                : t('maxTier')}
            </div>
          </div>

          {/* Daily Bonus */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>{t('sections.dailyBonus')}</h3>
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

          {/* Stats */}
          <div className={styles.detailSection}>
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

          {/* Tier Roadmap */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>{t('sections.tierRoadmap')}</h3>
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

          {/* Recent Advancements */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>{t('sections.badges')}</h3>
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
          </div>

          {/* View full page */}
          <button className={styles.viewAll} onClick={() => router.push('/loyalty')}>
            {t('viewAll')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
