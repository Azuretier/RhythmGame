'use client';

import { useRouter } from '@/i18n/navigation';
import InventoryPanel from '@/features/inventory/components/InventoryPanel';

export default function InventoryPageContent() {
    const router = useRouter();

    return (
        <InventoryPanel onClose={() => router.push('/')} />
    );
}
