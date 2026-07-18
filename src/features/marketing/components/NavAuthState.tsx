"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
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

export function NavAuthState({ navData }: NavAuthStateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("navigation");

  const l = (path: string) => hrefWithLocale(locale, path === "/" ? "/" : path);

  const mainLinks = user
    ? navData.loggedInLinks.map((link) => ({ path: link.path, label: link.label }))
    : navData.loggedOutLinks.map((link) => ({ path: link.path, label: link.label }));

  return (
    <>
      {/* Desktop nav links + auth */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
        {mainLinks.map((link) => (
          <Link
            key={link.path}
            href={l(link.path)}
            prefetch={false}
            className="text-sm font-medium text-[#505766] hover:text-[#1A1D26] transition-colors"
          >
            {link.label}
          </Link>
        ))}

        <div className="h-5 w-px bg-[#E2E5EC]" />

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
          className="p-2 bg-white hover:bg-[#F7F8FA] rounded-lg border border-[#E2E5EC] shadow-sm"
          aria-label={isOpen ? "Lukk meny" : "Åpne meny"}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-[#1A1D26]" />
          ) : (
            <Menu className="w-5 h-5 text-[#1A1D26]" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-[#E2E5EC] py-4 space-y-2">
          {mainLinks.map((link) => (
            <Link
              key={link.path}
              href={l(link.path)}
              prefetch={false}
              className="block px-4 py-2 text-sm font-medium text-[#505766] hover:bg-[#F7F8FA] rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="my-4 border-t border-[#E2E5EC]" />

          <div className="px-4 space-y-2">
            {user ? (
              <>
                <Link
                  href={l("/dashboard")}
                  className="block"
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    size="sm"
                    className={`w-full gap-2 ${BRAND.primary} shadow-md shadow-blue-500/20`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t("myPage")}
                  </Button>
                </Link>
                <Button
                  size="sm"
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
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 border-[#E2E5EC]"
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
                    size="sm"
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
