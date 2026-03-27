# Script 11: Dark Mode System

## Oversikt
Full dark mode-implementasjon for Klarpakke med next-themes og Tailwind CSS v4.

## Installasjon

```bash
npm install next-themes
```

> **Merk:** Package er allerede installert i package.json (^0.4.6)

## Filer Opprettet/Endret

### 1. Theme Provider
**Fil:** `src/components/theme/ThemeProvider.tsx`

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Konfigurasjon:**
- `attribute="class"` - Bruker CSS-klasser for theming
- `defaultTheme="system"` - Respekterer systeminnstillinger som default
- `enableSystem={true}` - Aktiverer system theme detection
- `disableTransitionOnChange={false}` - Smooth transitions mellom themes

### 2. Theme Toggle Komponent
**Fil:** `src/components/theme/ThemeToggle.tsx`

**Funksjoner:**
- Dropdown-meny med 3 valg: Lyst, Mørkt, System
- Segmented control variant for mer kompakt visning
- Icon-only toggle for plassbesparende bruk
- Hydration-safe (unngår mismatch med mounted-check)
- `aria-label` for tilgjengelighet

**Bruk:**
```tsx
import { ThemeToggle, ThemeToggleIcon } from "@/components/theme";

// Full dropdown
<ThemeToggle />

// Segmented control
<ThemeToggle variant="segmented" />

// Icon only (toggles mellom light/dark)
<ThemeToggleIcon />
```

### 3. CSS-variabler og Dark Mode Styles
**Fil:** `src/app/globals.css`

**CSS Custom Properties:**
```css
:root {
  /* Light mode */
  --kp-bg-primary: #ffffff;
  --kp-bg-secondary: #f7f8fa;
  --kp-text-primary: #1a1d26;
  --kp-text-secondary: #5e6478;
  --kp-border: #e2e5ec;
  /* ... etc */
}

.dark {
  /* Dark mode */
  --kp-bg-primary: #0a0b0d;
  --kp-bg-secondary: #111218;
  --kp-text-primary: #f1f5f9;
  --kp-text-secondary: #94a3b8;
  --kp-border: #2a2d3a;
  /* ... etc */
}
```

**Smooth Transitions:**
```css
@media (prefers-reduced-motion: no-preference) {
  *, *::before, *::after {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }
}
```

### 4. Layout Integrasjon

#### Hovedlayout (`src/app/[locale]/layout.tsx`)
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange={false}
>
  {/* App content */}
</ThemeProvider>
```

#### Dashboard Layout (`src/app/[locale]/dashboard/DashboardClientLayout.tsx`)
ThemeProvider er også lagt til i dashboard-layout for konsistent theming.

### 5. Komponenter Oppdatert med Dark Mode

#### Navigation
- `src/components/navigation/TopNav.tsx` - ThemeToggle lagt til i header
- `src/components/landing/LandingNavigation.tsx` - ThemeToggle lagt til

#### Landingsside
- `src/components/landing/TrustStrip.tsx` - Full dark mode-støtte
  - `bg-white` → `dark:bg-slate-950`
  - `text-slate-900` → `dark:text-white`
  - `border-slate-100` → `dark:border-slate-800`

- `src/components/landing/Features.tsx` - Allerede mørk tema (bg-[#050510])
- `src/components/landing/FAQSection.tsx` - Allerede dark mode-klasser
- `src/components/landing/Footer.tsx` - Allerede mørk tema (bg-[#1A1D26])

#### Dashboard
- `src/components/dashboard/GetStartedCard.tsx` - Allerede dark mode-støtte
- `src/components/dashboard/DashboardClientLayout.tsx` - ThemeProvider lagt til

### 6. Tailwind Config
**Fil:** `tailwind.config.mjs`

Ingen endringer nødvendig - Tailwind v4 støtter `dark:` prefix ut av boksen med CSS-first approach.

## Key Design Decisions

### 1. CSS Custom Properties vs Tailwind Classes
- **Begge deler brukes:** CSS-variabler for globale theming-verdier, Tailwind `dark:` for komponent-spesifikke tilpasninger
- **Fordel:** Enkel å overstyre, konsistent på tvers av komponenter

### 2. FOUC Prevention
- `suppressHydrationWarning` på `<html>` og `<body>`
- ThemeProvider håndterer initial theme uten flash
- System preference detection på server-side via viewport meta

### 3. Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4. LocalStorage Persistence
- next-themes håndterer dette automatisk
- Theme lagres i localStorage når bruker eksplisitt velger
- System preference brukes på første besøk

## Bruk av Dark Mode Klasser

### Bakgrunn
```tsx
// Landing (light default)
<section className="bg-white dark:bg-slate-950">

// Cards
<div className="bg-white dark:bg-slate-900">

// Inputs
<input className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
```

### Tekst
```tsx
<h1 className="text-slate-900 dark:text-white">
<p className="text-slate-600 dark:text-slate-400">
<span className="text-slate-500 dark:text-slate-500">
```

### Grenser
```tsx
<div className="border-slate-100 dark:border-slate-800">
<div className="border-slate-200 dark:border-slate-700">
```

### Verktøyklasser (CSS-variabler)
```tsx
// Bruk CSS custom properties for semantisk farging
<body className="bg-kp-primary text-kp-primary">
<div className="bg-kp-card border-kp">
```

## Testing

### Manuell Testing
1. Last siden i light mode
2. Bytt til dark mode via toggle
3. Verifiser smooth transition
4. Sjekk alle sider: landing, dashboard, auth
5. Sjekk med system preference
6. Reload og verifiser persistence

### Automatisert Testing
```bash
# Bygg prosjektet
npm run build

# Sjekk for TypeScript-feil
npm run type-check

# Kjør lint
npm run lint
```

## Tilgjengelighet (a11y)

- ✅ `aria-label` på theme toggle
- ✅ `aria-pressed` på segmented control
- ✅ `aria-expanded` på dropdown
- ✅ Respecterer `prefers-reduced-motion`
- ✅ Kontrastforhold opprettholdt i begge themes

## Kommende Forbedringer

- [ ] Fler komponenter med full dark mode-støtte
- [ ] Theme-farger i Storybook
- [ ] E2E-tester for theme switching
- [ ] Theme preference sync på tvers av enheter (hvis bruker er logget inn)

## Ressurser

- [next-themes dokumentasjon](https://github.com/pacocoursey/next-themes)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
