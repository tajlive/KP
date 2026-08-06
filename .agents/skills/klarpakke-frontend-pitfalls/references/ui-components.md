# Ui Components

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

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


## 26. BYO Børs-kobling (Binance) — infrastrukturen finnes, veien fra UI manglet


## 32. ModeGuide — dismissible per-mode veiledning

**Mønster:** Trinn-for-trinn guide for hver trading-modus i UnifiedTradeTerminal. Vises én gang per modus via `localStorage`, dismisses permanent.

```tsx
"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { X, Lightbulb } from "lucide-react";

type TradeMode = "manual" | "auto" | "pilot";

const GUIDES: Record<TradeMode, { icon, title, steps, tip }> = {
  manual: {
    icon: MousePointerClick,
    title: "Slik handler du manuelt",
    steps: ["1. Velg en kryptovaluta", "2. Skriv inn beløp (kroner)", "..."],
    tip: "Start med små beløp (200–500 kr). Du har 100 000 kr i lekepenger!",
  },
  // auto, pilot tilsvarende...
};

export function ModeGuide({ mode }: { mode: TradeMode }) {
  const guide = GUIDES[mode];
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (localStorage.getItem(`klp-modeguide-${mode}`)) setVisible(false);
  }, [mode]);

  if (!guide || !visible) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1 }}
      className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-4">
      <button onClick={() => {
        localStorage.setItem(`klp-modeguide-${mode}`, "1");
        setVisible(false);
      }}>
        <X className="w-4 h-4" />
      </button>
      <guide.icon /> <h3>{guide.title}</h3>
      {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
      <p>{guide.tip}</p>
    </motion.div>
  );
}
```

**Plassering:** Under mode-beskrivelse-baren i `UnifiedTradeTerminal`, kun for `manual`/`auto`/`pilot`.

**Pitfalls:**
- **React hooks rules**: `useState`/`useEffect` MÅ kalles FØR `if (!guide) return null`. Hooks etter early return = ESLint-feil (`react-hooks/rules-of-hooks`).
- **Test-kompatibilitet**: Ikke bruk "NOK" i guide-tekst — `UnifiedTradeTerminal.prices.test.tsx` sjekker at ingen `<span>` inneholder "NOK" utenfor labels. Bruk "kroner".
- **Ingen "NOK" i span-tekst**: Testen `nokSpans.filter(el => el.tagName === "SPAN" && !el.closest("label"))` vil fange opp ALLE spans med "NOK" — inkludert i ModeGuide. Bruk "kroner" for å unngå falske testfeil.

**Verifiseringsmetode:**
```bash
# Ikke stol på curl (JS-rendert side). Bruk web_extract for å se faktisk innhold:
web_extract(urls=["https://www.klarpakke.no/no"])
# Sammenlign mot i18n-nøkler i messages/no.json
grep -c "JokerTrade\|jokertrade" messages/no.json messages/en.json
```
- `exchange_connections`-tabell: krypterte nøkler (`encryptExchangeSecret` → ciphertext+nonce), `permissions`-JSON (`trading`-tillatelse), `is_testnet`, `revoked_at`
- `POST /api/exchanges/connections` — validerer nøkler (`BinanceExecutor.validateApiKeys()` / `validateKrakenReadOnlyKeys`) + upsert
- `src/lib/trading/executor-factory.ts` — `ExecutorFactory.create(db, userId, "live")` dekrypterer nøkler via `decrypt_binance_keys` RPC + tier-guard (bachelor+)
- `executeLiveTrade` i tick-enginen (`session.mode === "live"`-sti) — full risk-validator før live-ordre
- `BinanceAPISettings`-UI på `/no/dashboard/settings` (client-innstillinger)

**Manglet:** `/api/pilot`-ruten (se §21) som oppretter sesjon med `mode: "live"` og validerer `exchange_connections` + tier server-side. Live-toggle i AutoStrategyPanel kaller `{mode:"auto", live:true, symbols}` → ruten sjekker `permissions.trading` + tier → oppretter sesjon med `mode:"live"`.

**Regel:** Før du bygger ny live-handel fra bunnen — søk `exchange_connections`, `ExecutorFactory`, `executeLiveTrade`, `session.mode === "live"`. Infrastrukturen var skrevet men aldri eksponert. BYO-modellen (kunden kobler egen Binance-nøkkel, Klarpakke utfører) er lovlig i Norge fordi Klarpakke ikke er valutaveksler — samme modell som 3Commas/Pionex. Kunde-nøkler brukes kun til kundens egne ordrer.

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


## 38. Dashboard-analyse via Playwright med auth (2026-08-03)

**Problem:** `web_extract` på `/dashboard` returnerer kun login-siden (auth-barriere). Kan ikke analysere faktisk dashboard uten innlogging.

**Løsning:** Playwright med innlogging via test-bruker:

```typescript
// e2e/tmp/analyze-dashboard-auth.spec.ts
test('Analyser dashboard (innlogget)', async ({ page }) => {
  // Logg inn
  await page.goto('https://www.klarpakke.no/no/login');
  await page.fill('input[type="email"]', 'test+tricky+123@klarpakke.no');
  await page.fill('input[type="password"]', 'TestTest123!');
  await page.click('button[type="submit"]');
  
  // Vent på dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(3000);
  
  // Screenshot + tekst
  await page.screenshot({ path: '/tmp/dashboard.png', fullPage: true });
  const text = await page.locator('body').textContent();
  console.log(text);
});
```

**Kjør:**
```bash
npx playwright test e2e/tmp/analyze-dashboard-auth.spec.ts --project=chromium
```

**Test-bruker:** `test+tricky+123@klarpakke.no` / `TestTest123!` (fra `.env.local`).

**Feller:**
- `waitUntil: "networkidle"` henger på sider med polling — bruk `domcontentloaded` + `waitForTimeout`
- Screenshot må tas ETTER `waitForURL` + ekstra vent (hydration)
- `web_extract` er ubrukelig for auth-sider — alltid Playwright for innlogget analyse


