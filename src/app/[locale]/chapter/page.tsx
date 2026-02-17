'use client';

import { useRouter } from 'next/navigation';
import { ChapterPlayer } from '@/components/rhythmia/chapter-player';
import type { Chapter } from '@/components/rhythmia/chapter-player';
import prologueData from '@/data/chapters/prologue.json';

export default function ChapterPage() {
  const router = useRouter();
  const chapter = prologueData as Chapter;

  return (
    <ChapterPlayer
      chapter={chapter}
      onComplete={() => router.push('/')}
      onExit={() => router.push('/')}
    />
  );
}
