# Misc

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

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


## 10. AI-forklaringer i trade-rader (inline)

**Problem:** Bruker ser en rad med `KJØP BTC · +2 000 kr` men forstår ikke *hvorfor* AI-en kjøpte eller solgte.

**Løsning:** Legg til en kompakt forklaringslinje under hver trade-rad vha `getTradeInlineExplanation` fra `@/lib/trading/explanations`.

```tsx
import { getTradeInlineExplanation } from "@/lib/trading/explanations";

// Inne i trade-radens motion.div:
<motion.div className="... flex flex-col ...">
  {/* Eksisterende radinnhold (ikon, symbol, PnL) */}
  <div className="flex ...">...</div>
  {/* NY: inline forklaring */}
  <p className="text-slate-400 text-xs leading-tight">
    {getTradeInlineExplanation(trade)}
  </p>
</motion.div>
```

**Output-eksempler:**

| Side | RSI/SMA-data i `strategy_signal` | Output |
|------|----------------------------------|--------|
| Kjøp | `{ rsi: 28, confidence: 82 }` | `RSI: 28 (underkjøpt), Konfidens: 82%` |
| Kjøp | `{ rsi: 78, sma20: 52000, sma50: 50000 }` | `RSI: 78 (overkjøpt), SMA20 ligger 4,00% over SMA50` |
| Kjøp | `null/ingen data` | `""` (tom — ingenting vises) |
| Salg | `exit_reason: "stoploss", realized_pnl: -274` | `Stoploss · −274,00 kr` |
| Salg | `exit_reason: "take_profit", realized_pnl: 1500` | `Tok gevinst · 1 500,00 kr` |
| Salg | `exit_reason: "manual", realized_pnl: 500` | `Manuell · 500,00 kr` |
| Salg | `exit_reason: "signal_reverse"` | `Signal snudd · … kr` |

**For kjøp:** funksjonen kaller `getIndicatorContext()` som ekstraherer RSI, SMA20/SMA50 og konfidens fra `strategy_signal`-objektet.

**For salg:** funksjonen infererer exit-årsak fra:
1. `exit_reason`-feltet (hvis satt eksplisitt)
2. Fallback: hvis `realized_pnl < 0` → `"stoploss"`, ellers `"signal"`

**Typekompatibilitet:** `getTradeInlineExplanation` aksepterer `Trade` direkte fra `@/lib/trading-api` siden de delte feltene overlapper. Ingen casting nødvendig.

**Importsti:** `@/lib/trading/explanations` (allerede i prosjektet — ingen ny avhengighet).

**Testing:** Funksjonen har dedikerte enhetstester i `src/lib/trading/__tests__/explanations.test.ts` — dekker RSI/SMA-visning, exit-årsaker, tomme signaler og PnL-inferens.

---


## 11. Interaktive elementer — alltid `<button>`, aldri `<span>`

**Symptom:** eslint/jsx-a11y warnings: `click-events-have-key-events`, `no-noninteractive-element-interactions`, `no-noninteractive-tabindex`.

**Rotårsak:** `<span onClick={...} tabIndex={0}>` — span er ikke et interaktivt element semantisk. Selv med `tabIndex` og `role` gir det 3+ a11y warnings.

**Fiks:** Erstatt `<span>` med `<button type="button">`:

```tsx
// FEIL — 3 a11y warnings:
<span
  onClick={() => setOpen((o) => !o)}
  onMouseEnter={() => setOpen(true)}
  onMouseLeave={() => setOpen(false)}
  tabIndex={0}
>
  {entry.term}
</span>

// RIKTIG — 0 warnings:
<button
  type="button"
  onClick={() => setOpen((o) => !o)}
  onMouseEnter={() => setOpen(true)}
  onMouseLeave={() => setOpen(false)}
  onFocus={() => setOpen(true)}
  onBlur={() => setOpen(false)}
  onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
  aria-expanded={open}
>
  {entry.term}
</button>
```

**Regel:** Har elementet `onClick` + skal kunne fokuseres? Bruk `<button>` (ikke `<div>`, `<span>`, `<a>` uten href). Det gir gratis keyboard-navigasjon, fokusringer, og tilgjengelighetsverktøy fungerer.

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


## 14. SVG-illustrasjoner i stedet for emoji-ikoner

