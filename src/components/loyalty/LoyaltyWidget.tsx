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
              {/* Hover line-graph widget */}
              {hoveredGroup === group.groupId && group.tiers.length > 1 && (() => {
                const count = group.tiers.length;
                const svgW = 320;
                const svgH = 120;
                const padX = 40;
                const padTop = 24;
                const padBot = 34;
                const graphH = svgH - padTop - padBot;
                const stepX = (svgW - padX * 2) / (count - 1);

                return (
                  <div className={styles.tierGraphPopup}>
                    <div className={styles.tierGraphHeader}>
                      <span className={styles.tierGraphIcon} style={{ color: group.color }}>{group.icon}</span>
                      <span className={styles.tierGraphTitle}>{t(`tierGroups.${group.groupId}`)}</span>
                    </div>
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className={styles.tierGraphSvg}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Connecting line */}
                      <polyline
                        points={group.tiers.map((_, i) => {
                          const x = padX + i * stepX;
                          const y = padTop + graphH - (i / (count - 1)) * graphH;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={group.color}
                        strokeWidth="2"
                        strokeOpacity="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Gradient fill under line */}
                      <defs>
                        <linearGradient id={`grad-${group.groupId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={group.color} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={group.color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={[
                          ...group.tiers.map((_, i) => {
                            const x = padX + i * stepX;
                            const y = padTop + graphH - (i / (count - 1)) * graphH;
                            return `${x},${y}`;
                          }),
                          `${padX + (count - 1) * stepX},${padTop + graphH}`,
                          `${padX},${padTop + graphH}`,
                        ].join(' ')}
                        fill={`url(#grad-${group.groupId})`}
                      />
                      {/* Data points + labels */}
                      {group.tiers.map((tier, i) => {
                        const x = padX + i * stepX;
                        const y = padTop + graphH - (i / (count - 1)) * graphH;
                        const isTierActive = tier.id === currentTier.id;
                        const isTierDone = combinedScore >= tier.maxScore && tier.maxScore !== Infinity;
                        const dotOpacity = isTierActive ? 1 : isTierDone ? 0.4 : 0.6;
                        return (
                          <g key={tier.id}>
                            {/* Active ring */}
                            {isTierActive && (
                              <circle cx={x} cy={y} r="10" fill="none" stroke={tier.color} strokeWidth="1.5" strokeOpacity="0.4">
                                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="stroke-opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                              </circle>
                            )}
                            {/* Dot */}
                            <circle cx={x} cy={y} r={isTierActive ? 5 : 4} fill={tier.color} fillOpacity={dotOpacity} />
                            {/* Check for done */}
                            {isTierDone && (
                              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="7" fill="#fff" fillOpacity="0.8">✓</text>
                            )}
                            {/* Tier name (above) */}
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="#fff" fillOpacity={isTierActive ? 0.95 : 0.5} fontWeight={isTierActive ? 600 : 400}>
                              {t(`tiers.${tier.id}`)}
                            </text>
                            {/* Score (below graph) */}
                            <text x={x} y={svgH - 6} textAnchor="middle" fontSize="7" fill="#fff" fillOpacity="0.3" fontFamily="monospace">
                              {formatScoreCompact(tier.minScore)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
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
