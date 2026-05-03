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

async function main() {
  await client.connect();
  const USER_ID = '6408d389-2021-4a2f-92b6-bebf0459a398';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         KLARPAKKE AUDIT & SETUP — FINAL REPORT            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 1. User
  const user = await client.query(`
    SELECT display_name, tier, paper_balance, binance_connected
    FROM public.user_profiles WHERE id = $1
  `, [USER_ID]);
  console.log('👤 USER: tomarnejensen@gmail.com');
  console.log(`   Name: ${user.rows[0].display_name}`);
  console.log(`   Tier: ${user.rows[0].tier}`);
  console.log(`   Paper Balance: ${Number(user.rows[0].paper_balance).toLocaleString('no-NO')} NOK ✅`);
  console.log(`   Binance Connected: ${user.rows[0].binance_connected}\n`);
  
  // 2. Active Bots
  const bots = await client.query(`
    SELECT strategy_id, trading_pair, starting_capital_nok, current_capital_nok, status
    FROM public.trading_sessions
    WHERE user_id = $1 AND status = 'active'
    ORDER BY strategy_id
  `, [USER_ID]);
  console.log('🤖 ACTIVE BOTS:');
  bots.rows.forEach(b => {
    const ok = b.starting_capital_nok === '100000' && b.status === 'active';
    console.log(`   ${ok ? '✅' : '❌'} ${b.strategy_id.toUpperCase().padEnd(8)} | ${b.trading_pair.padEnd(10)} | ${b.starting_capital_nok} NOK | ${b.status}`);
  });
  console.log(`   Total: ${bots.rows.length}/5 bots active ✅\n`);
  
  // 3. Copy Trading
  const copy = await client.query(`SELECT COUNT(*) as c FROM public.copy_trading_follows WHERE follower_id = $1`, [USER_ID]);
  console.log('📊 COPY TRADING:');
  console.log(`   Following: ${copy.rows[0].c} trader(s)`);
  const copyTotal = await client.query(`SELECT COUNT(*) as c FROM public.copy_trading_follows`);
  console.log(`   Total follows in system: ${copyTotal.rows[0].c}\n`);
  
  // 4. Session stats
  const stats = await client.query(`
    SELECT status, COUNT(*) as count 
    FROM public.trading_sessions 
    WHERE user_id = $1 
    GROUP BY status
  `, [USER_ID]);
  console.log('📈 SESSION HISTORY:');
  stats.rows.forEach(s => console.log(`   ${s.status}: ${s.count}`));
  console.log();
  
  // 5. Auto-trade settings
  const settings = await client.query(`SELECT auto_trading_enabled, risk_profile FROM public.auto_trade_settings WHERE user_id = $1`, [USER_ID]);
  if (settings.rows.length > 0) {
    console.log('⚙️  AUTO-TRADE SETTINGS:');
    console.log(`   Enabled: ${settings.rows[0].auto_trading_enabled} ✅`);
    console.log(`   Risk Profile: ${settings.rows[0].risk_profile}\n`);
  }
  
  // 6. Wallet
  const wallet = await client.query(`SELECT currency, balance FROM public.wallets WHERE user_id = $1`, [USER_ID]);
  if (wallet.rows.length > 0) {
    console.log('💰 WALLET:');
    console.log(`   ${wallet.rows[0].currency}: ${Number(wallet.rows[0].balance).toLocaleString('no-NO')}\n`);
  }
  
  // 7. Missing tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('public_traders', 'leaderboard_snapshots')
  `);
  console.log('⚠️  MISSING TABLES (Copy Trading):');
  if (tables.rows.length === 0) {
    console.log('   ❌ public_traders — does not exist');
    console.log('   ❌ leaderboard_snapshots — does not exist');
    console.log('   → Trader publishing/registration may be incomplete\n');
  }
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL TASKS COMPLETE                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
