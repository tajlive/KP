# 🐕 External User Watchdog & Self-Healing Guard

> **Operativ Source of Truth (SoT)** for produksjonsovervåking og auto-repair.  
> **Gyldig fra:** 2026-04-06  
> **Eier:** Platform Team / On-call Engineer  
> **Dokumenteier:** `@architect` — endringer krever PR-review

---

## 1. Go/No-Go for Auto-Healing i Produksjon

| Komponent | Status | Stateful Writes | Godkjent for Auto | Betingelser |
|-----------|--------|-----------------|-------------------|-------------|
| **Testbruker repair** | ✅ GO | Ja (auth, profiles) | Ja | Kun testbrukere (`tom@klarpakke.no`, `*e2e*@klarpakke.no`) |
| **Health recovery** | ✅ GO | Nei (trigger only) | Ja | Invoke via RPC/HTTP, ikke direkte DB-write |
| **Signal-engine restart** | ✅ GO | Nei (edge deploy) | Ja | Redeploy av edge function, ikke data-mutasjon |
| **DB drift repair** | 🔶 CONDITIONAL | Ja (migrasjoner) | **Nei** — dry-run only | Krever manuell godkjenning i prod |
| **Vercel rollback** | 🔶 CONDITIONAL | Nei (deploy) | **Nei** — krav approval | Krever `environment: production` gate |
| **Redis cache clear** | ✅ GO | Ja (cache) | Ja | Ikke kritisk data, reconstructable |

### Auto-Healing Policy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRODUKSJON: Self-Healing Guard kjører alltid i check-only mode først   │
├─────────────────────────────────────────────────────────────────────────┤
│  Hourly Watchdog      → Full auto OK (les + trigger only)               │
│  Testbruker Repair    → Full auto OK (begrenset scope)                  │
│  Health Recovery      → Full auto OK (trigger only)                     │
│  DB Drift Fix         → ALLTID dry-run → manuell godkjenning            │
│  Vercel Rollback      → ALLTID manuell approval                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kjøremodus (check-only / repair-only / auto)

| Modus | Beskrivelse | Bruk | Produksjon |
|-------|-------------|------|------------|
| **`--check-only`** | Kun les/sjekk, ingen endringer | Validering, monitoring | ✅ Alltid trygg |
| **`--repair-only`** | Reparer kun, ikke push nye migrasjoner | Testbruker-fix, health-restart | ✅ Godkjent |
| **`--auto`** (default) | Full auto-healing etter policy | Self-Healing Guard | ✅ Se Go/No-Go tabell |
| **`--force`** | Tving gjennom alle operasjoner | Nødsituasjon | ⚠️ Krever on-call |
| **`--dry-run`** | Simuler uten endringer | DB drift, migrasjoner | ✅ Alltid trygg |

### Kommando-mapping

```bash
# CHECK-ONLY (les, ingen endringer)
npm run watchdog:repair:check      # Sjekk testbrukere
npm run db:drift:check             # Sjekk migrasjonsdrift  
npm run vercel:rollback:check      # Sjekk deploy-status
npm run health:recover -- --check-only

# REPAIR-ONLY (reparer eksisterende, ikke push nye)
npm run watchdog:repair            # Reparer testbrukere
npm run health:recover             # Restart signal-engine

# AUTO (full self-healing etter policy)
npm run test:watchdog              # Hourly full run
.github/workflows/self-healing-guard.yml  # Master workflow

# FORCE (tving — kun on-call)
npm run health:recover -- --force
npm run vercel:rollback:guard -- --force
```

---

## 3. On-call & SLA

### On-call Owner

| Rolle | Ansvar | Kontakt |
|-------|--------|---------|
| **Primær On-call** | Responder på Critical alerts, godkjenner rollback | `#ops` Slack |
| **Platform Lead** | Arkitektur-beslutninger, eskalering | `@platform-lead` |
| **Auto-Healing** | Førstelinje: auto-repair prøver først | Ingen (automatisk) |

### SLA & MTTA

| Nivå | Terskel | MTTA | Respons |
|------|---------|------|---------|
| **P0-Critical** | Health unreachable, alle E2E feiler | 5 min | Auto-rollback prøves → Slack → On-call paged |
| **P1-High** | Signal stale >20min, enkelt E2E feil | 15 min | Auto-repair → Linear issue → Slack |
| **P2-Medium** | DB drift, lint/type feil | 1 time | Auto-repair (dry-run) → Linear → Manual fix |
| **P3-Low** | Warning thresholds | 24 timer | Daglig review, ingen paging |

### MTTR Mål

| Scenario | Mål | Hvordan |
|----------|-----|---------|
| Testbruker feil | < 2 min | Auto-repair |
| Signal-engine stale | < 5 min | Auto-restart |
| Total outage | < 10 min | Auto-rollback (med approval) |
| DB drift | < 1 time | Manuell godkjenning + auto-fix |

---

## 4. Varslingsmatrix (Slack vs Linear)

### Når varsles?

