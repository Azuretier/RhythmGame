'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  LOYALTY_TIERS,
  LOYALTY_BADGES,
  getTierByXP,
  tierProgress,
  xpToNextTier,
  recordDailyVisit,
  syncFromGameplay,
  recordPollVote,
} from '@/lib/loyalty';
import type { LoyaltyState } from '@/lib/loyalty';
import { loadAdvancementState } from '@/lib/advancements/storage';
import styles from './loyalty.module.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const POLL_STORAGE_KEY = 'rhythmia_loyalty_poll';

interface PollState {
  voted: boolean;
  selectedOption: number | null;
  results: number[];
}

export default function LoyaltyDashboard() {
  const t = useTranslations('loyalty');
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [pollState, setPollState] = useState<PollState>({
    voted: false,
    selectedOption: null,
    results: [42, 28, 18, 12],
  });

  // Load saved poll state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POLL_STORAGE_KEY);
      if (saved) {
        setPollState(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Initialize loyalty state
  useEffect(() => {
    // Record daily visit
    let loyaltyState = recordDailyVisit();

    // Sync with game data
    const advState = loadAdvancementState();
    loyaltyState = syncFromGameplay(
      advState.stats.totalGamesPlayed,
      advState.stats.totalScore,
      advState.unlockedIds.length,
    );

    setState(loyaltyState);
  }, []);

  const handlePollSelect = useCallback((optionIndex: number) => {
    if (pollState.voted) return;
    setPollState(prev => ({ ...prev, selectedOption: optionIndex }));
  }, [pollState.voted]);

  const handlePollVote = useCallback(() => {
    if (pollState.selectedOption === null || pollState.voted) return;

    const newResults = [...pollState.results];
    newResults[pollState.selectedOption] += 1;

    const newPollState: PollState = {
      voted: true,
      selectedOption: pollState.selectedOption,
      results: newResults,
    };

    setPollState(newPollState);

    try {
      localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(newPollState));
    } catch {}

    const updated = recordPollVote();
    setState(updated);
  }, [pollState]);

  if (!state) return null;

  const currentTier = getTierByXP(state.xp);
  const progress = tierProgress(state.xp);
  const nextTierXP = xpToNextTier(state.xp);

  const totalPollVotes = pollState.results.reduce((sum, v) => sum + v, 0);

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
              {state.unlockedBadgeIds.length}/{LOYALTY_BADGES.length}
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

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.badges')}</h2>
          <div className={styles.badgesGrid}>
            {LOYALTY_BADGES.map((badge) => {
              const isUnlocked = state.unlockedBadgeIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`${styles.badgeCard} ${isUnlocked ? styles.unlocked : styles.locked}`}
                >
                  <span className={styles.badgeIcon}>
                    {t(`badges.${badge.id}.icon`)}
                  </span>
                  <div className={styles.badgeName}>
                    {t(`badges.${badge.id}.name`)}
                  </div>
                  <div className={styles.badgeDesc}>
                    {t(`badges.${badge.id}.desc`)}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Community Poll */}
        <motion.div
          className={styles.pollSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className={styles.sectionTitle}>{t('sections.community')}</h2>
          <div className={styles.pollCard}>
            <div className={styles.pollQuestion}>{t('poll.question')}</div>

            {!pollState.voted ? (
              <>
                <div className={styles.pollOptions}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`${styles.pollOption} ${pollState.selectedOption === i ? styles.selected : ''}`}
                      onClick={() => handlePollSelect(i)}
                    >
                      <div className={`${styles.pollRadio} ${pollState.selectedOption === i ? styles.checked : ''}`} />
                      {t(`poll.options.${i}`)}
                    </div>
                  ))}
                </div>
                <button
                  className={styles.pollVoteButton}
                  onClick={handlePollVote}
                  disabled={pollState.selectedOption === null}
                >
                  {t('poll.vote')}
                </button>
              </>
            ) : (
              <div className={styles.pollResults}>
                {[0, 1, 2, 3].map((i) => {
                  const percentage = totalPollVotes > 0 ? Math.round((pollState.results[i] / totalPollVotes) * 100) : 0;
                  return (
                    <div key={i} className={styles.pollResultBar}>
                      <div className={styles.pollResultLabel}>
                        <span>{t(`poll.options.${i}`)}</span>
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
