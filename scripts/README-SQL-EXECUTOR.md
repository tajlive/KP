# 🔧 Supabase SQL Executor - Full Automatisering

Dette systemet kjører SQL i Supabase **helt automatisk** uten manuell kopiering til SQL Editor!

## 🚀 Quick Start

```bash
# ONE-CLICK setup av pg_cron
./scripts/setup-cron-oneclick.sh
```

Dette vil:
1. Hente CRON_SECRET fra `.env.local`
2. Generere SQL med korrekt secret
3. Prøve å kjøre SQL automatisk via flere metoder
4. Vise resultat eller fallback-instruksjoner

## 📁 Filoversikt

| Fil | Beskrivelse |
|-----|-------------|
| `setup-cron-oneclick.sh` | **Hovedscript** - Kjør denne! |
| `supabase-sql-executor.sh` | Avansert SQL executor med flere metoder |
| `execute-sql-node.mjs` | Node.js backup executor |
| `execute-sql-python.py` | Python backup executor |
| `setup-supabase-cron.sql` | SQL template for pg_cron |

## 🔧 Tilgjengelige Metoder

### 1. PostgreSQL Direkte (psql) ⭐ Anbefalt
**Krever:** Database password

```bash
# Installer psql først
brew install libpq              # macOS
sudo apt-get install postgresql-client  # Ubuntu

# Kjør
./scripts/supabase-sql-executor.sh your.sql --method psql
```

### 2. Supabase CLI
**Krever:** `supabase login`

```bash
supabase login
./scripts/supabase-sql-executor.sh your.sql --method cli
```

### 3. Management API
**Krever:** `SUPABASE_ACCESS_TOKEN`

```bash
# Generer token på: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="sbp_xxxx"
./scripts/supabase-sql-executor.sh your.sql --method api
```

### 4. Auto (prøv alle)
```bash
./scripts/supabase-sql-executor.sh your.sql --method auto
```

## 🔑 Nødvendige Credentials

Scriptet leser automatisk fra `.env.local`:

```bash
# Påkrevd for alle metoder
CRON_SECRET=your_cron_secret_here

# Valgfritt (for psql-metoden)
SUPABASE_DB_PASSWORD=your_db_password_here

# Valgfritt (for API-metoden)
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
```

## 🐛 Feilsøking

### "psql not found"
```bash
# macOS
brew install libpq
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Last ned fra: https://www.postgresql.org/download/windows/
```

### "All methods failed"
Scriptet vil automatisk vise manuell fallback med:
- Direkte link til Supabase Dashboard
- Sti til generert SQL-fil
- Kommando for å kopiere til clipboard

### Verifisering etter kjøring
```sql
-- Sjekk at jobbene finnes
SELECT * FROM cron.job WHERE jobname LIKE 'klarpakke%';

-- Se siste kjøringer
SELECT * FROM cron.job_run_details 
WHERE jobname LIKE 'klarpakke%' 
ORDER BY start_time DESC LIMIT 10;
```

## 📝 Eksempler

### Kjør custom SQL
```bash
./scripts/supabase-sql-executor.sh my-custom-script.sql
```

### Kjør med spesifikk metode
```bash
./scripts/supabase-sql-executor.sh setup-supabase-cron.sql --method psql
```

### Python backup
```bash
python3 scripts/execute-sql-python.py setup-supabase-cron.sql "$DB_PASSWORD"
```

## 🎯 Hva skjer automatisk?

```
┌─────────────────┐
│ 1. Les .env     │
│    Hent secrets │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. Generer SQL  │
│    Bytt ut      │
│    CRON_SECRET  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Prøv metoder │
│    - psql ✅    │
│    - CLI        │
│    - API        │
│    - Python     │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 4a. Success!    │     │ 4b. Fallback    │
│    pg_cron      │     │    Vis manuell  │
│    aktivert 🎉  │     │    instruksjon  │
└─────────────────┘     └─────────────────┘
```

## 💡 Pro Tips

1. **Legg til alias i `.zshrc`:**
```bash
alias klarpakke-cron="~/klarpakke/scripts/setup-cron-oneclick.sh"
```

2. **Auto-kjør etter deploy:**
```bash
# I din deploy-pipeline
./scripts/setup-cron-oneclick.sh || true
```

3. **Sjekk status:**
```bash
# Lag et status-script
cat > check-cron.sh << 'EOF'
psql "$DATABASE_URL" -c "SELECT jobname, active FROM cron.job WHERE jobname LIKE 'klarpakke%';"
EOF
```

---

**Laget for Klarpakke Auto-Trading System 🚀**
