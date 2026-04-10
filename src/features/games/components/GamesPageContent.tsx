'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Music, Swords, Users, Shield, Pickaxe, Globe, Gamepad2, BookOpen,
} from 'lucide-react';
import { useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { loadAdvancementState } from '@/lib/advancements/storage';
import { BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import styles from './GamesPageContent.module.css';

type GameEntry = {
  id: string;
  icon: typeof Music;
  route: string;
  badge: string;
  players: string;
  requiresAdvancements?: boolean;
  title?: string;
  description?: string;
};

const GAMES: GameEntry[] = [
  { id: 'vanilla', icon: Music, route: '/', badge: 'SOLO', players: '1' },
  { id: 'multiplayer', icon: Swords, route: '/', badge: '1v1', players: '2', requiresAdvancements: true },
  { id: 'arena', icon: Users, route: '/arena', badge: '9P', players: '2-9', requiresAdvancements: true },
  { id: 'tetris99', icon: Users, route: '/tetris-99', badge: '99', players: '99', title: 'TETRIS 99 STYLE', description: 'Battle 98 CPU rivals with badges, targeting modes, and stacked garbage pressure.' },
  { id: 'towerDefense', icon: Shield, route: '/tower-defense', badge: 'TD', players: '1-4' },
  { id: 'minecraftBoard', icon: Pickaxe, route: '/minecraft-board', badge: 'BOARD', players: '2-4' },
  { id: 'minecraftWorld', icon: Globe, route: '/minecraft-world', badge: 'VOXEL', players: '1-8' },
  { id: 'echoes', icon: Gamepad2, route: '/echoes', badge: 'RPG', players: '1' },
  { id: 'stories', icon: BookOpen, route: '/stories', badge: 'STORY', players: '1' },
];

export default function GamesPageContent() {
  const t = useTranslations('games');
  const router = useRouter();
  const state = useMemo(() => loadAdvancementState(), []);
  const unlockedCount = state.unlockedIds.length;
  const isArenaLocked = unlockedCount < BATTLE_ARENA_REQUIRED_ADVANCEMENTS;

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </motion.div>

      <div className={styles.grid}>
        {GAMES.map((game, i) => {
          const Icon = game.icon;
          const isLocked = game.requiresAdvancements && isArenaLocked;
          const titleKey = `${game.id}.title`;
          const descriptionKey = `${game.id}.description`;
          const title = t.has(titleKey) ? t(titleKey) : game.title;
          const description = t.has(descriptionKey) ? t(descriptionKey) : game.description;

          return (
            <motion.button
              key={game.id}
              className={`${styles.card} ${isLocked ? styles.cardLocked : ''}`}
              onClick={() => !isLocked && router.push(game.route)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={isLocked ? {} : { scale: 1.02 }}
              whileTap={isLocked ? {} : { scale: 0.98 }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <Icon size={28} />
                </div>
                <span className={styles.badge}>{game.badge}</span>
              </div>
              <div className={styles.cardTitle}>{title}</div>
              <div className={styles.cardDesc}>{description}</div>
              <div className={styles.cardMeta}>
                <span className={styles.players}>{game.players} players</span>
                {isLocked && <span className={styles.lockIcon}>🔒</span>}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