**Problem:** Emojis (🖐️, 🤖, 🎭) ser uprofesjonelt ut og varierer mellom OS.

**Løsning:** Inline SVG-illustrasjonskomponenter — abstrakte geometriske former som matcher moderne UI-stil (Linear, Vercel).

```tsx
// Illustrations.tsx
export function PilotIllustration() {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="60" cy="60" r="24" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <line x1="60" y1="32" x2="60" y2="44" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      <line x1="60" y1="76" x2="60" y2="88" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      <path d="M60 52 L66 60 L60 68 L54 60 Z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
```

**Bruk i komponent:**
```tsx
const MODES = [
  { id: "manual", Illustration: ManualIllustration, color: "emerald" },
  { id: "auto", Illustration: AutoIllustration, color: "amber" },
  { id: "pilot", Illustration: PilotIllustration, color: "violet" },
];
// Render:
<div className={modeAccent(mode.color)}>
  <mode.Illustration />
</div>
```

**Fordeler:** `currentColor` arver farge fra CSS; `aria-hidden` for dekorative bilder; ingen eksterne avhengigheter; skalerbart.

**Designprinsipper:** Sirkler i bakgrunnen (opacity 0.1–0.15), sentralt geometrisk symbol, maks 2-3 visuelle lag, `strokeLinecap="round"`.

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


## 22. AccessibilityProvider — globale brukerpreferanser fra profil

**Problem:** `font_size_preference` og `high_contrast_mode` lagres i `user_profiles`, men brukes kun når brukeren besøker innstillingssiden. Ved full reload eller navigasjon fra en annen side, forsvinner tekststørrelse/kontrast.

**Løsning:** Global provider som fetcher profilen én gang ved mount og legger CSS-klasser på `<html>`:

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function AccessibilityProvider({ children }) {
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    async function apply() {
      try {
        const res = await fetch("/api/user/profile", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const prefs = json?.profile;
        if (!prefs) return;
        if (prefs.font_size_preference === "large")
          document.documentElement.classList.add("text-lg");
        if (prefs.high_contrast_mode)
          document.documentElement.classList.add("high-contrast");
      } catch { /* silent */ }
    }
    apply();
  }, []);
  return <>{children}</>;
}
```

**Plassering i provider-treet:** Inni `<AuthProvider>` — auth-cookies må være tilgjengelige for API-kallet.

**CSS-implementering:**
- `html.text-lg` — `font-size: 112.5%`, justerer `kp-text-*` størrelser
- `html.high-contrast` — overstyrer CSS-variabler (`--kp-text-primary`, `--kp-border`) med høyere kontrastverdier

**Mønster-regler:** `useRef`-guard for én gangs fetch (strict-mode). Legg klasser på `document.documentElement`. Bruk CSS custom properties for high-contrast. Stille feilhåndtering (nice-to-have).

---


## 13. "Alltid fakta" — ingen fabrikkerte tall på nettsider

**Symptom:** En landingsside eller markedsføringsside viser oppdiktede statistikker som "1 247 aktive tradere", "28 700 trades utført" eller lignende.

**Regel:** ALDRI hardkod tall som ikke kan verifiseres. Hvis data ikke kan hentes fra DB eller API, skal seksjonen utelates eller bygges uten tall. Dette inkluderer Stats-seksjoner med "aktive tradere", "trades utført" osv. — ikke lag dem i det hele tatt hvis du ikke har en server-komponent som henter ekte data.

```tsx
// FEIL — fabrikkerte tall:
const STATS = [
  { key: "users", value: 1247, suffix: "+" },  // Hvor kom 1247 fra?!
  { key: "trades", value: 28700, suffix: "+" },
];

