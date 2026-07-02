# OMP + Kimi K2.7 Code via lokal OAuth-bridge

> Hvorfor: OMP har ingen innebygd Kimi OAuth-leverandør. Denne bridgen autentiserer mot Moonshot/Kimi med device-flow OAuth, lagrer token lokalt, og eksponerer et OpenAI-kompatibelt `/v1/chat/completions`-endepunkt som OMP kan bruke som en vanlig API-nøkkel-basert provider.

---

## Hva løsningen gjør

1. `tools/kimi-oauth-bridge/` — en frittstående Node-basert proxy.
2. `npm run kimi-oauth:login` — starter device flow, skriver ut verification URL + user code, og lagrer token i `~/.kimi-oauth-bridge/tokens.json`.
3. `npm run kimi-oauth:bridge` — starter proxyen på `http://localhost:8123`.
4. OMP konfigureres mot `http://localhost:8123/v1` med en lokal API-nøkkel som kun OMP og bridge kjenner.

---

## Forutsetninger

- Node 20+ (prosjektet bruker 24.x).
- `KIMI_OAUTH_CLIENT_ID` må være satt (samme ID som Klarpakke-appen bruker).
- OMP er installert (`omp` i PATH).

---

## Installasjon

### 1. Installer bridge-avhengigheter

```bash
cd tools/kimi-oauth-bridge
npm ci --legacy-peer-deps
```

### 2. Sett miljøvariabler

Bruk enten `.env.local` i repo-roten eller eksporter i terminalen:

```bash
export KIMI_OAUTH_CLIENT_ID="din-client-id"
# Optional:
export KIMI_OAUTH_CLIENT_SECRET="din-client-secret"
export KIMI_OAUTH_SCOPE="openid profile"
export KIMI_OAUTH_BRIDGE_API_KEY="$(openssl rand -hex 32)"
export BRIDGE_API_KEY="$KIMI_OAUTH_BRIDGE_API_KEY"
export KIMI_OAUTH_BRIDGE_PORT=8123
```

`KIMI_OAUTH_BRIDGE_API_KEY` / `BRIDGE_API_KEY` er nøkkelen OMP bruker mot bridge. Den er **ikke** det samme som Kimi OAuth-tokenet. `BRIDGE_API_KEY` vinner hvis begge er satt.

### 3. Konfigurer OMP

Legg til følgende i `~/.omp/agent/models.yml`:

```yaml
providers:
  kimi-local:
    name: "Kimi OAuth Bridge"
    baseUrl: http://localhost:8123/v1
    api: openai-completions
    apiKey: "!/Users/$USER/.omp/agent/get-kimi-bridge-key.sh"
    authHeader: true
    models:
      - id: kimi-k2-7-code
        name: "Kimi K2.7 Code"
        reasoning: true
        input: [text, image]
        cost:
          input: 0
          output: 0
          cacheRead: 0
          cacheWrite: 0
        contextWindow: 262144
        maxTokens: 8192
```

Opprett nøkkel-scriptet:

```bash
cat > ~/.omp/agent/get-kimi-bridge-key.sh <<'EOF'
#!/bin/sh
echo "$KIMI_OAUTH_BRIDGE_API_KEY"
EOF
chmod +x ~/.omp/agent/get-kimi-bridge-key.sh
```

> **Merk:** OMP støtter `!`-prefiks for å hente API-nøkkelen fra et program. Hvis du foretrekker en hardkodet nøkkel i `models.yml`, erstatt `apiKey` med den. Oppbevar ikke hemmeligheter i repoet.

---

## Bruk

### 1. Logg inn med Kimi OAuth

```bash
npm run kimi-oauth:login
```

Åpne URL-en som skrives ut, bekreft user code, og vent til scriptet sier `✓ Kimi OAuth login successful.`.

Token lagres i `~/.kimi-oauth-bridge/tokens.json` med filrettigheter `600`.

### 2. Start bridge

```bash
npm run kimi-oauth:bridge
```

### 3. Bruk K2.7 Code i OMP

```bash
omp --model kimi-local/kimi-k2-7-code "Din prompt her"
```

---

## Verifisering

### Bridge health

```bash
curl -s http://localhost:8123/health
```

### Modelliste

```bash
curl -s http://localhost:8123/v1/models -H "Authorization: Bearer $KIMI_OAUTH_BRIDGE_API_KEY"
```

### Chat-kall

```bash
curl -X POST http://localhost:8123/v1/chat/completions \
  -H "Authorization: Bearer $KIMI_OAUTH_BRIDGE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"kimi-k2-7-code","messages":[{"role":"user","content":"Hei"}]}'
```

### OMP mot bridge

```bash
omp --model kimi-local/kimi-k2-7-code "Hei"
```

I bridge-loggen skal du se:

```text
Proxying chat completion for model kimi-k2-7-code
```

---

## Feilsøking

| Problem | Mulig årsak | Løsning |
|---|---|---|
| `401 Invalid or missing bridge API key` | Feil `BRIDGE_API_KEY` / OMP sender ikke riktig nøkkel | Sjekk at `KIMI_OAUTH_BRIDGE_API_KEY` er eksportert og at `models.yml` peker på riktig nøkkelkilde. |
| `No Kimi OAuth token found` | Ikke logget inn | Kjør `npm run kimi-oauth:login`. |
| `Kimi token refresh failed` | Refresh token utløpt / OAuth tilgang trukket tilbake | Kjør `npm run kimi-oauth:login` på nytt. |
| `listen EADDRINUSE: :::8123` | En annen bridge-prosess kjører | `pkill -f start-kimi-bridge.js` og start på nytt. |
| OMP feiler med nettverksfeil | Bridge ikke startet / OMP kan ikke nå `localhost:8123` | Start bridge og sjekk `curl http://localhost:8123/health`. |

---

## Sikkerhet

- OAuth-tokenet lagres **kun** lokalt i `~/.kimi-oauth-bridge/tokens.json`.
- Mappe og fil settes til `700`/`600` ved første lagring.
- `BRIDGE_API_KEY` er en lokal hemmelighet mellom OMP og bridge.
- Committ aldri tokenet eller `.env.local` til Git.

---

## Filer

- `tools/kimi-oauth-bridge/package.json`
- `tools/kimi-oauth-bridge/src/config.ts`
- `tools/kimi-oauth-bridge/src/auth.ts`
- `tools/kimi-oauth-bridge/src/index.ts`
- `tools/kimi-oauth-bridge/src/cli-login.ts`
- `scripts/start-kimi-bridge.js`
- `~/.omp/agent/models.yml` (utenfor repoet)
