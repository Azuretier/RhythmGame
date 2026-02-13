'use client';

import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './VideoNotFound.module.css';

interface Video {
    id: string;
    title: string;
    category: string;
    url: string;
}

interface VideoNotFoundProps {
    videos: Video[];
    youtubeChannel: string;
}

const COMMUNITY_LINKS = {
    discord: 'https://discord.gg/z5Q2MSFWuu',
    youtube: 'https://youtube.com/@azuretya',
    github: 'https://github.com/Azuretier/azuretier.net',
};

function getEmbedUrl(url: string): string {
    const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
        return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;
    }
    return url;
}

export default function VideoNotFound({ videos, youtubeChannel }: VideoNotFoundProps) {
    const t = useTranslations('videoNotFound');
    const searchParams = useSearchParams();

    const topic = searchParams.get('topic') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    const hasVideos = videos.length > 0;

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Topic header */}
                {topic && (
                    <div className={styles.topicHeader}>
                        <span className={styles.topicLabel}>{t('topicLabel')}</span>
                        <h1 className={styles.topicTitle}>{topic}</h1>
                        {tags.length > 0 && (
                            <div className={styles.topicTags}>
                                {tags.map((tag) => (
                                    <span key={tag} className={styles.topicTag}>{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!topic && (
                    <div className={styles.topicHeader}>
                        <h1 className={styles.topicTitle}>{t('title')}</h1>
                    </div>
                )}

                {/* Video gallery */}
                {hasVideos && (
                    <section className={styles.gallerySection}>
                        <h2 className={styles.galleryHeading}>{t('relatedVideos')}</h2>
                        <div className={styles.videoGrid}>
                            {videos.map((video, index) => (
                                <motion.div
                                    key={video.id}
                                    className={styles.videoCard}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.08 }}
                                >
                                    <div className={styles.videoEmbed}>
                                        <iframe
                                            src={getEmbedUrl(video.url)}
                                            title={video.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    <div className={styles.videoInfo}>
                                        <span className={styles.videoTitle}>{video.title}</span>
                                        <span className={styles.videoCategory}>{video.category}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <a
                            href={youtubeChannel}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.channelLink}
                        >
                            {t('viewChannel')} →
                        </a>
                    </section>
                )}

                {/* Divider */}
                <div className={styles.divider} />

                {/* Community engagement section */}
                <div className={styles.engagementSection}>
                    <div className={styles.iconWrapper}>
                        <span className={styles.icon}>▶</span>
                        <div className={styles.iconSlash} />
                    </div>

                    <h2 className={styles.engagementTitle}>{t('description')}</h2>

                    <h3 className={styles.ctaHeading}>{t('ctaHeading')}</h3>
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
                </div>

                <Link href="/" className={styles.backLink}>
                    ← {t('backToLobby')}
                </Link>
            </motion.div>
        </div>
    );
}
