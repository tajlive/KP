# Database Setup Scripts

## Rask Setup (Anbefalt)

### Alternativ 1: Supabase Dashboard (Enklest)
1. Gå til: https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new
2. Kopier innholdet fra `../supabase/migrations/20240214_create_core_tables.sql`
3. Klikk "Run"
4. Gjenta med `../supabase/seed.sql`

### Alternativ 2: Supabase CLI
```bash
# Install Supabase CLI hvis du ikke har den
npm install -g supabase

# Login
supabase login

# Push migrasjoner
supabase db push
```

### Alternativ 3: Bash Script (krever psql)
```bash
# Kjør setup script
cd ~/klarpakke
./scripts/setup.sh
```

### Alternativ 4: Node.js Script
```bash
# Sett miljøvariabel
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Kjør script
node scripts/setup-database.js
```

## Hva skjer?

Scriptene oppretter:
1. **profiles** - Brukerprofiler (koblet til auth.users)
2. **paper_trades** - Paper trading transaksjoner
3. **orders** - Betalinger og abonnementer
4. **courses** - Kurs/utdanning
5. **course_progress** - Kurs fremgang
6. **beta_signups** - Beta påmeldinger

Og legger til:
- 4 kurs (Crypto Basics, Trading 101, etc.)
- 50+ test trades
- 20+ test ordrer
- 100+ kurs påmeldinger

## Etter Setup

Dashboardet vil vise:
- **Users:** 0 (til du logger inn, da opprettes profilen automatisk)
- **Trades:** 50+ (test-data)
- **Orders:** 20+ (test-data)
- **Courses:** 4 kurs med progress data

## Troubleshooting

### "psql: command not found"
```bash
# macOS
brew install libpq

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Last ned fra https://www.postgresql.org/download/windows/
```

### "Permission denied"
Sjekk at SUPABASE_SERVICE_ROLE_KEY er satt i .env.local

### "Table already exists"
Dette er OK - scriptet bruker `IF NOT EXISTS`

## Manuell SQL

Hvis ingen script fungerer, kjør SQL manuelt i Supabase Dashboard:

```sql
-- Se filen: ../supabase/migrations/20240214_create_core_tables.sql
```
