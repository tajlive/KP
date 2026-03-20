# Kodebase-analyse — forbedringspotensial og feil (mars 2026)

**Kontekst:** Automatisert gjennomgang (lint, type-check, middleware, onboarding-flyt, kanoniske auth-URL-er).

## Kritiske funn (rettet i samme runde)

### 1. Onboarding-middleware blokkerte hele veiviseren

**Problem:** `handleOnboarding` i `src/middleware/onboarding.ts` redirectet **alle** innloggede brukere fra `/onboarding/*` til dashboard, uten å sjekke `onboardingCompleted`.

**Konsekvens:** Brukere som ikke hadde fullført onboarding kunne ikke nå steg-sidene (middleware kjørte før layout).

**Løsning:** Redirect til dashboard **kun når** `onboardingCompleted === true`.

### 2. Onboarding brukte `/login` i stedet for `/innlogging`

**Problem:** `onboarding/layout.tsx`, `onboarding/page.tsx` og feil-fallback lenket til `/{locale}/login` (ekstra hopp).

**Løsning:** Byttet til `innlogging` med korrekt `next`-query (`encodeURIComponent`).

---

## Øvrig forbedringspotensial (ikke alle implementert)

| Område     | Anbefaling                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| **IA**     | To handelsinnganger: `paper-trading` vs `trade` — vurder én primær i nav; se `docs/architecture/ROUTE-INVENTORY-2026.md`. |
| **Nav**    | Sentral `nav-config` for gjest vs innlogget (unngå divergens `MobileMenu` / sidebar).                                     |
| **E2E**    | CI med `E2E_USER_*` + Supabase for å unngå skip i kritiske auth-/mobil-tester.                                            |
| **Type**   | `ignoreBuildErrors` i `next.config.mjs` — følg `docs/TYPE-DEBT-ROADMAP-2026.md`.                                          |
| **E-post** | Enkelte maler bruker fortsatt emoji — se `docs/design-assessment-2026.md`.                                                |

## Verifikasjon

- `npm run lint` — OK
- `npm run type-check` — OK (mars 2026)

---

_Oppdatert: mars 2026. Linear: se issue opprettet i samme økt._
