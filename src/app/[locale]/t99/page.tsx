import { Metadata } from 'next';
import T99Game from '@/features/t99/components/T99Game';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'T99 ロワイヤル | Azuretier',
    en: 'T99 Royale | Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: '98人のライバルを相手に戦う、Nintendo Switch風のバトルロワイヤル落ち物パズルモード。',
    en: 'A Nintendo Switch inspired 99-player battle royale falling-block mode with targeting, garbage pressure, and simulated rivals.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/t99`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function T99Page() {
  return <T99Game />;
}
