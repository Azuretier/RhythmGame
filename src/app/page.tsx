'use client';

import { useState, useEffect } from 'react';
import styles from '../components/rhythmia/rhythmia.module.css';
import VanillaGame from '../components/rhythmia/VanillaGame';
import MultiplayerGame from '../components/rhythmia/MultiplayerGame';
import LifeJourney from '../components/rhythmia/LifeJourney';
import WebGPUStage from '../components/rhythmia/WebGPUStage';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer' | 'modded';

export default function RhythmiaPage() {
  const [gameMode, setGameMode] = useState<GameMode>('lobby');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(127);

  useEffect(() => {
    // Simulate initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Simulate online player count updates
    const interval = setInterval(() => {
      const base = 120;
      const variance = Math.floor(Math.random() * 30) - 15;
      setOnlineCount(base + variance);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const launchGame = (mode: GameMode) => {
    setGameMode(mode);
  };

  const closeGame = () => {
    setGameMode('lobby');
  };

  if (gameMode === 'vanilla') {
    return (
      <div className={styles.gameContainer + ' ' + styles.active}>
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>🎮 RHYTHMIA — VANILLA SERVER</span>
          <button className={styles.backButton} onClick={closeGame}>
            ← ロビーに戻る
          </button>
        </div>
        <VanillaGame />
      </div>
    );
  }

  if (gameMode === 'multiplayer') {
    return (
      <div className={styles.gameContainer + ' ' + styles.active}>
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>⚔️ BATTLE ARENA — MULTIPLAYER</span>
          <button className={styles.backButton} onClick={closeGame}>
            ← ロビーに戻る
          </button>
        </div>
        <MultiplayerGame />
      </div>
    );
  }

  if (gameMode === 'modded') {
    return (
      <div className={styles.gameContainer + ' ' + styles.active}>
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>✨ LIFE JOURNEY — MOD SERVER</span>
          <button className={styles.backButton} onClick={closeGame}>
            ← ロビーに戻る
          </button>
        </div>
        <LifeJourney />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* WebGPU Stage Background */}
      <WebGPUStage />
      
      {/* CSS Fallback Background effects (for browsers without WebGPU) */}
      <div className={styles.bgGrid}></div>
      <div className={`${styles.bgGlow} ${styles.glow1}`}></div>
      <div className={`${styles.bgGlow} ${styles.glow2}`}></div>
      <div className={`${styles.bgGlow} ${styles.glow3}`}></div>

      {/* Loading overlay */}
      <div className={`${styles.loadingOverlay} ${!isLoading ? styles.hidden : ''}`}>
        <div className={styles.loader}></div>
        <div className={styles.loadingText}>INITIALIZING...</div>
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logo}>RHYTHMIA</div>
          <div className={styles.statusBar}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot}></span>
              <span>サーバー接続中</span>
            </div>
            <div className={styles.statusItem}>
              <span>v2.5.0</span>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.heroText}>
            <h1>SELECT SERVER</h1>
            <p>サーバーを選択してプレイ開始</p>
          </div>

          <div className={styles.serverGrid}>
            {/* Vanilla Server */}
            <div 
              className={`${styles.serverCard} ${styles.vanilla}`}
              onClick={() => launchGame('vanilla')}
            >
              <span className={styles.cardBadge}>OFFICIAL</span>
              <span className={styles.cardIcon}>🎮</span>
              <h2 className={styles.cardTitle}>VANILLA</h2>
              <p className={styles.cardSubtitle}>Original Experience</p>
              <p className={styles.cardDescription}>
                オリジナルのRHYTHMIA体験。リズムに乗ってブロックを積み、ワールドを攻略しよう。純粋なゲームプレイを楽しめます。
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>🎵 5ワールド</span>
                <span className={styles.featureTag}>⚡ リズムシステム</span>
                <span className={styles.featureTag}>🎨 オリジナル</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>100</div>
                  <div className={styles.statLabel}>BPM Start</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>160</div>
                  <div className={styles.statLabel}>BPM Max</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>∞</div>
                  <div className={styles.statLabel}>レベル</div>
                </div>
              </div>
              <button className={styles.playButton}>▶ PLAY NOW</button>
            </div>

            {/* Multiplayer Server */}
            <div 
              className={`${styles.serverCard} ${styles.multiplayer}`}
              onClick={() => launchGame('multiplayer')}
            >
              <span className={`${styles.cardBadge} ${styles.new}`}>🔥 NEW</span>
              <span className={styles.cardIcon}>⚔️</span>
              <h2 className={styles.cardTitle}>BATTLE ARENA</h2>
              <p className={styles.cardSubtitle}>Multiplayer Mode</p>
              <p className={styles.cardDescription}>
                リアルタイム対戦モード！ライン消去で相手にガベージを送り込め。最後まで生き残った者が勝者だ。
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>👥 2P対戦</span>
                <span className={styles.featureTag}>🤖 AI対戦</span>
                <span className={styles.featureTag}>💥 ガベージ</span>
                <span className={styles.featureTag}>🏆 ランキング</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>VS</div>
                  <div className={styles.statLabel}>Mode</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>1v1</div>
                  <div className={styles.statLabel}>Battle</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>LIVE</div>
                  <div className={styles.statLabel}>Status</div>
                </div>
              </div>
              <div className={styles.onlineCount}>
                <span className={styles.onlineDot}></span>
                <span>{onlineCount} players online</span>
              </div>
              <button className={styles.playButton}>⚔️ BATTLE NOW</button>
            </div>

            {/* Modded Server */}
            <div 
              className={`${styles.serverCard} ${styles.modded}`}
              onClick={() => launchGame('modded')}
            >
              <span className={styles.cardBadge}>MODDED</span>
              <span className={styles.cardIcon}>✨</span>
              <h2 className={styles.cardTitle}>LIFE JOURNEY</h2>
              <p className={styles.cardSubtitle}>Zen Experience</p>
              <p className={styles.cardDescription}>
                人生の旅を体験するインタラクティブアート。誕生から継承まで、7つの章を通じて人生の意味を探求します。
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>🌅 7チャプター</span>
                <span className={styles.featureTag}>🎨 ビジュアルアート</span>
                <span className={styles.featureTag}>📖 ストーリー</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>7</div>
                  <div className={styles.statLabel}>Chapters</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>∞</div>
                  <div className={styles.statLabel}>リプレイ</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>ZEN</div>
                  <div className={styles.statLabel}>Mode</div>
                </div>
              </div>
              <button className={styles.playButton}>▶ EXPERIENCE</button>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          RHYTHMIA NEXUS © 2025 — PLAY YOUR RHYTHM
        </footer>
      </div>
    </div>
  );
}
