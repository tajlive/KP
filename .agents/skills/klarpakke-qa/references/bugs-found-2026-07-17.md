# Bugs Funnet — 17. juli 2026

**Testbruker:** Åsmund (`test+tricky+123@klarpakke.no`, display: `Åsmund "Trader" Ødegård 🔥`)
**Tom:** `tomarnejensen@gmail.com` / `TestTest123!`
**Miljø:** www.klarpakke.no (produksjon)
**Scope:** Dashboard, Trading Cockpit, Login, Profil, Portefølje

---

## 🟠 1. Sessions-fane navigerer tilbake til Oversikt ✅ FIKSET

**Root cause:** `useCockpitUrlSync.ts` whitelist manglet `sessions` — kun `trades` og `analysis` var gyldige. Sessions falt til default `overview`.

**Fiks:** `grep -n "value === \"trades\"" src/features/trading-cockpit/hooks/useCockpitUrlSync.ts` → legg til `|| value === \"sessions\"`

**Commit:** `60d3e490b`

---

## 🟠 2. «Se historikk» kaster brukeren ut av innlogget sone ✅ FIKSET

**Root cause:** Navigasjonslenke gikk til `/handelshistorikk` (finnes ikke) i stedet for `/dashboard/historikk`.

**Fiks:** `SessionList.tsx` og `QuickActions.tsx` — bytt `/handelshistorikk` → `/dashboard/historikk`

**Commit:** `453d938b5`

---

## 🟡 3. INVALID_MESSAGE JS-error på dashboard ✅ FIKSET

