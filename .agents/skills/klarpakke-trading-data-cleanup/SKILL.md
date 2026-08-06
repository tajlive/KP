---
name: klarpakke-trading-data-cleanup
description: Use when cleaning up corrupted trading data (balances, positions, inflated
  P&L) and preventing recurrence.
version: 1.0.0
author: Hermes Lead Architect
whenToUse: Når bruker ber om opprydding av korrupte trading-data.
---

# Klarpakke Trading Data Cleanup

## Når trigges

Etter bugs som har forurenset trading-data:
- Inflerte paper-sesjoner (kapital/PnL i millioner fra tick-kvantum-bug)
- Ugyldige trades (negativ kvantitet, blandet valuta, dobbelkonvertering)
- Arkivert + aktiv samtidig
- Flere aktive paper-sesjoner per bruker
- `paper_accounts` ute av sync med `trading_sessions`

## Prinsipper

1. **System-nivå** — fiks ALLE brukere, aldri per-konto.
2. **Idempotent** — migrasjoner skal kunne kjøres flere ganger.
3. **Vis SQL-diff før kjøring** — DB er hellig.
4. **Varig fiks** — data + constraints/triggere/indexer for å forhindre gjentakelse.
5. **Verifiser etterpå** — kjør diagnostiske tellere for å bekrefte null gjenværende problemer.

## Prosess

### 1. Diagnostiser omfanget

```sql
-- Inflerte aktive sesjoner
SELECT COUNT(*), ROUND(SUM(current_capital_nok)::numeric,0)
FROM trading_sessions
WHERE mode = 'paper' AND status = 'active'
  AND (current_capital_nok > 1000000 OR total_pnl > 1000000);

-- Inkonsistent state
SELECT COUNT(*) FROM trading_sessions WHERE archived = true AND status = 'active';

-- Ugyldige trades
SELECT COUNT(*) FROM trades WHERE quantity < 0 OR price <= 0 OR total_value < 0;

-- Brukere med >1 aktiv paper-sesjon
SELECT COUNT(*) FROM (
  SELECT user_id FROM trading_sessions
  WHERE mode='paper' AND status='active'
  GROUP BY user_id HAVING COUNT(*) > 1
) x;

-- Balance mismatch
SELECT COUNT(*) FROM paper_accounts pa
JOIN user_profiles up ON pa.user_id = up.id
WHERE ABS(pa.current_balance - up.paper_balance) > 1;
```

### 2. Skriv idempotent migrasjon

Filnavn: `supabase/migrations/YYYYMMDDhhmmss_<beskrivelse>.sql`

Eksempel:

```sql
BEGIN;

-- Stopp arkiverte sesjoner som feilaktig er markert aktive
UPDATE trading_sessions
SET status = 'stopped'
WHERE archived = true AND status = 'active';

-- Slett ugyldige trades
DELETE FROM trades
WHERE quantity < 0;

-- Kun én aktiv paper-sesjon per bruker
WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at DESC) AS rn
  FROM trading_sessions
  WHERE mode = 'paper' AND status = 'active'
)
UPDATE trading_sessions ts
SET status = 'stopped'
FROM ranked r
WHERE ts.id = r.id AND r.rn > 1;

COMMIT;

-- Preventive constraints/indexer
ALTER TABLE trades ADD CONSTRAINT trades_quantity_positive CHECK (quantity > 0);

CREATE UNIQUE INDEX idx_one_active_paper_session_per_user
ON trading_sessions (user_id)
WHERE mode = 'paper' AND status = 'active';

CREATE OR REPLACE FUNCTION prevent_archived_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.archived = true AND NEW.status = 'active' THEN
        RAISE EXCEPTION 'Arkivert sesjon kan ikke være aktiv';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_archived_active
BEFORE INSERT OR UPDATE ON trading_sessions
FOR EACH ROW EXECUTE FUNCTION prevent_archived_active();
```

### 3. Kjør og verifiser

