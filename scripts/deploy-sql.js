#!/usr/bin/env node
/**
 * Supabase SQL Auto-Deploy
 * Kjører SQL migrasjoner automatisk via Supabase JS Client
 * 
 * Usage: node scripts/deploy-sql.js [migration_file]
 * Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
};

// Get Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  log.error('Missing Supabase credentials!');
  console.log('\nSet these environment variables:');
  console.log('  export SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('\nGet service role key from: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Execute SQL query
 */
async function executeSQL(sql, description = 'SQL') {
  try {
    log.info(`Executing: ${description}`);
    
    // Use Supabase's rpc to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('query', sql);
      
      if (queryError) {
        // Fallback: Use REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ query: sql }),
        });
        
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err);
        }
      }
    }
    
    log.success(`${description} - OK`);
    return { success: true, data };
  } catch (err) {
    log.error(`${description} - FAILED`);
    console.error(`   ${err.message || err}`);
    return { success: false, error: err };
  }
}

/**
 * Read and parse SQL file
 */
function readSQLFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Split by semicolon to get individual statements
  // But be careful with function definitions that contain semicolons
  const statements = [];
  let current = '';
  let inFunction = false;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('--')) continue;
    
    // Track function blocks
    if (trimmed.includes('$$')) {
      inFunction = !inFunction;
    }
    
    current += line + '\n';
    
    // End of statement (semicolon not in function)
    if (trimmed.endsWith(';') && !inFunction) {
      if (current.trim()) {
        statements.push(current.trim());
        current = '';
      }
    }
  }
  
  // Add remaining
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

/**
 * Deploy single migration
 */
async function deployMigration(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n${'─'.repeat(60)}`);
  log.info(`Deploying: ${filename}`);
  console.log(`${'─'.repeat(60)}\n`);
  
  const statements = readSQLFile(filePath);
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.trim()) continue;
    
    const result = await executeSQL(stmt, `Statement ${i + 1}/${statements.length}`);
    
    if (result.success) {
      success++;
    } else {
      failed++;
      // Continue with next statement
    }
  }
  
  console.log(`\n${'─'.repeat(60)}`);
  log.success(`${filename}: ${success} OK, ${failed} failed`);
  console.log(`${'─'.repeat(60)}`);
  
  return failed === 0;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           🗄️  SUPABASE SQL AUTO-DEPLOY                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const targetFile = process.argv[2];
  
  if (targetFile) {
    // Deploy specific file
    const fullPath = path.resolve(targetFile);
    if (!fs.existsSync(fullPath)) {
      log.error(`File not found: ${fullPath}`);
      process.exit(1);
    }
    
    const success = await deployMigration(fullPath);
    process.exit(success ? 0 : 1);
  } else {
    // Deploy all pending migrations
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      log.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      log.warning('No migration files found');
      process.exit(0);
    }
    
    log.info(`Found ${files.length} migration files`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const success = await deployMigration(filePath);
      
      if (success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      📊 SUMMARY                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Successful: ${totalSuccess.toString().padStart(3)}                                        ║`);
    console.log(`║  ❌ Failed:     ${totalFailed.toString().padStart(3)}                                        ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    process.exit(totalFailed > 0 ? 1 : 0);
  }
}

main().catch(err => {
  log.error('Unexpected error');
  console.error(err);
  process.exit(1);
});
