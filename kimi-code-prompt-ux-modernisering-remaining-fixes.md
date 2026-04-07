# KIMI Code Prompt: UX Modernisering - Gjenvaerende oppgaver

**Kontekst:** En UX-moderniseringsplan ble laget og delvis implementert. 10 av 16 oppgaver gjenstaar. Denne prompten dekker alle gjenvaerende endringer i prioritert rekkefoelje.

**Referanser:**
- Plan: `plans/klarpakke-ux-modernisering-og-brukervennlighet-2026.md`
- Verifikasjonsrapport: `plans/ux-modernisering-verifikasjonsrapport.md`
- Design tokens: `src/lib/design/tokens.ts`

---

## Oppgave 1: Fiks onboarding - emoji til Lucide + redirect til dashboard

**Fil:** `src/app/[locale]/(onboarding)/onboarding/ClientOnboarding.tsx`

**Endring 1:** Erstatt emoji med Lucide Zap-ikon. Bytt linje 16:
```tsx
// FRA:
<div className="text-5xl mb-3">⚡</div>

// TIL:
import { Zap } from "lucide-react";
// ...
<div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-3">
  <Zap className="w-8 h-8 text-brand-500" />
</div>
```

**Endring 2:** Redirect til dashboard i stedet for auto-trade. Bytt linje 27:
```tsx
// FRA:
router.push(`/${locale}/dashboard/auto-trade`);

// TIL:
router.push(`/${locale}/dashboard`);
```

---

## Oppgave 2: Erstatt gjenvaerende emojis med Lucide

Alle disse filene har emojis som skal erstattes:

| Fil | Linje | Emoji | Erstatt med |
|-----|-------|-------|-------------|
| `src/features/dashboard/FirstTradeCard.tsx` | 129-130 | `⚡ Kjoep BTC...` | Importer `Zap` fra lucide-react, bruk som inline ikon foer tekst |
| `src/features/dashboard/StreakBadge.tsx` | 17 | `🔥` | Importer `Flame` fra lucide-react, bruk `<Flame className="w-6 h-6 text-orange-500" />` |
| `src/features/landing/LandingBacktestTeaser.tsx` | 192 | `📊` | Importer `BarChart3` fra lucide-react |
| `src/features/trading/OptimalTrader.tsx` | 279 | `⚡` | Importer `Zap` fra lucide-react |
| `src/app/[locale]/(beta)/beta/dashboard/BetaDashboardClient.tsx` | 240,251,271,280 | `💰📊⚡🏆` | Importer `Wallet, BarChart3, Zap, Trophy` fra lucide-react. Erstatt `<div className="text-5xl mb-4">EMOJI</div>` med `<div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4"><ICON className="w-8 h-8 text-brand-500" /></div>` |
| `src/app/[locale]/(beta)/beta/live-trading/LiveTradingClient.tsx` | 500 | `💰` | Importer `Wallet` fra lucide-react |
| `src/app/[locale]/(admin)/admin/campaign/ClientCampaign.tsx` | 143 | `🎓` | Importer `GraduationCap` fra lucide-react |
| `src/app/[locale]/(admin)/admin/ab-tests/ClientABTests.tsx` | 216, 257 | `🏆🎯` | Importer `Trophy, Target` fra lucide-react |

**Unntak:** `GamificationProvider.tsx` linje 84 bruker `🔥` i toast-melding - dette kan beholdes da emojis i toasts er akseptabelt.

---

## Oppgave 3: Token-konsistens - erstatt hardkodede gradients

Erstatt alle `from-blue-600 to-emerald-600` gradients med `BRAND.gradient` fra `src/lib/design/tokens.ts`.

**Filer som maa endres:**

1. **`src/app/[locale]/(onboarding)/velkommen/VelkommenContent.tsx`** (4 forekomster)
   - Importer `BRAND` fra `@/lib/design/tokens`
   - Linje 82: `bg-linear-to-br from-blue-600 to-emerald-600` -> `${BRAND.gradient}`
   - Linje 101: `bg-linear-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700` -> `${BRAND.gradient}`
   - Linje 153: `bg-linear-to-r from-blue-600 to-emerald-600` -> `${BRAND.gradient}`
   - Linje 252: `bg-linear-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700` -> `${BRAND.gradient}`

2. **`src/app/[locale]/(commerce)/checkout/ClientCheckout.tsx`** (1 forekomst)
   - Linje 242: `bg-linear-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700` -> `${BRAND.gradient}`
   - Importer `BRAND` fra `@/lib/design/tokens`

3. **`src/app/[locale]/(commerce)/checkout/success/ClientCheckoutSuccess.tsx`** (1 forekomst)
   - Linje 164: erstatt gradient med `${BRAND.gradient}`

4. **`src/features/ai/ChatWidget.tsx`** (1 forekomst)
   - Linje 274: `bg-linear-to-tr from-blue-600 to-emerald-600` -> bruk BRAND_COLOR.DEFAULT

5. **`src/shared/ui/KlarpakkeLogo.tsx`** (1 forekomst)
   - Linje 42: `bg-linear-to-br from-blue-600 to-emerald-600` -> `${BRAND.gradient}`

6. **`src/app/[locale]/(admin)/admin/campaign/ClientCampaign.tsx`** (1 forekomst)
   - Linje 124: `bg-linear-to-r from-blue-600 to-emerald-600` -> `${BRAND.gradient}`

---

## Oppgave 4: Erstatt hardkodede #0052FF i landing-komponenter

