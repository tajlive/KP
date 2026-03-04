# 🤖 Auto Trade — Teknisk Dokumentasjon

> **Sist oppdatert:** 28. Februar 2026
> **Status:** Produksjon på Vercel

---

## Oversikt

Auto Trade-modulen i Klarpakke lar brukere automatisere trading-strategier ved å koble til sin egen Binance-konto via API-nøkler.

### Arkitektur for Trading

1. **Frontend**: Dashboard for konfigurering og monitorering (Vercel)
2. **Backend Services**: Next.js API Routes (Serverless) + Supabase Edge Functions
3. **Database**: PostgreSQL (Supabase) for lagring av tilstand og logger
4. **Execution**: Node.js/Deno runtime som kaller Binance API
5. **Scheduler**: Vercel Cron for periodisk utførelse

---

## Strategier

### 1. Grid Bot (Real-time)

Kjøper lavt og selger høyt innenfor et definert prisintervall.

- **Trigger:** Vercel Cron hvert minutt
- **Logikk:** Sjekker åpne ordre og plasserer nye basert på prisbevegelse
- **Konfigurasjon:**
  - Øvre og nedre prisgrense
  - Antall grid-levels
  - Beløp per grid

### 2. DCA (Dollar Cost Averaging)

Akkumulerer krypto over tid ved faste intervaller.

- **Trigger:** pg_cron (ukentlig/månedlig)
- **Logikk:** Markedsordre på fast tidspunkt

---

## Sikkerhet

### API-nøkkel Håndtering

- **Kryptering:** Alle API-nøkler og secrets krypteres før lagring i Supabase
- **Dekryptering:** Skjer kun i sikkert runtime-miljø (Edge Function) ved utførelse
- **Scope:** Vi krever kun "Spot Trading" rettigheter (ingen withdrawal-tilgang)

### Row Level Security (RLS)

- Brukere har kun tilgang til sine egne strategier og logger
- Håndheves på database-nivå via Supabase policies

---

## Monitorering og Logging

Alle trading-handlinger logges i `strategy_logs` tabellen:

- Tidspunkt
- Strategi-ID
- Handling (Buy/Sell/Check)
- Detaljer (Pris, mengde, status)

---

## Deployment og Drift

### Vercel Cron

# Grid Bot (hvert minutt - konfigurert i vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/trading/trigger",
      "schedule": "* * * * *"
    }
  ]
}
```

### pg_cron (Supabase)

For mindre tidskritiske strategier (DCA, Trend).

```sql
SELECT cron.schedule('klarpakke-dca-weekly', '0 9 * * 1', 'SELECT trigger_dca()');
```

---

## Feilsøking

### Vanlige problemer

1. **Invalid API Key:** Sjekk at nøkkelen har "Spot Trading" aktivert og IP-restriksjoner er korrekt satt.
2. **Insufficient Balance:** Sjekk at det er nok USDT på Binance-kontoen.
3. **Rate Limiting:** Vi følger Binance sine offisielle begrensninger.
