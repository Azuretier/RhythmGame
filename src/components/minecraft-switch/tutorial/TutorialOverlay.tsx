'use client';

// =============================================================================
// Minecraft: Switch Edition — Tutorial Overlay
// =============================================================================
// Full-screen UI overlay for the scripted tutorial system. Renders instruction
// panels, progress bar, step counter, animated hints, skip controls, and a
// completion celebration screen. Styled to match the Minecraft HUD aesthetic
// with dark semi-transparent backgrounds, pixel fonts, and CSS animations.
// =============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { TutorialState, TutorialStep } from '@/lib/minecraft-switch/tutorial/tutorial';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TutorialOverlayProps {
  /** Current tutorial state from TutorialManager. */
  tutorialState: TutorialState;
  /** Callback to skip the current step. */
  onSkip: () => void;
  /** Callback to dismiss the entire tutorial. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Animation keyframes injected via style tag
// ---------------------------------------------------------------------------

const TUTORIAL_STYLES = `
@keyframes tutorialSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tutorialSlideOut {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes tutorialPulse {
  0%, 100% {
    box-shadow: 0 0 8px 2px rgba(80, 220, 100, 0.4);
  }
  50% {
    box-shadow: 0 0 16px 6px rgba(80, 220, 100, 0.7);
  }
}

@keyframes tutorialFadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes tutorialHandPoint {
  0%, 100% {
    transform: translateY(0px) rotate(-10deg);
  }
  50% {
    transform: translateY(-6px) rotate(-10deg);
  }
}

@keyframes tutorialProgressFill {
  0% { width: 0%; }
  100% { width: var(--tutorial-progress); }
}

@keyframes tutorialConfettiDrop {
  0% {
    opacity: 1;
    transform: translateY(-20px) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(120px) rotate(720deg);
  }
}

@keyframes tutorialStarBurst {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.2) rotate(180deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) rotate(360deg);
  }
}

@keyframes tutorialCelebrationPulse {
  0%, 100% {
    transform: scale(1);
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  50% {
    transform: scale(1.05);
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
}

@keyframes tutorialBorderGlow {
  0%, 100% {
    border-color: rgba(80, 220, 100, 0.3);
  }
  50% {
    border-color: rgba(80, 220, 100, 0.7);
  }
}

@keyframes tutorialNumberPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated hand cursor pointing downward */
function HandCursor({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none select-none"
      style={{
        animation: 'tutorialHandPoint 1.2s ease-in-out infinite',
        fontSize: '24px',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      }}
    >
      <span role="img" aria-label="pointer">&#9759;</span>
    </div>
  );
}

