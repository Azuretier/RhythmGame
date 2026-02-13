'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import styles from './WikiPage.module.css';

type WikiSection =
  | 'game-overview'
  | 'overview'
  | 'modes'
  | 'worlds'
  | 'controls'
  | 'ranked'
  | 'advancements'
  | 'crafting'
  | 'tower-defense'
  | 'community-resources'
  | 'updates';

const SECTION_IDS: WikiSection[] = [
  'game-overview',
  'overview',
  'modes',
  'worlds',
  'controls',
  'ranked',
  'advancements',
  'crafting',
  'tower-defense',
  'community-resources',
  'updates',
];

// 2-tier sidebar structure: L1 = parent headers, L2 = child items
interface SidebarItem {
  id: WikiSection;
  labelKey: string;
  level: 1 | 2;
  icon?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'game-overview', labelKey: 'sectionGameOverview', level: 1 },
  { id: 'overview', labelKey: 'sectionOverview', level: 2, icon: 'I' },
  { id: 'modes', labelKey: 'sectionModes', level: 2, icon: 'II' },
  { id: 'worlds', labelKey: 'sectionWorlds', level: 2, icon: 'III' },
  { id: 'controls', labelKey: 'sectionControls', level: 2, icon: 'IV' },
  { id: 'ranked', labelKey: 'sectionRanked', level: 2, icon: 'V' },
  { id: 'advancements', labelKey: 'sectionAdvancements', level: 2, icon: 'VI' },
  { id: 'crafting', labelKey: 'sectionCrafting', level: 2, icon: 'VII' },
  { id: 'tower-defense', labelKey: 'sectionTowerDefense', level: 2, icon: 'VIII' },
  { id: 'community-resources', labelKey: 'sectionCommunityResources', level: 1 },
  { id: 'updates', labelKey: 'sectionUpdates', level: 1 },
];

const WORLDS_DATA = [
  { nameKey: 'melodia', bpm: 100, color: '#FF6B9D' },
  { nameKey: 'harmonia', bpm: 110, color: '#4ECDC4' },
  { nameKey: 'crescenda', bpm: 120, color: '#FFE66D' },
  { nameKey: 'fortissimo', bpm: 140, color: '#FF6B6B' },
  { nameKey: 'silenceChamber', bpm: 160, color: '#A29BFE' },
] as const;

const RANK_TIERS_DATA = [
  { nameKey: 'openI', points: '0 - 499', busFare: 0, winReward: 40, color: '#8B8B8B' },
  { nameKey: 'openII', points: '500 - 999', busFare: 10, winReward: 45, color: '#A0A0A0' },
  { nameKey: 'openIII', points: '1,000 - 1,499', busFare: 15, winReward: 50, color: '#C0C0C0' },
  { nameKey: 'contenderI', points: '1,500 - 2,499', busFare: 20, winReward: 55, color: '#4ECDC4' },
  { nameKey: 'contenderII', points: '2,500 - 3,499', busFare: 25, winReward: 60, color: '#3DA69B' },
  { nameKey: 'contenderIII', points: '3,500 - 4,999', busFare: 30, winReward: 65, color: '#2D847D' },
  { nameKey: 'championI', points: '5,000 - 7,499', busFare: 40, winReward: 75, color: '#FFD700' },
  { nameKey: 'championII', points: '7,500 - 9,999', busFare: 50, winReward: 85, color: '#FFA500' },
  { nameKey: 'championIII', points: '10,000+', busFare: 60, winReward: 100, color: '#FF4500' },
] as const;

const ITEMS_DATA = [
  { nameKey: 'stoneFragment', rarityKey: 'common', drop: '40%', color: '#8B8B8B' },
  { nameKey: 'ironOre', rarityKey: 'common', drop: '30%', color: '#B87333' },
  { nameKey: 'crystalShard', rarityKey: 'uncommon', drop: '15%', color: '#4FC3F7' },
  { nameKey: 'goldNugget', rarityKey: 'rare', drop: '8%', color: '#FFD700' },
  { nameKey: 'obsidianCore', rarityKey: 'epic', drop: '5%', color: '#9C27B0' },
  { nameKey: 'starFragment', rarityKey: 'legendary', drop: '2%', color: '#E0E0E0' },
] as const;

