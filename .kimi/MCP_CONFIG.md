# MCP Best Practices - klarpakke

## 1. Supabase Management via MCP

### Når du trenger å oppdatere auth URLs:
```bash
# Hent token fra GitHub secrets
export SUPABASE_ACCESS_TOKEN=$(gh secret get SUPABASE_ACCESS_TOKEN -R tajlive/KP)

# Oppdater auth config
curl -X PATCH "https://api.supabase.com/v1/projects/vuxbjlykgmzskxbclquf/config/auth" \
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

## 2. GitHub MCP-verktøy (når tilgjengelig)

### Actions status:
- `github.actions.list_workflows`
- `github.actions.list_runs`
- `github.actions.trigger_workflow`

### Secrets management:
- `github.secrets.list_repository_secrets`
- `github.secrets.get_repository_secret` (metadata only)

## 3. Vercel MCP-verktøy

### Deployment:
- `vercel.deployments.list`
- `vercel.deployments.get`
- `vercel.projects.get`

### Environment variables:
- `vercel.projects.get_environment_variables`
- `vercel.projects.create_environment_variable`

## 4. Google Cloud MCP-verktøy

### Cloud Run:
- `gcloud.run.services.get`
- `gcloud.run.services.update`
- `gcloud.run.deployments.list`

## 5. Anbefalt MCP workflow

### For auth-issues:
1. Sjekk Supabase auth config via API
2. Verifiser redirect URLs
3. Test OAuth flow med Playwright
4. Deploy fix via GitHub Actions (hvis enabled) eller Vercel

### For deploy:
1. Hvis GitHub Actions enabled → trigger workflow
2. Hvis Actions disabled → Vercel auto-deploy på push
3. Fallback: manuell gcloud deploy

## 6. Viktige tokens/lokasjoner

| Token/Secret | Lokasjon | Bruk |
|--------------|----------|------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | Management API |
| `SUPABASE_ANON_KEY` | .env.local + client.ts | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets + GCP | Server auth |
| `GCP_SA_KEY` | GitHub Secrets | Cloud Run deploy |
| `VERCEL_TOKEN` | Ikke satt | Vercel API (valgfritt) |

## 7. Huske-regler

- ✅ GitHub Actions er ENABLED men kan ikke trigges (account flagged)
- ✅ Vercel auto-deployer på hver push til main
- ✅ Cloud Run er primær produksjon (ikke Vercel)
- ✅ Supabase auth fungerer med riktig redirect URLs
- ⚠️  Alltid sjekk `**` wildcard i Supabase redirect URLs
