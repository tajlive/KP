"use client";

import { Button } from "@/components/ui/button";
import { HeaderTicker } from "@/components/landing/HeaderTicker";
import { LogIn, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function MarketingNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("navigation");

  const l = (path: string) => `/${locale}${path === "/" ? "" : path}`;

  const mainLinks = [
    { path: "/kurs", label: t("navLearn") },
    { path: "/paper-trading", label: t("navTrade") },
    { path: "/auto-trading", label: t("navBots") },
    { path: "/priser", label: t("navPricing") },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-14 gap-4">
          <Link href={l("/")} className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.svg"
              alt=""
              role="presentation"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-[#1A1D26]">Klarpakke</span>
              <span className="ml-2 text-sm font-medium text-[#5E6478] hidden md:inline">
                — {t("tagline")}
              </span>
            </div>
            <span className="text-xl font-bold text-[#1A1D26] sm:hidden">Klarpakke</span>
          </Link>

          <div className="hidden lg:flex flex-1 justify-center min-w-0">
            <HeaderTicker />
          </div>

          <div className="hidden md:flex items-center gap-6 shrink-0">
            {mainLinks.map((link) => (
              <Link
                key={link.path}
                href={l(link.path)}
                className="text-sm font-medium text-[#5E6478] hover:text-[#1A1D26] transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="h-5 w-px bg-[#E2E5EC]" />

            {/* Always show login/register for marketing pages */}
            <Link href={l("/innlogging")}>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
              >
                <LogIn className="w-4 h-4" />
                {t("login")}
              </Button>
            </Link>
            <Link href={l("/signup")}>
              <Button
                size="sm"
                className="bg-[#0052FF] hover:bg-[#0047E0] text-white shadow-md shadow-[#0052FF]/20"
              >
                {t("register")}
              </Button>
            </Link>
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
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-[#E2E5EC] py-4 space-y-2">
            {mainLinks.map((link) => (
              <Link
                key={link.path}
                href={l(link.path)}
                className="block px-4 py-2 text-sm font-medium text-[#5E6478] hover:bg-[#F7F8FA] rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-4 border-t border-[#E2E5EC]" />

            <div className="px-4 space-y-2">
              <Link href={l("/innlogging")} className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
                >
                  <LogIn className="w-4 h-4" />
                  {t("login")}
                </Button>
              </Link>
              <Link href={l("/signup")} className="block">
                <Button
                  size="sm"
                  className="w-full bg-[#0052FF] hover:bg-[#0047E0] text-white"
                >
                  {t("register")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
