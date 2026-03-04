"use client";

import { Menu, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function MobileMenu() {
  const t = useTranslations("navigation");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const l = (path: string) => `/${locale}${path === "/" ? "" : path}`;

  const menuItems = [
    { href: l("/beta/apply"), label: t("signup") },
    { href: l("/priser"), label: t("pricing") },
    { href: l("/innlogging"), label: t("login") },
  ];

  return (
    <div className="md:hidden">
      {/* Hamburger-knapp */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-3 bg-black/80 backdrop-blur-sm rounded-full border border-white/10"
        aria-label={isOpen ? t('closeMenu') : t('openMenu')}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobilmeny */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center gap-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-2xl font-semibold text-white hover:text-blue-400 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
