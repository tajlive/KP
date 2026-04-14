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

## 🎨 Marketing Content (if applicable)

- [ ] Ingen dupliserte marketing-seksjoner (sjekk /, /paper, /priser, /hjelp)
- [ ] Nye tekstblokker ligger i delte komponenter, ikke copy-pastet på flere sider
- [ ] `npm run test:duplicate` passerer (hvis aktuelt)
- [ ] Delte komponenter brukes kun én gang per side

### Marketing Components Location
- Paper Hero: `src/features/marketing/components/PaperHero.tsx`
- Getting Started Steps: `src/features/marketing/components/GettingStartedSteps.tsx`
- Help Contact Block: `src/features/marketing/components/HelpContactBlock.tsx`

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

## 🔧 Infrastructure & Routing
- [ ] Er `smoke-prod.sh` oppdatert hvis routing-config er endret?
- [ ] Er `ARCHITECTURE.md` oppdatert ved infrastruktur-endring?
- [ ] Er `database.types.ts` regenerert ved schema-endring?
- [ ] Kjørt `npm run lint:gate` — under 100 warnings?

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
