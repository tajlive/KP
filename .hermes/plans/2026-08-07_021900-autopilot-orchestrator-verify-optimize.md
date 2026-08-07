# Autopilot Orchestrator — Verifisering og Optimalisering

> **For Hermes:** Use `klarpakke-architect` skill for infrastructure context + `klarpakke-trading-strategy` for grid-config decisions.

**Goal:** Verifiser at autopilot-orchestrator startes vellykket for Tom, og optimaliser grid-konfigurasjonen for dagens lavvolum-marked.

**Architecture:** pg_cron (jobb 1176, hvert 5. min) → `POST /api/cron/autopilot-orchestrator` → `processAutopilotUser` → `scanPortfolio` → `allocateCapital` → `runGridTick` per par → UPSERT `autopilot_state.grid_levels`.

**Tech Stack:** Cloudflare Workers (Next.js), Supabase (pg_cron + DB), Kraken API, `src/lib/trading/autopilot/orchestrator.ts`

---

## Nåværende tilstand

| Hva                      | Status                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Kraken API-nøkler        | ✅ Lagret i `user_kraken_keys` (kryptert AES-256-GCM)          |
| autopilot_state          | ⚠️ `activated=true` men `grid_levels=[]` (0 nivåer)            |
| Kraken balanse           | ✅ $153.10 (SOL=0.226, USDC=102.61, ETH=0.00466, BTC=0.000392) |
| Åpne ordrer              | ✅ 11 buy-orders (3 SOL, 4 ETH, 4 BTC) — **ingen fills**       |
| pg_cron jobb 1176        | ✅ `*/5 * * * *` → POST med korrekt Bearer secret              |
| getTicker multi-pair bug | ✅ Fikset (`getTickers` metode, deployet)                      |
| withAuth på API          | ✅ Deployet                                                    |

## Markedskontekst (7. august 2026)

- **BTC**: $64,200–$64,300 — sideways, lav volatilitet
- **ETH**: $1,899 — rett ved Toms høyeste kjøpsnivå ($1,899.69)
- **SOL**: $72.60 — over alle Toms kjøpsnivåer ($70.11–$71.90)
- **Volum**: 24t $57B — historisk lavt (CoinGecko)
- **Sentiment**: Forsiktig. ETF-utstrømming, Coinbase rapporterte 17% inntektsfall. "Choppy August" — Pickaxe/CryptoSlate

**Konklusjon**: Markedet er i en lavvolum-konsolideringsfase. Grid-strategien er riktig for dette miljøet (tjener på små bevegelser), men nivåene må plasseres med tettere spacing.

---

## Task 1: Trigger orchestrator manuelt og verifiser første kjøring

**Objective:** Kjør `POST /api/cron/autopilot-orchestrator` med CRON_SECRET og bekreft at `processAutopilotUser` legger grid-nivåer for Tom.

**Files:**

- Trigger: `curl -X POST https://www.klarpakke.no/api/cron/autopilot-orchestrator`
- Les resultat: `src/app/api/cron/autopilot-orchestrator/route.ts` (eksisterende)
- Verifiser: `SELECT grid_levels FROM autopilot_state WHERE user_id = '0dd08529-...'`

**Step 1: Trigger manuell kjøring**

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" /Users/taj/klarpakke/.env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)

curl -s -X POST "https://www.klarpakke.no/api/cron/autopilot-orchestrator" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" 2>&1 | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(f'Processed: {d.get(\"processed\",0)}')
print(f'Errors: {d.get(\"errors\",0)}')
for e in d.get('error_details',[]):
    print(f'  ❌ {e[\"user_id\"][:8]}...: {e[\"error\"][:120]}')
print(f'Duration: {d.get(\"duration_ms\",\"?\")}ms')
"
```

Expected: `processed=1, errors=0` — Tom skal prosesseres og grid_levels fylles.

**Step 2: Verifiser grid_levels i DB**

```sql
SELECT
  grid_levels,
  current_equity_usdc,
  open_orders_count,
  last_run
