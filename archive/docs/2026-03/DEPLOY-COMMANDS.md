# Klarpakke Produksjonsdeploy - Quick Reference

## Alternativ 1: Full Launch Script (med prompts)
```bash
cd /Users/taj/klarpakke
export $(cat .env.local | grep -v '^#' | xargs)
npm run launch:prod
# Følg promptene...
```

## Alternativ 2: Step-by-step manuell deploy
```bash
# 1. Verifiser OAuth
npm run verify:google-oauth

# 2. TypeScript & lint
npm run type-check
npm run lint

# 3. Vercel deploy
vercel --prod

# 4. Verifiser etter deploy
curl https://www.klarpakke.no/api/health
curl https://www.klarpakke.no/api/auth/diagnose
```

## Alternativ 3: GitHub Actions (anbefalt)
Push til `main` branch trigger automatisk deploy via Vercel GitHub integration.

## Verifikasjon etter deploy
```bash
# Health check
curl -s https://www.klarpakke.no/api/health | jq

# Sjekk sentry alerts
curl -s https://www.klarpakke.no/api/auth/diagnose 2>/dev/null | jq

# Test OAuth (manuelt)
# Gå til https://www.klarpakke.no/no/login og test Google login
```

## Nødvendige miljøvariabler
```bash
export NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
export NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
export SENTRY_AUTH_TOKEN=sntrys_xxx        # Valgfri
export SLACK_DEPLOY_WEBHOOK=https://hooks... # Valgfri
```
