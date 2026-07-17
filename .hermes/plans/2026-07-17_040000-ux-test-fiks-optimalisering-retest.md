# UX-Test Fiks + Optimalisering + Re-test — Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Gjenopprett produksjons-auth (P0), lukk alle RED-funn fra adversarial UX-test 2026-07-17 (issues #107–#116), optimaliser auth-polling, og re-kjør UX-testen som verifisering.

**Architecture:** Én rotårsak (manglende `NEXT_PUBLIC_SUPABASE_*` ved build) driver de fleste funnene. Fiksen er derfor to-delt: (1) gjenopprett build-vars i Cloudflare Workers Builds + redeploy, (2) herding i kode slik at samme feilmodus ALDRI igjen gir stille svikt — fail-fast med brukervennlig driftsside, fail-closed middleware, og syntetisk auth-monitor.

**Tech Stack:** Next.js 16 (App Router), React 19, next-intl, Supabase Auth, Cloudflare Workers (OpenNext), Wrangler, Playwright, Vitest.

---

## Funn-matrise (fra UX-testen)

| Issue | Funn | Rotårsak | Fase |
|---|---|---|---|
| #107 | Signup/login/Google-Auth død i prod | `NEXT_PUBLIC_SUPABASE_URL`+`ANON_KEY` ikke satt som **build variables** i Workers Builds → ikke inlined i client chunks (verifisert: ingen chunk inneholder URL/JWT) | 0 |
| #108 | `/no/kurs` krasjer | Samme — Supabase-klient kaster `CONFIG_ERROR_MSG` under render | 0+2 |
| #109 | Hero "Les min historie" → 404 | `src/app/[locale]/about/` finnes ikke; `HeroSection.tsx:69` lenker dit | 1 |
| #110 | Nav-knapper viser "..." | `NavAuthState.tsx:82,90` — `loading ? "..." : t("login")`; AuthContext henger i loading når Supabase ikke kan init | 2 |
| #111 | Dev-jargon + usporbar feilkode | `client.ts:64` (config-melding vises rått), `(auth)/error.tsx:38,42` (feil kontekst "under innloggingen", digest uten korrelasjon) | 2 |
| #112 | "Prøv igjen" død | `(auth)/error.tsx:47` bruker `router.refresh()` — re-render krasjer deterministisk på nytt | 2 |
| #113 | App-shell for utloggede på /handel | `middleware/auth.ts:309-314` — ved manglende env returneres responsen FØR auth-gate (fail-open) | 2 |
| #114 | "health-worker" i footer | `ConditionalFooter.tsx:73-78` viser `data.version` fra `/api/health` (worker-navnet lekker) | 2 |
| #115 | JokerTrade dead-end + rå leaderboard-feil + copy | `(social)`-gruppen mangler layout m/ header/footer; leaderboard viser rå feiltekst; MLM-aktig copy | 3 |
| #116 | YELLOW-batch | Diverse polish | 3 |
| — | **Optimalisering:** auth-logger viser hundrevis `GET /user` per minutt fra CF-edge | AuthContext/refresh-loop poller aggressivt → rate-limit-risiko + kostnad | 4 |

---

## FASE 0 — Gjenopprett produksjon (P0, gjøres FØRST)

### Task 0.1: Sett build variables i Cloudflare Workers Builds

**Objective:** `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` må inn i build-miljøet (OpenNext-dok: "When you use Workers Builds, environment variables must be set in Build variables and secrets").

**Files:** Ingen kode — Cloudflare-konfig. Verifiser mot `wrangler.jsonc`.

**Steg:**
1. Hent verdier fra `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Sett dem via Cloudflare API på Workers Builds-konfigurasjonen (build vars, ikke bare runtime vars):
   ```bash
   # Hent nåværende build-config
   curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/builds" | jq .
   # PATCH build_variables med NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   Alternativt: Dashboard → Workers → klarpakke → Settings → Builds → **Build variables and secrets**.
3. Verifiser at begge ligger som build variables (API-respons viser dem).

