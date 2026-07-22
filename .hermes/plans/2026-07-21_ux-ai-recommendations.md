# UX og AI-anbefalinger — Klarpakke

> **Status:** Lagret for senere — ikke påbegynt
> **Dato:** 2026-07-21

## UX — 5 konkrete forbedringer

### 1. Én onboarding-flyt
- Fjern dobbel onboarding (SpeedOnboarding + InteractiveWizard)
- Én flyt: 3 steg, < 60 sek
- Fil: `src/features/onboarding/`

### 2. Dashboard hierarki
- Vis "Trader kjører" øverst med P&L siden start
- Ikke be brukeren grave etter status
- Fil: `src/features/dashboard/DashboardPro.tsx`

### 3. Tomme states med CTA
- Dashboard uten data → "Start din første trade" CTA
- Erstatt "Laster..." med actionable empty state
- Fil: `src/app/[locale]/(user)/dashboard/DashboardClient.tsx`

### 4. Mobil "Legg til Hjem-skjerm"
- Vis PWA-install prompt ved første besøk på mobil
- Gratis alternativ til App Store ($99/år)
- Fil: `src/shared/ui/` eller ny komponent

### 5. Brukervennlige feilmeldinger
- "Binance 403" → "Priser oppdateres, prøv igjen"
- Aldri tekniske feil til brukere
- Fil: Diverse error boundary komponenter

## AI — 4 konkrete forbedringer

### 1. KlarBot forklaring
- Vis HVA boten gjør: "Analyserer BTC/USDT — venter på signal"
- Ikke bare "Trader kjører"
- Fil: `src/features/trading/`

### 2. AI-insights på dashboard
- Én kort tekst: "Markedet er bullish — din risiko er lav"
- Personalisert, ikke generisk
- Fil: `src/features/dashboard/AIInsightCard.tsx`

### 3. Risiko-simulering
- "Hvis du investerer 10 000 kr: beste +12%, verste -3%"
- Konkrete tall før bruker handler
- Fil: `src/features/trading/`

### 4. Smart-varsler
- "BTC steg 5% siden sist — vurder profitt"
- Proaktiv, ikke reaktiv
- Fil: `src/features/notifications/`

## Prioritert rekkefølge

1. Mobil "Legg til Hjem-skjerm" — 30 min, stor effekt
2. KlarBot "hva gjør den nå" — 1 time, øker tillit
3. Tomme states med CTA — 1 time, bedre konvertering
4. Én onboarding-flyt — 2 timer, mindre frafall
