# Klarpakke – Komplett Optimalisering & Modernisering

## Din rolle
Du er senior fullstack-engineer som optimaliserer Klarpakke (klarpakke.no) — en norsk crypto trading-plattform bygget med Next.js 15, Supabase, Vercel.

**Mål:** Dramatisk forbedre ytelse, live-opplevelse og kodekvalitet. Følg prioritert rekkefølge.

---

## Tech Stack
- **Frontend:** Next.js 15.5 App Router, React 19, TypeScript (strict: false), Tailwind CSS, Framer Motion
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **State:** React Query (konfigurert men UBRUKT), Zustand (installert men UBRUKT)
- **Hosting:** Vercel (arn1 region), domene: klarpakke.no
- **i18n:** next-intl, locales: no (default), en, th, zh, prefix: always
- **Payments:** Stripe
- **Monitoring:** Sentry (konfigurert men deaktivert)

---

## FASE 1: KRITISK — Gjør dette først (dag 1)

### 1.1 Fjern .env.production fra git (SIKKERHETS-KRITISK)

`.env.production` inneholder LIVE Supabase-, Stripe- og Sentry-nøkler og er committet til git.

```bash
# Legg til i .gitignore
echo ".env.production" >> .gitignore

# Fjern fra git (behold lokalt)
git rm --cached .env.production
git commit -m "security: remove .env.production from git tracking"

# VIKTIG: Regenerer ALLE nøkler i Supabase, Stripe og Sentry dashboard
# Sett nye verdier i Vercel Dashboard → Settings → Environment Variables
```

### 1.2 Middleware: Cache onboarding-sjekk i cookie

**Problem:** `src/middleware.ts:230-272` kjører DB-query (`user_profiles.onboarding_completed`) på HVER beskyttede sidevisning. 150+ unødvendige queries per sesjon.

**Fix:**
```typescript
// src/middleware.ts — erstatt linje 230-272

// Sjekk cookie først (satt etter første DB-sjekk)
const onboardingCookie = request.cookies.get('klp_onboarding_done')?.value;

if (user && isProtected && !shouldSkipOnboardingCheck) {
  if (onboardingCookie === 'true') {
    // Allerede verifisert — skip DB-query
  } else {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed, setup_completed_at")
      .eq("id", user.id)
      .single();

    const onboardingCompleted = profile?.onboarding_completed || !!profile?.setup_completed_at;

    if (onboardingCompleted) {
      // Sett cookie som varer i 24 timer
      const response = NextResponse.next();
      response.cookies.set('klp_onboarding_done', 'true', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 86400, // 24 timer
        path: '/',
      });
      return response;
    } else {
      // Redirect til onboarding
      return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
    }
  }
}
```

### 1.3 ISR på statiske sider

Legg til `revalidate` eksport på sider som sjelden endres:

```typescript
// src/app/[locale]/page.tsx (forsiden)
export const revalidate = 3600; // 1 time

// src/app/[locale]/om-oss/page.tsx
export const revalidate = 86400; // 24 timer

// src/app/[locale]/personvern/page.tsx
export const revalidate = 86400;

// src/app/[locale]/vilkar/page.tsx
export const revalidate = 86400;

// src/app/[locale]/hjelp/page.tsx
export const revalidate = 86400;

// src/app/[locale]/kontakt/page.tsx
export const revalidate = 86400;

// src/app/[locale]/kurs/page.tsx
export const revalidate = 3600;

// src/app/[locale]/priser/page.tsx
export const revalidate = 3600;
```

### 1.4 Fjern `'unsafe-eval'` fra CSP

**Fil:** `public/_headers` — Fjern `'unsafe-eval'` fra `script-src`. Det er en XSS-risiko og er ikke nødvendig.

---

## FASE 2: YTELSE — Polling → Realtime + Cache (dag 2-3)

### 2.1 Realtime priser (10s → <100ms)

**Problem:** `src/lib/hooks/useRealtimePrices.ts:92-96` bruker `setInterval(fetchPrices, 10000)`.

**Fix:** Erstatt med Supabase Realtime eller direkte Binance WebSocket:

```typescript
// src/lib/hooks/useRealtimePrices.ts — ny versjon

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  updatedAt: string;
}

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Binance WebSocket for live priser
    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect etter 3s
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          // Trigger re-render for reconnect
        }
      }, 3000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.s && data.c) {
        setPrices(prev => ({
          ...prev,
          [data.s]: {
            symbol: data.s,
            price: parseFloat(data.c),
            change24h: parseFloat(data.P),
            updatedAt: new Date().toISOString(),
          }
        }));
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [symbols.join(',')]);

  return { prices, connected };
}
```

