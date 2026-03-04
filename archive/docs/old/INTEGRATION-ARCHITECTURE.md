# 🔗 Integrasjonsarkitektur - Klarpakke

Dette dokumentet beskriver alle verktøy, tjenester og integrasjoner som brukes i Klarpakke-prosjektet, med instruksjoner for CLI/MCP-tilkobling.

---

## 📋 Oversikt over alle verktøy

| Kategori | Verktøy | CLI | MCP | Bruk |
|----------|---------|-----|-----|------|
| **Frontend** | Cloudflare Pages | ✅ Wrangler | ❌ | Hosting |
| **Backend** | Supabase | ✅ Supabase CLI | ❌ | Database, Auth, Functions |
| **Kode** | GitHub | ✅ GitHub CLI | ✅ (beta) | Repo, Actions |
| **AI** | Kimi/Kimi Code | ❌ | ❌ | AI-assistent |
| **Domene** | Domeneshop | ❌ | ❌ | DNS Registrar |
| **Bygg** | Vite | ✅ vite | ❌ | Bundler |
| **Lint** | Biome | ✅ biome | ❌ | Lint/Format |

---

## 🔧 CLI-verktøy - Installasjon og bruk

### 1. Cloudflare (Wrangler CLI)

```bash
# Installasjon
npm install -g wrangler

# Autentisering
wrangler login

# Deploy Pages
wrangler pages deploy webflow-pages --project-name=klarpakke

# Sjekk status
wrangler pages project get klarpakke

# Purge cache
wrangler cache purge --zone-id=YOUR_ZONE_ID
```

**GitHub Secret:** `CLOUDFLARE_API_TOKEN`

**Hent token:**
1. https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Edit Cloudflare Pages
3. Permissions: `Zone:Read`, `Page:Edit`

---

### 2. Supabase CLI

```bash
# Installasjon (macOS)
brew install supabase/tap/supabase

# Linux/Windows
curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/docker/install.sh | bash

# Link prosjekt
supabase link --project-ref swfyuwkptusceiouqlks

# Deploy Edge Functions
supabase functions deploy

# Set secrets
supabase secrets set MY_SECRET=value

# Database migrasjoner
supabase db push

# Status
supabase status
```

**GitHub Secret:** `SUPABASE_ACCESS_TOKEN`

**Hent token:**
1. https://app.supabase.com/account/tokens
2. New access token

---

### 3. GitHub CLI (gh)

```bash
# Installasjon
brew install gh

# Autentisering
gh auth login

# Workflow commands
gh workflow list
gh workflow run deploy-cloudflare.yml
gh workflow view ci.yml

# Secrets
gh secret set CLOUDFLARE_API_TOKEN
gh secret list

# Pull requests
gh pr create
ght pr merge
```

---

## 🔌 MCP (Model Context Protocol) Integrasjoner

MCP er en åpen protokoll for AI-verktøy-integrasjon. Klarpakke kan utvides med MCP.

### Tilgjengelige MCP-servere:

#### 1. GitHub MCP Server
```bash
# Installasjon
npm install -g @github/mcp-server

# Konfigurasjon (Claude/Kimi)
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

#### 2. Supabase MCP (Community)
```bash
# Work in progress - ikke offisiell ennå
# Kan brukes via Supabase CLI wrapper
```

#### 3. Cloudflare MCP (Beta)
```bash
# Cloudflare har eksperimentell MCP-støtte
# Se: https://developers.cloudflare.com/agents/
```

---

## 🔗 Koble alt sammen - Konfigurasjon

### GitHub Secrets (obligatorisk)

Legg til disse i GitHub-repoet (Settings → Secrets and variables → Actions):

| Secret | Verdi | Hvordan hente |
|--------|-------|---------------|
| `CLOUDFLARE_API_TOKEN` | cft_xxx... | Cloudflare → Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | 32-tegn hex | Cloudflare Dashboard (sidefelt) |
| `CLOUDFLARE_ZONE_ID` | 32-tegn hex | Cloudflare → DNS (høyre side) |
| `SUPABASE_ACCESS_TOKEN` | sbp_xxx... | Supabase → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | swfyuwkptusceiouqlks | URL i Supabase Dashboard |

---

### Lokal utvikling - .env fil

```bash
# Opprett .env.local
touch .env.local

# Innhold:
SUPABASE_URL=https://swfyuwkptusceiouqlks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CLOUDFLARE_API_TOKEN=cft_xxx...
```

**VIKTIG:** `.env.local` er i `.gitignore` - aldri commit secrets!

---

## 🔄 Automatiserte workflows

### GitHub Actions workflows i repoet:

| Workflow | Trigges | CLI-verktøy |
|----------|---------|-------------|
| `ci.yml` | Push/PR | npm, biome, vite |
| `deploy-cloudflare.yml` | Push til main | curl (cache purge) |
| `deploy-supabase.yml` | Push til main | supabase CLI |
| `trigger-pages-deploy.yml` | Push til main | - (kun trigger) |
| `auto-upgrade.yml` | Weekly | ncu, npm |

---

## 🛠️ Manuell CLI-integrasjon

### Komplett deploy-prosess:

```bash
# 1. Bygg prosjekt
cd klarpakke-app
npm run build

# 2. Commit og push
git add -A
git commit -m "deploy: updates"
git push origin main

# 3. Trigger Cloudflare deploy (manuelt)
# Gå til https://dash.cloudflare.com/pages og klikk "Retry deployment"

# ELLER med Wrangler:
wrangler pages deploy webflow-pages --project-name=klarpakke

# 4. Deploy Supabase Functions
supabase functions deploy

# 5. Verifiser
curl -I https://www.klarpakke.no/status
```

---

## 📱 API-integrasjoner i koden

### Supabase JavaScript SDK
```javascript
// Initialisering
const supabase = window.supabase.createClient(
  'https://swfyuwkptusceiouqlks.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// Auth
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithOAuth({ provider: 'google' });

// Database
await supabase.from('signals').select('*');
```

### Cloudflare Pages Functions (hvis aktivert)
```javascript
// functions/api/hello.js
export async function onRequest(context) {
  return new Response('Hello from Cloudflare!');
}
```

---

## 🔐 Sikkerhet - Best practices

1. **Aldri commit secrets til Git**
   - Bruk GitHub Secrets for Actions
   - Bruk `.env.local` for lokal utvikling

2. **Bruk minst privilegerte tokens**
   - Cloudflare: Kun `Page:Edit`, ikke `Zone:Edit`
   - Supabase: Bruk `anon` key i frontend, `service_role` kun backend

3. **Roter tokens regelmessig**
   - Sett påminnelse hver 90. dag

4. **Aktiver 2FA på alle kontoer**
   - Cloudflare, Supabase, GitHub, Domeneshop

---

## 🚀 Fremtidige MCP-integrasjoner

Når MCP blir mer modent:

- [ ] Supabase MCP-offisiell støtte
- [ ] Cloudflare Workers MCP
- [ ] Domeneshop MCP (usannsynlig)

---

## 📞 Support-kontakter

| Tjeneste | Support | Dokumentasjon |
|----------|---------|---------------|
| Cloudflare | support@cloudflare.com | https://developers.cloudflare.com |
| Supabase | support@supabase.io | https://supabase.com/docs |
| GitHub | support@github.com | https://docs.github.com |
| Kimi | (innebygd) | https://kimi.moonshot.cn |

---

**Sist oppdatert:** 2026-02-02  
**Versjon:** 1.0  
**Ansvarlig:** Kimi + Klarpakke Team
