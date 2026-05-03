import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'skotthyll12345',
  ssl: { rejectUnauthorized: false },
  options: 'reference=vuxbjlykgmzskxbclquf'
});

const USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398';
const CAPITAL = 100000;

const BOTS = [
  { strategy: 'dca', pair: 'DOGEUSDT', risk: 'medium' },
  { strategy: 'trend', pair: 'LINKUSDT', risk: 'medium' },
  { strategy: 'grid', pair: 'MATICUSDT', risk: 'medium' },
  { strategy: 'multi', pair: 'DOTUSDT', risk: 'medium' },
  { strategy: 'ai-copy', pair: 'AVAXUSDT', risk: 'medium' },
];

async function main() {
  await client.connect();
  const now = new Date().toISOString();
  
  // 1. Stop ALL existing active sessions for this user
  const stopped = await client.query(`
    UPDATE public.trading_sessions
    SET status = 'stopped', stopped_at = $1, updated_at = $1
    WHERE user_id = $2 AND status = 'active'
    RETURNING id, strategy_id, trading_pair
  `, [now, USER_ID]);
  console.log(`Stopped ${stopped.rows.length} existing active sessions`);
  stopped.rows.forEach(r => console.log(`  - ${r.strategy_id} | ${r.trading_pair}`));
  
  // 2. Also stop crashed sessions to clean up
  await client.query(`
    UPDATE public.trading_sessions
    SET status = 'stopped', stopped_at = $1, updated_at = $1
    WHERE user_id = $2 AND status = 'crashed'
  `, [now, USER_ID]);
  console.log('Crashed sessions also stopped\n');
  
  const created = [];
  
  for (const bot of BOTS) {
    const res = await client.query(`
      INSERT INTO public.trading_sessions (
        user_id, mode, status, trading_pair, strategy_id, strategy_config,
        current_capital_nok, starting_capital_nok, initial_capital, current_capital,
        total_pnl, winning_trades, losing_trades, total_trades,
        started_at, last_heartbeat, created_at, updated_at, risk_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, strategy_id, trading_pair, starting_capital_nok, status
    `, [
      USER_ID, 'paper', 'active', bot.pair, bot.strategy,
      JSON.stringify({ risk_level: bot.risk, pairs: [bot.pair] }),
      CAPITAL, CAPITAL, CAPITAL, CAPITAL,
      0, 0, 0, 0,
      now, now, now, now, bot.risk
    ]);
    
    created.push(res.rows[0]);
    console.log(`✅ Created ${bot.strategy} bot: ${res.rows[0].id} | ${bot.pair} | ${CAPITAL} NOK`);
  }
  
  // Upsert auto_trade_settings
  await client.query(`
    INSERT INTO public.auto_trade_settings (
      user_id, auto_trading_enabled, risk_profile, max_position_percent,
      daily_loss_limit_percent, daily_trade_limit, updated_at
    ) VALUES ($1, true, 'moderate', 10, 5, 10, $2)
    ON CONFLICT (user_id) DO UPDATE SET
      auto_trading_enabled = true,
      risk_profile = 'moderate',
      updated_at = $2
  `, [USER_ID, now]);
  console.log('\n✅ auto_trade_settings updated');
  
  // Upsert wallet
  await client.query(`
    INSERT INTO public.wallets (user_id, currency, balance, updated_at)
    VALUES ($1, 'NOK', $2, $3)
    ON CONFLICT (user_id, currency) DO UPDATE SET
      balance = $2,
      updated_at = $3
  `, [USER_ID, CAPITAL * BOTS.length, now]);
  console.log('✅ wallet updated');
  
  // Final verify
  const verify = await client.query(`
    SELECT id, strategy_id, trading_pair, starting_capital_nok, status
    FROM public.trading_sessions
    WHERE user_id = $1 AND status = 'active'
    ORDER BY strategy_id
  `, [USER_ID]);
  
  console.log('\n=== FINAL ACTIVE BOTS ===');
  verify.rows.forEach(r => {
    console.log(`  🟢 ${r.strategy_id.toUpperCase().padEnd(8)} | ${r.trading_pair.padEnd(10)} | ${r.starting_capital_nok} NOK | ${r.status}`);
  });
  console.log(`\nTotal: ${verify.rows.length} active bots`);
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