**VIKTIG:** Fjern hardkodet USD→NOK kurs (`* 11.5` på linje 114). Hent live kurs:
```typescript
// Hent NOK-kurs fra ECB eller Norges Bank API
const fetchNOKRate = async () => {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await res.json();
  return data.rates.NOK; // ~11.2
};
```

### 2.2 Installer og konfigurer Vercel KV

**Problem:** `src/lib/cache.ts` bruker in-memory Map — dør ved serverless cold start.

```bash
npm install @vercel/kv
```

```typescript
// src/lib/kv-cache.ts — ny fil
import { kv } from '@vercel/kv';

export async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await kv.get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await kv.set(key, fresh, { ex: ttlSeconds });
  return fresh;
}

// Bruk i API-ruter:
// const prices = await getCached('binance:prices', 10, () => fetchBinancePrices());
// const botStatus = await getCached(`bot:${userId}`, 30, () => fetchBotStatus(userId));
```

Sett opp i Vercel Dashboard:
1. Gå til Storage → Create → KV
2. Koble til prosjektet
3. Environment variables legges til automatisk (`KV_REST_API_URL`, `KV_REST_API_TOKEN`)

### 2.3 API Cache-Control headers

```typescript
// src/app/api/prices/binance/route.ts — legg til headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
  }
});

// src/app/api/dashboard/bot-status/route.ts — endre fra force-dynamic
export const revalidate = 30; // Erstatt `dynamic = "force-dynamic"`
```

### 2.4 Fjern admin polling — bruk Realtime

**Filer:**
- `src/app/[locale]/admin/campaign/ClientCampaign.tsx` — `setInterval(fetchStats, 30000)`
- `src/app/[locale]/admin/sync-status/ClientSyncStatus.tsx` — `setInterval(fetchStats, 30000)`

Erstatt med Supabase Realtime:
```typescript
useEffect(() => {
  const supabase = createClient();
  const channel = supabase.channel('admin-stats')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'campaign_stats' // eller relevant tabell
    }, (payload) => {
      setStats(prev => ({ ...prev, ...payload.new }));
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

---

## FASE 3: REACT QUERY + STATE (dag 3-4)

### 3.1 Migrer dashboard til React Query

**Problem:** `UnifiedTradingDashboard.tsx` har 11 `useState` + manuell `useEffect`-fetching.

```typescript
// src/lib/hooks/usePortfolio.ts — ny fil
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('paper_balance, real_balance, tier')
        .eq('user_id', userId)
        .single();
      return data;
    },
    staleTime: 30_000,     // 30s fresh
    refetchInterval: 60_000, // Auto-refresh hvert minutt
  });
}

