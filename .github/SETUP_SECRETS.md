# GitHub Secrets — Engangsoppsett

**Repo:** [tajlive/KP](https://github.com/tajlive/KP)  
Gå til: https://github.com/tajlive/KP/settings/secrets/actions

Klikk "New repository secret" for hvert av disse (eller bruk `gh secret set NAME --repo tajlive/KP`):

| Secret | Hvor finnes verdien |
|--------|---------------------|
| SUPABASE_ACCESS_TOKEN | supabase.com/dashboard/account/tokens → "Generate new token" |
| SUPABASE_DB_PASSWORD | supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/settings/database → "Database password" |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Allerede i .env.local (BGz8FXj8dTrjCw8n_La...) |
| VAPID_PRIVATE_KEY | Allerede satt i Supabase Secrets — hent fra: supabase secrets list --project-ref vuxbjlykgmzskxbclquf |
| SENTRY_AUTH_TOKEN | Sentry org **elbatt-chatbot**, prosjekt **klarpakke-production**. Opprett token på [Auth Tokens](https://elbatt-chatbot.sentry.io/settings/auth-tokens/) med scopes **project:releases** og **org:read**. Deretter: `gh secret set SENTRY_AUTH_TOKEN --repo tajlive/KP` |

Etter secrets er satt:
  → Push én liten endring til main, eller gå til:
    https://github.com/tajlive/KP/actions
  → Klikk "Deploy Supabase" → "Run workflow"

CI/CD kjører deretter AUTOMATISK ved alle fremtidige pushes til main
som endrer filer i supabase/**
