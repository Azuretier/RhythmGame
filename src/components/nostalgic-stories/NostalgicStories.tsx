'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CHAPTERS } from '@/lib/nostalgic-stories/definitions';
import type { ChapterData, ChapterNode } from '@/lib/nostalgic-stories/definitions';
import styles from './NostalgicStories.module.css';

interface NostalgicStoriesProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Framer Motion transition variants per scene transition type ───
function getSplashVariants(transition: ChapterNode['transition']) {
    switch (transition) {
        case 'slide-left':
            return {
                initial: { x: '100%', opacity: 0 },
                animate: { x: 0, opacity: 1 },
                exit: { x: '-30%', opacity: 0 },
            };
        case 'slide-right':
            return {
                initial: { x: '-100%', opacity: 0 },
                animate: { x: 0, opacity: 1 },
                exit: { x: '30%', opacity: 0 },
            };
        case 'slide-up':
            return {
                initial: { y: '100%', opacity: 0 },
                animate: { y: 0, opacity: 1 },
                exit: { y: '-20%', opacity: 0 },
            };
        case 'zoom-in':
            return {
                initial: { scale: 1.3, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.9, opacity: 0 },
            };
        case 'fade':
        default:
            return {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
            };
    }
}

// ─── Particle Overlay ───
function Particles({ type, accent }: { type: ChapterNode['particles']; accent: string }) {
    const particles = useMemo(() => {
        if (type === 'none') return null;
        const count = type === 'stars' ? 40 : type === 'rain' ? 50 : 25;
        return Array.from({ length: count }, (_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 8;
            const duration = type === 'rain' ? 0.6 + Math.random() * 0.4
                : type === 'snow' ? 6 + Math.random() * 6
                : type === 'embers' ? 4 + Math.random() * 4
                : type === 'petals' ? 5 + Math.random() * 5
                : 2 + Math.random() * 3;
            const size = type === 'stars' ? 1 + Math.random() * 2
                : type === 'rain' ? 1
                : type === 'snow' ? 2 + Math.random() * 3
                : type === 'embers' ? 2 + Math.random() * 3
                : 1;

            const animationName = type === 'stars' ? 'twinkle'
                : type === 'rain' ? 'rainfall'
                : type === 'snow' ? 'snowfall'
                : type === 'embers' ? 'emberRise'
                : 'petalFall';

            const className = type === 'stars' ? styles.star
                : type === 'rain' ? styles.raindrop
                : type === 'snow' ? styles.snow
                : type === 'embers' ? styles.ember
                : styles.petal;

            return (
                <div
                    key={i}
                    className={`${styles.particle} ${className}`}
                    style={{
                        left: `${left}%`,
                        top: type === 'stars' ? `${Math.random() * 70}%` : undefined,
                        width: type === 'petals' ? undefined : `${size}px`,
                        height: type === 'petals' || type === 'rain' ? undefined : `${size}px`,
                        animationName,
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                        '--particle-color': accent,
                    } as React.CSSProperties}
                />
            );
        });
    }, [type, accent]);

    if (type === 'none') return null;
    return <div className={styles.particles}>{particles}</div>;
}

// ─── Typewriter Text (Press Start 2P, Japanese-aware) ───
function TypewriterText({ text, isComplete, onComplete, speed }: {
    text: string;
    isComplete: boolean;
    onComplete: () => void;
    speed: number;
}) {
    const [displayedChars, setDisplayedChars] = useState(0);

    useEffect(() => {
        setDisplayedChars(0);
    }, [text]);

    useEffect(() => {
        if (isComplete || displayedChars >= text.length) {
            if (displayedChars >= text.length) onComplete();
            return;
        }
        const timer = setTimeout(() => {
            setDisplayedChars(prev => prev + 1);
        }, speed);
        return () => clearTimeout(timer);
    }, [displayedChars, text, isComplete, onComplete, speed]);

    const shown = isComplete ? text : text.slice(0, displayedChars);
    const done = isComplete || displayedChars >= text.length;

    return (
        <span>
            {shown}
            {!done && <span className={styles.pixelCursor} />}
        </span>
    );
}

// ─── Log Entry type ───
interface LogEntry {
    character: string | null;
    text: string;
}

