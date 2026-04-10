import { Metadata } from 'next';
import EchoesPageContent from '@/features/echoes/components/EchoesPageContent';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'Echoes of Elysium | RHYTHMIA - Azuretier',
    en: 'Echoes of Elysium | RHYTHMIA - Azuretier',
    th: 'Echoes of Elysium | RHYTHMIA - Azuretier',
    es: 'Echoes of Elysium | RHYTHMIA - Azuretier',
    fr: 'Echoes of Elysium | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'Echoes of Elysium — RHYTHMIAの新しいゲームモードを体験しよう。',
    en: 'Echoes of Elysium — Experience a new game mode in RHYTHMIA.',
    th: 'Echoes of Elysium — สัมผัสโหมดเกมใหม่ใน RHYTHMIA',
    es: 'Echoes of Elysium — Experimenta un nuevo modo de juego en RHYTHMIA.',
    fr: 'Echoes of Elysium — Découvrez un nouveau mode de jeu dans RHYTHMIA.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/echoes`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function EchoesPage() {
  return <EchoesPageContent />;
}
