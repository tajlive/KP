# Real Trading Setup Guide

Denne guiden forklarer hvordan du setter opp real trading for gratis brukere i Klarpakke.

## 📋 Oversikt

Real trading-systemet lar brukere handle med ekte penger på Binance direkte fra Klarpakke-dashboardet. Systemet er bygget med følgende prinsipper:

- **Gratis tier**: 10 trades/måned, $1000 volum/måned
- **Sikkerhet**: API keys krypteres og lagres trygt
- **Testnet-støtte**: Øv deg med "fake" penger først
- **Freemium-modell**: Oppgrader for ubegrenset trading

---

## 🚀 Kom i gang (5 minutter)

### Steg 1: Opprett Binance Testnet API Keys

1. Gå til [Binance Testnet](https://testnet.binance.vision/)
2. Logg inn med GitHub-konto
3. Klikk "Generate HMAC_SHA256 Key"
4. Lagre **API Key** og **Secret Key** (vises kun én gang!)

### Steg 2: Kjør Database Migrasjon

```bash
# Deploy migrasjon til Supabase
supabase db push

# Eller kjør SQL manuelt i Supabase SQL Editor
cat supabase/migrations/20260131100000_real_trading.sql | pbcopy
```

### Steg 3: Koble Exchange-konto

```bash
curl -X POST http://localhost:3000/api/real-trading/account \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "din-user-id",
    "exchange": "binance",
    "apiKey": "din-api-key",
    "apiSecret": "din-secret",
    "isTestnet": true
  }'
```

### Steg 4: Start Trading

1. Gå til Dashboard → Real Trading
2. Velg symbol (f.eks. BTCUSDT)
3. Angi beløp (min $10)
4. Klikk Buy/Sell

---

## 📊 Freemium Grenser

| Feature | Free | Premium |
|---------|------|---------|
| **Trades/måned** | 10 | Ubegrenset |
| **Volum/måned** | $1,000 | $100,000 |
| **Ordretyper** | Market | Market, Limit, Stop |
| **Stop Loss** | ✅ | ✅ |
| **Take Profit** | ✅ | ✅ |
| **Margin Trading** | ❌ | ✅ |
| **Pris** | Gratis | $19/måned |

---

## 🔐 Sikkerhet

### API Key Permissions (Anbefalt)

Når du oppretter API keys på Binance, aktiver KUN:

- ✅ **Enable Reading** - For å lese saldo
- ✅ **Enable Spot & Margin Trading** - For å handle
- ❌ **Enable Withdrawals** - Aldri aktiver for trading bots!

### IP Restriksjoner

Begrens API keys til dine server-IP-er:
```
# I Binance API settings
Allowed IPs: Din server IP
```

### Kryptering (Viktig!)

**Merk**: I produksjon MÅ du kryptere API keys:

```typescript
// TODO: Implementer kryptering
import { encrypt, decrypt } from '@/lib/encryption';

// Lagring
api_key_encrypted: encrypt(apiKey, process.env.ENCRYPTION_KEY)

// Bruk
const apiKey = decrypt(storedKey, process.env.ENCRYPTION_KEY)
```

---

## 🧪 Testing med Testnet

Testnet lar deg "handle" med fake penger:

1. Gå til [Binance Testnet](https://testnet.binance.vision/)
2. Få gratis test-USDT (faucet)
3. Koble til Klarpakke med `isTestnet: true`
4. Test alle funksjoner risikofritt

---

## 📡 API Endepunkter

### Konto

```http
GET  /api/real-trading/account?userId={id}    # Hent kontoer
POST /api/real-trading/account                 # Koble exchange
DELETE /api/real-trading/account               # Koble fra
```

### Trading

```http
GET  /api/real-trading/orders?userId={id}     # Hent posisjoner
POST /api/real-trading/orders                  # Plasser ordre
```

### Limits

```http
GET  /api/real-trading/limits?userId={id}     # Sjekk grenser
POST /api/real-trading/limits                  # Oppgrader plan
```

---

## 🔄 Ordreflyt

```
1. Bruker plasserer ordre
   ↓
2. Sjekk freemium-grenser (can_place_trade)
   ↓
3. Hent API keys fra database
   ↓
4. Send ordre til Binance
   ↓
5. Lagre posisjon i database
   ↓
6. Oppdater trade-teller (record_trade_usage)
   ↓
7. Send notifikasjon til bruker
```

---

## 🛠️ Utvikling

### Lokale miljøvariabler

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ENCRYPTION_KEY=...  # For API key kryptering
```

### Nyttige kommandoer

```bash
# Kjør migrasjon lokalt
supabase migration up

# Test API
npm run dev
curl http://localhost:3000/api/real-trading/limits?userId=test

# Se database
supabase studio
```

---

## ⚠️ Vanlige problemer

### "Invalid API key"

- Sjekk at du bruker riktig key (testnet vs prod)
- Sjekk at IP restrictions ikke blokkerer

### "Monthly trade limit reached"

- Gratis-brukere har 10 trades/måned
- Resettes første dag hver måned
- Oppgrader for ubegrenset

### "Insufficient balance"

- Sjekk at du har nok USDT på Binance
- Husk at minimum er $10 per trade

---

## 📈 Veien videre

### MVP (Nå)
- ✅ Binance spot trading
- ✅ Market orders
- ✅ Basic limits

### V2 (Kommende)
- [ ] Flere exchanges (Coinbase, Kraken)
- [ ] Limit orders for Premium
- [ ] Automated strategies
- [ ] Webhook notifikasjoner
- [ ] Mobil app

---

## 🤝 Support

Har du spørsmål?

1. Sjekk [GitHub Issues](https://github.com/tombomann/klarpakke/issues)
2. Les [CLAUDE.md](../CLAUDE.md) for utvikler-detaljer
3. Kontakt teamet på kontakt@klarpakke.no

---

**Happy Trading! 🚀**