FROM autopilot_state
WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
```

Expected: `grid_levels` skal ha ~11 entries (5 BTC + 5 ETH + 1 SOL, eller tilsvarende basert på $153 equity). `current_equity_usdc` ≈ 153.

**Step 3: Hvis feil — debug**

Vanlige feil:

- `no_kraken_keys` → nøkler mangler i `user_kraken_keys` (usannsynlig, vi har sjekket)
- `EGeneral:Temporary lockout` → Kraken rate-limit. Vent 60s og prøv igjen
- `Kraken API error: EAPI:Invalid key` → nøklene har utgått
- Ingen feil men 0 nivåer → `fetchAutopilotUsers` fant ikke Tom (sjekk `autopilot_state.activated=true`)

---

## Task 2: Analyser grid-avstander mot nåværende marked

**Objective:** Sjekk om Toms grid-nivåer har riktig spacing for lavvolum-markedet.

**Files:**

- Grid-config: `src/lib/trading/kraken-grid-config.mjs`
- Orkestrator spacing: `src/lib/trading/autopilot/orchestrator.ts:229-276` (`buildInitialBuyLevels`)

**Step 1: Les nåværende grid-config**

```bash
cat src/lib/trading/kraken-grid-config.mjs | grep -A5 "spacing\|MIN_LEVEL\|PAIR_CFG"
```

**Step 2: Sammenlign med dagens priser og volatilitet**

BTC: $64,270 — daglig volatilitet ~1% → spacing bør være 0.5% (ikke 1%)
ETH: $1,899 — daglig volatilitet ~1.2% → spacing 0.6% er OK  
SOL: $72.60 — daglig volatilitet ~1.5% → spacing 0.8% er OK

**Step 3: Vurder justeringer**

Hvis spacing er > 1% for BTC i et 1%-volatilitetsmarked → nivåene treffes nesten aldri. Reduser spacing til 0.5% for BTC i rolige perioder.

---

## Task 3: Legg til 5-par-aktivering (ADA + DOT)

**Objective:** Ved equity ≥ $250, aktiver ADAUSDC og DOTUSDC for diversifisering.

**Files:**

- Orkestrator: `src/lib/trading/autopilot/orchestrator.ts:312-320` (`eligiblePairs`)
- Kill-switch: `src/lib/trading/kraken-kill-switch.ts` (`shouldActivateFivePair`)
- Grid-config: `src/lib/trading/kraken-grid-config.mjs` (må ha ADAUSDC + DOTUSDC i PAIR_CFG)

**Step 1: Sjekk om ADA + DOT har PAIR_CFG**

```bash
grep -E "ADAUSDC|DOTUSDC" src/lib/trading/kraken-grid-config.mjs
```

**Step 2: Sjekk om Toms equity utløser 5-par**

Equity = $153.10. Terskel = $250. Ikke aktivert ennå. Ingen endring nødvendig — vil aktiveres automatisk når equity vokser.

**Step 3: Verifiser at `shouldActivateFivePair` fungerer**

Testen i `orchestrator.test.ts` dekker allerede dette via `five_pair_activated` i stateRow.

---

## Task 4: Overvåkning — cron watchdog for orchestrator-helse

**Objective:** Sett opp Hermes-cron som varsler hvis orchestrator ikke har kjørt på > 10 minutter.

**Files:**

- Watchdog script: `~/.hermes/scripts/kraken-orchestrator-watchdog.sh`
- Cron job: `hermes cron create`

**Step 1: Lag watchdog-script**

```bash
#!/bin/bash
# Sjekk om autopilot_state.last_run er nyere enn 10 min
RESULT=$(curl -s "https://www.klarpakke.no/api/kraken/autopilot-state" \
  -H "Authorization: Bearer $CRON_SECRET" 2>/dev/null)

LAST_RUN=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('last_run',''))" 2>/dev/null)

if [ -z "$LAST_RUN" ]; then
  echo "❌ Kunne ikke hente autopilot last_run"
  exit 1
fi

NOW=$(date +%s)
RUN_TS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST_RUN%%.*}" +%s 2>/dev/null || echo 0)
DIFF=$((NOW - RUN_TS))

if [ $DIFF -gt 600 ]; then
  echo "⚠️ Autopilot-orchestrator har ikke kjørt på ${DIFF}s (>10 min)!"
  echo "Sist kjørt: $LAST_RUN"
  exit 1
fi
# Stille når alt er OK
```

**Step 2: Opprett cron-job**

```bash
hermes cron create --name "orchestrator-watchdog" --schedule "5m" \
  --script "kraken-orchestrator-watchdog.sh" --no_agent --deliver origin
```

---

## Risikoer

| Risiko                                                               | Sannsynlighet | Mitigering                                                                                                                                            |
| -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kraken rate-limit blokkerer orchestrator                             | Middels       | Orchestrator har 3 retries per kall. Vent 60s mellom manuelle triggere                                                                                |
| Ingen fills på grunn av lav volatilitet                              | Høy           | Grid-strategi tjener OGSÅ i lavvol-markeder — nivåene treffes, bare sjeldnere. Ikke en feil, men en markedskarakteristikk                             |
| orchestrator legger ordrer som dupliserer eksisterende Kraken-ordrer | Lav           | `buildInitialBuyLevels` kjører kun første gang (persisted.length===0). Eksisterende ordrer i `autopilot_state.grid_levels` forhindrer duplikat-nivåer |
| pg_cron timeout (Cloudflare 60s CPU-grense)                          | Lav           | Ruten har 55s timeout-guard + batch-parallellisering                                                                                                  |

---

## Verifiseringskriterier

- [ ] `POST /api/cron/autopilot-orchestrator` returnerer `processed>=1, errors=0`
- [ ] `autopilot_state.grid_levels` har > 0 entries for Tom
- [ ] Live-siden viser grid-nivåer (ikke "0 nivåer")
- [ ] Kraken har nye limit-orders som matcher orchestrator-nivåene
- [ ] Watchdog-cron er aktiv og varsler ved feil