```bash
# Apply via MCP eller Supabase CLI
npx supabase migration up

# Verifiser
cd /Users/taj/klarpakke && npm run test:unit
```

## Vanlige scenarioer

| Symptom | Sannsynlig årsak | Hovedfiks |
|---|---|---|
| Aktiv sesjon med 3M+ kapital | Tick-kvantum-inflasjon | Sett `status='stopped'`, behold `archived=true` |
| Aktiv sesjon med 100M+ kapital etter SmartTrader | USDT/NOK-blanding + posisjonssymbol-mismatch | Stopp alle paper-sesjoner, slå av `smart_trader_enabled`, deploy fiks, resett saldoer |
| Alt-coin `entry_price` < 10% av markedspris (f.eks. 2 500% falsk gevinst) | Orphan-adopsjon dobbeltkonvertering (USDT skrevet til NOK-kontrakt-felt) | Reset `entry_price`/`highest_price` til `coin_prices.price` (behold qty/entry_time), verifiser per par — SQL + rotårsak i `klarpakke-trading-strategy` «Orphan-adopsjon dobbeltkonvertering» |
| Reparasjon "holder ikke" — korrupte verdier tilbake etter 3 min | **En LIVE skrivevei overskriver reparasjonen hver tick** | Se «Reparasjon overskrevet av live skrivevei» nedenfor — fiks skriveveiene FØRST, reparer data ETTER |
| Negativ `quantity` | Corrupt fill-model | Slett raden |

## Script-basert reparasjon av paper_accounts.balance (2026-08-03)

For `paper_accounts.current_balance`-avvik finnes nå et TDD-testet script: `scripts/repair-paper-account-balances.ts` (+ `scripts/__tests__/repair-paper-account-balances.test.ts`).

**Korrekt balance-formel (verifisert mot DB, KORRIGERT 2026-08-03 kveld):**
```
correct = Σ over ALLE paper-sesjoner (status IN ('active','paused','stopped'), mode='paper') av:
          current_capital_nok  [cash]
        + open_position.quantity × coin_prices.price  [posisjonsverdi]
```
- **KRITISK (Tom-bevis 2026-08-03):** STOPPED-sesjoner MÅ telles med! Første reparasjon brukte kun `status='active'` → Tom så 9 578 NOK (1 aktiv sesjon) i stedet for 199 198 NOK (11 sesjoner). Stoppede sesjoner har fortsatt cash + posisjoner som tilhører brukeren — de er ikke slettet, bare stoppet.
- Oppdater kun hvis `|correct − current_balance| > 100` NOK (`shouldRepair`).
- Rund til 2 desimaler (NUMERIC(15,2)-kontrakt).

**Data-format-feller (verifisert):**
- `trading_sessions.trading_pair` lagres BÅDE som `"BTCUSDT"` og `"BTC/USDT"` — mens `coin_prices.symbol` kun er `"BTCUSDT"`. Normaliser alltid: `pair.replace(/\//g,"").toUpperCase()` før prisslag oppslag.
- NUMERIC-kolonner kommer som **JSON-strenger** fra supabase-js (`"8718.82"`, `"64221.00"`) — kast til Number før regning.
- Manglende pris (f.eks. `MULTI`) → fallback til `open_position.entry_price`.

**Workflow (testbruker først):**
```bash
npx tsx scripts/repair-paper-account-balances.ts --dry-run --user=test+tricky+123@klarpakke.no
npx tsx scripts/repair-paper-account-balances.ts          # full kjøring
```
Se `references/balance-repair-script-2026-08-03.md` for detaljer (struktur, CLI-flagg, e-post-oppslag).

**⚠️ GoTrue-admin-quirk (gjelder ALLE script som trenger e-post→id):** `/auth/v1/admin/users` gir HTTP 500 med `per_page > 25`, `page > 1` eller default per_page — så `supabase.auth.admin.listUsers()` feiler alltid. Paginér med `?per_page=25` (page 1), eller bruk `mcp__supabase__execute_sql` mot `auth.users`. `user_profiles.email` er uegnet (~5/40 rader populet).

