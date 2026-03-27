# Script 07: E2E Tests for Klarpakke

## Overview

Dette scriptet implementerer en robust E2E test suite med fokus på:
- **Accessibility (a11y) testing** med axe-core
- **Kritiske brukerflyter** (signup, login, paper trading)
- **Responsive testing** (mobile, tablet, desktop)
- **Performance testing** (Core Web Vitals)

## Files Created/Modified

### New Test Files

| File | Description |
|------|-------------|
| `e2e/accessibility/landing-a11y.spec.ts` | WCAG 2.1/2.2 compliance tests med axe-core |
| `e2e/critical/user-flows.spec.ts` | Kritiske brukerflyter og scenarioer |
| `e2e/responsive/mobile-landing.spec.ts` | Responsive design tester |
| `e2e/performance/lighthouse.spec.ts` | Core Web Vitals målinger |

### New Fixture Files

| File | Description |
|------|-------------|
| `e2e/fixtures/test-users.ts` | Testbrukere for alle tiers og scenarioer |
| `e2e/helpers/auth.ts` | Login/logout helper funksjoner |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/landing/HeroPrimaryActions.tsx` | Lagt til `data-testid` attributter |
| `src/components/landing/TrustStrip.tsx` | Lagt til `data-testid="trust-strip"` |
| `src/components/landing/DemoWidget.tsx` | Lagt til `data-testid` for buy/sell buttons |
| `src/components/theme/ThemeToggle.tsx` | Lagt til `data-testid="theme-toggle"` |
| `playwright.config.ts` | Nye test projects for a11y, user-flows, responsive, performance |

## Test Coverage

### 1. Accessibility Tests (`e2e/accessibility/landing-a11y.spec.ts`)

```bash
npm run test:a11y
# eller
npx playwright test --project=a11y-chromium
```

**Tester inkludert:**
- ✅ axe-core scan (0 critical violations)
- ✅ Heading struktur (h1, hierarki)
- ✅ Keyboard navigation (Tab gjennom alle elementer)
- ✅ Focus management (synlighet, rekkefølge)
- ✅ Screen reader landmarks (nav, main, footer)
- ✅ Alt text på bilder
- ✅ Link text (beskrivende)
- ✅ Form labels
- ✅ Mobile viewport a11y

### 2. User Flows Tests (`e2e/critical/user-flows.spec.ts`)

```bash
npx playwright test --project=user-flows-chromium
```

**Tester inkludert:**
- ✅ Signup flow (landing → signup)
- ✅ Login flow (innlogging → dashboard)
- ✅ Form validation
- ✅ Logout flow
- ✅ Paper trading start
- ✅ Demo widget buy/sell
- ✅ Theme toggle (light → dark → system)
- ✅ Theme persistence etter reload
- ✅ Navigation links

### 3. Responsive Tests (`e2e/responsive/mobile-landing.spec.ts`)

```bash
npx playwright test --project=responsive-chromium
```

**Tester inkludert:**
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ Desktop viewport (1920x1080)
- ✅ No horizontal scroll
- ✅ Touch targets (min 44x44px)
- ✅ Hamburger menu funksjonalitet
- ✅ Image scaling
- ✅ Grid layout adapts

### 4. Performance Tests (`e2e/performance/lighthouse.spec.ts`)

```bash
npx playwright test --project=performance-chromium
```

**Core Web Vitals thresholds:**
| Metric | Target | Threshold |
|--------|--------|-----------|
| LCP | Good | < 2500ms |
| CLS | Good | < 0.1 |
| TTFB | Good | < 600ms |
| FCP | Good | < 1800ms |
| TBT | Good | < 200ms |

**Tester inkludert:**
- ✅ Core Web Vitals measurement
- ✅ Resource loading optimization
- ✅ JavaScript execution time
- ✅ Lazy loading verification
- ✅ Caching verification (repeat view)

## Test Users

### Tier-based Users

| User | Tier | Email | Features |
|------|------|-------|----------|
| Student | student | e2e.student@klarpakke.test | Basic |
| Bachelor | bachelor | e2e.bachelor@klarpakke.test | Trading session |
| Master | master | e2e.master@klarpakke.test | Trading + notifications |
| PhD | phd | e2e.phd@klarpakke.test | Full features |
| Professor | professor | e2e.professor@klarpakke.test | All features |

### Scenario-based Users

| User | Email | Scenario |
|------|-------|----------|
| Active Trader | e2e.trading.active@klarpakke.test | Has paper trading session |
| New Trader | e2e.trading.new@klarpakke.test | No trading session |
| Trader with History | e2e.trading.history@klarpakke.test | Has trade history |
| Subscribed | e2e.notif.subscribed@klarpakke.test | Push notifications enabled |
| Unsubscribed | e2e.notif.unsubscribed@klarpakke.test | No notifications |

## Helper Functions

### Auth Helpers (`e2e/helpers/auth.ts`)

```typescript
// Login as primary test user
await loginAsTestUser(page, 'primary');

