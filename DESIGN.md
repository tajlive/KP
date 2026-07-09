---
version: alpha
name: Klarpakke JokerTrade
description: AI-drevet trading med "Joker"-modus — dark glassmorphism, norsk, mobil-først
colors:
  bg-primary: "#0A0B0D"
  bg-secondary: "#15171B"
  bg-card: "#1A1D26"
  border: "#2A2D35"
  accent: "#3B82F6"
  accent-hover: "#2563EB"
  accent-glow: "#60A5FA"
  profit-green: "#10B981"
  profit-green-bg: "#064E3B"
  loss-red: "#EF4444"
  loss-red-bg: "#7F1D1D"
  joker-gold: "#F59E0B"
  joker-gold-bg: "#78350F"
  joker-gold-glow: "#FCD34D"
  text-primary: "#F9FAFB"
  text-secondary: "#9CA3AF"
  text-muted: "#6B7280"
  white: "#FFFFFF"
typography:
  h1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  h2:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
    textTransform: uppercase
  numbers:
    fontFamily: JetBrains Mono
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "'tnum'"
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
components:
  card-glass:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: 14px
  button-joker:
    backgroundColor: "{colors.joker-gold}"
    textColor: "{colors.bg-primary}"
    rounded: "{rounded.full}"
    padding: 16px
  stat-card:
    backgroundColor: "{colors.bg-secondary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 16px
  stat-card-profit:
    backgroundColor: "{colors.profit-green-bg}"
    textColor: "{colors.profit-green}"
    rounded: "{rounded.md}"
    padding: 16px
  stat-card-loss:
    backgroundColor: "{colors.loss-red-bg}"
    textColor: "{colors.loss-red}"
    rounded: "{rounded.md}"
    padding: 16px
  insight-box:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.joker-gold-glow}"
    rounded: "{rounded.md}"
    padding: 16px
---
# JokerTrade — AI-drevet smart trading

## Overview

JokerTrade er Klarpakkes AI-optimaliserte trading-opplevelse. Hermes analyserer 
Reddit, kryptonyheter og markeds-sentiment hver 2. time — finner DET beste 
trade-signalet — og SmartTrader v3 utfører det automatisk.

Brukeren ser en enkel dashbord-side: status på JokerTrade (aktiv/pauset), 
siste AI-analyse, åpne posisjoner, realisert P&L, og en stor Joker-knapp.

## Colors

- **bg-primary (#0A0B0D):** Hovedbakgrunn — mørkest mulig, nesten svart
- **bg-card (#1A1D26):** Card/glassmorphism-flater — mørk blågrå
- **accent (#3B82F6):** Primære interaksjoner, knapper, lenker
- **joker-gold (#F59E0B):** JokerTrade-spesifikk — den store handlingsknappen
- **profit-green (#10B981):** P&L, fortjeneste
- **loss-red (#EF4444):** Tap, stop-loss trigget

## Typography

Inter for alt UI. JetBrains Mono kun for tall (P&L, priser, prosenter) — bruk 
`fontFeature: 'tnum'` for tabular numbers.

## Layout

- **Mobil-først.** Alle touch targets minimum 48px.
- Cards har `backdrop-blur-xl` og `bg-opacity-80` for glassmorphism.
- Mellomrom: `gap-4` (16px) på mobil, `gap-6` (24px) på desktop.
- Maks bredde: `max-w-6xl` (1152px) sentrert.

## Components

### Joker-knapp (button-joker)
Den STØRSTE knappen på siden. Pulserende glød-effekt (CSS animation). Tekst: 
"🎭 JOKER — Finn beste trade". Trykk → AI analyserer og viser resultat.

### Card-glass
Alle datakort bruker glassmorphism: `bg-[#1A1D26]/80 backdrop-blur-xl border 
border-[#2A2D35]`.

### Stat-card
Viser P&L, ROI, antall handler. Venstre-justert tall (JetBrains Mono) med 
fargekoding (grønn/rød).

### AI Insight-box
Blå gradient-bakgrunn. Viser siste AI-analyse: "🧠 AI sier: LONG BTC — 
Sentiment bullish (72%), RSI=42, Reddit trender 'BTC ETF'".

## Do's and Don'ts

- ✅ Bruk JetBrains Mono for ALLE tall (P&L, pris, prosent)
- ✅ Alltid vis stop-loss og take-profit på åpne posisjoner
- ✅ Joker-knapp skal ha animation (pulse glow)
- ✅ Vis "Sist oppdatert: 2 min siden" på AI-innsikt
- ❌ Ikke vis mer enn 3 samtidige posisjoner
- ❌ Ikke bruk rød for noe annet enn tap
- ❌ Ikke la noen knapper være under 48px høyde
