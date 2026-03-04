# Deploy til Produksjon

Denne guiden beskriver hvordan du deployer Klarpakke til produksjon.

## 📋 Forberedelser

### 1. Logg inn i Supabase CLI

```bash
supabase login
```

Dette åpner en nettleser der du må logge inn med Supabase-kontoen din.

### 2. Verifiser at du er logget inn

```bash
supabase projects list
```

Du skal se ditt prosjekt: `swfyuwkptusceiouqlks`

---

## 🚀 Deploy Database

### Steg 1: Link til prosjektet

```bash
cd /Users/taj/klarpakke
supabase link --project-ref swfyuwkptusceiouqlks
```

### Steg 2: Deploy migrasjoner

```bash
supabase db push
```

Dette vil:
- Kjøre alle SQL-migrasjoner i `supabase/migrations/`
- Opprette tabeller, views, funksjoner og RLS policies

**VIKTIG:** Sjekk at du får meldingen:
```
✓ Finished supabase db push.
```

---

## ⚡ Deploy Edge Functions

### Steg 1: Deploy alle functions

```bash
# Core functions
supabase functions deploy get-entitlements
supabase functions deploy track-event
supabase functions deploy upsert-profile-on-signup
supabase functions deploy compute-leaderboard-monthly
supabase functions deploy set-subscription-tier
supabase functions deploy connect-exchange

# MVP functions
supabase functions deploy get-quiz
supabase functions deploy submit-quiz
supabase functions deploy get-strategies
supabase functions deploy follow-strategy
supabase functions deploy get-billing-status
supabase functions deploy get-referral-status
supabase functions deploy update-notification-settings
supabase functions deploy update-user-settings
```

Eller bruk scriptet:
```bash
chmod +x scripts/deploy-functions.sh
./scripts/deploy-functions.sh
```

---

## 🔐 Sett Secrets

### Steg 1: Sett nødvendige secrets

```bash
# Supabase (intern)
supabase secrets set SUPABASE_URL=https://swfyuwkptusceiouqlks.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (fra Stripe Dashboard)
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Telegram (fra @BotFather)
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...

# OpenAI (fra OpenAI Dashboard)
supabase secrets set OPENAI_API_KEY=sk-...
```

### Steg 2: Verifiser secrets

```bash
supabase secrets list
```

---

## ✅ Verifikasjon

### Test 1: Sjekk at migrasjoner er på plass

```bash
# Gå til Supabase Dashboard
open https://supabase.com/dashboard/project/swfyuwkptusceiouqlks

# Sjekk:
# 1. Table Editor → skal vise tabeller (profiles, quiz_attempts, etc.)
# 2. Database → Functions → skal vise funksjoner
# 3. Database → Policies → skal vise RLS policies
```

### Test 2: Sjekk at Edge Functions fungerer

```bash
# Test get-entitlements (krever auth token)
curl -X GET \
  https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-entitlements \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test health check
curl -X GET \
  https://swfyuwkptusceiouqlks.supabase.co/functions/v1/health-check
```

### Test 3: Sjekk at auth fungerer

```bash
# Prøv å logge inn via Supabase Dashboard
# Authentication → Users → Add user (test)
```

---

## 🔄 Automatisk Deploy (GitHub Actions)

Etter at GitHub Secrets er konfigurert (se GITHUB-SECRETS-SETUP.md), vil push til `main` automatisk:

1. Validere migrasjoner og edge functions
2. Deploye til Supabase produksjon
3. Verifisere deployment

Se status på:
https://github.com/[user]/klarpakke/actions

---

## 🆘 Feilsøking

### "Failed to connect to database"

Sjekk at du er logget inn:
```bash
supabase login
```

### "Migration failed"

Sjekk SQL-syntax i migrasjonsfilene:
```bash
supabase db reset  # ⚠️ Dette sletter lokal data!
```

### "Function deployment failed"

Sjekk TypeScript-feil:
```bash
cd supabase/functions/[function-name]
deno check index.ts
```

---

## 📞 Support

Hvis du får problemer:
1. Sjekk Supabase status: https://status.supabase.com
2. Se logs i Supabase Dashboard → Logs
3. Kontakt: kontakt@klarpakke.no

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
