# Selv-hostet infrastruktur — Kjøreplan (Runbook)

> **Status:** Del 1 (kode + CI-config) er ferdig og pushet til `main`.  
> Dette dokumentet er steg-for-steg-instruksjonene for **Del 2** — oppsett av Hetzner VPS med Coolify, Woodpecker og GlitchTip.

---

## 0. Hva du trenger på forhånd

- [ ] Hetzner-konto (https://hetzner.cloud)
- [ ] Cloudflare-konto med `klarpakke.no` (du har dette)
- [ ] GitHub-repo: `tajlive/KP` (du har dette)
- [ ] Supabase-prosjekt med pooler-URL (du har dette)
- [ ] SSH-nøkkel på lokal maskin (f.eks. `~/.ssh/id_ed25519.pub`)

**Forventet ny månedlig kostnad:** ~€30–40
- Hetzner CPX21: ~€11/mnd
- Hetzner CX22 (valgfri for CI/GlitchTip): ~€4/mnd  
  *Alternativt: kjør alt på én CPX21/CPX31 for ~€11–18/mnd*
- Supabase: beholdes (unngår stor migrering)
- Cloudflare: Free plan
- Sanity: beholdes

Sammenlignet med Fly.io + Sentry + GitHub Actions: potensielt **€150–400/mnd** → **€30–40/mnd**.

---

## 1. Bestill Hetzner VPS

### Anbefalt spec for alt på én server

| Komponent | Valg |
|-----------|------|
| Server type | CPX21 (4 vCPU, 8 GB RAM, 160 GB NVMe) |
| Location | Nürnberg eller Falkenstein |
| Image | Ubuntu 24.04 LTS |
| IPv4 | Ja |
| Backups | Ja (anbefalt, ~20 % av prisen) |
| Firewalls | Aktiver SSH (22), HTTP (80), HTTPS (443) |

### Hvis du vil skille CI/GlitchTip

| Server | Type | Formål |
|--------|------|--------|
| `klarpakke-app` | CPX21 | Coolify + Klarpakke app |
| `klarpakke-ci` | CX22 | Woodpecker CI + GlitchTip |

Denne guiden antar **én CPX21-server** for enkelhet.

### Etter bestilling

1. Gå til Hetzner Console → Project → Security → SSH Keys.
2. Legg til din offentlige SSH-nøkkel.
3. Gå til serveren → Reset root password (valgfritt) eller bruk SSH-nøkkel.
4. Noter IP-adressen: `<HETZNER_IP>`.

---

## 2. Initial server-setup

Koble til serveren:

```bash
ssh root@<HETZNER_IP>
```

Kjør one-shot setup:

```bash
# 1. Oppdater systemet
apt update && apt upgrade -y

# 2. Installer essensielle verktøy
apt install -y curl wget git ufw fail2ban

# 3. Opprett en ikke-root bruker (valgfritt men anbefalt)
adduser klarpakke
usermod -aG sudo klarpakke

# 4. Aktiver brannmur
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 5. Installer Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker klarpakke

# 6. Installer Docker Compose plugin (kommer ofte med get.docker.com)
docker compose version
```

---

## 3. Installer Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Etter installasjon:

```bash
# Sjekk at Coolify kjører
docker ps | grep coolify

# Hvis brannmur blokkerer port 8000 midlertidig
ufw allow 8000/tcp
```

Åpne Coolify UI:

```
http://<HETZNER_IP>:8000
```

Følg onboarding:
1. Opprett admin-bruker.
2. Sett **Root Domain** til `klarpakke.no`.
3. Velg **Default Proxy**: Traefik (anbefalt).
4. Aktiver **Let's Encrypt** for HTTPS.

---

## 4. Konfigurer Klarpakke i Coolify

### 4.1 Opprett prosjekt

1. Coolify UI → Projects → Add.
2. Lag prosjekt f.eks. `klarpakke-prod`.
3. Klikk **+ New** → **Application**.
4. Velg **GitHub** og autentiser mot `tajlive/KP`.
5. Velg branch `main`.

### 4.2 Build settings

| Felt | Verdi |
|------|-------|
| Build Pack | `Nixpacks` eller `Dockerfile` |
| Port | `3000` |
| Base Directory | `/` |
| Build Command | `npm ci --prefer-offline --legacy-peer-deps && npm run build` |
| Start Command | `npm start` |

> Hvis du bruker `Dockerfile`, velg `Dockerfile` og la Coolify bygge.

### 4.3 Environment variables

Legg til følgende **secrets** i Coolify (Settings → Environment Variables):

```env
NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
NEXT_PUBLIC_APP_VERSION=1.0.0

NEXT_PUBLIC_SUPABASE_URL=<din-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<din-anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<din-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<din-service-role-key>
POSTGRES_URL=<din-pooler-url>?options=reference%3D<din-tenant>

NEXT_PUBLIC_SANITY_PROJECT_ID=<din-sanity-project-id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-04-07

CRON_SECRET=<sterk-tilfeldig-string>

NEXT_PUBLIC_GLITCHTIP_DSN=https://<glitchtip-key>@glitchtip.klarpakke.no/1
```

> **VIKTIG:** `POSTGRES_URL` må inneholde tenant-referansen, f.eks.:  
> `postgres://postgres.xxxxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?options=reference%3Dpskhryjzkobytnfwucrb`

Hvis du ikke har GlitchTip DSN ennå, la feltet stå tomt inntil videre.

### 4.4 Domains

I Coolify → Application → Domains:

```
www.klarpakke.no
```

Aktiver **HTTPS**.

### 4.5 Deploy første gang

Klikk **Deploy**. Dette bygger appen. Første bygg tar 5–15 minutter.

---

## 5. Sett opp GlitchTip

### 5.1 Start GlitchTip-stacken

På serveren:

```bash
cd /opt
mkdir -p glitchtip
cd glitchtip
```

Kopier inn `docker-compose.glitchtip.yml` fra repoet:

```bash
git clone --depth 1 https://github.com/tajlive/KP.git /tmp/kp
cp /tmp/kp/docker-compose.glitchtip.yml .
```

Opprett `.env`:

```bash
cat > .env <<EOF
GLITCHTIP_POSTGRES_USER=glitchtip
GLITCHTIP_POSTGRES_PASSWORD=$(openssl rand -base64 32)
GLITCHTIP_POSTGRES_DB=glitchtip
GLITCHTIP_SECRET_KEY=$(openssl rand -base64 50)
GLITCHTIP_PORT=8080
GLITCHTIP_ENABLE_USER_REGISTRATION=False
GLITCHTIP_DEFAULT_FROM_EMAIL=noreply@klarpakke.no
EOF
```

Start:

```bash
docker compose up -d
```

### 5.2 Eksponer GlitchTip via Coolify

1. Coolify UI → `klarpakke-prod` → **+ New** → **Service**.
2. Velg **Docker Compose-based** eller legg til som egen app.
3. Domain: `glitchtip.klarpakke.no`.
4. Proxy mot port `8080`.

Alternativt: legg til en `docker-compose.glitchtip.yml` som en egen **Service** i Coolify.

### 5.3 Første bruker

Gå til:

```
https://glitchtip.klarpakke.no
```

1. Opprett superuser:

```bash
docker compose exec web ./manage.py createsuperuser
```

2. Logg inn i UI.
3. Opprett organisasjon `Klarpakke` og prosjekt `Klarpakke Web`.
4. Kopier DSN, f.eks.:

```
https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@glitchtip.klarpakke.no/1
```

5. Lim DSN inn i Coolify environment variable `NEXT_PUBLIC_GLITCHTIP_DSN`.
6. Redeploy Klarpakke.

---

## 6. Sett opp Woodpecker CI

### 6.1 Opprett GitHub OAuth App

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. **Application name**: `Woodpecker CI Klarpakke`
3. **Homepage URL**: `https://ci.klarpakke.no`
4. **Authorization callback URL**: `https://ci.klarpakke.no/authorize`
5. Lagre **Client ID** og **Client Secret**.

### 6.2 Start Woodpecker

```bash
mkdir -p /opt/woodpecker
cd /opt/woodpecker
```

Opprett `.env`:

```bash
cat > .env <<EOF
WOODPECKER_GITHUB_CLIENT=<github-client-id>
WOODPECKER_GITHUB_SECRET=<github-client-secret>
WOODPECKER_AGENT_SECRET=$(openssl rand -hex 32)
WOODPECKER_HOST=https://ci.klarpakke.no
WOODPECKER_OPEN=true
WOODPECKER_GITHUB=true
EOF
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
      WOODPECKER_HOST: "${WOODPECKER_HOST}"
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

### 6.3 Eksponer Woodpecker via Coolify

1. Coolify → `klarpakke-prod` → **+ New** → **Service**.
2. Domain: `ci.klarpakke.no`.
3. Proxy mot intern port `8001`.

### 6.4 Aktiver repo i Woodpecker

1. Gå til `https://ci.klarpakke.no`.
2. Logg inn med GitHub.
3. Aktiver repoet `tajlive/KP`.
4. Gå til repo Settings → Secrets.
5. Legg til:

```env
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SANITY_PROJECT_ID
NEXT_PUBLIC_SANITY_DATASET
NEXT_PUBLIC_SANITY_API_VERSION
NEXT_PUBLIC_GLITCHTIP_DSN
COOLIFY_DEPLOY_WEBHOOK
COOLIFY_TOKEN
```

`COOLIFY_DEPLOY_WEBHOOK` og `COOLIFY_TOKEN` får du fra Coolify:
- Coolify → Application → Webhook URL.
- Coolify → API Tokens.

Aktiver også **Application → Advanced → Include Source Commit in Build**.
Klarpakkes `/api/health` eksponerer de første sju tegnene av `SOURCE_COMMIT`,
og Woodpecker avviser deployen dersom produksjon fortsatt kjører en eldre commit.

### 6.5 Oppdater deploy-pipeline

I repoet er `.woodpecker/deploy.yml` allerede laget. Du må fjerne kommentaren på Coolify-curl:

```yaml
- name: deploy-to-coolify
  image: alpine/curl
  commands:
    - |
      set -eu
      : "${COOLIFY_DEPLOY_WEBHOOK:?Missing coolify_deploy_webhook}"
      : "${COOLIFY_TOKEN:?Missing coolify_token}"
      curl --fail-with-body --show-error --silent --max-time 30 \
        --request POST \
        --header "Authorization: Bearer ${COOLIFY_TOKEN}" \
        "${COOLIFY_DEPLOY_WEBHOOK}"
  secrets:
    - coolify_deploy_webhook
    - coolify_token
```

Commit og push:

```bash
git add .woodpecker/deploy.yml
git commit -m "ci(woodpecker): aktiver Coolify deploy webhook"
git push origin main
```

---

## 7. Bytt DNS (Cloudflare)

Gå til Cloudflare DNS for `klarpakke.no`:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| A | `@` | `<HETZNER_IP>` | ✅ |
| A | `www` | `<HETZNER_IP>` | ✅ |
| A | `ci` | `<HETZNER_IP>` | ✅ |
| A | `glitchtip` | `<HETZNER_IP>` | ✅ |

> Fjern eksisterende CNAME til `klarpakke.fly.dev` først.

Vent 1–5 minutter på propagering.

---

## 8. Verifiser alt

### 8.1 Sjekk domener

```bash
curl -I https://www.klarpakke.no
curl -I https://ci.klarpakke.no
curl -I https://glitchtip.klarpakke.no
```

### 8.2 Sjekk app health

```bash
curl -sfS https://www.klarpakke.no/api/health
```

Skal returnere JSON med `status: ok`.

### 8.3 Sjekk GlitchTip health

```bash
curl -sfS https://glitchtip.klarpakke.no/_health/
```

### 8.4 Sjekk Woodpecker

1. Gå til `https://ci.klarpakke.no/tajlive/KP`.
2. Lag en test-PR eller push til `main`.
3. Bekreft at pipeline kjører grønt.

### 8.5 Sjekk error tracking

1. Åpne `https://www.klarpakke.no`.
2. Åpne DevTools → Console.
3. Kjør: `fetch('/api/test-sentry')` — dette endepunktet er fjernet, så du får 404, men eventuell JS-feil skal logges til GlitchTip hvis DSN er satt.

Alternativt: trigge en faktisk feil via konsoll:

```js
throw new Error('Test GlitchTip from klarpakke')
```

---

## 9. Rydde opp Fly.io (etter verifisering)

**IKKE gjør dette før du har verifisert at Hetzner/Coolify fungerer i minst 24 timer.**

```bash
# Sjekk at alt er stabilt
fly status --app klarpakke

# Når du er klar:
fly apps destroy klarpakke
```

Slett også Sentry-prosjektet hvis du ikke lenger vil betale for det.

---

## 10. Troubleshooting

### Coolify UI er ikke tilgjengelig

```bash
ufw allow 8000/tcp
docker logs -f coolify
```

### Appen får ikke koblet til Supabase

Sjekk at `POSTGRES_URL` inneholder `?options=reference%3D<tenant>`.

### Woodpecker får ikke autentisert mot GitHub

Sjekk at callback URL er nøyaktig: `https://ci.klarpakke.no/authorize`.

### GlitchTip får ikke startet

```bash
cd /opt/glitchtip
docker compose logs -f web
```

Sjekk at postgres er healthy:

```bash
docker compose ps
```

### HTTPS fungerer ikke

Sjekk at Cloudflare proxy er på og at Coolify Let's Encrypt er aktivert.  
Sjekk også at port 80 og 443 er åpne i Hetzner firewall og `ufw`.

---

## 11. Neste steg etter oppsett

- [ ] Overvåk serverressurser: `docker stats`
- [ ] Sett opp backup av GlitchTip PostgreSQL
- [ ] Vurder dedikert CI-server hvis byggene er trege
- [ ] Oppdater AGENTS.md hvis noen kommandoer endres
- [ ] Kjør første Woodpecker-deploy og bekreft grønn pipeline

---

## 12. Oppsummering av endringer i repoet (Del 1)

- Fjernet Sentry SDK (`@sentry/nextjs`, `@sentry/react`) og erstattet med minimal GlitchTip-shim.
- Arkiverte alle GitHub Actions workflows til `.github/workflows/archived/`.
- La til Woodpecker CI-config: `.woodpecker/pr-check.yml` og `.woodpecker/deploy.yml`.
- La til GlitchTip Docker Compose: `docker-compose.glitchtip.yml`.
- La til Coolify deploy-script: `scripts/coolify-deploy.mjs`.
- Flyttet ubrukte Supabase Edge Functions til `supabase/functions/archived/`.
- Oppdaterte `AGENTS.md`, `README.md` og `docs/SELF-HOSTED-SETUP.md`.

Commit: `4d8fab2d7` på `main`.
