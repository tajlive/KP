# MANUELL SQL KJØREPLAN

Siden Supabase CLI ikke har direkte SQL-execute for remote databaser, må SQL-filene kjøres manuelt i Supabase Dashboard.

## URL
https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql/new

## Kjøreplan

1. **Backup** - Kjør: `supabase/migrations/performance_cleanup_20260224/01_backup_all_policies.sql`
2. **Diagnostikk** - Kjør: `02_diagnose_slow_rls.sql`, `03_diagnose_overlapping_policies.sql`, `04_diagnose_unused_indexes.sql`
3. **Fix RLS** - Kjør: `05_fix_rls_auth_uid.sql`
4. **Konsolider** - Kjør: `06_consolidate_overlapping_policies.sql` (tilpass først)
5. **Drop Indexes** - Kjør: `07_drop_unused_indexes.sql` (test først)
6. **Bot Alerting** - Kjør: `08_bot_health_alerting.sql`
7. **Verifiser** - Kjør: `10_final_verification.sql`

## Viktig

Etter hver kjøring: Kopier resultatet og send til Kimi for sluttrapport.
