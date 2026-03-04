# 🗄️ Supabase Setup Guide for Klarpakke

Komplett guide for å sette opp Supabase-backend.

---

## ⚡ Rask Setup (Automatisk)

```bash
cd /Users/taj/klarpakke
./scripts/supabase-setup.sh
```

Dette scriptet vil:
1. Guide deg gjennom prosjekt-opprettelse
2. Kjøre database migrations
3. Deploye 20 Edge Functions
4. Konfigurere secrets
5. Sette opp Auth

---

## 📋 Manuell Setup (Steg-for-steg)

### Steg 1: Opprett Supabase-prosjekt (10 min)

1. Gå til https://app.supabase.com
2. Klikk **"New Project"**
3. Velg din organisasjon
4. Fyll inn:
   - **Name:** `klarpakke-production`
   - **Region:** `Northern Europe (Stockholm)` (nærmest Norge)
   - **Database Password:** (bruk sterk passord, lagre den!)
5. Klikk **"Create New Project"**
6. Vent ~2 minutter på provisioning

### Steg 2: Hent API-nøkler (5 min)

1. I prosjektet, gå til **Settings → API**
2. Kopier:
   - **URL:** `https://[project-ref].supabase.co`
   - **anon/public:** `eyJhbGc...` (starter med eyJ)
   - **service_role:** (hemmelig - ikke del!)
3. Lagre disse trygt

### Steg 3: Link prosjektet (2 min)

```bash
# I terminalen
cd /Users/taj/klarpakke

# Link til prosjektet
supabase link --project-ref [din-project-ref]

# Eksempel:
# supabase link --project-ref abcdefghijklmnopqrst
```

### Steg 4: Kjør Database Migrations (5 min)

```bash
# Push alle migrations til databasen
supabase db push

# Verifiser at tabeller er opprettet
supabase db dump > verify.sql
```

**Dette oppretter:**
- users (auth-brukere)
- profiles (brukerprofiler)
- paper_accounts (paper trading-kontoer)
- paper_positions (aktive posisjoner)
- paper_trades (trade-historikk)
- signals (trading-signaler)
- strategies (copy-trading-strategier)
- billing_events (betalingshistorikk)
- + 10 andre tabeller

### Steg 5: Deploy Edge Functions (10 min)

```bash
# Deploy alle funksjoner
supabase functions deploy upsert-profile-on-signup
supabase functions deploy get-billing-status
supabase functions deploy get-quiz
supabase functions deploy submit-quiz
supabase functions deploy get-referral-status
supabase functions deploy get-entitlements
supabase functions deploy get-strategies
supabase functions deploy follow-strategy
supabase functions deploy connect-exchange
supabase functions deploy track-event
supabase functions deploy update-user-settings
supabase functions deploy update-notification-settings
supabase functions deploy compute-leaderboard-monthly
supabase functions deploy set-subscription-tier
```

**Alternativt - bruk loop:**
```bash
for func in upsert-profile-on-signup get-billing-status get-quiz submit-quiz get-referral-status get-entitlements get-strategies follow-strategy connect-exchange track-event update-user-settings update-notification-settings compute-leaderboard-monthly set-subscription-tier; do
  supabase functions deploy "$func"
done
```

### Steg 6: Sett Secrets (10 min)

```bash
# Stripe (påkrevd for betaling)
supabase secrets set STRIPE_SECRET_KEY=sk_live_din_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_din_webhook_secret

# Site URL
supabase secrets set SITE_URL=https://klarpakke.no

# Telegram (valgfritt - kan legges til senere)
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set TELEGRAM_FREE_CHANNEL=@klarpakke_free
supabase secrets set TELEGRAM_VIP_CHANNEL=@klarpakke_vip
```

### Steg 7: Konfigurer Auth (15 min)

1. Gå til **Authentication → Settings**

2. **Site URL:**
   ```
   https://klarpakke.no
   ```

3. **Redirect URLs:** (legg til alle)
   ```
   https://klarpakke.no/app/dashboard
   https://klarpakke.no/quiz
   https://klarpakke.no/login
   https://klarpakke.no/signup
   ```

4. **Email Templates** (tilpass på norsk):

   **Confirmation Email:**
   ```html
   <h2>Velkommen til Klarpakke!</h2>
   <p>Klikk lenken under for å bekrefte e-postadressen din:</p>
   <p><a href="{{ .ConfirmationURL }}">Bekreft e-post</a></p>
   <p>Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.</p>
   ```

   **Reset Password Email:**
   ```html
   <h2>Tilbakestill passord</h2>
   <p>Klikk lenken under for å tilbakestille passordet ditt:</p>
   <p><a href="{{ .ConfirmationURL }}">Tilbakestill passord</a></p>
   <p>Hvis du ikke ba om dette, kan du ignorere denne e-posten.</p>
   ```

5. **Enable Providers:**
   - ✅ Email (påkrevd)
   - ❌ Google (valgfritt)
   - ❌ GitHub (valgfritt)

### Steg 8: Verifisering (5 min)

Test at alt fungerer:

```bash
# Sjekk at databasen er tilgjengelig
supabase db dump --data-only > /tmp/test.sql && echo "✅ Database OK"

# Sjekk at functions er deployet
supabase functions list

# Sjekk at secrets er satt
supabase secrets list
```

---

## 🔌 Integrer med Webflow

### Kopier API-nøkler til Webflow

1. Gå til **Webflow → Site Settings → Custom Code**

2. **Footer Code:**
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   <script>
     window.KLARPAKKE_CONFIG = {
       supabaseUrl: 'https://[din-project-ref].supabase.co',
       supabaseAnonKey: '[din-anon-key]',
       stripePublishableKey: 'pk_live_[din-stripe-key]'
     };
   </script>
   ```

3. **Lagre og publiser**

---

## ✅ Verifiserings-sjekkliste

Etter setup, test at:

- [ ] Prosjektet er opprettet i Stockholm-regionen
- [ ] Database migrations er kjørt (15+ tabeller)
- [ ] 14+ Edge Functions er deployet
- [ ] Secrets er satt (STRIPE_SECRET_KEY, SITE_URL)
- [ ] Auth er konfigurert med riktige redirect URLs
- [ ] Email templates er på norsk
- [ ] API-nøkler er kopiert til Webflow

---

## 🆘 Feilsøking

### "Failed to connect to database"
```bash
# Sjekk at prosjektet er ferdig provisioned
# Vent 2-3 minutter og prøv igjen
supabase db push
```

### "Function already exists"
```bash
# Force deploy
supabase functions deploy [function-name] --force
```

### "Unauthorized"
```bash
# Sjekk at du er logget inn
supabase login

# Sjekk at prosjektet er linket
supabase status
```

---

## 📊 Kostnader

| Plan | Pris | Inkludert |
|------|------|-----------|
| **Free** | $0/mnd | 500MB database, 2GB bandwidth, 50k auth users |
| **Pro** | $25/mnd | 8GB database, 100GB bandwidth, unlimited auth |
| **Team** | $599/mnd | 40GB database, 1TB bandwidth |

**Anbefaling:** Start med Free-plan, oppgrader ved behov.

---

## 🔗 Nyttige lenker

- Supabase Dashboard: https://app.supabase.com
- Dokumentasjon: https://supabase.com/docs
- Auth Guide: https://supabase.com/docs/guides/auth
- Database Guide: https://supabase.com/docs/guides/database

---

**Setup tid:** ~45 minutter  
**Vanskelighetsgrad:** Middels  
**Support:** Supabase Discord / GitHub Issues
