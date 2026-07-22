# UX/IA-opprydding etter konkurrent-benchmark — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development ved utførelse: én fersk subagent per task, med spec-compliance review og code-quality review før neste task.

**Goal:** Gjør klarpakke.no mindre rotete og mer logisk — med mobil som primær flate (ca. 80% av trafikken) — ved å kopiere det konkurrentene gjør bra: tydelig gjeste-reise, tydelig innlogget app-reise, og progressive disclosure fra enkel handel til avanserte verktøy.

**Architecture:** Mobile-first benchmark → IA-audit → mål-IA → navigasjons- og rute-konsolidering → copy/terminologi-rydding → verifisering i test, mobil viewport, browser og produksjon.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, Sanity navigation fallback, Vitest, Wrangler/OpenNext deploy.

---

## Hva konkurrentene gjør (kort benchmark)

| Konkurrent | Mønster vi bør kopiere | Hva det betyr for Klarpakke |
|---|---|---|
| **Coinbase** | Skiller enkel “buy/sell” fra **Advanced Trade**. Læring ligger i egen **Learn**-flate og dukker opp som kontekst, ikke som hovednavigasjon overalt. | Ikke bland manuell handel, auto-trading, JokerTrade og kurs i samme primærnavigasjon. Ha én enkel standardflate og én avansert flate. |
| **Binance / Binance.US** | Produktmeny skiller **Buy & Sell**, **Convert** (enkel bytte) og **Spot Trading** (avansert). Academy er separat læringsunivers. | Klarpakke bør ha én “Handel” for enkel/paper/default, mens avanserte valg legges under samme flate eller “Mer”, ikke som likeverdige toppvalg. |
| **eToro** | **Demo account** speiler reell konto. CopyTrader-flyten er veldig lineær: finn trader → se portefølje/performance → copy → velg beløp. | Lekepenger må føles som samme produkt som live, bare tydelig merket. JokerTrade/copy bør ha én tydelig lineær flyt, ikke flere innganger med ulik logikk. |
| **Firi** | Norsk tillit + veldig enkel kjøp/selg i NOK, mobilførst. | Førsteinntrykk og primær CTA må være norsk, enkel og trygg: “Start med lekepenger” / “Kjøp for 100 kr”, ikke mange produktbegreper samtidig. |

**Konkurrent-prinsipper å gjøre til Krav:**
1. **Én primær handling per visning.** Ikke flere like sterke CTA-er som konkurrerer.
2. **Progressive disclosure.** Enkle valg først; avanserte valg bak “Avansert”, “Mer” eller inne i flyten.
3. **Separer læring fra handel**, men tilby kontekstuell hjelp inne i handel.
4. **Samme begrep overalt.** Bruk “Lekepenger” og “Live” konsekvent. Unngå “paper”, “bot”, “autopilot”, “auto-trade” som synonymrot i UI.
5. **Innlogget app skal være porteføljeførst.** Hjem/Dashboard skal svare: “Hvor mye har jeg, hvordan går det, hva bør jeg gjøre nå?”
6. **Mobil = maks 4 hovedfaner.** Alt annet ligger under “Mer”.
7. **Mobil er 80% og designes først.** Én hånd/t tommel-sone, min 48px touch targets, sticky bunnnav med safe-area, ingen horisontal scroll, og én tydelig CTA innenfor første viewport.

---

## Nåværende rot funnet i repo

**Filer som viser problemet:**
- `src/lib/navigation/config.ts`
  - `FALLBACK_NAVIGATION.loggedOutLinks` viser `Lær`, `Trade`, `Bots`, `JokerTrade`, `Priser` til gjester. Det er for mye produkt før login.
  - `AUTH_NAV_CONFIG` har både `portfolio`, `market`, `trade`, `jokerTrade`, `account`, `home`, `autoTrade`, `history`, `courses` — for mange likeverdige valg.
  - `DASHBOARD_COINBASE_TOP_NAV` bruker `/dashboard/autopilot`, mens andre deler av config bruker `/dashboard/auto-trade`.
  - `DASHBOARD_COINBASE_BOTTOM_NAV` bruker også `/dashboard/auto-trade`, ikke samme som top nav.
