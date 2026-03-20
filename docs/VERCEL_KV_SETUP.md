# 🚀 Redis / cache (Upstash REST) – oppsett

**App-kode:** Klarpakke bruker **`@upstash/redis`** (`src/lib/redis-client.ts`, `cache.ts`, rate-limit, health).  
Sett **`UPSTASH_REDIS_REST_URL`** og **`UPSTASH_REDIS_REST_TOKEN`** (Vercel → Upstash-integrasjon).  
Eksisterende **`KV_REST_API_URL`** / **`KV_REST_API_TOKEN`** fungerer fortsatt som fallback (samme REST-mønster etter Vercel KV → Upstash-migrering).

---

# Historikk: Vercel KV (Redis)

## Hva er Vercel KV?

Vercel KV er en managed Redis-tjeneste som gir:

- ⚡ Lynrask caching (< 1ms)
- 🌍 Global distribusjon
- 💰 Gratis nivå: 250MB lagring, 500k kommandoer/mnd
- 🔒 Automatisk SSL

## Oppsett (3 steg)

### Steg 1: Aktiver Vercel KV i Dashboard

1. Gå til: https://vercel.com/dashboard
2. Velg prosjektet: **klarpakke**
3. Klikk på **"Storage"** i venstre meny
4. Klikk **"Create Database"**
5. Velg **"KV"** (Redis)
6. Velg region: **Frankfurt** (eu-central-1) - nærmest Norge
7. Klikk **"Create"**

### Steg 2: Koble til prosjektet

Etter opprettelse:

1. Velg **"Connect Project"**
2. Velg **klarpakke** fra dropdown
3. Klikk **"Connect"**

Dette legger automatisk til miljøvariabler i prosjektet.

### Steg 3: Verifiser at det fungerer

```bash
# Sjekk miljøvariabler
vercel env ls

# Du skal se:
# KV_REST_API_URL
# KV_REST_API_TOKEN
```

## Miljøvariabler

Når du kobler KV til prosjektet, legges disse til automatisk:

```env
KV_REST_API_URL=https://***.kv.vercel-storage.com
KV_REST_API_TOKEN=***
```

**VIKTIG:** Ikke del disse verdiene offentlig!

## Bruk i koden

Se eksempel i `src/app/api/demo/cache-example/route.ts`:

```typescript
import { cache, CACHE_TTL, withCache } from "@/lib/cache";

// Enkel caching
const data = await withCache(
  "my-key",
  () => fetchData(),
  CACHE_TTL.MARKET_DATA, // 10 sekunder
);

// Manuell cache
await cache.set("key", data, 60000); // 1 minutt
const cached = await cache.get("key");
```

## Cache TTL-anbefalinger

| Data type    | TTL  | Begrunnelse     |
| ------------ | ---- | --------------- |
| Markedsdata  | 10s  | Høy volatilitet |
| Leaderboard  | 1min | Ofte oppdatert  |
| Brukerprofil | 5min | Sjeldent endret |
| Kursinnhold  | 1t   | Statisk         |
| Statisk data | 24t  | Rarer endres    |

## Testing

```bash
# Test cache endpoint
curl https://www.klarpakke.no/api/demo/cache-example?symbol=BTCUSDT

# Forventet respons:
{
  "symbol": "BTCUSDT",
  "price": 45000.123,
  "_meta": {
    "cached": true,
    "duration": "2ms",
    "ttl": "10s"
  }
}
```

## Overvåkning

I Vercel Dashboard:

1. Gå til **Storage** → **KV Database**
2. Se **Metrics** for:
   - Kommandoer per sekund
   - Lagringsbruk
   - Hit rate

## Kostnader

| Nivå           | Lagring | Kommandoer | Pris   |
| -------------- | ------- | ---------- | ------ |
| Hobby (gratis) | 250MB   | 500k/mnd   | $0     |
| Pro            | 1GB     | 10M/mnd    | $9/mnd |

For Klarpakke: Hobby-nivå er trolig tilstrekkelig i starten.

## Feilsøking

### Problem: "KV Cache Get Error"

**Løsning:** Sjekk at miljøvariabler er satt i Vercel Dashboard

### Problem: Lokal utvikling fungerer ikke

**Løsning:** Uten KV-tilkobling brukes memory cache automatisk (se `cache.ts`)

### Problem: "Rate limit exceeded"

**Løsning:** Du har nådd 500k kommandoer/mnd. Oppgrader til Pro eller reduser caching.

## Nyttige kommandoer

```bash
# Sjekk KV-status
vercel kv list

# Koble til Redis CLI (hvis installert)
redis-cli -u $KV_REST_API_URL

# Flush cache (forsiktig!)
curl -X POST "https://www.klarpakke.no/api/demo/cache-example?action=clear"
```

## Support

- Vercel KV Docs: https://vercel.com/docs/storage/vercel-kv
- Redis Commands: https://redis.io/commands
