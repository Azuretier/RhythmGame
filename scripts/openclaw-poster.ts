/**
 * OpenClaw Poster — Post execution script.
 * Designed to run at 12:00 and 23:00 JST via cron or scheduler.
 *
 * Usage:
 *   npx ts-node --project tsconfig.server.json scripts/openclaw-poster.ts
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — Firebase Admin SDK credentials
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET — X/Twitter OAuth 1.0a
 *   DISCORD_ONLINE_WEBHOOK_URLS — comma-separated Discord webhook URLs
 */

import { getPendingPosts, markAsPosted, markAsFailed } from '@/lib/marketing/post-scheduler';
import { sendToWebhook } from '@/lib/discord-bot/client';
import * as crypto from 'crypto';

// ===== X/Twitter OAuth 1.0a =====

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

async function postToX(text: string): Promise<boolean> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn('[OpenClaw] X credentials not configured, skipping X post');
    return false;
  }

  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[OpenClaw] X API error (${res.status}): ${errorText}`);
      return false;
    }

    const data = await res.json();
    console.log(`[OpenClaw] Posted to X: ${data.data?.id}`);
    return true;
  } catch (error) {
    console.error('[OpenClaw] X post failed:', (error as Error).message);
    return false;
  }
}

// ===== Discord Webhook =====

async function postToDiscord(textJa: string, textEn: string): Promise<boolean> {
  const webhookUrls = process.env.DISCORD_ONLINE_WEBHOOK_URLS;
  if (!webhookUrls) {
    console.warn('[OpenClaw] Discord webhook URLs not configured, skipping');
    return false;
  }

  const urls = webhookUrls.split(',').map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) return false;

  const embed = {
    title: '📢 azuretier.net',
    description: `${textJa}\n\n---\n\n${textEn}`,
    color: 0x007fff,
    footer: { text: 'OpenClaw — azuretier.net Marketing' },
    timestamp: new Date().toISOString(),
  };

  let anySuccess = false;
  for (const url of urls) {
    const success = await sendToWebhook(url, { embeds: [embed] });
    if (success) anySuccess = true;
  }

  return anySuccess;
}

// ===== Main =====

async function main() {
  console.log('[OpenClaw] Poster starting...');

  const pendingPosts = await getPendingPosts();
  console.log(`[OpenClaw] Found ${pendingPosts.length} pending posts`);

  const now = Date.now();
  const WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  let posted = 0;
  let failed = 0;

  for (const entry of pendingPosts) {
    const scheduledTime = new Date(entry.scheduledAt).getTime();
    const diff = scheduledTime - now;

    // Only post if scheduled time is within 30-minute window (past or upcoming)
    if (diff > WINDOW_MS || diff < -WINDOW_MS) {
      continue;
    }

    console.log(`[OpenClaw] Processing post ${entry.id} (type: ${entry.post.type})...`);

    const errors: string[] = [];

    // Determine which text to use (prefer JA for early slot, EN for late slot)
    const scheduledHourJST = new Date(scheduledTime + 9 * 60 * 60 * 1000).getUTCHours();
    const primaryText = scheduledHourJST < 18 ? entry.post.textJa : entry.post.textEn;

    // Post to X
    if (entry.targetPlatforms.includes('x')) {
      const xOk = await postToX(primaryText);
      if (!xOk) errors.push('X post failed');
    }

    // Post to Discord
    if (entry.targetPlatforms.includes('discord')) {
      const discordOk = await postToDiscord(entry.post.textJa, entry.post.textEn);
      if (!discordOk) errors.push('Discord post failed');
    }

    if (errors.length === 0 || errors.length < entry.targetPlatforms.length) {
      await markAsPosted(entry.id);
      posted++;
      console.log(`[OpenClaw] Post ${entry.id} completed`);
    } else {
      await markAsFailed(entry.id, errors.join('; '));
      failed++;
      console.log(`[OpenClaw] Post ${entry.id} failed: ${errors.join('; ')}`);
    }
  }

  console.log(`[OpenClaw] Poster complete. Posted: ${posted}, Failed: ${failed}`);
}

main().catch((error) => {
  console.error('[OpenClaw] Fatal error:', error);
  process.exit(1);
});
