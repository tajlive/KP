# GitHub PR-automatisering

Varig løsning for å automatisere Pull Request-opprettelse og -oppdatering.

---

## 1. Automatisk PR ved push (GitHub Action)

**Workflow:** `.github/workflows/auto-create-pr.yml`

**Trigger:** Push til branches som matcher:
- `cursor/*`
- `feat/*`
- `fix/*`
- `chore/*`

**Hva skjer:** Hvis ingen PR finnes for branchen, opprettes en ny PR mot `main` med:
- Tittel avledet fra branchenavn (f.eks. `cursor/auto-trade-fix` → «Auto trade fix»)
- Body fra `.github/pull_request_template.md`

**Krever:** Ingenting – bruker `GITHUB_TOKEN` som er tilgjengelig i alle Actions.

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

Cursor Cloud-agenter bruker **ManagePullRequest**-verktøyet til å opprette og oppdatere PR-er. Kombinert med `auto-create-pr`-workflow:

- Agent pusher til `cursor/feature-x`
- Workflow oppretter PR automatisk (hvis ingen finnes)
- Agent kan deretter oppdatere PR med ManagePullRequest

---

## 4. Branch-navngivning

For at auto-create-pr skal kjøre, bruk ett av disse prefiksene:

| Prefix   | Eksempel                    |
|----------|-----------------------------|
| `cursor/` | cursor/auto-trade-fix      |
| `feat/`  | feat/add-dark-mode         |
| `fix/`   | fix/login-redirect         |
| `chore/` | chore/update-deps          |

---

## 5. Deaktivering

For å slå av auto-opprettelse av PR:

- I `.github/workflows/auto-create-pr.yml`: legg til `if: false` på jobben, eller
- Slett/disable workflow-filen

---

## Se også

- [GITHUB_SETUP.md](../.github/GITHUB_SETUP.md) – Full GitHub-oppsett
- [pull_request_template.md](../.github/pull_request_template.md) – PR-mal
