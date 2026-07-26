# Browser-klient-sweep — Implementasjonsplan

> **For Hermes:** Implementer fase for fase. Hver fase er selvstendig committbar og deploybar. Ikke bland faser.

**Goal:** Eliminer bugklassen «browser-supabase er alltid anon» fra alle klient-komponenter — falske «utlogget»-redirects, falske «ingen data»-tilstander og stille tapte lagringer.

**Architecture:** Auth-cookien er httpOnly → browser-`createClient()` har aldri session → `auth.getUser()` = null og `.from()` kjører som anon (RLS → 0 rader). Etablert mønster: all brukerdata via `/api/*`-ruter med `createServerClient` + `getUser()` + eksplisitt `user_id`-filter (samme som `/api/user/profile` etter side 13-fiksen).

**Tech Stack:** Next.js 16, React 19, Supabase, TypeScript, Vitest, Playwright E2E.

**Scope (målt 2026-07-24):**
- 129 filer matcher browser-klient-mønsteret totalt
- **77 er faktiske `"use client"`-filer** (ekte risiko — resten er server components/actions med egen klient-fabrikk)
- 63 av dem bruker `.from(` (data-tap / falsk tom-tilstand)
- 50 bruker `auth.getUser/getSession` (guard-risiko / redirect-loops)
- 32 bruker `.channel()/.subscribe(` (realtime — vurderes per tilfelle, kan være legitimt for offentlige kanaler)

Filer: `/tmp/use-client-files.txt` (77 stk, regenereres i Fase 0).

---

## Fase 0: Scan-verktøy + prioriteringsrapport (ingen kodeendring i appen)

**Objective:** Klassifiser alle 77 filer automatisk slik at fasene 1–4 treffer riktig.

### Task 0.1: Lag scan-script

**Files:**
- Create: `scripts/scan-browser-client.mjs`

**Innhold (komplett):**

```javascript
#!/usr/bin/env node
// Klassifiserer "use client"-filer som bruker browser-supabase.
// Bruk: node scripts/scan-browser-client.mjs
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
  `grep -rl '^"use client"' src --include="*.tsx" --include="*.ts" | grep -v __tests__`,
  { encoding: "utf8" }
).trim().split("\n");

const report = { guard: [], read: [], write: [], realtime: [], clean: [] };

for (const f of files) {
  const src = readFileSync(f, "utf8");
  if (!/createClient|createBrowserClient/.test(src)) { report.clean.push(f); continue; }
  const tags = [];
  if (/auth\.(getUser|getSession)/.test(src)) tags.push("guard");
  if (/\.from\([^)]*\)\s*\.(select|insert|upsert|update|delete)/s.test(src) || /\.from\(/.test(src)) tags.push("data");
  if (/\.(insert|upsert|update|delete)\(/.test(src)) tags.push("write");
  if (/\.channel\(|\.subscribe\(/.test(src)) tags.push("realtime");
  const entry = { file: f, tags };
  if (tags.includes("guard")) report.guard.push(entry);
  else if (tags.includes("write")) report.write.push(entry);
  else if (tags.includes("data")) report.read.push(entry);
  else if (tags.includes("realtime")) report.realtime.push(entry);
  else report.clean.push(f);
}

console.log(JSON.stringify(report, null, 2));
```

**Step 2: Kjør og lagre rapport**

```bash
node scripts/scan-browser-client.mjs > .tmp-e2e/browser-client-rapport.json
```

Forventet: JSON med guard/write/read/realtime/clean-buckets. Verifiser at summen ≈ 77.

**Step 3: Commit**

```bash
git add scripts/scan-browser-client.mjs .tmp-e2e/browser-client-rapport.json
git commit -m "chore: scan-script for browser-supabase-bugklassen (fase 0)"
```

---

## Fase 1: Kritisk brukerreise — guard-bucket først

**Objective:** Fiks alle filer i `guard`-bucketen som kan redirecte/sperre innloggede brukere. Dette er samme klasse som ødela /profile (side 13).

