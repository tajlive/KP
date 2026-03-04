# Vercel Environment Variables – Plan

**Dato:** 2026-02-21  
**Prosjekt:** klarpakke  
**Dashboard:** https://vercel.com/tom-jensens-projects/klarpakke  

---

## 1. Oversikt

Denne filen definerer hvilke environment-variabler som skal settes i Vercel,
og i hvilke miljøer (Production / Preview / Development).

**Viktig merknad:** GitHub Actions er primær CI/CD og deployer til Cloud Run.
Vercel brukes KUN for:
- Preview deployments (for visuell QA av PRs)
- Analytics & Speed Insights (via SDK i koden)

Production-trafikk går til Cloud Run (www.klarpakke.no), ikke Vercel.

---

## 2. Variabler etter type

### 2.1 NEXT_PUBLIC_* (Client-side, tilgjengelig i browser)

| Name | Brukes til | Production | Preview | Dev | Merknad |
|------|------------|:----------:|:-------:|:---:|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase connection | ✅ | ✅ | ✅ | Samme for alle miljøer |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase auth | ✅ | ✅ | ✅ | Samme for alle miljøer |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe payments | ✅ | ✅ | ✅ | Test key for Preview/Dev |
| NEXT_PUBLIC_APP_URL | App URL | ✅ | ✅ | ✅ | https://www.klarpakke.no |
| NEXT_PUBLIC_BASE_URL | Base URL | ✅ | ✅ | ✅ | https://www.klarpakke.no |
| NEXT_PUBLIC_SITE_URL | Site URL | ✅ | ✅ | ✅ | https://www.klarpakke.no |
| NEXT_PUBLIC_DOMAIN | Domain | ✅ | ✅ | ✅ | klarpakke.no |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Push notifications | ✅ | ✅ | ✅ | For PWA |
| NEXT_PUBLIC_SENTRY_DSN | Error tracking | ✅ | ✅ | ✅ | Optional |
| NEXT_PUBLIC_CF_AI_WORKER_URL | Cloudflare AI | ✅ | ⚠️ | ⚠️ | Kan skjule i Preview |
| NEXT_PUBLIC_HUGGINGFACE_API_KEY | AI/ML | ✅ | ⚠️ | ⚠️ | Rate limits |
| NEXT_PUBLIC_ENCRYPTION_KEY | Kryptering | ✅ | ✅ | ✅ | Samme key |

### 2.2 Server-side secrets (kun backend/API routes)

**⚠️ VIKTIG:** Disse bør IKKE settes i Vercel hvis GitHub Actions eier deploy.
De skal kun være i Cloud Run (via GitHub Actions / GCP Secret Manager).

| Name | Brukes til | Vercel? | Merknad |
|------|------------|:-------:|---------|
| SUPABASE_SERVICE_ROLE_KEY | Admin DB access | ❌ | Kun i Cloud Run |
| STRIPE_SECRET_KEY | Stripe API | ❌ | Kun i Cloud Run |
| STRIPE_WEBHOOK_SECRET | Stripe webhooks | ❌ | Kun i Cloud Run |
| RESEND_API_KEY | Email sending | ❌ | Kun i Cloud Run |
| VIPPS_CLIENT_ID | Vipps auth | ❌ | Kun i Cloud Run |
| VIPPS_CLIENT_SECRET | Vipps auth | ❌ | Kun i Cloud Run |
| VIPPS_SUBSCRIPTION_KEY | Vipps API | ❌ | Kun i Cloud Run |
| VIPPS_MERCHANT_SERIAL_NUMBER | Vipps ID | ❌ | Kun i Cloud Run |
| BINANCE_API_KEY | Trading API | ❌ | Kun i Cloud Run |
| BINANCE_API_SECRET | Trading API | ❌ | Kun i Cloud Run |
| PERPLEXITY_API_KEY | AI API | ❌ | Kun i Cloud Run |
| MOONSHOT_API_KEY | AI API | ❌ | Kun i Cloud Run |
| FROM_EMAIL | Email sender | ❌ | Kun i Cloud Run |

