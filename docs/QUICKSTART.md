# Klarpakke - Quick Start Guide

## 5 Minutters Oppsett

### 1. Installer dependencies
```bash
npm install
```

### 2. Sett opp Supabase
Kopier `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` fra Supabase dashboard:

```bash
# Rediger .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Start appen
```bash
npm run dev
```

Besøk `http://localhost:3000`

## Default Test-bruker

Opprett en bruker gjennom Supabase dashboard eller bruk API:

```bash
curl -X POST https://your-project.supabase.co/auth/v1/signup \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

Logg deretter inn på `http://localhost:3000/app/login`

## Webflow Integration

Legg til root-elementer i Webflow-sidene:

- **Login page**: `<div id="klarpakke-login-root"></div>`
- **Dashboard**: `<div id="klarpakke-dashboard-root"></div>`
- **Settings**: `<div id="klarpakke-settings-root"></div>`

Publiser siden og kjør validering:

```bash
npm run webflow:validate
```

## GitHub Actions Setup

1. Gå til GitHub → Settings → Secrets and variables → Actions
2. Legg til disse secrets:
   - `WEBFLOW_API_TOKEN`
   - `WEBFLOW_SITE_ID`
   - `SUPABASE_URL` (optional)
   - `SUPABASE_ANON_KEY` (optional)

Workflows starter automatisk på push til `main`

## Neste steg

- [ ] Sett opp Supabase med data
- [ ] Test login-komponent
- [ ] Integrer med Webflow
- [ ] Deploy til produksjon

## Dokumentasjon

- [Development Guide](./DEVELOPMENT.md)
- [Webflow Contract](./docs/webflow-contract.json)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
