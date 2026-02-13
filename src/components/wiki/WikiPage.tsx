'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import styles from './WikiPage.module.css';

// --- Primary pages (left sidebar) ---
type Page = 'game-overview' | 'community-resources' | 'updates';

// --- Sub-sections for "On This Page" (right sidebar) ---
type SubSection =
  | 'overview' | 'modes' | 'worlds' | 'controls'
  | 'ranked' | 'advancements' | 'crafting' | 'tower-defense';

interface NavItem {
  id: Page;
  labelKey: string;
  subsections?: { id: SubSection; labelKey: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'game-overview',
    labelKey: 'sectionGameOverview',
    subsections: [
      { id: 'overview', labelKey: 'sectionOverview' },
      { id: 'modes', labelKey: 'sectionModes' },
      { id: 'worlds', labelKey: 'sectionWorlds' },
      { id: 'controls', labelKey: 'sectionControls' },
      { id: 'ranked', labelKey: 'sectionRanked' },
      { id: 'advancements', labelKey: 'sectionAdvancements' },
      { id: 'crafting', labelKey: 'sectionCrafting' },
      { id: 'tower-defense', labelKey: 'sectionTowerDefense' },
    ],
  },
  { id: 'community-resources', labelKey: 'sectionCommunityResources' },
  { id: 'updates', labelKey: 'sectionUpdates' },
];

const SUB_IDS: SubSection[] = NAV_ITEMS[0].subsections!.map((s) => s.id);

// --- Static data ---
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
  { categoryKey: 'catLines', items: [
    { nameKey: 'lineBeginner', descKey: 'lineBeginnerDesc' }, { nameKey: 'lineApprentice', descKey: 'lineApprenticeDesc' },
    { nameKey: 'lineExpert', descKey: 'lineExpertDesc' }, { nameKey: 'lineMaster', descKey: 'lineMasterDesc' },
    { nameKey: 'lineLegend', descKey: 'lineLegendDesc' },
  ]},
  { categoryKey: 'catScore', items: [
    { nameKey: 'scoreRookie', descKey: 'scoreRookieDesc' }, { nameKey: 'scoreHunter', descKey: 'scoreHunterDesc' },
    { nameKey: 'scoreMaster', descKey: 'scoreMasterDesc' }, { nameKey: 'scoreLegend', descKey: 'scoreLegendDesc' },
  ]},
  { categoryKey: 'catTSpin', items: [
    { nameKey: 'firstTwist', descKey: 'firstTwistDesc' }, { nameKey: 'spinDoctor', descKey: 'spinDoctorDesc' },
    { nameKey: 'tSpinExpert', descKey: 'tSpinExpertDesc' }, { nameKey: 'tSpinLegend', descKey: 'tSpinLegendDesc' },
  ]},
  { categoryKey: 'catMultiplayer', items: [
    { nameKey: 'firstVictory', descKey: 'firstVictoryDesc' }, { nameKey: 'arenaFighter', descKey: 'arenaFighterDesc' },
    { nameKey: 'arenaChampion', descKey: 'arenaChampionDesc' }, { nameKey: 'hotStreak', descKey: 'hotStreakDesc' },
    { nameKey: 'unbreakable', descKey: 'unbreakableDesc' },
  ]},
] as const;

const COMMUNITY_VIDEOS = [
  { id: 'vid-tspin-tutorial', title: 'T-Spin Tutorial - From Zero to Hero', category: 'tutorial', embedId: 'aa573goA1WA', accent: '#f87171' },
  { id: 'vid-beginner', title: 'RHYTHMIA Beginner Guide', category: 'guide', embedId: '', accent: '#60a5fa' },
  { id: 'vid-ranked-guide', title: 'How to Climb Ranked', category: 'competitive', embedId: '', accent: '#a78bfa' },
  { id: 'vid-advanced-combos', title: 'Advanced Combo Techniques', category: 'tutorial', embedId: '', accent: '#f87171' },
  { id: 'vid-music-showcase', title: 'RHYTHMIA OST Preview', category: 'music', embedId: '', accent: '#34d399' },
  { id: 'vid-multiplayer-tips', title: '1v1 Battle Tips & Tricks', category: 'competitive', embedId: '', accent: '#a78bfa' },
] as const;

const UPDATE_VIDEOS = [
  { version: 'v0.0.2', title: 'azuretier.net v0.0.2 Update Overview', embedId: 'bcwz2j6N_kA', date: '2025-05' },
  { version: 'v0.0.1', title: 'azuretier.net v0.0.1 Launch Trailer', embedId: '', date: '2025-03' },
] as const;

