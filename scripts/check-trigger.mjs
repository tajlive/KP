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
  
  // Check trigger_update_session_state function
  const funcRes = await client.query(`
    SELECT routine_definition FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'trigger_update_session_state'
  `);
  console.log('=== trigger_update_session_state ===');
  console.log(funcRes.rows[0]?.routine_definition?.substring(0, 2000));
  
  // Check triggers on trading_sessions
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement, event_object_table
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%session%'
  `);
  console.log('\n=== Session-related triggers ===');
  triggers.rows.forEach(t => {
    console.log(`${t.trigger_name} ON ${t.event_object_table}: ${t.event_manipulation}`);
  });
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
