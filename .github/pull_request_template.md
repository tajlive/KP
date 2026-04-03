## 📋 PR Checklist

- [ ] Code follows project style guidelines (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Tests pass (`npm run test:unit`)
- [ ] E2E critical tests pass (`npm run test:e2e:critical`)

## 🔐 Auth Changes (if applicable)

- [ ] OAuth redirect URIs updated in Google Cloud Console
- [ ] Supabase Auth providers configured
- [ ] Environment variables documented
- [ ] `npm run verify:google-oauth` passes

## 🚀 Deployment Notes

### Pre-deploy
```bash
npm run verify:google-oauth
npm run type-check
npm run lint
```

### Post-deploy Verification
- [ ] `/api/health` returns 200
- [ ] Google OAuth login works in incognito
- [ ] Email/password login works
- [ ] Magic link delivery works

## 🐛 Related Issues

Fixes: # (issue number)

## 📝 Description

<!-- Describe your changes -->

## 🔍 Testing

<!-- Describe how you tested your changes -->

- [ ] Local development (`npm run dev`)
- [ ] Staging environment
- [ ] Production (post-deploy)

## 📊 Sentry/Datadog

<!-- Any new alerts or monitoring added? -->

- [ ] New auth error alerts configured
- [ ] Dashboards updated

---

**Reviewer Notes:**
- For auth changes, verify redirect URI config matches Google Console
- Check Sentry auth error dashboard after deploy
