# KIMI 2.5 - FIX ALL CRITICAL BUGS + PAPER TRADING DISPLAY ISSUE

**Generert:** 2026-03-09 17:23 CET  
**Prioritet:** P0 - KRITISK  
**Estimat:** 4-6 timer  
**Eier:** KIMI 2.5 (AI Developer)

---

## KONTEKST

Du er senior fullstack developer (Next.js 15 + Supabase expert). Klarpakke production har 2 kritiske issues:

### Issue 1: Paper Trading Bots Viser Ikke Data (P0 - BLOCKER)
**Brukerrapport:** "Jeg startet 3 bots på paper trading med 100,000 USDT hver. Ingenting vises i dashboard."

**Symptomer:**
- Bots er opprettet (antakelig i database)
- Dashboard viser tom state eller loading state
- Ingen trade history
- Ingen profitt/loss data
- Total investert: 300,000 USDT (ikke synlig)

**Mulige rotårsaker:**
1. Frontend henter ikke data fra Supabase (query feil)
2. Bot execution kjører ikke (cron job / Vercel Function feil)
3. Paper trading simulator ikke implementert
4. RLS policies blokkerer data fetch
5. Bot status stuck i "pending" (ikke "active")

### Issue 2: Performance - LCP 6.4s (P0 - BLOCKER for KLA-129)
**System test funn:** Largest Contentful Paint er 6.4s (target <2.5s)

**Impact:**
- Dårlig brukeropplevelse (6+ sekunder før innhold vises)
- Lav SEO-ranking (Google Core Web Vitals fail)
- Høy bounce rate
- Lighthouse score 64/100 (target >90)

**Rotårsaker (bekreftet):**
1. Bilder ikke optimalisert (mangler `priority` flag)
2. Webfonts blokkerer render (mangler `font-display: swap`)
3. Stor JavaScript bundle (mangler code-splitting)
4. Kritisk CSS ikke preloaded

---

## DIN OPPGAVE

Fix både Issue 1 og Issue 2 i følgende rekkefølge:

**Fase 1: DIAGNOSTIKK (30 min)**
1. Inspiser database for bots og trades
2. Identifiser hvorfor bots ikke vises
3. Identifiser LCP-element på homepage

**Fase 2: FIX PAPER TRADING (2-3 timer)**
1. Fix bot display issue
2. Implementer paper trading simulator (hvis mangler)
3. Test at alle 3 bots vises med korrekt data

**Fase 3: FIX LCP (1-2 timer)**
1. Optimaliser bilder
2. Preload CSS/fonts
3. Code-split JavaScript

**Fase 4: VERIFISER (30 min)**
1. Test paper trading i production
2. Test Lighthouse score
3. Dokumenter fixes

---

## FASE 1: DIAGNOSTIKK (30 minutter)

### Steg 1.1: Inspiser Supabase Database

**Tool:** Supabase SQL Editor (https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/editor)

**Queries å kjøre:**

```sql
-- 1. Sjekk om bots eksisterer
SELECT 
  id,
  user_id,
  name,
  status,
  is_paper_trading,
  initial_capital,
  created_at,
  updated_at
FROM bot_configurations
WHERE is_paper_trading = true
ORDER BY created_at DESC
LIMIT 10;

-- Forventet: 3 rader med status 'active' eller 'pending'
-- Hvis 0 rader: Bots ble ikke opprettet (frontend issue)
-- Hvis status != 'active': Bot execution starter ikke

-- 2. Sjekk om trades eksisterer
SELECT 
  t.id,
  t.bot_id,
  t.trade_type,
  t.symbol,
  t.quantity,
  t.price,
  t.total,
  t.fee,
  t.created_at
FROM trades t
JOIN bot_configurations b ON t.bot_id = b.id
WHERE b.is_paper_trading = true
ORDER BY t.created_at DESC
LIMIT 20;

-- Forventet: Minst noen trades (avhenger av hvor lenge bots har kjørt)
-- Hvis 0 rader: Bot execution kjører ikke (backend issue)

-- 3. Sjekk bot_health (heartbeat)
SELECT 
  bh.bot_id,
  b.name,
  bh.last_heartbeat,
  bh.error_count,
  bh.last_error_message,
  NOW() - bh.last_heartbeat AS time_since_heartbeat
FROM bot_health bh
JOIN bot_configurations b ON bh.bot_id = b.id
WHERE b.is_paper_trading = true
ORDER BY bh.last_heartbeat DESC;

-- Forventet: last_heartbeat < 5 minutter siden
-- Hvis > 5 min: Bot execution er stoppet (cron job issue)
-- Hvis last_error_message IS NOT NULL: Bot crashet

-- 4. Sjekk RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('bot_configurations', 'trades', 'bot_health')
ORDER BY tablename, policyname;

-- Forventet: Policies tillater SELECT for authenticated users
-- Hvis qual (condition) er feil: RLS blokkerer data fetch
```

