# 🗄️ Supabase Setup - Gjør det NÅ (30 minutter)

## Steg-for-steg guide

---

## Steg 1: Opprett Supabase-prosjekt (5 min)

### 1.1 Gå til Supabase
- Åpne: https://app.supabase.com
- Logg inn med GitHub eller e-post

### 1.2 Opprett nytt prosjekt
1. Klikk **"New Project"**
2. Velg din organisasjon (eller "Personal")
3. Fyll inn:
   - **Name:** `klarpakke-production`
   - **Region:** `Northern Europe (Stockholm)` ← Viktig! (nærmest Norge)
   - **Database Password:** Lag et sterkt passord (bruke generator)
4. Klikk **"Create New Project"**
5. Vent 2-3 minutter på provisioning

---

## Steg 2: Hent API-nøkler (2 min)

### 2.1 Gå til API Settings
1. I prosjektet, klikk **Settings** (nede til venstre)
2. Velg **API**
3. Du ser nå:
   - **Project URL:** `https://[ref].supabase.co`
   - **Project API keys:**
     - `anon` (public)
     - `service_role` (secret)

### 2.2 Kopier verdier
Kopier disse til `.env.local` på din maskin:

```bash
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_REF=abcdefghijklmnop
```

**VIKTIG:** 
- `anon` = public, kan vises i frontend
- `service_role` = secret, aldri i frontend!

---

## Steg 3: Link prosjektet lokalt (3 min)

### 3.1 Sjekk at du er i riktig mappe
```bash
cd /Users/taj/klarpakke
```

### 3.2 Link til prosjektet
```bash
supabase link --project-ref [din-project-ref]

# Eksempel:
# supabase link --project-ref abcdefghijklmnop
```

Du vil bli bedt om å logge inn. Bruk samme konto som på app.supabase.com.

---

## Steg 4: Kjør database migrations (5 min)

### 4.1 Push migrations til databasen
```bash
supabase db push
```

Dette oppretter:
- ✅ users (auth)
- ✅ profiles
- ✅ paper_accounts
- ✅ paper_positions
- ✅ paper_trades
- ✅ signals
- ✅ strategies
- ✅ billing_events
- ✅ + 7 andre tabeller

### 4.2 Verifiser at det fungerte
```bash
supabase db dump --data-only > /tmp/verify.sql
echo "Migrations fullført!"
```

---

## Steg 5: Deploy Edge Functions (10 min)

### 5.1 Kjør setup script
```bash
./scripts/supabase-setup.sh
```

Eller deploy manuelt:
```bash
# Viktigste funksjoner først
supabase functions deploy upsert-profile-on-signup
supabase functions deploy get-billing-status
supabase functions deploy get-quiz
supabase functions deploy submit-quiz
supabase functions deploy get-referral-status

# Deretter resten
for func in get-entitlements get-strategies follow-strategy connect-exchange track-event update-user-settings update-notification-settings compute-leaderboard-monthly set-subscription-tier; do
  supabase functions deploy "$func"
done
```

### 5.2 Verifiser functions
```bash
supabase functions list
```

Du skal se ~14 funksjoner.

---

## Steg 6: Sett Secrets (5 min)

### 6.1 Sett nødvendige secrets
```bash
# Stripe (bruk test keys først!)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL
supabase secrets set SITE_URL=https://klarpakke.no

# Telegram (kan legges til senere)
# supabase secrets set TELEGRAM_BOT_TOKEN=...
```

### 6.2 Verifiser secrets
```bash
supabase secrets list
```

---

## Steg 7: Konfigurer Auth (5 min)

### 7.1 Gå til Auth Settings
1. I Supabase Dashboard, klikk **Authentication** (i venstre meny)
2. Velg **Settings**

### 7.2 Konfigurer URL-er
**Site URL:**
```
https://klarpakke.no
```

**Redirect URLs** (legg til alle):
```
https://klarpakke.no/app/dashboard
https://klarpakke.no/quiz
https://klarpakke.no/login
https://klarpakke.no/signup
```

### 7.3 Konfigurer Email Templates
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
```

### 7.4 Enable Email Provider
Sjekk at **Email** er enabled under "Providers".

---

## Steg 8: Verifisering (2 min)

### 8.1 Kjør verifiseringsscript
```bash
./scripts/verify-supabase.sh
```

### 8.2 Manuell sjekk
1. Gå til https://app.supabase.com/project/[din-ref]/editor
2. Sjekk at tabellene er opprettet (profiles, paper_accounts, etc.)
3. Gå til "Edge Functions" og sjekk at funksjonene er deployet

---

## ✅ Ferdig! Hva har du nå?

### Database
- 15 tabeller klare
- RLS policies aktivert
- Auth konfigurert

### Backend
- 14 Edge Functions deployet
- Secrets satt
- API endepunkter klare

### API URL-er
```
REST API: https://[ref].supabase.co/rest/v1/
Auth:     https://[ref].supabase.co/auth/v1/
Storage:  https://[ref].supabase.co/storage/v1/
```

---

## Neste steg

Nå som Supabase er klar:
1. Kopier `SUPABASE_URL` og `SUPABASE_ANON_KEY` til Webflow
2. Test signup-flow
3. Se at brukere opprettes i databasen

---

## 🆘 Feilsøking

### "Failed to connect"
```bash
# Vent 2 minutter og prøv igjen
# Prosjektet trenger tid på å starte
```

### "Unauthorized"
```bash
# Sjekk at du er logget inn
supabase login

# Sjekk at prosjektet er linket
supabase status
```

### "Function already exists"
```bash
# Bruk --force
supabase functions deploy [navn] --force
```

---

**Tid estimert:** 30 minutter  
**Vanskelighetsgrad:** Middels  
**Support:** https://supabase.com/docs
