"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { Bell, BellOff, Check, Settings } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    permission,
    isSupported,
    subscribe,
    unsubscribe,
    isSubscribed,
    markAsRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubscribe = async () => {
    await subscribe();
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
  };

  const handleMarkAllRead = () => {
    markAsRead();
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours =
      (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Nå";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}t siden`;
    } else {
      return notificationDate.toLocaleDateString("no-NO");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h3 className="font-bold text-white">Varsler</h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  title="Merk alle som lest"
                  aria-label="Merk alle varsler som lest"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <Link
                href={`/${locale}/profile/notifications`}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Innstillinger"
                aria-label="Varslingsinnstillinger"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Push Notification Status */}
          {isSupported && permission !== "denied" && (
            <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
              {isSubscribed ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-400">
                    Push-varsler aktivert
                  </span>
                  <button
                    onClick={handleUnsubscribe}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Slå av
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Få varsler på desktop
                  </span>
                  <button
                    onClick={handleSubscribe}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Aktiver
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <BellOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Ingen varsler ennå</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.action_url || "#"}
                    onClick={() =>
                      !notification.is_read && markAsRead([notification.id])
                    }
                    className={cn(
                      "block p-4 hover:bg-white/5 transition-colors",
                      !notification.is_read && "bg-blue-500/5",
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 shrink-0",
                          !notification.is_read
                            ? "bg-blue-500"
                            : "bg-slate-700",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            !notification.is_read
                              ? "text-white"
                              : "text-slate-400",
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-xs text-slate-600 mt-1.5">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/5 text-center">
              <Link
                href={`/${locale}/varsler`}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Se alle varsler →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
