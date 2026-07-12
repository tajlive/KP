# Worker 1102 (CPU/Memory) — Optimaliseringsplan

> **For Hermes:** Implementer task-by-task med subagent-driven-development.

**Goal:** Eliminere Cloudflare Worker 1102-feil (worker_exceeded_resources) som gir 503 på API-kall som `/api/paper-trading/init`, `/api/progress`, `/api/user/trading-analytics`.

**Architecture:** Redusere worker bundle-size og runtime memory ved å fjerne ubrukte/større avhengigheter, splitte API-ruter og flytte tung logikk til Supabase Edge Functions.

**Tech Stack:** Next.js 16 (OpenNext/Cloudflare Workers), Supabase, Sentry, Coinbase SDK

---

## Context

- Worker handler: 34MB raw / 8.55MB gzipped (under 10MB limit, men runtime memory >128MB)
- 172 API-ruter i single worker — alle imports lastes for hver request
- Største ubrukte avhengigheter: `@coinbase/*` (164MB i node_modules — sannsynligvis ubrukt), `@opentelemetry/*` (54MB), Sentry (180MB)
- Spesifikke 503-feil: `paper-trading/init`, `progress`, `user/trading-analytics`
- Cloudflare 1102: Worker overstiger CPU-tid (30s) eller minne (128MB)

## Approach

### Fase 1: Fjern store ubrukte avhengigheter
### Fase 2: Flytt tunge API-ruter til Supabase Edge Functions
### Fase 3: Optimaliser gjenværende bundle

---

## Task 1: Fjern @coinbase SDK (164MB i node_modules)

**Objective:** Fjern Coinbase-pakken som sannsynligvis ikke er i bruk

**Files:**
- Inspect: `src/` references to "coinbase"
- Remove: `package.json` dependency
- Run: `npm uninstall @coinbase/*`

**Step 1: Finn Coinbase-referanser**
```bash
grep -rn "coinbase\|@coinbase" /Users/taj/klarpakke/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | grep -v ".spec."
```

**Step 2: Verifiser ubrukt** — hvis 0 relevante treff, fjern

**Step 3: Fjern fra package.json**
```bash
cd /Users/taj/klarpakke && npm uninstall @coinbase/onchainkit @coinbase/wallet-sdk @coinbase/...
```

**Step 4: Bygg og sjekk size**
```bash
bash --noprofile --norc -c 'cd /Users/taj/klarpakke && rm -rf .open-next .next && NODE_OPTIONS="--max-old-space-size=8192" /opt/homebrew/bin/npm run cf:build'
bash scripts/pre-deploy-size-check.sh
```
Forventet: Gzipped size synker fra 8.55MB til <7MB

**Step 5: Verifiser ingen import-feil**
```bash
npm run lint 2>&1 | tail -3
```

**Step 6: Commit**
```bash
git add -A && git commit -m "perf: fjern @coinbase SDK (164MB — ubrukt)"
```

---

## Task 2: Fjern @opentelemetry (54MB — Sentry bruker sin egen)

**Objective:** Opentelemetry er kun nødvendig for Sentry hvis auto-instrumentering er på. Sentry har sin egen tracing.

**Files:**
- Inspect: package.json for opentelemetry deps
- Remove: all `@opentelemetry/*` packages

**Step 1: Finn opentelemetry-referanser**
```bash
grep -rn "opentelemetry\|OpenTelemetry" /Users/taj/klarpakke/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -5
```

**Step 2: Hvis ubrukt — fjern**
```bash
npm uninstall @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/instrumentation-http @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

**Step 3: Bygg og verifiser size**
Samme som Task 1 Step 4.

**Step 4: Commit**
```bash
git commit -m "perf: fjern @opentelemetry (54MB — bruker Sentry SDK tracing)"
```

---

## Task 3: Optimaliser Sanity imports (53MB)

**Objective:** Sanity SDK er stort men nødvendig. Reduser bundle-impact ved å lazy-loade.

**Files:**
- Modify: `src/lib/sanity/client.ts`

**Step 1: Slå opp hvordan Sanity brukes**
```bash
grep -rn "from.*sanity\|@sanity" /Users/taj/klarpakke/src/app/api/ --include="route.ts" | grep -v node_modules | head -10
```

**Step 2: Hvis kun noen få API-ruter bruker Sanity — flytt importen inn i funksjonen**
```typescript
// FØR (toppnivåimport — alltid lastet)
import { client } from "@/lib/sanity/client";

