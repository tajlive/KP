---
name: klarpakke-frontend-pitfalls
description: 'Use when fixing React/UI bugs: stale state, blocked clicks, i18n key
  mismatches, USDT double-conversion, mobile layout, rename workflows.'
version: 1.3.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags:
    - klarpakke
    - frontend
    - react
whenToUse: 'Når bruker ber om React/UI-bugfix: stale state, blocked clicks, hydration.'
---

# Klarpakke Frontend Pitfalls

## 📚 Referanser (les når du trenger det)

| Fil | Les når... |
|---|---|
| `references/react-patterns.md` | Du feilsøker React state/props |
| `references/i18n-pitfalls.md` | Du jobber med oversettelser |
| `references/currency-conversion.md` | Du håndterer USDT/NOK |
| `references/state-management.md` | Du feilsøker state-problemer |
| `references/ui-components.md` | Du bygger/endrer UI-komponenter |
| `references/mobile-first.md` | Du optimaliserer for mobil |
| `references/workflows.md` | Du renamer/deployer |

---

## 1. React: setState + les state i samme tick = stale verdi

**Fiks:** Lokal variabel i stedet for state:

```tsx
// FEIL:
setStartingValue(reell);
buildPortfolioData(data, startingValue);

// RIKTIG:
const start = reell;
setStartingValue(start);
buildPortfolioData(data, start);
```

---

## 2. Framer Motion m.div blokkerer klikk

**Fiks:** `<Link>` direkte, fjern `m.div`:

```tsx
// FØR:
<m.div><a href="/leaderboard">CTA</a></m.div>

// EITER:
<Link href="/leaderboard" prefetch={false} className="block ...">CTA</Link>
```

---

## 3. i18n namespace mismatch

**Symptom:** Rå nøkkelnavn i UI.

**Fiks:** `useTranslations("dashboard.portfolio")` — sjekk mot `messages/no.json`.

---

## 3b. i18n-nøkkelnavn mismatch — komponent bruker feil nøkkelnavn (2026-08-03)

**Symptom:** Dashboard viser rå nøkkelnavn som `dashboard.adaptive.pilotTradeTitle` i stedet for norsk tekst.

**Rotårsak:** Komponenten bruker `t("pilotTradeTitle")` men i18n-filen har `pilotTitle` (eller omvendt). `i18n:validate` sjekker KUN at nøkler finnes — ikke at komponenten bruker riktig navn.

**Eksempel (2026-08-03):**
```json
// messages/no.json hadde:
"pilotTitle": "🎭 Pilot — AI-en trader for deg"

// Men AdaptiveDashboard.tsx brukte:
t("pilotTradeTitle")  // ← feil navn, finnes ikke
```

**Fiks:** Grep komponenten etter `t("...")` og verifiser at nøkkelen finnes EKSAKT i i18n-filen. Ved mismatch: legg til manglende nøkkel (behold begge hvis andre komponenter bruker den gamle).

**Prevensjon:** Ved ny i18n-nøkkel: sjekk at komponenten faktisk bruker den. `i18n:validate` fanger ikke dette — kun visuell inspeksjon eller E2E-test.

---

## 4. USDT→NOK dobbelkonvertering

**Symptom:** Posisjoner ~9,8× for høye.

**Rotårsak:** `coin_prices.price` er NOK. binance-24hr fallback `source=db-cache` returnerer NOK uten flagg.

**Fiks:** `useRealtimePrices` propagerer `source`. Skip USDT→NOK ved db-cache:

```tsx
const usdtPrice = source === "db-cache" ? c.price / usdtNok : c.price;
```

---

## 6. Feilmeldinger: "Nettverksfeil" er meningsløst

**Symptom:** Bruker ser "Nettverksfeil" uten å vite hva som skjedde eller hva de skal gjøre.

**Fiks:** Alle catch-blokker MÅ ha pedagogiske norske feilmeldinger:

```tsx
// FEIL:
catch { setError("Nettverksfeil"); }

// RIKTIG:
catch (err) {
  const msg = err instanceof TypeError && err.message === "Failed to fetch"
    ? "Ingen tilkobling — sjekk nettverket"
    : "Handelen kunne ikke gjennomføres — prøv igjen";
  setError(msg);
}
```

**Regel:** Feilmelding skal alltid (1) fortelle hva som skjedde, (2) gi bruker en handling. Aldri bare "Nettverksfeil" eller "Feil".

---

## 7. Saldo mangler på trade-siden

