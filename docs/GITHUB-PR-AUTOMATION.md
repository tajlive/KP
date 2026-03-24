# GitHub PR-automatisering

Hvordan Pull Requests opprettes og oppdateres i dette repoet.

---

## 1. Automatisk PR via GitHub Action (fjernet)

Tidligere fantes `.github/workflows/auto-create-pr.yml`. Den er **fjernet** (arkivert under `.github/workflows-disabled/auto-create-pr.yml`) fordi **GitHub Actions** med standard `GITHUB_TOKEN` ofte **ikke har tillatelse** til å opprette PR (`createPullRequest`), noe som ga en permanent rød sjekk på hver push til `cursor/**`, `feat/**`, osv.

---

## 2. Manuell PR-opprettelse (CLI)

### Via npm

```bash
npm run pr
```

Oppretter eller oppdaterer PR for nåværende branch. Krever [GitHub CLI](https://cli.github.com/) (`gh`) og innlogging: `gh auth login`.

### Via script direkte

```bash
./scripts/create-pr.sh [--title "Tilpasset tittel"]
```

---

## 3. Cursor Cloud / AI-agenter

Cursor Cloud-agenter bruker **ManagePullRequest** til å opprette og oppdatere PR-er etter push. Det er **ingen** separat Actions-workflow som må kjøre for det.

---

## 4. Gjeninnføre auto-create (valgfritt)

Hvis org/repo gir Actions full nok tilgang til å opprette PR, kan du flytte `workflows-disabled/auto-create-pr.yml` tilbake til `.github/workflows/`. Sjekk **Settings → Actions → General → Workflow permissions** og GitHub-dokumentasjon for `GITHUB_TOKEN` og pull requests.

---

## Se også

- [.github/GITHUB_SETUP.md](../.github/GITHUB_SETUP.md) – full GitHub-oppsett
- [pull_request_template.md](../.github/pull_request_template.md) – PR-mal
