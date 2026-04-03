"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type TabId = "home" | "trade" | "ai" | "portfolio" | "more";

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

const GraduationCapIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const GraduationCapFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 10v6l-10 5L2 16v-6l10 5 10-5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
    <path d="M22 10L12 15 2 10l10-5 10 5z" />
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

const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
  </svg>
);

const WalletFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-2h-3a2 2 0 0 1 0-4h3v-4h-3a2 2 0 0 1 0-4h3z" />
    <circle cx="17" cy="12" r="1" fill="white" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const MenuFilled = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="5" width="18" height="2" rx="1" />
    <rect x="3" y="11" width="18" height="2" rx="1" />
    <rect x="3" y="17" width="18" height="2" rx="1" />
  </svg>
);

const TABS: Tab[] = [
  { id: "home", labelKey: "home", href: "/dashboard", icon: HomeIcon, filledIcon: HomeFilled },
  { id: "trade", labelKey: "trade", href: "/dashboard/trade", icon: TrendingUpIcon, filledIcon: TrendingUpFilled },
  { id: "ai", labelKey: "ai", href: "/dashboard/ai", icon: BotIcon, filledIcon: BotFilled },
  { id: "portfolio", labelKey: "portfolio", href: "/dashboard/portfolio", icon: WalletIcon, filledIcon: WalletFilled },
  { id: "more", labelKey: "more", href: "/dashboard/settings", icon: MenuIcon, filledIcon: MenuFilled },
];

const ACTIVE_COLOR = "#2563eb";
const INACTIVE_COLOR = "#6b7280";

export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const t = useTranslations("dashboard.sidebar");

  const [activeTab, setActiveTab] = useState<TabId>("home");
  
  // Helper to check if a tab should be active based on current pathname
  const getActiveTabFromPath = (path: string): TabId => {
    // Check for exact match or starts with for nested routes
    for (const tab of TABS) {
      const fullPath = `/${locale}${tab.href}`;
      if (tab.id === "home") {
        if (path === `/${locale}/dashboard` || path === `/${locale}/dashboard/`) {
          return "home";
        }
      } else if (path.startsWith(fullPath)) {
        return tab.id;
      }
    }
    return "home";
  };
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const currentTab = TABS.find((tab) => {
      if (tab.id === "home") {
        return pathname === `/${locale}/dashboard` || pathname === `/${locale}/dashboard/`;
      }
      return pathname.startsWith(`/${locale}${tab.href}`);
    });

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

  const handleTabPress = (tab: Tab) => {
    if (tab.id === activeTab) return;

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

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
                onClick={() => handleTabPress(tab)}
                className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-2 px-3 rounded-xl transition-colors touch-manipulation"
                whileTap={{ scale: 0.95 }}
                aria-label={t(tab.labelKey)}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-600/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  animate={{
                    color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>

                {/* Label - vises kun for aktiv tab */}
                <motion.span
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : 4,
                    height: isActive ? "auto" : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="text-[10px] font-medium mt-1 overflow-hidden"
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
