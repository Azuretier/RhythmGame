'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import styles from './ChapterPlayer.module.css';
import type { Chapter, ChapterNode, ChapterPlayerProps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick the CSS class for a node's image transition */
function transitionClass(transition: ChapterNode['transition']): string {
  switch (transition) {
    case 'fade':        return styles.transitionFade;
    case 'slide-left':  return styles.transitionSlideLeft;
    case 'slide-right': return styles.transitionSlideRight;
    case 'enter-zoom':  return styles.transitionEnterZoom;
    default:            return '';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Full-bleed background splash art with Ken Burns + transitions */
function SplashArtLayer({
  node,
  prevImageUrl,
  nodeKey,
}: {
  node: ChapterNode;
  prevImageUrl: string | null;
  nodeKey: number;
}) {
  const imageChanged = prevImageUrl !== null && prevImageUrl !== node.image_url;

  return (
    <div className={styles.splashLayer}>
      {/* Outgoing image (fades away) */}
      {imageChanged && prevImageUrl && (
        <Image
          key={`exit-${nodeKey}`}
          src={prevImageUrl}
          alt=""
          fill
          priority
          className={`${styles.splashImage} ${styles.splashExit}`}
          sizes="100vw"
        />
      )}

      {/* Current image */}
      <Image
        key={`splash-${nodeKey}-${node.image_url}`}
        src={node.image_url}
        alt=""
        fill
        priority
        className={[
          styles.splashImage,
          styles.kenBurns,
          imageChanged ? transitionClass(node.transition) : '',
        ]
          .filter(Boolean)
          .join(' ')}
        sizes="100vw"
      />

      {/* Vignette */}
      <div className={styles.vignette} />
      {/* Scanlines */}
      <div className={styles.scanlines} />
    </div>
  );
}

/** Retro dialog box with typewriter text */
function DialogBox({
  node,
  displayedText,
  isTyping,
  isComplete,
}: {
  node: ChapterNode;
  displayedText: string;
  isTyping: boolean;
  isComplete: boolean;
}) {
  return (
    <div className={styles.dialogLayer}>
      <div className={styles.dialogBox}>
        {/* Name plate */}
        {node.character_name && (
          <div className={styles.namePlate}>{node.character_name}</div>
        )}

        {/* Text with typewriter cursor */}
        <div className={`${styles.dialogText} ${isTyping ? styles.typingCursor : ''}`}>
          {displayedText}
          {!isTyping && isComplete && <span className={styles.advanceCursor} />}
        </div>
      </div>
    </div>
  );
}

/** Minimalist keyboard shortcut controls */
function ControlOverlay({
  isAutoMode,
  onToggleLog,
  onToggleAuto,
  onSkip,
}: {
  isAutoMode: boolean;
  onToggleLog: () => void;
  onToggleAuto: () => void;
  onSkip: () => void;
}) {
  return (
    <div className={styles.controlOverlay}>
      <button className={styles.controlBtn} onClick={onToggleLog} type="button">
        <span className={styles.controlKey}>Q</span>
        <span>LOG</span>
      </button>
      <button
        className={`${styles.controlBtn} ${isAutoMode ? styles.controlBtnActive : ''}`}
        onClick={onToggleAuto}
        type="button"
      >
        <span className={styles.controlKey}>E</span>
        <span>AUTO</span>
      </button>
      <button className={styles.controlBtn} onClick={onSkip} type="button">
        <span className={styles.controlKey}>J</span>
        <span>SKIP</span>
      </button>
    </div>
  );
}

/** Scrollable backlog of past dialog */
function LogPanel({
  history,
  onClose,
}: {
  history: { character_name?: string; text: string }[];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on open
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className={styles.logOverlay} onClick={onClose}>
      <div className={styles.logHeader}>
        <span className={styles.logTitle}>BACKLOG</span>
        <button className={styles.logClose} onClick={onClose} type="button">
          CLOSE
        </button>
      </div>
      <div
        className={styles.logScroll}
        ref={scrollRef}
        onClick={(e) => e.stopPropagation()}
      >
        {history.map((entry, i) => (
          <div key={i} className={styles.logEntry}>
            {entry.character_name && (
              <div className={styles.logEntryName}>{entry.character_name}</div>
            )}
            <div className={styles.logEntryText}>{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TYPEWRITER_SPEED = 45; // ms per character
const AUTO_ADVANCE_DELAY = 2200; // ms after text complete

export default function ChapterPlayer({ chapter, onComplete, onExit }: ChapterPlayerProps) {
  const [nodeIndex, setNodeIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [prevImageUrl, setPrevImageUrl] = useState<string | null>(null);
  const [showTitle, setShowTitle] = useState(true);
  const [titleFadeOut, setTitleFadeOut] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [history, setHistory] = useState<{ character_name?: string; text: string }[]>([]);

  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const charIndexRef = useRef(0);

  const node = chapter.nodes[nodeIndex];
  const isLastNode = nodeIndex >= chapter.nodes.length - 1;

  // ----- Title card auto-dismiss -----
  useEffect(() => {
    const t1 = setTimeout(() => setTitleFadeOut(true), 2000);
    const t2 = setTimeout(() => setShowTitle(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ----- Typewriter effect -----
  useEffect(() => {
    if (showTitle) return;

    const text = node.text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);

    const tick = () => {
      charIndexRef.current += 1;
      const nextSlice = text.slice(0, charIndexRef.current);
      setDisplayedText(nextSlice);

      if (charIndexRef.current >= text.length) {
        setIsTyping(false);
      } else {
        typewriterRef.current = setTimeout(tick, TYPEWRITER_SPEED);
      }
    };

    typewriterRef.current = setTimeout(tick, TYPEWRITER_SPEED);

    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [nodeIndex, node.text, showTitle]);

  // ----- Audio playback -----
  useEffect(() => {
    if (node.audio) {
      try {
        const audio = new Audio(node.audio);
        audio.volume = 0.8;
        audio.play().catch(() => { /* autoplay blocked */ });
        audioRef.current = audio;
      } catch {
        // audio file missing / unsupported
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [node.audio, nodeIndex]);

  // ----- Auto-advance -----
  useEffect(() => {
    if (isAutoMode && !isTyping && !showLog) {
      autoTimerRef.current = setTimeout(() => {
        advanceNode();
      }, AUTO_ADVANCE_DELAY);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMode, isTyping, showLog, nodeIndex]);

  // ----- Node advance -----
  const advanceNode = useCallback(() => {
    if (showLog) return;

    // If still typing, complete the text immediately
    if (isTyping) {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
      setDisplayedText(node.text);
      setIsTyping(false);
      return;
    }

    // Record to history
    setHistory((prev) => [
      ...prev,
      { character_name: node.character_name, text: node.text },
    ]);

    if (isLastNode) {
      onComplete?.();
      return;
    }

    // Store previous image for crossfade
    setPrevImageUrl(node.image_url);
    setNodeIndex((i) => i + 1);
  }, [isTyping, node, isLastNode, onComplete, showLog]);

  // ----- Skip (fast-forward through all remaining nodes) -----
  const handleSkip = useCallback(() => {
    if (showLog) return;

    // Record current node
    setHistory((prev) => [
      ...prev,
      { character_name: node.character_name, text: node.text },
    ]);

    // Record all remaining nodes
    const remaining = chapter.nodes.slice(nodeIndex + 1);
    const newHistory = remaining.map((n) => ({
      character_name: n.character_name,
      text: n.text,
    }));
    setHistory((prev) => [...prev, ...newHistory]);

    // Jump to last node, show full text
    const lastIdx = chapter.nodes.length - 1;
    setPrevImageUrl(node.image_url);
    setNodeIndex(lastIdx);
    if (typewriterRef.current) clearTimeout(typewriterRef.current);
    setDisplayedText(chapter.nodes[lastIdx].text);
    setIsTyping(false);
  }, [chapter.nodes, node, nodeIndex, showLog]);

  // ----- Keyboard controls -----
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'enter':
          e.preventDefault();
          if (showLog) {
            setShowLog(false);
          } else {
            advanceNode();
          }
          break;
        case 'q':
          e.preventDefault();
          setShowLog((v) => !v);
          break;
        case 'e':
          e.preventDefault();
          setIsAutoMode((v) => !v);
          break;
        case 'j':
          e.preventDefault();
          handleSkip();
          break;
        case 'escape':
          e.preventDefault();
          if (showLog) {
            setShowLog(false);
          } else {
            onExit?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advanceNode, handleSkip, onExit, showLog]);

  // ----- Click to advance -----
  const handleContainerClick = useCallback(() => {
    if (showLog) {
      setShowLog(false);
    } else {
      advanceNode();
    }
  }, [advanceNode, showLog]);

  return (
    <div className={styles.container} onClick={handleContainerClick}>
      {/* Layer 1: Splash Art */}
      <SplashArtLayer node={node} prevImageUrl={prevImageUrl} nodeKey={nodeIndex} />

      {/* Chapter title card */}
      {showTitle && (
        <div className={`${styles.chapterTitle} ${titleFadeOut ? styles.chapterTitleFadeOut : ''}`}>
          <div className={styles.chapterTitleText}>{chapter.title}</div>
        </div>
      )}

      {/* Node counter */}
      <div className={styles.nodeCounter}>
        {nodeIndex + 1} / {chapter.nodes.length}
      </div>

      {/* Layer 2: Dialog Box */}
      {!showTitle && (
        <DialogBox
          node={node}
          displayedText={displayedText}
          isTyping={isTyping}
          isComplete={!isTyping}
        />
      )}

      {/* Layer 3: Controls */}
      <ControlOverlay
        isAutoMode={isAutoMode}
        onToggleLog={() => setShowLog((v) => !v)}
        onToggleAuto={() => setIsAutoMode((v) => !v)}
        onSkip={handleSkip}
      />

      {/* Log panel overlay */}
      {showLog && (
        <LogPanel
          history={[
            ...history,
            { character_name: node.character_name, text: node.text },
          ]}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
}

// Re-export types for convenience
export type { Chapter, ChapterNode, ChapterPlayerProps };
