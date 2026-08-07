# Klarpakke 2026 Modernisering — Arkitektur-forslag

> **For Hermes:** Plan-only. Inspiser, ikke implementer. Bruk `plan` skill.

**Goal:** Modernisere Klarpakke til en 2026-fremtidsrettet arkitektur uten å øke kostnader.

**Arkitektur:** Next.js 16 + Cloudflare Workers (OpenNext) + Supabase SSR. Målet er å utnytte plattformens fulle potensial: edge-rendering, streaming, AI-native features, og sanntid.

---

## Nåværende tilstand — hva er allerede bra

| Styrke | Status |
|---|---|
| Next.js 16 + CF Workers | ✅ Moderne edge-runtime |
| Supabase SSR auth | ✅ Godt implementert (impersonation, cookie-domain) |
| RSC-first | ✅ Kun 3 `use client` i hele appen |
| Server Actions | ⚠️ Kun 2 stk (`trading.ts`, `lessonSlug`) |
| Hermes-kroner | ✅ 26 jobber, omfattende monitorering |
| CF bindings | ✅ D1, R2, KV, Queues, AI — alle klargjort |

---

## 10 forslag — prioritert etter impact

### 1. 🔴 Partial Prerendering (PPR) — øyeblikkelig lastetid

**Hva:** Next.js 16 støtter PPR. Statisk "shell" lastes umiddelbart, dynamisk innhold strømmes inn. Markedsføringssider, landingssider, FAQ — alt føles instant.

**Kostnad:** 0 kr. Inkludert i Next.js 16.

**Implementering:**
- `next.config.ts`: `experimental: { ppr: true }`
- Wrap dynamiske komponenter i `<Suspense>` med fallback
- Statiske sider: `/`, `/om-oss`, `/vanlige-sporsmal` → full PPR
- Trading-sider: statisk shell + dynamisk trading-data strømmes inn

**Effekt:** LCP under 1.5s, FCP under 1s. Google-ranker belønner dette.

---

### 2. 🔴 Streaming + Suspense — progressiv rendering

**Hva:** Alle sider som henter data bør bruke Suspense. Trading-dashboardet laster header + sidebar først, så grid-data, så nyheter.

**Kostnad:** 0 kr.

**Implementering:**
- Hver data-avhengig seksjon wrapes i `<Suspense fallback={<Skeleton />}>`
- `loading.tsx` per route-segment
- `error.tsx` per route-segment for graceful degradation

**Eksempel:**
```tsx
// app/handel/layout.tsx
export default function HandelLayout({ children }) {
  return (
    <div>
      <Suspense fallback={<TradingShell />}>
        {children}
      </Suspense>
    </div>
  );
}
```

---

### 3. 🔴 WebSocket/Realtime — live UI (allerede aktivert!)

**Hva:** Supabase Realtime er allerede aktivert på `autopilot_state` og `kraken_live_state`. Men ingen UI-komponenter abonnerer. Dette er lavest hengende frukt.

**Kostnad:** 0 kr. Allerede inkludert i Supabase Pro.

**Implementering:**
- `useAutopilotRealtime()` hooken er allerede skrevet (`src/lib/realtime/autopilot-channel.ts`)
- Integrer den i `AutopilotDashboard` — erstatt polling med push
- Legg til Realtime på `coin_prices` (allerede i publication) → live priser

**Effekt:** UI oppdateres øyeblikkelig når en ordre fylles. Ingen polling, ingen forsinkelse.

---

### 4. 🟡 View Transitions API — native sideoverganger

**Hva:** Next.js 16 har innebygd støtte for View Transitions API. Sideoverganger blir myke animasjoner uten SPA-bibliotek.

**Kostnad:** 0 kr.

**Implementering:**
- `next.config.ts`: `experimental: { viewTransition: true }`
- Legg til `style: { viewTransitionName: '...' }` på nøkkelelementer

```tsx
// app/layout.tsx — smooth page transitions
<Link href="/handel" style={{ viewTransitionName: 'main-content' }}>
  Handel
</Link>
```

---

### 5. 🟡 AI-native features — Workers AI + Kimi K3

**Hva:** Cloudflare Workers AI (gratis tier) er allerede bundet (`AI` binding). Kan brukes til:
- AI-drevet trading-signaler (Llama/Mistral for sentiment)
- Chatbot for kundesupport
- Automatisk FAQ-svar
- Risikovurdering av trading-strategier

**Kostnad:** 0 kr. Workers AI har gratis tier.

