'use client';

import { useState, useEffect } from 'react';
import styles from '../components/rhythmia/rhythmia.module.css';
import VanillaGame from '../components/rhythmia/tetris';
import MultiplayerGame from '../components/rhythmia/MultiplayerGame';
import LifeJourney from '../components/rhythmia/LifeJourney';
import ForestCampfireScene from '../components/rhythmia/ForestCampfireScene';

type GameMode = 'lobby' | 'vanilla' | 'multiplayer' | 'modded';

const DEFAULT_THIRD_WIDGET_TITLE = 'SNS links widgets';

export default function RhythmiaPage() {
  const [gameMode, setGameMode] = useState<GameMode>('lobby');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(127);
  const thirdWidgetTitle = process.env.NEXT_PUBLIC_THIRD_WIDGET_TITLE || DEFAULT_THIRD_WIDGET_TITLE;

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
          <span className={styles.gameTitle}>✨ {thirdWidgetTitle} — MOD SERVER</span>
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
      {/* WebGPU Forest Campfire Background */}
      <ForestCampfireScene />

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
              className={`${styles.serverCard} ${styles.modded} ${styles.desktopTab}`}
              onClick={() => launchGame('modded')}
            >
              <div className={styles.tabTitleBar}>
                <div className={styles.tabTitle}>
                  <span className={styles.tabIcon}>✨</span>
                  <span>{thirdWidgetTitle}</span>
                </div>
                <div className={styles.tabControls}>
                  <span className={styles.tabButton}>_</span>
                  <span className={styles.tabButton}>□</span>
                  <span className={styles.tabButton}>×</span>
                </div>
              </div>
              <span className={styles.cardBadge}>MODDED</span>
              <span className={styles.cardIcon}>✨</span>
              <h2 className={styles.cardTitle}>{thirdWidgetTitle}</h2>
              <p className={styles.cardSubtitle}>Social Connection</p>
              <p className={styles.cardDescription}>
                ソーシャルメディアへのリンクを集約したウィジェット。GitHub、YouTube、Instagram、Discordなど、すべての連絡先を一箇所で確認できます。
              </p>
              <div className={styles.cardFeatures}>
                <span className={styles.featureTag}>🔗 SNSリンク</span>
                <span className={styles.featureTag}>📱 モバイル対応</span>
                <span className={styles.featureTag}>🎨 カスタム</span>
              </div>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>4</div>
                  <div className={styles.statLabel}>Platforms</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>LIVE</div>
                  <div className={styles.statLabel}>Status</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>⚡</div>
                  <div className={styles.statLabel}>Fast</div>
                </div>
              </div>
              <button className={styles.playButton}>▶ CONNECT</button>
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
