# MCP Capabilities — Klarpakke

> Komplett oversikt over alle MCP-integrasjoner tilgjengelig via Claude Code.
> Sist oppdatert: 28. Februar 2026

---

## Tjenester og tilgang

| Tjeneste | MCP Status | Konto |
|----------|-----------|-------|
| **Supabase** | Full tilgang (SQL, migrasjoner, Edge Functions) | `vuxbjlykgmzskxbclquf` (eu-central-1) |
| **Vercel** | Full tilgang (deploy, logs, prosjekter) | `team_JH76folkKg0SaSV9OtANlQ6L` |
| **Stripe** | Full tilgang (produkter, kunder, abonnementer) | `acct_1R4MjaCGsVawsLof` |
| **Cloudflare** | Full tilgang (Workers, KV, D1, R2) | `80d5b1d56a3e907150ba7348b6182894` |
| **Sentry** | Begrenset (org: `elbatt-chatbot`, ikke `klarpakke`) | Trenger rekonfigurering |
| **Linear** | Full tilgang (issues, prosjekter, kommentarer) | Team: `Klarpakke` |
| **Resend** | Ingen MCP — brukes via npm-pakke | — |
| **Perplexity** | Ingen MCP — brukes via API-ruter | — |
| **Antigravity** | Ingen MCP — separat IDE | — |

---

## Supabase MCP

### SQL (direkte kjøring mot prod)
```
execute_sql(project_id, query)     — Kjør SELECT/INSERT/UPDATE
apply_migration(project_id, ...)   — DDL-operasjoner (CREATE TABLE, ALTER)
list_tables(project_id)            — Vis alle tabeller
list_extensions(project_id)        — Vis PostgreSQL-extensions
list_migrations(project_id)        — Vis migrasjonshistorikk
```

### Edge Functions
```
list_edge_functions(project_id)    — Liste alle Edge Functions
get_edge_function(project_id, id)  — Hent kode for en funksjon
deploy_edge_function(...)          — Deploy ny/oppdatert funksjon
```

### Prosjekt
```
get_project(id)                    — Status, region, DB-versjon
get_project_url(id)                — API-URL
get_publishable_keys(id)           — anon key, service role key
get_logs(project_id, service)      — Runtime-logs
get_advisors(project_id)           — Performance-anbefalinger
```

### Begrensninger
- Kan IKKE rotere database-passord (krever superuser/Dashboard)
- Kan IKKE endre auth-innstillinger (OAuth providers, redirect URLs)

---

## Vercel MCP

### Deploy
```
deploy_to_vercel()                 — Trigger deploy (krever CLI fallback)
list_deployments(projectId, teamId) — Alle deploys med status
get_deployment(idOrUrl, teamId)    — Detaljer for én deploy
get_deployment_build_logs(...)     — Build-logs for feilsøking
```

### Prosjekter
```
list_projects(teamId)              — Alle prosjekter
get_project(projectId, teamId)     — Prosjektdetaljer
list_teams()                       — Alle teams
```

### DNS & Domener
```
check_domain_availability_and_price(...) — Sjekk domenetilgjengelighet
```

### Runtime
```
get_runtime_logs(...)              — Server-side logs
search_vercel_documentation(topic) — Søk i Vercel docs
```

### Begrensninger
- Kan IKKE sette environment variables via MCP
- Deploy-trigger krever Vercel CLI (`npx vercel --prod`)

---

## Stripe MCP

### Produkter & Priser
```
list_products()                    — Alle produkter
create_product(name, description)  — Nytt produkt
list_prices()                      — Alle priser
create_price(...)                  — Ny pris
```

### Kunder
```
list_customers(limit, email)       — Søk kunder
create_customer(name, email)       — Ny kunde
```

### Abonnementer
```
list_subscriptions()               — Alle abonnementer
cancel_subscription(id)            — Kanseller
update_subscription(id, ...)       — Endre plan
```

### Betaling
```
list_payment_intents()             — Betalingshistorikk
create_payment_link(...)           — Generer betalingslenke
list_invoices()                    — Alle fakturaer
create_invoice(...)                — Ny faktura
create_refund(...)                 — Tilbakebetaling
```

### Annet
```
retrieve_balance()                 — Kontobalanse
list_disputes()                    — Tvister
list_coupons() / create_coupon()   — Rabattkoder
```

---

## Cloudflare MCP

### Workers
```
workers_list()                     — Alle Workers
workers_get_worker(name)           — Worker-detaljer
workers_get_worker_code(name)      — Kildekode
```

### KV Store
```
kv_namespaces_list()               — Alle KV-namespaces
kv_namespace_create(title)         — Ny namespace
kv_namespace_get(id)               — Detaljer
kv_namespace_delete(id)            — Slett
```

### D1 Database
```
d1_databases_list()                — Alle D1-databaser
d1_database_create(name)           — Ny database
d1_database_query(id, query)       — Kjør SQL
d1_database_delete(id)             — Slett
```

### R2 Storage
```
r2_buckets_list()                  — Alle buckets
r2_bucket_create(name)             — Ny bucket
r2_bucket_delete(name)             — Slett
```

### Docs
```
search_cloudflare_documentation(query)
```

---

## Sentry MCP

### Issues
```
search_issues(org, query)          — Søk etter feil
get_issue_details(org, issueId)    — Detaljer + stacktrace
analyze_issue_with_seer(...)       — AI root cause analysis
```

### Events
```
search_events(org, query)          — Feilhendelser med timestamps
search_issue_events(org, issueId)  — Events for spesifikt issue
get_trace_details(org, traceId)    — Distributed tracing
```

### Prosjekt
```
find_organizations()               — Tilgjengelige orgs
find_projects(org)                 — Prosjekter i org
find_releases(org, project)        — Releases
```

### VIKTIG: Sentry er feilkonfigurert
- Org er `elbatt-chatbot`, bør være `klarpakke`
- Opprett nytt Sentry-prosjekt eller korriger org-slug

---

## Linear MCP

### Issues
```
save_issue(team, title, ...)       — Opprett/oppdater issue
list_issues(team, state, ...)      — Søk/filtrer issues
get_issue(id)                      — Detaljer
```

### Kommentarer
```
create_comment(issueId, body)      — Legg til kommentar
list_comments(issueId)             — Alle kommentarer
```

### Prosjekter & Teams
```
list_teams()                       — Alle teams
list_projects(team)                — Alle prosjekter
list_cycles(teamId, type)          — Sprinter
list_milestones()                  — Milestones
```

### Dokumenter
```
create_document(...)               — Nytt dokument
list_documents(...)                — Alle dokumenter
```

---

## Vanlige operasjoner

### Sjekk produksjonsstatus
1. `Supabase: execute_sql` → `SELECT 1` (DB oppe?)
2. `Vercel: list_deployments` → siste deploy READY?
3. `Stripe: get_stripe_account_info` → konto aktiv?

### Feilsøk deploy
1. `Vercel: get_deployment_build_logs` → se build-feil
2. `Vercel: get_runtime_logs` → se runtime-feil
3. `Sentry: search_issues` → se bruker-feil

### Database-operasjoner
1. `Supabase: execute_sql` → ad-hoc queries
2. `Supabase: apply_migration` → schema-endringer
3. `Supabase: get_advisors` → performance-tips

### Kundeservice
1. `Stripe: list_customers(email)` → finn kunde
2. `Stripe: list_subscriptions` → sjekk abonnement
3. `Stripe: create_refund` → tilbakebetaling
