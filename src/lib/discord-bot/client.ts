/**
 * Send a message to a Discord channel via webhook URL.
 * No bot token or discord.js client needed — just an HTTP POST.
 */
export async function sendToWebhook(
  webhookUrl: string,
  body: { content?: string; embeds?: object[] },
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[DISCORD_WEBHOOK] Failed (${res.status}): ${await res.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[DISCORD_WEBHOOK] Error:`, (error as Error).message);
    return false;
  }
}
