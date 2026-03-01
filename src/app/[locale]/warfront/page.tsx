'use client';

import dynamic from 'next/dynamic';

const WarfrontGame = dynamic(
  () => import('@/components/warfront/WarfrontGame'),
  { ssr: false },
);

export default function WarfrontPage() {
  return <WarfrontGame />;
}
