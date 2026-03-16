# FASE 0: INFRASTRUCTURE SETUP

**Estimert tid:** 8 timer  
**Mål:** Produksjonsklar infrastruktur med Supabase, GitHub Secrets, og domene

---

## Task 0.1: Supabase Project Setup

### Steg 1: Opprett Production Project

1. Gå til [supabase.com](https://supabase.com)
2. Klikk "New Project"
3. Velg Organization (eller opprett ny)
4. Fyll inn:
   - **Name:** `klarpakke-production`
   - **Database Password:** (Generer sterk passord, lagre i 1Password)
   - **Region:** `North Europe` (Stockholm) - nærmest Norge
   - **Pricing:** Start med Free, upgrade til Pro når nødvendig
5. Klikk "Create new project"
6. Vent ~2 minutter på at prosjektet spinner opp

### Steg 2: Hent API Keys

Når prosjektet er klart:

1. Gå til Project Settings → API
2. Kopier følgende verdier:
   - `URL` (f.eks. `https://abcdefgh12345678.supabase.co`)
   - `anon public` key
   - `service_role secret` key (VÆR FORSIKTIG - denne er hemmelig!)

Lagre disse midlertidig i en tekstfil (vi skal legge dem i GitHub Secrets).

### Steg 3: Deploy Migrations

```bash
# I terminalen, fra prosjekt-root
cd /Users/taj/klarpakke

# Link til ditt Supabase prosjekt
supabase link --project-ref abcdefgh12345678

# Deploy alle migrations
supabase db push

# Verifiser at tabeller ble opprettet
supabase db remote commit
```

**Migrations som skal deployes:**
1. `20260201120000_subscription_leaderboard_system.sql`
2. `20260201150000_mvp_extensions_strategies_referrals_billing.sql`
3. `20260201200000_onboarding_system.sql` (ny for FASE 2)
4. `20260201210000_binance_integration.sql` (ny for FASE 5)
5. `20260201220000_referral_system.sql` (ny for FASE 7)

### Steg 4: Konfigurer RLS Policies

Verifiser at alle RLS policies er aktive:

```sql
-- I Supabase SQL Editor
SELECT schemaname, tablename, tablerowner 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'paper_accounts', 'paper_positions', 'exchange_connections');
```

### Steg 5: Aktiver Triggers

```sql
-- Aktiver trigger for automatisk profil-opprettelse
CREATE TRIGGER IF NOT EXISTS on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Aktiver trigger for settings-initialisering
CREATE TRIGGER IF NOT EXISTS on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_settings();
```

---

## Task 0.2: GitHub Secrets Configuration

### Steg 1: Gå til GitHub Settings

1. Åpne [github.com/tajlive/KP](https://github.com/tajlive/KP)
2. Gå til Settings → Secrets and variables → Actions
3. Klikk "New repository secret"

### Steg 2: Legg til alle Secrets

Legg til følgende secrets (én etter én):

| Secret Name | Value | Beskrivelse |
|-------------|-------|-------------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase prosjekt URL |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Service role key (hemmelig!) |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | For CLI deploy |
| `MASTER_ENCRYPTION_KEY` | `minst32tegnlangnøkkelher!!` | For API key kryptering |
| `SITE_URL` | `https://klarpakke.no` | Produksjons-URL |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Fra Blyt AS Stripe |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Fra Blyt AS Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook secret |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | Fra @BotFather |
| `OPENAI_API_KEY` | `sk-...` | For AI chat |
| `POSTHOG_API_KEY` | `phc_...` | For analytics |
| `RESEND_API_KEY` | `re_...` | For email sending |
| `CRISP_WEBSITE_ID` | `...` | For chat widget |
| `BINANCE_API_KEY` | `...` | For testing (bruk testnet!) |
| `BINANCE_SECRET_KEY` | `...` | For testing (bruk testnet!) |

### Steg 3: Verifiser Secrets

```bash
# Test at secrets fungerer med GitHub Actions
git push origin main

# Sjekk at deployment workflow kjører uten feil
```

---

## Task 0.3: Domain & Email Setup

### Steg 1: DNS Configuration for klarpakke.no

Logg inn på din domene-leverandør (f.eks. Domeneshop, one.com, etc.):

**A-record:**
```
Type: A
Name: @
Value: 76.76.21.21 (Webflow IP)
TTL: 3600
```

**CNAME for www:**
```
Type: CNAME
Name: www
Value: klarpakke.webflow.io
TTL: 3600
```

**CNAME for status (FASE 9):**
```
Type: CNAME
Name: status
Value: cname.statuspage.io (eller tilsvarende)
TTL: 3600
```

### Steg 2: Email Forwarding Setup

**Alternativ A: Google Workspace (anbefalt for skalerbarhet)**
1. Gå til [workspace.google.com](https://workspace.google.com)
2. Registrer med domene: klarpakke.no
3. Opprett bruker: kontakt@klarpakke.no
4. Pris: ~60 kr/mnd per bruker

**Alternativ B: Proton Mail (mer privat)**
1. Gå til [proton.me](https://proton.me)
2. Registrer med eget domene
3. Opprett kontakt@klarpakke.no

**Alternativ C: Forwarding (billigst)**
1. Bruk domene-leverandørens email forwarding
2. Forward kontakt@klarpakke.no → din-personlige@email.com
3. Gratis, men mindre profesjonelt

### Steg 3: DKIM, SPF, DMARC (for email deliverability)

Legg til følgende DNS records:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com include:sendgrid.net include:mailgun.org ~all
```

**DKIM:** (Opprettes automatisk av email-leverandør)

**DMARC:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:kontakt@klarpakke.no
```

### Steg 4: SSL Certificate

**Webflow:** Håndterer automatisk via Let's Encrypt

**Status page (FASE 9):** 
- Statuspage.io håndterer SSL automatisk
- Eller bruk Cloudflare for custom domain

### Steg 5: Verifiser Domene

```bash
# Test DNS propagation
dig klarpakke.no A
dig www.klarpakke.no CNAME

# Test email
echo "Test email" | mail -s "Test" kontakt@klarpakke.no
```

---

## Task 0.4: Environment Variables Template

Opprett `.env.local` for lokal utvikling (IKKE commit til git!):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...

# AI
OPENAI_API_KEY=sk-...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Encryption
MASTER_ENCRYPTION_KEY=your-32-char-key-here!!!
```

---

## Task 0.5: Backup Strategy

### Automatisk Backup (Supabase Pro)
```
1. Gå til Database → Backups
2. Aktiver "Daily backups"
3. Velg retention: 7 dager (standard) eller 30 dager
```

### Manuelle Backups før større endringer
```bash
# Lag backup før deploy
supabase db dump -f backup-$(date +%Y%m%d).sql

# Lagre i /backups mappen
mkdir -p backups
git add backups/
git commit -m "Database backup $(date)"
```

---

## VERIFIKASJON

Etter FASE 0, verifiser at alt fungerer:

```bash
# Test Supabase connection
curl -X GET "${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# Test at GitHub Actions har tilgang til secrets
gh workflow run validate-supabase.yml

# Test domene
curl -I https://klarpakke.no

# Test email
echo "Test" | mail -s "FASE 0 Complete" kontakt@klarpakke.no
```

---

## NESTE STEG

Gå til **FASE 1: Legal & Compliance** → `docs/FASE-1-LEGAL.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
