# Klarpakke Database Schema
> Auto-generert: 2026-03-10 18:55:05  
> Prosjekt: vuxbjlykgmzskxbclquf  
> Bruk denne filen som kontekst til KIMI / Perplexity / Claude

---

## Tabeller (oversikt)

| Tabell | RLS | Rader (estimert) |
|--------|-----|-----------------|
| _session_migration_map | ✅ | 0 |
| _trade_migration_map | ✅ | 0 |
| admin_alerts | ✅ | 0 |
| ai_analysis_logs | ✅ | 0 |
| ai_cache | ✅ | 0 |
| ai_decision_log | ✅ | 0 |
| analytics_events | ✅ | 0 |
| api_keys | ✅ | 0 |
| api_logs | ✅ | 0 |
| app_events | ✅ | 0 |
| archived_trade_summaries | ✅ | 0 |
| audit_logs | ✅ | 0 |
| auto_trade_daily_stats | ✅ | 0 |
| auto_trade_log | ✅ | 0 |
| auto_trade_settings | ✅ | 0 |
| auto_trades | ✅ | 0 |
| auto_trading_circuit_breaker_logs | ✅ | 0 |
| auto_trading_configs | ✅ | 0 |
| auto_trading_configs | ✅ | -1 |
| auto_trading_daily_metrics | ✅ | 0 |
| auto_trading_followers | ✅ | 0 |
| auto_trading_markets | ✅ | 0 |
| auto_trading_profit_extractions | ✅ | 0 |
| auto_trading_runs | ✅ | 0 |
| auto_trading_sessions | ✅ | 0 |
| auto_trading_strategies | ✅ | 4 |
| backup_policies_20260224 | ✅ | 233 |
| beta_applications | ✅ | 0 |
| beta_signups | ✅ | 5 |
| billing_events | ✅ | 0 |
| binance_balances | ✅ | 0 |
| binance_connections | ✅ | 0 |
| binance_key_access_log | ✅ | 0 |
| binance_sync_log | ✅ | 0 |
| bot_alert_configs | ✅ | 0 |
| bot_configs | ✅ | 0 |
| bot_health | ✅ | 1 |
| campaign_contacts | ✅ | 0 |
| client_errors | ✅ | 0 |
| coin_prices | ❌ | 10 |
| conditional_orders | ✅ | 0 |
| copy_trade_queue | ✅ | 0 |
| copy_trading_follows | ✅ | 0 |
| course_progress | ✅ | 0 |
| courses | ✅ | 7 |
| dca_bots | ✅ | 0 |
| email_log | ✅ | 0 |
| email_preferences | ✅ | 3 |
| email_tracking | ✅ | 0 |
| emergency_logs | ✅ | 0 |
| events | ✅ | 0 |
| exchange_api_keys | ✅ | 0 |
| exchange_connections | ✅ | 0 |
| execution_logs | ✅ | 0 |
| global_settings | ✅ | 1 |
| klt_earning_categories | ✅ | 9 |
| klt_founder_allocations | ✅ | 0 |
| klt_transactions | ✅ | 0 |
| kltbalances | ✅ | 0 |
| leaderboard_bots | ✅ | 0 |
| leaderboard_history | ❌ | 0 |
| leaderboard_monthly | ✅ | 0 |
| learning_events | ✅ | 0 |
| lessons | ✅ | 43 |
| live_trades | ✅ | 0 |
| market_volatility | ✅ | 0 |
| marketplace_listings | ✅ | 0 |
| marketplace_subscriptions | ✅ | 0 |
| mcp_audit_logs | ✅ | 9 |
| notification_queue | ✅ | 19 |
| notifications | ✅ | 0 |
| onboarding_events | ✅ | 0 |
| onboarding_progress | ✅ | 2 |
| orders | ✅ | 0 |
| paper_accounts | ✅ | 0 |
| paper_positions | ✅ | 0 |
| paper_trading_sessions | ✅ | 3 |
| paper_trading_sessions | ✅ | -1 |
| payment_history | ✅ | 0 |
| pending_orders | ✅ | 0 |
| performance_fees | ✅ | 0 |
| portfolio_history | ✅ | 0 |
| portfolio_positions | ✅ | 0 |
| portfolio_summary | ✅ | 0 |
| portfolios | ✅ | 3 |
| positions | ✅ | 0 |
| price_alerts | ✅ | 0 |
| push_subscriptions | ✅ | 0 |
| quiz_attempts | ✅ | 0 |
| quiz_questions | ✅ | 6 |
| quizzes | ✅ | 3 |
| real_positions | ✅ | 0 |
| referral_tracking | ✅ | 0 |
| risk_presets | ✅ | 5 |
| risk_profiles | ✅ | 9 |
| risk_profiles | ✅ | -1 |
| signals | ✅ | 0 |
| signup_funnel | ✅ | 0 |
| strategies | ✅ | 0 |
| strategy_followers | ✅ | 0 |
| strategy_logs | ✅ | 0 |
| strategy_reviews | ✅ | 0 |
| strategy_templates | ✅ | 4 |
| stripe_events | ✅ | 0 |
| stripe_products | ✅ | 4 |
| subscriptions | ✅ | 3 |
| system_health_logs | ✅ | 0 |
| trade_decisions | ✅ | 1 |
| trade_history | ✅ | 0 |
| trade_notes | ✅ | 0 |
| trade_rejections | ✅ | 6 |
| trade_sync_log | ✅ | 0 |
| trader_profiles | ✅ | 0 |
| trades | ✅ | 2 |
| trading_api_keys | ✅ | 0 |
| trading_logs | ✅ | 0 |
| trading_notifications | ✅ | 0 |
| trading_positions | ✅ | 0 |
| trading_sessions | ✅ | 14 |
| trading_signals | ✅ | 0 |
| unified_circuit_breaker_logs | ✅ | 0 |
| unified_copy_follows | ✅ | 0 |
| unified_daily_metrics | ✅ | 0 |
| unified_exchange_keys | ✅ | 0 |
| unified_notifications | ✅ | 0 |
| unified_trades | ✅ | 0 |
| unified_trading_sessions | ✅ | 0 |
| user_achievements | ✅ | 0 |
| user_auto_trading_configs | ✅ | 0 |
| user_binance_keys | ✅ | 0 |
| user_course_progress | ✅ | 0 |
| user_enrollments | ✅ | 0 |
| user_gamification | ✅ | 3 |
| user_klt_balances | ✅ | 3 |
| user_notification_settings | ✅ | 0 |
| user_portfolios | ✅ | 0 |
| user_profiles | ✅ | 3 |
| user_roles | ✅ | 0 |
| user_settings | ✅ | 0 |
| user_strategies | ✅ | 0 |
| user_trading_config | ✅ | 0 |
| user_trading_limits | ✅ | 0 |
| vipps_agreements | ✅ | 0 |
| vipps_payments | ✅ | 0 |
| wallets | ✅ | 0 |
| xp_transactions | ✅ | 0 |

## Kolonner per tabell

### _session_migration_map
### _trade_migration_map
### active_signals_summary
### admin_alerts
### ai_analysis_logs
### ai_cache
### ai_decision_log
### analytics_events
### api_keys
### api_logs
### app_events
### archived_trade_summaries
### audit_logs
### auto_trade_daily_stats
### auto_trade_log
### auto_trade_settings
### auto_trades
### auto_trading_circuit_breaker_logs
### auto_trading_configs
### auto_trading_daily_metrics
### auto_trading_followers
### auto_trading_markets
### auto_trading_profit_extractions
### auto_trading_runs
### auto_trading_sessions
### auto_trading_strategies
### backup_policies_20260224
### beta_applications
### beta_signups
### billing_events
### binance_balances
### binance_connections
### binance_key_access_log
### binance_sync_log
### bot_alert_configs
### bot_configs
### bot_health
### campaign_contacts
### campaign_stats
### client_errors
### coin_prices
### conditional_orders
### copy_trade_queue
### copy_trading_follows
### course_progress
### courses
### dca_bots
### email_log
### email_preferences
### email_tracking
### emergency_logs
### events
### exchange_api_keys
### exchange_connections
### execution_logs
### global_settings
### klt_earning_categories
### klt_founder_allocations
### klt_transactions
### kltbalances
### leaderboard_bots
### leaderboard_history
### leaderboard_monthly
### learning_events
### lessons
### live_trades
### market_volatility
### marketplace_listings
### marketplace_subscriptions
### mcp_audit_logs
### notification_queue
### notifications
### onboarding_events
### onboarding_progress
### orders
### paper_accounts
### paper_positions
### paper_trading_sessions
### payment_history
### pending_orders
### performance_fees
### portfolio_history
### portfolio_positions
### portfolio_summary
### portfolios
### positions
### price_alerts
### push_subscriptions
### quiz_attempts
### quiz_questions
### quizzes
### real_positions
### referral_tracking
### risk_presets
### risk_profiles
### signals
### signup_funnel
### signup_funnel_stats
### strategies
### strategy_followers
### strategy_logs
### strategy_reviews
### strategy_templates
### stripe_events
### stripe_products
### subscriptions
### system_health_logs
### trade_decisions
### trade_history
### trade_notes
### trade_rejections
### trade_sync_log
### trader_profiles
### trades
### trading_api_keys
### trading_logs
### trading_notifications
### trading_positions
### trading_sessions
### trading_signals
### unified_circuit_breaker_logs
### unified_copy_follows
### unified_daily_metrics
### unified_exchange_keys
### unified_notifications
### unified_trades
### unified_trading_sessions
### user_achievements
### user_auto_trading_configs
### user_binance_keys
### user_course_progress
### user_enrollments
### user_gamification
### user_klt_balances
### user_notification_settings
### user_portfolios
### user_profiles
### user_referrals_summary
### user_roles
### user_settings
### user_strategies
### user_trading_config
### user_trading_limits
### v_active_paper_positions
### vipps_agreements
### vipps_payments
### wallets
### xp_transactions
              Tabell               |              Kolonne              |            Type             | Nullable |                                                                                                                                                                    Default                                                                                                                                                                    
