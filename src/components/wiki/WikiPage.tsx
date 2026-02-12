'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import styles from './WikiPage.module.css';

type WikiSection =
  | 'overview'
  | 'modes'
  | 'worlds'
  | 'controls'
  | 'ranked'
  | 'advancements'
  | 'crafting'
  | 'tower-defense';

interface SectionDef {
  id: WikiSection;
  labelEn: string;
  labelJa: string;
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', labelEn: 'Overview', labelJa: '概要', icon: 'I' },
  { id: 'modes', labelEn: 'Game Modes', labelJa: 'ゲームモード', icon: 'II' },
  { id: 'worlds', labelEn: 'Worlds', labelJa: 'ワールド', icon: 'III' },
  { id: 'controls', labelEn: 'Controls', labelJa: '操作方法', icon: 'IV' },
  { id: 'ranked', labelEn: 'Ranked', labelJa: 'ランク戦', icon: 'V' },
  { id: 'advancements', labelEn: 'Advancements', labelJa: '進捗', icon: 'VI' },
  { id: 'crafting', labelEn: 'Items & Crafting', labelJa: 'アイテム&クラフト', icon: 'VII' },
  { id: 'tower-defense', labelEn: 'Tower Defense', labelJa: 'タワーディフェンス', icon: 'VIII' },
];

const WORLDS_DATA = [
  { name: 'Melodia', nameJa: 'メロディア', bpm: 100, color: '#FF6B9D', icon: '' },
  { name: 'Harmonia', nameJa: 'ハーモニア', bpm: 110, color: '#4ECDC4', icon: '' },
  { name: 'Crescenda', nameJa: 'クレシェンダ', bpm: 120, color: '#FFE66D', icon: '' },
  { name: 'Fortissimo', nameJa: 'フォルティッシモ', bpm: 140, color: '#FF6B6B', icon: '' },
  { name: 'Silence Chamber', nameJa: '静寂の間', bpm: 160, color: '#A29BFE', icon: '' },
];

const RANK_TIERS_DATA = [
  { name: 'Open I', nameJa: 'オープン I', points: '0 - 499', busFare: 0, winReward: 40, color: '#8B8B8B' },
  { name: 'Open II', nameJa: 'オープン II', points: '500 - 999', busFare: 10, winReward: 45, color: '#A0A0A0' },
  { name: 'Open III', nameJa: 'オープン III', points: '1,000 - 1,499', busFare: 15, winReward: 50, color: '#C0C0C0' },
  { name: 'Contender I', nameJa: 'コンテンダー I', points: '1,500 - 2,499', busFare: 20, winReward: 55, color: '#4ECDC4' },
  { name: 'Contender II', nameJa: 'コンテンダー II', points: '2,500 - 3,499', busFare: 25, winReward: 60, color: '#3DA69B' },
  { name: 'Contender III', nameJa: 'コンテンダー III', points: '3,500 - 4,999', busFare: 30, winReward: 65, color: '#2D847D' },
  { name: 'Champion I', nameJa: 'チャンピオン I', points: '5,000 - 7,499', busFare: 40, winReward: 75, color: '#FFD700' },
  { name: 'Champion II', nameJa: 'チャンピオン II', points: '7,500 - 9,999', busFare: 50, winReward: 85, color: '#FFA500' },
  { name: 'Champion III', nameJa: 'チャンピオン III', points: '10,000+', busFare: 60, winReward: 100, color: '#FF4500' },
];