**Kjente kandidater (verifiser mot rapporten):**
- `src/features/account/profile/WalletTab.tsx` (linje 57: `auth.getUser`)
- `src/features/account/profile/SettingsTab.tsx` (linjer 57, 88, 232)
- `src/features/account/profile/NotificationsTab.tsx`
- `src/features/account/settings/*` (4 filer)
- `src/hooks/useNotifications.ts`, `src/hooks/useProfileQuery.ts`

**Mønster per fil (TDD der det lar seg gjøre):**

1. **Les filen** — identifiser om `auth.getUser()` brukes til (a) redirect-guard, (b) user_id for dataoppslag, eller (c) begge deler.
2. **Redirect-guard (a):** Fjern guard-en helt hvis siden allerede er beskyttet av middleware (`src/middleware/auth-guard.ts:157`) eller en foreldrekomponent har auth-sjekk (som ProfilePageClient). Dette var riktig fiks for ProfileTab.
3. **user_id for data (b):** Erstatt med eksisterende `/api/*`-rute hvis den finnes (sjekk `src/app/api/user/`, `src/app/api/portfolio/`). Hvis ikke: opprett rute etter `/api/user/profile`-mønsteret (runtime nodejs, force-dynamic, getUser → 401, eksplisitt user_id-filter, whitelist ved skriving).
4. **Skriv-operasjoner:** Utvid relevant API-rute med PATCH/POST. **Husk RLS-fellen:** upsert må inkludere alle kolonner RLS-policyer sjekker (`user_id: user.id`) — INSERT-policy evalueres FØR ON CONFLICT.
5. **Gates per fil:** `npx tsc --noEmit` (0 feil) → `npm run test` (grønn) → commit.

**Commit-format:** `fix(auth): <komponent> brukte browser-supabase guard -> server-api / fjernet`

**Deploy:** Én deploy etter hele fasen. Verifiser med Playwright-login (`.tmp-e2e/side13e.mjs`-mønster) at berørte sider laster med data.

---

## Fase 2: Data-lesing som driver synlige sider

**Objective:** Fiks `read`-bucketen prioritert etter bruker-synlighet.

**Prioritert rekkefølge:**
1. `src/hooks/*` som driver dashboard/portfolio/historikk (brukerreisen er verifisert grønn i sideturen — IKKE rør hooks som allerede går via API; sjekk rapporten nøye, flere hooks matcher kanskje bare `createClient` uten å bruke den)
2. `src/features/trading/*` (5 filer) — trade-cockpit
3. `src/features/account/gamification/*` (3 filer) — badges/achievements
4. `src/app/[locale]/(academy)/*` — kurs-sider (merk: `page.tsx` uten "use client" er server components — ekskluder)

**Mønster:** Som fase 1, steg 3–5. Eksisterende API-er å gjenbruke: `/api/user/trades`, `/api/user/trading-sessions`, `/api/portfolio/summary`, `/api/gamification/achievements`.

**Verifisering per side:** Playwright-screenshot før/etter — siden skal vise SAMME eller MER data, aldri mindre. (Browser-anon ga 0 rader; hvis siden så «riktig» ut før, var dataen mock/fallback — dokumenter i commit-meldingen.)

---

## Fase 3: Skriv-operasjoner (stille tapte lagringer)

**Objective:** `write`-bucketen — disse «virker» i UI (ingen feil vises) men persisterer ingenting. Verst brudd mot tillit.

**Mønster:**
1. Finn UI-et som kaller lagringen — sjekk om det finnes en suksess-toast som lyver.
2. Opprett/utvid API-rute med whitelist (ALDRI `...body` rett inn i supabase — se PATCHABLE_FIELDS i `/api/user/profile/route.ts`).
3. Returner faktisk feil til UI ved 4xx/5xx slik at toast kan vise «Lagring feilet».
4. **E2E-verifiser persistering:** Playwright → PATCH/POST via `page.evaluate(fetch)` → GET → assert verdien (mønster: `.tmp-e2e/side13f.mjs`).

---

## Fase 4: Admin + resten + pre-commit-guard (prevensjon)