## Beta-justert badge — transparent balance-korreksjon (2026-08-03)

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

**Logikk:**
- Leser `paper_accounts.updated_at` — vises kun <1 time etter justering
- `usePreviousBalance` hook lagrer forrige balance i localStorage (5s debounce)
- Forsvinner automatisk — ingen permanent støy

**Hvorfor ikke forklare teknisk?** Tom (2026-08-03): «Trenger ikke å forklare hva som gikk feil, brukere vet vi er i beta.» Badge er nok — de som bryr seg kan hover for tooltip.

**Deploy:** Commit `87a10352d` — live i prod.

**Se:** `klarpakke-frontend-pitfalls` §41 for full komponent-kode og bruk i DashboardPro.

## Reparasjon overskrevet av live skrivevei (2026-08-03, valuta-korrupsjon)

**Symptom:** Du kjører reparasjons-SQL (entry_price tilbake til NOK), verifiserer at radene er riktige — og 3 minutter senere er de korrupte igjen. Skjedde 3 ganger på rad for Toms alt-coin-posisjoner.

**Rotårsak:** Det finnes FLERE kodeveier som skriver `open_position` tilbake til DB hver tick, og ikke alle respekterer valuta-kontrakten (NOK i DB, USDT kun lokalt). Å reparere data mens skriveveiene fortsatt er buggy er bortkastet — hver tick overskriver.

**To skriveveier funnet i denne episoden (begge måtte fikses før reparasjonen holdt):**

1. **Orphan-adopsjon** (`src/lib/trading/orphan-positions.ts`): normaliserte posisjoner til USDT for merging og skrev USDT-verdiene tilbake til DB (NOK-kontrakt per `fn_guard_session_position_symbol`). Fiks: konverter tilbake til NOK før lagring.
2. **Trailing-TP highest_price-tracking** (`tick/route.ts` ~linje 650): ved ny pris-topp skrev den `{...session.open_position, highest_price: newHighest}` — HELE posisjonen inkludert den USDT-normaliserte entry_price som lå i minnet. Fiks: konverter alle prisfelter tilbake til NOK før lagring.

**Prosessen som virker (rekkefølge er kritisk):**

```sql
-- STEG 0 (FØRST): Finn ALLE kodeveier som skriver feltet.
-- grep -n "open_position" src/app/api/cron/tick/route.ts        # update/update_many
-- grep -rn "\.update.*open_position\|open_position" src/lib/trading/
-- For hver funnet skrivevei: sjekk om den skriver normaliserte (USDT) eller
-- DB-kontrakt (NOK) verdier. Fiks ALLE før du går videre.

-- STEG 1: Deploy skrivevei-fikser.

-- STEG 2: Kjør reparasjons-SQL.

-- STEG 3 (KRITISK): Vent minst 2-3 tick-sykluser (3+ min) og verifiser at
-- reparasjonen HOLDER — sjekk både verdi OG updated_at:
SELECT trading_pair,
  ROUND((open_position->>'entry_price')::numeric, 4) AS entry_nok,
  updated_at
FROM trading_sessions
WHERE user_id='<uid>' AND open_position IS NOT NULL
ORDER BY updated_at DESC;
-- Hvis updated_at er nyere enn reparasjonen din OG verdien er korrupt igjen:
-- det finnes en skrivevei til. Gå tilbake til STEG 0.
```

**Regel:** Ved data-korrupsjon i et felt som skrives av bakgrunnsjobber: aldri reparer data før ALLE skriveveier er funnet og fikset. Reparasjon først = garantert gjentakelse. Og verifiser ALLTID med en "holder det?"-sjekk etter flere tick-sykluser, ikke bare umiddelbart etter UPDATE.

