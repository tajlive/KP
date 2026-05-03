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
  const NEW_BALANCE = 10000000;
  
  // 1. Update user_profiles.paper_balance
  console.log('Updating user_profiles.paper_balance...');
  const profileRes = await client.query(`
    UPDATE public.user_profiles
    SET paper_balance = $1
    WHERE id = $2
    RETURNING id, display_name, paper_balance, tier
  `, [NEW_BALANCE, USER_ID]);
  console.log('Profile updated:', profileRes.rows[0]);
  
  // 2. Update active trading_sessions
  console.log('\nUpdating active trading_sessions...');
  const sessionRes = await client.query(`
    UPDATE public.trading_sessions
    SET starting_capital_nok = $1,
        current_capital_nok = $1,
        current_capital = $1,
        initial_capital = $1
    WHERE user_id = $2
      AND status = 'active'
      AND mode = 'paper'
    RETURNING id, status, mode, starting_capital_nok, current_capital_nok
  `, [NEW_BALANCE, USER_ID]);
  console.log('Sessions updated:', sessionRes.rows);
  
  // 3. Verify
  const verifyRes = await client.query(`
    SELECT paper_balance FROM public.user_profiles WHERE id = $1
  `, [USER_ID]);
  console.log('\nVerified balance:', verifyRes.rows[0]);
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
