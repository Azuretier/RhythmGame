/**
 * OpenClaw Heartbeat — Daily content generation script.
 * Designed to run at 08:00 JST via cron or scheduler.
 *
 * Usage:
 *   npx ts-node --project tsconfig.server.json scripts/openclaw-heartbeat.ts
 *
 * Env:
 *   API_BASE_URL — base URL for API calls (default: http://localhost:3000)
 *   ADMIN_API_KEY — API key for authentication
 */

import type { PostType } from '@/lib/marketing/content-generator';
import { getRecentGitStats } from '@/lib/marketing/git-stats';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.ADMIN_API_KEY;

function getPostTypeForDay(): PostType {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dayOfWeek = jstNow.getUTCDay();

  switch (dayOfWeek) {
    case 1: return 'weekly_recap';
    case 5: return 'shop_announcement';
    case 6:
    case 0: return 'community_highlight';
    default:
      return Math.random() > 0.5 ? 'devlog' : 'tip_of_the_day';
  }
}

function toJSTISOString(hours: number): string {
  const now = new Date();
  const jstDate = new Date(now.toLocaleDateString('en-US', { timeZone: 'Asia/Tokyo' }));
  jstDate.setHours(hours, 0, 0, 0);
  const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
  return utcDate.toISOString();
}

async function apiCall(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function main() {
  console.log('[OpenClaw] Heartbeat starting...');

  if (!API_KEY) {
    console.error('[OpenClaw] ADMIN_API_KEY is required');
    process.exit(1);
  }

  // 1. Get git stats for last 24 hours
  console.log('[OpenClaw] Fetching git stats...');
  const gitStats = await getRecentGitStats(1);
  console.log(`[OpenClaw] Git: ${gitStats.summary}`);

  // 2. Get player stats
  console.log('[OpenClaw] Fetching player stats...');
  let playerStats = { dau: 0, wau: 0, totalPlayers: 0, topGameMode: 'Rhythmia' };
  try {
    const stats = await apiCall('/api/marketing/stats');
    playerStats = {
      dau: stats.dau,
      wau: stats.wau,
      totalPlayers: stats.totalPlayers,
      topGameMode: stats.activeGameModes?.[0] || 'Rhythmia',
    };
    console.log(`[OpenClaw] Players: DAU=${playerStats.dau}, WAU=${playerStats.wau}, Total=${playerStats.totalPlayers}`);
  } catch (error) {
    console.warn('[OpenClaw] Could not fetch player stats, continuing with defaults:', (error as Error).message);
  }

  // 3. Determine post type based on day of week
  const postType = getPostTypeForDay();
  console.log(`[OpenClaw] Post type for today: ${postType}`);

  // 4. Generate and queue Japanese post for 12:00 JST
  const jaSchedule = toJSTISOString(12);
  console.log(`[OpenClaw] Generating JA post for ${jaSchedule}...`);
  const jaResult = await apiCall('/api/marketing/generate', {
    method: 'POST',
    body: JSON.stringify({
      type: postType,
      context: {
        gitStats: gitStats.summary,
        featureAreas: gitStats.featureAreas,
        playerStats,
        language: 'ja',
      },
      scheduleAt: jaSchedule,
      platforms: ['x', 'discord'],
    }),
  });
  console.log(`[OpenClaw] JA post queued: ${jaResult.queuedId}`);

  // 5. Generate and queue English post for 23:00 JST
  const enSchedule = toJSTISOString(23);
  console.log(`[OpenClaw] Generating EN post for ${enSchedule}...`);
  const enResult = await apiCall('/api/marketing/generate', {
    method: 'POST',
    body: JSON.stringify({
      type: postType,
      context: {
        gitStats: gitStats.summary,
        featureAreas: gitStats.featureAreas,
        playerStats,
        language: 'en',
      },
      scheduleAt: enSchedule,
      platforms: ['x', 'discord'],
    }),
  });
  console.log(`[OpenClaw] EN post queued: ${enResult.queuedId}`);

  console.log('[OpenClaw] Heartbeat complete.');
}

main().catch((error) => {
  console.error('[OpenClaw] Fatal error:', error);
  process.exit(1);
});