const ITEMS_DATA = [
  { id: 'stone', name: 'Stone Fragment', nameJa: '石片', icon: '', rarity: 'Common', rarityJa: 'コモン', drop: '40%', color: '#8B8B8B' },
  { id: 'iron', name: 'Iron Ore', nameJa: '鉄鉱石', icon: '', rarity: 'Common', rarityJa: 'コモン', drop: '30%', color: '#B87333' },
  { id: 'crystal', name: 'Crystal Shard', nameJa: '水晶片', icon: '', rarity: 'Uncommon', rarityJa: 'アンコモン', drop: '15%', color: '#4FC3F7' },
  { id: 'gold', name: 'Gold Nugget', nameJa: '金塊', icon: '', rarity: 'Rare', rarityJa: 'レア', drop: '8%', color: '#FFD700' },
  { id: 'obsidian', name: 'Obsidian Core', nameJa: '黒曜核', icon: '', rarity: 'Epic', rarityJa: 'エピック', drop: '5%', color: '#9C27B0' },
  { id: 'star', name: 'Star Fragment', nameJa: '星の欠片', icon: '', rarity: 'Legendary', rarityJa: 'レジェンダリー', drop: '2%', color: '#E0E0E0' },
];

const WEAPONS_DATA = [
  { name: 'Stone Blade', nameJa: '石の刃', icon: '', damage: '+10%', special: '', specialJa: '', recipe: '3x Stone', recipeJa: '石片x3', color: '#9E9E9E' },
  { name: 'Iron Pickaxe', nameJa: '鉄のピッケル', icon: '', damage: '+20%', special: '', specialJa: '', recipe: '3x Iron', recipeJa: '鉄鉱石x3', color: '#B87333' },
  { name: 'Crystal Wand', nameJa: '水晶の杖', icon: '', damage: '+30%', special: 'Wide Beat', specialJa: 'ビート判定拡大', recipe: '2x Crystal + 2x Stone', recipeJa: '水晶片x2 + 石片x2', color: '#4FC3F7' },
  { name: 'Gold Hammer', nameJa: '黄金のハンマー', icon: '', damage: '+40%', special: '', specialJa: '', recipe: '2x Gold + 2x Iron', recipeJa: '金塊x2 + 鉄鉱石x2', color: '#FFD700' },
  { name: 'Obsidian Edge', nameJa: '黒曜の刃', icon: '', damage: '+60%', special: 'Shatter', specialJa: '粉砕効果', recipe: '1x Obsidian + 2x Iron', recipeJa: '黒曜核x1 + 鉄鉱石x2', color: '#9C27B0' },
  { name: 'Star Cannon', nameJa: '星砲', icon: '', damage: '+80%', special: 'Burst', specialJa: '爆発効果', recipe: '1x Star + 2x Crystal', recipeJa: '星の欠片x1 + 水晶片x2', color: '#E0E0E0' },
];

const CONTROLS_DATA = [
  { action: 'Move Left', actionJa: '左移動', key: 'Arrow Left / A' },
  { action: 'Move Right', actionJa: '右移動', key: 'Arrow Right / D' },
  { action: 'Soft Drop', actionJa: 'ソフトドロップ', key: 'Arrow Down / S' },
  { action: 'Hard Drop', actionJa: 'ハードドロップ', key: 'Space' },
  { action: 'Rotate CW', actionJa: '右回転', key: 'Arrow Up / W / X' },
  { action: 'Rotate CCW', actionJa: '左回転', key: 'Z' },
  { action: 'Hold', actionJa: 'ホールド', key: 'C / Shift' },
  { action: 'Inventory', actionJa: 'インベントリ', key: 'E' },
  { action: 'Shop', actionJa: 'ショップ', key: 'L' },
  { action: 'Forge', actionJa: '鍛造', key: 'F' },
];

