import { Metadata } from 'next';
import ArenaGame from '@/features/arena/components/ArenaGame';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: '9人アリーナ | RHYTHMIA - Azuretier',
    en: '9-Player Arena | RHYTHMIA - Azuretier',
    th: 'อารีน่า 9 ผู้เล่น | RHYTHMIA - Azuretier',
    es: 'Arena 9 Jugadores | RHYTHMIA - Azuretier',
    fr: 'Arene 9 Joueurs | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: '9人同時対戦アリーナモード。共有テンポ、カオスギミック、テンポシフトを生き残れ。',
    en: '9-player simultaneous arena mode. Survive shared tempo, chaos gimmicks, and tempo shifts.',
    th: 'โหมดอารีน่า 9 ผู้เล่นพร้อมกัน เอาชีวิตรอดจากจังหวะร่วม กลไกคาออส และการเปลี่ยนจังหวะ',
    es: 'Modo arena simultáneo para 9 jugadores. Sobrevive al tempo compartido, trucos del caos y cambios de tempo.',
    fr: 'Mode arene simultanée pour 9 joueurs. Survivez au tempo partagé, aux astuces du chaos et aux changements de tempo.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/arena`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function ArenaPage() {
  return <ArenaGame />;
}
