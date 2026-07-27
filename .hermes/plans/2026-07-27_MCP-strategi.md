# MCP-strategi for Klarpakke (2026)

**Mål:** Gi Hermes full kontroll over hele infrastrukturen — Cloudflare, Supabase, GitHub, Browserbase — uten manuell innlogging.

---

## 🔌 Aktive MCP-servere

| Server | Verktøy | Tilgang | Auth |
|---|---|---|---|
| **cloudflare** | 89 — Workers, KV, R2, D1, DO, Queues, AI, Cron, Secrets, Routes, Analytics, Zones | Konto KLARPAKKE | OAuth (wrangler) |
| **github** | 26 — repos, PRs, issues, commits, code search, pull requests | Bruker tajlive | gh CLI token |
| **supabase** | Database, docs, debugging, functions, types | Prosjekt pskhryjzkobytnfwucrb | API key |

---

## 🎯 Nåværende kapabilitet (141 verktøy totalt)

### Cloudflare (89 verktøy)
- **Deploy:** `worker_deploy`, `worker_put`, `version_rollback`
- **Data:** `kv_get/put/delete`, `r2_get/put/delete`, `d1_query`
- **AI:** `ai_inference`, `ai_text_generation`, `ai_image_generation`, `ai_embeddings`
- **Infra:** `route_create/delete`, `cron_create/delete`, `secret_put/delete`
- **Monitor:** `analytics_get`, `workers_analytics_search`, `wrangler_config_get`

### GitHub (26 verktøy)
- **Kode:** `create_or_update_file`, `push_files`, `get_file_contents`, `search_code`
- **PRs:** `create_pull_request`, `merge_pull_request`, `create_pull_request_review`
- **Issues:** `create_issue`, `update_issue`, `add_issue_comment`, `search_issues`
- **Repo:** `create_repository`, `fork_repository`, `create_branch`

### Supabase (eksisterende)
- **DB:** `execute_sql`, `apply_migration`, `list_tables`
- **Edge:** `deploy_edge_function`, `list_edge_functions`
- **Auth:** `get_publishable_keys`, `get_advisors`
- **Docs:** `search_docs`, `generate_typescript_types`

---

## 🔮 Anbefalte utvidelser

| Prioritet | MCP | Begrunnelse | Kompleksitet |
|---|---|---|---|
| **Høy** | **Sentry MCP** — feilsporing | Automatisk triaging av prod-feil, release tracking | Medium |
| **Høy** | **Browserbase MCP** — headless browser | E2E-tester, skjermdumper, UU-testing | Lav (allerede API-nøkkel) |
| **Medium** | **Resend MCP** — e-post | Transaksjonelle e-poster, onboarding, varsler | Lav |
| **Medium** | **Stripe MCP** — betaling | Abonnementshåndtering, fakturering, webhook-debugging | Medium |
| **Lav** | **Linear MCP** — prosjektstyring | Issue tracking, sprint planning | Lav |

---

## 🛡️ Sikkerhetsregler

1. **Cloudflare:** Aldri `worker_delete` uten eksplisitt bekreftelse
2. **GitHub:** Aldri `merge_pull_request` uten gjennomgang
3. **Supabase:** Aldri DDL (`apply_migration`) uten SQL-diff → godkjenning
4. **Alle:** Secrets (API-nøkler, tokens, passord) skal aldri logges

---

## 📋 Implementeringsplan

| Steg | Hva | Tid |
|---|---|---|
| 1 | `/new` — last inn Cloudflare + GitHub MCP | Nå |
| 2 | Verifiser alle 141 verktøy fungerer | Nå |
| 3 | Sentry MCP | 15 min |
| 4 | Browserbase MCP | 10 min |
| 5 | Resend MCP | 10 min |
| 6 | Stripe MCP | 20 min |