const WEAPONS_DATA = [
  { nameKey: 'stoneBlade', damage: '+10%', specialKey: '', recipeKey: 'stoneBladeRecipe', color: '#9E9E9E' },
  { nameKey: 'ironPickaxe', damage: '+20%', specialKey: '', recipeKey: 'ironPickaxeRecipe', color: '#B87333' },
  { nameKey: 'crystalWand', damage: '+30%', specialKey: 'wideBeat', recipeKey: 'crystalWandRecipe', color: '#4FC3F7' },
  { nameKey: 'goldHammer', damage: '+40%', specialKey: '', recipeKey: 'goldHammerRecipe', color: '#FFD700' },
  { nameKey: 'obsidianEdge', damage: '+60%', specialKey: 'shatter', recipeKey: 'obsidianEdgeRecipe', color: '#9C27B0' },
  { nameKey: 'starCannon', damage: '+80%', specialKey: 'burst', recipeKey: 'starCannonRecipe', color: '#E0E0E0' },
] as const;

const CONTROLS_DATA = [
  { actionKey: 'moveLeft', key: 'Arrow Left / A' },
  { actionKey: 'moveRight', key: 'Arrow Right / D' },
  { actionKey: 'softDrop', key: 'Arrow Down / S' },
  { actionKey: 'hardDrop', key: 'Space' },
  { actionKey: 'rotateCW', key: 'Arrow Up / W / X' },
  { actionKey: 'rotateCCW', key: 'Z' },
  { actionKey: 'hold', key: 'C / Shift' },
  { actionKey: 'inventoryKey', key: 'E' },
  { actionKey: 'shopKey', key: 'L' },
  { actionKey: 'forgeKey', key: 'F' },
] as const;

const ADVANCEMENT_CATEGORIES = [
  {
    categoryKey: 'catLines',
    items: [
      { nameKey: 'lineBeginner', descKey: 'lineBeginnerDesc' },
      { nameKey: 'lineApprentice', descKey: 'lineApprenticeDesc' },
      { nameKey: 'lineExpert', descKey: 'lineExpertDesc' },
      { nameKey: 'lineMaster', descKey: 'lineMasterDesc' },
      { nameKey: 'lineLegend', descKey: 'lineLegendDesc' },
    ],
  },
  {
    categoryKey: 'catScore',
    items: [
      { nameKey: 'scoreRookie', descKey: 'scoreRookieDesc' },
      { nameKey: 'scoreHunter', descKey: 'scoreHunterDesc' },
      { nameKey: 'scoreMaster', descKey: 'scoreMasterDesc' },
      { nameKey: 'scoreLegend', descKey: 'scoreLegendDesc' },
    ],
  },
  {
    categoryKey: 'catTSpin',
    items: [
      { nameKey: 'firstTwist', descKey: 'firstTwistDesc' },
      { nameKey: 'spinDoctor', descKey: 'spinDoctorDesc' },
      { nameKey: 'tSpinExpert', descKey: 'tSpinExpertDesc' },
      { nameKey: 'tSpinLegend', descKey: 'tSpinLegendDesc' },
    ],
  },
  {
    categoryKey: 'catMultiplayer',
    items: [
      { nameKey: 'firstVictory', descKey: 'firstVictoryDesc' },
      { nameKey: 'arenaFighter', descKey: 'arenaFighterDesc' },
      { nameKey: 'arenaChampion', descKey: 'arenaChampionDesc' },
      { nameKey: 'hotStreak', descKey: 'hotStreakDesc' },
      { nameKey: 'unbreakable', descKey: 'unbreakableDesc' },
    ],
  },
] as const;

