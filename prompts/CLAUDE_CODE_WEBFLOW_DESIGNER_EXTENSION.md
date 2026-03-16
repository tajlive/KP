# Claude Code Prompt: Webflow Designer Extension (Klarpakke Scaffolder)

Du er Claude Code (programmeringsagent). Implementer en Webflow **Designer Extension** som automatiserer opprettelse/oppdatering av sider og DOM-ankere (IDs + `data-*`) for Klarpakke.

Repo: https://github.com/tajlive/KP

## Mål
Bygg en extension som teamet kan kjøre i Webflow Designer for å:
1) Opprette manglende sider (Phase 1 MVP) og 2) “repair” eksisterende sider ved å legge inn manglende ankere, uten å ødelegge design.

## Viktig kontekst / source of truth
- Kontraktfil: `webflow/contract/klarpakke-pages.v1.json`
- Runbook: `docs/WEBFLOW-DESIGNER-EXTENSION-AUTOMATION.md`
- One-click deploy: `docs/ONE-CLICK-DEPLOY.md`

## Krav (MÅ)
- Idempotent: Kjøring flere ganger skal ikke duplisere ankere eller endre eksisterende design.
- Design-preserving default: Ikke flytt/erstatt eksisterende elementer; kun legg til ankere hvis de mangler.
- Rapport: Vis en “Run report” i extension UI (created/updated/skipped/failed per side).
- Ingen secrets i repoet: ikke hardcode tokens/keys.

## Funksjonalitet

### A) Create/Repair MVP Pages
Sider:
- `/` (Home)
- `/signup` (Signup)
- `/app/dashboard` (Dashboard)
- `/app/settings` (Settings)
- `/app/kalkulator` (Kalkulator)

For hver side, sørg for at alle anchors i kontrakten finnes:
- `/app/dashboard`: må ha et element med `data-signals-container`
- `/app/settings`: må ha `data-safe-mode-toggle`, `data-safe-mode-status`, `data-safe-mode-info`
- Root containers (id `klarpakke-*-root`) må eksistere

### B) Kontraktdrevet
- Les `webflow/contract/klarpakke-pages.v1.json` og bruk den som eneste kilde til hva som skal lages.
- Implementer en liten “resolver” som finner om et anchor finnes (f.eks. query for id eller data-attr), og oppretter hvis mangler.

### C) Repo-endringer
Legg til ny mappe:
- `apps/webflow-designer-extension/`

Innhold:
- minimal UI (React eller vanilla)
- en “Run” knapp
- en service-layer som bruker Webflow Designer API til å create pages og elementer

Legg til scripts:
- `npm run designer:ext:dev` (starter dev)
- `npm run designer:ext:build`

Oppdater docs:
- `docs/WEBFLOW-DESIGNER-EXTENSION-AUTOMATION.md` med install/run steps
- `docs/ONE-CLICK-DEPLOY.md` hvis nødvendig

## Leveranse
- En extension som kan kjøres i Webflow Designer og gjennomfører Create/Repair for alle sider i kontrakten.
- Oppdatert dokumentasjon.

## Sjekkliste før ferdig
- Kjør `npm run build` og `npm run lint` uten feil.
- Legg til et “dry-run” mode i UI (viser hva som ville blitt gjort).
- Logg feilhåndtering tydelig (hvilken side/anker feilet).

Start med å:
1) Lage folderstruktur og package.
2) Implementere kontrakt-parser.
3) Implementere Create/Repair for én side (Dashboard) som proof.
4) Utvide til resten.