- `src/shared/navigation/TopNav.tsx`
  - Toppnav for innlogget viser `Hjem`, `Handel`, `Portefølje`, `Auto-trading` + “Hovedmeny”. Det er bedre enn gjeste-nav, men route-pekere må være konsistente.
- `src/shared/layout/MarketingNavigation.tsx` + `src/features/marketing/components/NavAuthState.tsx`
  - Gjeste-nav er avhengig av fallback/Sanity og kan derfor vise app-funksjoner (`Trade`, `Bots`, `JokerTrade`) før brukeren er innlogget.
- Eksisterende tester låser rotet:
  - `src/lib/navigation/__tests__/config.test.ts` forventer JokerTrade i `loggedOutLinks` og som siste element i `loggedInLinks`.

**Route-rot som bør kanoniseres:**
- Manuell handel: `/trade` skal være canonical. `/handel` skal kun redirecte til `/trade`.
- Auto-trading: `/dashboard/auto-trade` skal være canonical. `/dashboard/autopilot` og `/bots` skal redirecte dit.
- Dashboard trade: `/dashboard/trade` bør redirecte til `/trade` for å unngå to “handel”-flater.
- JokerTrade: `/jokertrade` kan beholdes som produktflate/app, men skal ikke være primær gjeste-nav.

---

## Mål-IA (foreslått)

### Gjest / utlogget
Primærnavigasjon:
1. `Lær` → `/kurs`
2. `Priser` → `/priser`
3. `Om oss` → `/om-oss`
4. `Logg inn` → `/login`
5. CTA: `Start gratis` → `/register`

Ikke i gjeste-topnav: `Trade`, `Bots`, `JokerTrade`. De kan ligge som seksjoner på landingssiden med CTA til registrering.

### Innlogget desktop toppnav
1. `Hjem` → `/dashboard`
2. `Portefølje` → `/dashboard/portfolio`
3. `Handel` → `/trade`
4. `Auto` → `/dashboard/auto-trade`
5. `Mer` → dropdown: `Historikk`, `Resultater`, `Analyse`, `Marked`, `Lær`, `JokerTrade`, `Anbefal`, `Innstillinger`

### Mobil bunnnav (primær flate — ca. 80%)
1. `Hjem` → `/dashboard`
2. `Portefølje` → `/dashboard/portfolio`
3. `Handel` → `/trade`
4. `Konto` → `/profile`

Mobilkrav:
- `src/shared/navigation/BottomTabs.tsx` må bygges kun fra `MOBILE_BOTTOM_TABS` og støtte `home` som TabId.
- Touch targets: min 48×48px, tydelig aktiv tilstand, haptic feedback beholdes.
- Bunnnav skal være sticky med `safe-area-inset-bottom`, skjules ved tastatur, og aldri dekke primær CTA.
- Første viewport på `/dashboard`, `/trade` og `/jokertrade` skal ha én dominerende CTA innen tommelrekkevidde.
- Ingen horisontal scroll på 360–430px viewport.

---

## Step-by-step plan

### Task 1: Lag konkurrent-/IA-notat som låser prinsippene

**Objective:** Dokumentere konkurrentmønstre og gjøre dem om til 8 konkrete UX-krav før kode endres.

**Files:**
- Create: `docs/ux/2026-07-22-competitor-ia.md`
- Modify: none

**Step 1: Skriv benchmark-notat**

Innhold skal inneholde tabellen over + disse kravene:
1. Gjeste-nav har maks 4 informasjonsvalg + login + CTA.
2. Innlogget primærnav har maks 5 valg.
3. Mobil har nøyaktig 4 bunnfaner.
4. “Lekepenger” er standard og trygg start; “Live” er eksplisitt modusbytte.
5. Manuell handel har én canonical route: `/trade`.
6. Auto-trading har én canonical route: `/dashboard/auto-trade`.
7. JokerTrade er produkt/AI-flate, ikke generell hovednavigasjon for gjester.
8. Avanserte analyser/historikk/resultater ligger under `Mer`, ikke i primærnav.

