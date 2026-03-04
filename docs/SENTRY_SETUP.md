# 🔍 Sentry Error Tracking Setup

## Overview

Sentry er nå konfigurert for full error tracking i Klarpakke!

**Features aktivert:**
- ✅ Client-side error tracking
- ✅ Server-side error tracking
- ✅ Edge runtime error tracking
- ✅ Session replay (10% sample rate)
- ✅ Performance monitoring
- ✅ Error filtering (kun production)

## Quick Setup (5 min)

### 1. Opprett Sentry Prosjekt

1. Gå til [https://sentry.io/signup/](https://sentry.io/signup/)
2. Opprett konto (gratis tier er nok til å starte)
3. Opprett nytt prosjekt:
   - Platform: **Next.js**
   - Project name: **klarpakke**
   - Team: **klarpakke** (eller default)
4. Kopier DSN (Data Source Name)

### 2. Legg til Environment Variables

#### Lokalt (.env.local)

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

#### GitHub Secrets

Gå til: [https://github.com/klarpakke/klarpakke/settings/secrets/actions](https://github.com/klarpakke/klarpakke/settings/secrets/actions)

Legg til:
- `SENTRY_DSN` (samme verdi som over)
- `NEXT_PUBLIC_SENTRY_DSN` (samme verdi som over)

#### Cloudflare Pages

Gå til: [https://dash.cloudflare.com](https://dash.cloudflare.com)

→ Workers & Pages → klarpakke → Settings → Environment variables

Legg til (Production):
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

### 3. Test at det fungerer

```bash
# Installer dependencies
npm install

# Bygg prosjektet
npm run build

# Test lokalt
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) og trigger en test-error.

### 4. Deploy

```bash
# Deploy til Cloudflare Pages
npm run deploy

# Eller via GitHub Actions (automatisk på push til main)
git push origin main
```

## Features

### Error Filtering

- ❌ Development errors **filtreres bort** automatisk
- ✅ Kun production/staging errors sendes til Sentry

### Session Replay

- **Sample rate:** 10% av normale sessions
- **Error sample rate:** 100% av error sessions
- **Privacy:** All tekst og media er maskert

### Performance Monitoring

- **Trace sample rate:** 100% (juster ned i production hvis høy trafikk)
- Automatisk tracking av:
  - Page loads
  - API calls
  - Database queries
  - External API calls (Supabase, Stripe)

### Environment Tags

Sentry vil automatisk tagge errors med:
- `environment`: development/staging/production
- `release`: git commit SHA
- `user`: user ID (når innlogget)

## Viewing Errors

1. Gå til [https://sentry.io](https://sentry.io)
2. Velg **klarpakke** prosjekt
3. Se errors i real-time!

### Nyttige views:

- **Issues:** Grupperte errors
- **Performance:** Slow transactions
- **Replays:** Video av user sessions med errors
- **Releases:** Errors per deployment

## Custom Error Tracking

I koden din, kan du manuelt tracke errors:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'trading',
      action: 'place_order'
    },
    extra: {
      orderId: order.id,
      symbol: order.symbol
    }
  });
}
```

## Alerts

Sett opp alerts i Sentry for kritiske errors:

1. Sentry → Alerts → Create Alert
2. Velg trigger (f.eks. "Error frequency")
3. Sett threshold (f.eks. "10 errors in 5 minutes")
4. Velg notification method:
   - Email
   - Slack
   - PagerDuty
   - Webhook

## Cost Optimization

Gratis tier gir:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replays/month
- 1 GB attachments

**Tips for å holde seg innenfor gratis tier:**

1. Reduser `tracesSampleRate` til 0.1 (10%)
2. Reduser `replaysSessionSampleRate` til 0.01 (1%)
3. Filtrer ut kjente/ignorable errors
4. Sett opp rate limiting

## Troubleshooting

### Errors vises ikke i Sentry

1. Sjekk at `SENTRY_DSN` er satt korrekt
2. Sjekk at environment er `production` eller `staging` (ikke `development`)
3. Sjekk Sentry console for debug info:
   ```typescript
   debug: true  // i sentry.*.config.ts
   ```

### "Sentry is not initialized"

- Sørg for at config-filene er i root directory
- Kjør `npm install` på nytt
- Restart dev server

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Session Replay Guide](https://docs.sentry.io/product/session-replay/)

---

**Auto-generert av Klarpakke Autonomous AI Agent v2.0**
