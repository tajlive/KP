# CDS + Tailwind sameksistens (Klarpakke)

Dette dokumentet beskriver hvordan Coinbase Design System (CDS) brukes sammen med eksisterende Tailwind-baserte komponenter.

## Prinsipp

- CDS brukes til layout/typografi/knapper/kort i nye Coinbase-inspirerte dashboard-sider.
- Tailwind beholdes for eksisterende komponenter og granular spacing/utilities.
- `tokens.ts` er fortsatt source of truth for Klarpakke-branding.

## Teknisk oppsett

- `CdsProvider` laster:
  - `@coinbase/cds-web/globalStyles`
  - `@coinbase/cds-web/defaultFontStyles`
  - `ThemeProvider` + `MediaQueryProvider`
- Provideren ligger i root locale-layout, slik at både marketing og dashboard har tilgang til CDS.

## Samspill-regler

- Foretrekk CDS-komponenter for nye skjermflater (`Card`, `Button`, `Text`, `HStack`, `VStack`).
- Bruk Tailwind-klasser for:
  - responsive wrappers (`max-w-*`, `mx-auto`, `px-*`)
  - side-spesifikk spacing
  - rask migrering av legacy-komponenter
- Unngå hardkodede hex-farger i nye filer; bruk `tokens.ts` eller CDS-variabler.

## Risikoer

- CDS forventer `framer-motion@^10`, mens appen bruker v12.
- Dette håndteres midlertidig med `--legacy-peer-deps` og eksplisitt verifisering i lint/type-check/runtime-test.
