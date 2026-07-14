# CI/CD Optimaliseringsplan — Self-hosted runners

> **For Hermes:** Vurder og implementer den raskeste veien til fungerende CI.

**Mål:** Få CI/CD til å fungere igjen uten GH-betaling, med minimalt oppsettstid

**Status per nå:**
- GH Actions suspendert (payment failed)
- Self-hosted Windows-runner installert på PC (online, men bash fungerer ikke optimalt)
- WSL Ubuntu installert på PC (ikke konfigurert)
- Health fix deployet til produksjon (02:54)

---

## Alternativer — vurdert som lead arkitekt

### Alternativ A: Self-hosted runner i WSL Ubuntu (PC)
**Tid: ~15 min** | **Full Ubuntu-kompabilitet** | **Krever config**

`ssh suxno wsl -d Ubuntu` → installere runner → konfigurere → starte

**Pro:** 100% kompatibelt med alle workflows (ubuntu-latest)
**Con:** Krever apt-get install av curl/jq/node; SSH via WSL kan være tregt

### Alternativ B: Self-hosted runner på Mac (denne maskinen)
**Tid: ~2 min** | **Allerede klar** | **Ingen ekstra installasjon**

```
gh runner register --url https://github.com/tajlive/KP --name klarpakke-mac
```

**Pro:** Raskest å sette opp, alle verktøy finnes (Node, curl, git, bash)
**Con:** 8GB RAM, deler ressurser med Hermes + dev server

### Alternativ C: Fikse GH billing
**Tid: ~5 min** | **Krever kort/betaling**

Gå til GitHub Settings → Billing → Oppdater betalingsinfo

**Pro:** Ingen endringer i workflow, ubuntu-latest fungerer som før
**Con:** Krever at du logger inn og betaler

---

## Anbefaling: Alternativ B + A (raskest nå, best senere)

**Steg 1 (nå — 2 min):** Registrer Mac som self-hosted runner
→ CI kjører umiddelbart

**Steg 2 (senere — 15 min):** Konfigurer WSL-runner på PC
→ Tung CI (E2E, builds) flyttes til PC

---

## Implementeringsplan

### Task 1: Registrer Mac som self-hosted runner

**Step 1:** Hent registration token

```bash
curl -s -L -X POST "https://api.github.com/repos/tajlive/KP/actions/runners/registration-token" \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $(gh auth token)" \
  -H "X-GitHub-Api-Version: 2022-11-28"
```

**Step 2:** Last ned og konfigurer runner

```bash
cd /Users/taj && mkdir -p actions-runner && cd actions-runner
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-osx-arm64-2.322.0.tar.gz
tar xzf runner.tar.gz
./config.sh --url https://github.com/tajlive/KP --token <TOKEN> --name klarpakke-mac --unattended
```

**Step 3:** Installer som service

```bash
./svc.sh install
./svc.sh start
```

**Step 4:** Verifiser

```bash
curl -s "https://api.github.com/repos/tajlive/KP/actions/runners" \
  -H "Authorization: Bearer $(gh auth token)" | jq '.runners[] | {name, status, os}'
```

### Task 2: Oppdater pre-merge-gates.yml til å bruke self-hosted

**Fil:** `.github/workflows/pre-merge-gates.yml`

```yaml
runs-on: self-hosted
```

Dette er den viktigste workflowen — den blokkerer merge hvis lint/E2E feiler.

### Task 3: Test med health-monitor

Trigge `Health Monitor` workflow → verifiser at den kjører på Mac-runneren.

---

## Verifikasjon

```bash
# Sjekk at runner er online
gh api repos/tajlive/KP/actions/runners --jq '.runners[] | "\(.name): \(.status)"'

# Trigger en test-workflow
gh workflow run "Health Monitor" --ref main
sleep 30
gh run view --json status,conclusion
```

## Fallback

Hvis Mac-runneren har minneproblemer:
- Installer runner i WSL Ubuntu på PC (Alternativ A)
- Eller fiks GH billing (Alternativ C)
