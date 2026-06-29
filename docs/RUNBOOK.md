# 🔧 Klarpakke Runbook

## Vanlige Operasjoner

### Rotere Secrets

**ENCRYPTION_KEY:**
```bash
npx tsx scripts/generate-encryption-key.ts
npx wrangler secret put ENCRYPTION_KEY
# Redeploy
```

**CRON_SECRET:**
```bash
NEW_SECRET=$(openssl rand -hex 32)
echo -n "$NEW_SECRET" | npx wrangler secret put CRON_SECRET
```

### Manuell Cron Trigger
```bash
curl -X GET https://www.klarpakke.no/api/cron/tick \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X GET https://www.klarpakke.no/api/cron/daily-summary \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Sjekke Logs

**Cloudflare Workers:**
```bash
npx wrangler tail
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
- Sjekk at ENCRYPTION_KEY er satt i Wrangler secrets
- Verifiser at key er 64 hex chars
- Sjekk at samme key brukes for kryptering og dekryptering

### "Cron not running"
- Sjekk Cloudflare Workers logs: `npx wrangler tail`
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
- [ ] Verifiser Cloudflare Workers deployment status
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
1. Test lokalt: `npm run build`
2. Verifiser alle env vars / Wrangler secrets
3. Merge til main: `git push origin main`
4. Deploy manuelt eller vent på Cloudflare Workers Builds: `npm run cf:deploy`
5. Monitor Cloudflare Workers logs
6. Test health endpoint: `curl https://www.klarpakke.no/api/health`

### Rollback
```bash
# Redeploy forrige kjente gode commit
npm run cf:deploy

# Eller bruk Cloudflare Dashboard → Workers & Pages → Rollback
```
