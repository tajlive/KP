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
BASE_URL=https://klarpakke.fly.dev npm run verify:prod
```

### Trading Auth Architecture

User-bound trading-ruter bruker `createServerClient(request, response)` for å sikre at RLS-policyer respekteres. Se [docs/trading/TRADING-AUTH-REFACTOR-P0.md](docs/trading/TRADING-AUTH-REFACTOR-P0.md) for detaljer.

**Kjerneprinsipper:**
- Paper og live trading bruker samme `executeTrade(supabase, request)` pipeline
- Mode bestemmer kun execution-adapter (PaperExecutor vs BinanceExecutor)
- Service-role (`createClient()`) er kun tillatt i cron/system-ruter og legacy wrappers

### Hosting

- **App:** `klarpakke` på [Fly.io](https://fly.io)
- **Region:** `arn` (Stockholm)
- **URL:** https://klarpakke.fly.dev
- **Domene:** https://klarpakke.no / https://www.klarpakke.no (Cloudflare DNS + proxy)

### Deploy-sekvens

```bash
# 1. Push til main
git push origin main

# 2. Vent på GitHub Actions → Fly.io deploy
#    Workflow: .github/workflows/deploy-fly.yml

# 3. Verifiser produksjon
npm run verify:prod
```

Manuell deploy fra lokal maskin (hvis nødvendig):

```bash
npm run fly:deploy
```

### Nyttig Fly.io-kommandoer

```bash
flyctl status --app klarpakke      # App-status
flyctl logs --app klarpakke        # Se logs
flyctl secrets list --app klarpakke # Secrets
```
<!-- Deploy pipeline test: 2026-04-16T17:11:19+02:00 -->
