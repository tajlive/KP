# Cursor Cloud PR Autofix – veiledning

Denne veiledningen beskriver hvordan du setter opp Cursor Cloud Agent til å automatisk fikse CI-feil på PR-er.

## Krav

- **Cursor-abonnement med Cloud Agents** (inkl. on-demand usage for automations)
- Repo koblet til Cursor (GitHub-integrasjon)

---

## 1. Opprett automations i Cursor

Gå til [cursor.com/agents](https://cursor.com/agents) → **Automations**.

Opprett automations som kjører agenten ved:

| Trigger | Bruk |
|---------|------|
| **CI completed (failure)** | Når GitHub Actions feiler – agenten kan forsøke å fikse feil |
| **PR opened** | Ved nye PR-er – valgfritt for å starte tidlig |
| **Push to branch** | Ved nye pushes – kan trigge på PR-brancher |

---

## 2. Manuell bruk på én PR

Du kan også be Cursor Cloud Agent fikse feil manuelt:

### Fiks alle CI-feil
Skriv i en PR-kommentar:
```
@cursor Fiks alle CI-feil på denne PR
```

### Skru på autofix for denne PR-en
```
@cursor autofix on
```

### Stopp autofix på en PR
```
@cursor autofix off
```

---

## 3. Når CI feiler

Når PR Check (eller andre workflows) feiler, viser CI-kommentaren nå også:

> **Eller skriv `@cursor` i en kommentar for å be Cursor Cloud Agent fikse.**

---

## 4. Relatert dokumentasjon

- [GITHUB_SETUP.md](../.github/GITHUB_SETUP.md) – GitHub-oppsett, inkl. seksjon 8 om Cursor Cloud PR Autofix
- [Feilretting når CI feiler](../.github/GITHUB_SETUP.md#7-feilretting-når-ci-feiler) – manuell feilretting

---

_Sist oppdatert: mars 2026_
