import React, { useEffect, useRef, useCallback } from 'react';
import type { TerrainParticle } from '../types';
import styles from '../VanillaGame.module.css';

interface TerrainParticlesProps {
    particles: TerrainParticle[];
}

/**
 * Canvas-based particle system for terrain destruction effects
 * Renders burst particles when terrain blocks are destroyed
 */
export function TerrainParticles({ particles }: TerrainParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const particlesRef = useRef(particles);
    particlesRef.current = particles;

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w * 2 || canvas.height !== h * 2) {
            canvas.width = w * 2;
            canvas.height = h * 2;
            ctx.scale(2, 2);
        }

        ctx.clearRect(0, 0, w, h);

        const now = Date.now();
        const currentParticles = particlesRef.current;

        for (const p of currentParticles) {
            const age = (now - (now - p.life)) / p.maxLife;
            const lifeRatio = Math.max(0, 1 - age);

            // Physics: gravity + velocity
            const elapsed = (p.maxLife - p.life) / 1000;
            const px = p.x + p.vx * elapsed * 60;
            const py = p.y + (p.vy + elapsed * 4) * elapsed * 60;

            const alpha = p.opacity * lifeRatio;
            const size = p.size * (0.5 + lifeRatio * 0.5);

            // Glow
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core particle
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Bright center
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (currentParticles.length > 0) {
            // eslint-disable-next-line react-hooks/immutability
            animRef.current = requestAnimationFrame(render);
        }
    }, []);

    useEffect(() => {
        if (particles.length > 0) {
            animRef.current = requestAnimationFrame(render);
        }
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [particles, render]);

    return (
        <canvas
            ref={canvasRef}
            className={styles.terrainParticleCanvas}
            aria-hidden="true"
        />
    );
}
