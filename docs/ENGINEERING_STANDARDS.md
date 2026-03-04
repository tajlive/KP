# Klarpakke Engineering Standards

Dette dokumentet definerer de tekniske standardene vi følger for å sikre en robust, skalerbar og AI-vennlig plattform.

## 1. Clean Code & TypeScript

- **Strikt Typing**: Bruk alltid TypeScript-grensesnitt for API-responser og komponentprops. Unngå `any`.
- **Modulære Komponenter**: Komponenter over 200 linjer skal refaktureres til underkomponenter (ref: `OnboardingFlow.tsx` refaktorering).
- **Zod Validering**: Bruk Zod for all input-validering (API og Forms).

## 2. i18n & Lokalisering

- Ingen hardkodede tekststrenger i komponenter.
- All tekst skal ligge i `messages/*.json`.
- Bruk `next-intl` for oversettelser.

## 3. Ytelse & Optimalisering

- **Dynamic Imports**: Bruk `next/dynamic` for tunge biblioteker og UI-komponenter som ikke trengs ved første "paint".
- **Realtime Data**: Bruk `useRealtimePrices` hooken med 10s intervall for å balansere brukeropplevelse og API-kostnad.
- **Images**: Bruk alltid `next/image` med riktig `priority` for Hero-elementer.

## 4. AI-Native Development

- **Semantiske Logger**: Inkluder nok kontekst i logger slik at AI-agenter kan feilsøke autonomt.
- **Metadata**: Legg til metadata i viktige datastrukturer (f.eks. `ai_explanation` i trades) for å støtte AI-coachen.

## 5. Security (RLS)

- **Row Level Security (RLS)**: Skal være aktivert på alle tabeller i Supabase.
- **Service Role**: Skal kun brukes i Edge Functions, aldri i klient-kode.