**Dokumenter resultatene:**
```markdown
### Diagnostikk Resultat

**Bots funnet:** X (forventet: 3)
**Bot status:** [active/pending/stopped]
**Trades funnet:** X (forventet: >0 hvis bots har kjørt >5 min)
**Last heartbeat:** X minutter siden (forventet: <5 min)
**RLS issues:** [Ja/Nei]

**Konklusjon:** 
[Beskriv hva som er årsaken til at bots ikke vises]
```

---

### Steg 1.2: Inspiser Frontend Dashboard Code

**Filer å sjekke:**

1. **Dashboard page:**
   - Finn: `app/(dashboard)/dashboard/page.tsx` eller `app/dashboard/page.tsx`
   - Sjekk: Hvordan bots fetches fra Supabase
   - Søk etter: `supabase.from('bot_configurations').select()`

2. **Bot list component:**
   - Finn: `components/BotList.tsx` eller `app/(dashboard)/dashboard/_components/BotList.tsx`
   - Sjekk: Loading states, error handling

3. **Supabase client:**
   - Finn: `lib/supabase.ts` eller `utils/supabase.ts`
   - Sjekk: Client configuration, auth setup

**Query template å søke etter:**
```typescript
// FORVENTET (korrekt implementasjon):
const { data: bots, error } = await supabase
  .from('bot_configurations')
  .select('*, trades(count)')
  .eq('is_paper_trading', true)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Failed to fetch bots:', error);
  return [];
}

return bots;
```

**Vanlige bugs å se etter:**
- [ ] Query har feil tabell-navn (`bots` vs `bot_configurations`)
- [ ] Query mangler `.eq('user_id', userId)` (henter alle brukeres bots)
- [ ] RLS policy blokkerer (check `error.code === 'PGRST301'`)
- [ ] Loading state vises permanent (never resolves)
- [ ] Error state ikke håndtert (silent failure)

**Dokumenter funn:**
```markdown
### Frontend Code Review

**Dashboard file:** [path]
**Query found:** [Ja/Nei]
**Query korrekt:** [Ja/Nei]
**Error handling:** [Ja/Nei]
**Loading state:** [Implementert/Mangler]

**Bugs funnet:**
1. [Bug beskrivelse]
2. [Bug beskrivelse]
```

---

### Steg 1.3: Inspiser Bot Execution Backend

**Filer å sjekke:**

1. **Cron job / scheduled task:**
   - Finn: `.github/workflows/bot-execution.yml` eller `vercel.json` (cron config)
   - Sjekk: Kjører hver 1-5 minutt?

2. **Bot execution function:**
   - Finn: `app/api/cron/execute-bots/route.ts` eller `lib/bot-executor.ts`
   - Sjekk: Logikk for å kjøre paper trading bots

3. **Paper trading simulator:**
   - Finn: `lib/paper-trading-simulator.ts` eller lignende
   - Sjekk: Implementert eller stub?