**Symptom:** Bruker trader uten å vite hvor mye lekepenger de har.

**Løsning:** `WalletBalance`-komponent som kaller `/api/paper-trading/balance` og viser nåværende saldo (kr), P&L siden start (kr + %), og antall handler i dag.

```tsx
const res = await fetch("/api/paper-trading/balance");
const { balance } = await res.json();
// balance.current, balance.starting
```

**Plassering:** Header-rad på `/trade`, ved siden av ModeTabs. Kun synlig når innlogget.

---

## 8. "Hva skjer nå?"-boks for aktive sesjoner

**Symptom:** Bruker starter Auto/Joker, får bare "Bot aktiv" — ingen indikasjon på hva som faktisk skjer.

**Løsning:** Vis en kompakt infoboks under hovedpanelet når `status === "active"`:

```tsx
{status === "active" && (
  <div className="bg-[#0A0D12] border border-amber-500/20 rounded-xl p-4 space-y-2">
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <span className="text-[11px] font-medium text-amber-400 uppercase">Hva skjer nå?</span>
    </div>
    <p className="text-xs text-slate-400">
      AI-en overvåker BTC, ETH og SOL kontinuerlig. Den sjekker RSI, SMA-crossover og volum for å finne kjøps- og salgsmuligheter.
    </p>
  </div>
)}
```

**Fargekoding:** Amber for Auto, Violet for Joker.

---

## 9. Trade-ikoner i posisjonslisten

**Symptom:** Bruker ser handelslisten uten å vite hva slags trade det var (bot/manuell/stoploss).

**Løsning:** Legg til ikoner i radene:

| Ikon | Betydning | Når |
|------|-----------|-----|
| 🤖 | Bot-handel | `is_bot === true` |
| 🃏 | JokerTrade AI | (reservert) |
| ✋ | Manuell handel | Fallback |
| 🛑 | Stoploss | `exit_reason.includes("stoploss")` |
| 🎯 | Take profit | `exit_reason.includes("take_profit")` |

```tsx
const tradeIcon = (p) => {
  if (p.exit_reason?.includes("stoploss")) return "🛑";
  if (p.exit_reason?.includes("take_profit")) return "🎯";
  if (p.is_bot) return "🤖";
  return "✋";
};
```

**Plassering:** Før symbolnavnet i `MiniPositionList` og andre trade-lister.

---

## 14. Live Market Ticker — server-data + client-polling (3-lags mønster)

**Problem:** Vise ekte DB-data (coin_prices) på landing page som må være `"use client"` (next-intl hooks).

**Løsning:** 3-lags arkitektur:

1. **Server-komponent** — fetch fra DB, render client-component med data som props
2. **Client-komponent** — initial data fra props, polling via API-endepunkt
3. **API-endepunkt** — service-role DB fetch, `Cache-Control: no-store`

**Bro mellom server/client:** Server-komponenter kan IKKE importeres i `"use client"`. Løs: server-komponenten rendrer client-barnet, og page.tsx sender server-dataen som prop til client-komponenten via en wrapper.

```tsx
// page.tsx (server) — fungerer fordi server-komponenten rendrer client-barnet:
<HeroSection rightColumn={<LiveMarketTicker />} />

// HeroSection.tsx — client-komponent aksepterer children:
interface Props { rightColumn?: ReactNode; }
```

**Se:** `references/live-market-ticker-pattern.md` for full kode og forklaring med alle 3 lag.

---

## 14b. Ikon-konvensjon: ALLTID lucide-react, ALDRI emoji/unicode

**Toms regel (2026-08-01):** «Ikke bruk generiske ikon» — ALLE ikoner i Klarpakke-UI skal hentes fra `lucide-react`, aldri emoji eller unicode-symboler.

**Hvorfor:**
- Emoji ser uprofesjonelt ut, varierer mellom OS, og har ingen konsistent størrelse/farge
- lucide-react-ikoner arver `currentColor`, skalerer med `w-* h-*`, og har 100% konsistent rendering
- Klarpakke bruker allerede et kjerne-sett: `TrendingUp`, `TrendingDown`, `Activity`, `BarChart3`, `Shield`, `Zap`, `Target`, `Clock`, `Trophy`, `Flame`, `Gift`, `ChevronRight`, `ChevronDown`, `ChevronUp`, `Play`, `Loader2`

