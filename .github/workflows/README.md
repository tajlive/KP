# GitHub Actions Workflows (Arkivert)

> **Status:** Workflows er flyttet til Woodpecker CI (`.woodpecker/`).
> Dette katalogen beholdes kun for historikk og eventuelle fremtidige GitHub-spesifikke hooks.

## Hvor er CI/CD nå?

- **PR-check:** `.woodpecker/pr-check.yml`
- **Deploy:** `.woodpecker/deploy.yml`
- **Arkiverte GitHub Actions:** `.github/workflows/archived/`

## Hvorfor Woodpecker?

Som del av migreringen til selv-hostet infrastruktur (Hetzner + Coolify) kjøres CI/CD
nå i Woodpecker på egen VPS. Dette gir:

- Full kontroll over byggemiljøet
- Ingen GitHub Actions-minutt-grenser
- Sømløs integrasjon med Coolify for deploy

## Aktivere en arkivert workflow (midlertidig)

```bash
cp .github/workflows/archived/<workflow>.yml .github/workflows/
git add . && git commit -m "Re-enable GitHub Actions workflow"
```

## Secrets

Woodpecker henter secrets fra prosjektets secret-store i Coolify/Woodpecker.
Se `docs/SELF-HOSTED-SETUP.md` for detaljer.
