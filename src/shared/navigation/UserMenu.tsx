"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  User,
  Settings,
  LogOut,
  History,
  Trophy,
  BarChart3,
  Globe,
  BookOpen,
  Zap,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { useTheme } from "@/shared/theme";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  DASHBOARD_USER_MENU_NAV,
  isDashboardSidebarLinkActive,
  type DashboardSidebarLabelKey,
} from "@/lib/navigation/config";
import { useActiveTraderSessions } from "./use-active-trader-sessions";
import { isEmailInAdminFallbackList } from "@/lib/admin/admin-allowlist.shared";

const SECONDARY_ICONS: Partial<
  Record<DashboardSidebarLabelKey, React.ComponentType<{ className?: string }>>
> = {
  history: History,
  results: Trophy,
  analysis: BarChart3,
  market: Globe,
  learn: BookOpen,
  pilot: Zap,
};

const itemClass =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const itemIdle =
  "text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary";
const itemActive = "bg-kp-brand/10 text-kp-brand";

function TraderDot() {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex h-3 w-3"
      aria-hidden
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kp-success opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-kp-bg-secondary bg-kp-success" />
    </span>
  );
}

/**
 * Én samlet kontomeny i TopNav: avatar-knapp som åpner bottom sheet på mobil
 * og dropdown på desktop. Erstatter de separate Innstillinger-/Profil-/Tema-
 * knappene og den gamle «Mer»-dropdownen.
 */
