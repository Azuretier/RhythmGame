/**
 * OpenClaw Content Analyzer — Daily content analysis (23:30 JST).
 *
 * 1. Reads today's posted content from marketing_queue
 * 2. Analyses engagement (impressions, likes, retweets if available)
 * 3. Identifies best-performing post types and topics
 * 4. Saves insights to Firestore marketing_insights
 * 5. Insights feed back into content-generator prompts
 *
 * Usage: npx ts-node --project tsconfig.server.json scripts/openclaw-content-analyzer.ts
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
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

interface PostData {
  id: string;
  content: string;
  topic: string;
  platform: string;
  status: string;
  source: string;
  impressions?: number;
  likes?: number;
  retweets?: number;
  replies?: number;
  scheduledAt: Timestamp;
  createdAt: Timestamp;
}

interface DailyInsight {
  date: string;
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  bestTopic: string | null;
  bestPostContent: string | null;
  topicBreakdown: Record<string, { count: number; avgImpressions: number }>;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Fetch today's posts
// ---------------------------------------------------------------------------

async function getTodaysPosts(): Promise<PostData[]> {
  const db = getDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const snap = await getDocs(
    query(
      collection(db, 'marketing_queue'),
      where('scheduledAt', '>=', Timestamp.fromDate(todayStart)),
      where('scheduledAt', '<=', Timestamp.fromDate(todayEnd)),
    ),
  );

  const posts: PostData[] = [];
  snap.forEach((d) => {
    posts.push({ id: d.id, ...d.data() } as PostData);
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Analyse engagement
// ---------------------------------------------------------------------------

function analyseEngagement(posts: PostData[]): DailyInsight {
  const today = new Date().toISOString().slice(0, 10);

  if (posts.length === 0) {
    return {
      date: today,
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      avgEngagementRate: 0,
      bestTopic: null,
      bestPostContent: null,
      topicBreakdown: {},
      createdAt: Timestamp.now(),
    };
  }

  let totalImpressions = 0;
  let totalEngagements = 0;
  let bestImpressions = -1;
  let bestPost: PostData | null = null;

  const topicStats = new Map<
    string,
    { count: number; impressions: number }
  >();

  for (const post of posts) {
    const impressions = post.impressions ?? 0;
    const engagements =
      (post.likes ?? 0) + (post.retweets ?? 0) + (post.replies ?? 0);

    totalImpressions += impressions;
    totalEngagements += engagements;

    if (impressions > bestImpressions) {
      bestImpressions = impressions;
      bestPost = post;
    }

    const topic = post.topic || 'uncategorized';
    const existing = topicStats.get(topic) ?? { count: 0, impressions: 0 };
    existing.count++;
    existing.impressions += impressions;
    topicStats.set(topic, existing);
  }

  const topicBreakdown: Record<
    string,
    { count: number; avgImpressions: number }
  > = {};
  let bestTopicImpressions = -1;
  let bestTopic: string | null = null;

  for (const [topic, stats] of topicStats) {
    const avg = stats.count > 0 ? Math.round(stats.impressions / stats.count) : 0;
    topicBreakdown[topic] = { count: stats.count, avgImpressions: avg };

    if (avg > bestTopicImpressions) {
      bestTopicImpressions = avg;
      bestTopic = topic;
    }
  }

  const avgEngagementRate =
    totalImpressions > 0
      ? Math.round((totalEngagements / totalImpressions) * 10000) / 100
      : 0;

  return {
    date: today,
    totalPosts: posts.length,
    totalImpressions,
    totalEngagements,
    avgEngagementRate,
    bestTopic,
    bestPostContent: bestPost?.content ?? null,
    topicBreakdown,
    createdAt: Timestamp.now(),
  };
}

// ---------------------------------------------------------------------------
// Save insights
// ---------------------------------------------------------------------------

async function saveInsight(insight: DailyInsight) {
  const db = getDb();
  await addDoc(collection(db, 'marketing_insights'), insight);
  console.log(`[OpenClaw] Insight saved for ${insight.date}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[OpenClaw] Starting daily content analysis...');

  const posts = await getTodaysPosts();
  console.log(`[OpenClaw] Found ${posts.length} posts for today`);

  const insight = analyseEngagement(posts);

  console.log(`[OpenClaw] Total impressions: ${insight.totalImpressions}`);
  console.log(`[OpenClaw] Avg engagement rate: ${insight.avgEngagementRate}%`);
  if (insight.bestTopic) {
    console.log(`[OpenClaw] Best topic: ${insight.bestTopic}`);
  }

  await saveInsight(insight);

  console.log('[OpenClaw] Content analysis complete');
}

main().catch((err) => {
  console.error('[OpenClaw] Fatal error:', err);
  process.exit(1);
});
