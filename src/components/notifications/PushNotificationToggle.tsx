"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface PushNotificationToggleProps {
  /** User ID for tracking/logging */
  userId?: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "card";
  /** Callback when subscription changes */
  onChange?: (isSubscribed: boolean) => void;
}

/**
 * Push Notification Toggle Component
 * 
 * A toggle button for enabling/disabling push notifications.
 * Shows different states based on browser support and permission status.
 * 
 * @example
 * ```tsx
 * <PushNotificationToggle userId={user?.id} variant="card" />
 * ```
 */
export function PushNotificationToggle({
  userId = null,
  className,
  variant = "default",
  onChange,
}: PushNotificationToggleProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications(userId);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) onChange?.(false);
    } else {
      const success = await subscribe();
      if (success) onChange?.(true);
    }
  };

  // Browser doesn't support push notifications
  if (!isSupported) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-lg",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <BellOff className="w-5 h-5 text-slate-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">
            Push-varsler ikke støttet
          </p>
          <p className="text-xs text-slate-500">
            Din nettleser støtter ikke push-varsler
          </p>
        </div>
      </div>
    );
  }

  // Permission denied - show helpful message
  if (permission === "denied") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
          <BellOff className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-400">
            Push-varsler blokkert
          </p>
          <p className="text-xs text-amber-400/70">
            Endre innstillingene i nettleseren for å aktivere varsler
          </p>
        </div>
      </div>
    );
  }

  // Compact variant - just the toggle button
  if (variant === "compact") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "relative inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors",
          isSubscribed
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700",
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label={
          isSubscribed ? "Slå av push-varsler" : "Slå på push-varsler"
        }
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>
    );
  }

  // Card variant - full card layout
  if (variant === "card") {
    return (
      <div
        className={cn(
          "bg-slate-900 border border-slate-800 rounded-xl p-5",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isSubscribed
                  ? "bg-green-500/20"
                  : "bg-slate-800"
              )}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : isSubscribed ? (
                <BellRing className="w-6 h-6 text-green-400" />
              ) : (
                <Bell className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-white">Push-varsler</h3>
              <p className="text-sm text-slate-400">
                {isSubscribed
                  ? "Du mottar varsler om viktige hendelser"
                  : "Få varsler om handler, priser og mer"}
              </p>
              {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "relative w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50",
              isSubscribed ? "bg-green-500" : "bg-slate-700",
              loading && "opacity-50 cursor-not-allowed"
            )}
            aria-label={
              isSubscribed ? "Slå av push-varsler" : "Slå på push-varsler"
            }
          >
            <span
              className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm",
                isSubscribed ? "left-7" : "left-1"
              )}
            />
          </button>
        </div>

        {permission === "default" && !isSubscribed && !loading && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Klikk på bryteren for å tillate varsler fra Klarpakke. 
              Du kan endre dette når som helst i nettleserinnstillingene.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            isSubscribed ? "bg-green-500/20" : "bg-slate-800"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : isSubscribed ? (
            <BellRing className="w-5 h-5 text-green-400" />
          ) : (
            <Bell className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-white">Push-varsler</p>
          <p className="text-sm text-slate-400">
            {isSubscribed
              ? "Aktivert - du mottar varsler"
              : "Deaktivert - klikk for å aktivere"}
          </p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          isSubscribed
            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
            : "bg-blue-600 text-white hover:bg-blue-500",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          "Deaktiver"
        ) : (
          "Aktiver"
        )}
      </button>
    </div>
  );
}

export default PushNotificationToggle;