export default function WikiPage() {
  const t = useTranslations('wiki');
  const router = useRouter();
  const [activePage, setActivePage] = useState<Page>('game-overview');
  const [activeSub, setActiveSub] = useState<SubSection>('overview');
  const contentRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);
  const clickScrollTimer = useRef<ReturnType<typeof setTimeout>>();

  const switchPage = (page: Page) => {
    setActivePage(page);
    if (page === 'game-overview') setActiveSub('overview');
    contentRef.current?.scrollTo({ top: 0 });
  };

  const scrollToSub = (id: SubSection) => {
    setActiveSub(id);
    isClickScrolling.current = true;
    clearTimeout(clickScrollTimer.current);

    const el = document.getElementById(`wiki-${id}`);
    const container = contentRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      container.scrollTo({ top: elRect.top - containerRect.top + container.scrollTop, behavior: 'smooth' });
    }

    clickScrollTimer.current = setTimeout(() => { isClickScrolling.current = false; }, 800);
  };

  const handleScroll = useCallback(() => {
    if (isClickScrolling.current || activePage !== 'game-overview') return;
    const container = contentRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
      for (const s of [...SUB_IDS].reverse()) {
        const el = document.getElementById(`wiki-${s}`);
        if (el && el.getBoundingClientRect().top < containerRect.bottom) { setActiveSub(s); return; }
      }
    }
    for (const s of [...SUB_IDS].reverse()) {
      const el = document.getElementById(`wiki-${s}`);
      if (el && el.getBoundingClientRect().top - containerRect.top < 100) { setActiveSub(s); return; }
    }
  }, [activePage]);

  const currentNav = NAV_ITEMS.find((n) => n.id === activePage);
  const hasRightToc = !!currentNav?.subsections;

  return (
    <div className={styles.page}>
      {/* ===== Header ===== */}
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

      {/* ===== 3-Column Layout ===== */}
      <div className={styles.layout}>

        {/* LEFT SIDEBAR — main navigation */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>RHYTHMIA</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.sidebarItem} ${activePage === item.id ? styles.sidebarActive : ''}`}
              onClick={() => switchPage(item.id)}
            >
              {t(item.labelKey)}
            </button>
          ))}
          <div className={styles.sidebarDivider} />
          <div className={styles.sidebarFooter}>v0.0.2 beta</div>
        </nav>

        {/* CENTER — scrollable content */}
        <main
          ref={contentRef}
          className={`${styles.content} ${!hasRightToc ? styles.contentWide : ''}`}
          onScroll={handleScroll}
        >
          <AnimatePresence mode="wait">
            {/* ====== GAME OVERVIEW ====== */}
            {activePage === 'game-overview' && (
              <motion.div key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <section id="wiki-overview" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('overviewTitle')}</h2>
                  <p className={styles.paragraph}>{t('overviewDesc')}</p>
                  <div className={styles.featureGrid}>
                    {[
                      { icon: '10x20', label: 'boardSize' }, { icon: '7', label: 'tetrominoes' },
                      { icon: '5', label: 'worldsLabel' }, { icon: 'SRS', label: 'rotationSystem' },
                      { icon: '45+', label: 'advancementsLabel' }, { icon: '9', label: 'rankTiersLabel' },
                    ].map((f) => (
                      <div key={f.label} className={styles.featureCard}>
                        <div className={styles.featureIcon}>{f.icon}</div>
                        <div className={styles.featureLabel}>{t(f.label)}</div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.infoBox}>
                    <div className={styles.infoBoxTitle}>{t('coreMechanics')}</div>
                    <ul className={styles.infoList}>
                      <li>{t('mechanic1')}</li><li>{t('mechanic2')}</li><li>{t('mechanic3')}</li>
                      <li>{t('mechanic4')}</li><li>{t('mechanic5')}</li>
                    </ul>
                  </div>
                </section>

                <section id="wiki-modes" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('modesTitle')}</h2>
                  <div className={styles.modeGrid}>
                    {[
                      { badge: 'VANILLA', title: 'vanillaTitle', desc: 'vanillaDesc', feats: ['terrainDestruction','itemDrops','craftingFeat','worldProgression'] },
                      { badge: '1v1', title: 'battleTitle', desc: 'battleDesc', feats: ['WebSocket','rankedFeat','aiFallback'], note: 'battleNote' },
                      { badge: '9P', title: 'arenaTitle', desc: 'arenaDesc', feats: ['ninePlayers','rhythmSync','gimmicks','chaosLabel'] },
                    ].map((m) => (
                      <div key={m.badge} className={styles.modeCard}>
                        <div className={styles.modeHeader}><span className={styles.modeBadge}>{m.badge}</span></div>
                        <h3 className={styles.modeTitle}>{t(m.title)}</h3>
                        <p className={styles.modeDesc}>{t(m.desc)}</p>
                        <div className={styles.modeFeatures}>
                          {m.feats.map((f) => <span key={f}>{f === 'WebSocket' ? f : t(f)}</span>)}
                        </div>
                        {m.note && <div className={styles.modeNote}>{t(m.note)}</div>}
                      </div>
                    ))}
                  </div>
                </section>

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
                        <div className={styles.worldBar}><div className={styles.worldBarFill} style={{ width: `${((w.bpm - 80) / 100) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.infoBox}>
                    <div className={styles.infoBoxTitle}>{t('worldProgressionTitle')}</div>
                    <ul className={styles.infoList}><li>{t('worldProg1')}</li><li>{t('worldProg2')}</li><li>{t('worldProg3')}</li><li>{t('worldProg4')}</li></ul>
                  </div>
                </section>

                <section id="wiki-controls" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('controlsTitle')}</h2>
                  <p className={styles.paragraph}>{t('controlsDesc')}</p>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead><tr><th>{t('actionHeader')}</th><th>{t('defaultKey')}</th></tr></thead>
                      <tbody>{CONTROLS_DATA.map((c) => <tr key={c.actionKey}><td>{t(c.actionKey)}</td><td><code className={styles.keyCode}>{c.key}</code></td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.infoBox}>
                    <div className={styles.infoBoxTitle}>{t('timingSettings')}</div>
                    <div className={styles.timingGrid}>
                      {[{ l:'DAS',v:'167ms',d:'dasDesc'},{l:'ARR',v:'33ms',d:'arrDesc'},{l:'SDF',v:'50ms',d:'sdfDesc'},{l:'lockDelay',v:'500ms',d:'lockDelayDesc'}].map((x)=>(
                        <div key={x.l} className={styles.timingItem}><div className={styles.timingLabel}>{x.l==='lockDelay'?t(x.l):x.l}</div><div className={styles.timingValue}>{x.v}</div><div className={styles.timingDesc}>{t(x.d)}</div></div>
                      ))}
                    </div>
                  </div>
                </section>

                <section id="wiki-ranked" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('rankedTitle')}</h2>
                  <p className={styles.paragraph}>{t('rankedDesc')}</p>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead><tr><th>{t('tierHeader')}</th><th>{t('pointsHeader')}</th><th>{t('busFareHeader')}</th><th>{t('winRewardHeader')}</th></tr></thead>
                      <tbody>{RANK_TIERS_DATA.map((tier)=><tr key={tier.nameKey}><td><span className={styles.tierName} style={{color:tier.color}}>{t(tier.nameKey)}</span></td><td>{tier.points}</td><td>{tier.busFare>0?`-${tier.busFare}`:'0'}</td><td className={styles.positive}>+{tier.winReward}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.infoBox}><div className={styles.infoBoxTitle}>{t('streakTitle')}</div><p className={styles.infoText}>{t('streakDesc')}</p></div>
                  <div className={styles.infoBox}><div className={styles.infoBoxTitle}>{t('matchmakingTitle')}</div><ul className={styles.infoList}><li>{t('matchmaking1')}</li><li>{t('matchmaking2')}</li><li>{t('matchmaking3')}</li></ul></div>
                </section>

                <section id="wiki-advancements" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('advancementsTitle')}</h2>
                  <p className={styles.paragraph}>{t('advancementsDesc')}</p>
                  {ADVANCEMENT_CATEGORIES.map((cat)=>(
                    <div key={cat.categoryKey} className={styles.advCategory}>
                      <h3 className={styles.advCategoryTitle}>{t(cat.categoryKey)}</h3>
                      <div className={styles.advList}>{cat.items.map((a)=><div key={a.nameKey} className={styles.advItem}><div className={styles.advName}>{t(a.nameKey)}</div><div className={styles.advDesc}>{t(a.descKey)}</div></div>)}</div>
                    </div>
                  ))}
                  <div className={styles.infoBox}><div className={styles.infoBoxTitle}>{t('additionalCatTitle')}</div><ul className={styles.infoList}><li>{t('additionalCat1')}</li><li>{t('additionalCat2')}</li><li>{t('additionalCat3')}</li><li>{t('additionalCat4')}</li><li>{t('additionalCat5')}</li><li>{t('additionalCat6')}</li><li>{t('additionalCat7')}</li></ul></div>
                </section>

                <section id="wiki-crafting" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('craftingTitle')}</h2>
                  <p className={styles.paragraph}>{t('craftingDesc')}</p>
                  <h3 className={styles.subTitle}>{t('materialsTitle')}</h3>
                  <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>{t('materialHeader')}</th><th>{t('rarityHeader')}</th><th>{t('dropRateHeader')}</th></tr></thead><tbody>{ITEMS_DATA.map((i)=><tr key={i.nameKey}><td><span style={{color:i.color}}>{t(i.nameKey)}</span></td><td>{t(i.rarityKey)}</td><td>{i.drop}</td></tr>)}</tbody></table></div>
                  <h3 className={styles.subTitle}>{t('weaponsTitle')}</h3>
                  <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>{t('weaponHeader')}</th><th>{t('damageHeader')}</th><th>{t('specialHeader')}</th><th>{t('recipeHeader')}</th></tr></thead><tbody>{WEAPONS_DATA.map((w)=><tr key={w.nameKey}><td><span style={{color:w.color}}>{t(w.nameKey)}</span></td><td>{w.damage}</td><td>{w.specialKey?t(w.specialKey):'—'}</td><td className={styles.recipeCell}>{t(w.recipeKey)}</td></tr>)}</tbody></table></div>
                </section>

                <section id="wiki-tower-defense" className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('towerDefenseTitle')}</h2>
                  <p className={styles.paragraph}>{t('towerDefenseDesc')}</p>
                  <div className={styles.statsGrid}>
                    {[{v:'100',l:'towerHP'},{v:'15',l:'enemyReachDMG'},{v:'3',l:'enemyHP'},{v:'2',l:'killsPerLine'}].map((s)=><div key={s.l} className={styles.statCard}><div className={styles.statCardValue}>{s.v}</div><div className={styles.statCardLabel}>{t(s.l)}</div></div>)}
                  </div>
                  <div className={styles.infoBox}><div className={styles.infoBoxTitle}>{t('gridSystem')}</div><ul className={styles.infoList}><li>{t('grid1')}</li><li>{t('grid2')}</li><li>{t('grid3')}</li><li>{t('grid4')}</li><li>{t('grid5')}</li></ul></div>
                </section>

                <footer className={styles.wikiFooter}>RHYTHMIA Wiki &mdash; v0.0.2 beta</footer>
              </motion.div>
            )}

            {/* ====== COMMUNITY RESOURCES ====== */}
            {activePage === 'community-resources' && (
              <motion.div key="cr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('communityResourcesTitle')}</h2>
                  <p className={styles.paragraph}>{t('communityResourcesDesc')}</p>
                  <div className={styles.videoGallery}>
                    {COMMUNITY_VIDEOS.map((v) => (
                      <div key={v.id} className={styles.videoCard} style={{ '--card-accent': v.accent } as React.CSSProperties}>
                        <div className={styles.videoCardThumb}>
                          {v.embedId ? <iframe src={`https://www.youtube-nocookie.com/embed/${v.embedId}`} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className={styles.videoCardIframe} loading="lazy" />
                            : <div className={styles.videoCardPlaceholder}><span className={styles.videoCardPlayIcon}>&#9654;</span><span className={styles.videoCardSoon}>{t('videoComingSoon')}</span></div>}
                        </div>
                        <div className={styles.videoCardBody}><span className={styles.videoCardCategory}>{v.category}</span><h3 className={styles.videoCardTitle}>{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {/* ====== UPDATES ====== */}
            {activePage === 'updates' && (
              <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('updatesTitle')}</h2>
                  <p className={styles.paragraph}>{t('updatesDesc')}</p>
                  <div className={styles.updatesSlider}><div className={styles.updatesTrack}>
                    {UPDATE_VIDEOS.map((vid) => (
                      <div key={vid.version} className={styles.updateSlide}>
                        <div className={styles.updateSlideThumb}>
                          {vid.embedId ? <iframe src={`https://www.youtube-nocookie.com/embed/${vid.embedId}`} title={vid.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className={styles.updateSlideIframe} loading="lazy" />
                            : <div className={styles.updateSlidePlaceholder}><span className={styles.videoCardPlayIcon}>&#9654;</span><span className={styles.videoCardSoon}>{t('videoComingSoon')}</span></div>}
                        </div>
                        <div className={styles.updateSlideInfo}><span className={styles.updateSlideVersion}>{vid.version}</span><span className={styles.updateSlideDate}>{vid.date}</span></div>
                        <h3 className={styles.updateSlideTitle}>{vid.title}</h3>
                      </div>
                    ))}
                  </div></div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT SIDEBAR — "On This Page" TOC */}
        {hasRightToc && currentNav?.subsections && (
          <aside className={styles.tocSidebar}>
            <div className={styles.tocHeader}>{t('contents')}</div>
            <div className={styles.tocList}>
              {currentNav.subsections.map((sub) => (
                <button
                  key={sub.id}
                  className={`${styles.tocItem} ${activeSub === sub.id ? styles.tocActive : ''}`}
                  onClick={() => scrollToSub(sub.id)}
                >
                  {t(sub.labelKey)}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
