# HERMES-SPEC: Hero-mockup på landingssiden (kan kjøres sammen med Bølge 1)

**Type:** Isolert komponent-endring, null risiko for Bølge 1-fikser · **Fil å endre:** `src/components/landing/HeroSection.tsx`

## Asset
```bash
mkdir -p public/images
cp design-audit/media/hero-mockup.png public/images/hero-trade-mockup.png
```
(539×976, 70 KB — next/image serverer webp automatisk.)

## Endring 1 — Desktop: høyre kolonne (i dag tom etter FIKS 2)
Erstatt innholdet i den høyre kolonnen (`hidden lg:flex justify-center`) med:

```tsx
<Image
  src="/images/hero-trade-mockup.png"
  alt="Klarpakkes trade-side: kjøp Bitcoin med lekepenger — ekte produktbilde"
  width={539}
  height={976}
  priority
  className="w-[320px] xl:w-[360px] h-auto animate-float"
/>
```
- `priority` fordi den er over folden på desktop (LCP-kandidat sammen med H1).
- `animate-float` finnes allerede (brukt på det gamle priskortet) — subtil sveve passer.

## Endring 2 — Mobil: under CTA-knappene (i dag ingen produkt-bevis)
Ny blokk i tekst-kolonnen, ETTER disclaimer-avsnittet:

```tsx
<div className="lg:hidden flex justify-center pt-2">
  <Image
    src="/images/hero-trade-mockup.png"
    alt="Klarpakkes trade-side: kjøp Bitcoin med lekepenger — ekte produktbilde"
    width={539}
    height={976}
    loading="lazy"
    className="w-[220px] h-auto"
  />
</div>
```
- `lazy` her — den ligger under CTA-folden på 375px og skal ikke forsinke LCP.
- Vurder `min-h-screen` → behold, innholdet får bare lov å vokse under (hero er allerede flex items-center; bytt til items-start på mobil eller la seksjonen scrolle — velg det peneste, verifiser visuelt).

## Regler
- **Merk ALDRI bildet som «live»** — det er et ekte skjermbilde fra 28.07 (BTC 608 093 kr). Det er illustrasjon av produktet, ikke sanntidsdata. Fornyes ved redesign.
- Ikke endre H1/subtitle/CTA-er — kun denne komponenten.

## Verifisering
- `/no` desktop 1440: mockup synlig i høyre kolonne, ingen layout-sprekk.
- `/no` mobil 375: mockup under CTA, siden scroller pent, LCP ikke synkbart tregere (test med DevTools throttling).
- `npm run lint` + `npx vitest run`.
- Deploy via `scripts/deploy.sh` sammen med Bølge 1 (samme go fra Tom).
