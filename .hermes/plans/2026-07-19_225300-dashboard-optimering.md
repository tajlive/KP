# Dashboard-optimalisering Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform Klarpakke-dashboardet til en klar, handlingsorientert startside for småsparere — fjern støy, løft fram det viktigste, og gi én tydelig CTA.

**Arkitektur:** AdaptiveDashboard.tsx styrer 4 views (NyBruker → Onboarded → AktivTrader → PowerUser) via userState. DashboardPro.tsx inneholder dagens ActiveTrader-view. Endringer gjøres i DashboardPro med nye/wrappede komponenter. Dagens AdvancedAnalyticsSection flyttes til egen underside.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind · framer-motion · next-intl

**Prinsipp:** Dashboard = "Hvor mye har jeg? Hva har skjedd sist? Hva bør jeg gjøre nå?" — alt annet flyttes til `/dashboard/analysis`.

---

### Task 1: Opprett pristicker-komponent

**Mål:** En horisontal ticker med BTC/ETH/SOL/BNB/XRP-priser og 24h endring — alltid synlig øverst i dashboardet.

**Filer:**
- Create: `src/features/dashboard/PriceTicker.tsx`
- Modify: `src/features/dashboard/DashboardPro.tsx` (legg til i render)
- Test: `src/features/dashboard/__tests__/PriceTicker.test.tsx`
- Modify: `messages/no/dashboard.json` + `messages/en/dashboard.json`

**Komponenten:**

```tsx
"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CoinPrice {
  symbol: string;
  price: number;
  change24h: number;
}

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "DOT"];

export function PriceTicker() {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market/snapshot");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setPrices(data.assets?.slice(0, 8) ?? []);
      } catch {
        setError(true);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (error || prices.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl bg-[#0A0D12] border border-[#1E2530]">
      <div className="flex gap-6 overflow-x-auto px-4 py-2.5 scrollbar-hide">
        {prices.map((c) => (
          <div key={c.symbol} className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-white">{c.symbol}</span>
            <span className="text-sm font-mono text-slate-300">
              {c.price.toLocaleString("no-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              c.change24h >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {c.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Test:**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceTicker } from "../PriceTicker";

beforeEach(() => vi.restoreAllMocks());

it("renders prices from API", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ assets: [
      { symbol: "BTC", price: 64562.68, change24h: 2.3 },
      { symbol: "ETH", price: 22680, change24h: -0.8 },
    ]}),
  } as Response);
  render(<PriceTicker />);
  expect(await screen.findByText("BTC")).toBeDefined();
  expect(screen.getByText(/64.*562/)).toBeDefined();
});
```

**Verification:** `npx vitest run src/features/dashboard/__tests__/PriceTicker.test.tsx -v` → PASS

---

### Task 2: Fjern onboarding-kort for brukere med trades

**Mål:** `GetStartedCard` og `FirstTradeReward` skal kun vises for NyBruker/Onboarded — ikke for AktivTrader/PowerUser.

**Filer:**
- Modify: `src/features/dashboard/DashboardPro.tsx`
- Modify: `src/features/dashboard/AdaptiveDashboard.tsx`

**Endring i DashboardPro.tsx:**  
Fjern import av `GetStartedCard` og `FirstTradeReward`. De kjøres allerede via `AdaptiveDashboard.tsx` som viser `NewUserHero`/`OnboardedView` for nye brukere. DashboardPro er kun for Aktive tradere — der skal ikke onboarding vises.

**Verification:** `npx eslint src/features/dashboard/DashboardPro.tsx` → 0 errors

---

### Task 3: Fjern posisjonskalkulator og risk metrics fra dashboard

**Mål:** AdvancedAnalyticsSection inneholder equity curve, P&L heatmap, posisjonskalkulator, risk metrics. Alt dette flyttes til `/dashboard/analysis`.

**Filer:**
- Create: `src/app/[locale]/(user)/dashboard/analysis/page.tsx`
- Modify: `src/features/dashboard/DashboardPro.tsx`
- Modify: `src/lib/navigation/config.ts`
- Modify: `messages/no/dashboard.json` + `messages/en/dashboard.json`

**Ny rute:**

```tsx
// src/app/[locale]/(user)/dashboard/analysis/page.tsx
"use client";
import { AdvancedAnalyticsSection } from "@/features/dashboard/AdvancedAnalyticsSection";
export default function AnalysisPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <AdvancedAnalyticsSection />
    </div>
  );
}
```

**I DashboardPro:** Bytt ut `<AdvancedAnalyticsSection />` med en link til `/dashboard/analysis`:

```tsx
<Link
  href={`/${locale}/dashboard/analysis`}
  className="text-sm text-[#0066FF] hover:underline"
>
  {t("advancedAnalyticsLink")}
</Link>
```

**Verification:** Naviger til `/no/dashboard/analysis` → viser avansert analyse

---

### Task 4: Flytt AutoTradingConfigCard til /trade

**Mål:** Auto-trading config (risikonivå, slider, lagre-knapp) hører til i /trade under Auto-fanen, ikke på dashboardet.

**Filer:**
- Modify: `src/features/dashboard/DashboardPro.tsx` (fjern AutoTradingConfigCard)
- Modify: `src/features/trading/AutoStrategyPanel.tsx` (denne erstatter allerede AutoTradingConfigCard)

