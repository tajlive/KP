---
name: klarpakke-grid-operations
description: Use when operating Klarpakke grid or deploying to Cloudflare
version: 1.0.0
author: Hermes Agent
license: MIT
platforms:
- macos
metadata:
  hermes:
    tags:
    - klarpakke
    - grid
    - kraken
    - deployment
    - pitfalls
whenToUse: Når bruker ber om operasjon av Klarpakke grid eller deploy til Cloudflare.
  IKKE for enkle pris-sjekker.
disableModelInvocation: true
---

# Klarpakke Grid Operations

Drift av Toms live Kraken-grid og deploy-prosedyre. To kritiske bugs funnet 2026-08-05.

## 1. Kraken Balance asset-mapping: XXBT/XETH legacy-prefiks

**Symptom:** Equity mangler XBT/ETH-verdi — kun USDC telles. Kill-switch viser falsk drawdown.

**Rotårsak:** Kraken Balance API returnerer `XXBT` (ikke XBT) og `XETH` (ikke ETH). `bal["XBT"]` → undefined → 0.

**Fiks:** ALLTID les balanse med korrekt Kraken-asset-navn fra PAIR_CFG SSoT:

```js
const PAIR_CFG = {
  XBTUSDC: { asset: "XXBT", ... },
  ETHUSDC: { asset: "XETH", ... },
  SOLUSDC: { asset: "SOL",  ... },
};
```

Aldri konstruer asset-navn fra `pair.replace("USDC","")` — det gir "XBT" som er feil.

**Verifiser:** `curl -s "https://api.kraken.com/0/public/Assets" | node -e "..."` — XXBT→XBT, XETH→ETH, SOL→SOL.

## 2. TDZ-bug: const deklarert ETTER bruk i kill-switch

**Symptom:** Kill-switch kaster stille `ReferenceError` når den trengs — auto-kill KANSELLERER ALDRI ORDRER.

**Rotårsak:** `const open = await kraken("OpenOrders")` deklarert ETTER koden som bruker `Object.keys(open)`. JS `const` er i Temporal Dead Zone.

**Fiks:** Deklarer `open` FØR alle steder som leser den.

## 3. Deploy-prosedyre (fast-track, håndterer R2-auth)

```bash
cd /Users/taj/klarpakke && source .env.local
export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
rm -rf .next .open-next
SKIP_LINT_IN_BUILD=true NODE_OPTIONS="--max-old-space-size=4096" npx next build
SKIP_LINT_IN_BUILD=true npx opennextjs-cloudflare build --skipNextBuild
npx wrangler deploy --env "" --var "APP_VERSION:$(git rev-parse --short HEAD)"
```

**R2-auth-felle:** 401 på R2-bucket → patche `ensure-r2-bucket.js` i node_modules (list-fallback). Må repatches etter hver `npm install`.

**Fullt deploy-script:** `/Users/taj/.hermes/skills/klarpakke/klarpakke-trading-strategy/scripts/deploy-klarpakke.sh`

## 4. Progressiv drawdown (kill-switch)

<7% fulle nivåer | 7–15% halverte | >15% full kill. `src/lib/trading/kraken-kill-switch.ts`.

## 5. Regime-guard

24h-endring > ±5% OG volatilitet > 8% → ingen nye idle-nivåer (grid = sideways).
