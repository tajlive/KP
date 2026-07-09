# Plan: Periodiske E2E-tester mot produksjon

> **Mål:** Kjøre smoke/critical tester mot `www.klarpakke.no` hver 6. time
> og varsle ved feil. Ingen LLM-inference — kun shell-script + Playwright.

---

## 1. Hva som skal kjøres

To testfiler, kjør med chromium mot produksjon:

```
e2e/smoke/health.spec.ts          — Helse-endepunkt + 6 offentlige sider laster
e2e/smoke/critical-flows.spec.ts  — CTA, registrering, innlogging, handel, priser, hjelp, API
```

**Kommando:**
```bash
PLAYWRIGHT_TEST_BASE_URL="https://www.klarpakke.no" \
BASE_URL="https://www.klarpakke.no" \
npx playwright test \
  --config=playwright.allure.config.ts \
  --project=chromium \
  e2e/smoke/critical-flows.spec.ts \
  e2e/smoke/health.spec.ts
```

**Allure-valgfritt i cron-jobb** — vi trenger ikke generere Allure-rapport
hver 6. time med mindre noen aktivt sjekker den. Men `allure-playwright`
reporteren er allerede konfigurert i `playwright.allure.config.ts`, så
`allure-results/` fylles automatisk. Vi kan generere rapport ved feil om
ønskelig.

---

## 2. Shell-script for cron-jobben

Opprett `scripts/e2e-prod-smoke.sh`:

```bash
#!/usr/bin/env bash
# Periodisk E2E smoke-test mot produksjon — kjøres via Hermes cron
set -euo pipefail

cd /Users/taj/klarpakke || exit 1

export PLAYWRIGHT_TEST_BASE_URL="https://www.klarpakke.no"
export BASE_URL="https://www.klarpakke.no"

OUTPUT_DIR="e2e-prod-output/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "=== E2E Prod Smoke Test $(date) ==="

# Kjør testene
set +e
npx playwright test \
  --config=playwright.allure.config.ts \
  --project=chromium \
  e2e/smoke/critical-flows.spec.ts \
  e2e/smoke/health.spec.ts \
  --reporter=json \
  > "$OUTPUT_DIR/results.json" 2>&1

EXIT_CODE=$?
set -e

# Parse resultat
TOTAL=$(jq '.stats.expected + .stats.unexpected + .stats.flaky' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")
PASSED=$(jq '.stats.expected' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")
FAILED=$(jq '.stats.unexpected' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")
DURATION=$(jq '.stats.duration' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")

echo ""
echo "=== Resultat ==="
echo "Total: $TOTAL | Pass: $PASSED | Fail: $FAILED | Tid: ${DURATION}ms"
echo ""

if [ "$FAILED" -gt 0 ] || [ "$EXIT_CODE" -ne 0 ]; then
  echo "❌ TEST FAILURE — $FAILED tester feilet"
  echo ""
  echo "Feilede tester:"
  jq -r '.suites[]?.specs[]? | select(.ok == false) | "  - \(.title) (\(.file))"' \
    "$OUTPUT_DIR/results.json" 2>/dev/null || echo "  (kunne ikke parse)"
  echo ""
  echo "Se: $OUTPUT_DIR/results.json"
  exit 1
fi

echo "✅ Alle $TOTAL tester OK"
exit 0
```

**Exit-kode-oppførsel:**
- `exit 0` — alle tester passerte → stille, ingen output fra cron
- `exit 1` — ≥1 test feilet → cron leverer output som varsel

---

## 3. Cron-jobb i Hermes (to alternativer)

### Alternativ A: Script-basert cron (anbefalt — ingen LLM-kostnad)

Dette er en `no_agent: true`-jobb — Hermes kjører scriptet direkte uten
LLM-inference. Output fra scriptet leveres som cron-svaret.

Legg til i `~/.hermes/cron/jobs.json`:

```json
{
  "id": "e2e-prod-smoke-6h",
  "name": "E2E smoke mot produksjon — hver 6. time",
  "prompt": "",
  "skills": [],
  "skill": null,
  "model": null,
  "provider": null,
  "provider_snapshot": null,
  "model_snapshot": null,
  "base_url": null,
  "script": "cd /Users/taj/klarpakke && bash scripts/e2e-prod-smoke.sh",
  "no_agent": true,
  "context_from": null,
  "schedule": {
    "kind": "interval",
    "minutes": 360,
    "display": "every 6h"
  },
  "schedule_display": "every 6h",
  "repeat": {
    "times": null,
    "completed": 0
  },
  "enabled": true,
  "state": "scheduled",
  "paused_at": null,
  "paused_reason": null,
  "created_at": "<ISO-timestamp>",
  "last_run_at": null,
  "last_status": null,
  "last_error": null,
  "last_delivery_error": null,
  "deliver": "origin",
  "origin": null,
  "enabled_toolsets": [],
  "workdir": "/Users/taj/klarpakke",
  "fire_claim": null
}
```

