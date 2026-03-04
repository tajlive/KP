## CLOUDFLARE PRODUCTION ENV VARS - COPY/PASTE READY

### 🚀 PRODUCTION (klarpakke-trading.pages.dev)

Go to: https://dash.cloudflare.com → Pages → klarpakke-trading → Settings → Environment variables → Production

```
SUPABASE_URL=https://swfyuwkptusceiouqlks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWFwYWJhc2UtZGVtbyIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1MjM2MDAsImV4cCI6MjAyMjA5OTYwMH0.[TRUNCATED]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWFwYWJhc2UtZGVtbyIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZV9rZXkiLCJpYXQiOjE3MDY1MjM2MDAsImV4cCI6MjAyMjA5OTYwMH0.[TRUNCATED]
STRIPE_SECRET_KEY=sk_test_[din_stripe_test_key]
STRIPE_WEBHOOK_SECRET=whsec_[din_webhook_secret]
SITE_URL=https://klarpakke-trading.pages.dev
RESEND_API_KEY=re_[din_resend_key]
POSTHOG_API_KEY=phc_[din_posthog_key]
```

### 🔄 After Adding:
1. Deploy → Redeploy (Production)
2. Wait 2min
3. Test: https://klarpakke-trading.pages.dev/login

### ✅ Verification Checklist:
- [ ] Login form → Supabase auth OK
- [ ] Waitlist signup → Email send
- [ ] /api/risk-calculator → 200 OK
- [ ] Pricing → Stripe checkout

**PH Launch 18:00 Ready!**