// --- Community Resources: Video gallery data ---
// To add a new video, append an object to this array.
const COMMUNITY_VIDEOS = [
  {
    id: 'vid-tspin-tutorial',
    title: 'T-Spin Tutorial - From Zero to Hero',
    category: 'tutorial',
    embedId: 'aa573goA1WA',
    accent: '#f87171',
  },
  {
    id: 'vid-beginner',
    title: 'RHYTHMIA Beginner Guide',
    category: 'guide',
    embedId: '',
    accent: '#60a5fa',
  },
  {
    id: 'vid-ranked-guide',
    title: 'How to Climb Ranked',
    category: 'competitive',
    embedId: '',
    accent: '#a78bfa',
  },
  {
    id: 'vid-advanced-combos',
    title: 'Advanced Combo Techniques',
    category: 'tutorial',
    embedId: '',
    accent: '#f87171',
  },
  {
    id: 'vid-music-showcase',
    title: 'RHYTHMIA OST Preview',
    category: 'music',
    embedId: '',
    accent: '#34d399',
  },
  {
    id: 'vid-multiplayer-tips',
    title: '1v1 Battle Tips & Tricks',
    category: 'competitive',
    embedId: '',
    accent: '#a78bfa',
  },
] as const;

// --- Updates: Version video slider data ---
// To add a new version video, prepend an object to this array.
// The slider is fully modular — no layout changes needed.
const UPDATE_VIDEOS = [
  {
    version: 'v0.0.2',
    title: 'azuretier.net v0.0.2 Update Overview',
    embedId: 'bcwz2j6N_kA',
    date: '2025-05',
  },
  {
    version: 'v0.0.1',
    title: 'azuretier.net v0.0.1 Launch Trailer',
    embedId: '',
    date: '2025-03',
  },
] as const;

