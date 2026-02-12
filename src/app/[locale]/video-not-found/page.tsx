import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import VideoNotFound from '@/components/video-not-found/VideoNotFound';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const vn = (messages as Record<string, Record<string, string>>).videoNotFound;

  return {
    title: vn?.metaTitle || 'Video Not Found | RHYTHMIA',
    description: vn?.metaDescription || 'This video is not available yet. Join the community and help shape RHYTHMIA!',
  };
}

export default function VideoNotFoundRoute() {
  return <VideoNotFound />;
}
