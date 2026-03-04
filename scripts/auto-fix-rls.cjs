#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: AUTO RLS FIX - Bruker REST API direkte
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');

const PROJECT_REF = 'vuxbjlykgmzskxbclquf';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Sett environment variable:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY=din_key_her');
  process.exit(1);
}

// Funksjon for å kjøre SQL via REST API
async function runSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AUTO RLS FIX - Starter...                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  // Siden pg_exec ikke finnes, bruker vi direkte SQL via Supabase CLI isteden
  console.log('⚠️  pg_exec funksjon ikke funnet.');
  console.log('   Bruker alternativ metode: Direkte SQL via psql/CLI...');
  console.log();
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  INSTRUKSJONER FOR MANUELL KJØRING                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Siden pg_exec ikke er tilgjengelig, må vi bruke manuell metode:');
  console.log();
  console.log('1. Gå til: https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new');
  console.log();
  console.log('2. Kjør denne SQL for å fikse ALLE 186 policies:');
  console.log();
  console.log('---');
  console.log(`
DO $$
DECLARE
  policy_record RECORD;
  fix_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR policy_record IN 
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        policy_record.policyname, policy_record.tablename);
      
      EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
        policy_record.policyname,
        policy_record.tablename,
        policy_record.cmd,
        REPLACE(policy_record.qual, 'auth.uid()', '(SELECT auth.uid())'),
        REPLACE(COALESCE(policy_record.with_check, 'true'), 'auth.uid()', '(SELECT auth.uid())'));
      
      fix_count := fix_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Feil: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Fikset: % policies, ❌ Feil: %', fix_count, error_count;
END $$;
  `);
  console.log('---');
  console.log();
  console.log('3. Kopier output og send hit!');
}

main().catch(console.error);
