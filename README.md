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
BASE_URL=https://klarpakke-preview.vercel.app npm run verify:prod
```

### Deploy-sekvens

```bash
# 1. Push til main
git push origin main

# 2. Vent på Vercel deploy
# (auto-deploy fra main)

# 3. Verifiser produksjon
npm run verify:prod
```
