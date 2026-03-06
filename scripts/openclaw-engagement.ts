/**
 * OpenClaw Engagement — Player engagement notifications (every 12 hours).
 *
 * 1. Checks for rank-ups in the last 12 hours
 * 2. Checks for returning players (inactive > 7 days, now active)
 * 3. Generates congratulation / welcome-back messages
 * 4. Posts to Discord webhook
 *
 * Usage: npx ts-node --project tsconfig.server.json scripts/openclaw-engagement.ts
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_APP_ID,
};

function getDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RankUpEvent {
  playerName: string;
  previousTier: string;
  newTier: string;
  timestamp: Timestamp;
}

interface ReturningPlayer {
  playerName: string;
  lastActiveBefore: Date;
  returnedAt: Date;
  daysAway: number;
}

// ---------------------------------------------------------------------------
// Check rank-ups
// ---------------------------------------------------------------------------

async function getRecentRankUps(): Promise<RankUpEvent[]> {
  const db = getDb();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const snap = await getDocs(
    query(
      collection(db, 'player_purchases'),
      where('type', '==', 'rank_up'),
      where('timestamp', '>=', Timestamp.fromDate(twelveHoursAgo)),
    ),
  );

  const events: RankUpEvent[] = [];
  snap.forEach((d) => {
    const data = d.data();
    events.push({
      playerName: data.playerName ?? 'Unknown',
      previousTier: data.previousTier ?? '???',
      newTier: data.newTier ?? '???',
      timestamp: data.timestamp,
    });
  });

  return events;
}

// ---------------------------------------------------------------------------
// Check returning players
// ---------------------------------------------------------------------------

async function getReturningPlayers(): Promise<ReturningPlayer[]> {
  const db = getDb();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Players active in the last 12h
  const recentSnap = await getDocs(
    query(
      collection(db, 'user_sync'),
      where('lastActive', '>=', Timestamp.fromDate(twelveHoursAgo)),
    ),
  );

  const returning: ReturningPlayer[] = [];

  recentSnap.forEach((d) => {
    const data = d.data();
    const previousActive = data.previousLastActive?.toDate?.();

    // If their previous activity was more than 7 days ago, they're a returning player
    if (previousActive && previousActive < sevenDaysAgo) {
      const daysAway = Math.floor(
        (Date.now() - previousActive.getTime()) / (24 * 60 * 60 * 1000),
      );
      returning.push({
        playerName: data.name ?? data.displayName ?? 'Player',
        lastActiveBefore: previousActive,
        returnedAt: data.lastActive?.toDate?.() ?? new Date(),
        daysAway,
      });
    }
  });

  return returning;
}

// ---------------------------------------------------------------------------
// Discord notifications
// ---------------------------------------------------------------------------

async function sendToDiscord(embeds: Array<Record<string, unknown>>) {
  const webhookUrls = process.env.DISCORD_ONLINE_WEBHOOK_URLS?.split(',') ?? [];
  const webhookUrl = webhookUrls[0];

  if (!webhookUrl) {
    console.log('[OpenClaw] No Discord webhook configured, skipping');
    return;
  }

  // Discord limits to 10 embeds per message
  const chunks: Array<Array<Record<string, unknown>>> = [];
  for (let i = 0; i < embeds.length; i += 10) {
    chunks.push(embeds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: chunk }),
    });

    if (!res.ok) {
      console.error(`[OpenClaw] Discord webhook failed: ${res.status}`);
    }
  }

  console.log(`[OpenClaw] Sent ${embeds.length} embeds to Discord`);
}

// ---------------------------------------------------------------------------
// Message generation
// ---------------------------------------------------------------------------

function buildRankUpEmbeds(events: RankUpEvent[]): Array<Record<string, unknown>> {
  return events.map((e) => ({
    title: 'Rank Up!',
    description: `**${e.playerName}** ranked up from **${e.previousTier}** to **${e.newTier}**! Congratulations!`,
    color: 0xffd700, // Gold
    footer: { text: 'OpenClaw Engagement' },
    timestamp: e.timestamp.toDate().toISOString(),
  }));
}

function buildReturningEmbeds(
  players: ReturningPlayer[],
): Array<Record<string, unknown>> {
  return players.map((p) => ({
    title: 'Welcome Back!',
    description: `**${p.playerName}** is back after ${p.daysAway} days! Great to see them again.`,
    color: 0x007fff, // Azure
    footer: { text: 'OpenClaw Engagement' },
    timestamp: p.returnedAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[OpenClaw] Starting engagement check...');

  const [rankUps, returning] = await Promise.all([
    getRecentRankUps(),
    getReturningPlayers(),
  ]);

  console.log(`[OpenClaw] Found ${rankUps.length} rank-ups`);
  console.log(`[OpenClaw] Found ${returning.length} returning players`);

  const embeds = [
    ...buildRankUpEmbeds(rankUps),
    ...buildReturningEmbeds(returning),
  ];

  if (embeds.length === 0) {
    console.log('[OpenClaw] No engagement events to report');
    return;
  }

  await sendToDiscord(embeds);

  console.log('[OpenClaw] Engagement check complete');
}

main().catch((err) => {
  console.error('[OpenClaw] Fatal error:', err);
  process.exit(1);
});