**Regel:**
```tsx
// FEIL — generiske emoji:
<span>🎯 Sjanse for gevinst</span>
<MetricCard icon="📊" ... />

// RIKTIG — lucide-react:
import { TrendingUp, Shield, Zap } from "lucide-react";
<MetricCard icon={<TrendingUp className="w-4 h-4" />} ... />
```

**Fargekonvensjon for ikoner i metrikk-kort:**
- Positiv verdi → `text-emerald-400`
- Negativ verdi/advarsel → `text-red-400`
- Amber/warning → `text-amber-400`

**Unntak:** Mynt-symboler (₿ BTC, ⟠ ETH, ◎ SOL) er akseptert — disse er valuta-notasjon, ikke dekorative ikoner.

---

## 18. CSP nonce hydration mismatch — `??` vs `||`

**Symptom:** Hydration error i Next.js: `<script nonce="">` (server) vs `<script nonce="xxx">` (client).

**Rotårsak:** `hdrs.get("x-csp-nonce") ?? undefined` returnerer tom streng `""` når headeren finnes men er tom. `"" ?? undefined` = `""` (ikke `undefined`), så JSX rendrer `nonce=""`. Client-side injecter en reell nonce → mismatch.

**Fiks:**
```tsx
// FØR — feiler ved tom header:
const cspNonce = hdrs.get("x-csp-nonce") ?? undefined;

// ETTER — tom streng → undefined:
const rawNonce = hdrs.get("x-csp-nonce");
const cspNonce = rawNonce && rawNonce.length > 0 ? rawNonce : undefined;
```

Når `cspNonce` er `undefined`, rendres ikke `nonce`-attributtet i det hele tatt → ingen mismatch.

## 19. Mobile-first (80% trafikk er mobil) — `py-12 sm:py-20` mønster

**Problem:** Alle seksjoner hadde `py-20` (5rem = 80px padding top/bottom). ~80% av trafikken er mobil, og 3-4 seksjoner stablet vertikalt med 80px padding blir altfor mye whitespace.

**Regel:** HVER landing-page seksjon skal ha responsive padding — alltid mobil-først:
```tsx
className="py-12 sm:py-20 ..."
//  py-12 (3rem = 48px) på mobil
//  sm:py-20 (5rem = 80px) på desktop
```

| Seksjon | Desktop | Mobil |
|---------|---------|-------|
| FeaturesSection | `py-20` | `py-12` |
| TradingModesExplainer | `py-20` | `py-12` |
| CTASection | `py-20` | `py-12` |

Unntak: HeroSection kan ha `min-h-screen` for å fylle viewport på desktop, og la content bestemme høyden på mobil.

## 20. KLT-forklaring — synlig på landing page

**Regel:** KLT (Klarpakke-tokens) skal forklares på landing page i hero-badgen, ikke bare vises som ukjent akronym.

```json
// no.json
"hero.badge": "Gratis beta — 5000 KLT (Klarpakke-tokens) til de 100 første 🪙"

// en.json
"hero.badge": "Free beta — 5,000 KLT (Klarpakke tokens) for the first 100 🪙"
```

Badgen er en emerald-farget pille øverst i HeroSection. Den er synlig på alle enheter og fungerer som både insentiv og quick-explanation for KLT.

---

## 21. UnifiedTradeTerminal — fane-arkitektur + /api/pilot-aliaset

**Arkitektur (`src/features/trading/UnifiedTradeTerminal.tsx`):** 4-fane-terminal på `/trade` (etter merge av JokerTradeDashboard-analytics som 4. fane "Statistikk" — aug 2026). `TradeMode = "manual" | "auto" | "pilot" | "stats" | "backtest"` (renamet fra `"joker"` → `"pilot"` 2026-08-01; `tab=joker` godtas fortsatt som alias), `MODES`-arrayet har `{ id, label, short, accent }` der `accent` er `data-[state=active]:border-{farge}-400`-klasser (emerald/amber/violet/cyan). Sidepanelet bytter via `{mode === "manual" && …}`-kjede; beskrivelsesbaren (`motion.div` med `key={mode}`) har per-mode farge-varianter. Lås-logikk: `lockedModes = hasTraded === false ? ["auto"] : []` (Pilot åpen for alle siden Tom 2026-07-29). `?first=1` gir guidet FirstTradeFlow.

