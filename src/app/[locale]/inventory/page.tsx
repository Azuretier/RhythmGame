import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import InventoryPageContent from '@/features/inventory/components/InventoryPageContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'inventory' });

    return {
        title: t('meta.title'),
        description: t('meta.description'),
    };
}

export default function InventoryPage() {
    return <InventoryPageContent />;
}
