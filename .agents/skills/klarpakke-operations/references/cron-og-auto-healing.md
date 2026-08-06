# Cron Og Auto Healing

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 8. Session auto-healing — varig løsning mot fastlåste sesjoner (2026-07-27)

**Symptom:** Bruker rapporterer «JokerTrade er paused» eller «ingenting skjer». Sesjonen har `status = 'paused'` men ingen trade-feil.

**Root cause:**
1. Sesjon opprettes med `status: "active"`, `last_heartbeat: now()`
2. Cron/tick når aldri å prosessere sesjonen → heartbeat forblir stuck
3. `detect_crashed_sessions` (pg_cron, hvert min) setter `crashed` etter 5 min
4. MEN: noen sesjoner blir `paused` uten å gå via `crashed` (manuell pause, circuit breaker)
5. Gammel `recover_crashed_paper_sessions()` håndterte KUN `crashed` — `paused` ble permanent fastlåst

**Varig fiks:**

```sql
-- heal_stale_sessions() — erstatter recover_crashed_paper_sessions()
CREATE OR REPLACE FUNCTION heal_stale_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE healed_count integer;
BEGIN
    WITH healed AS (
        UPDATE trading_sessions
        SET status = 'active', last_heartbeat = NOW(), last_tick_at = NOW(),
            updated_at = NOW(), error_message = NULL, stopped_at = NULL
        WHERE (
            (status = 'paused' AND last_heartbeat < NOW() - INTERVAL '3 minutes')
            OR (status = 'crashed' AND stopped_at IS NULL AND started_at > NOW() - INTERVAL '7 days')
        )
        AND mode = 'paper' AND archived = FALSE
        RETURNING id
    ) SELECT COUNT(*) INTO healed_count FROM healed;
    RETURN healed_count;
END;
$$;
```

Kalles fra `src/app/api/cron/tick/route.ts` og `src/app/api/cron/ai-engine/route.ts`:
```typescript
try { await db.rpc("heal_stale_sessions" as never); } catch { /* best effort */ }
```

**Verifiser:** `SELECT heal_stale_sessions() as healed_count;` — bør returnere >0 første gang.

**Merk:** `as never` cast nødvendig inntil `database.types.ts` regenereres via `mcp__supabase__generate_typescript_types`.

---


## 17. Stripe-betaling — prising, Vipps, Workers-konfigurasjon

Se `references/stripe-payments-ops.md` for full arbeidsflyt: three-way price verification
(Stripe ↔ DB ↔ i18n), Vipps-aktivering, NEXT_PUBLIC_-variabler i wrangler.jsonc, og
teste checkout uten nettleser.


## 18. Coin Price Update Cron — no-agent bash-script hvert 5. minutt

**Når:** Du skal sette opp (eller feilsøke) cron for å oppdatere `coin_prices`-tabellen med sanntidspriser fra Binance via proxy.

**Workflow:** Bash-script som kaller Supabase Edge Function `binance-proxy` → parser 24hr ticker → konverterer USDT→NOK → upsert til `coin_prices` via Supabase REST API. Kjøres som Hermes no-agent cron (scriptet er hele jobben, ingen LLM-kostnad).

### Script-mønster (scripts/update-coin-prices.sh)

```bash
# 1. Les secrets fra .env.local
BINANCE_PROXY_SECRET=$(grep '^BINANCE_PROXY_SECRET=' .env.local | sed 's/^BINANCE_PROXY_SECRET=//' | tr -d '\n')
SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | sed 's/^SUPABASE_SERVICE_ROLE_KEY=//' | tr -d '\n')
SUPABASE_ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | sed 's/^NEXT_PUBLIC_SUPABASE_ANON_KEY=//' | tr -d '\n')

# 2. Bygg URI-encoded symbol-array (⚠️  Python json.dumps legger TIL MELLOMROM!)
SYMBOLS_JSON=$(printf '%s\n' "${SYMBOLS[@]}" | python3 -c \
  "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()], separators=(',',':')))")
ENCODED_SYMBOLS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SYMBOLS_JSON'))")

# 3. Kall proxy (single-line body — multiline brekker curl)
PROXY_RESPONSE=$(curl -s --max-time 10 \
  -X POST "$SUPABASE_URL/functions/v1/binance-proxy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-binance-proxy-secret: $BINANCE_PROXY_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"action\":\"publicApi\",\"publicApiPath\":\"/api/v3/ticker/24hr?symbols=${ENCODED_SYMBOLS}\"}")

# 4. Parser + USDT→NOK (rate: 9.61) — Python f-string-innmat må unngå
#    nestede enkle anførselstegn når koden er inni shell double quotes.
#    Bruk .format() i stedet for f'{}'.
UPSERT_JSON=$(echo "$PROXY_RESPONSE" | python3 -c "
import sys, json
NOK_RATE = float('9.61')
records = []
for t in json.load(sys.stdin)['data']:
    records.append({
        'symbol': t['symbol'],
        'name': t['symbol'].replace('USDT', ''),
        'price': round(float(t['lastPrice']) * NOK_RATE, 2),
        'price_change_24h': round(float(t['priceChange']) * NOK_RATE, 2),
        'price_change_percent_24h': round(float(t['priceChangePercent']), 4),
        'last_updated': '$NOW_ISO',
    })
print(json.dumps(records))
")

# 5. Upsert til Supabase REST API — ?on_conflict OBLIGATORISK!
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${REST_ENDPOINT}?on_conflict=symbol" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$UPSERT_JSON")
```

