# F3 — Referanseimplementasjon: Arch Dashboard (første Factory-genererte prosjekt)

> **Status:** Fullført 2026-08-12. Dette er «fødselsattesten» til Arch som plattform —
> første prosjekt generert **fra null** av Arch Project Factory, ikke håndlaget.

## Hva F3 beviste

F3 skulle svare på fem spørsmål. Fasit:

| Spørsmål                                | Svar  | Bevis                                                                            |
| --------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| Kan Arch opprette et prosjekt fra null? | ✅ Ja | 13 filer scaffoldet til `/Users/taj/arch-dashboard/`                             |
| Fungerer agent-rollene?                 | ✅ Ja | Proposal: Hermes (arkitektur+drift), Codex (implementasjon), Kimi (research)     |
| Fungerer Linear-integrasjonen?          | ✅ Ja | Team `ARC` + prosjekt `arch-dashboard` opprettet via Factory (`--create-linear`) |
| Fungerer Knowledge inheritance?         | ✅ Ja | 4 lessons arvet inn i `.arch/inherited-lessons.md`                               |
| Fungerer governance?                    | ✅ Ja | `--approve`-gate aktiv; Factory deployer/secreter/live ikke                      |

## Livssyklusen som ble kjørt (ingen manuelle opprettelser)

```
1. analyze   node scripts/arch/analyze-project.mjs arch-dashboard --save
             → .arch/proposals/arch-dashboard-proposal.md (Type: Internal Platform)
2. init      node scripts/arch/init-project.mjs arch-dashboard \
               --out /Users/taj/arch-dashboard --approve --create-linear ARC
             → 13 lokale filer + Linear team ARC + prosjekt arch-dashboard
3. verify    Linear: { projects { nodes { name } } } → "arch-dashboard" tilstede (10 prosjekter)
```

## Proposal (sammendrag)

- **Type:** Internal Platform
- **Kompleksitet:** Lav–Medium
- **Stack:** Next.js 16 (App Router, OpenNext → CF Workers) · Supabase · Cloudflare Workers · Linear · GitHub Actions
- **Agenter:** Hermes = arkitektur+drift · Codex = implementasjon · Kimi = research
- **Risiko:** GDPR · secrets (secret://-governance) · API-kostnader
- **Krever Tom approval:** Ja

Full tekst: `.arch/proposals/arch-dashboard-proposal.md`.

## Arvet kunnskap (Knowledge inheritance)

`arch-dashboard/.arch/inherited-lessons.md` — 4 lessons arvet automatisk:

1. Edge-runtime + supabase-js = krasj → `runtime: "nodejs"`
2. Kapital/P&L kun fra `active`/`paused`-sesjoner (fantom-data-guard)
3. Route handlers → `createServerClient(request, response)`
4. wrangler multi-env → `--env ""`

Trading-relaterte lessons ble **korrekt ekskludert** (type-deteksjon: Internal Platform ≠ Trading).

## Arch Health Score (nytt verktøy)

`node scripts/arch/health-score.mjs <katalog>` — deterministisk score på fil-signaler.

| Prosjekt                            | Governance | Secrets | CI/CD | Documentation | Testing | TOTAL     |
| ----------------------------------- | ---------- | ------- | ----- | ------------- | ------- | --------- |
| **Klarpakke** (referanse)           | 100 %      | 100 %   | 100 % | 100 %         | 100 %   | **100 %** |
| **arch-dashboard** (fersk scaffold) | 100 %      | 50 %    | 50 %  | 75 %          | 0 %     | **55 %**  |

Scoren er ærlig: et ferskt scaffold har governance-mal men mangler secrets-mapping,
prosjekt-manifest, og tester. Dette ER hensikten — scoren viser eksakt hva som gjenstår
før prosjektet er produksjonsklart.

## To bugs funnet og fikset under F3

1. **GraphQL-typefeil** — `projectCreate` brukte `$t: ID!` mot `teamIds: [String!]!`.
   Fix: `init-project.mjs` v2.1 bruker `$t: String!`.
2. **Ikke-idempotent init** — `init` aborterte ved eksisterende `.arch/`, så
   Linear-prosjektet kunne ikke opprettes i retry. Fix: v2.1 gjør team-lookup
   idempotent (gjenbruker `ARC`) og hopper over scaffold ved eksisterende `.arch/`.

Dette er selve poenget med F3: Factory ble testet på et **ekte** prosjekt og
avslørte to reelle feil som nå er permanent fikset.

## Hva F3 IKKE gjorde (governance)

- ❌ Opprettet **ingen** GitHub-repo (Tom scoped det ut; `--create-github` er neste governed steg)
- ❌ Deployet ikke noe
- ❌ Opprettet ingen prod-secrets
- ❌ Aktiverte ingen live-tjenester/betaling/trading
- ❌ Bygget ikke selve dashboard-UI-et (det er F3.5 — første issue i arch-dashboard)

## Arch Dashboard — produktvisjon (referanse for F3.5)

`ARCH CONTROL CENTER` — internt kontrollpanel som viser:

- **Projects** (Klarpakke 🟢, kommende kunder)
- **Agents** (Hermes/Codex/Kimi status)
- **Knowledge** (failures/patterns/lessons-telling)
- **Security** (secrets/policies/audit)
- **Arch Health Score** per prosjekt

## Neste steg

- **F3.5** — første Linear-issue i `arch-dashboard` (implementer dashboard-UI), eget repo via `--create-github`
- **F4** — Kundeplattform (inntektsdelen): Ny kunde → analyze → proposal → approval → factory → AI-drevet løsning
- **F5** — Generalisering
