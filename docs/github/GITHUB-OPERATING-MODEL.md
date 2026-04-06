# GitHub Operating Model — Klarpakke

> **Gratis GitHub-native standard** for solo-developer.  
> **Prinsipp:** Ingen tredjepartsintegrasjon påkrevd.

---

## Workflow-arkitektur

```
PR ──→ pr-check ──→ merge ──→ deploy ──→ verify
        (lint/test)          (Vercel)
```

| Workflow | Trigger | Formål |
|----------|---------|--------|
| pr-check | PR/push main | Lint, type-check, test, build |
| deploy | Push main / manual | Vercel deploy + health check |
| hourly-watchdog | Cron (hver time) | E2E + health + repair |
| nightly-regression | Cron (03:00) | Full test suite |

---

## Secrets (minimal)

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

**Optional (solo-mode OK):**
- `SUPABASE_SERVICE_ROLE_KEY` → Skip E2E hvis mangler
- `SLACK_WEBHOOK_URL` → Logg til fil hvis mangler
- `LINEAR_API_KEY` → Skip hvis mangler

---

## Solo-mode Policy

Alle workflows fungerer uten ekstra setup:
- Manglende Slack/Linear → logger til fil
- Manglende E2E secrets → skip E2E, fortsett unit
- Manglende DB token → skip DB push

---

**Oppdatert:** 2026-04-06
