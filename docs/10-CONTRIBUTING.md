# Contributing

> **Versjon:** 1.0.0   
> **Oppdatert:** 2026-02-10  
> **For:** Contributors, utviklere

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- Supabase CLI (optional)

### Setup

```bash
# 1. Fork repo (if external contributor)
git clone https://github.com/tajlive/KP.git
cd klarpakke

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run development server
npm run dev
# Open http://localhost:3000
```

---

## Development Workflow

### 1. Create Branch

```bash
git checkout -b feat/beskrivelse
# or
git checkout -b fix/bug-beskrivelse
```

Branch naming:
- `feat/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Tests only

### 2. Make Changes

Follow conventions:
- [`.ai/conventions.md`](../.ai/conventions.md)
- TypeScript strict mode
- Mobile-first design
- Norwegian UI text

### 3. Test Locally

```bash
# Type check
npm run type-check

# Build
npm run build

# Lint
npm run lint

# Unit tests
npm run test

# Full deploy chain
bash scripts/full-deploy.sh
```

### 4. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>: <description>
git commit -m "feat: add leaderboard badge system"
git commit -m "fix: resolve RLS policy for profiles"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify portfolio calculation"
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

### 5. Push and Deploy

```bash
git push origin feat/beskrivelse

# Create Pull Request in GitHub
# After review, merge to main
# Deploy happens automatically
```

---

## Code Conventions

### TypeScript

```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  email: string;
}

export function UserCard({ id, name, email }: UserProps) {
  return <div>{name}</div>;
}

// ❌ Bad
export function UserCard(props: any) {
  return <div>{props.name}</div>;
}
```

### React

```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// Client Component (only when needed)
"use client";
export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Styling

```typescript
// Mobile-first, consistent spacing
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl font-bold">
    Tittel på norsk
  </h1>
</div>
```

---

## Testing Requirements

### Unit Tests

```typescript
// src/lib/__tests__/feature.test.ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../feature';

describe('Feature', () => {
  it('should do X when Y', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('feature works', async ({ page }) => {
  await page.goto('/feature');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

### Coverage Goals

- Unit tests: 70%+
- Critical flows: 100%
- RLS policies: 100%

---

## Documentation

### Update When Changing

- Code: Update relevant docs in `docs/`
- API: Update `docs/03-API.md`
- Database: Update `docs/02-DATABASE.md`
- Architecture: Update `docs/01-ARCHITECTURE.md`

### Code Comments

```typescript
// ✅ Good - explains WHY, not WHAT
// Use exponential backoff to avoid rate limiting
await retryWithBackoff(fetchData);

// ❌ Bad - obvious from code
// Increment count by 1
setCount(count + 1);
```

---

## Review Process

### Self-Review Checklist

Before creating MR:

- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] Tests pass
- [ ] No `console.log` left in code
- [ ] No TODO comments (create issues instead)
- [ ] Documentation updated
- [ ] Mobile view tested
- [ ] Accessibility checked

### MR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots
(if UI changes)

## Checklist
- [ ] Code follows conventions
- [ ] Tests pass
- [ ] Documentation updated
```

---

## Project Structure

```
klarpakke/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── hooks/            # Custom hooks
├── supabase/
│   └── migrations/       # Database migrations
├── scripts/              # Automation scripts
├── tests/                # Tests
├── docs/                 # Documentation
└── .ai/                  # AI context
```

---

## Communication

### Questions?

- **Technical:** Create GitHub issue
- **General:** support@klarpakke.no
- **Admin:** taj@klarpakke.no

### Reporting Bugs

Include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots/logs
5. Environment (browser, OS)

### Feature Requests

Create GitHub issue with:
- Problem description
- Proposed solution
- Use cases

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for users
- Show empathy

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks
- Publishing others' private information

---

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- README.md (Contributors section)
- Release notes

---

## License

Proprietary - © 2026 Klarpakke Universitet

All contributions are subject to review and approval by project maintainers.

---

## Related

- [`.ai/conventions.md`](../.ai/conventions.md) - Detailed conventions
- [docs/05-TESTING.md](05-TESTING.md) - Testing guide
- [docs/04-DEPLOYMENT.md](04-DEPLOYMENT.md) - Deploy process
