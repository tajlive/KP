# SmartTrader-v3 paper balance inflation — 2026-07-30

## Bakgrunn

Under vanlig trade-overvåkning ble det oppdaget aktive paper-sesjoner med ekstremt inflert kapital (f.eks. 440 millioner NOK). Rotårsaken lå i SmartTrader-v3 Edge Function, ikke i den kanoniske execute-trade-pipelinen.

## To uavhengige bugs

### 1. Valutablanding USDT ↔ NOK

`fetchKlines()` henter priser fra Binance i **USDT**. Paper-kapital (`current_capital_nok`) er i **NOK**. SmartTrader beregnet:

```ts
const quantity = (capital * positionSizePct) / currentPrice; // capital=NOK, price=USDT
const totalValue = quantity * currentPrice;                  // totalValue i USDT-enheter, men lagret som NOK
```

Dette ga ~10× for lav kostnad per kjøp, og salg ga ~10× for lav inntekt. Over tid bidro det til kunstig kapitalvekst.

### 2. Posisjonssymbol-mismatch

`open_position` inneholdt ikke hvilket par posisjonen tilhørte. Når `trading_pair` på en session endret seg (eller en gammel posisjon ble liggende igjen), solgte SmartTrader gammel posisjons-kvantum til nytt pars pris:

| Sesjon | Pair | Posisjon entry_price | Kvantum | Effekt |
|---|---|---|---|---|
| b0f2560a | BTCUSDT | — (ingen symbol) | 703.61 (fra DOT) | BTC-salg til 626k NOK → 440M NOK |
| 24d65e01 | BTCUSDT | 7.53 (DOT-pris) | 775.86 | Kunne blitt ~486M NOK |
| b690a4f5 | BTCUSDT | 1.67 (ADA-pris) | 2707.35 | Kunne blitt ~1.7Mrd NOK |

## Nødrespons (kontrollert stopp)

1. **Stopp alle aktive paper-sesjoner** for å hindre nye handler.
2. **Slå av SmartTrader for alle**: `UPDATE trading_sessions SET smart_trader_enabled = false`.
3. **Deploy fiks** av `smart-trader-v3` Edge Function.
4. **Tilbakestill inflerte saldoer** til `starting_capital_nok` og arkiver sesjonene.
5. **Legg til DB-guards** (triggere) for å avvise fremtidige brudd.

## Diagnostiske spørringer

```sql
-- Aktive sesjoner med mistenkelig høy kapital
SELECT id, user_id, trading_pair, current_capital_nok, total_pnl
FROM trading_sessions
WHERE mode = 'paper' AND status = 'active'
  AND (current_capital_nok > 200000 OR current_capital_nok < 0);

-- open_position som ikke matcher trading_pair (BTC-pair med DOT/ETH/SOL-pris)
SELECT id, trading_pair, open_position
FROM trading_sessions
WHERE status = 'active'
  AND open_position IS NOT NULL
  AND (
    (trading_pair = 'BTCUSDT' AND (open_position->>'entry_price')::numeric < 100000)
    OR (trading_pair = 'ETHUSDT' AND ((open_position->>'entry_price')::numeric < 5000 OR (open_position->>'entry_price')::numeric > 50000))
    OR (trading_pair = 'SOLUSDT' AND ((open_position->>'entry_price')::numeric < 100 OR (open_position->>'entry_price')::numeric > 2000))
  );
```

## Fiks i smart-trader-v3

Endringer i Edge Function:

- Hent `USDTNOK`-rate fra `coin_prices` eller siste `trades.usdt_nok_rate`.
- Konverter `currentPrice` til NOK før posisjonsberegning.
- Lagre `symbol` i `open_position`.
- Ved salg/SL/TP: avvis hvis `open_position.symbol != session.trading_pair`.
- Hardt tak: `total_value` kan ikke overstige 50 % av `current_capital_nok`.

## DB-guards

```sql
-- Avvis ugyldige handler og paper-handler over 1M NOK
CREATE OR REPLACE FUNCTION fn_guard_trade_invariants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 OR NEW.total_value <= 0 OR NEW.price <= 0 THEN
    RAISE EXCEPTION 'Invalid trade: quantity/total_value/price must be positive';
  END IF;
  IF NEW.mode = 'paper' AND NEW.total_value > 1000000 THEN
    RAISE EXCEPTION 'Paper trade value % exceeds 1M NOK limit', NEW.total_value;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_trade_invariants
BEFORE INSERT ON trades
FOR EACH ROW EXECUTE FUNCTION fn_guard_trade_invariants();

-- Avvis open_position som ikke matcher trading_pair
CREATE OR REPLACE FUNCTION fn_guard_session_position_symbol()
RETURNS TRIGGER AS $$
DECLARE pos_symbol text;
BEGIN
  IF NEW.open_position IS NOT NULL THEN
    pos_symbol := NEW.open_position->>'symbol';
    IF pos_symbol IS NOT NULL AND pos_symbol <> NEW.trading_pair THEN
      RAISE EXCEPTION 'open_position symbol % does not match trading_pair %', pos_symbol, NEW.trading_pair;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_session_position_symbol
BEFORE INSERT OR UPDATE ON trading_sessions
FOR EACH ROW EXECUTE FUNCTION fn_guard_session_position_symbol();
```

## Filmer i repoet

- `supabase/functions/smart-trader-v3/` — oppdatert executor/index/risk/types
- `supabase/migrations/20260730230000_reset_inflated_paper_sessions.sql`
- `supabase/migrations/20260730231000_add_paper_trading_safety_guards.sql`

## Lærdom

- Edge Functions som manipulerer `trades`/`trading_sessions` direkte må ha de samme invariant-gardene som den kanoniske pipelinen.
- `open_position` bør alltid inneholde symbol for å unngå cross-pair salg.
- Paper-kapital i NOK + markedspris i USDT krever eksplisitt konvertering.
- Overvåk `current_capital_nok` per bruker; abnormale verdier er ofte det første tegnet på en bug.