**Viktig: `/api/pilot` ble OPPRETTET som egen route 2026-08-01** — `src/app/api/pilot/route.ts` (POST = start/aktiver sesjon med `{mode: "auto"|"pilot"|"joker", live, symbols}`, GET = analytikk for Statistikk-tabben). Mode `"joker"` er bevart som alias og normaliseres internt til `"pilot"` (`const mode = rawMode === "joker" ? "pilot" : rawMode`). FØR dette fantes ruten IKKE: kommentarer i `jokertrade/{notifications,leaderboard}` hevdet feilaktig at `/api/pilot/*` var aliaser dit, men `curl https://www.klarpakke.no/api/pilot` returnerte **200 med HTML** (Next.js fallback til nærmeste side) — ikke JSON. `res.ok=true` men `data.success=undefined` → stille feil i alle 3 komponenter (AutoStrategyPanel, PilotDashboard, StatsTab). Sjekk `src/app/api/jokertrade/` for `/api/pilot/notifications` og `/api/pilot/leaderboard` (de lever fortsatt der), men hovedruten er egen fil.

**GET /api/pilot respons-shape (fallgruve):**
```ts
{ trades: [...], sessions: [...], balance: number,
  analytics: { totalPnl, winRate, totalTrades, winningTrades, losingTrades, byCoin } }
```
- `trades` ligger på **toppnivå**, IKKE inni `analytics`.
- `byCoin` er inni `analytics`: `[{ coin, trades, pnl, winRate }]`.
- JokerTradeDashboard leser `d.analytics` og deretter `data.trades` — latent gap (ville vært `undefined`). Ved ny kode: les defensivt `data.trades ?? data.analytics?.trades ?? []`.
- `analytics`-tallene gjelder kun **lukkede** handler (`realized_pnl !== null`).

**Merge-oppskrift (dashboard-page → terminal-fane):** (1) utvid `TradeMode`-unionen, (2) legg til `MODES`-entry med accent, (3) portér dashboard-komponenten inn i filen (fetch `/api/pilot` med `credentials: "include"`), (4) legg til `{mode === "stats" && <StatsTab />}` i sidepanelet, (5) legg til per-mode variant i beskrivelsesbaren. Behold inline norske labels (terminalen hardkoder norsk, ikke i18n).

**ALLE moduser MÅ dele samme valuta-sett (Tom-krav, aug 2026):** Bruker krevde «Manuell må ha de samme som auto» — Manuell var hardkodet til kun BTC, mens Auto-strategi hadde 11 valutaer. Fiks: `OrderPanel` fikk egen `SYMBOLS`-array (samme 11 som AutoStrategyPanel) + `symbol`-state, `pair: selectedMeta.base + "/USDT"` i body, og pris/knapp/≈-tekst binder til `selectedMeta.base` i stedet for hardkodet BTC. **Regel:** når en fane får nye valg (valuta, risikonivå, strategi), sjekk ALLE andre faner for samme valg — uenighet mellom fanene er en UX-bug.

**Pitfall — subagent går tom for iterasjoner på store merges:** `delegate_task` med én stor merge-oppgave (dashboard → terminal-fane) kan returnere «plan uten kode» etter tool-iteration-limit. Subagenten leste alt og spesifiserte mergen 100 %, men skrev aldri filen. Lærdom: (a) instruer subagenten om å skrive filen TIDLIG og verifisere sent; (b) parent må være klar til å fullføre mergen selv — subagentens summary inneholder vanligvis hele spesifikasjonen; (c) re-read filer før du redigerer, fordi en ferdig subagent kan ha endret dem.

**Pitfall:** `grep`/søk i `.open-next/`- eller `.next/`-buildartefakter kan trigge hardline-blocklist og er unødvendig — kilden i `src/` dekker alt. Bruk `search_files` på `src/`, ikke på minifiserte build-filer.

**Se:** `references/trading-terminal-pilot-api.md` for full blueprint og filkart.

---

## 23. usePrices dual-key lookup — DB-nøkkel vs WS-nøkkel

**Symptom:** Priskort/symbolchips viser "—" eller 0 % på 24h-endring selv om tickeren ellers kjører.

**Rotårsak:** `usePrices()` (`src/hooks/usePrices.ts`) bygger `prices`-mappa fra TO kilder med ULIKE nøkkelformater:
- `coin_prices`-DB-rader: nøkkel = base uten USDT-suffiks (`"BTC"`, `"ETH"`, `"SOL"`)
- Binance WS-tickers: nøkkel = `"BTCUSDT"` — og `usePrices` oppretter NYE entries for WS-nøkler som ikke finnes i DB-mappa

→ Begge formene kan eksistere samtidig i samme `prices`-objekt. Å slå opp kun én form gir tomme rader.