**Root cause:** ICU `select`-format i `welcomeTitle` (`Velkommen{userName, select, '' {} other {, {userName}}}`) brekker når brukernavn inneholder apostrof (D'Souza).

**Fiks:** Forenkle meldingen til `Velkommen, {userName}` og håndter tomt navn i komponenten med `.replace(", ", "")`.

**Commit:** `92f218bf5`

---

## 🟡 4. Live-modus switch permanent disabled uten CTA ✅ FIKSET

**Root cause:** `CockpitHeader.tsx` viste låst tooltip men ingen lenke til oppgradering.

**Fiks:** Erstatt `cockpit.mode.lockedInline` tekst med `Link href=/{locale}/priser` → "Oppgrader →"

**Commit:** `453d938b5`

---

## 🟢 5. Ingen kjøp/salg-knapper i Oversikt-fanen ✅ FIKSET

**Root cause:** `showOnboarding={true}` hardkodet i `TradingCockpit.tsx` — skjuler trading-UI for alle.

**Fiks:** `showOnboarding={!metrics || metrics.totalTrades === 0}` — kun onboarding for nye brukere uten trades.

**Commit:** `453d938b5`

---

## 🔴 6. Login ignorerer ?next= parameter ✅ FIKSET

**Root cause:** `LoginClient.tsx` redirect alltid til `/${locale}/dashboard` etter innlogging.

**Fiks:** Les `searchParams.get("next")` og redirect til den hvis den finnes.

**Commit:** `60d3e490b`

---

## 🟠 7. Profil/Portefølje redirecter til dashboard (pre-existing)

**Root cause:** Middleware `handleOnboarding` redirecter uferdige brukere til dashboard. Profil-siden bør være tilgjengelig uansett onboarding-status.

**Status:** Ikke fikset — onboarding-gate er by-design, men profil bør unntas.

---

## 🔴 8. i18n split-filer funker ikke i Cloudflare Worker ✅ FIKSET

**Root cause:** `profile.json` (split namespace) ble ikke inkludert i Worker-bundlen.

**Fiks:** Legg `profile`-meldinger direkte i konsolidert `no.json` og `en.json`.

**Commit:** `ea26e27ea`

---

---

## 🟠 9. Logout-knapp ikke synlig i UI (samme sesjon)

**Testdato:** 17. juli 2026 (samme sesjon)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn som `tomarnejensen@gmail.com`
2. Let etter "Logg ut" / "Logout" / "Sign out" i:
   - Navigasjonsbaren
   - Hovedmeny-dropdown (ref=e77 — viser kun "Verv en venn" og "JokerTrade")
   - Innstillinger (`/no/dashboard/settings` — hovedinnholdet lastet ikke DOM synlig)
   - Profil-lenke (`/no/profile`)
   - Footer
3. Kjør `Array.from(document.querySelectorAll('a, button')).filter(el => /logg.?ut|log.?out|logg.?av|sign.?out|sign.?off/i.test(el.textContent))` → tomt array

**Forventet:** En tydelig "Logg ut"-knapp i navigasjonsbaren, profil-dropdown, eller innstillinger.

**Faktisk:** Ingen logout-knapp funnet i DOM-en. Brukeren har ingen åpenbar måte å logge ut/bytte konto uten å slette nettleserdata.

**Alvorlighet:** 🟠 Høy — hindrer konto-bytte og er et sikkerhets- og UX-problem.

**Rapportert av:** Hermes Agent auth-flow test (denne sesjonen)

---

## 🟢 10. /no/settings redirecter uventet (samme sesjon)

**Testdato:** 17. juli 2026
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn
2. Naviger til `/no/settings`
3. Observer redirect

**Forventet:** Innstillingssiden vises (hvis innlogget) eller redirect til login.

**Faktisk:** `/no/settings` redirecter til `/no/login?next=%2Fno%2Fprofile` (via profil-ruten). Riktig URL er `/no/dashboard/settings`. Dette er en mindre navigasjonsinkonsistens — settings har en egen rute under `/no/dashboard/settings` som ikke har noen alias.

**Alvorlighet:** 🟢 Lav — kan forvirre brukere som gjetter URL. Alle interne lenker i UI-et peker riktig til `/no/dashboard/settings`.

---

## 🔴 11. /no/dashboard/portfolio viser blank side (ny — 17. juli, session 2)

**Testdato:** 17. juli 2026 (session 2)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn som `tomarnejensen@gmail.com`
2. Naviger til `/no/dashboard/portfolio`
3. Observer at kun navigasjonsbaren renderes

**Forventet:** Portefølje-oversikt med eiendeler, balanse, graf, posisjoner.

**Faktisk:** Siden viser KUN navigasjonsbar (Hjem, Handel (øving), Portefølje, Auto-handel, Hovedmeny, Innstillinger, Profil). Alt main-innhold mangler. `document.querySelector('#__next')` = null. `document.querySelector('#__NEXT_DATA')` = null. `document.body.children.length` = 0 (bare Next.js RSC-scripts, ingen DOM-noder). 0 JS errors i console — komponenten feiler stille før hydration.

**Diagnose:** Server-rendrer navigasjonen (layout.tsx), men portefølje-komponenten (client-side) krasjer uten feilmelding. Next.js RSC-stream stopper opp uten å logge. Sannsynligvis en uhandtert exception i portefølje-komponenten som Next.js dev-mode ville fanget men prod-mode svelger.

**Alvorlighet:** 🔴 Kritisk — portefølje-siden er 100% ubrukelig.

---

## 🟡 12. Win rate inkonsistent: 0.73% vs 73% (ny — 17. juli, session 2)

**Testdato:** 17. juli 2026 (session 2)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn og naviger til `/no/dashboard`
2. Sammenlign topp-widget (greeting-seksjonen) med stats-kortene lenger ned
3. Topp-widget: `WIN RATE 0.73%` (fra greeting-komponenten)
4. Stats-kort: `Vinnrate 73%` (fra dashboardPro.stats.winRate-komponenten)
5. `[...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim().match(/^\d+[.,]\d+%\s*$/)).map(el => el.textContent.trim())` → `["0.73%", "0.1%"]`

**Forventet:** Samme win rate-verdi uansett hvor den vises.

**Faktisk:** Topp-widget dividerer feil (faktor 100). Enten mangler stats-kortet en `* 100` på visningen, eller topp-widget-en dividerer med 100 for mye.

**Alvorlighet:** 🟡 Medium — forvirrende for bruker, svekker tilliten til plattformdata.

**Rapportert av:** Hermes Agent dashboard QA (denne sesjonen)

---

## 🟢 13. Engelske labels i norsk UI: "WIN RATE" og "P&L" (ny — 17. juli, session 2)

**Testdato:** 17. juli 2026 (session 2)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn og naviger til `/no/dashboard`
2. Se på greeting-widget (god kveld / god dag)
3. Observer label-tekster

**Forventet:** Norske labels: "Vinnrate" og "P/L" (konsistent med resten av siden som bruker "Vinnrate").

**Faktisk:** Greeting-widget-en viser "P&L" og "WIN RATE" på engelsk, mens stats-kortene rett under bruker "Vinnrate". Inkonsistent språk i samme viewport.

**Alvorlighet:** 🟢 Lav — kosmetisk, men svekker profesjonelt inntrykk.

---

## 🟢 14. "Start auto-handel" gir ingen feedback ved klikk (ny — 17. juli, session 2)

**Testdato:** 17. juli 2026 (session 2)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn og naviger til `/no/dashboard/autopilot`
2. Klikk "Start auto-handel" (ref=e7)
3. Observer om noe skjer

**Forventet:** Loading-spinner, API-kall, error toast, eller redirect — en eller annen indikasjon på at klikket ble registrert.

**Faktisk:** Ingenting skjer. Ingen loading state, ingen console.error, ingen toast, ingen redirect. `browser_console()` returnerer tomt etter klikk. Event handler krasjer eller er ikke bundet.

**Alvorlighet:** 🟢 Lav — knappen er synlig og risikonivå-velgeren fungerer, men CTA-en er død.

---

## 🟢 15. Duplisert tekst på autopilot-siden (ny — 17. juli, session 2)

**Testdato:** 17. juli 2026 (session 2)
**Testbruker:** `tomarnejensen@gmail.com`
**Miljø:** www.klarpakke.no (produksjon)

**Steg for å reprodusere:**
1. Logg inn og naviger til `/no/dashboard/autopilot`
2. Scroll og les alt som står

**Forventet:** Hver setning vises én gang.

**Faktisk:** "La AI handle for deg — fullstendig automatisk" vises 3 ganger: rett under headingen, etter Start auto-handel-knappen, og i en ekstra paragraf.

**Alvorlighet:** 🟢 Lav — kosmetisk.

---

## Oppsummering — lærdommer

1. **URL sync hooks** må whiteliste ALLE gyldige verdier — én manglende → silent reset til default
2. **ICU `select`-format** brekker med apostrof i brukerdata → bruk enkel `{variable}` interpolering
3. **Split i18n-filer** upålitelig i Workers → legg nøkler i konsolidert JSON
4. **Aldri hardkod** betingelser som `showOnboarding={true}` → datadrevet
5. **Alle interne lenker** må peke til eksisterende ruter — test ALLE knapper
6. **Login redirect** må alltid respektere `?next=` parameter (✅ VERIFISERT FUNGERER — se bug #6)
7. **Logout-knapp** må være synlig og tilgjengelig — sjekk ALLE navigasjonsområder ved auth-flow testing
8. **Sett deg et iterasjonsbudsjett** — auth-flow testing (login → test → logout) bruker raskt 15-20 tool-kall, og max tool limit kan være en begrensning
9. **Sjekk for blanke sider** — RSC-komponenter kan feile stille uten JS errors. Sjekk at `document.querySelector('#__next')?.children?.length > 0` og `document.body.children.length > 5` på innloggede sider.
10. **Sammenlign samme metrikk på tvers av widgets** — faktor-100-feil (0.73% vs 73%) oppdages kun ved å se på to steder som viser samme tall.
11. **Sjekk språk-konsistens** — engelske labels i ellers norsk UI er en klassisk copy-paste-feil som svekker profesjonelt inntrykk.
12. **Test CTA-knapper for feedback** — klikk ALLE CTA-knapper og sjekk om noe skjer (loading, error, redirect). Stille klikk betyr død handler.
