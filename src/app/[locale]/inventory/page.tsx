import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import InventoryPageClient from './InventoryPageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'inventory' });

    return {
        title: t('meta.title'),
        description: t('meta.description'),
    };
}

export default function InventoryPage() {
    return <InventoryPageClient />;
}
