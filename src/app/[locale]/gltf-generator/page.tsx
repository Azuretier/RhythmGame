import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GltfGenerator from '@/components/gltf-generator/GltfGenerator';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gltfGenerator' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}

export default function GltfGeneratorPage() {
  return <GltfGenerator />;
}
