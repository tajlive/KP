#!/usr/bin/env node
/**
 * AI SQL Runner - Automated SQL execution via Supabase
 * 
 * This script allows AI agents (and you) to execute SQL files automatically
 * without manual copy-paste to Supabase Dashboard.
 * 
 * Prerequisites:
 * 1. exec_sql function must exist in database (run 20260228_create_exec_sql_function.sql first)
 * 2. SUPABASE_SERVICE_ROLE_KEY must be set
 * 
 * Usage:
 *   node scripts/ai-sql-runner.js <sql-file>
 *   node scripts/ai-sql-runner.js supabase/migrations/20260228_kla34_gamification_levelup.sql
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Get service role key from: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Parse SQL file into executable statements
 */
function parseSQL(content) {
  const statements = [];
  let current = '';
  let inFunction = false;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('--')) continue;
    
    // Track function blocks (they contain $$)
    if (trimmed.includes('$$')) {
      inFunction = !inFunction;
    }
    
    current += line + '\n';
    
    // End of statement (semicolon not in function block)
    if (trimmed.endsWith(';') && !inFunction) {
      if (current.trim()) {
        statements.push(current.trim());
        current = '';
      }
    }
  }
  
  // Add remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

/**
 * Execute single SQL statement via RPC
 */
async function executeStatement(sql, index, total) {
  try {
    console.log(`\n📝 Statement ${index}/${total}:`);
    console.log(`   ${sql.substring(0, 80)}${sql.length > 80 ? '...' : ''}`);
    
    // Call exec_sql function via RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    });
    
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    // Check if function returned error
    if (data && data.error) {
      console.error(`   ❌ SQL Error: ${data.error}`);
      return { success: false, error: data.error };
    }
    
    console.log(`   ✅ Success`);
    return { success: true };
    
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Main execution
 */
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Usage: node ai-sql-runner.js <sql-file>');
    console.log('Example: node ai-sql-runner.js supabase/migrations/my-migration.sql');
    process.exit(1);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  🤖 AI SQL RUNNER                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Read SQL file
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    console.error(`❌ Cannot read file: ${filePath}`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }
  
  console.log(`📄 File: ${path.basename(filePath)}`);
  console.log(`📊 Size: ${content.length} bytes\n`);
  
  // Parse into statements
  const statements = parseSQL(content);
  
  if (statements.length === 0) {
    console.log('⚠️  No SQL statements found in file');
    process.exit(0);
  }
  
  console.log(`🔍 Found ${statements.length} SQL statement(s)\n`);
  
  // Execute each statement
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const result = await executeStatement(statements[i], i + 1, statements.length);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
      // Continue with next statement (don't stop on error)
    }
  }
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      📊 SUMMARY                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Successful: ${successCount.toString().padStart(3)}                                      ║`);
  console.log(`║  ❌ Failed:     ${failCount.toString().padStart(3)}                                      ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
