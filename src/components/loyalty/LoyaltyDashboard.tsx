'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  getTierByScore,
  scoreProgress,
  scoreToNextTier,
  formatScoreCompact,
  getRankGroups,
  buildScoreRankingState,
  recordDailyVisit,
  syncGameplayStats,
  initAuth,
  fetchActivePoll,
  getUserVote,
  submitVote,
  ensureActivePoll,
} from '@/lib/loyalty';
import type { ScoreRankingState, Poll } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState } from '@/lib/advancements';
import type { AdvancementState } from '@/lib/advancements';
import { PixelIcon } from '@/components/rhythmia/PixelIcon';
import { useProfile } from '@/lib/profile/context';
import { getIconById } from '@/lib/profile/types';
import styles from './loyalty.module.css';

export default function LoyaltyDashboard() {
  const t = useTranslations('loyalty');
  const tAdv = useTranslations('advancements');
  const locale = useLocale();
  const { profile } = useProfile();
  const [state, setState] = useState<ScoreRankingState | null>(null);
  const [advState, setAdvState] = useState<AdvancementState | null>(null);

  // Poll state — driven by Firestore
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [pollLoading, setPollLoading] = useState(true);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const rankGroups = useMemo(() => getRankGroups(), []);

  // Initialize score ranking + auth + poll
  useEffect(() => {
    const advancementState = loadAdvancementState();

    let dailyState = recordDailyVisit();
    dailyState = syncGameplayStats(
      advancementState.stats.totalScore,
      advancementState.stats.bestScorePerGame,
      advancementState.stats.totalGamesPlayed,
      advancementState.unlockedIds.length,
      advancementState.stats.totalLines,
    );

    setState(dailyState);
    setAdvState(advancementState);

    // Auth + poll (async)
    (async () => {
      await initAuth();

      // Ensure a default poll exists, then load it
      await ensureActivePoll();
      const activePoll = await fetchActivePoll();
      setPoll(activePoll);

      if (activePoll) {
        const existingVote = await getUserVote(activePoll.id);
        if (existingVote) {
          setHasVoted(true);
          setSelectedOption(existingVote.optionIndex);
        }
      }

      setPollLoading(false);
    })();
  }, []);

  const handlePollSelect = useCallback((optionIndex: number) => {
    if (hasVoted) return;
    setSelectedOption(optionIndex);
  }, [hasVoted]);

  const handlePollVote = useCallback(async () => {
    if (selectedOption === null || hasVoted || !poll || isVoting) return;
    setIsVoting(true);

    const success = await submitVote(poll.id, selectedOption);
    if (success) {
      // Update local poll data optimistically
      const updatedVotes = [...poll.votes];
      updatedVotes[selectedOption] += 1;
      setPoll({
        ...poll,
        votes: updatedVotes,
        totalVotes: poll.totalVotes + 1,
      });
      setHasVoted(true);
    }

    setIsVoting(false);
  }, [selectedOption, hasVoted, poll, isVoting]);

  if (!state) return null;

  const profileIcon = profile ? getIconById(profile.icon) : undefined;
  const { totalScore, bestScorePerGame, totalGamesPlayed, totalLines, currentStreak, bestStreak, totalVisits, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const progress = scoreProgress(combinedScore);
  const nextTierScore = scoreToNextTier(combinedScore);

  const pollText = (obj: { ja: string; en: string }) => (locale === 'ja' ? obj.ja : obj.en);

  // Recent advancements — last 8 unlocked, newest first
  const recentAdvancements = advState
    ? advState.unlockedIds
      .slice(-8)
      .reverse()
      .map((id) => ADVANCEMENTS.find((a) => a.id === id))
      .filter(Boolean)
    : [];

  return (
    <div className={styles.page}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.logo}>RHYTHMIA</div>
        <a href="/" className={styles.backLink}>
          {t('backToLobby')}
        </a>
      </motion.header>

      <div className={styles.container}>
        {/* Profile Display */}
        <motion.div
          className={styles.tierDisplay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span
            className={styles.tierIcon}
            style={profileIcon ? { background: profileIcon.bgColor, color: profileIcon.color, borderRadius: '50%', width: '56px', height: '56px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}
          >
            {profileIcon?.emoji ?? currentTier.icon}
          </span>
          <div className={styles.heroScore}>{profile?.name ?? '—'}</div>
          <p className={styles.tierLabel}>{profile?.friendCode ?? ''}</p>
          <h1 className={styles.tierName} style={{ color: currentTier.color }}>
            {currentTier.icon} {t(`tiers.${currentTier.id}`)}
          </h1>

          <div className={styles.progressContainer}>
            <p className={styles.tierLabel} style={{ marginBottom: 8 }}>{t('totalScore')}</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})`,
                }}
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
        </motion.div>

        {/* Daily Bonus Stats */}
        <motion.div
          className={styles.dailyBonusCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <h3 className={styles.dailyBonusTitle}>{t('sections.dailyBonus')}</h3>
          <div className={styles.dailyBonusGrid}>
            <div className={styles.dailyBonusStat}>
              <div className={styles.dailyBonusValue}>{totalVisits}</div>
              <div className={styles.dailyBonusLabel}>{t('stats.totalVisits')}</div>
            </div>
            <div className={styles.dailyBonusStat}>
              <div className={styles.dailyBonusValue}>{currentStreak}</div>
              <div className={styles.dailyBonusLabel}>{t('stats.currentStreak')}</div>
            </div>
            <div className={styles.dailyBonusStat}>
              <div className={styles.dailyBonusValue}>{bestStreak}</div>
              <div className={styles.dailyBonusLabel}>{t('stats.bestStreak')}</div>
            </div>
            <div className={styles.dailyBonusStat}>
              <div className={styles.dailyBonusValue} style={{ color: '#4CAF50' }}>+{dailyBonusXP}</div>
              <div className={styles.dailyBonusLabel}>{t('stats.bonusXP')}</div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className={styles.statsGrid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatScoreCompact(bestScorePerGame)}</div>
            <div className={styles.statLabel}>{t('stats.bestScore')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalGamesPlayed}</div>
            <div className={styles.statLabel}>{t('stats.games')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{totalLines.toLocaleString()}</div>
            <div className={styles.statLabel}>{t('stats.lines')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {advState ? advState.unlockedIds.length : 0}/{ADVANCEMENTS.length}
            </div>
            <div className={styles.statLabel}>{t('stats.badges')}</div>
          </div>
        </motion.div>

        {/* Tier Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.tierRoadmap')}</h2>
          <div className={styles.tierRoadmap}>
            {rankGroups.map((group) => {
              const isActive = group.tiers.some(t => t.id === currentTier.id);
              const isCompleted = combinedScore >= group.maxScore && group.maxScore !== Infinity;

              return (
                <div
                  key={group.groupId}
                  className={`${styles.tierStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                  onMouseEnter={() => setHoveredGroup(group.groupId)}
                  onMouseLeave={() => setHoveredGroup(null)}
                >
                  {isCompleted && <span className={styles.tierStepCheck}>&#10003;</span>}
                  <span className={styles.tierStepIcon}>{group.icon}</span>
                  <div className={styles.tierStepName} style={{ color: isActive ? group.color : undefined }}>
                    {t(`tierGroups.${group.groupId}`)}
                  </div>
                  <div className={styles.tierStepXP}>
                    {group.maxScore === Infinity ? `${formatScoreCompact(group.minScore)}+` : `${formatScoreCompact(group.minScore)} – ${formatScoreCompact(group.maxScore)}`}
                  </div>
                  {/* Hover line-graph widget */}
                  {hoveredGroup === group.groupId && group.tiers.length > 1 && (() => {
                    const count = group.tiers.length;
                    const svgW = 420;
                    const svgH = 140;
                    const padX = 50;
                    const padTop = 28;
                    const padBot = 38;
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
                            strokeWidth="2.5"
                            strokeOpacity="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Gradient fill */}
                          <defs>
                            <linearGradient id={`dg-${group.groupId}`} x1="0" y1="0" x2="0" y2="1">
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
                            fill={`url(#dg-${group.groupId})`}
                          />
                          {/* Horizontal grid lines */}
                          {[0.25, 0.5, 0.75].map((frac) => (
                            <line
                              key={frac}
                              x1={padX}
                              x2={svgW - padX}
                              y1={padTop + graphH * (1 - frac)}
                              y2={padTop + graphH * (1 - frac)}
                              stroke="#fff"
                              strokeOpacity="0.04"
                              strokeWidth="0.5"
                            />
                          ))}
                          {/* Data points + labels */}
                          {group.tiers.map((tier, i) => {
                            const x = padX + i * stepX;
                            const y = padTop + graphH - (i / (count - 1)) * graphH;
                            const isTierActive = tier.id === currentTier.id;
                            const isTierDone = combinedScore >= tier.maxScore && tier.maxScore !== Infinity;
                            const dotOpacity = isTierActive ? 1 : isTierDone ? 0.4 : 0.6;
                            return (
                              <g key={tier.id}>
                                {/* Vertical guide */}
                                <line x1={x} x2={x} y1={y} y2={padTop + graphH} stroke="#fff" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="2,2" />
                                {/* Active pulsing ring */}
                                {isTierActive && (
                                  <circle cx={x} cy={y} r="10" fill="none" stroke={tier.color} strokeWidth="1.5" strokeOpacity="0.4">
                                    <animate attributeName="r" values="9;14;9" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="stroke-opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                                  </circle>
                                )}
                                {/* Dot */}
                                <circle cx={x} cy={y} r={isTierActive ? 6 : 5} fill={tier.color} fillOpacity={dotOpacity} />
                                {/* Checkmark for completed */}
                                {isTierDone && (
                                  <text x={x} y={y + 4} textAnchor="middle" fontSize="8" fill="#fff" fillOpacity="0.8">✓</text>
                                )}
                                {/* Tier name (above dot) */}
                                <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="#fff" fillOpacity={isTierActive ? 0.95 : 0.5} fontWeight={isTierActive ? 600 : 400}>
                                  {t(`tiers.${tier.id}`)}
                                </text>
                                {/* Score (below graph baseline) */}
                                <text x={x} y={svgH - 8} textAnchor="middle" fontSize="8.5" fill="#fff" fillOpacity="0.3" fontFamily="monospace">
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
        </motion.div>

        {/* Recent Advancements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.badges')}</h2>
          {recentAdvancements.length > 0 ? (
            <div className={styles.badgesGrid}>
              {recentAdvancements.map((adv) => adv && (
                <div
                  key={adv.id}
                  className={`${styles.badgeCard} ${styles.unlocked}`}
                >
                  <span className={styles.badgeIcon}><PixelIcon name={adv.icon} size={20} /></span>
                  <div className={styles.badgeName}>
                    {tAdv(`${adv.id}.name`)}
                  </div>
                  <div className={styles.badgeDesc}>
                    {tAdv(`${adv.id}.desc`)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyAdvancements}>
              {tAdv('locked')}
            </div>
          )}
        </motion.div>

        {/* Community Poll — Firestore backed */}
        <motion.div
          className={styles.pollSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.community')}</h2>
          <div className={styles.pollCard}>
            {pollLoading ? (
              <div className={styles.pollQuestion} style={{ opacity: 0.3 }}>
                {t('poll.loading')}
              </div>
            ) : poll ? (
              <>
                <div className={styles.pollQuestion}>{pollText(poll.question)}</div>
                <div className={styles.pollTotalVotes}>
                  {t('poll.totalVotes', { count: poll.totalVotes })}
                </div>

                {!hasVoted ? (
                  <>
                    <div className={styles.pollOptions}>
                      {poll.options.map((option, i) => (
                        <div
                          key={i}
                          className={`${styles.pollOption} ${selectedOption === i ? styles.selected : ''}`}
                          onClick={() => handlePollSelect(i)}
                        >
                          <div className={`${styles.pollRadio} ${selectedOption === i ? styles.checked : ''}`} />
                          {pollText(option)}
                        </div>
                      ))}
                    </div>
                    <button
                      className={styles.pollVoteButton}
                      onClick={handlePollVote}
                      disabled={selectedOption === null || isVoting}
                    >
                      {isVoting ? t('poll.submitting') : t('poll.vote')}
                    </button>
                  </>
                ) : (
                  <div className={styles.pollResults}>
                    {poll.options.map((option, i) => {
                      const percentage = poll.totalVotes > 0 ? Math.round((poll.votes[i] / poll.totalVotes) * 100) : 0;
                      return (
                        <div key={i} className={styles.pollResultBar}>
                          <div className={styles.pollResultLabel}>
                            <span>{pollText(option)}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className={styles.pollResultTrack}>
                            <div
                              className={styles.pollResultFill}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.pollQuestion} style={{ opacity: 0.3 }}>
                {t('poll.noPoll')}
              </div>
            )}
          </div>
        </motion.div>

        {/* How Score Ranking Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.howItWorks')}</h2>
          <div className={styles.strategyGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.strategyCard}>
                <div className={styles.strategyStep}>{t(`strategy.${i}.step`)}</div>
                <div className={styles.strategyTitle}>{t(`strategy.${i}.title`)}</div>
                <div className={styles.strategyDesc}>{t(`strategy.${i}.desc`)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <footer className={styles.footer}>
        RHYTHMIA &copy; 2025
      </footer>
    </div>
  );
}
