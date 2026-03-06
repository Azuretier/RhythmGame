import { Metadata } from 'next';
import ShopPage from '@/components/shop/ShopPage';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const title = locale === 'ja' ? 'ショップ — azuretier.net' : 'Shop — azuretier.net';
  const description = locale === 'ja'
    ? 'コスメアイテムでスタイルをカスタマイズ。永遠の結晶、バトルパス、プレミアムスキン。'
    : 'Customize your style with cosmetic items. Eternity Crystals, Battle Pass, Premium Skins.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${localePrefix}/shop`,
      images: [{ url: `${baseUrl}/rhythmia.png`, width: 1200, height: 630 }],
    },
  };
}

export default function ShopRoute() {
  return <ShopPage />;
}
