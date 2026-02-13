import { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import VideoNotFound from '@/components/video-not-found/VideoNotFound';
import forYouConfig from '../../../../for-you.config.json';

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
  const videos = forYouConfig.videos
    .filter((v) => v.url)
    .map((v) => ({ id: v.id, title: v.title, category: v.category, url: v.url }));

  return <VideoNotFound videos={videos} youtubeChannel={forYouConfig.youtubeChannel} />;
}
