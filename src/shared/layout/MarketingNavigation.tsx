import { ThemeToggleIcon } from "@/shared/theme";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { NavigationData } from "@/lib/navigation/config";
import { NavAuthState } from "@/features/marketing/components/NavAuthState";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { BetaBadge } from "@/components/BetaBadge";

interface MarketingNavigationProps {
  navData: NavigationData;
  locale: string;
}

export async function MarketingNavigation({ navData, locale }: MarketingNavigationProps) {
  const t = await getTranslations({ locale, namespace: "navigation" });

  const l = (path: string) => hrefWithLocale(locale, path === "/" ? "/" : path);

  return (
    <nav
      data-testid="site-navigation"
      aria-label={t("siteNavAria")}
      className="bg-kp-nav-bg backdrop-blur-xl border-b border-kp-border sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-2 min-w-0">
          <Link
            href={l("/")}
            prefetch={false}
            className="flex items-center gap-2 min-w-0 shrink overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light"
          >
            <Image
              src="/logo.svg"
              alt=""
              role="presentation"
              width={32}
              height={32}
              className="h-8 w-8 object-contain shrink-0"
              priority
            />
            <span className="text-xl font-bold text-kp-text-primary truncate hidden sm:inline">
              Klarpakke
            </span>
            <span className="text-lg font-bold text-kp-text-primary sm:hidden whitespace-nowrap">
              Klarpakke
            </span>
            <span className="ml-1.5 text-sm font-medium text-kp-text-muted truncate hidden xl:inline shrink-0">
              — {t("tagline")}
            </span>
            <BetaBadge locale={locale} />
          </Link>

          <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
            <NavAuthState navData={navData} />

            <div className="h-5 w-px bg-kp-border" />

            <ThemeToggleIcon />
          </div>

          {/* Mobile auth/menu button rendered inside NavAuthState */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggleIcon />
            <NavAuthState navData={navData} />
          </div>
        </div>
      </div>
    </nav>
  );
}