export function UserMenu() {
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const t = useTranslations("dashboard.sidebar");
  const tTheme = useTranslations("components.themeToggle");
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const sessions = useActiveTraderSessions();

  const hasActiveTrader = sessions.length > 0;

  // AuthContext kan mangle bruker klient-side (sesjonen lever i HttpOnly-
  // cookies). /api/auth/me er den server-verifiserte kilden til e-post.
  const [serverEmail, setServerEmail] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { email?: string | null } | null } | null) => {
        if (!cancelled && data?.user?.email) {
          setServerEmail(data.user.email);
        }
      })
      .catch(() => {
        // Ingen e-post tilgjengelig — menyen viser nøytralt ikon.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const email = user?.email ?? serverEmail ?? "";
  const initial = email ? email[0].toUpperCase() : null;
  const isAdmin = isEmailInAdminFallbackList(email);

  const isActive = (href: string) =>
    isDashboardSidebarLinkActive(pathname, locale, href);

  const handleSignOut = async () => {
    setOpen(false);
    // Server-side logout først — klient-signOut alene er en stille no-op
    // når sesjonen kun lever i HttpOnly-cookies.
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Nettverksfeil — prøver likevel å rydde klient-state og sende hjem.
    }
    await signOut();
    router.push(hrefWithLocale(locale, "/"));
    router.refresh();
  };

  const themeToggle = (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="text-sm font-medium text-kp-text-secondary">
        {tTheme("toggleTheme")}
      </span>
      <div className="flex items-center rounded-lg border border-kp-border p-0.5">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label={tTheme("light")}
          aria-pressed={resolvedTheme === "light"}
          className={`rounded-md p-1.5 transition-colors ${
            resolvedTheme === "light"
              ? "bg-kp-brand/10 text-kp-brand"
              : "text-kp-text-secondary hover:text-kp-text-primary"
          }`}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label={tTheme("dark")}
          aria-pressed={resolvedTheme === "dark"}
          className={`rounded-md p-1.5 transition-colors ${
            resolvedTheme === "dark"
              ? "bg-kp-brand/10 text-kp-brand"
              : "text-kp-text-secondary hover:text-kp-text-primary"
          }`}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const avatarButton = (
    <>
      <Avatar className="h-9 w-9 border border-kp-border">
        <AvatarFallback className="bg-kp-brand/10 text-sm font-semibold text-kp-brand">
          {initial ?? <User className="h-4 w-4" aria-hidden />}
        </AvatarFallback>
      </Avatar>
      {hasActiveTrader && <TraderDot />}
    </>
  );

  const secondaryLinks = DASHBOARD_USER_MENU_NAV.map((item) => {
    const Icon = SECONDARY_ICONS[item.labelKey] ?? Globe;
    return { ...item, Icon };
  });

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("accountMenu")}
          aria-haspopup="dialog"
          className="relative flex min-h-11 min-w-11 items-center justify-center"
        >
          {avatarButton}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="border-kp-border bg-kp-bg-secondary">
            <DrawerHeader className="text-left">
              <DrawerTitle className="truncate text-kp-text-primary">
                {email || t("accountMenu")}
              </DrawerTitle>
            </DrawerHeader>
            <nav
              aria-label={t("accountMenu")}
              className="flex flex-col gap-0.5 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <Link
                href={hrefWithLocale(locale, "/profile")}
                onClick={() => setOpen(false)}
                className={`${itemClass} min-h-12 ${isActive("/profile") ? itemActive : itemIdle}`}
              >
                <User className="h-4 w-4" />
                {t("profile")}
              </Link>
              <Link
                href={hrefWithLocale(locale, "/dashboard/settings")}
                onClick={() => setOpen(false)}
                className={`${itemClass} min-h-12 ${isActive("/dashboard/settings") ? itemActive : itemIdle}`}
              >
                <Settings className="h-4 w-4" />
                {t("settings")}
              </Link>
              {isAdmin && (
                <Link
                  href={hrefWithLocale(locale, "/admin")}
                  onClick={() => setOpen(false)}
                  className={`${itemClass} min-h-12 ${isActive("/admin") ? itemActive : itemIdle}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}

              <div className="my-1.5 border-t border-kp-border" />
              {themeToggle}
              <div className="my-1.5 border-t border-kp-border" />

              {secondaryLinks.map(({ href, labelKey, Icon }) => (
                <Link
                  key={href}
                  href={hrefWithLocale(locale, href)}
                  onClick={() => setOpen(false)}
                  className={`${itemClass} min-h-12 ${isActive(href) ? itemActive : itemIdle}`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </Link>
              ))}

              <div className="my-1.5 border-t border-kp-border" />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className={`${itemClass} min-h-12 w-full text-left text-kp-danger hover:bg-kp-danger/10`}
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </nav>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("accountMenu")}
          className="relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-kp-brand"
        >
          {avatarButton}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 border-kp-border bg-kp-bg-secondary"
      >
        {email && (
          <DropdownMenuLabel className="truncate text-xs font-normal text-kp-text-secondary">
            {email}
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator className="bg-kp-border" />

        {/* NB: onSelect + router.push — Link inne i Radix-portalen mister
            navigasjonen når menyen unmountes i samme klikk-event. */}
        <DropdownMenuItem
          onSelect={() => router.push(hrefWithLocale(locale, "/profile"))}
          className={isActive("/profile") ? itemActive : undefined}
        >
          <User className="h-4 w-4" />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => router.push(hrefWithLocale(locale, "/dashboard/settings"))}
          className={isActive("/dashboard/settings") ? itemActive : undefined}
        >
          <Settings className="h-4 w-4" />
          {t("settings")}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onSelect={() => router.push(hrefWithLocale(locale, "/admin"))}
            className={isActive("/admin") ? itemActive : undefined}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-kp-border" />
        {themeToggle}
        <DropdownMenuSeparator className="bg-kp-border" />

        {secondaryLinks.map(({ href, labelKey, Icon }) => (
          <DropdownMenuItem
            key={href}
            onSelect={() => router.push(hrefWithLocale(locale, href))}
            className={isActive(href) ? itemActive : undefined}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-kp-border" />
        <DropdownMenuItem
          onSelect={() => void handleSignOut()}
          className="text-kp-danger focus:bg-kp-danger/10 focus:text-kp-danger"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
