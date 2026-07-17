# Fiks gjenstående feil + optimalisering — Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Fiks de 3 gjenstående feilene etter UX-test-oppryddingen (#107–#116), optimaliser, og bekreft med ny test.

**Kontekst:** 10/10 RED-issues er lukket og verifisert. 3 ting gjenstår:
1. **KursPage i18n** — namespace `kursPage` viser fallback-nøkler (`kursPage.lessons`). Rotårsak funnet (se under).
2. **TypeScript-feil** — 95+ pre-eksisterende feil. `course_badges`-tabellen mangler i Supabase-types.
3. **Workers Builds CI** — GitHub Actions står i `queued`. Avklar om Workers Builds eller GH Actions er deploy-kanal.

**Arkitektur:** Next.js 16 + OpenNext på Cloudflare Workers. i18n via `src/i18n.ts` (hardkodet navneliste + dynamiske imports). Supabase-typer via `npx supabase gen types`.

---

## 🔍 Rotårsak: KursPage i18n

I `src/i18n.ts` er **variabel-listen og Promise.all-listen i ulik rekkefølge** for de to siste elementene:

**Variabel-liste (linje 59–61):**
```ts
trading,
kursPage,        // ← posisjon 28
tradingResults,  // ← posisjon 29
```

**Promise.all (linje 197–206):**
```ts
import(`...tradingResults.json`)...  // ← posisjon 28
import(`...kursPage.json`)...         // ← posisjon 29
```

**Konsekvens:** `kursPage`-variabelen får `tradingResults`-data og omvendt. Begge namespaces er defekte.

**Fiks:** Bytt om de to import-blokkene i Promise.all slik at `kursPage`-importen kommer FØR `tradingResults`.

---

## Task 1: Fiks KursPage i18n — bytt import-rekkefølge i Promise.all

**Objective:** Få `kursPage`-namespace til å løse korrekt ved kjøretid.

**Files:**
- Modify: `src/i18n.ts:197-206`

**Step 1: Les dagens tilstand**

```bash
grep -n "tradingResults\|kursPage" src/i18n.ts
```

Forventet: tradingResults-import på linje 197–201, kursPage-import på linje 202–206.

**Step 2: Bytt rekkefølge — kursPage FØR tradingResults**

Patch `src/i18n.ts`: flytt `kursPage`-importblokken (6 linjer) opp før `tradingResults`-importblokken.

