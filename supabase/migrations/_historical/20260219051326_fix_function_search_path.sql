-- ============================================================================
-- CATEGORY 1: Fix function_search_path_mutable
-- Set immutable search_path on all public functions to prevent schema hijacking
-- ============================================================================

ALTER FUNCTION public.admin_change_role(p_user_id uuid, p_new_role text, p_admin_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.assign_user_role(user_uuid uuid, new_role text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_achievement(p_user_id uuid, p_achievement_id text, p_title text, p_description text, p_icon text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_learning_points(p_user_id uuid, p_event_type text, p_points integer, p_metadata jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.calculate_course_progress(p_user_id uuid, p_course_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.calculate_paper_slippage(p_symbol character varying, p_side character varying, p_order_type character varying, p_amount numeric, p_current_price numeric) SET search_path = public, pg_catalog;
ALTER FUNCTION public.can_place_trade(p_user_id uuid, p_amount_usd numeric) SET search_path = public, pg_catalog;
ALTER FUNCTION public.close_paper_position(position_id uuid, closing_price numeric, close_reason text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_leaderboard(p_timeframe text, p_limit integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_entitlements(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_role(user_uuid uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_signal_stats(user_uuid uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_subscription_tier(user_uuid uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_google_auth_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_portfolio() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user_portfolio() SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_paper_trades_count(user_uuid uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.initialize_user_settings() SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_trading_allowed() SET search_path = public, pg_catalog;
ALTER FUNCTION public.log_user_action(p_user_id uuid, p_action text, p_signal_id uuid, p_metadata jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_signal_status_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.record_app_event(p_user_id uuid, p_event_name text, p_props jsonb, p_session_id text, p_page_path text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.record_billing_event(p_user_id uuid, p_event_type text, p_from_tier text, p_to_tier text, p_amount_nok numeric, p_metadata jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.record_trade_usage(p_user_id uuid, p_amount_usd numeric) SET search_path = public, pg_catalog;
ALTER FUNCTION public.refresh_leaderboard() SET search_path = public, pg_catalog;
ALTER FUNCTION public.send_push_to_user(user_uuid uuid, notification_title text, notification_body text, notification_data jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_subscription_tier(p_user_id uuid, p_tier text, p_status text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_trading_mode(user_uuid uuid, new_mode text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at_column() SET search_path = public, pg_catalog;
ALTER FUNCTION public.store_exchange_connection(p_user_id uuid, p_exchange text, p_api_key text, p_api_secret_ciphertext text, p_api_secret_nonce text, p_permissions jsonb, p_is_testnet boolean) SET search_path = public, pg_catalog;
ALTER FUNCTION public.submit_quiz_attempt(p_user_id uuid, p_quiz_slug text, p_answers jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_binance_balances(p_user_id uuid, p_balances jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.track_campaign_registration() SET search_path = public, pg_catalog;
ALTER FUNCTION public.track_referral_click(p_referral_code text, p_source text, p_landing_page text, p_ip_address inet, p_user_agent text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_beta_approval_email() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_binance_auto_sync() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_update_readiness_score() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_course_progress() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_daily_stats_on_trade() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_followers_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_push_subscriptions_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_simulation_stats() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_transition_readiness_score(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;
ALTER FUNCTION public.upsert_daily_stats(p_user_id uuid, p_trade_pnl numeric) SET search_path = public, pg_catalog;
ALTER FUNCTION public.user_has_permission(user_uuid uuid, required_roles text[]) SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_follow() SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_signal_for_processing(signal_uuid uuid) SET search_path = public, pg_catalog;
