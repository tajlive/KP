# Klarpakke — AI-agent roster

**Kilde:** `.agent/KLARPAKKE-AGENT-ROSTER.md` (full tekst) og `.agent/agents/*.md`.

## Hurtigvalg

| Mål                                                     | Agent (`.agent/agents/`)                              |
| ------------------------------------------------------- | ----------------------------------------------------- |
| **UX+UI (standard inngang)**                            | **`klarpakke-ux-ui-agent.md`**                        |
| Brukerflyt, IA, premium helhet                          | `klarpakke-experience-architect.md`                   |
| WCAG, tastatur, UA                                      | `klarpakke-accessibility-lead.md`                     |
| Premium per side                                        | `ux-saas-lead.md`                                     |
| Visuell UI (tokens)                                     | `ui-ux-designer.md`                                   |
| Teknisk gjeld / Next / TS                               | `klarpakke-modernization-lead.md`                     |
| CI, MCP, verify                                 | `klarpakke-automation-orchestrator.md`                |
| **Live trading + handler + bevis + ansvar**             | **`klarpakke-live-trading-trades-agent.md`**          |
| **Auto-trade strategier (forskning/tuning/forum+data)** | **`klarpakke-auto-trade-strategy-research-agent.md`** |
| **Auth / OAuth / Sessions**                             | **`.kimi/auth-agent.yaml`** (aktiver: `kimi --agent-file .kimi/auth-agent.yaml`) |
| Cron, webhooks                                          | `automation-expert.md`                                |

## Arbeidsflyt

- `.agent/workflows/klarpakke-experience-modernization.md` — kombinert UX/UI/UA + modernisering + automatisering.
- `.agent/workflows/premium-design-audit.md` — designgjennomgang på tvers av sider.
- `.agent/workflows/auto-trade-strategy-research.md` — auto-trade strategier og presets.

## Cursor

- **Hovedarkitekt:** Cursor Desktop orkestrerer agenter + MCP for optimalisering og leveranse (i tråd med `docs/FULL-AUTOMATION-OPERATING-STANDARD-2026-03.md`).
- **UX/UI-regel (valgfri):** `.cursor/rules/klarpakke-ux-ui-agent.mdc` — matcher `src/components/**`, `src/app/**`
- **Live trading / trades:** `.cursor/rules/klarpakke-live-trading-trades-agent.mdc` — se `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`
- **Auto-trade strategi:** `.cursor/rules/klarpakke-auto-trade-strategy-research-agent.mdc` — `docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md`
- Hovedinstruksjoner: `docs/CURSOR-AUTOMATION-PROMPT.md`
- **Cursor Auto-oppsett (anbefalt):** `docs/agents/CURSOR-AUTO-AGENT-SETUP.md`
- **Bruker- og innstillingspolicy (låst):** `docs/agents/USER-SETTINGS-POLICY.md`
- **Cursor Auto-regel (valgfri):** `.cursor/rules/cursor-auto-agent-setup.mdc`
- Regel: `.cursor/rules/klarpakke-agent-roster.mdc` (peker hit)
- Full automasjon (forhånd): `docs/FULL-AUTOMATION-PLAYBOOK.md` — `npm run auto:preflight`
- Full automasjon (operativ standard 2026-03): `docs/FULL-AUTOMATION-OPERATING-STANDARD-2026-03.md`

## Flere forslag (roadmap)

Se **«Ytterligere forslag»** i `.agent/KLARPAKKE-AGENT-ROSTER.md` (microcopy, i18n-audit, observability, release train).