const ADVANCEMENT_CATEGORIES = [
  {
    category: 'Lines',
    categoryJa: 'ライン',
    items: [
      { name: 'Line Beginner', nameJa: 'ライン初心者', desc: 'Clear 10 total lines', descJa: '合計10ライン消去' },
      { name: 'Line Apprentice', nameJa: 'ライン見習い', desc: 'Clear 50 total lines', descJa: '合計50ライン消去' },
      { name: 'Line Expert', nameJa: 'ラインエキスパート', desc: 'Clear 200 total lines', descJa: '合計200ライン消去' },
      { name: 'Line Master', nameJa: 'ラインマスター', desc: 'Clear 500 total lines', descJa: '合計500ライン消去' },
      { name: 'Line Legend', nameJa: 'ラインレジェンド', desc: 'Clear 1,000 total lines', descJa: '合計1,000ライン消去' },
    ],
  },
  {
    category: 'Score',
    categoryJa: 'スコア',
    items: [
      { name: 'Score Rookie', nameJa: 'スコアルーキー', desc: 'Accumulate 10,000 total score', descJa: '累計スコア10,000達成' },
      { name: 'Score Hunter', nameJa: 'スコアハンター', desc: 'Accumulate 100,000 total score', descJa: '累計スコア100,000達成' },
      { name: 'Score Master', nameJa: 'スコアマスター', desc: 'Accumulate 1,000,000 total score', descJa: '累計スコア1,000,000達成' },
      { name: 'Score Legend', nameJa: 'スコアレジェンド', desc: 'Accumulate 10,000,000 total score', descJa: '累計スコア10,000,000達成' },
    ],
  },
  {
    category: 'T-Spin',
    categoryJa: 'Tスピン',
    items: [
      { name: 'First Twist', nameJa: '初回転', desc: 'Perform your first T-Spin', descJa: '初めてのTスピンを決める' },
      { name: 'Spin Doctor', nameJa: 'スピンドクター', desc: 'Perform 10 T-Spins', descJa: 'Tスピンを10回決める' },
      { name: 'T-Spin Expert', nameJa: 'Tスピンエキスパート', desc: 'Perform 50 T-Spins', descJa: 'Tスピンを50回決める' },
      { name: 'T-Spin Legend', nameJa: 'Tスピンレジェンド', desc: 'Perform 200 T-Spins', descJa: 'Tスピンを200回決める' },
    ],
  },
  {
    category: 'Multiplayer',
    categoryJa: 'マルチプレイヤー',
    items: [
      { name: 'First Victory', nameJa: '初勝利', desc: 'Win your first multiplayer match', descJa: 'マルチプレイヤー初勝利' },
      { name: 'Arena Fighter', nameJa: 'アリーナファイター', desc: 'Win 10 multiplayer matches', descJa: 'マルチプレイヤー10勝' },
      { name: 'Arena Champion', nameJa: 'アリーナチャンピオン', desc: 'Win 50 multiplayer matches', descJa: 'マルチプレイヤー50勝' },
      { name: 'Hot Streak', nameJa: 'ホットストリーク', desc: 'Win 3 matches in a row', descJa: '3連勝達成' },
      { name: 'Unbreakable', nameJa: 'アンブレイカブル', desc: 'Win 10 matches in a row', descJa: '10連勝達成' },
    ],
  },
];