**Før:**
```ts
      import(`../messages/${validLocale}/tradingResults.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/tradingResults.json").then((m) => m.default),
      ),
      import(`../messages/${validLocale}/kursPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/kursPage.json").then((m) => m.default),
      ),
    ]);
```

**Etter:**
```ts
      import(`../messages/${validLocale}/kursPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/kursPage.json").then((m) => m.default),
      ),
      import(`../messages/${validLocale}/tradingResults.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/tradingResults.json").then((m) => m.default),
      ),
    ]);
```

**Step 3: Verifiser at rekkefølgen matcher**

```bash
# Sjekk at linjene er i samme rekkefølge i begge lister
grep -n "kursPage\|tradingResults" src/i18n.ts
```

Forventet output:
```
60:      kursPage,
61:      tradingResults,
...
202:      import(`../messages/${validLocale}/kursPage.json`)
...
207:      import(`../messages/${validLocale}/tradingResults.json`)
```

**Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "fix(i18n): bytt kursPage/tradingResults import-rekkefølge så destructuring matcher"
```

**Verifikasjon:** Etter deploy: `/no/kurs` viser norske labels ("Kurs", "leksjoner", "minutter" — IKKE `kursPage.lessons`).

---

## Task 2: Regenerer Supabase-typer etter course_badges

**Objective:** Fiks pre-eksisterende TS-feil i `kurs/page.tsx` forårsaket av manglende `course_badges`-relasjon i typene.

**Files:**
- Modify: `src/lib/supabase/database.types.ts` (eller der types bor)
- Verify: `src/app/[locale]/(academy)/kurs/page.tsx` — feil borte

**Step 1: Regenerer typer**

```bash
cd /Users/taj/klarpakke
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

`--linked` krever at prosjektet er linket via `supabase link`. Hvis ikke:
```bash
npx supabase gen types typescript --project-id pskhryjzkobytnfwucrb > src/lib/supabase/database.types.ts
```

**Step 2: Sjekk at TS-feil i kurs/page.tsx forsvinner**

```bash
npx tsc --noEmit 2>&1 | grep "kurs/page.tsx" | wc -l
```

Forventet: 0 (ingen feil i kurs/page.tsx).

**Step 3: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "fix(types): regenerer Supabase-typer med course_badges-relasjon"
```

---

## Task 3: Bygg + deploy + CDN-purge + verifiser

**Objective:** Deploy begge fiksene og verifiser i produksjon.

**Step 1: Bygg**

```bash
cd /Users/taj/klarpakke
nvm use 24
rm -rf .open-next
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build
```

Forventet: `Worker saved in .open-next/worker.js 🚀`

**Step 2: Deploy**

```bash
source /tmp/cf_env.sh  # CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

Forventet: `Uploaded klarpakke` + `Deployed klarpakke triggers`

**Step 3: Purge CDN**

```bash
source /tmp/cf_env.sh
curl -X POST "https://api.cloudflare.com/client/v4/zones/328d7de7e8e48308fd4f9d760da5b18f/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

Hvis tokenet mangler `Zone:Cache Purge`: bruk `wrangler` alternativt, eller hopp til Step 4 (cache-control er allerede `no-cache`).

**Step 4: Verifiser i nettleser**

1. `/no/kurs` — labels på norsk ("Kurs", "leksjoner", "minutter", "Start kurs", "Logg inn for å lagre fremdriften din")
2. `/no/kurs` — title-tag er "Kurs | Klarpakke" (ikke "kursPage.metadataTitle | Klarpakke" eller dobbel brand)
3. `/no/register` — opprett ny testbruker → "Bruker opprettet!"
4. `/no/handel` (utlogget) → redirect til login

**Step 5: Commit + push**

```bash
git push origin main
```

---

## Task 4: Kjør Kari-re-test (full runde)

**Objective:** Bekreft at ALLE 10 issues fortsatt er lukket og at i18n fungerer.

**Metode:** Samme som forrige runde — ny nettleserøkt, naviger som Kari:

| # | Test | Forventet |
|---|------|-----------|
| 1 | Landing → nav | «Logg inn» / «Registrer deg» |
| 2 | Landing → «Les min historie» | `/no/about` uten 404 |
| 3 | `/no/register` → ny konto | «Bruker opprettet!» |
| 4 | `/no/kurs` | Norske labels, 3 kurs, 22 leksjoner |
| 5 | `/no/kurs` → title | «Kurs | Klarpakke» |
| 6 | `/no/jokertrade` | Header+footer, «Lær mens du øver» |
| 7 | `/no/priser` | Ingen duplisert header |
| 8 | `/no/handel` (utlogget) | Redirect til login |
| 9 | Footer alle sider | Ingen «health-worker» |
| 10 | `/api/health` | `version` finnes (kan være SHA eller worker-tag) |

---

## Risiko og tradeoffs

| Risiko | Sannsynlighet | Mitigering |
|--------|---------------|------------|
| `supabase gen types` feiler (ikke linket) | Middels | Fallback: manuell type-patch for `course_badges` |
| CDN-purge krever Zone:Cache Purge | Høy | Cache-control er allerede `no-cache` — skip purgen |
| Workers Builds CI fortsatt queued | Høy | Bruk manuell wrangler deploy som fallback |
| `tradingResults` har vært defekt siden i18n.ts-edit | Middels | Sjekk om noen side bruker `tradingResults` — hvis ubrukt, ingen påvirkning |

---

## Åpne spørsmål

1. **Workers Builds vs GitHub Actions** — hvilken deploy-kanal er aktiv? GH Actions viser `queued` i 15+ min. Trenger avklaring.
2. **Supabase cron-feil** — `auto-heal`, `auto-trade`, `SmartTrader`, `heartbeat` har `last_status: error`. Var dette kaskade fra auth-outage, eller separate feil? Undersøkes separat.
3. **Title-dublering** — «Kurs \| Klarpakke \| Klarpakke» og «Om oss \| Klarpakke \| Klarpakke». Rotlayout legger til `\| Klarpakke`-suffix på alle titler. Metadata-verdi `"Kurs"` burde gi «Kurs \| Klarpakke» men gir dobbel. Mistenker at `metadataTitle` i `kursPage.json` er «Kurs \| Klarpakke» eller at layout-malen er bugget. Fikses i separat task.
