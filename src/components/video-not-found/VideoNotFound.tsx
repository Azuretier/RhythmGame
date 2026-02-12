'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './VideoNotFound.module.css';

const COMMUNITY_LINKS = {
    discord: 'https://discord.gg/z5Q2MSFWuu',
    youtube: 'https://youtube.com/@azuretya',
    github: 'https://github.com/Azuretier/azuretier.net',
};

export default function VideoNotFound() {
    const t = useTranslations('videoNotFound');

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={styles.iconWrapper}>
                    <span className={styles.icon}>▶</span>
                    <div className={styles.iconSlash} />
                </div>

                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.description}>{t('description')}</p>

                <div className={styles.divider} />

                <h2 className={styles.ctaHeading}>{t('ctaHeading')}</h2>
                <p className={styles.ctaDescription}>{t('ctaDescription')}</p>

                <div className={styles.linkGrid}>
                    <motion.a
                        href={COMMUNITY_LINKS.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.linkCard} ${styles.discord}`}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className={styles.linkIcon}>💬</span>
                        <div>
                            <span className={styles.linkTitle}>{t('discordTitle')}</span>
                            <span className={styles.linkDescription}>{t('discordDescription')}</span>
                        </div>
                    </motion.a>

                    <motion.a
                        href={COMMUNITY_LINKS.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.linkCard} ${styles.youtube}`}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className={styles.linkIcon}>▶</span>
                        <div>
                            <span className={styles.linkTitle}>{t('youtubeTitle')}</span>
                            <span className={styles.linkDescription}>{t('youtubeDescription')}</span>
                        </div>
                    </motion.a>

                    <motion.a
                        href={COMMUNITY_LINKS.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.linkCard} ${styles.github}`}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className={styles.linkIcon}>⌨</span>
                        <div>
                            <span className={styles.linkTitle}>{t('githubTitle')}</span>
                            <span className={styles.linkDescription}>{t('githubDescription')}</span>
                        </div>
                    </motion.a>
                </div>

                <Link href="/" className={styles.backLink}>
                    ← {t('backToLobby')}
                </Link>
            </motion.div>
        </div>
    );
}
