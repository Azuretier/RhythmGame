import { Metadata } from 'next';
import Tetris99Game from '@/components/tetris99/Tetris99GameProper';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'TETRIS 99 スタイル | RHYTHMIA - Azuretier',
    en: 'Tetris 99 Style | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: '98体のCPUライバルと戦うTetris 99スタイルのバトルロイヤル。バッジ、ターゲティング、お邪魔ラインに対応。',
    en: 'A Tetris 99-style battle royale with 98 CPU rivals, badges, targeting modes, and incoming garbage pressure.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/tetris-99`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function Tetris99Page() {
  return <Tetris99Game />;
}
