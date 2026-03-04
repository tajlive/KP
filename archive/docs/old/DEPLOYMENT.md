# 🚀 Deployment Guide - Klarpakke

**Stack:** Cloudflare Pages + Supabase  
**Dato:** 1. februar 2026  
**Estimert tid:** 2-3 timer

---

## 📋 Hva du trenger

- [ ] Cloudflare konto (gratis)
- [ ] Tilgang til DNS for ditt domene
- [ ] Supabase prosjekt (allerede satt opp)

---

## 1️⃣ Cloudflare Pages Setup

### Steg 1.1: Opprett nytt prosjekt
1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klikk "Pages" i venstre meny
3. Klikk "Create a project"
4. Velg "Upload assets"

### Steg 1.2: Upload filer
```bash
# Zip webflow-pages mappen
cd /Users/taj/klarpakke
zip -r klarpakke-deploy.zip webflow-pages/

# Eller bruk Cloudflare Wrangler CLI
npm install -g wrangler
wrangler pages deploy webflow-pages --project-name=klarpakke
```

### Steg 1.3: Konfigurer byggeinnstillinger
**Build command:** (la være tom - statiske filer)  
**Build output directory:** `/`  
**Root directory:** `webflow-pages`

---

## 2️⃣ Custom Domain Setup

### Steg 2.1: Legg til domene
1. I Cloudflare Pages, gå til "Custom domains"
2. Klikk "Set up a custom domain"
3. Skriv inn: `klarpakke.no`
4. Klikk "Continue"

### Steg 2.2: DNS Konfigurasjon

#### Alternativ A: Cloudflare Nameservers (Anbefalt)
1. I Cloudflare Dashboard, gå til ditt domene
2. Kopier nameservers:
   ```
   lara.ns.cloudflare.com
   greg.ns.cloudflare.com
   ```
3. Gå til din domene-registrar (f.eks. Domene.shop)
4. Endre nameservers til Cloudflare
5. Vent 24-48 timer på propagation

#### Alternativ B: CNAME Record (Raskere)
1. Gå til din DNS-leverandør
2. Legg til CNAME record:
   ```
   Type: CNAME
   Name: @
   Target: klarpakke.pages.dev
   TTL: Auto
   ```
3. Legg til WWW record:
   ```
   Type: CNAME
   Name: www
   Target: klarpakke.pages.dev
   TTL: Auto
   ```

---

## 3️⃣ HTTPS/SSL Setup

### Steg 3.1: Enable SSL
Cloudflare Pages bruker automatisk HTTPS. Ingen ekstra konfigurasjon nødvendig!

### Steg 3.2: Force HTTPS
1. Gå til Cloudflare Dashboard → SSL/TLS
2. Sett "Always Use HTTPS" til **ON**
3. Sett SSL/TLS encryption mode til **Full (strict)**

---

## 4️⃣ Supabase CORS Setup

### Steg 4.1: Legg till Cloudflare URL i CORS
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Gå til "Authentication" → "URL Configuration"
4. Under "Redirect URLs", legg til:
   ```
   https://klarpakke.no/**
   https://www.klarpakke.no/**
   ```

### Steg 4.2: Verifiser CORS
Test med curl:
```bash
curl -I -X OPTIONS \
  -H "Origin: https://klarpakke.no" \
  -H "Access-Control-Request-Method: POST" \
  "https://swfyuwkptusceiouqlks.supabase.co/functions/v1/public-config"
```

Forventet: `Access-Control-Allow-Origin: *`

---

## 5️⃣ Testing etter Deploy

### Steg 5.1: Grunnleggende sjekk
```bash
# Test at siden laster
curl -s https://klarpakke.no | head -20

# Test HTTPS
curl -I https://klarpakke.no
# Forventet: HTTP/2 200
```

### Steg 5.2: Funksjonell testing
Åpne https://klarpakke.no i browser:

- [ ] Logo vises korrekt
- [ ] Cookie banner vises
- [ ] "Godta" knapp fungerer
- [ ] Alle sider laster uten 404
- [ ] HTTPS padlock vises

### Steg 5.3: Auth testing
- [ ] Gå til /signup
- [ ] Prøv å registrere test-bruker
- [ ] Sjekk at rate limit fungerer
- [ ] Gå til /login
- [ ] Verifiser login form vises

### Steg 5.4: Meta tags testing
```bash
# Sjekk OG tags
curl -s https://klarpakke.no | grep "og:title"
curl -s https://klarpakke.no | grep "og:description"
```

---

## 6️⃣ Troubleshooting

### Problem: 404 på sider
**Løsning:** Legg til `_redirects` fil i webflow-pages/:
```
/* /:splat 200
```

### Problem: CORS errors
**Løsning:** Sjekk at Supabase URL Configuration inkluderer ditt domene

### Problem: Assets laster ikke
**Løsning:** Sjekk at paths er relative:
```html
<!-- Riktig -->
<link rel="stylesheet" href="shared/styles.css">

<!-- Feil -->
<link rel="stylesheet" href="/shared/styles.css">
```

### Problem: HTTPS fungerer ikke
**Løsning:** 
1. Vent på DNS propagation (kan ta 24t)
2. Sjekk at SSL/TLS er satt til "Full (strict)"
3. Clear browser cache

---

## 7️⃣ Post-Deploy Checklist

### Umiddelbart etter deploy
- [ ] Alle 19 sider laster
- [ ] HTTPS fungerer
- [ ] Logo vises
- [ ] Cookie banner fungerer
- [ ] Ingen console errors

### 1 time etter deploy
- [ ] Test på mobil
- [ ] Test i forskjellige browsere
- [ ] Test auth signup/login
- [ ] Verifiser favicon

### 24 timer etter deploy
- [ ] DNS propagation ferdig
- [ ] SSL sertifikat aktivt
- [ ] Ingen 404 errors i logs

---

## 8️⃣ Rask Deploy Sjekkliste

```bash
# 1. Bygg
zip -r deploy.zip webflow-pages/

# 2. Upload til Cloudflare Pages
# (via Dashboard eller Wrangler CLI)

# 3. Verifiser
curl https://klarpakke.no
curl https://klarpakke.no/pricing
curl https://klarpakke.no/login

# 4. Test i browser
open https://klarpakke.no
```

---

## 📞 Support

Hvis noe går galt:
1. Sjekk Cloudflare Pages logs
2. Sjekk Supabase Edge Function logs
3. Se [TEST-PLAN.md](TEST-PLAN.md) for debugging
4. Sjekk [STATUS.md](STATUS.md) for kjente issues

---

**Klar for deploy! 🚀**

*Sist oppdatert: 2026-02-01*
