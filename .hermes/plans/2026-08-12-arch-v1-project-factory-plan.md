# Arch v1.0 — Project Factory + Kundeplattform (implementasjonsplan)

**Dato:** 2026-08-12 · **Forfatter:** Hermes (hovedarkitekt) · **Status:** plan — venter Tom-gjennomgang
**Forutsetning:** Fase 4 (Trello-arkivering) er fullført og arkiv-integritet verifisert. Denne planen
er dokumentasjon — ingen kode/features skrives før Tom godkjenner planen.

---

## 1. Mål

Fra «optimalisere Klarpakke» → «bygge plattformen som lager nye prosjekter automatisk».

**Input:** én setning («AI kundeservice for firma X»).
**Output:** ferdig prosjektstruktur — repo, Linear-team/prosjekt, policies, secret-registry,
agenter, CI/CD, monitoring, dokumentasjon, dashboard — styrt av Arch Control Plane.

## 2. Grunnmur som allerede finnes (verifisert)

| Komponent                     | Status                     | Verdi                                                              |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------ |
| Arch Control Plane (`.arch/`) | ✅ live i Klarpakke        | prosjekt/agents/secrets/environments/policies/decisions/audit-log  |
| Agentroller                   | ✅                         | Hermes=arkitekt, Kimi=drift, Tom=prioritering                      |
| Secret Governance v2          | ✅                         | `.arch/secrets/` registry + scanner (`secret-audit.mjs --json`)    |
| Linear MCP                    | ✅                         | 14 verktøy, audit-logg                                             |
| Alert Layer                   | ✅                         | fingerprint-dedup, Linear-first (KLA-279)                          |
| CI/CD-gates                   | ✅                         | test-gate → deploy → smoke → auto-rollback                         |
| Project Factory-grunnmur      | ✅ `init-project.mjs` v1.1 | scaffolder + `--create-github`/`--create-linear` (dry-run default) |

Klarpakke er allerede **referanseprosjekt #1** — kontrollplanet er bevist i drift.

## 3. Arch Project Factory v1.0

### 3.1 Pipeline (ny idé → ferdig struktur)

```
Ny idé
   │
   ├─ 0. arch project analyze   → arkitektur-forslag (markdown)
   │        │
   │        ▼
   │   Tom godkjenner forslaget
   │        │
   │        ▼
   ├─ 1. arch project init      → scaffold .arch/ + templates
   ├─ 2. GitHub-repo                (gh repo create, --private, arkiv-template)
   ├─ 3. Linear team + prosjekt     (API, key 1–4 tegn, standard-workflow)
   ├─ 4. Policies                   (mal: git-policy, deploy-policy, secret-policy)
   ├─ 5. Secret-registry            (secret://-oppslag, tom registry + .allow)
   ├─ 6. Agenter                    (agentroller-konfig for Hermes/Kimi)
   ├─ 7. CI/CD                      (kopi av deploy.yml-mal, gater + auto-rollback)
   ├─ 8. Monitoring                 (syntetisk + Sentry-webhook → Linear-alerts)
   ├─ 9. Dokumentasjon              (ARCHITECT.md-mal, README, decisions.md)
   └─ 10. Dashboard                 (drifts-oversikt: CI-helse, issues, alerts)
        │
        ▼
   Knowledge tilbake til Arch (læringsløkken)
```

**Arkitektur-review-gate (Tom-korreksjon 2026-08-12):** Før `init` kjører alltid
`arch project analyze` som produserer et arkitektur-forslag. Tom godkjenner forslaget
FØR prosjektet bygges. Ingen prosjekt-opprettelse uten forhåndsgodkjenning.

### 3.2 Governance-regel (viderefører v4.1 §6)

Opprettelse av eksterne ressurser (GitHub-repo, Linear-team) skjer **kun** med
`--create-*`-flagg — og flaggene kjøres **kun når Tom har godkjent prosjektet**.
Dry-run er default. Agenten godkjenner ikke egne risikofylte endringer.

### 3.3 Leveranser

- `scripts/arch/init-project.mjs` → v2.0 (full pipeline, idempotent, dry-run default)
- `templates/` — repo-mal, CI-mal, policy-maler, ARCHITECT-mal
- `arch project list` / `arch project status` — oversikt over alle Arch-prosjekter
- Første skarpe kjøring: ett pilot-prosjekt (ikke Klarpakke) for å bevise pipelinen

