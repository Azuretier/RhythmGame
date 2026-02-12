import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoyaltyDashboard from '@/components/loyalty/LoyaltyDashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'loyalty' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}

export default function LoyaltyPage() {
  return <LoyaltyDashboard />;
}
