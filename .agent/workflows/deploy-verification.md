---
description: Mandatory deployment verification protocol to prevent deploying wrong code
---

# Deployment Verification Protocol

## ⚠️ CRITICAL: Follow this EVERY time before confirming deployment

### Phase 1: Pre-Deploy Checklist
1. **Verify all changes are committed**
   ```bash
   git status  # Must show "nothing to commit, working tree clean"
   ```

2. **Push to Git FIRST**
   ```bash
   git push origin main
   # WAIT for exit code 0
   ```

3. **Verify push succeeded**
   ```bash
   git log origin/main -1  # Check latest commit is yours
   ```

### Phase 2: Deploy
```bash
# Use --force if cache issues suspected
vercel --prod --yes
```

### Phase 3: MANDATORY Visual Verification
**NEVER skip this step!**

1. **Use browser_subagent to verify fixes**
   - Navigate to production URL
   - Check SPECIFIC fixes that were implemented
   - Take screenshots as proof
   - Return PASS/FAIL with evidence

2. **Compare deployed code with local**
   - Use browser inspector to check class names
   - Verify text content matches expected locale
   - Check z-index values match code

3. **Only confirm success if browser test PASSES**
   - ✅ If PASS: Notify user with screenshot proof
   - ❌ If FAIL: Investigate deployment logs, check commit hash, retry

### Phase 4: Update Memory
- Document what worked
- Document what failed
- Update this protocol if needed

## Common Deployment Issues

### Issue: Vercel deploys old code
**Cause:** Build cache using stale files
**Fix:** `vercel --force --prod --yes`

### Issue: Changes committed but not pushed
**Cause:** Forgot to push or push failed
**Fix:** Always check `git log origin/main` before deploy

### Issue: Browser shows old content
**Cause:** Browser cache or Service Worker
**Fix:** Hard refresh (Cmd+Shift+R) or inspect DOM directly

## Anti-Pattern: NEVER DO THIS
❌ Deploy → Say "fixed" → Don't test
❌ Commit → Deploy immediately without pushing
❌ Trust build logs without visual verification
❌ Assume deployment worked because no errors

## Best Pattern: ALWAYS DO THIS
✅ Commit → Push → Verify push → Deploy → **Test visually** → Confirm
✅ Use browser_subagent for every deployment verification
✅ Take screenshots as proof before notifying user
✅ If test fails, investigate before retrying