**Objective:** Gjenværende filer (admin, actions, lib) + sperre mot tilbakefall.

### Task 4.1: Admin-filer
`src/app/[locale]/(admin)/*` — admin-roller sjekkes server-side uansett. Samme mønster, lavere hast.

### Task 4.2: Realtime-vurdering
32 filer med `.channel()/.subscribe(` — vurder per fille: hvis kanalen er RLS-beskyttet trenger den server-mediert auth (broadcast via API eller websocket-worker). Hvis den lytter på offentlige data (priser), er anon OK — legg inn kommentar `// bevisst anon: offentlig kanal`.

### Task 4.3: Pre-commit-guard (systematisk prevensjon)

**Files:**
- Modify: `scripts/pre-push.mjs` (eller det eksisterende gate-oppsettet — finn riktig fil med `ls scripts/ | grep -i pre`)

**Legg til gate:**

```javascript
// Gate: ingen ny browser-supabase i "use client"-filer
const out = execSync(
  `grep -rl '^"use client"' src --include="*.tsx" | xargs grep -l 'auth.getUser\\|auth.getSession' 2>/dev/null | grep -v __tests__ || true`,
  { encoding: "utf8" }
).trim();
const allowed = new Set(fs.readFileSync("scripts/browser-client-allowlist.txt", "utf8").trim().split("\n").filter(Boolean));
const violations = out.split("\n").filter(Boolean).filter(f => !allowed.has(f));
if (violations.length) {
  console.error("❌ Nye filer med browser-supabase auth-guard:", violations);
  process.exit(1);
}
```

- Create: `scripts/browser-client-allowlist.txt` — fylles med filene som gjenstår etter fase 1–4 (kjente, dokumenterte unntak). Mål: listen skal kun krympe.

**Commit:** `chore(pre-commit): guard mot nye browser-supabase auth-guards`

---

## Gates (gjelder hver commit)

```bash
npx tsc --noEmit        # 0 feil
npm run test            # 1385+ grønne
npm run i18n:validate   # ved nye nøkler (norsk i begge filer)
```

Deploy per fase: `pkill -9 node; bash scripts/deploy.sh` (bakgrunn, notify). «Verifisering feilet» fra deploy-scriptet er kjent falsk negativ — verifiser manuelt med sleep 60 + curl/Playwright.

## Tester / validering

- **Per fil:** tsc + vitest (eksisterende suite må forbli grønn — 1385 tester)
- **Per fase:** Playwright E2E mot prod på berørt side (login `tomarnejensen@gmail.com`, mobil 390×844)
- **Skriv-faser:** persistering bevist via GET etter PATCH (side13f-mønsteret)
- **Fase 4.3:** begå bevisst en test-violasjon, se at gaten blokkerer, revert

## Risikoer / tradeoffs / åpne spørsmål

1. **Scope kan vokse:** Noen filer vil mangle API-rute → nye ruter må bygges (legg dem under eksisterende `/api/user/`-struktur). Estimert de fleste treffer eksisterende ruter.
2. **«Riktig utseende»-fellen:** Sider som ser fine ut i prod kan vise mock/fallback-data. Før/etter-screenshot er derfor obligatorisk — hvis etter-bildet viser *mindre*/annerledes data, er det trolig *sant* data som vises for første gang. Dokumenter i commit.
3. **Ikke rør det som virker:** `usePrices` (WebSocket-basert), auth-flyt, og server components uten "use client" er utenfor scope selv om de matcher grepet.
4. **RLS-fellen gjentar seg:** Hver nye skriv-rute må sjekke INSERT/UPDATE-policyer for tabellen (spør `pg_policies` via Mgmt API) og inkludere policy-kolonner i payload.
5. **Åpent:** Skal `src/actions/admin/*` (server actions) inn i scope? De matcher grepet men kan bruke server-klient korrekt — verifiser imports per fil (`@/lib/supabase/server` = OK, `@/lib/utils` browser = ikke OK).
6. **Ikke i denne planen:** kapitaldivergens (100k vs 92 418 kr), deploy.sh falsk negativ, achievements-RPC — egne saker etter denne.