**Fiks — slå alltid opp begge former, WS-nøkkel først:**
```tsx
const row = prices[meta.symbol] ?? prices[meta.base]; // "BTCUSDT" ?? "BTC"
```

**Trading-panel design-tokens (mørk glass, `/trade`-sidepanelet):** kort `bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4`, inner-flate `bg-[#0B0F19]`, seksjons-label `text-[11px] font-medium text-slate-500 uppercase tracking-wider`, accent **amber-400** (Auto) / emerald (suksess) / violet (Joker) / red (feil/stopp). Mynt-ikoner (LiveTicker-konvensjon): ₿ BTC, ⟠ ETH, ◎ SOL, ▲ AVAX, Ð DOGE, ⛓ LINK, ⬢ ADA, ◈ DOT, 🦄 UNI, ◆ POL.

**LiveTicker symbol-filtrering:** ALDRI bruk `Object.entries(prices).slice(0,8)` — dette slapp inn BNB, MATIC (migrert til POL 2024) og XRP. Bruk en eksplisitt `TICKER_SYMBOLS`-konstant som matcher `TOP_SYMBOLS` i pilot-engine:

**Stopp av auto-sesjon (Start/Stopp-knapp i AutoStrategyPanel):** PATCH `/api/trading/sessions` **krever `session_id`** — bulk-stopp (`all: true, mode: ...`) godtar KUN `mode: "paper" | "live"`, ikke `"auto"`. Mønster: hent aktive id-er via GET `/api/trading/sessions?status=active` ved mount → lagre i `useRef` → stopp én-og-én med `{ action: "stop", session_id }` i `Promise.all`. Kun `setStatus("idle")` når ALLE PATCH-er svarer ok (AGENTS.md: aldri falsk suksess-UI).

**Se:** `references/auto-strategy-panel-blueprint.md` — full symbol/ikon-tabell, chip-oppsett og verifiseringskommandoer.

---

## 35. Fjerning av en UI-modus/feature i prod — IKKE gjør det uten browser-verifisering + Tom-godkjenning

**Symptom (2026-08-03, reell hendelse):** Agenten fjernet Pilot-fanen fra UnifiedTradeTerminal i et "sammenslåingsprosjekt" (valg A fra eget forslag), deployet, og Tom skrek: **«Veldig dårlig nettsider. Jeg forstår ingenting??? Alt er jo borte. Pilot ikke tilgjengelig!!!!»** Agenten måtte rulle tilbake i full hast.

**Rotårsaker (alle tre måtte unngås):**

1. **Ingen browser-verifisering etter deploy.** `npm run check` + 1724 grønne tester + curl 307 er IKKE nok når du endrer UI-struktur. Testene kjørte grønt fordi de mocker komponentene — de fanger ikke at fanene på /trade faktisk rendres. Etter en UI-arkitektur-endring: **åpne prod i en ekte browser (Browserbase/CUA), logg inn som testbruker, og se fanene med egne øyne FØR du sier "deployet".**
2. **Fjernet en feature Tom bruker daglig uten eksplisitt bekreftelse på konsekvensen.** Agenten presenterte "slå sammen Pilot og Auto" som et rent teknisk valg — Tom svarte "A" på et spørsmål om arkitektur, ikke et spørsmål om å fjerne Pilot-knappen fra nettsiden hans. **Ved fjerning av synlig UI: bekreft EKSPLISITT med brukeren at fanen/knappen forsvinner fra nettsiden, og vent på «ok» før deploy.** Et arkitektur-valg er ikke det samme som en produkt-beslutning.
3. **Rullet ut til 100% av brukere på én gang.** Fjerningen traff alle samtidig. For modus-endringer: behold begge fanene i minst én deploy-syklus (med den nye som default), slik at rollback er en config-toggle, ikke en ny deploy.

**Regel — før du fjerner/reduserer synlig UI i prod:**

```
1. Bekreft med Tom: "Fanen X forsvinner fra /trade. OK?" (vent på svar)
2. Deploy med BEGGE fanene aktive (ny som default, gammel som alias)
3. Browserbase-verifiser at siden rendres og alle faner fungerer
4. Fjern den gamle fanen i en SEPARAT deploy, etter minst én grønn syklus
5. Ha rollback-commit klar (git revert én kommando unna)
```

**Rollback-mønster som fungerte:** `git revert` er IKKE nødvendig — enkle patch-er som gjenoppretter TradeMode-union + MODES-entry + `{mode === "pilot" && <PilotDashboard />}` + URL-alias var nok. Hold gjenopprettingen minimal og verifiser med tsc + vitest før ny deploy. **Ikke prøv å "fikse fremover" når brukeren skriker — rull tilbake FØRST, analyser etterpå.**