**Verification:** API-respons inneholder begge nøklene under build-konfig.

### Task 0.2: Redeploy + purge cache

**Steg:**
1. `git commit --allow-empty -m "chore: trigger rebuild med NEXT_PUBLIC build vars" && git push origin main` (Workers Builds trigges).
2. Vent på build (poll builds API til status=success).
3. Purge CDN: `curl -X POST "https://api.cloudflare.com/client/v4/zones/328d7de7.../purge_cache" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -d '{"purge_everything":true}'`

**Verification:** Build success i builds API.

### Task 0.3: Verifiser prod-auth ende-til-ende

**Steg (alle må passere):**
1. `curl -s https://www.klarpakke.no/no/login | grep -o "pskhryjzkobytnfwucrb.supabase.co"` → **treff** (URL inlined).
2. Inkognito-browser: `/no/register` → opprett `verify.fix@klarpakke-test.invalid` → bruker finnes i `auth.users` (Supabase MCP).
3. Login med testbruker `kari.melum.uxtest@gmail.com` → redirect til dashboard, ingen "Supabase er ikke konfigurert".
4. Nav viser "Logg inn" / "Registrer deg" (ikke "...").
5. `/no/kurs` rendrer kurskatalog (ikke error boundary).

**Verification:** Alle 5 punkter grønne. Lukk #107, #108, #110 (rotårsak) i GitHub.

### Task 0.4: Syntetisk auth-smoketest i auto-monitor

**Objective:** Aldri igjen skal auth være nede uten at noen fanger det — dagens hourly auto-monitor sjekket ikke auth-flyt.

**Files:**
- Create: `scripts/prod-auth-smoke.mjs`
- Modify: cron-konfig for auto-monitor (Hermes cron eller PG-cron `cron-watchdog`)

**Kode (kjerne):**
```js
// scripts/prod-auth-smoke.mjs — exit 1 ved brudd, stille når OK
const r = await fetch("https://www.klarpakke.no/no/login");
const html = await r.text();
if (!html.includes("supabase.co")) {
  console.error("ALARM: NEXT_PUBLIC_SUPABASE_URL ikke inlined i prod-bundle");
  process.exit(1);
}
const reg = await fetch("https://www.klarpakke.no/no/register");
if ((await reg.text()).includes("Supabase er ikke konfigurert")) process.exit(1);
```
**Verification:** Kjør lokalt mot prod → exit 0. Koble til eksisterende auto-monitor-cron (hver time) med alarm til Tom ved exit 1.

---

## FASE 1 — Døde lenker (P0)

### Task 1.1: Opprett /about-side med Toms historie

**Files:**
- Create: `src/app/[locale]/(marketing)/about/page.tsx`
- Test: `e2e/critical/public-links.spec.ts` (ny)
- Sjekk først: hvilken gruppe marketing-sider faktisk ligger i (`ls "src/app/[locale]/(marketing)"`) — følg samme mønster som nabo-siden.

**Steg:**
1. Les `(marketing)`-gruppens eksisterende `page.tsx` for layout-mønster.
2. Skriv `about/page.tsx`: Toms historie (bilbransjen → 64k tap → 16 mnd AI (MIT/Google/Microsoft) → Klarpakke), norsk + engelsk i18n-nøkler i `messages/no/about.json` og `messages/en/about.json` (finnes allerede — verifiser nøkler brukes).
3. Metadata: `title: "Min historie | Klarpakke"`.

**Test:**
```ts
// e2e/critical/public-links.spec.ts
test("hero CTA-er er ikke døde", async ({ page }) => {
  await page.goto("/no");
  for (const href of ["/no/register", "/no/about"]) {
    const res = await page.request.get(href);
    expect(res.status()).toBe(200);
  }
});
```
**Run:** `npx playwright test e2e/critical/public-links.spec.ts` → PASS. `curl -o /dev/null -w "%{http_code}" https://www.klarpakke.no/no/about` → 200 etter deploy.

**Commit:** `fix(landing): opprett /about-side — hero CTA 'Les min historie' ga 404 (#109)`

