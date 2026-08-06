# Oauth Og Secrets

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 4. K3 OAuth token — vedlikehold (2026-07-26 oppdatert)

**Arkitektur:**
- Token i `~/.pi/agent/auth.json` → `kimi-coding.access`
- launchd plist `no.klarpakke.kimi-token-refresh` (hvert 15. min)
- Script: `~/.hermes/scripts/refresh-kimi-token.mjs`
- Hermes bruker OAuth-tokenet via fallback-kjede: `gemini → kimi-coding → openrouter → nous`

**K3-begrensning (2026-07-26):** K3 (k3/k3-256k) fungerer IKKE via Hermes' custom provider — krever `thinking`-parameter som custom provider ikke sender. K2.7 Highspeed (`kimi-for-coding-highspeed`) fungerer via OAuth fallback. For K3 må Pi CLI brukes direkte: `pi` → `/model kimi-coding/k3`.

**Kimi modell-alias:** `/model kimi` → `kimi-for-coding-highspeed` (K2.7, 256K context).

**Feilsøking ved manglende token:**
```bash
find ~/.nvm -name "pi" -type f                           # Finn pi binary
~/.nvm/versions/node/v22.22.1/bin/pi login               # OAuth login
python3 -c "import json; d=json.load(open('/Users/taj/.pi/agent/auth.json')); print('OK' if d.get('kimi-coding',{}).get('access') else 'NO')"
```


