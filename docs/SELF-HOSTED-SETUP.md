# Selv-hostet infrastruktur for Klarpakke

Denne guiden beskriver hvordan du setter opp den nye infrastrukturen for Klarpakke på Hetzner + Coolify + Woodpecker CI + GlitchTip.

## Oversikt

```
Bruker
  ↓
Cloudflare DNS (klarpakke.no)
  ↓
Hetzner VPS (Coolify)
  ├── Next.js-app (Klarpakke)
  ├── GlitchTip (error tracking)
  └── Woodpecker CI (CI/CD)
  ↓
Supabase (database / auth)
```

## 1. Hetzner VPS

### Krav
- Ubuntu 24.04 LTS
- Minst 4 vCPU, 8 GB RAM, 160 GB SSD
- Offentlig IPv4

### Initial setup

```bash
# Oppdater systemet
apt update && apt upgrade -y

# Installer Docker
 curl -fsSL https://get.docker.com | sh

# Installer Coolify
 curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### Tilgang til Coolify

Etter installasjonen er ferdig, åpnes Coolify UI på:

```
http://<server-ip>:8000
```

Følg onboarding for å sette opp:
- Root domain: `klarpakke.no`
- Default proxy: Traefik eller Nginx
- HTTPS via Let's Encrypt

## 2. Coolify — Klarpakke-app

### Opprett prosjekt

1. Lag et nytt prosjekt i Coolify.
2. Velg **Resource type: Application**.
3. Koble til Git-repoet: `https://github.com/tajlive/KP`.
4. Branch: `main`.
5. Build pack: `Dockerfile` eller `Nixpacks`.
6. Under **Advanced**, aktiver **Include Source Commit in Build**. Dette eksponerer
   `SOURCE_COMMIT` slik at deploy-pipelinen kan bekrefte at riktig commit faktisk
   kjører i produksjon.

### Environment variables

Sett følgende secrets i Coolify:

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://www.klarpakke.no` |
| `NEXT_PUBLIC_APP_VERSION` | f.eks. `1.0.0` |
| `NEXT_PUBLIC_SUPABASE_URL` | Din Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | f.eks. `2024-04-07` |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | DSN fra GlitchTip-prosjektet |
| `POSTGRES_URL` | Supabase pooler URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CRON_SECRET` | Secret for cron-endepunkter |
| `SLACK_WEBHOOK` | Valgfritt for deploy-varsler |

> **VIKTIG:** For Supabase pooleren må URL-en inneholde tenant-referansen:
> `?options=reference%3Dpskhryjzkobytnfwucrb`

### Build command

```bash
npm ci --prefer-offline --legacy-peer-deps && npm run build
```

### Start command

```bash
npm start
```

## 3. Woodpecker CI

### Installasjon

Woodpecker CI kjøres som en Docker Compose-stack på samme VPS eller en dedikert CI-server:

```bash
mkdir -p /opt/woodpecker
cd /opt/woodpecker
```

Opprett `docker-compose.yml`:

```yaml
services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:latest
    ports:
      - "8001:8000"
    volumes:
      - woodpecker-server-data:/var/lib/woodpecker
    environment:
      WOODPECKER_OPEN: "true"
      WOODPECKER_HOST: "https://ci.klarpakke.no"
      WOODPECKER_GITHUB: "true"
      WOODPECKER_GITHUB_CLIENT: "${WOODPECKER_GITHUB_CLIENT}"
      WOODPECKER_GITHUB_SECRET: "${WOODPECKER_GITHUB_SECRET}"
      WOODPECKER_AGENT_SECRET: "${WOODPECKER_AGENT_SECRET}"

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:latest
    command: agent
    restart: always
    depends_on:
      - woodpecker-server
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WOODPECKER_SERVER: "woodpecker-server:9000"
      WOODPECKER_AGENT_SECRET: "${WOODPECKER_AGENT_SECRET}"

volumes:
  woodpecker-server-data:
```

Start:

```bash
docker compose up -d
```

### Konfigurasjon i repoet

Woodpecker leser filer fra `.woodpecker/`:

- `.woodpecker/pr-check.yml` — lint, type-check, test, build
- `.woodpecker/deploy.yml` — build + deploy til Coolify

### Secrets i Woodpecker

Gå til prosjektet i Woodpecker UI og legg til:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `NEXT_PUBLIC_GLITCHTIP_DSN`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_VERSION`
- `COOLIFY_DEPLOY_WEBHOOK`
- `COOLIFY_TOKEN`

## 4. GlitchTip

### Start med Docker Compose

```bash
docker compose -f docker-compose.glitchtip.yml up -d
```

### Første oppsett

1. Gå til `https://glitchtip.klarpakke.no`.
2. Opprett en organisasjon og et prosjekt.
3. Kopier DSN og sett den som `NEXT_PUBLIC_GLITCHTIP_DSN` i Coolify og Woodpecker.

### Opprette alerts

```bash
npm run glitchtip:alerts:import
```

## 5. DNS (Cloudflare)

| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `www.klarpakke.no` | CNAME | `<hetzner-ip>` eller Coolify domain | ✅ |
| `klarpakke.no` | CNAME | `<hetzner-ip>` eller Coolify domain | ✅ |
| `ci.klarpakke.no` | A | `<hetzner-ip>` | ✅ |
| `glitchtip.klarpakke.no` | A | `<hetzner-ip>` | ✅ |

## 6. Verifikasjon

```bash
# Sjekk Coolify app health
curl https://www.klarpakke.no/api/health

# Sjekk GlitchTip
curl https://glitchtip.klarpakke.no/_health/

# Kjør PR-check lokalt
npm run lint:gate && npm run type-check && npm run test:unit && npm run build
```

## 7. Nyttige kommandoer

```bash
# Se logs
docker logs -f klarpakke  # Coolify-app

# Restart app
docker compose -f docker-compose.glitchtip.yml restart

# Deploy manuelt til Coolify
curl -X POST "$COOLIFY_DEPLOY_WEBHOOK" -H "Authorization: Bearer $COOLIFY_TOKEN"
```

## 8. Migrering fra Fly.io

1. Sett opp Hetzner + Coolify.
2. Kopier secrets fra Fly.io til Coolify.
3. Bytt DNS fra `klarpakke.fly.dev` til Hetzner/Coolify.
4. Verifiser produksjon.
5. Etter verifisering: slett Fly.io-appen.
