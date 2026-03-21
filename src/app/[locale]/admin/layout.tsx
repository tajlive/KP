"use client";

import { isEmailInAdminFallbackList } from "@/lib/admin/admin-allowlist.shared";
import { createClient } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  DollarSign,
  FlaskConical,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Server,
  Settings,
  Sparkles,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // useLocale() from next-intl — pathname with as-needed has no prefix for default (no), so parsing pathname would give "admin" as first segment
  const rawLocale = useLocale();
  const locale = SUPPORTED_LOCALES.includes(
    rawLocale as (typeof SUPPORTED_LOCALES)[number],
  )
    ? rawLocale
    : "no";

  useEffect(() => {
    const checkAdmin = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 500; // ms

      try {
        console.info(
          `[Admin Layout] Checking admin access (attempt ${retryCount + 1})...`,
        );
        const supabase = createClient();

        // First try to get session (more reliable than getUser)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[Admin Layout] Session error:", sessionError);
        }

        // If no session, try getUser as fallback
        let user = session?.user;
        if (!user) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          user = authUser ?? undefined;
        }

        if (!user) {
          console.info("[Admin Layout] No user found");
          if (retryCount < MAX_RETRIES) {
            console.info(`[Admin Layout] Retrying in ${RETRY_DELAY}ms...`);
            setTimeout(() => checkAdmin(retryCount + 1), RETRY_DELAY);
            return;
          }
          console.info("[Admin Layout] Redirecting to login");
          const supportedLocales = ["no", "en", "th", "zh"];
          const safeLocale = supportedLocales.includes(locale) ? locale : "no";
          router.push(
            `/${safeLocale}/innlogging?error=admin_auth_required&next=${encodeURIComponent(pathname ?? "/")}`,
          );
          return;
        }

        console.info("[Admin Layout] User found:", user.email);
        setUserEmail(user.email || "");

        // Fallback allowlist (synk med server: env ADMIN_EMAIL_ALLOWLIST + verify-admin-access)
        const isWhitelisted = isEmailInAdminFallbackList(user.email);

        // Check role in public.profiles
        const { data: userData, error } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("[Admin Layout] Profile fetch error:", error);
        }

        console.info(
          "[Admin Layout] User role:",
          userData?.role,
          "| Whitelisted:",
          isWhitelisted,
        );

        // Allow access if either role is admin OR email is whitelisted
        const hasAdminAccess = userData?.role === "admin" || isWhitelisted;

        if (!hasAdminAccess) {
          console.info(
            "[Admin Layout] User is not admin, redirecting to dashboard",
          );
          router.push(`/${locale}/dashboard?error=not_admin`);
          return;
        }

        // If whitelisted but role is not admin, try to update it
        if (isWhitelisted && userData?.role !== "admin") {
          console.info(
            "[Admin Layout] User whitelisted but role not set, updating...",
          );
          await supabase
            .from("user_profiles")
            .update({ role: "admin", updated_at: new Date().toISOString() })
            .eq("id", user.id);
        }

        console.info("[Admin Layout] Admin access granted");
        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error("[Admin Layout] Unexpected error:", err);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => checkAdmin(retryCount + 1), RETRY_DELAY);
          return;
        }
        router.push(`/${locale}/innlogging?error=admin_error`);
      }
    };

    checkAdmin();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const navSections: {
    title: string;
    items: { href: string; label: string; icon: LucideIcon }[];
  }[] = [
    {
      title: t("nav.sectionOverview"),
      items: [
        {
          href: `/${locale}/admin/analytics`,
          label: t("nav.analytics"),
          icon: BarChart3,
        },
        {
          href: `/${locale}/admin/campaign`,
          label: t("nav.campaign"),
          icon: Megaphone,
        },
        {
          href: `/${locale}/admin/monetization`,
          label: t("nav.monetization"),
          icon: DollarSign,
        },
      ],
    },
    {
      title: t("nav.sectionUsers"),
      items: [
        {
          href: `/${locale}/admin/users`,
          label: t("users"),
          icon: UserCog,
        },
        {
          href: `/${locale}/admin/students`,
          label: t("students"),
          icon: Users,
        },
      ],
    },
    {
      title: t("nav.sectionProduct"),
      items: [
        {
          href: `/${locale}/admin/ab-tests`,
          label: t("nav.abTests"),
          icon: FlaskConical,
        },
        {
          href: `/${locale}/admin/auto-trading`,
          label: t("nav.autoTrading"),
          icon: Bot,
        },
        {
          href: `/${locale}/admin/auto-trading/sessions`,
          label: t("nav.tradingSessions"),
          icon: Activity,
        },
        {
          href: `/${locale}/admin/sync-status`,
          label: t("tradeSync"),
          icon: RefreshCw,
        },
      ],
    },
    {
      title: t("nav.sectionSystem"),
      items: [
        {
          href: `/${locale}/admin/system`,
          label: t("system"),
          icon: Server,
        },
        {
          href: `/${locale}/admin/settings`,
          label: t("settings"),
          icon: Settings,
        },
        {
          href: `/${locale}/admin/v2`,
          label: t("nav.adminV2"),
          icon: Sparkles,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar - Desktop: always visible, Mobile: conditional */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-200 lg:transform-none ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="bg-blue-600 rounded p-1">🛡️</span>
            Admin
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const pathWithoutLocale =
                    (pathname ?? "").replace(/^\/(no|en|th|zh)/, "") || "/";
                  const hrefWithoutLocale =
                    item.href.replace(/^\/(no|en|th|zh)/, "") || "/";
                  const isActive = pathWithoutLocale === hrefWithoutLocale;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? "bg-blue-600/10 text-blue-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logg ut - nederst i sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="px-4 py-2">
            <p className="text-xs text-slate-500">{t("loggedInAs")}</p>
            <p className="text-sm text-slate-300 truncate">{userEmail}</p>
          </div>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push(`/${locale}/innlogging`);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-yellow-600 text-white font-semibold rounded-full hover:bg-yellow-700 text-sm w-full transition-colors min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          role="button"
          tabIndex={0}
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              setMobileMenuOpen(false);
            }
          }}
          aria-label="Lukk meny"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
