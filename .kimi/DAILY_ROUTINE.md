# 🌅 DAGLIG RUTINE FOR AI-AGENTER
**For:** KIMI, Claude Opus, Perplexity Pro  
**Versjon:** 2.0 (MCP-basert)

---

## 🎯 KJØR DENNE SEKVENSEN VED START AV HVER ØKT

### 1️⃣ Hent Daglig Briefing
**Verktøy:** `system_daily_brief`  
**Input:** `{}`

**Hva du får:**
- Nye brukere siste 24t
- Antall trades (paper + live)
- Total PnL
- Aktive sessions

**Eksempel:**
```json
{
  "date": "2026-02-25",
  "new_users": 3,
  "trades_today": 47,
  "total_pnl": 234.56,
  "active_sessions": 12
}
```

---

### 2️⃣ Sjekk Systemstatus
**Verktøy:** `system_get_status`  
**Input:** `{}`

**Hva du får:**
- Vercel status (✅/❌)
- Supabase status (✅/❌)
- Aktive trading sessions
- Trades siste 24t

**Hvis ❌:** Varsle bruker umiddelbart.

---

### 3️⃣ Se Siste Commits
**Verktøy:** `github_recent_commits`  
**Input:** `{ "limit": 5 }`

**Hvorfor:** Forstå hva som ble endret siden sist.

---

### 4️⃣ Sjekk Åpne Issues
**Verktøy:** `github_open_issues`  
**Input:** `{ "state": "open" }`

**Hvorfor:** Se hva som må fikses.

---

### 5️⃣ Sjekk Trading Status
**Verktøy:** `trading_get_sessions`  
**Input:** `{ "mode": "all", "status": "active" }`

**Hvorfor:** Se om noen sessions er stuck eller trenger oppmerksomhet.

---

## 🚨 VARSLINGSKRITERIER

Varsle bruker hvis:

| Kriterie | Verdi | Handling |
|----------|-------|----------|
| Vercel status | ❌ | Kritisk - system nede |
| >5 aktive live sessions | Usannsynlig | Mulig bug eller uventet aktivitet |
| Total PnL | < -1000 på én dag | Mulig bug i trading engine |
| Ingen trades | Siste 24t MEN aktive sessions | Engine krasjet? |

---

## 📊 UKENTLIG RUTINE (HVER MANDAG)

1. `trading_get_metrics` → `{ "period": "7d" }`
2. `users_get_stats` → `{ "period": "7d" }`
3. Lag rapport til bruker

---

## 🔧 TILGJENGELIGE VERKTØY

| Verktøy | Beskrivelse |
|---------|-------------|
| `supabase_query` | Kjør SELECT-query mot database |
| `supabase_get_tables` | List alle tabeller |
| `supabase_get_schema` | Hent kolonner for tabell |
| `trading_get_sessions` | Hent trading sessions |
| `trading_get_metrics` | Aggregerte metrics (24h/7d/30d) |
| `trading_get_recent_trades` | Siste trades |
| `users_get_stats` | Brukerstatistikk |
| `system_health_check` | Sjekk om klarpakke.no er oppe |
| `system_get_status` | Full systemstatus |
| `system_daily_brief` | Daglig briefing |
| `github_recent_commits` | Siste commits |
| `github_open_issues` | Åpne issues |

Se `klarpakke-mcp/src/index.ts` for fullstendig dokumentasjon.

---

## 💡 TIPS

- Kjør alltid `system_daily_brief` FØRST
- Bruk `supabase_query` for ad-hoc spørringer
- `trading_get_metrics` gir rask oversikt over ytelse
- Kombiner verktøy for dypere analyse

---

**Sist oppdatert:** 2026-02-25
