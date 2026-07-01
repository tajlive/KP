# Stripe MCP Setup Guide

## Hva er Stripe MCP?

MCP (Model Context Protocol) lar AI-assistanter (som Claude) kontrollere Stripe direkte via API. Dette betyr at jeg kan:

- ✅ Opprette produkter og priser
- ✅ Sette opp abonnementer
- ✅ Håndtere kunder
- ✅ Se transaksjoner
- ✅ Refundere betalinger

---

## 🔧 Oppsett (5 minutter)

### Steg 1: Hent Stripe API Keys

1. Gå til https://dashboard.stripe.com/apikeys
2. Klikk "Create secret key"
3. Velg navn: "MCP Server"
4. **Kopier den hemmelige nøkkelen** (sk*test*... eller sk*live*...)

### Steg 2: Installer Stripe MCP Server

**macOS/Linux:**

```bash
# Installer via npm
npm install -g @stripe/mcp

# Eller bruk npx
npx @stripe/mcp
```

**Windows:**

```powershell
npm install -g @stripe/mcp
```

### Steg 3: Konfigurer MCP i Claude Desktop

1. Åpne Claude Desktop
2. Gå til Settings (Cmd/Ctrl + ,)
3. Klikk "Developer" → "Edit Config"
4. Åpne `claude_desktop_config.json`

