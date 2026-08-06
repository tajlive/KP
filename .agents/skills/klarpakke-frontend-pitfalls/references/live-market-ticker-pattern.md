# Live Market Ticker — Server data + client polling

## Problem
Vise ekte markedsdata på landing page / hero — samtidig må HeroSection være `"use client"` (next-intl hooks). Server-komponenter kan ikke importeres i client-komponenter.

## Arkitektur (3 lag)

```
page.tsx (server, async)
  ├─ HeroSection (client, "use client")
  │    └─ rightColumn={<LiveMarketTicker />} (server children-prop)
  └─ LiveMarketTicker (server, fetch from DB)
       └─ LiveMarketTickerClient (client, polling)
            └─ /api/coin-prices/route.ts (server, service-role DB fetch)
```

### Lag 1: Server-komponent (renderer data)
```tsx
// LiveMarketTicker.tsx — server component
import { createClient } from "@/lib/supabase/server";
import LiveMarketTickerClient from "./LiveMarketTickerClient";

export const dynamic = "force-dynamic";

export default async function LiveMarketTicker() {
  const supabase = createClient();
  const { data } = await supabase.from("coin_prices").select("*").order("symbol");
  if (!data || data.length === 0) return null;
  return <LiveMarketTickerClient coins={data} />;
}
```

### Lag 2: Client-komponent (polling + rendering)
```tsx
// LiveMarketTickerClient.tsx — "use client"
export default function LiveMarketTickerClient({ coins }: Props) {
  const [localCoins, setLocalCoins] = useState(coins);

  const fetchPrices = useCallback(async () => {
    const res = await fetch("/api/coin-prices");
    const data = await res.json();
    setLocalCoins(data);
  }, []);

  useEffect(() => {
    const id = setInterval(fetchPrices, 15000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  // render grid...
}
```

### Lag 3: API-endepunkt (server)
```tsx
// app/api/coin-prices/route.ts
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from("coin_prices").select("*").order("symbol");
  return NextResponse.json(data ?? []);
}
```

### Bruk i side (page.tsx)
```tsx
// Server-komponent som wrapper:
<HeroSection rightColumn={<LiveMarketTicker />}>
</HeroSection>

// HeroSection (client) aksepterer children-prop:
interface Props { rightColumn?: ReactNode; }
export default function HeroSection({ rightColumn }: Props) {
  return (
    <div className="grid lg:grid-cols-2">
      <div>{/* tekst + CTA */}</div>
      <div>{rightColumn}</div>
    </div>
  );
}
```

## Nøkkelinnsikter

1. **Server-komponent + client-komponent + API-endepunkt** er standard 3-lags mønsteret for live data på Next.js-sider
2. `"use client"` komponenter kan motta server-rendrede barn via `children`/props — de blir bare serialisert props
3. `dynamic = "force-dynamic"` på server-komponenten for å unngå cache av gamle priser
4. `Cache-Control: no-store` på API-endepunktet for polling
5. **Ikke glem:** `createClient()` (service role) vs `createServerClient()` (SSR) — velg riktig for bruksområdet
6. Coin prices har `price_change_percent_24h`, `volume_24h`, `high_24h`, `low_24h` — mer enn bare price

## Coin data fra DB (eksempel)
```sql
SELECT symbol, price, price_change_percent_24h, volume_24h FROM coin_prices;
-- BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, DOTUSDT, LINKUSDT,
-- MATICUSDT, BNBUSDT, AVAXUSDT
```

## Flash-animasjon ved prisendring
```tsx
const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>({});
// Sammenlign gammel vs ny pris, sett flash, clear etter 600ms
// Bruk CSS: bg-emerald-500/10 for up, bg-red-500/10 for down
```
