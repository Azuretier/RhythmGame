'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Notification, NotificationContextType } from './types';
import {
  initAuth,
  loadFromFirestore,
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  mergeStates,
  syncToFirestore,
} from '@/lib/advancements/firestore';
import { loadAdvancementState, saveAdvancementState } from '@/lib/advancements/storage';
import { checkNewAdvancements } from '@/lib/advancements/storage';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Initialize auth and sync on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const user = await initAuth();
        if (cancelled || !user) {
          setIsLoading(false);
          return;
        }

        // Merge local + remote advancement state
        const local = loadAdvancementState();
        const remote = await loadFromFirestore();

        if (remote) {
          const merged = mergeStates(local, remote);
          const checked = checkNewAdvancements(merged);
          saveAdvancementState(checked);
          await syncToFirestore(checked);
        } else {
          // First time: push local to Firestore
          await syncToFirestore(local);
        }

        // Load notification history
        const entries = await loadNotifications(50);
        if (!cancelled) {
          setNotifications(
            entries.map((e) => ({
              id: e.id,
              advancementId: e.advancementId,
              timestamp: e.timestamp.toMillis(),
              read: e.read,
            }))
          );
        }
      } catch (error) {
        console.error('[Notifications] Init failed:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        isLoading,
        toggleOpen,
        close,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Add a notification entry to the context (called after a new advancement is unlocked).
 * This is a module-level helper that dispatches to the provider.
 */
let addNotificationCallback: ((n: Notification) => void) | null = null;

export function registerNotificationCallback(cb: (n: Notification) => void) {
  addNotificationCallback = cb;
}

export function dispatchNotification(n: Notification) {
  addNotificationCallback?.(n);
}
