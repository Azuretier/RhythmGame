import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import WikiPage from '@/components/wiki/WikiPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const wiki = (messages as Record<string, Record<string, Record<string, string>>>).wiki;

  return {
    title: wiki?.meta?.title || 'Wiki | RHYTHMIA - Azuretier',
    description: wiki?.meta?.description || 'The complete RHYTHMIA wiki. Game modes, worlds, ranked system, items, crafting, advancements, and more.',
  };
}

export default function WikiRoute() {
  return <WikiPage />;
}
