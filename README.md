# Klarpakke

Norges første krypto-trading skole. Lær krypto fra A til Å med paper trading, autotrading og kurs.

**Repository:** [https://github.com/tajlive/KP](https://github.com/tajlive/KP)  
**GitHub-oppsett (branch protection, secrets, CODEOWNERS):** [.github/GITHUB_SETUP.md](.github/GITHUB_SETUP.md)

## Production Verification

Etter hver production deploy:

```bash
npm run verify:prod
```

**Deploy er ikke komplett før alle smoke tester passerer.**

Dette verifiserer:

- ✅ Auth-path routing (ikke redirect til `/en` for auth paths)
- ✅ Ekte 404 for ukjente paths
- ✅ Legacy `/no/*` redirect
- ✅ Eksplisitt locale routing (`/en/`, `/th/`, `/zh/`)
- ✅ Health endpoint
- ✅ Non-auth Accept-Language redirect

### Test mot preview

```bash
BASE_URL=https://klarpakke.no npm run verify:prod
```

### Trading Auth Architecture

User-bound trading-ruter bruker `createServerClient(request, response)` for å sikre at RLS-policyer respekteres. Se [docs/trading/TRADING-AUTH-REFACTOR-P0.md](docs/trading/TRADING-AUTH-REFACTOR-P0.md) for detaljer.

**Kjerneprinsipper:**
- Paper og live trading bruker samme `executeTrade(supabase, request)` pipeline
- Mode bestemmer kun execution-adapter (PaperExecutor vs BinanceExecutor)
- Service-role (`createClient()`) er kun tillatt i cron/system-ruter og legacy wrappers

### Hosting (migrerer til selv-hostet)

> **Status:** Migrering pågår fra Fly.io/Vercel/GitHub Actions til Hetzner + Coolify + Woodpecker CI.
> Se [docs/SELF-HOSTED-SETUP.md](docs/SELF-HOSTED-SETUP.md) for detaljer.

- **App:** Coolify på Hetzner VPS
- **URL:** https://klarpakke.no / https://www.klarpakke.no (Cloudflare DNS)
- **CI/CD:** Woodpecker CI (`.woodpecker/`)
- **Error tracking:** GlitchTip (selv-hostet, Sentry SDK-kompatibel)
- **Legacy:** Fly.io-oppsettet er arkivert i `.github/workflows/archived/`

### Deploy-sekvens

```bash
# 1. Push til main
git push origin main

# 2. Vent på Woodpecker CI → Coolify deploy
#    Konfigurasjon: .woodpecker/deploy.yml

# 3. Verifiser produksjon
npm run verify:prod
```

### Nyttige kommandoer

```bash
# Coolify logg (på VPS)
docker logs -f coolify

# Woodpecker logg (på VPS)
docker logs -f woodpecker-server

# GlitchTip status
docker compose -f docker-compose.glitchtip.yml ps
```
<!-- Deploy pipeline test: 2026-04-16T17:11:19+02:00 -->
