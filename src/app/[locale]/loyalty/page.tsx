import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoyaltyDashboard from '@/components/loyalty/LoyaltyDashboard';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;
  const t = await getTranslations({ locale, namespace: 'loyalty' });

  const title = t('meta.title');
  const description = t('meta.description');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${localePrefix}/loyalty`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function LoyaltyPage() {
  return <LoyaltyDashboard />;
}
