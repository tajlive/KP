"use client";
import TradingModeToggle from "@/components/TradingModeToggle";
import { useAuth } from "@/components/auth/AuthContext";
import { MiniPulseWidget } from "@/components/layout/header/MiniPulseWidget";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const locale = useLocale();
  const t = useTranslations("navigation");

  useEffect(() => {
    setMounted(true);
  }, []);

  const l = (path: string) => `/${locale}${path === "/" ? "" : path}`;

  const mainLinks = [
    { path: "/kurs", label: t("courses") },
    { path: "/paper-trading", label: t("paperTrading") },
    { path: "/auto-trading", label: t("autoTrading") },
    { path: "/priser", label: t("pricing") },
  ];

  const LogoComponent = () => (
    <Link href={l("/")} className="flex items-center gap-2">
      <Image
        src="/logo.svg"
        alt=""
        role="presentation"
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        priority
      />
      <span className="text-xl font-bold text-[#1A1D26] dark:text-white">
        Klarpakke
      </span>
    </Link>
  );

  if (!mounted) {
    return (
      <nav className="bg-white/92 backdrop-blur-lg border-b border-[#E2E5EC] sticky top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-full">
          <LogoComponent />
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white/92 backdrop-blur-lg border-b border-[#E2E5EC] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <LogoComponent />

          <div className="hidden md:flex items-center gap-6">
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

            <TradingModeToggle />

            <div className="h-5 w-px bg-[#E2E5EC]" />

            {!loading &&
              (user ? (
                <>
                  <MiniPulseWidget />
                  <Link href={l("/dashboard")}>
                    <Button size="sm" className="gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      {t("myPage")}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={l("/innlogging")}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
                    >
                      <LogIn className="w-4 h-4" />
                      Logg inn
                    </Button>
                  </Link>
                  <Link href={l("/signup")}>
                    <Button
                      size="sm"
                      className="bg-[#0052FF] hover:bg-[#0047E0] text-white shadow-md shadow-[#0052FF]/20"
                    >
                      Registrer
                    </Button>
                  </Link>
                </>
              ))}
          </div>

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

            <div className="px-4 pb-2">
              <TradingModeToggle />
            </div>

            <div className="my-4 border-t border-[#E2E5EC]" />

            {!loading &&
              (user ? (
                <Link href={l("/dashboard")}>
                  <Button size="sm" className="w-full gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link href={l("/innlogging")} className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 border-[#0052FF] text-[#0052FF] hover:bg-[#0052FF] hover:text-white"
                    >
                      <LogIn className="w-4 h-4" />
                      Logg inn
                    </Button>
                  </Link>
                  <Link href={l("/signup")} className="block">
                    <Button
                      size="sm"
                      className="w-full bg-[#0052FF] hover:bg-[#0047E0] text-white"
                    >
                      Registrer
                    </Button>
                  </Link>
                </div>
              ))}
          </div>
        )}
      </div>
    </nav>
  );
}