**Lærdom om Tom-signaler:** «ok»/«A»/«B» på et teknisk spørsmål = implementer. Men når implementeringen **fjerner noe synlig** fra nettsiden, stopp og vis en konkret beskrivelse av hva som forsvinner fra skjermen før deploy. Tom reagerer på produkt-endringer, ikke på kode-endringer.

---

## 25. Frontend kaller API-rute som ikke finnes → 200 med HTML (stille feil)

**Symptom:** Komponent viser generisk feil («Kunne ikke starte auto-handel») uten HTTP-404/401, ingen Sentry-feil, funksjonen «har alltid virket». Hele features kan være stille ødelagt i prod siden en refaktorering.

**Rotårsak:** I Next.js fallback-rutes en ikkeeksisterende `/api/*`-sti til nærmeste side → **HTTP 200 med HTML**. `res.ok` er `true`, så koden går inn i suksess-grenen og finner `data.success === undefined` → else-gren med generisk feil. Ingen 404 → ingen alarmsignaler.

**Diagnose (alltid først ved mistanke):**
```bash
# Svarer med HTML i stedet for JSON? → ruten finnes ikke.
curl -sS https://www.klarpakke.no/api/pilot | head -c 200   # "<!DOCTYPE html>..." = BUSTED
# Finn alle komponenter som kaller den:
grep -rn '"/api/pilot"' src/ --include="*.tsx" --include="*.ts"
# Finn faktiske ruter:
find src/app/api -type d -name "pilot"
```

**Regel:** Et 200-svar er ikke bevis for at en API-rute finnes. Ved sidekonsolidering: søk opp ALLE API-kall i komponentene som flyttes og verifiser hver rute; opprett manglende i samme commit. Etter deploy: curl-verifiser JSON-svar (`head -c 200` viser `{` ikke `<`).

## 26. BYO Børs-kobling (Binance) — infrastrukturen finnes, veien fra UI manglet

## 27. "Urealisert verdi" — inline forklaringer for nye kryptobrukere

**Problem:** Brukere med lite kryptoerfaring ser at kapitalen svinger fra 100k → 72k → 89k og tror de har tapt 28 000 kroner. De forstår ikke at tallet er mark-to-market og endres tilbake når markedet stiger.

**Løsning:** Legg en én-setnings forklaring RETT UNDER hvert tall som kan misforstås — INLINE, ikke i en separat FAQ-side:

```tsx
// PaperTradingCard — under current balance:
<p className="text-2xl font-bold text-kp-text-primary">
  {formatByMode(balance.current, "paper")}
</p>
<p className="text-[11px] text-kp-text-muted/70 mt-0.5 leading-tight">
  Urealisert verdi — endres med markedet hvert sekund. Handler er ikke solgt ennå.
</p>

// Ved PnL-tall — legg til "(urealisert)":
<p className="text-xs text-kp-text-muted">
  {t("pnl")} <span className="text-kp-text-muted/60">(urealisert)</span>
</p>
```

**Regel:** Ethvert tall som representerer mark-to-market kapital/posisjon MÅ ha en forklarende tekst. Brukere med lite kryptoerfaring vet ikke hva «urealisert PnL» er.

**Plassering:** Direkte under tallet — samme `space-y`/`mt`. Ikke i tooltip (ingen trykker på mobil), ikke i egen FAQ (ingen leser), ikke i footer.

---

## 30. Landing page content audit — JokerTrade→Pilot + duplikat-jakt (2026-08-02)

Etter rename skal landing page og navigasjon IKKE referere til gamle navn. Full scan med `web_extract` av `/`, `/no`, `/en` avslørte falske positiver — se §31 for verktøy-begrensningene.

| Funn | Alvor | Fiks |
|---|---|---|
| `/no` bruker **"JokerTrade"** i hero + modes | 🔴 | `TradingModesExplainer` i18n-nøkler: `landing.modes.pilot.*` (ikke `jokertrade.*`) |
| `/no` har lenke `/no/jokertrade` i modes | 🔴 | Bytt til `/no/trade` (Pilot-tab i terminalen) |
| `/en` motstridende beløp: "100 000 kr" i hero vs "10 000 kr" i steps | 🔴 | Begge skal være "100 000 kr" (NOK) |
| `/en` blander norsk/engelsk: "Få 10 000 kr i lekepenger" | 🟡 | EN-siden skal kun ha engelsk tekst |

