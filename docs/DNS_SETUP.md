# DNS & Epost Oppsett for Klarpakke.no

**Status:** ✅ Konfigurert og aktiv  
**Dato:** 1. februar 2026  
**Oppsett:** Cloudflare DNS + Domeneshop Epost

---

## 📋 Overordnet Arkitektur

```
klarpakke.no
├── DNS: Cloudflare (navnetjenere)
├── Web: Webflow (www.klarpakke.no)
└── Epost: Domeneshop (kontakt@klarpakke.no)
```

---

## ✅ Cloudflare DNS Konfigurasjon

### Navnetjenere (hos Domeneshop)
```
haley.ns.cloudflare.com
zac.ns.cloudflare.com
```

### DNS-poster i Cloudflare

| Type | Name | Content | Priority | Proxy |
|------|------|---------|----------|-------|
| **A** | `@` | `75.2.70.75` | - | 🟡 DNS only |
| **A** | `@` | `99.83.190.102` | - | 🟡 DNS only |
| **CNAME** | `www` | `klarpakke-c65071.webflow.io` | - | 🟡 DNS only |
| **MX** | `@` | `mail.domeneshop.net` | 10 | 🟡 DNS only |
| **MX** | `@` | `mail2.domeneshop.net` | 20 | 🟡 DNS only |
| **TXT** | `@` | `v=spf1 include:_spf.domeneshop.no ~all` | - | 🟡 DNS only |

### Viktige Merknader

⚠️ **ALLTID "DNS only" (grå sky)** på alle poster:
- Oransje sky (proxied) fungerer IKKE med Webflow custom domains
- Oransje sky (proxied) fungerer IKKE med MX-poster for epost

---

## 📧 Epost Konfigurasjon (Domeneshop)

**Leverandør:** Domeneshop AS  
**Type:** E-post hosting (beholdt fra original oppsett)

### MX-poster (peker tilbake til Domeneshop)
```
Priority 10: mail.domeneshop.net
Priority 20: mail2.domeneshop.net
```

### SPF Record
```
v=spf1 include:_spf.domeneshop.no ~all
```

### Epostadresser
| Adresse | Formål | Status |
|---------|--------|--------|
| `kontakt@klarpakke.no` | Generell kontakt | ✅ Aktiv |
| `tom@klarpakke.no` | Personlig | ✅ Aktiv |
| `support@klarpakke.no` | Kundestøtte | ⏳ Planlagt |

---

## 🌐 Webflow Konfigurasjon

### Custom Domains (Site Settings → Publishing)
```
Primary: klarpakke.no
Redirect: www.klarpakke.no → klarpakke.no
```

### SSL/TLS
**Provider:** Cloudflare (Full/Strict)  
**Status:** ✅ Auto-aktiv

---

## 🔄 DNS Propagering

**Tid fra endring til global synlighet:**
- Lokalt (Norge): ~5-15 minutter
- Europa: ~30-60 minutter  
- Globalt: ~4-24 timer

**Status siste endring:**  
⏳ Pågår (oppdatert 1. feb 2026, 15:34 CET)

---

## 🧪 Testing

### Test Web
```bash
# Sjekk at Webflow laster
curl -I https://www.klarpakke.no
# Forventet: HTTP/2 200

# Sjekk at root redirect fungerer  
curl -I https://klarpakke.no
# Forventet: HTTP/2 301 → www.klarpakke.no
```

### Test Epost
```bash
# Sjekk MX-poster
nslookup -type=mx klarpakke.no
# Forventet: mail.domeneshop.net, mail2.domeneshop.net

# Test SPF
nslookup -type=txt klarpakke.no
# Forventet: v=spf1 include:_spf.domeneshop.no ~all
```

---

## 🛠️ Feilsøking

### Problem: "This site can't be reached"
**Sjekk:**
1. Er A-postene riktige? (75.2.70.75 og 99.83.190.102)
2. Er CNAME for www riktig?
3. Har det gått 4+ timer? (DNS propagation)

### Problem: Epost kommer ikke frem
**Sjekk:**
1. Er MX-postene i Cloudflare (ikke bare Domeneshop)?
2. Har du SPF-record?
3. Er proxy-status DNS only (grå sky)?
4. Test med: https://mxtoolbox.com/SuperTool.aspx

### Problem: SSL-feil i nettleser
**Sjekk:**
1. Er SSL/TLS satt til "Full (strict)" i Cloudflare?
2. Har Webflow SSL aktivert? (Site Settings → SSL)

---

## 📚 Ressurser

- **Cloudflare DNS Docs:** https://developers.cloudflare.com/dns/
- **Domeneshop Epost:** https://www.domeneshop.no/epost/
- **Webflow Custom Domains:** https://university.webflow.com/lesson/custom-domains
- **MX Toolbox:** https://mxtoolbox.com/

---

## 📝 Endringslogg

| Dato | Endring | Utført av |
|------|---------|-----------|
| 2026-02-01 | Lagt til A-poster for root | Cloudflare |
| 2026-02-01 | Lagt til CNAME for www → Webflow | Cloudflare |
| 2026-02-01 | Lagt til MX-poster for Domeneshop epost | Cloudflare |
| 2026-02-01 | Lagt til SPF record | Cloudflare |
| 2026-02-01 | Konfigurert custom domain i Webflow | Webflow |

---

*Sist oppdatert: 1. februar 2026*  
*Ansvarlig: Tom Bomann*
