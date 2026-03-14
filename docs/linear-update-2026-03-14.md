# Linear-oppdatering 2026-03-14 (lim inn som kommentar eller ny oppgave)

**Routing og verify**
- Production verify kjørt: **alle tester grønne** (domener, /no, /no/login, /no/signup, /no/priser, paper-trading, vilkår, personvern, kontakt, /en).
- Verify er lagt inn i CI: kjører automatisk etter **Manual Deploy → production** (`.github/workflows/manual-deploy.yml`).

**Supabase**
- Migrasjonshistorikk: repair kjørt (remote-only versjoner markert som reverted).
- `db push` feilet: konflikt på `process_pending_notifications` (return type) mellom lokale migrasjoner og allerede kjørt schema på remote.
- View **`unified_notifications_with_email`** er lagt til i repo (`supabase/migrations/20260314000000_unified_notifications_with_email_view.sql`). For å aktivere på remote: kjør view-SQL manuelt i Supabase Dashboard → SQL Editor, eller sett `SUPABASE_ACCESS_TOKEN` og bruk MCP `execute_sql`. View brukes for å unngå PostgREST 400 ved henting av e-post (bruk view i stedet for `auth.users!inner(email)`).

**Linear**
- Linear MCP ga 401 (script: `scripts/linear-test.sh`) eller ugyldig tool-response. Oppdater Linear manuelt med denne teksten eller fiks API-nøkkel/MCP-oppsett.
