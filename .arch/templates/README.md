# Arch Templates

Dato: 2026-08-12 · Status: struktur etablert (F1), innhold i F2

## Hensikt

Mal-bibliotek som Project Factory v2.0 bruker når den scaffolder nye prosjekter.
Kunnskapen fra `knowledge/` blir nedfelt i maler slik at neste prosjekt arver
standarder automatisk.

## Versjonerte maler (F2 — klare)

| Mal                               | Bruk av Factory                |
| --------------------------------- | ------------------------------ |
| `arch/project.yaml.tmpl`          | `.arch/project.yaml`           |
| `arch/policies.yaml.tmpl`         | `.arch/policies.yaml`          |
| `arch/agents.yaml.tmpl`           | `.arch/agents.yaml`            |
| `arch/secrets-registry.yaml.tmpl` | `.arch/secrets/registry.yaml`  |
| `ci/deploy.yml.tmpl`              | `.github/workflows/deploy.yml` |
| `docs/ARCHITECT.md.tmpl`          | `docs/ARCHITECT.md`            |

Placeholders: `{{NAME}}`, `{{DATE}}` — substitueres av `init-project.mjs`.
Kunnskapen fra `knowledge/` nedfelles i malene, så neste prosjekt arver standarder automatisk.
