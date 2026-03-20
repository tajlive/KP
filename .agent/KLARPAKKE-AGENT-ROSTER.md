# Klarpakke — agent-roster (Cursor / Antigravity Kit)

Oversikt over **anbefalte agenter** for å optimalisere og modernisere Klarpakke: design (UX/UI), tilgjengelighet (UA), logikk, automatisering og kvalitet.

## Klarpakke-spesifikke (ny / oppdatert)

| Agent                       | Fil                                           | Bruk når                                                  |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| **Experience Architect**    | `agents/klarpakke-experience-architect.md`    | IA, brukerflyt, navigasjon, premium helhet, mobil først   |
| **Accessibility Lead**      | `agents/klarpakke-accessibility-lead.md`      | WCAG 2.1 AA, tastatur, skjermleser, touch, reduced-motion |
| **Modernization Lead**      | `agents/klarpakke-modernization-lead.md`      | Stack, TYPE_DEBT, Next 15 / React 19, refaktor            |
| **Automation Orchestrator** | `agents/klarpakke-automation-orchestrator.md` | CI, MCP, Linear etter leveranse, verify, dokumentasjon    |
| **UX SaaS Lead**            | `agents/ux-saas-lead.md`                      | Premium-sjekkliste per side/komponent                     |
| **UI/UX Designer**          | `agents/ui-ux-designer.md`                    | Visuelt/interaksjon — **Klarpakke tokens** (oppdatert)    |

## Eksisterende — sterke kombinasjoner

| Agent                    | Bruk når                                       |
| ------------------------ | ---------------------------------------------- |
| `automation-expert`      | Cron (Supabase SoT), webhooks, bakgrunnsjobber |
| `devops-engineer`        | GitHub Actions, deploy, secrets                |
| `qa-automation-engineer` | Playwright, testdekning                        |
| `performance-optimizer`  | LCP, TTFB, bundle (Vercel-regler)              |
| `security-auditor`       | RLS, API, headers                              |
| `database-architect`     | Migrasjoner, indekser, Postgres                |
| `explorer-agent`         | Kartlegg ukjent del av repo                    |
| `documentation-writer`   | ADR, api-routes, runbooks                      |

## Arbeidsflyter (workflows)

| Workflow                                          | Formål                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| `workflows/klarpakke-experience-modernization.md` | UX + UA + modernisering + automatisering i én ramme |
| `workflows/premium-design-audit.md`               | Full premium-gjennomgang av sider                   |
| `workflows/test.md` / `workflows/deploy.md`       | Test og deploy                                      |

## Ytterligere forslag (kan tas inn etter behov)

1. **Content & microcopy-agent** — norsk/engelsk konsistens i `next-intl`, tone-of-voice fintech-vennlig.
2. **Trading-UX-liaison** — `crypto-specialist` + `elite-crypto-trader` + Experience Architect for paper/live og risiko-tekster.
3. **i18n-audit-agent** — dedikert pass på `th`/`zh` paritet med `no`/`en`.
4. **Observability agent** — Sentry, strukturerte logger, korrelasjon feil → Linear.
5. **Release train** — ukentlig «merge window» sjekkliste (verify + changelog + Linear).

## Cursor-regel

Kort peker: `.cursor/rules/klarpakke-agent-roster.mdc` (valgfri lasting).

## Dokumentasjon i repo

- `docs/CURSOR-AUTOMATION-PROMPT.md` — hovedagent + MCP + sub-agenter
- `docs/agents/KLARPAKKE-ROSTER.md` — speil av denne filen for de som ikke åpner `.agent/`
