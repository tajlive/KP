# KLA-229 + avhengighetsrutine (typer, patch/minor, Snyk)

**Linear:** [KLA-229](https://linear.app/klarpakke/issue/KLA-229/regenerer-supabase-typer-og-reduser-as-any) — regenerer Supabase-typer og reduser `as any`.

## 1. Regenerer typer (etter migrasjon / skjemaendring)

```bash
# Krever Supabase CLI + tilgang (login eller service role i miljø)
npm run db:gen-types
npm run type-check
# Fiks eventuelle nye feil; unngå permanente as any — bruk genererte typer eller små hjelpertyper
```

Output: `src/types/supabase-generated.ts`  
Se også [`src/lib/supabase/TYPE_DEBT.md`](../src/lib/supabase/TYPE_DEBT.md) og [`docs/TYPE-DEBT-ROADMAP-2026.md`](TYPE-DEBT-ROADMAP-2026.md).

## 2. Patch / minor innenfor semver

| Mekanisme                                 | Formål                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Dependabot** (`.github/dependabot.yml`) | Månedlige patch/minor-grupper; major ignorert.                                                       |
| **Lokalt / ved behov**                    | `npm run deps:update-lockfile` deretter `npm run deps:verify`.                                       |
| **CI**                                    | Workflow **Dependency Check** kjører `npm update` + `deps:verify` månedlig for å fange brudd tidlig. |

Major (f.eks. Next 15→16) gjøres **manuelt** med plan — se [`docs/NEXT-16-UPGRADE-PLAN.md`](NEXT-16-UPGRADE-PLAN.md).

## 3. Snyk (kun CI, ikke `package.json`)

- **`snyk` er ikke** lenger devDependency — unngår transitive `global-agent` / deprecated `boolean` i `npm ci` (f.eks. Vercel).
- **GitHub Actions:** workflow **Security Audit** (mandag) kjører `npx --yes snyk@latest test` når secret **`SNYK_TOKEN`** er satt.
- Opprett token: [Snyk account](https://app.snyk.io/) → legg i repo **Settings → Secrets → Actions**.

## 4. Månedlig sjekk (menneske)

1. `git pull` → `npm ci` → `npm run deps:update-lockfile` → `npm run deps:verify` → commit lockfile hvis endret og tester grønne.
2. Etter DB-endringer: `npm run db:gen-types` + commit typer.

_Oppdatert mars 2026._
