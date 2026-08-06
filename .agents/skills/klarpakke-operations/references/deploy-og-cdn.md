# Deploy Og Cdn

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 3. CDN cache purge

Etter deploy kan CDN servere gammelt innhold i opptil 24t (stale-while-revalidate).

```bash
bash scripts/purge-cdn.sh
```

Scriptet prøver wrangler token først, faller tilbake til `CLOUDFLARE_API_TOKEN`.

**⚠️ Statiske filer (manifest.json, sw.js) kan forbli edge-cachet SELV etter purge (verifisert 2026-08-01):** manifest.json viste gammel `start_url` (`/no/handel`) etter deploy + purge. Verifiser med cache-buster + no-cache-headere:
```bash
curl -sS "https://www.klarpakke.no/manifest.json?cb=1" -H "Cache-Control: no-cache" | grep -o '"start_url": "[^"]*"'
```
Først svar uten query ga gammel verdi; med `?cb=1` + `no-cache` kom den nye. Konkluder ALDRI "endringen gikk ikke ut" fra én vanlig curl på statisk JSON — sjekk med cache-buster først.




---

## 🚀 Deploy-prosedyre når wrangler OAuth er utløpt (2026-08-02)

**Symptom:** `wrangler deploy` feiler med `Invalid access token [code: 9109]` eller `401 Authentication error` på R2-bucket-sjekk, selv om `CLOUDFLARE_API_TOKEN` i `.env.local` er gyldig for Workers API.

**Prosedyre:**
```bash
cd /Users/taj/klarpakke && source .env.local
export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d= -f2 | tr -d '"' | tr -d "'")
export CLOUDFLARE_ACCOUNT_ID=$(grep '^CLOUDFLARE_ACCOUNT_ID=' .env.local | cut -d= -f2)
rm -r .next .open-next 2>/dev/null
SKIP_LINT_IN_BUILD=true NODE_OPTIONS="--max-old-space-size=4096" npx next build
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build --skipNextBuild
npx wrangler deploy --env "" --var "APP_VERSION:$(git rev-parse --short HEAD)"
```

**R2-auth-felle:** OpenNext sin `ensureR2Bucket()` gjør `client.r2.buckets.get()` som feiler med 400/401 når tokenet kun har list-scope. Tokenet KAN `list()` buckets. **Patch** `node_modules/@opennextjs/cloudflare/dist/cli/utils/ensure-r2-bucket.js`: på auth-feil fra GET, fall tilbake til `list()` og sjekk om bucketnavnet er i listen. ⚠️ **Må repatches etter hver `npm install`** — patch ligger i node_modules, ikke i repo. Hvis deploy plutselig feiler med R2 401 etter en reinstall: repatch før du feilsøker noe annet. **Ferdig script:** `scripts/deploy-klarpakke.sh` i denne skillen — hele flyten (auth + idempotent R2-patch + clean rebuild + deploy) i én kommando.

**Token-typer:** `cfat_`-prefix = API Token (scope-basert, det vi har). `cfk_` = Global Key (X-Auth-Email+Key). Tokenet vårt kan: Workers Scripts (read/write), R2 list — men IKKE R2 get/create enkelt-bucket, IKKE Workers Builds API (12006).

**Auth-feilklassiﬁsering ved deploy (2026-08-03):** `wrangler whoami`-feil `Invalid access token [code: 9109]` = OAuth utløpt (bruk env-vars). `401/400 Authentication error` på R2 = API Token uten R2-scope (bruk R2-patchen). `Invalid format for Authorization header [code: 6111]` = token inneholder quotes/whitespace — stripp med `tr -d '"' | tr -d "'"`. Tre ulike feil, tre ulike fikser — ikke bland dem.
