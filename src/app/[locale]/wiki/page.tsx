import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import WikiPage from '@/components/wiki/WikiPage';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;
  const messages = await getMessages({ locale });
  const wiki = (messages as Record<string, Record<string, Record<string, string>>>).wiki;

  const title = wiki?.meta?.title || 'Wiki | RHYTHMIA - Azuretier';
  const description = wiki?.meta?.description || 'The complete RHYTHMIA wiki. Game modes, worlds, ranked system, items, crafting, advancements, and more.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${localePrefix}/wiki`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function WikiRoute() {
  return <WikiPage />;
}
