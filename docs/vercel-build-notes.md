# Vercel build – warnings og fiks

Dette dokumentet beskriver kjente advarsler i Vercel-build og hva som er gjort for å unngå at de forstyrrer eller gjentar seg.

## 1. «vercel found in project dependencies and will be ignored»

- **Årsak:** Vercel injiserer egen CLI under build; hvis `vercel` ligger i `dependencies`, ignoreres den og en advarsel vises.
- **Fiks:** `vercel` er flyttet til **devDependencies** (brukes kun til `vercel:deploy`, `deploy:preview`, `deploy:prod`). Da forsvinner advarselen og pakken brukes ikke i produksjonsbundle.

## 2. next-intl / webpack cache (Parsing failed at 'import(t)')

- **Årsak:** `next-intl` sin `extractor/format/index.js` bruker dynamisk `import(t)`. Webpack kan ikke parse det statisk, så «Build dependencies behind this expression are ignored and might cause incorrect cache invalidation» vises.
- **Fiks:** I `next.config.mjs` er `transpilePackages: ["next-intl"]` satt. I tillegg settes **`config.infrastructureLogging = { level: "error" }`** i production build slik at disse webpack-advarselene ikke fyller build-loggen. Cache oppfører seg fortsatt korrekt; dette er kun loggstøy.

## 3. «Serializing big strings … consider using Buffer»

- **Årsak:** Webpack PackFileCacheStrategy serialiserer store strenger (f.eks. fra next-intl/oversettelser), noe som kan påvirke deserialiseringsytelse.
- **Fiks:** Vi bruker allerede `cache: { type: 'filesystem', compression: 'gzip' }`. Buffer-endring må skje i webpack/Next.js selv. Samme `infrastructureLogging`-nivå som over reduserer at disse advarselene vises i Vercel-loggen.

## 4. «Using edge runtime on a page currently disables static generation»

- **Årsak:** `src/app/opengraph-image.tsx` og `src/app/[locale]/opengraph-image.tsx` bruker `export const runtime = 'edge'` fordi Next.js `ImageResponse` (OG-bilder) krever edge.
- **Fiks:** Ingen endring – dette er forventet. Kommentar er lagt inn i begge filer: «Edge required for ImageResponse (OG image). Build warning "disables static generation" is expected.» Ikke fjern edge fra disse filene.

## 5. npm audit (38 vulnerabilities)

- **Årsak:** Mange sårbarheter sitter i **dev-only**-pakker: `vercel` (CLI), `@lhci/cli`, `lighthouse`, `inquirer`, `tmp`, osv. Noen krever `npm audit fix --force` (breaking).
- **Fiks:**  
  - `vercel` er kun i devDependencies og inngår ikke i produksjonsbundle.  
  - Kjør `npm audit fix` jevnlig for trygge oppdateringer.  
  - Unngå `npm audit fix --force` uten plan – det kan brekke build.  
  - Gjenværende vulns er akseptert som dev-only (dokumentert i `docs/forbedringsforslag-2026.md`).

## Sjekkliste ved nye Vercel-advarsler

1. Er det en **ny** advarsel? Sjekk om den allerede er beskrevet her.
2. Kommer den fra **egen kode**? Fiks i koden og oppdater denne filen.
3. Kommer den fra **node_modules** (f.eks. next-intl, webpack)? Vurder oppgradering av pakken; hvis ikke mulig, dokumenter og evt. demp med `infrastructureLogging` eller tilsvarende.
4. Oppdater denne filen med kort beskrivelse og fiks slik at det ikke «skjer igjen».
