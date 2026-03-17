# Vercel build – warnings og fiks

Dette dokumentet beskriver kjente advarsler i Vercel-build og hva som er gjort for å unngå at de forstyrrer eller gjentar seg.

## 1. «vercel found in project dependencies and will be ignored»

- **Årsak:** Vercel injiserer egen CLI under build; hvis `vercel` står i package.json (dependencies eller devDependencies), vises advarselen.
- **Fiks:** `vercel` er **fjernet** fra package.json. Deploy-scriptene bruker **`npx vercel`** (f.eks. `deploy:prod` → `npx vercel --prod`). Da forsvinner advarselen, og Vercel CLI lastes on-demand ved deploy.

## 2. next-intl / webpack cache (Parsing failed at 'import(t)')

- **Årsak:** `next-intl` sin `extractor/format/index.js` bruker dynamisk `import(t)`. Webpack kan ikke parse det statisk, så «Build dependencies behind this expression are ignored and might cause incorrect cache invalidation» vises.
- **Fiks:** I `next.config.mjs` er `transpilePackages: ["next-intl"]` satt. I tillegg settes **`config.infrastructureLogging = { level: "error" }`** i production build slik at disse webpack-advarselene ikke fyller build-loggen. Cache oppfører seg fortsatt korrekt; dette er kun loggstøy.

## 3. «Serializing big strings … consider using Buffer»

- **Årsak:** Webpack PackFileCacheStrategy serialiserer store strenger (f.eks. fra next-intl/oversettelser), noe som kan påvirke deserialiseringsytelse.
- **Fiks:** Vi bruker allerede `cache: { type: 'filesystem', compression: 'gzip' }`. Buffer-endring må skje i webpack/Next.js selv. Samme `infrastructureLogging`-nivå som over reduserer at disse advarselene vises i Vercel-loggen.

## 4. «Using edge runtime on a page currently disables static generation»

- **Årsak:** `src/app/opengraph-image.tsx` og `src/app/[locale]/opengraph-image.tsx` bruker `export const runtime = 'edge'` fordi Next.js `ImageResponse` (OG-bilder) krever edge.
- **Fiks:** Ingen endring – dette er forventet og **anbefalt** for dynamiske OG-bilder. Alternativet er statiske filer (f.eks. `opengraph-image.png`), men da forsvinner dynamisk generering. Kommentar er lagt inn i begge filer. Ikke fjern edge fra disse filene.

## 5. npm audit (38 vulnerabilities)

- **Årsak:** Mange sårbarheter sitter i **dev-only**-pakker: `vercel` (CLI), `@lhci/cli`, `lighthouse`, `inquirer`, `tmp`, osv. Noen krever `npm audit fix --force` (breaking).
- **Fiks:**  
  - `vercel` er fjernet fra prosjektet; bruk `npx vercel` ved deploy. Dev-only-pakker inngår ikke i produksjonsbundle.  
  - Kjør `npm audit fix` jevnlig for trygge oppdateringer.  
  - Unngå `npm audit fix --force` uten plan – det kan brekke build.  
  - Gjenværende vulns er akseptert som dev-only (dokumentert i `docs/forbedringsforslag-2026.md`).

## 6. «The Next.js plugin was not detected in your ESLint configuration»

