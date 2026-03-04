# Testing

> **Versjon:** 1.0.0  
> **Oppdatert:** 2026-02-10  
> **For:** QA Engineers, Utviklere

---

## Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Testing Pyramid                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│     ┌─────────────┐                                          │
│     │    E2E      │  ← Playwright (Critical flows)           │
│     │   ~10%      │                                          │
│     └──────┬──────┘                                          │
│            │                                                 │
│     ┌──────▼──────┐                                          │
│     │ Integration │  ← API tests, Component tests            │
│     │    ~20%     │                                          │
│     └──────┬──────┘                                          │
│            │                                                 │
│     ┌──────▼──────┐                                          │
│     │    Unit     │  ← Vitest (Utilities, hooks)            │
│     │   ~70%      │                                          │
│     └─────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Unit Tests (Vitest)

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});
```

### Running Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific file
npm run test -- src/lib/__tests__/portfolio.test.ts

# Watch mode
npm run test -- --watch
```

### Example Tests

```typescript
// src/lib/__tests__/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('formats ISO date to Norwegian locale', () => {
    const result = formatDate('2026-02-10', 'no');
    expect(result).toBe('10. februar 2026');
  });

  it('handles invalid date gracefully', () => {
    const result = formatDate('invalid', 'no');
    expect(result).toBe('Ugyldig dato');
  });

  it('formats to English locale', () => {
    const result = formatDate('2026-02-10', 'en');
    expect(result).toBe('February 10, 2026');
  });
});
```

```typescript
// src/lib/__tests__/portfolio.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPortfolioOverview } from '../portfolio';

describe('getPortfolioOverview', () => {
  it('returns null for user with no positions', async () => {
    const result = await getPortfolioOverview('test-user-id');
    expect(result?.hasData).toBe(false);
  });

  it('calculates totals correctly', async () => {
    // Mock Supabase response
    const result = await getPortfolioOverview('user-with-data');
    expect(result?.overview.totalValue).toBeGreaterThan(0);
    expect(result?.hasData).toBe(true);
  });
});
```

---

## E2E Tests (Playwright)

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

### Running E2E Tests

```bash
# Run all E2E tests
bash scripts/test-e2e.sh

# Or manually
npm run build
npm run start &
npx playwright test
```

### Critical Flows Tested

```typescript
// tests/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical user flows', () => {
  
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('crypto');
    await expect(page.locator('text=simulatoren')).toBeVisible();
  });

  test('Navigation to pricing works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Priser');
    await expect(page).toHaveURL(/.*priser.*/);
    await expect(page.locator('text=Gratis')).toBeVisible();
  });

  test('Simulator page loads', async ({ page }) => {
    await page.goto('/no/simulator');
    await expect(page.locator('text=Simulator')).toBeVisible();
  });

  test('Health endpoint returns OK', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('Admin login page is accessible', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

});
```

---

## RLS Tests

### Testing Row Level Security

```bash
# Run RLS tests
bash scripts/test-rls.sh
```

### Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| User A tries to read User B's profile | ❌ Denied |
| User A reads own profile | ✅ Allowed |
| Non-admin tries to update courses | ❌ Denied |
| Admin updates courses | ✅ Allowed |
| Anonymous reads published courses | ✅ Allowed |
| Anonymous reads unpublished courses | ❌ Denied |

---

## Link Checking

### Automated Link Checker

```bash
# Check all internal links
bash scripts/check-links.sh https://www.klarpakke.no
```

### Critical Paths Checked

- `/` (landing)
- `/no` (Norwegian home)
- `/no/priser` (pricing)
- `/no/simulator` (simulator)
- `/no/dashboard` (dashboard)
- `/admin` (admin)
- `/api/health` (health endpoint)

---

## Database Consistency Tests

```bash
# Run consistency checks
bash scripts/check-db-consistency.sh
```

Checks:
- Orphaned rows (foreign keys pointing to non-existent rows)
- Duplicate entries in unique columns
- NULL values in NOT NULL columns
- Missing indexes on foreign keys

---

## Secrets Scanning

```bash
# Check for hardcoded secrets
bash scripts/check-secrets.sh
```

Scans for:
- Stripe live keys (`sk_live_`, `pk_live_`)
- Supabase service role keys
- Database connection strings with passwords
- Private keys

---

## Performance Testing

### Lighthouse CI

```bash
# Run Lighthouse audit
npm run lighthouse
```

Targets:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

### Load Testing

```bash
# Using k6 (if needed)
k6 run tests/load/simulator.js
```

---

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit tests | 90%+ | 70% |
| E2E critical flows | 100% | 100% |
| RLS policies | 100% | 100% |
| Links | 100% | 100% |

---

## CI/CD Integration

### GitHub Actions Jobs

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: npm run test -- --coverage
      - name: Run E2E tests
        run: bash scripts/test-e2e.sh
```

---

## Writing New Tests

### Unit Test Template

```typescript
// src/lib/__tests__/feature.test.ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../feature';

describe('Feature Name', () => {
  it('should do X when Y', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    // Test edge cases
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('feature works correctly', async ({ page }) => {
  // Navigate
  await page.goto('/feature');
  
  // Interact
  await page.fill('[name="input"]', 'value');
  await page.click('button[type="submit"]');
  
  // Assert
  await expect(page.locator('.success')).toBeVisible();
});
```

---

## Related

- [runbooks/database-migration.md](runbooks/database-migration.md)
- [04-DEPLOYMENT.md](04-DEPLOYMENT.md) - CI/CD pipeline
