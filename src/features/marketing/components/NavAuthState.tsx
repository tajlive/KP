"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
import { useServerVerifiedUser } from "@/lib/auth/use-server-verified-user";
import { Button } from "@/shared/ui/button";
import { BRAND } from "@/lib/design/tokens";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NavigationData } from "@/lib/navigation/config";
import { LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";

interface NavAuthStateProps {
  navData: NavigationData;
}

const GUEST_MARKETING_PATHS = new Set(["/kurs", "/priser", "/om-oss"]);
const AUTH_MARKETING_PATHS = new Set([
  "/dashboard",
  "/dashboard/portfolio",
  "/trade",
  "/profile",
]);

export function NavAuthState({ navData }: NavAuthStateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  // 2026-08-10 (QA P1): server-verifisert fallback — klient-AuthContext er
  // ofte null i prod (HttpOnly-cookie-sesjon), så headeren viste gjeste-CTA
  // til innloggede brukere.
  const { user } = useServerVerifiedUser();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("navigation");

  const l = (path: string) => hrefWithLocale(locale, path === "/" ? "/" : path);

  const mainLinks = user
    ? navData.loggedInLinks
        .filter((link) => AUTH_MARKETING_PATHS.has(link.path))
        .map((link) => ({ path: link.path, label: link.label }))
    : navData.loggedOutLinks
        .filter((link) => GUEST_MARKETING_PATHS.has(link.path))
        .map((link) => ({ path: link.path, label: link.label }));

  return (
    <>
      {/* Desktop nav links + auth */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
        {mainLinks.map((link) => (
          <Link
            key={link.path}
            href={l(link.path)}
            prefetch={false}
            className="rounded-md px-2 py-1 text-sm font-medium text-kp-text-secondary transition-colors duration-150 hover:bg-kp-bg-hover hover:text-kp-text-primary"
          >
            {link.label}
          </Link>
        ))}

        <div className="h-5 w-px bg-kp-border" />

        {/* Logged in: Min side + Logg ut. Ikke innlogget: Logg inn + Start gratis — CTA alltid synlig */}
        {user ? (
          <>
            <Link href={l("/dashboard")}>
              <Button
                size="sm"
                className={`gap-2 ${BRAND.primary} shadow-md shadow-blue-500/20`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("myPage")}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className={`gap-2 ${BRAND.primaryOutline}`}
              onClick={async () => {
                await signOut();
                router.refresh();
                router.push(l("/"));
              }}
            >
              <LogOut className="w-4 h-4" />
              {t("logout")}
            </Button>
          </>
        ) : (
          <>
            <Link href={l("/login")}>
              <Button
                size="sm"
                variant="outline"
                className={`gap-2 ${BRAND.primaryOutline}`}
              >
                <LogIn className="w-4 h-4" />
                {t("login")}
              </Button>
            </Link>
            <Link href={l("/register")}>
              <Button
                size="sm"
                className={`${BRAND.primary} shadow-md shadow-blue-500/20`}
              >
                {t("signup")}
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-kp-border bg-kp-bg-card text-kp-text-primary transition-colors duration-150 hover:bg-kp-bg-hover"
          aria-label={isOpen ? "Lukk meny" : "Åpne meny"}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-kp-border py-4 space-y-2">
          {mainLinks.map((link) => (
            <Link
              key={link.path}
              href={l(link.path)}
              prefetch={false}
              className="block rounded-lg px-4 py-3.5 text-sm font-medium text-kp-text-secondary transition-colors duration-150 hover:bg-kp-bg-hover hover:text-kp-text-primary"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="my-4 border-t border-kp-border" />

          <div className="px-4 space-y-2">
            {user ? (
              <>
                <Link
                  href={l("/dashboard")}
                  className="block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    size="lg"
                    className={`w-full gap-2 ${BRAND.primary} shadow-md shadow-blue-500/20`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t("myPage")}
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full gap-2 ${BRAND.primaryOutline}`}
                  onClick={async () => {
                    setIsOpen(false);
                    await signOut();
                    router.refresh();
                    router.push(l("/"));
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href={l("/login")}
                  className="block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className={`w-full gap-2 ${BRAND.primaryOutline}`}
                  >
                    <LogIn className="w-4 h-4" />
                    {t("login")}
                  </Button>
                </Link>
                <Link
                  href={l("/register")}
                  className="block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    size="lg"
                    className={`w-full ${BRAND.primary} shadow-md shadow-blue-500/20`}
                  >
                    {t("signup")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
