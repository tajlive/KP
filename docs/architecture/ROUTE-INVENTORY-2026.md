# Ruteinventar og kanoniske URL-er (2026)

**Formål:** Én oversikt over **kanonisk URL**, **alias/redirect** og **navigasjonskilde** for gjest vs innlogget bruker — reduserer dupliserte opplevelser og kognitiv belastning for målgruppen ([`docs/TARGET-AUDIENCE.md`](../TARGET-AUDIENCE.md)).

**Vedlikehold:** Oppdater ved nye toppnivå-ruter eller endrede redirects.

---

## Navigasjon — kilder i kode

| Kontekst                  | Fil                                                                                                                                                                                                                      | Innhold                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gjest (landing)**       | [`src/components/landing/MobileMenu.tsx`](../../src/components/landing/MobileMenu.tsx)                                                                                                                                   | `signup`, `priser`, `innlogging`                                                                                                                                                      |
| **Innlogget (dashboard)** | [`src/lib/navigation/dashboard-links.ts`](../../src/lib/navigation/dashboard-links.ts) + [`TopNav.tsx`](../../src/components/navigation/TopNav.tsx) + [`BottomTabs.tsx`](../../src/components/navigation/BottomTabs.tsx) | `dashboard`, `dashboard/trade`, `dashboard/ai`, `dashboard/portfolio`, `dashboard/earn`, `dashboard/asset/[symbol]`, `dashboard/auto-trade`, `handelshistorikk`, `dashboard/settings` |
| **Middleware**            | [`src/middleware.ts`](../../src/middleware.ts)                                                                                                                                                                           | `PROTECTED_PATHS`, beta→dashboard, tier-gate                                                                                                                                          |
| **Globale lenker**        | Diverse landing-komponenter                                                                                                                                                                                              | CTA til `signup` / `innlogging`                                                                                                                                                       |

**Mål (roadmap):** Vurder én `nav-config` (f.eks. `src/lib/navigation/config.ts`) med roller `guest` | `auth` | `admin` — unngå divergens mellom `MobileMenu` og fremtidig innlogget mobil-header.

---

## Alias → kanonisk (server redirect)

