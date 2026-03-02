import { Metadata } from 'next';
import TowerDefensePageClient from './TowerDefensePageClient';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'タワーディフェンス | RHYTHMIA - Azuretier',
    en: 'Tower Defense | RHYTHMIA - Azuretier',
    th: 'ทาวเวอร์ดีเฟนส์ | RHYTHMIA - Azuretier',
    es: 'Defensa de Torres | RHYTHMIA - Azuretier',
    fr: 'Défense de Tour | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'タワーディフェンスモード。ソロで30ウェーブを生き残るか、2-4人で敵を送り合おう。',
    en: 'Tower Defense mode. Survive 30 waves solo or send enemies to opponents in 2-4 player multiplayer.',
    th: 'โหมดทาวเวอร์ดีเฟนส์ เอาชีวิตรอด 30 เวฟโซโล่หรือส่งศัตรูให้ฝ่ายตรงข้ามในมัลติเพลเยอร์ 2-4 คน',
    es: 'Modo Defensa de Torres. Sobrevive 30 oleadas en solitario o envía enemigos a oponentes en multijugador de 2-4 jugadores.',
    fr: 'Mode Défense de Tour. Survivez à 30 vagues en solo ou envoyez des ennemis aux adversaires en multijoueur 2-4 joueurs.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/tower-defense`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function TowerDefensePage() {
  return <TowerDefensePageClient />;
}
