'use client';

import { useState } from 'react';
import styles from './LifeJourney.module.css';

const chapters = [
  {
    id: 'birth',
    title: '誕生',
    subtitle: 'Genesis',
    color: '#FFE4E1',
    accent: '#FF6B6B',
    emoji: '🌅',
    poem: '光の中へ',
    description: '無限の可能性を抱いて、この世界に生まれ落ちる瞬間。すべてが新しく、すべてが眩しい。',
    visual: 'radial-gradient(ellipse at 50% 100%, #FFB6C1 0%, #FFE4E1 40%, #FFF8DC 100%)'
  },
  {
    id: 'growth',
    title: '成長',
    subtitle: 'Bloom',
    color: '#E8F5E9',
    accent: '#4CAF50',
    emoji: '🌱',
    poem: '根を張り、空へ',
    description: '小さな芽が土を破り、太陽に向かって伸びていく。好奇心と発見の日々。',
    visual: 'linear-gradient(180deg, #87CEEB 0%, #E8F5E9 50%, #8B4513 100%)'
  },
  {
    id: 'adventure',
    title: '冒険',
    subtitle: 'Journey',
    color: '#E3F2FD',
    accent: '#2196F3',
    emoji: '⛵',
    poem: '未知なる海へ',
    description: '広い世界に飛び出し、自分だけの道を切り開く。挑戦と勇気の季節。',
    visual: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  },
  {
    id: 'love',
    title: '愛',
    subtitle: 'Love',
    color: '#FCE4EC',
    accent: '#E91E63',
    emoji: '💕',
    poem: '二つの魂が出会う',
    description: '誰かと深く繋がり、心を開く喜びと痛み。人生を彩る最も美しい感情。',
    visual: 'radial-gradient(circle at 30% 30%, #FF69B4 0%, #FFB6C1 30%, #FFF0F5 100%)'
  },
  {
    id: 'struggle',
    title: '試練',
    subtitle: 'Storm',
    color: '#ECEFF1',
    accent: '#607D8B',
    emoji: '🌊',
    poem: '嵐を越えて',
    description: '暗闘の中で自分と向き合う。傷つきながらも、強さを見つける時。',
    visual: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
  },
  {
    id: 'wisdom',
    title: '成熟',
    subtitle: 'Harvest',
    color: '#FFF8E1',
    accent: '#FF9800',
    emoji: '🍂',
    poem: '実りの秋',
    description: '経験が知恵となり、人生の深みを理解する。穏やかな強さと慈しみ。',
    visual: 'linear-gradient(135deg, #F4A460 0%, #DAA520 50%, #8B4513 100%)'
  },
  {
    id: 'legacy',
    title: '継承',
    subtitle: 'Legacy',
    color: '#F3E5F5',
    accent: '#9C27B0',
    emoji: '✨',
    poem: '星になる',
    description: '自分が残すものは何か。次の世代へと繋がる、永遠の物語。',
    visual: 'radial-gradient(ellipse at 50% 0%, #2c003e 0%, #0d0015 50%, #000 100%)'
  }
];

export default function LifeJourney() {
  const [activeTab, setActiveTab] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTabChange = (index: number) => {
    if (index === activeTab || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(index);
      setIsTransitioning(false);
    }, 300);
  };

  const current = chapters[activeTab];
  const isDark = activeTab === 4 || activeTab === 6;

  return (
    <div
      className={styles.container}
      style={{ background: current.visual }}
      data-dark={isDark}
    >
      <nav className={styles.tabHeader}>
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id}
            className={`${styles.tabButton} ${activeTab === index ? styles.active : ''}`}
            onClick={() => handleTabChange(index)}
            style={{ color: activeTab === index ? chapter.accent : undefined }}
          >
            <span className={styles.tabEmoji}>{chapter.emoji}</span>
            <span className={styles.tabTitle}>{chapter.title}</span>
          </button>
        ))}
      </nav>

      <main
        className={styles.contentArea}
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        <span className={styles.floatingEmoji} style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
          {current.emoji}
        </span>
        <span className={styles.floatingEmoji} style={{ top: '60%', right: '10%', animationDelay: '2s' }}>
          {current.emoji}
        </span>
        <span className={styles.floatingEmoji} style={{ bottom: '20%', left: '15%', animationDelay: '4s' }}>
          {current.emoji}
        </span>

        <div className={styles.mainContent}>
          <div className={styles.chapterEmoji}>{current.emoji}</div>
          <h1 className={styles.chapterTitle}>{current.title}</h1>
          <p className={styles.chapterSubtitle}>{current.subtitle}</p>
          <p className={styles.chapterPoem}>「{current.poem}」</p>
          <p className={styles.chapterDescription}>{current.description}</p>
        </div>
      </main>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${((activeTab + 1) / chapters.length) * 100}%`,
            background: current.accent
          }}
        />
      </div>
    </div>
  );
}
