'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import styles from './ForYouTab.module.css';
import forYouConfig from '../../../for-you.config.json';

interface ContentCard {
    type: 'tutorial' | 'video' | 'tip';
    id: string;
    title: string;
    description: string;
    tags?: string[];
    url?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface ForYouTabProps {
    locale: string;
    unlockedAdvancements: number;
    totalAdvancements: number;
}

const TYPE_ICONS: Record<string, string> = {
    tutorial: '📖',
    video: '▶',
    tip: '💡',
};

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    ja: { beginner: '初級', intermediate: '中級', advanced: '上級' },
};

const STORAGE_KEY = 'rhythmia-foryou-preferences';

function loadPreferences(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { /* ignore */ }
    return [];
}

function savePreferences(prefs: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
}

export default function ForYouTab({ locale, unlockedAdvancements, totalAdvancements }: ForYouTabProps) {
    const [cards, setCards] = useState<ContentCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
    const [hasFetched, setHasFetched] = useState(false);
    const t = useTranslations('forYou');

    // Load saved preferences on mount
    useEffect(() => {
        setSelectedPrefs(loadPreferences());
    }, []);

    const fetchContent = useCallback(async (prefs: string[]) => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/for-you', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locale,
                    unlockedAdvancements,
                    totalAdvancements,
                    preferences: prefs,
                }),
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setCards(data.cards || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
            setHasFetched(true);
        }
    }, [locale, unlockedAdvancements, totalAdvancements]);

    const togglePreference = (prefId: string) => {
        setSelectedPrefs(prev => {
            const next = prev.includes(prefId)
                ? prev.filter(p => p !== prefId)
                : [...prev, prefId];
            savePreferences(next);
            return next;
        });
    };

    const handleGenerate = () => {
        fetchContent(selectedPrefs);
    };

    const diffLabels = DIFFICULTY_LABELS[locale] || DIFFICULTY_LABELS.en;
    const prefOptions = forYouConfig.preferences;
    const lang = locale === 'ja' ? 'ja' : 'en';

    return (
        <div className={styles.forYouContainer}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('title')}</h2>
                <p className={styles.sectionSubtitle}>{t('subtitle')}</p>
            </div>

            {/* Preference Picker */}
            <div className={styles.prefPicker}>
                <p className={styles.prefLabel}>{t('prefLabel')}</p>
                <div className={styles.prefChips}>
                    {prefOptions.map((pref) => (
                        <button
                            key={pref.id}
                            className={`${styles.prefChip} ${selectedPrefs.includes(pref.id) ? styles.prefChipActive : ''}`}
                            onClick={() => togglePreference(pref.id)}
                        >
                            {pref[lang]}
                        </button>
                    ))}
                </div>
                <button
                    className={styles.generateButton}
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? t('loading') : hasFetched ? t('refresh') : t('generate')}
                </button>
            </div>

            {/* Content */}
            {loading && (
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner} />
                    <span className={styles.loadingText}>{t('loading')}</span>
                </div>
            )}

            {!loading && error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorText}>{t('error')}</span>
                    <button className={styles.retryButton} onClick={handleGenerate}>
                        {t('retry')}
                    </button>
                </div>
            )}

            {!loading && !error && cards.length > 0 && (
                <>
                    <div className={styles.cardGrid}>
                        <AnimatePresence mode="wait">
                            {cards.map((card, index) => (
                                <motion.div
                                    key={card.id}
                                    className={`${styles.card} ${styles[card.type]}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.35, delay: index * 0.06 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    onClick={() => card.url && window.open(card.url, '_blank', 'noopener,noreferrer')}
                                    style={{ cursor: card.url ? 'pointer' : 'default' }}
                                >
                                    <div className={styles.cardHeader}>
                                        <span className={styles.typeIcon}>{TYPE_ICONS[card.type] || '📌'}</span>
                                        <span className={styles.typeLabel}>{t(`types.${card.type}`)}</span>
                                        {card.difficulty && (
                                            <span className={`${styles.diffBadge} ${styles[`diff_${card.difficulty}`]}`}>
                                                {diffLabels[card.difficulty]}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={styles.cardTitle}>{card.title}</h3>
                                    <p className={styles.cardDescription}>{card.description}</p>
                                    {card.tags && card.tags.length > 0 && (
                                        <div className={styles.tagList}>
                                            {card.tags.map((tag) => (
                                                <span key={tag} className={styles.tag}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {card.url && (
                                        <div className={styles.cardLink}>
                                            {t('watchOnYouTube')} →
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className={styles.refreshRow}>
                        <button className={styles.refreshButton} onClick={handleGenerate}>
                            {t('refresh')}
                        </button>
                    </div>
                </>
            )}

            {!loading && !error && !hasFetched && cards.length === 0 && (
                <div className={styles.emptyHint}>
                    <p className={styles.emptyText}>{t('emptyHint')}</p>
                </div>
            )}
        </div>
    );
}
