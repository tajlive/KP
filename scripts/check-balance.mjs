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
  // Check function definition
  const funcRes = await client.query(`
    SELECT routine_definition 
    FROM information_schema.routines 
    WHERE routine_name = 'initialize_user_manually'
  `);
  console.log('--- START FUNCTION DEFINITION ---');
  console.log(funcRes.rows[0]?.routine_definition);
  console.log('--- END FUNCTION DEFINITION ---');
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
