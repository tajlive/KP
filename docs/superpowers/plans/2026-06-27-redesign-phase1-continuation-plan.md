# Redesign Phase 1 — Continuation Plan (2026-06-27)

## Current Status

The `redesign-phase1` branch has been merged into `main`. Most of the Phase 1 scope from the design spec and the two implementation plans is already in place.

### Completed
- **Design tokens:** `SEMANTIC_COLORS` added to `src/lib/design/tokens.ts`; CSS variables in `src/styles/kp-tokens.css`; dark mode default in `src/app/globals.css`.
- **Theme:** `ThemeProvider` and `theme-script` default to dark.
- **Shared UI primitives:** `RiskBadge`, `AnimatedNumber`, `LivePill` created, each with unit tests.
- **Button variants** updated with token-based colors in `src/shared/ui/button.tsx`.
- **Landing page composition** rebuilt in `src/app/[locale]/page.tsx` with `SanityHeroSection`, `LiveMarketStrip`, `DemoWidget`, `TrustStrip`, `FeaturesBentoGrid`, `ThreeSteps`, `SanityFAQSection`, `StickyCTA`.
- `LiveMarketStrip` integrated with `AnimatedNumber`, `LivePill`, and sparklines.
- **Onboarding 5-step flow** implemented:
  - `step1-welcome` with `AIMappingChat`
  - `step2-level` with AI-recommendation logic
  - `step3-trading-mode` with paper balance setup
  - `step4-first-trade` with guided BTC paper trade
  - `step5-complete` with dashboard CTA
- **API route** `src/app/api/onboarding/first-paper-trade/route.ts`.
- **Onboarding layout and redirect page** updated for 5 steps.
- **i18n keys** added to `messages/no/onboarding.json` and `messages/en/onboarding.json`.
- **E2E tests:** `e2e/landing/landing-redesign.spec.ts` and `e2e/critical/onboarding-redesign.spec.ts`.

### Remaining Gaps / Issues Identified
1. **Broken mobile CTA link:** `StickyCTA` links to `/velkommen`, which no longer exists. It should go to `/[locale]/onboarding/step1-welcome`.
2. **Onboarding shell not using new tokens:** `OnboardingLayout` still uses `bg-slate-50 dark:bg-slate-950` and a hardcoded `bg-blue-600` progress bar; should use `--kp-bg-primary`, `--kp-text-primary`, `--kp-ai`.
3. **Step 5 complete page styling drift:** Uses old Tailwind colors (`green-100`, `blue-50`, `slate-900`) instead of Nordic Trust tokens.
4. **Legacy worktree cleanup:** `.worktrees/redesign-phase1` still exists after merge; should be removed.
5. **Quality verification pending:** `lint:gate`, `type-check`, unit tests, E2E smoke, and Lighthouse have not been confirmed green for the merged state.

---

## Next 5 Concrete Implementation Tasks

### Task 1: Fix `StickyCTA` mobile link and colors
**Files:**
- `src/features/landing/StickyCTA.tsx`

**Changes:**
- Replace hardcoded `/velkommen` with a locale-aware link to `/[locale]/onboarding/step1-welcome`.
- Replace hardcoded colors with token classes.
- Ensure touch target remains ≥ 48 px.

**Verification:**
```bash
npm run type-check
```

**Commit message:**
```
fix(landing): correct StickyCTA href and apply Nordic Trust tokens
```

---

### Task 2: Apply Nordic Trust tokens to onboarding layout
**Files:**
- `src/app/[locale]/(onboarding)/onboarding/layout.tsx`

**Changes:**
- Replace slate/blue colors with `--kp-*` token classes.
- Keep Logo and redirect logic unchanged.

**Verification:**
```bash
npm run type-check
```

**Commit message:**
```
style(onboarding): apply Nordic Trust tokens to onboarding shell
```

---