-----------------------------------+-----------------------------------+-----------------------------+----------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 _session_migration_map            | old_session_id                    | uuid                        | NO       | 
 _session_migration_map            | new_session_id                    | uuid                        | NO       | 
 _session_migration_map            | source_table                      | text                        | NO       | 
 _session_migration_map            | migrated_at                       | timestamp with time zone    | YES      | now()
 _trade_migration_map              | old_trade_id                      | uuid                        | NO       | 
 _trade_migration_map              | new_trade_id                      | uuid                        | NO       | 
 _trade_migration_map              | source_table                      | text                        | NO       | 
 _trade_migration_map              | migrated_at                       | timestamp with time zone    | YES      | now()
 active_signals_summary            | total_active                      | bigint                      | YES      | 
 active_signals_summary            | long_signals                      | bigint                      | YES      | 
 active_signals_summary            | short_signals                     | bigint                      | YES      | 
 active_signals_summary            | avg_confidence                    | numeric                     | YES      | 
 admin_alerts                      | id                                | uuid                        | NO       | gen_random_uuid()
 admin_alerts                      | type                              | text                        | NO       | 
 admin_alerts                      | severity                          | text                        | NO       | 
 admin_alerts                      | message                           | text                        | NO       | 
 admin_alerts                      | acknowledged                      | boolean                     | YES      | false
 admin_alerts                      | acknowledged_by                   | text                        | YES      | 
 admin_alerts                      | acknowledged_at                   | timestamp with time zone    | YES      | 
 admin_alerts                      | created_at                        | timestamp with time zone    | YES      | now()
 ai_analysis_logs                  | id                                | uuid                        | NO       | gen_random_uuid()
 ai_analysis_logs                  | user_id                           | uuid                        | NO       | 
 ai_analysis_logs                  | symbol                            | text                        | NO       | 
 ai_analysis_logs                  | prediction_action                 | text                        | NO       | 
 ai_analysis_logs                  | prediction_confidence             | numeric                     | NO       | 
 ai_analysis_logs                  | sentiment_score                   | numeric                     | NO       | 
 ai_analysis_logs                  | fear_greed_index                  | integer                     | YES      | 
 ai_analysis_logs                  | rsi                               | numeric                     | YES      | 
 ai_analysis_logs                  | target_price                      | numeric                     | YES      | 
 ai_analysis_logs                  | stop_loss                         | numeric                     | YES      | 
 ai_analysis_logs                  | reason                            | text                        | YES      | 
 ai_analysis_logs                  | executed                          | boolean                     | YES      | false
 ai_analysis_logs                  | trade_id                          | uuid                        | YES      | 
 ai_analysis_logs                  | timestamp                         | timestamp with time zone    | YES      | now()
 ai_cache                          | cache_key                         | text                        | NO       | 
 ai_cache                          | value                             | jsonb                       | NO       | 
 ai_cache                          | expires_at                        | timestamp with time zone    | NO       | 
 ai_cache                          | created_at                        | timestamp with time zone    | YES      | now()
 ai_cache                          | updated_at                        | timestamp with time zone    | YES      | now()
 ai_decision_log                   | id                                | uuid                        | NO       | gen_random_uuid()
 ai_decision_log                   | user_id                           | uuid                        | NO       | 
 ai_decision_log                   | decision_type                     | text                        | NO       | 
 ai_decision_log                   | symbol                            | text                        | NO       | 'BTC'::text
 ai_decision_log                   | sentiment_score                   | integer                     | YES      | 
 ai_decision_log                   | analysis_data                     | jsonb                       | YES      | 
 ai_decision_log                   | decision_reason                   | text                        | YES      | 
 ai_decision_log                   | executed_at                       | timestamp with time zone    | YES      | now()
 ai_decision_log                   | created_at                        | timestamp with time zone    | YES      | now()
 analytics_events                  | id                                | uuid                        | NO       | gen_random_uuid()
 analytics_events                  | user_id                           | uuid                        | YES      | 
 analytics_events                  | event_type                        | text                        | NO       | 
 analytics_events                  | event_name                        | text                        | NO       | 
 analytics_events                  | created_at                        | timestamp with time zone    | YES      | now()
 analytics_events                  | session_id                        | text                        | YES      | 
 api_keys                          | id                                | uuid                        | NO       | uuid_generate_v4()
 api_keys                          | user_id                           | uuid                        | NO       | 
 api_keys                          | exchange                          | text                        | NO       | 'binance'::text
 api_keys                          | api_key                           | text                        | NO       | 
 api_keys                          | api_secret                        | text                        | NO       | 
 api_keys                          | label                             | text                        | YES      | 
 api_keys                          | is_active                         | boolean                     | YES      | true
 api_keys                          | last_tested_at                    | timestamp with time zone    | YES      | 
 api_keys                          | test_status                       | text                        | YES      | 
 api_keys                          | test_error                        | text                        | YES      | 
 api_keys                          | permissions                       | jsonb                       | YES      | '{"spot": true, "margin": false, "futures": false}'::jsonb
 api_keys                          | created_at                        | timestamp with time zone    | NO       | timezone('utc'::text, now())
 api_keys                          | updated_at                        | timestamp with time zone    | NO       | timezone('utc'::text, now())
 api_logs                          | id                                | uuid                        | NO       | gen_random_uuid()
 api_logs                          | user_id                           | uuid                        | NO       | 
 api_logs                          | endpoint                          | text                        | NO       | 
 api_logs                          | method                            | text                        | NO       | 
 api_logs                          | status_code                       | integer                     | YES      | 
 api_logs                          | error_message                     | text                        | YES      | 
 api_logs                          | response_time_ms                  | integer                     | YES      | 
 api_logs                          | created_at                        | timestamp without time zone | YES      | now()
 app_events                        | id                                | uuid                        | NO       | gen_random_uuid()
 app_events                        | user_id                           | uuid                        | YES      | 
 app_events                        | event_name                        | text                        | NO       | 
 app_events                        | props                             | jsonb                       | YES      | '{}'::jsonb
 app_events                        | session_id                        | text                        | YES      | 
 app_events                        | page_path                         | text                        | YES      | 
 app_events                        | user_agent                        | text                        | YES      | 
 app_events                        | ip_address                        | inet                        | YES      | 
 app_events                        | created_at                        | timestamp with time zone    | YES      | now()
 archived_trade_summaries          | id                                | uuid                        | NO       | gen_random_uuid()
 archived_trade_summaries          | user_id                           | uuid                        | NO       | 
 archived_trade_summaries          | month                             | date                        | NO       | 
 archived_trade_summaries          | trading_pair                      | character varying           | NO       | 
 archived_trade_summaries          | total_trades                      | integer                     | YES      | 0
 archived_trade_summaries          | winning_trades                    | integer                     | YES      | 0
 archived_trade_summaries          | losing_trades                     | integer                     | YES      | 0
 archived_trade_summaries          | gross_pnl                         | numeric                     | YES      | 0.00
 archived_trade_summaries          | fees_paid                         | numeric                     | YES      | 0.00
 archived_trade_summaries          | net_pnl                           | numeric                     | YES      | 0.00
 audit_logs                        | id                                | uuid                        | NO       | gen_random_uuid()
 audit_logs                        | user_id                           | uuid                        | YES      | 
 audit_logs                        | action                            | text                        | NO       | 
 audit_logs                        | signal_id                         | uuid                        | YES      | 
 audit_logs                        | timestamp                         | timestamp with time zone    | YES      | now()
 audit_logs                        | metadata                          | jsonb                       | YES      | '{}'::jsonb
 auto_trade_daily_stats            | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trade_daily_stats            | user_id                           | uuid                        | NO       | 
 auto_trade_daily_stats            | date                              | date                        | NO       | 
 auto_trade_daily_stats            | total_trades                      | integer                     | YES      | 0
 auto_trade_daily_stats            | winning_trades                    | integer                     | YES      | 0
 auto_trade_daily_stats            | losing_trades                     | integer                     | YES      | 0
 auto_trade_daily_stats            | total_pnl                         | numeric                     | YES      | 0
 auto_trade_daily_stats            | total_realized_loss               | numeric                     | YES      | 0
 auto_trade_daily_stats            | total_realized_profit             | numeric                     | YES      | 0
 auto_trade_daily_stats            | daily_loss_limit_reached          | boolean                     | YES      | false
 auto_trade_daily_stats            | daily_trade_limit_reached         | boolean                     | YES      | false
 auto_trade_daily_stats            | limit_reached_at                  | timestamp with time zone    | YES      | 
 auto_trade_daily_stats            | created_at                        | timestamp with time zone    | YES      | now()
 auto_trade_daily_stats            | updated_at                        | timestamp with time zone    | YES      | now()
 auto_trade_log                    | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trade_log                    | user_id                           | uuid                        | NO       | 
 auto_trade_log                    | bot_config_id                     | uuid                        | YES      | 
 auto_trade_log                    | action                            | text                        | NO       | 
 auto_trade_log                    | symbol                            | text                        | NO       | 'BTC'::text
 auto_trade_log                    | amount_nok                        | numeric                     | YES      | 
 auto_trade_log                    | price_at_action                   | numeric                     | YES      | 
 auto_trade_log                    | reason                            | text                        | YES      | 
 auto_trade_log                    | sentiment_score                   | integer                     | YES      | 
 auto_trade_log                    | is_paper                          | boolean                     | YES      | true
 auto_trade_log                    | exchange_order_id                 | text                        | YES      | 
 auto_trade_log                    | status                            | text                        | YES      | 'pending'::text
 auto_trade_log                    | error_message                     | text                        | YES      | 
 auto_trade_log                    | executed_at                       | timestamp with time zone    | YES      | now()
 auto_trade_log                    | created_at                        | timestamp with time zone    | YES      | now()
 auto_trade_settings               | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trade_settings               | user_id                           | uuid                        | NO       | 
 auto_trade_settings               | auto_trading_enabled              | boolean                     | YES      | false
 auto_trade_settings               | risk_profile                      | text                        | NO       | 'moderate'::text
 auto_trade_settings               | max_position_percent              | numeric                     | NO       | 2.00
 auto_trade_settings               | daily_loss_limit_percent          | numeric                     | NO       | 5.00
 auto_trade_settings               | daily_trade_limit                 | integer                     | NO       | 10
 auto_trade_settings               | min_confidence                    | integer                     | YES      | 70
 auto_trade_settings               | allowed_symbols                   | ARRAY                       | YES      | 
 auto_trade_settings               | max_concurrent_positions          | integer                     | YES      | 5
 auto_trade_settings               | min_order_size_usdt               | numeric                     | YES      | 20.00
 auto_trade_settings               | notify_on_trade                   | boolean                     | YES      | true
 auto_trade_settings               | notify_on_sl_tp                   | boolean                     | YES      | true
 auto_trade_settings               | notify_on_daily_limit             | boolean                     | YES      | true
 auto_trade_settings               | created_at                        | timestamp with time zone    | YES      | now()
 auto_trade_settings               | updated_at                        | timestamp with time zone    | YES      | now()
 auto_trades                       | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trades                       | user_id                           | uuid                        | NO       | 
 auto_trades                       | signal_id                         | uuid                        | YES      | 
 auto_trades                       | order_id                          | text                        | YES      | 
 auto_trades                       | client_order_id                   | text                        | YES      | 
 auto_trades                       | symbol                            | text                        | NO       | 
 auto_trades                       | side                              | text                        | NO       | 
 auto_trades                       | quantity                          | numeric                     | YES      | 
 auto_trades                       | quantity_filled                   | numeric                     | YES      | 
 auto_trades                       | entry_price                       | numeric                     | YES      | 
 auto_trades                       | exit_price                        | numeric                     | YES      | 
 auto_trades                       | current_market_price              | numeric                     | YES      | 
 auto_trades                       | stop_loss                         | numeric                     | YES      | 
 auto_trades                       | take_profit                       | numeric                     | YES      | 
 auto_trades                       | realized_pnl                      | numeric                     | YES      | 0
 auto_trades                       | unrealized_pnl                    | numeric                     | YES      | 0
 auto_trades                       | commission                        | numeric                     | YES      | 0
 auto_trades                       | commission_asset                  | text                        | YES      | 
 auto_trades                       | status                            | text                        | NO       | 'pending'::text
 auto_trades                       | close_reason                      | text                        | YES      | 
 auto_trades                       | risk_profile_used                 | text                        | YES      | 
 auto_trades                       | max_position_percent_used         | numeric                     | YES      | 
 auto_trades                       | error_code                        | text                        | YES      | 
 auto_trades                       | error_message                     | text                        | YES      | 
 auto_trades                       | retry_count                       | integer                     | YES      | 0
 auto_trades                       | created_at                        | timestamp with time zone    | YES      | now()
 auto_trades                       | executed_at                       | timestamp with time zone    | YES      | 
 auto_trades                       | closed_at                         | timestamp with time zone    | YES      | 
 auto_trades                       | metadata                          | jsonb                       | YES      | 
 auto_trades                       | is_auto_trade                     | boolean                     | YES      | false
 auto_trades                       | auto_trading_run_id               | uuid                        | YES      | 
 auto_trading_circuit_breaker_logs | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_circuit_breaker_logs | session_id                        | uuid                        | NO       | 
 auto_trading_circuit_breaker_logs | user_id                           | uuid                        | NO       | 
 auto_trading_circuit_breaker_logs | trigger_type                      | text                        | NO       | 
 auto_trading_circuit_breaker_logs | trigger_value                     | text                        | YES      | 
 auto_trading_circuit_breaker_logs | action                            | text                        | NO       | 
 auto_trading_circuit_breaker_logs | resume_at                         | timestamp with time zone    | YES      | 
 auto_trading_circuit_breaker_logs | is_resolved                       | boolean                     | YES      | false
 auto_trading_circuit_breaker_logs | resolved_at                       | timestamp with time zone    | YES      | 
 auto_trading_circuit_breaker_logs | resolved_by                       | text                        | YES      | 
 auto_trading_circuit_breaker_logs | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_configs              | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_configs              | user_id                           | uuid                        | NO       | 
 auto_trading_configs              | risk_profile_id                   | uuid                        | YES      | 
 auto_trading_configs              | is_enabled                        | boolean                     | YES      | false
 auto_trading_configs              | strategy                          | text                        | NO       | 
 auto_trading_configs              | config                            | jsonb                       | YES      | '{}'::jsonb
 auto_trading_configs              | last_executed_at                  | timestamp with time zone    | YES      | 
 auto_trading_configs              | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_configs              | updated_at                        | timestamp with time zone    | YES      | now()
 auto_trading_daily_metrics        | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_daily_metrics        | session_id                        | uuid                        | NO       | 
 auto_trading_daily_metrics        | user_id                           | uuid                        | NO       | 
 auto_trading_daily_metrics        | date                              | date                        | NO       | 
 auto_trading_daily_metrics        | trades_count                      | integer                     | YES      | 0
 auto_trading_daily_metrics        | winning_trades                    | integer                     | YES      | 0
 auto_trading_daily_metrics        | losing_trades                     | integer                     | YES      | 0
 auto_trading_daily_metrics        | daily_pnl_nok                     | numeric                     | YES      | 0
 auto_trading_daily_metrics        | daily_pnl_pct                     | numeric                     | YES      | 0
 auto_trading_daily_metrics        | cumulative_pnl_nok                | numeric                     | YES      | 0
 auto_trading_daily_metrics        | cumulative_pnl_pct                | numeric                     | YES      | 0
 auto_trading_daily_metrics        | starting_capital_nok              | numeric                     | NO       | 
 auto_trading_daily_metrics        | ending_capital_nok                | numeric                     | NO       | 
 auto_trading_daily_metrics        | max_drawdown_pct                  | numeric                     | YES      | 0
 auto_trading_daily_metrics        | win_rate_pct                      | numeric                     | YES      | 0
 auto_trading_daily_metrics        | profit_factor                     | numeric                     | YES      | 
 auto_trading_daily_metrics        | circuit_breaker_triggered         | boolean                     | YES      | false
 auto_trading_daily_metrics        | daily_loss_limit_reached          | boolean                     | YES      | false
 auto_trading_daily_metrics        | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_followers            | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_followers            | follower_user_id                  | uuid                        | NO       | 
 auto_trading_followers            | followed_session_id               | uuid                        | NO       | 
 auto_trading_followers            | follower_session_id               | uuid                        | NO       | 
 auto_trading_followers            | started_at                        | timestamp with time zone    | NO       | now()
 auto_trading_followers            | stopped_at                        | timestamp with time zone    | YES      | 
 auto_trading_followers            | is_active                         | boolean                     | NO       | true
 auto_trading_followers            | total_copied_trades               | integer                     | NO       | 0
 auto_trading_followers            | total_pnl_nok                     | numeric                     | NO       | 0
 auto_trading_followers            | created_at                        | timestamp with time zone    | NO       | now()
 auto_trading_followers            | updated_at                        | timestamp with time zone    | NO       | now()
 auto_trading_markets              | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_markets              | user_id                           | uuid                        | NO       | 
 auto_trading_markets              | symbol                            | text                        | NO       | 
 auto_trading_markets              | enabled                           | boolean                     | YES      | true
 auto_trading_markets              | created_at                        | timestamp without time zone | YES      | now()
 auto_trading_markets              | updated_at                        | timestamp without time zone | YES      | now()
 auto_trading_profit_extractions   | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_profit_extractions   | session_id                        | uuid                        | NO       | 
 auto_trading_profit_extractions   | user_id                           | uuid                        | NO       | 
 auto_trading_profit_extractions   | total_profit_nok                  | numeric                     | NO       | 
 auto_trading_profit_extractions   | total_profit_pct                  | numeric                     | NO       | 
 auto_trading_profit_extractions   | extracted_amount_nok              | numeric                     | NO       | 
 auto_trading_profit_extractions   | extracted_pct                     | numeric                     | NO       | 
 auto_trading_profit_extractions   | remaining_profit_nok              | numeric                     | NO       | 
 auto_trading_profit_extractions   | capital_before_nok                | numeric                     | NO       | 
 auto_trading_profit_extractions   | capital_after_nok                 | numeric                     | NO       | 
 auto_trading_profit_extractions   | extraction_method                 | text                        | YES      | 'auto'::text
 auto_trading_profit_extractions   | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_runs                 | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_runs                 | user_id                           | uuid                        | NO       | 
 auto_trading_runs                 | run_timestamp                     | timestamp without time zone | YES      | now()
 auto_trading_runs                 | binance_balance_nok               | double precision            | YES      | 
 auto_trading_runs                 | max_auto_budget_nok               | double precision            | YES      | 
 auto_trading_runs                 | allocated_in_open_trades_nok      | double precision            | YES      | 
 auto_trading_runs                 | available_auto_budget_nok         | double precision            | YES      | 
 auto_trading_runs                 | signals_evaluated                 | integer                     | YES      | 0
 auto_trading_runs                 | trades_placed                     | integer                     | YES      | 0
 auto_trading_runs                 | total_order_value_nok             | double precision            | YES      | 0
 auto_trading_runs                 | trades_bought                     | integer                     | YES      | 0
 auto_trading_runs                 | trades_sold                       | integer                     | YES      | 0
 auto_trading_runs                 | status                            | text                        | NO       | 'success'::text
 auto_trading_runs                 | error_message                     | text                        | YES      | 
 auto_trading_runs                 | execution_time_ms                 | integer                     | YES      | 
 auto_trading_runs                 | created_at                        | timestamp without time zone | YES      | now()
 auto_trading_sessions             | id                                | uuid                        | NO       | gen_random_uuid()
 auto_trading_sessions             | user_id                           | uuid                        | NO       | 
 auto_trading_sessions             | name                              | text                        | NO       | 
 auto_trading_sessions             | strategy_type                     | text                        | NO       | 
 auto_trading_sessions             | status                            | text                        | YES      | 'active'::text
 auto_trading_sessions             | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_sessions             | updated_at                        | timestamp with time zone    | YES      | now()
 auto_trading_strategies           | id                                | text                        | NO       | 
 auto_trading_strategies           | name                              | text                        | NO       | 
 auto_trading_strategies           | risk_level                        | text                        | NO       | 
 auto_trading_strategies           | description                       | text                        | NO       | 
 auto_trading_strategies           | timeframe                         | text                        | YES      | '1h'::text
 auto_trading_strategies           | max_position_size_pct             | numeric                     | NO       | 
 auto_trading_strategies           | stop_loss_pct                     | numeric                     | NO       | 
 auto_trading_strategies           | take_profit_pct                   | numeric                     | YES      | 
 auto_trading_strategies           | daily_loss_limit_pct              | numeric                     | NO       | 
 auto_trading_strategies           | max_trades_per_day                | integer                     | NO       | 
 auto_trading_strategies           | allow_long                        | boolean                     | YES      | true
 auto_trading_strategies           | allow_short                       | boolean                     | YES      | true
 auto_trading_strategies           | max_leverage                      | integer                     | YES      | 1
 auto_trading_strategies           | allowed_symbols                   | ARRAY                       | YES      | '{}'::text[]
 auto_trading_strategies           | expected_annual_return_pct        | numeric                     | YES      | 
 auto_trading_strategies           | is_active                         | boolean                     | YES      | true
 auto_trading_strategies           | created_at                        | timestamp with time zone    | YES      | now()
 auto_trading_strategies           | updated_at                        | timestamp with time zone    | YES      | now()
 backup_policies_20260224          | schemaname                        | name                        | YES      | 
 backup_policies_20260224          | tablename                         | name                        | YES      | 
 backup_policies_20260224          | policyname                        | name                        | YES      | 
 backup_policies_20260224          | permissive                        | text                        | YES      | 
 backup_policies_20260224          | roles                             | ARRAY                       | YES      | 
 backup_policies_20260224          | cmd                               | text                        | YES      | 
 backup_policies_20260224          | qual                              | text                        | YES      | 
 backup_policies_20260224          | with_check                        | text                        | YES      | 
 backup_policies_20260224          | backed_up_at                      | timestamp with time zone    | YES      | 
 beta_applications                 | id                                | uuid                        | NO       | gen_random_uuid()
 beta_applications                 | user_id                           | uuid                        | YES      | 
 beta_applications                 | trading_experience                | text                        | NO       | 
 beta_applications                 | motivation                        | text                        | YES      | 
 beta_applications                 | risk_tolerance                    | text                        | YES      | 
 beta_applications                 | application_status                | text                        | YES      | 'pending'::text
 beta_applications                 | created_at                        | timestamp with time zone    | YES      | now()
 beta_applications                 | updated_at                        | timestamp with time zone    | YES      | now()
 beta_signups                      | id                                | uuid                        | NO       | gen_random_uuid()
 beta_signups                      | email                             | text                        | NO       | 
 beta_signups                      | source                            | text                        | YES      | 
 beta_signups                      | created_at                        | timestamp with time zone    | YES      | now()
 billing_events                    | id                                | uuid                        | NO       | gen_random_uuid()
 billing_events                    | user_id                           | uuid                        | NO       | 
 billing_events                    | event_type                        | text                        | NO       | 
 billing_events                    | from_tier                         | text                        | YES      | 
 billing_events                    | to_tier                           | text                        | YES      | 
 billing_events                    | amount_nok                        | numeric                     | YES      | 
 billing_events                    | stripe_invoice_id                 | text                        | YES      | 
 billing_events                    | stripe_payment_intent_id          | text                        | YES      | 
 billing_events                    | metadata                          | jsonb                       | YES      | '{}'::jsonb
 billing_events                    | created_at                        | timestamp with time zone    | YES      | now()
 binance_balances                  | id                                | uuid                        | NO       | gen_random_uuid()
 binance_balances                  | user_id                           | uuid                        | YES      | 
 binance_balances                  | connection_id                     | uuid                        | YES      | 
 binance_balances                  | asset                             | text                        | NO       | 
 binance_balances                  | free                              | numeric                     | YES      | 0
 binance_balances                  | locked                            | numeric                     | YES      | 0
 binance_balances                  | total                             | numeric                     | YES      | 0
 binance_balances                  | usd_value                         | numeric                     | YES      | 0
 binance_balances                  | nok_value                         | numeric                     | YES      | 0
 binance_balances                  | updated_at                        | timestamp with time zone    | YES      | now()
 binance_connections               | id                                | uuid                        | NO       | gen_random_uuid()
 binance_connections               | user_id                           | uuid                        | YES      | 
 binance_connections               | api_key                           | text                        | NO       | 
 binance_connections               | api_secret                        | text                        | NO       | 
 binance_connections               | account_type                      | text                        | YES      | 'spot'::text
 binance_connections               | is_active                         | boolean                     | YES      | true
 binance_connections               | last_sync_at                      | timestamp with time zone    | YES      | 
 binance_connections               | created_at                        | timestamp with time zone    | YES      | now()
 binance_connections               | updated_at                        | timestamp with time zone    | YES      | now()
 binance_key_access_log            | id                                | uuid                        | NO       | gen_random_uuid()
 binance_key_access_log            | user_id                           | uuid                        | NO       | 
 binance_key_access_log            | action                            | text                        | NO       | 
 binance_key_access_log            | success                           | boolean                     | NO       | 
 binance_key_access_log            | error_message                     | text                        | YES      | 
 binance_key_access_log            | ip_address                        | text                        | YES      | 
 binance_key_access_log            | user_agent                        | text                        | YES      | 
 binance_key_access_log            | created_at                        | timestamp with time zone    | NO       | now()
 binance_sync_log                  | id                                | uuid                        | NO       | gen_random_uuid()
 binance_sync_log                  | user_id                           | uuid                        | NO       | 
 binance_sync_log                  | status                            | text                        | NO       | 
 binance_sync_log                  | message                           | text                        | YES      | 
 binance_sync_log                  | balances_synced                   | integer                     | YES      | 0
 binance_sync_log                  | positions_synced                  | integer                     | YES      | 0
 binance_sync_log                  | started_at                        | timestamp with time zone    | YES      | now()
 binance_sync_log                  | completed_at                      | timestamp with time zone    | YES      | 
 binance_sync_log                  | error_details                     | text                        | YES      | 
 binance_sync_log                  | created_at                        | timestamp with time zone    | YES      | now()
 bot_alert_configs                 | id                                | uuid                        | NO       | gen_random_uuid()
 bot_alert_configs                 | user_id                           | uuid                        | NO       | 
 bot_alert_configs                 | strategy_id                       | uuid                        | NO       | 
 bot_alert_configs                 | drawdown_threshold_pct            | numeric                     | YES      | 10
 bot_alert_configs                 | daily_loss_limit_nok              | numeric                     | YES      | 
 bot_alert_configs                 | notify_on_trade                   | boolean                     | YES      | true
 bot_alert_configs                 | notify_on_error                   | boolean                     | YES      | true
 bot_alert_configs                 | notification_channels             | ARRAY                       | YES      | '{push}'::text[]
 bot_alert_configs                 | created_at                        | timestamp with time zone    | YES      | now()
 bot_alert_configs                 | updated_at                        | timestamp with time zone    | YES      | now()
 bot_configs                       | id                                | uuid                        | NO       | gen_random_uuid()
 bot_configs                       | user_id                           | uuid                        | NO       | 
 bot_configs                       | bot_name                          | text                        | NO       | 'Min Bot'::text
 bot_configs                       | strategy_type                     | text                        | NO       | 'dca'::text
 bot_configs                       | is_active                         | boolean                     | YES      | false
 bot_configs                       | is_paper_trade                    | boolean                     | YES      | true
 bot_configs                       | dca_interval_minutes              | integer                     | YES      | 60
 bot_configs                       | dca_amount_nok                    | numeric                     | YES      | 500
 bot_configs                       | stop_loss_percent                 | numeric                     | YES      | 5.0
 bot_configs                       | take_profit_percent               | numeric                     | YES      | 15.0
 bot_configs                       | max_position_size_percent         | numeric                     | YES      | 10.0
 bot_configs                       | ai_adaptive_enabled               | boolean                     | YES      | true
 bot_configs                       | last_ai_adjustment_at             | timestamp with time zone    | YES      | 
 bot_configs                       | created_at                        | timestamp with time zone    | YES      | now()
 bot_configs                       | updated_at                        | timestamp with time zone    | YES      | now()
 bot_health                        | id                                | uuid                        | NO       | gen_random_uuid()
 bot_health                        | bot_name                          | text                        | NO       | 
 bot_health                        | status                            | text                        | NO       | 'idle'::text
 bot_health                        | last_error                        | text                        | YES      | 
 bot_health                        | last_heartbeat                    | timestamp with time zone    | YES      | now()
 bot_health                        | metadata                          | jsonb                       | YES      | '{}'::jsonb
 bot_health                        | created_at                        | timestamp with time zone    | YES      | now()
 bot_health                        | updated_at                        | timestamp with time zone    | YES      | now()
 bot_health                        | user_id                           | uuid                        | YES      | 
 bot_health                        | error_count                       | integer                     | YES      | 0
 bot_health                        | consecutive_errors                | integer                     | YES      | 0
 bot_health                        | max_consecutive_errors            | integer                     | YES      | 3
 campaign_contacts                 | id                                | text                        | NO       | 
 campaign_contacts                 | email                             | text                        | NO       | 
 campaign_contacts                 | first_name                        | text                        | YES      | 
 campaign_contacts                 | last_name                         | text                        | YES      | 
 campaign_contacts                 | company                           | text                        | YES      | 
 campaign_contacts                 | position                          | text                        | YES      | 
 campaign_contacts                 | source                            | text                        | YES      | 'linkedin'::text
 campaign_contacts                 | status                            | text                        | YES      | 'pending'::text
 campaign_contacts                 | tags                              | ARRAY                       | YES      | '{}'::text[]
 campaign_contacts                 | sequence                          | integer                     | YES      | 1
 campaign_contacts                 | sent_at                           | timestamp with time zone    | YES      | 
 campaign_contacts                 | opened_at                         | timestamp with time zone    | YES      | 
 campaign_contacts                 | clicked_at                        | timestamp with time zone    | YES      | 
 campaign_contacts                 | registered_at                     | timestamp with time zone    | YES      | 
 campaign_contacts                 | unsubscribed_at                   | timestamp with time zone    | YES      | 
 campaign_contacts                 | created_at                        | timestamp with time zone    | YES      | now()
 campaign_contacts                 | updated_at                        | timestamp with time zone    | YES      | now()
 campaign_stats                    | total_contacts                    | bigint                      | YES      | 
 campaign_stats                    | emails_sent                       | bigint                      | YES      | 
 campaign_stats                    | emails_opened                     | bigint                      | YES      | 
 campaign_stats                    | emails_clicked                    | bigint                      | YES      | 
 campaign_stats                    | registered                        | bigint                      | YES      | 
 campaign_stats                    | bounced                           | bigint                      | YES      | 
 campaign_stats                    | unsubscribed                      | bigint                      | YES      | 
 campaign_stats                    | open_rate                         | numeric                     | YES      | 
 campaign_stats                    | click_rate                        | numeric                     | YES      | 
 client_errors                     | id                                | uuid                        | NO       | gen_random_uuid()
 client_errors                     | user_id                           | uuid                        | YES      | 
 client_errors                     | error_message                     | text                        | NO       | 
 client_errors                     | is_resolved                       | boolean                     | YES      | false
 client_errors                     | created_at                        | timestamp with time zone    | YES      | now()
 coin_prices                       | id                                | uuid                        | NO       | gen_random_uuid()
 coin_prices                       | symbol                            | text                        | NO       | 
 coin_prices                       | name                              | text                        | NO       | 
 coin_prices                       | price                             | numeric                     | NO       | 0
 coin_prices                       | price_change_24h                  | numeric                     | YES      | 
 coin_prices                       | price_change_percent_24h          | numeric                     | YES      | 
 coin_prices                       | volume_24h                        | numeric                     | YES      | 
 coin_prices                       | market_cap                        | numeric                     | YES      | 
 coin_prices                       | high_24h                          | numeric                     | YES      | 
 coin_prices                       | low_24h                           | numeric                     | YES      | 
 coin_prices                       | last_updated                      | timestamp with time zone    | YES      | now()
 coin_prices                       | created_at                        | timestamp with time zone    | NO       | now()
 conditional_orders                | id                                | uuid                        | NO       | gen_random_uuid()
 conditional_orders                | user_id                           | uuid                        | NO       | 
 conditional_orders                | session_id                        | uuid                        | NO       | 
 conditional_orders                | symbol                            | text                        | NO       | 
 conditional_orders                | type                              | text                        | NO       | 
 conditional_orders                | side                              | text                        | NO       | 
 conditional_orders                | quantity                          | numeric                     | NO       | 
 conditional_orders                | trigger_price                     | numeric                     | NO       | 
 conditional_orders                | limit_price                       | numeric                     | NO       | 
 conditional_orders                | trailing_percent                  | numeric                     | YES      | 
 conditional_orders                | current_price_at_creation         | numeric                     | YES      | 
 conditional_orders                | status                            | text                        | NO       | 'pending'::text
 conditional_orders                | mode                              | text                        | NO       | 
 conditional_orders                | triggered_at                      | timestamp with time zone    | YES      | 
 conditional_orders                | executed_at                       | timestamp with time zone    | YES      | 
 conditional_orders                | created_at                        | timestamp with time zone    | YES      | now()
 conditional_orders                | updated_at                        | timestamp with time zone    | YES      | now()
 copy_trade_queue                  | id                                | uuid                        | NO       | gen_random_uuid()
 copy_trade_queue                  | original_trade_id                 | uuid                        | NO       | 
 copy_trade_queue                  | leader_id                         | uuid                        | NO       | 
 copy_trade_queue                  | follower_id                       | uuid                        | NO       | 
 copy_trade_queue                  | allocation_percent                | numeric                     | NO       | 
 copy_trade_queue                  | status                            | character varying           | NO       | 'pending'::character varying
 copy_trade_queue                  | processed_at                      | timestamp with time zone    | YES      | 
 copy_trade_queue                  | error_message                     | text                        | YES      | 
 copy_trade_queue                  | created_at                        | timestamp with time zone    | NO       | now()
 copy_trading_follows              | id                                | uuid                        | NO       | gen_random_uuid()
 copy_trading_follows              | follower_id                       | uuid                        | NO       | 
 copy_trading_follows              | leader_id                         | uuid                        | NO       | 
 copy_trading_follows              | allocation_percent                | numeric                     | NO       | 
 copy_trading_follows              | max_trade_amount                  | numeric                     | YES      | 
 copy_trading_follows              | created_at                        | timestamp with time zone    | NO       | now()
 copy_trading_follows              | scale_factor                      | numeric                     | YES      | 1.0
 copy_trading_follows              | is_active                         | boolean                     | YES      | true
 course_progress                   | id                                | uuid                        | NO       | gen_random_uuid()
 course_progress                   | user_id                           | uuid                        | YES      | 
 course_progress                   | course_id                         | uuid                        | YES      | 
 course_progress                   | status                            | text                        | YES      | 'not_started'::text
 course_progress                   | progress_percentage               | integer                     | YES      | 0
 course_progress                   | created_at                        | timestamp with time zone    | YES      | now()
 courses                           | id                                | uuid                        | NO       | gen_random_uuid()
 courses                           | slug                              | text                        | NO       | 
 courses                           | title                             | text                        | NO       | 
 courses                           | description                       | text                        | YES      | 
 courses                           | short_description                 | text                        | YES      | 
 courses                           | level                             | text                        | YES      | 'beginner'::text
 courses                           | duration_hours                    | integer                     | YES      | 4
 courses                           | order_index                       | integer                     | YES      | 0
 courses                           | image_url                         | text                        | YES      | 
 courses                           | is_published                      | boolean                     | YES      | true
 courses                           | price_nok                         | integer                     | YES      | 0
 courses                           | created_at                        | timestamp with time zone    | YES      | now()
 courses                           | updated_at                        | timestamp with time zone    | YES      | now()
 courses                           | instructor_id                     | uuid                        | YES      | 
 courses                           | is_free                           | boolean                     | YES      | false
 courses                           | published_at                      | timestamp with time zone    | YES      | 
 courses                           | thumbnail_url                     | text                        | YES      | 
 courses                           | category                          | text                        | YES      | 
 courses                           | tags                              | ARRAY                       | YES      | 
 courses                           | duration_minutes                  | integer                     | YES      | 
 courses                           | sort_order                        | integer                     | YES      | 0
 courses                           | lekepenger_belop                  | integer                     | YES      | 10000
 courses                           | har_auto_trade                    | boolean                     | YES      | false
 dca_bots                          | id                                | uuid                        | NO       | gen_random_uuid()
 dca_bots                          | user_id                           | uuid                        | NO       | 
 dca_bots                          | amount_per_month                  | integer                     | NO       | 
 dca_bots                          | crypto                            | text                        | NO       | 
 dca_bots                          | frequency                         | text                        | NO       | 
 dca_bots                          | is_active                         | boolean                     | YES      | true
 dca_bots                          | next_purchase_at                  | timestamp with time zone    | NO       | 
 dca_bots                          | total_invested                    | numeric                     | YES      | 0
 dca_bots                          | total_purchases                   | integer                     | YES      | 0
 dca_bots                          | created_at                        | timestamp with time zone    | YES      | now()
 dca_bots                          | updated_at                        | timestamp with time zone    | YES      | now()
 email_log                         | id                                | uuid                        | NO       | gen_random_uuid()
 email_log                         | user_id                           | uuid                        | NO       | 
 email_log                         | email_type                        | text                        | NO       | 
 email_log                         | recipient_email                   | text                        | NO       | 
 email_log                         | subject                           | text                        | NO       | 
 email_log                         | status                            | text                        | NO       | 
 email_log                         | resend_id                         | text                        | YES      | 
 email_log                         | error_message                     | text                        | YES      | 
 email_log                         | sent_at                           | timestamp with time zone    | YES      | 
 email_log                         | delivered_at                      | timestamp with time zone    | YES      | 
 email_log                         | created_at                        | timestamp with time zone    | YES      | now()
 email_preferences                 | id                                | uuid                        | NO       | gen_random_uuid()
 email_preferences                 | user_id                           | uuid                        | NO       | 
 email_preferences                 | marketing_emails                  | boolean                     | YES      | false
 email_preferences                 | transaction_emails                | boolean                     | YES      | true
 email_preferences                 | gamification_emails               | boolean                     | YES      | true
 email_preferences                 | trading_alerts                    | boolean                     | YES      | true
 email_preferences                 | digest_emails                     | text                        | YES      | 'weekly'::text
 email_preferences                 | created_at                        | timestamp with time zone    | YES      | now()
 email_preferences                 | updated_at                        | timestamp with time zone    | YES      | now()
 email_tracking                    | id                                | uuid                        | NO       | gen_random_uuid()
 email_tracking                    | contact_id                        | text                        | YES      | 
 email_tracking                    | email                             | text                        | YES      | 
 email_tracking                    | sequence                          | integer                     | YES      | 
 email_tracking                    | event                             | text                        | NO       | 
 email_tracking                    | url                               | text                        | YES      | 
 email_tracking                    | user_agent                        | text                        | YES      | 
 email_tracking                    | ip                                | text                        | YES      | 
 email_tracking                    | created_at                        | timestamp with time zone    | YES      | now()
 emergency_logs                    | id                                | uuid                        | NO       | gen_random_uuid()
 emergency_logs                    | triggered_by                      | text                        | NO       | 
 emergency_logs                    | reason                            | text                        | NO       | 
 emergency_logs                    | affected_sessions                 | integer                     | YES      | 0
 emergency_logs                    | closed_positions                  | integer                     | YES      | 0
 emergency_logs                    | timestamp                         | timestamp with time zone    | YES      | now()
 events                            | id                                | uuid                        | NO       | gen_random_uuid()
 events                            | user_id                           | uuid                        | YES      | 
 events                            | event_type                        | text                        | NO       | 
 events                            | event_data                        | jsonb                       | YES      | '{}'::jsonb
 events                            | created_at                        | timestamp with time zone    | YES      | now()
 exchange_api_keys                 | id                                | uuid                        | NO       | gen_random_uuid()
 exchange_api_keys                 | user_id                           | uuid                        | NO       | 
 exchange_api_keys                 | exchange                          | text                        | NO       | 
 exchange_api_keys                 | api_key_encrypted                 | text                        | NO       | 
 exchange_api_keys                 | api_secret_encrypted              | text                        | NO       | 
 exchange_api_keys                 | is_active                         | boolean                     | YES      | true
 exchange_api_keys                 | is_testnet                        | boolean                     | YES      | true
 exchange_api_keys                 | created_at                        | timestamp with time zone    | YES      | now()
 exchange_api_keys                 | updated_at                        | timestamp with time zone    | YES      | now()
 exchange_api_keys                 | last_validated_at                 | timestamp with time zone    | YES      | 
 exchange_connections              | id                                | uuid                        | NO       | gen_random_uuid()
 exchange_connections              | user_id                           | uuid                        | NO       | 
 exchange_connections              | exchange                          | text                        | NO       | 
 exchange_connections              | api_key                           | text                        | NO       | 
 exchange_connections              | api_secret_ciphertext             | text                        | NO       | 
 exchange_connections              | api_secret_nonce                  | text                        | NO       | 
 exchange_connections              | permissions                       | jsonb                       | YES      | '{"spot": true, "margin": false, "futures": false}'::jsonb
 exchange_connections              | is_testnet                        | boolean                     | YES      | true
 exchange_connections              | is_active                         | boolean                     | YES      | true
 exchange_connections              | last_validated_at                 | timestamp with time zone    | YES      | 
 exchange_connections              | last_error                        | text                        | YES      | 
 exchange_connections              | created_at                        | timestamp with time zone    | YES      | now()
 exchange_connections              | revoked_at                        | timestamp with time zone    | YES      | 
 execution_logs                    | id                                | uuid                        | NO       | gen_random_uuid()
 execution_logs                    | user_id                           | uuid                        | YES      | 
 execution_logs                    | trading_mode                      | text                        | NO       | 
 execution_logs                    | symbol                            | text                        | NO       | 
 execution_logs                    | side                              | text                        | NO       | 
 execution_logs                    | type                              | text                        | NO       | 
 execution_logs                    | binance_price                     | numeric                     | NO       | 
 execution_logs                    | executed_price                    | numeric                     | NO       | 
 execution_logs                    | bid_price                         | numeric                     | YES      | 
 execution_logs                    | ask_price                         | numeric                     | YES      | 
 execution_logs                    | price_deviation_pct               | numeric                     | NO       | 
 execution_logs                    | slippage_pct                      | numeric                     | NO       | 
 execution_logs                    | slippage_amount                   | numeric                     | NO       | 
 execution_logs                    | fees_paid                         | numeric                     | NO       | 
 execution_logs                    | total_cost                        | numeric                     | NO       | 
 execution_logs                    | fill_rate                         | numeric                     | NO       | 100
 execution_logs                    | execution_time_ms                 | integer                     | NO       | 
 execution_logs                    | created_at                        | timestamp with time zone    | YES      | now()
 global_settings                   | id                                | integer                     | NO       | 1
 global_settings                   | emergency_stop                    | boolean                     | YES      | false
 global_settings                   | emergency_triggered_at            | timestamp with time zone    | YES      | 
 global_settings                   | emergency_triggered_by            | text                        | YES      | 
 global_settings                   | emergency_reason                  | text                        | YES      | 
 global_settings                   | emergency_resolved_at             | timestamp with time zone    | YES      | 
 global_settings                   | emergency_resolved_by             | text                        | YES      | 
 global_settings                   | emergency_resolution              | text                        | YES      | 
 global_settings                   | updated_at                        | timestamp with time zone    | YES      | now()
 klt_earning_categories            | id                                | character varying           | NO       | 
 klt_earning_categories            | name_no                           | text                        | NO       | 
 klt_earning_categories            | name_en                           | text                        | NO       | 
 klt_earning_categories            | amount                            | integer                     | NO       | 0
 klt_earning_categories            | cooldown_minutes                  | integer                     | YES      | 0
 klt_earning_categories            | max_per_day                       | integer                     | YES      | 
 klt_earning_categories            | is_active                         | boolean                     | YES      | true
 klt_earning_categories            | description_no                    | text                        | YES      | 
 klt_earning_categories            | description_en                    | text                        | YES      | 
 klt_founder_allocations           | id                                | uuid                        | NO       | gen_random_uuid()
 klt_founder_allocations           | user_id                           | uuid                        | NO       | 
 klt_founder_allocations           | amount                            | integer                     | NO       | 10000
 klt_founder_allocations           | claimed                           | boolean                     | YES      | false
 klt_founder_allocations           | claimed_at                        | timestamp with time zone    | YES      | 
 klt_founder_allocations           | student_number                    | integer                     | NO       | 
 klt_founder_allocations           | created_at                        | timestamp with time zone    | YES      | now()
 klt_transactions                  | id                                | uuid                        | NO       | gen_random_uuid()
 klt_transactions                  | user_id                           | uuid                        | NO       | 
 klt_transactions                  | amount                            | integer                     | NO       | 
 klt_transactions                  | type                              | character varying           | NO       | 
 klt_transactions                  | category                          | character varying           | NO       | 
 klt_transactions                  | description                       | text                        | NO       | 
 klt_transactions                  | metadata                          | jsonb                       | YES      | '{}'::jsonb
 klt_transactions                  | created_at                        | timestamp with time zone    | YES      | now()
 klt_transactions                  | reason                            | text                        | YES      | 
 kltbalances                       | userid                            | uuid                        | NO       | 
 kltbalances                       | balance                           | bigint                      | NO       | 500
 kltbalances                       | total_earned                      | bigint                      | NO       | 500
 kltbalances                       | total_spent                       | bigint                      | NO       | 0
 kltbalances                       | created_at                        | timestamp with time zone    | YES      | now()
 kltbalances                       | updated_at                        | timestamp with time zone    | YES      | now()
 leaderboard_bots                  | id                                | uuid                        | NO       | gen_random_uuid()
 leaderboard_bots                  | user_id                           | uuid                        | NO       | 
 leaderboard_bots                  | display_name                      | text                        | NO       | 
 leaderboard_bots                  | avatar_url                        | text                        | YES      | 
 leaderboard_bots                  | pnl_30d                           | numeric                     | YES      | 0.0
 leaderboard_bots                  | pnl_90d                           | numeric                     | YES      | 0.0
 leaderboard_bots                  | pnl_all_time                      | numeric                     | YES      | 0.0
 leaderboard_bots                  | win_rate                          | numeric                     | YES      | 0.0
 leaderboard_bots                  | sharpe_ratio                      | numeric                     | YES      | 0.0
 leaderboard_bots                  | follower_count                    | integer                     | YES      | 0
 leaderboard_bots                  | performance_fee_pct               | numeric                     | YES      | 0.0
 leaderboard_bots                  | strategy_type                     | text                        | YES      | 
 leaderboard_bots                  | is_active                         | boolean                     | YES      | true
 leaderboard_bots                  | rank                              | integer                     | YES      | 
 leaderboard_bots                  | updated_at                        | timestamp with time zone    | YES      | now()
 leaderboard_history               | id                                | uuid                        | NO       | gen_random_uuid()
 leaderboard_history               | user_id                           | uuid                        | NO       | 
 leaderboard_history               | time_period                       | text                        | NO       | 
 leaderboard_history               | rank                              | integer                     | NO       | 
 leaderboard_history               | recorded_at                       | timestamp with time zone    | YES      | now()
 leaderboard_monthly               | id                                | uuid                        | NO       | gen_random_uuid()
 leaderboard_monthly               | month                             | date                        | NO       | 
 leaderboard_monthly               | user_id                           | uuid                        | NO       | 
 leaderboard_monthly               | display_name                      | text                        | YES      | 
 leaderboard_monthly               | points                            | integer                     | NO       | 0
 leaderboard_monthly               | rank                              | integer                     | YES      | 
 leaderboard_monthly               | stats                             | jsonb                       | YES      | '{}'::jsonb
 leaderboard_monthly               | created_at                        | timestamp with time zone    | YES      | now()
 leaderboard_monthly               | updated_at                        | timestamp with time zone    | YES      | now()
 learning_events                   | id                                | uuid                        | NO       | gen_random_uuid()
 learning_events                   | user_id                           | uuid                        | NO       | 
 learning_events                   | event_type                        | text                        | NO       | 
 learning_events                   | points                            | integer                     | NO       | 0
 learning_events                   | metadata                          | jsonb                       | YES      | '{}'::jsonb
 learning_events                   | created_at                        | timestamp with time zone    | YES      | now()
 lessons                           | id                                | uuid                        | NO       | gen_random_uuid()
 lessons                           | course_id                         | uuid                        | NO       | 
 lessons                           | slug                              | text                        | NO       | 
 lessons                           | title                             | text                        | NO       | 
 lessons                           | description                       | text                        | YES      | 
 lessons                           | content                           | text                        | YES      | 
 lessons                           | content_type                      | text                        | YES      | 'markdown'::text
 lessons                           | video_url                         | text                        | YES      | 
 lessons                           | order_index                       | integer                     | YES      | 0
 lessons                           | duration_minutes                  | integer                     | YES      | 15
 lessons                           | is_free_preview                   | boolean                     | YES      | false
 lessons                           | is_published                      | boolean                     | YES      | true
 lessons                           | created_at                        | timestamp with time zone    | YES      | now()
 lessons                           | updated_at                        | timestamp with time zone    | YES      | now()
 live_trades                       | id                                | uuid                        | NO       | gen_random_uuid()
 live_trades                       | user_id                           | uuid                        | NO       | 
 live_trades                       | binance_order_id                  | text                        | NO       | 
 live_trades                       | symbol                            | text                        | NO       | 
 live_trades                       | side                              | text                        | NO       | 
 live_trades                       | type                              | text                        | NO       | 
 live_trades                       | entry_price                       | numeric                     | NO       | 
 live_trades                       | current_price                     | numeric                     | YES      | 
 live_trades                       | amount                            | numeric                     | NO       | 
 live_trades                       | leverage                          | integer                     | YES      | 1
 live_trades                       | stop_loss                         | numeric                     | YES      | 
 live_trades                       | take_profit                       | numeric                     | YES      | 
 live_trades                       | status                            | text                        | YES      | 'open'::text
 live_trades                       | pnl                               | numeric                     | YES      | 0
 live_trades                       | pnl_percentage                    | numeric                     | YES      | 0
 live_trades                       | opened_at                         | timestamp with time zone    | YES      | now()
 live_trades                       | closed_at                         | timestamp with time zone    | YES      | 
 live_trades                       | created_at                        | timestamp with time zone    | YES      | now()
 live_trades                       | updated_at                        | timestamp with time zone    | YES      | now()
 market_volatility                 | symbol                            | character varying           | NO       | 
 market_volatility                 | volatility_24h                    | numeric                     | YES      | 0
 market_volatility                 | last_updated                      | timestamp with time zone    | YES      | now()
 marketplace_listings              | id                                | uuid                        | NO       | gen_random_uuid()
 marketplace_listings              | seller_id                         | uuid                        | NO       | 
 marketplace_listings              | strategy_id                       | uuid                        | YES      | 
 marketplace_listings              | title                             | text                        | NO       | 
 marketplace_listings              | description                       | text                        | YES      | 
 marketplace_listings              | price_model                       | text                        | YES      | 'free'::text
 marketplace_listings              | price_nok                         | numeric                     | YES      | 0.0
 marketplace_listings              | backtest_summary                  | jsonb                       | YES      | '{}'::jsonb
 marketplace_listings              | category                          | text                        | YES      | 
 marketplace_listings              | status                            | text                        | YES      | 'draft'::text
 marketplace_listings              | subscriber_count                  | integer                     | YES      | 0
 marketplace_listings              | rating                            | numeric                     | YES      | 0.0
 marketplace_listings              | review_count                      | integer                     | YES      | 0
 marketplace_listings              | created_at                        | timestamp with time zone    | YES      | now()
 marketplace_listings              | updated_at                        | timestamp with time zone    | YES      | now()
 marketplace_subscriptions         | id                                | uuid                        | NO       | gen_random_uuid()
 marketplace_subscriptions         | subscriber_id                     | uuid                        | NO       | 
 marketplace_subscriptions         | listing_id                        | uuid                        | NO       | 
 marketplace_subscriptions         | user_strategy_id                  | uuid                        | YES      | 
 marketplace_subscriptions         | status                            | text                        | YES      | 'active'::text
 marketplace_subscriptions         | started_at                        | timestamp with time zone    | YES      | now()
 marketplace_subscriptions         | expires_at                        | timestamp with time zone    | YES      | 
 marketplace_subscriptions         | created_at                        | timestamp with time zone    | YES      | now()
 marketplace_subscriptions         | updated_at                        | timestamp with time zone    | YES      | now()
 mcp_audit_logs                    | id                                | uuid                        | NO       | gen_random_uuid()
 mcp_audit_logs                    | tool_name                         | text                        | NO       | 
 mcp_audit_logs                    | input                             | jsonb                       | YES      | '{}'::jsonb
 mcp_audit_logs                    | output                            | jsonb                       | YES      | '{}'::jsonb
 mcp_audit_logs                    | duration_ms                       | integer                     | YES      | 
 mcp_audit_logs                    | success                           | boolean                     | YES      | true
 mcp_audit_logs                    | error                             | text                        | YES      | 
 mcp_audit_logs                    | timestamp                         | timestamp with time zone    | YES      | now()
 notification_queue                | id                                | uuid                        | NO       | gen_random_uuid()
 notification_queue                | user_id                           | uuid                        | NO       | 
 notification_queue                | type                              | character varying           | NO       | 
 notification_queue                | payload                           | jsonb                       | NO       | 
 notification_queue                | is_read                           | boolean                     | NO       | false
 notification_queue                | sent_at                           | timestamp with time zone    | YES      | 
 notification_queue                | created_at                        | timestamp with time zone    | NO       | now()
 notification_queue                | status                            | text                        | NO       | 'pending'::text
 notification_queue                | attempts                          | integer                     | NO       | 0
 notification_queue                | error_message                     | text                        | YES      | 
 notifications                     | id                                | uuid                        | NO       | gen_random_uuid()
 notifications                     | user_id                           | uuid                        | NO       | 
 notifications                     | type                              | USER-DEFINED                | YES      | 'system'::notification_type
 notifications                     | title                             | text                        | NO       | 
 notifications                     | body                              | text                        | NO       | 
 notifications                     | data                              | jsonb                       | YES      | '{}'::jsonb
 notifications                     | is_read                           | boolean                     | YES      | false
 notifications                     | created_at                        | timestamp with time zone    | YES      | now()
 onboarding_events                 | id                                | uuid                        | NO       | gen_random_uuid()
 onboarding_events                 | user_id                           | uuid                        | YES      | 
 onboarding_events                 | step                              | text                        | NO       | 
 onboarding_events                 | completed_at                      | timestamp with time zone    | YES      | now()
 onboarding_events                 | metadata                          | jsonb                       | YES      | 
 onboarding_progress               | id                                | uuid                        | NO       | gen_random_uuid()
 onboarding_progress               | user_id                           | uuid                        | YES      | 
 onboarding_progress               | step1_completed                   | boolean                     | YES      | false
 onboarding_progress               | step2_completed                   | boolean                     | YES      | false
 onboarding_progress               | step3_completed                   | boolean                     | YES      | false
 onboarding_progress               | step4_completed                   | boolean                     | YES      | false
 onboarding_progress               | step5_completed                   | boolean                     | YES      | false
 onboarding_progress               | step2_started_at                  | timestamp with time zone    | YES      | 
 onboarding_progress               | is_completed                      | boolean                     | YES      | false
 onboarding_progress               | completed_at                      | timestamp with time zone    | YES      | 
 onboarding_progress               | created_at                        | timestamp with time zone    | YES      | now()
 onboarding_progress               | updated_at                        | timestamp with time zone    | YES      | now()
 onboarding_progress               | completed_lessons                 | integer                     | YES      | 0
 orders                            | id                                | uuid                        | NO       | gen_random_uuid()
 orders                            | user_id                           | uuid                        | YES      | 
 orders                            | plan_type                         | text                        | YES      | 
 orders                            | amount                            | numeric                     | YES      | 
 orders                            | currency                          | text                        | YES      | 'NOK'::text
 orders                            | status                            | text                        | YES      | 'pending'::text
 orders                            | created_at                        | timestamp with time zone    | YES      | now()
 orders                            | completed_at                      | timestamp with time zone    | YES      | 
 paper_accounts                    | id                                | uuid                        | NO       | gen_random_uuid()
 paper_accounts                    | user_id                           | uuid                        | NO       | 
 paper_accounts                    | initial_balance                   | numeric                     | NO       | 
 paper_accounts                    | current_balance                   | numeric                     | NO       | 
 paper_accounts                    | total_profit_loss                 | numeric                     | YES      | 0
 paper_accounts                    | win_count                         | integer                     | YES      | 0
 paper_accounts                    | loss_count                        | integer                     | YES      | 0
 paper_accounts                    | created_at                        | timestamp with time zone    | YES      | now()
 paper_accounts                    | updated_at                        | timestamp with time zone    | YES      | now()
 paper_positions                   | id                                | uuid                        | NO       | gen_random_uuid()
 paper_positions                   | account_id                        | uuid                        | NO       | 
 paper_positions                   | symbol                            | text                        | NO       | 
 paper_positions                   | position_type                     | text                        | NO       | 
 paper_positions                   | entry_price                       | numeric                     | NO       | 
 paper_positions                   | entry_amount                      | numeric                     | NO       | 
 paper_positions                   | quantity                          | numeric                     | NO       | 
 paper_positions                   | current_price                     | numeric                     | YES      | 
 paper_positions                   | stop_loss                         | numeric                     | YES      | 
 paper_positions                   | take_profit                       | numeric                     | YES      | 
 paper_positions                   | opened_at                         | timestamp with time zone    | YES      | now()
 paper_positions                   | closed_at                         | timestamp with time zone    | YES      | 
 paper_positions                   | status                            | text                        | YES      | 'open'::text
 paper_positions                   | closing_price                     | numeric                     | YES      | 
 paper_positions                   | profit_loss                       | numeric                     | YES      | 
 paper_positions                   | profit_loss_percent               | numeric                     | YES      | 
 paper_positions                   | close_reason                      | text                        | YES      | 
 paper_positions                   | updated_at                        | timestamp with time zone    | YES      | now()
 paper_trading_sessions            | id                                | uuid                        | NO       | gen_random_uuid()
 paper_trading_sessions            | user_id                           | uuid                        | NO       | 
 paper_trading_sessions            | starting_balance                  | numeric                     | YES      | 100000.00
 paper_trading_sessions            | current_balance                   | numeric                     | YES      | 100000.00
 paper_trading_sessions            | total_pnl                         | numeric                     | YES      | 0
 paper_trading_sessions            | total_trades                      | integer                     | YES      | 0
 paper_trading_sessions            | winning_trades                    | integer                     | YES      | 0
 paper_trading_sessions            | status                            | text                        | YES      | 'active'::text
 paper_trading_sessions            | created_at                        | timestamp with time zone    | YES      | now()
 paper_trading_sessions            | updated_at                        | timestamp with time zone    | YES      | now()
 payment_history                   | id                                | uuid                        | NO       | gen_random_uuid()
 payment_history                   | subscription_id                   | uuid                        | YES      | 
 payment_history                   | user_id                           | uuid                        | NO       | 
 payment_history                   | provider                          | text                        | NO       | 
 payment_history                   | provider_payment_id               | text                        | YES      | 
 payment_history                   | amount_ore                        | integer                     | NO       | 
 payment_history                   | currency                          | text                        | NO       | 'NOK'::text
 payment_history                   | status                            | text                        | NO       | 
 payment_history                   | metadata                          | jsonb                       | YES      | 
 payment_history                   | created_at                        | timestamp with time zone    | NO       | now()
 pending_orders                    | id                                | uuid                        | NO       | gen_random_uuid()
 pending_orders                    | user_id                           | uuid                        | NO       | 
 pending_orders                    | binance_order_id                  | text                        | YES      | 
 pending_orders                    | symbol                            | text                        | NO       | 
 pending_orders                    | side                              | text                        | NO       | 
 pending_orders                    | order_type                        | text                        | NO       | 
 pending_orders                    | quantity                          | double precision            | NO       | 
 pending_orders                    | price                             | double precision            | YES      | 
 pending_orders                    | status                            | text                        | YES      | 'pending'::text
 pending_orders                    | filled_quantity                   | double precision            | YES      | 0
 pending_orders                    | error_message                     | text                        | YES      | 
 pending_orders                    | created_at                        | timestamp without time zone | YES      | now()
 pending_orders                    | filled_at                         | timestamp without time zone | YES      | 
 performance_fees                  | id                                | uuid                        | NO       | gen_random_uuid()
 performance_fees                  | creator_id                        | uuid                        | YES      | 
 performance_fees                  | follower_id                       | uuid                        | YES      | 
 performance_fees                  | strategy_id                       | uuid                        | YES      | 
 performance_fees                  | amount                            | numeric                     | NO       | 
 performance_fees                  | currency                          | text                        | YES      | 'NOK'::text
 performance_fees                  | pnl_snapshot                      | numeric                     | NO       | 
 performance_fees                  | status                            | text                        | YES      | 'pending'::text
 performance_fees                  | created_at                        | timestamp with time zone    | YES      | now()
 performance_fees                  | paid_at                           | timestamp with time zone    | YES      | 
 portfolio_history                 | id                                | uuid                        | NO       | gen_random_uuid()
 portfolio_history                 | user_id                           | uuid                        | NO       | 
 portfolio_history                 | date                              | date                        | NO       | 
 portfolio_history                 | total_value_nok                   | double precision            | NO       | 
 portfolio_history                 | total_profit_nok                  | double precision            | NO       | 
 portfolio_history                 | total_profit_percent              | double precision            | NO       | 
 portfolio_history                 | open_trades                       | integer                     | YES      | 0
 portfolio_history                 | closed_trades_today               | integer                     | YES      | 0
 portfolio_history                 | best_trade_nok                    | double precision            | YES      | 
 portfolio_history                 | worst_trade_nok                   | double precision            | YES      | 
 portfolio_history                 | created_at                        | timestamp without time zone | YES      | now()
 portfolio_positions               | id                                | uuid                        | NO       | gen_random_uuid()
 portfolio_positions               | user_id                           | uuid                        | NO       | 
 portfolio_positions               | symbol                            | text                        | NO       | 
 portfolio_positions               | total_quantity                    | double precision            | NO       | 
 portfolio_positions               | avg_entry_price                   | double precision            | NO       | 
 portfolio_positions               | current_value_nok                 | double precision            | NO       | 
 portfolio_positions               | current_unrealized_pnl_nok        | double precision            | YES      | 0
 portfolio_positions               | current_unrealized_pnl_percent    | double precision            | YES      | 0
 portfolio_positions               | last_updated                      | timestamp without time zone | YES      | now()
 portfolio_summary                 | id                                | uuid                        | NO       | gen_random_uuid()
 portfolio_summary                 | user_id                           | uuid                        | NO       | 
 portfolio_summary                 | total_value_nok                   | double precision            | YES      | 0
 portfolio_summary                 | total_profit_nok                  | double precision            | YES      | 0
 portfolio_summary                 | total_profit_percent              | double precision            | YES      | 0
 portfolio_summary                 | daily_change_nok                  | double precision            | YES      | 0
 portfolio_summary                 | daily_change_percent              | double precision            | YES      | 0
 portfolio_summary                 | total_trades                      | integer                     | YES      | 0
 portfolio_summary                 | open_trades                       | integer                     | YES      | 0
 portfolio_summary                 | closed_trades                     | integer                     | YES      | 0
 portfolio_summary                 | win_rate                          | double precision            | YES      | 0
 portfolio_summary                 | last_synced_at                    | timestamp without time zone | YES      | 
 portfolio_summary                 | updated_at                        | timestamp without time zone | YES      | now()
 portfolios                        | id                                | uuid                        | NO       | gen_random_uuid()
 portfolios                        | user_id                           | uuid                        | YES      | 
 portfolios                        | name                              | text                        | YES      | 'Min Portefølje'::text
 portfolios                        | description                       | text                        | YES      | 
 portfolios                        | initial_balance                   | numeric                     | YES      | 1000000
 portfolios                        | current_balance                   | numeric                     | YES      | 1000000
 portfolios                        | total_invested                    | numeric                     | YES      | 0
 portfolios                        | total_profit                      | numeric                     | YES      | 0
 portfolios                        | total_profit_percent              | numeric                     | YES      | 0
 portfolios                        | currency                          | text                        | YES      | 'NOK'::text
 portfolios                        | created_at                        | timestamp with time zone    | YES      | now()
 portfolios                        | updated_at                        | timestamp with time zone    | YES      | now()
 positions                         | id                                | uuid                        | NO       | gen_random_uuid()
 positions                         | portfolio_id                      | uuid                        | NO       | 
 positions                         | user_id                           | uuid                        | NO       | 
 positions                         | symbol                            | text                        | NO       | 
 positions                         | quantity                          | numeric                     | NO       | 
 positions                         | avg_price                         | numeric                     | NO       | 
 positions                         | current_price                     | numeric                     | YES      | 
 positions                         | profit_loss                       | numeric                     | YES      | 
 positions                         | profit_loss_percent               | numeric                     | YES      | 
 positions                         | created_at                        | timestamp with time zone    | YES      | now()
 positions                         | updated_at                        | timestamp with time zone    | YES      | now()
 price_alerts                      | id                                | uuid                        | NO       | gen_random_uuid()
 price_alerts                      | user_id                           | uuid                        | NO       | 
 price_alerts                      | symbol                            | text                        | NO       | 
 price_alerts                      | condition_type                    | text                        | NO       | 
 price_alerts                      | condition_value                   | numeric                     | NO       | 
 price_alerts                      | is_active                         | boolean                     | YES      | true
 price_alerts                      | triggered_count                   | integer                     | YES      | 0
 price_alerts                      | last_triggered_at                 | timestamp with time zone    | YES      | 
 price_alerts                      | created_at                        | timestamp with time zone    | YES      | now()
 price_alerts                      | updated_at                        | timestamp with time zone    | YES      | now()
 push_subscriptions                | id                                | uuid                        | NO       | gen_random_uuid()
 push_subscriptions                | user_id                           | uuid                        | NO       | 
 push_subscriptions                | endpoint                          | text                        | NO       | 
 push_subscriptions                | p256dh                            | text                        | NO       | 
 push_subscriptions                | auth                              | text                        | NO       | 
 push_subscriptions                | created_at                        | timestamp with time zone    | YES      | now()
 push_subscriptions                | updated_at                        | timestamp with time zone    | YES      | now()
 quiz_attempts                     | id                                | uuid                        | NO       | gen_random_uuid()
 quiz_attempts                     | user_id                           | uuid                        | NO       | 
 quiz_attempts                     | quiz_id                           | uuid                        | NO       | 
 quiz_attempts                     | score                             | integer                     | NO       | 
 quiz_attempts                     | passed                            | boolean                     | NO       | false
 quiz_attempts                     | answers                           | jsonb                       | YES      | '[]'::jsonb
 quiz_attempts                     | completed_at                      | timestamp with time zone    | YES      | now()
 quiz_attempts                     | created_at                        | timestamp with time zone    | YES      | now()
 quiz_questions                    | id                                | uuid                        | NO       | gen_random_uuid()
 quiz_questions                    | quiz_id                           | uuid                        | NO       | 
 quiz_questions                    | question_number                   | integer                     | NO       | 
 quiz_questions                    | question_text                     | text                        | NO       | 
 quiz_questions                    | question_type                     | text                        | YES      | 'multiple_choice'::text
 quiz_questions                    | options                           | jsonb                       | NO       | 
 quiz_questions                    | explanation                       | text                        | YES      | 
 quiz_questions                    | points                            | integer                     | YES      | 1
 quiz_questions                    | created_at                        | timestamp with time zone    | YES      | now()
 quizzes                           | id                                | uuid                        | NO       | gen_random_uuid()
 quizzes                           | slug                              | text                        | NO       | 
 quizzes                           | title                             | text                        | NO       | 
 quizzes                           | description                       | text                        | YES      | 
 quizzes                           | pass_score                        | integer                     | NO       | 80
 quizzes                           | is_required_for_futures           | boolean                     | YES      | false
 quizzes                           | created_at                        | timestamp with time zone    | YES      | now()
 quizzes                           | updated_at                        | timestamp with time zone    | YES      | now()
 real_positions                    | id                                | uuid                        | NO       | gen_random_uuid()
 real_positions                    | account_id                        | uuid                        | NO       | 
 real_positions                    | exchange_position_id              | text                        | YES      | 
 real_positions                    | symbol                            | text                        | NO       | 
 real_positions                    | position_type                     | text                        | NO       | 
 real_positions                    | entry_price                       | numeric                     | NO       | 
 real_positions                    | quantity                          | numeric                     | NO       | 
 real_positions                    | filled_quantity                   | numeric                     | YES      | 0
 real_positions                    | status                            | text                        | YES      | 'pending'::text
 real_positions                    | order_type                        | text                        | YES      | 'market'::text
 real_positions                    | limit_price                       | numeric                     | YES      | 
 real_positions                    | stop_price                        | numeric                     | YES      | 
 real_positions                    | stop_loss                         | numeric                     | YES      | 
 real_positions                    | take_profit                       | numeric                     | YES      | 
 real_positions                    | exchange_order_id                 | text                        | YES      | 
 real_positions                    | opened_at                         | timestamp with time zone    | YES      | now()
 real_positions                    | filled_at                         | timestamp with time zone    | YES      | 
 real_positions                    | closed_at                         | timestamp with time zone    | YES      | 
 real_positions                    | updated_at                        | timestamp with time zone    | YES      | now()
 real_positions                    | closing_price                     | numeric                     | YES      | 
 real_positions                    | profit_loss_usd                   | numeric                     | YES      | 
 real_positions                    | profit_loss_percent               | numeric                     | YES      | 
 real_positions                    | close_reason                      | text                        | YES      | 
 real_positions                    | notes                             | text                        | YES      | 
 real_positions                    | metadata                          | jsonb                       | YES      | '{}'::jsonb
 referral_tracking                 | id                                | uuid                        | NO       | gen_random_uuid()
 referral_tracking                 | referrer_user_id                  | uuid                        | NO       | 
 referral_tracking                 | referred_user_id                  | uuid                        | YES      | 
 referral_tracking                 | referral_code                     | text                        | NO       | 
 referral_tracking                 | source                            | text                        | YES      | 'direct'::text
 referral_tracking                 | landing_page                      | text                        | YES      | '/'::text
 referral_tracking                 | status                            | text                        | YES      | 'pending'::text
 referral_tracking                 | clicked_at                        | timestamp with time zone    | YES      | now()
 referral_tracking                 | signed_up_at                      | timestamp with time zone    | YES      | 
 referral_tracking                 | converted_at                      | timestamp with time zone    | YES      | 
 referral_tracking                 | referrer_reward_points            | integer                     | YES      | 0
 referral_tracking                 | referrer_reward_months            | integer                     | YES      | 0
 referral_tracking                 | ip_address                        | inet                        | YES      | 
 referral_tracking                 | user_agent                        | text                        | YES      | 
 referral_tracking                 | created_at                        | timestamp with time zone    | YES      | now()
 referral_tracking                 | updated_at                        | timestamp with time zone    | YES      | now()
 risk_presets                      | id                                | text                        | NO       | 
 risk_presets                      | name                              | text                        | NO       | 
 risk_presets                      | name_en                           | text                        | NO       | 
 risk_presets                      | description                       | text                        | NO       | 
 risk_presets                      | color                             | text                        | NO       | 
 risk_presets                      | icon                              | text                        | NO       | 
 risk_presets                      | position_pct                      | numeric                     | NO       | 
 risk_presets                      | max_drawdown_pct                  | numeric                     | NO       | 
 risk_presets                      | atr_mult                          | numeric                     | NO       | 
 risk_presets                      | volatility_scale                  | numeric                     | NO       | 
 risk_presets                      | max_positions                     | integer                     | NO       | 5
 risk_presets                      | leverage_max                      | numeric                     | NO       | 1.00
 risk_presets                      | stop_loss_pct                     | numeric                     | NO       | 3.00
 risk_presets                      | take_profit_pct                   | numeric                     | NO       | 9.00
 risk_presets                      | trailing_stop                     | boolean                     | YES      | false
 risk_presets                      | rebalance_freq                    | text                        | YES      | 'weekly'::text
 risk_presets                      | created_at                        | timestamp with time zone    | YES      | now()
 risk_profiles                     | id                                | uuid                        | NO       | gen_random_uuid()
 risk_profiles                     | user_id                           | uuid                        | NO       | 
 risk_profiles                     | name                              | text                        | NO       | 
 risk_profiles                     | max_position_size_pct             | numeric                     | NO       | 
 risk_profiles                     | stop_loss_pct                     | numeric                     | NO       | 
 risk_profiles                     | max_total_exposure_pct            | numeric                     | NO       | 
 risk_profiles                     | is_active                         | boolean                     | YES      | false
 risk_profiles                     | created_at                        | timestamp with time zone    | YES      | now()
 risk_profiles                     | updated_at                        | timestamp with time zone    | YES      | now()
 risk_profiles                     | max_daily_loss_pct                | numeric                     | YES      | 3.0
 risk_profiles                     | allowed_pairs                     | ARRAY                       | YES      | '{BTCUSDT,ETHUSDT}'::text[]
 risk_profiles                     | leverage_allowed                  | boolean                     | YES      | false
 risk_profiles                     | max_position_pct                  | numeric                     | YES      | 5.0
 risk_profiles                     | max_exposure_pct                  | numeric                     | YES      | 15.0
 signals                           | id                                | uuid                        | NO       | gen_random_uuid()
 signals                           | title                             | text                        | YES      | 
 signals                           | direction                         | text                        | NO       | 
 signals                           | confidence                        | integer                     | NO       | 
 signals                           | status                            | text                        | NO       | 'pending'::text
 signals                           | created_at                        | timestamp with time zone    | YES      | now()
 signals                           | updated_at                        | timestamp with time zone    | YES      | now()
 signals                           | metadata                          | jsonb                       | YES      | '{}'::jsonb
 signals                           | created_by                        | uuid                        | YES      | 
 signals                           | processed_by                      | uuid                        | YES      | 
 signals                           | processed_at                      | timestamp with time zone    | YES      | 
 signup_funnel                     | id                                | uuid                        | NO       | gen_random_uuid()
 signup_funnel                     | session_id                        | text                        | NO       | 
 signup_funnel                     | event_type                        | text                        | NO       | 
 signup_funnel                     | step_number                       | integer                     | YES      | 
 signup_funnel                     | metadata                          | jsonb                       | YES      | '{}'::jsonb
 signup_funnel                     | user_agent                        | text                        | YES      | 
 signup_funnel                     | referrer                          | text                        | YES      | 
 signup_funnel                     | created_at                        | timestamp with time zone    | YES      | now()
 signup_funnel_stats               | event_type                        | text                        | YES      | 
 signup_funnel_stats               | step_number                       | integer                     | YES      | 
 signup_funnel_stats               | unique_users                      | bigint                      | YES      | 
 signup_funnel_stats               | total_events                      | bigint                      | YES      | 
 signup_funnel_stats               | conversion_rate                   | numeric                     | YES      | 
 strategies                        | id                                | uuid                        | NO       | gen_random_uuid()
 strategies                        | user_id                           | uuid                        | NO       | 
 strategies                        | name                              | text                        | NO       | 
 strategies                        | description                       | text                        | YES      | 
 strategies                        | strategy_type                     | text                        | YES      | 'manual'::text
 strategies                        | risk_level                        | text                        | YES      | 'medium'::text
 strategies                        | is_public                         | boolean                     | YES      | false
 strategies                        | is_active                         | boolean                     | YES      | true
 strategies                        | total_return_percent              | numeric                     | YES      | 0
 strategies                        | win_rate                          | numeric                     | YES      | 0
 strategies                        | total_trades                      | integer                     | YES      | 0
 strategies                        | avg_trade_duration_hours          | numeric                     | YES      | 
 strategies                        | max_drawdown_percent              | numeric                     | YES      | 
 strategies                        | sharpe_ratio                      | numeric                     | YES      | 
 strategies                        | subscription_fee_monthly          | numeric                     | YES      | 0
 strategies                        | created_at                        | timestamp with time zone    | YES      | now()
 strategies                        | updated_at                        | timestamp with time zone    | YES      | now()
 strategy_followers                | id                                | uuid                        | NO       | gen_random_uuid()
 strategy_followers                | strategy_id                       | uuid                        | NO       | 
 strategy_followers                | follower_user_id                  | uuid                        | NO       | 
 strategy_followers                | allocation_percent                | numeric                     | YES      | 100
 strategy_followers                | max_position_size_usd             | numeric                     | YES      | 
 strategy_followers                | stop_loss_percent                 | numeric                     | YES      | 10
 strategy_followers                | is_active                         | boolean                     | YES      | true
 strategy_followers                | started_at                        | timestamp with time zone    | YES      | now()
 strategy_followers                | ended_at                          | timestamp with time zone    | YES      | 
 strategy_followers                | end_reason                        | text                        | YES      | 
 strategy_followers                | follower_return_usd               | numeric                     | YES      | 0
 strategy_followers                | follower_return_percent           | numeric                     | YES      | 0
 strategy_followers                | created_at                        | timestamp with time zone    | YES      | now()
 strategy_followers                | updated_at                        | timestamp with time zone    | YES      | now()
 strategy_logs                     | id                                | uuid                        | NO       | gen_random_uuid()
 strategy_logs                     | session_id                        | uuid                        | NO       | 
 strategy_logs                     | strategy_type                     | text                        | NO       | 
 strategy_logs                     | status                            | text                        | NO       | 
 strategy_logs                     | created_at                        | timestamp with time zone    | YES      | now()
 strategy_logs                     | strategy_id                       | uuid                        | YES      | 
 strategy_reviews                  | id                                | uuid                        | NO       | gen_random_uuid()
 strategy_reviews                  | strategy_id                       | uuid                        | NO       | 
 strategy_reviews                  | user_id                           | uuid                        | NO       | 
 strategy_reviews                  | rating                            | integer                     | NO       | 
 strategy_reviews                  | review                            | text                        | YES      | 
 strategy_reviews                  | created_at                        | timestamp with time zone    | YES      | now()
 strategy_templates                | id                                | text                        | NO       | 
 strategy_templates                | name_no                           | text                        | NO       | 
 strategy_templates                | name_en                           | text                        | NO       | 
 strategy_templates                | description_no                    | text                        | YES      | 
 strategy_templates                | description_en                    | text                        | YES      | 
 strategy_templates                | strategy                          | USER-DEFINED                | NO       | 
 strategy_templates                | risk_level                        | text                        | YES      | 
 strategy_templates                | default_config                    | jsonb                       | NO       | 
 strategy_templates                | expected_annual_return_pct        | numeric                     | YES      | 
 strategy_templates                | icon                              | text                        | YES      | '📊'::text
 strategy_templates                | color                             | text                        | YES      | '#3B82F6'::text
 strategy_templates                | is_active                         | boolean                     | YES      | true
 strategy_templates                | sort_order                        | integer                     | YES      | 0
 strategy_templates                | created_at                        | timestamp with time zone    | YES      | now()
 stripe_events                     | id                                | uuid                        | NO       | gen_random_uuid()
 stripe_events                     | event_id                          | text                        | NO       | 
 stripe_events                     | type                              | text                        | NO       | 
 stripe_events                     | processed_at                      | timestamp with time zone    | YES      | now()
 stripe_products                   | id                                | uuid                        | NO       | gen_random_uuid()
 stripe_products                   | tier_slug                         | text                        | NO       | 
 stripe_products                   | stripe_product_id                 | text                        | YES      | 
 stripe_products                   | stripe_price_id                   | text                        | YES      | 
 stripe_products                   | name_no                           | text                        | NO       | 
 stripe_products                   | name_en                           | text                        | YES      | 
 stripe_products                   | description_no                    | text                        | YES      | 
 stripe_products                   | description_en                    | text                        | YES      | 
 stripe_products                   | amount_nok                        | integer                     | NO       | 
 stripe_products                   | interval                          | text                        | NO       | 'month'::text
 stripe_products                   | interval_count                    | integer                     | NO       | 1
 stripe_products                   | currency                          | text                        | NO       | 'nok'::text
 stripe_products                   | is_active                         | boolean                     | NO       | true
 stripe_products                   | metadata                          | jsonb                       | YES      | '{}'::jsonb
 stripe_products                   | created_at                        | timestamp with time zone    | NO       | now()
 stripe_products                   | updated_at                        | timestamp with time zone    | NO       | now()
 subscriptions                     | id                                | uuid                        | NO       | gen_random_uuid()
 subscriptions                     | user_id                           | uuid                        | NO       | 
 subscriptions                     | stripe_customer_id                | text                        | YES      | 
 subscriptions                     | stripe_subscription_id            | text                        | YES      | 
 subscriptions                     | plan_type                         | text                        | NO       | 'free'::text
 subscriptions                     | status                            | text                        | NO       | 
 subscriptions                     | cancel_at_period_end              | boolean                     | YES      | false
 subscriptions                     | current_period_start              | timestamp with time zone    | YES      | 
 subscriptions                     | current_period_end                | timestamp with time zone    | YES      | 
 subscriptions                     | created_at                        | timestamp with time zone    | YES      | now()
 subscriptions                     | updated_at                        | timestamp with time zone    | YES      | now()
 subscriptions                     | tier_slug                         | text                        | YES      | 
 subscriptions                     | provider                          | text                        | YES      | 'manual'::text
 subscriptions                     | stripe_price_id                   | text                        | YES      | 
 subscriptions                     | vipps_order_id                    | text                        | YES      | 
 subscriptions                     | vipps_agreement_id                | text                        | YES      | 
 subscriptions                     | amount                            | numeric                     | YES      | 
 system_health_logs                | id                                | uuid                        | NO       | gen_random_uuid()
 system_health_logs                | supabase_status                   | text                        | NO       | 
 system_health_logs                | binance_status                    | text                        | NO       | 
 system_health_logs                | email_status                      | text                        | NO       | 
 system_health_logs                | response_time_ms                  | integer                     | YES      | 
 system_health_logs                | checked_at                        | timestamp with time zone    | YES      | now()
 system_health_logs                | metadata                          | jsonb                       | YES      | 
 trade_decisions                   | id                                | uuid                        | NO       | gen_random_uuid()
 trade_decisions                   | user_id                           | uuid                        | NO       | 
 trade_decisions                   | session_id                        | uuid                        | YES      | 
 trade_decisions                   | decision_type                     | text                        | NO       | 
 trade_decisions                   | trading_mode                      | text                        | NO       | 
 trade_decisions                   | symbol                            | text                        | NO       | 
 trade_decisions                   | side                              | text                        | NO       | 
 trade_decisions                   | requested_quantity                | numeric                     | NO       | 
 trade_decisions                   | requested_price                   | numeric                     | NO       | 
 trade_decisions                   | executed_quantity                 | numeric                     | YES      | 
 trade_decisions                   | executed_price                    | numeric                     | YES      | 
 trade_decisions                   | risk_profile_id                   | uuid                        | YES      | 
 trade_decisions                   | pre_trade_position_pct            | numeric                     | YES      | 
 trade_decisions                   | post_trade_position_pct           | numeric                     | YES      | 
 trade_decisions                   | pre_trade_exposure_pct            | numeric                     | YES      | 
 trade_decisions                   | post_trade_exposure_pct           | numeric                     | YES      | 
 trade_decisions                   | daily_loss_pct                    | numeric                     | YES      | 
 trade_decisions                   | rejection_reason                  | text                        | YES      | 
 trade_decisions                   | created_at                        | timestamp with time zone    | YES      | now()
 trade_history                     | id                                | uuid                        | NO       | gen_random_uuid()
 trade_history                     | user_id                           | uuid                        | NO       | 
 trade_history                     | strategy_type                     | text                        | NO       | 
 trade_history                     | symbol                            | text                        | NO       | 
 trade_history                     | side                              | text                        | NO       | 
 trade_history                     | entry_price                       | numeric                     | NO       | 
 trade_history                     | exit_price                        | numeric                     | YES      | 
 trade_history                     | quantity                          | numeric                     | NO       | 
 trade_history                     | pnl_usdt                          | numeric                     | YES      | 
 trade_history                     | pnl_pct                           | numeric                     | YES      | 
 trade_history                     | fee_usdt                          | numeric                     | YES      | 0
 trade_history                     | trading_mode                      | text                        | NO       | 
 trade_history                     | exit_reason                       | text                        | YES      | 
 trade_history                     | opened_at                         | timestamp with time zone    | YES      | now()
 trade_history                     | closed_at                         | timestamp with time zone    | YES      | 
 trade_notes                       | id                                | uuid                        | NO       | gen_random_uuid()
 trade_notes                       | user_id                           | uuid                        | NO       | 
 trade_notes                       | trade_id                          | uuid                        | NO       | 
 trade_notes                       | note                              | text                        | NO       | 
 trade_notes                       | tags                              | ARRAY                       | YES      | '{}'::text[]
 trade_notes                       | created_at                        | timestamp without time zone | YES      | now()
 trade_notes                       | updated_at                        | timestamp without time zone | YES      | now()
 trade_rejections                  | id                                | uuid                        | NO       | gen_random_uuid()
 trade_rejections                  | user_id                           | uuid                        | NO       | 
 trade_rejections                  | session_id                        | uuid                        | YES      | 
 trade_rejections                  | symbol                            | text                        | NO       | 
 trade_rejections                  | side                              | text                        | NO       | 
 trade_rejections                  | quantity                          | numeric                     | NO       | 
 trade_rejections                  | price                             | numeric                     | NO       | 
 trade_rejections                  | order_type                        | text                        | NO       | 
 trade_rejections                  | trading_mode                      | text                        | NO       | 
 trade_rejections                  | rejection_reason                  | text                        | NO       | 
 trade_rejections                  | rejection_details                 | jsonb                       | YES      | '{}'::jsonb
 trade_rejections                  | risk_profile_id                   | uuid                        | YES      | 
 trade_rejections                  | bot_id                            | uuid                        | YES      | 
 trade_rejections                  | created_at                        | timestamp with time zone    | YES      | now()
 trade_sync_log                    | id                                | uuid                        | NO       | gen_random_uuid()
 trade_sync_log                    | user_id                           | uuid                        | NO       | 
 trade_sync_log                    | status                            | text                        | YES      | 
 trade_sync_log                    | message                           | text                        | YES      | 
 trade_sync_log                    | trades_fetched                    | integer                     | YES      | 0
 trade_sync_log                    | trades_saved                      | integer                     | YES      | 0
 trade_sync_log                    | error_message                     | text                        | YES      | 
 trade_sync_log                    | started_at                        | timestamp without time zone | YES      | now()
 trade_sync_log                    | completed_at                      | timestamp without time zone | YES      | 
 trader_profiles                   | id                                | uuid                        | NO       | gen_random_uuid()
 trader_profiles                   | user_id                           | uuid                        | NO       | 
 trader_profiles                   | display_name                      | text                        | NO       | 
 trader_profiles                   | bio                               | text                        | YES      | 
 trader_profiles                   | avatar_url                        | text                        | YES      | 
 trader_profiles                   | is_public                         | boolean                     | YES      | false
 trader_profiles                   | performance_fee_pct               | numeric                     | YES      | 0.0
 trader_profiles                   | follower_count                    | integer                     | YES      | 0
 trader_profiles                   | verified                          | boolean                     | YES      | false
 trader_profiles                   | all_time_roi                      | numeric                     | YES      | 0.0
 trader_profiles                   | win_rate                          | numeric                     | YES      | 0.0
 trader_profiles                   | sharpe_ratio                      | numeric                     | YES      | 0.0
 trader_profiles                   | total_trades                      | integer                     | YES      | 0
 trader_profiles                   | created_at                        | timestamp with time zone    | YES      | now()
 trader_profiles                   | updated_at                        | timestamp with time zone    | YES      | now()
 trades                            | id                                | uuid                        | NO       | gen_random_uuid()
 trades                            | session_id                        | uuid                        | NO       | 
 trades                            | user_id                           | uuid                        | NO       | 
 trades                            | idempotency_key                   | text                        | NO       | 
 trades                            | mode                              | text                        | NO       | 
 trades                            | trading_pair                      | text                        | NO       | 
 trades                            | side                              | text                        | NO       | 
 trades                            | order_type                        | text                        | NO       | 'market'::text
 trades                            | quantity                          | numeric                     | NO       | 
 trades                            | price                             | numeric                     | NO       | 
 trades                            | total_value                       | numeric                     | NO       | 
 trades                            | fee                               | numeric                     | NO       | 0.00
 trades                            | status                            | text                        | NO       | 'filled'::text
 trades                            | leader_trade_id                   | uuid                        | YES      | 
 trades                            | is_copy                           | boolean                     | NO       | false
 trades                            | binance_order_id                  | text                        | YES      | 
 trades                            | realized_pnl                      | numeric                     | YES      | 
 trades                            | strategy_signal                   | jsonb                       | YES      | 
 trades                            | executed_at                       | timestamp with time zone    | NO       | now()
 trades                            | created_at                        | timestamp with time zone    | NO       | now()
 trading_api_keys                  | id                                | uuid                        | NO       | gen_random_uuid()
 trading_api_keys                  | user_id                           | uuid                        | NO       | 
 trading_api_keys                  | api_key_encrypted                 | text                        | NO       | 
 trading_api_keys                  | api_secret_encrypted              | text                        | NO       | 
 trading_api_keys                  | exchange                          | text                        | NO       | 'binance'::text
 trading_api_keys                  | exchange_env                      | text                        | NO       | 'live'::text
 trading_api_keys                  | permissions                       | jsonb                       | YES      | '["READ", "SPOT"]'::jsonb
 trading_api_keys                  | is_active                         | boolean                     | YES      | true
 trading_api_keys                  | is_valid                          | boolean                     | YES      | true
 trading_api_keys                  | last_validated_at                 | timestamp with time zone    | YES      | 
 trading_api_keys                  | last_used_at                      | timestamp with time zone    | YES      | 
 trading_api_keys                  | ip_whitelist                      | ARRAY                       | YES      | 
 trading_api_keys                  | created_at                        | timestamp with time zone    | YES      | now()
 trading_api_keys                  | updated_at                        | timestamp with time zone    | YES      | now()
 trading_logs                      | id                                | uuid                        | NO       | gen_random_uuid()
 trading_logs                      | session_id                        | uuid                        | NO       | 
 trading_logs                      | trade_id                          | uuid                        | YES      | 
 trading_logs                      | action                            | text                        | NO       | 
 trading_logs                      | details                           | jsonb                       | YES      | 
 trading_logs                      | created_at                        | timestamp with time zone    | YES      | now()
 trading_logs                      | user_id                           | uuid                        | YES      | 
 trading_notifications             | id                                | uuid                        | NO       | gen_random_uuid()
 trading_notifications             | user_id                           | uuid                        | NO       | 
 trading_notifications             | type                              | text                        | NO       | 
 trading_notifications             | title                             | text                        | NO       | 
 trading_notifications             | message                           | text                        | NO       | 
 trading_notifications             | metadata                          | jsonb                       | YES      | '{}'::jsonb
 trading_notifications             | is_read                           | boolean                     | YES      | false
 trading_notifications             | created_at                        | timestamp with time zone    | YES      | now()
 trading_positions                 | id                                | uuid                        | NO       | gen_random_uuid()
 trading_positions                 | user_id                           | uuid                        | NO       | 
 trading_positions                 | symbol                            | text                        | NO       | 
 trading_positions                 | exchange                          | text                        | NO       | 'binance'::text
 trading_positions                 | side                              | text                        | NO       | 
 trading_positions                 | quantity                          | numeric                     | NO       | 
 trading_positions                 | entry_price                       | numeric                     | NO       | 
 trading_positions                 | current_price                     | numeric                     | YES      | 
 trading_positions                 | exit_price                        | numeric                     | YES      | 
 trading_positions                 | pnl                               | numeric                     | YES      | 
 trading_positions                 | pnl_percentage                    | numeric                     | YES      | 
 trading_positions                 | status                            | text                        | NO       | 'open'::text
 trading_positions                 | position_type                     | text                        | NO       | 'paper'::text
 trading_positions                 | stop_loss                         | numeric                     | YES      | 
 trading_positions                 | take_profit                       | numeric                     | YES      | 
 trading_positions                 | created_at                        | timestamp with time zone    | NO       | now()
 trading_positions                 | updated_at                        | timestamp with time zone    | NO       | now()
 trading_positions                 | closed_at                         | timestamp with time zone    | YES      | 
 trading_sessions                  | id                                | uuid                        | NO       | gen_random_uuid()
 trading_sessions                  | user_id                           | uuid                        | NO       | 
 trading_sessions                  | mode                              | text                        | NO       | 'paper'::text
 trading_sessions                  | status                            | text                        | NO       | 'active'::text
 trading_sessions                  | strategy_id                       | text                        | NO       | 'dca'::text
 trading_sessions                  | strategy_config                   | jsonb                       | NO       | '{}'::jsonb
 trading_sessions                  | trading_pair                      | text                        | NO       | 'BTC/USDT'::text
 trading_sessions                  | risk_level                        | text                        | YES      | 'balanced'::text
 trading_sessions                  | current_capital                   | numeric                     | NO       | 100000.00
 trading_sessions                  | initial_capital                   | numeric                     | NO       | 100000.00
 trading_sessions                  | open_position                     | jsonb                       | YES      | 
 trading_sessions                  | total_trades                      | integer                     | NO       | 0
 trading_sessions                  | winning_trades                    | integer                     | NO       | 0
 trading_sessions                  | losing_trades                     | integer                     | NO       | 0
 trading_sessions                  | total_pnl                         | numeric                     | NO       | 0.00
 trading_sessions                  | max_drawdown_pct                  | numeric                     | YES      | 0.00
 trading_sessions                  | phase                             | text                        | YES      | 'paper'::text
 trading_sessions                  | phase_started_at                  | timestamp with time zone    | YES      | now()
 trading_sessions                  | last_heartbeat                    | timestamp with time zone    | NO       | now()
 trading_sessions                  | last_tick_at                      | timestamp with time zone    | YES      | 
 trading_sessions                  | crash_count                       | integer                     | NO       | 0
 trading_sessions                  | started_at                        | timestamp with time zone    | NO       | now()
 trading_sessions                  | stopped_at                        | timestamp with time zone    | YES      | 
 trading_sessions                  | created_at                        | timestamp with time zone    | NO       | now()
 trading_sessions                  | updated_at                        | timestamp with time zone    | NO       | now()
 trading_sessions                  | current_capital_nok               | numeric                     | YES      | 10000
 trading_sessions                  | starting_capital_nok              | numeric                     | YES      | 10000
 trading_sessions                  | last_analysis_details             | jsonb                       | YES      | '{}'::jsonb
 trading_sessions                  | next_expected_action_at           | timestamp with time zone    | YES      | 
 trading_sessions                  | last_status_message               | text                        | YES      | 
 trading_signals                   | id                                | uuid                        | NO       | gen_random_uuid()
 trading_signals                   | symbol                            | text                        | NO       | 
 trading_signals                   | asset_name                        | text                        | YES      | 
 trading_signals                   | action                            | text                        | YES      | 
 trading_signals                   | signal_type                       | text                        | YES      | 
 trading_signals                   | confidence                        | integer                     | YES      | 
 trading_signals                   | entry_price                       | numeric                     | YES      | 
 trading_signals                   | target_price                      | numeric                     | YES      | 
 trading_signals                   | stop_loss                         | numeric                     | YES      | 
 trading_signals                   | reasoning                         | text                        | YES      | 
 trading_signals                   | risk_level                        | integer                     | YES      | 
 trading_signals                   | expires_at                        | timestamp with time zone    | YES      | 
 trading_signals                   | status                            | text                        | YES      | 'active'::text
 trading_signals                   | created_at                        | timestamp with time zone    | YES      | now()
 unified_circuit_breaker_logs      | id                                | uuid                        | NO       | gen_random_uuid()
 unified_circuit_breaker_logs      | session_id                        | uuid                        | NO       | 
 unified_circuit_breaker_logs      | user_id                           | uuid                        | NO       | 
 unified_circuit_breaker_logs      | trigger_type                      | text                        | NO       | 
 unified_circuit_breaker_logs      | trigger_value                     | text                        | YES      | 
 unified_circuit_breaker_logs      | action                            | text                        | NO       | 
 unified_circuit_breaker_logs      | resume_at                         | timestamp with time zone    | YES      | 
 unified_circuit_breaker_logs      | resolved_at                       | timestamp with time zone    | YES      | 
 unified_circuit_breaker_logs      | resolved_by                       | text                        | YES      | 
 unified_circuit_breaker_logs      | created_at                        | timestamp with time zone    | YES      | now()
 unified_copy_follows              | id                                | uuid                        | NO       | gen_random_uuid()
 unified_copy_follows              | follower_id                       | uuid                        | NO       | 
 unified_copy_follows              | leader_session_id                 | uuid                        | NO       | 
 unified_copy_follows              | follower_session_id               | uuid                        | YES      | 
 unified_copy_follows              | allocation_pct                    | numeric                     | YES      | 100
 unified_copy_follows              | max_trade_amount                  | numeric                     | YES      | 
 unified_copy_follows              | is_active                         | boolean                     | YES      | true
 unified_copy_follows              | total_copied_trades               | integer                     | YES      | 0
 unified_copy_follows              | total_pnl                         | numeric                     | YES      | 0
 unified_copy_follows              | started_at                        | timestamp with time zone    | YES      | now()
 unified_copy_follows              | stopped_at                        | timestamp with time zone    | YES      | 
 unified_copy_follows              | created_at                        | timestamp with time zone    | YES      | now()
 unified_daily_metrics             | id                                | uuid                        | NO       | gen_random_uuid()
 unified_daily_metrics             | session_id                        | uuid                        | NO       | 
 unified_daily_metrics             | user_id                           | uuid                        | NO       | 
 unified_daily_metrics             | date                              | date                        | NO       | 
 unified_daily_metrics             | trades_count                      | integer                     | YES      | 0
 unified_daily_metrics             | winning_trades                    | integer                     | YES      | 0
 unified_daily_metrics             | losing_trades                     | integer                     | YES      | 0
 unified_daily_metrics             | daily_pnl                         | numeric                     | YES      | 0
 unified_daily_metrics             | daily_pnl_pct                     | numeric                     | YES      | 0
 unified_daily_metrics             | cumulative_pnl                    | numeric                     | YES      | 0
 unified_daily_metrics             | cumulative_pnl_pct                | numeric                     | YES      | 0
 unified_daily_metrics             | starting_capital                  | numeric                     | NO       | 
 unified_daily_metrics             | ending_capital                    | numeric                     | NO       | 
 unified_daily_metrics             | max_drawdown_pct                  | numeric                     | YES      | 0
 unified_daily_metrics             | win_rate                          | numeric                     | YES      | 0
 unified_daily_metrics             | circuit_breaker_triggered         | boolean                     | YES      | false
 unified_daily_metrics             | created_at                        | timestamp with time zone    | YES      | now()
 unified_exchange_keys             | id                                | uuid                        | NO       | gen_random_uuid()
 unified_exchange_keys             | user_id                           | uuid                        | NO       | 
 unified_exchange_keys             | exchange                          | text                        | NO       | 
 unified_exchange_keys             | api_key_encrypted                 | text                        | NO       | 
 unified_exchange_keys             | api_secret_encrypted              | text                        | NO       | 
 unified_exchange_keys             | is_active                         | boolean                     | YES      | true
 unified_exchange_keys             | last_validated_at                 | timestamp with time zone    | YES      | 
 unified_exchange_keys             | last_error                        | text                        | YES      | 
 unified_exchange_keys             | permissions                       | jsonb                       | YES      | '{"spot": true, "margin": false, "futures": false}'::jsonb
 unified_exchange_keys             | created_at                        | timestamp with time zone    | YES      | now()
 unified_exchange_keys             | updated_at                        | timestamp with time zone    | YES      | now()
 unified_notifications             | id                                | uuid                        | NO       | gen_random_uuid()
 unified_notifications             | user_id                           | uuid                        | NO       | 
 unified_notifications             | channel                           | USER-DEFINED                | NO       | 'in_app'::notification_channel_v2
 unified_notifications             | type                              | USER-DEFINED                | NO       | 
 unified_notifications             | title                             | text                        | NO       | 
 unified_notifications             | body                              | text                        | NO       | 
 unified_notifications             | data                              | jsonb                       | YES      | '{}'::jsonb
 unified_notifications             | is_sent                           | boolean                     | YES      | false
 unified_notifications             | sent_at                           | timestamp with time zone    | YES      | 
 unified_notifications             | is_read                           | boolean                     | YES      | false
 unified_notifications             | created_at                        | timestamp with time zone    | YES      | now()
 unified_trades                    | id                                | uuid                        | NO       | gen_random_uuid()
 unified_trades                    | session_id                        | uuid                        | NO       | 
 unified_trades                    | user_id                           | uuid                        | NO       | 
 unified_trades                    | mode                              | USER-DEFINED                | NO       | 
 unified_trades                    | strategy                          | USER-DEFINED                | NO       | 
 unified_trades                    | symbol                            | text                        | NO       | 
 unified_trades                    | side                              | USER-DEFINED                | NO       | 
 unified_trades                    | entry_price                       | numeric                     | NO       | 
 unified_trades                    | exit_price                        | numeric                     | YES      | 
 unified_trades                    | stop_loss                         | numeric                     | YES      | 
 unified_trades                    | take_profit                       | numeric                     | YES      | 
 unified_trades                    | quantity                          | numeric                     | NO       | 
 unified_trades                    | position_value                    | numeric                     | NO       | 
 unified_trades                    | pnl                               | numeric                     | YES      | 0
 unified_trades                    | pnl_pct                           | numeric                     | YES      | 0
 unified_trades                    | fees                              | numeric                     | YES      | 0
 unified_trades                    | exchange_order_id                 | text                        | YES      | 
 unified_trades                    | client_order_id                   | text                        | YES      | 
 unified_trades                    | slippage_pct                      | numeric                     | YES      | 0
 unified_trades                    | execution_time_ms                 | integer                     | YES      | 
 unified_trades                    | status                            | USER-DEFINED                | YES      | 'pending'::trade_status_v2
 unified_trades                    | close_reason                      | text                        | YES      | 
 unified_trades                    | opened_at                         | timestamp with time zone    | YES      | now()
 unified_trades                    | closed_at                         | timestamp with time zone    | YES      | 
 unified_trades                    | created_at                        | timestamp with time zone    | YES      | now()
 unified_trades                    | idempotency_key                   | text                        | YES      | 
 unified_trades                    | signal_confidence                 | numeric                     | YES      | 
 unified_trades                    | signal_reason                     | text                        | YES      | 
 unified_trades                    | metadata                          | jsonb                       | YES      | '{}'::jsonb
 unified_trading_sessions          | id                                | uuid                        | NO       | gen_random_uuid()
 unified_trading_sessions          | user_id                           | uuid                        | NO       | 
 unified_trading_sessions          | mode                              | USER-DEFINED                | NO       | 'paper'::trading_mode_v2
 unified_trading_sessions          | strategy                          | USER-DEFINED                | NO       | 'dca'::strategy_type_v2
 unified_trading_sessions          | status                            | USER-DEFINED                | YES      | 'active'::session_status_v2
 unified_trading_sessions          | symbol                            | text                        | NO       | 'BTCUSDT'::text
 unified_trading_sessions          | initial_capital                   | numeric                     | NO       | 10000
 unified_trading_sessions          | current_capital                   | numeric                     | NO       | 10000
 unified_trading_sessions          | currency                          | text                        | YES      | 'USDT'::text
 unified_trading_sessions          | config                            | jsonb                       | NO       | '{"dca": {"interval_hours": 24, "amount_per_trade": 100, "buy_dip_threshold": 3}, "grid": {"grid_count": 10, "lower_price": null, "upper_price": null, "amount_per_grid": 50}, "trend": {"ema_long": 26, "ema_short": 12, "rsi_oversold": 30, "rsi_overbought": 70}, "multi_signal": {"min_signals": 2, "confidence_threshold": 0.7}}'::jsonb
 unified_trading_sessions          | stop_loss_pct                     | numeric                     | YES      | 5.0
 unified_trading_sessions          | take_profit_pct                   | numeric                     | YES      | 15.0
 unified_trading_sessions          | max_position_pct                  | numeric                     | YES      | 20.0
 unified_trading_sessions          | daily_loss_limit_pct              | numeric                     | YES      | 10.0
 unified_trading_sessions          | total_trades                      | integer                     | YES      | 0
 unified_trading_sessions          | winning_trades                    | integer                     | YES      | 0
 unified_trading_sessions          | losing_trades                     | integer                     | YES      | 0
 unified_trading_sessions          | total_pnl                         | numeric                     | YES      | 0
 unified_trading_sessions          | total_pnl_pct                     | numeric                     | YES      | 0
 unified_trading_sessions          | max_drawdown_pct                  | numeric                     | YES      | 0
 unified_trading_sessions          | win_rate                          | numeric                     | YES      | 0
 unified_trading_sessions          | is_public                         | boolean                     | YES      | false
 unified_trading_sessions          | followers_count                   | integer                     | YES      | 0
 unified_trading_sessions          | copy_of_session_id                | uuid                        | YES      | 
 unified_trading_sessions          | started_at                        | timestamp with time zone    | YES      | now()
 unified_trading_sessions          | stopped_at                        | timestamp with time zone    | YES      | 
 unified_trading_sessions          | last_trade_at                     | timestamp with time zone    | YES      | 
 unified_trading_sessions          | last_heartbeat                    | timestamp with time zone    | YES      | now()
 unified_trading_sessions          | created_at                        | timestamp with time zone    | YES      | now()
 unified_trading_sessions          | updated_at                        | timestamp with time zone    | YES      | now()
 user_achievements                 | id                                | uuid                        | NO       | gen_random_uuid()
 user_achievements                 | user_id                           | uuid                        | NO       | 
 user_achievements                 | achievement_id                    | text                        | NO       | 
 user_achievements                 | title                             | text                        | NO       | 
 user_achievements                 | description                       | text                        | YES      | 
 user_achievements                 | icon                              | text                        | YES      | 
 user_achievements                 | awarded_at                        | timestamp with time zone    | YES      | now()
 user_auto_trading_configs         | id                                | uuid                        | NO       | gen_random_uuid()
 user_auto_trading_configs         | user_id                           | uuid                        | NO       | 
 user_auto_trading_configs         | strategy_id                       | text                        | YES      | 
 user_auto_trading_configs         | is_enabled                        | boolean                     | YES      | false
 user_auto_trading_configs         | is_paper_trading                  | boolean                     | YES      | true
 user_auto_trading_configs         | trading_capital_nok               | numeric                     | YES      | 0
 user_auto_trading_configs         | phase                             | text                        | YES      | 'paper'::text
 user_auto_trading_configs         | phase_started_at                  | timestamp with time zone    | YES      | now()
 user_auto_trading_configs         | phase_min_days                    | integer                     | YES      | 7
 user_auto_trading_configs         | phase_profitable                  | boolean                     | YES      | false
 user_auto_trading_configs         | allocated_capital_pct             | numeric                     | YES      | 100
 user_auto_trading_configs         | auto_extract_profit_enabled       | boolean                     | YES      | false
 user_auto_trading_configs         | auto_extract_profit_threshold_pct | numeric                     | YES      | 5
 user_auto_trading_configs         | auto_extract_profit_amount_pct    | numeric                     | YES      | 50
 user_auto_trading_configs         | created_at                        | timestamp with time zone    | YES      | now()
 user_auto_trading_configs         | updated_at                        | timestamp with time zone    | YES      | now()
 user_binance_keys                 | id                                | uuid                        | NO       | gen_random_uuid()
 user_binance_keys                 | user_id                           | uuid                        | NO       | 
 user_binance_keys                 | api_key                           | text                        | NO       | 
 user_binance_keys                 | api_secret                        | text                        | NO       | 
 user_binance_keys                 | is_testnet                        | boolean                     | YES      | true
 user_binance_keys                 | is_active                         | boolean                     | YES      | true
 user_binance_keys                 | last_validated_at                 | timestamp with time zone    | YES      | 
 user_binance_keys                 | last_error                        | text                        | YES      | 
 user_binance_keys                 | created_at                        | timestamp with time zone    | YES      | now()
 user_binance_keys                 | updated_at                        | timestamp with time zone    | YES      | now()
 user_course_progress              | id                                | uuid                        | NO       | gen_random_uuid()
 user_course_progress              | user_id                           | uuid                        | NO       | 
 user_course_progress              | course_id                         | uuid                        | NO       | 
 user_course_progress              | lesson_id                         | uuid                        | YES      | 
 user_course_progress              | progress_percent                  | integer                     | YES      | 0
 user_course_progress              | is_completed                      | boolean                     | YES      | false
 user_course_progress              | started_at                        | timestamp with time zone    | YES      | now()
 user_course_progress              | completed_at                      | timestamp with time zone    | YES      | 
 user_course_progress              | last_accessed_at                  | timestamp with time zone    | YES      | now()
 user_enrollments                  | id                                | uuid                        | NO       | gen_random_uuid()
 user_enrollments                  | user_id                           | uuid                        | NO       | 
 user_enrollments                  | course_id                         | uuid                        | NO       | 
 user_enrollments                  | enrolled_at                       | timestamp with time zone    | YES      | now()
 user_enrollments                  | expires_at                        | timestamp with time zone    | YES      | 
 user_enrollments                  | status                            | text                        | YES      | 'active'::text
 user_gamification                 | id                                | uuid                        | NO       | gen_random_uuid()
 user_gamification                 | user_id                           | uuid                        | NO       | 
 user_gamification                 | current_level                     | integer                     | NO       | 1
 user_gamification                 | total_xp                          | integer                     | NO       | 0
 user_gamification                 | current_streak                    | integer                     | NO       | 0
 user_gamification                 | last_login_date                   | date                        | YES      | 
 user_gamification                 | level_up_at                       | timestamp with time zone    | YES      | 
 user_gamification                 | created_at                        | timestamp with time zone    | YES      | now()
 user_gamification                 | updated_at                        | timestamp with time zone    | YES      | now()
 user_klt_balances                 | id                                | uuid                        | NO       | gen_random_uuid()
 user_klt_balances                 | user_id                           | uuid                        | NO       | 
 user_klt_balances                 | balance                           | integer                     | NO       | 0
 user_klt_balances                 | total_earned                      | integer                     | NO       | 0
 user_klt_balances                 | total_spent                       | integer                     | NO       | 0
 user_klt_balances                 | created_at                        | timestamp with time zone    | YES      | now()
 user_klt_balances                 | updated_at                        | timestamp with time zone    | YES      | now()
 user_notification_settings        | user_id                           | uuid                        | NO       | 
 user_notification_settings        | push_enabled                      | boolean                     | YES      | true
 user_notification_settings        | push_signals                      | boolean                     | YES      | true
 user_notification_settings        | push_price_alerts                 | boolean                     | YES      | true
 user_notification_settings        | push_market_updates               | boolean                     | YES      | false
 user_notification_settings        | email_enabled                     | boolean                     | YES      | true
 user_notification_settings        | email_signals                     | boolean                     | YES      | true
 user_notification_settings        | email_weekly_report               | boolean                     | YES      | true
 user_notification_settings        | email_marketing                   | boolean                     | YES      | false
 user_notification_settings        | sms_enabled                       | boolean                     | YES      | false
 user_notification_settings        | sms_signals                       | boolean                     | YES      | false
 user_notification_settings        | sms_price_alerts                  | boolean                     | YES      | false
 user_notification_settings        | quiet_hours_enabled               | boolean                     | YES      | false
 user_notification_settings        | quiet_hours_start                 | time without time zone      | YES      | 
 user_notification_settings        | quiet_hours_end                   | time without time zone      | YES      | 
 user_notification_settings        | updated_at                        | timestamp with time zone    | YES      | now()
 user_portfolios                   | id                                | uuid                        | NO       | gen_random_uuid()
 user_portfolios                   | user_id                           | uuid                        | YES      | 
 user_portfolios                   | mode                              | text                        | NO       | 'paper'::text
 user_portfolios                   | total_value                       | numeric                     | YES      | 1000000
 user_portfolios                   | cash_balance                      | numeric                     | YES      | 1000000
 user_portfolios                   | invested_value                    | numeric                     | YES      | 0
 user_portfolios                   | total_pnl                         | numeric                     | YES      | 0
 user_portfolios                   | daily_pnl                         | numeric                     | YES      | 0
 user_portfolios                   | total_trades                      | integer                     | YES      | 0
 user_portfolios                   | win_rate                          | numeric                     | YES      | 0
 user_portfolios                   | updated_at                        | timestamp with time zone    | YES      | now()
 user_profiles                     | id                                | uuid                        | NO       | gen_random_uuid()
 user_profiles                     | user_id                           | uuid                        | NO       | 
 user_profiles                     | tier                              | USER-DEFINED                | NO       | 'free'::subscription_tier
 user_profiles                     | paper_balance                     | numeric                     | NO       | 10000.00
 user_profiles                     | real_balance                      | numeric                     | YES      | 0.00
 user_profiles                     | created_at                        | timestamp with time zone    | NO       | now()
 user_profiles                     | updated_at                        | timestamp with time zone    | NO       | now()
 user_profiles                     | binance_connected                 | boolean                     | NO       | false
 user_profiles                     | email_on_trade                    | boolean                     | NO       | true
 user_profiles                     | email_on_crash                    | boolean                     | NO       | true
 user_profiles                     | email_daily_digest                | boolean                     | NO       | true
 user_profiles                     | locale                            | text                        | YES      | 'no'::text
 user_profiles                     | provider                          | text                        | YES      | 'email'::text
 user_profiles                     | google_id                         | text                        | YES      | 
 user_profiles                     | microsoft_id                      | text                        | YES      | 
 user_profiles                     | role                              | text                        | YES      | 'user'::text
 user_profiles                     | trading_experience                | text                        | YES      | 
 user_profiles                     | preferred_trading_mode            | text                        | YES      | 
 user_profiles                     | risk_tolerance                    | text                        | YES      | 
 user_profiles                     | onboarding_step                   | integer                     | YES      | 0
 user_profiles                     | onboarding_started_at             | timestamp with time zone    | YES      | 
 user_profiles                     | onboarding_completed_at           | timestamp with time zone    | YES      | 
 user_profiles                     | onboarding_completed              | boolean                     | YES      | false
 user_profiles                     | setup_completed_at                | timestamp with time zone    | YES      | 
 user_profiles                     | show_on_leaderboard               | boolean                     | YES      | false
 user_profiles                     | display_name                      | text                        | YES      | 
 user_profiles                     | full_name                         | text                        | YES      | 
 user_profiles                     | email                             | text                        | YES      | 
 user_profiles                     | status                            | text                        | YES      | 'active'::text
 user_profiles                     | binance_api_key_id                | text                        | YES      | 
 user_profiles                     | binance_api_secret_id             | text                        | YES      | 
 user_profiles                     | dismissed_get_started_card        | boolean                     | NO       | false
 user_referrals_summary            | referrer_user_id                  | uuid                        | YES      | 
 user_referrals_summary            | total_referrals                   | bigint                      | YES      | 
 user_referrals_summary            | signed_up_count                   | bigint                      | YES      | 
 user_referrals_summary            | converted_count                   | bigint                      | YES      | 
 user_referrals_summary            | total_points_earned               | bigint                      | YES      | 
 user_referrals_summary            | total_free_months                 | bigint                      | YES      | 
 user_roles                        | id                                | uuid                        | NO       | gen_random_uuid()
 user_roles                        | user_id                           | uuid                        | NO       | 
 user_roles                        | role                              | text                        | NO       | 
 user_roles                        | created_at                        | timestamp with time zone    | YES      | now()
 user_roles                        | updated_at                        | timestamp with time zone    | YES      | now()
 user_settings                     | user_id                           | uuid                        | NO       | 
 user_settings                     | safe_mode_enabled                 | boolean                     | YES      | true
 user_settings                     | autotrade_enabled                 | boolean                     | YES      | false
 user_settings                     | autotrade_max_position_percent    | numeric                     | YES      | 20
 user_settings                     | autotrade_max_daily_trades        | integer                     | YES      | 5
 user_settings                     | autotrade_stop_loss_percent       | numeric                     | YES      | 5
 user_settings                     | autotrade_take_profit_percent     | numeric                     | YES      | 10
 user_settings                     | theme                             | text                        | YES      | 'dark'::text
 user_settings                     | language                          | text                        | YES      | 'no'::text
 user_settings                     | show_in_leaderboard               | boolean                     | YES      | true
 user_settings                     | allow_copy_trading                | boolean                     | YES      | false
 user_settings                     | updated_at                        | timestamp with time zone    | YES      | now()
 user_strategies                   | id                                | uuid                        | NO       | gen_random_uuid()
 user_strategies                   | user_id                           | uuid                        | YES      | 
 user_strategies                   | strategy_type                     | text                        | NO       | 
 user_strategies                   | is_active                         | boolean                     | YES      | false
 user_strategies                   | mode                              | text                        | NO       | 'paper'::text
 user_strategies                   | config                            | jsonb                       | YES      | '{}'::jsonb
 user_strategies                   | started_at                        | timestamp with time zone    | YES      | 
 user_strategies                   | stopped_at                        | timestamp with time zone    | YES      | 
 user_strategies                   | total_trades                      | integer                     | YES      | 0
 user_strategies                   | total_pnl                         | numeric                     | YES      | 0
 user_strategies                   | created_at                        | timestamp with time zone    | YES      | now()
 user_strategies                   | updated_at                        | timestamp with time zone    | YES      | now()
 user_strategies                   | last_analysis_details             | jsonb                       | YES      | '{}'::jsonb
 user_strategies                   | next_expected_action_at           | timestamp with time zone    | YES      | 
 user_strategies                   | last_status_message               | text                        | YES      | 
 user_strategies                   | is_public                         | boolean                     | YES      | false
 user_strategies                   | is_marketplace_listed             | boolean                     | YES      | false
 user_strategies                   | performance_fee_pct               | numeric                     | YES      | 0.0
 user_strategies                   | subscriber_count                  | integer                     | YES      | 0
 user_trading_config               | id                                | uuid                        | NO       | gen_random_uuid()
 user_trading_config               | user_id                           | uuid                        | YES      | 
 user_trading_config               | risk_level                        | text                        | YES      | 'balanced'::text
 user_trading_config               | selected_pairs                    | ARRAY                       | YES      | ARRAY['BTCUSDT'::text]
 user_trading_config               | paper_balance                     | numeric                     | YES      | 1000000
 user_trading_config               | is_active                         | boolean                     | YES      | true
 user_trading_config               | created_at                        | timestamp with time zone    | YES      | timezone('utc'::text, now())
 user_trading_config               | updated_at                        | timestamp with time zone    | YES      | timezone('utc'::text, now())
 user_trading_config               | referred_by                       | uuid                        | YES      | 
 user_trading_config               | referral_points                   | integer                     | YES      | 0
 user_trading_config               | referral_code                     | text                        | YES      | 
 user_trading_limits               | user_id                           | uuid                        | NO       | 
 user_trading_limits               | plan_type                         | text                        | YES      | 'free'::text
 user_trading_limits               | max_trades_per_month              | integer                     | YES      | 10
 user_trading_limits               | trades_used_this_month            | integer                     | YES      | 0
 user_trading_limits               | max_volume_per_month_usd          | numeric                     | YES      | 1000
 user_trading_limits               | volume_used_this_month_usd        | numeric                     | YES      | 0
 user_trading_limits               | can_use_stop_loss                 | boolean                     | YES      | true
 user_trading_limits               | can_use_take_profit               | boolean                     | YES      | true
 user_trading_limits               | can_use_limit_orders              | boolean                     | YES      | false
 user_trading_limits               | can_use_margin                    | boolean                     | YES      | false
 user_trading_limits               | month_reset_at                    | timestamp with time zone    | YES      | now()
 user_trading_limits               | created_at                        | timestamp with time zone    | YES      | now()
 user_trading_limits               | updated_at                        | timestamp with time zone    | YES      | now()
 v_active_paper_positions          | id                                | uuid                        | YES      | 
 v_active_paper_positions          | account_id                        | uuid                        | YES      | 
 v_active_paper_positions          | user_id                           | uuid                        | YES      | 
 v_active_paper_positions          | symbol                            | text                        | YES      | 
 v_active_paper_positions          | position_type                     | text                        | YES      | 
 v_active_paper_positions          | entry_price                       | numeric                     | YES      | 
 v_active_paper_positions          | entry_amount                      | numeric                     | YES      | 
 v_active_paper_positions          | quantity                          | numeric                     | YES      | 
 v_active_paper_positions          | current_price                     | numeric                     | YES      | 
 v_active_paper_positions          | stop_loss                         | numeric                     | YES      | 
 v_active_paper_positions          | take_profit                       | numeric                     | YES      | 
 v_active_paper_positions          | opened_at                         | timestamp with time zone    | YES      | 
 v_active_paper_positions          | current_return_percent            | numeric                     | YES      | 
 v_active_paper_positions          | unrealized_pnl                    | numeric                     | YES      | 
 vipps_agreements                  | id                                | uuid                        | NO       | gen_random_uuid()
 vipps_agreements                  | agreement_id                      | text                        | NO       | 
 vipps_agreements                  | user_id                           | uuid                        | YES      | 
 vipps_agreements                  | tier                              | text                        | NO       | 
 vipps_agreements                  | status                            | text                        | NO       | 'PENDING'::text
 vipps_agreements                  | amount                            | integer                     | NO       | 
 vipps_agreements                  | product_name                      | text                        | NO       | 
 vipps_agreements                  | vipps_confirmation_url            | text                        | YES      | 
 vipps_agreements                  | created_at                        | timestamp with time zone    | NO       | now()
 vipps_agreements                  | activated_at                      | timestamp with time zone    | YES      | 
 vipps_agreements                  | stopped_at                        | timestamp with time zone    | YES      | 
 vipps_agreements                  | expired_at                        | timestamp with time zone    | YES      | 
 vipps_payments                    | id                                | uuid                        | NO       | gen_random_uuid()
 vipps_payments                    | order_id                          | uuid                        | YES      | 
 vipps_payments                    | vipps_order_id                    | text                        | YES      | 
 vipps_payments                    | amount                            | numeric                     | YES      | 
 vipps_payments                    | status                            | text                        | YES      | 'pending'::text
 vipps_payments                    | created_at                        | timestamp with time zone    | YES      | now()
 vipps_payments                    | course_id                         | uuid                        | YES      | 
 vipps_payments                    | user_id                           | uuid                        | YES      | 
 wallets                           | id                                | uuid                        | NO       | gen_random_uuid()
 wallets                           | user_id                           | uuid                        | NO       | 
 wallets                           | currency                          | text                        | NO       | 
 wallets                           | balance                           | numeric                     | NO       | 0
 wallets                           | created_at                        | timestamp with time zone    | YES      | now()
 wallets                           | updated_at                        | timestamp with time zone    | YES      | now()
 xp_transactions                   | id                                | uuid                        | NO       | gen_random_uuid()
 xp_transactions                   | user_id                           | uuid                        | NO       | 
 xp_transactions                   | amount                            | integer                     | NO       | 
 xp_transactions                   | action                            | text                        | NO       | 
 xp_transactions                   | description                       | text                        | YES      | 
 xp_transactions                   | metadata                          | jsonb                       | YES      | '{}'::jsonb
 xp_transactions                   | previous_xp                       | integer                     | NO       | 
 xp_transactions                   | new_xp                            | integer                     | NO       | 
 xp_transactions                   | previous_level                    | integer                     | NO       | 
 xp_transactions                   | new_level                         | integer                     | NO       | 
 xp_transactions                   | level_up                          | boolean                     | YES      | false
 xp_transactions                   | created_at                        | timestamp with time zone    | YES      | now()
