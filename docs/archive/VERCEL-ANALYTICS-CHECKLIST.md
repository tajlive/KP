# Vercel Analytics & Speed Insights – Checklist

**Dato:** 2026-02-21  
**Prosjekt:** klarpakke  
**Dashboard:** https://vercel.com/tom-jensens-projects/klarpakke  

---

## 1. Kode-status (verifisert i repo)

### Pakker installert
- [x] `@vercel/analytics` er installert (^1.6.1)
- [x] `@vercel/speed-insights` er installert (^1.3.1)

### Kode i layout.tsx
- [x] `import { Analytics } from "@vercel/analytics/react"`
- [x] `import { SpeedInsights } from "@vercel/speed-insights/next"`
- [x] `<Analytics />` er plassert før `</body>`
- [x] `<SpeedInsights />` er plassert før `</body>`

**Bekreftet i:** `src/app/[locale]/layout.tsx`

---

## 2. Vercel Dashboard (manuell verifikasjon påkrevd)

### Analytics
- [ ] **Aktivert i dashboardet**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/analytics
  - Klikk "Enable Analytics" hvis ikke allerede aktivert
  
- [ ] **Data for Production**
  - Verifiser at page views vises
  - Sjekk at unike besøkende registreres
  - Sjekk top pages (/no, /en, /no/kurs, etc.)

- [ ] **Data for Preview**
  - Sjekk at Preview deployments også genererer data
  - Verifiser at URL-mønster stemmer

### Speed Insights
- [ ] **Aktivert i dashboardet**
  - Gå til: https://vercel.com/tom-jensens-projects/klarpakke/speed-insights
  - Klikk "Enable Speed Insights" hvis ikke allerede aktivert

- [ ] **Core Web Vitals data vises**
  - FCP (First Contentful Paint)
  - LCP (Largest Contentful Paint)
  - CLS (Cumulative Layout Shift)
  - TTFB (Time to First Byte)
  - INP (Interaction to Next Paint)

- [ ] **Score er akseptabel**
  - Mål: LCP < 2.5s, CLS < 0.1, FCP < 1.8s
  - Godkjent: LCP < 4s, CLS < 0.25

---

## 3. Manuell verifikasjon (trinn-for-trinn)

### Steg 1: Verifiser at Analytics er aktivert

1. Gå til https://vercel.com/tom-jensens-projects/klarpakke
2. Klikk på **Analytics** i toppmenyen
3. Hvis du ser "Enable Analytics":
   - Klikk på knappen
   - Velg "Next.js" som framework
   - Bekreft at `<Analytics />` allerede er i koden (vi har gjort dette)
4. Hvis du ser data (graf, tall): ✅ Analytics er aktivert

### Steg 2: Verifiser at Speed Insights er aktivert

1. Gå til https://vercel.com/tom-jensens-projects/klarpakke
2. Klikk på **Speed Insights** i toppmenyen
3. Hvis du ser "Enable Speed Insights":
   - Klikk på knappen
   - Bekreft at `<SpeedInsights />` allerede er i koden
4. Hvis du ser Core Web Vitals grafer: ✅ Speed Insights er aktivert

### Steg 3: Generer test-trafikk

1. Åpne https://www.klarpakke.no i nettleseren
2. Naviger til flere sider:
   - /no
   - /en
   - /no/kurs
   - /no/dashboard
3. Vent 5-10 minutter
4. Sjekk Analytics-dashboardet – skal vise nye page views

### Steg 4: Verifiser Preview-data

1. Lag en PR mot main (hvis du har en åpen)
2. Vent på at Vercel Preview deployes
3. Åpne Preview-URLen
4. Klikk rundt på siden
5. Sjekk om Preview-data dukker opp i Analytics

---

## 4. Feilsøking

### Problem: "Analytics not configured"
**Løsning:**
1. Sjekk at `@vercel/analytics` er i package.json ✅
2. Sjekk at `<Analytics />` er i layout.tsx ✅
3. Kjør `npm install` for å sikre at pakken er installert
4. Redeploy til Vercel

### Problem: "No data received yet"
**Løsning:**
- Analytics tar 5-10 minutter på å vise data
- Sjekk at du har trafikk på siden
- Verifiser at Vercel-prosjektet er riktig koblet til domene

### Problem: Speed Insights viser ikke data
**Løsning:**
- Speed Insights krever mer trafikk enn Analytics (minst 10-20 besøk)
- Data samles kun fra støttede nettlesere (Chrome, Edge, Firefox)
- Kan ta opptil 24 timer før første data vises

### Problem: Data vises kun for Preview, ikke Production
**Løsning:**
- Sjekk at Production-deployment faktisk er aktiv
- Verifiser at domenet (www.klarpakke.no) peker til Vercel
- **VIKTIG:** Hvis du bruker Cloud Run, vil ikke Vercel Analytics se trafikken!
  - Løsning: Analytics SDK sender data uavhengig av hosting, men du må verifisere at det fungerer

---

## 5. Vite miljøvariabler (hvis nødvendig)

Noen ganger krever Analytics miljøvariabler. Sjekk om disse er satt:

```bash
# I Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=<auto-genereres>
```

**Merk:** Denne genereres automatisk av Vercel når Analytics aktiveres.

---

## 6. Oppsummering

| Komponent | Kode | Dashboard | Data |
|-----------|:----:|:---------:|:----:|
| Analytics | ✅ | ⬜ Manuell | ⬜ Manuell |
| Speed Insights | ✅ | ⬜ Manuell | ⬜ Manuell |

**Neste steg:** Følg "Manuell verifikasjon" seksjonen over for å fullføre oppsettet.

---

*Sist oppdatert: 2026-02-21*
