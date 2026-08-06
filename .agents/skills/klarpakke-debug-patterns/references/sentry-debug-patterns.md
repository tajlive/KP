# Sentry/Error Tracking — debug patterns

## Problemer funnet og fikset

### 1. sentry.ts sendte aldri events

**Symptom:** `captureException()` ble kalt men ingenting nådde Sentry.

**Rotårsak:** `shouldSend()` returnerte true (DSN + production), men koden hadde `// TODO: Send envelope` — kun `console.log`.

**Fiks:** Implementerte `sendToSentry()` — HTTP POST til `/api/{projectId}/store/` med DSN-parsing og X-Sentry-Auth header.

### 2. WidgetErrorBoundary rapporterte ikke

**Symptom:** Dashboard viste "kunne ikke lastes" men ingen Sentry-event.

**Rotårsak:** `componentDidCatch` kalte kun `console.error()`.

**Fiks:** Legg til `captureException(error, { extra: { componentStack } })`. Bruk STATISK import — dynamic import feiler i Next.js flight loader.

### 3. CSP blokkerte Sentry

**Symptom:** Console error: "Refused to connect because it violates CSP". Sentry-events kom aldri frem.

**Rotårsak:** CSP i `csp.ts` hadde hardkodet ett Sentry DSN-host. Workers secrets DSN pekte til annet host.

**Fiks:** Legg til `"https://*.ingest.de.sentry.io"` wildcard i `connect-src`.

### 4. Dual Sentry DSNs

**Symptom:** CSP tillot DSN A men sendToSentry prøvde DSN B.

**Rotårsak:** Gammel DSN i CSP (fra @sentry/nextjs SDK) vs ny DSN i Workers secrets.

**Fiks:** CSP wildcard dekker alle. Sjekk `npx wrangler secret list | grep SENTRY` for aktiv DSN.

## Debug-pattern for error tracking

Når du ser en feil i produksjon:

1. **Reproduser** — finn nøyaktig steg som trigger feilen
2. **Spor kjeden** — følg error → catch → report → send → CSP → Sentry
3. **Fiks svake ledd** — legg til guards (`?? 0`), captureException-kall, CSP wildcards
4. **Verifiser** — trigg feilen på nytt, sjekk at Sentry mottar event
5. **Lagre** — oppdater klarpakke-debug-patterns eller en reference-fil