---

## FASE 2 — Herding: aldri stille svikt igjen (P1)

### Task 2.1: Middleware fail-closed ved manglende env

**Files:** Modify: `src/middleware/auth.ts:309-314` — Test: `src/middleware/__tests__/auth.test.ts`

**Problem:** I dag: `if (!supabaseUrl || !supabaseAnonKey) { console.warn(...); return response; }` → fail-open, gjester slippes inn på beskyttede ruter og krasjer.

**Kode:**
```ts
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[middleware] KRITISK: NEXT_PUBLIC_SUPABASE_* mangler — fail-closed");
  // Beskyttede ruter: redirect til statisk driftsside (ingen Supabase-avhengighet)
  if (PROTECTED_PATHS.some((p) => strippedPath.startsWith(p))) {
    return redirectNoCache(new URL(localizedPathname(locale, "/driftsfeil"), request.url), 302);
  }
  return response; // marketing-sider kan fortsatt rendres (statiske)
}
```
1. Create: `src/app/[locale]/(legal)/driftsfeil/page.tsx` — statisk side: "Vi har en driftsfeil. Teamet er varslet. Prøv igjen om litt." + sist-oppdatert-tid. Ingen Supabase-import.
2. **Test:** mock `process.env` uten vars → forvent redirect 302 til `/no/driftsfeil` for `/handel`; forvent 200 (pass-through) for `/priser`.
3. **Run:** `npx vitest run src/middleware/__tests__/auth.test.ts` → PASS.

**Commit:** `fix(middleware): fail-closed til /driftsfeil ved manglende Supabase-env (#113)`

### Task 2.2: Brukervennlig config-feil (aldri dev-jargon)

**Files:** Modify: `src/lib/supabase/client.ts:62-64`, `src/app/[locale]/(auth)/login/page.tsx` (+ tilsv. register) — Test: `e2e/critical/auth.spec.ts` (finnes allerede og sjekker nettopp dette — utvid)

**Kode:**
```ts
// client.ts — behold teknisk melding internt, men skill ut brukertekst
export const CONFIG_ERROR_MSG =
  "Supabase er ikke konfigurert. Sjekk at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er satt.";
export const CONFIG_USER_MSG_NO =
  "Vi har en midlertidig driftsfeil. Teamet er varslet — prøv igjen om litt. Ingen data er tapt.";
```
Login/register-UI fanger `CONFIG_ERROR_MSG` og viser `CONFIG_USER_MSG_NO` (via eksisterende toast/inline-feil), aldri rå melding.

**Run:** `npx playwright test e2e/critical/auth.spec.ts` → PASS (testen skal FEILE hvis dev-jargon vises — den finnes allerede som guard).

**Commit:** `fix(auth): brukervennlig melding ved manglende Supabase-config (#111)`

### Task 2.3: Error boundary — fungerende retry + riktig kontekst

**Files:** Modify: `src/app/[locale]/(auth)/error.tsx:37-51`, `src/app/global-error.tsx:45-50`

**Kode:**
```tsx
// (auth)/error.tsx
const isRegister = pathname?.includes("register");
<p className="text-[#9CA3AF] mb-2">
  {isRegister
    ? "Vi klarte ikke å opprette kontoen din. Teamet er varslet — prøv igjen om litt."
    : "Vi klarte ikke å logge deg inn. Teamet er varslet — prøv igjen om litt."}
</p>
{error.digest && (
  <p className="text-xs text-[#6B7280] font-mono mb-6">
    Referanse: {error.digest} (oppgi denne ved henvendelse)
  </p>
)}
<button onClick={() => { reset(); router.refresh(); }} ...>Prøv igjen</button>
```
Legg også til sekundær fallback: ved gjentatt klikk (2.) → `window.location.reload()`.

**Test:** `e2e/debug/` — manuell verifisering: kast test-feil, klikk "Prøv igjen" → boundary resettes.

**Commit:** `fix(error): fungerende retry + kontekst-riktig feiltekst i auth boundary (#111, #112)`