**Verifiseringsmetode:** Bruk `curl` + `grep` for HTML-innhold som IKKE er JS-rendret. For JS-rendret innhold: bruk Browserbase eller CUA, IKKE `web_extract` (se §31).

```bash
curl -s "https://www.klarpakke.no/no" | grep -c "JokerTrade"
# 0 = enten JS-rendret eller faktisk fikset — verifiser med ekte nettleser
```

**Lærdom:** De fleste «funnene» fra `web_extract` viste seg å være verktøy-artefakter (duplikat innhold, rå i18n-nøkler, tomme priser/FAQ-sider). Koden var allerede korrekt på alle punkter. Kun om-oss-tekster («Klarpakke Universitet», «Tom Jensen») og i18n-filer trengte faktiske endringer.

---

## 36b. Balanse-SSoT i dashboard — ÉN datakilde for «balanse» (2026-08-03, FIXET i 4338120cd)

**Symptom (dobbel balanse):** Dashboard viser TO forskjellige tall — hero «105 604 kr», portefølje/sesjonsliste «69 864 kr». Brukeren vet ikke hvilket som er riktig.

**Rotårsak:** Hero (`DashboardTopBar`) brukte `accountBalance`, porteføljen (`PaperTradingList` sin balance-prop) brukte `stats.currentCapital` ← `data.totalCapital`. `totalCapital` = SUM(`trading_sessions.current_capital_nok`) på tvers av sesjoner — forvrenges av krasjede/stoppede sesjoner og er en ANNEN størrelse enn kontobalansen.

**SSoT-mønster (gjeldende):**
- `accountBalance` (`paper_accounts.current_balance`, via `getUserDashboardMetrics`) = ENESTE kilde for ALLE «balanse»-visninger: `DashboardTopBar` (hero), `PaperTradingList` balance-prop (sesjonsliste/portefølje), `ExplainStatButton` balance, `totalReturn`-beregning, `SimplifiedHero`, `PersonalizedGreeting`.
- Fallback `accountBalance ?? totalCapital` er KUN for live-modus (der `accountBalance` er null) — aldri for paper.
- `UserStats`-interfacer MÅ ha `accountBalance?: number | null`, og konsumentene skal prefere det (`stats.accountBalance ?? stats.currentCapital`).
- `currentCapital` i `DashboardContent`-stats mappes til `data.accountBalance ?? data.totalCapital`, slik at legacy-konsumenter også får SSoT-verdien.

**Filer (fiks 2026-08-03):** `DashboardContent.tsx` (stats.currentCapital-mapping), `AdaptiveDashboard.tsx` (UserStats-interface + PaperTradingList balance), `DashboardPro.tsx` (PaperTradingList balance + ExplainStatButton).

**Verifiser ALLE steder ved balanse-endringer:**
```bash
grep -rn "accountBalance\|totalCapital\|currentCapital" src/features/dashboard/
```
**Regel:** Ingen balanse-visning skal lese `totalCapital`/`currentCapital` direkte uten `accountBalance` først.

---

## 37. Pilot-sammenslåing — KORRIGERT etter Tom-reaksjon (2026-08-03)

**Status:** Pilot-fanen er **GJENOPPRETTET** etter at Tom reagerte kraftig på fjerningen («Alt er jo borte. Pilot ikke tilgjengelig!!!!»).

**Gjeldende tilstand (commit `63c47b0c4`):**
- `TradeMode = "manual" | "auto" | "pilot" | "stats" | "backtest"` (5 faner — Pilot er tilbake)
- `MODES`-array har Pilot-entry med violet accent
- `{mode === "pilot" && <PilotDashboard />}` er tilbake i render
- URL-aliaser fungerer: `?tab=pilot` → Pilot, `?first=1` → Pilot (guided)
- `/pilot`-siden redirecter til `/trade?first=1` (backcompat)

**Lærdom:** Fjerning av synlig UI krever EKSPLISITT Tom-godkjenning på konsekvensen («Fanen X forsvinner — OK?»), ikke bare arkitektur-valg. Se §35 for full prosess.

**AI-forklaringer (beholdt):** `pilot_explanation` vises fortsatt i Statistikk-fanen (StatsTab). LLM-genererte forklaringer (Kimi) kjører i prod — se `klarpakke-trading-strategy` for detaljer.

---

## 43b. «Tjener andre brukere X per dag?» — sanity-sjekk FØR presentasjon (2026-08-03)

