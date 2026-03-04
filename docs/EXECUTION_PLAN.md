# KLARPAKKE SYSTEM REPAIR - EXECUTION PLAN

## Forutsetninger
- [ ] Backup av produksjonsdatabase er tatt
- [ ] Testmiljø er klart
- [ ] Alle miljøvariabler er satt

## Steg-for-Steg Kjøring

### Steg 1: Kjør SQL Migrering (5-10 min)
```bash
psql $DATABASE_URL -f sql/20260225_unified_trading_system.sql
```

**Verifiser:**
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('auto_trading_sessions', 'auto_trading_trades');
-- Skal returnere 0
```

### Steg 2: Deploy Kodeendringer (2-3 min)
```bash
# Kopier oppdaterte filer
src/app/api/auto-trading/session/route.ts        [NY]
src/app/api/cron/tick/route.ts                    [ENDRET]
src/lib/auto-trading/risk-manager.ts              [ENDRET]
src/lib/types/trading.ts                          [ENDRET]

# Type check
npm run type-check

# Build
npm run build
```

### Steg 3: Verifiser System (3-5 min)
```bash
# Kjør verifiseringsscript
export TEST_BASE_URL=http://localhost:3000
export CRON_SECRET=your-cron-secret
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=testpass123

./scripts/verify_unified_system.sh
```

### Steg 4: Deploy til Produksjon
```bash
git add -A
git commit -m "CRITICAL: Unify trading system - eliminate split-brain architecture

- Merge auto_trading_sessions into trading_sessions
- Merge auto_trading_trades into trades
- Add RiskManager integration to cron tick
- Update all API routes to use unified tables
- Add comprehensive error logging with Sentry

Fixes: P0.1-P0.5 critical issues"

git push origin main
gh run watch
```

## Rollback Plan (Hvis Noe Går Galt)

```bash
# Gjenopprett fra backup (hvis tilgjengelig)
psql $DATABASE_URL -f backup/20260225_pre_migration.sql

# Eller gjenopprett fra _migration_backup_* tabeller
psql $DATABASE_URL -c "
    INSERT INTO auto_trading_sessions SELECT * FROM _migration_backup_auto_sessions;
    INSERT INTO auto_trading_trades SELECT * FROM _migration_backup_auto_trades;
"
```

## Support Kontakt
- Teknisk ansvarlig: Se GitHub Issues
- Database spørsmål: Sjekk _migration_backup_* tabeller
