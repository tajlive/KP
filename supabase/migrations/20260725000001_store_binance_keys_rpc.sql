-- KLA-auth: skrivevei for Binance-nokler. Nokkler lagres i vault.secrets,
-- kun UUID-referanser i public.user_binance_keys (speiler decrypt_binance_keys).
-- Kalles fra /api/binance/keys POST med service-role etter getUser-sjekk.
-- Erstatter den aldri-implementerte 'connect'-action i binance-connector.
-- Merk: koert direkte i prod via Supabase Management API 2026-07-25.

create or replace function public.store_binance_keys(
  p_user_id uuid,
  p_api_key text,
  p_api_secret text,
  p_is_testnet boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_old_key uuid;
  v_old_secret uuid;
  v_key_id uuid;
  v_secret_id uuid;
begin
  if p_user_id is null
     or length(coalesce(p_api_key, '')) < 10
     or length(coalesce(p_api_secret, '')) < 10 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select api_key_id, api_secret_id
    into v_old_key, v_old_secret
    from public.user_binance_keys
   where user_id = p_user_id;

  v_key_id := vault.create_secret(p_api_key);
  v_secret_id := vault.create_secret(p_api_secret);

  insert into public.user_binance_keys (
    user_id, api_key_id, api_secret_id, is_testnet, is_active,
    last_validated_at, updated_at
  ) values (
    p_user_id, v_key_id, v_secret_id, p_is_testnet, true,
    now(), now()
  )
  on conflict (user_id) do update set
    api_key_id = excluded.api_key_id,
    api_secret_id = excluded.api_secret_id,
    is_testnet = excluded.is_testnet,
    is_active = true,
    last_error = null,
    last_validated_at = now(),
    updated_at = now();

  if v_old_key is not null then
    delete from vault.secrets where id = v_old_key;
  end if;
  if v_old_secret is not null then
    delete from vault.secrets where id = v_old_secret;
  end if;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.store_binance_keys(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.store_binance_keys(uuid, text, text, boolean) to service_role;