| Alias / gammel sti                  | Kanonisk                                                                              | Merknad                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/{locale}/login`                   | `/{locale}/innlogging`                                                                | [`login/page.tsx`](../../src/app/[locale]/login/page.tsx)                                                         |
| `/{locale}/registrer`               | `/{locale}/signup`                                                                    | [`registrer/page.tsx`](../../src/app/[locale]/registrer/page.tsx)                                                 |
| `/{locale}/reset-password`          | `/{locale}/glemt-passord`                                                             | [`reset-password/page.tsx`](../../src/app/[locale]/reset-password/page.tsx)                                       |
| `/{locale}/dashboard/innstillinger` | `/{locale}/dashboard/settings`                                                        | Norsk URL → engelsk sti (Binance/API)                                                                             |
| `/{locale}/varsler/innstillinger`   | `/{locale}/varsler`                                                                   |                                                                                                                   |
| `/{locale}/auto-trading`            | `/{locale}/dashboard/auto-trade`                                                      |                                                                                                                   |
| `/{locale}/auto-trading-ai`         | `/{locale}/dashboard/auto-trade`                                                      |                                                                                                                   |
| `/{locale}/dashboard/trading`       | `/{locale}/paper-trading`                                                             |                                                                                                                   |
| `/{locale}/live-trading`            | `/{locale}/paper-trading?mode=live`                                                   |                                                                                                                   |
| `/{locale}/checkout` (direkte)      | `/{locale}/priser`                                                                    | Uten spesialhåndtering                                                                                            |
| `/{locale}/beta/*`                  | `/{locale}/dashboard` eller spesifikt (se [`middleware.ts`](../../src/middleware.ts)) | Beta fjernet                                                                                                      |
| `/{locale}/admin` (root)            | `/{locale}/admin/analytics`                                                           |                                                                                                                   |
| `/{locale}/trade` (og `/trade/*`)   | `/{locale}/paper-trading`                                                             | **308** i [`middleware.ts`](../../src/middleware.ts) `CANONICAL_REDIRECTS` — ingen `trade/page.tsx` i App Router. |

---

## Klynger — kanonisk inndeling og beslutning

### Handel

| Kanonisk                               | Formål                                                                                        | Beslutning                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/{locale}/paper-trading`              | Paper/live-hub (`?mode=live`), sesjonsliste, innebygd markedsdesk (`UnifiedTradingDashboard`) | **Kanonisk** manuell + oversikt; hovedinngang fra nav («Paper trading» / sidebar).                                                          |
| `/{locale}/paper-trading/[session_id]` | Én økt: status, handler, kontroller                                                           | **Kanonisk** sesjondetalj.                                                                                                                  |
| `/{locale}/dashboard/auto-trade`       | Oppstart av ny papir-bot (`BotWizard`)                                                        | **Kanonisk** «start bot».                                                                                                                   |
| `/{locale}/dashboard/bot/[session_id]` | Bot-detalj etter oppstart                                                                     | **Kanonisk**; sidebar markerer «Start bot» aktiv under denne stien også.                                                                    |
| `/{locale}/trade`                      | —                                                                                             | **Ikke rute** — redirect til `paper-trading`. Tidligere `TradingInterface` er fjernet; utførelse skjer via API + hub/dashboard-komponenter. |

_Middleware:_ `live-trading` → `paper-trading?mode=live`; `/trade` → `paper-trading` (allerede).

### Læring

| Kanonisk                            | Formål      | Beslutning                                                       |
| ----------------------------------- | ----------- | ---------------------------------------------------------------- |
| `/{locale}/kurs`                    | Kursmoduler | **Behold** — primær «Lær»-lenke i sidebar.                       |
| `/{locale}/akademi`                 | Akademi-hub | **Behold** — beskyttet; kan lenke til `kurs` der det gir mening. |
| `/{locale}/akademi/dashboard-guide` | Veiledning  | **Behold** som undersider under akademi.                         |

Unngå to parallelle «forsider» uten tydelig CTA-forskjell; lenkestruktur: sidebar «Lær» → `kurs` som default dykk.

### Konto og profil

| Sti                 | Formål                          | Beslutning                                                                                               |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/{locale}/profile` | Brukerprofil (sidebar «Profil») | **Kanonisk** for profil-UI.                                                                              |
| `/{locale}/konto`   | Konto/lommebok-relatert         | **Behold** hvis annet innhold enn `profile`; ellers vurder tydelig navnebruk i UI («Konto» vs «Profil»). |

### Innstillinger og varsler

| Sti                               | Formål                                 | Beslutning                                                    |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| `/{locale}/innstillinger`         | E-post/varsler-preferanser (beskyttet) | **Behold** — ikke synonym med Binance-settings.               |
| `/{locale}/dashboard/settings`    | API-nøkler / Binance (beskyttet)       | **Kanonisk** for børs-tilkobling; norsk alias redirecter hit. |
| `/{locale}/varsler`               | Varsler-feed                           | **Behold**.                                                   |
| `/{locale}/varsler/innstillinger` | —                                      | **Redirect** til `varsler` (allerede).                        |

**UX-prinsipp for småsparere:** Skill tydelig «**Varsler og e-post**» (`/innstillinger` + `/varsler`) fra «**Børs / API**» (`/dashboard/settings`).

---

## Auth (etter mars 2026)

Innloggede brukere på `innlogging`, `signup`, `glemt-passord`, `login`, `registrer` **omdirigeres** av [`middleware.ts`](../../src/middleware.ts) (med `sanitizePostAuthRedirect`).

---

## Referanser

- [`docs/ANALYSE-RUTER-DESIGN-SIGNALER-2026.md`](../ANALYSE-RUTER-DESIGN-SIGNALER-2026.md) — design-signaler (hvis vedlikeholdt).
- [`.agent/agents/klarpakke-experience-architect.md`](../../.agent/agents/klarpakke-experience-architect.md)

_Oppdatert: mars 2026._
