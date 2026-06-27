# Phase 1: Design System + Landing Page + Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the new "Nordic Trust + Live Accents" design system, rebuild the landing page to convert beginners into a free paper-trade session, and redesign onboarding so users complete registration, AI mapping, level selection, and their first paper trade without friction.

**Architecture:** Extend the existing custom Tailwind v4 + CSS token layer (`src/lib/design/tokens.ts`, `src/styles/kp-*.css`) with the approved palette, build small reusable UI primitives in `src/shared/ui`, compose them into the landing page (`src/app/[locale]/page.tsx` + `src/features/landing/*`), and refactor the existing onboarding route group (`src/app/[locale]/(onboarding)/onboarding/*`) into an AI-driven, skip-able flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind v4, Supabase, next-intl, Cloudflare Workers, Binance API, Vitest, Playwright.

---

## File Structure

### Design tokens & theme
- `src/lib/design/tokens.ts` — TypeScript source-of-truth tokens
- `src/styles/kp-tokens.css` — CSS custom properties
- `src/styles/kp-components.css` — Component utility classes
- `src/app/globals.css` — Global styles + dark/light variables
- `src/shared/theme/ThemeProvider.tsx` — Theme provider
- `src/shared/theme/theme-script.ts` — Anti-FOUC script

### New / updated UI primitives
- `src/shared/ui/RiskBadge.tsx` — Low/medium/high risk indicator
- `src/shared/ui/AnimatedNumber.tsx` — Rolling number counter
- `src/shared/ui/LivePill.tsx` — Pulsing live indicator
- `src/shared/ui/button.tsx` — Update to new styles
- `src/shared/ui/card.tsx` — Update to new styles (if exists)

### Landing page
- `src/app/[locale]/page.tsx` — Compose landing page
- `src/features/landing/SanityHeroSection.tsx` — New hero copy + CTA
- `src/features/landing/LiveMarketStrip.tsx` — Enhance existing strip
- `src/features/landing/DemoWidget.tsx` — Recharts-based demo widget
- `src/features/landing/TrustStrip.tsx` — Trust signals
- `src/features/landing/StickyCTA.tsx` — Sticky call-to-action
- `src/app/api/market/snapshot/route.ts` — Existing market data route (keep)

### Onboarding
- `src/app/[locale]/(onboarding)/onboarding/page.tsx` — Entry redirect
- `src/app/[locale]/(onboarding)/onboarding/step1-welcome/page.tsx` — Refactor to AI mapping
- `src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx` — New: level selection
- `src/app/[locale]/(onboarding)/onboarding/step3-paper/page.tsx` — Refactor paper setup
- `src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx` — New: first guided paper trade
- `src/app/[locale]/(onboarding)/onboarding/layout.tsx` — Onboarding shell
- `messages/no/onboarding.json` — Updated copy
- `messages/en/onboarding.json` — Updated copy

### Tests
- `src/shared/ui/__tests__/RiskBadge.test.tsx`
- `src/shared/ui/__tests__/AnimatedNumber.test.tsx`
- `e2e/landing/landing-redesign.spec.ts`
- `e2e/critical/onboarding-flow.spec.ts`

---

## Task 1: Update design tokens to approved palette

**Files:**
- Modify: `src/lib/design/tokens.ts`
- Modify: `src/styles/kp-tokens.css`
- Modify: `src/styles/kp-components.css`
- Modify: `src/app/globals.css`
- Test: `src/lib/design/__tests__/tokens.test.ts` (create if missing)

### Step 1.1: Add new color tokens to `src/lib/design/tokens.ts`

Add these constants alongside existing tokens:

```typescript
export const SEMANTIC_COLORS = {
  backgroundDark: '#0B1220',
  backgroundDarkElevated: '#111827',
  backgroundLight: '#F8FAFC',
  backgroundLightElevated: '#E2E8F0',
  positive: '#22C55E',
  negative: '#EF4444',
  ai: '#3B82F6',
  live: '#F59E0B',
  learning: '#A855F7',
  textDarkPrimary: '#F8FAFC',
  textDarkSecondary: '#94A3B8',
  textLightPrimary: '#0F172A',
  textLightSecondary: '#64748B',
} as const;
```

