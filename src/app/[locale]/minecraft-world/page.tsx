import { Metadata } from 'next';
import MinecraftWorldPageContent from '@/features/minecraft-world/components/MinecraftWorldPageContent';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'マインクラフトワールド | RHYTHMIA - Azuretier',
    en: 'Minecraft World | RHYTHMIA - Azuretier',
    th: 'โลกมายคราฟ | RHYTHMIA - Azuretier',
    es: 'Mundo Minecraft | RHYTHMIA - Azuretier',
    fr: 'Monde Minecraft | RHYTHMIA - Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'マインクラフト風3Dボクセルワールドを探索しよう。',
    en: 'Explore a Minecraft-style 3D voxel world.',
    th: 'สำรวจโลกว็อกเซล 3D สไตล์มายคราฟ',
    es: 'Explora un mundo vóxel 3D estilo Minecraft.',
    fr: 'Explorez un monde voxel 3D style Minecraft.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/minecraft-world`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function MinecraftWorldPage() {
  return <MinecraftWorldPageContent />;
}
