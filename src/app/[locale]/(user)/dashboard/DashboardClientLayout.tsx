"use client";

import { TradingModeProvider } from "@/context/TradingModeContext";

/**
 * Thin client wrapper for /dashboard/* pages.
 *
 * AuthProvider + ProtectedRoute leveres av RootProviders (app/layout).
 * Denne layouten legger kun til TradingModeProvider.
 * BetaInfoBanner vises av AppShell ((user)/layout) — ikke dupliser her.
 */
export default function DashboardClientLayout({
  children,
  initialTradingMode = "paper",
}: {
  children: React.ReactNode;
  initialTradingMode?: "paper" | "live";
}) {
  return (
    <TradingModeProvider initialMode={initialTradingMode}>
      <div data-testid="dashboard-root">{children}</div>
    </TradingModeProvider>
  );
}
