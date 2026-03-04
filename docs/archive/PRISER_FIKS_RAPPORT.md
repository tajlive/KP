# /no/priser Feilfiks Rapport
**Dato:** 24. februar 2026

---

## P0: Kritiske feil (FULLFØRT)

### FEIL 1: Priskonflikt mellom homepage og /no/priser ✅
**Problem:** Homepage viste 3 planer (BETA-TILBUD/STARTER/PRO) mens /no/priser viste 5 planer (Student/Bachelor/Master/PhD/Professor).

**Løsning:** `PricingSection.tsx` bruker nå samme `TIERS`-datakilde som /no/priser:
- Viser alle 5 planer: Student, Bachelor, Master, PhD, Professor
- Samme priser: 0 kr, 249 kr/mnd, 499 kr/mnd, 999 kr/mnd, 1999 kr/mnd
- Samme features fra TIERS

**Fil endret:** `src/components/landing/PricingSection.tsx`

---

### FEIL 2: Sidetittel "Studieprogram" samsvarer ikke med meny/URL ✅
**Problem:** Sidetittel var "Studieprogram | Klarpakke", men URL er /no/priser og meny viser "Priser".

**Løsning:** Endret metadata til:
```typescript
export async function generateMetadata() {
  return {
    title: 'Priser', // Gir "Priser | Klarpakke" med root layout template
  };
}
```

**Fil endret:** `src/app/[locale]/priser/page.tsx`

---

## P1: Alvorlige feil (FULLFØRT)

### FEIL 3: Doble Vipps-knapper — fragmentert UX ✅
**Problem:** Hver plan hadde to knapper: primærknapp + separat "🟠 Betal med Vipps".

**Løsning:** 
- Fjernet emoji-knappen "🟠 Betal med Vipps"
- Én primærknapp "Velg plan" åpner betalingsdialog
- Dialog gir valg mellom Stripe (kort) og Vipps
- Bruker `@radix-ui/react-dialog` via eksisterende Dialog-komponent

**Fil endret:** `src/components/checkout/CheckoutButton.tsx`

---

### FEIL 4: "MEST POPULÆR" promoterer ulike planer ✅
**Problem:** Homepage viste Bachelor som highlight, /no/priser viste Master som "MEST POPULÆR".

**Løsning:** Begge sider bruker nå `tier.popular` fra `TIERS`:
- `TIERS.master.popular: true` (eneste plan markert som populær)
- Konsistent på tvers av alle sider

**Filer påvirket:** 
- `src/components/landing/PricingSection.tsx`
- `src/app/[locale]/priser/page.tsx`

---

### FEIL 5: KLT tokens er fullstendig uforklart ✅
**Problem:** KLT tokens vist uten forklaring av hva det er.

**Løsning:** Lagt til info-boks på /no/priser:
```
💎 Hva er KLT tokens?
KLT tokens er Klarpakkes belønningsvaluta — bruk dem til å låse opp 
eksklusivt innhold, prioritert support og spesielle funksjoner. 
Du får KLT tokens ved registrering (500) og månedlig med alle 
betalte planer (opptil 10 000/mnd).
```

**Fil endret:** `src/app/[locale]/priser/page.tsx`

---

## Betalingsintegrasjon Verifisert

### Stripe ✅
- **API-endepunkt:** `src/app/api/stripe/checkout/route.ts`
- **Price IDs:** Hentes fra miljøvariabler (STRIPE_PRICE_BACHELOR, etc.)
- **Success URL:** `/{locale}/checkout/success?session_id={ID}&tier={slug}`
- **Cancel URL:** `/{locale}/priser`

### Vipps ✅
- **API-endepunkt:** `src/app/api/vipps/initiate/route.ts`
- **Env-variabler:** VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, VIPPS_SUBSCRIPTION_KEY, VIPPS_MERCHANT_SERIAL_NUMBER
- **Base URL:** Hentes fra VIPPS_BASE_URL
- **Return URL:** `/{locale}/checkout/success?tier={slug}&provider=vipps`

---

## P2: Ytterligere forbedringer

### MVA-tekst forbedret ✅
- Tidligere: Liten grå tekst under kortene
- Nå: Tydelig tekst med fet stil: "Prisene er i norske kroner og inkluderer MVA (25%)."

### Betalingsmetoder vises tydelig ✅
- Stripe og Vipps navn vist under prisene
- Forberedt for offisielle logoer (se avsnitt under)

---

## Logoer - Status

**Merk:** Offisielle logoer (Vipps, Stripe, Google, Microsoft, LinkedIn) krever:
1. Nedlasting fra respektive brand guidelines
2. Lagring i `/public/logos/`-mappen
3. SVG-format foretrukket

**Foreløpig løsning:**
- Vipps: Oransje tekst med fargekode `#FF5B24` (Vipps-oransje)
- Stripe: Lilla tekst med fargekode `#635BFF` (Stripe-lilla)
- Klarpakke-logo: Bruker eksisterende `/logo.png` og `/logo.svg`

**Anbefaling:** Last ned offisielle logo-SVGer fra:
- Vipps: https://www.vipps.no/developer/mer-om-vipps/design/
- Stripe: https://stripe.com/newsroom/brand
- Google: https://developers.google.com/identity/branding-guidelines
- Microsoft: https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-add-branding-in-azure-ad-apps
- LinkedIn: https://brand.linkedin.com/

---

## Verifisering

```bash
# TypeScript
npm run type-check
# ✅ 0 feil

# Bygg
npm run build
# ✅ Suksess - alle sider bygget
```

---

## Testing Anbefalt

1. **Priskonsistens:** Sjekk at /no og /no/priser viser samme 5 planer
2. **Betalingsdialog:** Klikk "Velg plan" på Master → verifiser at dialog åpner seg
3. **Stripe test:** Velg "Betal med kort" → test med 4242 4242 4242 4242
4. **Vipps test:** Velg "Betal med Vipps" → verifiser redirect til Vipps
5. **Sidetittel:** Sjekk at /no/priser har tittel "Priser | Klarpakke"
6. **KLT info:** Verifiser at KLT-forklaring vises på /no/priser
