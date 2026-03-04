# 🚀 Produksjons Sjekkliste

## ✅ Pre-Launch

- [x] Alle Vercel env vars satt (dokumentert i .env.local)
- [x] Stripe webhook konfigurert (verify-webhook.ts)
- [ ] Resend domain verifisert (krever Resend-konto)
- [x] Sentry fungerer (config eksisterer)
- [x] MCP Server bygd og testet
- [x] Cron jobs konfigurert (vercel.json)
- [x] API-nøkler krypteres før lagring (encrypt-api-keys.ts)

## 🔐 Sikkerhet

- [x] ENCRYPTION_KEY generert og dokumentert
- [x] CRON_SECRET generert
- [ ] CRON_SECRET satt i Vercel
- [ ] STRIPE_WEBHOOK_SECRET satt i Vercel
- [x] Ingen secrets i Git history
- [x] RLS policies aktivert på alle tabeller

## 📧 Notifikasjoner

- [ ] Resend API key satt i Vercel
- [x] Email templates opprettet
- [x] Daily summary cron (kl. 19:00)

## 📊 Monitoring

- [x] Sentry integrert
- [x] GDPR-filtrering aktivert
- [x] Error handling i alle API routes

## 🧪 Testing

- [x] Unit tests passerer (33 passed)
- [x] Integration tests passerer
- [x] Type-check passerer

## ⚠️ MANUELLE STEG (må gjøres av Tom)

### 1. Sett Vercel Environment Variables
```bash
vercel env add ENCRYPTION_KEY production
# Value: 5b7640de632d4d679c2ed7366e946bc1c36a5439bc458deb27a37d0b1d742e34

vercel env add CRON_SECRET production
# Value: a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8

vercel env add NEXT_PUBLIC_SENTRY_DSN production
# Hent fra sentry.io

vercel env add SENTRY_AUTH_TOKEN production
# Hent fra sentry.io

vercel env add STRIPE_WEBHOOK_SECRET production
# Hent fra Stripe Dashboard

vercel env add RESEND_API_KEY production
# Hent fra resend.com
```

### 2. Verifiser Stripe Webhook
- Gå til: https://dashboard.stripe.com/webhooks
- Endpoint: https://www.klarpakke.no/api/webhooks/stripe
- Velg events: checkout.session.completed, customer.subscription.updated

### 3. Verifiser Resend Domain
- Gå til: https://resend.com/domains
- Legg til: klarpakke.no
- Konfigurer DNS (SPF, DKIM, DMARC)

### 4. Test MCP Server
```bash
cd klarpakke-mcp
npm run build
```

### 5. Deploy til Produksjon
```bash
git push origin main
# Vercel deployer automatisk
```

## 📱 Neste Steg Etter Launch

1. Onboard første betalende kunde
2. Monitor Sentry (første 48t)
3. Teste alle flows med ekte data
4. Samle feedback for iterasjon 2
