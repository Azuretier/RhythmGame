import { Metadata } from 'next';
import GamesHub from './GamesHub';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'ゲーム一覧 | RHYTHMIA - Azuretier',
    en: 'All Games | RHYTHMIA - Azuretier',
    th: 'เกมทั้งหมด | RHYTHMIA - Azuretier',
    es: 'Todos los Juegos | RHYTHMIA - Azuretier',
    fr: 'Tous les Jeux | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'RHYTHMIAの全ゲームモードを一覧で確認。ソロ、マルチプレイヤー、アリーナ、タワーディフェンスなど。',
    en: 'Browse all RHYTHMIA game modes. Solo, multiplayer, arena, tower defense, and more.',
    th: 'ดูโหมดเกม RHYTHMIA ทั้งหมด โซโล่ มัลติเพลเยอร์ อารีน่า ทาวเวอร์ดีเฟนส์ และอื่นๆ',
    es: 'Explora todos los modos de juego de RHYTHMIA. Solo, multijugador, arena, defensa de torres y más.',
    fr: 'Parcourez tous les modes de jeu de RHYTHMIA. Solo, multijoueur, arene, defense de tour et plus.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/games`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function GamesPage() {
  return <GamesHub />;
}