### Task 2.4: Nav — aldri "..." for gjester

**Files:** Modify: `src/features/marketing/components/NavAuthState.tsx:82,90` — Test: `src/lib/navigation/__tests__/config.test.ts` (eller ny komponent-test)

**Kode:**
```tsx
// Fjern loading-gating av gjeste-labels — labels avhenger ikke av auth-tilstand
<LogIn className="w-4 h-4" />
{t("login")}
// ...
{t("signup")}
```
I tillegg: `AuthContext` — legg til 5s timeout som alltid setter `loading=false` (defence-in-depth):
```ts
useEffect(() => {
  const failsafe = setTimeout(() => setLoading(false), 5000);
  return () => clearTimeout(failsafe);
}, []);
```

**Test:** render `<NavAuthState>` med `loading: true` → assert "Logg inn" synlig, "..." fraværende.

**Commit:** `fix(nav): vis alltid login/signup-labels for gjester — loading heng ga '...' (#110)`

### Task 2.5: Footer — fjern worker-navn-lekkasje

**Files:** Modify: `src/features/landing/ConditionalFooter.tsx:73-78`

**Kode:**
```tsx
// Vis kun ekte app-versjon (git SHA), aldri worker-navn fra /api/health
const isRealVersion = version && /^[0-9a-f]{7,40}$/i.test(version);
{isRealVersion && (<>...</>)}
```
Alternativt fjern version-blokken helt i prod (enkleste, YAGNI).

**Test:** komponent-test med `version: "health-worker"` → ikke rendret.

**Commit:** `fix(footer): ikke vis intern worker-versjon offentlig (#114)`

---

## FASE 3 — JokerTrade + polish (P2)

### Task 3.1: Header/footer på JokerTrade-siden

**Files:** Create: `src/app/[locale]/(social)/layout.tsx` (eller flytt jokertrade under marketing-shell) — verifiser mot `isAppShellPath()` i `src/lib/navigation/config.ts:371-387` (jokertrade er i APP_SHELL_PATHS — vurder å FJERNE den derfra for gjestevisning, eller gi (social) egen layout med marketing header + ConditionalFooter).

**Test:** `curl https://www.klarpakke.no/no/jokertrade | grep -c "Hovednavigasjon"` → ≥1.

**Commit:** `fix(jokertrade): legg til header/footer — siden var navigasjonsløs dead-end (#115)`

### Task 3.2: Leaderboard graceful degradation

**Files:** Modify: leaderboard-seksjonen i `src/app/[locale]/(social)/jokertrade/page.tsx` (eller komponent den bruker)

**Kode:** ved fetch-feil → `return null` (skjul hele seksjonen) i stedet for rå "Kunne ikke laste leaderboard".

**Commit:** `fix(jokertrade): skjul leaderboard ved feil — ikke vis rå feiltekst (#115)`

### Task 3.3: Copy-rewrite (krever Tom-avgjørelse — utkast inkludert)

**Files:** Modify: `messages/no/*.json` + jokertrade-side
- "Tjen penger mens du sover" → "Lær mens du øver — med lekepenger"
- Testimonial "+18% første uken!" → marker som simulert: "Resultat fra papirhandel (lekepenger), ikke garanti"
- "Du trenger ikke gjøre noe" → "Du bestemmer alltid selv når du vil gå live"

**Commit:** `copy(jokertrade): fjern MLM-aktige avkastningspåstander — bygg tillit (#115)`

### Task 3.4: YELLOW-batch (#116)

1. Priser: fjern duplisert header inne i main (`/no/priser`).
2. Priser: "Prøv gratis" → legg til "Ingen kort nødvendig" (hvis sant — verifiser Stripe-flow).
3. Title-dublering `/no/kurs`: "Kurs | Klarpakke | Klarpakke" → "Kurs | Klarpakke".
4. "solana" → "SOL" i live-priser.
5. Landing live-ticker: vis 24t-endring dempet (grå, mindre) eller mindre volatilt par.
6. "5 min å sette opp" → "Kom i gang på kvelden" (fjern tidspåstand).