- **Årsak:** Next.js build sjekker om ESLint-config bruker deres presets. Vi bruker flat config (ESLint 9) med `@next/eslint-plugin-next` (nextPlugin.flatConfig.coreWebVitals) øverst i eslint.config.mjs. Next sin detector gjenkjenner ikke flat config – kjent issue: [vercel/next.js#73655](https://github.com/vercel/next.js/issues/73655).
- **Fiks:** Pluginen er registrert og reglene kjører (lint passerer med `--max-warnings 0`). Advarselen er kosmetisk. Å registrere pluginen to ganger gir ESLint-feil (Cannot redefine plugin).

## 6b. Node-versjon – optimalt for Vercel

- **Vercel støtter:** 20.x, 22.x, 24.x (default er 24.x). Kun **major.x** i `engines.node` anbefales; [docs](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- **Viktig:** `>=20.0.0` i package.json resulterer i at Vercel bygger med **latest 24.x** og viser advarsel om «automatic upgrade». Unngå derfor `>=20`.
- **Valg i dette prosjektet:** **`22.x`** – LTS, god balanse mellom stabilitet og ny runtime; ingen nedgradering. Alternativ: `24.x` for å matche Vercel default.
- **Konfigurasjon:** `package.json` har `"engines": { "node": "22.x" }`, og **`.nvmrc`** har `22` for lokalt/Vercel. Next.js 15 og React 19 støtter Node 22.

## 6c. npm deprecated (rimraf, plausible-tracker, @vercel/kv, glob, inflight, boolean)

- **Fiks gjort:**  
  - **plausible-tracker** er fjernet. Plausible lastes nå via offisielt script (`PlausibleScript.tsx`); custom events bruker `window.plausible()` (src/lib/analytics.ts).  
  - **rimraf:** `overrides` i package.json tvinger rimraf til ^4.0.0 for å fjerne deprecation.  
  - **.nvmrc** med `22` for konsistent Node-versjon (samsvar med engines.node 22.x).
- **Bevisst beholdt inntil videre:**  
  - **@vercel/kv** er deprecated til fordel for Upstash Redis. Brukes i health, rate-limit og cache. Migrering krever eget oppsett (Vercel Marketplace / Upstash).  
  - **glob**, **inflight**, **boolean** kommer som transitive avhengigheter; oppdatering kan gjøres gradvis ved oppgradering av avhengigheter.

## 7. Tester før produksjon

Kjør før deploy til prod for å fange feil:

1. **Alt-i-ett (anbefalt):** `npm run test:prod`  
   Kjører: lint → unit-tester → E2E smoke mot **https://www.klarpakke.no**. Krever at Playwright-nettlesere er installert: `npx playwright install chromium`.

2. **Kun E2E smoke mot prod:**  
   `TEST_AGAINST_PROD=1 BASE_URL=https://www.klarpakke.no npm run test:e2e:smoke`

3. **Lokal E2E (starter dev-server):**  
   `npm run test:e2e:smoke` (uten TEST_AGAINST_PROD) – da brukes `webServer` i playwright.config.ts og localhost:3000.

**Merk:** Critical E2E-tester inkluderer blant annet kursmodul (selector/innhold) og dashboard med auth; noen feiler uten gyldig testbruker eller ved endret innhold. Smoke (30 tester) dekker landing, priser, innlogging, health, i18n og er tilstrekkelig som pre-prod sjekk.

## 8. Bygg-tid og timeout (KLA-167)

**Mål:** Hold total build-tid under 300 sekunder i CI/CD (Vercel eller GitHub Actions).

### Hva som bør måles i Vercel

- **Vercel Dashboard → Project → Deployments → velg en deploy → Build Log**
  - **Installing dependencies** – varighet for `npm install` / `npm ci`
  - **Building** – varighet for `next build` (kompilering, lint under build, static generation)
- **Total build duration** står øverst eller i deployment summary. Bruk dette som hovedtall for å verifisere at vi holder oss under 300 s.

I GitHub Actions: se **Actions → workflow run → Build-jobben** for tidsfordeling (Lint, Type check, Build).

### Identifisert tidsbruk

- **next build:** Kompilering, webpack, ESLint (når ikke skippet), statisk generering. Største bidrag.
- **Type-check:** Kjører ikke under `next build` fordi `typescript.ignoreBuildErrors: true` (beholdt inntil type-gjeld er nedkjempet). I CI kjører vi `npm run type-check` separat.
- **Lint:** Under `next build` når `SKIP_LINT_IN_BUILD` ikke er satt. I CI som kjører lint før build unngår vi dobbel lint (se under).
- **E2E:** Kjører i egne jobs etter build; er ikke del av den kritiske build-paden på Vercel.

### Gjennomførte optimaliseringer

1. **Unngå dobbel lint i CI**  
   I `next.config.mjs` er `eslint.ignoreDuringBuilds` satt til `process.env.SKIP_LINT_IN_BUILD === "true"`.  
   I GitHub Actions (manual-deploy, pr-check, test) settes `SKIP_LINT_IN_BUILD=true` før `npm run build`. Lint kjører én gang (eksplisitt lint-steg); build skipper da ESLint og sparer tid. På **Vercel** settes ikke denne variabelen, så lint kjører som før under `next build`.

2. **Next.js / webpack cache**  
   - I `next.config.mjs`: `config.cache = { type: 'filesystem', compression: 'gzip' }` er satt. Vercel cacher automatisk `.next/cache` mellom deploys.  
   - I GitHub Actions er **actions/cache@v4** lagt inn for `.next/cache` med nøkkel basert på `package-lock.json` og kildefiler, slik at gjenbygg blir raskere.

3. **Type-check under build**  
   `typescript.ignoreBuildErrors` er fortsatt `true` (dokumentert i config). Ingen ekstra type-check under `next build`; type-check skjer kun der vi eksplisitt kjører `npm run type-check` (f.eks. i PR-check).

4. **Vercel build- og install-kommandoer**  
   `vercel.json`: `buildCommand: "next build"`, `installCommand: "npm install"`. Vi bruker ikke `npm run build` på Vercel (da ville prebuild/validate-i18n kjørt), så kun install + next build. Ingen endring i kommandoer; eksisterende oppsett er beholdt.

5. **Eksisterende fiks beholdt**  
   Edge runtime på opengraph-image og `transpilePackages: ["next-intl"]` er ikke endret (se §2 og §4).

### Ved vedvarende høy build-tid

- Sjekk Vercel Build Log for hvilken fase som tar lengst (install vs. build).
- Vurder færre statiske sider eller økt `staticPageGenerationTimeout` kun ved reell timeout.
- Vurder å flytte tunge avhengigheter til dynamisk import der det er trygt.

## Sjekkliste ved nye Vercel-advarsler

1. Er det en **ny** advarsel? Sjekk om den allerede er beskrevet her.
2. Kommer den fra **egen kode**? Fiks i koden og oppdater denne filen.
3. Kommer den fra **node_modules** (f.eks. next-intl, webpack)? Vurder oppgradering av pakken; hvis ikke mulig, dokumenter og evt. demp med `infrastructureLogging` eller tilsvarende.
4. Oppdater denne filen med kort beskrivelse og fiks slik at det ikke «skjer igjen».

## Vercel support og MCP/CLI

- **Support:** [How to get support from Vercel](https://vercel.com/kb/guide/how-to-get-vercel-support) (Community Forum, Billing, Security, osv.).
- **MCP + CLI:** Full oversikt over Vercel MCP (Cursor) og CLI (vercel-api.mjs): **docs/VERCEL-MCP-CLI.md**.
