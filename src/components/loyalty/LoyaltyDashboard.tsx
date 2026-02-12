'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  LOYALTY_TIERS,
  getTierByXP,
  tierProgress,
  xpToNextTier,
  recordDailyVisit,
  syncFromGameplay,
  recordPollVote,
  initAuth,
  fetchActivePoll,
  getUserVote,
  submitVote,
  ensureActivePoll,
  syncLoyaltyToFirestore,
} from '@/lib/loyalty';
import type { LoyaltyState, Poll } from '@/lib/loyalty';
import { ADVANCEMENTS, loadAdvancementState, syncLoyaltyStats } from '@/lib/advancements';
import type { AdvancementState } from '@/lib/advancements';
import styles from './loyalty.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function LoyaltyDashboard() {
  const t = useTranslations('loyalty');
  const tAdv = useTranslations('advancements');
  const locale = useLocale();
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [advState, setAdvState] = useState<AdvancementState | null>(null);

  // Poll state — driven by Firestore
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [pollLoading, setPollLoading] = useState(true);

  // Initialize loyalty + auth + poll
  useEffect(() => {
    // Loyalty state (local)
    let loyaltyState = recordDailyVisit();
    const advancementState = loadAdvancementState();
    loyaltyState = syncFromGameplay(
      advancementState.stats.totalGamesPlayed,
      advancementState.stats.totalScore,
      advancementState.unlockedIds.length,
    );
    setState(loyaltyState);

    // Sync loyalty stats into advancements system
    const updatedAdv = syncLoyaltyStats({
      totalVisits: loyaltyState.stats.totalVisits,
      bestStreak: loyaltyState.stats.bestStreak,
      pollsVoted: loyaltyState.stats.pollsVoted,
    });
    setAdvState(updatedAdv);

    // Auth + poll (async)
    (async () => {
      await initAuth();

      // Sync loyalty state to Firestore
      syncLoyaltyToFirestore(loyaltyState);

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

      // Award XP for voting
      const updated = recordPollVote();
      setState(updated);
      syncLoyaltyToFirestore(updated);

      // Sync updated poll count into advancements
      const updatedAdv = syncLoyaltyStats({
        totalVisits: updated.stats.totalVisits,
        bestStreak: updated.stats.bestStreak,
        pollsVoted: updated.stats.pollsVoted,
      });
      setAdvState(updatedAdv);
    }

    setIsVoting(false);
  }, [selectedOption, hasVoted, poll, isVoting]);

  if (!state) return null;

  const currentTier = getTierByXP(state.xp);
  const progress = tierProgress(state.xp);
  const nextTierXP = xpToNextTier(state.xp);

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
        {/* Tier Display */}
        <motion.div
          className={styles.tierDisplay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className={styles.tierIcon}>{currentTier.icon}</span>
          <h1 className={styles.tierName} style={{ color: currentTier.color }}>
            {t(`tiers.${currentTier.id}`)}
          </h1>
          <p className={styles.tierLabel}>{t('currentTier')}</p>

          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progress}%`,
                  background: currentTier.color,
                }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span>{state.xp} XP</span>
              <span>
                {nextTierXP !== null
                  ? t('xpToNext', { xp: nextTierXP })
                  : t('maxTier')}
              </span>
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
            <div className={styles.statValue}>{state.stats.totalVisits}</div>
            <div className={styles.statLabel}>{t('stats.visits')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{state.stats.currentStreak}</div>
            <div className={styles.statLabel}>{t('stats.streak')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{state.stats.totalGamesPlayed}</div>
            <div className={styles.statLabel}>{t('stats.games')}</div>
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
            {LOYALTY_TIERS.map((tier) => {
              const isActive = tier.id === currentTier.id;
              const isCompleted = state.xp >= tier.maxXP && tier.maxXP !== Infinity;

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
                    {tier.maxXP === Infinity ? `${tier.minXP}+ XP` : `${tier.minXP} - ${tier.maxXP} XP`}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          className={styles.streakSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.streak')}</h2>
          <div className={styles.streakDisplay}>
            <span className={styles.streakFlame}>
              {state.stats.currentStreak > 0 ? '&#x1F525;' : '&#x26AA;'}
            </span>
            <div className={styles.streakInfo}>
              <div className={styles.streakCount}>{state.stats.currentStreak}</div>
              <div className={styles.streakCountLabel}>{t('streakDays')}</div>
            </div>
            <div className={styles.streakDays}>
              {DAY_LABELS.map((label, i) => {
                const isFilled = i < state.stats.currentStreak % 7 || state.stats.currentStreak >= 7;
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
          </div>
        </motion.div>

        {/* Recent Advancements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.badges')}</h2>
          {recentAdvancements.length > 0 ? (
            <div className={styles.badgesGrid}>
              {recentAdvancements.map((adv) => adv && (
                <div
                  key={adv.id}
                  className={`${styles.badgeCard} ${styles.unlocked}`}
                >
                  <span className={styles.badgeIcon}>{adv.icon}</span>
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
          transition={{ duration: 0.6, delay: 0.6 }}
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

        {/* Strategy / How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
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
