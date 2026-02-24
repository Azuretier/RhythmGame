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
  SCORE_RANK_TIERS,
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
import styles from './loyalty.module.css';

export default function LoyaltyDashboard() {
  const t = useTranslations('loyalty');
  const tAdv = useTranslations('advancements');
  const locale = useLocale();

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

  const { totalScore, bestScorePerGame, totalGamesPlayed, totalLines, currentStreak, bestStreak, totalVisits, dailyBonusXP } = state.stats;
  const combinedScore = state.combinedScore;
  const currentTier = getTierByScore(combinedScore);
  const currentTierIndex = SCORE_RANK_TIERS.indexOf(currentTier);
  const nextTier = currentTierIndex < SCORE_RANK_TIERS.length - 1 ? SCORE_RANK_TIERS[currentTierIndex + 1] : null;
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
        {/* Rank Emblem Hero */}
        <motion.div
          className={styles.rankHero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div
            className={styles.rankEmblem}
            style={{
              borderColor: currentTier.color,
              boxShadow: `0 0 60px ${currentTier.color}30, 0 0 120px ${currentTier.color}10`,
            }}
          >
            <span className={styles.rankEmblemIcon}>{currentTier.icon}</span>
          </div>
          <h1 className={styles.rankTitle} style={{ color: currentTier.color }}>
            {t(`tiers.${currentTier.id}`)}
          </h1>
          <div className={styles.rankScore}>
            {formatScoreCompact(combinedScore)} SP
          </div>
        </motion.div>

        {/* Score Gauge Section — 4 rows */}
        <motion.div
          className={styles.gaugeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {/* Row 1: TOTAL SCORE + big number + next rank req */}
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

          {/* Row 4: Score markers */}
          <div className={styles.gaugeRow4}>
            <span className={styles.gaugeScore}>{formatScoreCompact(currentTier.minScore)}</span>
            <span className={styles.gaugeScore}>
              {nextTier ? formatScoreCompact(nextTier.minScore) : '∞'}
            </span>
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
