'use client';

import React, { useMemo } from 'react';
import styles from '../VanillaGame.module.css';

export type CompanionMood = 'idle' | 'dancing' | 'happy' | 'excited' | 'perfect' | 'sad';

interface AnimeCompanionProps {
  /** Current mood / expression */
  mood: CompanionMood;
  /** 0-1 beat phase for syncing bounce */
  beatPhase: number;
  /** Whether the beat just fired (for pulse animation) */
  boardBeat: boolean;
  /** Current combo count */
  combo: number;
  /** Current world index for theming */
  worldIdx: number;
}

// World-based accent colors for the companion's hair ribbon
const WORLD_ACCENT: string[] = [
  '#FF6B9D', // Melodia - pink
  '#4ECDC4', // Harmonia - teal
  '#FFE66D', // Crescenda - gold
  '#FF6B6B', // Fortissimo - red
  '#A29BFE', // Silence - purple
];

/**
 * A cute CSS-drawn anime girl companion that dances to the rhythm
 * and reacts to game events. She sits beside the game board
 * and enjoys the music with the player.
 */
export function AnimeCompanion({ mood, beatPhase, boardBeat, combo, worldIdx }: AnimeCompanionProps) {
  const accent = WORLD_ACCENT[worldIdx] || WORLD_ACCENT[0];

  // Bounce transform synced to beat
  const bounceY = useMemo(() => {
    // Create a smooth bounce on each beat pulse
    const phase = beatPhase;
    // Sharper bounce near beat (phase ~0 or ~1)
    const nearBeat = phase > 0.85 ? (1 - phase) / 0.15 : phase < 0.15 ? (0.15 - phase) / 0.15 : 0;
    return nearBeat * -6;
  }, [beatPhase]);

  // Hair sway follows beat
  const hairSway = useMemo(() => {
    return Math.sin(beatPhase * Math.PI * 2) * 3;
  }, [beatPhase]);

  // Eye state based on mood
  const eyeContent = useMemo(() => {
    switch (mood) {
      case 'perfect':
        return { left: '★', right: '★', cls: styles.companionEyeStar };
      case 'excited':
        return { left: '◕', right: '◕', cls: styles.companionEyeExcited };
      case 'happy':
        return { left: '◠', right: '◠', cls: styles.companionEyeHappy };
      case 'sad':
        return { left: '╥', right: '╥', cls: styles.companionEyeSad };
      case 'dancing':
        return { left: '◕', right: '◕', cls: styles.companionEyeDancing };
      default:
        return { left: '●', right: '●', cls: '' };
    }
  }, [mood]);

  // Mouth based on mood
  const mouthContent = useMemo(() => {
    switch (mood) {
      case 'perfect': return 'ω';
      case 'excited': return '▽';
      case 'happy': return 'ᴗ';
      case 'sad': return '﹏';
      case 'dancing': return '∀';
      default: return 'ᴖ';
    }
  }, [mood]);

  // Container classes
  const containerCls = [
    styles.companion,
    boardBeat ? styles.companionBeat : '',
    mood === 'dancing' ? styles.companionDancing : '',
    mood === 'excited' ? styles.companionExcited : '',
    mood === 'perfect' ? styles.companionPerfect : '',
    mood === 'sad' ? styles.companionSad : '',
  ].filter(Boolean).join(' ');

  // Musical note particles that float up when she's happy/dancing
  const showNotes = mood === 'dancing' || mood === 'happy' || mood === 'excited' || mood === 'perfect';

  return (
    <div className={containerCls}>
      {/* Floating musical notes */}
      {showNotes && (
        <div className={styles.companionNotes}>
          <span className={styles.companionNote} style={{ animationDelay: '0s' }}>♪</span>
          <span className={styles.companionNote} style={{ animationDelay: '0.4s' }}>♫</span>
          <span className={styles.companionNote} style={{ animationDelay: '0.8s' }}>♪</span>
        </div>
      )}

      {/* Character body */}
      <div
        className={styles.companionBody}
        style={{ transform: `translateY(${bounceY}px)` }}
      >
        {/* Hair - twin tails */}
        <div className={styles.companionHair}>
          <div
            className={`${styles.companionTail} ${styles.companionTailLeft}`}
            style={{
              transform: `rotate(${-15 + hairSway}deg)`,
              background: `linear-gradient(180deg, #3a2a1a, #2a1a0a)`,
            }}
          />
          <div
            className={`${styles.companionTail} ${styles.companionTailRight}`}
            style={{
              transform: `rotate(${15 - hairSway}deg)`,
              background: `linear-gradient(180deg, #3a2a1a, #2a1a0a)`,
            }}
          />
          {/* Hair ribbon */}
          <div
            className={styles.companionRibbon}
            style={{ background: accent, boxShadow: `0 0 8px ${accent}66` }}
          />
          {/* Main hair dome */}
          <div className={styles.companionHairTop} />
        </div>

        {/* Face */}
        <div className={styles.companionFace}>
          {/* Blush */}
          <div className={`${styles.companionBlush} ${styles.companionBlushLeft}`} />
          <div className={`${styles.companionBlush} ${styles.companionBlushRight}`} />

          {/* Eyes */}
          <div className={styles.companionEyes}>
            <span className={`${styles.companionEye} ${eyeContent.cls}`}>
              {eyeContent.left}
            </span>
            <span className={`${styles.companionEye} ${eyeContent.cls}`}>
              {eyeContent.right}
            </span>
          </div>

          {/* Mouth */}
          <div className={styles.companionMouth}>
            {mouthContent}
          </div>
        </div>

        {/* Torso (simple dress shape) */}
        <div
          className={styles.companionDress}
          style={{ borderColor: `${accent}88` }}
        />

        {/* Arms - wave on beat */}
        <div
          className={`${styles.companionArm} ${styles.companionArmLeft}`}
          style={{
            transform: boardBeat ? 'rotate(-45deg)' : 'rotate(-20deg)',
          }}
        />
        <div
          className={`${styles.companionArm} ${styles.companionArmRight}`}
          style={{
            transform: boardBeat ? 'rotate(45deg)' : 'rotate(20deg)',
          }}
        />
      </div>

      {/* Speech bubble for reactions */}
      {mood === 'perfect' && (
        <div className={styles.companionBubble}>
          <span>PERFECT!</span>
        </div>
      )}
      {mood === 'excited' && combo >= 5 && (
        <div className={styles.companionBubble}>
          <span>{combo}コンボ!</span>
        </div>
      )}
      {mood === 'sad' && (
        <div className={styles.companionBubble}>
          <span>がんばって...</span>
        </div>
      )}

      {/* Combo excitement indicator */}
      {combo >= 10 && mood !== 'sad' && (
        <div className={styles.companionAura} style={{ borderColor: accent }} />
      )}
    </div>
  );
}