**Forventet implementasjon:**
```typescript
// app/api/cron/execute-bots/route.ts
export async function GET(request: Request) {
  // 1. Fetch active paper trading bots
  const { data: bots } = await supabase
    .from('bot_configurations')
    .select('*')
    .eq('status', 'active')
    .eq('is_paper_trading', true);

  // 2. Execute each bot
  for (const bot of bots) {
    try {
      await executePaperTradingBot(bot);
      
      // Update heartbeat
      await supabase
        .from('bot_health')
        .upsert({
          bot_id: bot.id,
          last_heartbeat: new Date().toISOString(),
          error_count: 0,
        });
    } catch (error) {
      console.error(`Bot ${bot.id} failed:`, error);
      
      // Log error
      await supabase
        .from('bot_health')
        .upsert({
          bot_id: bot.id,
          last_error_message: error.message,
          error_count: (bot.error_count || 0) + 1,
        });
    }
  }

  return Response.json({ success: true, executed: bots.length });
}

// lib/paper-trading-simulator.ts
export async function executePaperTradingBot(bot: Bot) {
  // 1. Fetch current price from Binance
  const price = await getBinancePrice(bot.symbol);
  
  // 2. Decide: buy or sell? (based on strategy)
  const decision = await evaluateStrategy(bot, price);
  
  if (decision === 'buy') {
    // 3. Simulate buy order
    const quantity = calculateQuantity(bot.available_capital, price);
    const fee = quantity * price * 0.001; // 0.1% Binance fee
    const total = quantity * price + fee;
    
    // 4. Insert trade record
    await supabase.from('trades').insert({
      bot_id: bot.id,
      trade_type: 'buy',
      symbol: bot.symbol,
      quantity,
      price,
      total,
      fee,
      is_paper_trade: true,
    });
    
    // 5. Update bot balance
    await supabase
      .from('bot_configurations')
      .update({
        available_capital: bot.available_capital - total,
        holdings: bot.holdings + quantity,
      })
      .eq('id', bot.id);
  }
  
  // Similar logic for 'sell'
}
```

**Vanlige bugs:**
- [ ] Cron job ikke konfigurert (ingen scheduled execution)
- [ ] Cron job kjører ikke (Vercel/GitHub Actions config feil)
- [ ] `executePaperTradingBot` ikke implementert (stub function)
- [ ] Binance API ikke tilgjengelig i paper trading (burde bruke mock prices)
- [ ] Trades inserts feiler (RLS policy eller schema mismatch)

**Dokumenter funn:**
```markdown
### Backend Execution Review

**Cron job configured:** [Ja/Nei]
**Execution function exists:** [Ja/Nei]
**Paper trading simulator:** [Implementert/Stub/Mangler]

**Bugs funnet:**
1. [Bug beskrivelse]
2. [Bug beskrivelse]
```

---

### Steg 1.4: Identifiser LCP Element

**Tool:** Chrome DevTools

**Steg:**
1. Åpne https://www.klarpakke.no i Chrome
2. Åpne DevTools (F12)
3. Gå til Console tab
4. Kjør:
   ```javascript
   new PerformanceObserver((list) => {
     const entries = list.getEntries();
     const lastEntry = entries[entries.length - 1];
     console.log('LCP element:', lastEntry.element);
     console.log('LCP time:', lastEntry.renderTime || lastEntry.loadTime);
     console.log('LCP size:', lastEntry.size);
   }).observe({entryTypes: ['largest-contentful-paint']});
   ```
5. Refresh page (Cmd+R)
6. Noter LCP element (f.eks. `<img>`, `<h1>`, `<div>`)

**Dokumenter:**
```markdown
### LCP Diagnostikk

**LCP Element:** [HTML tag og selector]
**LCP Time:** 6.4s
**Element type:** [Image/Text/Background]
**File:** [path til asset, hvis image]
**Size:** [file size, hvis image]

**Konklusjon:**
[Beskriv hva som forårsaker LCP delay]
```

---

## FASE 2: FIX PAPER TRADING (2-3 timer)

Basert på diagnostikk fra Fase 1, implementer fixes:

### Fix 2.1: Database Schema (hvis mangler)

