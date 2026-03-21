"use client";

import { createClient } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/trading/CurrencySwitcher";
import { TradingModeToggle } from "@/components/dashboard/TradingModeToggle";

export function DashboardSidebar() {
  const t = useTranslations("dashboard.sidebar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tier, role")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(profile?.role === "admin" || profile?.tier === "professor");
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const isActive = (path: string, exact?: boolean) => {
    const fullPath = hrefWithLocale(locale, path);
    const p = pathname ?? "/";
    if (exact) return p === fullPath;
    return p === fullPath || p.startsWith(`${fullPath}/`);
  };

  const links = [
    {
      href: "/dashboard",
      label: locale === "no" ? "Hjem" : "Home",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/kurs", label: locale === "no" ? "Lær" : "Learn", icon: BookOpen },
    {
      href: "/paper-trading",
      label: locale === "no" ? "Handle" : "Trade",
      icon: TrendingUp,
    },
    {
      href: "/handelshistorikk",
      label: locale === "no" ? "Historikk" : "History",
      icon: History,
    },
    {
      href: "/dashboard/resultater",
      label: locale === "no" ? "Resultater" : "Results",
      icon: BarChart3,
    },
    {
      href: "/dashboard/auto-trade",
      label: locale === "no" ? "Auto-trade" : "Auto-trade",
      icon: Bot,
    },
    {
      href: "/profile",
      label: locale === "no" ? "Profil" : "Profile",
      icon: User,
    },
  ];

  const secondaryLinks = [
    {
      href: "/dashboard/settings",
      label: locale === "no" ? "Innstillinger" : "Settings",
      icon: Settings,
    },
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin", icon: Shield, admin: true as const }]
      : []),
  ];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push(hrefWithLocale(locale, "/innlogging"));
  };

  const l = (path: string) => hrefWithLocale(locale, path);

  const renderLink = (link: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    admin?: boolean;
  }) => {
    const fullPath = hrefWithLocale(locale, link.href);
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
              : "bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/20"
            : link.admin
              ? "text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent"
              : "text-slate-600 hover:text-[#0052FF] hover:bg-[#0052FF]/5 border border-transparent"
        }`}
      >
        {link.icon && (
          <link.icon
            className={`w-5 h-5 shrink-0 ${
              active
                ? link.admin
                  ? "text-red-600"
                  : "text-[#0052FF]"
                : "text-slate-400"
            }`}
          />
        )}
        {!collapsed && <span className="truncate">{link.label}</span>}
      </Link>
    );
  };

  return (
    <>
      <aside
        style={{ width: collapsed ? 64 : 256 }}
        className={`
          fixed inset-y-0 left-0 z-40 bg-white/70 backdrop-blur-xl border-r border-black/[0.06] transform transition-all duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:block
          hidden md:block
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div
            className={`border-b border-slate-100 flex items-center ${collapsed ? "justify-center p-4" : "justify-between p-6"}`}
          >
            <Link href={l("/")} className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0052FF] flex items-center justify-center shrink-0">
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

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {links.map(renderLink)}
            <div className="my-2 border-t border-[#E2E5EC]" />
            {secondaryLinks.map(renderLink)}
          </nav>

          <div
            className={`border-t border-slate-100 bg-slate-50/50 ${collapsed ? "p-2" : "p-4"} space-y-3`}
          >
            {!collapsed && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    {t("language")}
                  </span>
                  <LanguageSwitcher
                    layoutId="dashboard-sidebar-lang"
                    className="w-full max-w-[220px]"
                    aria-label={t("language")}
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    {t("displayCurrency")}
                  </span>
                  <CurrencySwitcher
                    variant="light"
                    layoutId="dashboard-sidebar-currency"
                    className="w-full max-w-[260px]"
                    aria-label={t("displayCurrency")}
                  />
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">
                    {locale === "no" ? "Modus" : "Mode"}
                  </span>
                  <TradingModeToggle />
                </div>
              </>
            )}
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