**Filer:**

1. **`src/features/landing/LandingAITools.tsx`** (6 forekomster)
   - Importer `BRAND, BRAND_COLOR` fra `@/lib/design/tokens`
   - `text-[#0052FF]` -> `text-brand-500`
   - `bg-[#0052FF]/10` -> `bg-brand-500/10`

2. **`src/features/landing/LiveSignalFeed.tsx`** (2 forekomster)
   - `text-[#0052FF]` -> `text-brand-500`

---

## Oppgave 5: Forenkle dashboard foerste-skjerm

**Fil:** `src/features/coinbase/CoinbaseHome.tsx`

**Maal:** Nybegynnere skal se saldo + en primaer CTA paa toppen, med avanserte funksjoner bak progressive disclosure.

**Forslag til endringer:**
1. Flytt `PortfolioBalance` til foerst (foer overview-card)
2. Fjern `LivePnLWidget` fra toppen (flytt til en "Detaljer"-seksjon)
3. Behold `QuickActions` rett under saldo
4. Grupper PortfolioChart, AssetList, WatchlistCard, AI Market Brief under en "Se mer"-seksjon som kan ekspanderes
5. For nye brukere (ingen trades/sesjoner): vis `FirstTradeCard` eller `GetStartedCard` prominent

**Minimums-endring (lavere risiko):**
- Bytt rekkefoelje: PortfolioBalance foerst, QuickActions nest, resten under

---

## Oppgave 6: Rute-konsolidering profile/konto

**Maal:** Slaa sammen `/profile` og `/konto` til en rute med tabs.

**Forslag:**
1. I `src/app/[locale]/(user)/profile/page.tsx` - legg til tabs: Profil | Lommebok | Innstillinger
2. I `src/app/[locale]/(user)/konto/page.tsx` - redirect til `/profile?tab=wallet`
3. Oppdater `src/middleware.ts` med redirect fra `/konto` til `/profile`
4. Oppdater navigasjonslenker i sidebar/TopNav

---

## Oppgave 7: Sentral nav-config

**Ny fil:** `src/lib/navigation/config.ts`

```typescript
export type NavRole = 'guest' | 'auth' | 'admin';

export interface NavItem {
  key: string;
  href: string;
  labelKey: string;
  icon?: string;
  roles: NavRole[];
  children?: NavItem[];
}

export const NAV_CONFIG: NavItem[] = [
  { key: 'home', href: '/dashboard', labelKey: 'dashboard.sidebar.home', roles: ['auth'] },
  { key: 'trade', href: '/dashboard/trade', labelKey: 'dashboard.sidebar.trade', roles: ['auth'] },
  { key: 'ai', href: '/dashboard/ai', labelKey: 'dashboard.sidebar.ai', roles: ['auth'] },
  { key: 'portfolio', href: '/dashboard/portfolio', labelKey: 'dashboard.sidebar.portfolio', roles: ['auth'] },
  { key: 'courses', href: '/kurs', labelKey: 'navigation.courses', roles: ['guest', 'auth'] },
  { key: 'pricing', href: '/priser', labelKey: 'navigation.pricing', roles: ['guest'] },
  // ... etc
];
```

Deretter oppdater `BottomTabs.tsx`, `TopNav.tsx`, `DashboardSidebar.tsx` til aa lese fra denne config.

---

## Oppgave 8: Onboarding steg-reduksjon

**Maal:** Reduser fra 5 til 3-4 steg. Binance-kobling valgfritt.

**Forslag:**
1. Slaa sammen step1 (welcome) og step2 (experience) til ett steg
2. Behold step3 (trading-mode)
3. Gjoer step4 (binance) til valgfritt med "Gjoer dette senere"-knapp
4. Behold step5 (complete) men forenkle
5. Legg til progress-bar paa toppen (enkel div med bredde i prosent)

---

## Oppgave 9-11: Fase 3 features (lavere prioritet)

Disse kan implementeres etter Fase 1 og 2 er ferdig:

9. **Leaderboard-preview:** Ny komponent `src/features/landing/LeaderboardPreview.tsx` som henter topp 3 fra `/api/auto-trading/leaderboard` og viser dem med "Konkurrer om 50k KLT" CTA. Legg til i `page.tsx` etter `BacktestROICoupled`.

10. **KLT-teaser under hero:** I `page.tsx`, etter `TrustStrip`, legg til en enkel linje-komponent: "Tjen KLT gjennom kurs og konkurranser - 50 000 KLT til maanedens vinner" med lenke til `/leaderboard`.

11. **Dynamisk brukertall:** I `Testimonials.tsx`, erstatt "Vaart fellesskap" med et tall hentet fra `/api/stats` eller Supabase `user_profiles` count.

---

## Rekkefoelje for implementering

1. Oppgave 1 (onboarding emoji + redirect) - 2 linjer aa endre
2. Oppgave 2 (gjenvaerende emojis) - 8 filer
3. Oppgave 3 (gradient token-konsistens) - 6 filer
4. Oppgave 4 (hardkodet #0052FF) - 2 filer
5. Oppgave 5 (dashboard forenkling) - 1 fil, stoerre endring
6. Oppgave 6 (rute-konsolidering) - middleware + 2 sider
7. Oppgave 7 (nav-config) - ny fil + 3 oppdateringer
8. Oppgave 8 (onboarding reduksjon) - steg-filer

**Kjoer `npm run type-check` og `npm run lint` etter hver oppgave for aa sikre at ingenting brekker.**
