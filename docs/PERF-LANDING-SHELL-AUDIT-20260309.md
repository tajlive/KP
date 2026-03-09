# Landing Shell Audit Report

**Date:** 2026-03-09  
**Auditor:** Performance Architect  
**Scope:** src/app/page.tsx, src/app/[locale]/layout.tsx, provider tree

---

## Executive Summary

Root landing page (`/`) currently functions as a **full app-shell** rather than a lightweight marketing shell. This is the primary cause of high LCP (6.2s) despite TTFB being fixed (110ms).

**Root Cause:** All providers and client components are loaded at the root level, blocking hero rendering with unnecessary hydration overhead.

---

## Current Provider Tree (Root Page)

```
RootPage (server)
└── html
    └── NextIntlClientProvider
        └── ClientSideProviders  ← chat widget, PWA, error handling
            └── ErrorBoundary
                └── AuthProvider  ← Supabase init, session check
                    └── OnboardingProvider  ← localStorage, auth-dependent
                        └── OnboardingFlow
                            └── ToastProvider
                                └── TradingModeProvider
                                    └── div.layout
                                        ├── Navigation  ← client, uses auth
                                        ├── main
                                        │   ├── LivePriceTicker  ← client
                                        │   ├── HeroSection  ← client + framer-motion
                                        │   ├── LottoCalculator  ← client
                                        │   ├── SocialProofSection
                                        │   ├── GamifiedLeaderboard  ← client
                                        │   ├── SafeBacktestWidget  ← client
                                        │   ├── ComparisonSection
                                        │   ├── PricingSection
                                        │   ├── FAQSection
                                        │   └── FinalCTASection
                                        ├── ConditionalFooter
                                        ├── Analytics
                                        └── SpeedInsights
```

---

## Component Classification

### 1. MUST Stay on Landing Root (Critical Path)

| Component | Reason | Risk if Removed |
|-----------|--------|-----------------|
| **NextIntlClientProvider** | i18n required for all text | Breaks all translations |
| **HeroSection** | Primary LCP element, value prop | No value proposition |
| **Navigation** | Required for site navigation | Cannot navigate |
| **OrganizationJsonLd** | SEO structured data | SEO impact |
| **ConditionalFooter** | Legal compliance | Missing legal links |

### 2. CAN Move Below Fold (Defer Loading)

| Component | Current Position | Impact on LCP | Action |
|-----------|-----------------|---------------|--------|
| **LivePriceTicker** | Above hero | **HIGH** - blocks rendering | Move below hero, lazy load |
| **LottoCalculator** | Below hero | Medium | Keep, but optimize |
| **SocialProofSection** | Below hero | Low | Keep position |
| **GamifiedLeaderboard** | Below fold | Low | Lazy load |
| **SafeBacktestWidget** | Below fold | Low | Lazy load |
| **ComparisonSection** | Below fold | None | Keep position |
| **PricingSection** | Below fold | None | Keep position |
| **FAQSection** | Below fold | None | Keep position |
| **FinalCTASection** | Bottom | None | Keep position |

### 3. MUST Lazy Load (Dynamic Import)

| Component | Size Impact | Reason |
|-----------|-------------|--------|
| **OnboardingFlow** | Medium | Only needed after auth, not for anon visitors |
| **ChatWidgetLoader** | Medium | Loaded by ClientSideProviders, 3s delay but still in bundle |
| **PWALoader** | Small | Only needed for installable experience |
| **Analytics** | Small | Non-critical, can defer |
| **SpeedInsights** | Small | Non-critical, can defer |

### 4. MUST Remove from Landing Route (App-Specific)

| Component | Current Cost | Why It Doesn't Belong | Mitigation |
|-----------|--------------|----------------------|------------|
| **AuthProvider** | **CRITICAL** - Initializes Supabase client, session check | Landing doesn't need auth state | Move to `/dashboard/*`, `/paper-trading/*` layouts |
| **OnboardingProvider** | **HIGH** - Depends on AuthProvider, localStorage | Only for logged-in users | Move to dashboard layout |
| **OnboardingFlow** | **HIGH** - Modal system | Only for logged-in users | Move to dashboard layout |
| **ToastProvider** | Medium - Sonner toaster | Can be loaded where needed | Keep minimal, or move to app areas |
| **TradingModeProvider** | Medium - Context + toast | Only needed for trading features | Move to `/paper-trading/*`, `/auto-trading/*` |
| **ClientSideProviders** | Medium - Error handling, chat, PWA | Error handling needed globally, chat/PWA deferrable | Split into essential vs deferrable |
| **ErrorBoundary** | Low | Keep for resilience | Can stay, low cost |

---

## Provider Analysis Detail

### AuthProvider - REMOVE from landing
```typescript
// Current: Initializes on EVERY page load
const supabase = createClient();  // Creates client immediately
const { data: { user } } = await supabase.auth.getUser();  // Network request
```

**Cost:**
- Supabase client initialization
- Session storage check
- Auth state listener setup
- Triggers hydration delay

