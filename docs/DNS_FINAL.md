# DNS Konfigurasjon - ENDELIG (Error 1014 Fikset)

**Dato:** 1. februar 2026  
**Status:** ✅ Produksjonsklar  
**Endring:** CNAME erstattet med A-poster (Error 1014 fix)

---

## 🔧 Problem: Error 1014

**Årsak:** CNAME `www` → `klarpakke-c65071.webflow.io` er ikke tillatt når begge domenene er på Cloudflare (Cross-User Banned).

**Løsning:** Bruk A-poster i stedet for CNAME.

---

## ✅ ENDELIG DNS-KONFIGURASJON

### Cloudflare DNS-poster

| Type | Name | Content | Priority | Proxy | Formål |
|------|------|---------|----------|-------|--------|
| **A** | `@` | `75.2.70.75` | - | 🟡 DNS only | Root domene |
| **A** | `@` | `99.83.190.102` | - | 🟡 DNS only | Root backup |
| **A** | `www` | `75.2.70.75` | - | 🟡 DNS only | WWW subdomene |
| **A** | `www` | `99.83.190.102` | - | 🟡 DNS only | WWW backup |
| **MX** | `@` | `mail.domeneshop.net` | 10 | 🟡 DNS only | Epost primary |
| **MX** | `@` | `mail2.domeneshop.net` | 20 | 🟡 DNS only | Epost secondary |
| **TXT** | `@` | `v=spf1 include:_spf.domeneshop.no ~all` | - | 🟡 DNS only | SPF record |

### Viktige merknader

⚠️ **INGEN CNAME-poster:**  
Bruk kun A-poster for å unngå Error 1014 (CNAME Cross-User Banned).

⚠️ **ALLTID "DNS only" (grå sky):**  
Oransje sky (proxied) fungerer IKKE med Webflow custom domains eller MX-poster.

---

## 🌐 LIVE URL-ER (etter propagering)

| URL | Forventet resultat |
|-----|-------------------|
| `https://klarpakke.no` | Webflow-side ✅ |
| `https://www.klarpakke.no` | Webflow-side ✅ |
| `kontakt@klarpakke.no` | Domeneshop epost ✅ |

---

## ⏱️ DNS Propagering

**Tid til synlig:**
- Norge: 5-15 minutter
- Europa: 30-60 minutter
- Globalt: Opptil 24 timer

**Test kommando:**
```bash
nslookup klarpakke.no
nslookup www.klarpakke.no
```

Forventet svar: `75.2.70.75` og `99.83.190.102`

---

## 🎯 Neste steg

1. Vent 5-15 minutter
2. Konfigurer custom domain i Webflow (hvis ikke gjort)
3. Test: `https://klarpakke.no/login`
4. Test: `https://www.klarpakke.no/login`

---

*Oppdatert etter Error 1014 fix - 1. februar 2026*
