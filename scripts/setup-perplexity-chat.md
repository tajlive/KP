# Setup Perplexity Chat Bot

## Problem
Chat-roboten krever `PERPLEXITY_API_KEY` for å fungere.

## Løsning

### Steg 1: Skaff API-nøkkel fra Perplexity
1. Gå til https://www.perplexity.ai/settings/api
2. Logg inn med Perplexity Pro-kontoen din
3. Klikk "Create API Key"
4. Kopier API-nøkkelen (starter med `pplx-...`)

### Steg 2: Legg til i Cloudflare
```bash
# Via Wrangler CLI
npx wrangler secret put PERPLEXITY_API_KEY
# Lim inn API-nøkkelen når du blir spurt

# For lokal utvikling, legg til i .dev.vars:
echo "PERPLEXITY_API_KEY=din-api-nøkkel-her" >> .dev.vars

# Deploy på nytt
npm run cf:deploy
```

Eller via Cloudflare Dashboard:
1. Gå til https://dash.cloudflare.com
2. Velg Workers & Pages → klarpakke-prosjektet
3. Gå til Settings → Variables and Secrets
4. Add variable:
   - Name: `PERPLEXITY_API_KEY`
   - Value: `pplx-din-api-nøkkel-her`
5. Save → Redeploy

### Steg 3: Test
Chat-roboten skal nå fungere på `/no/dashboard`

### Prising (Perplexity API)
- ~$0.20 per 1000 tokens (Sonar model)
- Med normal bruk: ~$5-20/måned

---

Alternativ: Hvis du ikke vil betale for Perplexity API, kan vi bytte til OpenAI (GPT-4) som du allerede har satt opp.