**Implementering:**
```typescript
// src/lib/ai/edge-inference.ts
const ai = env.AI;
const response = await ai.run('@cf/meta/llama-4-8b-instruct', {
  messages: [{ role: 'user', content: 'Analyser denne trading-strategien...' }]
});
```

---

### 6. 🟡 Type-safe env — t3-env / Valibot

**Hva:** `.env.local` valideres ikke ved byggetid. Feil env-verdier gir runtime-feil. Moderne alternativ: `@t3-oss/env-nextjs` eller Valibot-validering.

**Kostnad:** 0 kr. Åpen kildekode.

**Implementering:**
```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
```

---

### 7. 🟢 Durable Objects — stateful trading sessions

**Hva:** Hver traders økt kan leve som en Durable Object. Ingen database-polling, ingen race conditions. Perfekt for trading-sesjoner med høy frekvens.

**Kostnad:** Inkludert i Workers Paid ($5/mnd). $0.15/million requests — minimalt for en enkeltbruker.

**Når:** Når du har 10+ aktive trading-brukere.

---

### 8. 🟢 Server Actions first — progressive enhancement

**Hva:** Alle forms og mutasjoner bør gå gjennom Server Actions. De fungerer uten JavaScript (progressive enhancement) og er typesikre.

**Nå:** De fleste API-ruter bruker `fetch` fra klienten. Dette krever JS + manuell feilhåndtering.

**Implementering:**
```typescript
// app/actions/trading.ts
'use server';
export async function startGrid(pair: string) {
  const supabase = createClient();
  // ... skjer på server, ingen API-rute nødvendig
}
```

**Effekt:** Mindre klient-JS, raskere interaksjoner, færre API-endepunkter.

---

### 9. 🟢 CF Browser Rendering — skjermbilder av dashboards

**Hva:** Cloudflare Browser Rendering lar deg ta skjermbilder og generere PDF-er på edge. Bruk til:
- Daglige trading-rapporter som PDF
- Delbare skjermbilder av P&L
- Automatisk visuell QA av prod

**Kostnad:** $0.30/time. Minimalt for sporadisk bruk.

---

### 10. 🟢 Feature flags — gradvis utrulling

**Hva:** A/B-test nye features uten å deploye ny kode. Bruk CF Workers KV (allerede satt opp) som feature-flag store.

**Implementering:**
```typescript
// src/lib/flags.ts
export async function isEnabled(flag: string, userId?: string): Promise<boolean> {
  const value = await env.KV_KLARPAKKE.get(`flag:${flag}`);
  if (!value) return false;
  if (value === 'all') return true;
  return userId ? value.split(',').includes(userId) : false;
}
```

---

## Sammenligning — nå vs etter

| Dimensjon | Nå | Etter |
|---|---|---|
| Lastetid (LCP) | ~3-5s | <1.5s (PPR) |
| Interaktivitet | Polling (5 min) | Realtime push |
| AI i produktet | Ingen | Chatbot, signaler, analyse |
| Sideoverganger | Hard refresh | Myke animasjoner |
| Feilhåndtering | Runtime | Type-sikker ved byggetid |
| Server-mutasjoner | fetch → API route | Server Actions |
| Feature-utrulling | Deploy alt | Gradvis (feature flags) |

---

## Implementeringsplan — faset

### Fase 1: Umiddelbar impact (0 kr, 4 timer)
1. PPR på statiske sider
2. Suspense på trading-dashboard
3. Integrer Realtime hook i AutopilotDashboard
4. View Transitions på navigasjon

### Fase 2: AI-native (0 kr, 3 timer)
5. Workers AI chatbot for support
6. AI trading-signaler på edge
7. Kimi K3-integrasjon for dyp analyse i app

### Fase 3: Infrastruktur (0 kr, 4 timer)
8. Type-safe env variabler
9. Server Actions for alle mutasjoner
10. Feature flags med KV

### Fase 4: Avansert (når 10+ brukere)
11. Durable Objects for trading sessions
12. Browser Rendering for rapporter

---

## Risikoer

| Risiko | Håndtering |
|---|---|
| PPR kan brekke dynamiske sider | Aktiveres per route, ikke globalt |
| Realtime kan oversvømme klienten | Rate-limit + throttle i hooken |
| Workers AI kan være treg | Fallback til Kimi K3 for tunge spørringer |
| Browser Rendering koster penger | Kun for rapporter, ikke kontinuerlig |
