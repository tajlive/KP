# 🚨 SECURITY INCIDENT REPORT

## Status: CRITICAL - Credentials Exposed in Git History

### Incident Details

**Date Discovered:** 2026-01-31
**Severity:** CRITICAL
**Status:** Requires Immediate Action

### What Happened

The `.env` file containing Supabase credentials was committed to git repository and later removed:

```bash
commit 75d2f89e026822236cbfd0a400525d5a18db0443
Author: tajlive
Date:   Thu Jan 29 05:47:12 2026 +0100
    security: remove .env from tracking
```

**Additional Exposure:** `webflow/auth.js` contains hardcoded credentials (lines 16-17):
- Supabase URL: `https://swfyuwkptusceiouqlks.supabase.co`
- Supabase ANON_KEY: Visible in plaintext

### Impact Assessment

**Exposed Credentials:**
- ✅ NEXT_PUBLIC_SUPABASE_URL (public, low risk)
- ⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY (public with RLS, medium risk)
- 🚨 SUPABASE_SERVICE_ROLE_KEY (if in .env - HIGH RISK)

**Potential Risks:**
1. Unauthorized database access (if RLS policies have gaps)
2. API quota abuse
3. Data exfiltration
4. Cost overruns from API abuse

### Immediate Actions Required

#### 1. Rotate Supabase Keys (URGENT - Do This First)

Go to Supabase Dashboard:
```
https://supabase.com/dashboard/project/swfyuwkptusceiouqlks/settings/api
```

**Steps:**
1. Generate new ANON_KEY
2. Generate new SERVICE_ROLE_KEY
3. Update all deployment environments
4. Update local `.env.local`
5. Update GitHub Secrets
6. Deploy immediately

#### 2. Audit Database Access Logs

Check Supabase Dashboard → Logs for:
- Unusual queries
- Failed authentication attempts
- Unexpected table access
- High API usage spikes

#### 3. Review Row-Level Security Policies

Verify RLS is enabled on ALL tables:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Ensure policies block unauthorized access:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

#### 4. Git History Cleanup (Optional but Recommended)

**WARNING:** This rewrites git history and will break forks/clones.

```bash
# Use BFG Repo-Cleaner to remove .env from history
brew install bfg
bfg --delete-files .env klarpakke.git
cd klarpakke.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**Alternative:** If repo is public, consider creating new repo and migrating code.

### Preventive Measures

#### 1. Fix webflow/auth.js

Replace hardcoded credentials with runtime config:

```javascript
// Instead of:
const CONFIG = {
  SUPABASE_URL: 'https://...',
  SUPABASE_ANON_KEY: 'eyJ...'
};

// Use:
const CONFIG = {
  SUPABASE_URL: window.ENV?.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: window.ENV?.SUPABASE_ANON_KEY || ''
};
```

Then inject via Webflow Custom Code (Project Settings → Custom Code → Head):
```html
<script>
  window.ENV = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_NEW_ANON_KEY_HERE'
  };
</script>
```

#### 2. Add Pre-commit Hook

Install `git-secrets`:
```bash
brew install git-secrets
git secrets --install
git secrets --register-aws
git secrets --add 'supabase\.co'
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'
```

#### 3. Add .env to .gitignore (Already Done)

Verify:
```bash
grep -n "^\.env$" .gitignore
# Should show: 4:.env
```

#### 4. Use GitHub Secret Scanning

Enable in repo settings:
```
Settings → Code security and analysis → Secret scanning → Enable
```

#### 5. Environment Variable Validation

Add to `src/lib/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100)
});

export const env = envSchema.parse(process.env);
```

### Timeline

- **Jan 29, 2026 05:47:** `.env` removed from git tracking
- **Jan 30, 2026 15:25:** Additional .gitignore updates
- **Jan 31, 2026:** Security issue discovered during code review

### Lessons Learned

1. Never commit `.env` files - use `.env.example` templates
2. Rotate credentials immediately after exposure
3. Use git pre-commit hooks to prevent credential commits
4. Store secrets in Webflow project settings, not code
5. Enable secret scanning in GitHub

### Action Items Checklist

- [ ] **URGENT:** Rotate Supabase ANON_KEY
- [ ] **URGENT:** Rotate Supabase SERVICE_ROLE_KEY
- [ ] **HIGH:** Update all deployment environments
- [ ] **HIGH:** Fix webflow/auth.js to use runtime config
- [ ] **HIGH:** Audit database access logs
- [ ] **MEDIUM:** Review and strengthen RLS policies
- [ ] **MEDIUM:** Install git-secrets pre-commit hook
- [ ] **MEDIUM:** Enable GitHub secret scanning
- [ ] **LOW:** Clean git history (optional)
- [ ] **LOW:** Add environment variable validation

### Verification

After rotating credentials, verify:

```bash
# 1. Old keys no longer work
curl https://swfyuwkptusceiouqlks.supabase.co/rest/v1/signals \
  -H "apikey: OLD_KEY_HERE" \
  -H "Authorization: Bearer OLD_KEY_HERE"
# Should return: 401 Unauthorized

# 2. New keys work
curl https://swfyuwkptusceiouqlks.supabase.co/rest/v1/signals \
  -H "apikey: NEW_KEY_HERE" \
  -H "Authorization: Bearer NEW_KEY_HERE"
# Should return: 200 OK (or data)
```

### Contact

If you believe credentials were actively exploited:
1. Contact Supabase support immediately
2. Review billing for unexpected charges
3. Check for unauthorized database changes
4. Consider filing incident report with stakeholders

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Next Review:** After credential rotation completion
