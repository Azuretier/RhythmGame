import React, { useState, useEffect, useCallback } from 'react';
import styles from '../VanillaGame.module.css';

const TUTORIAL_SEEN_KEY = 'rhythmia_tutorial_seen';

interface TutorialGuideProps {
    onComplete: () => void;
}

interface TutorialStep {
    title: string;
    subtitle: string;
    items: { key: string; label: string }[];
}

const STEPS: TutorialStep[] = [
    {
        title: 'MOVEMENT',
        subtitle: '移動操作',
        items: [
            { key: '← →', label: 'Move' },
            { key: '↓', label: 'Soft Drop' },
            { key: 'SPACE', label: 'Hard Drop' },
        ],
    },
    {
        title: 'ROTATION',
        subtitle: '回転操作',
        items: [
            { key: '↑ / X', label: 'Rotate CW' },
            { key: 'Z / CTRL', label: 'Rotate CCW' },
            { key: 'C / SHIFT', label: 'Hold Piece' },
        ],
    },
    {
        title: 'RHYTHM',
        subtitle: 'リズムシステム',
        items: [
            { key: 'BEAT', label: 'Drop on beat for 2x score' },
            { key: 'COMBO', label: 'Chain beats for multiplier' },
            { key: 'DIG', label: 'Clear lines to destroy terrain' },
        ],
    },
];

/**
 * Honkai: Star Rail-style tutorial guidance screen.
 * Shows once on first play, with step-based navigation.
 */
export function TutorialGuide({ onComplete }: TutorialGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [fadeIn, setFadeIn] = useState(false);
    const [stepAnim, setStepAnim] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setFadeIn(true));
    }, []);

    useEffect(() => {
        setStepAnim(false);
        const t = requestAnimationFrame(() => setStepAnim(true));
        return () => cancelAnimationFrame(t);
    }, [currentStep]);

    const handleNext = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
            onComplete();
        }
    }, [currentStep, onComplete]);

    const handleSkip = useCallback(() => {
        localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
        onComplete();
    }, [onComplete]);

    // Allow Space/Enter/click to advance
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleSkip();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleNext, handleSkip]);

    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    return (
        <div
            className={`${styles.tutorialOverlay} ${fadeIn ? styles.tutorialVisible : ''}`}
            onClick={handleNext}
        >
            {/* Geometric corner decorations */}
            <div className={`${styles.tutCorner} ${styles.tutCornerTL}`} />
            <div className={`${styles.tutCorner} ${styles.tutCornerTR}`} />
            <div className={`${styles.tutCorner} ${styles.tutCornerBL}`} />
            <div className={`${styles.tutCorner} ${styles.tutCornerBR}`} />

            {/* Horizontal scan line */}
            <div className={styles.tutScanLine} />

            {/* Top label */}
            <div className={styles.tutTopLabel}>NAVIGATION GUIDE</div>

            {/* Main content */}
            <div className={`${styles.tutContent} ${stepAnim ? styles.tutStepIn : ''}`}>
                {/* Step indicator */}
                <div className={styles.tutStepIndicator}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`${styles.tutStepDot} ${i === currentStep ? styles.tutStepDotActive : ''} ${i < currentStep ? styles.tutStepDotDone : ''}`}
                        />
                    ))}
                </div>

                {/* Step title */}
                <div className={styles.tutStepTitle}>{step.title}</div>
                <div className={styles.tutStepSubtitle}>{step.subtitle}</div>

                {/* Separator */}
                <div className={styles.tutSeparator} />

                {/* Control items */}
                <div className={styles.tutItems}>
                    {step.items.map((item, i) => (
                        <div key={i} className={styles.tutItem}>
                            <span className={styles.tutItemKey}>{item.key}</span>
                            <span className={styles.tutItemLabel}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom bar */}
            <div className={styles.tutBottomBar}>
                <button className={styles.tutSkipBtn} onClick={(e) => { e.stopPropagation(); handleSkip(); }}>
                    SKIP
                </button>
                <div className={styles.tutProgressText}>
                    {currentStep + 1} / {STEPS.length}
                </div>
                <button className={styles.tutNextBtn} onClick={(e) => { e.stopPropagation(); handleNext(); }}>
                    {isLast ? 'START' : 'NEXT'}
                </button>
            </div>
        </div>
    );
}

/**
 * Returns true if the tutorial has already been seen.
 */
export function hasTutorialBeenSeen(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
}
