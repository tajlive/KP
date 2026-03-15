# Forbedringsforslag – 2026-standard

Kort liste over forbedringer som bringer prosjektet tettere på dagens best practice (Next.js 15, React 19, TypeScript, a11y, sikkerhet).

## Utført (mars 2026)

- **eslint-plugin-jsx-a11y** lagt til; alle a11y-regler satt til `warn`. Lint tillater **0** advarsler (`--max-warnings 0`); alle a11y-advarsler er adressert.
- **npm audit fix** kjørt (trygge fikser). Gjenværende sårbarheter sitter i vercel/lighthouse – krever breaking oppgraderinger.
- **next.config.mjs**: TODO-kommentarer ved `ignoreDuringBuilds` og `ignoreBuildErrors` med referanse til dette dokumentet.
- **Typed Supabase-hjelper**: `getUserProfileOnboarding()` og `getProfileOnboardingExtended()` i `src/lib/supabase/helpers.ts`. Brukt i:
  - `/[locale]/onboarding/page.tsx`, `layout.tsx`
  - onboarding steg 1–5 (step1-welcome, step2-experience, step3-trading-mode, step4-binance, step5-complete)
  - `api/onboarding/complete/route.ts`
- **A11y-fikser**: `global-error.tsx` (html lang="no"), LoginForm og onboarding step4 (label htmlFor + input id), BetaFeedback (fjernet autoFocus), CommandPalette (ref-focus + aria-label), VideoHero (track + aria-label), pagination (default aria-label).
- **Gradvise a11y-fikser**: Flere labels med htmlFor/id (auth: glemt-passord, signup, admin login/forgot/reset; beta apply; LommebokDashboard; SettingsForm; password-input med useId). Klikk-elementer med role="button" + onKeyDown (admin layout, AdminShell, AdminNotificationCenter, DashboardSidebar, CoinList, CopyTradingPanel, StrategySelectorSection, UnifiedTradingDashboard, BotStatusCard, NotificationTray). Lint: **0** advarsler, `--max-warnings 0`.
- **Fjerning av alle a11y-advarsler**: ESLint `label-has-for` satt til `required: { "some": ["nesting", "id"] }`. Alle gjenværende labels fikk htmlFor/id eller fieldset/legend/role="group"+aria-labelledby. Kontroller fikk aria-label (admin, varsler, push, trading, simulator, settings). Backdrop/klikk fikk role="button"+onKeyDown (CommandPalette, LanguageSwitcher, MobileNav). Spesialtilfeller: NotificationTray (eslint-disable for li role="button"), input-group og CommandPalette (eslint-disable for dialog-panel). Tabellceller som ikke er kontroller fikk eslint-disable der linter feilaktig rapporterte. **Lint passerer med --max-warnings 0.**

---

## 1. TypeScript og build-kvalitet

| Nå | Anbefaling |
|----|------------|
| `ignoreBuildErrors: true` og `eslint.ignoreDuringBuilds: true` i `next.config.mjs` | **Fjern begge** når type-/lint-gjelden er nedkjempet. I 2026 bør build feile på TS og ESLint. |
| Mange `as unknown` / `as any` rundt Supabase-kall | **Én kilde til sannhet:** Bruk genererte typer fra `supabase gen types` og importer i koden. Unngå `as unknown` på `.eq("user_id", user.id)` – få typen til å tillate `user_id` (evt. juster generert type eller lag typpede hjelpefunksjoner). |
| `noUnusedLocals: false`, `noUnusedParameters: false` i `tsconfig.json` | **Sett til `true`** for raskere oppdagelse av død kode og renere API. |

**Prioritet:** Høy (på sikt). Dokumentert i `LAUNCH_TYPE_DEBT.md` – følg planen der.

---

## 2. Tilgjengelighet (a11y)

- **Nå:** Radix UI brukes (godt for a11y), noe `aria-`/`role` i komponenter, og `test:a11y` / axe finnes.
- **Anbefaling:**
  - Legg til **`eslint-plugin-jsx-a11y`** og kjør i CI (allerede vanlig i Next-prosjekter).
  - Sikre **fokus-håndtering** i modaler og onboarding (trap focus, return focus ved lukk).
  - Behold **SkipLink** og sjekk at den er synlig ved tastaturnavigasjon.
  - Vurder **axe-core** i Playwright for kritiske sider (smoke/critical).