**Step 2: Verifiser notat**

Run: `test -f docs/ux/2026-07-22-competitor-ia.md && grep -q "Progressive disclosure" docs/ux/2026-07-22-competitor-ia.md`
Expected: exit 0

**Step 3: Commit (valgfritt, kun hvis Tom ber om commit)**

```bash
git add docs/ux/2026-07-22-competitor-ia.md
git commit -m "docs: competitor IA benchmark and UX principles"
```

---

### Task 2: Skriv failende navigasjons-tester for ny IA

**Objective:** Låse opp ryddig navigasjon med tester før config endres.

**Files:**
- Modify: `src/lib/navigation/__tests__/config.test.ts`
- Test: `src/lib/navigation/__tests__/config.test.ts`

**Step 1: Erstatt/utvid testene slik at de forventer ny IA**

```ts
describe("FALLBACK_NAVIGATION", () => {
  it("loggedOutLinks skal være enkel: Lær, Priser, Om oss", () => {
    const paths = FALLBACK_NAVIGATION.loggedOutLinks.map((l) => l.path);
    expect(paths).toEqual(["/kurs", "/priser", "/om-oss"]);
  });

  it("loggedInLinks skal være kort og porteføljeførst", () => {
    const paths = FALLBACK_NAVIGATION.loggedInLinks.map((l) => l.path);
    expect(paths).toEqual([
      "/dashboard",
      "/dashboard/portfolio",
      "/trade",
      "/dashboard/auto-trade",
      "/profile",
    ]);
  });
});

describe("AUTH_NAV_CONFIG", () => {
  it("skal ikke ha dupliserte canonical hrefs", () => {
    const hrefs = AUTH_NAV_CONFIG.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("skal bruke /dashboard/auto-trade som eneste auto-route", () => {
    const autoHrefs = AUTH_NAV_CONFIG.filter((l) =>
      /auto|autopilot|bot/i.test(l.key + l.href),
    ).map((l) => l.href);
    expect(autoHrefs).toEqual(["/dashboard/auto-trade"]);
  });
});
```

**Step 2: Kjør test og se den feile**

Run: `npx vitest run src/lib/navigation/__tests__/config.test.ts`
Expected: FAIL på `loggedOutLinks`, `loggedInLinks`, og auto-route.

**Step 3: Commit (valgfritt)**

```bash
git add src/lib/navigation/__tests__/config.test.ts
git commit -m "test: lock simplified navigation IA"
```

---

### Task 3: Konsolider navigasjonsconfig til én canonical struktur

**Objective:** Gjøre `src/lib/navigation/config.ts` til single source of truth for ryddig IA.

**Files:**
- Modify: `src/lib/navigation/config.ts`

**Step 1: Oppdater gjeste- og auth-nav**

Endre `FALLBACK_NAVIGATION` til:

```ts
export const FALLBACK_NAVIGATION: NavigationData = {
  loggedOutLinks: [
    { label: "Lær", path: "/kurs", order: 0 },
    { label: "Priser", path: "/priser", order: 1 },
    { label: "Om oss", path: "/om-oss", order: 2 },
  ],
  loggedInLinks: [
    { label: "Hjem", path: "/dashboard", order: 0 },
    { label: "Portefølje", path: "/dashboard/portfolio", order: 1 },
    { label: "Handel", path: "/trade", order: 2 },
    { label: "Auto", path: "/dashboard/auto-trade", order: 3 },
    { label: "Konto", path: "/profile", order: 4 },
  ],
};
```

