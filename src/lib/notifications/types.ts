export interface Notification {
  id: string;
  advancementId: string;
  timestamp: number;
  read: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  toggleOpen: () => void;
  close: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}
