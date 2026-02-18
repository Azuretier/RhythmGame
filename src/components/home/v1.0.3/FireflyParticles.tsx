'use client';

import { useEffect, useRef } from 'react';
import styles from './v1_0_3.module.css';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  maxOpacity: number;
  r: number;
  g: number;
  b: number;
}

const COLORS = [
  { r: 255, g: 200, b: 50 },
  { r: 255, g: 170, b: 30 },
  { r: 255, g: 230, b: 120 },
  { r: 255, g: 190, b: 80 },
];

const FIREFLY_COUNT = 25;

export default function FireflyParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize fireflies
    const fireflies: Firefly[] = Array.from({ length: FIREFLY_COUNT }, () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.1, // slight upward drift
        baseRadius: 1.5 + Math.random() * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.0,
        maxOpacity: 0.3 + Math.random() * 0.5,
        r: color.r,
        g: color.g,
        b: color.b,
      };
    });

    let time = 0;

    const render = () => {
      time += 0.016; // ~60fps
      ctx.clearRect(0, 0, width, height);

      for (const f of fireflies) {
        // Sine-wave drift
        f.x += f.vx + Math.sin(time * f.pulseSpeed * 0.5 + f.pulsePhase) * 0.15;
        f.y += f.vy + Math.cos(time * f.pulseSpeed * 0.3 + f.pulsePhase) * 0.1;

        // Wrap around edges
        if (f.x < -20) f.x = width + 20;
        if (f.x > width + 20) f.x = -20;
        if (f.y < -20) f.y = height + 20;
        if (f.y > height + 20) f.y = -20;

        // Pulse glow
        const pulse = Math.sin(time * f.pulseSpeed + f.pulsePhase);
        const opacity = f.maxOpacity * (0.4 + 0.6 * (pulse * 0.5 + 0.5));
        const radius = f.baseRadius * (0.7 + 0.3 * (pulse * 0.5 + 0.5));

        // Draw glow (radial gradient)
        const glowRadius = radius * 6;
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRadius);
        gradient.addColorStop(0, `rgba(${f.r}, ${f.g}, ${f.b}, ${opacity})`);
        gradient.addColorStop(0.3, `rgba(${f.r}, ${f.g}, ${f.b}, ${opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${f.r}, ${f.g}, ${f.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = `rgba(${f.r}, ${f.g}, ${f.b}, ${Math.min(opacity * 1.5, 1)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.fireflyCanvas}
      aria-hidden="true"
    />
  );
}
