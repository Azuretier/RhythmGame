'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './page.module.css';

const YOUTUBE_CHANNEL = 'https://www.youtube.com/@rhythmia_official';

export default function MakeAVideoPage() {
    const t = useTranslations('makeAVideo');

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
                <Link href="/" className={styles.backLink}>
                    ← {t('back')}
                </Link>

                <div className={styles.hero}>
                    <span className={styles.icon}>🎬</span>
                    <span className={styles.badge}>{t('badge')}</span>
                    <h1 className={styles.title}>{t('title')}</h1>
                    <p className={styles.description}>{t('description')}</p>
                </div>

                <div className={styles.ideas}>
                    <h2 className={styles.ideasTitle}>{t('ideasTitle')}</h2>
                    <ul className={styles.ideasList}>
                        <li>{t('idea1')}</li>
                        <li>{t('idea2')}</li>
                        <li>{t('idea3')}</li>
                        <li>{t('idea4')}</li>
                    </ul>
                </div>

                <div className={styles.actions}>
                    <a
                        href={YOUTUBE_CHANNEL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.ctaButton}
                    >
                        {t('cta')}
                    </a>
                    <Link href="/" className={styles.secondaryLink}>
                        {t('backToGame')}
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
