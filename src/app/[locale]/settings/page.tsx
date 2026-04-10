import { Metadata } from 'next';
import SettingsPageContent from '@/features/settings/components/SettingsPageContent';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: '設定 | Azuretier',
    en: 'Settings | Azuretier',
    th: 'การตั้งค่า | Azuretier',
    es: 'Configuración | Azuretier',
    fr: 'Paramètres | Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'プロフィール、スキン、テーマ、言語の設定を変更します。',
    en: 'Customize your profile, skin, theme, and language settings.',
    th: 'ปรับแต่งโปรไฟล์ สกิน ธีม และการตั้งค่าภาษา',
    es: 'Personaliza tu perfil, skin, tema y configuración de idioma.',
    fr: 'Personnalisez votre profil, skin, thème et paramètres de langue.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/settings`,
    },
  };
}

export default function SettingsRoute() {
  return <SettingsPageContent />;
}
