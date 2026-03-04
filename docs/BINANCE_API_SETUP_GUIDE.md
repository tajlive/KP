# 🔑 Binance API Setup Guide

**For:** Taj (tomarnejensen@gmail.com)  
**Dato:** 15. februar 2026  
**Status:** 🟡 VENTER PÅ API KEYS

---

## 🎯 Hva Trenger Vi

| Type | Verdi | Hvor Brukes |
|------|-------|-------------|
| **API Key** | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `.env.local`, GitHub Secrets |
| **API Secret** | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `.env.local`, GitHub Secrets |
| **Testnet Key** (valgfritt) | `xxx...` | Testing i development |

---

## 📋 Steg-for-Steg Guide

### Steg 1: Logg Inn på Binance

1. Gå til [binance.com](https://www.binance.com)
2. Klikk **"Logg inn"**
3. Bruk: **tomarnejensen@gmail.com**
4. Fullfør 2FA (SMS/Email/Google Authenticator)

### Steg 2: Naviger til API Management

```
Account → API Management
  eller
Profil-ikon (øvre høyre) → API Management
```

### Steg 3: Opprett Ny API Key

1. Klikk **"Create API"**
2. Velg **"System Generated"**
3. **Label:** `Klarpakke-Production`
4. Klikk **"Create"**
5. Bekreft med 2FA

### Steg 4: Konfigurer Tillatelser (VIKTIG!)

| Tillatelse | Status | Kommentar |
|------------|--------|-----------|
| ☑️ **Enable Reading** | ✅ PÅ | Hent saldo, priser |
| ☑️ **Enable Spot & Margin Trading** | ✅ PÅ | Nødvendig for Taj Engine |
| ☐ **Enable Withdrawals** | ❌ AV | **IKKE aktiver!** |
| ☐ **Enable Margin Loan** | ❌ AV | **IKKE aktiver!** |

**Klikk "Save"**

### Steg 5: IP Whitelist (Anbefalt)

Du har to alternativer:

#### Alternativ A: Begrenset IP (MEST SIKKERT)
1. Under "IP Access Restrictions"
2. Velg **"Restrict access to trusted IPs only"**
3. Legg til din server IP (kontakt Claude for IP)

#### Alternativ B: Ingen IP-begrensning (ENKLEST)
1. Velg **"Unrestricted (Less Secure)"**
2. Aksepter advarsel

> **Anbefaling:** Start med Alternativ B for testing, bytt til A når produksjon er stabil.

### Steg 6: Kopier Keys

```
API Key:     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret Key:  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

> ⚠️ **VIKTIG:** Secret Key vises KUN ÉN GANG. Kopier umiddelbart!

---

## 🧪 Testnet API (For Testing)

Før produksjon, test med Testnet:

1. Gå til [testnet.binance.vision](https://testnet.binance.vision)
2. Logg inn med GitHub-konto
3. Generer Testnet API Key
4. Bruk disse for lokal utvikling

---

## 📝 Legg til i `.env.local`

```bash
# Binance API (Produksjon)
BINANCE_API_KEY=your_actual_api_key_here
BINANCE_API_SECRET=your_actual_secret_here
BINANCE_USE_TESTNET=false

# Binance API (Testnet - for utvikling)
# BINANCE_API_KEY=testnet_key_here
# BINANCE_API_SECRET=testnet_secret_here
# BINANCE_USE_TESTNET=true
```

---

## 🔒 GitHub Secrets (For Deploy)

Legg til i GitHub repository secrets:

```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Verdi |
|-------------|-------|
| `BINANCE_API_KEY` | Din API Key |
| `BINANCE_API_SECRET` | Din API Secret |

---

## ✅ Verifisering

Etter at keys er lagt til, kjør:

```bash
# 1. Sjekk at .env.local er korrekt
cat .env.local | grep BINANCE

# 2. Restart utviklingsserver
npm run dev

# 3. Test tilkobling
# Gå til: http://localhost:3000/no/admin/system
# Sjekk "Binance Connection Status"
```

---

## 🚨 Sikkerhetsjekkliste

- [ ] API Key lagres KUN i `.env.local` (gitignored)
- [ ] API Secret logges ALDRI i konsoll
- [ ] Withdrawals er DEAKTIVERT
- [ ] IP whitelist konfigurert (hvis mulig)
- [ ] Testnet brukes for utvikling
- [ ] GitHub Secrets satt for produksjon

---

## 📞 Hjelp

Hvis du får problemer:

1. **"Invalid API Key"** - Sjekk at key er kopiert riktig
2. **"IP not whitelisted"** - Legg til din IP i whitelist
3. **"Insufficient permissions"** - Aktiver "Spot & Margin Trading"

Kontakt Claude hvis du trenger hjelp! 🤖

---

**Status:** ⏳ Venter på at Taj fullfører steg 1-6

_Etter dette er systemet 100% klar for go-live! 🚀_
