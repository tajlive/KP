# Klarpakke MCP — Bruksguide

Klarpakke MCP gir AI-verktøy (Cursor, Kimi, Claude) direkte tilgang til Supabase-databasen via Edge Function.

## Oppsett

### 1. Skaff MCP-token

1. Gå til [Supabase Dashboard](https://app.supabase.com/project/vuxbjlykgmzskxbclquf)
2. Naviger til **Edge Functions** → `klarpakke-mcp`
3. Klikk **Secrets** → vis/decrypt token
4. Kopier verdien

### 2. Legg til i `.env.local`

```bash
KLARPAKKE_MCP_TOKEN="sb_mcp_xxxxxxxxxxxxxxxx"
```

### 3. Test tilkobling

```bash
node scripts/run-klarpakke-mcp.mjs
```

Du skal se en liste over tilgjengelige tools (trading_sessions, ai_decision_log, etc.)

---

## Eksempel-spørringer

### Aktive paper-traders

```sql
-- Liste brukere med aktive paper-trading sesjoner
SELECT 
  user_id,
  symbol,
  status,
  created_at,
  current_balance
FROM trading_sessions
WHERE mode = 'paper' 
  AND status = 'active'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 20;
```

**Cursor/Kimi prompt:**
> "Hent aktive paper-traders fra klarpakke-mcp — brukere som har paper-trading sesjoner den siste uken"

---

### Feilede auto-trades siste 24t

```sql
-- Siste feilede auto-trades med feilmelding
SELECT 
  at.id,
  at.user_id,
  at.symbol,
  at.status,
  at.error_message,
  at.created_at,
  at.execution_price
FROM auto_trades at
WHERE at.status = 'failed'
  AND at.created_at > now() - interval '24 hours'
ORDER BY at.created_at DESC
LIMIT 50;
```

**Cursor/Kimi prompt:**
> "Vis feilede auto-trades siste 24 timer fra klarpakke-mcp — inkluder feilmelding og symbol"

---

### Siste AI-signaler med confidence > 0.7

```sql
-- Høykonfidens AI-signaler
SELECT 
  symbol,
  decision_type,
  sentiment_score,
  confidence,
  decision_reason,
  executed_at,
  analysis_data->>'factors' as factors
FROM ai_decision_log
WHERE confidence > 0.7
  AND executed_at > now() - interval '48 hours'
ORDER BY sentiment_score DESC
LIMIT 30;
```

**Cursor/Kimi prompt:**
> "Hent AI-signaler med confidence over 0.7 fra klarpakke-mcp — siste 48 timer, sortert etter sentiment"

---

### Top performing traders (paper)

```sql
-- Beste paper-traders basert på win rate
SELECT 
  user_id,
  COUNT(*) as total_trades,
  SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as wins,
  ROUND(
    100.0 * SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) / COUNT(*), 
    2
  ) as win_rate_pct,
  ROUND(SUM(realized_pnl), 2) as total_pnl
FROM trades
WHERE mode = 'paper'
  AND status = 'closed'
  AND created_at > now() - interval '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 5
ORDER BY win_rate_pct DESC
LIMIT 10;
```

**Cursor/Kimi prompt:**
> "Vis topp 10 paper-traders fra klarpakke-mcp — siste 30 dager, minst 5 trades, sortert etter win rate"

---

### Varsler om høy risiko

```sql
-- Brukere med høy risiko-profil og store tap
SELECT 
  user_id,
  risk_level,
  COUNT(*) as trade_count,
  ROUND(SUM(realized_pnl), 2) as total_pnl,
  ROUND(AVG(ABS(realized_pnl)), 2) as avg_loss
FROM trades
WHERE risk_level >= 4
  AND realized_pnl < 0
  AND created_at > now() - interval '7 days'
GROUP BY user_id, risk_level
HAVING SUM(realized_pnl) < -100
ORDER BY total_pnl ASC
LIMIT 20;
```

**Cursor/Kimi prompt:**
> "Finn brukere med høy risiko og tap over 100 USDT siste 7 dager fra klarpakke-mcp"

---

## Tilgjengelige tabeller

| Tabell | Beskrivelse |
|--------|-------------|
| `trading_sessions` | Aktive og avsluttede trading-sesjoner |
| `trades` | Enkelt-trade transaksjoner |
| `ai_decision_log` | AI-beslutninger og signaler |
| `auto_trades` | Auto-trading handler og status |
| `auto_trade_log` | Detaljert logging av auto-trade hendelser |
| `trade_history` | Aggregert trade-historikk |
| `user_profiles` | Brukerprofiler og innstillinger |
| `notification_preferences` | Varslingsinnstillinger |

---

## Feilsøking

### "KLARPAKKE_MCP_TOKEN ikke satt"
```bash
# Sjekk at token er i .env.local
grep KLARPAKKE_MCP_TOKEN .env.local

# Hvis tom, legg til (erstatt med ekte token):
echo 'KLARPAKKE_MCP_TOKEN="sb_mcp_xxx..."' >> .env.local
```

### "Connection refused"
- Sjekk at du har internett-tilkobling
- Verifiser at Supabase-prosjektet er oppe: https://status.supabase.com

### "Unauthorized"
- Token kan være utløpt
- Hent nytt token fra Supabase Dashboard → Edge Functions → klarpakke-mcp → Secrets

---

## Sikkerhet

- Token gir kun **read-only** tilgang til spesifikke tabeller
- Ingen skrivetilgang via MCP
- Token roteres automatisk hver 90. dag
- Logg all MCP-aktivitet: `logs/supabase/mcp.log`