| Scenario | Slack | Linear | Auto-close | Begrunnelse |
|----------|-------|--------|------------|-------------|
| Watchdog feiler (første gang) | ✅ `#ops` | ✅ Opprettes | ❌ Nei | Menneske må vurdere |
| Watchdog feiler (gjentakelse) | ✅ `#ops` | 📝 Kommentar | ❌ Nei | Escalation |
| Auto-repair lykkes | ✅ `#ops` (thread) | ❌ Nei | N/A | Recovery bekreftet |
| Auto-repair feiler | ✅ `#ops` | ✅ Oppdateres | ❌ Nei | Krever manuell |
| Recovery etter feil | ✅ `#ops` | 📝 Kommentar + **Manuell lukk** | ❌ Nei | Menneske bekrefter |
| Nightly regression feil | ✅ `#ops` | ✅ Opprettes | ❌ Nei | Ikke kritisk, men viktig |
| Nightly regression OK | ❌ Nei | ❌ Nei | N/A | Ingen action needed |

### Linear Issue Policy

```yaml
Auto-create:
  - P0-Critical health failures
  - P1-High med auto-repair failure
  - Alle nightly regression failures (P2)

Auto-update:
  - Gjentatte failures på samme issue
  - Recovery status

Auto-close:
  - ❌ ALDRI auto-lukk i produksjon
  - Krever alltid manuell verifikasjon

Issue template:
  Title: "🚨 [Watchdog|Recovery] <Component> <Status>"
  Labels: ["auto-generated", "watchdog", "P0|P1|P2"]
  Assignee: On-call (hvis P0/P1)
```

### Slack Thread-struktur

```
🚨 Watchdog Alert (hovedmelding)
   ├─ 🔄 Auto-repair attempting (thread reply)
   ├─ ✅ Auto-repair succeeded (thread reply)
   └─ ❌ Auto-repair failed — manual required (thread reply)
```

---

## 5. Stateful Writes i Produksjon

### Hva er lov?

| Komponent | Operation | Data-påvirkning | Godkjent |
|-----------|-----------|-----------------|----------|
| **Testbruker repair** | `auth.admin.createUser` | Kun testbrukere (e2e-prefiks) | ✅ Ja |
| | `auth.admin.updateUser` | Passord-reset testbrukere | ✅ Ja |
| | `INSERT user_profiles` | Kun for testbruker UUIDs | ✅ Ja |
| **Health recovery** | `rpc.invoke_signal_engine` | Trigger funksjon, ikke direkte write | ✅ Ja |
| | `edge deploy` | Redeploy, ingen data-endring | ✅ Ja |
| | `touch_bot_health` | Metadata update (bot_health) | ✅ Ja |
| **DB drift fix** | `migration repair` | Schema-endring | ⚠️ Dry-run only |
| | `db push` | Schema-endring | ⚠️ Krever godkjenning |
| **Vercel rollback** | `deploy` | Kode-rollback, ikke data | ⚠️ Krever approval |
| **Redis cache clear** | `FLUSHALL` / `DEL` | Cache, reconstructable | ✅ Ja |

### Beskyttelser

```javascript
// Alle auto-repair scripts har:
1. Scope-guard: Kun testbrukere (e2e-prefiks på email)
2. Dry-run mode: Simuler først
3. Check-only mode: Les uten endring
4. Rollback-log: Alle operasjoner logges
5. Timeout: Max 2 min per operasjon
```

---

## 6. Oversikt: Komponenter

| Komponent | Frekvens | Filer | Workflow |
|-----------|----------|-------|----------|
| **Hourly Watchdog** | Hver time | `hourly-external-user-watchdog.sh` | `hourly-watchdog.yml` |
| **Nightly Regression** | 03:00 UTC | `full-e2e.sh` | `nightly-regression.yml` |
| **Self-Healing Guard** | Hver time | `watchdog-auto-repair.mjs`, `health-recovery.mjs`, etc. | `self-healing-guard.yml` |

---

## 7. Quick Reference

### Kjøre lokalt

```bash
# Check-only (trygg i prod)
npm run watchdog:repair:check
npm run db:drift:check

# Repair (testbruker + health OK, DB/rollback er dry-run)
npm run watchdog:repair
npm run health:recover

# Full watchdog
npm run test:watchdog
npm run test:watchdog:prod
```

### Troubleshooting

```bash
# Sjekk logs
tail -f watchdog-reports/*.log

# Siste rapport
cat watchdog-reports/watchdog-latest.json

# Manuell verifisering
curl -s https://www.klarpakke.no/api/health | jq
npm run signals:health
npm run diagnose:signals-traders
```

---

## 8. Endringslogg

| Dato | Endring | Autor |
|------|---------|-------|
| 2026-04-06 | Go/No-Go policy, SLA, varsling definert | `@architect` |

---

## 🔗 Se også

- [AGENTS.md](../AGENTS.md) — Index/quick reference
- [AUTOMATION-RUNBOOK.md](./AUTOMATION-RUNBOOK.md) — Generell automasjon
- [FULL-AUTOMATION-PLAYBOOK.md](../FULL-AUTOMATION-PLAYBOOK.md) — Dypere kontekst
- [LIVE-TRADING-TRADES-INTEGRITY.md](../trading/LIVE-TRADING-TRADES-INTEGRITY.md) — Trading-sikkerhet
