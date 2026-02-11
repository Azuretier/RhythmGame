import { Metadata } from 'next';
import UpdatesPage from '@/components/main/UpdatesPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'ja' ? '開発アップデート | RHYTHMIA - Azuretier' : 'Development Updates | RHYTHMIA - Azuretier',
    description: locale === 'ja'
      ? 'RHYTHMIAの最新機能、改善、修正を確認しよう。'
      : 'Check out the latest features, improvements, and fixes for RHYTHMIA.',
  };
}

export default function UpdatesRoute() {
  return <UpdatesPage />;
}
