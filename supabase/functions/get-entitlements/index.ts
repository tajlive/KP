/**
 * Get User Entitlements Edge Function
 * Returns computed permissions based on subscription tier with auto trade limits
 *
 * Tiers: student (0kr) -> bachelor (249kr) -> master (499kr) -> phd (999kr) -> professor (1999kr)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// Tier configuration for auto trade
const TIER_CONFIG = {
  student: {
    auto_trade_max_strategies: 0,
    auto_trade_max_positions: 1,
    auto_trade_allow_live: false,
    auto_trade_allow_paper: true,
  },
  bachelor: {
    auto_trade_max_strategies: 1,
    auto_trade_max_positions: 3,
    auto_trade_allow_live: true,
    auto_trade_allow_paper: true,
  },
  master: {
    auto_trade_max_strategies: 3,
    auto_trade_max_positions: 7,
    auto_trade_allow_live: true,
    auto_trade_allow_paper: true,
  },
  phd: {
    auto_trade_max_strategies: -1, // ubegrenset
    auto_trade_max_positions: -1,  // ubegrenset
    auto_trade_allow_live: true,
    auto_trade_allow_paper: true,
  },
  professor: {
    auto_trade_max_strategies: -1, // ubegrenset
    auto_trade_max_positions: -1,  // ubegrenset
    auto_trade_allow_live: true,
    auto_trade_allow_paper: true,
  },
} as const;

type TierSlug = keyof typeof TIER_CONFIG;

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get JWT from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get entitlements using RPC
    const { data: entitlements, error: rpcError } = await supabase.rpc(
      'get_user_entitlements',
      { p_user_id: user.id }
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw rpcError;
    }

    if (!entitlements || entitlements.length === 0) {
      return errorResponse('Profile not found', 404);
    }

    const e = entitlements[0];

    // Get tier-specific auto trade config
    const tierConfig = TIER_CONFIG[(e.subscription_tier as TierSlug) || 'student'];

    // Get current strategy count
    const { count: strategyCount, error: countError } = await supabase
      .from('user_strategies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting strategies:', countError);
    }

    // Get open positions count
    const { count: positionCount, error: posError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'OPEN');

    if (posError) {
      console.error('Error counting positions:', posError);
    }

    // Check if user has Binance keys configured
    const { data: binanceKeys, error: keysError } = await supabase
      .from('user_binance_keys')
      .select('is_testnet')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (keysError) {
      console.error('Error fetching Binance keys:', keysError);
    }

    // Format response
    const response = {
      user_id: user.id,
      subscription: {
        tier: e.subscription_tier,
        status: e.subscription_status,
        is_trial_active: e.is_trial_active,
        is_trial_expired: e.is_trial_expired,
        trial_days_remaining: e.trial_days_remaining,
      },
      entitlements: {
        spot: {
          access: e.can_access_spot,
          autotrade: e.can_use_autotrade,
          limit_orders: e.can_use_limit_orders,
        },
        futures: {
          access: e.can_access_futures,
          quiz_passed: e.futures_quiz_passed,
          message: !e.futures_quiz_passed && e.subscription_tier === 'professor'
            ? 'Fullfør Futures Quiz for å låse opp Futures trading'
            : undefined,
        },
        notifications: {
          push: true,
          email: true,
          sms: e.can_use_sms,
        },
        social: {
          copy_trading: e.can_use_copy_trading,
        },
      },
      auto_trade: {
        enabled: e.can_use_autotrade,
        allow_paper: tierConfig.auto_trade_allow_paper,
        allow_live: tierConfig.auto_trade_allow_live,
        max_strategies: tierConfig.auto_trade_max_strategies,
        max_positions: tierConfig.auto_trade_max_positions,
        current_strategies: strategyCount ?? 0,
        current_positions: positionCount ?? 0,
        strategies_remaining: tierConfig.auto_trade_max_strategies === -1 
          ? -1 
          : Math.max(0, tierConfig.auto_trade_max_strategies - (strategyCount ?? 0)),
        has_binance_keys: !!binanceKeys,
        binance_mode: binanceKeys?.is_testnet === false ? 'live' : 'testnet',
      },
      features: {
        can_access_spot: e.can_access_spot,
        can_access_futures: e.can_access_futures,
        can_use_sms: e.can_use_sms,
        can_use_autotrade: e.can_use_autotrade,
        can_use_copy_trading: e.can_use_copy_trading,
        can_use_limit_orders: e.can_use_limit_orders,
        can_use_margin: e.can_use_margin,
      },
    };

    // Cache for 60 seconds (user-specific data)
    return jsonResponse(response, { maxAge: 60, isPrivate: true });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
