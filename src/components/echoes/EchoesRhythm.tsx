'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { useEchoesSocket } from '@/hooks/useEchoesSocket';
import type { RhythmNote, RhythmJudgement } from '@/types/echoes';
import { scoreRhythmResult } from '@/lib/echoes/combat';
import styles from './EchoesGame.module.css';

interface Props {
  socket: ReturnType<typeof useEchoesSocket>;
}

const LANE_KEYS = ['d', 'f', 'j', 'k'];
const LANE_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];

export function EchoesRhythm({ socket }: Props) {
  const { rhythmSequence } = socket;
  const [judgements, setJudgements] = useState<RhythmJudgement[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const processedNotesRef = useRef<Set<number>>(new Set());

  const perfectCount = useRef(0);
  const greatCount = useRef(0);
  const goodCount = useRef(0);
  const missCount = useRef(0);

  // Start the rhythm sequence
  useEffect(() => {
    if (!rhythmSequence) return;

    // Reset state
    setJudgements([]);
    setCombo(0);
    setMaxCombo(0);
    setCurrentNoteIndex(0);
    perfectCount.current = 0;
    greatCount.current = 0;
    goodCount.current = 0;
    missCount.current = 0;
    processedNotesRef.current.clear();

    // Auto-start after a brief delay
    const timer = setTimeout(() => {
      setIsPlaying(true);
      startTimeRef.current = performance.now();
    }, 1000);

    return () => clearTimeout(timer);
  }, [rhythmSequence]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !rhythmSequence) return;

    const loop = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setTimeElapsed(elapsed);

      // Check for missed notes
      for (let i = 0; i < rhythmSequence.notes.length; i++) {
        if (processedNotesRef.current.has(i)) continue;
        const note = rhythmSequence.notes[i];
        if (elapsed > note.time + rhythmSequence.goodWindow) {
          // Missed
          processedNotesRef.current.add(i);
          missCount.current++;
          setJudgements((prev) => [...prev, 'miss']);
          setCombo(0);
        }
      }

      // Check if sequence is complete
      if (elapsed > rhythmSequence.duration + 500) {
        finishSequence();
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, rhythmSequence]);

  // Key handler
  useEffect(() => {
    if (!isPlaying || !rhythmSequence) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane === -1) return;

      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      // Find closest unprocessed note in this lane
      let closestIdx = -1;
      let closestDist = Infinity;

      for (let i = 0; i < rhythmSequence.notes.length; i++) {
        if (processedNotesRef.current.has(i)) continue;
        const note = rhythmSequence.notes[i];
        if (note.lane !== lane) continue;
        const dist = Math.abs(elapsed - note.time);
        if (dist < closestDist && dist <= rhythmSequence.goodWindow) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx === -1) return; // No note to hit

      processedNotesRef.current.add(closestIdx);

      // Judge timing
      let judgement: RhythmJudgement;
      if (closestDist <= rhythmSequence.perfectWindow) {
        judgement = 'perfect';
        perfectCount.current++;
      } else if (closestDist <= rhythmSequence.greatWindow) {
        judgement = 'great';
        greatCount.current++;
      } else {
        judgement = 'good';
        goodCount.current++;
      }

      setJudgements((prev) => [...prev, judgement]);
      setCombo((prev) => {
        const next = prev + 1;
        setMaxCombo((max) => Math.max(max, next));
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, rhythmSequence]);

  const finishSequence = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);

    const result = scoreRhythmResult(
      perfectCount.current,
      greatCount.current,
      goodCount.current,
      missCount.current,
      maxCombo
    );

    // Send to server
    socket.submitRhythmResult(result);
  }, [maxCombo, socket]);

  if (!rhythmSequence) {
    return <div className={styles.rhythmLoading}>Preparing rhythm sequence...</div>;
  }

  const progress = Math.min(1, timeElapsed / rhythmSequence.duration);
  const totalNotes = rhythmSequence.notes.length;
  const processedCount = processedNotesRef.current.size;

  // Get last judgement for display
  const lastJudgement = judgements[judgements.length - 1];

  return (
    <div className={styles.rhythmScreen}>
      {/* Header */}
      <div className={styles.rhythmHeader}>
        <div className={styles.rhythmStats}>
          <span className={styles.rhythmCombo}>
            {combo > 0 && `${combo} COMBO`}
          </span>
          <span className={styles.rhythmProgress}>
            {processedCount}/{totalNotes}
          </span>
        </div>
        {/* Progress bar */}
        <div className={styles.rhythmProgressBar}>
          <div
            className={styles.rhythmProgressFill}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Judgement display */}
      {lastJudgement && (
        <div className={`${styles.judgementDisplay} ${styles[`judgement_${lastJudgement}`]}`}>
          {lastJudgement.toUpperCase()}
        </div>
      )}

      {/* Lane display */}
      <div className={styles.laneContainer}>
        {LANE_KEYS.map((key, lane) => (
          <div key={lane} className={styles.lane}>
            {/* Falling notes */}
            {rhythmSequence.notes
              .filter((note) => note.lane === lane && !processedNotesRef.current.has(rhythmSequence.notes.indexOf(note)))
              .map((note, i) => {
                const noteIdx = rhythmSequence.notes.indexOf(note);
                const timeUntil = note.time - timeElapsed;
                const yPos = Math.max(-10, Math.min(100, 80 - (timeUntil / 1000) * 40));

                if (timeUntil < -500 || timeUntil > 3000) return null;

                return (
                  <div
                    key={noteIdx}
                    className={`${styles.note} ${styles[`note_${note.type}`]}`}
                    style={{
                      top: `${yPos}%`,
                      backgroundColor: LANE_COLORS[lane],
                      opacity: timeUntil > 2000 ? 0.3 : 1,
                    }}
                  >
                    {note.type === 'hold' && <div className={styles.holdTail} />}
                    {note.type === 'flick' && <div className={styles.flickArrow}>↑</div>}
                    {note.type === 'slide' && (
                      <div className={styles.slideArrow}>
                        {note.slideDirection === 'left' ? '←' : note.slideDirection === 'right' ? '→' : note.slideDirection === 'up' ? '↑' : '↓'}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Hit zone */}
            <div className={styles.hitZone} style={{ borderColor: LANE_COLORS[lane] }}>
              <span className={styles.laneKey}>{key.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Score summary */}
      <div className={styles.rhythmScore}>
        <span className={styles.scoreItem} style={{ color: '#FFD700' }}>P: {perfectCount.current}</span>
        <span className={styles.scoreItem} style={{ color: '#3B82F6' }}>G: {greatCount.current}</span>
        <span className={styles.scoreItem} style={{ color: '#22C55E' }}>OK: {goodCount.current}</span>
        <span className={styles.scoreItem} style={{ color: '#EF4444' }}>Miss: {missCount.current}</span>
      </div>

      {/* Pre-start message */}
      {!isPlaying && timeElapsed === 0 && (
        <div className={styles.rhythmReady}>
          <h2>Get Ready!</h2>
          <p>Use D, F, J, K keys to hit the notes</p>
          <p className={styles.rhythmDifficulty}>
            Difficulty: {rhythmSequence.difficulty.toUpperCase()} | BPM: {rhythmSequence.bpm}
          </p>
        </div>
      )}
    </div>
  );
}
