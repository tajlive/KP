# Perplexity Pro Research: Mobile Trading UX 2026

**Dato:** 2026-04-23  
**Kilde:** Perplexity Sonar Reasoning Pro  
**Agent:** KIMI k2.6 (research coordinator)  
**Tema:** Ledende mobil trading UX patterns — Robinhood, Coinbase, Revolut

---

## 🔑 Nøkkelfunn

### 1. Haptic — Vi mangler iOS-spesifikk støtte
- **Best practice:** UIImpactFeedbackGenerator (iOS) + Vibration API (Android)
- **Vår status:** Kun `navigator.vibrate` — fungerer ikke på iOS Safari
- **Action:** Legg til iOS webkit-deteksjon i `useHaptic`

### 2. Pull-to-Refresh — Ikke implementert
- **Best practice:** 80px threshold, scrollTop-sjekk, framer-motion spinner
- **Vår status:** Mangler helt
- **Action:** `usePullToRefresh` hook + `PullToRefresh` wrapper

### 3. Bottom Sheet — Snap points mangler
- **Best practice:** 3 snap levels (quote/entry/review) + drag handle
- **Vår status:** Har height-prop, men ikke snap points for progressive disclosure
- **Action:** Utvide `MobileBottomSheet` med snapPoints for order flow

### 4. Portfolio Card — Day range indicator mangler
- **Best practice:** Day low/high bar med current price indicator
- **Vår status:** Har sparkline, men ikke range bar
- **Action:** Utvide `MobileTradingCard` med day range

### 5. PWA Touch Optimization — CSS mangler
- **Best practice:** `touch-action: manipulation`, `overscroll-behavior: contain`
- **Vår status:** Ikke globalt satt
- **Action:** Legge til i global CSS / layout

### 6. One-Tap Trading — Ikke implementert
- **Best practice:** Market order med instant feedback + toast
- **Vår status:** Kun buy/sell knapper i kort
- **Action:** `OneTapTrade` komponent med optimistic update

### 7. Zustand for Bottom Sheet State — Ikke implementert
- **Best practice:** Cross-component state med Zustand
- **Vår status:** Lokal React state
- **Action:** `useOrderFlowStore` (hvis Zustand er installert)

---

## 📊 Sammenligning: Vår implementasjon vs Best Practice

| Feature | Robinhood | Coinbase | Revolut | Klarpakke (nå) | Klarpakke (mål) |
|---------|-----------|----------|---------|---------------|-----------------|
| Bottom Sheet | Snap points 3 levels | Drag handle | Smooth scroll | ✅ Basic | ✅ Snap points |
| Swipe Actions | Left=sell, Right=buy | Horizontal stack | Left=actions | ✅ Framer Motion | ✅ + haptic |
| Haptics | Light interaction | Medium success | Pattern-based | ⚠️ Android only | ✅ iOS+Android |
| Portfolio Card | Price+chart | Holdings+price | Simple | ✅ Sparkline | ✅ + range |
| Pull-to-Refresh | Standard | Integrated | Standard | ❌ Mangler | ✅ 80px threshold |
| One-Tap Trading | Market only | Confirm toast | Quick preset | ❌ Mangler | ✅ + toast |
| PWA Gestures | Native feel | Native feel | Native feel | ⚠️ Partial | ✅ Full CSS |

---

## 🎯 Prioritert action-liste (basert på impact/effort)

1. **P0:** `usePullToRefresh` — høy impact, medium effort
2. **P0:** iOS haptic i `useHaptic` — høy impact, lav effort
3. **P1:** Day range indicator i `MobileTradingCard` — medium impact, lav effort
4. **P1:** PWA touch CSS — medium impact, lav effort
5. **P2:** Bottom sheet snap points — medium impact, medium effort
6. **P2:** One-tap trading — høy impact, medium effort
7. **P3:** Zustand store — lav impact (nå), medium effort

---

## 💡 Innsikt som overrasket oss

- **Haptic patterns:** Success skal være `[20, 30, 20]` (pulse), ikke `[10, 50, 10]` som vi har
- **Swipe threshold:** 30–50px er standard (vi bruker 80px — kan føles tung)
- **Touch target:** 48px minimum (vi har dette ✅)
- **Scroll containment:** `overscroll-behavior: contain` er KRITISK for bottom sheets
- **Network resilience:** Retry med exponential backoff for one-tap trading

---

## Neste steg

Implementere P0-items via coder-agent. Se plan: `.mempalace/plans/MOBILE-MODERNIZATION-2026-04-23.md`