export default function WikiPage() {
  const locale = useLocale();
  const router = useRouter();
  const ja = locale === 'ja';
  const [activeSection, setActiveSection] = useState<WikiSection>('overview');
  const contentRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);
  const clickScrollTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToSection = (id: WikiSection) => {
    setActiveSection(id);

    // Suppress scroll-based highlight updates while the smooth scroll runs
    isClickScrolling.current = true;
    clearTimeout(clickScrollTimer.current);

    const el = document.getElementById(`wiki-${id}`);
    const container = contentRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    }

    // Re-enable after the smooth scroll is expected to finish
    clickScrollTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  const handleScroll = useCallback(() => {
    // Don't update sidebar while a click-triggered scroll is animating
    if (isClickScrolling.current) return;

    const container = contentRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // When scrolled to the bottom, activate the last visible section
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    if (isAtBottom) {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(`wiki-${s.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < containerRect.bottom) {
            setActiveSection(s.id);
            return;
          }
        }
      }
    }

    // Normal: find the topmost section whose top has scrolled past the threshold
    for (const s of [...SECTIONS].reverse()) {
      const el = document.getElementById(`wiki-${s.id}`);
      if (el) {
        const relativeTop = el.getBoundingClientRect().top - containerRect.top;
        if (relativeTop < 100) {
          setActiveSection(s.id);
          return;
        }
      }
    }
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>
            {ja ? '← ロビー' : '← Lobby'}
          </button>
          <span className={styles.logo}>azuretier.net</span>
          <span className={styles.wikiLabel}>WIKI</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navLink} onClick={() => router.push('/updates')}>
            {ja ? 'アップデート' : 'Updates'}
          </button>
          <LocaleSwitcher />
        </div>
      </header>

      <div className={styles.layout}>
        {/* Sidebar navigation */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            {ja ? '目次' : 'Contents'}
          </div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`${styles.sidebarItem} ${activeSection === s.id ? styles.sidebarActive : ''}`}
              onClick={() => scrollToSection(s.id)}
            >
              <span className={styles.sidebarNum}>{s.icon}</span>
              <span>{ja ? s.labelJa : s.labelEn}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main ref={contentRef} className={styles.content} onScroll={handleScroll}>

          {/* === OVERVIEW === */}
          <section id="wiki-overview" className={styles.section}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className={styles.sectionTitle}>
                {ja ? 'RHYTHMIAとは' : 'What is RHYTHMIA'}
              </h1>
              <p className={styles.paragraph}>
                {ja
                  ? 'RHYTHMIA（リズミア）は、クラシックな落ちものパズルゲームとリズムアクションを融合させた新感覚のブラウザゲームです。ビートに合わせてブロックを操作し、ラインを消去しながらワールドを踏破していきます。'
                  : 'RHYTHMIA is a browser-based puzzle game that fuses classic falling-block mechanics with rhythm action gameplay. Drop pieces on the beat, clear lines, and progress through a series of musically-themed worlds.'}
              </p>
              <div className={styles.featureGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>10x20</div>
                  <div className={styles.featureLabel}>{ja ? 'ボードサイズ' : 'Board Size'}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>7</div>
                  <div className={styles.featureLabel}>{ja ? 'テトロミノ' : 'Tetrominoes'}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>5</div>
                  <div className={styles.featureLabel}>{ja ? 'ワールド' : 'Worlds'}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>SRS</div>
                  <div className={styles.featureLabel}>{ja ? '回転方式' : 'Rotation System'}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>45+</div>
                  <div className={styles.featureLabel}>{ja ? '進捗' : 'Advancements'}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>9</div>
                  <div className={styles.featureLabel}>{ja ? 'ランクティア' : 'Rank Tiers'}</div>
                </div>
              </div>
              <div className={styles.infoBox}>
                <div className={styles.infoBoxTitle}>{ja ? 'コアメカニクス' : 'Core Mechanics'}</div>
                <ul className={styles.infoList}>
                  <li>{ja ? 'SRS（スーパーローテーションシステム）による回転' : 'Super Rotation System (SRS) for piece rotation with wall kicks'}</li>
                  <li>{ja ? 'ピースホールド機能とネクストピースプレビュー' : 'Piece hold and next piece preview'}</li>
                  <li>{ja ? 'リズムに同期したビジュアルエフェクト（VFX）' : 'Rhythm-synchronized visual effects (VFX)'}</li>
                  <li>{ja ? 'ビートに合わせた操作でボーナスポイント獲得' : 'Bonus points for actions timed to the beat'}</li>
                  <li>{ja ? 'コンボシステムとFeverモード（10コンボ以上）' : 'Combo system with Fever mode (10+ combos)'}</li>
                </ul>
              </div>
            </motion.div>
          </section>

          {/* === GAME MODES === */}
          <section id="wiki-modes" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? 'ゲームモード' : 'Game Modes'}</h2>
            <div className={styles.modeGrid}>
              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>VANILLA</span>
                </div>
                <h3 className={styles.modeTitle}>{ja ? 'シングルプレイヤー' : 'Single Player'}</h3>
                <p className={styles.modeDesc}>
                  {ja
                    ? 'ソロでプレイ。5つのワールドを踏破し、ビートに乗ってスコアを伸ばそう。地形破壊、アイテムドロップ、クラフトシステムを活用して、より高いステージを目指せ。'
                    : 'Play solo through 5 musically-themed worlds. Clear terrain, collect item drops, and craft weapons to push further. Each world increases the BPM, demanding faster reflexes and tighter rhythm.'}
                </p>
                <div className={styles.modeFeatures}>
                  <span>{ja ? '地形破壊' : 'Terrain Destruction'}</span>
                  <span>{ja ? 'アイテムドロップ' : 'Item Drops'}</span>
                  <span>{ja ? 'クラフト' : 'Crafting'}</span>
                  <span>{ja ? 'ワールド進行' : 'World Progression'}</span>
                </div>
              </div>

              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>1v1</span>
                </div>
                <h3 className={styles.modeTitle}>{ja ? 'バトルアリーナ' : 'Battle Arena'}</h3>
                <p className={styles.modeDesc}>
                  {ja
                    ? 'リアルタイム1v1対戦。ライン消去で相手にお邪魔ラインを送り込む。ランク戦対応で、勝利するとポイントを獲得し、ティアが昇格。8秒以内にマッチングしない場合はAI対戦にフォールバック。'
                    : 'Real-time 1v1 battles via WebSocket. Send garbage lines to your opponent by clearing lines. Supports ranked matchmaking with tier progression. If no opponent is found within 8 seconds, an AI rival fills in.'}
                </p>
                <div className={styles.modeFeatures}>
                  <span>WebSocket</span>
                  <span>{ja ? 'ランク戦' : 'Ranked'}</span>
                  <span>{ja ? 'AI対戦' : 'AI Fallback'}</span>
                </div>
                <div className={styles.modeNote}>
                  {ja ? '3つの進捗を解放するとアンロック' : 'Unlocked after earning 3 advancements'}
                </div>
              </div>

              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>9P</span>
                </div>
                <h3 className={styles.modeTitle}>{ja ? '9人アリーナ' : '9-Player Arena'}</h3>
                <p className={styles.modeDesc}>
                  {ja
                    ? '最大9人のプレイヤーがリズム同期バトルで激突。共有テンポ、ランダムギミック、カオスシステムにより、毎回異なる展開に。テンポ崩壊やカオス暴走など、複数の勝利条件が存在。'
                    : 'Up to 9 players compete in a shared-tempo rhythm battle. Random gimmicks, rising chaos levels, and tempo collapses create unique matches every time. Multiple victory conditions: last one standing, tempo collapse, or chaos overload.'}
                </p>
                <div className={styles.modeFeatures}>
                  <span>{ja ? '9人対戦' : '9 Players'}</span>
                  <span>{ja ? 'リズム同期' : 'Rhythm Sync'}</span>
                  <span>{ja ? 'ギミック' : 'Gimmicks'}</span>
                  <span>{ja ? 'カオス' : 'Chaos'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* === WORLDS === */}
          <section id="wiki-worlds" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? 'ワールド' : 'Worlds'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? 'RHYTHMIAには5つのワールドが存在し、各ワールドには固有のBPMとカラーテーマがあります。ワールドはステージクリアごとに進行し、4ステージごとに次のワールドへ移行します。BPMが上がるにつれて難易度が上昇します。'
                : 'RHYTHMIA features 5 distinct worlds, each with a unique BPM and color theme. Worlds progress as you clear stages, advancing to the next world every 4 stages. Higher BPM demands faster play.'}
            </p>
            <div className={styles.worldList}>
              {WORLDS_DATA.map((w, i) => (
                <div key={w.name} className={styles.worldCard} style={{ '--world-color': w.color } as React.CSSProperties}>
                  <div className={styles.worldIndex}>{String(i + 1).padStart(2, '0')}</div>
                  <div className={styles.worldInfo}>
                    <div className={styles.worldName}>{ja ? w.nameJa : w.name}</div>
                    <div className={styles.worldBpm}>{w.bpm} BPM</div>
                  </div>
                  <div className={styles.worldBar}>
                    <div className={styles.worldBarFill} style={{ width: `${((w.bpm - 80) / 100) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? 'ワールド進行' : 'World Progression'}</div>
              <ul className={styles.infoList}>
                <li>{ja ? '各ワールドは4ステージで構成' : '4 stages per world before advancing'}</li>
                <li>{ja ? 'ライン消去で地形を破壊してステージクリア' : 'Clear terrain by clearing lines to complete a stage'}</li>
                <li>{ja ? '1ライン消去あたり4ブロックの地形ダメージ' : '4 terrain blocks destroyed per line clear'}</li>
                <li>{ja ? 'ビート倍率でダメージが増加' : 'Beat multiplier increases terrain damage'}</li>
              </ul>
            </div>
          </section>

          {/* === CONTROLS === */}
          <section id="wiki-controls" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? '操作方法' : 'Controls'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? 'キーバインドはゲーム内設定から変更可能です。DAS（Delayed Auto Shift）、ARR（Auto Repeat Rate）、SDF（Soft Drop Factor）のデフォルト値は以下の通りです。'
                : 'Key bindings can be customized in-game. Default DAS (Delayed Auto Shift), ARR (Auto Repeat Rate), and SDF (Soft Drop Factor) values are listed below.'}
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ja ? 'アクション' : 'Action'}</th>
                    <th>{ja ? 'デフォルトキー' : 'Default Key'}</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTROLS_DATA.map((c) => (
                    <tr key={c.action}>
                      <td>{ja ? c.actionJa : c.action}</td>
                      <td><code className={styles.keyCode}>{c.key}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? 'タイミング設定' : 'Timing Settings'}</div>
              <div className={styles.timingGrid}>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>DAS</div>
                  <div className={styles.timingValue}>167ms</div>
                  <div className={styles.timingDesc}>{ja ? '自動移動開始遅延' : 'Initial repeat delay'}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>ARR</div>
                  <div className={styles.timingValue}>33ms</div>
                  <div className={styles.timingDesc}>{ja ? '自動移動間隔' : 'Auto-repeat interval'}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>SDF</div>
                  <div className={styles.timingValue}>50ms</div>
                  <div className={styles.timingDesc}>{ja ? 'ソフトドロップ速度' : 'Soft drop speed'}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>{ja ? 'ロック遅延' : 'Lock Delay'}</div>
                  <div className={styles.timingValue}>500ms</div>
                  <div className={styles.timingDesc}>{ja ? '設置までの猶予' : 'Grace period before lock'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* === RANKED === */}
          <section id="wiki-ranked" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? 'ランク戦' : 'Ranked System'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? 'ランク戦はフォートナイトのアリーナ制を参考にしたポイント制システムです。試合に参加するとバスフェア（参加費）が差し引かれ、勝利すると勝利報酬を獲得します。連勝するとボーナスポイントが加算されます。'
                : 'The ranked system uses an Arena-style point system. Each match costs a bus fare (entry fee), and winning awards bonus points. Consecutive wins grant streak bonuses. Points cannot drop below 0.'}
            </p>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ja ? 'ティア' : 'Tier'}</th>
                    <th>{ja ? 'ポイント' : 'Points'}</th>
                    <th>{ja ? 'バスフェア' : 'Bus Fare'}</th>
                    <th>{ja ? '勝利報酬' : 'Win Reward'}</th>
                  </tr>
                </thead>
                <tbody>
                  {RANK_TIERS_DATA.map((t) => (
                    <tr key={t.name}>
                      <td>
                        <span className={styles.tierName} style={{ color: t.color }}>
                          {ja ? t.nameJa : t.name}
                        </span>
                      </td>
                      <td>{t.points}</td>
                      <td>{t.busFare > 0 ? `-${t.busFare}` : '0'}</td>
                      <td className={styles.positive}>+{t.winReward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? '連勝ボーナス' : 'Win Streak Bonus'}</div>
              <p className={styles.infoText}>
                {ja
                  ? '連勝するとボーナスポイントが付与されます。ストリーク数に応じたボーナス: 2連勝=+5, 3連勝=+10, 4連勝=+15, 5連勝=+20, 6連勝以上=+25'
                  : 'Consecutive wins award bonus points: 2 wins = +5, 3 wins = +10, 4 wins = +15, 5 wins = +20, 6+ wins = +25'}
              </p>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? 'マッチメイキング' : 'Matchmaking'}</div>
              <ul className={styles.infoList}>
                <li>{ja ? 'ポイント差500以内のプレイヤーとマッチ' : 'Matches players within 500 points of each other'}</li>
                <li>{ja ? 'タイムアウト: 8秒' : 'Timeout: 8 seconds'}</li>
                <li>{ja ? 'タイムアウト後はAI対戦にフォールバック' : 'Falls back to AI opponent on timeout'}</li>
              </ul>
            </div>
          </section>

          {/* === ADVANCEMENTS === */}
          <section id="wiki-advancements" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? '進捗（アドバンスメント）' : 'Advancements'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? 'RHYTHMIAには45以上の進捗（実績）が存在します。プレイ中に条件を満たすと自動的にアンロックされ、トースト通知で表示されます。進捗はローカルストレージとFirestoreの両方に保存されます。バトルアリーナは3つの進捗をアンロックすると解放されます。'
                : 'RHYTHMIA has 45+ advancements (achievements) that unlock automatically as you play. Progress is saved to both local storage and Firestore. Toast notifications appear on unlock. The Battle Arena requires 3 advancements to unlock.'}
            </p>
            {ADVANCEMENT_CATEGORIES.map((cat) => (
              <div key={cat.category} className={styles.advCategory}>
                <h3 className={styles.advCategoryTitle}>{ja ? cat.categoryJa : cat.category}</h3>
                <div className={styles.advList}>
                  {cat.items.map((adv) => (
                    <div key={adv.name} className={styles.advItem}>
                      <div className={styles.advName}>{ja ? adv.nameJa : adv.name}</div>
                      <div className={styles.advDesc}>{ja ? adv.descJa : adv.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? 'その他のカテゴリ' : 'Additional Categories'}</div>
              <ul className={styles.infoList}>
                <li>{ja ? 'コンボ: 3, 10, 20コンボ達成' : 'Combo: Reach 3, 10, 20 combos'}</li>
                <li>{ja ? 'テトリス: 4ライン同時消去 (1, 10, 50回)' : 'Tetris: Clear 4 lines at once (1, 10, 50 times)'}</li>
                <li>{ja ? 'パーフェクトビート: 1ゲーム中10, 50回' : 'Perfect Beats: 10, 50 per game'}</li>
                <li>{ja ? 'ハードドロップ: 100, 1,000回' : 'Hard Drops: 100, 1,000 total'}</li>
                <li>{ja ? 'ピース設置: 100, 1,000, 10,000個' : 'Pieces Placed: 100, 1,000, 10,000 total'}</li>
                <li>{ja ? 'ゲームプレイ: 1, 10, 50, 100ゲーム' : 'Games Played: 1, 10, 50, 100'}</li>
                <li>{ja ? 'ワールド: 5つクリア' : 'World Traveler: Clear 5 worlds'}</li>
              </ul>
            </div>
          </section>

          {/* === ITEMS & CRAFTING === */}
          <section id="wiki-crafting" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? 'アイテム & クラフト' : 'Items & Crafting'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? '地形破壊時にアイテムがドロップします。収集したアイテムを使って武器をクラフトし、地形ダメージを強化できます。レアリティが高いアイテムほどドロップ率が低くなります。'
                : 'Items drop when destroying terrain. Collect materials and craft weapons to increase terrain damage. Higher rarity items have lower drop rates.'}
            </p>

            <h3 className={styles.subTitle}>{ja ? '素材' : 'Materials'}</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ja ? '素材' : 'Material'}</th>
                    <th>{ja ? 'レアリティ' : 'Rarity'}</th>
                    <th>{ja ? 'ドロップ率' : 'Drop Rate'}</th>
                  </tr>
                </thead>
                <tbody>
                  {ITEMS_DATA.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span style={{ color: item.color }}>{ja ? item.nameJa : item.name}</span>
                      </td>
                      <td>{ja ? item.rarityJa : item.rarity}</td>
                      <td>{item.drop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className={styles.subTitle}>{ja ? '武器' : 'Weapons'}</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{ja ? '武器' : 'Weapon'}</th>
                    <th>{ja ? 'ダメージ' : 'Damage'}</th>
                    <th>{ja ? '特殊効果' : 'Special'}</th>
                    <th>{ja ? 'レシピ' : 'Recipe'}</th>
                  </tr>
                </thead>
                <tbody>
                  {WEAPONS_DATA.map((w) => (
                    <tr key={w.name}>
                      <td><span style={{ color: w.color }}>{ja ? w.nameJa : w.name}</span></td>
                      <td>{w.damage}</td>
                      <td>{ja ? (w.specialJa || '—') : (w.special || '—')}</td>
                      <td className={styles.recipeCell}>{ja ? w.recipeJa : w.recipe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* === TOWER DEFENSE === */}
          <section id="wiki-tower-defense" className={styles.section}>
            <h2 className={styles.sectionTitle}>{ja ? 'タワーディフェンス' : 'Tower Defense'}</h2>
            <p className={styles.paragraph}>
              {ja
                ? 'Vanillaモードにはタワーディフェンス要素が組み込まれています。グリッドの中央にタワーが設置され、ビートに同期して四方から敵が出現します。ライン消去で敵を倒し、タレットは自動的に敵を攻撃します。敵がタワーに到達するとダメージを受けます。'
                : 'The Vanilla mode includes tower defense mechanics. A tower sits at the center of a discrete grid. Enemies spawn from the perimeter in sync with the beat and advance toward the tower. Line clears eliminate enemies, and turrets automatically fire projectiles at incoming threats.'}
            </p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>100</div>
                <div className={styles.statCardLabel}>{ja ? 'タワーHP' : 'Tower HP'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>15</div>
                <div className={styles.statCardLabel}>{ja ? '敵到達ダメージ' : 'Enemy Reach DMG'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>3</div>
                <div className={styles.statCardLabel}>{ja ? '敵HP' : 'Enemy HP'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>2</div>
                <div className={styles.statCardLabel}>{ja ? 'ライン消去キル' : 'Kills per Line'}</div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{ja ? 'グリッドシステム' : 'Grid System'}</div>
              <ul className={styles.infoList}>
                <li>{ja ? '離散グリッド上を敵が1ターンに1タイル移動（直行移動のみ）' : 'Enemies move 1 tile per turn on a discrete grid (orthogonal only)'}</li>
                <li>{ja ? 'グリッド範囲: 中心から±18タイル' : 'Grid extends 18 tiles from center in each direction'}</li>
                <li>{ja ? '敵はマンハッタン距離18のリングからスポーン' : 'Enemies spawn on the Manhattan distance 18 perimeter'}</li>
                <li>{ja ? 'タレット射撃間隔: 1,000ms、弾速: 18単位/秒' : 'Turret fires every 1,000ms, bullet speed: 18 units/sec'}</li>
                <li>{ja ? '弾丸は放物線軌道（重力加速度: 40単位/秒²）' : 'Bullets follow parabolic arcs (gravity: 40 units/sec\u00B2)'}</li>
              </ul>
            </div>
          </section>

          <footer className={styles.wikiFooter}>
            RHYTHMIA Wiki &mdash; v0.0.2 beta
          </footer>
        </main>
      </div>
    </div>
  );
}
