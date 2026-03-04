#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: AUTO SQL EXECUTOR via Supabase Management API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Denne bruker Supabase Management API for å kjøre SQL queries direkte.
 * Krever: Supabase access token (hentes via 'supabase login')
 * 
 * Usage: node scripts/auto-sql-executor.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'vuxbjlykgmzskxbclquf';
const SQL_FILE = path.join(__dirname, '..', 'supabase', 'migrations', 'performance_cleanup_20260224', 'EXECUTE_NOW.sql');

// Funksjon for å hente access token fra Supabase CLI
function getAccessToken() {
  try {
    // Prøv å hente fra supabase CLI config
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configPath = path.join(homeDir, '.config', 'supabase', 'config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.access_token) {
        return config.access_token;
      }
    }
    
    // Alternativ: prøv å hente fra miljø
    return process.env.SUPABASE_ACCESS_TOKEN;
  } catch (error) {
    console.error('Kunne ikke hente access token:', error.message);
    return null;
  }
}

// Funksjon for å kjøre SQL via Supabase Management API
async function executeSQLQuery(query) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('Ingen access token funnet. Kjør: supabase login');
  }
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }
  
  return await response.json();
}

// Funksjon for å kjøre SQL via psql hvis tilgjengelig
function executeViaPsql(query) {
  try {
    // Hent connection string via supabase CLI
    const result = execSync('supabase projects api-keys --project-ref vuxbjlykgmzskxbclquf --output json', {
      encoding: 'utf8',
      timeout: 10000
    });
    
    const keys = JSON.parse(result);
    // Dessverre gir ikke dette oss database password...
    
    return null;
  } catch (error) {
    return null;
  }
}

// Hovedfunksjon
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AUTOMATISK SQL EXECUTOR                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  
  // Sjekk om SQL-fil finnes
  if (!fs.existsSync(SQL_FILE)) {
    console.error(`❌ SQL-fil ikke funnet: ${SQL_FILE}`);
    process.exit(1);
  }
  
  console.log('📄 Leser SQL-fil...');
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  
  // Del opp SQL i separate statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`   Funnet ${statements.length} SQL statements`);
  console.log();
  
  // Sjekk access token
  const token = getAccessToken();
  if (!token) {
    console.error('❌ Ingen Supabase access token funnet');
    console.error('   Kjør: supabase login');
    console.error('   Eller sett: export SUPABASE_ACCESS_TOKEN=your_token');
    process.exit(1);
  }
  
  console.log('🔑 Access token funnet ✓');
  console.log();
  
  // Kjør hvert statement
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);
    
    try {
      // Hopp over DO $$ blokker for nå (de er komplekse)
      if (stmt.includes('DO $$')) {
        console.log('   ⏭️  Hopper over DO block (kjøres manuelt)');
        continue;
      }
      
      // Hopp over SELECT statements som ikke er viktige for execution
      if (stmt.startsWith('SELECT') && !stmt.includes('CREATE') && !stmt.includes('DROP')) {
        console.log('   ℹ️  SELECT statement (ikke-kritisk)');
        continue;
      }
      
      const result = await executeSQLQuery(stmt + ';');
      console.log('   ✅ OK');
      success++;
      
    } catch (error) {
      console.log(`   ❌ Feil: ${error.message.substring(0, 80)}`);
      failed++;
    }
    
    // Liten pause
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTAT                                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`✅ Suksess: ${success}`);
  console.log(`❌ Feil: ${failed}`);
  console.log(`⏭️  Hoppet over: ${statements.length - success - failed}`);
  console.log();
  
  if (failed > 0) {
    console.log('⚠️  Noen statements feilet. Kjør disse manuelt i Supabase SQL Editor.');
    console.log(`   URL: https://app.supabase.com/project/${PROJECT_REF}/sql/new`);
  }
}

main().catch(err => {
  console.error('Feil:', err);
  process.exit(1);
});
