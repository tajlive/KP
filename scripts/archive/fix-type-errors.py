#!/usr/bin/env python3
"""Fix all remaining Vercel build type errors in one pass."""
import sys

fixes = [
    # 1. marketplace/subscribe: remove invalid strategies.insert() -> skip to trading_sessions fallback
    (
        '/Users/taj/klarpakke/src/app/api/marketplace/subscribe/route.ts',
        '    // Create user_strategies row cloned from the listing',
        '    // strategies-tabellen er kun for maler - aktive sesjoner bruker trading_sessions',
        'found_create_user_strategies'
    ),
]

# Fix subscribe/route.ts - replace entire broken strategies.insert() block
subscribe_path = '/Users/taj/klarpakke/src/app/api/marketplace/subscribe/route.ts'
with open(subscribe_path, 'r') as f:
    content = f.read()

# Find and replace the broken strategies insert block
old_block = '    // Create user_strategies row cloned from the listing\n    const {  userStrategy, error: strategyError } = await supabase\n      .from("strategies")\n      .insert({\n        user_id: userId,\n        mode,\n        status: "active",\n        strategy_type: strategyType,\n        strategy_id: strategyType,\n        initial_capital: initialCapital,\n        current_capital: initialCapital,\n        total_trades: 0,\n        winning_trades: 0,\n        total_pnl: 0,\n        trading_pair: tradingPair,\n        started_at: new Date().toISOString(),\n        strategy_config: {\n          ...strategyConfig,\n          source: "marketplace",\n          listing_id: listingId,\n          seller_id: listing.seller_id,\n        },\n        is_public: false,\n        is_marketplace_listed: false,\n      })\n      .select()\n      .single();'

new_block = '    // strategies-tabellen er for maler - aktive sesjoner bruker trading_sessions\n    // Hopp direkte til trading_sessions-fallback nedenfor\n    const userStrategy: { id: string } | null = null;\n    const strategyError: { message: string } | null = { message: "use_trading_sessions" };'

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    print('FIXED: subscribe/route.ts - removed invalid strategies.insert()')
else:
    print('NOT FOUND in subscribe/route.ts - checking partial match...')
    idx = content.find('is_marketplace_listed: false')
    print(f'  is_marketplace_listed index: {idx}')
    if idx > 0:
        print(repr(content[idx-200:idx+50]))
    sys.exit(1)

with open(subscribe_path, 'w') as f:
    f.write(content)

# Fix dashboard/bot-status: .eq("status", "active") on strategies -> .eq("is_active", true)
bot_path = '/Users/taj/klarpakke/src/app/api/dashboard/bot-status/route.ts'
with open(bot_path, 'r') as f:
    content = f.read()

# The strategies query uses .eq("status", "active") but strategies has is_active:boolean
old_strategies_eq = '              .eq("user_id", userId)\n              .eq("status", "active")\n              .order("created_at"'
if old_strategies_eq in content:
    content = content.replace(
        old_strategies_eq,
        '              .eq("user_id", userId)\n              .eq("is_active", true)\n              .order("created_at"',
        1
    )
    print('FIXED: bot-status/route.ts - status->is_active on strategies')
else:
    print('NOT FOUND: bot-status status->is_active (may already be fixed or different text)')
    idx = content.find('.eq("status", "active")')
    print(f'  .eq status index: {idx}')

with open(bot_path, 'w') as f:
    f.write(content)

# Fix cron/tick: session.risk_config -> read from strategy_config
tick_path = '/Users/taj/klarpakke/src/app/api/cron/tick/route.ts'
with open(tick_path, 'r') as f:
    content = f.read()

old_risk = '  const riskConfig: RiskConfig = session.risk_config || {'
new_risk = '  const stratCfg = (session.strategy_config as Record<string, unknown>) ?? {};\n  const riskConfig: RiskConfig = (stratCfg.risk_config as RiskConfig) || {'

if old_risk in content:
    content = content.replace(old_risk, new_risk, 1)
    print('FIXED: cron/tick/route.ts - session.risk_config -> strategy_config')
else:
    print('NOT FOUND: cron/tick risk_config (may already be fixed)')

# Also remove risk_config from the update call if it exists
if 'risk_config: { ...riskConfig },' in content:
    content = content.replace('      risk_config: { ...riskConfig },\n', '', 1)
    print('FIXED: cron/tick - removed risk_config from .update() call')

with open(tick_path, 'w') as f:
    f.write(content)

print('Done.')
