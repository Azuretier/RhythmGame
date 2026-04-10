import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import UpdatesPageContent from '@/features/updates/components/UpdatesPageContent';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;
  const messages = await getMessages({ locale });
  const updates = (messages as Record<string, Record<string, string>>).updates;

  const title = `${updates?.pageTitle || 'Development Updates'} | RHYTHMIA - Azuretier`;
  const description = updates?.pageSubtitle || 'Follow the latest changes and improvements to RHYTHMIA';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${localePrefix}/updates`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function UpdatesRoute() {
  return <UpdatesPageContent />;
}
