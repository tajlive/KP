# E5 Regimefilter — Resultater 2026-08-12

> **Protokoll:** `.hermes/plans/e5-backtest-protocol-2026-08-12.md`
> **Data:** `backtest-results-e5-regimefilter-2026-08-12.json`

---

## Resultater

| Metrikk              | V0 Baseline | V1 E5 basis | V2 E5 konservativ |
| -------------------- | ----------- | ----------- | ----------------- |
| Snitt OOS avkastning | −8.7%       | −9.1%       | **−5.3%**         |
| PF train (min)       | 0.05        | 0.04        | 0.01              |
| PF OOS (min)         | 0.09        | 0.05        | 0.02              |
| Maks drawdown        | 32.9%       | 26.0%       | **27.1%**         |
| Lukkede handler      | 3650        | 1051        | 344               |

## Per-symbol — V0 Baseline

| Symbol  | Train Return | OOS Return | PF Train | PF OOS | DSR  | Trades | MaxDD |
| ------- | ------------ | ---------- | -------- | ------ | ---- | ------ | ----- |
| SOLUSDT | −15.2%       | −10.2%     | 0.18     | 0.12   | 0.02 | 1246   | 32.8% |
| BTCUSDT | −21.3%       | −9.0%      | 0.05     | 0.10   | 0.02 | 1158   | 32.9% |
| ETHUSDT | −18.3%       | −6.8%      | 0.10     | 0.09   | 0.04 | 1246   | 32.9% |

## Per-symbol — V1 E5 basis

| Symbol  | Train Return | OOS Return | PF Train | PF OOS | DSR  | Trades | MaxDD |
| ------- | ------------ | ---------- | -------- | ------ | ---- | ------ | ----- |
| SOLUSDT | −20.2%       | −12.1%     | 0.04     | 0.07   | 0.01 | 325    | 25.1% |
| BTCUSDT | −22.0%       | −7.3%      | 0.04     | 0.05   | 0.01 | 389    | 26.0% |
| ETHUSDT | −16.7%       | −7.9%      | 0.07     | 0.05   | 0.01 | 337    | 25.3% |

## Per-symbol — V2 E5 konservativ

| Symbol  | Train Return | OOS Return | PF Train | PF OOS | DSR  | Trades | MaxDD |
| ------- | ------------ | ---------- | -------- | ------ | ---- | ------ | ----- |
| SOLUSDT | −13.0%       | −9.5%      | 0.01     | 0.01   | 0.00 | 108    | 23.3% |
| BTCUSDT | −10.5%       | −3.0%      | 0.01     | 0.02   | 0.00 | 127    | 27.1% |
| ETHUSDT | −13.0%       | −3.3%      | 0.01     | 0.02   | 0.00 | 109    | 22.7% |

## Gatevurdering

| Gate          | Krav   | V0        | V1        | V2        |
| ------------- | ------ | --------- | --------- | --------- |
| PF train      | ≥ 1.3  | ✗ (0.05)  | ✗ (0.04)  | ✗ (0.01)  |
| PF OOS        | ≥ 1.1  | ✗ (0.09)  | ✗ (0.05)  | ✗ (0.02)  |
| DSR korrigert | ≥ 0.95 | ✗ (0.04)  | ✗ (0.01)  | ✗ (0.00)  |
| Maks DD       | ≤ 15%  | ✗ (32.9%) | ✗ (26.0%) | ✗ (27.1%) |
| ≥ 100 handler | ✅     | ✓ (3650)  | ✓ (1051)  | ✓ (344)   |

**Ingen variant består alle gater.**

## Analyse

### Hva E5 gjør riktig

- Reduserer drawdown med 6–7 prosentpoeng (32.9% → 26.0%)
- Reduserer antall handler med 71% (V1: 1051 vs V0: 3650) — blokkerer tross alt kjøp i fallende trend
- V2 (konservativ) har lavest absolutt tap (−5.3% OOS) men også færrest handler (344)

### Hva E5 IKKE fikser

- PF forblir under 0.10 — strategien kan ikke lage profitable exits i et sideveis/nedadgående marked
- Færre handler → mindre diversifisering av exit-muligheter → PF synker ytterligere
- Alle varianter taper penger absolutt (−5.3% til −9.1%)

### Hypotese bekreftet

> «E5 vil redusere drawdown men IKKE endre den grunnleggende utfordringen.»

Dette stemmer. E5 er et nyttig **risikofilter**, men løser ikke avkastningsproblemet.

---

## Forfatter

Hermes (DeepSeek V4 Pro) · Klarpakke · 2026-08-12
