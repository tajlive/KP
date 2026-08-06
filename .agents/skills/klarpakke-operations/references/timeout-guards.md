# Timeout Guards

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 2. Timeout-guards på API-ruter

**⚠️  REGEL: Aldri auto-rediger TypeScript med regex-scripts. Bruk subagenter.**

**Fremgangsmåte:**
1. Skriv `.hermes/plans/<dato>-timeout-guards.md` med eksakt kode per rute
2. Dispatch `delegate_task` — én subagent per rute (max 4)
3. Verifiser `npx eslint <fil>` → 0 errors
4. Sjekk `git diff` at koden er korrekt (ikke double commas, feil indent)

**Standard timeout-mønster:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
try {
  const res = await fetch(url, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

**Tidsvalg:** 5s Slack/webhooks, 10s Vipps/Resend/API, 15s Binance.


## 7. Client-side Supabase → API med timeout (hengende sider)

**Symptom:** Dashboard/portefølje viser "Laster..." evig. Ingen console-feil. Siden laster aldri data.

**Rotårsak:** `getSupabaseClient()` kaller Supabase direkte fra nettleseren uten timeout. Hvis Supabase er treg eller nettverket er dårlig, henger spørringen evig.

**Fiks:** Bytt til API-endepunkt med server-side timeout:

```typescript
// FØR (henger — ingen timeout):
const supabase = getSupabaseClient();
const { data: profile } = await supabase
  .from("user_profiles")
  .select("paper_balance")
  .eq("id", user.id)
  .single();

// ETTER (timeout-sikker):
const res = await fetch(`/api/user/profile?userId=${user.id}`);
const data = await res.json();
const profile = data.profile;
```

**API-endepunkt-mønster** (`/api/user/profile/route.ts`):
```typescript
const supabasePromise = import("@/lib/supabase/server").then(m => m.createServerClient());
const supabase = await Promise.race([
  supabasePromise,
  new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
]) as Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerClient>>;
```

**Regel:** ALDRI bruk `getSupabaseClient()` for data-fetching i client components. Bruk API-endepunkter med timeout. `getSupabaseClient()` er kun for auth (login/logout/session).

Se `references/client-side-supabase-to-api-migration.md` for fullstendig before/after av hvordan DashboardClient og PortfolioClientPage ble migrert fra direkte Supabase til API med timeout.

---


## 19. JokerTrade guard + global kill switch (2026-07-31)

Før auto-trading aktiveres for mange brukere: sett opp guard + kill switch.

- `references/jokertrade-guard-killswitch-2026-07-31.md` — komplett SQL + Edge Function + cron + monitor-view.
- `references/jokertrade-monitoring-cron.md` — 30-minutters Hermes cron som sjekker sesjoner, handler, guard-logg og Edge Function.
- Relatert: `klarpakke-currency-pitfalls` (USDT/NOK-blanding), `klarpakke-trading-data-cleanup` (opprydding).