// Login as specific tier
await loginAsTestUser(page, 'tier', { tier: 'master' });

// Login with custom redirect
await loginAsTestUser(page, 'primary', { redirectUrl: '/dashboard/trading' });

// Logout
await logout(page);

// Ensure authenticated (login if needed)
await ensureAuthenticated(page);

// Check auth status
const isAuth = await isAuthenticated(page);

// Clear all auth
await clearAuth(page);
```

## Data-testid Attributes Added

| Component | Attribute | Description |
|-----------|-----------|-------------|
| HeroPrimaryActions | `data-testid="hero-cta-signup"` | Primary signup CTA |
| HeroPrimaryActions | `data-testid="hero-cta-dashboard"` | Dashboard CTA (logged in) |
| HeroPrimaryActions | `data-testid="hero-cta-paper"` | Paper trading CTA |
| HeroPrimaryActions | `data-testid="hero-cta-secondary"` | Secondary CTA |
| TrustStrip | `data-testid="trust-strip"` | Trust badges section |
| DemoWidget | `data-testid="demo-widget"` | Demo trading widget |
| DemoWidget | `data-testid="demo-widget-buy"` | Buy button |
| DemoWidget | `data-testid="demo-widget-sell"` | Sell button |
| ThemeToggle | `data-testid="theme-toggle"` | Theme toggle button |
| ThemeToggle | `data-testid="theme-toggle-segmented"` | Segmented variant |

## Running Tests

### All E2E Tests

```bash
npm run test:e2e
```

### Specific Test Categories

```bash
# Accessibility only
npx playwright test --project=a11y-chromium

# User flows
npx playwright test --project=user-flows-chromium

# Responsive
npx playwright test --project=responsive-chromium

# Performance
npx playwright test --project=performance-chromium
```

### Test Tags

```bash
# Run all accessibility tests
npx playwright test --grep @accessibility

# Run all critical tests
npx playwright test --grep @critical

# Run mobile tests
npx playwright test --grep @mobile

# Run performance tests
npx playwright test --grep @performance
```

### With UI Mode

```bash
npx playwright test --ui
```

### Debug Mode

```bash
npx playwright test --debug
```

## CI/CD Integration

Tests are ready for CI/CD with:
- Parallel execution support
- Retry on failure (2 retries in CI)
- Screenshot on failure
- Video recording on failure
- Allure reporting

```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: |
    npx playwright test --project=smoke-chromium
    npx playwright test --project=critical-chromium
    npx playwright test --project=a11y-chromium
```

## Best Practices

### 1. Test Isolation
- Hver test er isolert med fresh page context
- Auth state gjenbrukes via storageState
- Test data er deterministisk

### 2. Stability
- Retry på flaky operasjoner
- Explicit waits for dynamic content
- Graceful handling av loading states

### 3. Maintainability
- data-testid for stabile selectors
- Helper functions for gjenbruk
- Tydelig test dokumentasjon

### 4. Performance
- Minimal setup per test
- Parallell kjøring
- Smarte waits (ikke hardcoded sleeps)

## Troubleshooting

### Common Issues

**Problem:** Tests fail with timeout
```bash
# Increase timeout
npx playwright test --timeout=60000
```

**Problem:** Auth tests fail
```bash
# Ensure test user exists
npm run test:e2e:provision:primary
```

**Problem:** Mobile tests fail on desktop
```bash
# Run with specific project
npx playwright test --project=mobile-safari
```

### Debug Tips

1. **View traces:**
   ```bash
   npx playwright show-trace test-results/trace.zip
   ```

2. **Screenshots on failure:**
   - Auto-enabled i config
   - Finn i `test-results/`

3. **Video recordings:**
   - Auto-enabled på failure
   - Finn i `test-results/`

## Maintenance

### Adding New Tests

1. Velg riktig mappe basert på test type
2. Bruk eksisterende helpers
3. Legg til data-testid om nødvendig
4. Oppdater denne dokumentasjonen

### Updating Selectors

1. Foretrekk `data-testid` over CSS selectors
2. Bruk `getByRole` for semantic elements
3. Unngå brittle XPath selectors

### Test Data Updates

1. Oppdater `e2e/fixtures/test-users.ts`
2. Kjør provisioning script
3. Oppdater relaterte tests

## Next Steps

- [ ] Legg til flere a11y tester for interne sider
- [ ] Implementer visuell regresjonstesting
- [ ] Utvid performance tester med mer detaljerte metrics
- [ ] Legg til flere scenario-baserte brukerflyter
- [ ] Implementer cross-browser testing (Safari, Firefox)
