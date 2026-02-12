import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DISCORD_SITE_ENTRY_WEBHOOK_URL;
    if (!webhookUrl) {
      // Webhook not configured — silently succeed
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const { name, icon, friendCode, locale } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const iconLabel = ICON_LABELS[icon] || icon || 'Unknown';
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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SITE_ENTRY] Error:', error);
    return NextResponse.json({ ok: true });
  }
}
