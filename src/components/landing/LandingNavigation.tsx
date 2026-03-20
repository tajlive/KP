"use client";

import TradingModeToggle from "@/components/TradingModeToggle";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/design/tokens";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function LandingNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const locale = useLocale();
  const t = useTranslations("navigation");

  const l = (path: string) => hrefWithLocale(locale, path === "/" ? "/" : path);

  const mainLinks = [
    { path: "/kurs", label: t("courses") },
    { path: "/paper-trading", label: t("paperTrading") },
    // REMOVED: { path: "/om-oss", label: t("about") },
    { path: "/priser", label: t("pricing") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-100 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href={l("/")} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#0052FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,82,255,0.3)] group-hover:scale-110 transition-transform">
              <Image
                src="/logo.svg"
                alt="Klarpakke"
                width={24}
                height={24}
                className="w-6 h-6 object-contain brightness-0 invert"
              />
            </div>
            <span className="text-xl font-black text-white tracking-tighter">
              Klarpakke
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {mainLinks.map((link) => (
              <Link
                key={link.path}
                href={l(link.path)}
                className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                {link.label}
              </Link>
            ))}

            <div className="h-6 w-px bg-white/10 mx-2" />
            <TradingModeToggle />
            <div className="h-6 w-px bg-white/10 mx-2" />

            {!loading &&
              (user ? (
                <Link href={l("/dashboard")}>
                  <Button
                    className={`${BRAND.primary} rounded-xl font-bold px-6`}
                  >
                    {t("myPage")}
                  </Button>
                </Link>
              ) : (
                <Link href={l("/innlogging")}>
                  <Button
                    variant="ghost"
                    className="text-white font-bold hover:bg-white/5 rounded-xl px-6"
                  >
                    {t("login")}
                  </Button>
                </Link>
              ))}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={
          isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
        }
        className="md:hidden overflow-hidden bg-slate-900 border-b border-white/10"
      >
        <div className="px-4 py-8 space-y-6">
          {mainLinks.map((link) => (
            <Link
              key={link.path}
              href={l(link.path)}
              className="block text-xl font-bold text-white"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-6 border-t border-white/10 space-y-6">
            <TradingModeToggle />
            {!loading && (
              <Link
                href={l(user ? "/dashboard" : "/innlogging")}
                className="block"
              >
                <Button
                  className={`w-full ${BRAND.primary} h-14 rounded-2xl font-bold text-lg`}
                >
                  {user ? t("myPage") : t("login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </nav>
  );
}
