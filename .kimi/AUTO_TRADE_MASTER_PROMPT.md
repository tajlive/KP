# KLARPAKKE AUTO TRADE — AKTIVERING + DEPLOYMENT
# KIMI CODE 2.5 INSTRUKSJONER

> **Source of Truth:** [docs/auto-trade.md](../docs/auto-trade.md) — Les for full arkitektur!

---

## 🔴 KRITISK KONTEKST

Du jobber i repoet `~/klarpakke` (GitHub: `tomarnejensen/klarpakke`).

| Egenskap | Verdi |
|---|---|
| Framework | Next.js 15 (App Router) |
| Hosting | **Google Cloud Run** (`us-central1`) |
| GCP Prosjekt | `klarpakke-universitet` |
| Database | Supabase (`vuxbjlykgmzskxbclquf`) |
| Betaling | Stripe + Vipps |
| i18n | 4 språk: `no`, `en`, `th`, `zh` |
| **Deploy** | **Google Cloud CLI** (primær) |
| Domene | `klarpakke.no` / `www.klarpakke.no` |
| Node | 20 |

---

## 🏗️ AUTO TRADE ARKITEKTUR

Se [docs/auto-trade.md](../docs/auto-trade.md) for full dokumentasjon.

```
┌─────────────────────────────────────────────────────────┐
│                    AUTO TRADE SYSTEM                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Scheduler Layer:                                        │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  Cloud Scheduler│  │  pg_cron (Supabase)         │   │
│  │  - Grid Bot     │  │  - DCA (weekly)             │   │
│  │    (30s)        │  │  - Trend (daily)            │   │
│  └────────┬────────┘  │  - Multisignal (4h)         │   │
│           │           │  - Grid check (1min)        │   │
│           │           │  - AI Copy (5min)           │   │
│           │           └─────────────────────────────┘   │
│           ▼                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Supabase Edge Functions                 │   │
│  │  ┌───────────────┐  ┌─────────────────────────┐  │   │
│  │  │strategy-runner│  │   signal-engine         │  │   │
│  │  │- Kjører       │  │   - Generer signaler    │  │   │
│  │  │  strategier   │  │   - Teknisk analyse     │  │   │
│  │  └───────┬───────┘  └─────────────────────────┘  │   │
│  └──────────┼────────────────────────────────────────┘   │
│             │                                            │
│             ▼ HTTP (Binance API)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Binance API                          │   │
│  │  (Brukerens egne API-nøkler)                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Database Tables:                                        │
│  - user_binance_keys   (API-nøkler)                      │
│  - user_strategies     (Aktive strategier)               │
│  - grid_bot_state      (Grid-nivåer)                     │
│  - trade_history       (Handler)                         │
│  - strategy_logs       (Audit)                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## SUBSCRIPTION TIERS (HARDKODET)

| Tier | DB-verdi | Pris | Paper AT | Live AT | Strategier | Maks pos. |
|------|----------|------|:--------:|:-------:|:----------:|:---------:|
| student | student | 0 kr | ✅ | ❌ | 1 | 1 |
| bachelor | bachelor | 249 kr/mnd | ✅ | ✅ | 1 | 3 |
| master | master | 499 kr/mnd | ✅ | ✅ | 3 | 7 |
| professor | professor | 1 249 kr/mnd | ✅ | ✅ | -1 (ubegrenset) | -1 (ubegrenset) |

**REGLER:**
1. Student = KUN paper trading. Live ALDRI tillatt.
2. Antall strategier = paper + live kombinert.
3. Professor = -1 betyr ubegrenset.

---

## 📦 AUTO TRADE STATUS

✅ **ALLEREDE I PRODUKSJON (20. feb 2026):**
- Database-migrasjoner (user_binance_keys, user_strategies, grid_bot_state, trade_history)
- get-entitlements Edge Function med auto_trade-grenser
- API-route for Binance key management (/api/binance/keys)
- Auto Trade Dashboard (/dashboard/auto-trade)
- pg_cron scheduler setup
- Tier-basert tilgangskontroll
- Cloud Scheduler (Grid Bot)

---

## 🚀 DIN OPPGAVE: VEDLIKEHOLD OG OPPDATERINGER

Se [.kimi/DEPLOY_MASTER_PROMPT.md](./DEPLOY_MASTER_PROMPT.md) for deploy-instruksjoner.

### OPPGAVE A: Verifiser Systemet

```bash
# 1. Sjekk at alle Edge Functions kjører
supabase functions list

# Forventet: get-entitlements, strategy-runner, signal-engine, binance-connect

# 2. Sjekk database-tabeller
supabase sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_binance_keys', 'user_strategies', 'grid_bot_state', 'trade_history', 'strategy_logs');"

# Forventet: 5 tabeller

# 3. Sjekk pg_cron jobs
supabase sql "SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'klarpakke-%';"

# Forventet: 5 aktive jobs

