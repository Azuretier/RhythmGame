'use client';

import { useEffect, useRef } from 'react';
import type { GamePhase } from '@/types/tower-defense';
import styles from './TDParticleOverlay.module.css';

interface TDParticleOverlayProps {
  phase: GamePhase;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  frequency: number;
  amplitude: number;
}

const PHASE_COLORS: Record<GamePhase, string[]> = {
  build: ['#38bdf8', '#60a5fa', '#93c5fd'],
  wave: ['#ef4444', '#f97316', '#fbbf24'],
  won: ['#fbbf24', '#4ade80', '#a78bfa'],
  lost: ['#475569', '#64748b', '#334155'],
  menu: ['#38bdf8', '#60a5fa', '#93c5fd'],
  paused: ['#38bdf8', '#60a5fa', '#93c5fd'],
};

const MAX_PARTICLES = 25;

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticle(width: number, height: number, colors: string[]): Particle {
  return {
    x: Math.random() * width,
    y: height * 0.6 + Math.random() * height * 0.4,
    vx: 0,
    vy: randomInRange(-0.2, -0.8),
    size: randomInRange(1, 4),
    opacity: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 0,
    maxLife: randomInRange(120, 300),
    frequency: randomInRange(0.005, 0.02),
    amplitude: randomInRange(0.3, 1.2),
  };
}

export default function TDParticleOverlay({ phase }: TDParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>(phase);
  const timeRef = useRef<number>(0);

  // Keep phase ref updated without re-running the animation effect
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const colors = PHASE_COLORS[phaseRef.current];
    const width = window.innerWidth;
    const height = window.innerHeight;
    particlesRef.current = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = createParticle(width, height, colors);
      // Stagger initial life so they don't all appear at once
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    function animate() {
      if (!canvas || !ctx) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Skip rendering if tab is not visible
      if (document.hidden) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      timeRef.current++;

      const currentColors = PHASE_COLORS[phaseRef.current];
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Lifecycle opacity: fade in during first 15%, fade out during last 15%
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.15) {
          p.opacity = lifeRatio / 0.15;
        } else if (lifeRatio > 0.85) {
          p.opacity = (1 - lifeRatio) / 0.15;
        } else {
          p.opacity = 1;
        }

        // Movement
        p.x += Math.sin(timeRef.current * p.frequency) * p.amplitude;
        p.y += p.vy;

        // Respawn if dead or out of bounds
        if (p.life >= p.maxLife || p.y < -10) {
          const newP = createParticle(width, height, currentColors);
          particles[i] = newP;
          continue;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity * 0.7;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
