# Currency Mismatch Fix (2026-07-29)

## Problem

JokerTrade regnet ut posisjoner i NOK, men `executeTrade` behandlet verdier som USD. Resultat: hver trade belastet ~13 000 kr istedenfor ~2 000 kr — en 7.3× overbelastning.

## Root Cause

```
JokerTrade: positionValue = 5 000 NOK
           quantity = 5 000 / $25 = 200 SOL
executeTrade: total_value = 200 * 25 * 7.3 (kurs) = 36 500 NOK
Trigger:     session.capital -= 36 500  ← 5 000 var forventet!
```

`session.capital` er i NOK. `price` fra binance-proxy er i USDT. Å regne `NOK / USDT = quantity` gir enorm kvantitet. `executeTrade` multipliserer med USD-kurs for å lagre i NOK → 7.3× for mye.

## Fix: Konverter til USDT før posisjonsberegning

```typescript
// ❌ GAMMEL — regnet i NOK, ga 7.3x for store handler
const rawValueNok = session.capital * (sizingPct / 100);
const quantity = rawValueNok / price; // price er USDT → huge quantity

// ✅ NY — konverter kapital til USDT først
const nokToUsdt = 7.3;
const capitalUsdt = session.capital / nokToUsdt;
let positionUsdt = capitalUsdt * (sizingPct / 100);
if (positionUsdt < 10) positionUsdt = 10; // minimum 10 USDT
const quantity = positionUsdt / price;
```

executeTrade vil da lagre `total_value = quantity * price * nokToUsdt = positionUsdt * nokToUsdt` = riktig NOK-beløp.

## Bevis

Før fiks: Tom sin session gikk fra 99 485 → ~47 000 på 4 handler (~13 000/trade)
Etter fiks: Tom sin session gikk fra 99 485 → 97 631 på 1 handel (~1 854/trade — korrekt ~2%)

## Regler

1. **Alltid konverter til USDT** før posisjonsberegning (session.capital er NOK, priser er USDT)
2. **Minimum 10 USDT** per ordre (exchange requirement)
3. **executeTrade konverterer tilbake til NOK** internt — ikke dobbeltkonverter
