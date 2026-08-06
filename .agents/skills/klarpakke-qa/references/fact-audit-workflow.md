# FACT-AUDIT — Systematisk tallverifisering (oppdatert 2026-07-27)

Tom-regel: **Alle tall og påstander på siten skal kunne spores til reell data.** Ingen unntak.
Ingen placeholder-tall, ingen AI-generert innhold som late-som-ekte, ingen hardkodede tellere.

## Når skal FACT-AUDIT kjøres?

- Etter ALLE endringer som legger til, endrer eller fjerner tall/påstander i UI
- Etter innholdsarbeid (i18n, marketing, testimonials, leaderboard)
- Før deploy av nye features som viser data
- Som pre-launch check etter K3-arkitektur-implementasjon

## Workflow (5 steg)

### 1. Auditer alle tall mot datakilden

For hvert tall på siten:
```
Påstand | Datakilde (tabell/API) | Verifisert verdi | Status
```

Status: 🔴 FEIL (må fikses) | 🟡 GUL (må verifiseres) | 🟢 GRØNN (verifisert OK)

### 2. Sjekk spesielt disse kategoriene

| Kategori | Hva du leter etter | Vanligste syndere |
|---|---|---|
| Avkastningstall | Er +X% reelt? | Hero, leaderboard, testimonials |
| Leaderboard | Ekte brukere, ikke seed-data? Bot-navn? Testkontoer? | display_name, PnL-tall, user_id |
| Testimonials | AI-generert? Disclaimer tilstrekkelig? | Hardkodede navn/sitater |
| Teller-påstander | "100+", "10k+" — stemmer mot COUNT(*)? | CredibilityHighlights, marketing |
| Priser/P&L | Live eller mock? | Ticker, dashboard, posisjonskort |
| AI-data | Kommer fra reelt system eller placeholder? | Agent-stemmer, analyser |
| i18n-lekkasjer | Norsk tekst på /en? Rå nøkler ("landing.metadata.title")? | Nav, footer, ticker |
| Brand-konsistens | "Klarpakke Universitet" vs "Klarpakke"? | base.brand, tagline, aboutUs |

### 3. Fiks alle 🔴-funn

Prioritet: tall som vises på offentlige sider > tall bak innlogging > arkitektur-specs.

**Rekkefølge:** FIKS 1 (haster) → FIKS 2 → FIKS 3 → ... → deploy → curl-verifiser → uavhengig sjekk.

### 4. Deploy og curl-verifiser

Verifikasjonsmønstre:

```bash
# Leaderboard — ingen bot-navn eller testkontoer
curl -s https://www.klarpakke.no/api/leaderboard | python3 -c "
import sys, json
data = json.load(sys.stdin)
bots = ['Anne Mo','Ingrid Sol','Lars Vik','Kari Aas','Marte Hav',
        'Per Berg','Bjørn Fjell','Trond Dal','Silje Lund','Ola Nordmann']
names = [d['user_display_name'] for d in data]
has_bot = any(n in bots for n in names)
has_test = any('tom+' in n.lower() or 'sim' in n.lower() or 'verify' in n.lower() or 'sitat' in n.lower() for n in names)
print(f'Entries: {len(data)} | Bot names: {has_bot} | Test: {has_test}')
print(f'Top return_pct: {sorted([d[\"return_pct\"] for d in data], reverse=True)[:3]}')
"

# Hero — riktig avkastningstall
curl -sL https://www.klarpakke.no/en | grep -o '+[0-9]*%'

# i18n-lekkasjer på /en
curl -sL https://www.klarpakke.no/en | grep -c 'Lær\|Priser'  # skal være 0

# /jokertrade offentlig
curl -s -o /dev/null -w '%{http_code}' https://www.klarpakke.no/en/jokertrade  # skal være 200

# Rå i18n-nøkler
curl -sL https://www.klarpakke.no/en | grep -c 'landing\.metadata\.title'  # skal være 0
```

### 5. Oppdater FACT-AUDIT.md med live-verifisering

Sett fiksede rader til 🟢 med dato og commit-hash. La brukeren gjøre uavhengig verifisering.

## Leaderboard — nåværende implementasjon (2026-07-27)

Leaderboard bygges nå fra:
- `paper_accounts` — reell balanse (return_pct = (balance - 100000) / 100000 * 100)
- `trading_stats` — antall handler, win-rate
- `user_profiles` — display_name, avatar

Filtrering:
1. **Bot-svarteliste** — `BOT_DISPLAY_NAMES` Set med 10 AI-genererte navn
2. **Testkonto-filter** — `isTestAccount()`: tom+sim, tom+verify, Direct Test, Viking Trader
3. **Display_name-validering** — `sanitizeDisplayName()`: strip HTML, normalize quotes, fjern kontrolltegn, avvis emoji/spesialtegn, max 50 tegn
4. **Minimum trades** — `total_trades < 1` → ekskludert

Kilde: `src/app/api/leaderboard/route.ts`

## Paper-trading DB-pris-fallback

Når Binance API er blokkert fra Cloudflare Workers IP:
1. Prøv Binance (proxy → direct → 7 fallback-endpoints → CoinGecko)
2. Hvis ALT feiler: fallback til `coin_prices` tabellen (DB-cachet pris)
3. Viser fortsatt feilmelding hvis DB-pris også mangler

Kilde: `src/app/api/paper-trading/execute/route.ts`

## Hero-avkastning dynamisk

Hero subtitle bruker `t("hero.subtitle", { pct })` med `{pct}`-interpolering.
`pct` hentes fra `paper_accounts` (topp current_balance) server-side i `page.tsx`.
Fallback: 316.

Kilde: `src/app/[locale]/page.tsx`, `src/components/landing/HeroSection.tsx`

## Eksempel: full audit-syklus (2026-07-27)

| Påstand | Fant | Faktisk | Fiks | Commit |
|---|---|---|---|---|
| "+343% for våre beste brukere" | Topp +321% | +321% (dynamisk) | i18n-interpolering | 270707f0b |
| "Anne Mo" etc. på leaderboard | AI-navn + testkontoer | Ekte navn filtrert | Bot/test-filter + validering | 9193d02dc |
| "100+ fornøyde studenter" | 37 ekte brukere | "37+ norske brukere" | Endre tekst | e4c3574d1 |
| "Marius L." testimonial | AI-generert | Fjernet | Fjern komponent | e4c3574d1 |
| "100+ Grunnleggere" badge | Ingen founder-data | "Voksende community" | Endre tekst | d254946da |
| "En av de første 100" | Ingen founder-data | "Tidlig bruker" | Endre tekst | d254946da |
| Norsk nav på /en | Hardkodet FALLBACK | "Learn"/"Pricing"/"About" | Engelsk fallback | d254946da |
| "landing.metadata.title" | Manglet i18n-nøkkel | Lagt til i 4 locales | i18n-fix | d254946da |
| /jokertrade → 307 login | auth middleware | 200 (offentlig landing) | Fjern fra PROTECTED_PATHS | d254946da |
| "Nettverksfeil" paper-trading | Binance blokkert fra CF | DB-pris-fallback | coin_prices fallback | 270707f0b |
