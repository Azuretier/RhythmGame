// ===== VFX Render Loop =====
// Standalone render function for the canvas-based VFX overlay.

import type { MutableRefObject } from 'react';
import type { VFXState, BoardGeometry } from './vfx-types';
import { swapRemove } from './vfx-types';
import { spawnAscendingParticles, spawnDragonEmbers } from './vfx-spawners';

/**
 * Main VFX render frame. Call from requestAnimationFrame.
 * Advances all particle lifetimes, applies physics, and draws everything.
 */
export function renderVFXFrame(
    time: number,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    stateRef: MutableRefObject<VFXState>,
    boardGeoRef: MutableRefObject<BoardGeometry>,
    lastTimeRef: MutableRefObject<number>,
    activeRef: MutableRefObject<boolean>,
    animFrameRef: MutableRefObject<number>,
    renderCallback: (time: number) => void,
): void {
    const canvas = canvasRef.current;
    if (!canvas) {
         
        animFrameRef.current = requestAnimationFrame(renderCallback);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        animFrameRef.current = requestAnimationFrame(renderCallback);
        return;
    }

    // Compute dt
    const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
    lastTimeRef.current = time;

    const state = stateRef.current;
    const geo = boardGeoRef.current;

    // Resize canvas to match parent
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Fever hue rotation ---
    if (state.isFever) {
        state.feverHue = (state.feverHue + dt * 120) % 360;
    }

    // --- Beat Rings ---
    for (let i = state.beatRings.length - 1; i >= 0; i--) {
        const ring = state.beatRings[i];
        ring.life -= dt * 2.5;
        ring.radius += (ring.maxRadius - ring.radius) * dt * 6;

        if (ring.life <= 0) {
            swapRemove(state.beatRings, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = ring.life * 0.5;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth * ring.life;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // --- Equalizer Bars ---
    for (let i = state.equalizerBars.length - 1; i >= 0; i--) {
        const bar = state.equalizerBars[i];
        bar.life -= dt * 1.8;

        if (bar.life <= 0) {
            swapRemove(state.equalizerBars, i);
            continue;
        }

        // Bounce animation
        const bounce = Math.sin((1 - bar.life) * Math.PI * 3 + bar.phase * Math.PI * 2);
        const currentHeight = bar.targetHeight * Math.abs(bounce) * bar.life;

        ctx.save();
        ctx.globalAlpha = bar.life * 0.7;
        ctx.fillStyle = bar.color;
        ctx.shadowColor = bar.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(bar.x, bar.baseY - currentHeight, bar.width, currentHeight);
        ctx.restore();
    }

    // --- Glitch Particles ---
    for (let i = state.glitchParticles.length - 1; i >= 0; i--) {
        const p = state.glitchParticles[i];
        p.life -= dt * 2;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 10 * dt; // gravity
        p.glitchOffset = (Math.random() - 0.5) * 6 * p.life;

        if (p.life <= 0) {
            swapRemove(state.glitchParticles, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life * 0.9;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        // Glitchy rectangular particles
        ctx.fillRect(p.x + p.glitchOffset, p.y, p.width * p.life, p.height);
        // Occasional scanline
        if (Math.random() > 0.7) {
            ctx.globalAlpha = p.life * 0.3;
            ctx.fillRect(p.x - 10, p.y, p.width + 20, 1);
        }
        ctx.restore();
    }

    // --- Rotation Trails ---
    for (let i = state.rotationTrails.length - 1; i >= 0; i--) {
        const trail = state.rotationTrails[i];
        trail.life -= dt * 4;

        if (trail.life <= 0) {
            swapRemove(state.rotationTrails, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = trail.life * trail.alpha;
        ctx.strokeStyle = trail.color;
        ctx.shadowColor = trail.color;
        ctx.shadowBlur = 12 * trail.life;
        ctx.lineWidth = 2 * trail.life;

        for (const cell of trail.cells) {
            ctx.strokeRect(cell.x + 2, cell.y + 2, geo.cellSize - 4, geo.cellSize - 4);
        }
        ctx.restore();
    }

    // --- Whirlpool Effects ---
    for (let i = state.whirlpools.length - 1; i >= 0; i--) {
        const wp = state.whirlpools[i];
        wp.life -= dt * 1.5;
        wp.radius += (wp.maxRadius - wp.radius) * dt * 4;
        wp.rotation += dt * 8;

        if (wp.life <= 0) {
            swapRemove(state.whirlpools, i);
            continue;
        }

        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(wp.rotation);
        ctx.globalAlpha = wp.life * 0.4;

        // Spiral arms
        for (let arm = 0; arm < 4; arm++) {
            const armAngle = (arm / 4) * Math.PI * 2;
            ctx.strokeStyle = wp.color;
            ctx.lineWidth = 2 * wp.life;
            ctx.shadowColor = wp.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.02) {
                const r = wp.radius * t;
                const angle = armAngle + t * Math.PI * 3;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- Speed Lines ---
    for (let i = state.speedLines.length - 1; i >= 0; i--) {
        const line = state.speedLines[i];
        line.life -= dt * 2;
        line.x += Math.cos(line.angle) * line.speed * dt;
        line.y += Math.sin(line.angle) * line.speed * dt;

        if (line.life <= 0) {
            swapRemove(state.speedLines, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = line.life * line.alpha;

        const feverColor = state.isFever
            ? `hsl(${(state.feverHue + i * 30) % 360}, 100%, 75%)`
            : 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = feverColor;
        ctx.lineWidth = line.width;
        ctx.shadowColor = feverColor;
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(
            line.x - Math.cos(line.angle) * line.length * line.life,
            line.y - Math.sin(line.angle) * line.length * line.life
        );
        ctx.stroke();
        ctx.restore();
    }

    // --- Ascending Particles (Fever particle rain going UP) ---
    for (let i = state.ascendingParticles.length - 1; i >= 0; i--) {
        const p = state.ascendingParticles[i];
        p.life -= dt * 0.4;
        p.x += p.vx;
        p.y += p.vy;
        p.pulsePhase += p.pulseSpeed * dt;

        if (p.life <= 0 || p.y < geo.top - 20) {
            swapRemove(state.ascendingParticles, i);
            continue;
        }

        const pulse = 0.5 + 0.5 * Math.sin(p.pulsePhase);
        const size = p.size * (0.8 + pulse * 0.4);

        ctx.save();
        const particleColor = state.isFever
            ? `hsl(${(state.feverHue + i * 20) % 360}, 90%, 70%)`
            : p.color;
        ctx.globalAlpha = p.life * p.alpha * (0.5 + pulse * 0.5);
        ctx.fillStyle = particleColor;
        ctx.shadowColor = particleColor;
        ctx.shadowBlur = size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Generic Particles (hard drop impact, etc.) ---
    for (let i = state.genericParticles.length - 1; i >= 0; i--) {
        const p = state.genericParticles[i];
        p.life -= dt * 2.5;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 12 * dt;

        if (p.life <= 0) {
            swapRemove(state.genericParticles, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life * p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Combo Break Shards ---
    for (let i = state.comboBreakShards.length - 1; i >= 0; i--) {
        const shard = state.comboBreakShards[i];
        shard.life -= dt * 1.8;
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += 8 * dt; // gravity
        shard.vx *= 0.98; // air resistance
        shard.rotation += shard.rotationSpeed * dt;

        // Update trail
        shard.trail.push({ x: shard.x, y: shard.y, alpha: shard.life * 0.3 });
        if (shard.trail.length > 6) shard.trail.shift();

        if (shard.life <= 0) {
            swapRemove(state.comboBreakShards, i);
            continue;
        }

        // Draw trail
        for (let t = 0; t < shard.trail.length; t++) {
            const tp = shard.trail[t];
            ctx.save();
            ctx.globalAlpha = tp.alpha * (t / shard.trail.length) * 0.5;
            ctx.fillStyle = shard.color;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, shard.width * 0.3 * shard.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw shard
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);
        ctx.globalAlpha = shard.life * shard.alpha;
        ctx.fillStyle = shard.color;
        ctx.shadowColor = shard.color;
        ctx.shadowBlur = 8 * shard.life;

        // Diamond/shard shape
        ctx.beginPath();
        const w = shard.width * shard.life;
        const h = shard.height * shard.life;
        ctx.moveTo(0, -h);
        ctx.lineTo(w * 0.5, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // --- Combo Break Rings ---
    for (let i = state.comboBreakRings.length - 1; i >= 0; i--) {
        const ring = state.comboBreakRings[i];
        ring.life -= dt * 2.0;
        ring.radius += (ring.maxRadius - ring.radius) * dt * 5;

        if (ring.life <= 0) {
            swapRemove(state.comboBreakRings, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = ring.life * 0.6;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth * ring.life;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 12 * ring.life;

        if (ring.dashed) {
            ctx.setLineDash([8, 6]);
        }

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // --- Dragon Energy Trails ---
    for (let i = state.dragonEnergyTrails.length - 1; i >= 0; i--) {
        const trail = state.dragonEnergyTrails[i];
        trail.progress += trail.speed * dt;
        trail.life -= dt * 1.2;

        if (trail.life <= 0 || trail.progress >= 1) {
            swapRemove(state.dragonEnergyTrails, i);
            continue;
        }

        // Ease-in-out interpolation
        const t = trail.progress;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const cx = trail.x + (trail.targetX - trail.x) * ease;
        const cy = trail.y + (trail.targetY - trail.y) * ease;

        // Record trail points
        trail.trail.push({ x: cx, y: cy });
        if (trail.trail.length > 8) trail.trail.shift();

        // Draw energy trail with glow
        ctx.save();
        ctx.globalAlpha = trail.life * 0.8;
        ctx.strokeStyle = trail.color;
        ctx.shadowColor = trail.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = trail.width;
        ctx.lineCap = 'round';

        if (trail.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail.trail[0].x, trail.trail[0].y);
            for (let j = 1; j < trail.trail.length; j++) {
                ctx.lineTo(trail.trail[j].x, trail.trail[j].y);
            }
            ctx.stroke();
        }

        // Bright head particle
        ctx.fillStyle = '#FFF8E1';
        ctx.shadowColor = '#FFB300';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, trail.width * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Dragon Fire Particles ---
    for (let i = state.dragonFireParticles.length - 1; i >= 0; i--) {
        const p = state.dragonFireParticles[i];
        p.life -= dt * 1.2;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 2 * dt; // Fire rises (anti-gravity)
        p.vx *= 0.98;

        if (p.life <= 0) {
            swapRemove(state.dragonFireParticles, i);
            continue;
        }

        ctx.save();
        const radius = p.size * p.life;

        // Radial gradient: white core -> orange -> crimson
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        if (p.heat > 0.7) {
            grad.addColorStop(0, 'rgba(255, 248, 225, 0.9)');
            grad.addColorStop(0.4, 'rgba(255, 179, 0, 0.6)');
            grad.addColorStop(1, 'rgba(220, 20, 60, 0)');
        } else if (p.heat > 0.4) {
            grad.addColorStop(0, 'rgba(255, 179, 0, 0.8)');
            grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
            grad.addColorStop(1, 'rgba(196, 30, 58, 0)');
        } else {
            grad.addColorStop(0, 'rgba(220, 20, 60, 0.7)');
            grad.addColorStop(0.6, 'rgba(196, 30, 58, 0.3)');
            grad.addColorStop(1, 'rgba(139, 0, 0, 0)');
        }

        ctx.globalAlpha = p.life * p.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius * p.scaleX, radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Dragon Embers ---
    for (let i = state.dragonEmbers.length - 1; i >= 0; i--) {
        const ember = state.dragonEmbers[i];
        ember.life -= dt * 0.5;
        ember.x += ember.vx;
        ember.y += ember.vy;
        ember.vx += (Math.random() - 0.5) * 0.3; // Wind wobble
        ember.flicker += ember.flickerSpeed * dt;

        if (ember.life <= 0 || ember.y < geo.top - 30) {
            swapRemove(state.dragonEmbers, i);
            continue;
        }

        const flickerAlpha = 0.5 + 0.5 * Math.sin(ember.flicker);

        ctx.save();
        ctx.globalAlpha = ember.life * flickerAlpha;
        ctx.fillStyle = ember.color;
        ctx.shadowColor = ember.color;
        ctx.shadowBlur = ember.size * 4;

        // Small glowing square
        const s = ember.size * ember.life;
        ctx.fillRect(ember.x - s / 2, ember.y - s / 2, s, s);
        ctx.restore();
    }

    // --- Dragon Breath Waves ---
    for (let i = state.dragonBreathWaves.length - 1; i >= 0; i--) {
        const wave = state.dragonBreathWaves[i];
        wave.life -= dt * 1.5;
        wave.radius += (wave.maxRadius - wave.radius) * dt * 4;

        if (wave.life <= 0) {
            swapRemove(state.dragonBreathWaves, i);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = wave.life * 0.4;
        // Gold-orange gradient ring
        ctx.strokeStyle = `rgba(255, 179, 0, ${wave.life})`;
        ctx.lineWidth = 4 * wave.life;
        ctx.shadowColor = '#FFB300';
        ctx.shadowBlur = 20 * wave.life;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner crimson ring
        ctx.strokeStyle = `rgba(220, 20, 60, ${wave.life * 0.5})`;
        ctx.lineWidth = 2 * wave.life;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // --- Dragon Breath Screen Flash ---
    if (state.dragonFlashAlpha > 0) {
        state.dragonFlashAlpha = Math.max(0, state.dragonFlashAlpha - dt * 2);
        ctx.save();
        ctx.globalAlpha = state.dragonFlashAlpha;
        ctx.fillStyle = '#FFB300';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // --- Dragon Breath Board Glow (during breathing) ---
    if (state.isDragonBreathing) {
        state.dragonBreathPhase = Math.min(1, state.dragonBreathPhase + dt * 0.33);

        // Gold border glow around board
        ctx.save();
        const pulseGlow = 0.3 + 0.3 * Math.sin(time * 0.006);
        ctx.globalAlpha = pulseGlow;
        ctx.strokeStyle = '#FFB300';
        ctx.shadowColor = '#FF8C00';
        ctx.shadowBlur = 25;
        ctx.lineWidth = 3;
        ctx.strokeRect(geo.left - 4, geo.top - 4, geo.width + 8, geo.height + 8);
        ctx.restore();

        // Continuous embers during breath
        if (Math.random() > 0.4) {
            spawnDragonEmbers(stateRef, boardGeoRef, 2);
        }
    }

    // --- Element Orb Particles ---
    for (let i = state.elementOrbParticles.length - 1; i >= 0; i--) {
        const p = state.elementOrbParticles[i];
        p.life -= dt * 1.5;
        p.pulsePhase += p.pulseSpeed * dt;
        p.orbitAngle += p.orbitSpeed * dt;

        // Orbital wobble motion
        p.x += p.vx * 0.95 + Math.cos(p.orbitAngle) * p.orbitRadius * dt;
        p.y += p.vy * 0.95 + Math.sin(p.orbitAngle) * p.orbitRadius * dt * 0.5;
        p.vy -= 0.5 * dt; // Slight upward drift
        p.vx *= 0.97;
        p.vy *= 0.97;

        if (p.life <= 0) {
            state.elementOrbParticles.splice(i, 1);
            continue;
        }

        const pulse = 0.6 + 0.4 * Math.sin(p.pulsePhase);
        const radius = p.size * p.life * pulse;

        ctx.save();
        ctx.globalAlpha = p.life * p.alpha;

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
        grad.addColorStop(0, p.glowColor);
        grad.addColorStop(0.4, p.elementColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = p.elementColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // --- Reaction Bursts (expanding rings) ---
    for (let i = state.reactionBursts.length - 1; i >= 0; i--) {
        const burst = state.reactionBursts[i];
        burst.life -= dt * 2.0;
        burst.radius += (burst.maxRadius - burst.radius) * dt * 5;

        if (burst.life <= 0) {
            state.reactionBursts.splice(i, 1);
            continue;
        }

        ctx.save();
        // Outer ring
        ctx.globalAlpha = burst.life * 0.7;
        ctx.strokeStyle = burst.color;
        ctx.lineWidth = burst.lineWidth * burst.life;
        ctx.shadowColor = burst.glowColor;
        ctx.shadowBlur = 20 * burst.life;
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.globalAlpha = burst.life * 0.4;
        ctx.strokeStyle = burst.glowColor;
        ctx.lineWidth = (burst.lineWidth * 0.6) * burst.life;
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.radius * burst.innerRatio, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // --- Reaction Auras (edge vignette) ---
    for (let i = state.reactionAuras.length - 1; i >= 0; i--) {
        const aura = state.reactionAuras[i];
        aura.life -= dt * 0.2; // Slow fade
        aura.pulsePhase += dt * 3;

        if (aura.life <= 0) {
            state.reactionAuras.splice(i, 1);
            continue;
        }

        const pulse = 0.6 + 0.4 * Math.sin(aura.pulsePhase);
        const edgeAlpha = aura.life * aura.intensity * pulse;

        ctx.save();
        ctx.globalAlpha = edgeAlpha;

        // Top edge glow
        const topGrad = ctx.createLinearGradient(0, geo.top, 0, geo.top + 40);
        topGrad.addColorStop(0, aura.color);
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(geo.left - 4, geo.top - 4, geo.width + 8, 44);

        // Bottom edge glow
        const bottomGrad = ctx.createLinearGradient(0, geo.top + geo.height - 40, 0, geo.top + geo.height);
        bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bottomGrad.addColorStop(1, aura.color);
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(geo.left - 4, geo.top + geo.height - 44, geo.width + 8, 48);

        // Left edge glow
        const leftGrad = ctx.createLinearGradient(geo.left, 0, geo.left + 30, 0);
        leftGrad.addColorStop(0, aura.color);
        leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(geo.left - 4, geo.top - 4, 34, geo.height + 8);

        // Right edge glow
        const rightGrad = ctx.createLinearGradient(geo.left + geo.width - 30, 0, geo.left + geo.width, 0);
        rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rightGrad.addColorStop(1, aura.color);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(geo.left + geo.width - 30, geo.top - 4, 34, geo.height + 8);

        // Pulsing border
        ctx.globalAlpha = edgeAlpha * 0.5;
        ctx.strokeStyle = aura.glowColor;
        ctx.shadowColor = aura.color;
        ctx.shadowBlur = 15 * pulse;
        ctx.lineWidth = 2;
        ctx.strokeRect(geo.left - 2, geo.top - 2, geo.width + 4, geo.height + 4);

        ctx.restore();
    }

    // --- Equipment Drop Beams ---
    for (let i = state.equipmentBeams.length - 1; i >= 0; i--) {
        const beam = state.equipmentBeams[i];
        beam.life -= dt * 1.2;
        beam.height += (beam.maxHeight - beam.height) * dt * 8;

        if (beam.life <= 0) {
            state.equipmentBeams.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = beam.life * 0.6;

        // Beam gradient (bright at top, fading down)
        const beamGrad = ctx.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.height);
        beamGrad.addColorStop(0, beam.color);
        beamGrad.addColorStop(0.5, beam.glowColor);
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 20 * beam.glowIntensity;

        // Draw beam rectangle centered on x
        const halfW = beam.width / 2;
        ctx.fillRect(beam.x - halfW, beam.y, beam.width, beam.height);

        // Bright core line
        ctx.globalAlpha = beam.life * 0.9;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.fillRect(beam.x - 1, beam.y, 2, beam.height * 0.8);

        ctx.restore();
    }

    // --- Corruption Glitches ---
    for (let i = state.corruptionGlitches.length - 1; i >= 0; i--) {
        const g = state.corruptionGlitches[i];
        g.life -= dt * 3.0;
        g.offsetX += (Math.random() - 0.5) * 15 * g.life;
        g.offsetY += (Math.random() - 0.5) * 5 * g.life;

        if (g.life <= 0) {
            state.corruptionGlitches.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = g.life * 0.7;
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(g.x + g.offsetX, g.y + g.offsetY, g.width * g.life, g.height);

        // Scanline effect
        if (Math.random() > 0.5) {
            ctx.globalAlpha = g.life * 0.2;
            ctx.fillRect(g.x + g.offsetX - 20, g.y + g.offsetY, g.width + 40, 1);
        }
        ctx.restore();
    }

    // --- Corruption Screen Flash ---
    if (state.corruptionFlashAlpha > 0) {
        state.corruptionFlashAlpha = Math.max(0, state.corruptionFlashAlpha - dt * 2.5);
        ctx.save();
        ctx.globalAlpha = state.corruptionFlashAlpha;
        // Red-purple gradient flash
        const flashGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.6
        );
        flashGrad.addColorStop(0, 'rgba(153, 68, 204, 0.8)');
        flashGrad.addColorStop(0.5, 'rgba(255, 34, 68, 0.5)');
        flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // --- Corruption Screen Shake ---
    if (state.corruptionShakeIntensity > 0) {
        state.corruptionShakeIntensity = Math.max(0, state.corruptionShakeIntensity - dt * 3);
        // The shake is applied via a canvas transform at the top level
        // Here we just decay the value — actual shake offset would be applied by the parent component
    }

    // --- Fever continuous effects ---
    if (state.isFever && state.combo >= 10) {
        // Continuous ascending particles
        if (Math.random() > 0.6) {
            spawnAscendingParticles(stateRef, boardGeoRef, 1);
        }
    }

    if (activeRef.current) {
        animFrameRef.current = requestAnimationFrame(renderCallback);
    }
}
