'use client';

import dynamic from 'next/dynamic';

const FPSArena = dynamic(() => import('@/components/fps-arena/FPSArena'), { ssr: false });

export default function FPSArenaPage() {
    return <FPSArena />;
}
