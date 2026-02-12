import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import UpdatesPage from '@/components/main/UpdatesPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const updates = (messages as Record<string, Record<string, string>>).updates;

  return {
    title: `${updates?.pageTitle || 'Development Updates'} | RHYTHMIA - Azuretier`,
    description: updates?.pageSubtitle || 'Follow the latest changes and improvements to RHYTHMIA',
  };
}

export default function UpdatesRoute() {
  return <UpdatesPage />;
}