**Diagnose-hint:** `updated_at` på raden avslører OM noe skriver etter reparasjonen din. Hvis `updated_at` tikker videre men verdiene er uendret (og korrekte), er skriveveiene fikset. Hvis verdiene flipper tilbake, er de ikke det.
| `archived=true` + `status='active'` | Migreringsfeil | Sett `status='stopped'` |
| >1 aktiv paper-sesjon | `ensure_active_sessions_for_all()` bug | Behold nyeste, stopp resten |
| `paper_accounts` vs `user_profiles` mismatch | Manglende sync | Kall `syncPaperAccountBalance()` |

**Diagnose-helpers for valuta-korrupsjon (2026-08-03):**
```sql
-- Korrupte posisjoner: entry implausibelt lavt/høyt vs marked
SELECT ts.trading_pair, COUNT(*)
FROM trading_sessions ts
JOIN coin_prices cp ON cp.symbol = ts.trading_pair
WHERE ts.mode='paper' AND ts.status='active' AND ts.open_position IS NOT NULL
  AND cp.price > 0
  AND ((ts.open_position->>'entry_price')::numeric < cp.price * 0.1
    OR (ts.open_position->>'entry_price')::numeric > cp.price * 10)
GROUP BY ts.trading_pair;
```
⚠️ 10%-terskelen kan bomme på edge-cases (DOT entry 10,4% av marked) — etter en aggregert fiks, kjør ALLTID en per-par-verifisering (`entry` vs `marked` side ved side) før du erklærer null gjenværende.

## Nødrespons ved pågående inflasjon

Hvis overvåking avdekker eksplosivt økende paper-saldoer:

1. **Stopp alle aktive paper-sesjoner** og tøm `open_position`.
2. **Slå av SmartTrader** for alle: `UPDATE trading_sessions SET smart_trader_enabled = false`.
3. **Deploy fiks** av `smart-trader-v3` Edge Function (`supabase/functions/deploy smart-trader-v3`).
4. **Tilbakestill inflerte saldoer** til `starting_capital_nok` og arkiver sesjonene.
5. **Legg til/oppdater DB-guards** for trade-verdi, positiv kvantum og posisjonssymbol.
6. **Verifiser** at `active=0`, `smart_trader_enabled=0`, og ingen `current_capital_nok` > 200k uten godkjent grunn.

## Subagent-driven verifisering (2026-08-03, plan-skill + delegate_task)

Ved «sjekk ALLE nettsider mot fakta»-type oppgaver: bruk plan-skill + subagent-driven-development for parallell utførelse.

**Mønster som fungerte:**
1. Lag plan i `.hermes/plans/` med 7 bite-sized tasks (balance-fix, i18n, valuta-E2E, P&L-E2E, dobbel-balanse, full verifisering)
2. Dispatche 4 subagenter parallelt (Task 1-4) via `delegate_task(role='leaf')`
3. Vent på resultater, dispatche Task 5-6 når 1-4 er ferdige
4. Task 7 (full verifisering) kjøres av parent når alle subagenter er klare

**Fordeler:**
- Parallell utførelse (4 tasks samtidig vs sekvensielt)
- Hver subagent får full context via `context`-feltet
- Live transcripts (`/Users/taj/.hermes/cache/delegation/live/<deleg_id>/task-0.log`) for debugging
- Automatisk retry ved failure

**Pitfalls:**
- Subagent kan gå tom for tool-iterasjoner på store tasks → parent må fullføre (les live transcript for å se hvor de stoppet)
- Subagent kan endre filer parent allerede har lest → re-read før edit
- Template literals i patch kan ødelegges av escaping → verifiser med tsc etter patch

**Se:** `.hermes/plans/2026-08-03_093500-nettside-fakta-verifisering.md` for full plan med 7 tasks.

## Referanser
- `references/inflated-session-cleanup-2026-07-30.md` — tick-kvantum-repro fra første runde
- `references/smart-trader-v3-inflation-2026-07-30.md` — SmartTrader USDT/NOK + symbol-mismatch
- `klarpakke-fact-audit` — pengebeløp og dataflyt
- `klarpakke-trading-strategy` — «Valuta-kart» + «Orphan-adopsjon dobbeltkonvertering» (valuta-kontrakter, NOK-guard, reparasjons-SQL)