Endre `AUTH_NAV_CONFIG` slik at primær rekkefølge er:
`/dashboard/portfolio`, `/trade`, `/dashboard/auto-trade`, `/profile`, og sekundære lenker (`/dashboard`, `/dashboard/historikk`, `/dashboard/resultater`, `/kurs`, `/marked`, `/jokertrade`) kun brukes der de faktisk trengs.

**Step 2: Rett auto-route i dashboard-nav**

```ts
export const DASHBOARD_COINBASE_TOP_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/dashboard/portfolio", labelKey: "portfolio" },
  { href: "/trade", labelKey: "trade" },
  { href: "/dashboard/auto-trade", labelKey: "autoTrade" },
];

export const DASHBOARD_COINBASE_BOTTOM_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard", labelKey: "home", exact: true },
  { href: "/dashboard/portfolio", labelKey: "portfolio" },
  { href: "/trade", labelKey: "trade" },
  { href: "/profile", labelKey: "profile" },
];

export const DASHBOARD_MORE_NAV: readonly CoinbaseNavItem[] = [
  { href: "/dashboard/historikk", labelKey: "history" },
  { href: "/dashboard/resultater", labelKey: "results" },
  { href: "/dashboard/analysis", labelKey: "analysis" },
  { href: "/marked", labelKey: "market" },
  { href: "/kurs", labelKey: "learn" },
  { href: "/jokertrade", labelKey: "jokerTrade" },
  { href: "/dashboard/referral", labelKey: "referral" },
  { href: "/dashboard/settings", labelKey: "settings" },
];
```

Merk: `labelKey`-typen må utvides med `analysis` og `market` dersom den ikke allerede har dem.

**Step 3: Kjør navigasjonstester**

Run: `npx vitest run src/lib/navigation/__tests__/config.test.ts`
Expected: PASS

**Step 4: Commit (valgfritt)**

```bash
git add src/lib/navigation/config.ts src/lib/navigation/__tests__/config.test.ts
git commit -m "refactor: simplify navigation information architecture"
```

---

### Task 4: Kanoniser routes med redirects

**Objective:** Fjerne parallelle begreper (`handel`, `trade`, `bots`, `autopilot`) fra brukerens mentale modell.

**Files:**
- Modify: `src/middleware/i18n.ts`
- Test: `src/middleware/i18n.test.ts`

**Step 1: Legg til failende tester**

```ts
it("redirects /dashboard/autopilot to canonical /dashboard/auto-trade", async () => {
  const req = new NextRequest(new URL("http://localhost/no/dashboard/autopilot"));
  const res = await i18nMiddleware(req);
  expect(res.status).toBe(308);
  expect(res.headers.get("location")).toBe("http://localhost/no/dashboard/auto-trade");
});

it("redirects /bots to canonical /dashboard/auto-trade", async () => {
  const req = new NextRequest(new URL("http://localhost/no/bots"));
  const res = await i18nMiddleware(req);
  expect(res.status).toBe(308);
  expect(res.headers.get("location")).toBe("http://localhost/no/dashboard/auto-trade");
});

it("redirects /dashboard/trade to canonical /trade", async () => {
  const req = new NextRequest(new URL("http://localhost/no/dashboard/trade"));
  const res = await i18nMiddleware(req);
  expect(res.status).toBe(308);
  expect(res.headers.get("location")).toBe("http://localhost/no/trade");
});
```

**Step 2: Kjør og se dem feile**

Run: `npx vitest run src/middleware/i18n.test.ts`
Expected: FAIL på de tre nye redirect-testene.

**Step 3: Implementer redirects i i18n middleware**

Legg canonical redirect-regler før auth/app-shell håndtering:
- `/dashboard/autopilot` → `/dashboard/auto-trade`
- `/bots` → `/dashboard/auto-trade`
- `/dashboard/trade` → `/trade`
- Behold eksisterende `/handel` → `/trade` hvis den finnes; hvis ikke, legg den til også.

**Step 4: Kjør tester**

Run: `npx vitest run src/middleware/i18n.test.ts src/i18n/__tests__/href-consistency.test.ts`
Expected: PASS

