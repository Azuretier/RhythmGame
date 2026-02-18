'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Gamepad2, Swords, Users, Trophy, User, MessageSquare } from 'lucide-react';
import type { ServerMessage, OnlineUser } from '@/types/multiplayer';
import { getUnlockedCount } from '@/lib/advancements/storage';
import { ADVANCEMENTS, BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import { useProfile } from '@/lib/profile/context';
import Advancements from '@/components/rhythmia/Advancements';
import ProfileSetup from '@/components/profile/ProfileSetup';
import OnlineUsers from '@/components/profile/OnlineUsers';
import SkinCustomizer from '@/components/profile/SkinCustomizer';
import VanillaGame from '@/components/rhythmia/tetris';
import MultiplayerGame from '@/components/rhythmia/MultiplayerGame';
import CampStation from './CampStation';
import FireflyParticles from './FireflyParticles';
import { useRouter } from '@/i18n/navigation';
import styles from './v1_0_3.module.css';

const ForestCampfireScene = dynamic(
  () => import('@/components/rhythmia/ForestCampfireScene'),
  { ssr: false }
);

type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export default function V1_0_3_UI() {
  const [gameMode, setGameMode] = useState<GameMode>('lobby');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showAdvancements, setShowAdvancements] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [showSkinCustomizer, setShowSkinCustomizer] = useState(false);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const profileSentRef = useRef(false);

  const t = useTranslations();
  const router = useRouter();
  const { profile, showProfileSetup } = useProfile();

  const isArenaLocked = unlockedCount < BATTLE_ARENA_REQUIRED_ADVANCEMENTS;

  // WebGPU detection
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.gpu) {
      setIsWebGPUSupported(false);
    }
  }, []);

  // Init loading + advancement count
  useEffect(() => {
    setUnlockedCount(getUnlockedCount());
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Refresh unlocked count on lobby return
  useEffect(() => {
    if (gameMode === 'lobby' && !showAdvancements) {
      setUnlockedCount(getUnlockedCount());
    }
  }, [gameMode, showAdvancements]);

  // Send profile to WebSocket
  const sendProfileToWs = useCallback(() => {
    if (profile && wsRef.current?.readyState === WebSocket.OPEN && !profileSentRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'set_profile',
        name: profile.name,
        icon: profile.icon,
        isPrivate: profile.isPrivate,
      }));
      profileSentRef.current = true;
    }
  }, [profile]);

  // Connect to multiplayer WebSocket for online count
  const connectMultiplayerWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);
    profileSentRef.current = false;

    ws.onopen = () => {
      if (profile) {
        ws.send(JSON.stringify({
          type: 'set_profile',
          name: profile.name,
          icon: profile.icon,
          isPrivate: profile.isPrivate,
        }));
        profileSentRef.current = true;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        if (message.type === 'online_count') {
          setOnlineCount(message.count);
        } else if (message.type === 'online_users') {
          setOnlineUsers(message.users);
        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      wsRef.current = null;
      profileSentRef.current = false;
    };

    wsRef.current = ws;
  }, [profile]);

  useEffect(() => {
    connectMultiplayerWs();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectMultiplayerWs]);

  useEffect(() => {
    sendProfileToWs();
  }, [sendProfileToWs]);

  // Re-send profile when privacy changes
  useEffect(() => {
    if (profile && wsRef.current?.readyState === WebSocket.OPEN && profileSentRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'set_profile',
        name: profile.name,
        icon: profile.icon,
        isPrivate: profile.isPrivate,
      }));
    }
  }, [profile?.isPrivate]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestOnlineUsers = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_online_users' }));
    }
    setShowOnlineUsers(true);
  };

  const launchGame = (mode: GameMode) => {
    if (mode === 'multiplayer' && isArenaLocked) return;
    if (mode === 'multiplayer' && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setGameMode(mode);
  };

  const closeGame = () => {
    setGameMode('lobby');
    connectMultiplayerWs();
  };

  // --- Game mode renders ---
  if (gameMode === 'vanilla') {
    return (
      <motion.div
        className={styles.gameContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <VanillaGame onQuit={closeGame} />
      </motion.div>
    );
  }

  if (gameMode === 'multiplayer') {
    return (
      <motion.div
        className={styles.gameContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <MultiplayerGame onQuit={closeGame} />
      </motion.div>
    );
  }

  // --- Camp lobby render ---
  return (
    <div className={styles.campContainer}>
      {/* Profile setup overlay */}
      <AnimatePresence>
        {showProfileSetup && <ProfileSetup />}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && !showProfileSetup && (
          <motion.div
            className={styles.loadingOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.loader} />
            <div className={styles.loadingText}>{t('camp.loading')}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online users panel */}
      <AnimatePresence>
        {showOnlineUsers && (
          <OnlineUsers
            users={onlineUsers}
            onClose={() => setShowOnlineUsers(false)}
          />
        )}
      </AnimatePresence>

      {/* Advancements panel */}
      <AnimatePresence>
        {showAdvancements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300 }}
          >
            <Advancements onClose={() => setShowAdvancements(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skin customizer panel */}
      <AnimatePresence>
        {showSkinCustomizer && (
          <SkinCustomizer onClose={() => setShowSkinCustomizer(false)} />
        )}
      </AnimatePresence>

      {/* Background: WebGPU campfire or CSS fallback */}
      {isWebGPUSupported ? (
        <div className={styles.campfireWrapper}>
          <ForestCampfireScene />
        </div>
      ) : (
        <div className={styles.cssFallback}>
          <div className={styles.cssFallbackFlicker} />
        </div>
      )}

      {/* Ambient firefly particles */}
      <FireflyParticles />

      {/* Vignette overlay for text readability */}
      <div className={styles.campOverlay} />

      {/* Main content: stations + title */}
      <div className={styles.stationsContainer}>
        {/* Title */}
        <motion.div
          className={styles.campTitle}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? -20 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white/90 drop-shadow-[0_0_20px_rgba(255,160,40,0.25)]">
            {t('camp.subtitle')}
          </h1>
          <p className="text-xs text-amber-200/50 mt-1 font-pixel tracking-[0.2em] uppercase">
            {t('camp.title')}
          </p>
        </motion.div>

        {/* Station grid */}
        <div className={styles.stationGrid}>
          {/* Central: Solo play */}
          <div className={styles.centralStation}>
            <CampStation
              icon={<Gamepad2 size={28} />}
              name={t('camp.stations.solo.name')}
              description={t('camp.stations.solo.description')}
              badge={t('camp.stations.solo.badge')}
              onClick={() => launchGame('vanilla')}
              size="large"
              delay={0.3}
            />
          </div>

          {/* 1v1 Battle */}
          <CampStation
            icon={<Swords size={22} />}
            name={t('camp.stations.battle.name')}
            description={isArenaLocked
              ? t('advancements.lockMessage', { current: unlockedCount, required: BATTLE_ARENA_REQUIRED_ADVANCEMENTS })
              : t('camp.stations.battle.description')
            }
            badge={t('camp.stations.battle.badge')}
            onClick={() => launchGame('multiplayer')}
            locked={isArenaLocked}
            lockMessage={t('advancements.lockMessage', { current: unlockedCount, required: BATTLE_ARENA_REQUIRED_ADVANCEMENTS })}
            delay={0.4}
          />

          {/* Arena (9P) */}
          <CampStation
            icon={<Users size={22} />}
            name={t('camp.stations.arena.name')}
            description={t('camp.stations.arena.description')}
            badge={t('camp.stations.arena.badge')}
            onClick={() => router.push('/arena')}
            delay={0.5}
          />

          {/* Advancements */}
          <CampStation
            icon={<Trophy size={22} />}
            name={t('camp.stations.advancements.name')}
            description={`${unlockedCount}/${ADVANCEMENTS.length}`}
            onClick={() => setShowAdvancements(true)}
            delay={0.6}
          />

          {/* Profile */}
          <CampStation
            icon={<User size={22} />}
            name={t('camp.stations.profile.name')}
            description={t('camp.stations.profile.description')}
            onClick={() => setShowSkinCustomizer(true)}
            delay={0.7}
          />

          {/* Community */}
          <CampStation
            icon={<MessageSquare size={22} />}
            name={t('camp.stations.community.name')}
            description={t('camp.stations.community.description')}
            onClick={() => window.open('https://discord.gg/TRFHTWCY4W', '_blank')}
            delay={0.8}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <motion.button
          className={`${styles.bottomBarItem} text-xs text-amber-200/50 hover:text-amber-200/80 transition-colors flex items-center gap-2`}
          onClick={requestOnlineUsers}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ delay: 1.0 }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400/80 animate-pulse" />
          {t('camp.online', { count: onlineCount })}
        </motion.button>

        <motion.span
          className="text-[10px] text-white/20 font-pixel"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ delay: 1.2 }}
        >
          v1.0.3
        </motion.span>
      </div>
    </div>
  );
}
