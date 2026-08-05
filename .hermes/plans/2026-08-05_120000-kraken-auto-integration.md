# Automatisk Kraken-integrasjon — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen oppgave-for-oppgave.

**Mål:** Brukere setter inn penger på Kraken — Klarpakke gjør alt automatisk (konvertering, trading, reinvestering).

**Arkitektur:** Webhook-drevet fiat-deteksjon → auto-konvertering til USDT → grid-trading → auto-reinvestering.

**Tech Stack:** Kraken API, Supabase Edge Functions, Cloudflare Workers, Next.js 16.

---

## Nåværende tilstand

| Komponent | Status |
|-----------|--------|
| Binance API | Implementert, men TRD_GRP_031 blokkert |
| Auto-konvertering | `auto-convert.ts` (USD→USDT) |
| Grid-trading | `pilot-engine` fungerer |
| Kraken | Ikke implementert |

## Mål-tilstand

| Komponent | Status |
|-----------|--------|
| Kraken OAuth | Fast Connect eller API-nøkler |
| Fiat-deteksjon | Webhook eller polling |
| Auto-konvertering | EUR/USD → USDT |
| Grid-trading | USDT-par på Kraken |
| Auto-reinvestering | Gevinst → ny grid |

---

## Task 1: Kraken API-klient

**Objective:** Grunnleggende Kraken API-integrasjon.

**Files:**
- Create: `src/lib/exchanges/kraken/client.ts`
- Create: `src/lib/exchanges/kraken/types.ts`
- Test: `src/lib/exchanges/kraken/__tests__/client.test.ts`

**Step 1: Skriv test**

```typescript
// src/lib/exchanges/kraken/__tests__/client.test.ts
import { KrakenClient } from '../client';

describe('KrakenClient', () => {
  it('should fetch account balance', async () => {
    const client = new KrakenClient('api-key', 'api-secret');
    const balance = await client.getBalance();
    expect(balance).toHaveProperty('USDT');
  });

  it('should place market buy order', async () => {
    const client = new KrakenClient('api-key', 'api-secret');
    const order = await client.marketBuy('USDT', 'USD', '100');
    expect(order.status).toBe('ok');
  });
});
```

**Step 2: Implementer klient**

```typescript
// src/lib/exchanges/kraken/client.ts
import crypto from 'crypto';

const KRAKEN_API_URL = 'https://api.kraken.com';

export class KrakenClient {
  constructor(
    private apiKey: string,
    private apiSecret: string,
  ) {}

  private signRequest(path: string, params: Record<string, string>): string {
    const nonce = Date.now().toString();
    const postData = new URLSearchParams({ nonce, ...params }).toString();
    const message = path + crypto.createHash('sha256').update(nonce + postData).digest();
    return crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');
  }

  async getBalance(): Promise<Record<string, string>> {
    // Implementation
  }

  async marketBuy(pair: string, quoteAsset: string, amount: string): Promise<any> {
    // Implementation
  }
}
```

**Step 3: Verifiser**

```bash
npm run test -- src/lib/exchanges/kraken/__tests__/client.test.ts
```

**Step 4: Commit**

```bash
git add src/lib/exchanges/kraken/
git commit -m "feat: Kraken API client"
```

---

## Task 2: Fiat-deteksjon webhook

**Objective:** Motta webhook når bruker setter inn fiat.

**Files:**
- Create: `src/app/api/webhooks/kraken/deposit/route.ts`
- Modify: `src/lib/exchanges/kraken/client.ts` (legg til deposit polling)

**Step 1: Webhook route**

```typescript
// src/app/api/webhooks/kraken/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Verifiser webhook-signatur fra Kraken
  const signature = request.headers.get('x-kraken-signature');
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Start auto-konvertering
  await autoConvertFiat(body.userId, body.asset, body.amount);
  
  return NextResponse.json({ success: true });
}
```

**Step 2: Polling fallback**

```typescript
// src/lib/exchanges/kraken/client.ts
async pollDeposits(userId: string): Promise<Deposit[]> {
  // Poll Kraken for nye deposits hvert 5. minutt
}
```

---

## Task 3: Auto-konvertering

**Objective:** Konverter fiat til USDT automatisk.

**Files:**
- Create: `src/lib/exchanges/kraken/auto-convert.ts`
- Modify: `src/lib/trading/auto-convert.ts` (generalisere)

**Step 1: Kraken-spesifikk konvertering**

