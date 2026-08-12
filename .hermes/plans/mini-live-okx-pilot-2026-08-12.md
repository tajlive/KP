# OKX Mini-Live Pilotplan — 2026-08-12

> **Status:** PLAN — venter på Toms godkjenning. Ingen aktivering utført.
> **Preflight:** Alle 10 punkter grønne (DB, runtime, kvalitetsgater).
> **Commit:** `5fcdb531d`

---

## 1. Omfang

| Parameter   | Verdi                                                       |
| ----------- | ----------------------------------------------------------- |
| Bruker      | Tom Arne Jensen (`0dd08529`)                                |
| Børs        | OKX (`eea.okx.com`)                                         |
| Sesjon      | `d10c6096` (eksisterende, SOLUSDC, simple_grid)             |
| Symbol      | SOLUSDC (USDC-denominert)                                   |
| Modus       | `live` (allerede satt i DB)                                 |
| Strategi    | `simple_grid` baseline (E5 AV, regime_filter_enabled=false) |
| Kapital     | 101,66 USDC (nåværende saldo, verifisert 2026-08-12 00:08)  |
| Maks risiko | 100% av saldo (≈100 USDC)                                   |
| Varighet    | Maks 48 timer fra aktivering                                |

## 2. Startprosedyre

1. **Verifiser OKX-saldo:** `OkxExecutor.getBalance()` → bekreft ≥ 101,66 USDC
2. **Sett sesjon til aktiv:** `PATCH trading_sessions/{d10c6096} → status=active`
3. **Vent på PG-Cron-tick (hvert 5. min):** Ikke manuell trigger — la systemet kjøre
4. **Observer første tick:** Les `last_heartbeat` etter tick, sjekk `trading_logs`
5. **Første kjøp:** Grid-kjøp ≈ 5% av kapital = ~5,08 USDC (over OKX-minimum på 1,5 USD)
   - Grid-kjøp skjer KUN hvis pris treffer et nivå OG regime-gaten ikke blokkerer
   - DCA ≈ 2% = ~2,03 USDC (over minimum)

## 3. Overvåkning per tick

Etter hver tick (hvert 5. min), verifiser:

| Sjekk           | Hvordan                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| Riktig børs     | `trading_logs` → exchange=okx                                                                |
| Ordrebeløp      | Grid ~5 USDC, DCA ~2 USDC                                                                    |
| Ordrestatus     | OKX API: sjekk at ordren finnes og status er `filled`/`open`                                 |
| Intern posisjon | `trading_sessions.open_position` oppdatert                                                   |
| PnL-bokføring   | `trading_logs` med realized_pnl                                                              |
| Kill-switch     | Test et separat tick med `POST /api/admin/kill-switch` → session stopper, ordrer kanselleres |

## 4. Kill-switch-prosedyre (manuell)

```bash
# 1. Aktiver kill-switch for Tom
CRON_SECRET=$(grep CRON_SECRET /Users/taj/klarpakke/.env.local | cut -d= -f2)
curl -X POST https://www.klarpakke.no/api/admin/kill-switch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0dd08529-b8a8-4fd3-9806-275e2d0135dd","exchange":"okx"}'

# 2. Verifiser resultat
curl https://www.klarpakke.no/api/admin/session-status?session_id=d10c6096

# 3. Dobbeltsjekk OKX direkte
# Sjekk at ingen åpne ordrer finnes på OKX for dette paret
```

## 5. Rollback-prosedyre

```bash
# 1. Kill-switch (som over)
# 2. Sett sesjon til paused
PATCH /rest/v1/trading_sessions?id=eq.d10c6096 → {"status":"paused"}

# 3. Verifiser at ingen posisjon er åpen
# 4. Dokumenter eventuelle realiserte PnL
# 5. Sett is_active=false på OKX-nøkkel hvis nødvendig
```

## 6. Abortregler — STOPP umiddelbart hvis:

| #   | Regel                                       | Aktion                                                 |
| --- | ------------------------------------------- | ------------------------------------------------------ |
| 1   | Ordre går til Kraken, ikke OKX              | Kill-switch → debug routing                            |
| 2   | Ordrebeløp > 10% av kapital (uventet)       | Kill-switch → debug sizing                             |
| 3   | OKX API-feil (401/403/500)                  | Kill-switch → sjekk nøkler                             |
| 4   | Intern posisjon ≠ OKX posisjon              | Kill-switch → avviksanalyse                            |
| 5   | Kill-switch stopper IKKE ordrer/sesjon      | Umiddelbar manuell kansellering på OKX                 |
| 6   | Regime-gate av og reelt kjøpssignal trigges | Som forventet — dette ER piloten. Overvåk, ikke stopp. |
| 7   | Teknisk feil (tick timeout, DB-feil)        | Kill-switch → root cause analyse                       |

## 7. Suksesskriterier

Etter 48 timer (eller tidligere abort), piloten er vellykket hvis:

1. ✅ Minst én OKX-ordre ble opprettet og sporet korrekt
2. ✅ Posisjon og PnL i Klarpakke matcher OKX
3. ✅ Kill-switch stoppet alt ved behov
4. ✅ Ingen uventede feil, ingen Kraken-routing
5. ✅ Alle ordre overholdt minimumsbeløp og kapitalgrenser

## 8. Toms ansvar

- **Godkjenne** denne planen før noe aktiveres
- **Overvåke** at ordre og posisjoner gir mening
- **Stoppe** ved mistanke om feil
- **Ikke** legge til kapital eller endre config under piloten

---

## Forfatter

Hermes (DeepSeek V4 Pro) · Klarpakke · 2026-08-12 · FØR aktivering
