import { Metadata } from 'next';
import MinecraftBoardGame from '@/components/minecraft-board/MinecraftBoardGame';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'マインクラフトボードゲーム | RHYTHMIA - Azuretier',
    en: 'Minecraft Board Game | RHYTHMIA - Azuretier',
    th: 'เกมกระดานมายคราฟ | RHYTHMIA - Azuretier',
    es: 'Juego de Mesa Minecraft | RHYTHMIA - Azuretier',
    fr: 'Jeu de Plateau Minecraft | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'マインクラフト風マルチプレイヤーボードゲーム。採掘、クラフト、モブとの戦闘で勝利を目指せ。',
    en: 'Minecraft-inspired multiplayer board game. Mine, craft, fight mobs, and race to victory.',
    th: 'เกมกระดานมัลติเพลเยอร์แรงบันดาลใจจากมายคราฟ ขุดแร่ คราฟ สู้ม็อบ และแข่งสู่ชัยชนะ',
    es: 'Juego de mesa multijugador inspirado en Minecraft. Mina, craftea, lucha contra mobs y corre hacia la victoria.',
    fr: 'Jeu de plateau multijoueur inspiré de Minecraft. Minez, craftez, combattez des mobs et foncez vers la victoire.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/minecraft-board`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function MinecraftBoardPage() {
  return <MinecraftBoardGame />;
}
