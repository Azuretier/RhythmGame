'use client';

import { useSkin } from '@/lib/skin/context';
import styles from './SkinAmbientEffects.module.css';

type Intensity = 'idle' | 'playing' | 'intense';

interface SkinAmbientEffectsProps {
  /** Controls how strong the effects are — idle for lobby, playing for gameplay, intense for transitions/fever */
  intensity?: Intensity;
}

/* ─── Sakura (pink): Falling cherry blossom petals + ambient glow ─── */
function SakuraEffects({ intensity }: { intensity: Intensity }) {
  const intense = intensity === 'intense';
  const playing = intensity === 'playing' || intense;

  return (
    <>
      {/* Ambient pink radial glow — top-right corner */}
      <div className={`${styles.sakuraAmbientGlow} ${playing ? styles.sakuraAmbientGlowActive : ''}`} />

      {/* Secondary glow — bottom-left */}
      {playing && <div className={styles.sakuraAmbientGlow2} />}

      {/* Falling petals — staggered, each with unique drift */}
      <div className={`${styles.petal} ${styles.petal1}`}>
        <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="8" ry="4.5" transform="rotate(-25 10 10)" fill="rgba(255,170,210,0.7)" /></svg>
      </div>
      <div className={`${styles.petal} ${styles.petal2}`}>
        <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="7" ry="4" transform="rotate(15 10 10)" fill="rgba(255,140,190,0.6)" /></svg>
      </div>
      <div className={`${styles.petal} ${styles.petal3}`}>
        <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="6" ry="3.5" transform="rotate(-40 10 10)" fill="rgba(255,190,220,0.55)" /></svg>
      </div>
      <div className={`${styles.petal} ${styles.petal4}`}>
        <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="7.5" ry="4" transform="rotate(30 10 10)" fill="rgba(255,160,200,0.5)" /></svg>
      </div>
      <div className={`${styles.petal} ${styles.petal5}`}>
        <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="5.5" ry="3" transform="rotate(-10 10 10)" fill="rgba(255,180,215,0.45)" /></svg>
      </div>

      {/* Extra petals during gameplay */}
      {playing && (
        <>
          <div className={`${styles.petal} ${styles.petal6}`}>
            <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="6.5" ry="3.5" transform="rotate(45 10 10)" fill="rgba(255,150,195,0.6)" /></svg>
          </div>
          <div className={`${styles.petal} ${styles.petal7}`}>
            <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="5" ry="3" transform="rotate(-55 10 10)" fill="rgba(255,180,210,0.5)" /></svg>
          </div>
        </>
      )}

      {/* Burst petals during intense phase (transitions, fever) */}
      {intense && (
        <>
          <div className={`${styles.petal} ${styles.petalBurst1}`}>
            <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="9" ry="5" transform="rotate(20 10 10)" fill="rgba(255,120,175,0.75)" /></svg>
          </div>
          <div className={`${styles.petal} ${styles.petalBurst2}`}>
            <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="8" ry="4.5" transform="rotate(-35 10 10)" fill="rgba(255,100,160,0.65)" /></svg>
          </div>
        </>
      )}
    </>
  );
}

/* ─── Sunset (orange): Rising embers + sweeping rays + horizon glow ─── */
function SunsetEffects({ intensity }: { intensity: Intensity }) {
  const intense = intensity === 'intense';
  const playing = intensity === 'playing' || intense;

  return (
    <>
      {/* Warm horizon gradient at the bottom */}
      <div className={`${styles.sunsetHorizonGlow} ${playing ? styles.sunsetHorizonGlowActive : ''}`} />

      {/* Sweeping diagonal light rays */}
      <div className={`${styles.ray} ${styles.ray1}`} />
      <div className={`${styles.ray} ${styles.ray2}`} />
      {playing && <div className={`${styles.ray} ${styles.ray3}`} />}

      {/* Rising ember particles */}
      <div className={`${styles.ember} ${styles.ember1}`} />
      <div className={`${styles.ember} ${styles.ember2}`} />
      <div className={`${styles.ember} ${styles.ember3}`} />
      <div className={`${styles.ember} ${styles.ember4}`} />
      <div className={`${styles.ember} ${styles.ember5}`} />

      {/* Extra embers during gameplay */}
      {playing && (
        <>
          <div className={`${styles.ember} ${styles.ember6}`} />
          <div className={`${styles.ember} ${styles.ember7}`} />
          <div className={`${styles.ember} ${styles.ember8}`} />
        </>
      )}

      {/* Sun orb glow — top area */}
      <div className={`${styles.sunsetOrbGlow} ${intense ? styles.sunsetOrbGlowIntense : ''}`} />

      {/* Heat haze during intense */}
      {intense && <div className={styles.heatHaze} />}
    </>
  );
}

export default function SkinAmbientEffects({ intensity = 'idle' }: SkinAmbientEffectsProps) {
  const { currentSkin } = useSkin();

  if (currentSkin.id !== 'sakura' && currentSkin.id !== 'sunset') {
    return null;
  }

  return (
    <div className={styles.ambientContainer} aria-hidden="true">
      {currentSkin.id === 'sakura' && <SakuraEffects intensity={intensity} />}
      {currentSkin.id === 'sunset' && <SunsetEffects intensity={intensity} />}
    </div>
  );
}
