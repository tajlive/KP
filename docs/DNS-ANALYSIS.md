# DNS Analyse for klarpakke.no

## ✅ Hva som er riktig konfigurert

| Record | Status | Kommentar |
|--------|--------|-----------|
| `www.klarpakke.no` → `cdn.webflow.com` | ✅ | Webflow CNAME er korrekt |
| `_webflow.www.klarpakke.no` TXT | ✅ | Webflow verifisering på plass |
| MX-records (Google) | ✅ | E-post håndteres av Google Workspace |
| SPF/DMARC | ✅ | E-post sikkerhet på plass |

## ⚠️ Hva som bør endres

### 1. Root domain (klarpakke.no)

**Nåværende:** `198.202.211.1` (Domeneshop webhosting)

**Bør være:** Webflow IP-adresser for at root domain skal fungere med Webflow:
- `75.2.70.75`
- `99.83.190.102`

**Eller:** Hvis dere vil beholde Domeneshop webhosting for root:
- La A-record være som den er
- Men da må dere sette opp redirect fra klarpakke.no → www.klarpakke.no

### 2. API subdomain (Mangler!)

**Må legge til:**
```
api.klarpakke.no → CNAME → swfyuwkptusceiouqlks.supabase.co
```

Dette gir dere:
- `https://api.klarpakke.no/functions/v1/get-entitlements`
- Istedenfor: `https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-entitlements`

## 📝 Anbefalte endringer

### Alternativ A: Full Webflow (anbefalt)

Endre A-record for root:

| Host | Type | Verdi |
|------|------|-------|
| `klarpakke.no` | A | `75.2.70.75` |
| `klarpakke.no` | A | `99.83.190.102` |
| `api.klarpakke.no` | CNAME | `swfyuwkptusceiouqlks.supabase.co` |

### Alternativ B: Behold Domeneshop for root

Behold nåværende A-record, men legg til:

| Host | Type | Verdi |
|------|------|-------|
| `api.klarpakke.no` | CNAME | `swfyuwkptusceiouqlks.supabase.co` |

Og sett opp redirect i Domeneshop:
- `klarpakke.no` → `www.klarpakke.no`

## 🔧 Hvordan endre i Domeneshop

1. Logg inn på domeneshop.no
2. Gå til "DNS" for klarpakke.no
3. Endre/slett A-record for klarpakke.no
4. Legg til ny A-record med Webflow IP
5. Legg til CNAME for api.klarpakke.no

## ✅ Sjekkliste

- [ ] A-record endret til Webflow IPs (valgfritt, men anbefalt)
- [ ] CNAME lagt til for api.klarpakke.no
- [ ] Webflow site publishing aktivert med custom domain
- [ ] Test at www.klarpakke.no fungerer
- [ ] Test at klarpakke.no fungerer (etter endring)
- [ ] Test at api.klarpakke.no fungerer

---

*Analyse utført: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
