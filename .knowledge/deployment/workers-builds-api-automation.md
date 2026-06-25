# Automatisering av Cloudflare Workers Builds

## Kontekst
Klarpakke har migrert auto-deploy fra GitHub Actions til Cloudflare Workers Builds på grunn av en phantom `BuildFailed`-workflow (#96) som blokkerer GitHub Actions backend.

## Problem
Cloudflare Workers Builds krever opprinnelig manuell konfigurasjon i dashboardet. API-et krever et **user-scoped** API token; account-scoped tokens støttes ikke.

## Løsning
Et Node.js-script som bruker Cloudflare Builds REST API for å automatisere hele oppsettet:

- `scripts/setup-workers-builds.mjs`
- Kjøres via: `npm run workers:setup-builds`

### Forutsetninger
1. **Cloudflare GitHub App må installeres én gang via dashboard** før API-et kan brukes:
   - Gå til **Cloudflare Dashboard → Workers & Pages → klarpakke → Settings → Builds → Connect → GitHub**
   - Installer **Cloudflare Workers and Pages** GitHub App for kontoen `tajlive`
   - Hvis installasjonssiden returnerer 404, se GitHub-community-tråd [community/discussions/189517](https://github.com/orgs/community/discussions/189517) – det kan skyldes en GitHub-side konto-bug som krever support-henvendelse
2. Et user-scoped API token med følgende permissions:
   - **Workers Builds Configuration** → Edit
   - **Workers Scripts** → Read
   - **Workers CI Write** (kreves for å opprette build token)
3. Env vars satt:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### Hva scriptet gjør
1. Verifiserer at tokenet fungerer mot `/builds/tokens`
2. Henter GitHub account/repo ID fra GitHub API
3. Oppretter repo-tilkobling via `PUT /builds/repos/connections`
4. Henter Worker tag fra `GET /workers/scripts`
5. Henter eller oppretter build token via `/builds/tokens`
6. Oppretter production trigger (`main`) og preview trigger (`*` unntatt `main`)
7. Setter build-time environment variables på triggers
8. Triggrer første build på production trigger

### Viktige API-endepunkter
| Steg | Method | Endpoint |
|------|--------|----------|
| Verifiser token | GET | `/accounts/{id}/builds/tokens` |
| Repo connection | PUT | `/accounts/{id}/builds/repos/connections` |
| Worker tag | GET | `/accounts/{id}/workers/scripts` |
| Build token | POST/GET | `/accounts/{id}/builds/tokens` |
| Triggers | GET/POST | `/accounts/{id}/builds/workers/{tag}/triggers` |
| Env vars | PATCH | `/accounts/{id}/builds/triggers/{uuid}/environment_variables` |
| Build | POST | `/accounts/{id}/builds/triggers/{uuid}/builds` |

### Build-kommandoer
- **Build:** `npm run cf:build`
- **Deploy (production):** `npm run cf:deploy:ci`
- **Deploy (preview):** `npx wrangler versions upload`

### Miljøvariabler
Build-time env vars settes per trigger. Scriptet leser fra `--env-file .env.local` eller fra eksisterende env. Kjøretids-secrets (f.eks. `SUPABASE_SERVICE_ROLE_KEY`) settes fortsatt via Wrangler/Worker dashboard (**Variables & Secrets**), ikke via build env.

### Kjøring
```bash
# Tørrkjøring
npm run workers:setup-builds -- --dry-run

# Med env-fil
CLOUDFLARE_API_TOKEN=<user-token> CLOUDFLARE_ACCOUNT_ID=<id> \
  npm run workers:setup-builds -- --env-file=.env.local
```

### Begrensninger
- Cloudflare GitHub App-installasjon må gjøres manuelt én gang.
- API-token må være user-scoped; service tokens fungerer ikke.
- Build-time env vars er ikke runtime-secrets; runtime-secrets krever fortsatt Wrangler dashboard.

### Kilder
- https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/
- https://developers.cloudflare.com/api/resources/workers_builds/

## Dato
2026-06-25