// ETTER (lazy — kun lastet når ruta kalles)
async function getSanityClient() {
  const { client } = await import("@/lib/sanity/client");
  return client;
}
```

**Step 3: Test bygg**
```bash
bash --noprofile --norc -c 'cd /Users/taj/klarpakke && rm -rf .open-next .next && NODE_OPTIONS="--max-old-space-size=8192" /opt/homebrew/bin/npm run cf:build'
```

---

## Task 4: Flytt paper-trading/init til Supabase Edge Function

**Objective:** `/api/paper-trading/init` kaller `getOrCreatePaperTradingSession` som gjør tunge DB-spørringer. Flytt til Edge Function.

**Files:**
- Create: `supabase/functions/paper-trading-init/index.ts`
- Modify: `src/app/api/paper-trading/init/route.ts` → proxy til Edge Function

**Step 1: Opprett Edge Function**
```bash
npx supabase functions new paper-trading-init
```

**Step 2: Implementer Edge Function**
```typescript
// supabase/functions/paper-trading-init/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Finn eller opprett session — tilsvarer getOrCreatePaperTradingSession
  const { data: existing } = await supabase
    .from("trading_sessions")
    .select("id, current_capital_nok, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify(existing), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Opprett ny session
  const { data: session, error } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: user.id,
      paper_balance: 100000,
      current_capital_nok: 100000,
      status: "active",
      mode: "paper",
    })
    .select()
    .single();

  return new Response(JSON.stringify(session ?? { error }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Step 3: Deploy Edge Function**
```bash
npx supabase functions deploy paper-trading-init --no-verify-jwt
```

**Step 4: Oppdater API-rute til proxy**
```typescript
// src/app/api/paper-trading/init/route.ts
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = request.headers.get("Authorization") || "";

  const res = await fetch(
    `${supabaseUrl}/functions/v1/paper-trading-init`,
    { headers: { Authorization: authHeader } },
  );
  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Step 5: Bygg og verifiser**
```bash
bash --noprofile --norc -c 'cd /Users/taj/klarpakke && rm -rf .open-next .next && NODE_OPTIONS="--max-old-space-size=8192" /opt/homebrew/bin/npm run cf:build'
bash scripts/pre-deploy-size-check.sh
```
Forventet: ~200KB spart per flyttet rute

---

## Task 5: Flytt /api/progress og /api/user/trading-analytics

**Objective:** Samme mønster som Task 4 — flytt til Edge Functions

**Files:**
- Create: `supabase/functions/progress/index.ts`
- Create: `supabase/functions/trading-analytics/index.ts`
- Modify: `src/app/api/progress/route.ts`
- Modify: `src/app/api/user/trading-analytics/route.ts`

**Approach:** Identisk med Task 4 — kopier SQL-logikken inn i Edge Function, la Next.js API-rute være en tynn proxy.

---

## Task 6: Sett opp Unbound Worker (økt CPU-time)

**Objective:** Cloudflare Workers har 30s CPU-tid på standard plan. Unbound Workers har 30 minutter.

**Files:**
- Modify: `wrangler.jsonc`

**Step 1: Legg til `usage_model` i wrangler.jsonc**
```jsonc
{
  "name": "klarpakke",
  "main": ".open-next/worker.js",
  "usage_model": "unbound", // Øker CPU-tid fra 30s til 30min
  // ...resten av config
}
```

**⚠️ Overvåk kostnad:** Unbound Workers er dyrere per request. Bruk kun hvis nødvendig etter optimalisering.

---

## Task 7: Deploy og verifiser

**Step 1: Full build**
```bash
bash --noprofile --norc -c 'cd /Users/taj/klarpakke && rm -rf .open-next .next && NODE_OPTIONS="--max-old-space-size=8192" /opt/homebrew/bin/npm run cf:build'
bash scripts/pre-deploy-size-check.sh
```

**Step 2: Deploy**
```bash
NODE_OPTIONS="--max-old-space-size=8192" /opt/homebrew/bin/npx wrangler deploy --env ""
```

**Step 3: Post-deploy verify**
```bash
bash scripts/post-deploy-verify.sh
```

**Step 4: Test API-kall som tidligere feilet**
```bash
for endpoint in "paper-trading/init" "progress" "user/trading-analytics"; do
  curl -s -w "\n%{http_code}" "https://www.klarpakke.no/api/$endpoint" -H "Cache-Control: no-cache"
done
```

---

## Forventet resultat

| Tiltak | Spart bundle | Runtime-effekt |
|--------|:------------:|:--------------:|
| Fjern @coinbase (164MB) | ~1-2MB gzipped | Betydelig mindre V8 heap |
| Fjern @opentelemetry (54MB) | ~500KB-1MB | Mindre kode å parse |
| Flytt 3 API-ruter til Supabase EF | ~200KB per rute | 3 færre tunge ruter i worker |
| Lazy-load Sanity | ~500KB | Kun lastet når nødvendig |
| **Totalt** | **~2-4MB spart** | **Under 128MB runtime** |

---

## Risikoer og åpne spørsmål

- **Coinbase:** Kan være i bruk av "copy-trading" eller "marketplace" funksjoner. Må verifiseres før sletting.
- **Supabase Edge Functions:** Krever ekstra deploy-step (supabase functions deploy). Kan glemmes.
- **Unbound Workers:** Økte kostnader. Start uten, bruk kun hvis 1102 fortsetter.
- **Next.js build:** Fjerning av pakker kan trigge TS-feil hvis imports finnes. Rydd imports samtidig.