**Step 5: Commit (valgfritt)**

```bash
git add src/middleware/i18n.ts src/middleware/i18n.test.ts
git commit -m "refactor: canonicalize trading and auto-trade routes"
```

---

### Task 5: Rydd gjeste-header slik at den ikke selger app-funksjoner før login

**Objective:** Gjøre utlogget navigasjon like enkel som Coinbase/Firi: lær, priser, om oss, logg inn, start gratis.

**Files:**
- Modify: `src/shared/layout/MarketingNavigation.tsx`
- Modify: `src/features/marketing/components/NavAuthState.tsx`
- Test: `src/features/marketing/components/__tests__/NavAuthState.test.tsx`

**Step 1: Oppdater NavAuthState-test til ny gjeste-nav**

Forvent at gjest ser `Lær`, `Priser`, `Om oss`, `Logg inn`, `Start gratis`, og IKKE `Trade`, `Bots`, `JokerTrade` i primær header.

**Step 2: Kjør test og se den feile**

Run: `npx vitest run src/features/marketing/components/__tests__/NavAuthState.test.tsx`
Expected: FAIL fordi fallback/Sanity fortsatt kan vise gamle lenker.

**Step 3: Implementer filtrering**

I `NavAuthState.tsx`: når bruker er gjest, render kun `loggedOutLinks` fra `navData` (som nå er ryddet), pluss `Logg inn` og `Start gratis`. Ikke render app-lenker fra andre kilder.

**Step 4: Kjør test**

Run: `npx vitest run src/features/marketing/components/__tests__/NavAuthState.test.tsx`
Expected: PASS

**Step 5: Commit (valgfritt)**

```bash
git add src/shared/layout/MarketingNavigation.tsx src/features/marketing/components/NavAuthState.tsx src/features/marketing/components/__tests__/NavAuthState.test.tsx
git commit -m "refactor: simplify guest navigation"
```

---

### Task 6: Mobil bunnnav og touch-UX først (80% av trafikken)

**Objective:** Gjøre mobil til den primære, ryddige flaten med nøyaktig fire faner og én tydelig tommel-CTA.

**Files:**
- Modify: `src/lib/navigation/config.ts`
- Modify: `src/shared/navigation/BottomTabs.tsx`
- Test: `src/lib/navigation/__tests__/config.test.ts`

**Step 1: Lås mobil-IA i test**

```ts
describe("MOBILE_BOTTOM_TABS", () => {
  it("skal ha home, portfolio, trade og account — i den rekkefølgen", () => {
    const keys = MOBILE_BOTTOM_TABS.map((l) => l.key);
    expect(keys).toEqual(["home", "portfolio", "trade", "account"]);
  });
});
```

**Step 2: Kjør og se den feile**

Run: `npx vitest run src/lib/navigation/__tests__/config.test.ts`
Expected: FAIL fordi dagens tabs er `portfolio`, `market`, `trade`, `account`.

**Step 3: Oppdater config og BottomTabs**

I `src/lib/navigation/config.ts`: sett `MOBILE_BOTTOM_TABS` til `home`, `portfolio`, `trade`, `account`.

I `src/shared/navigation/BottomTabs.tsx`:
- Utvid `TabId` til `"home" | "portfolio" | "trade" | "account"`.
- Legg `Home` inn i `ICON_MAP`.
- Behold keyboard-hide og haptics.
- Sikre at hvert tab-target har minst `min-h-[48px] min-w-[48px]`, og at container bruker `pb-[env(safe-area-inset-bottom)]`.

**Step 4: Mobil browser-verifisering**

Run: `npm run dev`
Browser med mobil viewport 390×844:
- `/no/dashboard`: bunnnav viser `Hjem`, `Portefølje`, `Handel`, `Konto`.
- Ingen horisontal scroll.
- Primær CTA er synlig uten scroll og ikke dekket av bunnnav.
- Aktiv fane er tydelig ved navigasjon.

