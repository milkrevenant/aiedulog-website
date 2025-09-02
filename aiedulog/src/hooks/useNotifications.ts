import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationCategory, NotificationChannel } from '@/lib/services/notification-service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'urgent';
  link?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  category: NotificationCategory;
  channels: NotificationChannel[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  digestFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  maxNotificationsPerHour: number;
  scheduleNotifications: boolean;
  contentNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
  isActive: boolean;
}

export interface UseNotificationsOptions {
  limit?: number;
  category?: NotificationCategory;
  unreadOnly?: boolean;
  realtime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  preferences: NotificationPreferences[];
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  archiveNotification: (id: string) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  updatePreferences: (category: NotificationCategory, prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  
  // Real-time
  isConnected: boolean;
  connectionError: string | null;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    limit = 20,
    category,
    unreadOnly = false,
    realtime = true,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs
  const offsetRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // Load notifications
  const loadNotifications = useCallback(async (append = false) => {
    try {
      setError(null);
      if (!append) {
        setLoading(true);
        offsetRef.current = 0;
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offsetRef.current.toString(),
        unread_only: unreadOnly.toString()
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load notifications');
      }

      if (append) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }

      setUnreadCount(data.unreadCount);
      setHasMore(data.notifications.length === limit);
      offsetRef.current += data.notifications.length;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, category, unreadOnly]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadNotifications(true);
  }, [hasMore, loading, loadNotifications]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await loadNotifications(false);
  }, [loadNotifications]);

  // Mark as read
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark all as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      
      return true;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive notification');
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      return true;
    } catch (err) {
      console.error('Error archiving notification:', err);
      return false;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete notification');
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      return true;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, []);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preferences');
      }

      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (
    category: NotificationCategory,
    prefs: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, preferences: prefs })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update preferences');
      }

      // Update local state
      setPreferences(prev =>
        prev.map(p => p.category === category ? { ...p, ...prefs } : p)
      );
      
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      return false;
    }
  }, []);

  // Set up real-time connection
  useEffect(() => {
    if (!realtime) return;

    const connectRealtime = () => {
      try {
        const eventSource = new EventSource('/api/notifications/realtime');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
          console.log('Real-time notifications connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'notification') {
              // Add new notification to state
              setNotifications(prev => [data.data, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else if (data.type === 'connected') {
              setIsConnected(true);
              setConnectionError(null);
            } else if (data.type === 'heartbeat') {
              // Keep connection alive
            }
          } catch (err) {
            console.error('Error parsing real-time message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('Real-time connection error:', err);
          setIsConnected(false);
          setConnectionError('Connection error');
          
          // Reconnect after 5 seconds
          setTimeout(() => {
            if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
              connectRealtime();
            }
          }, 5000);
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          console.log('Real-time notifications disconnected');
        };

      } catch (err) {
        console.error('Error setting up real-time connection:', err);
        setConnectionError('Failed to connect');
      }
    };

    connectRealtime();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [realtime]);

  // Set up auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const startAutoRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        await refresh();
        startAutoRefresh();
      }, refreshInterval);
    };

    startAutoRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Set up Supabase real-time subscription (alternative to SSE)
  useEffect(() => {
    if (realtime) {
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        }, (payload) => {
          const newNotification = payload.new as any;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [realtime, supabase]);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications, loadPreferences]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    preferences,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    updatePreferences,
    isConnected,
    connectionError
  };
}