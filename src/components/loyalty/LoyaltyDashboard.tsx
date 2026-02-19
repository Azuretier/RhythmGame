'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  SCORE_RANK_TIERS,
  getTierByScore,
  scoreProgress,
  scoreToNextTier,
  formatScoreCompact,
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
import ProfileIconImage from '@/components/profile/ProfileIconImage';
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
          {profile?.icon ? (
            <ProfileIconImage iconId={profile.icon} size={56} />
          ) : (
            <span>{currentTier.icon}</span>
          )}
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
            {SCORE_RANK_TIERS.map((tier) => {
              const isActive = tier.id === currentTier.id;
              const isCompleted = combinedScore >= tier.maxScore && tier.maxScore !== Infinity;

              return (
                <div
                  key={tier.id}
                  className={`${styles.tierStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                >
                  {isCompleted && <span className={styles.tierStepCheck}>&#10003;</span>}
                  <span className={styles.tierStepIcon}>{tier.icon}</span>
                  <div className={styles.tierStepName} style={{ color: isActive ? tier.color : undefined }}>
                    {t(`tiers.${tier.id}`)}
                  </div>
                  <div className={styles.tierStepXP}>
                    {tier.maxScore === Infinity ? `${formatScoreCompact(tier.minScore)}+` : `${formatScoreCompact(tier.minScore)} - ${formatScoreCompact(tier.maxScore)}`}
                  </div>
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
