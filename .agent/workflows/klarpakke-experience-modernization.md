# Klarpakke: Experience + modernisering + automatisering

**Formål:** Én sammenhengende arbeidsflyt når du vil **forbedre UX/UI/UA**, **modernisere** kode eller **automatisere** rutiner — med Klarpakke-spesifikke agenter.

---

## Når bruke denne flyten

- «Moderniser dashboard», «forbedre brukervennlighet», «sjekk tilgjengelighet»
- «Automatiser Linear/CI/cron» etter større leveranse
- «Premium-audit + teknisk opprydding» i samme omgang

---

## Steg 1 — Scope (5 min)

Velg **ett** primærmål denne runden:

| Mål                                | Hovedagent                                            |
| ---------------------------------- | ----------------------------------------------------- |
| Flyt, navigasjon, skjermopplevelse | `klarpakke-experience-architect`                      |
| WCAG / tastatur / skjermleser      | `klarpakke-accessibility-lead`                        |
| Premium visuell kvalitet per side  | `ux-saas-lead` (+ workflow `premium-design-audit.md`) |
| TYPE_DEBT, Next/React-mønstre      | `klarpakke-modernization-lead`                        |
| CI, MCP, cron, Linear-oppfølging   | `klarpakke-automation-orchestrator`                   |

---

## Steg 2 — Les dokumenter (obligatorisk)

1. `AGENTS.md` — status og regler
2. `docs/design-assessment-2026.md` + `docs/design-konkurranse-analyse-2026.md` (ved UI/UX)
3. `src/lib/design/tokens.ts`
4. `docs/CRON-SOURCE-OF-TRUTH.md` (ved automatisering av tid)
5. `docs/CURSOR-AUTOMATION-PROMPT.md` (ved MCP/CI)

---

## Steg 3 — Utfør i rekkefølge (anbefalt)

1. **Experience Architect** eller **UX SaaS Lead:** liste funn + P0/P1/P2.
2. **Accessibility Lead:** samme sider — tastatur + aria + kontrast.
3. **Frontend / designer:** implementer (tokens, next-intl).
4. **Modernization Lead:** rydde teknisk gjeld som blokkerer (valgfritt, samme PR eller egen).
5. **Automation Orchestrator:** tester + doc + Linear-kommentar.

---

## Steg 4 — Automatiserbar sjekkliste

- [ ] `npm run lint` && `npm run type-check`
- [ ] Nye strenger i `messages/*.json` (no, en, th, zh)
- [ ] Playwright smoke på berørte flows (hvis finnes)
- [ ] Linear oppdatert
- [ ] Ingen nye hemmeligheter i repo

---

## Roster

Se **`.agent/KLARPAKKE-AGENT-ROSTER.md`** for full oversikt og flere forslag til agenter å involvere.