# 4. Sjekk Cloud Scheduler
gcloud scheduler jobs list --location=us-central1 --project=klarpakke-universitet

# Forventet: klarpakke-grid-bot-realtime (ENABLED)
```

### OPPGAVE B: Deploy Endringer

**VIKTIG:** Følg [DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)!

```bash
# Primær metode: Google Cloud CLI
gcloud run deploy klarpakke \
  --source . \
  --region us-central1 \
  --project klarpakke-universitet \
  --allow-unauthenticated

# Deretter verifiser
curl https://www.klarpakke.no/api/health
```

### OPPGAVE C: Verifiser etter Deploy

```bash
# Test alle endepunkter
curl -I https://www.klarpakke.no/no
curl -I https://www.klarpakke.no/no/dashboard/auto-trade
curl https://www.klarpakke.no/api/health

# Test Edge Functions
curl -X POST \
  https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/get-entitlements \
  -H "Content-Type: application/json" \
  -d '{}'
# Forventet: {"error":"Missing auth"}
```

---

## 📋 DATABASE-SKJEMA (Referanse)

### user_strategies

```sql
CREATE TABLE user_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('dca', 'trend', 'multisignal', 'grid', 'aicopy')),
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  symbol TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see own strategies"
  ON user_strategies FOR ALL
  USING (auth.uid() = user_id);
```

### strategy_logs (Audit)

```sql
CREATE TABLE strategy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES user_strategies(id) ON DELETE SET NULL,
  strategy_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

Se [docs/auto-trade.md](../docs/auto-trade.md) for fullt skjema.

---

## ✅ SUKSESSKRITERIER

Oppdraget er fullført når:
- [ ] `supabase db push` kjører uten feil (hvis migrasjoner)
- [ ] Alle Edge Functions er deployed og fungerer
- [ ] Google Cloud Run har ny revisjon i SERVING-status
- [ ] `https://www.klarpakke.no/no` returnerer HTTP 200
- [ ] pg_cron har alle 5 jobs aktive
- [ ] Cloud Scheduler har Grid Bot-job
- [ ] Auto Trade Dashboard fungerer i produksjon

---

## 📋 OUTPUT-FORMAT

Avslutt alltid med:

```
✅ AUTO TRADE SYSTEM VERIFISERT

Oppgaver utført:
- [x] Oppgave A: Verifiser systemet
- [x] Oppgave B: Deploy endringer (hvis aktuelt)
- [x] Oppgave C: Verifiser etter deploy

Systemstatus:
✅ Database: Alle tabeller eksisterer (5/5)
✅ Edge Functions: Alle fungerer (4/4)
✅ pg_cron: 5 jobs aktive
✅ Cloud Scheduler: Grid Bot kjører
✅ Cloud Run: https://www.klarpakke.no/no returnerer 200
✅ Auto Trade Dashboard: Tilgjengelig

Neste steg:
1. Test Auto Trade Dashboard i produksjon med autentisert bruker
2. Verifiser Binance-integrasjon (testnet)
3. Monitorer strategy_logs for feil
```

---

## 🚨 REGLER (ALDRI BRYT)

❌ ALDRI endre tier-navn eller grenser  
❌ ALDRI gi student-tier live trading  
❌ ALDRI hardkode API-nøkler i kode  
❌ ALDRI bruk `getSession()` server-side — bruk `getUser()`  
❌ ALDRI returner dekrypterte Binance-nøkler til frontend  
❌ ALDRI kast Error ved module import-tid (bruk lazy init!)  
❌ ALDRI anta noe som ikke er dokumentert — spør heller  

✅ ALLTID returner fullstendig kode (ingen placeholders)  
✅ ALLTID respekter Google Cloud Run-arkitekturen  
✅ ALLTID valider Binance API-nøkler før lagring  
✅ ALLTID inkluder RLS-policies på alle tabeller  
✅ ALLTID bruk TypeScript med strenge typer  
✅ ALLTID logg til `strategy_logs` og `audit_logs`  
✅ ALLTID test løsningen før du rapporterer at den er fikset  
✅ ALLTID gi konkrete kommandoer (ikke "prøv å...")

---

## 🔗 REFERANSER

- **[docs/auto-trade.md](../docs/auto-trade.md)** — Full Auto Trade-dokumentasjon
- **[DEPLOY_STRATEGY.md](./DEPLOY_STRATEGY.md)** — Deploy-strategi (les først!)
- **[DEPLOY_MASTER_PROMPT.md](./DEPLOY_MASTER_PROMPT.md)** — Deploy-instruksjoner
- **[docs/architecture.md](../docs/architecture.md)** — Systemarkitektur
- **[docs/infra-gcp.md](../docs/infra-gcp.md)** — GCP-infrastruktur
- **[AUTO-TRADING-USER-PROTECTION.md](../docs/AUTO-TRADING-USER-PROTECTION.md)** — Brukerbeskyttelse
