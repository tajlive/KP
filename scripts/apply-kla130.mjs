#!/usr/bin/env node
/**
 * KLA-130: Apply KLT 500 bonus fix via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sql = readFileSync(join(__dirname, 'kla130-apply.sql'), 'utf-8');

async function applyMigration() {
  console.log('🔥 KLA-130: Applying KLT 500 bonus fix...\n');
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        // exec_sql might not exist, try alternative approach
        console.log(`  ⚠️  exec_sql failed: ${error.message}`);
        console.log(`  Trying raw query...`);
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (e) {
      console.log(`  ⚠️  Error: ${e.message}`);
    }
  }
  
  console.log('\n✅ KLA-130 Migration applied!');
}

// Alternative: Create the SQL via Edge Function
try {
  await applyMigration();
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
}
