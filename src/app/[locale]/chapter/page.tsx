import { Metadata } from 'next';
import ChapterPageClient from './ChapterPageClient';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'プロローグ | RHYTHMIA - Azuretier',
    en: 'Prologue | RHYTHMIA - Azuretier',
    th: 'บทนำ | RHYTHMIA - Azuretier',
    es: 'Prólogo | RHYTHMIA - Azuretier',
    fr: 'Prologue | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'RHYTHMIAのプロローグチャプター。リズムとストーリーが融合した物語を体験しよう。',
    en: 'Play the RHYTHMIA prologue chapter. Experience the story where rhythm meets narrative.',
    th: 'เล่นบทโปรล็อก RHYTHMIA สัมผัสเรื่องราวที่จังหวะพบกับการเล่าเรื่อง',
    es: 'Juega el capítulo prólogo de RHYTHMIA. Experimenta la historia donde el ritmo se encuentra con la narrativa.',
    fr: 'Jouez le chapitre prologue de RHYTHMIA. Découvrez l\'histoire où le rythme rencontre la narration.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/chapter`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function ChapterPage() {
  return <ChapterPageClient />;
}
