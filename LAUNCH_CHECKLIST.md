# Klarpakke Launch Readiness Checklist

## Sentry Monitoring ✅

- [x] `@sentry/nextjs` installert (v10.46.0)
- [x] `sentry.client.config.ts` opprettet med:
  - DSN fra miljøvariabel
  - tracesSampleRate: 0.1 (production) / 1.0 (dev)
  - replaysOnErrorSampleRate: 1.0
  - beforeSend filter for localhost
  - browserTracingIntegration
- [x] `sentry.server.config.ts` eksisterende (oppdatert)
- [x] `sentry.edge.config.ts` eksisterende (oppdatert)
- [x] `next.config.mjs` wrappet med `withSentryConfig`
- [x] `NEXT_PUBLIC_SENTRY_DSN` i `.env.production`
- [x] `NEXT_PUBLIC_APP_VERSION` i `.env.local`

## Error Boundary ✅

- [x] `/src/components/ErrorBoundary.tsx` opprettet
  - Sentry.captureException i componentDidCatch
  - Fallback UI med AlertTriangle ikon
  - "Last inn på nytt" knapp
  - "Gå til forsiden" knapp
- [x] ErrorBoundary wrappet i root layout (`/[locale]/layout.tsx`)

## Build Verifisering ✅

```bash
# TypeScript
npx tsc --noEmit
# Resultat: 0 errors ✅

# ESLint
npx eslint src/ --max-warnings 0
# Resultat: 0 warnings ✅

# Build
npm run build
# Resultat: Success ✅
```

## Lighthouse Minimumsscore

| Kategori | Minimum | Status |
|----------|---------|--------|
| Performance | ≥ 85 | ⬜ |
| Accessibility | ≥ 95 | ⬜ |
| Best Practices | ≥ 90 | ⬜ |
| PWA | 100 | ⬜ |

Kjør etter deploy til staging:
```bash
npx lighthouse https://staging.klarpakke.no \
  --only-categories=performance,accessibility,best-practices,pwa \
  --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless"
```

## iOS Safari Sjekkliste

- [ ] Installer PWA fra Safari (Del-knapp → Legg til på hjem)
- [ ] Åpne installert app → standalone mode, ingen Safari UI
- [ ] Skru av nettverk → offline-side vises (ikke blank)
- [ ] Skru på nettverk → app fungerer igjen uten reload
- [ ] Onboarding fullføres på iPhone 14 (390px) uten scroll-bug
- [ ] BottomTabs skjules når tastatur er oppe

## Sentry Test

Etter deploy til staging/production:
```javascript
// Kjør i browser console
Sentry.captureMessage('Launch test OK')
```

Verifiser i Sentry dashboard:
- [ ] Event vises under "klarpakke-production" prosjekt
- [ ] Event type: "info"
- [ ] Miljø: "production"
