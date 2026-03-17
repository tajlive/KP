# Premium design audit

## Purpose

Run a premium design audit across all user-facing pages and key components using the UX SaaS Lead agent. Ensure tokens, one primary CTA per context, Lucide icons, shadows/transitions, tabular-nums, and premium look are applied consistently.

## Steps

1. **Activate agent and read required docs**
   - Activate the UX SaaS Lead agent (`.agent/agents/ux-saas-lead.md`).
   - Read and keep in context:
     - `docs/design-assessment-2026.md`
     - `docs/design-konkurranse-analyse-2026.md`
     - `.cursor/rules/design-ux-premium.md`
     - `src/lib/design/tokens.ts`

2. **List user-facing surfaces**
   - List all user-facing pages from `src/app/[locale]/**/page.tsx`.
   - Identify key layout and shared UI components (e.g. navigation, dashboard shell, cards, buttons).

3. **Run checklist per page/component group**
   - For each page or component group, run the UX SaaS Lead checklist:
     - Tokens used (no ad-hoc hex)
     - Lucide icons, not emojis
     - One primary CTA per context
     - Cards/buttons: shadow + 200–300 ms transition
     - tabular-nums on numbers
     - Premium look (dark theme, glass/border/shadow)

4. **Report findings**
   - For each finding: file/component, issue, and before/after or concrete change suggestion where useful.
   - Group by priority (blocking vs. nice-to-have).
   - Prioritized first run: landing, priser, onboarding, dashboard, paper-trading, handelshistorikk, trade, varsler, konto/innstillinger, akademi.

## Prioritized first run (page order)

1. Landing  
2. Priser  
3. Onboarding  
4. Dashboard  
5. Paper-trading  
6. Handelshistorikk  
7. Trade  
8. Varsler  
9. Konto/innstillinger  
10. Akademi  
