"use client";

import { useState, useEffect, useCallback } from "react";

// VAPID public key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// Service worker path
const SW_PATH = "/push-sw.js";

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export interface UsePushNotificationsReturn {
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Current notification permission status */
  permission: PushPermission;
  /** Whether user is currently subscribed */
  isSubscribed: boolean;
  /** Whether an operation is in progress */
  loading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Check current subscription status */
  checkSubscription: () => Promise<void>;
  /** Request permission without subscribing */
  requestPermission: () => Promise<PushPermission>;
}

/**
 * Hook for managing Web Push notifications
 * 
 * @param userId - Current user ID (optional, for logging)
 * @returns Push notification state and controls
 * 
 * @example
 * ```tsx
 * function NotificationToggle({ userId }: { userId: string }) {
 *   const { isSupported, isSubscribed, subscribe, unsubscribe, permission } = usePushNotifications(userId);
 *   
 *   if (!isSupported) return <div>Push not supported</div>;
 *   
 *   return (
 *     <button onClick={isSubscribed ? unsubscribe : subscribe}>
 *       {isSubscribed ? "Unsubscribe" : "Subscribe"}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePushNotifications(
  userId: string | null = null
): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push is supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission as PushPermission);
      } else {
        setPermission("unsupported");
      }
    };

    checkSupport();
  }, []);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setIsSubscribed(false);
    }
  }, [isSupported]);

  // Initial subscription check
  useEffect(() => {
    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported, checkSubscription]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<PushPermission> => {
    if (!isSupported) {
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      return result as PushPermission;
    } catch (err) {
      console.error("Error requesting permission:", err);
      setError("Kunne ikke be om tillatelse for varsler");
      return "denied";
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push-varsler støttes ikke i denne nettleseren");
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError("VAPID-nøkkel mangler i konfigurasjonen");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // First, ensure service worker is registered
      const registration = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

      // Request permission if not granted
      const currentPermission = await requestPermission();
      if (currentPermission !== "granted") {
        setError("Du må godta varsler for å fortsette");
        setLoading(false);
        return false;
      }

      // Subscribe via PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Send subscription to server
      const success = await saveSubscription(subscription);

      if (success) {
        setIsSubscribed(true);
        setError(null);
      } else {
        // Rollback subscription if server save failed
        await subscription.unsubscribe();
        setError("Kunne ikke lagre abonnement på serveren");
      }

      return success;
    } catch (err) {
      console.error("Subscribe error:", err);
      setError(err instanceof Error ? err.message : "Ukjent feil ved abonnement");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        setLoading(false);
        return true;
      }

      // Delete from server first
      const endpoint = subscription.endpoint;
      await deleteSubscription(endpoint);

      // Then unsubscribe locally
      const result = await subscription.unsubscribe();

      if (result) {
        setIsSubscribed(false);
      }

      return result;
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError(err instanceof Error ? err.message : "Ukjent feil ved avmelding");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
    requestPermission,
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray as Uint8Array;
}

/**
 * Save subscription to server
 */
async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    return response.ok;
  } catch (err) {
    console.error("Error saving subscription:", err);
    return false;
  }
}

/**
 * Delete subscription from server
 */
async function deleteSubscription(endpoint: string): Promise<void> {
  try {
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch (err) {
    console.error("Error deleting subscription:", err);
  }
}

export default usePushNotifications;
