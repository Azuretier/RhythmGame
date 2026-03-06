/**
 * OpenClaw Strategist — Weekly strategy generation (Monday 7:00 JST).
 *
 * 1. Fetches dashboard data for the last 7 days
 * 2. Analyses revenue trends, player growth, funnel bottlenecks
 * 3. Uses Gemini to generate strategy recommendations
 * 4. Generates a 7-day content calendar
 * 5. Queues posts to Firestore marketing_queue
 * 6. Saves strategy report to marketing_reports
 * 7. Sends summary to Discord webhook
 *
 * Usage: npx ts-node --project tsconfig.server.json scripts/openclaw-strategist.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase init (server-side script — direct config)
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
// Fetch dashboard data
// ---------------------------------------------------------------------------

async function fetchDashboard(): Promise<Record<string, unknown>> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) throw new Error('ADMIN_API_KEY is not set');

  const res = await fetch(`${baseUrl}/api/analytics/dashboard?range=7d`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });

  if (!res.ok) throw new Error(`Dashboard API returned ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Gemini strategy generation
// ---------------------------------------------------------------------------

async function generateStrategy(
  dashboardData: Record<string, unknown>,
): Promise<{ recommendations: string; calendar: Array<{ day: string; topic: string; content: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' });

  const prompt = `You are a gaming platform growth strategist for azuretier.net, a multiplayer rhythm/puzzle game platform.

Analyse the following 7-day dashboard data and generate:
1. 3-5 strategy recommendations (brief bullet points)
2. A 7-day content calendar (one post per day, Monday through Sunday)

Dashboard data:
${JSON.stringify(dashboardData, null, 2)}

Respond as JSON:
{
  "recommendations": "markdown bullet list of strategy recommendations",
  "calendar": [
    { "day": "Monday", "topic": "...", "content": "tweet-length post text (max 280 chars)" },
    ...
  ]
}

Focus on: player acquisition, retention, community engagement, and revenue growth.
The tone should be enthusiastic and gaming-community-friendly.
Return ONLY the JSON, no markdown fencing.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Queue posts to Firestore
// ---------------------------------------------------------------------------

async function queuePosts(
  calendar: Array<{ day: string; topic: string; content: string }>,
) {
  const db = getDb();
  const now = new Date();
  const dayMap: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
  };

  for (const entry of calendar) {
    const dayOffset = dayMap[entry.day] ?? 0;
    const postDate = new Date(now);
    postDate.setDate(postDate.getDate() + dayOffset);
    postDate.setHours(12, 0, 0, 0); // Noon JST posting window

    await addDoc(collection(db, 'marketing_queue'), {
      content: entry.content,
      topic: entry.topic,
      platform: 'x',
      status: 'pending',
      source: 'openclaw-strategist',
      scheduledAt: Timestamp.fromDate(postDate),
      createdAt: Timestamp.now(),
    });
  }

  console.log(`[OpenClaw] Queued ${calendar.length} posts to marketing_queue`);
}

// ---------------------------------------------------------------------------
// Save report
// ---------------------------------------------------------------------------

async function saveReport(
  dashboardData: Record<string, unknown>,
  recommendations: string,
  calendar: Array<{ day: string; topic: string; content: string }>,
) {
  const db = getDb();

  await addDoc(collection(db, 'marketing_reports'), {
    type: 'weekly_strategy',
    dashboardSnapshot: dashboardData,
    recommendations,
    calendar,
    createdAt: Timestamp.now(),
  });

  console.log('[OpenClaw] Strategy report saved to marketing_reports');
}

// ---------------------------------------------------------------------------
// Discord notification
// ---------------------------------------------------------------------------

async function notifyDiscord(
  recommendations: string,
  calendar: Array<{ day: string; topic: string; content: string }>,
) {
  const webhookUrl = process.env.DISCORD_ONLINE_WEBHOOK_URLS?.split(',')[0];
  if (!webhookUrl) {
    console.log('[OpenClaw] No Discord webhook configured, skipping notification');
    return;
  }

  const calendarSummary = calendar
    .map((c) => `**${c.day}**: ${c.topic}`)
    .join('\n');

  const embed = {
    title: 'Weekly Strategy Report',
    color: 0x007fff,
    fields: [
      { name: 'Recommendations', value: recommendations.slice(0, 1024) },
      { name: 'Content Calendar', value: calendarSummary.slice(0, 1024) },
    ],
    footer: { text: 'OpenClaw Strategist' },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error(`[OpenClaw] Discord webhook failed: ${res.status}`);
  } else {
    console.log('[OpenClaw] Discord notification sent');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[OpenClaw] Starting weekly strategy generation...');

  const dashboardData = await fetchDashboard();
  console.log('[OpenClaw] Dashboard data fetched');

  const { recommendations, calendar } = await generateStrategy(dashboardData);
  console.log('[OpenClaw] Strategy generated');

  await queuePosts(calendar);
  await saveReport(dashboardData, recommendations, calendar);
  await notifyDiscord(recommendations, calendar);

  console.log('[OpenClaw] Weekly strategy complete');
}

main().catch((err) => {
  console.error('[OpenClaw] Fatal error:', err);
  process.exit(1);
});
