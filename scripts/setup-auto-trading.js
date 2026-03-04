#!/usr/bin/env node

/**
 * Auto-Trading Database Setup Script
 * 
 * Dette scriptet kjører SQL migrasjonen direkte via Supabase API
 * Krever: SUPABASE_SERVICE_ROLE_KEY og SUPABASE_URL i .env.local
 */

const fs = require('fs');
const path = require('path');

// Farger for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupAutoTrading() {
  log('🚀 Klarpakke Auto-Trading Setup', 'cyan');
  log('================================', 'cyan');
  console.log();

  // Les .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  let supabaseUrl, supabaseKey;

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  } catch (error) {
    log('❌ Feil: Kunne ikke lese .env.local', 'red');
    log('   Sørg for at filen eksisterer i rot-mappen', 'yellow');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Feil: Manglende miljøvariabler', 'red');
    log('   Må inneholde:', 'yellow');
    log('   - NEXT_PUBLIC_SUPABASE_URL', 'yellow');
    log('   - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }

  log('✓ Fant miljøvariabler', 'green');
  log(`  URL: ${supabaseUrl}`, 'blue');
  console.log();

  // Les SQL fil
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260208000000_add_auto_trading.sql');
  
  if (!fs.existsSync(sqlPath)) {
    log('❌ Feil: Migrasjonsfil ikke funnet', 'red');
    log(`   Forventet: ${sqlPath}`, 'yellow');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  log('✓ Fant migrasjonsfil', 'green');
  log(`  Størrelse: ${(sqlContent.length / 1024).toFixed(2)} KB`, 'blue');
  console.log();

  // Del SQL inn i separate statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  log(`📊 Antall SQL statements: ${statements.length}`, 'yellow');
  console.log();

  // Kjør hver SQL statement
  log('🔧 Kjører migrasjon...', 'blue');
  console.log();

  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const shortDesc = statement.substring(0, 50).replace(/\s+/g, ' ');
    
    process.stdout.write(`  [${i + 1}/${statements.length}] ${shortDesc}... `);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok) {
        log('✓', 'green');
        results.success.push(statement.substring(0, 30));
      } else {
        const error = await response.text();
        // Noen statements kan feile hvis de allerede eksisterer, det er OK
        if (error.includes('already exists') || error.includes('duplicate')) {
          log('✓ (eksisterte)', 'yellow');
          results.success.push(statement.substring(0, 30));
        } else {
          log('✗', 'red');
          log(`     Feil: ${error.substring(0, 100)}`, 'red');
          results.failed.push({ statement: shortDesc, error });
        }
      }
    } catch (error) {
      log('✗', 'red');
      log(`     Feil: ${error.message}`, 'red');
      results.failed.push({ statement: shortDesc, error: error.message });
    }
  }

  console.log();
  log('================================', 'cyan');
  
  if (results.failed.length === 0) {
    log('✅ Migrasjon vellykket!', 'green');
    console.log();
    log('Opprettet tabeller:', 'blue');
    log('  • trading_api_keys', 'green');
    log('  • auto_trade_settings', 'green');
    log('  • auto_trades', 'green');
    log('  • auto_trade_daily_stats', 'green');
    console.log();
    log('Neste steg:', 'yellow');
    log('  1. Gå til /admin/test-auto-trading', 'blue');
    log('  2. Kjør en test med mock-signal', 'blue');
    log('  3. Verifiser at alt fungerer', 'blue');
  } else {
    log(`⚠️  ${results.failed.length} statements feilet`, 'yellow');
    console.log();
    log('Feil detaljer:', 'red');
    results.failed.forEach((f, i) => {
      log(`  ${i + 1}. ${f.statement}`, 'red');
      log(`     ${f.error.substring(0, 100)}`, 'red');
    });
    console.log();
    log('Tips: Noen feil er OK hvis tabellene allerede eksisterer', 'yellow');
  }
}

// Kjør scriptet
setupAutoTrading().catch(error => {
  console.error('Uventet feil:', error);
  process.exit(1);
});
