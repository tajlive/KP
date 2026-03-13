'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/utils';
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
} from '@/lib/notifications/push';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  category: string;
  action_url?: string;
}

interface NotificationPreferences {
  price_alerts: boolean;
  trade_executed: boolean;
  course_reminder: boolean;
  marketing_emails: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  // Initialize
  useEffect(() => {
    setIsSupported(isPushSupported());
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    checkSubscription();
    fetchNotifications();
    fetchPreferences();
  }, []);

  // Check push subscription status
  const checkSubscription = async () => {
    if (!isPushSupported()) return;
    
    const subscription = await getPushSubscription();
    setIsSubscribed(!!subscription);
  };

  // Fetch notifications from server
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as unknown as Notification[]);
      
      // Calculate unread count
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch preferences
  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setPreferences((data as unknown as NotificationPreferences | null) || {
        price_alerts: true,
        trade_executed: true,
        course_reminder: true,
        marketing_emails: false,
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request permission and subscribe
  const subscribe = async () => {
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const subscription = await subscribeToPush();
        setIsSubscribed(!!subscription);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  };

  // Unsubscribe
  const unsubscribe = async () => {
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationIds?: string[]) => {
    try {
      const { error } = await (supabase.rpc as any)('mark_notifications_read', {
        p_notification_ids: notificationIds || null,
      });

      if (error) throw error;

      // Update local state
      if (notificationIds) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Update preferences
  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ ...preferences, ...newPrefs } as any);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  };

  // Real-time subscription for new notifications
  useEffect(() => {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    permission,
    isSubscribed,
    isSupported,
    notifications,
    unreadCount,
    preferences,
    loading,
    subscribe,
    unsubscribe,
    markAsRead,
    updatePreferences,
    refresh: fetchNotifications,
  };
}
