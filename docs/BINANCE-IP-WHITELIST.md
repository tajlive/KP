# Binance API IP Whitelist Setup

## 🚨 Problemet

Binance krever IP-whitelist for API-nøkler med trading-tillatelser. Supabase Edge Functions har dynamiske IP-adresser som endres.

## ✅ Løsning

### Alternativ 1: Bruk en Proxy Server (Anbefalt)

Sett opp en liten VPS med statisk IP som proxy:

```
[Bruker] → [Supabase Edge Function] → [Din Proxy VPS] → [Binance API]
                                    (Statisk IP)
```

**Fordeler:**
- Full kontroll over IP
- Kan whitelist én IP i Binance
- Sikker (kryptert trafikk)

**Ulemper:**
- Kostnad for VPS (~$5/mnd)
- Ekstra kompleksitet

**Oppsett:**
1. Opprett VPS hos f.eks. DigitalOcean, Linode, eller Vultr
2. Installer Nginx som reverse proxy
3. Whitelist VPS IP i Binance
4. Konfigurer edge functions til å bruke proxy

### Alternativ 2: Begrensede Tillatelser (Midlertidig)

For testing, bruk kun:
- ✅ **Enable Reading** - For portefølje-sync
- ❌ **Enable Spot & Margin Trading** - Skru AV

Dette fungerer for:
- Se saldo
- Se åpne posisjoner
- Hente markedsdata

Men **IKKE** for:
- Automatisk trading
- Plassere ordrer

### Alternativ 3: Cloudflare Workers (Fremtidig)

Binance tillater Cloudflare IP-ranges. Vi kan migrere edge functions til Cloudflare Workers.

## 📋 Oppsett med VPS Proxy

### 1. Opprett VPS
```bash
# Eksempel: Ubuntu 22.04 LTS på DigitalOcean
# Velg region nærmest dine brukere
```

### 2. Installer Nginx
```bash
sudo apt update
sudo apt install nginx

# Konfigurer reverse proxy
sudo nano /etc/nginx/sites-available/binance-proxy
```

### 3. Nginx Konfigurasjon
```nginx
server {
    listen 443 ssl;
    server_name din-proxy-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass https://api.binance.com;
        proxy_set_header Host api.binance.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Få VPS IP
```bash
curl ifconfig.me
# Output: 123.456.789.012 (din statiske IP)
```

### 5. Whitelist i Binance
1. Gå til Binance → API Management
2. Edit din API key
3. Under "IP Access Restrictions":
   - Velg "Restrict access to trusted IPs only"
   - Legg til: `123.456.789.012` (din VPS IP)
4. Aktiver trading-tillatelser

### 6. Oppdater Edge Function
```typescript
// I binance-executor.ts
const BINANCE_PROXY_URL = 'https://din-proxy-domain.com';

// Bruk proxy i stedet for direkte Binance API
const response = await fetch(`${BINANCE_PROXY_URL}/api/v3/order`, {...});
```

## 🔐 Sikkerhet

### API Key Kryptering
```typescript
// Krypter API keys før lagring
const encryptedKey = await encrypt(apiKey, ENCRYPTION_SECRET);

// Dekrypter kun i edge function
const decryptedKey = await decrypt(encryptedKey, ENCRYPTION_SECRET);
```

### Tillatelser Checklist
- [ ] Kun nødvendige tillatelser aktivert
- [ ] IP whitelist konfigurert
- [ ] API keys kryptert i database
- [ ] Master key i miljøvariabler
- [ ] Ingen logging av sensitiv data

## 🧪 Testing

### Test med curl
```bash
# Via proxy
curl -H "X-MBX-APIKEY: din-api-key" \
     https://din-proxy-domain.com/api/v3/account

# Direkte (skal feile hvis IP ikke whitelistet)
curl -H "X-MBX-APIKEY: din-api-key" \
     https://api.binance.com/api/v3/account
```

### Test i app
1. Koble til med test API keys (testnet)
2. Verifiser at ordrer går gjennom
3. Sjekk at webhook fungerer

## 📞 Support

Hvis du får "Invalid API key" feil:
1. Sjekk at IP er whitelistet
2. Verifiser at API key har riktige tillatelser
3. Test at proxy er tilgjengelig
4. Sjekk logs på VPS

## 🎯 Anbefaling for Produksjon

For alvorlig trading med ekte penger:

1. **Sett opp dedikert VPS** ($5-10/mnd)
2. **Bruk testnet først** - Prøv alle funksjoner
3. **Start med små beløp** - Begrens risiko
4. **Monitor aktivt** - Sjekk logs daglig
5. **Ha en kill-switch** - Mulighet til å stoppe alt

## 🔗 Ressurser

- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
