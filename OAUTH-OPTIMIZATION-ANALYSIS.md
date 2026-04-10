# OAuth & Infrastruktur Optimalisering - Analyse for Klarpakke

**Dato:** 2026-04-10  
**Analysert av:** Kimi CLI med web-research  
**Status:** 🔍 Diagnostisk rapport

---

## 📊 NÅVÆRENDE KONFIGURASJON (Basert på tilgjengelig informasjon)

### Domener & DNS
| Komponent | Verdi | Status |
|-----------|-------|--------|
| **Produksjonsdomene** | www.klarpakke.no | ✅ Aktiv |
| **Supabase prosjekt** | vuxbjlykgmzskxbclquf.supabase.co | ✅ Aktiv |
| **Vercel deployment** | klarpakke-universitet.vercel.app (antatt) | ✅ Aktiv |
| **Cloudflare tunnel** | ringtones-dedicated-mutual-scoring.trycloudflare.com | 🟡 Midlertidig |

### OAuth Konfigurasjon
| Komponent | Konfigurasjon | Status |
|-----------|---------------|--------|
| **Google OAuth Client** | Web application type | ✅ Antatt satt opp |
| **Redirect URIs** | https://www.klarpakke.no/auth/callback | ✅ Sannsynlig |
| **Localhost** | http://localhost:3000/auth/callback | ✅ Vanligvis satt opp |
| **Supabase Callback** | https://[project].supabase.co/auth/v1/callback | ✅ Standard |

---

## ⚠️ IDENTIFISERTE POTENSIELLE PROBLEMER

### 1. OAuth Redirect URI Mismatch (Høy prioritet)

**Mulig problem:** 
Hvis du bruker Cloudflare-tunnel (trycloudflare.com) for testing, må denne URL-en også legges til i:
- Google Cloud Console → Authorized Redirect URIs
- Supabase Auth → URL Configuration

**Sjekk:**
```
Nødvendige redirect URIs:
✓ https://www.klarpakke.no/auth/callback (produksjon)
✓ http://localhost:3000/auth/callback (lokal utvikling)
? https://ringtones-xxx.trycloudflare.com/auth/callback (midlertidig tunnel)
```

**Løsning:**
1. Gå til https://console.cloud.google.com/apis/credentials
2. Velg OAuth 2.0 Client ID
3. Legg til: `https://ringtones-xxx.trycloudflare.com/auth/callback`
4. Samme i Supabase: Authentication → URL Configuration

---

### 2. Supabase Custom Domain (Middels prioritet)

**Problem:** Brukere ser "Sign in to continue to vuxbjlykgmzskxbclquf.supabase.co" under Google login

**Brukeropplevelse:** 
- Brukere kjenner ikke til Supabase
- Ser mistenkelig ut (phishing-fare)
- Google OAuth verification kan feile

**Løsning:** Sett opp custom domain
```
Nåværende: vuxbjlykgmzskxbclquf.supabase.co
Anbefalt: auth.klarpakke.no eller api.klarpakke.no
```

**Steg:**
1. Supabase Dashboard → Settings → Custom Domains
2. Krever betalt plan (Pro/Enterprise)
3. Oppsett: https://supabase.com/docs/guides/platform/custom-domains

---

### 3. Vercel Region Konfigurasjon (Høy prioritet)

**Problem:** Supabase DB er i Frankfurt (eu-central-1), men Vercel Functions kan kjøre i Washington DC (iad1)

**Konsekvens:** 
- Økt latency (500ms+ per request)
- Langsommere API-respons
- Dårlig brukeropplevelse

**Diagnostisering:**
```bash
# Sjekk nåværende region i Vercel
curl -I https://www.klarpakke.no | grep x-vercel-id
```

**Løsning:**
1. Vercel Dashboard → Project Settings → Functions
2. Sett region til: `fra1` (Frankfurt) eller `arn1` (Stockholm)
3. Nærmest Supabase DB location

**Alternativt i vercel.json:**
```json
{
  "regions": ["fra1"]
}
```

---

### 4. Cloudflare + Vercel Konfigurasjon (Middels prioritet)

**Spørsmål:** Bruker du Cloudflare proxy (orange cloud) foran Vercel?

**Hvis JA:**
- Vercel anbefaler IKKE dette
- Kan forårsake problemer med Bot Protection
- Økt latency
- Cache-konflikter

**Anbefalt oppsett:**
```
Cloudflare DNS → DNS only (grå sky) → Vercel
IKKE: Cloudflare DNS → Proxied (oransje sky) → Vercel
```

**Hvis du trenger Cloudflare funksjoner:**
- Bruk Cloudflare DNS med "DNS only" modus
- Eller flytt DNS til Vercel (anbefales)

---

### 5. Caching & Headers Optimalisering (Lav prioritet)

**Nåværende status:** Ukjent

**Anbefalte forbedringer i next.config.mjs:**
```javascript
async headers() {
  return [
    {
      // Static assets - long cache
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
      ]
    },
    {
      // HTML pages - no cache (for dynamic auth state)
      source: '/((?!api|_next|static|favicon).*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
      ]
    },
    {
      // API routes - no cache for auth
      source: '/api/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
      ]
    }
  ]
}
```

