'use client';

// =============================================================================
// Minecraft: Nintendo Switch Edition — Title Screen
// Pixel-perfect recreation of the console edition title screen with Mojang
// splash screen, multi-screen navigation, and animated transitions.
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/navigation';
import styles from '@/components/minecraft-switch/MinecraftSwitch.module.css';
import { WorldCreationScreen } from '@/components/minecraft-switch/WorldCreationScreen';
import type { GameMode, Difficulty, WorldType } from '@/types/minecraft-switch';
import type { GameRules } from '@/lib/minecraft-switch/game-modes';

const MinecraftPanorama = dynamic(
  () => import('@/components/home/v1.0.2/MinecraftPanorama'),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Screen = 'splash' | 'main' | 'play' | 'createWorld';

interface WorldCreationConfig {
  worldName: string;
  seed: string;
  worldSize: string;
  gameMode: GameMode;
  difficulty: Difficulty;
  worldType: WorldType;
  gameRules: GameRules;
  generateStructures: boolean;
  bonusChest: boolean;
}

// ---------------------------------------------------------------------------
// Splash texts (shown rotating on the title screen)
// ---------------------------------------------------------------------------

const SPLASHES = [
  'Web Edition!',
  'Now in your browser!',
  'TypeScript-powered!',
  'Also try Terraria!',
  '100% renewable!',
  'Pixel perfect!',
  'Three.js inside!',
  'Voxel magic!',
  'Is that a creeper?',
  'Block by block!',
  'Notch approved*',
  'Infinite potential!',
  'Craft everything!',
  'Now with panorama!',
  'Limited world!',
  'Super Duper!',
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MinecraftTitlePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('splash');
  const [splash, setSplash] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick a random splash text on mount
  useEffect(() => {
    setSplash(SPLASHES[Math.floor(Math.random() * SPLASHES.length)]);
  }, []);

  // Mojang splash screen timer: show for 2s then fade to main
  useEffect(() => {
    if (screen === 'splash') {
      splashTimerRef.current = setTimeout(() => {
        setSplashFading(true);
        // Fade out takes 0.5s, then switch screen
        setTimeout(() => {
          setScreen('main');
          setSplashFading(false);
        }, 500);
      }, 2000);
    }
    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    };
  }, [screen]);

  // Navigate between screens with a brief fade transition
  const navigateTo = useCallback((target: Screen) => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen(target);
      setTransitioning(false);
    }, 200);
  }, []);

  // Handle world creation from WorldCreationScreen
  const handleCreateWorld = useCallback((config: WorldCreationConfig) => {
    let seedNum: number;
    if (config.seed) {
      let hash = 0;
      for (let i = 0; i < config.seed.length; i++) {
        const char = config.seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      seedNum = Math.abs(hash);
    } else {
      seedNum = Math.floor(Math.random() * 2147483647);
    }

    const params = new URLSearchParams({
      seed: seedNum.toString(),
      size: config.worldSize,
      mode: config.gameMode,
      difficulty: config.difficulty,
      name: config.worldName,
    });

    router.push(`/minecraft/play?${params.toString()}`);
  }, [router]);

  // --- Mojang Splash Screen ---
  if (screen === 'splash') {
    return (
      <div
        className={styles.titleScreen}
        style={{
          opacity: splashFading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-pixel), "Press Start 2P", monospace',
            fontSize: 'clamp(18px, 4vw, 36px)',
            color: '#DD0000',
            textShadow: '3px 3px 0px #440000',
            letterSpacing: '4px',
            userSelect: 'none',
            imageRendering: 'pixelated',
          }}
        >
          MOJANG STUDIOS
        </span>
      </div>
    );
  }

  return (
    <div className={styles.titleScreen}>
      {/* Panorama background */}
      <MinecraftPanorama />

      {/* Overlays */}
      <div className={styles.vignette} />
      <div className={styles.gradientOverlay} />

      {/* Screen content with fade transition */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'opacity',
        }}
      >
        {/* --- Main Title Screen --- */}
        {screen === 'main' && (
          <div
            className={styles.fadeIn}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
            }}
          >
            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
              <h1 className={styles.mcTitle}>MINECRAFT</h1>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <span className={styles.mcSubtitle}>Nintendo Switch Edition</span>
                {/* Splash text */}
                <span
                  className={styles.splashText}
                  style={{
                    position: 'absolute',
                    left: '105%',
                    top: '-8px',
                  }}
                >
                  {splash}
                </span>
              </div>
            </div>

            {/* Menu buttons */}
            <div className={styles.menuContainer}>
              {/* Play — primary, full width */}
              <button
                className={styles.mcButtonPrimary}
                style={{ width: '100%' }}
                onClick={() => navigateTo('play')}
              >
                Play
              </button>

              {/* Editions | Store */}
              <div className={styles.menuRow}>
                <button className={styles.mcButton} disabled>
                  Editions
                </button>
                <button className={styles.mcButton} disabled>
                  Store
                </button>
              </div>

              {/* Settings | Invite Friends */}
              <div className={styles.menuRow}>
                <button className={styles.mcButton} disabled>
                  Settings
                </button>
                <button className={styles.mcButton} disabled>
                  Invite Friends
                </button>
              </div>

              {/* How to Play — full width */}
              <button
                className={styles.mcButton}
                style={{ width: '100%' }}
                disabled
              >
                How to Play
              </button>
            </div>
          </div>
        )}

        {/* --- Play Screen (world selection) --- */}
        {screen === 'play' && (
          <div
            className={styles.fadeIn}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0 16px',
            }}
          >
            <div className={styles.mcPanel} style={{ maxWidth: '540px', width: '100%' }}>
              {/* Header */}
              <div className={styles.mcPanelHeader}>
                <span className={styles.mcPanelTitle}>Play</span>
              </div>

              {/* Content */}
              <div className={styles.mcPanelContent} style={{ minHeight: '200px' }}>
                {/* Create New World button */}
                <button
                  className={styles.mcButtonPrimary}
                  style={{ width: '100%' }}
                  onClick={() => navigateTo('createWorld')}
                >
                  Create New World
                </button>

                {/* Separator */}
                <div className={styles.mcSeparator} />

                {/* No worlds placeholder */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 16px',
                  }}
                >
                  <span className={styles.mcDescription}>
                    No worlds yet. Create a new world to get started!
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className={styles.mcPanelFooter}>
                <button
                  className={styles.mcButton}
                  style={{ flex: 1 }}
                  onClick={() => navigateTo('main')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Create World Screen --- */}
        {screen === 'createWorld' && (
          <div
            className={styles.screenOverlay}
            style={{ padding: '16px' }}
          >
            <WorldCreationScreen
              onCreateWorld={handleCreateWorld}
              onCancel={() => navigateTo('play')}
            />
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className={styles.bottomBar}>
        <span className={styles.bottomBarText}>
          Minecraft: Nintendo Switch Edition
        </span>
        <span className={styles.bottomBarText}>
          Copyright Mojang AB. Do not distribute!
        </span>
        <span className={styles.bottomBarText}>
          v0.1.0-alpha
        </span>
      </div>
    </div>
  );
}
