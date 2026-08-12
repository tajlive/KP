import { ScrollToTop } from "@/features/dashboard/ScrollToTop";
import { AnnouncementsContainer } from "@/components/Announcements";
import { SURFACE } from "@/lib/design/tokens";
import { TopNav } from "./TopNav";
import { BottomTabs } from "./BottomTabs";
import { BetaInfoBanner } from "@/components/BetaInfoBanner";

/**
 * Unified app shell for all authenticated core flows.
 *
 * Provides sticky TopNav, global announcements, a scrollable main area with
 * bottom-safe padding, and the mobile BottomTabs. Used by the shared
 * `(user)` layout so the four core flows (portfolio, market, trade, account)
 * all render with the same chrome.
 *
 * P0 kundevendt (2026-08-12): BetaInfoBanner vises rett under TopNav for
 * alle innloggede app-flater (alltid autentisert her).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} flex flex-col`}>
      <ScrollToTop />
      <TopNav />
      <BetaInfoBanner />
      <div className="px-3 pt-2 sm:px-4 lg:px-8">
        <AnnouncementsContainer />
      </div>
      <main className="flex-1 overflow-y-auto px-3 pt-2 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 lg:px-8 lg:pt-3 md:pb-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      <BottomTabs />
    </div>
  );
}
