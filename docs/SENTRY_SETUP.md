# 🐛 Sentry Error Tracking Setup

## Hva er Sentry?

Sentry er en error tracking-tjeneste som gir deg:
- 🔴 Real-time error monitoring
- 📊 Performance insights
- 🔍 Stack traces med source maps
- 👤 User context og breadcrumbs
- 📈 Error trends og analytics

## Oppsett (Allerede konfigurert!)

Sentry er allerede satt opp i prosjektet med følgende filer:

- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking  
- `sentry.edge.config.ts` - Edge runtime error tracking
- `src/lib/sentry.ts` - Utility funksjoner
- `src/app/api/sentry-test/route.ts` - Test endpoint

## Miljøvariabler (Vercel)

Sjekk at disse er satt i Vercel Dashboard:

```env
NEXT_PUBLIC_SENTRY_DSN=https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=elbatt-chatbot
SENTRY_PROJECT=klarpakke-production
```

**Viktig:** `SENTRY_AUTH_TOKEN` må legges til for at source maps skal fungere.

## Hvordan få Sentry Auth Token

1. Gå til https://sentry.io/settings/account/api/auth-tokens/
2. Klikk "Create New Token"
3. Velg scopes: `org:read`, `project:releases`, `project:write`
4. Kopier token og legg til i Vercel: Settings → Environment Variables

## Testing

### 1. Sjekk at Sentry er konfigurert

```bash
curl https://www.klarpakke.no/api/sentry-test
```

Forventet respons:
```json
{
  "message": "Sentry Test Endpoint",
  "sentryConfigured": true,
  "environment": "production"
}
```

### 2. Trigger test event

```bash
curl -X POST https://www.klarpakke.no/api/sentry-test
```

Dette sender en test error til Sentry.

### 3. Verifiser i Sentry Dashboard

1. Gå til: https://elbatt-chatbot.sentry.io/projects/klarpakke-production/
2. Sjekk at test event vises
3. Det kan ta 1-2 minutter før eventet vises

## Bruk i koden

### Logge errors

```typescript
import { logError } from "@/lib/sentry";

try {
  // Din kode
} catch (error) {
  logError(error, { 
    userId: user.id,
    action: "place_trade",
    symbol: "BTCUSDT"
  });
}
```

### Logge messages

```typescript
import { logMessage } from "@/lib/sentry";

logMessage("User completed onboarding", "info", {
  userId: user.id,
  step: "final",
});
```

### Sette user context

```typescript
import { setUser } from "@/lib/sentry";

// Når bruker logger inn
setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Når bruker logger ut
setUser(null);
```

## Konfigurasjonsdetaljer

### Client Config

- **Sample Rate:** 10% av transaksjoner
- **Replay:** 5% av sessions, 25% ved errors
- **Filtering:** Ignorerer JWT expired, hydration errors

### Server Config

- **Sample Rate:** 10% av transaksjoner
- **Filtering:** Ignorerer JWT expired, connection errors

### Edge Config

- **Sample Rate:** 5% av transaksjoner (lavere pga cost)
- **Filtering:** Ignorerer NEXT_REDIRECT (forventet)

## Troubleshooting

### Ingen errors vises i Sentry

1. Sjekk at `NEXT_PUBLIC_SENTRY_DSN` er satt i Vercel
2. Sjekk at `NODE_ENV=production`
3. Vent 1-2 minutter (det kan ta litt tid)
4. Sjekk browser console for Sentry init errors

### Source maps fungerer ikke

1. Sjekk at `SENTRY_AUTH_TOKEN` er satt
2. Verifiser at token har riktige scopes
3. Sjekk at `SENTRY_ORG` og `SENTRY_PROJECT` er riktige

### For mange errors

Justere `tracesSampleRate` i config-filene:
- 1.0 = 100% (alle transaksjoner)
- 0.1 = 10% (default)
- 0.01 = 1% (høy trafikk)

## Support

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Next.js SDK: https://docs.sentry.io/platforms/javascript/guides/nextjs/
