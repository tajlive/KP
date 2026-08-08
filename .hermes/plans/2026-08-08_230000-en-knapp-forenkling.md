# «Én knapp»-forenkling — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Ei dame på 65 skal kunne registrere seg med Google og trykke på ÉN knapp for å prøve autohandel — alt annet skal være vekk eller usynlig til hun ber om det.

**Architecture:** Fjern friksjon i tre lag: (1) landing → Google → (2) direkte til «Start autopilot»-knapp (ingen mellomsteg) → (3) autopilot kjører. Underliggende: fiks de tre dokumenterte rotbruddene (guest-header for innloggede, mode-kaskaden «Ingen data», dobbelt/trippel navigasjon) slik at appen aldri lyver om hvem du er eller hvor du er.

**Tech Stack:** Next.js 16 (App Router, Cloudflare Workers), Supabase Auth (Google OAuth allerede koblet: `signInWithGoogle` i `src/lib/auth/googleAuth.ts`), next-intl, `POST /api/ai/autopilot/activate` (One-Click allerede eksisterende).

---

## 65-år-testen (målbildet)

| Steg | I dag | Etter planen |
|---|---|---|
| 1 | Land på forsiden | Land på forsiden — **én** stor knapp: «Prøv gratis med Google» |
| 2 | Velg registreringsflyt, e-post/passord eller Google | Google-popup → ferdig |
| 3 | Onboarding step 0–3 (4 steg) | **Ingen onboarding.** Direkte til /handel med én knapp: «Start autopilot» |
| 4 | Forstå «Auto» vs «Pilot» vs «grid» vs «multi_signal» | Trykk «Start autopilot» — ferdig. Boten kjører med trygge defaults |
| 5 | Se «Ingen data» / guest-header / 3 nav-lag | Ser: «Boten din kjører. Du har 100 000 kr lekepenger.» |

**Friksjonsfunn fra koden (verifisert):**
- `SpeedOnboarding.tsx` har 4 steg (0–3) og ender på `window.location.href = /trade?tab=auto` — men `/handel` sin `CockpitTab`-union godtar **ikke** `tab=auto` (stille fallback til overview — se skill §56). Dame på 65 lander på feil fane.
- `/trade?tab=auto` er brukt i 5+ e-post-CTA-er + onboarding — **alle** dead-ender i overview-fanen.
- Autopilot-aktivering finnes (`POST /api/ai/autopilot/activate`, one-click), men det finnes ingen «Start autopilot»-knapp i den vanlige brukerflyten — kun i admin/dedikerte flater.
- Google-login fungerer (`RegisterClient.tsx:185`), men er ett av flere valg — ikke den åpenbare veien.

---

## Rotbrudd som MÅ fikses (usynlige, men de får appen til å lyve)

Dokumentert med DB-bevis denne økten:

1. **Guest-header for innlogget bruker.** `TopNav.tsx:83-115` leser `useAuth().user` — i prod er den ofte `null` (HttpOnly-cookie-sesjon, klient-AuthContext henger etter) → rendrer «Logg inn / Start gratis» til **innlogget** bruker. Bevis: `/api/auth/me` returnerer Tom mens headeren viser guest-state.
2. **Mode-kaskaden → «Ingen data».** `(user)/dashboard/layout.tsx` hardkoder `initialTradingMode="paper"`; profil sier `live` → `hasSwitched=true` → server-metrics kastes → `accountBalance=null` → «Ingen data» selv med 199 646 kr i DB (verifisert mot `/api/dashboard/metrics?mode=paper`).
3. **Tre navigasjonslag.** `/handel`: TopNav (AppShell) + CockpitHeader + BottomTabs. `/dashboard`: TopNav + DashboardTopBar. Samme lenker gjentas 2–3 ganger per skjermbilde.

---

## Task 1: Fiks «Ingen data» — dashboard-layout leser brukerens modus

**Objective:** Fjern hardkodet `initialTradingMode="paper"` slik at dashboardet aldri kaster server-metrics.

**Files:**
- Modify: `src/app/[locale]/(user)/dashboard/layout.tsx` (fjern `initialTradingMode="paper"` — la `DashboardClientLayout`-defaulten gjelde, eller bedre: gjør TradingModeContext til å hente modus fra `/api/trading/mode` ved mount)
- Modify: `src/context/TradingModeContext.tsx` — legg til synk fra server ved første mount
- Test: `src/features/dashboard/__tests__/DashboardContent.test.tsx` (eller ny)

**Step 1: Skriv feilende test**
```tsx
it("viser balanse, ikke 'Ingen data', når profil-modus er live men layout-default er paper", () => {
  // serverMetrics med accountBalance=199646 skal IKKE kastes selv om context-mode avviker
});
```

**Step 2:** Kjør test, forvent FAIL.

**Step 3: Implementasjon** — TradingModeContext henter `/api/trading/mode` (GET) én gang ved mount og overstyrer `initialMode` når svaret kommer; `hasSwitched` i DashboardContent skal kun være true ved **aktiv bruker-toggle** (sett et flagg i `setMode`), ikke ved initial synk.

**Step 4:** Test PASS + `npx tsc --noEmit` = 0.

**Step 5: Commit** `fix(dashboard): modus synkes fra profil — 'Ingen data' borte for live-brukere`.

**Verifisering i prod (etter deploy):** logg inn som Tom (preferred=live) → `/dashboard` viser balanse, ikke «Ingen data».

---

## Task 2: Fiks guest-header — TopNav skal aldri lyve om innlogging

**Objective:** TopNav viser aldri «Logg inn/Start gratis» til en bruker som serveren mener er innlogget.

**Files:**
- Modify: `src/shared/navigation/TopNav.tsx:83-115`

