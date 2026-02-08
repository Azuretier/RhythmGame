'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import { NotificationProvider } from '@/lib/notifications';

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode='wait'>
      <ThemeProvider attribute='class' defaultTheme='dark' enableSystem>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </AnimatePresence>
  );
}