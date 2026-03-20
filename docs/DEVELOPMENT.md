# Klarpakke - Development Guide

## Oppsett

### 1. Klon repository og installer dependencies

```bash
cd ~/klarpakke
npm install
```

### 2. Sett opp miljøvariabler

```bash
cp .env.local.example .env.local
# Rediger .env.local med dine Supabase-nøkler
```

### 3. Start utviklingsserver

```bash
npm run dev
```

Appen kjører på `http://localhost:3000`

## Struktur

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   └── app/                # Authenticated routes
│       ├── dashboard/      # Dashboard page
│       ├── settings/       # Settings page
│       └── login/          # Login page
├── components/             # React components
│   ├── LoginForm.tsx       # Login form
│   ├── SignalTable.tsx     # Signals table
│   └── SettingsForm.tsx    # Settings form
├── lib/                    # Utilities
│   └── supabase.ts         # Supabase client
└── types/                  # TypeScript types
    └── index.ts            # Type definitions
```

## Webflow Integration

### Mounting React Components in Webflow

React-komponenter monteres automatisk på disse root-elementene i Webflow:

- `#klarpakke-login-root` - Login page
- `#klarpakke-dashboard-root` - Dashboard
- `#klarpakke-settings-root` - Settings
- `#klarpakke-landing-root` - Landing page
- `#klarpakke-pricing-root` - Pricing page
- `#klarpakke-calculator-root` - Calculator
- `#klarpakke-quiz-root` - Quiz

### Webflow Script Injection

Legg til denne linjen i Webflow `<head>`:

```html
<script
  src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/klarpakke-site.js"
  async
></script>
```

## Supabase Integration

### Database Schema

Databasen har følgende tabeller:

- `signals` - Handelsignaler
- `audit_logs` - Revisjonsspor
- `user_roles` - Brukerroller

### Authentication

Supabase Authentication håndterer:

- Email/password login
- Session management
- Password reset

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Validate Webflow structure
npm run webflow:validate

# Sync CMS content
npm run webflow:sync-cms

# Full Webflow check
npm run webflow:full-check
```

## Git Workflow

1. **Feature branches**: `feature/description`
2. **Bug fixes**: `fix/description`
3. **Hotfixes**: `hotfix/description`

Commit messages på norsk eller engelsk:

```
feat: Legg til login-komponent
fix: Rett opp feil i dashboard
docs: Oppdater README
```

## GitHub Actions

Workflows kjører automatisk:

- **validate.yml** - Validerer Webflow-struktur
- **webflow-automation.yml** - Automatiserer Webflow-deploy

## Deployment

### Production

```bash
# Build
npm run build

# Deploy (Vercel, Netlify, eller custom)
npm start
```

### Webflow CDN

Push to `main` branch → jsDelivr CDN updates automatically

## Tips og Best Practices

### TypeScript

- Bruk strict mode
- Definer types for props og state
- Unngå `any` type

### Components

- Bruk `'use client'` for browser-komponenter
- Unngå direkte database-kall i components
- Implementer error handling

### Styling

- Bruk Tailwind CSS for styling
- Hold konsistent med designsystem
- Test responsive design

### Supabase

- Bruk Row Level Security (RLS) for sikkerhet
- Implementer proper error handling
- Cache data når mulig

## Feilsøking

### `npm error ENOENT ... open '/Users/.../package.json'`

**Årsak:** Du kjører `npm run …` eller `npx playwright …` fra **hjemmemappen** (`~`) i stedet for prosjektmappa.

**Løsning:**

```bash
cd ~/klarpakke   # riktig stavemåte: klarpakke — ikke f.eks. klarpakkw
npm run playwright:install   # ved behov
npm run test:e2e:smoke       # eller npm run test:ci:blocking
```

Alle `npm`-script som `preprod:gate`, `allure:generate` og `analyze:bundle` må kjøres **fra repo-roten** (der `package.json` ligger).

### Playwright: `Error: EPERM: operation not permitted, scandir '.../.Trash'`

Oppstår ofte når kommandoen **ikke** kjøres fra prosjektet, eller når et verktøy traverserer kataloger den ikke skal. Kjør Playwright fra `~/klarpakke` som over. Hvis det vedvarer: ikke kjør Playwright fra `~` med glob-mønstre som treffer hele disken.

### `/settings` → `innstillinger` (smoke)

`launch-critical` sjekker **første redirect** med `request.get(..., { maxRedirects: 0 })` mot prod. Middleware sender `/settings` og `/en/settings` til kanonisk `innstillinger`-sti (uten `/no/` for standardlocale) for å unngå redirect-kø med `next-intl`.

### Bundle-analyse (`npm run analyze:bundle`)

Etter bygg skrives rapporter til:

- `.next/analyze/client.html` — **start her** (browser bundle)
- `.next/analyze/nodejs.html`
- `.next/analyze/edge.html`

Åpne `client.html` i nettleser for å se treemap. **Store ruter** (fra `next build`-tabellen) er blant annet `paper-trading` (~47 kB side / ~409 kB First Load JS), `dashboard/strategies`, `marketplace`, `profile` — gode kandidater for `dynamic()` og code-splitting.

### Login fungerer ikke

1. Sjekk NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY
2. Verifiser at bruker finnes i Supabase
3. Sjekk browser-konsollen for errors

### Dashboard viser ingen data

1. Sjekk at tabellen `signals` finnes
2. Verifiser Row Level Security-regler
3. Sjekk database-permissions

### Webflow validering feiler

1. Sjekk WEBFLOW_API_TOKEN og WEBFLOW_SITE_ID
2. Verifiser at alle root-elementer finnes i Webflow
3. Sjekk at contract.json er korrekt

### `gh run watch`: «exit code 1» men run er `success`

- **Deploy-workflow** bruker **actions/checkout, setup-node, cache @v5** (Node 24-runtime) for å dempe GitHub-advarselen om Node 20 i actions.
- **Supabase migrations** er ikke-blokkerende men avslutter steget med **exit 0**; ved feil logges **`::warning::`** i stedet for rød «exit code 1»-annotasjon.
- Sjekk alltid: `gh run view <id> --json conclusion,jobs` — feltet **`conclusion`** (`success` / `failure`) er det som gjelder.
- **Verify production** feiler **hele** jobben hvis `npm run verify` feiler.

### Playwright: «Fast Refresh had to perform a full reload»

Ufarlig støy fra **Next dev-server** under e2e: en full reload kan skje når HMR ikke kan patche. Testene kan fortsatt være grønne. Ved behov: ignorer i logg eller kjør smoke mot `next start` (prod-lignende) i stedet for `dev`.

## Kontakt

For spørsmål, opprett en issue eller kontakt team-lederen.
