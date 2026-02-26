'use client';

import React, { useState } from 'react';
import { TDLayoutCell } from '@/types/tower-defense';
import TDGridEditor from './TDGridEditor';
import TDGame from './TDGame';

type Screen = 'editor' | 'game';

interface TowerDefenseProps {
  locale: string;
}

export default function TowerDefense({ locale }: TowerDefenseProps) {
  const [screen, setScreen] = useState<Screen>('editor');
  const [layout, setLayout] = useState<TDLayoutCell[][] | null>(null);

  const handleStart = (savedLayout: TDLayoutCell[][]) => {
    setLayout(savedLayout);
    setScreen('game');
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const handleExit = () => {
    setScreen('editor');
  };

  if (screen === 'game' && layout) {
    return <TDGame layout={layout} onExit={handleExit} locale={locale} />;
  }

  return <TDGridEditor onStart={handleStart} onBack={handleBack} locale={locale} />;
}
