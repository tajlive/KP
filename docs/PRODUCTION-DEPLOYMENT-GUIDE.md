# Klarpakke Production Deployment Guide

Komplett guide for å deploye Klarpakke til produksjon.

---

## 📋 Forberedelser

### Krav
- Supabase CLI installert: `brew install supabase/tap/supabase`
- Tilgang til Supabase prosjekt
- Stripe konto (live mode)
- Telegram konto
- Webflow site
- CDN (Cloudflare R2, AWS S3, eller lignende)

---

## 1️⃣ Sett opp miljøvariabler

### Steg 1.1: Opprett .env fil
```bash
cp .env.example .env
```

### Steg 1.2: Fyll inn verdier

**Supabase verdier** (fra https://supabase.com/dashboard):
1. Gå til Project Settings → API
2. Kopier:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon/public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role - hemmelig!)
   - `SUPABASE_PROJECT_REF` (fra URL: https://[REF].supabase.co)

**Stripe verdier** (fra https://dashboard.stripe.com):
1. Gå til Developers → API Keys
2. Bytt til "Live mode" (øverst høyre)
3. Kopier:
   - `STRIPE_SECRET_KEY` (sk_live_...)
   - `STRIPE_PUBLISHABLE_KEY` (pk_live_...)

**Stripe Price IDs**:
1. Gå til Products → Create Product
2. Opprett 3 produkter:
   - Standard: 500 NOK/måned
   - Pluss: 1000 NOK/måned
   - VIP: 1500 NOK/måned
3. Kopier Price ID for hver (price_...)

**Telegram**:
1. Send melding til @BotFather
2. Skriv `/newbot`
3. Følg instruksjoner, få token (format: `123456:ABC...`)
4. Opprett to kanaler:
   - @klarpakke_free (gratis kanal)
   - @klarpakke_vip (VIP kanal)
5. Legg til bot som admin i begge kanaler

### Steg 1.3: Kjør setup script
```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

Dette vil:
- Sette alle secrets i Supabase
- Deploy alle Edge Functions
- Kjøre database migrasjoner

---

## 2️⃣ Deploy Edge Functions

### Manuel deploy (hvis script ikke funker):
```bash
# Login
supabase login

# Link prosjekt (hvis ikke allerede gjort)
supabase link --project-ref din-prosjekt-ref

# Deploy alle funksjoner
supabase functions deploy binance-connector
supabase functions deploy stripe-webhook
supabase functions deploy broadcast-telegram
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy track-referral-click
supabase functions deploy upsert-profile-on-signup
supabase functions deploy get-billing-status
supabase functions deploy get-quiz
supabase functions deploy get-referral-status
supabase functions deploy submit-quiz

# Sett secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
supabase secrets set STRIPE_PRICE_STANDARD=price_xxx
supabase secrets set STRIPE_PRICE_PLUSS=price_xxx
supabase secrets set STRIPE_PRICE_VIP=price_xxx
supabase secrets set SITE_URL=https://klarpakke.no
```

---

## 3️⃣ Last opp JavaScript til CDN

### Alternativ A: Cloudflare R2

1. **Installer Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

2. **Opprett R2 bucket**:
```bash
wrangler r2 bucket create klarpakke-assets
```

3. **Last opp filer**:
```bash
chmod +x scripts/upload-to-r2.sh
./scripts/upload-to-r2.sh
```

4. **Enable public access** (valgfritt):
```bash
# I Cloudflare Dashboard:
# R2 → Manage buckets → klarpakke-assets → Settings → Enable public access
```

### Alternativ B: AWS S3 + CloudFront

```bash
# Opprett S3 bucket
aws s3 mb s3://klarpakke-assets

# Last opp filer
aws s3 sync web/js/ s3://klarpakke-assets/js/ \
  --cache-control "max-age=3600" \
  --content-type "application/javascript"

# Gjør bucket public (hvis ønsket)
aws s3api put-bucket-policy --bucket klarpakke-assets --policy file://policy.json
```

### Alternativ C: GitHub Pages (enkleste for testing)

```bash
# Opprett gh-pages branch
git checkout --orphan gh-pages
git rm -rf .
mkdir -p js
cp web/js/klarpakke-bundle.js js/
cp web/js/config.js js/
git add js/
git commit -m "Add JS files"
git push origin gh-pages

# Filene blir tilgjengelig på:
# https://tajlive.github.io/KP/js/klarpakke-bundle.js
```

---

## 4️⃣ Konfigurer Webflow Custom Code

### Steg 4.1: Site Settings → Custom Code

**Head Code** (legg til i `<head>`):
```html
<!-- Klarpakke Config -->
<script>
window.KLARPAKKE_CONFIG = {
  supabaseUrl: 'https://din-prosjekt-ref.supabase.co',
  supabaseAnonKey: 'din-anon-key-her',
  stripePublishableKey: 'pk_live_din_key_her',
  stripePrices: {
    standard: 'price_din_standard_id',
    pluss: 'price_din_pluss_id',
    vip: 'price_din_vip_id'
  },
  features: {
    enableTryggMode: true,
    enableTelegramBroadcast: true,
    enableRealTrading: false
  }
};
</script>

<!-- Supabase Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

**Footer Code** (før `</body>`):
```html
<!-- Klarpakke Bundle -->
<script src="https://din-cdn-url.com/js/klarpakke-bundle.js"></script>
```

### Steg 4.2: Legg til Data Attributes

**Login Page** (`/login`):
```html
<form data-login-form>
  <input data-login-email type="email" placeholder="din@epost.no" required>
  <input data-login-password type="password" placeholder="Ditt passord" required>
  <button data-login-submit type="submit">Logg inn</button>
  <div data-login-error style="display:none; color:red;"></div>
</form>
```

**Signup Page** (`/signup`):
```html
<form data-signup-form>
  <input data-signup-email type="email" placeholder="din@epost.no" required>
  <input data-signup-password type="password" placeholder="Passord (minst 8 tegn)" required>
  <input data-signup-password-confirm type="password" placeholder="Bekreft passord" required>
  <label data-signup-terms>
    <input type="checkbox" required> Jeg godtar vilkårene
  </label>
  <button data-signup-submit type="submit">Opprett konto</button>
  <div data-signup-error style="display:none; color:red;"></div>
</form>
```

**Dashboard** (`/app/dashboard`):
```html
<!-- Account Info -->
<div data-paper-balance>Laster...</div>

<!-- Create Account Button (vises kun hvis ingen konto) -->
<button data-create-paper-account style="display:none;">
  Opprett Paper Trading Konto
</button>

<!-- Active Positions -->
<div data-active-positions>
  <p>Ingen aktive posisjoner</p>
</div>

<!-- Logout -->
<button data-logout-btn>Logg ut</button>
```

**Pricing Page** (`/pricing`):
```html
<div data-pricing-cards></div>
<div data-current-plan></div>
```

**Quiz Page** (`/quiz`):
```html
<div data-quiz-container></div>
<div data-quiz-progress style="height:4px; background:#eee;">
  <div style="width:0%; height:100%; background:#10B981; transition:width 0.3s;"></div>
</div>
```

---

## 5️⃣ Test alle flyter

### Test 1: Signup Flow
```bash
# 1. Gå til /signup
# 2. Fyll ut skjema
# 3. Sjekk at du blir redirectet til /quiz
# 4. Sjekk at profil ble opprettet i Supabase
```

### Test 2: Quiz Flow
```bash
# 1. Svar på 3 spørsmål
# 2. Sjekk at Trygg Modus aktiveres for nybegynnere
# 3. Sjekk at du blir redirectet til /app/dashboard
```

### Test 3: Paper Trading
```bash
# 1. Klikk "Opprett Paper Trading Konto"
# 2. Sjekk at konto opprettes (vises i Supabase)
# 3. Gå til /app/signals
# 4. Klikk "Følg Signal" på et signal
# 5. Bekreft at posisjon opprettes
# 6. Sjekk at balanse oppdateres
```

### Test 4: Subscription (Test Mode)
```bash
# 1. Gå til /pricing
# 2. Klikk "Oppgrader" på Standard
# 3. Bruk Stripe testkort: 4242 4242 4242 4242
# 4. Sjekk at du blir redirectet til dashboard med ?checkout=success
# 5. Sjekk at subscription_tier er oppdatert i profiles-tabellen
```

### Test 5: Referral System
```bash
# 1. Gå til /app/settings
# 2. Kopier referral link
# 3. Åpne incognito vindu med ?ref=KODEN
# 4. Registrer ny bruker
# 5. Sjekk at referral ble registrert
```

---

## 6️⃣ Konfigurer Stripe Webhook

### Steg 6.1: Opprett Webhook Endpoint

1. Gå til https://dashboard.stripe.com/webhooks
2. Klikk "Add endpoint"
3. URL: `https://din-prosjekt-ref.supabase.co/functions/v1/stripe-webhook`
4. Velg følgende events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

### Steg 6.2: Kopier Webhook Secret

1. Etter opprettelse, klikk på webhooken
2. Kopier "Signing secret" (format: `whsec_...`)
3. Lagre i Supabase secrets:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_din_secret_her
```

### Steg 6.3: Test Webhook

I Stripe Dashboard:
1. Gå til webhooken
2. Klikk "Send test event"
3. Velg `checkout.session.completed`
4. Sjekk at respons er 200 OK

---

## 7️⃣ Opprett Telegram Bot

### Steg 7.1: Opprett Bot

1. Send melding til @BotFather på Telegram
2. Skriv `/newbot`
3. Følg instruksjoner:
   - Navn: Klarpakke Bot
   - Username: klarpakke_bot (må ende på _bot)
4. Kopier token (format: `123456789:ABC...`)

### Steg 7.2: Opprett Kanaler

1. Opprett ny kanal: "Klarpakke Free"
   - Username: @klarpakke_free
   - Type: Public
   
2. Opprett ny kanal: "Klarpakke VIP"
   - Username: @klarpakke_vip
   - Type: Private (invite-only)

### Steg 7.3: Legg til Bot i Kanaler

1. I hver kanal:
   - Klikk kanalnavn → Administrators → Add Admin
   - Søk etter @klarpakke_bot
   - Gi tillatelser: Send messages, Edit messages

### Steg 7.4: Lagre i Supabase

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set TELEGRAM_FREE_CHANNEL=@klarpakke_free
supabase secrets set TELEGRAM_VIP_CHANNEL=@klarpakke_vip
```

### Steg 7.5: Test Broadcast

```bash
# Send test signal
curl -X POST https://din-prosjekt-ref.supabase.co/functions/v1/broadcast-telegram \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signal": {
      "id": "test-123",
      "symbol": "BTCUSDT",
      "direction": "long",
      "entry_price": 45000,
      "stop_loss": 44000,
      "take_profit": 48000,
      "confidence": 85,
      "analysis": "Test signal"
    },
    "immediate": true
  }'
```

---

## 🎯 Produksjonsjekkliste

### Før lansering:
- [ ] Alle Edge Functions deployet
- [ ] Alle miljøvariabler satt
- [ ] JavaScript lastet opp til CDN
- [ ] Webflow custom code konfigurert
- [ ] Stripe webhook konfigurert (live mode)
- [ ] Telegram bot opprettet og lagt til kanaler
- [ ] Database migrasjoner kjørt
- [ ] SSL sertifikat aktivt
- [ ] Domene DNS peker til Webflow

### Testing:
- [ ] Signup flow fungerer
- [ ] Quiz fullføres og lagres
- [ ] Paper account opprettes
- [ ] Signals kan følges
- [ ] Positions kan lukkes
- [ ] Subscription upgrade fungerer
- [ ] Referral tracking fungerer
- [ ] Telegram broadcast fungerer

### Overvåking:
- [ ] Sentry konfigurert for error tracking
- [ ] Supabase logs sjekkes daglig
- [ ] Stripe dashboard overvåkes
- [ ] Telegram kanaler overvåkes

---

## 🆘 Feilsøking

### Edge Function deploy feiler
```bash
# Sjekk logs
supabase functions serve binance-connector

# Sjekk TypeScript feil
npx tsc --noEmit supabase/functions/binance-connector/index.ts
```

### Auth fungerer ikke
1. Sjekk at `supabaseUrl` og `supabaseAnonKey` er korrekte
2. Sjekk browser console for feil
3. Sjekk at Supabase Auth er aktivert i dashboard

### Stripe checkout feiler
1. Sjekk at `STRIPE_SECRET_KEY` er satt
2. Sjekk at price IDs er korrekte
3. Sjekk at `SITE_URL` matcher ditt domene

### Telegram broadcast feiler
1. Sjekk at bot er admin i kanalene
2. Sjekk at kanal-navn er korrekte (med @)
3. Test med curl først

---

**Godkjent for produksjon?** 🚀

Når alt er grønt, er du klar for soft launch!