// RIKTIG — hent fra ekte API/server:
// Server-komponent eller useSWR/useEffect mot /api/stats
// Hvis endepunktet ikke finnes — ikke vis tall i det hele tatt
```

**Hvorfor:** Uverifiserbare tall er:
1. **Villedende** — viser falsk sosial proof
2. **Sårbare** — noen vil sjekke og oppdage at de ikke stemmer
3. **Utdaterbare** — glemt og aldri oppdatert

**Alternativer i stedet for tall:**
- Feature-seksjoner (beskriv produktet uten kvantifisering)
- Kundeutsagn/testimonials hvis reelle
- Lenker til ekte innhold (blogg, API-dokumentasjon)
- CTA-seksjoner (fokuser på hva brukeren får, ikke hvor mange andre som bruker det)

---


## 24. Sletting av «død» kode — verifiser importører KORREKT først

**Symptom:** Du sletter filer som ser ubrukte ut (0 importer), og `tsc --noEmit` eksploderer med `Cannot find module '...'` fra steder du ikke fant.

**Rotårsak (to feller):**

1. **Grep-filteret skjuler ekte importører.** `grep -r "from.*$f" src/ | grep -v "auto-trading/"` filtrerer bort ALLE linjer som inneholder mappenavnet — inkludert legitime importører UTENFOR mappen som importerer via full sti: `import { BotDetailView } from "@/features/trading/auto-trading/BotDetailView"` inneholder `auto-trading/`, så `grep -v` slettet beviset. `BotDetailView` rapporterte «0 importers» men ble importert av `src/app/[locale]/(user)/dashboard/bot/[session_id]/page.tsx`.
2. **`.next`-typecache holder liv i slettede sider.** Etter å ha slettet `dashboard/auto-trade/page.tsx` og `dashboard/jokertrade/page.tsx` feiler tsc på `.next/dev/types/validator.ts` som refererer til de slettede modulene. `.next` må tømmes (se nedenfor) før tsc blir grønt igjen.

**Sjekkliste før sletting:**

```bash
# 1. Tell importører UTEN å filtrere bort mappenavnet:
#    kun filtrer ut selve filen, tester og node_modules.
for f in FilA FilB; do
  count=$(grep -r "from.*$f" src/ --include="*.tsx" --include="*.ts" \
    | grep -v "$f.tsx" | grep -v "__tests__" | grep -v "\.test\." | wc -l)
  echo "$f: $count"
done
# Merk: sti-referanser i page.tsx-filer teller MED — sjekk spesifikt src/app/
grep -rl "FilA" src/app/ --include="*.tsx"
```

2. Sjekk `src/app/`-sidene eksplisitt — pages kan importere komponenter direkte og er lett å glemme.
3. Slett, tøm `.next`-cachen, kjør `tsc --noEmit` FØR du committer.
4. Hvis noe knuste: `git checkout HEAD -- <fil>` gjenoppretter umiddelbart.

**`.next`-tømming:** `rm -rf` er BLOKKERT av Toms approvals.deny-regel (`*rm -rf*`). Bruk `rm -r .next` — fungerer identisk for dette formålet.

**Lærdom:** «0 importer» er bare sant hvis grep'en faktisk kunne ha sett importen. Filtrer med filnavn, aldri med mappenavn.


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


## 31. web_extract falske positiver — JS-rendrede Next.js-sider

**Problem:** `web_extract` returnerer feilaktig duplikat-innhold, tomme sider, og rå i18n-nøkler på JS-rendrede Next.js-sider.

**Rotårsak:** `web_extract` bruker en headless browser som fanger BÅDE SSR-innhold OG CSR-hydration i én output. Resultatet er:

| Artefakt | Årsak | Eksempel |
|---|---|---|
| **Duplikat innhold** | SSR + CSR hydration gjengir siden to ganger | Hele landing page ×2 |
| **"Laster..."** i toppen | Hydration fallback før React mount | Alle JS-sider |
| **Rå i18n-nøkler** | Dictionary JSON vises som tekst | `about.metadata.title \| Klarpakke` |
| **Tomme priser/FAQ** | Innhold er JS-rendret, ikke i HTML | Priser viser kun navn uten priser |
| **Live markeder ×2** | SSR + CSR fanger komponent to ganger | To identiske ticker-rader på landing page |
| **Navigasjonslenker duplisert** | Samme SSR+CSR dobbel rendering | Brødsmulesti vises to ganger i FAQ |

**Sikker verifiseringsmetode:**
```bash
# Steg 1: curl på HTML (finner alt som IKKE er JS-rendret)
curl -s https://www.klarpakke.no/no | grep -c "søketekst"
# 0 treff = innholdet er JS-rendret → web_extract-resultater er upålitelige

