'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Character3D from './Character3D';
import RetroDialogBox from './RetroDialogBox';
import type { AnimationState, Expression, StoryScene, DialogLine } from '@/types/dialog';
import { cn } from '@/lib/utils';
import styles from './CharacterDialog.module.css';

interface CharacterDialogProps {
  /** Scene data containing character model and dialog lines */
  scene: StoryScene;
  /** Called when all lines in the scene have been exhausted */
  onSceneComplete?: () => void;
  /** Additional CSS class for the container */
  className?: string;
  /** Height of the component (default: 500px) */
  height?: string;
}

export default function CharacterDialog({
  scene,
  onSceneComplete,
  className,
  height = '500px',
}: CharacterDialogProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [expression, setExpression] = useState<Expression>('neutral');

  const currentLine: DialogLine | null = useMemo(
    () => scene.lines[lineIndex] ?? null,
    [scene.lines, lineIndex]
  );

  const handleTypingStart = useCallback(() => {
    if (!currentLine) return;

    // Apply animation trigger from the dialog line
    if (currentLine.animation) {
      setAnimationState(currentLine.animation);
    }
    if (currentLine.expression) {
      setExpression(currentLine.expression);
    }
  }, [currentLine]);

  const handleTypingComplete = useCallback(() => {
    // Return to idle after talking finishes
    if (animationState === 'talking') {
      const timer = setTimeout(() => setAnimationState('idle'), 600);
      return () => clearTimeout(timer);
    }
  }, [animationState]);

  const handleAdvance = useCallback(() => {
    const nextIndex = lineIndex + 1;

    if (nextIndex >= scene.lines.length) {
      // Scene complete
      setAnimationState('idle');
      setExpression('neutral');
      onSceneComplete?.();
    } else {
      setLineIndex(nextIndex);
    }
  }, [lineIndex, scene.lines.length, onSceneComplete]);

  return (
    <div className={cn(styles.container, className)} style={{ height }}>
      {/* Background layer (splash art or color) */}
      {scene.background && (
        <div
          className={styles.background}
          style={
            scene.background.startsWith('#') ||
            scene.background.startsWith('rgb') ||
            scene.background.startsWith('linear')
              ? { background: scene.background }
              : { backgroundImage: `url(${scene.background})` }
          }
        />
      )}

      {/* 3D Character canvas (behind dialog) */}
      <div className={styles.characterLayer}>
        <Character3D
          modelPath={scene.characterModel}
          animationState={animationState}
          expression={expression}
          background="transparent"
        />
      </div>

      {/* Gradient overlay at the bottom for dialog readability */}
      <div className={styles.bottomGradient} />

      {/* Dialog box (in front of character) */}
      <div className={styles.dialogLayer}>
        <RetroDialogBox
          line={
            currentLine
              ? {
                  ...currentLine,
                  speaker: currentLine.speaker || scene.characterName,
                }
              : null
          }
          onAdvance={handleAdvance}
          onTypingStart={handleTypingStart}
          onTypingComplete={handleTypingComplete}
        />
      </div>

      {/* Scene progress indicator */}
      <div className={styles.progressBar}>
        {scene.lines.map((_, i) => (
          <div
            key={i}
            className={cn(styles.progressDot, {
              [styles.progressDotActive]: i === lineIndex,
              [styles.progressDotDone]: i < lineIndex,
            })}
          />
        ))}
      </div>
    </div>
  );
}