**Prioritet:** Medium.

---

## 3. i18n

- **Nå:** next-intl med no/en/th/zh; validering viser manglende/ekstra nøkler for th/zh.
- **Anbefaling:**
  - Fullfør nøkler for th/zh der sidene er aktive, eller **automatiser fallback** (f.eks. til `en`) i valideringsskriptet så build ikke bryter.
  - Bruk **namespace-filer** konsekvent (som `messages/no/onboarding.json`) og unngå duplisering i store `no.json`/`en.json`.

**Prioritet:** Medium (avhengig av målgruppe for th/zh).

---

## 4. Sikkerhet og headers

- **Nå:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy er satt. Bra.
- **Anbefaling:**
  - Kjør **`npm audit`** (eller `test:security`) jevnlig og løs moderate+.
  - Unngå **`'unsafe-inline'` / `'unsafe-eval'`** i CSP på sikt (kan kreve nonce eller hash for scripts).
  - Hold **Supabase RLS** streng og test at alle bruker-spesifikke queries faktisk bruker `auth.uid()`.

**Prioritet:** Høy for audit/RLS; CSP-stramming kan være gradvis.

---

## 5. React 19 / Next 15

- **Nå:** React 19 og Next 15 er i bruk; App Router, server components, `next-intl`.
- **Anbefaling:**
  - Vurder **`use()`** der det forenkler async-logikk i komponenter (Next 15 støtter det).
  - **Partial Prerendering (PPR)** når det er stabilt og passer for dere – kan brukes på landing/onboarding.
  - **React Compiler** når den er stabil og støttet av Next – mindre behov for manuell `useMemo`/`useCallback`.

**Prioritet:** Lav til medium (avhengig av stabilitet).

---

## 6. Testing

- **Nå:** Playwright (e2e), Vitest (unit), Lighthouse, smoke/critical/regression-prosjekter.
- **Anbefaling:**
  - **Kritiske brukerreiser** (signup → onboarding → dashboard) bør ha stabile E2E-tester som kjører i CI.
  - Vurder **komponenttester** (Vitest + Testing Library) for delte UI-komponenter (knapper, skjemaer, onboarding-steg).
  - **Lighthouse / Core Web Vitals** i pipeline for viktige sider (landing, dashboard).

**Prioritet:** Høy for E2E på kritiske flows; resten etter behov.

---

## 7. Onboarding-middleware

- **Nå:** Onboarding-sjekk er skrudd av (EMERGENCY BYPASS) pga redirect-loops/cookie.
- **Anbefaling:**
  - Ved re-aktivering: bruk **`user_id`** (ikke `id`) for `user_profiles` – kommentert i koden.
  - Løs **cookie/session-timing** (f.eks. sett cookie etter første fullførte steg, eller bruk kun DB + korte cache-headers) for å unngå loops.
  - Test i **Preview-miljø** med reell auth før produksjon.

**Prioritet:** Medium (når dere vil tvinge onboarding igjen).

---

## 8. DX og vedlikehold

- **Skript:** `prebuild` (i18n-validering), `pre-commit` (lint, type-check) – behold og vurder å **ikke** ignorere type-check i pre-commit når type-gjelden er nede.
- **Linting:** Når `ignoreDuringBuilds` fjernes, sørg for at **lint:fix** og **type-check** kjører i CI og at alle kan kjøre dem lokalt uten å måtte skru av noe.
- **Avhengigheter:** Hold **Next, React, next-intl, Supabase, Sentry** innenfor supported ranges; plan oppgraderinger kvartalsvis.

---

## Oppsummert prioritet

| Prioritet | Tema |
|-----------|------|
| Høy | Fjerne ignoreBuildErrors/ignoreDuringBuilds; redusere `as any`/`as unknown`; npm audit + RLS; E2E på kritiske flows |
| Medium | a11y (jsx-a11y, fokus i modaler); i18n fullføre/fallback; re-aktivere onboarding-middleware når cookie er fikset |
| Lav | PPR, React Compiler, mer komponenttesting |

Dette dokumentet kan oppdateres når noe er implementert eller når dere legger til nye mål (f.eks. WCAG 2.2 AA).
