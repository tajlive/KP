# Type-gjeld og `ignoreBuildErrors` — veikart (2026)

**Status:** `typescript.ignoreBuildErrors: false` i [`next.config.mjs`](../next.config.mjs) — `npm run type-check` og `next build` feiler på TS-feil.

**Mål (vedlikehold):** Holde `tsc --noEmit` grønn i CI og unngå ny type-gjeld.

**Grunnlag:** [`src/lib/supabase/TYPE_DEBT.md`](../src/lib/supabase/TYPE_DEBT.md)

**Linear (kobling):** KLA-226–KLA-230 (tier/type/sync), KLA-163 (skjema-sync), KLA-91 (markedsplass — ikke blokkerende for type-rensing alene).

---

## Fase 1 — Måling (ingen funksjonell endring)

1. Kjør `npm run type-check` og logg antall feil + topp 5 filer.
2. Legg inn (valgfritt) CI-steg som **kun rapporterer** `tsc` uten å feile bygg — inntil tak er under definert terskel.

## Fase 2 — Modulvis utbedring

| Prioritet | Område                   | Tiltak                                                                                                                   |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1         | Supabase genererte typer | `npm run db:gen-types` etter skjemaendring; reduser `as unknown` — se [KLA-229-DEPS-ROUTINE.md](KLA-229-DEPS-ROUTINE.md) |
| 2         | API routes               | Streng Zod + typed responses (allerede mønster flere steder)                                                             |
| 3         | Komplekse moduler        | `mistake-analyzer`, `binance-historical-data` — del opp eller eksplisitte typer                                          |

## Fase 3 — `ignoreBuildErrors` (fullført)

- Flagget er av; ved nye feil: fiks eller midlertidig `// @ts-expect-error` med Linear-issue — ikke skru `ignoreBuildErrors` på igjen uten eksplisitt beslutning.

## Ansvar

- **Modernisering:** [`.agent/agents/klarpakke-modernization-lead.md`](../.agent/agents/klarpakke-modernization-lead.md)
- **Automatisering etter leveranse:** [`.agent/agents/klarpakke-automation-orchestrator.md`](../.agent/agents/klarpakke-automation-orchestrator.md)

_Oppdatert: mars 2026._