## 4. Arch Knowledge Graph (Toms forslag — byggestein #2)

Læringen fra Klarpakke må bli arv for neste prosjekt. Struktur:

```
.arch/
  knowledge/
    ├── decisions/      # godkjente arkitekturbeslutninger (D-*)
    ├── patterns/       # gjenbrukbare løsningsmønstre (fingerprint-dedup, watchdog-pattern)
    ├── failures/       # rotårsak + fiks (QueryClientProvider-krasj, edge-runtime 500)
    ├── customers/      # kundeprofil per prosjekt
    ├── architectures/  # gjeldende arkitektur per prosjekt
    └── lessons/        # «Cloudflare timeout → økte worker timeout + cache → standard i mal»
```

### 4.1 Læringsløkken (viktigste mekanismen)

```
Hermes løser et problem
    │  (root cause + fix + verifisering)
    ├─→ knowledge/failures/<id>.md      (rotårsak, fiks, bevis)
    ├─→ knowledge/patterns/<id>.md      (hvis generaliserbar)
    └─→ templates/ oppdateres            (hvis standard for nye prosjekter)
```

**Mål:** neste `arch project init` arver kunnskapen automatisk — ikke bare strukturen,
men også «slik unngår vi den feilen vi allerede har gjort én gang».

### 4.2 Seed fra Klarpakke (allerede ekstraherbar)

- failures: QueryClientProvider-krasj (dashboard), CF-edge `process.version`-krasj, paper-saldo-inflasjon, Honcho grant-rotasjon
- patterns: fingerprint-dedup alerts, «cron som overvåker cron», secret-resolve read-only
- lessons: Next.js route-handler `createServerClient`, `--env ""`-wrangler, edge→nodejs-regelen

Dette er **ikke** ny informasjon — det er strukturert gjenbruk av det som allerede ligger
i skills + Hermes memory + Honcho. Knowledge Graph gjør det maskinlesbart og prosjekt-arvelig.

## 5. Faseplan

| Fase                          | Innhold                                                    | Gate                                                   |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| **F0 — Bekreftelse**          | Tom godkjenner planen                                      | ✅ godkjent 2026-08-12                                 |
| **F1 — Knowledge Graph**      | `.arch/knowledge/` struktur + seed fra Klarpakke           | seed-filer reviewet (denne fasen — utført)             |
| **F2 — Project Factory v2.0** | `analyze` (ark-forslag) + `init` full pipeline + templates | dry-run på 2 dummy-prosjekt, ingen ekstern side-effekt |
| **F3 — Pilot**                | Én skarp `analyze`→godkjenning→`init` (nytt prosjekt)      | repo + Linear-team + CI grønne, dashboard viser pilot  |
| **F4 — Kundeplattform**       | Dashboard + flerprosjekt-oversikt                          | pilot godkjent av Tom                                  |
| **F5 — Generalisering**       | Alert Layer + CI-maler blir fullt parametrisert            | Klarpakke upåvirket (regresjonstest)                   |

## 6. Risiko og avhengigheter

- **Klarpakke-stabilitet:** Factory-arbeidet er i `scripts/arch/` + templates — rører **ikke**
  app-kode. Klarpakke fortsetter uforstyrret. (Klarpakke = referanseprosjekt, ikke testkanin.)
- **Eksterne side-effekter:** GitHub-repo/Linear-team opprettes kun bak `--create-*` + Tom-godkjenning.
- **Kunnskaps-kvalitet:** Knowledge Graph er verdiløs uten rotårsak-kvalitet — hver entry krever
  bevis (commit SHA, curl-output), aldri antagelser.
- **Avhengighet:** Linear team-key (1–4 tegn) må være ledig; GitHub org-tilgang må være bekreftet.

## 7. Suksesskriterier

1. `arch project init <navn>` (dry-run) produserer komplett struktur uten ekstern side-effekt.
2. Én skarp kjøring gir: repo + Linear-team/prosjekt + CI-grønn + dashboard-kort.
3. Et nytt prosjekt arver ≥3 «lessons» fra Klarpakke automatisk.
4. Klarpakke har 0 regresjoner etter F5.