**Step 5: Commit (valgfritt)**

```bash
git add src/lib/navigation/config.ts src/shared/navigation/BottomTabs.tsx src/lib/navigation/__tests__/config.test.ts
git commit -m "ux: mobile-first bottom navigation"
```

---

### Task 7: Reduser CTA-konkurranse på dashboard

**Objective:** Dashboard skal svare på tre spørsmål først: saldo, utvikling, neste handling. Ikke vis mange konkurrerende produktvalg øverst.

**Files:**
- Modify: `src/features/dashboard/DashboardContent.tsx`
- Modify: `src/features/dashboard/AdaptiveDashboard.tsx`
- Modify: `src/features/dashboard/DashboardPro.tsx`
- Test: browser-verifisering + eksisterende unit-tester

**Step 1: Definer hierarki**

- Toppbar: modus (`Lekepenger`/`Live`), saldo, endring %, én CTA (`Start handel` for nye / `Se portefølje` for aktive).
- Under toppbar: maks én sekundær modus-toggle (`Lekepenger` ↔ `Live`).
- `TradingModeSelector` (Manuell/Auto/JokerTrade) skal ikke vises for `NyBruker`. Den vises først når bruker har ≥1 trade eller aktiv session.
- For `PowerUser`: behold avanserte kort, men CTA-er under folden skal være sekundære.

**Step 2: Implementer betinget rendering**

I `AdaptiveDashboard.tsx`/`DashboardPro.tsx`: render `TradingModeSelector` kun når `userState !== "NyBruker"`.

**Step 3: Verifiser lokalt**

Run: `npm run dev`
Browser: logg inn som `tomarnejensen@gmail.com` / `TestTest123!`
Expected: Dashboard viser `God dag, Tom Arne`, saldo, én hoved-CTA, og ikke et grid av tre like store valg øverst.

**Step 4: Commit (valgfritt)**

```bash
git add src/features/dashboard/DashboardContent.tsx src/features/dashboard/AdaptiveDashboard.tsx src/features/dashboard/DashboardPro.tsx
git commit -m "ux: reduce CTA competition on dashboard"
```

---

### Task 8: Terminologi-rydding: “Lekepenger” overalt, “Live” bevisst

**Objective:** Fjerne begrepsrot (`paper`, `autopilot`, `bot`, `demo`) i brukerflate.

**Files:**
- Modify: `messages/no.json`
- Modify: `messages/en.json`
- Modify: UI-komponenter som viser modus/route-navn (funnet via søk etter `paper`, `autopilot`, `bot`)

**Step 1: Finn rotete begreper**

Run: `npm run i18n:usage`
Run: søk etter `autopilot|paper|demo|bot` i `src/features`, `src/app`, `messages/no.json`.

**Step 2: Normaliser norske begreper**

Regel:
- UI: `Lekepenger` (ikke `Papir`, ikke `Demo` på norsk)
- UI: `Live` / `Live-handel`
- Route labels: `Auto` (ikke `Autopilot`, ikke `Bots` i primærnav)
- Produktnavn: `JokerTrade` beholdes som eget navn, men forklares som “AI som trader for deg”.

**Step 3: Kjør i18n-validering**

Run: `npm run i18n:validate && npm run i18n:usage`
Expected: PASS

**Step 4: Commit (valgfritt)**

```bash
git add messages/no.json messages/en.json src
git commit -m "copy: consistent paper/live and auto-trading terminology"
```

---

### Task 9: Full verifisering og deploy-sjekk

**Objective:** Bevise at ny IA er enklere uten å brekke auth, i18n eller produksjon.

**Files:**
- Modify: none (kun verifisering)

**Step 1: Kjør statisk verifisering**

```bash
npm run lint
npm run i18n:validate
npm run i18n:usage
CI=1 npm run test:unit
npm run build
```

Expected:
- lint: 0 errors
- i18n: pass
- unit: 176+ passed
- build: pass

**Step 2: Browser-verifisering**