export default function WikiPage() {
  const t = useTranslations('wiki');
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<WikiSection>('game-overview');
  const contentRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);
  const clickScrollTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToSection = (id: WikiSection) => {
    setActiveSection(id);

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

    clickScrollTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  const handleScroll = useCallback(() => {
    if (isClickScrolling.current) return;

    const container = contentRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    if (isAtBottom) {
      for (const s of [...SECTION_IDS].reverse()) {
        const el = document.getElementById(`wiki-${s}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < containerRect.bottom) {
            setActiveSection(s);
            return;
          }
        }
      }
    }

    for (const s of [...SECTION_IDS].reverse()) {
      const el = document.getElementById(`wiki-${s}`);
      if (el) {
        const relativeTop = el.getBoundingClientRect().top - containerRect.top;
        if (relativeTop < 100) {
          setActiveSection(s);
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
            {t('backToLobby')}
          </button>
          <span className={styles.logo}>azuretier.net</span>
          <span className={styles.wikiLabel}>WIKI</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navLink} onClick={() => router.push('/updates')}>
            {t('updatesLink')}
          </button>
          <LocaleSwitcher />
        </div>
      </header>

      <div className={styles.layout}>
        {/* 2-tier sidebar navigation */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            {t('contents')}
          </div>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`
                ${item.level === 1 ? styles.sidebarL1 : styles.sidebarItem}
                ${activeSection === item.id ? styles.sidebarActive : ''}
              `}
              onClick={() => scrollToSection(item.id)}
            >
              {item.icon && <span className={styles.sidebarNum}>{item.icon}</span>}
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main ref={contentRef} className={styles.content} onScroll={handleScroll}>

          {/* ================================================================ */}
          {/*  L1: GAME OVERVIEW                                               */}
          {/* ================================================================ */}
          <div id="wiki-game-overview" className={styles.l1Section}>
            <h1 className={styles.l1Title}>{t('gameOverviewTitle')}</h1>
          </div>

          {/* === OVERVIEW === */}
          <section id="wiki-overview" className={styles.section}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className={styles.sectionTitle}>
                {t('overviewTitle')}
              </h2>
              <p className={styles.paragraph}>
                {t('overviewDesc')}
              </p>
              <div className={styles.featureGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>10x20</div>
                  <div className={styles.featureLabel}>{t('boardSize')}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>7</div>
                  <div className={styles.featureLabel}>{t('tetrominoes')}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>5</div>
                  <div className={styles.featureLabel}>{t('worldsLabel')}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>SRS</div>
                  <div className={styles.featureLabel}>{t('rotationSystem')}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>45+</div>
                  <div className={styles.featureLabel}>{t('advancementsLabel')}</div>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>9</div>
                  <div className={styles.featureLabel}>{t('rankTiersLabel')}</div>
                </div>
              </div>
              <div className={styles.infoBox}>
                <div className={styles.infoBoxTitle}>{t('coreMechanics')}</div>
                <ul className={styles.infoList}>
                  <li>{t('mechanic1')}</li>
                  <li>{t('mechanic2')}</li>
                  <li>{t('mechanic3')}</li>
                  <li>{t('mechanic4')}</li>
                  <li>{t('mechanic5')}</li>
                </ul>
              </div>
            </motion.div>
          </section>

          {/* === GAME MODES === */}
          <section id="wiki-modes" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('modesTitle')}</h2>
            <div className={styles.modeGrid}>
              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>VANILLA</span>
                </div>
                <h3 className={styles.modeTitle}>{t('vanillaTitle')}</h3>
                <p className={styles.modeDesc}>{t('vanillaDesc')}</p>
                <div className={styles.modeFeatures}>
                  <span>{t('terrainDestruction')}</span>
                  <span>{t('itemDrops')}</span>
                  <span>{t('craftingFeat')}</span>
                  <span>{t('worldProgression')}</span>
                </div>
              </div>

              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>1v1</span>
                </div>
                <h3 className={styles.modeTitle}>{t('battleTitle')}</h3>
                <p className={styles.modeDesc}>{t('battleDesc')}</p>
                <div className={styles.modeFeatures}>
                  <span>WebSocket</span>
                  <span>{t('rankedFeat')}</span>
                  <span>{t('aiFallback')}</span>
                </div>
                <div className={styles.modeNote}>{t('battleNote')}</div>
              </div>

              <div className={styles.modeCard}>
                <div className={styles.modeHeader}>
                  <span className={styles.modeBadge}>9P</span>
                </div>
                <h3 className={styles.modeTitle}>{t('arenaTitle')}</h3>
                <p className={styles.modeDesc}>{t('arenaDesc')}</p>
                <div className={styles.modeFeatures}>
                  <span>{t('ninePlayers')}</span>
                  <span>{t('rhythmSync')}</span>
                  <span>{t('gimmicks')}</span>
                  <span>{t('chaosLabel')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* === WORLDS === */}
          <section id="wiki-worlds" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('worldsSectionTitle')}</h2>
            <p className={styles.paragraph}>{t('worldsDesc')}</p>
            <div className={styles.worldList}>
              {WORLDS_DATA.map((w, i) => (
                <div key={w.nameKey} className={styles.worldCard} style={{ '--world-color': w.color } as React.CSSProperties}>
                  <div className={styles.worldIndex}>{String(i + 1).padStart(2, '0')}</div>
                  <div className={styles.worldInfo}>
                    <div className={styles.worldName}>{t(w.nameKey)}</div>
                    <div className={styles.worldBpm}>{w.bpm} BPM</div>
                  </div>
                  <div className={styles.worldBar}>
                    <div className={styles.worldBarFill} style={{ width: `${((w.bpm - 80) / 100) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('worldProgressionTitle')}</div>
              <ul className={styles.infoList}>
                <li>{t('worldProg1')}</li>
                <li>{t('worldProg2')}</li>
                <li>{t('worldProg3')}</li>
                <li>{t('worldProg4')}</li>
              </ul>
            </div>
          </section>

          {/* === CONTROLS === */}
          <section id="wiki-controls" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('controlsTitle')}</h2>
            <p className={styles.paragraph}>{t('controlsDesc')}</p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('actionHeader')}</th>
                    <th>{t('defaultKey')}</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTROLS_DATA.map((c) => (
                    <tr key={c.actionKey}>
                      <td>{t(c.actionKey)}</td>
                      <td><code className={styles.keyCode}>{c.key}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('timingSettings')}</div>
              <div className={styles.timingGrid}>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>DAS</div>
                  <div className={styles.timingValue}>167ms</div>
                  <div className={styles.timingDesc}>{t('dasDesc')}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>ARR</div>
                  <div className={styles.timingValue}>33ms</div>
                  <div className={styles.timingDesc}>{t('arrDesc')}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>SDF</div>
                  <div className={styles.timingValue}>50ms</div>
                  <div className={styles.timingDesc}>{t('sdfDesc')}</div>
                </div>
                <div className={styles.timingItem}>
                  <div className={styles.timingLabel}>{t('lockDelay')}</div>
                  <div className={styles.timingValue}>500ms</div>
                  <div className={styles.timingDesc}>{t('lockDelayDesc')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* === RANKED === */}
          <section id="wiki-ranked" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('rankedTitle')}</h2>
            <p className={styles.paragraph}>{t('rankedDesc')}</p>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('tierHeader')}</th>
                    <th>{t('pointsHeader')}</th>
                    <th>{t('busFareHeader')}</th>
                    <th>{t('winRewardHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {RANK_TIERS_DATA.map((tier) => (
                    <tr key={tier.nameKey}>
                      <td>
                        <span className={styles.tierName} style={{ color: tier.color }}>
                          {t(tier.nameKey)}
                        </span>
                      </td>
                      <td>{tier.points}</td>
                      <td>{tier.busFare > 0 ? `-${tier.busFare}` : '0'}</td>
                      <td className={styles.positive}>+{tier.winReward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('streakTitle')}</div>
              <p className={styles.infoText}>{t('streakDesc')}</p>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('matchmakingTitle')}</div>
              <ul className={styles.infoList}>
                <li>{t('matchmaking1')}</li>
                <li>{t('matchmaking2')}</li>
                <li>{t('matchmaking3')}</li>
              </ul>
            </div>
          </section>

          {/* === ADVANCEMENTS === */}
          <section id="wiki-advancements" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('advancementsTitle')}</h2>
            <p className={styles.paragraph}>{t('advancementsDesc')}</p>
            {ADVANCEMENT_CATEGORIES.map((cat) => (
              <div key={cat.categoryKey} className={styles.advCategory}>
                <h3 className={styles.advCategoryTitle}>{t(cat.categoryKey)}</h3>
                <div className={styles.advList}>
                  {cat.items.map((adv) => (
                    <div key={adv.nameKey} className={styles.advItem}>
                      <div className={styles.advName}>{t(adv.nameKey)}</div>
                      <div className={styles.advDesc}>{t(adv.descKey)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('additionalCatTitle')}</div>
              <ul className={styles.infoList}>
                <li>{t('additionalCat1')}</li>
                <li>{t('additionalCat2')}</li>
                <li>{t('additionalCat3')}</li>
                <li>{t('additionalCat4')}</li>
                <li>{t('additionalCat5')}</li>
                <li>{t('additionalCat6')}</li>
                <li>{t('additionalCat7')}</li>
              </ul>
            </div>
          </section>

          {/* === ITEMS & CRAFTING === */}
          <section id="wiki-crafting" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('craftingTitle')}</h2>
            <p className={styles.paragraph}>{t('craftingDesc')}</p>

            <h3 className={styles.subTitle}>{t('materialsTitle')}</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('materialHeader')}</th>
                    <th>{t('rarityHeader')}</th>
                    <th>{t('dropRateHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ITEMS_DATA.map((item) => (
                    <tr key={item.nameKey}>
                      <td>
                        <span style={{ color: item.color }}>{t(item.nameKey)}</span>
                      </td>
                      <td>{t(item.rarityKey)}</td>
                      <td>{item.drop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className={styles.subTitle}>{t('weaponsTitle')}</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('weaponHeader')}</th>
                    <th>{t('damageHeader')}</th>
                    <th>{t('specialHeader')}</th>
                    <th>{t('recipeHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {WEAPONS_DATA.map((w) => (
                    <tr key={w.nameKey}>
                      <td><span style={{ color: w.color }}>{t(w.nameKey)}</span></td>
                      <td>{w.damage}</td>
                      <td>{w.specialKey ? t(w.specialKey) : '—'}</td>
                      <td className={styles.recipeCell}>{t(w.recipeKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* === TOWER DEFENSE === */}
          <section id="wiki-tower-defense" className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('towerDefenseTitle')}</h2>
            <p className={styles.paragraph}>{t('towerDefenseDesc')}</p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>100</div>
                <div className={styles.statCardLabel}>{t('towerHP')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>15</div>
                <div className={styles.statCardLabel}>{t('enemyReachDMG')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>3</div>
                <div className={styles.statCardLabel}>{t('enemyHP')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statCardValue}>2</div>
                <div className={styles.statCardLabel}>{t('killsPerLine')}</div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>{t('gridSystem')}</div>
              <ul className={styles.infoList}>
                <li>{t('grid1')}</li>
                <li>{t('grid2')}</li>
                <li>{t('grid3')}</li>
                <li>{t('grid4')}</li>
                <li>{t('grid5')}</li>
              </ul>
            </div>
          </section>

          {/* ================================================================ */}
          {/*  L1: COMMUNITY RESOURCES                                         */}
          {/* ================================================================ */}
          <section id="wiki-community-resources" className={styles.section}>
            <div className={styles.l1Section}>
              <h1 className={styles.l1Title}>{t('communityResourcesTitle')}</h1>
            </div>
            <p className={styles.paragraph}>{t('communityResourcesDesc')}</p>

            <div className={styles.videoGallery}>
              {COMMUNITY_VIDEOS.map((video) => (
                <div
                  key={video.id}
                  className={styles.videoCard}
                  style={{ '--card-accent': video.accent } as React.CSSProperties}
                >
                  <div className={styles.videoCardThumb}>
                    {video.embedId ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.embedId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className={styles.videoCardIframe}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.videoCardPlaceholder}>
                        <span className={styles.videoCardPlayIcon}>&#9654;</span>
                        <span className={styles.videoCardSoon}>{t('videoComingSoon')}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.videoCardBody}>
                    <span className={styles.videoCardCategory}>{video.category}</span>
                    <h3 className={styles.videoCardTitle}>{video.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ================================================================ */}
          {/*  L1: UPDATES — Horizontal scroll video slider                    */}
          {/* ================================================================ */}
          <section id="wiki-updates" className={styles.section}>
            <div className={styles.l1Section}>
              <h1 className={styles.l1Title}>{t('updatesTitle')}</h1>
            </div>
            <p className={styles.paragraph}>{t('updatesDesc')}</p>

            <div className={styles.updatesSlider}>
              <div className={styles.updatesTrack}>
                {UPDATE_VIDEOS.map((vid) => (
                  <div key={vid.version} className={styles.updateSlide}>
                    <div className={styles.updateSlideThumb}>
                      {vid.embedId ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${vid.embedId}`}
                          title={vid.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className={styles.updateSlideIframe}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.updateSlidePlaceholder}>
                          <span className={styles.videoCardPlayIcon}>&#9654;</span>
                          <span className={styles.videoCardSoon}>{t('videoComingSoon')}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.updateSlideInfo}>
                      <span className={styles.updateSlideVersion}>{vid.version}</span>
                      <span className={styles.updateSlideDate}>{vid.date}</span>
                    </div>
                    <h3 className={styles.updateSlideTitle}>{vid.title}</h3>
                  </div>
                ))}
              </div>
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