### Task 3: Redesign step 5 complete page with new tokens and reduced-motion guard
**Files:**
- `src/app/[locale]/(onboarding)/onboarding/step5-complete/page.tsx`

**Changes:**
- Replace old Tailwind colors with token-based colors.
- Use `Card`, `AnimatedNumber`, and `Button` from `@/shared/ui`.
- Wrap confetti `animate-ping` effect in a `prefers-reduced-motion` guard.
- Keep success icon, paper-balance summary, feature list, and dashboard CTA.

**Verification:**
```bash
npm run type-check
npm run test:unit
npm run test:e2e:critical:chromium -- e2e/critical/onboarding-redesign.spec.ts
```

**Commit message:**
```
feat(onboarding): apply Nordic Trust tokens and motion guard to step 5 complete
```

---

### Task 4: Remove merged `redesign-phase1` worktree
**Files:**
- `.worktrees/redesign-phase1` (directory)

**Changes:**
```bash
git worktree remove .worktrees/redesign-phase1
git worktree prune
```

**Verification:**
```bash
git worktree list
```
Expected: only the main worktree remains.

**Commit message:**
```
chore(git): remove merged redesign-phase1 worktree
```

---

### Task 5: Run full quality gate and Lighthouse baseline
**Commands:**
```bash
npm run type-check
npm run test:unit
npm run test:e2e:smoke
npm run test:e2e:critical:chromium -- e2e/critical/onboarding-redesign.spec.ts
npm run test:lighthouse:mobile
```

**Changes:**
- Fix any new lint/type/test/Lighthouse regressions surfaced by the gate.
- Target: Lighthouse mobile score ≥ 90 on landing, 0 WCAG 2.1 AA violations, all tests green.

**Commit message:**
```
chore(phase1): quality gate fixes after redesign merge
```

---

## Files Needing Changes (summary)
- `src/features/landing/StickyCTA.tsx`
- `src/app/[locale]/(onboarding)/onboarding/layout.tsx`
- `src/app/[locale]/(onboarding)/onboarding/step5-complete/page.tsx`
- `.worktrees/redesign-phase1` (cleanup)
- Additional files surfaced by the quality gate run in Task 5.

---

## Testing Strategy

### Unit tests
- **Existing coverage:**
  - `src/shared/ui/__tests__/RiskBadge.test.tsx`
  - `src/shared/ui/__tests__/AnimatedNumber.test.tsx`
  - `src/shared/ui/__tests__/LivePill.test.tsx`
  - `src/lib/design/__tests__/tokens.test.ts`
- **Run:** `npm run test:unit`
- **Expected:** PASS.

### E2E / smoke
- **Existing specs:**
  - `e2e/landing/landing-redesign.spec.ts`
  - `e2e/critical/onboarding-redesign.spec.ts`
- **Run:**
  ```bash
  npm run test:e2e:smoke
  npm run test:e2e:critical:chromium -- e2e/critical/onboarding-redesign.spec.ts
  ```
- **Expected:** PASS.

### Visual / Lighthouse
- **Run:**
  ```bash
  npm run test:lighthouse:mobile
  ```
- **Targets from design spec:**
  - Landing mobile Lighthouse score ≥ 90.
  - < 150 kB critical JS on landing.
  - No WCAG 2.1 AA violations.

### Accessibility
- Landing spec already runs Axe with `wcag2a`, `wcag2aa`, `wcag21aa`.
- Onboarding pages should be manually checked for focus order, visible focus rings, `aria-live` usage, and color contrast.

---

## Success Criteria
- [ ] `StickyCTA` links to a valid onboarding route on mobile.
- [ ] Onboarding layout and step 5 use Nordic Trust tokens consistently.
- [ ] Legacy `redesign-phase1` worktree removed.
- [ ] `npm run lint:gate`, `npm run type-check`, `npm run test:unit` all green.
- [ ] E2E smoke and critical onboarding tests pass.
- [ ] Lighthouse mobile landing score ≥ 90 with 0 critical accessibility issues.