**Hendelse:** Tom spurte «Tjente andre brukere det samme?» Agenten presenterte «top 3 brukere tjente 20-30k/dag» fra en aggregerende SQL — uten å sjekke om tallene var mulige. Ved nærmere analyse: bruker `832bf495` hadde **49 kjøp vs 184 salg** (3,7× flere salg enn kjøp — umulig) og **MIN(realized_pnl) = +53 kr** (ingen taps-trades på 233 trades — umulig for grid). Tallene var inflated av oversell-buggen (se trading-strategy skill). Agenten måtte korrigere seg selv i neste melding — «Sannheten: disse tallene er IKKE reelle».

**Regel:** Ved presentasjon av andre brukeres P&L/inntjening til Tom — kjør ALLTID denne 30-sekunders-sjekken FØRST:
```sql
-- 1. Umulig balanse: sell > buy
SELECT user_id, side, COUNT(*) FROM trades
WHERE executed_at > CURRENT_DATE AND mode='paper'
GROUP BY user_id, side;
-- 2. Umulig konsistens: ingen taps-trades
SELECT user_id, MIN(realized_pnl), COUNT(*)
FROM trades WHERE realized_pnl IS NOT NULL AND mode='paper'
GROUP BY user_id HAVING MIN(realized_pnl) > 0 AND COUNT(*) > 50;
```
Begge funn = inflated data — si det til Tom («tallene er inflated av en bug, ikke reell inntjening») i stedet for å presentere dem som fasit. Å presentere fake-tall og måtte korrigere er verre enn å sjekke først.

**Relatert (FEMTE FELLE i §36):** Samme prinsipp for Toms egne tall — «har jeg tjent X?» krever DB-sjekk + eksplisitt skillnad mellom verdiendring i visning (korreksjon) og realisert gevinst (solgte trades).

## 44. Dashboard-design: Nordnet-stil — kun tall, ingen analyse-tekst (Tom-krav 2026-08-03)

**Bakgrunn:** Tom limte inn hele dashboardet sitt og skrev «Forstår ikke tall, tekst eller noe, analyser!!!» Dashboardet viste MOTSTRIDENDE signaler: +94 856 NOK P&L ved siden av «Total avkastning −830 kr», «Vinnrate 0% er under bransjesnittet (55%)», «Høy risiko 32/100», «Tøff periode — vurder å justere strategi», «Profittabel men ujevn — fokuser på konsistens». Alle tekst-snakkene var generert fra ulike heuristikker som ga motstridende budskap.

**Toms beslutning:** Fjern ALL analyse-tekst. Spørsmålet hans var «Hva gjør verdens ledere og norske konkurrenter?» — svaret (Kraken/Nordnet-mønsteret): **kun tall, brukeren tolker selv.**

**Regler (gjelder all fremtidig dashboard-endring):**

1. **ALDRI generer vurderende tekst fra heuristikker** — ingen «Tøff periode», «Profittabel men ujevn», «Høy risiko — trenger oppmerksomhet», «under bransjesnittet». Fjernet fra `PersonalizedGreeting.getPerformanceMessage` (kun positive meldinger beholdt: `performance.strong`/`steady`) og risiko-score-visningen.
2. **Vinnrate er MENINGSLØS for grid-strategi** — grid kjøper og holder, 0 lukkede trades → 0% vinnrate ved siden av +94% urealisert gevinst. Fjernet fra statItems og PersonalizedGreeting helt (commit `2b2a697de`). Vis ALDRI vinnrate når strategiens natur er få/ingen lukkede trades.
3. **ÉN P&L-beregning overalt** — «Total avkastning» (SUM realized_pnl = −830) og hero-P&L (balance − start = +94 856) viste motstridende tall. Bruk SAMME kilde i alle kort (Kraken-mønster: splitt eksplisitt i «Urealisert» vs «Realisert» hvis begge vises).
4. **Konkurrent-referanse for dashboard-UX:** Nordnet viser 3 tall (Verdi, Endring i dag, Endring totalt) — ingenting annet. Kraken skiller «Unrealized P&L» fra «Realized P&L». Det er nivået Klarpakke skal ligge på for nybegynnere.

**Beholdt (nyttig, ikke støy):** AI-forklaringer per trade (§10), inline «urealisert verdi»-forklaring (§27), beta-justert badge (§41). Disse forklarer DET KONKRETE TALLET ved siden av — de dømmer ikke brukerens prestasjon.

---