**Step 1:** Test: TopNav med `user=null` men gyldig `/api/auth/me`-svar skal rendre app-header (eller i det minste **aldri** guest-CTA-er inne i `(user)`-gruppen).

**Step 2:** FAIL.

**Step 3: Implementasjon** — `(user)`-gruppen er allerede beskyttet av `requireAuth` server-side; en bruker som ser disse sidene ER innlogget per definisjon. Fjern guest-grenen i TopNav når den rendres under `(user)/layout` (prop `forceAuthenticated` fra AppShell, eller les `/api/auth/me` én gang). Guest-headeren skal kun brukes på ubeskyttede flater (leaderboard er separat).

**Step 4:** PASS + tsc 0.

**Step 5: Commit** `fix(nav): TopNav viser aldri guest-CTA inne i appen`.

**Prod-verifisering:** innlogget → sticky header viser Kontomeny, aldri «Logg inn».

---

## Task 3: «Start autopilot» — den ene knappen etter registrering

**Objective:** Ny bruker lander etter Google-registrering direkte på en skjerm med én primærknapp som aktiverer autopilot (lekepenger) med trygge defaults.

**Files:**
- Modify: `src/app/[locale]/(auth)/register/RegisterClient.tsx` — etter `signInWithGoogle`: redirect til `/${locale}/handel?velkommen=1` (OAuth callback-håndtering: sjekk `src/lib/auth/googleAuth.ts` sin redirectTo)
- Modify: `src/features/onboarding/SpeedOnboarding.tsx` — kort flyt: hopp over step 0–2 for Google-brukere; step 3 CTA peker til `/handel?velkommen=1` (ikke `/trade?tab=auto` — død lenke)
- Modify: `src/features/autopilot/AutopilotDashboard.tsx` — legg til «Start autopilot»-knapp når `!state?.activated` (POST `/api/ai/autopilot/activate` med defaults `{risk_appetite:"moderate", total_capital_nok:100000, max_pairs:3}`) — i dag vises kun en tom-tilstand uten handling
- i18n: `messages/{no,en,zh}.json` — nøkler for knappetekst + velkomstbanner («Boten din er klar — trykk Start»)

**Step 1–2:** Test: AutopilotDashboard viser aktiveringsknapp i tom-tilstand; klikk → POST → activated=true.

**Step 3:** Implementer (alle tre punkter over).

**Step 4:** PASS + tsc 0 + eslint 0.

**Step 5: Commit** `feat(onboarding): én knapp — Google → Start autopilot`.

**Prod-verifisering:** ny testbruker via Google → lander på /handel → ser «Start autopilot» → klikk → `autopilot_state.activated=true` i DB.

---

## Task 4: Fiks døde `?tab=auto`-lenker

**Objective:** Alle 5+ e-post-CTA-er og onboarding-lenker som peker på `/trade?tab=auto` skal faktisk lande på auto/autopilot-flaten.

**Files:**
- Modify: `src/features/trading-cockpit/hooks/useCockpitUrlSync.ts` (linje ~28-31) — utvid `CockpitTab`-union med `auto` (scroll til AutopilotDashboard-seksjonen på /handel)
- Alternativ (YAGNI-vurdering): endre CTA-ene til `/handel#autopilot` + `id="autopilot"` på seksjonen. **Velg denne hvis CockpitTab-utvidelsen drar med seg for mye.**

**Step 1–5:** TDD per skill; Commit `fix(handel): ?tab=auto deep-link fungerer`.

---

## Task 5: Navigasjonsforenkling — én topp-nav per skjerm

**Objective:** Maks én sticky topp-navigasjon synlig om gangen.

**Files:**
- Modify: `src/features/trading-cockpit/components/TradingCockpit.tsx` — CockpitHeader slås sammen med TopNav-innhold eller skjules på mobil (duplikat: modus, saldo, nav)
- Modify: `src/app/[locale]/(user)/layout.tsx` / `src/shared/navigation/AppShell.tsx` — AppShell får prop for å skjule TopNav på sider med egen header (eller motsatt: CockpitHeader absorberer TopNav)

**Risiko:** Dette er den største strukturelle endringen. **Gjør den sist**, etter at Task 1–4 er i prod. §35-regelen (aldri fjern synlig UI uten eksplisitt OK) gjelder her — på /handel forsvinner visuelt én header. Krev Tom-OK med konkret beskrivelse FØR deploy av denne tasken.

**Step 5: Commit** `refactor(nav): én topp-nav per skjermbilde`.

---

## Ikke-mål (YAGNI)

- Ingen redesign av farger/komponenter (Del C 2026-design er separat prosjekt).
- Ingen fjerning av /velg-strategi eller avanserte faner — de skal bare ikke stå i veien for 65-åringen. Avanserte brukere finner dem frem.
- Ingen endring av pris-siden/tiers (5 tiers beholdes per Tom-beslutning).
- Google OAuth-er den **primære** veien; e-post/passord beholdes som sekundær lenke («eller bruk e-post»).

## Åpne spørsmål til Tom (blokkerer ingenting unntatt Task 5)

1. Skal «Start autopilot»-knappen også vises for **eksisterende** brukere uten aktiv bot på /handel? (Anbefaling: ja — samme tom-tilstand-knapp.)
2. Task 5 fjerner én synlig header fra /handel — OK med konkret visuell endring? (Påkrevd per §35.)

## Verifiseringsplan (per deploy)

1. `npx tsc --noEmit` = 0
2. `npx vitest run <berørte>` grønn
3. CI: test-gate → deploy → e2e-smoke-prod alle success (`gh run view --json jobs`)
4. **Browser-verifisering i prod (innlogget som Tom):** 65-år-flyten steg for steg med screenshots før «ferdig» erklæres.