(1691 rows)


## RLS Policies

              Tabell               |                             Policy                              | Kommando |        Roller        
-----------------------------------+-----------------------------------------------------------------+----------+----------------------
 _session_migration_map            | Service role only migration maps                                | ALL      | {public}
 _trade_migration_map              | Service role only trade migration                               | ALL      | {public}
 ai_analysis_logs                  | Users can insert own AI logs                                    | INSERT   | {authenticated}
 ai_analysis_logs                  | Users can view own AI logs                                      | SELECT   | {authenticated}
 ai_analysis_logs                  | Users can update own AI logs                                    | UPDATE   | {authenticated}
 ai_decision_log                   | Users see own ai decisions                                      | ALL      | {public}
 analytics_events                  | service_all_analytics                                           | ALL      | {service_role}
 analytics_events                  | insert_own_events                                               | INSERT   | {authenticated}
 api_keys                          | Users can delete own API keys                                   | DELETE   | {authenticated}
 api_keys                          | Users can insert own API keys                                   | INSERT   | {authenticated}
 api_keys                          | Users can view own API keys                                     | SELECT   | {authenticated}
 api_keys                          | Users can update own API keys                                   | UPDATE   | {authenticated}
 api_logs                          | Users can read own API logs                                     | SELECT   | {authenticated}
 app_events                        | Users can insert own events                                     | INSERT   | {authenticated}
 app_events                        | Anonymous can insert events                                     | INSERT   | {anon}
 app_events                        | Users can view own events                                       | SELECT   | {authenticated}
 archived_trade_summaries          | Users can view own summaries                                    | SELECT   | {public}
 audit_logs                        | audit_logs_insert_service                                       | INSERT   | {service_role}
 audit_logs                        | service_role_insert_audit_logs                                  | INSERT   | {service_role}
 audit_logs                        | audit_logs_select_own                                           | SELECT   | {authenticated}
 audit_logs                        | Users can view their own audit logs                             | SELECT   | {authenticated}
 auto_trade_daily_stats            | Users can only see own stats                                    | SELECT   | {authenticated}
 auto_trade_log                    | Users see own auto_trade_log                                    | ALL      | {public}
 auto_trade_settings               | Users can only delete own settings                              | DELETE   | {authenticated}
 auto_trade_settings               | Users can only insert own settings                              | INSERT   | {authenticated}
 auto_trade_settings               | Users can only see own settings                                 | SELECT   | {authenticated}
 auto_trade_settings               | Users can only update own settings                              | UPDATE   | {authenticated}
 auto_trades                       | Service role can manage trades                                  | ALL      | {public}
 auto_trades                       | service_role_insert_trades                                      | INSERT   | {service_role}
 auto_trades                       | Users can insert own trades                                     | INSERT   | {authenticated}
 auto_trades                       | Users can read own trades                                       | SELECT   | {authenticated}
 auto_trades                       | Users can only see own trades                                   | SELECT   | {authenticated}
 auto_trades                       | service_role_update_trades                                      | UPDATE   | {service_role}
 auto_trades                       | Users can update own trades                                     | UPDATE   | {authenticated}
 auto_trading_circuit_breaker_logs | Users can view own circuit breaker logs                         | SELECT   | {authenticated}
 auto_trading_configs              | Users manage own auto trading                                   | ALL      | {public}
 auto_trading_daily_metrics        | Users can view own metrics                                      | SELECT   | {authenticated}
 auto_trading_followers            | Users can create follows                                        | INSERT   | {authenticated}
 auto_trading_followers            | Users can view their own follows                                | SELECT   | {authenticated}
 auto_trading_followers            | Users can stop their follows                                    | UPDATE   | {authenticated}
 auto_trading_markets              | Users can manage own auto-trading markets                       | ALL      | {authenticated}
 auto_trading_profit_extractions   | Users can view own extractions                                  | SELECT   | {authenticated}
 auto_trading_runs                 | Users can read own auto-trading runs                            | SELECT   | {authenticated}
 auto_trading_sessions             | Users can insert own sessions                                   | INSERT   | {public}
 auto_trading_sessions             | Users can view own sessions                                     | SELECT   | {public}
 auto_trading_strategies           | Allow read access for authenticated users to auto_trading_strat | SELECT   | {authenticated}
 backup_policies_20260224          | Service role only backup policies                               | ALL      | {public}
 beta_applications                 | Users can insert own applications                               | INSERT   | {authenticated}
 beta_applications                 | Users can view own applications                                 | SELECT   | {authenticated}
 beta_signups                      | service_all_beta                                                | ALL      | {service_role}
 beta_signups                      | public_insert_beta                                              | INSERT   | {anon,authenticated}
 billing_events                    | Users can view own billing events                               | SELECT   | {authenticated}
 binance_balances                  | binance_bal_select                                              | SELECT   | {authenticated}
 binance_balances                  | Users can view own balances                                     | SELECT   | {authenticated}
 binance_connections               | Service role full access on binance_connections                 | ALL      | {service_role}
 binance_connections               | Users can manage own binance connections                        | ALL      | {public}
 binance_connections               | binance_delete                                                  | DELETE   | {authenticated}
 binance_connections               | binance_insert                                                  | INSERT   | {authenticated}
 binance_connections               | binance_select                                                  | SELECT   | {authenticated}
 binance_key_access_log            | Service role manages logs                                       | ALL      | {public}
 binance_key_access_log            | Users see own key access logs                                   | SELECT   | {public}
 binance_sync_log                  | Users can view own sync logs                                    | SELECT   | {authenticated}
 bot_alert_configs                 | Users can insert own alert configs                              | INSERT   | {public}
 bot_alert_configs                 | Users can view own alert configs                                | SELECT   | {public}
 bot_alert_configs                 | Users can update own alert configs                              | UPDATE   | {public}
 bot_configs                       | Users manage own bot_configs                                    | ALL      | {public}
 bot_health                        | Service role only bot_health                                    | ALL      | {public}
 campaign_contacts                 | Service role full access                                        | ALL      | {public}
 client_errors                     | service_all_errors                                              | ALL      | {service_role}
 client_errors                     | insert_own_errors                                               | INSERT   | {authenticated}
 conditional_orders                | Users can delete own conditional orders                         | DELETE   | {public}
 conditional_orders                | Users can create own conditional orders                         | INSERT   | {public}
 conditional_orders                | Users can view own conditional orders                           | SELECT   | {public}
 conditional_orders                | Users can update own conditional orders                         | UPDATE   | {public}
 copy_trade_queue                  | Users can view own copy queue                                   | SELECT   | {public}
 copy_trading_follows              | Users can manage own follows                                    | ALL      | {public}
 copy_trading_follows              | Users manage own follows                                        | ALL      | {public}
 copy_trading_follows              | Users see own follows                                           | SELECT   | {public}
 copy_trading_follows              | Users can view own follows                                      | SELECT   | {public}
 course_progress                   | Users can manage own progress                                   | ALL      | {authenticated}
 course_progress                   | users_can_see_own_progress                                      | SELECT   | {authenticated}
 courses                           | Instructors can manage their courses                            | ALL      | {authenticated}
 courses                           | admin_can_insert_courses                                        | INSERT   | {authenticated}
 courses                           | published_courses_select                                        | SELECT   | {public}
 courses                           | Published courses are viewable by everyone                      | SELECT   | {authenticated}
 courses                           | Published courses are publicly readable                         | SELECT   | {public}
 courses                           | Publiserte kurs er offentlig lesbare                            | SELECT   | {public}
 courses                           | admin_can_update_courses                                        | UPDATE   | {authenticated}
 dca_bots                          | Users can only delete own bots                                  | DELETE   | {authenticated}
 dca_bots                          | Users can only insert own bots                                  | INSERT   | {authenticated}
 dca_bots                          | Users can only see own bots                                     | SELECT   | {authenticated}
 dca_bots                          | Users can only update own bots                                  | UPDATE   | {authenticated}
 email_log                         | Service role can insert email log                               | INSERT   | {public}
 email_log                         | Users can view own email log                                    | SELECT   | {public}
 email_log                         | Service role can update email log                               | UPDATE   | {public}
 email_preferences                 | Service role can manage email preferences                       | ALL      | {public}
 email_preferences                 | Users can insert own email preferences                          | INSERT   | {public}
 email_preferences                 | Users can view own email preferences                            | SELECT   | {public}
 email_preferences                 | Users can update own email preferences                          | UPDATE   | {public}
 email_tracking                    | Service role full access                                        | ALL      | {public}
 events                            | Users read own events                                           | SELECT   | {public}
 exchange_api_keys                 | Users can delete own API keys                                   | DELETE   | {authenticated}
 exchange_api_keys                 | Users can insert own API keys                                   | INSERT   | {authenticated}
 exchange_api_keys                 | Users can view own API keys (without secrets)                   | SELECT   | {authenticated}
 exchange_api_keys                 | Users can update own API keys                                   | UPDATE   | {authenticated}
 exchange_connections              | Users can view own connections (no secrets)                     | SELECT   | {authenticated}
 execution_logs                    | Users read own execution logs                                   | SELECT   | {public}
 klt_earning_categories            | public_read_access                                              | SELECT   | {public}
 klt_founder_allocations           | Users can view own founder allocation                           | SELECT   | {authenticated}
 klt_transactions                  | service_role_insert_transactions                                | INSERT   | {service_role}
 klt_transactions                  | Users can view own transactions                                 | SELECT   | {authenticated}
 kltbalances                       | Service can manage klt balances                                 | ALL      | {public}
 kltbalances                       | Users can view own klt balance                                  | SELECT   | {public}
 leaderboard_bots                  | Only system can manage leaderboard bots                         | ALL      | {public}
 leaderboard_bots                  | Leaderboard bots are viewable by everyone                       | SELECT   | {public}
 leaderboard_monthly               | Users can identify self in leaderboard                          | SELECT   | {authenticated}
 leaderboard_monthly               | Leaderboard is public readable                                  | SELECT   | {anon,authenticated}
 learning_events                   | Users can insert own learning events                            | INSERT   | {authenticated}
 learning_events                   | Users can view own learning events                              | SELECT   | {authenticated}
 lessons                           | admin_can_insert_lessons                                        | INSERT   | {authenticated}
 lessons                           | Published lessons are publicly readable                         | SELECT   | {public}
 lessons                           | published_lessons_select                                        | SELECT   | {public}
 lessons                           | admin_can_update_lessons                                        | UPDATE   | {authenticated}
 live_trades                       | Users can insert own live trades                                | INSERT   | {authenticated}
 live_trades                       | Users can view own live trades                                  | SELECT   | {authenticated}
 live_trades                       | Users can update own live trades                                | UPDATE   | {authenticated}
 market_volatility                 | Allow all users to read volatility                              | SELECT   | {public}
 marketplace_listings              | Users can manage own marketplace listings                       | ALL      | {public}
 marketplace_listings              | Published marketplace listings are viewable by everyone         | SELECT   | {public}
 marketplace_subscriptions         | Users can create own subscriptions                              | INSERT   | {public}
 marketplace_subscriptions         | Users can view own subscriptions                                | SELECT   | {public}
 marketplace_subscriptions         | Users can update own subscriptions                              | UPDATE   | {public}
 mcp_audit_logs                    | Service role can insert audit logs                              | INSERT   | {public}
 notification_queue                | Users see own notifications                                     | SELECT   | {public}
 notification_queue                | Users can view own notifications                                | SELECT   | {public}
 notification_queue                | Users can update own notifications                              | UPDATE   | {public}
 notifications                     | Users can read own notifications                                | ALL      | {authenticated}
 notifications                     | Users can manage own notifications                              | ALL      | {authenticated}
 notifications                     | Users can view own notifications                                | SELECT   | {authenticated}
 notifications                     | Users can update own notifications                              | UPDATE   | {authenticated}
 onboarding_events                 | service_role_insert_onboarding                                  | INSERT   | {service_role}
 onboarding_events                 | Users can see own onboarding events                             | SELECT   | {authenticated}
 onboarding_progress               | own_data                                                        | ALL      | {public}
 onboarding_progress               | Users can manage own onboarding                                 | ALL      | {public}
 onboarding_progress               | Users can insert own onboarding progress                        | INSERT   | {public}
 onboarding_progress               | Users can view own onboarding progress                          | SELECT   | {public}
 onboarding_progress               | Users can update own onboarding progress                        | UPDATE   | {public}
 orders                            | users_can_see_own_orders                                        | SELECT   | {authenticated}
 orders                            | Users can view own orders                                       | SELECT   | {authenticated}
 paper_accounts                    | Users can insert own paper account                              | INSERT   | {authenticated}
 paper_accounts                    | Users can view own paper account                                | SELECT   | {authenticated}
 paper_accounts                    | Users can update own paper account                              | UPDATE   | {authenticated}
 paper_positions                   | Users can insert positions to own account                       | INSERT   | {authenticated}
 paper_positions                   | Users can view own positions                                    | SELECT   | {authenticated}
 paper_positions                   | Users can update own positions                                  | UPDATE   | {authenticated}
 paper_trading_sessions            | Users manage own paper sessions                                 | ALL      | {public}
 payment_history                   | payment_history: service_role full tilgang                      | ALL      | {public}
 payment_history                   | payment_history: bruker ser egne                                | SELECT   | {authenticated}
 pending_orders                    | Users can manage own pending orders                             | ALL      | {authenticated}
 performance_fees                  | Creators can see fees owed to them                              | SELECT   | {public}
 performance_fees                  | Followers can see fees they owe                                 | SELECT   | {public}
 portfolio_history                 | Users can read own portfolio history                            | SELECT   | {authenticated}
 portfolio_positions               | Users can read own portfolio positions                          | SELECT   | {authenticated}
 portfolio_summary                 | Users can read own portfolio                                    | SELECT   | {authenticated}
 portfolios                        | Users can manage own portfolio                                  | ALL      | {authenticated}
 portfolios                        | portfolios_insert                                               | INSERT   | {authenticated}
 portfolios                        | portfolios_select                                               | SELECT   | {authenticated}
 portfolios                        | Users can view own portfolio                                    | SELECT   | {authenticated}
 portfolios                        | portfolios_update                                               | UPDATE   | {authenticated}
 positions                         | Users manage own positions                                      | ALL      | {public}
 positions                         | Users can manage own positions                                  | ALL      | {authenticated}
 positions                         | positions_insert_own                                            | INSERT   | {authenticated}
 positions                         | Users can view own positions                                    | SELECT   | {authenticated}
 positions                         | positions_select_own                                            | SELECT   | {authenticated}
 positions                         | positions_update_own                                            | UPDATE   | {authenticated}
 price_alerts                      | Users can manage own price alerts                               | ALL      | {authenticated}
 price_alerts                      | Users can manage own alerts                                     | ALL      | {authenticated}
 push_subscriptions                | service_role_manage_push                                        | ALL      | {service_role}
 push_subscriptions                | push_subs_all_own                                               | ALL      | {public}
 push_subscriptions                | Users can view own push subscriptions                           | SELECT   | {authenticated}
 quiz_attempts                     | Users can insert own quiz attempts                              | INSERT   | {authenticated}
 quiz_attempts                     | Users can view own quiz attempts                                | SELECT   | {authenticated}
 quiz_questions                    | Quiz questions are public readable                              | SELECT   | {anon,authenticated}
 quizzes                           | Quizzes are public readable                                     | SELECT   | {anon,authenticated}
 referral_tracking                 | Service role full access on referral_tracking                   | ALL      | {service_role}
 referral_tracking                 | Users can create own referrals                                  | INSERT   | {public}
 referral_tracking                 | Users can view own referrals                                    | SELECT   | {authenticated}
 referral_tracking                 | Users can update own referrals                                  | UPDATE   | {public}
 risk_presets                      | public_read_access                                              | SELECT   | {public}
 risk_profiles                     | Users manage own risk profiles                                  | ALL      | {public}
 signals                           | Only admins can delete signals                                  | DELETE   | {authenticated}
 signals                           | Analysts and admins can create signals                          | INSERT   | {authenticated}
 signals                           | signals_insert_service                                          | INSERT   | {service_role}
 signals                           | Authenticated users can view signals                            | SELECT   | {authenticated}
 signals                           | signals_select_authenticated                                    | SELECT   | {authenticated}
 signals                           | signals_update_service                                          | UPDATE   | {service_role}
 signals                           | Traders and admins can update signals                           | UPDATE   | {authenticated}
 signup_funnel                     | Anyone can track funnel events                                  | INSERT   | {public}
 strategies                        | Users can manage own strategies                                 | ALL      | {authenticated}
 strategies                        | Users can view public strategies                                | SELECT   | {authenticated}
 strategy_followers                | Users can follow/unfollow strategies                            | INSERT   | {authenticated}
 strategy_followers                | Users can view own follows                                      | SELECT   | {authenticated}
 strategy_followers                | Users can update own follows                                    | UPDATE   | {authenticated}
 strategy_reviews                  | Anyone can view reviews                                         | SELECT   | {public}
 strategy_templates                | Public read strategy templates                                  | SELECT   | {public}
 stripe_products                   | Only service role can write                                     | ALL      | {public}
 stripe_products                   | Allow public read access to active products                     | SELECT   | {public}
 subscriptions                     | subscriptions: service_role full tilgang                        | ALL      | {public}
 subscriptions                     | service_role_insert_subscriptions                               | INSERT   | {service_role}
 subscriptions                     | Users can view own subscriptions                                | SELECT   | {authenticated}
 subscriptions                     | subscriptions: bruker ser egne                                  | SELECT   | {authenticated}
 subscriptions                     | service_role_update_subscriptions                               | UPDATE   | {service_role}
 system_health_logs                | service_role_insert_health_logs                                 | INSERT   | {service_role}
 system_health_logs                | Allow public to read health logs                                | SELECT   | {public}
 trade_decisions                   | System insert trade decisions                                   | INSERT   | {public}
 trade_decisions                   | Users view own trade decisions                                  | SELECT   | {public}
 trade_history                     | users_own_trades                                                | ALL      | {authenticated}
 trade_notes                       | Users can manage own trade notes                                | ALL      | {authenticated}
 trade_rejections                  | System insert trade rejections                                  | INSERT   | {public}
 trade_rejections                  | Users view own trade rejections                                 | SELECT   | {public}
 trade_sync_log                    | Users can read own sync logs                                    | SELECT   | {authenticated}
 trader_profiles                   | Users can manage own trader profile                             | ALL      | {public}
 trader_profiles                   | Users can view own private trader profile                       | SELECT   | {public}
 trader_profiles                   | Public trader profiles are viewable by everyone                 | SELECT   | {public}
 trades                            | Users can manage own trades                                     | ALL      | {public}
 trades                            | own_data                                                        | ALL      | {public}
 trades                            | Users see own trades                                            | SELECT   | {public}
 trading_api_keys                  | Users can only delete own API keys                              | DELETE   | {authenticated}
 trading_api_keys                  | Users can only insert own API keys                              | INSERT   | {authenticated}
 trading_api_keys                  | Users can only see own API keys                                 | SELECT   | {authenticated}
 trading_api_keys                  | Users can only update own API keys                              | UPDATE   | {authenticated}
 trading_notifications             | Users can view own notifications                                | SELECT   | {authenticated}
 trading_notifications             | Users can update own notifications                              | UPDATE   | {authenticated}
 trading_positions                 | Users can delete own positions                                  | DELETE   | {authenticated}
 trading_positions                 | Users can insert own positions                                  | INSERT   | {authenticated}
 trading_positions                 | Users can view own positions                                    | SELECT   | {authenticated}
 trading_positions                 | Users can update own positions                                  | UPDATE   | {authenticated}
 trading_sessions                  | Users can manage own sessions                                   | ALL      | {public}
 trading_sessions                  | Users manage own sessions                                       | ALL      | {public}
 trading_sessions                  | Users can view own trading sessions                             | SELECT   | {public}
 trading_signals                   | signals_select                                                  | SELECT   | {public}
 unified_circuit_breaker_logs      | Users own their circuit breaker logs                            | ALL      | {public}
 unified_copy_follows              | Users own their copy follows                                    | ALL      | {public}
 unified_daily_metrics             | Users own their daily metrics                                   | ALL      | {public}
 unified_exchange_keys             | Users own their exchange keys                                   | ALL      | {public}
 unified_notifications             | Users own their notifications                                   | ALL      | {public}
 unified_trades                    | Users own their trades                                          | ALL      | {public}
 unified_trades                    | Service role full access trades                                 | ALL      | {public}
 unified_trading_sessions          | Users can modify own sessions                                   | ALL      | {public}
 unified_trading_sessions          | Service role full access sessions                               | ALL      | {public}
 unified_trading_sessions          | Users can view own and public sessions                          | SELECT   | {public}
 user_achievements                 | Users can view own achievements                                 | SELECT   | {authenticated}
 user_auto_trading_configs         | Users can insert own auto_trading_configs                       | INSERT   | {authenticated}
 user_auto_trading_configs         | Users can view own auto_trading_configs                         | SELECT   | {authenticated}
 user_auto_trading_configs         | Users can update own auto_trading_configs                       | UPDATE   | {authenticated}
 user_binance_keys                 | users_own_keys                                                  | ALL      | {authenticated}
 user_binance_keys                 | Service role full access on user_binance_keys                   | ALL      | {service_role}
 user_binance_keys                 | service_role_keys                                               | ALL      | {service_role}
 user_binance_keys                 | Users can delete own binance keys                               | DELETE   | {public}
 user_binance_keys                 | Users can insert own binance keys                               | INSERT   | {public}
 user_binance_keys                 | Users can view own binance keys                                 | SELECT   | {public}
 user_binance_keys                 | Users can update own binance keys                               | UPDATE   | {public}
 user_course_progress              | Users can update own progress                                   | ALL      | {authenticated}
 user_course_progress              | Users can view own progress                                     | SELECT   | {authenticated}
 user_enrollments                  | Users can enroll themselves                                     | INSERT   | {authenticated}
 user_enrollments                  | Users can view own enrollments                                  | SELECT   | {authenticated}
 user_gamification                 | Service role can manage gamification                            | ALL      | {public}
 user_gamification                 | Users can view own gamification                                 | SELECT   | {public}
 user_klt_balances                 | Users can view own balance                                      | SELECT   | {authenticated}
 user_notification_settings        | Users can manage own notification settings                      | ALL      | {authenticated}
 user_portfolios                   | own_data                                                        | ALL      | {public}
 user_profiles                     | Users can insert own profile                                    | INSERT   | {public}
 user_profiles                     | Users can view own profile                                      | SELECT   | {public}
 user_profiles                     | Users read own profile                                          | SELECT   | {public}
 user_profiles                     | Users can update own leaderboard preference                     | UPDATE   | {public}
 user_profiles                     | Users update own profile                                        | UPDATE   | {public}
 user_profiles                     | Users can update own profile                                    | UPDATE   | {public}
 user_roles                        | Only admins can manage user roles                               | ALL      | {authenticated}
 user_roles                        | Users can view their own role                                   | SELECT   | {authenticated}
 user_settings                     | Users can manage own settings                                   | ALL      | {authenticated}
 user_strategies                   | own_data                                                        | ALL      | {public}
 user_trading_limits               | Users can view own trading limits                               | SELECT   | {authenticated}
 vipps_agreements                  | Service role can manage agreements                              | ALL      | {service_role}
 vipps_agreements                  | Authenticated users can create agreements                       | INSERT   | {authenticated}
 vipps_agreements                  | Users can view own agreements                                   | SELECT   | {public}
 vipps_payments                    | service_all_payments                                            | ALL      | {service_role}
 vipps_payments                    | select_own_payments                                             | SELECT   | {authenticated}
 wallets                           | Users can view own wallets                                      | SELECT   | {authenticated}
 wallets                           | Users can update own wallets                                    | UPDATE   | {authenticated}
 xp_transactions                   | Service role can insert xp transactions                         | INSERT   | {public}
 xp_transactions                   | Users can view own xp transactions                              | SELECT   | {public}
