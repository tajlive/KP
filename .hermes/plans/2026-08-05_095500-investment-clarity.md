# Plan: Forbedret brukerforståelse av investeringer

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen oppgave-for-oppgave.

**Mål:** Gjøre det krystallklart for brukere (lav IT-kompetanse, lite kryptoerfaring) hvor pengene deres er investert, hvordan det fungerer, og hvorfor.

**Nåværende kontekst:**
- AssetAllocationChart finnes, men vises kun i AdvancedAnalyticsSection (skjult bak "Avansert" toggle)
- GridLevelVisualization finnes, men vises kun i BotDetailView (per bot)
- Ingen enkel "Hvor er pengene mine?"-oversikt på hoveddashboard
- Brukere ser ikke sammenhengen mellom grid-nivåer og faktiske posisjoner

**Konkurranseanalyse (Pionex, 3Commas, Bitsgap):**
- Pionex: "Portfolio" side med enkel pie-chart + "Hvor mye i hver coin"
- 3Commas: "Active Bots" liste med tydelig "Investert: X kr" per bot
- Bitsgap: "My exchanges" med enkel balanse-oversikt
- **Felles:** Alle viser ENKELT hvor pengene er — ikke bare tekniske grafer

---

## Oppgaver

### Task 1: Enkel "Hvor er pengene"-komponent på hoveddashboard

**Mål:** Vise ALL brukerens kapitalfordeling på én side — ikke skjult bak "Avansert".

**Filer:**
- Create: `src/features/dashboard/InvestmentOverview.tsx`
- Modify: `src/features/dashboard/AdaptiveDashboard.tsx` (legg til i AktivTrader)

**Kode:**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet, TrendingUp, Info } from "lucide-react";

interface InvestmentSlice {
  name: string;
  value: number;
  color: string;
  description: string;
}

