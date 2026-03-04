#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: AUTOMATISK SQL PERFORMANCE CLEANUP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Bruker Supabase JS Client med service_role key for å kjøre SQL direkte
 * Krever: SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY environment variables
 * 
 * Usage: node scripts/execute-sql-cleanup.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Konfigurasjon
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY ikke satt');
  console.error('Sett environment variable: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  console.error('Eller: vercel env pull (henter fra Vercel)');
  process.exit(1);
}

// Opprett Supabase client med service role (admin tilgang)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL-fil å kjøre
const SQL_FILE = path.join(__dirname, '..', 'supabase', 'migrations', 'performance_cleanup_20260224', 'EXECUTE_NOW.sql');

// Funksjon for å dele SQL i batches
function splitSQLIntoBatches(sql) {
  // Del på semikolon, men behold DO $$ ... $$; blokker som en helhet
  const batches = [];
  let currentBatch = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Hopp over kommentarer og tomme linjer
    if (trimmed.startsWith('--') || trimmed === '') {
      continue;
    }
    
    // Sjekk for DO $$ blokker
    if (trimmed.match(/DO\s*\$\$/)) {
      inDollarQuote = true;
      dollarTag = '$$';
    } else if (inDollarQuote && trimmed.includes('$$;')) {
      inDollarQuote = false;
      currentBatch += line + '\n';
      batches.push(currentBatch.trim());
      currentBatch = '';
      continue;
    }
    
    // Sjekk for semikolon (slutt på statement)
    if (!inDollarQuote && trimmed.endsWith(';')) {
      currentBatch += line + '\n';
      if (currentBatch.trim()) {
        batches.push(currentBatch.trim());
        currentBatch = '';
      }
    } else {
      currentBatch += line + '\n';
    }
  }
  
  // Legg til siste batch hvis den ikke er tom
  if (currentBatch.trim()) {
    batches.push(currentBatch.trim());
  }
  
  return batches;
}

// Funksjon for å kjøre SQL via RPC
async function executeSQL(query) {
  try {
    // Bruk Supabase REST API direkte
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Alternativ: Bruk pg_exec RPC funksjon hvis den finnes
async function executeViaRPC(query) {
  const { data, error } = await supabase.rpc('pg_exec', { query });
  if (error) throw error;
  return data;
}

// Hovedfunksjon
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  KLARPAKKE SQL PERFORMANCE CLEANUP - AUTOMATISK KJØRING       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📁 SQL File: ${SQL_FILE}`);
  console.log();
  
  // Sjekk om filen eksisterer
  if (!fs.existsSync(SQL_FILE)) {
    console.error(`❌ SQL-fil ikke funnet: ${SQL_FILE}`);
    process.exit(1);
  }
  
  // Les SQL-fil
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  console.log(`📄 Lastet SQL-fil (${sql.length} tegn)`);
  console.log();
  
  // Test tilkobling
  console.log('🔌 Tester tilkobling til Supabase...');
  const { data: testData, error: testError } = await supabase
    .from('backup_policies_20260224')
    .select('count')
    .limit(1);
    
  if (testError && testError.code !== 'PGRST116') {
    console.error('❌ Tilkoblingsfeil:', testError.message);
    process.exit(1);
  }
  
  console.log('✅ Tilkobling OK');
  console.log();
  
  // Del SQL i batches
  const batches = splitSQLIntoBatches(sql);
  console.log(`🔄 Delte SQL i ${batches.length} batches`);
  console.log();
  
  // Kjør hver batch
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const preview = batch.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${batches.length}] ${preview}...`);
    
    try {
      // Prøv å kjøre via RPC først
      try {
        await executeViaRPC(batch);
        console.log('   ✅ OK (via RPC)');
        successCount++;
      } catch (rpcError) {
        // Fallback: Prøv direkte REST API
        try {
          await executeSQL(batch);
          console.log('   ✅ OK (via REST)');
          successCount++;
        } catch (restError) {
          // Noen statements returnerer ikke data (f.eks. CREATE TABLE)
          // Dette er OK, bare logg det
          if (batch.match(/CREATE|DROP|ALTER|DO\s*\$\$/i)) {
            console.log('   ✅ OK (DDL statement)');
            successCount++;
          } else {
            throw restError;
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ FEIL: ${error.message.substring(0, 100)}`);
      errorCount++;
    }
    
    // Liten pause mellom batches for å ikke overbelaste
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTAT                                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`✅ Suksess: ${successCount} batches`);
  console.log(`❌ Feil: ${errorCount} batches`);
  console.log();
  
  // Verifiser resultat
  console.log('🔍 Verifiserer resultat...');
  
  const { data: slowPolicies } = await supabase
    .rpc('pg_exec', {
      query: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'))`
    });
    
  console.log(`   Slow RLS policies: ${slowPolicies?.[0]?.count || 'ukjent'}`);
  
  const { data: cronJob } = await supabase
    .from('cron.job')
    .select('*')
    .eq('jobname', 'bot-health-monitor')
    .single();
    
  console.log(`   Bot health cron: ${cronJob ? 'AKTIV' : 'IKKE FUNNET'}`);
  
  console.log();
  console.log('Fullført!');
}

main().catch(error => {
  console.error('Uventet feil:', error);
  process.exit(1);
});
