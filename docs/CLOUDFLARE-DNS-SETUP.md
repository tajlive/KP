# ☁️ Cloudflare DNS Setup Guide

Denne guiden hjelper deg med å konfigurere Cloudflare Pages + DNS riktig for klarpakke.no.

## 🔍 Nåværende Status

### ✅ Det som er på plass:
- Cloudflare nameservers: `haley.ns.cloudflare.com` + `zac.ns.cloudflare.com`
- CNAME records peker til `main.klarpakke.pages.dev`
- SSL/TLS satt til "Full (strict)"

### ⚠️ Det som må fikses:

#### 1. Fjern gamle NS-records fra Cloudflare DNS
I Cloudflare Dashboard → DNS → Records, fjern disse (hvis de finnes):
```
NS  klarpakke.no  ns1.hyp.net
NS  klarpakke.no  ns2.hyp.net  
NS  klarpakke.no  ns3.hyp.net
```

**Hvorfor:** Disse skaper "split-brain" DNS konflikter når Cloudflare allerede er autoritativ nameserver.

#### 2. Sett autoconfig til DNS only
Endre denne record fra "Proxied" til "DNS only":
```
CNAME  autoconfig  autoconfig.domeneshop.no  →  DNS only (grå sky)
```

## 🚀 Cloudflare Pages Oppsett

### Steg 1: Koble til GitHub-repoet
1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Klikk "Create a project"
3. Velg "Connect to Git"
4. Autoriser Cloudflare til å lese `klarpakke/klarpakke` repoet

### Steg 2: Konfigurer bygg-innstillinger
```
Framework preset: None
Build command: (tom)
Build output directory: /webflow-pages
```

**VIKTIG:** `/webflow-pages` mappen inneholder statiske HTML-filer og skal deployes som-is.

### Steg 3: Legg til Custom Domains
1. I Pages-prosjektet → Custom domains
2. Legg til: `klarpakke.no`
3. Legg til: `www.klarpakke.no`
4. Vent på SSL-provisjonering (tar 1-2 minutter)

## 📝 DNS Records som skal være i Cloudflare

### Krav:
| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| CNAME | @ (klarpakke.no) | main.klarpakke.pages.dev | Proxied (🟠) |
| CNAME | www | main.klarpakke.pages.dev | Proxied (🟠) |
| CNAME | api | swfyuwkptusceiouqlks.supabase.co | DNS only (⚪) |

### E-post (DNS only):
| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | @ | mail.domeneshop.net | 10 |
| MX | @ | mail2.domeneshop.net | 20 |
| MX | @ | mx.domeneshop.no | 10 |
| TXT | @ | v=spf1 include:_spf.domeneshop.no include:_spf.google.com ~all | - |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:dmarc@klarpakke.no; ... | - |

## 🔧 Feilsøking

### "Error 525: SSL Handshake Failed"
- Sjekk at SSL/TLS mode er satt til "Full (strict)"
- Sjekk at custom domain er lagt til i Pages

### "404 Not Found" fra Cloudflare
- Sjekk at `webflow-pages/index.html` finnes i repoet
- Sjekk at build output directory er satt til `/webflow-pages`

### "Too many redirects"
- Sjekk at CNAME for @ og www er "Proxied" (orange sky)
- Sjekk at det ikke er redirect loops i Page Rules

### DNS oppdateres ikke
```bash
# Sjekk hvilke nameservers som er aktive
dig NS klarpakke.no

# Sjekk om CNAME peker riktig
dig CNAME klarpakke.no
```

## ✅ Sjekkliste før go-live

- [ ] Cloudflare Pages prosjekt opprettet og koblet til GitHub
- [ ] Custom domains lagt til (klarpakke.no + www.klarpakke.no)
- [ ] SSL sertifikat provisionert
- [ ] Gamle NS-records (ns1/2/3.hyp.net) fjernet fra DNS
- [ ] E-post records satt til DNS only
- [ ] Testet at https://klarpakke.no fungerer
- [ ] Testet at https://www.klarpakke.no redirecter til non-www

## 📞 Neste steg

Etter DNS er konfigurert:
1. Push kode til main branch
2. GitHub Actions vil automatisk deploye til Cloudflare Pages
3. Sjekk deploy status i Cloudflare Dashboard → Pages
