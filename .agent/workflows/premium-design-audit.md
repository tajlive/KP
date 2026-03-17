# Premium design audit – workflow

**Formål:** Kjøre en **premium-audit på tvers av alle brukerrettede sider og knapper** ved hjelp av UX SaaS Lead-agenten. Brukes når bruker ber om f.eks. «premium-audit på alle sider», «designagent på hele appen» eller «vurder sider og knapper mot premium-krav».

---

## Steg 1: Aktiver agent og les docs

1. Aktiver **UX SaaS Lead-agenten** (les `.agent/agents/ux-saas-lead.md`).
2. Les de **påkrevde dokumentene** som er listet i agenten:
   - `docs/design-assessment-2026.md`
   - `docs/design-konkurranse-analyse-2026.md`
   - `.cursor/rules/design-ux-premium.md`
   - `src/lib/design/tokens.ts`

---

## Steg 2: List brukerrettede sider

List relevante sider og layout-komponenter, f.eks.:

- `src/app/[locale]/**/page.tsx` (alle locale-sider)
- Viktige layout-komponenter: MarketingNavigation, DashboardSidebar, DashboardTabs, priser-kort, onboarding-steg.

**Prioriterte sider første runde:**

- Landing: `page.tsx` (forside)
- Priser: `priser/page.tsx`
- Onboarding: `onboarding/` (step1–step5, page)
- Dashboard: `dashboard/page.tsx`
- Paper-trading: `paper-trading/page.tsx`
- Handel: `trade/page.tsx`
- Handelshistorikk: `handelshistorikk/page.tsx`
- Varsler: `varsler/page.tsx`
- Konto/innstillinger: `konto/page.tsx`, `dashboard/settings/page.tsx`
- Akademi og kurs: `akademi/page.tsx`, `kurs/page.tsx`

---

## Steg 3: Kjør sjekkliste per side/komponentgruppe

For hver prioriterte side eller komponentgruppe, kjør agentens sjekkliste:

- Tokens brukt (ikke ad-hoc hex)?
- Lucide-ikoner (ikke emojis)?
- Én tydelig primær CTA per skjerm/seksjon?
- Kort/knapper: skygge, border, 200–300 ms overganger?
- Tall med `tabular-nums`?
- Ser det premium ut (ikke «bare enkelt»)?

---

## Steg 4: Rapporter funn

- **Rapporter** funn med **fil** og **komponent** (ev. linjenummer).
- Gi **konkrete forslag** (f.eks. «Erstatt emoji med Lucide GraduationCap», «Bruk BRAND.primary fra tokens»).
- Inkluder **forhåndsvisningstekst (before/after)** der det er nyttig for å kommunisere endringen.

Etter gjennomgang: prioriter rettelser (høy/medium/lav) og oppdater ev. `docs/implementation-plan-2026.md` eller Linear-oppgaver.