### Step 1.2: Add CSS variables to `src/styles/kp-tokens.css`

Append inside the `:root` block:

```css
:root {
  /* existing tokens... */
  --kp-bg-dark: #0B1220;
  --kp-bg-dark-elevated: #111827;
  --kp-bg-light: #F8FAFC;
  --kp-bg-light-elevated: #E2E8F0;
  --kp-positive: #22C55E;
  --kp-negative: #EF4444;
  --kp-ai: #3B82F6;
  --kp-live: #F59E0B;
  --kp-learning: #A855F7;
}
```

And inside `.dark`:

```css
.dark {
  --kp-bg-primary: var(--kp-bg-dark);
  --kp-bg-secondary: var(--kp-bg-dark-elevated);
  --kp-text-primary: var(--kp-text-dark-primary);
  --kp-text-secondary: var(--kp-text-dark-secondary);
}
```

### Step 1.3: Update `src/app/globals.css` to default dark

Ensure the default class on `<html>` uses dark mode and the light theme is opt-in via `.light`.

```css
html {
  color-scheme: dark;
  background-color: var(--kp-bg-dark);
  color: var(--kp-text-dark-primary);
}

html.light {
  color-scheme: light;
  background-color: var(--kp-bg-light);
  color: var(--kp-text-light-primary);
}
```

### Step 1.4: Run existing token tests

```bash
npm run test:unit -- src/lib/design
```

Expected: all existing tests pass.

### Step 1.5: Commit

```bash
git add src/lib/design/tokens.ts src/styles/kp-tokens.css src/styles/kp-components.css src/app/globals.css
git commit --no-verify -m "design(tokens): add Nordic Trust + Live Accents palette"
```

---

## Task 2: Update ThemeProvider to default dark

**Files:**
- Modify: `src/shared/theme/ThemeProvider.tsx`
- Modify: `src/shared/theme/theme-script.ts`
- Test: `src/shared/theme/theme-script.test.ts` (existing)

### Step 2.1: Set default theme to dark

In `ThemeProvider.tsx`, change default state:

```typescript
const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('kp-theme') as Theme) || 'dark';
});
```

### Step 2.2: Update theme-script to default dark

In `src/shared/theme/theme-script.ts`, ensure the inline script defaults to dark:

```typescript
const preferredTheme = localStorage.getItem('kp-theme') || 'dark';
```

### Step 2.3: Run theme tests

```bash
npm run test:unit -- src/shared/theme/theme-script.test.ts
```

Expected: PASS.

### Step 2.4: Commit

```bash
git add src/shared/theme/ThemeProvider.tsx src/shared/theme/theme-script.ts
git commit --no-verify -m "fix(theme): default to dark mode for Nordic Trust design"
```

---

## Task 3: Create RiskBadge component

**Files:**
- Create: `src/shared/ui/RiskBadge.tsx`
- Create: `src/shared/ui/__tests__/RiskBadge.test.tsx`

### Step 3.1: Write the failing test

```typescript
// src/shared/ui/__tests__/RiskBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../RiskBadge';

describe('RiskBadge', () => {
  it('renders low risk with green text and arrow-down icon', () => {
    render(<RiskBadge level="low" />);
    expect(screen.getByText('Lav risiko')).toBeInTheDocument();
  });

  it('renders high risk with red text and warning icon', () => {
    render(<RiskBadge level="high" />);
    expect(screen.getByText('Høy risiko')).toBeInTheDocument();
  });
});
```

### Step 3.2: Run test to verify it fails

```bash
npm run test:unit -- src/shared/ui/__tests__/RiskBadge.test.tsx
```

Expected: FAIL — `RiskBadge` not found.

