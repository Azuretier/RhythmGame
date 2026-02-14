'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MapMission, MissionDifficulty } from '@/data/stories/missions';
import styles from './dungeons-map.module.css';

interface MissionDetailProps {
    mission: MapMission;
    progress: {
        completedMissions: string[];
        highestDifficulty: Record<string, MissionDifficulty>;
    };
    onStart: (mission: MapMission, difficulty: MissionDifficulty) => void;
    onClose: () => void;
}

const DIFFICULTY_COLORS: Record<MissionDifficulty, string> = {
    default: '#4CAF50',
    adventure: '#FF9800',
    apocalypse: '#E53935',
};

const DIFFICULTY_ICONS: Record<MissionDifficulty, string> = {
    default: 'I',
    adventure: 'II',
    apocalypse: 'III',
};

export default function MissionDetail({
    mission,
    progress,
    onStart,
    onClose,
}: MissionDetailProps) {
    const t = useTranslations('dungeonMap');
    const [selectedDifficulty, setSelectedDifficulty] = useState<MissionDifficulty>(
        mission.difficulties[0],
    );

    const isCompleted = progress.completedMissions.includes(mission.id);
    const highestCleared = progress.highestDifficulty[mission.id];

    return (
        <div className={styles.detailOverlay} onClick={onClose}>
            <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.detailClose} onClick={onClose}>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                {/* Mission header */}
                <div className={styles.detailHeader}>
                    <div
                        className={styles.detailAccent}
                        style={{ background: mission.accent }}
                    />
                    <div className={styles.detailIcon}>
                        <div
                            className={styles.detailIconGlow}
                            style={{ background: mission.accent }}
                        />
                        {mission.isBoss && <div className={styles.bossLabel}>{t('boss')}</div>}
                    </div>
                    <h2 className={styles.detailTitle}>
                        {t(`missions.${mission.nameKey}`)}
                    </h2>
                    <p className={styles.detailDesc}>
                        {t(`missions.${mission.descKey}`)}
                    </p>
                    {isCompleted && (
                        <div className={styles.detailCleared}>
                            <svg viewBox="0 0 16 16" width="14" height="14">
                                <path d="M3 8l3 3 7-7" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('cleared')}
                        </div>
                    )}
                </div>

                {/* Difficulty selector */}
                {mission.difficulties.length > 1 && (
                    <div className={styles.difficultySection}>
                        <div className={styles.sectionLabel}>{t('difficulty')}</div>
                        <div className={styles.difficultyRow}>
                            {mission.difficulties.map((diff) => {
                                const isActive = selectedDifficulty === diff;
                                const isCleared = highestCleared === diff ||
                                    (highestCleared === 'apocalypse') ||
                                    (highestCleared === 'adventure' && diff === 'default');

                                return (
                                    <button
                                        key={diff}
                                        className={`${styles.difficultyBtn} ${isActive ? styles.difficultyActive : ''}`}
                                        style={{
                                            '--diff-color': DIFFICULTY_COLORS[diff],
                                        } as React.CSSProperties}
                                        onClick={() => setSelectedDifficulty(diff)}
                                    >
                                        <span className={styles.difficultyNumeral}>
                                            {DIFFICULTY_ICONS[diff]}
                                        </span>
                                        <span className={styles.difficultyName}>
                                            {t(`difficulties.${diff}`)}
                                        </span>
                                        {isCleared && (
                                            <svg viewBox="0 0 16 16" width="10" height="10" className={styles.difficultyCheck}>
                                                <path d="M3 8l3 3 7-7" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Power level */}
                <div className={styles.powerSection}>
                    <div className={styles.sectionLabel}>{t('recommendedPower')}</div>
                    <div
                        className={styles.powerValue}
                        style={{ color: DIFFICULTY_COLORS[selectedDifficulty] }}
                    >
                        {mission.powerLevels[selectedDifficulty]}
                    </div>
                </div>

                {/* Rewards */}
                {mission.rewards.length > 0 && (
                    <div className={styles.rewardsSection}>
                        <div className={styles.sectionLabel}>{t('rewards')}</div>
                        <div className={styles.rewardsList}>
                            {mission.rewards.map((reward) => (
                                <div key={reward.id} className={styles.rewardItem}>
                                    <span className={styles.rewardIcon}>
                                        {reward.type === 'xp' && '✦'}
                                        {reward.type === 'item' && '◆'}
                                        {reward.type === 'advancement' && '★'}
                                    </span>
                                    <span className={styles.rewardName}>
                                        {t(`rewards.${reward.nameKey}`)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start button */}
                <button
                    className={styles.startButton}
                    style={{
                        '--accent': mission.accent,
                    } as React.CSSProperties}
                    onClick={() => onStart(mission, selectedDifficulty)}
                >
                    {t('startMission')}
                </button>
            </div>
        </div>
    );
}
