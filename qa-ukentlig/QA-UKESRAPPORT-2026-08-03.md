# QA-Ukesrapport — klarpakke.no

**Dato:** 2026-08-03  
**Utført av:** Automatisk QA-sjekk (curl + Python)  
**Miljø:** Produksjon (https://klarpakke.no)  

---

## Oppsummering

| Metrikk | Verdi |
|---------|-------|
| Totalt antall sjekker | 14 |
| OK | 10 |
| Avvik | 4 |
| **Status** | ⚠️ **KRITISK** |

**KRITISK** fordi `/no/api/health` returnerer HTML (ikke API health-respons) **OG** mer enn 2 sider feiler (3 redirects peker feil).

---

## Sider (HTTP-status + innhold)

| Side | Status | Forventet | Faktisk | Tittel | Innhold-OK | Kommentar |
|------|--------|-----------|---------|--------|------------|-----------|
| `/no` | 200 | 200 | 200 | "Klarpakke — AI-trading med lekepenger \| Klarpakke" | ✅ | Fant "100 000 kr i lekepenger", "Lær", "Priser", "Om oss" |
| `/no/priser` | 200 | 200 | 200 | "Priser \| Klarpakke" | ✅ | "Priser" funnet |
| `/no/om-oss` | 200 | 200 | 200 | "Om Klarpakke \| Klarpakke" | ✅ | "Om Klarpakke" funnet |
| `/no/kurs` | 200 | 200 | 200 | "Lær krypto steg for steg - Klarpakke Akademi \| Klarpakke" | ✅ | — |
| `/no/hjelp` | 200 | 200 | 200 | "Hjelp og support \| Klarpakke" | ✅ | — |
| `/no/kontakt` | 200 | 200 | 200 | "Kontakt oss \| Klarpakke" | ✅ | — |
| `/no/bots` | 200 | 200 | 200 | "Logg inn \| Klarpakke" | ✅ | Krever innlogging — forventet at tittel er "Logg inn" |
| `/no/kalkulator` | 200 | 200 | 200 | "Kalkulator \| Klarpakke \| Klarpakke" | ✅ | Tittel har duplisert "\| Klarpakke" |
| `/no/api/health` | 200 | 200 | 200 | — | ❌ | **Returnerer HTML-side, ikke API health-respons** |
| `/en` | 200 | 200 | 200 | "Klarpakke — AI trading with play money \| Klarpakke" | ✅ | — |

## Dashboard (uten innlogging)

| Side | Forventet | Faktisk | Kommentar |
|------|-----------|---------|-----------|
| `/no/dashboard` | 307 | 301 | Redirecter til `https://www.klarpakke.no/no/dashboard` (status 301, ikke 307) |

## Redirects

| Fra | Forventet | Faktisk | Kommentar |
|-----|-----------|---------|-----------|
| `/no/pricing` | 301/308 → `/no/priser` | 301 → `https://www.klarpakke.no/no/pricing` | **FEIL:** Redirecter til seg selv med `www`, ikke til `/no/priser` |
| `/no/learn` | 301/308 → `/no/kurs` | 301 → `https://www.klarpakke.no/no/learn` | **FEIL:** Redirecter til seg selv med `www`, ikke til `/no/kurs` |
| `/no/about` | 301/308 → `/no/om-oss` | 301 → `https://www.klarpakke.no/no/about` | **FEIL:** Redirecter til seg selv med `www`, ikke til `/no/om-oss` |

---

## Titler (i18n-nøkkelsjekk)

| Side | Tittel | Inneholder i18n-nøkkel? |
|------|--------|------------------------|
| `/no` | Klarpakke — AI-trading med lekepenger \| Klarpakke | ✅ Nei |
| `/no/priser` | Priser \| Klarpakke | ✅ Nei |
| `/no/om-oss` | Om Klarpakke \| Klarpakke | ✅ Nei |
| `/no/kurs` | Lær krypto steg for steg - Klarpakke Akademi \| Klarpakke | ✅ Nei |
| `/no/hjelp` | Hjelp og support \| Klarpakke | ✅ Nei |
| `/no/kontakt` | Kontakt oss \| Klarpakke | ✅ Nei |
| `/no/bots` | Logg inn \| Klarpakke | ✅ Nei |
| `/no/kalkulator` | Kalkulator \| Klarpakke \| Klarpakke | ✅ Nei |
| `/en` | Klarpakke — AI trading with play money \| Klarpakke | ✅ Nei |

**Resultat:** Ingen sider har rå i18n-nøkler i `<title>`.

---

## Engelske ord i norsk navigasjon

| Side | Sjekk | Resultat |
|------|-------|----------|
| `/no` | "Learn" / "Pricing" / "About" i kildekoden | ⚠️ "Learn" og "Pricing" funnet i JSON-data (ikke nødvendigvis synlig i UI). "About" ikke funnet. |
| `/no` | "Lær" / "Priser" / "Om oss" synlig | ✅ Ja, alle tre norske ordene er tilstede |

**Merk:** De engelske ordene "Learn" og "Pricing" finnes i Next.js JSON-data (i18n-konfigurasjon) i HTML-kildekoden. De er sannsynligvis **ikke synlige** for sluttbrukeren, men bør ryddes for å unngå forvirring og SEO-problemer.

---

## Avviksoversikt (4 stk)

1. **`/no/api/health` returnerer HTML, ikke API-respons**  
   Forventet: JSON health-check (f.eks. `{"status":"ok"}`).  
   Faktisk: Full Next.js HTML-side. Dette er **KRITISK** for overvåkning.

2. **`/no/pricing` redirecter feil**  
   Forventet: 301/308 → `/no/priser`.  
   Faktisk: 301 → `https://www.klarpakke.no/no/pricing` (peker til seg selv).

3. **`/no/learn` redirecter feil**  
   Forventet: 301/308 → `/no/kurs`.  
   Faktisk: 301 → `https://www.klarpakke.no/no/learn` (peker til seg selv).

4. **`/no/about` redirecter feil**  
   Forventet: 301/308 → `/no/om-oss`.  
   Faktisk: 301 → `https://www.klarpakke.no/no/about` (peker til seg selv).

---

## Anbefalinger

| # | Tiltak | Prioritet |
|---|--------|-----------|
| 1 | Fiks `/no/api/health` til å returnere JSON health-status, ikke HTML | **KRITISK** |
| 2 | Konfigurer redirects for `/no/pricing`, `/no/learn`, `/no/about` til å peke på riktige norske sider | **KRITISK** |
| 3 | Vurder om `/no/dashboard` skal gi 307 (som forventet) i stedet for 301 | Medium |
| 4 | Rydd i i18n-JSON så engelske nøkler ikke havner i norsk HTML-kildekode | Lav |
| 5 | Fiks duplisert "\| Klarpakke" i tittel på `/no/kalkulator` | Lav |

---

*Rapport generert automatisk 2026-08-03 08:17 CEST*