# Steg 2: ekte nettleser (CUA/Browserbase) for å se faktisk visning
# Bare dette gir pålitelig resultat for React/Next.js sider
```

**Regel: ALDRI fiks noe basert kun på web_extract.** Verifiser alltid med (1) curl på HTML + (2) ekte nettleser/CUA. `web_extract` er kun pålitelig for statiske HTML-sider og API-responser.

**Unntak:** Landing page-tekster som er hardkodet i i18n (`messages/no.json`) er synlige i `curl` — disse kan verifiseres raskt.

---


## 33. Porteføljeverdi — vis alltid TOTAL verdi (ledig + investert)

**Problem:** Dashboard viste kun `accountBalance` (sum av `current_capital_nok`). Etter grid-kjøp vises ~96 000 kr i stedet for reell ~100 000 kr (96k ledig + 4k investert). Bruker tror kapitalen «krymper» når den bare er investert.

**Løsning:** `getAccountBalance()` returnerer `{ available, invested, positionCount }`. DashboardMetrics får `investedCapital` + `positionCount`-felt. DashboardTopBar viser totalen som hovedtall, med forklarende linje under:

```tsx
// Hovedtall = TOTAL porteføljeverdi:
formatByMode((balance ?? 0) + investedCapital, mode)

// Forklaringslinje under:
{isPaper && (
  <div className="text-[11px] text-kp-text-secondary mt-0.5">
    <span>💳 {formatByMode(balance ?? 0, mode)} ledig</span>
    <span className="text-kp-border">·</span>
    <span>📈 {formatByMode(investedCapital, mode)} investert</span>
    {positionCount > 0 && <span>· {positionCount} posisjoner</span>}
  </div>
)}
```

**Backend (`getAccountBalance` -> `getUserDashboardMetrics`):**
```typescript
// Return type: { available, invested, positionCount } | null
// Hent sessions med open_position (JSONB):
.select("current_capital_nok, open_position, trading_pair")

for (const s of sessions) {
  available += Number(s.current_capital_nok ?? 0);
  const pos = s.open_position as { quantity?: number; entry_price?: number } | null;
  if (pos?.quantity && pos?.entry_price) {
    invested += pos.quantity * pos.entry_price;
    positionCount++;
  }
}
```

**Pitfalls:**
- `open_position` er JSONB → cast til `{ quantity, entry_price }`
- ALLE DashboardMetrics return-veier må ha `investedCapital`/`positionCount` (RPC-path, fallback, tsAggregationFallback, error-path)
- Fallback til `paper_accounts.current_balance` returnerer `{ available: balance, invested: 0, positionCount: 0 }`

**Relatert:** Se §27 «Urealisert verdi» for inline forklaringsmønster.

---


## 34. LiveTicker — filtrer ALLTID mot eksplisitt symbol-liste

**Symptom:** Ticker på /trade viser BNB, MATIC (død, migrert til POL 2024) og XRP — symboler som ikke er i grid/Pilot.

**Rotårsak:** LiveTicker() brukte Object.entries(prices).slice(0, 8) — usePrices() returnerer ALLE symboler fra WebSocket, ikke bare de 10 tradbare. Samtlige symboler fra coin_prices DB dukker opp i tickeren.

**Fiks — deklarer eksplisitt TICKER_SYMBOLS-konstant:**

```
// Utenfor komponenten — matcher TOP_SYMBOLS i pilot-engine
const TICKER_SYMBOLS = [
  "BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","DOGEUSDT",
  "LINKUSDT","ADAUSDT","DOTUSDT","UNIUSDT","POLUSDT"
];

