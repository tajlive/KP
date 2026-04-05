# Klarpakke: Tech Stack & Struktur (kort oppsummering)

## Teknologistack
- Runtime: Node.js med `type: "module"` og `"name": "klarpakke-universitet"` i `package.json`.
- Framework: Next.js (scripts: `next dev`, `next build`, `next start`), TypeScript med `tsconfig.json`.
- Frontend: React med `@headlessui/react`, `@radix`‑komponenter, `@hookform/resolvers` (React Hook Form).
- Testing: Vitest (`test:unit`, `test:coverage`), Playwright for E2E (`test:e2e*`, `allure`‑rapporter).
- Infra: Vercel‑deploy, Supabase‑funksjoner, gcloud‑run, `supabase db push`‑arbeidsflyt.

## Prosjektstruktur (viktigste)
- `src/`: TypeScript‑koden, pages‑komponenter og server‑komponenter.
- `components/`: UI‑komponenter.
- `scripts/`: Automatisering, deploy‑scripts, MCP‑integrasjon, verifikasjon, Supabase‑styring.
- `tests/` og `e2e/`: Vitest og Playwright‑tester, `full-e2e.sh`‑scripts.
- `docs/` og `docs/trading/`: Dokumentasjon, arkitektur, TRADING‑AUTH‑rekonfigurering.
- `playwright/` og `playwright-report/`: Playwright‑konfigurasjoner og rapporter.
- `logs/` og `reports/`: Produserte logg‑ og rapportfiler.

## Kritiske launch‑risiko‑punkter
- Komplesse script‑flyter: Mange `db:*`‑, `signals:*`‑, `test:*`‑ og `verify:*`‑scripts, som kan bli vanskelige å overvåke og feilsøke.
- Test‑gaps: Enkelte `test:full:*`‑skript kan være ressurs‑krevende og potensielt ustabile under high‑load.
- Konfigurasjons‑duplikater: Multiple `package.json`‑filer i `archive/`, `archive/klarpakke-mcp` osv., kan føre til avvik og feilaktig deployment.
- Drifts‑skript‑avhengighet: `deploy`‑skriptene og `gcloud run`‑kallene er sensitivt for env‑variabler og region‑konfigurasjon; feil her kan stoppe hele produsjonen.
