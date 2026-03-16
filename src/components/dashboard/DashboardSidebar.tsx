"use client";

import { createClient } from "@/lib/utils";
import {
  Activity,
  Bot,
  BookOpen,
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
import { useEffect, useState } from "react";
import DashboardLearningSidebar from "./DashboardLearningSidebar";

export function DashboardSidebar() {
  const t = useTranslations("dashboard.sidebar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("tier")
            .eq("user_id" as unknown, user.id)
            .maybeSingle();
          // Note: tier is enum 'free' | 'student' | 'master' | 'phd' | 'professor'
          // 'professor' is considered admin-level
          setIsAdmin(profile?.tier === "professor");
        }
      } catch {
        // Silently fail - user is not admin
      }
    };
    checkAdmin();
  }, []);

  const isActive = (path: string) => (pathname ?? "/").endsWith(path);

  const links = [
    {
      href: "/dashboard",
      label: t("overview"),
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/auto-trade", label: t("autoTrade") || "Auto-trading", icon: Bot },
    { href: "/dashboard/portfolio", label: t("portfolio"), icon: Wallet },
    { href: "/dashboard/trading", label: t("trading") || "Trading", icon: Cog },
    { href: "/konto", label: t("binanceApi"), icon: Wallet },
    { href: "/dashboard/activity", label: t("activity"), icon: Activity },
    { href: "/dashboard/tax-report", label: t("taxReport"), icon: FileText },
    {
      href: "/dashboard/guide",
      label: locale === "no" ? "Kom i gang" : "Get started",
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
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-colors"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:block
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-8 border-b border-slate-100">
            <Link href={l("/")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">
                Klarpakke
              </span>
            </Link>
          </div>

          {/* Learning Sidebar – KLA-75 */}
          <div className="px-6 py-4">
            <DashboardLearningSidebar
              userId={""} // Hent fra auth
              completedLessonIds={[]}
              earnedBadges={[]}
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-4">
              {locale === "no" ? "Hovedmeny" : "Main menu"}
            </div>
            {links.map((link) => {
              const fullPath =
                link.href.startsWith("/beta") || link.href.startsWith("/admin")
                  ? `/${locale}${link.href}`
                  : `/${locale}${link.href}`;

              // Check exact match for dashboard, prefix match for others
              const active = link.exact
                ? pathname === fullPath
                : (pathname ?? "/").startsWith(fullPath);

              return (
                <Link
                  key={link.href}
                  href={fullPath}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    active
                      ? link.admin
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                      : link.admin
                        ? "text-slate-600 hover:text-red-600 hover:bg-red-50"
                        : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {link.icon && (
                    <link.icon
                      className={`w-5 h-5 ${active ? (link.admin ? "text-red-600" : "text-blue-600") : "text-slate-400 group-hover:text-current"}`}
                    />
                  )}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors font-medium border border-transparent hover:border-red-100"
            >
              <LogOut className="w-5 h-5" />
              <span>{locale === "no" ? "Logg ut" : "Log out"}</span>
            </button>
          </div>
        </div>
      </div>

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
          aria-label="Lukk meny"
        />
      )}
    </>
  );
}
