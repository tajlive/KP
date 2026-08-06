# Klarpakke Project Scripts Reference

Located at `/Users/taj/klarpakke/scripts/`.

## Validation

| Script | Command | Purpose |
|--------|---------|---------|
| `validate-i18n-usage.js` | `npm run i18n:usage` | Sjekker kode `t("key")` mot `messages/no.json` |
| `validate-i18n.js` | `npm run i18n:validate` | Sjekker `no.json` ↔ `en.json` struktur |
| `batch-fix-i18n.py` | `python3 scripts/batch-fix-i18n.py` | Auto-genererer manglende i18n-nøkler |
| `pre-push.mjs` | `node scripts/pre-push.mjs` | Kjører alle pre-commit gates |

## Maintenance

| Script | Command | Purpose |
|--------|---------|---------|
| `purge-cdn.sh` | `bash scripts/purge-cdn.sh` | Tømmer Cloudflare CDN-cache |
| `refresh-kimi-token.mjs` | launchd (hver 15. min) | Fornyer K3 OAuth-token |

## Timeout guards

| Script | Command | Purpose |
|--------|---------|---------|
| `add-timeout-guards.py` | `python3 scripts/add-timeout-guards.py` | ⚠️ BRUK IKKE — ødelegger TypeScript-kode |

Bruk heller subagenter for timeout-guards (se SKILL.md seksjon 2).
