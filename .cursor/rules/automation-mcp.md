# Automatisering, MCP/CLI/API og sub-agenter

- **Kontekst først:** Ved større/uklare oppgaver, les AGENTS.md og relevante docs (f.eks. docs/01-ARCHITECTURE.md, docs/MCP-CLI-CI-API.md) før store endringer.
- **Automatisering:** Skript, CI, MCP. Kanonisk forhåndsoppsett: **docs/FULL-AUTOMATION-PLAYBOOK.md**; lokalt: `npm run auto:preflight` / `auto:preflight:full`. Dokumenter nye rutiner i AGENTS.md eller docs/MCP-CLI-CI-API.md. Oppdater Linear automatisk når oppgaver fullføres (status/kommentar).
- **MCP/CLI/API:** Linear (`npm run linear` / MCP), Supabase (MCP eller `db:push`), app-API og `npm run verify`. Ingen hemmeligheter i repo. Ved MCP-feil: prøv på nytt, fall deretter tilbake til CLI og dokumenter det kort.
- **Vercel deploy:** Bruk alltid **Vercel MCP** for deploy (ikke `npx vercel --prod`). Konfig: `url: https://mcp.vercel.com` i .cursor/mcp.json. Verktøy: deploy_to_vercel, list_deployments, osv. Se docs/VERCEL-MCP-CLI.md.
- **Sub-agenter:** Bruk så mange som trengs. explore = kartlegging, generalPurpose = implementering, shell = terminal/CI. Gi alltid tydelig kontekst + krav til output, og bruk parallell oppstart ved uavhengige oppgaver. Oppdater AGENTS.md og Linear etterpå.
- **Tester:** Alltid kjør relevante tester etter kodeendringer (lint; type-check ved type-endringer; e2e/verify ved behov).
- **Dokumentasjon (påkrevd):** Ved nye API-ruter eller endrede env/MCP: oppdater docs/api-routes.md og docs/MCP-CLI-CI-API.md. Oppdater AGENTS.md ved status-/rutineendringer. Full dokumentasjon prioriteres.
- **i18n:** Nye brukertekster skal få oppføring i messages (no/en).
- **Migrasjoner:** Ved feil på `db push`: fiks migrasjonsfilen (idempotens/betingelser) og push på nytt.
- **Yolo:** Ingen bekreftelse nødvendig, inkl. deploy:prod. Etter deploy: kjør verify mot prod før relaterte Linear-issues settes til Done. Full prompt: docs/CURSOR-AUTOMATION-PROMPT.md.
