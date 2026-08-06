# web_extract limitations for JS-rendered pages

## Problem

`web_extract` fungerer som en statisk HTML-scraper — den kjører IKKE JavaScript. Alle sider som er JS-rendret (React client components, auth-skjemaer, priskort) returneres som tomme eller med placeholder-innhold.

## Sider som IKKE kan testes med web_extract

| Side | Hvorfor | Alternativ |
|------|---------|------------|
| `/login` | JS-rendret auth-form | `curl` med Supabase session token, eller browser/CUA |
| `/register` | JS-rendret registreringsskjema | Browser/CUA |
| `/priser` | Priskort genereres client-side fra i18n + API. `web_extract` viser KUN headingene (Student/Bachelor/Master/PhD/Professor) uten priser, features eller CTA-knapper. | Sjekk `/api/pricing` API-et direkte (returnerer ekte Stripe priceIds). Verifiser i18n-nøkler i `messages/no.json` under `studieprogram.tiers.*`. |
| `/dashboard/*` | Krever auth (httpOnly cookies) | `curl` med cookie, eller Supabase MCP for DB-verifisering |
| `/trade` | Krever auth + WebSocket | `curl` mot `/api/paper-trading/balance` med token |

## Hva web_extract KAN teste

- Landing page (statisk HTML + server-side i18n)
- `/om-oss` (statisk HTML)
- `/kurs` (delvis statisk)
- i18n-nøkkel-lekkasjer (rá nøkler vises i statisk HTML)
- Duplikat innhold
- "Laster..." placeholders

## Triks for innloggede sider

Bruk Supabase MCP for å verifisere DB-tilstand, og `curl` med Bearer token for API-ruter:

```bash
# Få token
TOKEN=$(curl -s -X POST "https://pskhryjzkobytnfwucrb.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -d '{"email":"test@klarpakke.no","password":"TestTest123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Test API
curl -H "Authorization: Bearer $TOKEN" "https://www.klarpakke.no/api/paper-trading/balance"
```

**Merk:** API-ruter på Cloudflare Workers kan IKKE lese `Authorization`-headeren (kun httpOnly cookies). Bruk Supabase MCP for DB-verifisering når API-et returnerer 401.

## Når du ser tomme sider i web_extract

1. **IKKE rapporter som kritisk bug** — sjekk først om siden er JS-rendret
2. Bruk browser/CUA for faktisk visuell verifisering
3. Fallback: sjekk i18n-nøkler, API-responser, og DB-data direkte

## ⚠️ Falske duplikater: SSR + hydration capture

`web_extract` kan vise **hele sideinnholdet duplisert** — hero, features, modes, CTA, alt gjentas 100% identisk. Dette er IKKE en ekte rendering-bug. Årsak: Next.js renderer siden både server-side (SSR HTML i source) og client-side (hydration). `web_extract` sin JS-gjengiver fanger begge versjoner.

**Deteksjon:**
```bash
# Rå HTML (curl) har 0 treff for JS-rendret innhold
curl -s "https://www.klarpakke.no/no" | grep -c "100 000 kr"
# → 0 (innholdet er JS-rendret — bekrefter at duplikat er artefakt)

# Live markedspriser vist 4 ganger? Sjekk:
curl -s "https://www.klarpakke.no" | grep -c "Live markeder"
# → 0 i rå HTML → artefakt
```

**Også: bilder som gjentas rad på rad** (identisk `alt`-tekst, identisk URL) — samme mekanisme. Sjekk med `curl` + `grep` før du rapporterer.

Når både `web_extract` OG `curl` viser duplikat → EKTE bug (fiks i koden). Når bare `web_extract` viser duplikat → artefakt.