### 2.3 Priser (Stripe Price IDs)

| Name | Production | Preview/Dev | Merknad |
|------|:----------:|:-----------:|---------|
| NEXT_PUBLIC_STRIPE_PRICE_BACHELOR | price_live_xxx | price_test_xxx | Test i Preview |
| NEXT_PUBLIC_STRIPE_PRICE_MASTER | price_live_xxx | price_test_xxx | Test i Preview |
| NEXT_PUBLIC_STRIPE_PRICE_PHD | price_live_xxx | price_test_xxx | Test i Preview |
| NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR | price_live_xxx | price_test_xxx | Test i Preview |
| NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY | price_live_xxx | price_test_xxx | Test i Preview |
| NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL | price_live_xxx | price_test_xxx | Test i Preview |
| (og alle andre price variabler...) | | | Bruk test-prices i Preview |

---

## 3. Hvordan sette dem i Vercel

### 3.1 Via Vercel Dashboard

1. Gå til: https://vercel.com/tom-jensens-projects/klarpakke
2. Klikk på **Settings** (tannhjul-ikon)
3. Velg **Environment Variables** i venstremenyen
4. For hver variabel:
   - Skriv **Name** (f.eks. `NEXT_PUBLIC_SUPABASE_URL`)
   - Skriv **Value** (den faktiske verdien)
   - Velg **Environment**:
     - ☑️ Production
     - ☑️ Preview (hvis relevant for PRs)
     - ☐ Development (vanligvis ikke nødvendig)
5. Klikk **Save**

### 3.2 Viktige env-variabler å sette FØRST

**Minimum for at appen skal fungere i Preview:**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (eller pk_live_...)
```

**For Analytics:**
```
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=<auto-genereres av Vercel>
```

---

## 4. Deploy-policy og env-variabler

### Production (main branch)
- **MÅL:** Cloud Run (via GitHub Actions)
- **Vercel:** Skal IKKE bygge/deploye til Production
- **Env-variabler:** Settes i Cloud Run/GCP, IKKE i Vercel

### Preview (feature branches, PRs)
- **MÅL:** Vercel Preview deployments
- **Formål:** Visuell QA, demo, testing
- **Env-variabler:** Settes i Vercel (se tabell over)
- **Data:** Bruk TEST/SANDBOX verdier (ikke live API keys)

### Development (lokalt)
- **MÅL:** localhost
- **Env-variabler:** `.env.local` fil (ikke committed)

---

## 5. Sjekkliste for oppsett

- [ ] Logg inn på Vercel Dashboard
- [ ] Naviger til klarpakke-prosjektet
- [ ] Gå til Settings → Environment Variables
- [ ] Legg til NEXT_PUBLIC_SUPABASE_URL (alle miljøer)
- [ ] Legg til NEXT_PUBLIC_SUPABASE_ANON_KEY (alle miljøer)
- [ ] Legg til NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test for Preview)
- [ ] Legg til NEXT_PUBLIC_APP_URL
- [ ] Legg til pris-variabler (bruk test-verdier for Preview)
- [ ] Verifiser at Preview deployment fungerer
- [ ] Sjekk at Analytics fungerer (se VERCEL-ANALYTICS-CHECKLIST.md)

---

## 6. Feilsøking

### Problem: "Missing environment variable" i Preview
**Løsning:** Sjekk at variabelen er satt i Vercel → Settings → Environment Variables → Preview

### Problem: "Invalid API key" i Preview
**Løsning:** Bruker du production keys i Preview? Bytt til test/sandbox keys.

### Problem: Analytics viser ikke data
**Løsning:** Sjekk at `<Analytics />` er i layout.tsx, og at prosjektet er koblet i Vercel Dashboard.

---

*Sist oppdatert: 2026-02-21*