5. Legg til Stripe MCP:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp"],
      "env": {
        "STRIPE_API_KEY": "sk_test_...",
        "STRIPE_PUBLISHABLE_KEY": "pk_test_..."
      }
    }
  }
}
```

### Steg 4: Restart Claude Desktop

1. Lukk Claude Desktop helt
2. Åpne på nytt
3. Se etter "Stripe" i verktøylisten

---

## ✅ Verifiser oppsettet

Når jeg sier:
"Vis meg alle produkter i Stripe"

Skal du se:

- Stripe logo i verktøylisten
- API-kall blir gjort
- Produkter vises i chat

---

## ⚠️ Kanonisk prisstruktur (oppdatert mars 2026)

**Ikke bruk produktlisten under som sannhet** — den er eldre. Dagens planer og Stripe-env er dokumentert i:

- `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`
- `src/lib/pricing/tiers.ts` (NOK / features)
- `src/lib/pricing.config.ts` (NOK + EUR + USD + måned/år + `price_`-ID der satt)
- Checkout: `NEXT_PUBLIC_STRIPE_PRICE_*` i `src/app/api/stripe/checkout/route.ts`

**Stripe MCP** brukes til å opprette/justere **Price**-objekter i Dashboard-lignende flyt; repo + Cloudflare Workers env forblir kilde for hva appen faktisk sender til Checkout.

---

## Analyse: språk / valuta + årsbetaling

**Policy (source of truth: `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`):**

- **no** og **en** = aktivt scope for pris-copy og produktbeslutninger.
- **th** (Thai) og **zh** (kinesisk) = **avvent** — ingen egen pris-, valuta- eller checkout-strategi i SoT før det åpnes eksplisitt.

### Dagens tilstand i kodebasen

| Tema                | Praksis i dag                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Språk**           | Routing/locale SoT er **no + en**; **th/zh** er utenfor aktiv oversettelses-SoT (eldre filer/URL-er kan finnes).                                                    |
| **Valuta i config** | `CURRENCY_MAP`: `no` → **NOK**, `en` → **EUR**, `us` → **USD**. `th` / `zh` ikke mappet (irrelevant for SoT inntil avventing heves).                                |
| **Checkout**        | `CheckoutContent` kaller `getPriceId(..., "monthly", "NOK")` og viser `TIERS[].priceNOK` — **alle lokaler får i praksis NOK-månedlig** Stripe Price ID (hvis satt). |
| **Årspris**         | `pricing.config` har **annual** beløp + `priceId` per valuta, men checkout-API og UI har **ingen** valg for «betal årlig» — kun månedlig flyt.                      |

**Konklusjon:** **en**-brukere får kanonisk oversatt tekst (parallelt med **no**); **betaling er primært NOK-basert**. **th/zh** vedlikeholdes ikke som del av produkt-SoT. Kort kan fortsatt konverteres av bank.

### Anbefalt retning (kun no + en inntil videre)

1. **Kort sikt — tydelighet (lav risiko)**  
   På `/priser` og checkout for **en**: microcopy at **listepris er i NOK** (evt. estimat i EUR), og at kort kan belastes i NOK eller bankkonvertert.

2. **Mellomlang sikt — valuta for `en` (Stripe)**  
   Når dere prioriterer det: map `en` → **EUR** eller **USD**, `getPriceId(planId, period, resolveCurrency(locale))`, egne Stripe Prices. **Ikke utvid til th/zh** før policy i SoT endres.

3. **Skatt / compliance**  
   Skatterapport er **Norge-spesifikt**; for **en** bør copy presisere dette der det trengs.

### Årsrabatt 20 % — bør dere?

**Definisjon:** 20 % rabatt på år = kunden betaler **9,6 × månedlig** pr år (ikke 12 ×).

| For                                           | Mot                                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Enkel salgsstory: «spar 20 % ved årlig»       | Krever **nye årlige Price IDs** i Stripe + UI (måned/år) + webhook/metadata konsistent                                            |
| Bedre kontantstrøm og lavere churn for årlige | Noen brukere vil ikke binde seg et år; må ha refusjonsregler i vilkår                                                             |
| Ofte brukt i SaaS                             | Dagens årspriser i `pricing.config` er **ikke** nødvendigvis nøyaktig 20 % av 12× måned — må regnes om eller nye priser opprettes |

**Anbefaling:**

- **Ja, årsalternativ er fornuftig** hvis dere vil øke forskuddsbetaling.
- **Lås «20 %»** kun hvis tallene faktisk stemmer etter avrunding i **NOK (og evt. EUR/USD)**. Alternativ: markedsfør som **«spar X %»** der X er det faktiske forholdet etter at årspris er satt i Stripe.
- Implementeringsrekkefølge: (1) årlige `price_` i Stripe for hver tier/valuta, (2) toggle på checkout, (3) `subscription_data` / metadata `billing_period=annual`, (4) i18n-tekster.

### Kobling til Stripe MCP (praktisk)

Etter oppsett i denne filen kan assistenten (med MCP) f.eks.:

- Liste eksisterende Products/Prices og avdekke manglende **år**-priser eller **EUR/USD**-priser.
- Opprette nye Prices med riktig `recurring.interval: year` og beløp som tilsvarer ønsket rabatt.
- **Må** deretter speiles i `pricing.config` + Cloudflare Workers `NEXT_PUBLIC_*` (eller én konsolidert strategi uten duplikat-ID i kode).

---

## 🎯 Hva vi skal gjøre etterpå (historisk eksempel — se kanonisk blokk over)

### 1. ~~Sette opp Klarpakke-priser~~ (erstattet av tier-modellen)

```
(Eldre eksempel — ikke bruk som fasit)

├── Krypto for Småsparere (Kurs) …
├── Trading Masterclass …
└── VIP Medlemskap …
```

### 2. Konfigurere produksjonsmiljø:

- Bytte fra test til live keys
- Sette opp webhook URL
- Konfigurere skatt (MVA)

---

## 🚨 Viktig: Test vs Live

| Miljø | API Key     | Bruk               |
| ----- | ----------- | ------------------ |
| Test  | sk*test*... | Utvikling, testing |
| Live  | sk*live*... | Ekte betalinger    |

**ALDRI** bruk live keys i testing!

---

## ❌ Alternativ: Manuelle instruksjoner

Hvis MCP ikke fungerer, kan jeg gi deg:

- Trinn-for-trinn screenshots
- Kommandoer du kan kjøre selv
- Stripe Dashboard instruksjoner

---

## 🚀 La oss starte!

**Velg én:**

1. **"Sett opp MCP nå"** - Jeg venter mens du konfigurerer
2. **"Gi meg manuelle instruksjoner"** - Screenshots av Stripe Dashboard
3. **"Jeg har allerede MCP"** - La oss konfigurere priser!

Hva velger du? 🤔
