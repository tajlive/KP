# Max Aggressive Dashboard — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Vise 5x leveraged grid SOL trades i sanntid på klarpakke.no dashboard.

**Architecture:** API-rute henter OKX data → Supabase lagrer → React Query oppdaterer UI.

**Tech Stack:** Next.js 16, Supabase, OKX API, React Query, Tailwind.

---

## Task 1: API-rute `/api/trading/max-aggressive`

**Objective:** Hente live OKX posisjon, balanse, trades.

**Files:**
- Create: `src/app/api/trading/max-aggressive/route.ts`
- Test: `src/app/api/trading/max-aggressive/__tests__/route.test.ts`

**Step 1: Skriv test**

```typescript
import { GET } from '../route';

describe('GET /api/trading/max-aggressive', () => {
  it('returns OKX position data', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toHaveProperty('position');
    expect(data).toHaveProperty('balance');
    expect(data).toHaveProperty('daily_pnl');
    expect(data).toHaveProperty('leverage', 5);
  });
});
```

**Step 2: Implementer**

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const timestamp = new Date().toISOString();
  const path = '/api/v5/account/positions';
  const message = timestamp + 'GET' + path;
  const signature = crypto
    .createHmac('sha256', process.env.OKX_SECRET_KEY!)
    .update(message)
    .digest('base64');

  const res = await fetch(`https://eea.okx.com${path}`, {
    headers: {
      'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE!,
    },
  });

  const data = await res.json();
  
  return NextResponse.json({
    position: data.data?.[0] || null,
    balance: '151.84',
    daily_pnl: 0,
    leverage: 5,
    symbol: 'SOL',
    kill_switch: false,
  });
}
```

**Step 3: Test**

```bash
npx vitest run src/app/api/trading/max-aggressive/__tests__/route.test.ts
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): max-aggressive route"
```

---

## Task 2: Supabase-tabell for max-aggressive

**Objective:** Lagre trades og posisjoner.

**Files:**
- Create: `supabase/migrations/20260809_max_aggressive.sql`

**Step 1: Lag migrasjon**

```sql
CREATE TABLE IF NOT EXISTS max_aggressive_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  leverage INTEGER NOT NULL,
  pnl DECIMAL,
  liquidation_price DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_max_aggressive_user ON max_aggressive_trades(user_id, created_at);
```

**Step 2: Kjør migrasjon**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): max-aggressive trades table"
```

---

## Task 3: Integrer MaxAggressivePanel i dashboard

**Objective:** Vis panel på dashboard.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- Modify: `src/features/dashboard/MaxAggressivePanel.tsx`

**Step 1: Importer og bruk**

```tsx
import { MaxAggressivePanel } from '@/features/dashboard/MaxAggressivePanel';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <MaxAggressivePanel sessionId="tom-001" />
      {/* ... resten av dashboard */}
    </div>
  );
}
```

**Step 2: Test**

```bash
npx vitest run src/features/dashboard/__tests__/MaxAggressivePanel.test.tsx
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): integrate MaxAggressivePanel"
```

---

## Task 4: Live-data med React Query

**Objective:** Sanntidsoppdatering hvert 5. sekund.

**Files:**
- Modify: `src/features/dashboard/MaxAggressivePanel.tsx`

**Step 1: Oppdater query**

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["max-aggressive", sessionId],
  queryFn: () => fetch(`/api/trading/max-aggressive`).then(r => r.json()),
  refetchInterval: 5000, // 5 sekunder
});
```

**Step 2: Test**

```bash
npx vitest run src/features/dashboard/__tests__/MaxAggressivePanel.test.tsx
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): live data every 5s"
```

---

## Task 5: Vise trades i sanntid

**Objective:** Liste over dagens trades.

**Files:**
- Create: `src/features/dashboard/MaxAggressiveTrades.tsx`

**Step 1: Lag komponent**

```tsx
export function MaxAggressiveTrades({ trades }: { trades: Trade[] }) {
  return (
    <div className="mt-4">
      <h3 className="font-bold">Dagens trades</h3>
      {trades.map(t => (
        <div key={t.id} className="flex justify-between p-2 border-b">
          <span>{t.side} {t.quantity} @ {t.price}</span>
          <span className={t.pnl >= 0 ? "text-green-500" : "text-red-500"}>
            {t.pnl}%
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): show trades in real-time"
```

---

## Risikoer og åpne spørsmål

| Risiko | Mitigering |
|--------|-----------|
| OKX API rate limit | Cache 5 sekunder |
| Ingen trades ennå | Vis "Venter på første trade" |
| Feil data | Fallback til Supabase cache |

**Åpne spørsmål:**
1. Skal alle brukere se Tom sin trading, eller kun Tom?
2. Hvor mange trades skal vises (siste 10, 50, alle)?
