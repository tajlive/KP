# Troubleshooting

> **Versjon:** 1.0.0  
> **Oppdatert:** 2026-02-10  
> **For:** Alle (utviklere, administratorer, brukere)

---

## Quick Diagnostic

```bash
# Run full health check
bash scripts/verify-production.sh

# Check all systems
bash scripts/full-deploy.sh
```

---

## Build Errors

### TypeScript Errors

**Symptom:**
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.
```

**Solution:**
```bash
# Check specific error
npm run type-check

# Common fixes:
# 1. Missing type annotation
const data: UserData = await fetchUser();

# 2. Incorrect prop type
interface Props {
  id: string;  // not number
}

# 3. Null check needed
if (!data) return null;
```

### Build Fails

**Symptom:**
```
Build failed with errors
```

**Solution:**
```bash
# Clear cache
rm -rf .next
rm -rf dist

# Reinstall dependencies
rm -rf node_modules
npm install --legacy-peer-deps

# Try build again
npm run build
```

---

## Database Errors

### "Column X does not exist"

**Symptom:**
```
error: column pt.user_id does not exist
```

**Solution:**
```bash
# Fix migration
bash scripts/fix-migration-leaderboard.sh
supabase db push
```

### "Duplicate key value violates unique constraint"

**Symptom:**
```
error: duplicate key value violates unique constraint "lessons_course_id_slug_key"
```

**Solution:**
```bash
# Fix courses migration
bash scripts/fix-migration-courses.sh
supabase db push
```

### Migration Fails

**Symptom:**
```
supabase db push failed
```

**Solution:**
```bash
# Check status
supabase migration list

# Repair if needed
supabase migration repair --status reverted <timestamp>

# Try again
supabase db push
```

### Connection Failed

**Symptom:**
```
Error: connection refused
```

**Check:**
1. Internet connection
2. Supabase status: https://status.supabase.com
3. Environment variables:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

---

## RLS Errors

### "No rows returned"

**Symptom:** Query returns empty when data exists.

**Cause:** RLS policy blocking access.

**Solution:**
```sql
-- Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';

-- Test with service role (bypasses RLS)
const supabaseAdmin = createClient(url, service_role_key);
```

### "Permission denied"

**Symptom:**
```
new row violates row-level security policy for table "X"
```

**Solution:**
1. Check user is authenticated: `auth.uid()` should return UUID
2. Check policy allows operation
3. Verify user has correct role

---

## Admin Panel Issues

### Cannot Access Admin

**Symptom:** Redirected to `/admin/login`

**Check:**
```sql
-- Verify admin role
SELECT email, role FROM profiles WHERE email = 'taj@klarpakke.no';

-- Should return: role = 'admin'
```

**Fix:**
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'taj@klarpakke.no';
```

### TAJ Robot Not Responding

**Symptom:** Robot status shows "Error" or not updating.

**Solution:**
1. Check browser console for errors
2. Verify Supabase connection
3. Try emergency stop: `/admin/auto-trading` → "Force lukk alt"
4. Check logs in admin panel

---

## Performance Issues

### Slow Page Load

**Symptom:** > 3 seconds to load.

**Check:**
```bash
# Lighthouse audit
npm run lighthouse

# Check bundle size
npm run analyze
```

**Solutions:**
1. Enable caching in Cloudflare
2. Optimize images (WebP format)
3. Lazy load components
4. Check for N+1 queries

### Database Slow

**Symptom:** Queries taking > 1 second.

**Check:**
```sql
-- Find slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Solutions:**
1. Add indexes:
   ```sql
   CREATE INDEX idx_table_column ON table(column);
   ```
2. Optimize queries (avoid SELECT *)
3. Use materialized views for leaderboard

---

## Environment Issues

### Missing Environment Variables

**Symptom:**
```
Error: Supabase environment variables not set
```

**Solution:**
```bash
# Create .env.local
cp .env.example .env.local

# Edit with your values
nano .env.local

# Required:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Node Modules Issues

**Symptom:**
```
Cannot find module 'X'
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## CI/CD Issues

### GitHub Actions Fails

**Symptom:** Workflow fails at any job.

**Debug:**
1. Check logs in GitHub: https://github.com/tombomann/klarpakke/actions
2. Run locally:
   ```bash
   npm run type-check
   npm run build
   bash scripts/test-e2e.sh
   ```

### Deploy Not Triggering

**Symptom:** Push to main doesn't deploy.

**Check:**
1. GitHub Actions is enabled
2. `.github/workflows/` exists with valid workflows
3. Secrets are configured in GitHub

---

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `relation "X" does not exist` | Missing migration | Run `supabase db push` |
| `column "X" does not exist` | Schema mismatch | Check/fix migration |
| `JWT expired` | Session timeout | Log in again |
| `new row violates RLS` | Missing policy | Add RLS policy |
| `Network Error` | Connection issue | Check internet/Supabase status |
| `Build failed` | TypeScript error | Run `npm run type-check` |

---

## Getting Help

### Before Asking

1. Check this troubleshooting guide
2. Search error message in docs/
3. Check Supabase/Next.js docs
4. Try solution locally first

### Information to Provide

When reporting issues:
- Error message (full stack trace)
- Steps to reproduce
- Environment (local/staging/production)
- Recent changes
- Git commit hash

### Contact

- **Technical support:** support@klarpakke.no
- **Admin issues:** taj@klarpakke.no
- **GitHub Issues:** https://github.com/tombomann/klarpakke/issues

---

## Emergency Procedures

### Site is Down

1. Check Cloudflare status
2. Check Supabase status
3. Check GitHub Actions last deploy
4. If needed, revert last commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

### Database Corruption

1. Stop all writes
2. Restore from backup:
   ```bash
   bash scripts/backup-db.sh  # List backups
   # Restore specific backup
   supabase db restore <backup-file>
   ```

### Security Breach

1. Rotate all secrets
2. Check audit logs
3. Force logout all users
4. Notify affected users

---

## Related

- [runbooks/database-migration.md](runbooks/database-migration.md)
- [runbooks/rollback.md](runbooks/rollback.md)
- [runbooks/emergency-stop-robot.md](runbooks/emergency-stop-robot.md)