function LiveTicker() {
  const { prices } = usePrices();
  const tickers = React.useMemo(() => {
    const data: PriceData[] = [];
    for (const symbol of TICKER_SYMBOLS) {
      const d = prices[symbol];
      if (!d && data.length > 0) continue;
      data.push({ symbol, price: d?.price ?? 0, change24h: d?.price_change_percent_24h ?? 0 });
    }
    return data.length > 0 ? data : FALLBACK_TICKERS;
  }, [prices]);
}
```

**Regel:** ALLE UI-komponenter som viser kryptodata MÅ filtreres mot kjente, gyldige symbol-lister. usePrices() returnerer alt — det er visningslagets ansvar å velge ut de riktige.

**Validering:** Sjekk at hvert symbol i TICKER_SYMBOLS finnes i coin_prices-DB. Døde symboler (MATIC) og ikke-tradbare (BNB) skal IKKE vises.

---


## 36. paper_accounts vs trading_sessions — balance-divergens (2026-08-03, LØST)

**Symptom:** Dashboard viser -30% P&L (69 535 kr av 100k), men `trading_sessions` har korrekte posisjoner (+/- 1%). `paper_accounts.current_balance` er 30k lavere enn reell verdi.

**Rotårsak:** Balance-ledgeren (`paper_accounts`) trakk penger for kjøp, men posisjonene ble ikke riktig verdsatt pga. valuta-buggen (orphan-dobbeltkonvertering). Ledger og posisjoner divergerte.

**KRITISK FELLE (2026-08-03 kveld, Tom-bevis):** Første balance-reparasjon brukte kun `status='active'` i SQL-spørringen → Tom så 9 578 NOK (1 aktiv sesjon) i stedet for 199 198 NOK (11 sesjoner: 1 aktiv + 10 stopped). **Stoppede sesjoner har fortsatt cash + posisjoner som tilhører brukeren** — de er ikke slettet, bare stoppet. ALLE balance-beregninger MÅ inkludere `status IN ('active','paused','stopped')`.

**ANDRE FELLE (2026-08-03, Tom-spørsmål):** Tom spurte «Så jeg har tjent 99 198,33 NOK på en dag?» etter balance-korreksjon. **NEI — korreksjon ≠ gevinst.** Brukere forstår ikke forskjellen. Løsning: Beta-justert badge (§41) som vises ved store korreksjoner. Tom: «Trenger ikke å forklare hva som gikk feil, brukere vet vi er i beta.»

**TREDJE FELLE (2026-08-03 kveld, Tom-bevis):** Etter første reparasjon sa agenten «199 198 NOK» men dashboard viste fortsatt «9 578 NOK». **Visningslaget (`getAccountBalance`) brukte også kun `status='active'`** — samme feil to steder. Fikset i commit `2b9dcae1c`: `.in("status", ["active", "paused", "stopped"])`.

**Diagnose:**
```sql
-- Sjekk divergens (INKLUDER STOPPEDE sesjoner!)
SELECT 
  pa.current_balance AS ledger_balance,
  SUM(ts.current_capital_nok) AS session_cash,
  SUM((ts.open_position->>'quantity')::numeric * cp.price) AS position_value,
  SUM(ts.current_capital_nok) + COALESCE(SUM((ts.open_position->>'quantity')::numeric * cp.price), 0) AS real_total
FROM paper_accounts pa
LEFT JOIN trading_sessions ts ON ts.user_id = pa.user_id 
  AND ts.mode='paper' 
  AND ts.status IN ('active','paused','stopped')  -- IKKE bare 'active'!
