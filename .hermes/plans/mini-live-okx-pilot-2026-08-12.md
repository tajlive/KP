# OKX Mini-Live Pilotplan — 2026-08-12 (revidert)

> **Status:** PLAN — venter på Toms førsteordre-godkjenning.
> **Preflight:** Alle 10 punkter grønne. **Rev:** Redusert til én enkelt ordre.
> **Commit:** `57fed4ad1`

---

## 1. Omfang

| Parameter       | Verdi                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Bruker          | Tom Arne Jensen (`0dd08529`)                                                                              |
| Børs            | OKX (`eea.okx.com`)                                                                                       |
| Sesjon          | `d10c6096` (eksisterende, SOLUSDC, simple_grid)                                                           |
| Symbol          | SOLUSDC (USDC-denominert)                                                                                 |
| Strategi        | `simple_grid` baseline (E5 AV, regime_filter_enabled=false)                                               |
| Kapital         | 101,66 USDC                                                                                               |
| **Maks risiko** | **Én enkelt grid-ordre på ~5 USDC. Ingen videre kapitalbruk før Tom har kontrollert resultatet manuelt.** |

## 2. Fase 1 — Førsteordre (ENESTE som utføres uten videre godkjenning)

1. **Verifiser OKX-saldo:** `OkxExecutor.getBalance()` → bekreft ≥ 101,66 USDC
2. **Sett sesjon til aktiv:** `PATCH trading_sessions/{d10c6096} → status=active`
3. **Vent på PG-Cron-tick (hvert 5. min):** Ikke manuell trigger
4. **Observer at ÉN grid-ordre plasseres** (~5 USDC, 5% av kapital) hvis regime-gaten åpner og pris treffer et nivå
5. **Ingen DCA, ingen andre kjøp, ingen salg, ingen 48t autonom drift** før:
   - a) OKX-ordren er synlig og verifiserbar på OKX
   - b) Intern posisjon/bokføring i Klarpakke stemmer med OKX
   - c) Kill-switch har kansellert en åpen ordre ELLER stoppet sesjonen sikkert

## 3. Kill-switch-test (DEL AV FASE 1)

Etter at første ordre er bekreftet på OKX:

```bash
CRON_SECRET=$(grep CRON_SECRET /Users/taj/klarpakke/.env.local | cut -d= -f2)
curl -X POST https://www.klarpakke.no/api/admin/kill-switch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0dd08529-b8a8-4fd3-9806-275e2d0135dd","exchange":"okx"}'
```

Verifiser at:

- [ ] Ordren er kansellert på OKX
- [ ] Session status = paused/stopped i Klarpakke
- [ ] `trading_logs` viser kill-switch-hendelse

## 4. Abortregler — STOPP umiddelbart hvis:

| #   | Regel                                  | Aktion                                 |
| --- | -------------------------------------- | -------------------------------------- |
| 1   | Ordre går til Kraken, ikke OKX         | Kill-switch → debug routing            |
| 2   | Ordrebeløp avviker > 20% fra ~5 USDC   | Kill-switch → debug sizing             |
| 3   | OKX API-feil (401/403/500)             | Kill-switch → sjekk nøkler             |
| 4   | Intern posisjon ≠ OKX posisjon         | Kill-switch → avviksanalyse            |
| 5   | Kill-switch stopper IKKE ordrer/sesjon | Umiddelbar manuell kansellering på OKX |
| 6   | Regime-gate av og kjøpssignal trigges  | Som forventet. Overvåk, ikke stopp.    |

## 5. Fase 2 (IKKE utfør uten Toms eksplisitte godkjenning etter Fase 1)

- Aktiver DCA (2 USDC / 4t) kun etter at fase 1 er verifisert
- Maks 48 timer totalt
- Daglig manuell gjennomgang av alle ordrer

## 6. Rollback

1. Kill-switch (som §3)
2. `PATCH trading_sessions → status=paused`
3. Dokumenter realisert PnL
4. Deaktiver OKX-nøkkel kun ved alvorlig feil

---

**Forfatter:** Hermes · 2026-08-12 · Revidert per Tom: én ordre først.
