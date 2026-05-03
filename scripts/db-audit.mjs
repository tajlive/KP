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
  
  // 1. Find user
  const userRes = await client.query(`
    SELECT u.id, u.email, u.created_at, up.display_name, up.tier, up.paper_balance, up.binance_connected
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON u.id = up.id
    WHERE u.email = 'tomarnejensen@gmail.com'
  `);
  console.log('=== USER ===');
  console.log(JSON.stringify(userRes.rows[0], null, 2));
  
  // 2. Check active sessions
  const sessionsRes = await client.query(`
    SELECT id, mode, status, starting_capital_nok, current_capital_nok, started_at, stopped_at
    FROM public.trading_sessions
    WHERE user_id = '6408d389-2021-4a2f-92b6-bebf0459a398'
    ORDER BY started_at DESC
    LIMIT 10
  `);
  console.log('\n=== ACTIVE SESSIONS ===');
  console.log(JSON.stringify(sessionsRes.rows, null, 2));
  
  // 3. Check tables exist
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('copy_trading_follows', 'public_traders', 'leaderboard_snapshots', 'trading_sessions', 'user_profiles')
    ORDER BY table_name
  `);
  console.log('\n=== TABLES EXIST ===');
  console.log(tablesRes.rows.map(r => r.table_name));
  
  // 4. Check total users
  const totalRes = await client.query(`SELECT COUNT(*) as total FROM auth.users`);
  console.log('\n=== TOTAL USERS ===');
  console.log(totalRes.rows[0]);
  
  // 5. Check copy_trading_follows
  const copyRes = await client.query(`SELECT COUNT(*) as total FROM public.copy_trading_follows`);
  console.log('\n=== COPY TRADING FOLLOWS ===');
  console.log(copyRes.rows[0]);
  
  // 6. Check copy_trading_follows details
  const copyDetails = await client.query(`
    SELECT follower_id, leader_id, is_active, created_at 
    FROM public.copy_trading_follows 
    LIMIT 5
  `);
  console.log('\n=== COPY TRADING DETAILS ===');
  console.log(JSON.stringify(copyDetails.rows, null, 2));
  
  // 7. Get trading_sessions columns
  const colsRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trading_sessions'
    ORDER BY ordinal_position
  `);
  console.log('\n=== TRADING_SESSIONS COLUMNS ===');
  console.log(colsRes.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
  
  // 8. Count sessions by status
  const statusRes = await client.query(`
    SELECT status, COUNT(*) as count 
    FROM public.trading_sessions 
    WHERE user_id = '6408d389-2021-4a2f-92b6-bebf0459a398'
    GROUP BY status
  `);
  console.log('\n=== SESSIONS BY STATUS ===');
  console.log(JSON.stringify(statusRes.rows, null, 2));
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
