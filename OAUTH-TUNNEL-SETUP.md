# OAuth + Cloudflare Tunnel Setup Guide

**Dato:** 2026-04-10  
**Status:** Guide for lokal OAuth-testing med Cloudflare Tunnel  
**Tunnel URL:** `https://ringtones-dedicated-mutual-scoring.trycloudflare.com`

---

## 🎯 Oversikt

Denne guiden forklarer hvordan du konfigurerer OAuth (Google/GitHub/etc) til å fungere med din lokale utviklingsserver via Cloudflare Tunnel.

---

## 📋 Nåværende Status

### ✅ Konfigurert
- **Vercel Region:** `arn1` (Stockholm) - nærmeste til Norge/EU ✅
- **Supabase Region:** Frankfurt (tyskland) ✅
- **Cloudflare Tunnel:** Aktiv ✅
- **NEXT_PUBLIC_APP_URL:** `https://ringtones-dedicated-mutual-scoring.trycloudflare.com` ✅
- **CSP Headers:** Inkluderer Supabase-domener ✅
- **CORS:** Håndtert i auth handlers ✅

### ⚠️ Må Konfigureres Manuelt

Du må legge til tunnel-URL i:
1. **Google Cloud Console** (for Google OAuth)
2. **GitHub OAuth Apps** (for GitHub OAuth)
3. **Supabase Auth** (Site URL og Redirect URLs)

---

## 🔧 Steg 1: Google Cloud Console

### 1.1 Gå til Credentials
```
https://console.cloud.google.com/apis/credentials
```

### 1.2 Velg din OAuth 2.0 Client
- Klikk på **"Web client 1"** (eller tilsvarende)

### 1.3 Legg til Authorized Redirect URIs
Under **"Authorized redirect URIs"**, legg til:

```
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/api/auth/callback
```

### 1.4 Lagre
- Klikk **"Save"**

---

## 🔧 Steg 2: GitHub OAuth Apps (valgfritt)

Hvis du bruker GitHub OAuth:

### 2.1 Gå til Developer Settings
```
https://github.com/settings/developers
```

### 2.2 Velg din OAuth App
- Klikk på appen (f.eks. "Klarpakke Dev")

### 2.3 Oppdater Authorization Callback URL
```
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/api/auth/callback
```

### 2.4 Lagre
- Klikk **"Update application"**

---

## 🔧 Steg 3: Supabase Auth Configuration

### 3.1 Gå til Auth Settings
```
https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration
```

### 3.2 Site URL (Viktig!)
**Site URL** må være:
```
https://ringtones-dedicated-mutual-scoring.trycloudflare.com
```

### 3.3 Redirect URLs
Legg til følgende under **"Redirect URLs"**:

```
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/api/auth/callback
https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/v1/callback
```

### 3.4 Provider Settings
For hver OAuth-provider (Google, GitHub, etc.):

1. Gå til **Authentication → Providers**
2. Velg provider (f.eks. Google)
3. Sørg for at **"Enabled"** er på
4. Verifiser at **Client ID** og **Client Secret** er satt

---

## 🔧 Steg 4: Verifiser .env.local

Sørg for at `.env.local` har riktig APP_URL:

```bash
# Sjekk nåværende verdi
grep NEXT_PUBLIC_APP_URL .env.local
```

Forventet output:
```
NEXT_PUBLIC_APP_URL=https://ringtones-dedicated-mutual-scoring.trycloudflare.com
```

Hvis ikke, oppdater:
```bash
export TUNNEL_URL="https://ringtones-dedicated-mutual-scoring.trycloudflare.com"
sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$TUNNEL_URL|" .env.local
echo "Updated NEXT_PUBLIC_APP_URL to $TUNNEL_URL"
```

---

## 🧪 Testing

### Test 1: Verifiser Tunnel
```bash
curl -I https://ringtones-dedicated-mutual-scoring.trycloudflare.com
```

Forventet: `HTTP/2 200`

### Test 2: Test OAuth Login
1. Åpne: `https://ringtones-dedicated-mutual-scoring.trycloudflare.com/login`
2. Klikk "Logg inn med Google"
3. Verifiser at du blir redirectet tilbake uten feil

### Test 3: Sjekk Auth Callback
```bash
curl -I "https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback"
```

Forventet: Ikke 404 eller redirect loop

---

## 🚨 Vanlige Feil

### Feil: "redirect_uri_mismatch"
**Årsak:** Tunnel-URL mangler i Google Cloud Console  
**Løsning:** Legg til URL i Authorized redirect URIs (Steg 1.3)

### Feil: "Invalid request: redirect_uri is required"
**Årsak:** Supabase Site URL er feil  
**Løsning:** Oppdater Site URL i Supabase (Steg 3.2)

### Feil: "Authentication failed" etter callback
**Årsak:** CSP header blokkerer Supabase  
**Løsning:** Verifiser at CSP inkluderer Supabase-domener (allerede fikset ✅)

### Feil: "No session"
**Årsak:** Cookies blir ikke satt korrekt  
**Løsning:** Sjekk at cookie domain er satt riktig i auth handler

---

## 🔄 Ny Tunnel = Ny URL

**VIKTIG:** Cloudflare quick tunnel genererer ny URL ved hver restart!

### Automatisk Oppdatering
Bruk dette scriptet etter tunnel-start:

```bash
#!/bin/bash
# update-oauth-urls.sh

TUNNEL_URL=$(grep -o 'https://[^"]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | tail -1)
echo "New tunnel URL: $TUNNEL_URL"

# Oppdater .env.local
sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$TUNNEL_URL|" .env.local

echo ""
echo "⚠️  MANUELLE STEG NØDVENDIG:"
echo "1. Google Cloud Console: $TUNNEL_URL/auth/callback"
echo "2. GitHub OAuth: $TUNNEL_URL/api/auth/callback"
echo "3. Supabase Auth: $TUNNEL_URL"
```

### Permanent Løsning
For konsekvent URL, vurder:
1. **Cloudflare Tunnel med fast hostname** (krever Cloudflare-konto)
2. **ngrok med reservert domain** (betalt feature)
3. **Localtunnel med subdomain** (`--subdomain klarpakke-dev`)

---

## 📊 Verifisering etter Konfigurasjon

```bash
# 1. Sjekk at server kjører
curl -s https://ringtones-dedicated-mutual-scoring.trycloudflare.com/api/health | jq .

# 2. Sjekk auth endpoint
curl -I https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback

# 3. Test OAuth initiell request
curl -s "https://ringtones-dedicated-mutual-scoring.trycloudflare.com/api/auth/signin"
```

---

## ✅ Sjekkliste

- [ ] Google Cloud Console: Redirect URI lagt til
- [ ] GitHub OAuth: Callback URL oppdatert (hvis aktuelt)
- [ ] Supabase: Site URL = tunnel URL
- [ ] Supabase: Redirect URLs inkluderer tunnel
- [ ] .env.local: NEXT_PUBLIC_APP_URL = tunnel URL
- [ ] Test: Login fungerer via tunnel URL

---

## 📚 Referanser

- [Supabase Auth URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

**Sist oppdatert:** 2026-04-10  
**Tunnel:** `https://ringtones-dedicated-mutual-scoring.trycloudflare.com`
