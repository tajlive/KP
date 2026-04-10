"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
import { createClient } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import {
  AlertCircle,
  Bell,
  Check,
  Info,
  Trash2,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationTray() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchNotifications(); // Refresh on any change
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;

    // Fetch latest 20 notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    if (data) {
      const notificationsData = (data as Notification[]);
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const notif = notifications.find((n) => n.id === id);
    if (notif && !notif.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));

    await supabase.from("notifications").delete().eq("id", id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "signal_executed":
        return <Zap className="w-4 h-4 text-emerald-500" />;
      case "price_alert":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "leaderboard_update":
        return <Trophy className="w-4 h-4 text-emerald-400" />;
      case "subscription_expiring":
        return <Wallet className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={trayRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-slate-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-semibold text-white">Varsler</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Marker alle som lest
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar bg-slate-900">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 flex flex-col items-center">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Du har ingen nye varsler</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- list item is clickable to mark read; delete is separate button
                    role="button"
                    tabIndex={0}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !notif.is_read) {
                        e.preventDefault();
                        markAsRead(notif.id);
                      }
                    }}
                    aria-label={notif.is_read ? "Varsel (lest)" : "Merk som lest"}
                    className={`p-4 transition-colors relative group cursor-pointer ${
                      notif.is_read
                        ? "bg-slate-900 hover:bg-slate-800/50"
                        : "bg-blue-900/10 hover:bg-blue-900/20"
                    }`}
                  >
                    {!notif.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    )}
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${notif.is_read ? "bg-slate-800" : "bg-slate-800 shadow-inner"}`}
                      >
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p
                          className={`text-sm tracking-tight ${notif.is_read ? "text-slate-200" : "text-white font-semibold"}`}
                        >
                          {notif.title}
                        </p>
                        <p
                          className={`text-xs mt-1 leading-snug ${notif.is_read ? "text-slate-400" : "text-slate-300"}`}
                        >
                          {notif.body}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: nb,
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="absolute right-3 top-4 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-800 bg-slate-900/80 text-center">
              <span className="text-[10px] text-slate-500">
                Siste {notifications.length} varsler
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