/** Progress bar showing steps completed out of total */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full h-[6px] bg-black/70 border border-gray-700 relative overflow-hidden">
      <div
        className="h-full transition-all duration-700 ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: '#50DC64',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 8px rgba(80,220,100,0.4)',
        }}
      />
      {/* Tick marks for each step */}
      {Array.from({ length: total - 1 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-[1px] bg-gray-600/50"
          style={{ left: `${((i + 1) / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** Step counter badge */
function StepCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 font-pixel text-xs">
      <span className="text-gray-400">Step</span>
      <span
        className="text-white font-bold"
        style={{
          animation: 'tutorialNumberPop 0.3s ease-out',
          textShadow: '1px 1px 0 #000',
        }}
        key={current}
      >
        {current}
      </span>
      <span className="text-gray-500">of</span>
      <span className="text-gray-300">{total}</span>
    </div>
  );
}

/** Hint text that fades in */
function HintText({ hint, visible }: { hint: string; visible: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'mt-2 px-3 py-1.5 bg-yellow-900/40 border border-yellow-700/50 transition-opacity duration-700',
        show ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="font-pixel text-yellow-400 text-xs mt-0.5 shrink-0"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
          Hint:
        </span>
        <span className="font-pixel text-yellow-200/90 text-[11px] leading-relaxed"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
          {hint}
        </span>
      </div>
    </div>
  );
}

/** Required items progress display */
function RequiredItemsDisplay({
  items,
}: {
  items: { item: string; count: number }[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((req) => (
        <div
          key={req.item}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-800/60 border border-gray-700/50"
        >
          <span className="font-pixel text-[10px] text-gray-300"
            style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
            {formatItemDisplayName(req.item)}
          </span>
          <span className="font-pixel text-[10px] text-green-400 font-bold">
            x{req.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Confetti particle for the celebration screen */
function ConfettiParticle({ index }: { index: number }) {
  const style = useMemo(() => {
    const colors = [
      '#FF4444', '#44FF44', '#4444FF', '#FFD700',
      '#FF44FF', '#44FFFF', '#FF8844', '#88FF44',
    ];
    const color = colors[index % colors.length];
    const left = 10 + Math.random() * 80;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const size = 4 + Math.random() * 6;

    return {
      position: 'absolute' as const,
      left: `${left}%`,
      top: '-10px',
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      animation: `tutorialConfettiDrop ${duration}s ease-in ${delay}s infinite`,
      imageRendering: 'pixelated' as const,
    };
  }, [index]);

  return <div style={style} />;
}

/** Celebration star burst effect */
function StarBurst({ index }: { index: number }) {
  const style = useMemo(() => {
    const angle = (index / 8) * Math.PI * 2;
    const radius = 40 + Math.random() * 30;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const delay = index * 0.15;

    return {
      position: 'absolute' as const,
      left: `calc(50% + ${x}px)`,
      top: `calc(50% + ${y}px)`,
      color: '#FFD700',
      fontSize: '16px',
      animation: `tutorialStarBurst 1.5s ease-out ${delay}s infinite`,
      textShadow: '0 0 8px rgba(255, 215, 0, 0.8)',
    };
  }, [index]);

  return <div style={style}>&#10022;</div>;
}

/** Celebration screen when the tutorial is complete */
function CelebrationScreen({ onDismiss, totalSteps }: { onDismiss: () => void; totalSteps: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center pointer-events-auto transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0',
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onDismiss} />

      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }, (_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Central card */}
      <div className="relative z-10 bg-gray-900/95 border-2 border-yellow-500/60 p-6 sm:p-8 max-w-sm w-full mx-4 text-center"
        style={{
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          imageRendering: 'auto',
        }}
      >
        {/* Star bursts around the card */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }, (_, i) => (
            <StarBurst key={i} index={i} />
          ))}
        </div>

        {/* Trophy icon */}
        <div className="text-4xl sm:text-5xl mb-3 select-none"
          style={{
            animation: 'tutorialCelebrationPulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))',
          }}>
          &#127942;
        </div>

        {/* Title */}
        <h2 className="font-pixel text-xl sm:text-2xl text-yellow-400 font-bold mb-2"
          style={{
            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            animation: 'tutorialCelebrationPulse 2s ease-in-out infinite',
          }}>
          Tutorial Complete!
        </h2>

        {/* Subtitle */}
        <p className="font-pixel text-xs sm:text-sm text-gray-300 mb-4 leading-relaxed"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
          You&apos;ve learned the basics of Minecraft!<br />
          The world is yours to explore.
        </p>

        {/* Stats row */}
        <div className="flex justify-center gap-4 mb-5">
          <div className="text-center">
            <div className="font-pixel text-lg text-green-400 font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}>
              {totalSteps}
            </div>
            <div className="font-pixel text-[9px] text-gray-500">Steps</div>
          </div>
          <div className="w-px bg-gray-700" />
          <div className="text-center">
            <div className="font-pixel text-lg text-blue-400 font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}>
              &#10003;
            </div>
            <div className="font-pixel text-[9px] text-gray-500">All Done</div>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={onDismiss}
          className={cn(
            'w-full py-2.5 font-pixel text-sm text-white font-bold',
            'bg-green-700 border-2 border-green-500 hover:bg-green-600',
            'active:bg-green-800 transition-colors duration-150',
          )}
          style={{
            textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.1)',
          }}
        >
          Continue Playing
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Convert an item_id to a display name */
function formatItemDisplayName(itemId: string): string {
  return itemId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TutorialOverlay({
  tutorialState,
  onSkip,
  onDismiss,
}: TutorialOverlayProps) {
  const [animKey, setAnimKey] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const prevStepRef = useRef(tutorialState.currentStep);

  // Track step changes to trigger slide-in animation
  useEffect(() => {
    if (tutorialState.currentStep !== prevStepRef.current) {
      setAnimKey((k) => k + 1);
      prevStepRef.current = tutorialState.currentStep;
    }
  }, [tutorialState.currentStep]);

  // Current step data
  const currentStep: TutorialStep | null = useMemo(() => {
    if (tutorialState.completed || tutorialState.currentStep >= tutorialState.steps.length) {
      return null;
    }
    return tutorialState.steps[tutorialState.currentStep];
  }, [tutorialState.completed, tutorialState.currentStep, tutorialState.steps]);

  // Step display number (1-based)
  const stepNumber = tutorialState.currentStep + 1;
  const totalSteps = tutorialState.steps.length;

  // Progress percentage
  const progressPercent = useMemo(() => {
    if (tutorialState.completed) return 100;
    return Math.round((tutorialState.currentStep / totalSteps) * 100);
  }, [tutorialState.completed, tutorialState.currentStep, totalSteps]);

  // Handle skip tutorial confirmation
  const handleSkipTutorial = useCallback(() => {
    if (showSkipConfirm) {
      onDismiss();
      setShowSkipConfirm(false);
    } else {
      setShowSkipConfirm(true);
    }
  }, [showSkipConfirm, onDismiss]);

  // Cancel skip confirmation on timeout
  useEffect(() => {
    if (showSkipConfirm) {
      const timer = setTimeout(() => setShowSkipConfirm(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSkipConfirm]);

  // Handle dismissed state
  if (tutorialState.dismissed) return null;

  // Show celebration screen when complete
  if (tutorialState.completed) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: TUTORIAL_STYLES }} />
        <CelebrationScreen onDismiss={onDismiss} totalSteps={totalSteps} />
      </>
    );
  }

  // No current step (shouldn't happen if not completed, but guard)
  if (!currentStep) return null;

  return (
    <>
      {/* Inject animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: TUTORIAL_STYLES }} />

      {/* Main tutorial panel — top center */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md pointer-events-auto">
        <div
          key={animKey}
          className="relative bg-gray-900/90 border-2 border-gray-600/80"
          style={{
            animation: 'tutorialSlideIn 0.4s ease-out',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.3)',
            imageRendering: 'auto',
          }}
        >
          {/* Inner border for Minecraft-style double border */}
          <div className="absolute inset-[2px] border border-gray-700/30 pointer-events-none" />

          {/* Header: step title + counter */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              {/* Animated green dot indicator */}
              <div
                className="w-2 h-2 bg-green-400 shrink-0"
                style={{
                  animation: 'tutorialPulse 2s ease-in-out infinite',
                  boxShadow: '0 0 6px rgba(80, 220, 100, 0.6)',
                }}
              />
              <h3 className="font-pixel text-sm sm:text-base text-white font-bold truncate"
                style={{
                  textShadow: '1px 1px 0 #000, -1px -1px 0 #000',
                }}>
                {currentStep.title}
              </h3>
            </div>
            <StepCounter current={stepNumber} total={totalSteps} />
          </div>

          {/* Instruction body */}
          <div className="px-3 py-2.5 relative">
            <p className="font-pixel text-[11px] sm:text-xs text-gray-200 leading-relaxed"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
              {currentStep.instruction}
            </p>

            {/* Objective badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 border border-green-700/40">
              <span className="font-pixel text-[10px] text-green-500"
                style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                &#9654;
              </span>
              <span className="font-pixel text-[10px] sm:text-[11px] text-green-300"
                style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                {currentStep.objective}
              </span>
            </div>

            {/* Required items display */}
            {currentStep.requiredItems && currentStep.requiredItems.length > 0 && (
              <RequiredItemsDisplay items={currentStep.requiredItems} />
            )}

            {/* Hint text */}
            <HintText hint={currentStep.hint} visible={tutorialState.hintShown} />

            {/* Animated hand cursor */}
            <HandCursor visible={tutorialState.currentStep < 3} />
          </div>

          {/* Progress bar */}
          <div className="px-3 pb-1.5">
            <ProgressBar current={tutorialState.currentStep} total={totalSteps} />
            <div className="flex justify-between mt-1">
              <span className="font-pixel text-[9px] text-gray-500">
                {progressPercent}% complete
              </span>
              <span className="font-pixel text-[9px] text-gray-600">
                Tutorial
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/50">
            {/* Skip step button */}
            <button
              onClick={onSkip}
              className={cn(
                'px-3 py-1 font-pixel text-[10px] sm:text-xs',
                'text-gray-400 hover:text-white',
                'bg-gray-800/60 border border-gray-700/50 hover:border-gray-600',
                'transition-colors duration-150',
              )}
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
            >
              Skip Step &#187;
            </button>

            {/* Skip tutorial button */}
            <button
              onClick={handleSkipTutorial}
              className={cn(
                'px-3 py-1 font-pixel text-[10px] sm:text-xs transition-colors duration-150',
                showSkipConfirm
                  ? 'text-red-400 hover:text-red-300 bg-red-900/30 border border-red-700/50'
                  : 'text-gray-500 hover:text-gray-400 bg-transparent border border-transparent hover:border-gray-700/30',
              )}
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
            >
              {showSkipConfirm ? 'Confirm Skip All?' : 'Skip Tutorial'}
            </button>
          </div>
        </div>
      </div>

      {/* Objective reminder — bottom-left (above hotbar) */}
      <div className="fixed bottom-24 left-3 sm:left-4 z-40 pointer-events-none">
        <div
          className="bg-gray-900/70 border border-gray-700/40 px-3 py-1.5"
          style={{
            animation: 'tutorialBorderGlow 3s ease-in-out infinite',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[10px] text-green-500 shrink-0"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
              &#9632;
            </span>
            <span className="font-pixel text-[10px] sm:text-[11px] text-gray-300"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
              {currentStep.objective}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
