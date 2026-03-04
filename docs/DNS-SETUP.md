# DNS Setup for klarpakke.no

Dette dokumentet beskriver hvordan du konfigurerer DNS for Klarpakke.

## 📋 DNS Records

### For Webflow (hovedside)

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 75.2.70.75 | 3600 |
| A | @ | 99.83.190.102 | 3600 |
| CNAME | www | proxy-ssl.webflow.com | 3600 |

**Webflow Site ID:** `69743573d50cc16bbbe54344`

### For Supabase (API)

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | api | swfyuwkptusceiouqlks.supabase.co | 3600 |

### E-post (hvis dere bruker e-post)

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | @ | mx1.forwardemail.net | 10 |
| MX | @ | mx2.forwardemail.net | 20 |
| TXT | @ | forward-email=kontakt@klarpakke.no | - |

---

## 🔧 Hvordan konfigurere

### Alternativ 1: Via domeneregistrar (f.eks. one.com, domeneshop.no)

1. Logg inn på domeneregistrar
2. Finn DNS-administrasjon
3. Legg til records ovenfor
4. Vent 1-24 timer for propagering

### Alternativ 2: Via Cloudflare (anbefalt)

1. Registrer konto på cloudflare.com
2. Legg til domenet `klarpakke.no`
3. Kopier Cloudflare nameservere til domeneregistrar
4. Konfigurer DNS records i Cloudflare

**Fordeler med Cloudflare:**
- Gratis SSL/HTTPS
- DDoS beskyttelse
- Raskere DNS
- Analytics

---

## ✅ Verifikasjon

Etter konfigurasjon, test med:

```bash
# Sjekk A-record
nslookup klarpakke.no

# Sjekk CNAME
nslookup www.klarpakke.no

# Sjekk API subdomain
nslookup api.klarpakke.no
```

---

## 🔒 SSL/HTTPS

### Webflow
- SSL håndteres automatisk av Webflow
- Aktiver i Webflow: Site Settings → Publishing → SSL

### Supabase
- SSL er alltid på for Supabase projects
- Ingen ekstra konfigurasjon nødvendig

---

## 📧 E-post forwarding

For å motta e-post på `kontakt@klarpakke.no`:

### Alternativ: Forward Email (gratis)

1. Gå til forwardemail.net
2. Registrer med domenet
3. Konfigurer MX records (se ovenfor)
4. Sett forwarding til din e-post

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