**Slik opprettes det:**
```bash
# Via Hermes CLI (anbefalt — genererer riktig JSON-struktur)
hermes cron create "every 6h" \
  --name "E2E smoke mot produksjon" \
  --script "cd /Users/taj/klarpakke && bash scripts/e2e-prod-smoke.sh" \
  --no-agent \
  --workdir /Users/taj/klarpakke
```

Hvis `hermes cron create --script` ikke støttes direkte, opprett en
tom agent-jobb og rediger JSON manuelt, eller bruk `cronjob` verktøyet.

### Alternativ B: Agent-basert cron

Hvis man foretrekker at Hermes selv tolker resultatet og formulerer
et naturlig svar (krever LLM-kall):

```json
{
  "id": "e2e-prod-smoke-agent",
  "name": "E2E prod smoke (agent)",
  "prompt": "Kjør E2E smoke-tester mot produksjon. Kjør kommandoen: cd /Users/taj/klarpakke && PLAYWRIGHT_TEST_BASE_URL=https://www.klarpakke.no BASE_URL=https://www.klarpakke.no npx playwright test --config=playwright.allure.config.ts --project=chromium e2e/smoke/critical-flows.spec.ts e2e/smoke/health.spec.ts --reporter=json. Hent resultatet fra stdout og rapporter: antall bestått, antall feilet, og hvilke tester som feilet. Hvis 0 feil: vær stille. Hvis ≥1 feil: send alarm.",
  "no_agent": false,
  ...
}
```

---

## 4. Varsling ved feil

### Script-basert (Alternativ A)

- **Exit 0** (alt OK): Scriptet skriver "✅ Alle X tester OK" til stdout.
  Cron leverer output til `deliver: "origin"` (samme kanal som opprettet
  jobben). Hvis origin er `local`, ser man det kun i cron-utdata.
- **Exit ≠0** (feil): Scriptet skriver "❌ TEST FAILURE" + liste over
  feilede tester. Dette leveres som cron-svar. Hermes cron leverer til
  opprinnelseskanalen.

**For å få aktiv varsling** (f.eks. til Telegram/Slack/Teams):
- Sett `deliver` til en gateway-plattform i stedet for `origin`
- Eller legg til et webhook-kall i scriptet ved feil:
  ```bash
  if [ "$FAILED" -gt 0 ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"❌ E2E prod smoke: $FAILED tester feilet på www.klarpakke.no\"}"
  fi
  ```

### Agent-basert (Alternativ B)

Hermes tolker resultatet og kan sende en alarmmelding via gateway.
Krever at cron-jobben har `deliver` satt til en gateway-plattform.

---

## 5. Kjent risiko og fallback

| Risiko | Konsekvens | Tiltak |
|--------|-----------|--------|
| Playwright ikke installert | Testene kjører ikke | `npx playwright install chromium` i scriptet, eller installer fast |
| `.env.local`-mangler | Base URL faller til localhost | Eksplisitt `PLAYWRIGHT_TEST_BASE_URL` i scriptet |
| `accessibility.spec.ts` blir kjørt | Hele test-suiten krasjer | Ekskluderes via eksplisitte filstier (allerede gjort) |
| Cron-jobben blokkeres av model-pin-sjekk | Kjøres ikke | `no_agent: true` unngår dette — ingen LLM = ingen pin-sjekk |
| Prod deploy halvferdig | Tester feiler midlertidig | 2 retries i CI er allerede konfigurert; cron har 0 retries som default |

---

## 6. Oppsummering — steg-for-steg implementasjon

1. **Opprett script:** `scripts/e2e-prod-smoke.sh` (se §2)
2. **Gjør kjørbart:** `chmod +x scripts/e2e-prod-smoke.sh`
3. **Test manuelt:** Kjør scriptet og sjekk output
4. **Opprett cron-jobb:** `hermes cron create "every 6h" ...` (se §3)
   eller rediger `~/.hermes/cron/jobs.json` direkte
5. **Verifiser:** Vent på neste tick eller bruk `hermes cron run <id>`
6. **Sett opp varsling (valgfritt):** Webhook eller gateway-delivery

Scriptet bør committes (`git add scripts/e2e-prod-smoke.sh && git commit`)
slik at det versjonskontrolleres sammen med resten av prosjektet.

---

## 7. Vedlikehold — oppdatering av `klarpakke-deploy` skill

Skillen `klarpakke-deploy` (i `~/.hermes/skills/software-development/klarpakke-deploy/SKILL.md`)
har allerede en seksjon "E2E + Allure Testing" med kjørbar kommando.
Den bør oppdateres med en referanse til dette scriptet og cron-oppsettet.

Se `docs/ops/e2e-prod-cron-plan.md` for full plan og `scripts/e2e-prod-smoke.sh`
for det kjørbare scriptet.