(291 rows)


## Foreign Keys

          Fra tabell          |       Kolonne       |        Til tabell        | Til kolonne 
------------------------------+---------------------+--------------------------+-------------
 archived_trade_summaries     | user_id             | user_profiles            | id
 audit_logs                   | signal_id           | signals                  | id
 auto_trade_log               | bot_config_id       | bot_configs              | id
 auto_trades                  | signal_id           | signals                  | id
 auto_trades                  | auto_trading_run_id | auto_trading_runs        | id
 auto_trading_configs         | risk_profile_id     | risk_profiles            | id
 auto_trading_sessions        | user_id             | user_profiles            | id
 binance_balances             | connection_id       | binance_connections      | id
 conditional_orders           | session_id          | trading_sessions         | id
 copy_trade_queue             | follower_id         | user_profiles            | id
 copy_trade_queue             | leader_id           | user_profiles            | id
 copy_trading_follows         | follower_id         | user_profiles            | id
 copy_trading_follows         | leader_id           | user_profiles            | id
 course_progress              | course_id           | courses                  | id
 email_tracking               | contact_id          | campaign_contacts        | id
 lessons                      | course_id           | courses                  | id
 marketplace_listings         | strategy_id         | user_strategies          | id
 marketplace_subscriptions    | user_strategy_id    | user_strategies          | id
 marketplace_subscriptions    | listing_id          | marketplace_listings     | id
 notification_queue           | user_id             | user_profiles            | id
 paper_positions              | account_id          | paper_accounts           | id
 payment_history              | subscription_id     | subscriptions            | id
 performance_fees             | strategy_id         | user_strategies          | id
 positions                    | portfolio_id        | portfolios               | id
 quiz_attempts                | quiz_id             | quizzes                  | id
 quiz_questions               | quiz_id             | quizzes                  | id
 strategy_followers           | strategy_id         | strategies               | id
 strategy_reviews             | user_id             | user_profiles            | id
 trade_decisions              | session_id          | trading_sessions         | id
 trade_decisions              | risk_profile_id     | risk_profiles            | id
 trade_notes                  | trade_id            | auto_trades              | id
 trade_rejections             | session_id          | trading_sessions         | id
 trade_rejections             | risk_profile_id     | risk_profiles            | id
 trades                       | leader_trade_id     | trades                   | id
 trades                       | session_id          | trading_sessions         | id
 trading_logs                 | user_id             | user_profiles            | id
 unified_circuit_breaker_logs | session_id          | unified_trading_sessions | id
 unified_copy_follows         | follower_session_id | unified_trading_sessions | id
 unified_copy_follows         | leader_session_id   | unified_trading_sessions | id
 unified_daily_metrics        | session_id          | unified_trading_sessions | id
 unified_trades               | session_id          | unified_trading_sessions | id
 unified_trading_sessions     | copy_of_session_id  | unified_trading_sessions | id
 user_auto_trading_configs    | strategy_id         | auto_trading_strategies  | id
 user_course_progress         | course_id           | courses                  | id
 user_course_progress         | lesson_id           | lessons                  | id
 user_enrollments             | course_id           | courses                  | id
 vipps_payments               | order_id            | orders                   | id
 vipps_payments               | course_id           | courses                  | id
(48 rows)

