import { Metadata } from 'next';
import WikiPage from '@/components/wiki/WikiPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'ja' ? 'Wiki | RHYTHMIA - Azuretier' : 'Wiki | RHYTHMIA - Azuretier',
    description: locale === 'ja'
      ? 'RHYTHMIAの攻略Wiki。ゲームモード、ワールド、ランク戦、アイテム、クラフト、進捗など全システムを網羅。'
      : 'The complete RHYTHMIA wiki. Game modes, worlds, ranked system, items, crafting, advancements, and more.',
  };
}

export default function WikiRoute() {
  return <WikiPage />;
}
