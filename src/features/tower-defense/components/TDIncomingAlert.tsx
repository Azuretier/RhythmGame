'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { EnemyType } from '@/types/tower-defense';
import styles from './TDIncomingAlert.module.css';

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
    <div className={styles.container}>
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert) => {
          const enemyInfo = ENEMY_LABELS[alert.enemyType];
          const isBoss = alert.enemyType === 'boss';

          return (
            <motion.div
              key={alert.timestamp}
              layout
              initial={{ x: -60, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -60, opacity: 0, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              className={isBoss ? styles.alertBoss : styles.alert}
            >
              {/* Warning icon */}
              <div className={isBoss ? styles.iconWrapBoss : styles.iconWrap}>
                <AlertTriangle
                  size={16}
                  className={isBoss ? styles.iconBoss : styles.icon}
                />
              </div>

              {/* Alert content */}
              <div className={styles.content}>
                <div className={styles.incomingLabel}>Incoming</div>
                <div className={styles.messageText}>
                  <span className={styles.senderName}>
                    {alert.fromPlayerName}
                  </span>
                  {' sent '}
                  <span className={styles.enemyCountText}>
                    {alert.count}&times;
                  </span>
                  {' '}
                  <span className={styles.enemyInline}>
                    <span className={styles.enemyEmoji}>{enemyInfo?.icon}</span>
                    <span className={isBoss ? styles.bossEnemyName : undefined}>
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
