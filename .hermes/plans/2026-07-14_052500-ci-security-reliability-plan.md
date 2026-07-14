# CI/CD Sikkerhet og Pålitelighet — Tilleggsplan

> **For Hermes:** Implementer i rekkefølge. Sikkerhet først, så pålitelighet.

**Mål:** Gjør self-hosted runner oppsettet sikkert og robust for produksjon

---

## 🔴 Sikkerhet — PR-godkjenning (kritisk)

**Risiko:** Public repo → hvem som helst kan åpne PR med ondsinnet kode som kjører på PC-en din.

### Task 1: Krev godkjenning for PRs fra utenforstående

**Steg 1:** Gå til GitHub → Settings → Actions → Runners → `klarpakke-wsl` → Slå på:
```
☑ Require approval for all outside collaborators
```

**Steg 2 (backup):** Legg til en `if`-sjekk i kritiske workflows:

```yaml
jobs:
  build:
    if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository
    runs-on: self-hosted
    steps:
      - name: Require approval for fork PRs
        run: |
          echo "⚠️ PR fra fork — må godkjennes manuelt"
          exit 1
```

**Verifikasjon:** Åpne en test-PR fra en fork → workflow skal vente på godkjenning.

---

## 🟡 Pålitelighet — PC må være våken

### Task 2: Automatisk WSL-oppstart ved PC boot

WSL starter ikke automatisk når Windows booter. Må fikses.

**Alternativ A (enklest):** Legg til WSL-start i eksisterende `DevServer` scheduled task.

```bash
ssh suxno cmd /c "schtasks /create /tn WSLRunner /tr \"wsl -d Ubuntu -e bash -c 'cd ~/actions-runner && sudo ./svc.sh start'\" /sc onstart /ru taj /rl highest /f"
```

**Alternativ B (bedre):** Legg til i oppstartsmappen:

```powershell
# Legg til WSL-start i Windows Startup
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\WSL-Runner.lnk")
$shortcut.TargetPath = "wsl.exe"
$shortcut.Arguments = "-d Ubuntu -e bash -c 'cd ~/actions-runner && sudo ./svc.sh start'"
$shortcut.Save()
```

---

### Task 3: Runner watchdog på Mac

Hvis PC-en går i dvale, oppdager vi det på Mac.

**Fil:** `.hermes/scripts/runner-watchdog.sh` (eller cron på Mac)

```bash
#!/bin/bash
# Sjekk hvert 5. minutt om PC-runner er online

RUNNER_STATUS=$(curl -s "https://api.github.com/repos/tajlive/KP/actions/runners" \
  -H "Authorization: Bearer $(gh auth token)" | \
  python3 -c "import json,sys; rs=json.load(sys.stdin).get('runners',[]); [print(r['name'],r['status']) for r in rs if 'wsl' in r['name']]")

if echo "$RUNNER_STATUS" | grep -q "offline"; then
  echo "⚠️ WSL-runner er offline!"
  # Send varsel (Sentry / Slack / desktop notification)
fi
```

**Kjør som cron:** `*/5 * * * * bash .hermes/scripts/runner-watchdog.sh`

---

### Task 4: Mac som fallback-runner

PC = primary, Mac = backup. Workflow prøver PC først.

**Legg til runner på Mac:** `runs-on: [self-hosted, linux, mac-fallback]`

**Workflow-label-strategi:**

```yaml
# pre-merge-gates.yml — primært PC, fallback Mac
runs-on: [self-hosted, linux]

# health-monitor.yml — kan kjøre hvor som helst
runs-on: [self-hosted, linux, mac-fallback]
```

---

### Task 5: Rydd opp Windows-native runner

Når WSL-runner fungerer, fjern den Windows-native som ikke kjører bash.

```bash
# Finn runner ID
gh api repos/tajlive/KP/actions/runners --jq '.runners[] | select(.name=="klarpakke-pc") | .id'

# Slett
gh api -X DELETE repos/tajlive/KP/actions/runners/<ID>
```

---

## Verifikasjonsplan

| # | Sjekk | Hvordan |
|---|-------|---------|
| 1 | Runner online | `gh api repos/tajlive/KP/actions/runners --jq '.runners[] \| {name, status}'` |
| 2 | Workflow kjører | `gh workflow run "Health Monitor" --ref main && sleep 30 && gh run view --json status,conclusion` |
| 3 | Sikkerhet | Åpne PR fra fork → venter på godkjenning |
| 4 | PC restart | Start PC på nytt → runner kommer opp automatisk innen 2 min |
| 5 | Mac fallback | Slå av PC → workflow skal kjøre på Mac |

---

## Prioritert rekkefølge

1. 🔴 **Task 1** — Godkjenning for PRs (sikkerhet, gjøres i GitHub UI)
2. 🟡 **Task 2** — Auto-start ved boot (når WSL-runner er klar)
3. 🟡 **Task 5** — Rydd opp Windows-runner
4. 🟢 **Task 4** — Mac fallback (når tid)
5. 🟢 **Task 3** — Watchdog (nice-to-have)