**Commit:** `fix(polish): YELLOW-batch fra UX-test (#116)`

---

## FASE 4 — Optimalisering: auth-polling-storm

### Task 4.1: Finn og drep /user-polling-loopen

**Evidence:** Supabase auth-logger 2026-07-17 01:21 UTC: titalls `GET /user` **per sekund** fra CF-edge (`2a06:98c0:3600::103`). Dette er rate-limit- og kostnadsbombe, og kan være med-årsak til intermitterende auth-feil.

**Files:** Undersøk: `src/lib/auth/new/AuthContext.tsx` (refresh-logikk), alle `supabase.auth.getUser()`-kall i klient-komponenter (`search_files "getUser()" src`)

**Steg:**
1. Tell `getUser()`/`refreshSession()`-kall i client-komponenter; finn loop (sannsynlig: `visibilitychange`/`focus`-listener + `setInterval` + manglende debounce, eller retry-loop ved 401).
2. Sentraliser: én auth-state via AuthContext (single source), ingen per-komponent `getUser()`.
3. Legg på debounce min. 30s for focus-refresh; exponential backoff ved feil; stopp polling når `document.hidden`.
4. **Verifiser:** auth-logger etter deploy → maks noen få `/user` per bruker-økt per minutt.

**Commit:** `perf(auth): eliminer /user-polling-storm — sentralisert auth-state med debounce`

---

## FASE 5 — Re-kjør adversarial UX-test (verifisering)

### Task 5.1: Full re-test som Kari (fresh browser)

**Etter deploy av Fase 0–4 + cache-purge:**
1. Ny adversarial-ux-test-sesjon, samme persona (Kari, 61): landing → register (ny test-epost) → login → /kurs → /handel → /priser → /jokertrade → about.
2. Sjekkliste = alle RED-funn fra 2026-07-17 skal være lukket:
   - [ ] Signup fullfører (bruker i auth.users)
   - [ ] Google-knapp redirecter
   - [ ] Login fungerer, ingen dev-jargon
   - [ ] Nav viser labels (ikke "...")
   - [ ] /no/kurs rendrer
   - [ ] /no/about 200
   - [ ] /handel redirecter gjest → /login?next=...
   - [ ] Footer uten "health-worker"
   - [ ] JokerTrade har header/footer, ingen rå feil
   - [ ] "Prøv igjen" faktisk re-setter
3. Oppdater/lukk GitHub-issues #107–#116 med verifikasjonsbevis.
4. Rapporter eventuelle NYE funn som nye issues (label ux-review).

**Verification:** Kari-rapporten sier "JA, jeg klarte det" — alle 10 sjekkpunkter grønne.

---

## Risiko / tradeoffs / åpne spørsmål

- **Build vars hemmelighet:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` er per design offentlig (RLS beskytter) — trygt som build var. ALDRI service-role som NEXT_PUBLIC.
- **Fail-closed middleware:** ved fremtidig env-brudd vises /driftsfeil i stedet for krasj — bevisst tradeoff (synlig > stille).
- **Copy-rewrite (3.3):** Toms beslutning — planen inneholder utkast, men endring av salgs-copy bør han godkjenne.
- **/about-innhold:** Bruk `messages/{no,en}/about.json` (finnes allerede) — verifiser at innholdet matcher Toms historie før publish.
- **Auth-polling (4.1):** kan være med-årsak til at Supabase rate-limiter — bør gjøres uavhengig av UX-arbeidet.
- **Test-brukere:** `kari.melum.uxtest@gmail.com` (opprettet under testen) — behold som permanent synthetic-monitor-bruker eller slett ved opprydding.

## Valgfri standardrekkefølge ved deploy

1. `npm run lint:gate && npm run type-check && npm run test:unit`
2. `npx playwright test e2e/critical --project=chromium`
3. Push → Workers Builds → verifiser build success
4. Purge CDN-cache
5. Kjør Fase 5-sjekklisten i inkognito
