"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Home, BarChart3, Bot, BookOpen, User } from "lucide-react";

/**
 * Bottom Navigation - 5 tabs for dashboard
 * Designprinsipper:
 * - Mobil-først: 375px base, skalerer opp
 * - Thumb zone: Knapper i nederste 40%
 * - Skjules ved keyboard (window.visualViewport)
 * - 60fps animasjoner med Framer Motion
 * - Haptic feedback ved tab-bytte
 */

type TabId = "home" | "trading" | "robots" | "learn" | "me";

interface Tab {
  id: TabId;
  icon: React.ElementType;
  label: string;
  labelEn: string;
  path: string;
}

const TABS: Tab[] = [
  { id: "home", icon: Home, label: "Hjem", labelEn: "Home", path: "/dashboard" },
  { id: "trading", icon: BarChart3, label: "Handel", labelEn: "Trade", path: "/dashboard/trade" },
  { id: "robots", icon: Bot, label: "Roboter", labelEn: "Bots", path: "/dashboard/auto-trade" },
  { id: "learn", icon: BookOpen, label: "Lær", labelEn: "Learn", path: "/kurs" },
  { id: "me", icon: User, label: "Meg", labelEn: "Me", path: "/dashboard/settings" },
];

// Aktiv farge (blå)
const ACTIVE_COLOR = "#2563eb";
// Inaktiv farge (grå)
const INACTIVE_COLOR = "#6b7280";

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isVisible, setIsVisible] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Finn aktiv tab basert på pathname
  useEffect(() => {
    const currentTab = TABS.find((tab) => {
      if (tab.id === "home") {
        return pathname === `/${locale}/dashboard` || pathname === `/${locale}/dashboard/`;
      }
      return pathname.startsWith(`/${locale}${tab.path}`);
    });
    
    if (currentTab) {
      setActiveTab(currentTab.id);
    }
  }, [pathname, locale]);

  // Håndter keyboard-visning (skjul bottom nav)
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        const isKeyboardOpen = heightDiff > 150; // Threshold for keyboard
        
        setIsVisible(!isKeyboardOpen);
        setKeyboardHeight(isKeyboardOpen ? heightDiff : 0);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleTabPress = (tab: Tab) => {
    if (tab.id === activeTab) return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    setActiveTab(tab.id);
    router.push(`/${locale}${tab.path}`);
  };

  // Ikke vis hvis ikke synlig (keyboard åpent)
  if (!isVisible) return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Bakgrunn med blur */}
      <div className="absolute inset-0 bg-[#0a0b0d]/90 backdrop-blur-xl border-t border-white/[0.08]" />
      
      {/* Tab container */}
      <div className="relative max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabPress(tab)}
                className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-2 px-3 rounded-xl transition-colors"
                whileTap={{ scale: 0.95 }}
                aria-label={locale === "no" ? tab.label : tab.labelEn}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Aktiv indikator (animert bakgrunn) */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-600/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Indikator-dot for aktiv tab */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-blue-600"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Icon */}
                <motion.div
                  animate={{
                    color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon 
                    className="w-6 h-6" 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>
                
                {/* Label - vises kun for aktiv tab */}
                <motion.span
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : 4,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute -bottom-0.5 text-[10px] font-medium text-blue-600"
                >
                  {locale === "no" ? tab.label : tab.labelEn}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Extra space for home indicator på iOS */}
      <div className="h-[env(safe-area-inset-bottom, 8px)]" />
    </motion.nav>
  );
}

/**
 * Wrapper-komponent for dashboard-sider med bottom nav
 * Legger til riktig padding for å unngå at innhold dekkes av nav
 */
export function DashboardWithBottomNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Hovedinnhold med padding for bottom nav */}
      <main className="pb-24">
        {children}
      </main>
      
      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

/**
 * Hook for å sjekke om bottom nav er synlig
 * Nyttig for å justere innhold som skal være over nav
 */
export function useBottomNavVisible() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsVisible(heightDiff <= 150);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  return isVisible;
}