interface InvestmentOverviewProps {
  slices: InvestmentSlice[];
  totalValue: number;
  cashValue: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function InvestmentOverview({ slices, totalValue, cashValue }: InvestmentOverviewProps) {
  const t = useTranslations("dashboard.investmentOverview");
  const [showInfo, setShowInfo] = useState(false);

  const chartData = [
    ...slices,
    { name: t("cash"), value: cashValue, color: "#64748b", description: t("cashDesc") },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#0052FF]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("title")}
          </h3>
          <button onClick={() => setShowInfo(!showInfo)} aria-label="Info">
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {totalValue.toLocaleString("nb-NO")} NOK
        </span>
      </div>

      {showInfo && (
        <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
          {t("infoTooltip")}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString("nb-NO")} NOK`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {chartData.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: slice.color || COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-slate-400 flex-1">{slice.name}</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {slice.value.toLocaleString("nb-NO")} NOK
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("summary", { count: slices.length })}
        </p>
      </div>
    </div>
  );
}
```

**i18n (messages/no.json):**
```json
"investmentOverview": {
  "title": "Hvor er pengene dine?",
  "cash": "Ikke investert ennå",
  "cashDesc": "Disse pengene venter på at prisen skal falle til et kjøpsnivå",
  "infoTooltip": "Viser hvor mye du har i hver kryptovaluta, og hvor mye som ikke er investert ennå.",
  "summary": "Du har penger i {{count}} kryptovalutaer. Boten kjøper og selger automatisk for deg."
}
```

**i18n (messages/en.json):**
```json
"investmentOverview": {
  "title": "Where is your money?",
  "cash": "Not invested yet",
  "cashDesc": "This money is waiting for the price to drop to a buy level",
  "infoTooltip": "Shows how much you have in each cryptocurrency, and how much is not invested yet.",
  "summary": "You have money in {{count}} cryptocurrencies. The bot buys and sells automatically for you."
}
```

**Integrasjon i AdaptiveDashboard.tsx:**

```tsx
// I AktivTrader-view, etter PilotExplanation:
<InvestmentOverview
  slices={investmentSlices}
  totalValue={totalValue}
  cashValue={cashValue}
/>
```

---

### Task 2: "Hvorfor denne investeringen"-tooltip

**Mål:** Hver posisjon skal ha en enkel forklaring på HVORFOR boten kjøpte akkurat den.

**Filer:**
- Modify: `src/features/portfolio/PositionLotsCard.tsx`

**Kode:**

```tsx
// Legg til tooltip per posisjon:
<div className="group relative">
  <button className="text-slate-400 hover:text-slate-300">
    <Info className="w-3 h-3" />
  </button>
  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 z-10">
    {t("whyThisInvestment", { symbol: position.symbol })}
    <br /><br />
    {t("gridExplanation")}
  </div>
</div>
```

**i18n:**
```json
"positionLots": {
  "whyThisInvestment": "{{symbol}} ble kjøpt fordi prisen falt ned til et av våre forhåndsbestemte nivåer.",
  "gridExplanation": "Boten kjøper automatisk når prisen faller, og selger når den stiger igjen. Du tjener på svingningene."
}
```

---

### Task 3: "Hva skjer nå"-seksjon

**Mål:** Vise brukeren hva boten gjør AKKURAT NÅ — ikke bare historikk.

**Filer:**
- Create: `src/features/dashboard/CurrentActivity.tsx`

**Kode:**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Activity, TrendingDown, TrendingUp, Clock } from "lucide-react";

interface CurrentActivityProps {
  activeBuys: number;   // Antall nivåer som venter på kjøp
  activeSells: number;  // Antall nivåer som venter på salg
  lastAction: string;   // "Kjøpte BTC for 2 min siden" eller "Venter på prisfall"
  nextAction: string;   // "Selger ETH hvis prisen stiger 2%" eller "Kjøper SOL hvis prisen faller 5%"
}

export function CurrentActivity({ activeBuys, activeSells, lastAction, nextAction }: CurrentActivityProps) {
  const t = useTranslations("dashboard.currentActivity");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-[#0052FF]" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t("title")}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
          <TrendingDown className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-400">{activeBuys}</p>
          <p className="text-xs text-slate-500">{t("waitingToBuy")}</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-400">{activeSells}</p>
          <p className="text-xs text-slate-500">{t("waitingToSell")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-slate-500">{t("lastAction")}:</span>
          <span className="text-slate-700 dark:text-slate-300">{lastAction}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3 h-3 text-slate-400" />
          <span className="text-slate-500">{t("nextAction")}:</span>
          <span className="text-slate-700 dark:text-slate-300">{nextAction}</span>
        </div>
      </div>
    </div>
  );
}
```

**i18n:**
```json
"currentActivity": {
  "title": "Hva skjer nå?",
  "waitingToBuy": "Venter på kjøp",
  "waitingToSell": "Venter på salg",
  "lastAction": "Sist",
  "nextAction": "Neste"
}
```

---

### Task 4: Forenkle portfolio-siden

**Mål:** Gjøre /dashboard/portfolio til "Hvor er pengene mine"-siden.

**Filer:**
- Modify: `src/features/portfolio/PortfolioClientPage.tsx`

**Endringer:**
1. Fjern "Balanse" (forvirrende) — erstatt med "Total verdi"
2. Legg til InvestmentOverview øverst
3. Legg til enkel liste: "Dine investeringer" med symbol, beløp, og endring

---

### Task 5: i18n for alle språk

**Filer:**
- messages/no.json (allerede gjort i Task 1-3)
- messages/en.json (allerede gjort i Task 1-3)
- messages/th.json (kopi av en — midlertidig)
- messages/zh.json (kopi av en — midlertidig)

---

### Task 6: Testing

**Filer:**
- Create: `src/features/dashboard/__tests__/InvestmentOverview.test.tsx`

**Test:**
```tsx
import { render, screen } from "@testing-library/react";
import { InvestmentOverview } from "../InvestmentOverview";

describe("InvestmentOverview", () => {
  it("viser total verdi", () => {
    render(
      <InvestmentOverview
        slices={[{ name: "BTC", value: 50000, color: "#f59e0b", description: "" }]}
        totalValue={100000}
        cashValue={50000}
      />
    );
    expect(screen.getByText("100 000 NOK")).toBeInTheDocument();
  });

  it("viser cash når ikke investert", () => {
    render(
      <InvestmentOverview
        slices={[]}
        totalValue={100000}
        cashValue={100000}
      />
    );
    expect(screen.getByText("Ikke investert ennå")).toBeInTheDocument();
  });
});
```

---

## Risikoer og åpne spørsmål

| Risiko | Mitigering |
|---|---|
| Brukere forstår ikke "NOK" | Bruk "kr" i stedet |
| For mange tall | Vis kun symbol + beløp, ikke prosent |
| Grid-nivåer er tekniske | Bruk metaforer ("støvsugere", "nett") |

## Verifisering

1. `npm run test` — alle tester grønne
2. `npm run lint` — 0 errors
3. `npm run check` — tsc 0 errors
4. Manuell: åpne /dashboard — se "Hvor er pengene dine?" øverst
5. Manuell: åpne /dashboard/portfolio — se enkel oversikt

---

## Konkurranse-differensiering

| | Pionex | 3Commas | Klarpakke (etter denne planen) |
|---|---|---|---|
| Hvor er pengene | Pie-chart | Liste | **Pie-chart + enkel liste** |
| Hvorfor denne coin | Ingen forklaring | Teknisk | **Nybegynner-metafor** |
| Hva skjer nå | Ingen info | Bot-status | **"Venter på kjøp/salg"** |
| Språk | Engelsk | Engelsk | **Norsk, bestemor-nivå** |
