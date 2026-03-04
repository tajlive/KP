# 🚀 GO-LIVE SJEKKELISTE - Klarpakke

**Dato:** 2026-02-28  
**Status:** 🟡 KLAR FOR PRODUKSJON (etter stegene under)

---

## ✅ MÅ GJØRES FØR GO-LIVE

### 1. Edge Functions (5 min)
```bash
supabase functions deploy send-notifications --project-ref vuxbjlykgmzskxbclquf
```
**Verifiser:**
- [ ] Ingen errors i deploy output
- [ ] Function vises i Supabase Dashboard → Edge Functions

---

### 2. Stripe Webhook (10 min)
**URL:** https://dashboard.stripe.com/webhooks

- [ ] Klikk "Add endpoint"
- [ ] URL: `https://www.klarpakke.no/api/webhooks/stripe`
- [ ] Velg events:
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Kopier "Signing secret"
- [ ] Legg til i Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

### 3. Resend Webhook (5 min)
**URL:** https://resend.com/webhooks

- [ ] Klikk "Add webhook"
- [ ] URL: `https://www.klarpakke.no/api/webhooks/resend`
- [ ] Velg events:
  - [ ] `email.sent`
  - [ ] `email.delivered`
  - [ ] `email.bounced`
  - [ ] `email.complained`
  - [ ] `email.opened`
  - [ ] `email.clicked`
- [ ] Kopier webhook secret
- [ ] Legg til i Vercel: `RESEND_WEBHOOK_SECRET=...`

---

### 4. Vercel Environment Variables (5 min)
**URL:** https://vercel.com/dashboard/klarpakke/settings/environment-variables

**Sjekk at disse er satt:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` ⭐ NY
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_WEBHOOK_SECRET` ⭐ NY
- [ ] `SENTRY_DSN`

---

### 5. Produksjonstest (15 min)

#### Automatiske tester:
```bash
# Kjør disse kommandoene:
curl -I https://www.klarpakke.no/no
curl -I https://www.klarpakke.no/api/health
curl -I https://www.klarpakke.no/api/webhooks/stripe
curl -I https://www.klarpakke.no/api/webhooks/resend
```
**Forventet:** Alle returnerer HTTP 200

#### Manuell test:
- [ ] Registrer ny bruker
- [ ] Logg inn
- [ ] Gå til /no/priser
- [ ] Velg en plan (Bachelor/Master/PhD)
- [ ] Fullfør betaling med test-kort:
  - Nummer: `4242 4242 4242 4242`
  - Dato: `12/25`
  - CVC: `123`
- [ ] Verifiser at du får velkomst-email
- [ ] Verifiser at du blir redirected til dashboard
- [ ] Sjekk at subscription vises riktig

#### Gamification test:
- [ ] Logg inn daglig → sjekk streak øker
- [ ] Utfør en trade → sjekk XP øker
- [ ] Se om level-up fungerer ved tilstrekkelig XP

---

## ✅ POST GO-LIVE (Overvåking)

### Første 24 timer:
- [ ] Sjekk Sentry for errors: https://sentry.io/klarpakke/klarpakke-web/
- [ ] Sjekk Vercel Analytics: https://vercel.com/dashboard/analytics
- [ ] Sjekk Supabase Logs: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/logs
- [ ] Sjekk Stripe Dashboard for vellykkede betalinger

### Daglig (første uke):
- [ ] MCP Test Runner: `npm run mcp:test`
- [ ] Sjekk error rate i Sentry
- [ ] Sjekk at cron-jobs kjører (pg_cron)

---

## 🚨 ROLLBACK PLAN

Hvis noe går galt:

1. **Rask fiks:** Redeploy forrige versjon
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database rollback:**
   ```bash
   supabase db reset  # FORSIKTIG - sletter all data!
   # ELLER
   supabase db push --include-all  # Kjør forrige migrasjon
   ```

3. **Vercel rollback:**
   - Gå til https://vercel.com/dashboard/deployments
   - Finn forrige deployment
   - Klikk "Promote to Production"

---

## 📞 NØDKONTAKT

| Tjeneste | URL | Brukernavn |
|----------|-----|------------|
| Vercel | https://vercel.com/dashboard | tombomann |
| Supabase | https://supabase.com/dashboard | tombomann@gmail.com |
| Stripe | https://dashboard.stripe.com | tom@klarpakke.no |
| Sentry | https://sentry.io | tombomann |
| Resend | https://resend.com | tom@klarpakke.no |

---

**KLAR FOR GO-LIVE?** ✅

Sjekk av alle boksene over, deretter:
```bash
echo "🚀 GO-LIVE COMPLETE!"
```
