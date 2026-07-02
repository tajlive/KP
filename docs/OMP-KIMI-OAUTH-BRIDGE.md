# OMP + Kimi K2.7 Code

> Hvorfor: OMP trenger en Kimi-provider for å bruke K2.7 Code. Klarpakke bruker nå API-nøkkel direkte mot `https://api.kimi.com/coding/v1`, med OAuth-bridge som alternativ for lokale preferanser.

## Anbefalt: KIMI_API_KEY

1. Hent API-nøkkel fra [Kimi Open Platform Console](https://platform.kimi.ai/console/api-keys).
2. Legg til i `.env.local`:
   ```bash
   KIMI_API_KEY=sk-kimi-...
   ```
3. OMP modellkonfigurasjon (`~/.omp/agent/models.yml`):
   ```yaml
   providers:
     kimi-k2-7-code:
       baseUrl: https://api.kimi.com/coding/v1
       apiKey: "!/Users/$USER/.omp/agent/get-kimi-api-key.sh"
       authHeader: true
       api: openai-completions
       models:
         - id: kimi-for-coding
           name: Kimi K2.7 Code
           reasoning: true
           input: [text, image]
           cost:
             input: 0
             output: 0
             cacheRead: 0
             cacheWrite: 0
           contextWindow: 262144
           maxTokens: 65536
   ```
4. Lag nøkkelscriptet:
   ```bash
   cat > ~/.omp/agent/get-kimi-api-key.sh <<'EOF'
   #!/bin/sh
   echo "$KIMI_API_KEY"
   EOF
   chmod +x ~/.omp/agent/get-kimi-api-key.sh
   ```

## Alternativ: lokal OAuth-bridge

`tools/kimi-oauth-bridge/` eksisterer fortsatt for de som foretrekker OAuth device flow. Se `tools/kimi-oauth-bridge/.env.example` for oppsett.

## Verifisering

```bash
curl -s https://api.kimi.com/coding/v1/models \
  -H "Authorization: Bearer $KIMI_API_KEY"
```

Forventet modell: `kimi-for-coding`.

## OMP project overlay

`.omp/config.yml` låser alle modellroller til `kimi-k2-7-code/kimi-for-coding:high`.
