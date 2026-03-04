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
4. **Kopier den hemmelige nøkkelen** (sk_test_... eller sk_live_...)

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

## 🎯 Hva vi skal gjøre etterpå

### 1. Sette opp Klarpakke-priser:
```
Produkter vi trenger:
├── Krypto for Småsparere (Kurs)
│   ├── Pris: 999 kr (engangsbetaling)
│   └── Eller: 299 kr/mnd (abonnement)
│
├── Trading Masterclass (Kurs)
│   ├── Pris: 1,499 kr
│   └── Eller: 399 kr/mnd
│
└── VIP Medlemskap
    ├── Basic: 199 kr/mnd
    ├── Pro: 499 kr/mnd
    └── Ekstrem: 999 kr/mnd
```

### 2. Konfigurere produksjonsmiljø:
- Bytte fra test til live keys
- Sette opp webhook URL
- Konfigurere skatt (MVA)

---

## 🚨 Viktig: Test vs Live

| Miljø | API Key | Bruk |
|-------|---------|------|
| Test | sk_test_... | Utvikling, testing |
| Live | sk_live_... | Ekte betalinger |

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