Hvis `bot_configurations` tabell mangler kolonner for paper trading:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_paper_trading_columns.sql
ALTER TABLE bot_configurations ADD COLUMN IF NOT EXISTS is_paper_trading BOOLEAN DEFAULT false;
ALTER TABLE bot_configurations ADD COLUMN IF NOT EXISTS initial_capital NUMERIC(20,8);
ALTER TABLE bot_configurations ADD COLUMN IF NOT EXISTS available_capital NUMERIC(20,8);
ALTER TABLE bot_configurations ADD COLUMN IF NOT EXISTS holdings NUMERIC(20,8) DEFAULT 0;

ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_paper_trade BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bots_paper_trading ON bot_configurations(is_paper_trading, status) WHERE is_paper_trading = true;
CREATE INDEX IF NOT EXISTS idx_trades_bot_paper ON trades(bot_id, created_at) WHERE is_paper_trade = true;
```

**Push migration:**
```bash
supabase db push
```

---

### Fix 2.2: RLS Policies (hvis blokkerer)

Hvis RLS policies blokkerer data fetch:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_fix_rls_policies.sql

-- Allow users to read their own bots
CREATE POLICY "Users can view own bots"
ON bot_configurations
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to read trades for their bots
CREATE POLICY "Users can view own bot trades"
ON trades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_configurations
    WHERE bot_configurations.id = trades.bot_id
    AND bot_configurations.user_id = auth.uid()
  )
);

-- Allow system to insert trades (for cron job)
CREATE POLICY "System can insert trades"
ON trades
FOR INSERT
WITH CHECK (true); -- ⚠️ Use service role key for cron job
```

**Push migration:**
```bash
supabase db push
```

---

### Fix 2.3: Frontend Dashboard Query

**File:** `app/(dashboard)/dashboard/page.tsx` (eller ekvivalent)

```typescript
// app/(dashboard)/dashboard/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Fetch bots with aggregated stats
  const { data: bots, error } = await supabase
    .from('bot_configurations')
    .select(`
      *,
      trades!inner(count),
      bot_health(
        last_heartbeat,
        error_count,
        last_error_message
      )
    `)
    .eq('user_id', user.id)
    .eq('is_paper_trading', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch bots:', error);
    return <div>Error loading bots: {error.message}</div>;
  }
  
  // Calculate total invested
  const totalInvested = bots?.reduce((sum, bot) => {
    return sum + (parseFloat(bot.initial_capital) || 0);
  }, 0) || 0;
  
  // Calculate total current value
  const totalValue = bots?.reduce((sum, bot) => {
    const available = parseFloat(bot.available_capital) || 0;
    const holdings = parseFloat(bot.holdings) || 0;
    // TODO: Fetch current price to calculate holdings value
    return sum + available + holdings * currentPrice;
  }, 0) || 0;
  
  const totalProfit = totalValue - totalInvested;
  const totalProfitPct = (totalProfit / totalInvested) * 100;
  
  return (
    <div className="container mx-auto p-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Investert"
          value={`${totalInvested.toLocaleString('nb-NO')} USDT`}
          icon={<TrendingUpIcon />}
        />
        <StatsCard
          title="Nåværende Verdi"
          value={`${totalValue.toLocaleString('nb-NO')} USDT`}
          icon={<WalletIcon />}
        />
        <StatsCard
          title="Total Profitt"
          value={`${totalProfit.toLocaleString('nb-NO')} USDT`}
          subtitle={`${totalProfitPct >= 0 ? '+' : ''}${totalProfitPct.toFixed(2)}%`}
          className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}
          icon={<ChartIcon />}
        />
      </div>
      
      {/* Bot List */}
      {bots && bots.length > 0 ? (
        <BotList bots={bots} />
      ) : (
        <EmptyState
          title="Ingen bots ennå"
          description="Opprett din første paper trading bot for å komme i gang"
          action={
            <Button href="/dashboard/bots/new">
              Opprett Bot
            </Button>
          }
        />
      )}
    </div>
  );
}
```

**Test:**
1. Gå til https://www.klarpakke.no/dashboard
2. Verifiser at stats vises:
   - Total Investert: 300,000 USDT (3 bots × 100,000)
   - Nåværende Verdi: [dynamisk basert på trades]
   - Total Profitt: [dynamisk]
3. Verifiser at alle 3 bots vises i listen

---

### Fix 2.4: Paper Trading Simulator

**File:** `lib/paper-trading-simulator.ts`

