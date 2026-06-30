# Krash-responsplan for Klarpakke

> Kopier og følg denne planen neste gang appen ser ut til å krasje.
> Oppdatert: 2026-06-30

---

## 1. Bekreft symptom

Før du graver, sjekk hva som faktisk er ødelagt:

- [ ] Hvilken URL? (f.eks. `https://www.klarpakke.no/no/handel`)
- [ ] Hvilken handling? (f.eks. klikk på "Start trading", login, lasting av dashboard)
- [ ] Hvilken nettleser / enhet?
- [ ] Feilmelding i DevTools Console / Network? (lim inn)
- [ ] Gjelder det én bruker eller alle?

---

## 2. Kjør rask diagnose (ett script)

```bash
npm run diagnose:crash
```

Scriptet sjekker:
- Produksjons health-endepunkt
- Siste Cloudflare-deployments
- Siste Worker-logger (30 sek)
- Lokal git-status
- Unit-tester (valgfritt, `--tests`)

Se output og let etter:
- `exceptions` (ikke-tomme = Worker-krasj)
- HTTP-status != 200 på `/api/health` eller `/no`
- `Sanity fetch error: plan_limit_reached` (API-kvote brukt opp)
- `Binance non-OK: 403` (markedsdata-fallback)

---

## 3. Manuell diagnose (hvis scriptet er utilgjengelig)

### Sjekk produksjon

```bash
curl -s https://www.klarpakke.no/api/health | jq .
curl -sI https://www.klarpakke.no/no | head -5
```

### Sjekk Cloudflare-deployments

```bash
npx wrangler deployments list
```

Se etter rød/feilende deploy eller uventet versjon.

### Sjekk live-logger (kjør i 30–60 sek, reproduser feilen)

```bash
npx wrangler tail klarpakke
```

Se etter:
- `exceptions: [...]`
- `outcome: "exception"`
- `response.status >= 500`
- `console.error` med stack trace

### Sjekk lokal status

```bash
git status
git log -5 --oneline
```

Sikre at ingen ukommitede endringer forvirrer bildet.

---

## 4. Vanlige feil og hurtigfiks

### 4.1 Sanity-kvote brukt opp

**Tegn:** `Sanity fetch error: plan_limit_reached`
**Effekt:** CMS-innhold faller tilbake til hardkodet fallback. Siden skal fortsatt laste.
**Fiks:**
1. Vent til kvoten tilbakestilles (månedlig), eller
2. Oppgrader Sanity-plan på https://sanity.io/manage
3. Reduser Sanity-kall ved å øke `revalidate` eller dele cache på tvers av komponenter.

### 4.2 Binance 403

**Tegn:** `Binance non-OK: 403` eller `Using fallback`
**Effekt:** Markedsdata henter fra fallback (forrige cached/KV-verdi). Siden skal fortsatt laste.
**Fiks:**
1. Sjekk at ingen IP er blokkert.
2. Vurder proxy/API-gateway for markedsdata.
3. Se `.kimi/AUTO_TRADE_MASTER_PROMPT.md` for Binance-integrasjon.

### 4.3 Cloudflare Worker unntak (ekte krasj)

**Tegn:** `exceptions: [{...}]` i `wrangler tail`
**Effekt:** Bruker får 500/Cloudflare feilside.
**Fiks:**
1. Identifiser stack trace.
2. Hvis det er en ny deploy: rull tilbake med `npx wrangler rollback <version-id>`.
3. Hvis det er en kodefeil: fiks lokalt, kjør `npm run build`, push til GitHub.

### 4.4 Auth-loop / redirect-feil

**Tegn:** Siden redirecter i evig løkke eller kaster 401.
**Fiks:** Se `.kimi/FIX_AUTH_LOOP.md`.

---

## 5. Rollback (nødprosedyre)

Hvis produksjon er nede og du mistenker siste deploy:

```bash
# 1. List versjoner
npx wrangler deployments list

# 2. Rollback til forrige kjente gode versjon
npx wrangler rollback <version-id>

# 3. Verifiser
sleep 30
curl -s https://www.klarpakke.no/api/health | jq .
```

**Husk:** Fiks alltid koden i repo etterpå og push til GitHub — Git er source of truth.

---

## 6. Etter hendelsen

1. Oppdater `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` hvis hendelsen berørte trading.
2. Oppdater denne planen hvis du oppdaget nye feilmønstre.
3. Push fiksen til GitHub og vent på Cloudflare Workers Builds.

---

## 7. Viktige kommandoer (lim inn på én linje)

```bash
# Full helsesjekk
npm run diagnose:crash

# Kun produksjon
curl -s https://www.klarpakke.no/api/health | jq . && curl -sI https://www.klarpakke.no/no | head -5

# Kun logger
npx wrangler tail klarpakke

# Kun deployments
npx wrangler deployments list

# Bygg + test lokalt
npm run type-check && npm run test:unit && npm run build
```
