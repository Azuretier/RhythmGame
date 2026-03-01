'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { EnemyType } from '@/types/tower-defense';
import { cn } from '@/lib/utils';

const ENEMY_LABELS: Record<EnemyType, { label: string; icon: string }> = {
  grunt: { label: 'Grunts', icon: '🐷' },
  fast: { label: 'Chickens', icon: '🐔' },
  swarm: { label: 'Swarm', icon: '🐰' },
  flying: { label: 'Flyers', icon: '🐝' },
  healer: { label: 'Healers', icon: '🐱' },
  tank: { label: 'Tank', icon: '🐄' },
  shield: { label: 'Shield', icon: '🐺' },
  boss: { label: 'Boss', icon: '🐴' },
};

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3000;

interface AlertData {
  fromPlayerName: string;
  enemyType: EnemyType;
  count: number;
  timestamp: number;
}

interface TDIncomingAlertProps {
  alerts: AlertData[];
}

export default function TDIncomingAlert({ alerts }: TDIncomingAlertProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<AlertData[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const prevLenRef = useRef(0);

  // When new alerts arrive, add them to visible list and schedule auto-dismiss
  useEffect(() => {
    if (alerts.length <= prevLenRef.current) {
      prevLenRef.current = alerts.length;
      return;
    }

    const newAlerts = alerts.slice(prevLenRef.current);
    prevLenRef.current = alerts.length;

    setVisibleAlerts((prev) => {
      const combined = [...newAlerts, ...prev];
      // Keep only MAX_VISIBLE
      return combined.slice(0, MAX_VISIBLE);
    });

    // Schedule auto-dismiss for each new alert
    for (const alert of newAlerts) {
      const timer = setTimeout(() => {
        setVisibleAlerts((prev) =>
          prev.filter((a) => a.timestamp !== alert.timestamp)
        );
        timersRef.current.delete(alert.timestamp);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(alert.timestamp, timer);
    }
  }, [alerts]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <div className="absolute top-20 right-4 z-30 flex flex-col gap-2 pointer-events-none w-[240px]">
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert) => {
          const enemyInfo = ENEMY_LABELS[alert.enemyType];
          const isBoss = alert.enemyType === 'boss';

          return (
            <motion.div
              key={alert.timestamp}
              layout
              initial={{ x: 100, opacity: 0, scale: 0.9 }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
                boxShadow: [
                  '0 0 0px rgba(239, 68, 68, 0)',
                  '0 0 16px rgba(239, 68, 68, 0.4)',
                  '0 0 8px rgba(239, 68, 68, 0.2)',
                ],
              }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                boxShadow: { duration: 0.8, repeat: 1 },
              }}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl pointer-events-auto',
                'bg-slate-900/[0.95] backdrop-blur-xl',
                isBoss
                  ? 'border-2 border-red-500/70'
                  : 'border border-red-500/40'
              )}
            >
              {/* Warning icon */}
              <div
                className={cn(
                  'flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg',
                  isBoss ? 'bg-red-500/25' : 'bg-orange-500/15'
                )}
              >
                <AlertTriangle
                  size={16}
                  className={isBoss ? 'text-red-400' : 'text-orange-400'}
                />
              </div>

              {/* Alert content */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">
                  Incoming
                </div>
                <div className="text-xs text-slate-200 leading-tight">
                  <span className="font-bold text-slate-100">
                    {alert.fromPlayerName}
                  </span>
                  {' sent '}
                  <span className="font-bold">
                    {alert.count}×
                  </span>
                  {' '}
                  <span className="inline-flex items-center gap-0.5">
                    <span>{enemyInfo?.icon}</span>
                    <span className={isBoss ? 'text-red-300 font-bold' : ''}>
                      {enemyInfo?.label ?? alert.enemyType}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
