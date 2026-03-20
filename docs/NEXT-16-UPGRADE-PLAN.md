# Plan: oppgradering til Next.js 16 (når moden)

**Status:** Klarpakke på **Next.js 15.x** — ikke hasteoppgrader. Bruk denne sjekklisten når teamet velger hopp til 16.

## Hvorfor vente / når gå

- Les [Next.js upgrade guide](https://nextjs.org/docs/app/guides/upgrading) og **release notes** for 16.x.
- Kjør oppgradering i **egen branch** med full `npm run lint`, `npm run type-check`, `npm run build`, Playwright smoke.

## Kritiske endringer (forventet fokus)

### 1. ESLint / linting

- **`next lint` fjernes** — kun **ESLint CLI** (`eslint .`). Repo er allerede nær dette mønsteret.
- Verifiser flat config mot **offisiell** `eslint-config-next`-integrasjon når dokumentasjonen for 16 er stabil.
- Fjern eller tilpass `eslint`-blokken i `next.config.mjs` hvis den deprecates (følg Next 16 docs).

### 2. Typed routes / navigasjon

- Gå gjennom **dynamiske ruter** (`[locale]`, `[id]`, osv.) og `Link`/`router.push`-strenger — Next har strammet **typed routes** i nyere versjoner.
- Kjør bygg og fiks alle nye type-feil fra genererte route-typer.

### 3. App Router-kontrakter

- Sjekk **async `params` / `searchParams`** (allerede mønster i Next 15) — eventuelle nye krav i 16.
- Gjennomgå **middleware** (edge) — importgrenser og bundle-størrelse.

### 4. Eksperimentelle flagg

- Gå gjennom `next.config.mjs` `experimental.*` — noen flyttes eller fjernes mellom major.

## Etter merge

- Verifiser **Vercel**-build, **Sentry**, **cron**-kall og **Supabase**-miljø uendret.
- Oppdater `engines` / dokumentasjon hvis Node-krav endres.

_Opprettet mars 2026 — levende dokument; oppdater når Next 16 GA og team tar beslutning._
