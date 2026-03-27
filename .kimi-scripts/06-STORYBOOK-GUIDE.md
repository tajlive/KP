# Script 06: Storybook Setup for Klarpakke

## ✅ Status: Fullført

Storybook 8.x er nå satt opp for Klarpakke med full støtte for Next.js 15, TypeScript, Tailwind CSS v4 og Vite.

## Installerte pakker

```bash
npm install -D @storybook/react-vite@8.6.14 @storybook/addon-essentials@8.6.14 @storybook/addon-interactions@8.6.14 @storybook/test@8.6.14 storybook@8.6.14 vite@6
```

## Konfigurasjonsfiler

### `.storybook/main.ts`
- Vite builder (raskere enn webpack, bedre for Tailwind v4)
- TypeScript støtte
- Vite path alias for `@/` imports
- Automatisk prop-dokumentasjon

### `.storybook/preview.ts`
- Global CSS import (Tailwind v4 via globals.css)
- Viewport presets (mobile, tablet, desktop)
- Background presets (light, dark, brand)
- Autodocs støtte
- Locale konfigurasjon (no/en)

### `.storybook/preview-head.html`
- DM Sans font loading (Google Fonts)
- Instrument Serif font loading
- CSS variabler for font-familier

### `.storybook/mocks/` (for fremtidig bruk)
- `next-intl.ts` - Mock for useTranslations og useLocale
- `next-intl-server.ts` - Mock for getTranslations og getLocale
- `next-navigation.ts` - Mock for useRouter, usePathname, etc.

## Stories

### UI Components

#### `src/components/ui/Button.stories.tsx`
- **Primary** - Primærknapp (default)
- **Secondary** - Sekundærknapp
- **Ghost** - Gjennomsiktig knapp
- **Outline** - Kantet knapp
- **Danger** - Fare/varsel knapp
- **Success** - Suksess bekreftelse
- **Small** - Liten størrelse
- **Large** - Stor størrelse
- **Loading** - Laste-tilstand med spinner
- **Disabled** - Deaktivert tilstand
- **AllVariants** - Alle varianter i én visning
- **AllSizes** - Alle størrelser i én visning

### Landing Components

#### `src/components/landing/TrustStrip.stories.tsx`
- **Default** - Norsk versjon
- **English** - Engelsk versjon
- **MobileViewport** - Mobil visning (375px)
- **TabletViewport** - Tablet visning (768px)
- **WithDarkBackground** - Mørk bakgrunn

#### `src/components/landing/HeroSection.stories.tsx`
- **Default** - Norsk versjon
- **English** - Engelsk versjon
- **MobileViewport** - Mobil visning
- **TabletViewport** - Tablet visning
- **DesktopViewport** - Desktop visning (1440px)

## NPM Scripts

```bash
# Start Storybook development server på http://localhost:6006
npm run storybook

# Bygg statisk Storybook til storybook-static/
npm run storybook:build
```

## Bruk

### Starte Storybook

```bash
npm run storybook
```

Storybook starter på http://localhost:6006

### Lage nye stories

1. Opprett en `.stories.tsx` fil ved siden av komponenten:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Category/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // props her
  },
};
```

### Server Components i Storybook

Siden Storybook renderes på klienten, må server components wrappes. De eksisterende story-filene har client wrappers innebygd for:
- TrustStrip (bruker next-intl i produksjon)
- HeroSection (bruker next-intl/server i produksjon)

### Tailwind CSS v4

Storybook er konfigurert til å bruke Vite som håndterer Tailwind v4's nye `@import "tailwindcss"` syntax korrekt.

## Tekniske detaljer

### Vite vs Webpack

Vi bruker **Vite** i stedet for Webpack fordi:
- Raskere bygging og HMR (Hot Module Replacement)
- Bedre støtte for Tailwind CSS v4
- Mindre konfigurasjon
- Ingen webpack plugin-konflikter

### Path aliases

Vite konfigurasjonen mapper `@/` til `./src/` for enkel import av komponenter.

### TypeScript

Storybook bruker `react-docgen-typescript` for automatisk prop-deteksjon og dokumentasjon.

## Feilsøking

### Problem: "Cannot find module '@/*'"

Løsning: Sjekk at vite.config.js inneholder riktig path alias.

### Problem: Tailwind styles mangler

Løsning: Sjekk at `src/app/globals.css` importeres i `preview.ts`.

### Problem: Font laster ikke

Løsning: Sjekk at `preview-head.html` inneholder riktige Google Fonts URLer.

## Videre utvikling

### Planlagte forbedringer

- [ ] Legge til flere UI-komponenter (Card, Badge, Input, etc.)
- [ ] Legge til interaksjonstester med @storybook/addon-interactions
- [ ] Sette opp visuell regresjonstesting
- [ ] Legge til tema-switcher (light/dark mode)
- [ ] Dokumentere design tokens fra `kp-tokens.css`

## Ressurser

- [Storybook dokumentasjon](https://storybook.js.org/docs)
- [Storybook + Vite guide](https://storybook.js.org/docs/get-started/install)
- [Storybook + React guide](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Tailwind i Storybook](https://storybook.js.org/recipes/tailwindcss)
