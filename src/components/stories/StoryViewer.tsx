'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PARTICLE_EMOJIS } from '@/data/stories/chapters';
import type { Chapter, StoryScene, DialogueLine } from '@/data/stories/chapters';
import type { MapMission, MissionDifficulty } from '@/data/stories/missions';
import DungeonsMap from './DungeonsMap';
import styles from './stories.module.css';

type ViewState = 'map' | 'playing';

interface LogEntry {
    speaker: string | null;
    text: string;
}

export default function StoryViewer() {
    const t = useTranslations('stories');
    const locale = useLocale();
    const router = useRouter();

    const [viewState, setViewState] = useState<ViewState>('map');
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [sceneIndex, setSceneIndex] = useState(0);
    const [lineIndex, setLineIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [autoMode, setAutoMode] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);

    const typingRef = useRef<NodeJS.Timeout | null>(null);
    const autoRef = useRef<NodeJS.Timeout | null>(null);
    const fullTextRef = useRef('');

    const currentScene: StoryScene | null = currentChapter
        ? currentChapter.scenes[sceneIndex] ?? null
        : null;

    const currentLine: DialogueLine | null = currentScene
        ? currentScene.dialogue[lineIndex] ?? null
        : null;

    // Get localized text
    const getLineText = useCallback((line: DialogueLine) => {
        if (locale === 'en' && line.textEn) return line.textEn;
        return line.text;
    }, [locale]);

    const getSpeaker = useCallback((line: DialogueLine) => {
        if (!line.speaker) return null;
        if (locale === 'en' && line.speakerEn) return line.speakerEn;
        return line.speaker;
    }, [locale]);

    // Typing effect
    useEffect(() => {
        if (!currentLine || viewState !== 'playing') return;

        const text = getLineText(currentLine);
        fullTextRef.current = text;
        setDisplayedText('');
        setIsTyping(true);

        let i = 0;
        typingRef.current = setInterval(() => {
            i++;
            setDisplayedText(text.slice(0, i));
            if (i >= text.length) {
                if (typingRef.current) clearInterval(typingRef.current);
                setIsTyping(false);
            }
        }, 35);

        return () => {
            if (typingRef.current) clearInterval(typingRef.current);
        };
    }, [currentLine, viewState, getLineText]);

    // Auto-advance
    useEffect(() => {
        if (!autoMode || isTyping || viewState !== 'playing') return;

        autoRef.current = setTimeout(() => {
            advance();
        }, 2000);

        return () => {
            if (autoRef.current) clearTimeout(autoRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoMode, isTyping, lineIndex, sceneIndex]);

    const completeTyping = useCallback(() => {
        if (typingRef.current) clearInterval(typingRef.current);
        setDisplayedText(fullTextRef.current);
        setIsTyping(false);
    }, []);

    const advance = useCallback(() => {
        if (!currentChapter || !currentScene) return;
        if (showLog || showMenu) return;

        if (isTyping) {
            completeTyping();
            return;
        }

        const nextLineIndex = lineIndex + 1;
        if (nextLineIndex < currentScene.dialogue.length) {
            setLineIndex(nextLineIndex);
        } else {
            const nextSceneIndex = sceneIndex + 1;
            if (nextSceneIndex < currentChapter.scenes.length) {
                setTransitioning(true);
                setTimeout(() => {
                    setSceneIndex(nextSceneIndex);
                    setLineIndex(0);
                    setTransitioning(false);
                }, 600);
            } else {
                // Chapter complete — return to select
                setTransitioning(true);
                setTimeout(() => {
                    setViewState('map');
                    setTransitioning(false);
                }, 600);
            }
        }
    }, [currentChapter, currentScene, isTyping, lineIndex, sceneIndex, showLog, showMenu, completeTyping]);

    // Add to log when line advances
    useEffect(() => {
        if (!currentLine || viewState !== 'playing') return;
        const speaker = getSpeaker(currentLine);
        const text = getLineText(currentLine);
        setLog(prev => [...prev, { speaker, text }]);
    }, [currentLine, viewState, getSpeaker, getLineText]);

    // Keyboard controls
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (viewState !== 'playing') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'enter':
                    e.preventDefault();
                    advance();
                    break;
                case 'q':
                    setShowLog(prev => !prev);
                    setShowMenu(false);
                    break;
                case 'e':
                    setAutoMode(prev => !prev);
                    break;
                case 'z':
                    setShowMenu(prev => !prev);
                    setShowLog(false);
                    break;
                case 'escape':
                    setShowLog(false);
                    setShowMenu(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [viewState, advance]);

    const startChapter = (chapter: Chapter) => {
        setCurrentChapter(chapter);
        setSceneIndex(0);
        setLineIndex(0);
        setLog([]);
        setAutoMode(false);
        setShowLog(false);
        setShowMenu(false);
        setTransitioning(true);
        setTimeout(() => {
            setViewState('playing');
            setTransitioning(false);
        }, 400);
    };

    const handleStartMission = useCallback(
        (chapter: Chapter, _mission: MapMission, _difficulty: MissionDifficulty) => {
            startChapter(chapter);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const skipScene = () => {
        if (!currentChapter) return;
        const nextSceneIndex = sceneIndex + 1;
        if (nextSceneIndex < currentChapter.scenes.length) {
            setTransitioning(true);
            setTimeout(() => {
                setSceneIndex(nextSceneIndex);
                setLineIndex(0);
                setTransitioning(false);
            }, 400);
        } else {
            setTransitioning(true);
            setTimeout(() => {
                setViewState('map');
                setTransitioning(false);
            }, 400);
        }
    };

    // ---- Map Screen (Minecraft Dungeons-style) ----
    if (viewState === 'map') {
        return (
            <>
                <DungeonsMap onStartMission={handleStartMission} />
                {transitioning && (
                    <div
                        className={styles.transitionOverlay}
                        style={{ opacity: 1, position: 'fixed', inset: 0, zIndex: 200 }}
                    />
                )}
            </>
        );
    }

    // ---- Playing Screen ----
    if (!currentScene || !currentLine || !currentChapter) return null;

    const particles = PARTICLE_EMOJIS[currentScene.particleType ?? 'butterflies'] ?? PARTICLE_EMOJIS.butterflies;

    return (
        <div className={styles.container} onClick={advance}>
            {/* Scene Background */}
            <div className={styles.scene}>
                <div
                    className={styles.sceneBg}
                    style={{ background: currentScene.background }}
                />

                {/* Floating particles */}
                <div className={styles.particles}>
                    {particles.map((emoji, i) => (
                        <span key={i} className={styles.particle}>
                            {emoji}
                        </span>
                    ))}
                </div>

                <div className={styles.ditherOverlay} />
                <div className={styles.scanlines} />
                <div className={styles.vignette} />
            </div>

            {/* Character */}
            <div className={styles.characterLayer}>
                <div
                    className={`${styles.character} ${currentScene.characterVisible ? styles.characterVisible : styles.characterHidden}`}
                    style={{
                        justifySelf: currentScene.characterPosition === 'left' ? 'flex-start' : currentScene.characterPosition === 'right' ? 'flex-end' : 'center',
                    }}
                >
                    {currentScene.characterVisible && (
                        <div className={styles.characterSprite}>
                            {/* Pixel art character rendered with CSS */}
                            <svg viewBox="0 0 64 96" width="100%" height="100%" style={{ imageRendering: 'pixelated' }}>
                                {/* Hair */}
                                <rect x="18" y="4" width="28" height="6" fill="#1a1a3a" />
                                <rect x="16" y="8" width="32" height="4" fill="#1a1a3a" />
                                <rect x="14" y="12" width="36" height="8" fill="#1a1a3a" />
                                <rect x="14" y="20" width="8" height="16" fill="#1a1a3a" />
                                <rect x="42" y="20" width="8" height="16" fill="#1a1a3a" />
                                {/* Face */}
                                <rect x="22" y="16" width="20" height="20" fill="#FFE0C0" />
                                <rect x="20" y="20" width="24" height="12" fill="#FFE0C0" />
                                {/* Eyes */}
                                <rect x="24" y="22" width="4" height="4" fill="#007FFF" />
                                <rect x="36" y="22" width="4" height="4" fill="#007FFF" />
                                <rect x="25" y="23" width="2" height="2" fill="#ffffff" />
                                <rect x="37" y="23" width="2" height="2" fill="#ffffff" />
                                {/* Mouth */}
                                <rect x="30" y="30" width="4" height="2" fill="#e88a8a" />
                                {/* Body / outfit */}
                                <rect x="20" y="36" width="24" height="4" fill="#cc2233" />
                                <rect x="18" y="40" width="28" height="20" fill="#cc2233" />
                                <rect x="16" y="42" width="4" height="12" fill="#cc2233" />
                                <rect x="44" y="42" width="4" height="12" fill="#cc2233" />
                                {/* Belt/detail */}
                                <rect x="20" y="52" width="24" height="2" fill="#FFD700" />
                                {/* Skirt */}
                                <rect x="16" y="60" width="32" height="12" fill="#991122" />
                                <rect x="14" y="64" width="36" height="8" fill="#991122" />
                                {/* Legs */}
                                <rect x="22" y="72" width="8" height="16" fill="#FFE0C0" />
                                <rect x="34" y="72" width="8" height="16" fill="#FFE0C0" />
                                {/* Shoes */}
                                <rect x="20" y="88" width="12" height="4" fill="#332222" />
                                <rect x="32" y="88" width="12" height="4" fill="#332222" />
                                {/* Hair sides (long) */}
                                <rect x="12" y="16" width="6" height="32" fill="#1a1a3a" />
                                <rect x="46" y="16" width="6" height="32" fill="#1a1a3a" />
                                <rect x="10" y="20" width="4" height="20" fill="#1a1a3a" />
                                <rect x="50" y="20" width="4" height="20" fill="#1a1a3a" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Bar */}
            <div className={styles.topBar} onClick={e => e.stopPropagation()}>
                <button
                    className={styles.backButton}
                    style={{ position: 'relative', top: 'auto', left: 'auto' }}
                    onClick={() => {
                        setViewState('map');
                        setAutoMode(false);
                    }}
                >
                    {t('backToLobby')}
                </button>
                <span className={styles.chapterInfo}>
                    {t('chapter')} {String(currentChapter.number).padStart(2, '0')} — {locale === 'en' ? currentChapter.titleEn : currentChapter.title}
                </span>
            </div>

            {/* Text Box */}
            <div className={styles.textBoxArea} onClick={e => e.stopPropagation()}>
                <div className={styles.textBox} onClick={advance}>
                    {getSpeaker(currentLine) && (
                        <div className={styles.speakerName}>
                            {getSpeaker(currentLine)}
                        </div>
                    )}
                    <div className={styles.dialogueText}>
                        {displayedText}
                        {isTyping && <span className={styles.cursor} />}
                    </div>
                    {!isTyping && (
                        <div className={styles.advanceIndicator}>
                            <div className={styles.advanceTriangle} />
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className={styles.controlsBar} onClick={e => e.stopPropagation()}>
                <button
                    className={`${styles.controlBtn} ${showLog ? styles.controlBtnActive : ''}`}
                    onClick={() => { setShowLog(prev => !prev); setShowMenu(false); }}
                >
                    {t('log')} <span className={styles.controlKey}>Q</span>
                </button>
                <button
                    className={`${styles.controlBtn} ${autoMode ? styles.controlBtnActive : ''}`}
                    onClick={() => setAutoMode(prev => !prev)}
                >
                    {t('auto')} <span className={styles.controlKey}>E</span>
                </button>
                <button
                    className={styles.controlBtn}
                    onClick={skipScene}
                >
                    {t('skip')} <span className={styles.controlKey}>→</span>
                </button>
                <button
                    className={`${styles.controlBtn} ${showMenu ? styles.controlBtnActive : ''}`}
                    onClick={() => { setShowMenu(prev => !prev); setShowLog(false); }}
                >
                    {t('menu')} <span className={styles.controlKey}>Z</span>
                </button>
            </div>

            {/* Scene Transition */}
            {transitioning && (
                <div
                    className={styles.transitionOverlay}
                    style={{ opacity: 1 }}
                />
            )}

            {/* Log Overlay */}
            {showLog && (
                <div className={styles.logOverlay} onClick={e => e.stopPropagation()}>
                    <div className={styles.logHeader}>{t('logTitle')}</div>
                    {log.map((entry, i) => (
                        <div key={i} className={styles.logEntry}>
                            {entry.speaker && (
                                <div className={styles.logSpeaker}>{entry.speaker}</div>
                            )}
                            <div className={styles.logText}>{entry.text}</div>
                        </div>
                    ))}
                    <button
                        className={styles.logClose}
                        onClick={() => setShowLog(false)}
                    >
                        {t('close')}
                    </button>
                </div>
            )}

            {/* Menu Overlay */}
            {showMenu && (
                <div className={styles.menuOverlay} onClick={e => e.stopPropagation()}>
                    <div className={styles.menuTitle}>{t('menu')}</div>
                    <button
                        className={styles.menuItem}
                        onClick={() => setShowMenu(false)}
                    >
                        {t('resume')}
                    </button>
                    <button
                        className={styles.menuItem}
                        onClick={() => {
                            setShowMenu(false);
                            setViewState('map');
                            setAutoMode(false);
                        }}
                    >
                        {t('chapterSelect')}
                    </button>
                    <button
                        className={styles.menuItem}
                        onClick={() => router.push('/')}
                    >
                        {t('backToLobby')}
                    </button>
                </div>
            )}
        </div>
    );
}
