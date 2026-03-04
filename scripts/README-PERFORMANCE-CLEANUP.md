# Klarpakke Database Performance Cleanup

Automatisert løsning for å fikse RLS policies, droppe unused indexes og aktivere bot health monitoring.

## 🎯 Hva gjør dette?

1. **Fikser 186 slow RLS policies** - Endrer `auth.uid()` til `(SELECT auth.uid())` for 10-100x raskere queries
2. **Dropper 20+ unused indexes** - Frigjør diskplass og forbedrer write-performance
3. **Aktiverer bot health cron job** - Sender Telegram alerts hvis bots er nede

## 🚀 Hurtigstart

### 1. Sjekk status først
```bash
./scripts/performance-cleanup-check.sh
```

### 2. Kjør cleanup (tørrkjøring først)
```bash
# Simuler uten å gjøre endringer
./scripts/performance-cleanup-auto.sh --dry-run

# Kjør for real
./scripts/performance-cleanup-auto.sh
```

### 3. Verifiser etterpå
```bash
./scripts/performance-cleanup-verify.sh
```

## 📁 Filer

| Fil | Beskrivelse |
|-----|-------------|
| `performance-cleanup-auto.sh` | Hovedscript - kjører hele cleanup |
| `performance-cleanup-check.sh` | Sjekk status før cleanup |
| `performance-cleanup-verify.sh` | Verifiser etter cleanup |

## 🔒 Sikkerhet

- ✅ Kjører lokalt på din maskin
- ✅ Leser credentials fra `.env.local`
- ✅ Eksponerer ALDRI `service_role` key i logger
- ✅ Logger alle SQL queries til `logs/performance-cleanup-*/`
- ✅ Lager backup før endringer

## ⚠️ Rollback

Hvis noe går galt:

```bash
./scripts/performance-cleanup-auto.sh --rollback
```

Dette gjenoppretter alle RLS policies fra backup.

## 🔧 Forutsetninger

- Supabase CLI installert (`npm install -g supabase`)
- Logget inn i Supabase CLI (`supabase login`)
- `.env.local` med nødvendige variabler

## 📊 Hva skjer under kjøring?

```
STEG 1: Backup
  → Lager backup_policies_20260224 tabell

STEG 2: Diagnose
  → Teller slow policies
  → Finner unused indexes
  → Sjekker pg_cron

STEG 3: Fix RLS
  → Itererer over 186 policies
  → Dropper og gjenoppretter med SELECT auth.uid()
  → Logger hver endring

STEG 4: Drop Indexes
  → Genererer drop-script
  → Spør om bekreftelse
  → Kjører drops

STEG 5: Bot Health
  → Oppretter bot_health tabell
  → Aktiverer pg_cron
  → Setter opp cron-job (hvert 10. min)

STEG 6: Verifisering
  → Sjekker at ingen slow policies gjenstår
  → Teller remaining unused indexes
  → Bekrefter cron job er aktiv
```

## 🆘 Feilsøking

### "Supabase CLI ikke installert"
```bash
npm install -g supabase
```

### "Ikke logget inn i Supabase CLI"
```bash
supabase login
```

### "Backup finnes ikke"
```bash
# Kjør backup manuelt først
echo "CREATE TABLE public.backup_policies_20260224 AS 
SELECT * FROM pg_policies WHERE schemaname = 'public';" | supabase db execute
```

## 📈 Forventet Resultat

- **Før**: 186 slow policies, auth.uid() kalles flere ganger per query
- **Etter**: 0 slow policies, auth.uid() caches med SELECT
- **Impact**: 10-100x raskere queries på store tabeller

## 📝 SQL Referanse

Se `supabase/migrations/performance_cleanup_20260224/` for:
- `01_backup_all_policies.sql`
- `05_fix_rls_auth_uid.sql`
- `07_drop_unused_indexes.sql`
- `08_bot_health_alerting.sql`
- `09_rollback_policies.sql`
