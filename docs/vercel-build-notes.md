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

- **Årsak:** Next.js build sjekker om ESLint-config bruker deres presets. Vi bruker flat config med `@next/eslint-plugin-next` direkte (anbefalt ved egen react/jsx-a11y/react-hooks). Next sin detector finner ikke pluginen i vår oppsett.
- **Fiks:** Ingen endring – reglene kjører (lint passerer). Advarselen er kosmetisk. Ved å bytte til `eslint-config-next/core-web-vitals` i stedet for plugin direkte ville vi fått konflikter med våre eksisterende react/jsx-a11y/react-hooks-regler.

## 7. Tester før produksjon

Kjør før deploy til prod for å fange feil:

1. **Alt-i-ett (anbefalt):** `npm run test:prod`  
   Kjører: lint → unit-tester → E2E smoke mot **https://www.klarpakke.no**. Krever at Playwright-nettlesere er installert: `npx playwright install chromium`.

2. **Kun E2E smoke mot prod:**  
   `TEST_AGAINST_PROD=1 BASE_URL=https://www.klarpakke.no npm run test:e2e:smoke`

3. **Lokal E2E (starter dev-server):**  
   `npm run test:e2e:smoke` (uten TEST_AGAINST_PROD) – da brukes `webServer` i playwright.config.ts og localhost:3000.

**Merk:** Critical E2E-tester inkluderer blant annet kursmodul (selector/innhold) og dashboard med auth; noen feiler uten gyldig testbruker eller ved endret innhold. Smoke (30 tester) dekker landing, priser, innlogging, health, i18n og er tilstrekkelig som pre-prod sjekk.

## Sjekkliste ved nye Vercel-advarsler

1. Er det en **ny** advarsel? Sjekk om den allerede er beskrevet her.
2. Kommer den fra **egen kode**? Fiks i koden og oppdater denne filen.
3. Kommer den fra **node_modules** (f.eks. next-intl, webpack)? Vurder oppgradering av pakken; hvis ikke mulig, dokumenter og evt. demp med `infrastructureLogging` eller tilsvarende.
4. Oppdater denne filen med kort beskrivelse og fiks slik at det ikke «skjer igjen».
