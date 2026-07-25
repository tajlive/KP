-- KLA-auth: admin-feed for nye registreringer.
-- GoTrue admin-API (auth.admin.listUsers) feiler i Cloudflare Workers,
-- saa epost merges via security-definer SQL i stedet.
-- Kun service_role har tilgang (kalles fra /api/admin/recent-signups etter
-- requireAdmin-sjekk: getUser + epost-allowlist).
-- Merk: kjørt direkte i prod via Supabase Management API 2026-07-25.

create or replace function public.admin_recent_signups(max_rows int default 10)
returns table (id uuid, email text, created_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.created_at
  from public.user_profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc
  limit greatest(1, least(max_rows, 50));
$$;

revoke all on function public.admin_recent_signups(int) from public, anon, authenticated;
grant execute on function public.admin_recent_signups(int) to service_role;
