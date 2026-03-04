# 🔐 Doppler Setup for Klarpakke

## Hvorfor Doppler?

- Én kilde for alle secrets
- Auto-synk til GitHub, Vercel, Supabase
- Ingen manuell kopiering
- Versionskontroll for secrets

## Steg 1: Registrer deg

1. Gå til https://doppler.com
2. Registrer med GitHub (gratis)
3. Bekreft e-post

## Steg 2: Opprett prosjekt

```bash
# Installer Doppler CLI
brew install doppler

# Logg inn
doppler login

# Opprett prosjekt
doppler projects create klarpakke
```

## Steg 3: Legg til secrets

```bash
# Bytt til prosjektet
doppler setup

# Velg prosjekt: klarpakke
# Velg config: dev (for utvikling) eller prd (for produksjon)

# Legg til secrets
doppler secrets set CLOUDFLARE_API_TOKEN="din-verdi"
doppler secrets set SUPABASE_SERVICE_ROLE_KEY="din-verdi"
doppler secrets set ANTHROPIC_API_KEY="din-verdi"
# ... og alle andre
```

## Steg 4: Synk til GitHub

### Via Doppler Dashboard:

1. Gå til https://dashboard.doppler.com
2. Velg prosjekt "klarpakke"
3. Klikk "Integrations"
4. Velg "GitHub Actions"
5. Koble til repo: klarpakke/klarpakke
6. Velg hvilke secrets som skal synkes
7. Aktiver "Auto-sync"

### Via CLI:

```bash
# Synk spesifikke secrets til GitHub
doppler secrets upload github \
  --repo klarpakke/klarpakke \
  --secrets CLOUDFLARE_API_TOKEN,SUPABASE_SERVICE_ROLE_KEY
```

## Steg 5: Synk til Supabase

```bash
# Hent alle secrets som .env
doppler secrets download --format env --no-file > /tmp/secrets.env

# Parse og sett i Supabase
while IFS='=' read -r name value; do
  supabase secrets set "$name=$value" --project-ref swfyuwkptusceiouqlks
done < /tmp/secrets.env

# Rydd opp
rm /tmp/secrets.env
```

## Steg 6: Synk til Vercel

```bash
# Doppler har direkte integrasjon
doppler integrations create vercel \
  --project klarpakke \
  --target production
```

## Bruk i GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Hent secrets fra Doppler
      - name: Load secrets
        uses: dopplerhq/secrets-fetch-action@v1
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
          inject-env-vars: true
      
      # Deploy med secrets tilgjengelig
      - name: Deploy
        run: vercel --prod
```

## Fordeler

| Funksjon | GitHub kun | Med Doppler |
|----------|-----------|-------------|
| Synk til flere plattformer | ❌ Manuel | ✅ Auto |
| Versionskontroll | ❌ Nei | ✅ Ja |
| Team-tilgang | ⚠️ Begrenset | ✅ Granulært |
| Rotate secrets | ❌ Manuel | ✅ API-støtte |
| Secret references | ❌ Nei | ✅ $variable |

## Pris

- **Gratis:** 5 brukere, 3 prosjekter
- **Pro:** $5/bruker/måned (ubegrensede prosjekter)
- **Enterprise:** Egne priser

For Klarpakke: **Gratis er nok!**
