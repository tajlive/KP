# E5: ADX/BBW Regimefilter — Design 2026-08-12

> **Status:** Forskningsvariant, IKKE aktivert i produksjon eller paper.
> **Prinsipp:** Ikke prøv å spå pris. Bare unngå de verste regimene for grid/DCA.

---

## 1. Input og indikatorer

| Parameter       | Default | Beskrivelse                                                         |
| --------------- | ------- | ------------------------------------------------------------------- |
| `adx_period`    | 14      | ADX-kalkulasjonsperiode (Wilder)                                    |
| `adx_range_max` | 20      | ADX under dette → RANGE                                             |
| `adx_trend_min` | 25      | ADX over dette → TREND                                              |
| `bb_period`     | 20      | Bollinger Bands SMA-periode                                         |
| `bb_stddev`     | 2       | Bollinger standardavvik                                             |
| `bbw_min_pct`   | 2.0     | BB Width minimum (% av SMA) for range-gyldighet                     |
| `atr_period`    | 14      | ATR-periode (kun for stress-deteksjon, bruker eksisterende dd-gate) |

## 2. Formler

### ADX (Wilder, 1978)

```
TR = max(H-L, |H-C_prev|, |L-C_prev|)
+DM = max(0, H - H_prev)  hvis H-H_prev > L_prev-L, ellers 0
−DM = max(0, L_prev - L)  hvis L_prev-L > H-H_prev, ellers 0
ATR = Wilder-smoothing(TR, 14)
+DI = 100 × Wilder-smoothing(+DM, 14) / ATR
−DI = 100 × Wilder-smoothing(−DM, 14) / ATR
DX = 100 × |+DI − −DI| / (+DI + −DI)
ADX = Wilder-smoothing(DX, 14)
```

### BB Width

```
BB_mid = SMA(close, 20)
BB_upper = BB_mid + 2 × stdev(close, 20)
BB_lower = BB_mid − 2 × stdev(close, 20)
BBW_pct = (BB_upper − BB_lower) / BB_mid × 100
```

## 3. Tre gjensidig utelukkende regimer

### RANGE — `ADX < 20 AND BBW_pct >= bbw_min_pct`

- Baseline grid/DCA tillates
- **Forklaring (NO):** «Markedet beveger seg sidelengs med nok svingninger til grid-handel. Piloten handler normalt.»
- **Forklaring (EN):** «The market is ranging with enough swings for grid trading. The Pilot trades normally.»

### TREND — `ADX >= 25`

- Ingen nye kjøp (grid eller DCA). Salg tillates.
- **Forklaring (NO):** «Markedet trender for sterkt til grid-handel. Piloten venter til trenden avtar.»
- **Forklaring (EN):** «The market is trending too strongly for grid trading. The Pilot waits for the trend to weaken.»

### MELLOMREGIME — `20 <= ADX < 25`

- Hold. Ingen nye kjøp. Salg tillates.
- **Forklaring (NO):** «Markedet er i overgang mellom range og trend. Piloten avventer.»
- **Forklaring (EN):** «The market is transitioning between range and trend. The Pilot waits.»

### STRESS — håndteres av eksisterende dd-gate

- E5 introduserer IKKE ny likvideringsmekanisme
- Eksisterende `dd_gate_pct` + «slipp posene» forblir uendret
- Ved stress: «Markedet er under kraftig stress. Sikkerhetsmekanismen er aktivert.»

## 4. Determinisme

- Samme candles + config → samme regime-klassifisering. Alltid.
- Ingen ML, LLM, HMM, RL, prisprediksjon, nettverkskall.
- ADX og BB er rent matematiske, deterministiske formler.

## 5. Config-flagg

```typescript
{
  regime_filter_enabled: false,  // default AV
  adx_period: 14,
  adx_range_max: 20,
  adx_trend_min: 25,
  bb_period: 20,
  bb_stddev: 2,
  bbw_min_pct: 2.0,
  atr_period: 14,  // for fremtidig utvidelse, ikke aktivert i V1
}
```

## 6. Integrasjon med simple_grid

Når `regime_filter_enabled=false`: identisk med dagens strategi. Ingen endring.

Når `regime_filter_enabled=true`:

1. Beregn ADX og BBW fra siste `Math.max(adx_period, bb_period) + 1` candles
2. Klassifiser regime
3. RANGE → kjør normal simple_grid-logikk (kjøp + selg + DCA)
4. TREND → blokker grid-kjøp og DCA-kjøp. Salg går som normalt.
5. MELLOMREGIME → blokker grid-kjøp og DCA-kjøp. Salg går som normalt.
6. Eksisterende dd-gate, posisjons-tak, og «slipp posene» forblir uendret og har høyere prioritet

## 7. Forklarbarhet

Hver blokkering skal produsere en `block_reason` (norsk) som kan vises i UI:

- `"TREND — ADX for høyt for grid-handel"`
- `"OVERGANGSREGIME — ADX i gråsone, avventer"`
- `"LAV_VOLATILITET — BB Width under minimum for grid"`

Disse er UI-klare, men UI-integrering gjøres i egen oppgave.

## 8. Testkrav

- RANGE → baseline-handling tillates
- TREND → kjøp og DCA blokkeres, salg tillates
- MELLOMREGIME → hold, ingen nye kjøp
- `regime_filter_enabled=false` → identisk baseline-adferd (regresjonstest)
- Determinisme: samme input → samme regime
- ADX < 0 eller BBW < 0: kantsak, returner MELLOMREGIME (safe default)

---

## Forfatter

Hermes (DeepSeek V4 Pro) · Klarpakke · 2026-08-12
