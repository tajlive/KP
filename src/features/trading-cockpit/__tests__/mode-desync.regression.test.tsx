/**
 * Regresjonstest for QA P1 (2026-08-10): modus-desync på /handel.
 *
 * URL uten ?mode= skal IKKE tvinge state til «paper» når serveren
 * (profilens preferred_trading_mode) har valgt «live». Før fiksen viste
 * badgen «Lekepenger» mens alle tallene var live — fordi URL-synken
 * overskrev state ETTER at dataene var hentet.
 */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCockpit, CockpitProvider } from "../hooks/useCockpit";
import type { CockpitInitialData } from "../types";

let mockUrlMode = "paper";
let mockHasModeParam = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/no/handel",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../hooks/useCockpitUrlSync", () => ({
  useCockpitUrlSync: () => ({
    mode: mockUrlMode,
    tab: "overview",
    hasModeParam: mockHasModeParam,
    hasTabParam: false,
    updateUrl: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        subscription: { unsubscribe: vi.fn() },
      }),
    },
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue("ok"),
  }),
}));

const liveInitialData: CockpitInitialData = {
  mode: "live",
  defaultMode: "live",
  tab: "overview",
  metrics: {
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
    totalCapital: 0,
    startingCapital: 0,
    winningTrades: 0,
    losingTrades: 0,
    sessionCount: 0,
    recentSessions: [],
  },
  sessions: [],
  statusCounts: {},
  canUseLive: true,
  autoTradeSettings: null,
};

function ModeProbe() {
  const cockpit = useCockpit();
  return <span data-testid="mode">{cockpit.mode}</span>;
}

describe("modus-desync-regresjon (2026-08-10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUrlMode = "paper";
    mockHasModeParam = false;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(liveInitialData),
    } as Response);
  });

  it("beholder server-modus (live) når URL mangler ?mode=", () => {
    render(
      <CockpitProvider initialData={liveInitialData} userId="u1" locale="no">
        <ModeProbe />
      </CockpitProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("live");
  });

  it("eksplisitt ?mode=paper overstyrer server-modus", () => {
    mockHasModeParam = true;
    render(
      <CockpitProvider initialData={liveInitialData} userId="u1" locale="no">
        <ModeProbe />
      </CockpitProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("paper");
  });
});