```typescript
// lib/paper-trading-simulator.ts
import { createClient } from '@supabase/supabase-js';
import Binance from 'binance-api-node';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Use service role (bypasses RLS)
);

const binance = Binance();

export async function executePaperTradingBot(botId: string) {
  // 1. Fetch bot config
  const { data: bot, error: botError } = await supabase
    .from('bot_configurations')
    .select('*')
    .eq('id', botId)
    .single();
  
  if (botError || !bot) {
    throw new Error(`Bot ${botId} not found`);
  }
  
  // 2. Fetch current price
  const ticker = await binance.prices({ symbol: bot.symbol });
  const currentPrice = parseFloat(ticker[bot.symbol]);
  
  // 3. Evaluate strategy (simple DCA example)
  const decision = evaluateDCAStrategy(bot, currentPrice);
  
  if (decision === 'buy') {
    await executeBuy(bot, currentPrice);
  } else if (decision === 'sell') {
    await executeSell(bot, currentPrice);
  }
  
  // 4. Update heartbeat
  await supabase
    .from('bot_health')
    .upsert({
      bot_id: botId,
      last_heartbeat: new Date().toISOString(),
      error_count: 0,
      last_error_message: null,
    });
}

function evaluateDCAStrategy(bot: any, currentPrice: number): 'buy' | 'sell' | 'hold' {
  // Simple DCA: Buy every X minutes if capital available
  const minutesSinceLastTrade = calculateMinutesSinceLastTrade(bot.id);
  const interval = bot.config?.interval || 60; // default 60 min
  
  if (minutesSinceLastTrade >= interval && bot.available_capital > 0) {
    return 'buy';
  }
  
  // TODO: Implement sell logic (take profit, stop loss)
  return 'hold';
}

async function executeBuy(bot: any, price: number) {
  const investAmount = parseFloat(bot.config?.invest_per_order || '1000'); // 1000 USDT per order
  const quantity = investAmount / price;
  const fee = investAmount * 0.001; // 0.1% Binance fee
  const total = investAmount + fee;
  
  // Check if enough capital
  if (bot.available_capital < total) {
    console.warn(`Bot ${bot.id} insufficient capital: ${bot.available_capital} < ${total}`);
    return;
  }
  
  // Insert trade
  const { error: tradeError } = await supabase.from('trades').insert({
    bot_id: bot.id,
    trade_type: 'buy',
    symbol: bot.symbol,
    quantity,
    price,
    total,
    fee,
    is_paper_trade: true,
    executed_at: new Date().toISOString(),
  });
  
  if (tradeError) {
    throw new Error(`Failed to insert trade: ${tradeError.message}`);
  }
  
  // Update bot balance
  const newAvailableCapital = bot.available_capital - total;
  const newHoldings = parseFloat(bot.holdings) + quantity;
  
  const { error: updateError } = await supabase
    .from('bot_configurations')
    .update({
      available_capital: newAvailableCapital,
      holdings: newHoldings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bot.id);
  
  if (updateError) {
    throw new Error(`Failed to update bot: ${updateError.message}`);
  }
  
  console.log(`Bot ${bot.id} executed BUY: ${quantity} ${bot.symbol} @ ${price} USDT`);
}

async function executeSell(bot: any, price: number) {
  // Similar to executeBuy, but reverse
  // TODO: Implement
}

function calculateMinutesSinceLastTrade(botId: string): number {
  // TODO: Query last trade timestamp from database
  return 60; // Stub: assume 60 minutes
}
```

---

### Fix 2.5: Cron Job Configuration

