# MCP Best Practices — Klarpakke

> Sist oppdatert: 2026-06-29  
> Hosting: Cloudflare Workers (OpenNext.js + Wrangler)  
> CI/CD: Cloudflare Workers Builds (auto-deploy på push til `main`)

## 1. Supabase Management via MCP

### Når du trenger å oppdatere auth URLs:

```bash
# Hent token fra GitHub secrets
export SUPABASE_ACCESS_TOKEN=$(gh secret get SUPABASE_ACCESS_TOKEN -R tajlive/KP)

# Oppdater auth config
curl -X PATCH "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://www.klarpakke.no",
    "redirect_urls": [
      "https://www.klarpakke.no/**",
      "https://www.klarpakke.no/no/auth/callback",
      "https://www.klarpakke.no/en/auth/callback",
      "https://www.klarpakke.no/th/auth/callback",
      "https://www.klarpakke.no/zh/auth/callback"
    ]
  }'
```

## 2. Cloudflare Workers / Wrangler via MCP

### Produksjons-hosting

- **Worker:** `klarpakke`
- **Entry:** `.open-next/worker.js`
- **Assets:** `.open-next/assets`
- **Compatibility date:** `2026-06-21`
- **Compatibility flag:** `nodejs_compat`
- **Routes:** `www.klarpakke.no/*` (zone `328d7de7e8e48308fd4f9d760da5b18f`)
- **KV:** `KV_KLARPAKKE` (`36369d6957c14ef1a25e22dff65fdc79`)

### Manuell deploy

```bash
npm run cf:deploy
# eller: npm run cf:build && npx wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

### Produksjonsverifisering

```bash
npm run verify:prod
```

### Cache-purge

```bash
# Krever CLOUDFLARE_API_TOKEN og CLOUDFLARE_ZONE_ID
npm run cloudflare:purge
# eller: node scripts/purge-cloudflare-cache.mjs
```

## 3. GitHub MCP-verktøy

> **NB:** GitHub Actions workflows er for øyeblikket arkivert i `.github/workflows/archived/`
> på grunn av et phantom workflow-problem (issue #96). Bruk Cloudflare Workers Builds for deploy.

### Repo/Issues/PR:
- `github.repositories.get`
- `github.issues.list`
- `github.pull_requests.list`

### Secrets management (metadata only):
- `github.secrets.list_repository_secrets`
- `github.secrets.get_repository_secret`

## 4. Vercel MCP-verktøy (legacy)

> Vercel er ikke lenger aktiv hosting for Klarpakke. Verktøyene beholdes kun i
> `mcp.full.json` for historisk/legacy bruk (analytics, edge-config, speed-insights).

## 5. Anbefalt MCP workflow

### For auth-issues:
1. Sjekk Supabase auth config via Management API
2. Verifiser redirect URLs
3. Test OAuth flow med Playwright / Chrome MCP
4. Deploy fix via `git push origin main` → Cloudflare Workers Builds

### For deploy:
1. Push til `main`
2. Cloudflare Workers Builds auto-deployer
3. Kjør `npm run verify:prod` for å bekrefte
4. Fallback: `npm run cf:deploy`

### For cache-problemer:
1. Sjekk Worker-versjon: `npx wrangler deployment list`
2. Purge Cloudflare-cache: `node scripts/purge-cloudflare-cache.mjs`
3. Verifiser endepunkt: `curl -I https://www.klarpakke.no/api/health`

## 6. Viktige tokens/lokasjoner

| Token/Secret | Lokasjon | Bruk |
|--------------|----------|------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | Supabase Management API |
| `SUPABASE_ANON_KEY` | .env.local + client.ts | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | Server auth (kun cron/system-ruter) |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | Wrangler deploy + cache purge |
| `CLOUDFLARE_ZONE_ID` | GitHub Secrets | Cache purge |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets / .env | Wrangler (valgfritt) |
| `VERCEL_TOKEN` | Ikke satt | Legacy Vercel API (ikke i bruk) |

## 7. Huske-regler

- ✅ Primær hosting er **Cloudflare Workers** (ikke Vercel eller Fly.io)
- ✅ Auto-deploy skjer via **Cloudflare Workers Builds** på push til `main`
- ✅ PR-/pre-push-kvalitetssjekker kjøres via **Husky `.husky/pre-push`**
- ✅ GitHub Actions workflows er **arkivert** (phantom workflow issue #96)
- ✅ `npm run verify:prod` skal alltid kjøres etter deploy
- ✅ Cloudflare KV (`KV_KLARPAKKE`) brukes for runtime-state
- ⚠️  Alltid sjekk `**` wildcard i Supabase redirect URLs
- ⚠️  Aldri bruk service-role i bruker-kontekst (RLS må respekteres)
