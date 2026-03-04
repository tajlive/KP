# 🔧 Klarpakke Runbook

## Vanlige Operasjoner

### Rotere Secrets

**ENCRYPTION_KEY:**
```bash
npx tsx scripts/generate-encryption-key.ts
vercel env add ENCRYPTION_KEY production
# Redeploy
```

**CRON_SECRET:**
```bash
NEW_SECRET=$(openssl rand -hex 32)
vercel env add CRON_SECRET production
```

### Manuell Cron Trigger
```bash
curl -X GET https://www.klarpakke.no/api/cron/tick \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X GET https://www.klarpakke.no/api/cron/daily-summary \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Sjekke Logs

**Vercel:**
```bash
vercel logs --follow
```

**Sentry:**
Gå til https://sentry.io → Issues

### Database Backup

**Supabase:**
Automatisk backup hver natt.

**Manual backup:**
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

---

## 🚨 Feilsøking

### "API keys not decrypting"
- Sjekk at ENCRYPTION_KEY er satt i Vercel
- Verifiser at key er 64 hex chars
- Sjekk at samme key brukes for kryptering og dekryptering

### "Cron not running"
- Sjekk Vercel cron logs: `vercel logs --follow`
- Verifiser CRON_SECRET er satt
- Test manuelt med curl

### "Emails not sending"
- Sjekk RESEND_API_KEY er satt
- Verifiser domain i Resend (https://resend.com/domains)
- Sjekk Resend logs

### "Sentry not capturing errors"
- Verifiser NEXT_PUBLIC_SENTRY_DSN
- Sjekk Sentry project settings

### "Stripe webhooks failing"
- Verifiser STRIPE_WEBHOOK_SECRET
- Sjekk webhook URL i Stripe Dashboard
- Test med Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 📊 Monitoring

### Daglig Sjekkliste
- [ ] Sjekk Sentry for nye errors
- [ ] Verifiser Vercel deployment status
- [ ] Sjekk Supabase connection
- [ ] Review cron execution logs

### Ukentlig Sjekkliste
- [ ] Review trading metrics
- [ ] Sjekk brukerstatistikk
- [ ] Review Stripe payments
- [ ] Sjekk email delivery rates

---

## 🔄 Deployment

### Staging → Production
1. Test på staging: `vercel --target=preview`
2. Verifiser alle env vars
3. Merge til main: `git push origin main`
4. Monitor Vercel deployment
5. Test health endpoint: `curl https://www.klarpakke.no/api/health`

### Rollback
```bash
# Finn forrige deployment
vercel list

# Rollback til forrige
vercel rollback
```