### Kritisk: Supabase REST API upsert

`coin_prices` har UNIQUE constraint på `symbol`, men `id` er PRIMARY KEY (UUID).
POST uten `?on_conflict=symbol` gir HTTP 409 "duplicate key value". Den KORREKTE måten:

| Hva | Hvordan |
|---|---|
| POST-endepunkt | `${REST_ENDPOINT}?on_conflict=symbol` |
| Prefer-header | `resolution=merge-duplicates` |
| Auth | `service_role` key (RLS krever service_role for writes) |

**Uten `?on_conflict=symbol` → 409. Med begge → korrekt upsert.**

### Fallgruver

| Problem | Symptom | Fiks |
|---|---|---|
| Python json.dumps spaces | Proxy svarer "All public API endpoints failed" | `separators=(',',':')` |
| Shell multiline curl body | Proxy feiler | Én-linje JSON i `-d` |
| Nested quotes i Python f-string | Python syntax error (stille, `2>/dev/null`) | Bruk `.format()` i stedet for f'{\"key\"}' |
| Mangler `?on_conflict=symbol` | HTTP 409 | Legg til URL-parameter |
| `hermes cron create` feiler | `No module named 'urllib3.exceptions'` | Manuelt i `~/.hermes/cron/jobs.json` |

### Hermes cron setup

```bash
# Script installeres i ~/.hermes/scripts/ (kopi fra prosjektet)
cp klarpakke/scripts/update-coin-prices.sh ~/.hermes/scripts/
chmod +x ~/.hermes/scripts/update-coin-prices.sh

# Opprett no-agent cron (script = hele jobben)
hermes cron create "every 5m" \
  --name "update-coin-prices" \
  --script update-coin-prices.sh \
  --no-agent \
  --workdir /Users/taj/klarpakke
```

**Fallback** ved `hermes cron create` feil: rediger `~/.hermes/cron/jobs.json` direkte — legg til et nytt job-objekt i `jobs[]`-arrayen med `mode: "no-agent"`, `script: "update-coin-prices.sh"`, `workdir: "/Users/taj/klarpakke"`, og `schedule: {kind: "interval", minutes: 5, display: "every 5m"}`.

### Verifisering

```bash
hermes cron run <job_id>      # Kjør manuelt
bash scripts/update-coin-prices.sh  # Kjør direkte
# Sjekk DB:
curl -s "$SUPABASE_URL/rest/v1/coin_prices?select=symbol,price,last_updated&order=name.asc" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -m json.tool
```

Se `references/coin-prices-cron.md` for fullt script og komplett debugging-transcript.

**Når:** Du må varsle admin (tomarnejensen@gmail.com) ved kritiske feil — negative kapitaler, sesjonskræsj, deploy-feil, høy feilrate.

**Løsning:** `src/lib/trading/alerting.ts` — sendAlert() via Resend + RateLimiter per type.

**Arkitektur:**

```typescript
// 6 alert-typer:
type AlertType =
  | 'negative_capital'    // critical — negativ kapital oppdaget
  | 'extreme_growth'      // warning — kapital > 10× startkapital
  | 'negative_position'   // critical — negativ beholdning
  | 'session_crash'       // critical — trading-sesjon krasjet
  | 'high_error_rate'     // warning — feil i bot_health siste 5 min
  | 'deploy_failure'      // critical — deploy feilet
```

**Key patterns:**

1. **sendAlert(alert):** Bruker `sendEmail()` fra `@/lib/email/resend.ts` med `adminNotification` template. Sender til `tomarnejensen@gmail.com` fra `Klarpakke Alarmer <alerts@klarpakke.no>`.

2. **RateLimiter klasse:** In-memory `Map<string, number[]>` — lagrer timestamps per alert-type. `canSend(type)` returnerer true hvis færre enn 1 alert av typen har blitt sendt siste 60 min. `record(type)` legger til timestamp. Pruning av gamle timestamps skjer automatisk.

3. **checkAndSendAlerts(violations):** Kobler direkte til `session-invariants.ts`:
```typescript
import { checkAllInvariants, type InvariantViolation } from "@/lib/trading/session-invariants";
import { checkAndSendAlerts } from "@/lib/trading/alerting";

const violations = checkAllInvariants(sessions, positions, exemptUserIds);
const { sent, alerts } = await checkAndSendAlerts(violations);
```

4. **sendDeployFailureAlert(env, error):** Convenience-funksjon for deploy-feil-meldinger.

**Singleton:** `alertRateLimiter` — en instans delt på tvers av appen (modul-scope).

**Fallgruve:** RateLimiter er in-memory — nullstilles ved Worker restart. Ikke egnet for kritiske alarmer som må være durable på tvers av restart, men tilstrekkelig for varsling pr. time.


