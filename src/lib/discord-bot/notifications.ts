import { sendToWebhook } from './client';

// Cooldown tracking to prevent spam when users reconnect rapidly
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes per user

/**
 * Parse the DISCORD_ONLINE_WEBHOOK_URLS env var into an array.
 * Supports comma-separated webhook URLs.
 */
function getWebhookUrls(): string[] {
  const raw = process.env.DISCORD_ONLINE_WEBHOOK_URLS;
  if (!raw) return [];
  return raw.split(',').map((url) => url.trim()).filter(Boolean);
}

/**
 * Send an "online" notification to all configured Discord webhooks.
 * Includes cooldown logic so rapid reconnects don't spam.
 */
export async function notifyPlayerOnline(
  playerName: string,
  playerIcon: string,
  onlineCount: number,
): Promise<void> {
  const webhooks = getWebhookUrls();
  if (webhooks.length === 0) return;

  // Cooldown check — skip if this player was notified recently
  const now = Date.now();
  const lastNotified = recentNotifications.get(playerName);
  if (lastNotified && now - lastNotified < NOTIFICATION_COOLDOWN) {
    return;
  }
  recentNotifications.set(playerName, now);

  const iconLabel = playerIcon || '🎮';

  const body = {
    embeds: [
      {
        title: '🟢 Player Online',
        color: 0x007fff, // Azure blue
        fields: [
          { name: 'Player', value: playerName, inline: true },
          { name: 'Icon', value: iconLabel, inline: true },
          { name: 'Online Now', value: `${onlineCount} player${onlineCount !== 1 ? 's' : ''}`, inline: true },
        ],
        footer: { text: 'azuretier.net — Rhythmia' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  for (const url of webhooks) {
    sendToWebhook(url, body).catch((err) => {
      console.error(`[DISCORD_WEBHOOK] Notification failed:`, err);
    });
  }
}

/**
 * Send a custom message to all configured notification webhooks.
 */
export async function sendNotification(
  body: { content?: string; embeds?: object[] },
): Promise<void> {
  const webhooks = getWebhookUrls();
  for (const url of webhooks) {
    sendToWebhook(url, body).catch((err) => {
      console.error(`[DISCORD_WEBHOOK] Notification failed:`, err);
    });
  }
}

/**
 * Clean up stale cooldown entries (call periodically).
 */
export function cleanupNotificationCooldowns(): void {
  const now = Date.now();
  for (const [name, time] of recentNotifications) {
    if (now - time > NOTIFICATION_COOLDOWN) {
      recentNotifications.delete(name);
    }
  }
}
