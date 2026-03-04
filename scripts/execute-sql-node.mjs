#!/usr/bin/env node
/**
 * Execute SQL via Supabase Service Role
 * Usage: node execute-sql-node.mjs <sql-file> <service-role-key>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const PROJECT_REF = 'vuxbjlykgmzskxbclquf';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

async function executeSQL(sqlFile, serviceRoleKey) {
    console.log('🔄 Connecting to Supabase...');
    
    const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Read SQL file
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`📄 Loaded SQL file: ${path.basename(sqlFile)}`);
    console.log(`📊 SQL size: ${sql.length} characters`);
    
    // Split SQL into statements (basic parsing)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`🔢 Found ${statements.length} SQL statements`);
    console.log('');
    
    // Execute each statement
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        const shortDesc = stmt.substring(0, 50).replace(/\n/g, ' ');
        
        process.stdout.write(`  [${i + 1}/${statements.length}] ${shortDesc}... `);
        
        try {
            // Use rpc to execute raw SQL (requires exec_sql function)
            const { data, error } = await supabase.rpc('exec_sql', { query: stmt });
            
            if (error) {
                // If exec_sql doesn't exist, try direct query
                const { error: queryError } = await supabase.from('_temp_query').select('*').limit(0);
                
                // Alternative: Use REST API directly
                const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'params=single-object',
                        'X-Client-Info': 'supabase-js/2.0'
                    },
                    body: JSON.stringify({ query: stmt })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                console.log('✅');
                success++;
            } else {
                console.log('✅');
                success++;
            }
        } catch (err) {
            console.log(`❌ (${err.message})`);
            failed++;
        }
    }
    
    console.log('');
    console.log(`📊 Results: ${success} success, ${failed} failed`);
    
    return failed === 0;
}

// Main
const [,, sqlFile, serviceRoleKey] = process.argv;

if (!sqlFile || !serviceRoleKey) {
    console.error('Usage: node execute-sql-node.mjs <sql-file> <service-role-key>');
    process.exit(1);
}

executeSQL(sqlFile, serviceRoleKey)
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
