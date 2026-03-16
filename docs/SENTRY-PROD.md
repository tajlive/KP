# Sentry error tracking – produksjon (Vercel)

## 1. Miljøvariabler i Vercel (production)

Sett følgende under **Vercel → Project → Settings → Environment Variables** for **Production**:

| Variabel | Påkrevd | Beskrivelse |
|----------|--------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | **Ja** | DSN fra Sentry (Client Keys). Uten denne sendes ingen error events i prod. |
| `SENTRY_AUTH_TOKEN` | Nei | Auth token for upload av source maps ved build. Anbefales for lesbare stack traces. |
| `SENTRY_ORG` | Nei | Org slug (f.eks. `elbatt-chatbot`) – brukes av build-plugin hvis avvik fra next.config. |
| `SENTRY_PROJECT` | Nei | Prosjekt slug (f.eks. `klarpakke-production`) – brukes av build-plugin. |

**Minimum for at error events skal mottas:** `NEXT_PUBLIC_SENTRY_DSN` må være satt for production-miljøet.

---

## 2. Verifisere at events kommer

### A) Sentry dashboard

1. Åpne [Sentry Issues](https://elbatt-chatbot.sentry.io/issues/?project=klarpakke-production).
2. Filtrer på environment `production` og siste 24 timer.
3. Etter en deploy bør reelle feil dukke opp her hvis de inntreffer.

### B) Test-side i appen

1. Logg inn og gå til **Dashboard → Sentry-test** (eller `/no/dashboard/sentry-test`).
2. Sjekk at **Configuration Status** viser:
   - `NEXT_PUBLIC_SENTRY_DSN`: ✅ Configured  
   - Sentry Enabled: ✅ Active (kun i production).
3. Klikk **1️⃣ Client Error (Captured)** eller **2️⃣ Server API Error**.
4. Vent 30–60 sekunder og sjekk Sentry dashboard – søk på "TEST" for å finne test-eventene.

I production med DSN satt vil både client- og server-test sende events; uten DSN vises fortsatt siden, men ingen events sendes.

---

## 3. Kodeoppsett (referanse)

- **instrumentation.ts / instrumentation-client.ts**: Node og Edge init med `enabled` kun når `NODE_ENV === "production"` og `NEXT_PUBLIC_SENTRY_DSN` er satt.
- **sentry.server.config.ts / sentry.edge.config.ts**: Server/Edge Sentry-init med prod-guard og fallback DSN.
- **Tunnel**: Events kan sendes via `/api/sentry` (tunnelRoute) for å unngå blokkering av ingest-domene.
- **Test-API**: `GET /api/test-sentry` sender en server-side test-event i production når DSN er satt; brukes av Sentry-test-siden.
