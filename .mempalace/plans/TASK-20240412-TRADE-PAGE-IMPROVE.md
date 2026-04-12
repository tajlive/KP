# Task Plan: TASK-20240412-TRADE-PAGE-IMPROVE

**Status:** 🟡 PLANNING  
**Created:** 2024-04-12 18:15:00  
**Description:** Forbedre /no/dashboard/trade med loading states, error boundaries, refresh-knapp og mobil-optimalisering

## Detected Agents
klarpakke-ux-ui-agent + klarpakke-live-trading-trades-agent

## Plan (Genereres av Gemini/Antigravity)

### 1. Executive Summary
Forbedre brukeropplevelsen på `/no/dashboard/trade` siden ved å implementere:
- **Loading states** - Tydelig feedback ved data-henting
- **Error boundaries** - Graceful error handling uten å crashe hele siden
- **Refresh-knapp** - Manuel data-oppdatering uten page reload
- **Mobil-optimalisering** - Bedre UX på små skjermer

**Bakgrunn:** Trade-siden er kritisk for brukeropplevelsen. Nåværende implementasjon mangler tydelige loading states og error handling.

### 2. Arkitektur
**Teknisk tilnærming:**
- Bruke React Error Boundaries for isolert error handling
- Implementere SWR eller React Query for data fetching med caching
- Skeleton loaders for bedre perceived performance
- Optimistiske UI oppdateringer

**Kritiske filer:**
- `src/app/[locale]/(user)/dashboard/trade/page.tsx` - Hovedside
- `src/features/trading/` - Trading komponenter
- `src/components/ui/skeleton.tsx` - Eksisterende skeletons

### 3. Files to Create/Modify
- [ ] `src/components/error/ErrorBoundary.tsx` - NY: Reusable error boundary
- [ ] `src/components/error/TradingErrorFallback.tsx` - NY: Trade-spesifikk error UI
- [ ] `src/features/trading/TradePageClient.tsx` - NY: Client-komponent med state
- [ ] `src/features/trading/components/TradeLoadingState.tsx` - NY: Loading UI
- [ ] `src/features/trading/components/RefreshButton.tsx` - NY: Refresh knapp
- [ ] `src/app/[locale]/(user)/dashboard/trade/page.tsx` - MOD: Integrere forbedringer
- [ ] `src/app/[locale]/(user)/dashboard/trade/error.tsx` - NY: Error boundary for route
- [ ] `src/app/[locale]/(user)/dashboard/trade/loading.tsx` - NY: Loading UI for route

### 4. Implementation Steps

#### Steg 1: Lag Error Boundary komponent
```tsx
// src/components/error/ErrorBoundary.tsx
// Reusable error boundary med retry funksjonalitet
// - Fanger JavaScript errors
// - Viser fallback UI
// - Logger til Sentry
// - "Prøv igjen" knapp
```

#### Steg 2: Lag Trade-spesifikk Error Fallback
```tsx
// src/components/error/TradingErrorFallback.tsx
// Visuell feedback når trading data feiler
// - Ikon + melding
// - Retry knapp
// - Lenke til dashboard
```

#### Steg 3: Lag TradePageClient
```tsx
// src/features/trading/TradePageClient.tsx
// Client-komponent som håndterer:
// - Data fetching med SWR/React Query
// - Loading states
// - Error handling
// - Refresh logikk
```

#### Steg 4: Lag Loading State komponent
```tsx
// src/features/trading/components/TradeLoadingState.tsx
// Skeleton loader for trade-siden:
// - Chart placeholder
// - Order book placeholder
// - Form placeholder
// - Stats placeholder
```

#### Steg 5: Lag Refresh Button
```tsx
// src/features/trading/components/RefreshButton.tsx
// Knapp for manuell data-oppdatering:
// - Spinner mens data lastes
// - Sist oppdatert timestamp
// - Keyboard shortcut (R)
```

#### Steg 6: Oppdater trade page.tsx
```tsx
// src/app/[locale]/(user)/dashboard/trade/page.tsx
// - Wrapper med ErrorBoundary
// - Bruk TradePageClient
// - Legg til metadata
```

#### Steg 7: Lag route-level error.tsx
```tsx
// src/app/[locale]/(user)/dashboard/trade/error.tsx
// Next.js error boundary for hele route
```

#### Steg 8: Lag route-level loading.tsx
```tsx
// src/app/[locale]/(user)/dashboard/trade/loading.tsx
// Next.js loading UI for hele route
```

#### Steg 9: Mobil-optimalisering
```css
// Tailwind klasser for mobil:
// - Stack layout på små skjermer
// - Touch-vennlige knapper (min 44px)
// - Horisontal scroll for tabeller
// - Collapsible seksjoner
```

### 5. Testing Strategy
- [ ] Unit test for ErrorBoundary
- [ ] Unit test for RefreshButton
- [ ] E2E test for error scenario
- [ ] E2E test for refresh funksjonalitet
- [ ] Mobil responsivitet test
- [ ] Lighthouse performance sjekk

### 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Error boundary skjuler faktiske feil | Logg til Sentry før visning |
| For mange loading states = irriterende | Bruk skeletons kun ved initial load |
| Refresh-knapp misbrukes = rate limiting | Debounce kall, vis cooldown |
| Mobil UI blir for komprimert | Prioriter viktigste funksjoner |

### 7. Design Specs

#### Loading State
```
┌─────────────────────────────────────┐
│  [Skeleton Chart - 400px høy]      │
├─────────────────────────────────────┤
│  [Skeleton Stats - 4 kolonner]     │
├─────────────────────────────────────┤
│  [Skeleton Form]                   │
├─────────────────────────────────────┤
│  [Skeleton Order Book]             │
└─────────────────────────────────────┘
```

#### Error State
```
┌─────────────────────────────────────┐
│           ⚠️                        │
│    Kunne ikke laste trading data   │
│                                     │
│  [Prøv igjen]  [Tilbake]           │
└─────────────────────────────────────┘
```

#### Refresh Button
```
┌─────────────────┐
│  🔄 Oppdater    │  (viser spinner ved loading)
│  Sist: 14:32    │  (timestamp)
└─────────────────┘
```

### 8. Performance Mål
- Initial load: < 2 sekunder
- Skeleton til content: < 500ms
- Refresh: < 1 sekund
- Error recovery: < 3 sekunder

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 4-5 timer  
**Priority:** P1 (Direkte påvirker trading UX)  
**Next Action:** Kjør `npm run tell:kimi TASK-20240412-TRADE-PAGE-IMPROVE.md`