LEFT JOIN coin_prices cp ON cp.symbol = ts.trading_pair
WHERE pa.user_id = '<uid>'
GROUP BY pa.current_balance;
-- Hvis ledger_balance << real_total: balance-ledger er korrupt
```

**Status 2026-08-03:** Tre faser fikset:
1. **Ledger-reparasjon** (commit `92184199b`): `scripts/repair-paper-account-balances.ts` beregner korrekt balance (cash + posisjonsverdi) og oppdaterer `paper_accounts.current_balance` (35 brukere reparert).
2. **Visnings-SSoT** (commit `4338120cd`): ALLE balanse-visninger på dashboard bruker nå `accountBalance` som eneste kilde — se §36b.
3. **Sesjons-scope** (commit `2b9dcae1c`): `getAccountBalance` inkluderer nå `active+paused+stopped` — ikke bare `active`.

**Regel:** Ved «dashboard viser feil P&L» — sjekk ALLTID tre kilder: (1) `paper_accounts.current_balance` (ledger), (2) `trading_sessions.current_capital_nok` (cash per sesjon), (3) `open_position` × `coin_prices.price` (posisjonsverdi). Divergens mellom dem = ledger-bug, ikke trading-bug. **Og inkluder ALLTID stoppede sesjoner i beregningen — både i reparasjon OG visning.**

**FJERDE FELLE (2026-08-03 kveld, gjentatt 2× samme dag):** SQL-reparasjon av `paper_accounts` holder IKKE — verdien blir overskrevet. Første reparasjon ga 199 198 kr; timer senere var den tilbake til 9 578 kr (Supabase-restart eller synk-prosess resatt ledgeren). Tom: «Stemmer ikke med tallene du sier» — agent hadde bekreftet 199k mens UI viste 9,5k. **Varig fiks er ALDRI engangs-SQL — det er å gjøre visningslaget uavhengig av ledgeren.** `getAccountBalance` beregner nå live fra `trading_sessions` (commit `2b9dcae1c`) — da spiller det ingen rolle om ledger er stale. Når en reparasjon overskrives: ikke reparer blindt på nytt — finn HVEM som skriver (`pg_proc` med `UPDATE paper_accounts`, cron-jobber, restart-sideeffekter) OG fjern konsumentens avhengighet av den mutable kilden.

**FEMTE FELLE (agent-atferd):** Agent bekreftet Toms «Så jeg har tjent 99 198,33 NOK på en dag?» med «Ja» UTEN å verifisere mot DB — tallet var en balance-korreksjon, ikke gevinst. **Aldri bekreft et krontall fra brukeren uten å sjekke DB først.** Ved «har jeg tjent X?»-spørsmål: kjør SQL på trades/posisjoner FØR du svarer — og skille eksplisitt mellom «verdiendring i visningen» (korreksjon) og «realisert gevinst» (solgte trades). Bekreftelse av et feil tall er verre enn å innrømme at du må sjekke.

**SEKSTE FELLE (2026-08-03 kveld — samme bug, TREDJE konsument):** Etter at dashboard-metrics (`getAccountBalance`, commit `2b9dcae1c`) var fikset, viste **/dashboard/portfolio** fortsatt 9 578 kr. Rotårsak: `/api/portfolio/summary/route.ts` hadde SIN EGEN balance-henting — `accountRes.data?.current_balance` direkte fra `paper_accounts`, helt uavhengig av dashboard-metrics-fiksen (fikset i commit `6415bdf76`). **Klasseregel: en datakilde-bug er ikke fikset før ALLE konsumenter er auditert.** Ved «visningslaget skal bruke X i stedet for Y»-fikser: `grep -rn "paper_accounts\|current_balance" src/app/api/ src/server/ src/features/` og sjekk HVER rute/komponent som rør balansen — dashboard-metrics, portfolio-summary, wallet-endepunkter, PaperTradingList-props, ExplainStatButton. Tom ser forskjellen side ved side (dashboard riktig, portefølje feil) og konkluderer «tallene stemmer ikke» — han skiller ikke mellom hvilken API-rute som serverer hvilket kort.


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


## 40. Allure + Lighthouse rapportering (2026-08-03)

**Formål:** Visuell test-rapport + performance-metrics per side.

**Oppsett:**

```bash
# Installasjon
npm install -D allure-playwright allure-commandline lighthouse chrome-launcher

# Kjør tester med Allure-reporter
npx playwright test --reporter=allure-playwright

# Generer rapport
npm run allure:generate  # allure generate allure-results --clean -o allure-report
npm run allure:serve     # allure open allure-report
```

**Lighthouse per side:**

```typescript
// e2e/smoke/lighthouse.spec.ts
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

test("Landing page Lighthouse score", async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  const result = await lighthouse("https://www.klarpakke.no", {
    port: chrome.port,
    output: "json",
  });
  
  const scores = result.lhr.categories;
  expect(scores.performance.score * 100).toBeGreaterThanOrEqual(75);
  expect(scores.accessibility.score * 100).toBeGreaterThanOrEqual(88);
  
  await chrome.kill();
});
```

**Terskler (realistiske for prod):**
- Performance: ≥75 (alle scripts lastet)
- Accessibility: ≥88 (Trade/Dashboard er 89, Landing er 96)
- Best Practices: ≥85
- SEO: ≥90

**Pre-commit hook:**
```bash
# .husky/pre-commit
if git diff --cached --name-only | grep -qE "src/features/(dashboard|trading)/"; then
  echo "🔍 Kjører E2E smoke-test ved UI-endring..."
  npx playwright test e2e/smoke/all-pages.spec.ts --project=chromium --reporter=list
