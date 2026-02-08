'use client';

import { useEffect, useRef } from 'react';
import styles from './rhythmia.module.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  opacity: number;
  color: { r: number; g: number; b: number };
}

export default function ParticleSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let mounted = true;

    // Handle resize
    const handleResize = () => {
      if (!canvas || !mounted) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      
      // Reinitialize particles on resize if they don't exist
      if (particlesRef.current.length === 0) {
        initParticles();
      }
    };

    // Initialize particles
    const initParticles = () => {
      const particleCount = 80;
      particlesRef.current = [];

      // Honkai Star Rail inspired colors
      const colors = [
        { r: 244, g: 196, b: 48 },   // Gold #f4c430
        { r: 147, g: 112, b: 219 },  // Purple #9370db
        { r: 65, g: 105, b: 225 },   // Blue #4169e1
        { r: 255, g: 215, b: 0 },    // Bright Gold
        { r: 138, g: 43, b: 226 },   // Bright Purple
      ];

      for (let i = 0; i < particleCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particlesRef.current.push({
          x: Math.random() * canvas.clientWidth,
          y: Math.random() * canvas.clientHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 3 + 1,
          baseRadius: Math.random() * 3 + 1,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.3,
          color: color,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation loop
    const render = () => {
      if (!mounted || !ctx || !canvas) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        // Update pulse effect
        particle.pulsePhase += particle.pulseSpeed * 0.02;
        const pulseScale = 1 + Math.sin(particle.pulsePhase) * 0.5;
        particle.radius = particle.baseRadius * pulseScale;

        // Draw particle
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius
        );
        
        const { r, g, b } = particle.color;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${particle.opacity})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw glow effect with pulse
        if (pulseScale > 1.3) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.opacity * 0.2})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw connections between nearby particles
      particlesRef.current.forEach((particle1, i) => {
        particlesRef.current.slice(i + 1).forEach((particle2) => {
          const dx = particle1.x - particle2.x;
          const dy = particle1.y - particle2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.15;
            ctx.strokeStyle = `rgba(147, 112, 219, ${opacity})`; // Purple connections
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particle1.x, particle1.y);
            ctx.lineTo(particle2.x, particle2.y);
            ctx.stroke();
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.webgpuStage}
      aria-hidden="true"
    />
  );
}