Mobil først (390×844 og 360×800):
- Åpne `/no` utlogget.
- Expected header: enkel meny + `Start gratis`; ingen `Trade`, `Bots`, `JokerTrade` som primær gjeste-nav.
- Logg inn som `tomarnejensen@gmail.com` / `TestTest123!`.
- Expected bunnnav: `Hjem`, `Portefølje`, `Handel`, `Konto`.
- Expected: `/no/dashboard/autopilot` → `/no/dashboard/auto-trade`, `/no/bots` → `/no/dashboard/auto-trade`, `/no/dashboard/trade` → `/no/trade`.
- Expected: ingen horisontal scroll, 48px+ touch targets, primær CTA synlig i første viewport.

Desktop:
- Expected toppnav innlogget: `Hjem`, `Portefølje`, `Handel`, `Auto`, `Mer`.

**Step 3: Produksjonsverifisering etter deploy**

```bash
bash scripts/deploy.sh
npm run check
```

Expected: `npm run check` bestått. Hvis `scripts/deploy.sh` sin siste grep-sjekk feiler rett etter purge men `npm run check` er grønn, dokumenter som falsk negativ og vurder egen task for å gjøre deploy-scriptet mer robust.

**Step 4: Commit (valgfritt)**

```bash
git add .
git commit -m "ux: simplify site navigation and trading IA"
```

---

## Files likely to change

- `docs/ux/2026-07-22-competitor-ia.md`
- `src/lib/navigation/config.ts`
- `src/lib/navigation/__tests__/config.test.ts`
- `src/middleware/i18n.ts`
- `src/middleware/i18n.test.ts`
- `src/shared/layout/MarketingNavigation.tsx`
- `src/features/marketing/components/NavAuthState.tsx`
- `src/features/marketing/components/__tests__/NavAuthState.test.tsx`
- `src/shared/navigation/TopNav.tsx`
- `src/shared/navigation/BottomTabs.tsx`
- `src/features/dashboard/AdaptiveDashboard.tsx`
- `src/features/dashboard/DashboardPro.tsx`
- `src/features/dashboard/DashboardContent.tsx`
- `messages/no.json`
- `messages/en.json`

## Tests / validation

Minimum grønt før deploy:
- `npx vitest run src/lib/navigation/__tests__/config.test.ts`
- `npx vitest run src/middleware/i18n.test.ts src/i18n/__tests__/href-consistency.test.ts`
- `npx vitest run src/features/marketing/components/__tests__/NavAuthState.test.tsx`
- `npm run lint`
- `npm run i18n:validate && npm run i18n:usage`
- `CI=1 npm run test:unit`
- `npm run build`
- Browser QA utlogget + innlogget Tom
- `npm run check` etter deploy

## Risks, tradeoffs, and open questions

- **Sanity navigation:** Hvis Sanity har egne `loggedOutLinks`/`loggedInLinks`, kan den overstyre fallback. Task 5 må derfor enten filtrere i `NavAuthState` eller oppdatere Sanity-dokumentet. Åpent spørsmål: skal Sanity være master for markedsnav, eller skal config være master og Sanity kun redigere labels?
- **SEO/landing:** Å fjerne `Trade`, `Bots`, `JokerTrade` fra gjeste-topnav kan redusere direkte synlighet for produktsider. Løsning: behold dem som landingsside-seksjoner med CTA til `/register`, ikke som primærnav.
- **Eksisterende tester:** Flere tester forventer dagens rotete nav (spesielt JokerTrade i `loggedOutLinks`). De må oppdateres bevisst, ikke bare gjøres grønne.
- **Route-endringer:** Ikke slett gamle routes. Bruk 308 redirects slik at bokmerker og delte lenker ikke brekker.
- **Deploy:** Ikke bruk `npm run deploy` før `predeploy` type-check er grønn. Bruk `bash scripts/deploy.sh` for faktisk 2-stegs deploy, men dokumenter forskjellen.
