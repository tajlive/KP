# Security-definer RPC for auth.users-joins (GoTrue admin-API er brutt i Workers)

## Bakgrunn

`auth.admin.listUsers()` kaster i Cloudflare Workers selv med gyldig service-role-nøkkel.
Feilobjektet er bare `{"url":"https://<prosjekt>.supabase.co/auth/v1/admin/users?page=1&per_page=1000"}`
— PostgREST-kall (`from(...)`) mot samme host med samme nøkkel virker fint. Ikke bruk tid på
å debugge GoTrue fra Worker-runtime; flytt joinen til Postgres.

## Mal: admin_recent_signups (deployet 2026-07-25)

```sql
create or replace function public.admin_recent_signups(max_rows int default 10)
returns table (id uuid, email text, created_at timestamptz)
language sql
security definer
set search_path = public, auth   -- VIKTIG: fast search_path mot search_path-injection
as $$
  select p.id, u.email::text, p.created_at
  from public.user_profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc
  limit greatest(1, least(max_rows, 50));   -- clamp input
$$;

revoke all on function public.admin_recent_signups(int) from public, anon, authenticated;
grant execute on function public.admin_recent_signups(int) to service_role;
```

Kall fra admin-rute (etter `requireAdmin()`):

```typescript
const { data, error } = await auth.supabase.rpc("admin_recent_signups", { max_rows: 10 });
```

## Regler

1. `security definer` + fast `search_path` — ellers search_path-injection.
2. Alltid `revoke from public, anon, authenticated` + `grant execute to service_role`.
   Funksjonen kalles KUN fra server etter `requireAdmin()` — aldri eksponer til anon/authenticated.
3. Clamp rader-parametre i funksjonen (`greatest/least`), ikke bare i klienten.
4. Migrasjonsfila legges FLAT i `supabase/migrations/` (ikke undermapper — validatoren
   leser staged filer via `basename` mot flat katalog, og feiler med "Tom eller ulesbar fil"
   for `supabase/migrations/v3_0/x.sql`).
5. `database.types.ts` trenger ikke RPC-en for at `tsc` skal passere — `rpc()` med string-navn
   er løst typet i denne kodebasen.
6. Verifiser i prod med radantall + innhold (epost faktisk ikke-null), ikke bare 200-status.
