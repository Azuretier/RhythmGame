import { Metadata } from 'next';
import StoryViewer from '@/features/stories/components/StoryViewer';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'ストーリー | RHYTHMIA - Azuretier',
    en: 'Stories | RHYTHMIA - Azuretier',
    th: 'เรื่องราว | RHYTHMIA - Azuretier',
    es: 'Historias | RHYTHMIA - Azuretier',
    fr: 'Histoires | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'ストーリードリブンのリズムゲームプレイ。物語チャプターとユニークなチャレンジを体験しよう。',
    en: 'Story-driven rhythm gameplay with narrative chapters and unique challenges.',
    th: 'เกมเพลย์จังหวะที่ขับเคลื่อนด้วยเรื่องราว พร้อมบทเรื่องและความท้าทายพิเศษ',
    es: 'Jugabilidad rítmica narrativa con capítulos y desafíos únicos.',
    fr: 'Gameplay rythmique narratif avec des chapitres et des défis uniques.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/stories`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function StoriesPage() {
  return <StoryViewer />;
}