**Decision:** Remove from landing. Only needed in `/dashboard`, `/paper-trading`, `/auto-trading`, `/innlogging`.

### OnboardingProvider - REMOVE from landing
```typescript
// Depends on AuthProvider
const { user, loading } = useAuth();
// Shows modal based on auth state + localStorage
```

**Cost:**
- localStorage reads on mount
- Conditional modal rendering
- Auth dependency chain

**Decision:** Remove from landing. Only show after login (dashboard layout).

### TradingModeProvider - REMOVE from landing
```typescript
// Only used for paper/live trading toggle
const [mode, setModeState] = useState<TradingMode>("paper");
// Shows toast on mode change
```

**Cost:**
- React context overhead
- Toast integration

**Decision:** Remove from landing. Only needed in trading features.

### ClientSideProviders - SPLIT
Current includes:
1. ErrorHandlerInit - **KEEP** (global error handling)
2. ChatWidgetLoader - **REMOVE** from landing (defer to dashboard)
3. PWALoader - **OPTIONAL** (can defer)

---

## Client Component Analysis

### All Landing Components Are Client Components

| Component | "use client"? | Dependencies | Weight |
|-----------|--------------|--------------|--------|
| HeroSection | ✅ | framer-motion, next/navigation | Heavy (animations) |
| LivePriceTicker | ✅ | WebSocket, real-time data | Heavy |
| LottoCalculator | ✅ | Forms, calculations | Medium |
| GamifiedLeaderback | ✅ | Charts, animations | Heavy |
| SafeBacktestWidget | ✅ | Charts, data | Heavy |
| Navigation | ✅ | Auth, TradingModeToggle | Medium |
| SocialProofSection | ❓ | Unknown | TBD |
| ComparisonSection | ❓ | Unknown | TBD |
| PricingSection | ❓ | Unknown | TBD |
| FAQSection | ❓ | Unknown | TBD |
| FinalCTASection | ❓ | Unknown | TBD |

**Problem:** Even simple components like HeroSection are client components due to framer-motion animations.

---

## Bundle Analysis

### Current Build Output
```
412K  chunks/2818-*.js  ← Main app bundle (likely includes providers)
288K  chunks/9159-*.js  ← Secondary large chunk
192K  chunks/5497-*.js  ← Third chunk
188K  chunks/framework-*.js  ← React/Next
172K  chunks/4bd1b696-*.js  ← Unknown large chunk
160K  chunks/main-*.js  ← Next.js runtime
```

**Total JS for landing:** ~1.2MB (based on previous analysis)

---

## Recommendations by Priority

### P0 - Critical (Do First)

1. **Remove AuthProvider from landing**
   - Impact: HIGH - Eliminates Supabase initialization on every landing visit
   - Effort: Medium - Need to refactor Navigation to not depend on auth

2. **Remove OnboardingProvider + OnboardingFlow from landing**
   - Impact: HIGH - Eliminates modal system for anon users
   - Effort: Low - Just move to dashboard layout

3. **Remove TradingModeProvider from landing**
   - Impact: Medium - Eliminates trading context for marketing page
   - Effort: Low - Move to trading layouts

### P1 - High Impact

4. **Split ClientSideProviders**
   - Keep ErrorHandlerInit globally
   - Defer ChatWidgetLoader, PWALoader to dashboard or lazy load

5. **Optimize HeroSection**
   - Remove framer-motion from critical path
   - Use CSS animations or reduced motion
   - Make server component if possible

6. **Move LivePriceTicker below fold**
   - Currently blocks hero rendering
   - Load after hero is visible

### P2 - Nice to Have

7. **Lazy load below-fold sections**
   - GamifiedLeaderboard
   - SafeBacktestWidget
   - FAQSection

8. **Font optimization**
   - Evaluate if both Fraunces and Lexend needed for landing

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Remove AuthProvider | **HIGH** | Ensure Navigation works without auth (show login/signup always) |
| Remove OnboardingProvider | Low | Only affects logged-in users, move to dashboard |
| Remove TradingModeProvider | Medium | Check if any landing component uses it |
| Move LivePriceTicker | Low | Visual change only |
| Split ClientSideProviders | Low | Error handling stays |

---

## Next Steps

### Phase 2: Remove App Providers
1. Create minimal marketing layout without auth/onboarding/trading providers
2. Refactor Navigation to work without auth (simpler version for landing)
3. Move all app providers to `/dashboard/*`, `/paper-trading/*` layouts

### Phase 3: Above-Fold Optimization
1. Move LivePriceTicker below hero
2. Consider server-component hero
3. Reduce/remove framer-motion from critical path

### Phase 4: Lazy Loading
1. Dynamic imports for below-fold sections
2. Skeleton placeholders

---

## Expected Impact

| Metric | Current | Target (After P0+P1) |
|--------|---------|---------------------|
| Initial JS | ~1.2MB | ~600KB (-50%) |
| Hydration Time | ~3s | ~1s (-67%) |
| LCP | 6.2s | <3.0s |
| TTI | ~5s | ~2.5s |

---

*Audit complete. Ready for Phase 2 implementation.*
