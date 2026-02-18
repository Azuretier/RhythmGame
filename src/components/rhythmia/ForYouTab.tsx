'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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

/** Tag-specific thumbnails for tutorial resources (matching wiki page) */
const TUTORIAL_THUMB_MAP: Record<string, string> = {
    technique: '/textures/blocks/obsidian.png',
    fundamentals: '/textures/blocks/stone.png',
    strategy: '/textures/blocks/wood_top.png',
    rhythm: '/textures/blocks/grass_top.png',
    recovery: '/textures/blocks/dirt.png',
    speed: '/textures/blocks/sand.png',
    scoring: '/textures/blocks/brick.png',
    items: '/textures/blocks/leaves.png',
    multiplayer: '/textures/blocks/brick.png',
    worlds: '/textures/blocks/water.png',
    core: '/textures/blocks/grass_top.png',
    competitive: '/textures/blocks/obsidian.png',
    exploration: '/textures/blocks/water.png',
};

/** Map tags to difficulty levels */
const TAG_DIFFICULTY: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    beginner: 'beginner', fundamentals: 'beginner', core: 'beginner', exploration: 'beginner',
    intermediate: 'intermediate', strategy: 'intermediate', recovery: 'intermediate', scoring: 'intermediate',
    advanced: 'advanced', competitive: 'advanced',
};

/** Sorted tutorial order (learning progression) */
const TUTORIAL_ORDER = [
    'tut-stacking', 'tut-harddrop', 'tut-rhythm',
    'tut-combos', 'tut-back2back', 'tut-downstack',
    'tut-tspin', 'tut-opener', 'tut-finesse',
    'tut-garbage', 'tut-ranked',
    'tut-crafting', 'tut-items', 'tut-worlds',
];

const SORTED_TUTORIALS = TUTORIAL_ORDER
    .map((id) => {
        const tut = forYouConfig.tutorials.find((x) => x.id === id);
        if (!tut) return null;
        const difficulty = tut.tags.reduce<'beginner' | 'intermediate' | 'advanced' | undefined>(
            (acc, tag) => acc || TAG_DIFFICULTY[tag], undefined
        ) || 'beginner';
        return {
            id: tut.id,
            titleKey: `res_${tut.id.replace(/-/g, '_')}`,
            tags: tut.tags,
            difficulty,
            thumb: TUTORIAL_THUMB_MAP[tut.tags[0]] || '/textures/blocks/obsidian.png',
        };
    })
    .filter(Boolean) as { id: string; titleKey: string; tags: string[]; difficulty: 'beginner' | 'intermediate' | 'advanced'; thumb: string }[];

function getWikiUrl(card: ContentCard, locale: string): string {
    if (card.url) return card.url;
    const prefix = locale === 'ja' ? '' : '/en';
    return `${prefix}/wiki`;
}

export default function ForYouTab({ locale, unlockedAdvancements, totalAdvancements }: ForYouTabProps) {
    const [cards, setCards] = useState<ContentCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const t = useTranslations('forYou');
    const tw = useTranslations('wiki');

    const fetchContent = useCallback(async () => {
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

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

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
                <button className={styles.retryButton} onClick={fetchContent}>
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
                <button className={styles.refreshButton} onClick={fetchContent}>
                    {t('refresh')}
                </button>
            </div>

            {/* Tutorial Resources from config */}
            <div className={styles.tutorialsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{t('tutorialsTitle')}</h2>
                    <p className={styles.sectionSubtitle}>{t('tutorialsSubtitle')}</p>
                </div>
                <div className={styles.widgetList}>
                    {SORTED_TUTORIALS.map((tut, index) => {
                        const wikiPrefix = locale === 'ja' ? '' : '/en';
                        return (
                            <motion.a
                                key={tut.id}
                                href={`${wikiPrefix}/wiki`}
                                className={`${styles.widget} ${styles.tutorial}`}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.04 }}
                            >
                                <div className={styles.thumbnailFrame}>
                                    <Image
                                        src={tut.thumb}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className={styles.thumbnailImg}
                                        unoptimized
                                    />
                                </div>
                                <div className={styles.widgetContent}>
                                    <div className={styles.widgetTopRow}>
                                        <span className={styles.typeLabel}>{t('types.tutorial')}</span>
                                        <span className={`${styles.diffBadge} ${styles[`diff_${tut.difficulty}`]}`}>
                                            {diffLabels[tut.difficulty]}
                                        </span>
                                        <span className={styles.tagBadge}>{tut.tags[0]}</span>
                                    </div>
                                    <h3 className={styles.widgetTitle}>{tw(tut.titleKey)}</h3>
                                </div>
                                <span className={styles.widgetArrow}>→</span>
                            </motion.a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
