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

### Shared Marketing Components

For å unngå duplisert innhold på marketing-sider, bruk delte komponenter fra `src/features/marketing/components/`:

#### ✅ Riktig - Bruk delte komponenter

```typescript
// src/app/[locale]/(marketing)/paper/page.tsx
import { PaperHero, GettingStartedSteps } from "@/features/marketing/components";

export default function PaperTradingPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  
  return (
    <main>
      {/* Bruk delt hero-komponent */}
      <PaperHero locale={locale} />
      
      {/* Andre seksjoner... */}
      
      {/* Bruk delt steps-komponent */}
      <GettingStartedSteps 
        title={locale === 'en' ? "Get started in 3 simple steps" : "Kom i gang på 3 enkle steg"}
      />
    </main>
  );
}
```

#### ❌ Galt - Kopier innhold inline

```typescript
// ❌ IKKE GJØR DETTE
// src/app/[locale]/(marketing)/paper/page.tsx
export default function PaperTradingPage() {
  return (
    <main>
      {/* ❌ Kopiert Paper-tekst inline - dette dupliseres på flere sider */}
      <section className="bg-emerald-600">
        <h1>Øv på trading uten å risikere penger</h1>
        <p>Start med 100 000 kr i lekepenger. Test strategier, lær markedene...</p>
        <button>Start nå — det er gratis</button>
      </section>
      
      {/* ❌ Kopiert steps inline */}
      <section>
        <h2>Kom i gang på 3 enkle steg</h2>
        <div>01 - Opprett konto...</div>
        <div>02 - Start paper-trading...</div>
        <div>03 - Bli klar for live...</div>
      </section>
    </main>
  );
}
```

**Tilgjengelige komponenter:**
| Komponent | Props | Bruk på |
|-----------|-------|---------|
| `PaperHero` | `locale: string` | `/paper`, `/en/paper` |
| `GettingStartedSteps` | `steps?: Step[], title?: string` | `/paper`, `/` |
| `HelpContactBlock` | ingen | `/hjelp`, `/en/help` |
| `PrimaryCtaSection` | `title, description, primaryLabel, primaryHref, secondaryLabel?, secondaryHref?, variant?, locale?` | `/paper`, `/priser` |

**PrimaryCtaSection eksempel (norsk):**
```typescript
<PrimaryCtaSection
  title="Klar til å starte din trading-reise?"
  description="Registrer deg gratis i dag og få 100 000 kr i lekepenger."
  primaryLabel="Opprett gratis konto"
  primaryHref="/register"
  secondaryLabel="Se priser"
  secondaryHref="/priser"
  variant="paper"
  locale={locale}
/>
```

**PrimaryCtaSection eksempel (engelsk):**
```typescript
<PrimaryCtaSection
  title="Ready to start your trading journey?"
  description="Sign up for free today and get 100,000 NOK in practice money."
  primaryLabel="Create free account"
  primaryHref="/register"
  secondaryLabel="See pricing"
  secondaryHref="/pricing"
  variant="paper"
  locale={locale}
/>
```

**Kjør duplikat-test før push:**
```bash
npm run test:duplicate
```

Denne testen sjekker at ingen tekstblokker (>80 tegn) dupliseres på tvers av marketing-sider (`/`, `/paper`, `/priser`, `/hjelp` og `/en/*` variantene).

#### Marketing Analytics

Alle marketing CTAs skal trackes for å måle konvertering. Bruk `trackingId` prop:

```typescript
<PrimaryCtaSection
  title="Klar til å starte?"
  description="Registrer deg gratis..."
  primaryLabel="Opprett konto"
  primaryHref="/register"
  variant="paper"
  locale={locale}
  trackingId="paper-primary"  // Required!
/>
```

**Gyldige tracking IDs:**
- `pricing-primary`, `pricing-secondary`
- `paper-primary`, `paper-secondary`
- `hero-primary`, `hero-secondary`
- `course-primary`, `course-secondary`
- `help-primary`, `signup-primary`

**A/B Testing:**
```typescript
<PrimaryCtaSection
  ...
  trackingId="paper-primary"
  experimentKey="paper-cta-text-v1"
  variantKey="A"  // eller "B"
/>
```

Se resultater i admin-dashboardet: `/admin/marketing/ctas`

**Krav:** Ingen nye CTAs uten `trackingId`. Dette er påkrevd for å kunne måle hvilke sider/varianter som konverterer best.

#### Funnel Analytics

Hver CTA er tilknyttet en funnel-stage som sporer brukerens reise:

```
CTA-klikk → Signup → First Paper Session → First Auto-trade
```

**Funnel stages:**
- `landing` - Landing page CTAs (hero-primary)
- `paper` - Paper trading CTAs (paper-primary)
- `pricing` - Pricing page CTAs (pricing-primary)
- `course` - Course/marketing CTAs (course-primary)
- `signup` - Signup-flow CTAs

**Slack-rapporter:**
- Sendes ukentlig til #marketing-kanalen
- Inneholder: Topp 5 CTAs, signup-rate, paper-aktivering, auto-trade-konvertering
- A/B-test sammenligninger med vinner-variant

**Handling på rapporter:**
- Hvis en CTA faller >30% uke-over-uke: Opprett Linear-oppgave for undersøkelse
- Hvis A/B-test viser signifikant vinner: Diskuter rollout i team-møte
- Se detaljer i admin-dashboard: `/admin/marketing/ctas` (tab "Funnel")

#### Hvis CI feiler på duplikat-test

Hvis `npm run test:duplicate` feiler i CI:

1. **Sjekk rapporten** som genereres i `output/duplicate-report.md`:
   ```bash
   cat output/duplicate-report.md
   ```

2. **Rapporten viser:**
   - Hvilke routes som har duplikater
   - Den dupliserte teksten (forkortet til 120 tegn)
   - Antall forekomster

3. **Fiks ved å:**
   - Flytte duplisert innhold til en delt komponent i `src/features/marketing/components/`
   - Importere og bruke den delte komponenten i stedet for inline-tekst
   - Kjøre `npm run test:duplicate` lokalt for å verifisere

4. **Whitelist**: Korte tekster som "Logg inn", "Start gratis", og footer-tekster er whitelisted og vil ikke trigge feil.

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
│   ├── services/         # Business logic (regime, indicators)
│   └── hooks/            # Custom hooks
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
├── scripts/              # Automation scripts
├── tests/                # Tests
├── docs/                 # Documentation
└── .ai/                  # AI context
```

---

## AI Trading Pipeline — Regler

1. **Alle trade-beslutninger MÅ logges til `ai_decision_log`**
2. **Bruk alltid `createServerClient()` (ikke `createClient`) i Server Components**
3. **Nye avkastningstall ALDRI hardkodes** — bruk `backtestPresets.ts`
4. **Sonar API kalles aldri fra klient** (kun server/edge functions)
5. **Nye indikatorer legges i `src/services/indicators.ts`**

### 3-Lags Pipeline

```
LAG 1: Regime (EMA/ADX/RSI) → blokkerer BEAR marked
LAG 2: Sonar (Perplexity)   → blokkerer ved avoid + confidence > 0.7
LAG 3: Execute              → finalSize = base × regimeMul × sentimentMul
```

**Viktig:** Regime lag er alltid først — det beskytter kapital i bearmarkeder.

---

## Kalkulatorer — Regler

- **Én sannhetskilde:** `src/features/landing/backtestPresets.ts`
- **pessimisticReturn < expectedReturn < optimisticReturn** (alltid)
- **Runtime-assert i dev mode** hvis dette brytes
- **Gjenbruk `useBacktestEstimate` hook** overalt

---

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