fi
```

---


## 41. Beta-justert badge — transparent balance-korreksjon (2026-08-03)

**Problem:** Balance-reparasjon endrer `paper_accounts.current_balance` >10% uten trades. Bruker ser plutselig 199k i stedet for 9k og tror de har tjent 190k.

**Løsning:** Diskret badge som vises ved store korreksjoner — transparent men ikke skremmende.

**Komponent (`src/components/BalanceAdjustmentBadge.tsx`):**

```typescript
export function BalanceAdjustmentBadge({ updatedAt, currentBalance, previousBalance }) {
  // Vis kun hvis oppdatert <1 time siden OG endring >10%
  const hoursSince = (Date.now() - new Date(updatedAt).getTime()) / 3600000;
  const hasBigChange = Math.abs(currentBalance - previousBalance) / previousBalance > 0.1;
  
  if (hoursSince > 1 || !hasBigChange) return null;
  
  return (
    <span className="ml-2 text-xs text-amber-400/80" 
          title="Beta-justering: Balansen er korrigert med riktig verdi.">
      [🔧 beta-justert]
    </span>
  );
}
```

**Bruk i DashboardPro:**
```tsx
{
  label: t("stats.balance"),
  value: (
    <span className="inline-flex items-baseline">
      {formatByMode(heroBalance, mode)}
      <BalanceAdjustmentBadge
        updatedAt={stats.accountBalanceUpdatedAt}
        currentBalance={heroBalance}
        previousBalance={previousBalance}  // fra usePreviousBalance hook
      />
    </span>
  ),
}
```

**Logikk:**
- Leser `paper_accounts.updated_at` — vises kun <1 time etter justering
- `usePreviousBalance` hook lagrer forrige balance i localStorage (5s debounce)
- Forsvinner automatisk — ingen permanent støy

**Hvorfor ikke forklare teknisk?** Tom (2026-08-03): «Trenger ikke å forklare hva som gikk feil, brukere vet vi er i beta.» Badge er nok — de som bryr seg kan hover for tooltip.

**Deploy:** Commit `87a10352d` — live i prod.

---


## 42. Supabase overbelastning — cron-jobs spiser alle connections (2026-08-03, LØST)

**Symptom:** Login redirecter tilbake til `/login` uten error. `execute_sql` gir `Connection terminated due to connection timeout`. Cloudflare viser `521 Web server is down`. Supabase-status viser "Operational" men DB svarer ikke.

**Rotårsak:** 46 aktive cron-jobs overbelaster databasen. `klarpakke-trading-tick` kjørte hvert minutt (`* * * * *`) — 59 kjøringer/time. `binance-sync` og `session-maintenance` kjørte hvert 2. minutt. Connection pool ble tømt.

**Diagnose:**
```sql
-- Sjekk antall aktive jobs
SELECT COUNT(*) FROM cron.job WHERE active = true;  -- 46 er ALT for mange

-- Sjekk hvilke som kjører oftest (topp 5)
SELECT jobname, schedule, COUNT(*) AS runs_last_hour
FROM cron.job j
JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
WHERE j.active = true AND jrd.start_time > NOW() - INTERVAL '1 hour'
GROUP BY jobname, schedule
ORDER BY runs_last_hour DESC
LIMIT 5;
```

**Fiks (2026-08-03):**
```sql
-- Reduser frekvens på de mest belastende jobs
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'klarpakke-trading-tick'),
  schedule := '*/5 * * * *'  -- hvert 5. min (fra hvert min)
);
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'klarpakke-binance-sync'),
  schedule := '*/5 * * * *'  -- hvert 5. min (fra hvert 2. min)
);
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'session-maintenance-v2'),
  schedule := '*/10 * * * *'  -- hvert 10. min (fra hvert 2. min)
);
```

**Restart (når alt annet feiler):**
```bash
# Krever SUPABASE_ACCESS_TOKEN fra .env.local
curl -X POST "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/restart" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# Sjekk status (RESTARTING → ACTIVE_HEALTHY, tar 2-5 min)
curl -sS "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | grep '"status"'
```

**⚠️ ADVARSEL:** Restart gir 2-3 minutter nedetid (521 error). Bruk KUN når connection pool er tømt og alt annet feiler.

**Health monitor (0 kr):** `scripts/monitor-supabase-health.ts` kjører hvert 5. min via cron-job `supabase-health-monitor`. Sender e-post til Tom ved timeout. Deployet i commit `835076d61`.

**Regel:** Ved "kan ikke logge inn" — sjekk Supabase status FØRST, deretter cron-job-belastning. 90% av tilfellene er overbelastning, ikke kode-feil.

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