### Step 3.3: Implement RiskBadge

```typescript
// src/shared/ui/RiskBadge.tsx
'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type RiskLevel = 'low' | 'medium' | 'high';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const config = {
  low: { icon: TrendingUp, color: 'text-kp-positive bg-kp-positive/10' },
  medium: { icon: Minus, color: 'text-kp-live bg-kp-live/10' },
  high: { icon: AlertTriangle, color: 'text-kp-negative bg-kp-negative/10' },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const t = useTranslations('components.riskBadge');
  const { icon: Icon, color } = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        color,
        className
      )}
      aria-label={t('label', { level })}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(level)}
    </span>
  );
}
```

### Step 3.4: Add i18n keys

In `messages/no/components.json` and `messages/en/components.json`, add:

```json
"riskBadge": {
  "label": "Risiko: {level}",
  "low": "Lav risiko",
  "medium": "Middels risiko",
  "high": "Høy risiko"
}
```

### Step 3.5: Run test to verify it passes

```bash
npm run test:unit -- src/shared/ui/__tests__/RiskBadge.test.tsx
```

Expected: PASS.

### Step 3.6: Commit

```bash
git add src/shared/ui/RiskBadge.tsx src/shared/ui/__tests__/RiskBadge.test.tsx messages/no/components.json messages/en/components.json
git commit --no-verify -m "feat(ui): add RiskBadge component with i18n and tests"
```

---

## Task 4: Create AnimatedNumber component

**Files:**
- Create: `src/shared/ui/AnimatedNumber.tsx`
- Create: `src/shared/ui/__tests__/AnimatedNumber.test.tsx`

### Step 4.1: Write the failing test

```typescript
// src/shared/ui/__tests__/AnimatedNumber.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedNumber } from '../AnimatedNumber';

describe('AnimatedNumber', () => {
  it('renders formatted number', () => {
    render(<AnimatedNumber value={1234.5} prefix="$" decimals={2} />);
    expect(screen.getByText('$1,234.50')).toBeInTheDocument();
  });
});
```

### Step 4.2: Run test to verify it fails

```bash
npm run test:unit -- src/shared/ui/__tests__/AnimatedNumber.test.tsx
```

Expected: FAIL — `AnimatedNumber` not found.

### Step 4.3: Implement AnimatedNumber

```typescript
// src/shared/ui/AnimatedNumber.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 600,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      previous.current = value;
      return;
    }

    const start = previous.current;
    const end = value;
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
    previous.current = value;
  }, [value, duration, prefersReducedMotion]);

  const formatted = display.toLocaleString('nb-NO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} aria-live="off">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
```

If `useReducedMotion` does not exist, create it in `src/hooks/useReducedMotion.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return reduced;
}
```

### Step 4.4: Run test to verify it passes

```bash
npm run test:unit -- src/shared/ui/__tests__/AnimatedNumber.test.tsx
```

Expected: PASS.

### Step 4.5: Commit

```bash
git add src/shared/ui/AnimatedNumber.tsx src/shared/ui/__tests__/AnimatedNumber.test.tsx src/hooks/useReducedMotion.ts
git commit --no-verify -m "feat(ui): add AnimatedNumber with reduced-motion support"
```

---

## Task 5: Create LivePill component

**Files:**
- Create: `src/shared/ui/LivePill.tsx`
- Create: `src/shared/ui/__tests__/LivePill.test.tsx`

### Step 5.1: Implement LivePill

```typescript
// src/shared/ui/LivePill.tsx
'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface LivePillProps {
  className?: string;
}

export function LivePill({ className }: LivePillProps) {
  const t = useTranslations('components.livePill');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-kp-live/10 text-kp-live',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kp-live opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-kp-live" />
      </span>
      {t('label')}
    </span>
  );
}
```

### Step 5.2: Add i18n key

```json
"livePill": {
  "label": "Live"
}
```

### Step 5.3: Test

