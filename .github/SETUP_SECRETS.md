# GitHub Secrets — Engangsoppsett — ACTIONS DISABLED

> ⚠️ **Status 2026-07-01:** GitHub Actions is disabled for the `tajlive-KP` organization due to the `$5` Actions budget with "Stop usage" enabled. The instructions below apply only if Actions is re-enabled later. Current deployment uses Cloudflare Workers Builds and Wrangler secrets.

**Repo:** [tajlive/KP](https://github.com/tajlive/KP)  
Gå til: https://github.com/tajlive/KP/settings/secrets/actions

## Solo-mode: Minimum påkrevd (for CI/CD)

| Secret | Hvor finner du | Hvis mangler |
|--------|----------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Build feiler |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Build feiler |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens | Deploy feiler |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → General | Deploy feiler (400) |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General | Deploy feiler (400) |

## Solo-mode: Optional (workflows skipper hvis mangler)

| Secret | Bruk | Hvis mangler |
|--------|------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | E2E provision, watchdog repair | E2E skip, unit fortsetter |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | E2E test login | Bruker default testbruker |
| `SLACK_WEBHOOK_URL` | Varsling | Logger til fil/artifacts |
| `LINEAR_API_KEY` / `LINEAR_TEAM_ID` | Issue tracking | Skip issue creation |
| `SENTRY_AUTH_TOKEN` | Source maps | Build uten source maps |
| `SUPABASE_ACCESS_TOKEN` | DB push/lint | Skip DB steg |

## Hurtigoppsett med GitHub CLI

```bash
# 1. Autentiser
gh auth login

# 2. Sett minimum secrets (erstatt med dine verdier)
gh secret set NEXT_PUBLIC_SUPABASE_URL --repo tajlive/KP
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --repo tajlive/KP
gh secret set VERCEL_TOKEN --repo tajlive/KP
gh secret set VERCEL_ORG_ID --repo tajlive/KP
gh secret set VERCEL_PROJECT_ID --repo tajlive/KP

# 3. Optional (trykk Enter for å hoppe over)
gh secret set SUPABASE_SERVICE_ROLE_KEY --repo tajlive/KP
gh secret set E2E_USER_EMAIL --repo tajlive/KP
gh secret set E2E_USER_PASSWORD --repo tajlive/KP
```

## Automatisk sync fra `.env.local`

```bash
npm run secrets:sync:github:dry    # Vis hva som ville blitt satt
npm run secrets:sync:github        # Sett allowlisted secrets
```

## Verifisering

Etter secrets er satt, push en endring til main eller kjør manuelt:
```bash
gh workflow run pr-check --ref main
gh workflow run deploy --field environment=staging
```

---

**Oppdatert:** 2026-04-06  
**Solo-mode:** ✅ Ingen Slack/Linear/team påkrevd
