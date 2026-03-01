'use client';

// =============================================================================
// Minecraft: Switch Edition — Damage Overlay
// =============================================================================
// Visual effects for taking damage, low health, directional damage indicators,
// and the death screen. Rendered as a fullscreen overlay on top of the game.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DamageSource } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DamageOverlayProps {
  /** Current player health (0-20). */
  health: number;
  /** Maximum player health. */
  maxHealth: number;
  /** Whether the player is dead. */
  isDead: boolean;
  /** Player's score at time of death. */
  score: number;
  /** Whether a damage flash should be shown. */
  showDamageFlash: boolean;
  /** Opacity of the damage flash (0-1), based on damage amount. */
  damageFlashIntensity: number;
  /** Direction of incoming damage in degrees (0-360, 0 = south). */
  damageDirection: number | null;
  /** Whether to show the directional damage indicator. */
  showDirectionIndicator: boolean;
  /** Callback when the player clicks "Respawn". */
  onRespawn: () => void;
  /** Callback when the player clicks "Title Screen". */
  onTitleScreen: () => void;
}

// ---------------------------------------------------------------------------
// Red Vignette — Damage flash effect
// ---------------------------------------------------------------------------

function DamageVignette({ intensity, visible }: { intensity: number; visible: boolean }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      setOpacity(Math.min(0.6, intensity * 0.6));
      const timer = setTimeout(() => setOpacity(0), 500);
      return () => clearTimeout(timer);
    }
    setOpacity(0);
  }, [visible, intensity]);

  if (opacity <= 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, ${opacity}) 100%)`,
        transition: 'opacity 500ms ease-out',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Low Health Heartbeat — Pulsing red border when health <= 8
// ---------------------------------------------------------------------------

function LowHealthOverlay({ health, maxHealth }: { health: number; maxHealth: number }) {
  const isLowHealth = health > 0 && health <= 8;

  if (!isLowHealth) return null;

  // Pulse speed increases as health decreases
  const pulseSpeed = Math.max(0.5, (health / 8) * 1.5);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        boxShadow: 'inset 0 0 60px rgba(139, 0, 0, 0.4), inset 0 0 120px rgba(139, 0, 0, 0.2)',
        animation: `heartbeat-pulse ${pulseSpeed}s ease-in-out infinite`,
      }}
    >
      <style>{`
        @keyframes heartbeat-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directional Damage Indicator — Arrow pointing toward damage source
// ---------------------------------------------------------------------------

function DirectionalIndicator({
  direction,
  visible,
}: {
  direction: number | null;
  visible: boolean;
}) {
  const [show, setShow] = useState(false);
  const [currentDirection, setCurrentDirection] = useState(0);

  useEffect(() => {
    if (visible && direction !== null) {
      setCurrentDirection(direction);
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible, direction]);

  if (!show) return null;

  // Convert damage direction to CSS rotation
  // The indicator arrow should point toward the damage source
  const rotation = currentDirection;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      <div
        className="relative w-48 h-48"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* Arrow indicator at the top of the circle */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '20px solid rgba(255, 30, 30, 0.8)',
            filter: 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.6))',
            animation: 'indicator-fade 1s ease-out forwards',
          }}
        />
      </div>
      <style>{`
        @keyframes indicator-fade {
          0% {
            opacity: 1;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Death Screen — "You Died!" with respawn button
// ---------------------------------------------------------------------------

function DeathScreen({
  score,
  onRespawn,
  onTitleScreen,
}: {
  score: number;
  onRespawn: () => void;
  onTitleScreen: () => void;
}) {
  const [canRespawn, setCanRespawn] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Fade in the death screen
    requestAnimationFrame(() => setFadeIn(true));

    // Enable respawn button after 1 second
    const timer = setTimeout(() => setCanRespawn(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'transition-opacity duration-500',
        fadeIn ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        background: 'rgba(100, 0, 0, 0.6)',
      }}
    >
      {/* "You Died!" title */}
      <h1
        className="text-5xl font-bold mb-4 tracking-wide"
        style={{
          color: '#FF3333',
          textShadow: '0 0 10px rgba(255, 0, 0, 0.5), 2px 2px 0 #000',
          fontFamily: 'var(--font-pixel, "Courier New", monospace)',
        }}
      >
        You Died!
      </h1>

      {/* Score */}
      <p
        className="text-lg mb-12"
        style={{
          color: '#AAAAAA',
          textShadow: '1px 1px 0 #000',
        }}
      >
        Score: {score}
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-64">
        {/* Respawn button */}
        <button
          onClick={onRespawn}
          disabled={!canRespawn}
          className={cn(
            'px-6 py-2.5 text-sm font-medium border-2 transition-all duration-200',
            canRespawn
              ? 'border-white/40 bg-neutral-800/80 text-white hover:bg-neutral-700/90 hover:border-white/60 cursor-pointer'
              : 'border-white/15 bg-neutral-800/40 text-white/30 cursor-not-allowed',
          )}
          style={{
            fontFamily: 'var(--font-pixel, "Courier New", monospace)',
            imageRendering: 'pixelated',
          }}
        >
          Respawn
        </button>

        {/* Title Screen button */}
        <button
          onClick={onTitleScreen}
          className={cn(
            'px-6 py-2.5 text-sm font-medium border-2',
            'border-white/40 bg-neutral-800/80 text-white hover:bg-neutral-700/90 hover:border-white/60',
            'transition-all duration-200 cursor-pointer',
          )}
          style={{
            fontFamily: 'var(--font-pixel, "Courier New", monospace)',
            imageRendering: 'pixelated',
          }}
        >
          Title Screen
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DamageOverlay Component
// ---------------------------------------------------------------------------

/**
 * DamageOverlay renders all damage-related visual effects:
 * - Red vignette on taking damage
 * - Low health heartbeat pulsing border
 * - Directional damage indicator
 * - Death screen with respawn
 */
export default function DamageOverlay({
  health,
  maxHealth,
  isDead,
  score,
  showDamageFlash,
  damageFlashIntensity,
  damageDirection,
  showDirectionIndicator,
  onRespawn,
  onTitleScreen,
}: DamageOverlayProps) {
  return (
    <>
      {/* Red vignette on damage */}
      <DamageVignette
        intensity={damageFlashIntensity}
        visible={showDamageFlash}
      />

      {/* Low health heartbeat effect */}
      <LowHealthOverlay health={health} maxHealth={maxHealth} />

      {/* Directional damage indicator */}
      <DirectionalIndicator
        direction={damageDirection}
        visible={showDirectionIndicator}
      />

      {/* Death screen */}
      {isDead && (
        <DeathScreen
          score={score}
          onRespawn={onRespawn}
          onTitleScreen={onTitleScreen}
        />
      )}
    </>
  );
}
