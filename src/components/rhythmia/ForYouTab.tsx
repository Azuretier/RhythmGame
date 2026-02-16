'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import styles from './ForYouTab.module.css';

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

/** Map content types to pixel-art block textures from the public/textures directory */
const TYPE_THUMBNAILS: Record<string, string> = {
    tutorial: '/textures/blocks/obsidian.png',
    video: '/textures/blocks/brick.png',
    tip: '/textures/blocks/grass_top.png',
};

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    ja: { beginner: '初級', intermediate: '中級', advanced: '上級' },
};

function getWikiUrl(card: ContentCard, locale: string): string {
    if (card.url) return card.url;
    const prefix = locale === 'ja' ? '' : '/en';
    return `${prefix}/wiki`;
}

export default function ForYouTab({ locale, unlockedAdvancements, totalAdvancements }: ForYouTabProps) {
    const [cards, setCards] = useState<ContentCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [helpInput, setHelpInput] = useState('');
    const [activeQuery, setActiveQuery] = useState('');
    const t = useTranslations('forYou');

    const fetchContent = useCallback(async (query?: string) => {
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
                    helpPreference: query || undefined,
                }),
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setCards(data.cards || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [locale, unlockedAdvancements, totalAdvancements]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = helpInput.trim();
        setActiveQuery(trimmed);
        fetchContent(trimmed);
    }, [helpInput, fetchContent]);

    useEffect(() => {
        fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const diffLabels = DIFFICULTY_LABELS[locale] || DIFFICULTY_LABELS.en;

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <span className={styles.loadingText}>{t('loading')}</span>
            </div>
        );
    }

    if (error || cards.length === 0) {
        return (
            <div className={styles.errorContainer}>
                <span className={styles.errorText}>{t('error')}</span>
                <button className={styles.retryButton} onClick={() => fetchContent(activeQuery)}>
                    {t('retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={styles.forYouContainer}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('title')}</h2>
                <p className={styles.sectionSubtitle}>{t('subtitle')}</p>
            </div>

            <form className={styles.helpForm} onSubmit={handleSubmit}>
                <div className={styles.helpInputWrapper}>
                    <input
                        type="text"
                        className={styles.helpInput}
                        value={helpInput}
                        onChange={(e) => setHelpInput(e.target.value)}
                        placeholder={t('helpPlaceholder')}
                        maxLength={120}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className={styles.helpSubmit}
                        disabled={loading}
                        aria-label={t('helpSubmitLabel')}
                    >
                        {loading ? (
                            <div className={styles.helpSpinner} />
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 8H14M9 3L14 8L9 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                </div>
                {activeQuery && !loading && (
                    <motion.button
                        type="button"
                        className={styles.clearQuery}
                        onClick={() => { setActiveQuery(''); setHelpInput(''); fetchContent(); }}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {t('clearQuery')}
                    </motion.button>
                )}
            </form>

            <div className={styles.widgetList}>
                <AnimatePresence mode="wait">
                    {cards.map((card, index) => {
                        const href = getWikiUrl(card, locale);
                        const thumbnail = TYPE_THUMBNAILS[card.type];

                        return (
                            <motion.a
                                key={card.id}
                                href={href}
                                target={card.url ? '_blank' : undefined}
                                rel={card.url ? 'noopener noreferrer' : undefined}
                                className={`${styles.widget} ${styles[card.type]}`}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                {/* Pixel-art thumbnail */}
                                <div className={styles.thumbnailFrame}>
                                    {thumbnail ? (
                                        <Image
                                            src={thumbnail}
                                            alt=""
                                            width={36}
                                            height={36}
                                            className={styles.thumbnailImg}
                                            unoptimized
                                        />
                                    ) : (
                                        <span className={styles.thumbnailIcon}>📌</span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className={styles.widgetContent}>
                                    <div className={styles.widgetTopRow}>
                                        <span className={styles.typeLabel}>{t(`types.${card.type}`)}</span>
                                        {card.difficulty && (
                                            <span className={`${styles.diffBadge} ${styles[`diff_${card.difficulty}`]}`}>
                                                {diffLabels[card.difficulty]}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={styles.widgetTitle}>{card.title}</h3>
                                    <p className={styles.widgetDescription}>{card.description}</p>
                                </div>

                                {/* Arrow */}
                                <span className={styles.widgetArrow}>→</span>
                            </motion.a>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className={styles.refreshRow}>
                <button className={styles.refreshButton} onClick={() => fetchContent(activeQuery)}>
                    {t('refresh')}
                </button>
            </div>
        </div>
    );
}
