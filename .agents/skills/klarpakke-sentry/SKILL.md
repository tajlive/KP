---
name: klarpakke-sentry
description: 'Use when setting up or debugging Sentry/GlitchTip error tracking: CSP
  blocks, envelope API, error boundaries, toFixed guards.'
version: 1.0.0
author: Hermes Agent
license: MIT
platforms:
- macos
metadata:
  hermes:
    tags:
    - klarpakke
    - sentry
    - debugging
    - error-tracking
disableModelInvocation: true
---

# Klarpakke Sentry

## Oppsett

- DSN settes som `NEXT_PUBLIC_SENTRY_DSN` i Cloudflare Workers secrets
- Fallback til `NEXT_PUBLIC_GLITCHTIP_DSN`
- Koden i `src/lib/sentry.ts`

## Sende events — envelope API (2026-07-20)

**Eneste fungerende metode for Sentry SaaS.** Ikke bruk `/store/` (returns 401).

```typescript
const url = `${protocol}//${host}${port}/api/${projectId}/envelope/`;
const envelopeHeader = JSON.stringify({
  event_id: event.eventId,
  dsn: dsnValue,  // Full DSN — embeddes i headeren
  sent_at: new Date().toISOString(),
  sdk: { name: "klarpakke-sentry", version: "1.0.0" },
});
const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" });
const itemBody = JSON.stringify({ event_id, timestamp, level, message, exception, tags, extra, platform: "javascript" });
const envelope = `${envelopeHeader}\n${itemHeader}\n${itemBody}`;

await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-sentry-envelope" },
  body: envelope,
});
```

**Pitfalls:**
- Content-Type MÅ være `application/x-sentry-envelope`, ikke `application/json`
- Body er newline-delimited: header + `\n` + itemHeader + `\n` + itemBody
- DSN-en legges i headeren, ikke som auth header eller query-parameter
- **Source maps:** Slå på `productionBrowserSourceMaps: true` i `next.config.mjs` for debugging — da ser du filnavn og linjenummer i stedet for minifiserte chunks

## CSP

Legg til `"https://*.ingest.de.sentry.io"` i connect-src i `src/middleware/csp.ts`.
Uten dette blokkeres alle Sentry-forespørsler stille av nettleseren.

## i18n MISSING_MESSAGE → krasj

**Symptom:** `MISSING_MESSAGE: trading.riskMetrics.scoreDescription.X (no)` → `TypeError: toFixed` på undefined

**Rotårsak:** next-intl kaster MISSING_MESSAGE når i18n-nøkkel mangler. Når komponenten kaller `.toFixed()` på verdier som kommer fra i18n-fallback (key name), krasjer den.

**Vanlige syndere:**
- `effectiveLevel = "neutral"` legges til i RiskMetricsPanel uten tilsvarende i18n-nøkler
- Split-filer (`messages/no/trading.json`) brukes istedenfor konsolidert `messages/no.json`

**Fiks:**
- Legg ALLTID til i18n-nøkler når du legger til nye nivåer/verdier
- Returner `null` i komponenten når data mangler heller enn å prøve å vise noe
- Konsolider ALLTID i `messages/no.json` / `messages/en.json` — split-filer fungerer ikke i Worker

## toFixed på undefined — systematisk søk

**Finn alle steder:**
```bash
grep -rn "\\.toFixed(" src/features/ | grep -v "__tests__" | grep -v "??\|?."
```

**Fiks:**
```tsx
{(value ?? 0).toFixed(2)}
{value != null ? value.toFixed(2) : "—"}
```

## Error Boundaries

`WidgetErrorBoundary.componentDidCatch()` må kalle `captureException()`, ikke bare `console.error()`.

## Global hooks

`initMonitoring()` i `src/lib/monitoring.ts` setter opp:
- `window.onerror` → `captureException()`
- `window.onunhandledrejection` → `captureException()`
- Web Vitals (LCP, CLS) → metrics

Kalles fra `ClientSideProviders.tsx` via `requestIdleCallback`.

## Verifisering

```typescript
import { testSentry } from "@/lib/sentry";
testSentry();
```

Sjekk Sentry dashboard for eventen.

---

## createServerClient() timeout — Worker henger

**Symptom:** API-endepunkter som kaller `createServerClient()` returnerer 522 timeout i Cloudflare Worker. Ingen feil i console fordi fetch bare henger.

**Rotårsak:** `createServerClient()` prøver å lese httpOnly auth-cookies som ikke er tilgjengelige i Cloudflare Workers. Supabase-klienten henger i auth-utledning.

**Fiks A — API-endepunkter (3s timeout):**
```typescript
const supabasePromise = createServerClient();
const supabase = await Promise.race([
  supabasePromise,
  new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase server client timeout")), 3000)
  ),
]) as Awaited<ReturnType<typeof createServerClient>>;
```

**Fiks B — Server-side sider (client-side auth):**
```tsx
// page.tsx (server) — tynn wrapper, KUN render client component:
export default async function ProtectedPage({ params }) {
  return <ProtectedClient locale={params.locale} />;
}

// ProtectedClient.tsx — all logikk er client-side:
"use client";
export default function ProtectedClient({ locale }: { locale: string }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return; // vent til AuthContext er initialisert
    if (!user) router.push(`/${locale}/login?next=...`);
    else { /* last data */ }
  }, [user, loading]);
}
```

**Fiks C — API som autentiserer via client (userId i query):**
Når client allerede er autentisert (AuthContext), send `userId` som query-parameter. API-et bruker userId direkte istedenfor server-side auth.

## Dashboard Laster... — authLoading henger i Worker

**Symptom:** Dashboard viser "Laster..." for alltid.

**Rotårsak:** Server-side `requireAuth()` kaster exception → hele siden bryter. Selv med client-side auth kan Supabase-klienten henge hvis server-komponenten prøver å kjøre server-side kode.

**Fiks — komplett DashboardClient pattern:**
1. page.tsx: Tynn server-wrapper som renderer client component
2. DashboardClient.tsx: All data-fetching via client-side Supabase + API-kall
3. `authLoading` fra AuthContext: 5s failsafe timeout (innebygd i AuthContext)
4. `load()` funksjon: 15s timeout + `cancelled` flag (cleanup ved unmount)
5. Metrics via `/api/dashboard/metrics?userId=X&mode=paper` (ikke server-funksjon)
6. Fallback: Hvis API feiler → vis feilmelding + "Prøv igjen"-knapp
