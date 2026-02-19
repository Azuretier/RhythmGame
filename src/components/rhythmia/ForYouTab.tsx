'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import styles from './ForYouTab.module.css';
import forYouConfig from '../../../for-you.config.json';

interface ForYouTabProps {
    locale: string;
    unlockedAdvancements: number;
    totalAdvancements: number;
}

/** Tag-specific thumbnails for tutorial resources */
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

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    ja: { beginner: '初級', intermediate: '中級', advanced: '上級' },
};

/** Map tags to difficulty levels */
const TAG_DIFFICULTY: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    beginner: 'beginner', fundamentals: 'beginner', core: 'beginner', exploration: 'beginner',
    intermediate: 'intermediate', strategy: 'intermediate', recovery: 'intermediate', scoring: 'intermediate',
    advanced: 'advanced', competitive: 'advanced',
};

/** Map tutorial IDs to wiki subsections for deep linking */
const TUTORIAL_WIKI_SECTION: Record<string, string> = {
    'tut-stacking': 'tut-beginner', 'tut-harddrop': 'tut-beginner', 'tut-rhythm': 'tut-beginner',
    'tut-combos': 'tut-intermediate', 'tut-back2back': 'tut-intermediate', 'tut-downstack': 'tut-intermediate',
    'tut-tspin': 'tut-advanced', 'tut-opener': 'tut-advanced', 'tut-finesse': 'tut-advanced',
    'tut-garbage': 'tut-intermediate', 'tut-ranked': 'tut-intermediate',
    'tut-crafting': 'tut-beginner', 'tut-items': 'tut-intermediate', 'tut-worlds': 'tut-beginner',
};

/** A small curated set of tutorials covering beginner to advanced */
const FEATURED_TUTORIAL_IDS = [
    'tut-stacking',
    'tut-rhythm',
    'tut-combos',
    'tut-tspin',
    'tut-ranked',
];

const FEATURED_TUTORIALS = FEATURED_TUTORIAL_IDS
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

export default function ForYouTab({ locale }: ForYouTabProps) {
    const t = useTranslations('forYou');
    const tw = useTranslations('wiki');
    const diffLabels = DIFFICULTY_LABELS[locale] || DIFFICULTY_LABELS.en;

    return (
        <div className={styles.forYouContainer}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('columnTutorials')}</h2>
            </div>

            {/* First 2 tutorials - always visible */}
            <div className={styles.widgetList}>
                {FEATURED_TUTORIALS.slice(0, 2).map((tut, index) => {
                    const wikiPrefix = locale === 'ja' ? '' : '/en';
                    const wikiSection = TUTORIAL_WIKI_SECTION[tut.id] || 'tut-beginner';
                    return (
                        <motion.a
                            key={tut.id}
                            href={`${wikiPrefix}/wiki#tutorials/${wikiSection}`}
                            className={`${styles.widget} ${styles.tutorial}`}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
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
                                </div>
                                <h3 className={styles.widgetTitle}>{tw(tut.titleKey)}</h3>
                            </div>
                            <span className={styles.widgetArrow}>&rarr;</span>
                        </motion.a>
                    );
                })}
            </div>

            {/* Remaining tutorials - scrollable container */}
            {FEATURED_TUTORIALS.length > 2 && (
                <div className={styles.scrollableContainer}>
                    <div className={styles.widgetList}>
                        {FEATURED_TUTORIALS.slice(2).map((tut, index) => {
                            const wikiPrefix = locale === 'ja' ? '' : '/en';
                            const wikiSection = TUTORIAL_WIKI_SECTION[tut.id] || 'tut-beginner';
                            return (
                                <motion.a
                                    key={tut.id}
                                    href={`${wikiPrefix}/wiki#tutorials/${wikiSection}`}
                                    className={`${styles.widget} ${styles.tutorial}`}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: (index + 2) * 0.05 }}
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
                                        </div>
                                        <h3 className={styles.widgetTitle}>{tw(tut.titleKey)}</h3>
                                    </div>
                                    <span className={styles.widgetArrow}>&rarr;</span>
                                </motion.a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