**Verification:** Dashboard viser ikke lenger dobbel auto-trading config (en i DashboardPro + en i AutoStrategyPanel på /trade)

---

### Task 5: Legg til "siste handler"-seksjon

**Mål:** Vis siste 5 trades for Aktive tradere — data kommer fra `stats.recentSessions`.

**Filer:**
- Create: `src/features/dashboard/RecentTrades.tsx`
- Modify: `src/features/dashboard/DashboardPro.tsx`

**Komponent:**

```tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { TradingSession } from "@/features/trading/paper/PaperTradingList";

interface RecentTradesProps {
  sessions: TradingSession[];
}

export function RecentTrades({ sessions }: RecentTradesProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.recentTrades");
  const recent = sessions.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#0A0D12] border border-[#1E2530] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t("title")}</h3>
        <Link href={`/${locale}/trade`} className="text-xs text-[#0066FF] hover:underline flex items-center gap-1">
          {t("viewAll")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-[#1E2530]/50 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${s.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                {s.side?.toUpperCase()}
              </span>
              <span className="text-sm text-white">{s.trading_pair}</span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-mono ${(s.realized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {(s.realized_pnl ?? 0) >= 0 ? "+" : ""}{s.realized_pnl?.toFixed(2) ?? "0.00"} kr
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Verification:** Dashboard for AktivTrader viser siste 5 trades istedenfor "Ingen sesjoner"

---

### Task 6: Legg til portefølje-graf øverst (ikke gjemt)

**Mål:** `PortfolioChart` flyttes fra AdvancedAnalyticsSection til hoveddashboardet for Aktive tradere.

**Filer:**
- Modify: `src/features/dashboard/DashboardPro.tsx` (PortfolioChart importeres allerede på linje 12)

**Posisjon i render:** Plasser PortfolioChart mellom PersonalizedGreeting og StatsGrid:

```tsx
<PersonalizedGreeting ... />
<PortfolioChart />  {/* NY — allerede importert */}
<StatsGrid stats={displayStats} />
```

PortfolioChart er allerede importert på linje 12 i DashboardPro — kun rendring som mangler.

**Verification:** Dashboard viser equity-kurve (uten å måtte ekspandere "Avansert analyse")

---

### Task 7: Fiks "God kveld"-tekst til å inkludere brukernavn

**Mål:** `PersonalizedGreeting` viser allerede `{userName ? `, ${userName}` : ""}` (linje 139). Dette fikset vi i koden tidligere — kun verifisering gjenstår.

**Filer:**
- Test: (manuell login-verifisering)

**Verification:** Logg inn → Dashboard viser "God kveld, {username}" istedenfor bare "God kveld"

---

### Task 8: Fjern duplisert balansevisning

**Mål:** Balanse vises i dag 3 steder (PersonalizedGreeting, StatsGrid, SimplifiedHero). Fjern den fra SimplifiedHero.

**Filer:**
- Modify: `src/features/dashboard/SimplifiedHero.tsx`

**Endring:** Fjern `<SimplifiedHero />` fra DashboardPro.tsx. PersonalizedGreeting + StatsGrid dekker allerede balanse + P&L + win rate i en penere layout.

---

### Task 9: Legg til i18n-nøkler

**Mål:** Legg til manglende i18n-nøkler for nye komponenter i no.json og en.json.

**Filer:**
- Modify: `messages/no/dashboard.json`
- Modify: `messages/en/dashboard.json`

**Nye nøkler (no):**
```json
{
  "dashboard": {
    "priceTicker": {
      "title": "Markedspriser",
      "error": "Kunne ikke laste priser"
    },
    "recentTrades": {
      "title": "Siste handler",
      "viewAll": "Se alle",
      "buy": "KJØP",
      "sell": "SELG"
    },
    "advancedAnalyticsLink": "Se full analyse →"
  }
}
```

**Tilsvarende på engelsk i en.json.**

**Verification:** `python3 -c "import json; json.load(open('messages/no/dashboard.json'))"` → valid JSON

---

### Task 10: Deploy og verifiser

**Mål:** Bygg, deploy, logg inn og verifiser at dashboardet viser riktig.

```bash
cd /Users/taj/klarpakke
git add -A && git commit -m "feat: dashboard-optimalisering"
git push
SKIP_LINT_IN_BUILD=true npx next build
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build --skipNextBuild
npx wrangler deploy --env ""
```

**Verification:**
- `curl -s "https://www.klarpakke.no/no/dashboard" | grep -oE "BTC|Siste|Portefølje"` → viser minst 2 av 3
- Logg inn via browser → Dashboard viser pristicker + siste handler + graf

---

## Risikoer og åpne spørsmål

1. **Ticker poller hvert 30. sek** — Kan være unødvendig. Bytt til WebSocket hvis latens blir et problem.
2. **PortfolioChart ytelse** — Sjekk at equity-kurven ikke tregner rendering; vurder `React.memo`.
3. **/dashboard/analysis ny rute** — Krever at `AdvancedAnalyticsSection` fungerer standalone (ingen avhengighet til DashboardPro-props). Sjekk importene.
4. **Mobil** — Pristicker på mobil må være scrollbar uten å bryte layout. `overflow-x-auto` + `scrollbar-hide` er testet.
5. **Brukere uten trades** — NyBruker/Onboarded viser fortsatt sine respektive views uten endringer.
