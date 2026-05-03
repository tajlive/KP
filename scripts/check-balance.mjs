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
  
  // Check current balance
  const res = await client.query(`SELECT paper_balance FROM public.user_profiles WHERE id = $1`, [USER_ID]);
  console.log('Current paper_balance:', res.rows[0].paper_balance);
  
  // Check triggers on user_profiles
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'user_profiles'
  `);
  console.log('\nTriggers on user_profiles:');
  triggers.rows.forEach(t => console.log(`  ${t.trigger_name}: ${t.event_manipulation}`));
  
  // Check if there's a function that recalculates balance
  const funcs = await client.query(`
    SELECT routine_name, routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_definition LIKE '%paper_balance%'
  `);
  console.log('\nFunctions referencing paper_balance:');
  funcs.rows.forEach(f => console.log(`  ${f.routine_name}`));
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
