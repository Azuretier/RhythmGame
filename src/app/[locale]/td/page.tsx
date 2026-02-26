'use client';

import { useLocale } from 'next-intl';
import TowerDefense from '@/components/td/TowerDefense';

export default function TowerDefensePage() {
  const locale = useLocale();
  return <TowerDefense locale={locale} />;
}