// src/lib/hooks/useRecentTrades.ts — ny fil
export function useRecentTrades(userId: string) {
  return useQuery({
    queryKey: ['trades', userId, 'recent'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    staleTime: 10_000,
  });
}

// src/lib/hooks/useActiveStrategies.ts — ny fil
export function useActiveStrategies(userId: string) {
  return useQuery({
    queryKey: ['strategies', userId, 'active'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_strategies')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// src/lib/hooks/useBotStatus.ts — ny fil
export function useBotStatus(userId: string) {
  return useQuery({
    queryKey: ['bot-status', userId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/bot-status?userId=${userId}`);
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
```

**Bruk i dashboard:**
```typescript
// src/components/trading/UnifiedTradingDashboard.tsx — forenklet
function UnifiedTradingDashboard() {
  const { user } = useAuth();
  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(user.id);
  const { data: trades, isLoading: loadingTrades } = useRecentTrades(user.id);
  const { data: strategies } = useActiveStrategies(user.id);
  const { data: botStatus } = useBotStatus(user.id);

  // Fjern alle 11 useState + useEffect — React Query håndterer alt
  // ...
}
```

### 3.2 Zustand store for global trading state

```typescript
// src/stores/trading-store.ts — ny fil
import { create } from 'zustand';

interface TradingState {
  mode: 'paper' | 'live';
  setMode: (mode: 'paper' | 'live') => void;
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  mode: 'paper',
  setMode: (mode) => set({ mode }),
  selectedPair: 'BTCUSDT',
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

## FASE 4: KOMPONENT-SPLITTING + DYNAMIC IMPORTS (dag 4-5)

### 4.1 Split UnifiedTradingDashboard (956 linjer → 5 filer)

```
src/components/trading/
├── UnifiedTradingDashboard.tsx   → 150 linjer (container + layout)
├── PortfolioPanel.tsx            → ekstraher fra linje 386-451
├── StrategySelector.tsx          → ekstraher fra linje 580-736
├── RecentTradesList.tsx          → ekstraher fra linje 513-578
└── TradingModeToggle.tsx         → ekstraher fra linje 354-384 (VIKTIG: definert INNE i komponenten, recreated every render)
```

### 4.2 Dynamic imports for modaler og tunge komponenter

```typescript
// I BotStatusDashboard.tsx (eller andre steder som bruker AdvancedStatsModal)
import dynamic from 'next/dynamic';

const AdvancedStatsModal = dynamic(
  () => import('@/components/trading/AdvancedStatsModal'),
  { loading: () => <div className="animate-pulse h-96 bg-gray-800 rounded-xl" /> }
);

// Andre kandidater for dynamic import:
const CopyTradingPanel = dynamic(() => import('@/components/trading/CopyTradingPanel'));
const Leaderboard = dynamic(() => import('@/components/trading/Leaderboard'));
const PlanSelectionWizard = dynamic(() => import('@/components/trading/PlanSelectionWizard'));
```

### 4.3 Legg til loading.tsx for progressive rendering

```typescript
// src/app/[locale]/dashboard/loading.tsx — ny fil
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 space-y-6 animate-pulse">
      <div className="h-12 bg-gray-800 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-800 rounded-xl" />
      </div>
      <div className="h-96 bg-gray-800 rounded-xl" />
    </div>
  );
}

// Lag tilsvarende for:
// src/app/[locale]/auto-trading/loading.tsx
// src/app/[locale]/signals/loading.tsx
// src/app/[locale]/leaderboard/loading.tsx
// src/app/[locale]/copy-trading/loading.tsx
```

---

## FASE 5: NEXT.JS 15 MODERNISERING (dag 5-7)

### 5.1 Server Components for dashboard data-fetching

```typescript
// src/app/[locale]/dashboard/page.tsx — ny versjon
import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth-guard';
import DashboardLoading from './loading';

// Server component — henter data parallelt
export default async function DashboardPage({ params }) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);

  // Parallell data-fetching på server
  const [portfolioRes, tradesRes, strategiesRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('user_strategies').select('*').eq('user_id', user.id).eq('status', 'active'),
  ]);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <UnifiedTradingDashboard
        initialPortfolio={portfolioRes.data}
        initialTrades={tradesRes.data ?? []}
        initialStrategies={strategiesRes.data ?? []}
        userId={user.id}
      />
    </Suspense>
  );
}
```

### 5.2 Server Actions for strategi start/stopp

```typescript
// src/actions/trading.ts — ny fil
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function startStrategy(strategyId: string, params: Record<string, any>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('user_strategies')
    .update({ status: 'active', params, started_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/[locale]/dashboard', 'page');
  return { success: true };
}

export async function stopStrategy(strategyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('user_strategies')
    .update({ status: 'stopped', stopped_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/[locale]/dashboard', 'page');
  return { success: true };
}
```

### 5.3 Parallel Routes for dashboard (valgfritt, avansert)

```
src/app/[locale]/dashboard/
├── layout.tsx              → Dashboard shell med sidebar
├── page.tsx                → Oversikt (default)
├── @portfolio/
│   ├── page.tsx            → Portfolio-panel (laster uavhengig)
│   └── loading.tsx
├── @trades/
│   ├── page.tsx            → Trades-liste (laster uavhengig)
│   └── loading.tsx
└── @strategies/
    ├── page.tsx            → Strategi-panel (laster uavhengig)
    └── loading.tsx
```

---

## FASE 6: VERCEL + SUPABASE INFRASTRUKTUR (dag 6-7)

### 6.1 Vercel multi-region

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["arn1", "lhr1"],
  "crons": [{
    "path": "/api/cron/tick",
    "schedule": "*/5 * * * *"
  }]
}
```

### 6.2 Rate limiting

```typescript
// src/middleware.ts — legg til rate limiting for API
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minutt
});

// I middleware, for API-ruter:
if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
}
```

### 6.3 Supabase: Manglende indexes

```sql
-- Kjør i Supabase SQL Editor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_strategies_user_status
  ON user_strategies (user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_created
  ON trades (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trading_sessions_user_status
  ON trading_sessions (user_id, status);

ANALYZE user_strategies;
ANALYZE trades;
ANALYZE trading_sessions;
```

### 6.4 Bundle analyzer

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.mjs — legg til
import withBundleAnalyzer from '@next/bundle-analyzer';

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyzer(withNextIntl(nextConfig));
```

Kjør: `ANALYZE=true npm run build` for å se bundle-størrelse.

### 6.5 Aktiver Sentry

I `next.config.mjs` linje 173 — endre:
```javascript
sourcemaps: {
  disable: false, // Var: true
},
```

Sett `SENTRY_DSN` og `SENTRY_AUTH_TOKEN` i Vercel environment variables.

---

## FASE 7: API-KONSOLIDERING (dag 7+)

### 7.1 Slå sammen redundante trading-endpoints

Nåværende (6 separate ruter):
- `/api/trading/sessions` (GET/POST/PATCH)
- `/api/trading/execute`
- `/api/trading/trigger`
- `/api/trading/price`
- `/api/dashboard/bot-status`
- `/api/prices/binance`

Konsolider til:
- `/api/trading` — GET: list sessions, POST: create session, PATCH: update
- `/api/trading/[id]/execute` — POST: execute trade
- `/api/prices` — GET: alle priser (merge binance + bot-status)

### 7.2 N+1 query-fix i bot-status

**Fil:** `src/app/api/dashboard/bot-status/route.ts:72-137`

Nåværende: 2 separate `trades`-queries (en for siste trades, en for P&L).

**Fix:** Kombiner til én query:
```typescript
const { data } = await supabase
  .from('trades')
  .select('id, type, amount, price, realized_pnl, executed_at, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20);

// Beregn P&L fra samme dataset
const pnl = data?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) ?? 0;
const lastTrades = data?.slice(0, 5) ?? [];
```

---

## SJEKKLISTE

- [ ] Fase 1: .env.production fjernet fra git, nøkler regenerert
- [ ] Fase 1: Middleware cookie-cache for onboarding
- [ ] Fase 1: ISR på 8+ statiske sider
- [ ] Fase 1: CSP unsafe-eval fjernet
- [ ] Fase 2: Binance WebSocket for live priser
- [ ] Fase 2: Vercel KV installert og konfigurert
- [ ] Fase 2: Cache-Control headers på API-ruter
- [ ] Fase 2: Admin polling → Realtime
- [ ] Fase 3: React Query hooks (portfolio, trades, strategies, bot-status)
- [ ] Fase 3: Zustand trading store
- [ ] Fase 4: UnifiedTradingDashboard splittet (956→5 filer)
- [ ] Fase 4: Dynamic imports for modaler
- [ ] Fase 4: loading.tsx på 5+ ruter
- [ ] Fase 5: Server Components for dashboard
- [ ] Fase 5: Server Actions for strategi start/stopp
- [ ] Fase 6: Multi-region i vercel.json
- [ ] Fase 6: Rate limiting
- [ ] Fase 6: Manglende DB-indexes
- [ ] Fase 6: Bundle analyzer
- [ ] Fase 6: Sentry aktivert
- [ ] Fase 7: API-konsolidering
- [ ] Fase 7: N+1 query-fix

---

## VIKTIGE REGLER

1. **TypeScript strict er OFF** — ikke aktiver det, ikke legg til strenge typer overalt
2. **Alle interne linker MÅ bruke locale-prefix:** `/${locale}/path`
3. **Root layout (`src/app/layout.tsx`) er pass-through** — ALDRI legg til HTML/body der
4. **Kun `[locale]/layout.tsx` renderer `<html>` og `<body>`**
5. **Supabase klient:** Browser: `@/lib/supabase/client`, Server: `@/lib/supabase/server`
6. **user_profiles:** PK er `id` = `auth.users.id`, FK-kjede: `trading_sessions.user_id → user_profiles.id`
7. **Ikke bruk deprecated tabeller:** `auto_trading_sessions`, `auto_trading_trades`, `unified_trading_sessions`
8. **Test etter hver fase:** `npx playwright test tests/e2e/launch-qa.spec.ts --project="Desktop Chrome"`
