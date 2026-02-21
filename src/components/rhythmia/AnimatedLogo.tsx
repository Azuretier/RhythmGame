'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AnimatedLogo.module.css';

interface AnimatedLogoProps {
  onComplete: () => void;
}

/**
 * Cinematic logo reveal animation inspired by Riot Games.
 *
 * Sequence:
 *  1. Darkness — particles drift inward
 *  2. Energy lines converge, forming a bright core
 *  3. "RHYTHMIA" text materializes with glow + light sweep
 *  4. "azuretier.net" fades in underneath
 *  5. Dramatic pulse/flash, then fade to black → onComplete
 */
export default function AnimatedLogo({ onComplete }: AnimatedLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Phase timeline (seconds)
  const PHASE_PARTICLES = 0;       // 0s – particles begin
  const PHASE_CONVERGE = 0.6;      // 0.6s – energy converges
  const PHASE_TEXT = 1.8;           // 1.8s – text appears
  const PHASE_SUBTITLE = 2.6;      // 2.6s – subtitle fades in
  const PHASE_FLASH = 3.4;         // 3.4s – flash/pulse
  const PHASE_FADEOUT = 4.0;        // 4.0s – fade out
  const PHASE_DONE = 4.8;           // 4.8s – complete

  // Allow skipping with click/key
  const skipToEnd = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setPhase(6);
    setTimeout(() => onCompleteRef.current(), 400);
  }, []);

  // Particle system on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    // Generate particles
    const PARTICLE_COUNT = 120;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 500;
      return {
        // Start position (random ring around center)
        startX: Math.cos(angle) * dist,
        startY: Math.sin(angle) * dist,
        // Current position (set each frame)
        x: 0,
        y: 0,
        // Properties
        size: 1 + Math.random() * 2.5,
        speed: 0.3 + Math.random() * 0.7,
        delay: Math.random() * 0.8,
        opacity: 0.2 + Math.random() * 0.6,
        color: Math.random() > 0.7
          ? `rgba(236, 40, 40, VAL)`   // red accent particles
          : Math.random() > 0.5
            ? `rgba(200, 200, 255, VAL)` // blue-white
            : `rgba(255, 255, 255, VAL)`, // white
      };
    });

    // Energy lines (converging beams)
    const ENERGY_LINE_COUNT = 24;
    const energyLines = Array.from({ length: ENERGY_LINE_COUNT }, (_, i) => {
      const angle = (i / ENERGY_LINE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      return {
        angle,
        length: 200 + Math.random() * 400,
        width: 0.5 + Math.random() * 1.5,
        speed: 0.4 + Math.random() * 0.6,
        delay: Math.random() * 0.4,
        opacity: 0.15 + Math.random() * 0.35,
      };
    });

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Update phase
      if (elapsed >= PHASE_DONE) {
        setPhase(6);
        cancelAnimationFrame(animFrameRef.current);
        setTimeout(() => onCompleteRef.current(), 100);
        return;
      } else if (elapsed >= PHASE_FADEOUT) {
        setPhase(5);
      } else if (elapsed >= PHASE_FLASH) {
        setPhase(4);
      } else if (elapsed >= PHASE_SUBTITLE) {
        setPhase(3);
      } else if (elapsed >= PHASE_TEXT) {
        setPhase(2);
      } else if (elapsed >= PHASE_CONVERGE) {
        setPhase(1);
      }

      // --- Draw energy lines (converging) ---
      if (elapsed >= PHASE_CONVERGE) {
        const lineProgress = Math.min(1, (elapsed - PHASE_CONVERGE) / 1.2);

        for (const line of energyLines) {
          const p = Math.max(0, Math.min(1, (lineProgress - line.delay) / (1 - line.delay)));
          if (p <= 0) continue;

          const eased = p * p * (3 - 2 * p); // smoothstep
          const currentLength = line.length * (1 - eased * 0.85);
          const endX = cx + Math.cos(line.angle) * currentLength * (1 - eased);
          const endY = cy + Math.sin(line.angle) * currentLength * (1 - eased);
          const startX = cx + Math.cos(line.angle) * line.length;
          const startY = cy + Math.sin(line.angle) * line.length;

          // Gradient along line
          const grad = ctx.createLinearGradient(startX, startY, endX, endY);
          grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
          grad.addColorStop(0.6, `rgba(255, 255, 255, ${line.opacity * eased * 0.5})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${line.opacity * eased})`);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(
            cx + Math.cos(line.angle) * (1 - eased) * 20,
            cy + Math.sin(line.angle) * (1 - eased) * 20,
          );
          ctx.strokeStyle = grad;
          ctx.lineWidth = line.width * (1 + eased);
          ctx.stroke();
        }

        // Core glow
        const glowIntensity = Math.min(1, lineProgress * 1.5);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 + glowIntensity * 60);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * glowIntensity})`);
        coreGrad.addColorStop(0.3, `rgba(236, 40, 40, ${0.15 * glowIntensity})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // --- Draw particles ---
      for (const p of particles) {
        const particleTime = Math.max(0, elapsed - p.delay);
        if (particleTime <= 0) continue;

        // Converge toward center over time
        const convergeAmount = Math.min(1, particleTime * p.speed * 0.6);
        const eased = convergeAmount * convergeAmount;

        p.x = cx + p.startX * (1 - eased);
        p.y = cy + p.startY * (1 - eased);

        // Fade in then out near center
        let alpha = p.opacity;
        if (convergeAmount < 0.1) alpha *= convergeAmount / 0.1;
        if (convergeAmount > 0.85) alpha *= (1 - convergeAmount) / 0.15;

        // After flash phase, particles glow brighter briefly
        if (elapsed >= PHASE_FLASH && elapsed < PHASE_FADEOUT) {
          const flashP = (elapsed - PHASE_FLASH) / (PHASE_FADEOUT - PHASE_FLASH);
          alpha *= 1 + (1 - flashP) * 2;
        }

        const colorStr = p.color.replace('VAL', String(Math.min(1, alpha)));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + eased * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = colorStr;
        ctx.fill();

        // Glow for larger particles
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = colorStr.replace(String(Math.min(1, alpha)), String(Math.min(1, alpha) * 0.15));
          ctx.fill();
        }
      }

      // --- Flash burst ---
      if (elapsed >= PHASE_FLASH && elapsed < PHASE_FADEOUT) {
        const flashProgress = (elapsed - PHASE_FLASH) / (PHASE_FADEOUT - PHASE_FLASH);
        const flashIntensity = Math.max(0, 1 - flashProgress * 2); // Quick flash
        if (flashIntensity > 0) {
          const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300 + flashProgress * 600);
          flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashIntensity * 0.6})`);
          flashGrad.addColorStop(0.4, `rgba(236, 40, 40, ${flashIntensity * 0.15})`);
          flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = flashGrad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={containerRef}
      className={styles.container}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase >= 5 ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      onClick={skipToEnd}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') skipToEnd();
      }}
      tabIndex={0}
      role="button"
      aria-label="Skip animation"
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Ambient vignette */}
      <div className={styles.vignette} />

      {/* Central content */}
      <div className={styles.content}>
        {/* Horizontal energy bar that expands */}
        <AnimatePresence>
          {phase >= 1 && phase < 5 && (
            <motion.div
              className={styles.energyBar}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: [0, 0.8, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>

        {/* Main title: RHYTHMIA */}
        <AnimatePresence>
          {phase >= 2 && phase < 5 && (
            <motion.div className={styles.titleWrapper}>
              <motion.h1
                className={styles.title}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {'RHYTHMIA'.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    className={styles.titleChar}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.05,
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.h1>

              {/* Light sweep effect over text */}
              <motion.div
                className={styles.lightSweep}
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  delay: 0.3,
                  duration: 0.8,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtitle: azuretier.net */}
        <AnimatePresence>
          {phase >= 3 && phase < 5 && (
            <motion.div
              className={styles.subtitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.7, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              azuretier<span className={styles.subtitleAccent}>.net</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Flash overlay */}
      <AnimatePresence>
        {phase === 4 && (
          <motion.div
            className={styles.flash}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Skip hint */}
      <AnimatePresence>
        {phase >= 1 && phase < 5 && (
          <motion.div
            className={styles.skipHint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            CLICK TO SKIP
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
