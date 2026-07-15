# Cloudflare Deploy — Overgang fra Workers Builds til GitHub Actions

> **For Hermes:** Plan — ikke utfør. Implementer task-by-task med delegate_task.

**Goal:** Erstatte Cloudflare Workers Builds (som bygger uten Supabase-keys) med GitHub Actions + self-hosted runner for korrekt, automatisert deploy.

**Architecture:** Git push → GitHub Actions trigger → self-hosted runner (Mac) bygger med GitHub Secrets → `wrangler deploy` → verifiser

**Tech Stack:** GitHub Actions, OpenNext.js, Wrangler CLI, Cloudflare Workers

---

## Alternativer innen Cloudflare

| Løsning | Auto-deploy | Build env | Status |
|----------|------------|-----------|--------|
| ☁️ Workers Builds | ✅ Auto | ❌ Mangler keys | **AVVIKLES** |
| 🚀 GH Actions + Wrangler | ✅ Auto | ✅ GitHub Secrets | **MÅL** |
| 🖥️ Manuell wrangler deploy | ❌ Manuell | ✅ Lokal .env | Fallback |

Konklusjon: **GitHub Actions med self-hosted runner (Mac)** — allerede 90% klart.

---

## Forutsetninger

- `auto-deploy.yml` finnes i `.github/workflows/` (trigger: push main)
  - Les: `/Users/taj/klarpakke/.github/workflows/auto-deploy.yml`
- GitHub Secrets finnes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CLOUDFLARE_API_TOKEN`
- Mac-runner (`mac-runner`) er online og self-hosted
- Cloudflare Workers Builds er fortsatt tilkoblet → bygger korrupte JS

## Plan

### Task 1: Deaktiver Cloudflare Workers Builds

**Objektiv:** Koble fra Git-repo i Cloudflare Dashboard slik at Workers Builds ikke auto-deployer.

**Steg 1 (Tom gjør):** Gå til Cloudflare Dashboard → Workers & Pages → `klarpakke` → Settings → Git → **Disconnect**

**Verifisering:** Neste `git push` trigger kun GitHub Actions, ikke Workers Builds.

---

### Task 2: Oppdater `auto-deploy.yml` for Mac-runner

**Objektiv:** Sikre at workflowen kjører på Mac-runner (alltid på) med korrekte labels.

**Fil:**
- Modifiser: `.github/workflows/auto-deploy.yml`

**Endring:** Sett `runs-on: [self-hosted, macOS]` slik at Mac-runner prioriteres (alltid på, ingen sleep).

```yaml
jobs:
  deploy:
    timeout-minutes: 10
    runs-on: [self-hosted, macOS]
```

**Verifisering:** Push → GH Actions plukker opp jobben på Mac-runner.

---

### Task 3: Legg til pre-deploy secrets-check

**Objektiv:** Før bygg, sjekk at alle nødvendige GitHub Secrets er satt.

**Fil:**
- Modifiser: `.github/workflows/auto-deploy.yml`

**Endring:** Legg til step før build som sjekker secrets:

```yaml
      - name: Check required secrets
        run: |
          if [ -z "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}" ]; then
            echo "❌ NEXT_PUBLIC_SUPABASE_URL mangler" && exit 1
          fi
          if [ -z "${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}" ]; then
            echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY mangler" && exit 1
          fi
          echo "✅ Alle secrets OK"
```

**Verifisering:** Hvis secrets mangler → workflow feiler med tydelig melding.

---

### Task 4: Legg til post-deploy verifisering med console guard

**Objektiv:** Etter deploy, verifiser at sidene fungerer OG at ingen "Supabase er ikke konfigurert" vises.

**Fil:**
- Modifiser: `.github/workflows/auto-deploy.yml`

**Endring:** Utvid verify-steg til å også sjekke console errors:

```yaml
      - name: Verify deployment
        run: |
          bash scripts/post-deploy-verify.sh
          echo "=== Sjekk Supabase-feil ==="
          curl -s https://www.klarpakke.no/no/login | grep -c "Supabase er ikke" && {
            echo "❌ Supabase-feil funnet!"
            exit 1
          } || echo "✅ 0 Supabase-feil"
```

---

### Task 5: Fjern `repair-workers-builds.yml` (fallback)

**Objektiv:** Rydd opp workflows som prøver å reparere Workers Builds — ikke lenger nødvendig.

**Fil:**
- Slett: `.github/workflows/repair-workers-builds.yml`

**Git:** `git rm .github/workflows/repair-workers-builds.yml`

---

### Task 6: Oppdater `.hermes.md` med ny deploy-strategi

**Objektiv:** Dokumenter den nye deploy-pipelinen.

**Fil:**
- Modifiser: `.hermes.md`

**Endring:** Oppdater CI/CD-seksjonen:

```markdown
### CI/CD (ny)
1. Push til main → GitHub Actions `auto-deploy.yml` trigger
2. Mac-runner bygger med riktige env vars (GitHub Secrets)
3. `wrangler deploy` laster opp til Cloudflare Workers
4. Post-deploy verify: helse + Supabase-feil + console errors
5. Ved feil → Slack-varsling (Slack Ops-webhook)
```

---

## Tester / Validering

| Test | Hvordan | Forventet |
|------|---------|-----------|
| Secrets check | `gh workflow run auto-deploy.yml --ref test-branch` | ✅ | 
| Deploy uten Workers Builds | Push til main → sjekk CF deploy log | ✅ GH Actions, ikke Workers Builds |
| Supabase-feil borte | curl `www.klarpakke.no/no/login` | ✅ 0 treff |
| Console guard | E2E test | ✅ 0 errors |

## Risikoer

| Risiko | Sannsynlighet | Konsekvens | Tiltak |
|--------|--------------|------------|--------|
| Mac-runner OOM under bygg | Middels | Deploy feiler | PC-runner som fallback |
| Glemt å disconnect Workers Builds | Middels | Korrupt auto-deploy | Task 1 må gjøres først |
| GitHub Secrets utdatert | Lav | Feil keys i bygg | Secrets check i workflow |

## Handoff

Plan klar. Klar til å eksekvere med subagent — én task om gangen, TDD der relevant. Skal jeg sette i gang? 🚀
