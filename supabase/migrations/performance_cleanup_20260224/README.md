# KLARPAKKE SQL Performance Cleanup

**Dato:** 2026-02-24  
**Prosjekt:** klarpakke (vuxbjlykgmzskxbclquf)  
**Mål:** Fiks 183 RLS-policies + 175 overlappende + 158 unused indexes + bot alerting

---

## 📁 Filoversikt

| Fil | Beskrivelse | Kjør rekkefølge |
|-----|-------------|-----------------|
| `01_backup_all_policies.sql` | Backup av alle RLS-policies | **1** (alltid først!) |
| `02_diagnose_slow_rls.sql` | Diagnostiser auth.uid()-problemer | 2 |
| `03_diagnose_overlapping_policies.sql` | Finn overlappende policies | 3 |
| `04_diagnose_unused_indexes.sql` | Finn unused indexes | 4 |
| `05_fix_rls_auth_uid.sql` | **FIX:** auth.uid() → (SELECT auth.uid()) | **5** |
| `06_consolidate_overlapping_policies.sql` | **FIX:** Kombiner overlappende policies | 6 |
| `07_drop_unused_indexes.sql` | **FIX:** Dropp unused indexes | 7 |
| `08_bot_health_alerting.sql` | **SETUP:** Bot monitoring + Telegram | 8 |
| `09_rollback_policies.sql` | Rollback (hvis noe går galt) | Emergency |
| `10_final_verification.sql` | Verifiser alle fixer | 9 |

---

## 🚀 Hurtigstart

### Steg 1: Backup (KRITISK!)
```sql
-- Kjør i Supabase Dashboard SQL Editor:
\i 01_backup_all_policies.sql
```

### Steg 2: Diagnostikk
```sql
-- Kjør diagnose-scriptene for å se nåværende status:
\i 02_diagnose_slow_rls.sql
\i 03_diagnose_overlapping_policies.sql
\i 04_diagnose_unused_indexes.sql
```

### Steg 3: Fix RLS Policies
```sql
-- Dette fikser 183 policies automatisk:
\i 05_fix_rls_auth_uid.sql
```

### Steg 4: Konsolider Overlappende Policies
```sql
-- Se output fra 03_diagnose_overlapping_policies.sql
-- Kopier og tilpass script fra 06_consolidate_overlapping_policies.sql
```

### Steg 5: Dropp Unused Indexes
```sql
-- Se output fra 04_diagnose_unused_indexes.sql
-- Kopier drop-kommandoer til 07_drop_unused_indexes.sql
\i 07_drop_unused_indexes.sql
```

### Steg 6: Setup Bot Health Alerting
```sql
-- Aktiverer monitoring:
\i 08_bot_health_alerting.sql
```

### Steg 7: Verifisering
```sql
-- Sjekk at alt er OK:
\i 10_final_verification.sql
```

---

## ⚠️ Viktige Regler

### SQL Safety
1. **ALLTID** kjør backup først (`01_backup_all_policies.sql`)
2. **ALLTID** test i staging før produksjon
3. **ALLTID** kjør `EXPLAIN ANALYZE` før du dropper indexes
4. **ALLTID** verifiser at auth fungerer etter hver endring

### Hvis Noe Går Galt
```sql
-- Rollback alle RLS-endringer:
\i 09_rollback_policies.sql
```

---

## 📊 Forventet Impact

| Endring | Før | Etter | Impact |
|---------|-----|-------|--------|
| Slow RLS policies | 183 | 0 | 10-100x raskere |
| Overlappende policies | 175 | <20 | 20-30% CPU-reduksjon |
| Unused indexes | 158 | <10 | Raskere writes |
| Bot monitoring | Ingen | Aktiv | Proaktiv alerting |

---

## 🔗 Ressurser

- **Supabase Project:** https://app.supabase.com/project/vuxbjlykgmzskxbclquf
- **SQL Editor:** https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql
- **Edge Functions:** https://app.supabase.com/project/vuxbjlykgmzskxbclquf/functions

---

## 📝 Notater

- Alle scripts er idempotente (kan kjøres flere ganger)
- Backup-tabellen `backup_policies_20260224` beholdes inntil videre
- Cron-jobben `bot-health-monitor` kjører hvert 10. minutt
- Funksjonen `check_bot_health_and_alert()` kan kalles manuelt