```typescript
// src/lib/exchanges/kraken/auto-convert.ts
export async function ensureUsdtCapital(
  userId: string,
  requiredUsdt: number,
): Promise<{ success: boolean; usdtAvailable: number }> {
  const client = await getKrakenClientForUser(userId);
  const balance = await client.getBalance();
  
  // Sjekk USDT
  const usdt = parseFloat(balance.USDT || '0');
  if (usdt >= requiredUsdt) return { success: true, usdtAvailable: usdt };
  
  // Konverter EUR/USD til USDT
  const fiat = parseFloat(balance.EUR || balance.USD || '0');
  if (fiat > 0) {
    await client.marketBuy('USDT', fiat > 0 ? 'EUR' : 'USD', fiat.toString());
    return { success: true, usdtAvailable: usdt + fiat };
  }
  
  return { success: false, usdtAvailable: usdt };
}
```

---

## Task 4: Grid-trading på Kraken

**Objective:** Kjør grid-strategi med Kraken USDT-par.

**Files:**
- Modify: `src/app/api/pilot-engine/route.ts` (støtt Kraken)
- Create: `src/lib/trading/kraken-grid.ts`

**Step 1: Kraken grid-integrasjon**

```typescript
// src/lib/trading/kraken-grid.ts
export async function runKrakenGrid(
  userId: string,
  symbol: string,
  capital: number,
): Promise<void> {
  const client = await getKrakenClientForUser(userId);
  
  // Konverter symbol til Kraken-format
  const krakenPair = toKrakenPair(symbol); // BTCUSDT → XBTUSDT
  
  // Kjør grid
  await gridEngine.run(client, krakenPair, capital);
}
```

---

## Task 5: Auto-reinvestering

**Objective:** Reinvester gevinst automatisk.

**Files:**
- Create: `src/lib/trading/auto-reinvest.ts`
- Modify: `src/app/api/pilot-engine/route.ts`

**Step 1: Reinvest-logikk**

```typescript
// src/lib/trading/auto-reinvest.ts
export async function autoReinvest(userId: string): Promise<void> {
  const profit = await getUnrealizedProfit(userId);
  
  if (profit > REINVEST_THRESHOLD) {
    // Reinvester 80% av gevinst
    const reinvestAmount = profit * 0.8;
    await startNewGridSession(userId, reinvestAmount);
  }
}
```

---

## Task 6: Onboarding-flyt

**Objective:** Enkel onboarding for nye brukere.

**Files:**
- Modify: `src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx`
- Create: `src/features/onboarding/KrakenConnect.tsx`

**Step 1: Kraken-tilkobling**

```typescript
// src/features/onboarding/KrakenConnect.tsx
export function KrakenConnect() {
  return (
    <div>
      <h2>Koble til Kraken</h2>
      <p>Logg inn med Kraken for automatisk trading</p>
      <button onClick={startOAuth}>Koble til</button>
    </div>
  );
}
```

---

## Task 7: Testing

**Objective:** Verifiser hele flyten.

**Files:**
- Create: `src/__tests__/e2e/kraken-flow.test.ts`

**Step 1: E2E-test**

```typescript
test('full kraken flow', async () => {
  // 1. Koble til Kraken
  // 2. Sett inn fiat
  // 3. Verifiser auto-konvertering
  // 4. Verifiser grid-start
  // 5. Verifiser reinvestering
});
```

---

## Oppsummering

| Task | Fil | Estimat |
|------|-----|---------|
| 1 | `src/lib/exchanges/kraken/client.ts` | 30 min |
| 2 | `src/app/api/webhooks/kraken/deposit/route.ts` | 20 min |
| 3 | `src/lib/exchanges/kraken/auto-convert.ts` | 20 min |
| 4 | `src/lib/trading/kraken-grid.ts` | 30 min |
| 5 | `src/lib/trading/auto-reinvest.ts` | 20 min |
| 6 | `src/features/onboarding/KrakenConnect.tsx` | 20 min |
| 7 | `src/__tests__/e2e/kraken-flow.test.ts` | 30 min |

**Total:** ~3 timer

---

## Risiko

| Risiko | Mitigering |
|--------|------------|
| Kraken API-endringer | Versjonering, fallback |
| Rate limits | Queue, backoff |
| Fiat-konvertering feiler | Varsle bruker, manuell fallback |
| Webhook ikke mottatt | Polling hvert 5. min |

---

## Åpne spørsmål

1. **Kraken OAuth eller API-nøkler?** (OAuth = enklere for brukere)
2. **Hvilke fiat-valutaer?** (EUR primært, USD sekundært)
3. **Minimum innskudd?** (€10?)
4. **Auto-reinvest threshold?** (€10 gevinst?)

---

## Neste steg

| Valg | Handling |
|------|----------|
| **A** | Start med Task 1 (Kraken API-klient) |
| **B** | Søk Kraken affiliate først (Impact) |
| **C** | Begge deler parallelt |

**Hva foretrekker du?**
