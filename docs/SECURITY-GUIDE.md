# 🔐 Sikkerhetshåndtering - Hvor skal keys og secrets ligge?

## Viktig: Aldri commit secrets til Git!

---

## 📋 OVERSIKT - Hva skal hvor?

| Type | Hvor | Eksempel |
|------|------|----------|
| **GitHub Secrets** | GitHub → Settings → Secrets | CI/CD, deployment |
| **Supabase Secrets** | Supabase Dashboard → Secrets | Edge Functions |
| **Webflow Custom Code** | Site Settings → Footer (public) | Public API keys |
| **.env fil** | Lokal maskin (ikke commit!) | Utvikling |
| **1Password/Vault** | Passord-manager | Backup, deling med team |

---

## 1️⃣ GITHUB SECRETS (CI/CD)

**Bruk:** Automatiserte deploys, GitHub Actions

**Legg til:** GitHub Repo → Settings → Secrets and variables → Actions

```yaml
# .github/workflows/deploy.yml bruker disse:
SUPABASE_ACCESS_TOKEN      # For CLI-autentisering
SUPABASE_PROJECT_ID        # Prosjekt-referanse
WEBFLOW_API_TOKEN          # For Webflow API
STRIPE_SECRET_KEY          # For webhook testing
```

**Hvordan legge til:**
1. Gå til https://github.com/tombomann/klarpakke/settings/secrets/actions
2. Klikk "New repository secret"
3. Navn: `SUPABASE_ACCESS_TOKEN`
4. Verdi: (fra https://app.supabase.com/account/tokens)

---

## 2️⃣ SUPABASE SECRETS (Backend)

**Bruk:** Edge Functions, database-triggere

**Legg til:** Supabase Dashboard → Project Settings → Edge Functions

```bash
# Sett via CLI:
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set SITE_URL=https://klarpakke.no
```

**Eller via Dashboard:**
1. https://app.supabase.com/project/[ref]/settings/functions
2. Legg til secrets her

**Hva skal ligge her:**
- ✅ `STRIPE_SECRET_KEY` (sk_live_...)
- ✅ `STRIPE_WEBHOOK_SECRET` (whsec_...)
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `SITE_URL`
- ✅ Eventuelle API-nøkler for 3rd party tjenester

---

## 3️⃣ WEBFLOW CUSTOM CODE (Frontend - PUBLIC!)

**Bruk:** Browser-kode, kan sees av alle

**VIKTIG:** Kun PUBLIC keys her! Aldri private/secret keys!

```html
<!-- Site Settings → Custom Code → Footer Code -->
<script>
  window.KLARPAKKE_CONFIG = {
    // ✅ PUBLIC - OK å ha her:
    supabaseUrl: 'https://[ref].supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIs...',  // Public anon key
    stripePublishableKey: 'pk_live_...',           // Public key
    
    // ❌ ALDRI DISSE:
    // stripeSecretKey: 'sk_live_...'  // Nei! Dette er secret!
    // supabaseServiceRole: 'eyJ...'    // Nei! Admin-tilgang!
  };
</script>
```

**Forskjell på Supabase keys:**
- ✅ **Anon Key** (public): Starter med `eyJ...`, brukes i frontend
- ❌ **Service Role Key** (secret): Starter med `eyJ...`, brukes KUN i backend/Edge Functions

---

## 4️⃣ LOKAL UTVIKLING (.env)

**Bruk:** Lokal testing, utvikling

**Fil:** `.env` (liggende i rot-mappen, IKKE commit!)

```bash
# .env - DENNE FILEN SKAL IKKE COMMITTES!
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Kun for lokal testing!
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
WEBFLOW_API_TOKEN=...
```

**Husk:**
1. Legg til `.env` i `.gitignore`:
   ```
   .env
   .env.local
   .env.*.local
   ```
2. Kopier `.env.example` til `.env` ved oppstart:
   ```bash
   cp .env.example .env
   ```

---

## 5️⃣ 1PASSWORD / PASSORD-MANAGER (Backup)

**Bruk:** Sikker lagring, deling med team

**Opprett et "vault":**
- Navn: "Klarpakke Production"
- Inneholder:
  - Supabase Project Ref
  - Alle API keys (både public og private)
  - Stripe login
  - Webflow login
  - Domene-registrant login

---

## 🎯 KONKRET OPPSUMMERING FOR DEG

### Stripe Keys
```
┌─────────────────────────────────────────────────────────────┐
│ STRIPE_SECRET_KEY (sk_live_...)                              │
│ → Supabase Secrets (Edge Functions)                         │
│ → GitHub Secrets (hvis du bruker Stripe i CI/CD)            │
│ → ALDRI i Webflow eller frontend!                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STRIPE_PUBLISHABLE_KEY (pk_live_...)                         │
│ → Webflow Custom Code (public)                              │
│ → Frontend JavaScript                                       │
│ → OK å vise for brukere                                     │
└─────────────────────────────────────────────────────────────┘
```

### Supabase Keys
```
┌─────────────────────────────────────────────────────────────┐
│ SUPABASE_SERVICE_ROLE_KEY (admin-tilgang)                    │
│ → Supabase Secrets (Edge Functions)                         │
│ → GitHub Secrets (hvis brukt i Actions)                     │
│ → Lokal .env fil                                            │
│ → ALDRI i frontend! Gir full admin-tilgang!                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SUPABASE_ANON_KEY (public)                                   │
│ → Webflow Custom Code (public)                              │
│ → Frontend JavaScript                                       │
│ → OK å vise for brukere (har RLS-beskyttelse)               │
└─────────────────────────────────────────────────────────────┘
```

### Telegram
```
┌─────────────────────────────────────────────────────────────┐
│ TELEGRAM_BOT_TOKEN                                           │
│ → Supabase Secrets (Edge Functions)                         │
│ → ALDRI frontend eller GitHub (hvis repo er public)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 SIKKERHETSSJEKKLISTE

### Før push til Git:
- [ ] `.env` er i `.gitignore`
- [ ] Ingen secrets i koden (søk etter `sk_live_`, `sk_test_`)
- [ ] Ingen Service Role Key i frontend

### I produksjon:
- [ ] Supabase Secrets er satt
- [ ] GitHub Secrets er satt (hvis du bruker Actions)
- [ ] Webflow har KUN public keys
- [ ] 1Password har backup av alle keys

---

## 🔍 HVORDAN SJEKKE OM DU HAR LEKKET SECRETS

```bash
# Søk etter Stripe secret keys i repoet
grep -r "sk_live_" .
grep -r "sk_test_" .

# Søk etter Supabase service role
grep -r "service_role" .

# Sjekk om .env er commitet
git log --all --full-history -- .env
```

**Hvis du finner secrets i Git-historikken:**
1. Roter (bytt) keys umiddelbart!
2. Fjern fra Git-historikk: `git filter-branch` eller BFG Repo-Cleaner
3. Se GitHub docs: "Removing sensitive data from a repository"

---

## 📁 ANBEFALT FILSTRUKTUR

```
klarpakke/
├── .env                     # ❌ Ikke commit (lokal utvikling)
├── .env.example             # ✅ Commit (mal med dummy-verdier)
├── .gitignore               # ✅ Inneholder: .env
├── supabase/
│   └── functions/
│       └── [functions]      # Henter secrets fra Supabase
├── webflow-pages/           # Ingen secrets her!
├── web/js/
│   └── config.js            # KUN public keys
├── .github/
│   └── workflows/
│       └── deploy.yml       # Bruker GitHub Secrets
└── docs/
    └── SECURITY-GUIDE.md    # Denne filen
```

---

## ✅ RASK OPPSUMMERING

| Hva | Hvor | Hvorfor |
|-----|------|---------|
| `sk_live_` (Stripe) | Supabase Secrets | Kun backend må se den |
| `pk_live_` (Stripe) | Webflow (public) | Frontend trenger den |
| `eyJ...` (Supabase anon) | Webflow (public) | Frontend trenger den |
| `eyJ...` (Supabase service) | Supabase Secrets | Admin-tilgang |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | For CLI-deploys |
| `WEBFLOW_API_TOKEN` | GitHub Secrets | For CI/CD |

**Husk:** 
- **Public keys** = Webflow frontend ✅
- **Private keys** = Supabase Secrets / GitHub Secrets 🔒
- **Aldri commit .env!** ❌

---

**Spørsmål?** Sjekk Supabase docs: https://supabase.com/docs/guides/functions/secrets
