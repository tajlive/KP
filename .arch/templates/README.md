# Arch Templates

Dato: 2026-08-12 · Status: struktur etablert (F1), innhold i F2

## Hensikt

Mal-bibliotek som Project Factory v2.0 bruker når den scaffolder nye prosjekter.
Kunnskapen fra `knowledge/` blir nedfelt i maler slik at neste prosjekt arver
standarder automatisk.

## Planlagte maler (F2)

- `repo/` — repo-mal (README, .gitignore, license)
- `ci/` — GitHub Actions-maler (deploy.yml, security-audit.yml, synthetic-monitor.yml)
- `policies/` — policy-maler (git, deploy, secret, knowledge_governance)
- `arch/` — ARCHITECT.md-mal + .arch/-scaffold
- `agents/` — agentrolle-konfig (Hermes/Kimi/Tom)

Ingen maler her ennå — kunnskapsgrunnlaget (F1) må være på plass først, jf. F1-gate.
