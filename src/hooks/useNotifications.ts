"use client";

import { useState, useEffect } from "react";
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
} from "@/lib/notifications/push";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  category: string;
  action_url?: string;
}

/**
 * useNotifications — varsler til NotificationBell.
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie) —
 * tidligere versjon leste notifications/notification_preferences direkte
 * (alltid 0 rader) og kalte RPC mark_notifications_read (finnes ikke i
 * DB — verifisert). Alt går nå via /api/notifications (server-auth).
 *
 * Realtime-subscription er fjernet: anon-klienten mottar aldri
 * RLS-beskyttede postgres_changes, så kanalen var død kode.
 *
 * preferences/updatePreferences er fjernet — ingen konsumenter (YAGNI).
 * NotificationsTab håndteres i egen fase av browser-klient-sweepen.
 */
export function useNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications via server-autentisert API
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const json = await res.json();
      setNotifications((json.notifications ?? []) as Notification[]);
      setUnreadCount(json.unreadCount ?? 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check push subscription status
  const checkSubscription = async () => {
    if (!isPushSupported()) return;
    const subscription = await getPushSubscription();
    setIsSubscribed(!!subscription);
  };

  // Initialize
  useEffect(() => {
    setIsSupported(isPushSupported());

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    checkSubscription();
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request permission and subscribe
  const subscribe = async () => {
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === "granted") {
        const subscription = await subscribeToPush();
        setIsSubscribed(!!subscription);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error subscribing:", error);
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
      console.error("Error unsubscribing:", error);
      return false;
    }
  };

  // Mark notifications as read (alle, eller gitte ids)
  const markAsRead = async (notificationIds?: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          notificationIds ? { ids: notificationIds } : {},
        ),
      });

      if (!res.ok) throw new Error("PATCH failed");

      // Update local state
      if (notificationIds) {
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return {
    permission,
    isSubscribed,
    isSupported,
    notifications,
    unreadCount,
    loading,
    subscribe,
    unsubscribe,
    markAsRead,
    refresh: fetchNotifications,
  };
}
