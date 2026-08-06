# K3 OAuth Token Refresh

## Architecture

```
auth.kimi.com/oauth/token
        ↓ refresh_token
~/.pi/agent/auth.json → kimi-coding.access
        ↓ kopier til
~/.hermes/config.yaml → model.api_key
        ↓ brukes av
Hermes → api.kimi.com/coding/v1 (K3 model)
```

## Files

- Auth file: `~/.pi/agent/auth.json`
- Config: `~/.hermes/config.yaml`  
- Refresh script: `~/.hermes/scripts/refresh-kimi-token.mjs`
- Launchd plist: `~/Library/LaunchAgents/no.klarpakke.kimi-token-refresh.plist`
- Logs: `~/.hermes/logs/kimi-refresh.log`

## Refresh URL

`https://auth.kimi.com/api/oauth/token`

Not `kimi.plus` (DNS feiler), not `api.kimi.com` (returns 404 for refresh).

## Troubleshooting

**Config.yaml oppdateres ikke:** Sjekk at `  api_key:` (2 spaces indent under `model:`) finnes. String-replacement i refresh-scriptet trenger denne eksakte linjen.

**Token utløpt:** `pi login` via Pi CLI. Finn binary: `find ~/.nvm -name "pi" -type f`

**Ingen token:** `~/.nvm/versions/node/v22.22.1/bin/pi login` — krever Kimi-konto.
