# Antigravity Post-Deploy Prompt - Verifisering & Fiks

## 🎯 Oppdrag
Verifiser produksjonsdeployet og fiks eventuelle gjenværende feil.

## 🔍 Status
- ✅ Deployet til: https://www.klarpakke.no
- ✅ i18n feil fikset (coursePreview, threeSteps)
- ⚠️ Mulig hydration error #418 fortsatt aktiv
- ⚠️ Mulig 404 på /dashboard/trading

## 📋 Sjekkliste - Kjør i nettleser

### 1. Åpne Chrome DevTools
Gå til https://www.klarpakke.no/no og åpne DevTools (F12)

### 2. Sjekk Console for feil
```javascript
// Filtrer etter "MISSING" - skal vise 0 treff
// Filtrer etter "hydration" eller "418" - noter om det finnes
// Filtrer etter "404" - sjekk for /dashboard/trading
```

**Forventet:**
- ✅ Ingen "MISSING_MESSAGE" feil
- ❓ Mulig: React hydration error #418
- ❓ Mulig: 404 på /dashboard/trading

### 3. Test Kritisk Funksjonalitet

#### 3.1 Landing Page
- [ ] Last https://www.klarpakke.no/no
- [ ] Sjekk at "Kom i gang på 4 enkle steg" vises (threeSteps)
- [ ] Sjekk at "Kom i gang på under én time" vises (coursePreview)
- [ ] Console skal ikke ha i18n feil

#### 3.2 Login Page  
- [ ] Klikk "Logg inn"
- [ ] Sjekk at login-side laster
- [ ] Sjekk at Google/Microsoft knapper vises

#### 3.3 Dashboard (hvis logget inn)
- [ ] Sjekk at /no/dashboard laster
- [ ] Sjekk console for hydration errors
- [ ] Test refresh av siden - skal ikke logge ut

### 4. Hvis Hydration Error #418 Finnes

Hvis du ser denne feilen i console:
```
Minified React error #418; visit https://react.dev/errors/418
```

#### Fiks: Legg til suppressHydrationWarning
Sjekk disse filene og legg til `suppressHydrationWarning` der det mangler:

**Fil: src/features/landing/ThreeSteps.tsx**
```tsx
// Legg til på container element:
<div suppressHydrationWarning>
```

**Fil: src/features/landing/CoursePreview.tsx**  
```tsx
// Legg til på container element:
<section suppressHydrationWarning>
```

**Fil: src/features/landing/DemoWidget.tsx (hvis finnes)**
```tsx
// Legg til på container:
<div suppressHydrationWarning>
```

### 5. Hvis 404 på /dashboard/trading

Sjekk om navigation fortsatt peker til gammel rute:

**Fil: src/shared/navigation/BottomTabs.tsx**
```tsx
// Sjekk at href er /dashboard/trade (ikke /dashboard/trading)
```

**Fil: src/lib/navigation/config.ts**
```tsx
// Sjekk at MOBILE_BOTTOM_TABS bruker /dashboard/trade
```

### 6. Commit & Deploy Fiks

Hvis du gjorde endringer:
```bash
cd ~/klarpakke
git add -A
git commit -m "fix: hydration errors og routing etter deploy"
npx vercel --prod --yes
```

## 📊 Rapportering

**Når du er ferdig, rapporter:**
1. Fant du hydration error #418? (Ja/Nei)
2. Fant du 404 på /dashboard/trading? (Ja/Nei)  
3. Fungerte login/dashboard? (Ja/Nei)
4. Gjorde du noen endringer? (Hvilke)
5. Ny deploy URL (hvis deployet)

## 🆘 Hvis Stuck

Hvis du ikke finner feilen eller er usikker:
1. Ta skjermbilde av console errors
2. Noter hvilken fil/komponent som trigger feilen
3. Rapporter tilbake - jeg hjelper deg

---

**Full plan:** `.mempalace/plans/TASK-20240412-DEPLOY-PROD.md`