**Option A: Vercel Cron (hvis på Vercel Pro plan)**

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/execute-bots",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**File:** `app/api/cron/execute-bots/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { executePaperTradingBot } from '@/lib/paper-trading-simulator';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Fetch active paper trading bots
    const { data: bots, error } = await supabase
      .from('bot_configurations')
      .select('id')
      .eq('status', 'active')
      .eq('is_paper_trading', true);
    
    if (error) throw error;
    
    // Execute each bot
    const results = await Promise.allSettled(
      bots.map(bot => executePaperTradingBot(bot.id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Executed ${successful} bots, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      executed: successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron execution failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Option B: GitHub Actions (hvis Vercel hobby plan)**

**File:** `.github/workflows/bot-execution.yml`

```yaml
name: Execute Paper Trading Bots

on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch: # Allow manual trigger

jobs:
  execute-bots:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: |
          curl -X GET https://www.klarpakke.no/api/cron/execute-bots \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Setup secrets:**
```bash
# GitHub repo → Settings → Secrets → New secret
Name: CRON_SECRET
Value: [generate random 32-char string]

# Vercel dashboard → Project → Settings → Environment Variables
CRON_SECRET = [same value as GitHub secret]
```

---

### Fix 2.6: Test Paper Trading

**Manuell test:**

1. **Trigger cron manually:**
   ```bash
   curl -X GET https://www.klarpakke.no/api/cron/execute-bots \
     -H "Authorization: Bearer [CRON_SECRET]"
   ```
   
   Forventet response:
   ```json
   {
     "success": true,
     "executed": 3,
     "failed": 0,
     "timestamp": "2026-03-09T17:30:00.000Z"
   }
   ```

2. **Verifiser trades i database:**
   ```sql
   SELECT * FROM trades 
   WHERE is_paper_trade = true 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   
   Forventet: Minst 3 nye trades (1 per bot)

3. **Refresh dashboard:**
   - Gå til https://www.klarpakke.no/dashboard
   - Verifiser at stats oppdateres:
     - Nåværende Verdi (skal endres basert på trades)
     - Total Profitt (skal vises, kan være negativ)
   - Verifiser at trade history vises for hver bot

**Akseptansekriterier:**
- [ ] Alle 3 bots vises i dashboard
- [ ] Total Investert viser 300,000 USDT
- [ ] Nåværende Verdi er dynamisk (ikke hardkodet)
- [ ] Trade history vises (minst 1 trade per bot)
- [ ] Profitt/Loss beregnes korrekt (inkluderer fees)
- [ ] Bot heartbeat < 5 minutter (vises som "Aktiv")

---

## FASE 3: FIX LCP (1-2 timer)

### Fix 3.1: Optimaliser Hero Image

**Steg:**

1. **Identifiser hero image** (fra Fase 1.4 diagnostikk)
   - Forventet: `<img src="/hero.jpg">` eller `<Image src="/hero.jpg">`

2. **Konverter til Next.js Image component med priority**

**File:** `app/page.tsx` (eller `components/Hero.tsx`)

```typescript
// BEFORE (slow):
<img src="/hero.jpg" alt="Klarpakke" className="w-full h-auto" />

// AFTER (fast):
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Klarpakke - Crypto trading bot platform"
  width={1920}
  height={1080}
  priority // ⚠️ CRITICAL: Preload immediately
  quality={85} // Reduce from 100 to 85 (minimal visual loss)
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..." // Generate with sharp
  className="w-full h-auto"
/>
```

3. **Enable Vercel Image Optimization**

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats (smaller size)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache
  },
};

module.exports = nextConfig;
```

**Forventet impact:** -2.5s LCP (6.4s → 3.9s)

---

### Fix 3.2: Preload Critical CSS og Fonts

**File:** `app/layout.tsx`

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // ⚠️ CRITICAL: Show fallback immediately
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="nb" className={inter.variable}>
      <head>
        {/* Preload critical font */}
        <link
          rel="preload"
          href="/_next/static/media/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://supabase.com" />
        <link rel="preconnect" href="https://api.binance.com" />
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
```

**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Ensure font-display: swap */
@layer base {
  :root {
    --font-inter: 'Inter', system-ui, sans-serif;
  }
  
  body {
    font-family: var(--font-inter);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

**Forventet impact:** -0.8s LCP (3.9s → 3.1s)

---

### Fix 3.3: Code-Split JavaScript

**File:** `app/page.tsx`

```typescript
import dynamic from 'next/dynamic';

// Lazy-load non-critical components
const TradingChart = dynamic(
  () => import('@/components/TradingChart'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
    ssr: false, // Client-side only (not needed for SEO)
  }
);

const PriceCalculator = dynamic(
  () => import('@/components/PriceCalculator'),
  { ssr: false }
);

export default function HomePage() {
  return (
    <main>
      {/* Above-the-fold content (loaded immediately) */}
      <Hero />
      <FeaturesSection />
      
      {/* Below-the-fold content (lazy-loaded) */}
      <TradingChart />
      <PriceCalculator />
    </main>
  );
}
```

**Analyze bundle size:**
```bash
npm run build
# Look for large chunks in output
# Target: No chunk >200 KB
```

**Forventet impact:** -0.5s LCP (3.1s → 2.6s) + reduce TBT

---

### Fix 3.4: Enable Edge Runtime

**File:** `app/page.tsx`

```typescript
export const runtime = 'edge'; // Run on Vercel Edge Network (faster TTFB)
export const revalidate = 60; // Cache for 60 seconds (ISR)

export default function HomePage() {
  // ...
}
```

**File:** `app/api/market/prices/route.ts`

```typescript
export const runtime = 'edge'; // API also benefits from Edge

export async function GET(request: Request) {
  // ...
}
```

**Forventet impact:** -0.3s LCP (2.6s → 2.3s) + bedre TTFB

---

### Fix 3.5: Verifiser Performance

**Test 1: Lighthouse (lokal)**
```bash
npx lighthouse http://localhost:3000 --view
```

**Test 2: PageSpeed Insights (production)**
https://pagespeed.web.dev/analysis?url=https://www.klarpakke.no

**Test 3: Vercel Analytics (real-user data)**
1. Gå til Vercel dashboard → Analytics
2. Verifiser metrics:
   - LCP: <2.5s (green)
   - FID: <100ms (green)
   - CLS: <0.1 (green)

**Akseptansekriterier:**
- [ ] Lighthouse Performance score >90
- [ ] LCP <2.5s (target <2.0s)
- [ ] FCP <1.8s
- [ ] TBT <200ms
- [ ] CLS <0.1

---

## FASE 4: VERIFISER OG DOKUMENTER (30 minutter)

### Steg 4.1: End-to-End Test

**Test scenario: Ny bruker oppretter paper trading bot**

1. **Sign up** på https://www.klarpakke.no/signup
   - Email: `test+$(date +%s)@klarpakke.no`
   - Passord: TestPass123!

2. **Verifiser email** (check Resend dashboard)

3. **Opprett paper trading bot:**
   - Navn: "Test Bot E2E"
   - Strategi: DCA
   - Symbol: BTC/USDT
   - Initial capital: 10,000 USDT
   - Interval: 5 minutter

4. **Vent 5 minutter** (la cron job kjøre)

5. **Verifiser dashboard:**
   - [ ] Bot vises med status "Aktiv"
   - [ ] Total Investert: 10,000 USDT
   - [ ] Nåværende Verdi: [dynamisk, tett på 10,000]
   - [ ] Trade history: Minst 1 trade
   - [ ] Profitt/Loss: [dynamisk, kan være positiv eller negativ]

6. **Test performance:**
   - [ ] Dashboard laster <2s
   - [ ] Ingen console errors
   - [ ] Lighthouse score >90

---

### Steg 4.2: Dokumenter Fixes

**File:** `docs/FIX-REPORT-20260309.md`

```markdown
# Fix Report - 2026-03-09

## Issues Fixed

### Issue 1: Paper Trading Bots Ikke Synlig (P0)
**Status:** ✅ FIXED

**Root Cause:**
[Beskriv faktisk rotårsak funnet i Fase 1]

**Fixes Applied:**
1. [Fix beskrivelse]
2. [Fix beskrivelse]

**Files Changed:**
- `app/(dashboard)/dashboard/page.tsx`
- `lib/paper-trading-simulator.ts`
- `app/api/cron/execute-bots/route.ts`
- `supabase/migrations/YYYYMMDDHHMMSS_*.sql`

**Test Results:**
- [ ] 3 bots vises i dashboard
- [ ] Total investert: 300,000 USDT
- [ ] Trades executeres hvert 5. minutt
- [ ] Profitt beregnes korrekt

---

### Issue 2: LCP 6.4s (P0)
**Status:** ✅ FIXED

**Root Cause:**
Hero image ikke optimalisert, webfonts blokkerer render.

**Fixes Applied:**
1. Konvertert til Next.js Image med `priority` flag
2. Enabled AVIF/WebP formats
3. Preloaded fonts med `font-display: swap`
4. Code-split non-critical components
5. Enabled Edge Runtime

**Files Changed:**
- `app/page.tsx`
- `app/layout.tsx`
- `next.config.js`
- `app/globals.css`

**Performance Metrics:**

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| LCP | 6.4s | 2.2s | ✅ |
| FCP | 2.1s | 1.5s | ✅ |
| TBT | 220ms | 180ms | ✅ |
| CLS | 0.004 | 0.004 | ✅ |
| Lighthouse | 64/100 | 93/100 | ✅ |

---

## Deployment

**Committed:** 2026-03-09 17:30 CET
**Deployed:** 2026-03-09 17:35 CET (auto-deploy via Vercel)
**Verified:** 2026-03-09 17:40 CET

**Git commits:**
- `fix: paper trading bot display and execution` (Issue 1)
- `perf: optimize LCP from 6.4s to 2.2s` (Issue 2)

---

## Next Steps

1. ✅ Monitor Sentry for errors (24 timer)
2. ✅ Monitor Vercel Analytics for real-user LCP
3. 🔄 User testing med 3 paper trading bots (Tom Jensen)
4. ✅ GO for KLA-129 (i18n implementation)

---

**Report by:** KIMI 2.5
**Reviewed by:** Perplexity Pro (Chief Architect)
**Approved by:** Tom Jensen (Product Owner)
```

---

## DELIVERABLES

Når alle 4 faser er fullført, lever:

1. **✅ Fase 1: Diagnostikk rapport** (Markdown i docs/)
2. **✅ Fase 2: Paper trading fixes** (Code + migrations)
3. **✅ Fase 3: LCP fixes** (Code changes)
4. **✅ Fase 4: Test report + Fix report** (Markdown i docs/)

**Git commits:**
```bash
git commit -m "fix: paper trading bot display and execution

- Added missing RLS policies for bot_configurations and trades
- Implemented paper trading simulator with Binance API
- Fixed dashboard query to fetch bots with aggregated stats
- Added cron job for bot execution (every 5 min)
- Total invested now shows 300,000 USDT correctly

Closes: Paper trading bots not visible issue
Tested: E2E test passed with 3 bots"

git commit -m "perf: optimize LCP from 6.4s to 2.2s

- Converted hero image to Next.js Image with priority flag
- Enabled AVIF/WebP image formats
- Preloaded fonts with font-display: swap
- Code-split non-critical components (TradingChart, PriceCalculator)
- Enabled Edge Runtime for faster TTFB

Performance:
- LCP: 6.4s → 2.2s (-65%)
- Lighthouse: 64/100 → 93/100
- FCP: 2.1s → 1.5s

Closes: LCP performance issue
Tested: Lighthouse + PageSpeed Insights"

git push origin main
```

---

## SUCCESS CRITERIA

**Issue 1 (Paper Trading) er fikset hvis:**
- [ ] Dashboard viser 3 aktive bots
- [ ] Total Investert: 300,000 USDT
- [ ] Trade history vises for alle bots
- [ ] Profitt/Loss beregnes korrekt (inkl. fees)
- [ ] Bot heartbeat < 5 minutter
- [ ] Cron job kjører hver 5. minutt uten feil

**Issue 2 (LCP) er fikset hvis:**
- [ ] Lighthouse Performance score >90
- [ ] LCP <2.5s (target <2.0s)
- [ ] FCP <1.8s
- [ ] TBT <200ms
- [ ] CLS <0.1
- [ ] No regression i andre metrics

**Overall GO criteria:**
- [ ] Både Issue 1 og Issue 2 er fikset
- [ ] E2E test passed
- [ ] No critical Sentry errors
- [ ] Production verified

---

## NOTES

- **Streng prioritering:** Issue 1 (paper trading) først, Issue 2 (LCP) deretter
- **No shortcuts:** Alle fixes skal være production-ready (ikke hacks)
- **Test thoroughly:** E2E test må passere før deploy
- **Document everything:** Fix report må være komplett for fremtidig referanse
- **Monitor post-deploy:** Sentry + Vercel Analytics i 24 timer

---

**DETTE ER EN STRENGT DEFINERT PROMPT. FØLG ALLE STEG I REKKEFØLGE. INGEN IMPROVISASJON.**

**Estimert tid:** 4-6 timer  
**Deadline:** 2026-03-09 23:00 CET (i dag)  
**Approved by:** Tom Jensen (Product Owner)

---

**START NÅ. GI STATUSOPPDATERINGER HVER TIME.**
