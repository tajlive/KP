# 🚀 Produksjons Sjekkliste

## ✅ Pre-Launch

- [x] Alle Cloudflare Workers secrets satt (dokumentert i `.env.local`)
- [x] Stripe webhook konfigurert (verify-webhook.ts)
- [ ] Resend domain verifisert (krever Resend-konto)
- [x] Sentry fungerer (config eksisterer)
- [x] MCP Server bygd og testet
- [x] Cron jobs konfigurert (Supabase pg_cron)
- [x] API-nøkler krypteres før lagring (encrypt-api-keys.ts)

## 🔐 Sikkerhet

- [x] ENCRYPTION_KEY generert og dokumentert
- [x] CRON_SECRET generert
- [ ] CRON_SECRET satt i Wrangler secrets
- [ ] STRIPE_WEBHOOK_SECRET satt i Wrangler secrets
- [x] Ingen secrets i Git history
- [x] RLS policies aktivert på alle tabeller

## 📧 Notifikasjoner

- [ ] Resend API key satt i Wrangler secrets
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

### 1. Sett Cloudflare Workers Secrets
```bash
npx wrangler secret put ENCRYPTION_KEY
# Value: 5b7640de632d4d679c2ed7366e946bc1c36a5439bc458deb27a37d0b1d742e34

npx wrangler secret put CRON_SECRET
# Value: a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8

npx wrangler secret put NEXT_PUBLIC_SENTRY_DSN
# Hent fra sentry.io

npx wrangler secret put SENTRY_AUTH_TOKEN
# Hent fra sentry.io

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Hent fra Stripe Dashboard

npx wrangler secret put RESEND_API_KEY
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
# Cloudflare Workers Builds deployer automatisk, eller kjør:
npm run cf:deploy
```

## 📱 Neste Steg Etter Launch

1. Onboard første betalende kunde
2. Monitor Sentry (første 48t)
3. Teste alle flows med ekte data
4. Samle feedback for iterasjon 2
