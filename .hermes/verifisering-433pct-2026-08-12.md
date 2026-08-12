# Verifisering av +433% SOL-påstand — 2026-08-12

> **Status:** PÅSTANDEN ER IKKE VERIFISERBAR — ingen primærkilde funnet.
> **Konklusjon:** (b) Feilaktig/uverifiserbar — bør trekkes tilbake.

---

## Opphav

Påstanden "+433% vs +116% buy-and-hold, SOL, 5 år" ble først skrevet inn i
`.hermes/NATTSTATUS-2026-08-11.md` (linje 28) av KIMI Desktop K3 natt til 11. august 2026, deretter kopiert til `.hermes/HANDOFF-2026-08-11-KOMPLETT.md`
(skrevet av DeepSeek V4 Pro / Hermes).

Påstanden refererte til et lokalt script `scripts/backtest/run-full-cycle.mjs`
som ALDRI ble committet til repoet, og som NÅ IKKE FINNES på disk. Ingen
output-fil fra denne kjøringen eksisterer.

---

## Filer gjennomsøkt

| Fil                                      | Inneholder +433%?      | SOL-resultater?                     |
| ---------------------------------------- | ---------------------- | ----------------------------------- |
| `backtest-results-4year.json`            | Nei                    | Nei (kun BTC, ETH)                  |
| `backtest-results-5year.json`            | Nei                    | Nei (kun BTC, ETH)                  |
| `.cache/backtest/SOL-USDT-1H.json`       | Nei                    | Kun OHLCV-rådata                    |
| `scripts/backtest/run-full-cycle.mjs`    | Finnes ikke            | Scriptet er slettet/aldri committet |
| `.hermes/HANDOFF-2026-08-11-KOMPLETT.md` | **Ja** (3 forekomster) | Sekundærkilde                       |
| `.hermes/NATTSTATUS-2026-08-11.md`       | **Ja** (1 forekomst)   | Sekundærkilde                       |

---

## Full tabell: backtest-results-4year.json

Periode: 2022-05-03 → 2026-05-03 (1 461 dager). Kapital: 10 000 USDT.
Gebyr: 0.1% + slippage 0.05%.

| #   | Strategi                 | Symbol  | Return%  | Buy&Hold | Alpha | MaxDD% | PF   | Trades |
| --- | ------------------------ | ------- | -------- | -------- | ----- | ------ | ---- | ------ |
| 0   | DCA                      | BTCUSDT | −4.8     | −25.5    | +20.7 | 6.2    | 0.89 | 1 616  |
| 1   | Trend Follow (SMA 8/21)  | BTCUSDT | −1.2     | −25.5    | +24.3 | 3.0    | 0.93 | 158    |
| 2   | Trend Follow (SMA 20/50) | BTCUSDT | −0.9     | −25.5    | +24.6 | 1.9    | 0.83 | 58     |
| 3   | Multi-Signal             | BTCUSDT | −20.7    | −25.5    | +4.8  | 20.7   | 0.60 | 1 377  |
| 4   | Grid Bot                 | BTCUSDT | −20.6    | −25.5    | +4.9  | 20.6   | 0.56 | 1 462  |
| 5   | DCA                      | ETHUSDT | −9.0     | −36.1    | +27.1 | 10.4   | 0.81 | 407    |
| 6   | Trend Follow (SMA 8/21)  | ETHUSDT | +0.7     | −36.1    | +36.8 | 2.3    | 1.19 | 159    |
| 7   | Trend Follow (SMA 20/50) | ETHUSDT | **+4.7** | −36.1    | +40.8 | 1.4    | 2.54 | 44     |
| 8   | Multi-Signal             | ETHUSDT | −20.4    | −36.1    | +15.7 | 20.5   | 0.69 | 1 449  |
| 9   | Grid Bot                 | ETHUSDT | −20.2    | −36.1    | +15.9 | 20.2   | 0.64 | 1 486  |

**Høyeste avkastning i filen: +4.7%** (Trend Follow SMA 20/50, ETHUSDT).

---

## Full tabell: backtest-results-5year.json

Periode: 2021-05-03 → 2026-05-03 (1 826 dager). Samme forutsetninger.

| #   | Strategi                 | Symbol  | Return%  | Buy&Hold | Alpha | MaxDD% | PF   | Trades |
| --- | ------------------------ | ------- | -------- | -------- | ----- | ------ | ---- | ------ |
| 0   | DCA                      | BTCUSDT | −3.4     | −5.7     | +2.3  | 6.5    | 0.94 | 1 342  |
| 1   | Trend Follow (SMA 8/21)  | BTCUSDT | −2.7     | −5.7     | +3.0  | 3.0    | 0.61 | 114    |
| 2   | Trend Follow (SMA 20/50) | BTCUSDT | −4.4     | −5.7     | +1.3  | 4.5    | 0.08 | 44     |
| 3   | Multi-Signal             | BTCUSDT | −15.9    | −5.7     | −10.2 | 16.4   | 0.58 | 944    |
| 4   | Grid Bot                 | BTCUSDT | −18.6    | −5.7     | −12.9 | 18.9   | 0.61 | 1 480  |
| 5   | DCA                      | ETHUSDT | −4.1     | −21.6    | +17.4 | 7.8    | 0.94 | 394    |
| 6   | Trend Follow (SMA 8/21)  | ETHUSDT | −0.8     | −21.6    | +20.8 | 2.8    | 0.98 | 126    |
| 7   | Trend Follow (SMA 20/50) | ETHUSDT | **+1.8** | −21.6    | +23.4 | 1.4    | 2.20 | 36     |
| 8   | Multi-Signal             | ETHUSDT | −12.4    | −21.6    | +9.1  | 13.0   | 0.77 | 1 002  |
| 9   | Grid Bot                 | ETHUSDT | −19.6    | −21.6    | +1.9  | 20.0   | 0.65 | 1 514  |

**Høyeste avkastning i filen: +1.8%** (Trend Follow SMA 20/50, ETHUSDT).

---

## Nøkkelobservasjoner

1. **Grid Bot** (Klarpakkes strategi-familie): −18.6% til −20.6% over 4–5 år
2. **PF for Grid Bot**: 0.56–0.65 (under 1.3-kravet)
3. **SOL finnes IKKE** i noen beregnet backtest-output i repoet
4. Alle Grid Bot-resultater er negative i absolutt avkastning, men positive
   i alpha — strategien slår markedet, men markedet går ned

---

## Forfatter og tidsstempel

- **Utført av:** Hermes (DeepSeek V4 Pro), Klarpakke
- **Dato:** 2026-08-12 ~02:50 CEST
- **Verifiserings-ID:** `verifisering-433pct-2026-08-12`

---

## Instruksjon til fremtidige agenter

LES DENNE FILEN FØR du siterer noe tall om SOL 5-års-ytelse.
+433%-påstanden har INGEN primærkilde. ALLE påstander om SOL-ytelse
skal peke til en committet resultatfil (f.eks.
`backtest-results-sol-verified-2026-08-12.json` hvis den finnes,
eller nyere).
