'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import styles from './LoyaltyPanel.module.css';

export default function LoyaltyPanel() {
    const t = useTranslations('loyalty');
    const tAdv = useTranslations('advancements');
    const router = useRouter();
    const { profile } = useProfile();
    const profileIcon = profile ? getIconById(profile.icon) : null;

    const [isOpen, setIsOpen] = useState(false);
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

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

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
        <>
            {/* Tab handle — always visible on right edge */}
            <button
                className={`${styles.tabHandle} ${isOpen ? styles.tabOpen : ''}`}
                onClick={toggle}
                style={{ borderColor: currentTier.color }}
            >
                <span className={styles.tabIcon}>{currentTier.icon}</span>
                <span className={styles.tabLabel}>{t(`tiers.${currentTier.id}`)}</span>
            </button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={toggle}
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        className={styles.panel}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        {/* Panel header */}
                        <div className={styles.panelHeader}>
                            {profile && profileIcon && (
                                <div className={styles.profileInfo}>
                                    <div
                                        className={styles.profileAvatar}
                                        style={{ backgroundColor: profileIcon.bgColor, color: profileIcon.color }}
                                    >
                                        {profileIcon.emoji}
                                    </div>
                                    <div className={styles.profileMeta}>
                                        <span className={styles.profileName}>{profile.name}</span>
                                        <span className={styles.profileCode}>{profile.friendCode}</span>
                                    </div>
                                </div>
                            )}
                            <button className={styles.closeBtn} onClick={toggle}>✕</button>
                        </div>

                        {/* Scrollable content */}
                        <div className={styles.panelBody}>
                            {/* Rank hero */}
                            <div className={styles.rankHero}>
                                <div
                                    className={styles.rankEmblem}
                                    style={{
                                        borderColor: currentTier.color,
                                        boxShadow: `0 0 30px ${currentTier.color}25`,
                                    }}
                                >
                                    <span className={styles.rankEmblemIcon}>{currentTier.icon}</span>
                                </div>
                                <div>
                                    <div className={styles.rankTitle} style={{ color: currentTier.color }}>
                                        {t(`tiers.${currentTier.id}`)}
                                    </div>
                                    <div className={styles.rankScore}>
                                        {formatScoreCompact(combinedScore)} SP
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className={styles.progressSection}>
                                <div className={styles.progressMeta}>
                                    <span style={{ color: currentTier.color }}>{currentTier.icon} {t(`tiers.${currentTier.id}`)}</span>
                                    <span className={styles.progressNext}>
                                        {nextTier ? `${nextTier.icon} ${t(`tiers.${nextTier.id}`)}` : '—'}
                                    </span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTier.color}88, ${currentTier.color})` }}
                                    />
                                </div>
                                <div className={styles.progressReq}>
                                    {nextTierScore !== null
                                        ? t('scoreToNext', { score: formatScoreCompact(nextTierScore) })
                                        : t('maxTier')}
                                </div>
                            </div>

                            {/* Daily Bonus */}
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>{t('sections.dailyBonus')}</h3>
                                <div className={styles.bonusGrid}>
                                    <div className={styles.bonusStat}>
                                        <div className={styles.bonusValue}>{totalVisits}</div>
                                        <div className={styles.bonusLabel}>{t('stats.totalVisits')}</div>
                                    </div>
                                    <div className={styles.bonusStat}>
                                        <div className={styles.bonusValue}>{currentStreak}</div>
                                        <div className={styles.bonusLabel}>{t('stats.currentStreak')}</div>
                                    </div>
                                    <div className={styles.bonusStat}>
                                        <div className={styles.bonusValue}>{bestStreak}</div>
                                        <div className={styles.bonusLabel}>{t('stats.bestStreak')}</div>
                                    </div>
                                    <div className={styles.bonusStat}>
                                        <div className={styles.bonusValue} style={{ color: '#4CAF50' }}>+{dailyBonusXP}</div>
                                        <div className={styles.bonusLabel}>{t('stats.bonusXP')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>{t('sections.stats')}</h3>
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
                            </div>

                            {/* Tier Roadmap */}
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>{t('sections.tierRoadmap')}</h3>
                                <div className={styles.tierRoadmap}>
                                    {rankGroups.map((group) => {
                                        const isActive = group.tiers.some(t => t.id === currentTier.id);
                                        const isCompleted = combinedScore >= group.maxScore && group.maxScore !== Infinity;
                                        return (
                                            <div
                                                key={group.groupId}
                                                className={`${styles.tierStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                                            >
                                                {isCompleted && <span className={styles.tierCheck}>✓</span>}
                                                <span className={styles.tierIcon} style={isActive || isCompleted ? { color: group.color } : undefined}>
                                                    {group.icon}
                                                </span>
                                                <div className={styles.tierMeta}>
                                                    <span className={styles.tierName}>{t(`tierGroups.${group.groupId}`)}</span>
                                                    <span className={styles.tierXP}>
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
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>{t('sections.badges')}</h3>
                                {recentAdvancements.length > 0 ? (
                                    <div className={styles.badgesGrid}>
                                        {recentAdvancements.map((adv) => adv && (
                                            <div key={adv.id} className={styles.badgeCard}>
                                                <span className={styles.badgeIcon}><PixelIcon name={adv.icon} size={16} /></span>
                                                <div className={styles.badgeName}>{tAdv(`${adv.id}.name`)}</div>
                                                <div className={styles.badgeDesc}>{tAdv(`${adv.id}.desc`)}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyBadges}>{tAdv('locked')}</div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={styles.panelFooter}>
                            <button className={styles.viewAllBtn} onClick={() => { router.push('/loyalty'); setIsOpen(false); }}>
                                {t('viewAll')}
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
