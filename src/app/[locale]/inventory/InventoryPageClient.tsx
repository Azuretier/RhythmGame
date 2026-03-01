'use client';

import { useRouter } from '@/i18n/navigation';
import InventoryPanel from '@/components/inventory/InventoryPanel';

export default function InventoryPageClient() {
    const router = useRouter();

    return (
        <InventoryPanel onClose={() => router.push('/')} />
    );
}