// ─── Chapter Player (full-screen VN viewer) ───
function ChapterPlayer({ chapter, onClose, onBack }: {
    chapter: ChapterData;
    onClose: () => void;
    onBack: () => void;
}) {
    const [nodeIndex, setNodeIndex] = useState(0);
    const [textComplete, setTextComplete] = useState(false);
    const [showEnd, setShowEnd] = useState(false);
    const [autoMode, setAutoMode] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const t = useTranslations('nostalgicStories');

    const node = chapter.nodes[nodeIndex];
    const isLastNode = nodeIndex >= chapter.nodes.length - 1;

    // Add to log when advancing
    const addToLog = useCallback((n: ChapterNode) => {
        setLog(prev => [...prev, {
            character: n.character_name ? t(n.character_name) : null,
            text: t(n.text),
        }]);
    }, [t]);

    // Add first node to log on mount
    useEffect(() => {
        if (chapter.nodes.length > 0) {
            addToLog(chapter.nodes[0]);
        }
    }, [chapter.nodes, addToLog]);

    const advance = useCallback(() => {
        if (showLog) return;
        if (!textComplete) {
            setTextComplete(true);
            return;
        }
        if (isLastNode) {
            setShowEnd(true);
            setAutoMode(false);
            return;
        }
        setTextComplete(false);
        const nextIndex = nodeIndex + 1;
        setNodeIndex(nextIndex);
        addToLog(chapter.nodes[nextIndex]);
    }, [textComplete, isLastNode, nodeIndex, chapter.nodes, addToLog, showLog]);

    // Skip: jump to end of chapter
    const skipToEnd = useCallback(() => {
        // Log all remaining nodes
        for (let i = nodeIndex + (textComplete ? 1 : 0); i < chapter.nodes.length; i++) {
            addToLog(chapter.nodes[i]);
        }
        setNodeIndex(chapter.nodes.length - 1);
        setTextComplete(true);
        setShowEnd(true);
        setAutoMode(false);
    }, [nodeIndex, textComplete, chapter.nodes, addToLog]);

    // Auto-advance when text finishes
    useEffect(() => {
        if (autoMode && textComplete && !showEnd && !showLog) {
            autoTimerRef.current = setTimeout(() => {
                advance();
            }, 2500);
        }
        return () => {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        };
    }, [autoMode, textComplete, showEnd, showLog, advance]);

    // Keyboard controls
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (showLog) {
            if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
                setShowLog(false);
            }
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            advance();
        } else if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'q' || e.key === 'Q') {
            setShowLog(true);
        } else if (e.key === 'e' || e.key === 'E') {
            setAutoMode(prev => !prev);
        } else if (e.key === 'j' || e.key === 'J') {
            skipToEnd();
        }
    }, [advance, onClose, skipToEnd, showLog]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Splash art transition variants
    const splashVariants = getSplashVariants(node.transition);

    // Ken Burns class
    const kenBurnsClass = node.ken_burns === 'in' ? styles.kenBurnsIn
        : node.ken_burns === 'out' ? styles.kenBurnsOut
        : '';

    // Determine if image_url is a CSS gradient or an actual image URL
    const isGradient = node.image_url.startsWith('linear-gradient') || node.image_url.startsWith('radial-gradient');
    const splashStyle = isGradient
        ? { background: node.image_url }
        : { backgroundImage: `url(${node.image_url})` };

    // ── End screen ──
    if (showEnd) {
        const lastNode = chapter.nodes[chapter.nodes.length - 1];
        const lastIsGradient = lastNode.image_url.startsWith('linear-gradient') || lastNode.image_url.startsWith('radial-gradient');
        const lastSplashStyle = lastIsGradient
            ? { background: lastNode.image_url }
            : { backgroundImage: `url(${lastNode.image_url})` };

        return (
            <motion.div
                className={styles.viewer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className={styles.splashArtLayer}>
                    <div className={styles.splashArt} style={lastSplashStyle} />
                </div>
                <div className={styles.vignette} />
                <motion.div
                    className={styles.endScreen}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.endLabel}>{t('endOfChapter')}</div>
                    <div className={styles.endTitle}>{t(chapter.title_key)}</div>
                    <div className={styles.endActions}>
                        <button
                            className={`${styles.endBtn} ${styles.endBtnPrimary}`}
                            onClick={(e) => { e.stopPropagation(); onBack(); }}
                        >
                            {t('backToStories')}
                        </button>
                        <button
                            className={`${styles.endBtn} ${styles.endBtnSecondary}`}
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                            {t('close')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={styles.viewer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* ── Layer 1: Splash Art with Ken Burns & Transitions ── */}
            <div className={styles.splashArtLayer}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`splash-${nodeIndex}`}
                        className={`${styles.splashArt} ${kenBurnsClass}`}
                        style={splashStyle}
                        initial={splashVariants.initial}
                        animate={splashVariants.animate}
                        exit={splashVariants.exit}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    />
                </AnimatePresence>
            </div>

            {/* Vignette */}
            <div className={styles.vignette} />

            {/* Particles */}
            <Particles type={node.particles} accent={chapter.accent} />

            {/* Bottom gradient for dialog contrast */}
            <div className={styles.dialogGradient} />

            {/* Scene counter */}
            <div className={styles.sceneCounter}>
                {nodeIndex + 1} / {chapter.nodes.length}
            </div>

            {/* Close button */}
            <button
                className={styles.closeButton}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
                ESC
            </button>

            {/* Auto mode indicator */}
            {autoMode && (
                <div className={styles.autoIndicator}>AUTO</div>
            )}

            {/* ── Layer 2 & 3: Retro Dialog Box with Pixel Typography ── */}
            <div className={styles.dialogContainer} onClick={advance}>
                <motion.div
                    key={`dialog-${nodeIndex}`}
                    className={styles.dialogBox}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                >
                    {/* Character name tag */}
                    {node.character_name && (
                        <div className={styles.nameTag}>
                            {t(node.character_name)}
                        </div>
                    )}

                    {/* Dialog text area */}
                    <div className={styles.dialogTextArea}>
                        <div className={styles.dialogText}>
                            <TypewriterText
                                text={t(node.text)}
                                isComplete={textComplete}
                                onComplete={() => setTextComplete(true)}
                                speed={35}
                            />
                        </div>
                    </div>

                    {/* Advance triangle when text is complete */}
                    {textComplete && <div className={styles.advanceTriangle} />}
                </motion.div>
            </div>

            {/* ── Control Overlay: [Q] LOG  [E] AUTO  [J] SKIP ── */}
            <div className={styles.controlOverlay}>
                <button
                    className={styles.controlBtn}
                    onClick={(e) => { e.stopPropagation(); setShowLog(true); }}
                >
                    <span className={styles.controlKey}>Q</span>
                    <span className={styles.controlLabel}>LOG</span>
                </button>
                <button
                    className={`${styles.controlBtn} ${autoMode ? styles.controlBtnActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setAutoMode(prev => !prev); }}
                >
                    <span className={styles.controlKey}>E</span>
                    <span className={styles.controlLabel}>AUTO</span>
                </button>
                <button
                    className={styles.controlBtn}
                    onClick={(e) => { e.stopPropagation(); skipToEnd(); }}
                >
                    <span className={styles.controlKey}>J</span>
                    <span className={styles.controlLabel}>SKIP</span>
                </button>
            </div>

            {/* ── Message Log Panel ── */}
            <AnimatePresence>
                {showLog && (
                    <motion.div
                        className={styles.logOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowLog(false)}
                    >
                        <motion.div
                            className={styles.logPanel}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.logHeader}>
                                <div className={styles.logTitle}>{t('log')}</div>
                                <button
                                    className={styles.logCloseBtn}
                                    onClick={() => setShowLog(false)}
                                >
                                    {t('close')}
                                </button>
                            </div>
                            <div className={styles.logBody}>
                                {log.map((entry, i) => (
                                    <div key={i} className={styles.logEntry}>
                                        {entry.character && (
                                            <div className={styles.logCharacter}>
                                                {entry.character}
                                            </div>
                                        )}
                                        <div className={styles.logText}>
                                            {entry.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main Export: Chapter Selection + Chapter Player ───
export default function NostalgicStories({ isOpen, onClose }: NostalgicStoriesProps) {
    const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
    const t = useTranslations('nostalgicStories');

    useEffect(() => {
        if (!isOpen) setSelectedChapter(null);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {/* Chapter Player (full screen) */}
            {selectedChapter && (
                <ChapterPlayer
                    key={selectedChapter.id}
                    chapter={selectedChapter}
                    onClose={onClose}
                    onBack={() => setSelectedChapter(null)}
                />
            )}

            {/* Chapter Selection Panel */}
            {isOpen && !selectedChapter && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={onClose}
                >
                    <motion.div
                        className={styles.panel}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitleGroup}>
                                <div className={styles.panelTitle}>{t('title')}</div>
                                <div className={styles.panelSubtitle}>{t('subtitle')}</div>
                            </div>
                            <button className={styles.panelCloseBtn} onClick={onClose}>
                                {t('close')}
                            </button>
                        </div>

                        <div className={styles.panelBody}>
                            {CHAPTERS.map((chapter, index) => (
                                <motion.div
                                    key={chapter.id}
                                    className={styles.storyCard}
                                    style={{ '--card-accent': chapter.accent } as React.CSSProperties}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.06 }}
                                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                                    onClick={() => setSelectedChapter(chapter)}
                                >
                                    <div
                                        className={styles.splashPreview}
                                        style={{ background: chapter.nodes[0].image_url }}
                                    />
                                    <div className={styles.storyCardBadge}>
                                        {chapter.badge}
                                    </div>
                                    <div className={styles.storyCardTitle}>
                                        {t(chapter.title_key)}
                                    </div>
                                    <div className={styles.storyCardSubtitle}>
                                        {t(chapter.subtitle_key)}
                                    </div>
                                    <div className={styles.storyCardScenes}>
                                        {t('sceneCount', { count: chapter.nodes.length })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
