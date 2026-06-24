# Automatiske oppdateringer

**Sist oppdatert:** 2026-06-24

Dette dokumentet beskriver de automatiske oppdateringsmekanismene for prosjektet.

## 1. npm-avhengigheter — Dependabot

Konfigurasjon: `.github/dependabot.yml`

- **Patch/minor:** Gruppert i én PR (`production-patch-minor`).
- **Major:** Egen PR per major-sprang (`production-major`). Major-oppdateringer krever manuell QA før merge.
- **Development dependencies:** Egen gruppe som inkluderer patch, minor og major.
- **GitHub Actions:** Egne PR-er for action-oppdateringer.
- **ESLint-major er ignorert** inntil `eslint-plugin-react` / `eslint-plugin-import` støtter ESLint 10.
- Kjører mandag morgen kl. 08:00 Europe/Oslo.

## 2. KIMI Code CLI og MemPalace

Globale verktøy som ikke er npm-avhengigheter i repoet oppdateres via
`scripts/update-tools.sh`.

### Manuell bruk

```bash
npm run tools:check      # sjekk om nye versjoner finnes
npm run tools:update     # installer nye versjoner lokalt
```

### Automatisk lokal oppdatering

En ukentlig cron-jobb er installert (mandag 08:00). Den kjører
`scripts/update-tools.sh`, som:

1. Sjekker siste versjon fra npm (KIMI Code CLI) og PyPI (MemPalace).
2. Installerer oppdateringer hvis tilgjengelig.
3. Oppdaterer `.tool-versions` med de nye versjonene.

Installer cron på nytt med:

```bash
npm run tools:install-cron
```

### GitHub Actions-oppslag

`.github/workflows/tool-updater.yml` kjører ukentlig og:

1. Sjekker etter nye versjoner.
2. Kjører en test-oppdatering i runneren.
3. Oppretter en PR med oppdatert `.tool-versions` hvis nye versjoner finnes.

> **Merk:** PR-en oppdaterer kun repoets versjonsfil. Lokal installasjon må
> fortsatt kjøres via `npm run tools:update` etter merge.

## 3. Versjonsstatus

Aktive versjoner (fra `.tool-versions`):

```text
kimi-code 0.19.2
mempalace 3.5.0
```

## 4. Huskeliste ved feil

- Dersom `mempalace --version` krasjer etter oppdatering, nedgrader med:
  `pip install mempalace==<forrige-versjon>`.
- Dersom `kimi --version` viser gammel versjon, sjekk at `~/.local/bin` eller
  npm-global bin er først i `PATH`.
- GitHub Actions-versjonen av oppdatereren avhenger av at phantom-workflow-problemet
  (issue #94) er løst før den kan kjøre.
