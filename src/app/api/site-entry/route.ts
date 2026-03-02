import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

// Icon ID to display label mapping
const ICON_LABELS: Record<string, string> = {
  icon_mario: '🔴 Mario',
  icon_link: '🟢 Link',
  icon_kirby: '🩷 Kirby',
  icon_pikachu: '🟡 Pikachu',
  icon_splatoon: '🟠 Splatoon',
  icon_animal: '🔵 Animal',
  icon_star: '🟣 Star',
  icon_heart: '💗 Heart',
  icon_rhythm: '🎵 Rhythm',
  icon_fire: '🔥 Fire',
  icon_moon: '🌙 Moon',
  icon_bolt: '⚡ Bolt',
};

const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });

const siteEntrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  icon: z.string().trim().max(50).optional(),
  friendCode: z.string().trim().max(30).optional(),
  locale: z.string().trim().max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const webhookUrl = process.env.DISCORD_SITE_ENTRY_WEBHOOK_URL;
    if (!webhookUrl) {
      // Webhook not configured — silently succeed
      return NextResponse.json({ ok: true });
    }

    const rawBody = await request.json();
    const parsed = siteEntrySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
        { status: 400 }
      );
    }

    const { name, icon, friendCode, locale } = parsed.data;

    const iconLabel = (icon ? ICON_LABELS[icon] : undefined) || icon || 'Unknown';
    const langLabel = locale === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English';
    const timestamp = new Date().toISOString();

    const embed = {
      title: '🎮 New Player Entered',
      color: 0x0ab9e6, // Switch cyan
      fields: [
        { name: 'Name', value: name, inline: true },
        { name: 'Icon', value: iconLabel, inline: true },
        { name: 'Language', value: langLabel, inline: true },
        { name: 'Friend Code', value: `\`${friendCode || 'N/A'}\``, inline: false },
      ],
      footer: { text: 'azuretier.net — Profile Setup' },
      timestamp,
    };

    const webhookBody = {
      embeds: [embed],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookBody),
    });

    if (!res.ok) {
      console.error(`[SITE_ENTRY] Discord webhook failed: ${res.status}`);
      return NextResponse.json(
        { error: 'Webhook delivery failed', details: `Discord returned ${res.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SITE_ENTRY] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
