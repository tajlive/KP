"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MOBILE_BOTTOM_TABS } from "@/lib/navigation/config";
import { useHaptic } from "@/hooks/use-haptic";

type TabId = "home" | "portfolio" | "trade" | "account" | "history" | "help";

interface Tab {
  id: TabId;
  labelKey: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  filledIcon: React.FC<{ className?: string }>;
}

// Custom filled icon components
const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const HomeFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" fill="white" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrendingUpFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 6v12h-6l-3.5-3.5-5 5L1 12l7.5-7.5 5 5L17 6h6z" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const BotFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4V2h-4v2H4a2 2 0 0 0-2 2v12h4v-2h12v2h4V6a2 2 0 0 0-2-2h-4z" />
    <circle cx="9" cy="14" r="1" fill="black" opacity="0.5" />
    <circle cx="15" cy="14" r="1" fill="black" opacity="0.5" />
    <rect x="2" y="14" width="2" height="4" rx="1" />
    <rect x="20" y="14" width="2" height="4" rx="1" />
  </svg>
);

const PieChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const PieChartFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
    <path d="M12 2v10h10a10 10 0 0 0-10-10z" />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const GlobeFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2V4a8 8 0 0 1 0 16z" />
    <path d="M1 12h22" stroke="white" strokeWidth="2" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const UserFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm-7 19a1 1 0 0 1-1-1v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1a1 1 0 0 1-1 1H5z" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);

const CopyFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const HistoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const HistoryFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" stroke="white" strokeWidth="2" fill="none" />
  </svg>
);

const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const HelpCircleFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="bold" fill="black">?</text>
  </svg>
);

// Map icon names from nav config to icon components
const ICON_MAP: Record<string, { icon: React.FC<{ className?: string }>, filledIcon: React.FC<{ className?: string }> }> = {
  Home: { icon: HomeIcon, filledIcon: HomeFilled },
  TrendingUp: { icon: TrendingUpIcon, filledIcon: TrendingUpFilled },
  PieChart: { icon: PieChartIcon, filledIcon: PieChartFilled },
  Globe: { icon: GlobeIcon, filledIcon: GlobeFilled },
  User: { icon: UserIcon, filledIcon: UserFilled },
  History: { icon: HistoryIcon, filledIcon: HistoryFilled },
  HelpCircle: { icon: HelpCircleIcon, filledIcon: HelpCircleFilled },
};

// Build tabs from nav config
const TABS: Tab[] = MOBILE_BOTTOM_TABS.map(navItem => {
  const icons = ICON_MAP[navItem.icon || 'Home'] || ICON_MAP.Home;
  return {
    id: navItem.key as TabId,
    labelKey: navItem.labelKey.replace('navigation.', ''),
    href: navItem.href,
    icon: icons.icon,
    filledIcon: icons.filledIcon,
  };
});

// Match longest href first so "/dashboard/portfolio" treffer Portefølje, ikke Hjem
const TABS_BY_SPECIFICITY: Tab[] = [...TABS].sort(
  (a, b) => b.href.length - a.href.length,
);

const matchesTab = (path: string, fullPath: string): boolean =>
  path === fullPath || path.startsWith(`${fullPath}/`);

const ACTIVE_COLOR = "var(--kp-brand)";
const INACTIVE_COLOR = "var(--kp-text-muted)";
const ACTIVE_GLOW = "var(--kp-brand-glow)";

export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const t = useTranslations("navigation");

  // Initialiser activeTab basert på pathname for å unngå hydration mismatch
  // Server og klient må ha samme initial verdi
  const getInitialTab = (): TabId => {
    // Default til "home" - konsistent for både server og klient
    return "home";
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const currentTab = TABS_BY_SPECIFICITY.find((tab) =>
      matchesTab(pathname, `/${locale}${tab.href}`)
    );

    if (currentTab) {
      setActiveTab(currentTab.id);
    }
  }, [pathname, locale]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const isKeyboardOpen = viewport.height < window.innerHeight * 0.75;
        setIsHidden(isKeyboardOpen);
      }, 150);
    };

    viewport.addEventListener("resize", handleResize);
    return () => {
      viewport.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const haptic = useHaptic();

  const handleTabPress = (tab: Tab) => {
    if (tab.id === activeTab) return;

    haptic("medium");
    setActiveTab(tab.id);
    router.push(`/${locale}${tab.href}`);
  };

  if (isHidden) return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      suppressHydrationWarning
    >
      <div className="absolute inset-0 bg-[#0a0b0d]/95 backdrop-blur-xl border-t border-white/[0.08]" />

      <div className="relative max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = isActive ? tab.filledIcon : tab.icon;

            return (
              <motion.button
                key={tab.id}
                data-testid={`bottom-tab-${tab.id}`}
                onClick={() => handleTabPress(tab)}
                className="relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1.5 px-2 rounded-2xl transition-colors touch-manipulation"
                whileTap={{ scale: 0.92 }}
                aria-label={t(tab.labelKey)}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: ACTIVE_GLOW }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                <motion.div
                  animate={{
                    color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>

                {/* Label — alltid synlig (Robinhood/Kraken pattern) */}
                <motion.span
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    y: isActive ? 0 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                  className="text-[9px] font-semibold mt-0.5 leading-tight"
                  style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                >
                  {t(tab.labelKey)}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="h-[env(safe-area-inset-bottom, 8px)]" />
    </motion.nav>
  );
}
