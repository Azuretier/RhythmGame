import { Metadata } from 'next';
import TextEditor from '@/components/editor/TextEditor';

const baseUrl = 'https://azuretier.net';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localePrefix = locale === 'ja' ? '' : `/${locale}`;

  const titles: Record<string, string> = {
    ja: 'テキストエディタ | Azuretier',
    en: 'Text Editor | Azuretier',
  };

  const descriptions: Record<string, string> = {
    ja: 'ゼロインデックス行番号を備えたVS Code風テキストエディタ。',
    en: 'A VS Code-inspired text editor with zero-indexed line numbers.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: `${baseUrl}${localePrefix}/editor`,
      type: 'website',
    },
  };
}

export default function EditorPage() {
  return <TextEditor />;
}