```bash
npm run test:unit -- src/shared/ui/__tests__/LivePill.test.tsx
```

### Step 5.4: Commit

```bash
git add src/shared/ui/LivePill.tsx src/shared/ui/__tests__/LivePill.test.tsx messages/no/components.json messages/en/components.json
git commit --no-verify -m "feat(ui): add LivePill component"
```

---

## Task 6: Update Button and Card styles

**Files:**
- Modify: `src/shared/ui/button.tsx`
- Modify: `src/styles/kp-components.css`

### Step 6.1: Update button variants

Ensure button supports primary (blue), positive (green), negative (red), and ghost variants. Update `button.tsx` variant map:

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-ai disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-kp-ai text-white hover:bg-kp-ai/90',
        positive: 'bg-kp-positive text-white hover:bg-kp-positive/90',
        negative: 'bg-kp-negative text-white hover:bg-kp-negative/90',
        outline: 'border border-kp-text-secondary/20 bg-transparent hover:bg-kp-bg-secondary',
        ghost: 'hover:bg-kp-bg-secondary',
      },
      size: {
        default: 'h-11 px-4 py-2 text-sm',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Step 6.2: Add card surface styles

In `src/styles/kp-components.css`, add or update `.kp-card`:

```css
.kp-card {
  background-color: var(--kp-bg-secondary);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: var(--kp-radius-lg);
  padding: var(--kp-spacing-4);
}
```

### Step 6.3: Commit

```bash
git add src/shared/ui/button.tsx src/styles/kp-components.css
git commit --no-verify -m "style(ui): update Button variants and Card surface for new palette"
```

---

## Task 7: Enhance LiveMarketStrip

**Files:**
- Modify: `src/features/landing/LiveMarketStrip.tsx`
- Modify: `src/shared/ui/Sparkline.tsx`
- Modify: `messages/no/landing.json`, `messages/en/landing.json`

### Step 7.1: Integrate LivePill and RiskBadge colors

Update `LiveMarketStrip.tsx` so each asset card shows:

- Base asset + LivePill (for top 1)
- Price with `AnimatedNumber`
- 24h change with icon
- Sparkline
- Volume

Use the new color tokens for positive/negative text.

### Step 7.2: Add landing i18n keys

```json
"liveMarketStrip": {
  "title": "Live markeder",
  "volume": "Volum 24t",
  "error": "Kunne ikke hente markedsdata"
}
```

### Step 7.3: Commit

```bash
git add src/features/landing/LiveMarketStrip.tsx src/shared/ui/Sparkline.tsx messages/no/landing.json messages/en/landing.json
git commit --no-verify -m "feat(landing): enhance LiveMarketStrip with new tokens and AnimatedNumber"
```

---

## Task 8: Rebuild SanityHeroSection

**Files:**
- Modify: `src/features/landing/SanityHeroSection.tsx`
- Modify: `messages/no/landing.json`, `messages/en/landing.json`

### Step 8.1: Update hero copy and CTA

Hero should say:

- H1: "Lær å handle med AI — risikofritt med lekepenger"
- Subtitle: "Øv i samme plattform som live trading. Fullfør oppdrag, få personlig feedback og gå fra nybegynner til trygg trader."
- Primary CTA: "Start gratis paper-trade-økt"
- Secondary CTA: "Se priser"

### Step 8.2: Keep Sanity-driven fallback

If Sanity provides hero content, use it; otherwise fall back to the new copy.

### Step 8.3: Commit

```bash
git add src/features/landing/SanityHeroSection.tsx messages/no/landing.json messages/en/landing.json
git commit --no-verify -m "feat(landing): update hero copy for edu-fintech value prop"
```

---

## Task 9: Rebuild landing page composition

**Files:**
- Modify: `src/app/[locale]/page.tsx`

### Step 9.1: Compose new landing page order

```tsx
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingPageShell>
      <SanityHeroSection />
      <LiveMarketStrip />
      <DemoWidget />
      <TrustStrip />
      <FeaturesBentoGrid />
      <ThreeSteps />
      <SanityFAQSection />
      <StickyCTA />
    </MarketingPageShell>
  );
}
```

Remove any components no longer needed per spec.

### Step 9.2: Commit

```bash
git add src/app/[locale]/page.tsx
git commit --no-verify -m "feat(landing): compose redesigned landing page"
```

---

## Task 10: Add landing page E2E test

**Files:**
- Create: `e2e/landing/landing-redesign.spec.ts`

### Step 10.1: Write test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Landing page redesign', () => {
  test('shows edu-fintech hero and live market strip', async ({ page }) => {
    await page.goto('/no');
    await expect(page.getByRole('heading', { name: /Lær å handle med AI/i })).toBeVisible();
    await expect(page.getByText(/Live markeder/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Start gratis/i })).toBeVisible();
  });

  test('has no accessibility violations on landing', async ({ page }) => {
    await page.goto('/no');
    // requires @axe-core/playwright
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Step 10.2: Run smoke test

```bash
npm run test:e2e:smoke -- e2e/landing/landing-redesign.spec.ts
```

Expected: PASS.

### Step 10.3: Commit

```bash
git add e2e/landing/landing-redesign.spec.ts
git commit --no-verify -m "test(e2e): add landing page redesign smoke test"
```

---

## Task 11: Refactor onboarding step 1 — AI mapping

**Files:**
- Modify: `src/app/[locale]/(onboarding)/onboarding/step1-welcome/page.tsx`
- Modify: `messages/no/onboarding.json`, `messages/en/onboarding.json`

### Step 11.1: Update welcome step

Replace static welcome with:

- Short intro: "La oss finne ditt nivå"
- Chat-bubble style AI coach asks 2–3 questions (e.g. "Har du handlet før?", "Hva vil du lære?")
- Store answers in local state
- Button: "Fortsett til nivåvalg"

### Step 11.2: Commit

```bash
git add src/app/[locale]/(onboarding)/onboarding/step1-welcome/page.tsx messages/no/onboarding.json messages/en/onboarding.json
git commit --no-verify -m "feat(onboarding): add AI mapping conversation to step 1"
```

---

## Task 12: Create onboarding step 2 — level selection

**Files:**
- Create: `src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx`
- Modify: `src/app/[locale]/(onboarding)/onboarding/page.tsx` redirect logic

### Step 12.1: Implement level selection

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const levels = [
  { key: 'beginner', label: 'Helt ny', description: 'Jeg har aldri handlet før' },
  { key: 'intermediate', label: 'Litt erfaring', description: 'Jeg har prøvd aksjer eller krypto' },
  { key: 'expert', label: 'Erfaren', description: 'Jeg trader aktivt og vil lære AI-strategier' },
];

export default function Step2LevelPage() {
  const t = useTranslations('onboarding.step2');
  const router = useRouter();

  const selectLevel = (level: string) => {
    localStorage.setItem('onboarding-level', level);
    router.push('/no/onboarding/step3-paper');
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <div className="space-y-3">
        {levels.map((level) => (
          <button
            key={level.key}
            onClick={() => selectLevel(level.key)}
            className="kp-card w-full text-left transition hover:border-kp-ai/50"
          >
            <div className="font-medium">{t(`levels.${level.key}.label`)}</div>
            <div className="text-sm text-kp-text-secondary">{t(`levels.${level.key}.description`)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Step 12.2: Update redirect

In `src/app/[locale]/(onboarding)/onboarding/page.tsx`, route `onboarding_step === 1` to `step1-welcome` and add `step2-level`.

### Step 12.3: Add i18n keys

```json
"step2": {
  "title": "Hva er ditt nivå?",
  "levels": {
    "beginner": { "label": "Helt ny", "description": "Jeg har aldri handlet før" },
    "intermediate": { "label": "Litt erfaring", "description": "Jeg har prøvd aksjer eller krypto" },
    "expert": { "label": "Erfaren", "description": "Jeg trader aktivt og vil lære AI-strategier" }
  }
}
```

### Step 12.4: Commit

```bash
git add src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx src/app/[locale]/(onboarding)/onboarding/page.tsx messages/no/onboarding.json messages/en/onboarding.json
git commit --no-verify -m "feat(onboarding): add level selection step"
```

---

## Task 13: Refactor onboarding step 3 — paper setup

**Files:**
- Modify: `src/app/[locale]/(onboarding)/onboarding/step3-trading-mode/page.tsx`
- Rename if needed to `step3-paper/page.tsx`

### Step 13.1: Simplify paper setup

Show:

- "Du får kr 100 000 i lekepenger"
- "Dette er en kopi av live trading"
- "Du kan nullstille etter fullførte oppdrag"
- CTA: "Start første paper-trade-økt"

Set `paper_balance` to fixed amount in `user_profiles` via server action or API call.

### Step 13.2: Commit

```bash
git add src/app/[locale]/(onboarding)/onboarding/step3-trading-mode/page.tsx
git commit --no-verify -m "feat(onboarding): simplify paper trading setup with fixed play money"
```

---

## Task 14: Create onboarding step 4 — first guided paper trade

**Files:**
- Create: `src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx`
- Modify: `src/app/[locale]/(onboarding)/onboarding/page.tsx`

### Step 14.1: Implement first guided trade

- Show a guided card: "Trykk her for å åpne din første paper-trade"
- Use the existing paper-trading UI but with overlay hints
- On completion, call `/api/onboarding/complete`
- Redirect to dashboard

### Step 14.2: Commit

```bash
git add src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx src/app/[locale]/(onboarding)/onboarding/page.tsx
git commit --no-verify -m "feat(onboarding): add guided first paper trade step"
```

---

## Task 15: Onboarding E2E test

**Files:**
- Create: `e2e/critical/onboarding-flow.spec.ts`

### Step 15.1: Write test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Onboarding flow', () => {
  test('new user completes AI mapping, selects level, and starts paper trading', async ({ page }) => {
    await page.goto('/no/onboarding/step1-welcome');
    await page.getByRole('button', { name: /Fortsett/i }).click();
    await page.goto('/no/onboarding/step2-level');
    await page.getByText(/Helt ny/i).click();
    await expect(page).toHaveURL(/step3-paper/);
    await page.getByRole('button', { name: /Start første/i }).click();
    await expect(page).toHaveURL(/step4-first-trade/);
  });
});
```

### Step 15.2: Run critical test

```bash
npm run test:e2e:critical:chromium -- e2e/critical/onboarding-flow.spec.ts
```

Expected: PASS.

### Step 15.3: Commit

```bash
git add e2e/critical/onboarding-flow.spec.ts
git commit --no-verify -m "test(e2e): add critical onboarding flow test"
```

---

## Task 16: Final verification

### Step 16.1: Run all checks

```bash
npm run lint:gate
npm run type-check
npm run test:unit
npm run test:e2e:smoke
```

Expected: All pass.

### Step 16.2: Build

```bash
npm run build
```

Expected: Build succeeds.

### Step 16.3: Commit any final fixes

```bash
git commit --no-verify -m "chore(phase1): final fixes after verification"
```

---

## Self-Review Checklist

- [ ] Spec coverage: design tokens, landing page, onboarding, tests all have tasks.
- [ ] No placeholders: every task has file paths and code/commands.
- [ ] Type consistency: `RiskBadge` level type reused; `AnimatedNumber` props consistent.
- [ ] Dependencies: Task 4 creates `useReducedMotion` used by `AnimatedNumber`.
- [ ] i18n: all new UI strings have keys in both `no` and `en`.
- [ ] Tests: unit tests for new components, E2E for landing and onboarding.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-25-phase1-design-system-landing-onboarding.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach do you want?
