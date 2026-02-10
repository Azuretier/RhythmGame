import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import UpdatesPanel from '@/components/main/UpdatesPanel';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    title: locale === 'ja' ? '最新アップデート | RHYTHMIA - Azuretier' : 'Recent Updates | RHYTHMIA - Azuretier',
    description: locale === 'ja' 
      ? 'RHYTHMIAの最新機能、改善、修正を確認しよう。' 
      : 'Check out the latest features, improvements, and fixes for RHYTHMIA.',
  };
}

export default function UpdatesPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '2rem 1rem',
      background: 'linear-gradient(180deg, #000 0%, #001a33 100%)',
    }}>
      <UpdatesPanel maxItems={20} showCategories={true} />
    </main>
  );
}