---

### 6. Domeneshop Konfigurasjon (Middels prioritet)

**Status:** Ukjent - må sjekkes

**Typisk oppsett for Vercel:**
```
Type: A
Navn: @
Verdi: 76.76.21.21

Type: CNAME  
Navn: www
Verdi: cname.vercel-dns.com
```

**Hvis du bruker Cloudflare:**
- Nameservers peker til Cloudflare
- DNS records i Cloudflare
- IKKE proxied (DNS only)

---

## 🎯 ANBEFALTE TILTAK (Prioritert)

### Umiddelbart (P0 - Kritisk)
1. ✅ **Verifiser OAuth fungerer med tunnel**
   - Test: https://ringtones-xxx.trycloudflare.com/login
   - Sjekk at redirect URI er lagt til i Google Cloud Console
   - Se etter "redirect_uri_mismatch" feil i URL

2. ✅ **Sjekk Vercel region**
   - Verifiser at Functions kjører i Europa (nær Supabase)
   - Endre hvis nødvendig

### Kort sikt (P1 - Viktig)
3. 🔄 **Sett opp Supabase Custom Domain**
   - Plan: Oppgrader til Pro for custom domain
   - Domain: auth.klarpakke.no
   - Fordel: Bedre brukeropplevelse, Google verification

4. 🔄 **Optimaliser caching headers**
   - Implementer anbefalte headers i next.config.mjs
   - Test med curl -I

### Lang sikt (P2 - Forbedring)
5. 💡 **Vurder DNS-flytting**
   - Alternativ A: Flytt til Vercel DNS (best for preview deployments)
   - Alternativ B: Hold Cloudflare men bruk DNS-only modus

6. 💡 **Implementer multi-layer caching**
   - Edge CDN (Vercel) → Redis (Supabase) → Database
   - For tunge API-kall

---

## 🔍 DIAGNOSTISKE KOMMANDOER

Kjør disse for å verifisere konfigurasjon:

```bash
# Sjekk DNS-oppsett
dig www.klarpakke.no +short
dig klarpakke.no +short

# Sjekk Vercel cache headers
curl -I https://www.klarpakke.no

# Sjekk Supabase auth endpoint
curl -I https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/authorize

# Sjekk Cloudflare DNS (hvis aktuelt)
dig klarpakke.no NS +short
```

---

## 📋 SJEKKLISTE FOR GOOGLE CLOUD CONSOLE

```
✅ OAuth 2.0 Client ID opprettet (Web application type)
✅ Client ID og Secret kopiert til Supabase
✅ Authorized JavaScript origins:
   - https://www.klarpakke.no
   - https://klarpakke.no
   - http://localhost:3000 (for dev)
   
✅ Authorized Redirect URIs:
   - https://www.klarpakke.no/auth/callback
   - https://klarpakke.no/auth/callback
   - http://localhost:3000/auth/callback
   - https://[project].supabase.co/auth/v1/callback
   
? Privacy Policy URL satt (kreves for verification)
? Terms of Service URL satt (kreves for verification)
? App logo lastet opp (kreves for verification)
```

---

## 📋 SJEKKLISTE FOR SUPABASE

```
✅ Google Provider aktivert
✅ Client ID konfigurert
✅ Client Secret konfigurert
✅ Redirect URL satt

✅ Site URL Configuration:
   - Site URL: https://www.klarpakke.no
   - Additional Redirect URLs:
     * https://www.klarpakke.no/auth/callback
     * https://klarpakke.no/auth/callback
     
? Custom Domain konfigurert (auth.klarpakke.no)
? PKCE aktivert (anbefales)
```

---

## 📋 SJEKKLISTE FOR VERCEL

```
✅ Prosjekt koblet til Git-repo
✅ Environment variables satt:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   
? Region satt til Europa (fra1/arn1)
? Build-kommando optimalisert
? Cache headers konfigurert
```

---

## 🆘 FEILSØKING

### Vanlige OAuth-feil:

**"Error 400: redirect_uri_mismatch"**
→ URI i Google Cloud Console matcher ikke request
→ Løsning: Kopier eksakt URI fra feilmelding og legg til

**"Error 403: access_denied"**
→ Bruker avviste tilgang
→ Normalt, ikke en konfigurasjonsfeil

**"Error 401: invalid_client"**
→ Feil Client ID i Supabase
→ Løsning: Kopier på nytt fra Google Cloud Console

**"No user found" etter OAuth**
→ Database trigger for opprettelse av brukerprofil feiler
→ Sjekk Supabase Logs → Auth

---

## 📚 RESSURSER

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Edge Cache Docs](https://vercel.com/docs/edge-cache)
- [Google OAuth 2.0 Troubleshooting](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)
- Cloudflare + Vercel: Se MemPalace "dns-cloudflare-setup"

---

**Rapport generert:** 2026-04-10  
**Neste gjennomgang:** Anbefales etter implementering av tiltak
