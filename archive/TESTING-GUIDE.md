# Comprehensive Testing Guide

Complete guide to the testing infrastructure for Klarpakke Universitet.

## Testing Stack

- **Unit Tests**: Jest + TypeScript
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: 70%+ on critical paths

---

## Setup

### Install Dependencies

```bash
npm install --save-dev jest @types/jest jest-environment-jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @playwright/test
```

### Configuration

Configuration files are already in place:
- `jest.config.ts` - Jest configuration
- `jest.setup.ts` - Testing setup and mocks
- `playwright.config.ts` - Playwright configuration
- `src/__tests__/test-utils.tsx` - Custom render and fixtures

---

## Running Tests

### Unit & Component Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- error-handling.test.ts

# Generate coverage report
npm test -- --coverage

# Run with specific pattern
npm test -- --testPathPattern=error
```

### E2E Tests

```bash
# Run all E2E tests
npm run test

# Run specific test file
npx playwright test beta-signup.spec.ts

# Run in debug mode
npx playwright test --debug

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=firefox
```

### CI/CD Testing

```bash
# Full test suite (unit + E2E)
npm run test:full

# CI test script
npm run test:ci
```

---

## Writing Tests

### Unit Test Example

```typescript
// src/__tests__/my-utility.test.ts
import { myFunction } from '@/lib/my-utility';

describe('My Utility', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Component Test Example

```typescript
// src/__tests__/components/MyComponent.test.tsx
import { render, screen } from '@/__tests__/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const { user } = render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button:has-text("Sign Up")');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Test Utilities

### Custom Render

```typescript
import { render, screen } from '@/__tests__/test-utils';

// Automatically wraps with QueryProvider and ErrorBoundary
render(<MyComponent />);
```

### Mock Data (Fixtures)

```typescript
import {
  mockProfile,
  mockTrade,
  mockBetaApplication,
} from '@/__tests__/test-utils';

// Use in tests
test('displays user profile', () => {
  render(<ProfileCard profile={mockProfile} />);
  expect(screen.getByText(mockProfile.name)).toBeInTheDocument();
});
```

### Mock Functions

```typescript
import { createMockRouter, createMockSupabaseClient } from '@/__tests__/test-utils';

const mockRouter = createMockRouter();
const mockSupabase = createMockSupabaseClient();
```

---

## Test Structure

### Directory Layout

```
src/
├── __tests__/
│   ├── test-utils.tsx              # Custom render, fixtures, mocks
│   ├── components/
│   │   ├── form-error.test.tsx     # Component tests
│   │   └── ...
│   └── error-handling.test.ts      # Unit tests
├── components/
│   └── my-component.tsx
└── lib/
    └── my-utility.ts
```

### File Naming Convention

```
my-file.ts       → my-file.test.ts
my-component.tsx → my-component.test.tsx
```

---

## Coverage Requirements

Minimum coverage thresholds (in jest.config.ts):

```
Branches: 70%
Functions: 70%
Lines: 70%
Statements: 70%
```

Check coverage:

```bash
npm test -- --coverage
```

View coverage report:

```bash
open coverage/lcov-report/index.html
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ✅ GOOD - Tests behavior
test('shows error message when email is invalid', () => {
  render(<SignupForm />);
  await user.type(screen.getByLabelText(/email/i), 'invalid');
  await user.click(screen.getByRole('button'));
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});

// ❌ BAD - Tests implementation
test('isValidEmail returns false', () => {
  expect(isValidEmail('invalid')).toBe(false);
});
```

### 2. Use Semantic Queries

```typescript
// ✅ GOOD - Uses semantic selectors
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// ❌ BAD - Uses test IDs or class names
screen.getByTestId('submit-btn');
screen.getByClassName('email-input');
```

### 3. Test User Interactions

```typescript
// ✅ GOOD - Simulates user interaction
await user.type(inputElement, 'test');
await user.click(buttonElement);

// ❌ BAD - Direct manipulation
inputElement.value = 'test';
buttonElement.click();
```

### 4. Handle Async Operations

```typescript
// ✅ GOOD - Wait for async updates
await user.click(screen.getByRole('button'));
await expect(screen.getByText('Success')).toBeInTheDocument();

// ❌ BAD - No waiting
user.click(screen.getByRole('button'));
expect(screen.getByText('Success')).toBeInTheDocument(); // May fail
```

### 5. Use Fixtures for Repeated Data

```typescript
// ✅ GOOD - Reuse mock data
const { mockProfile, mockTrade } = require('@/__tests__/test-utils');

// ❌ BAD - Create data in each test
const profile = { id: '123', name: 'Test' };
```

---

## Critical Paths to Test

These user flows must have >90% coverage:

### Authentication
- [ ] Signup flow
- [ ] Login flow
- [ ] Password reset
- [ ] Logout

### Beta Application
- [ ] Apply for beta
- [ ] View application status
- [ ] Approval workflow

### Trading
- [ ] View open trades
- [ ] Place trade
- [ ] Close trade
- [ ] View trade history

### Subscriptions
- [ ] View tier options
- [ ] Upgrade subscription
- [ ] Cancel subscription
- [ ] Handle payment errors

### Notifications
- [ ] Receive notification
- [ ] Mark as read
- [ ] Delete notification

---

## CI/CD Integration

Tests run automatically in GitLab CI:

```yaml
# .gitlab-ci.yml
test:unit:
  script:
    - npm run test:ci

test:e2e:
  script:
    - npx playwright test
```

Merge requests require:
- ✅ All tests passing
- ✅ 70% coverage minimum
- ✅ No ESLint warnings

---

## Debugging Tests

### Debug Jest Tests

```typescript
// Add debugger in test
test('something', () => {
  debugger;
  expect(true).toBe(true);
});

// Run with inspector
node --inspect-brk node_modules/jest/bin/jest.js --runInBand
```

### Debug Playwright Tests

```bash
# Run in debug mode
npx playwright test --debug

# Or use page.pause() in test
await page.pause();
```

### View Test Output

```typescript
// Use logTestingPlaygroundURL
import { screen, logTestingPlaygroundURL } from '@testing-library/react';

test('something', () => {
  render(<MyComponent />);
  logTestingPlaygroundURL(); // Opens browser for inspection
});
```

---

## Common Issues & Solutions

### Issue: "Cannot find module '@/lib/...'"

**Solution**: Ensure jest.config.ts has correct moduleNameMapper:

```typescript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

### Issue: "QueryClient is not defined"

**Solution**: Use custom render from test-utils:

```typescript
// ✅ GOOD
import { render } from '@/__tests__/test-utils';

// ❌ BAD
import { render } from '@testing-library/react';
```

### Issue: "Supabase client is not mocked"

**Solution**: jest.setup.ts mocks it automatically, but verify:

```bash
# Check jest.setup.ts is in setupFilesAfterEnv
cat jest.config.ts | grep setupFilesAfterEnv
```

### Issue: "Test times out"

**Solution**: Increase timeout:

```typescript
test('long operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

