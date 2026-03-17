"use client";

import { createClient } from "@/lib/utils";
import {
  Activity,
  Bot,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cog,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Wallet,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLearningSidebar from "./DashboardLearningSidebar";

export function DashboardSidebar() {
  const t = useTranslations("dashboard.sidebar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<
    {
      id: string;
      trackId: string;
      label: string;
      description: string;
      earnedAt: string;
      icon: string;
    }[]
  >([]);
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tier")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(profile?.tier === "professor");

      const { data: progress } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("completed", true);
      if (progress) {
        setCompletedLessonIds(
          progress.map((p: { lesson_id: string }) => p.lesson_id)
        );
      }

      const { data: badges } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id);
      if (badges) {
        setEarnedBadges(
          badges.map((b: Record<string, string>) => ({
            id: b.badge_id || b.id,
            trackId: b.track_id || "",
            label: b.label || b.badge_id || "",
            description: b.description || "",
            earnedAt: b.earned_at || b.created_at || "",
            icon: b.icon || "",
          }))
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const isActive = (path: string, exact?: boolean) => {
    const fullPath = `/${locale}${path}`;
    if (exact) return pathname === fullPath;
    return (pathname ?? "/").startsWith(fullPath);
  };

  const links = [
    {
      href: "/dashboard",
      label: t("overview"),
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/auto-trade", label: t("autoTrade"), icon: Bot },
    { href: "/dashboard/portfolio", label: t("portfolio"), icon: Wallet },
    { href: "/dashboard/trading", label: t("trading"), icon: Cog },
    { href: "/konto", label: t("binanceApi"), icon: Wallet },
    { href: "/dashboard/activity", label: t("activity"), icon: Activity },
    { href: "/dashboard/tax-report", label: t("taxReport"), icon: FileText },
    {
      href: "/dashboard/guide",
      label: t("guide"),
      icon: BookOpen,
    },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: t("admin"),
            icon: Shield,
            admin: true,
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push(`/${locale}/innlogging`);
  };

  const l = (path: string) => `/${locale}${path}`;

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-20 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-colors md:bottom-6 md:right-6 md:p-4"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        style={{ width: collapsed ? 64 : 256 }}
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transform transition-all duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:block
          hidden md:block
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className={`border-b border-slate-100 flex items-center ${collapsed ? "justify-center p-4" : "justify-between p-6"}`}>
            <Link href={l("/")} className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              {!collapsed && (
                <span className="font-bold text-xl text-slate-900 tracking-tight truncate">
                  Klarpakke
                </span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              aria-label={collapsed ? "Utvid sidepanel" : "Skjul sidepanel"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Learning Sidebar – only when expanded */}
          {!collapsed && (
            <div className="px-4 py-3 overflow-hidden">
              <DashboardLearningSidebar
                userId={userId}
                completedLessonIds={completedLessonIds}
                earnedBadges={earnedBadges}
              />
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {!collapsed && (
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                {t("mainMenu")}
              </div>
            )}
            {links.map((link) => {
              const fullPath =
                link.href.startsWith("/beta") || link.href.startsWith("/admin")
                  ? `/${locale}${link.href}`
                  : `/${locale}${link.href}`;

              const active = isActive(link.href, link.exact);

              return (
                <Link
                  key={link.href}
                  href={fullPath}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-3 rounded-xl transition-all font-medium ${
                    collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
                  } ${
                    active
                      ? link.admin
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                      : link.admin
                        ? "text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent"
                        : "text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent"
                  }`}
                >
                  {link.icon && (
                    <link.icon
                      className={`w-5 h-5 shrink-0 ${
                        active
                          ? link.admin
                            ? "text-red-600"
                            : "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                  )}
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`border-t border-slate-100 bg-slate-50/50 ${collapsed ? "p-2" : "p-4"}`}>
            <button
              onClick={handleSignOut}
              title={collapsed ? t("logout") : undefined}
              className={`flex items-center gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors font-medium border border-transparent hover:border-red-100 ${
                collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
              }`}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{t("logout")}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
          role="button"
          tabIndex={0}
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              setMobileOpen(false);
            }
          }}
          aria-label={t("closeMenu")}
        />
      )}
    </>
  );
}
