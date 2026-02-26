'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  panelClassName?: string;
  position?: 'dropdown' | 'bottom-sheet' | 'center';
}

const panelAnimations = {
  dropdown: {
    initial: { opacity: 0, y: -8, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.96 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  'bottom-sheet': {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { type: 'spring' as const, damping: 28, stiffness: 300 },
  },
  center: {
    initial: { opacity: 0, y: 40, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 40, scale: 0.95 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

export default function AnimatedOverlay({
  isOpen,
  onClose,
  children,
  backdropClassName,
  panelClassName,
  position = 'dropdown',
}: AnimatedOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const animation = panelAnimations[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn('fixed inset-0 z-40 bg-black/50 backdrop-blur-sm', backdropClassName)}
          />
          <motion.div
            {...animation}
            className={cn('z-50', panelClassName)}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
