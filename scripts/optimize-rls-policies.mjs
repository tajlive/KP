#!/usr/bin/env node
/**
 * 🔐 RLS Policy Optimizer
 * 
 * Optimaliserer Row Level Security policies:
 * - Erstatter auth.uid() med (select auth.uid()) for bedre ytelse
 * - Identifiserer dupliserte/overlappende policies
 * - Genererer optimaliserte CREATE POLICY statements
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeRLSPolicies() {
  console.log('🔐 Analyserer RLS policies...\n');
  
  const { data: policies, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual as using_expression,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `
  });
  
  if (error) {
    console.error('❌ Feil:', error);
    process.exit(1);
  }
  
  return analyzePolicies(policies || []);
}

function analyzePolicies(policies) {
  const analysis = {
    total_policies: policies.length,
    tables_with_policies: new Set(policies.map(p => p.tablename)).size,
    needs_optimization: [],
    potential_duplicates: [],
    by_table: {}
  };
  
  // Group by table
  policies.forEach(policy => {
    if (!analysis.by_table[policy.tablename]) {
      analysis.by_table[policy.tablename] = [];
    }
    analysis.by_table[policy.tablename].push(policy);
  });
  
  // Analyze each policy
  policies.forEach(policy => {
    const usingExpr = policy.using_expression || '';
    const withCheck = policy.with_check || '';
    
    // Check for auth.uid() without subquery
    const hasUnoptimizedAuth = 
      (usingExpr.includes('auth.uid()') && !usingExpr.includes('(select auth.uid())')) ||
      (withCheck.includes('auth.uid()') && !withCheck.includes('(select auth.uid())'));
    
    if (hasUnoptimizedAuth) {
      analysis.needs_optimization.push({
        table: policy.tablename,
        policy: policy.policyname,
        cmd: policy.cmd,
        current_using: usingExpr,
        current_with_check: withCheck,
        reason: 'auth.uid() bør være (select auth.uid()) for initplan optimalisering'
      });
    }
  });
  
  // Find potential duplicates (same table, same cmd, similar expression)
  Object.entries(analysis.by_table).forEach(([table, tablePolicies]) => {
    const byCmd = {};
    tablePolicies.forEach(p => {
      if (!byCmd[p.cmd]) byCmd[p.cmd] = [];
      byCmd[p.cmd].push(p);
    });
    
    Object.entries(byCmd).forEach(([cmd, cmdPolicies]) => {
      if (cmdPolicies.length > 1) {
        // Check for very similar policies
        for (let i = 0; i < cmdPolicies.length; i++) {
          for (let j = i + 1; j < cmdPolicies.length; j++) {
            const p1 = cmdPolicies[i];
            const p2 = cmdPolicies[j];
            
            if (expressionsSimilar(p1.using_expression, p2.using_expression)) {
              analysis.potential_duplicates.push({
                table,
                cmd,
                policy1: p1.policyname,
                policy2: p2.policyname,
                suggestion: 'Vurder å slå sammen policies'
              });
            }
          }
        }
      }
    });
  });
  
  return analysis;
}

function expressionsSimilar(expr1, expr2) {
  if (!expr1 || !expr2) return false;
  // Simple similarity check - normalize whitespace
  const normalize = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalize(expr1) === normalize(expr2);
}

function generateOptimizedSQL(analysis) {
  let sql = `-- RLS Policy Optimization Script
-- Generated: ${new Date().toISOString()}
-- Total policies: ${analysis.total_policies}
-- Policies needing optimization: ${analysis.needs_optimization.length}

`;
  
  if (analysis.needs_optimization.length === 0) {
    sql += '-- ✅ All policies are already optimized!\n';
    return sql;
  }
  
  sql += `-- Policies needing auth.uid() optimization\n\n`;
  
  // Group by table for cleaner output
  const byTable = {};
  analysis.needs_optimization.forEach(opt => {
    if (!byTable[opt.table]) byTable[opt.table] = [];
    byTable[opt.table].push(opt);
  });
  
  Object.entries(byTable).forEach(([table, opts]) => {
    sql += `-- Table: ${table}\n`;
    opts.forEach(opt => {
      sql += `
-- Policy: ${opt.policy} (${opt.cmd})
-- Current (SLOW): ${opt.current_using?.substring(0, 60) || 'N/A'}...
-- Optimized (FAST): ${opt.current_using?.replace(/auth\.uid\(\)/g, '(select auth.uid())').substring(0, 60) || 'N/A'}...

-- DROP POLICY "${opt.policy}" ON "${table}";
-- CREATE POLICY "${opt.policy}" ON "${table}"
--   FOR ${opt.cmd}
--   USING (${opt.current_using?.replace(/auth\.uid\(\)/g, '(select auth.uid())') || 'true'})
--   ${opt.current_with_check ? `WITH CHECK (${opt.current_with_check.replace(/auth\.uid\(\)/g, '(select auth.uid())')})` : ''};

`;
    });
  });
  
  if (analysis.potential_duplicates.length > 0) {
    sql += `\n-- Potential duplicate policies to review:\n`;
    analysis.potential_duplicates.forEach(dup => {
      sql += `-- Table: ${dup.table}, Cmd: ${dup.cmd}\n`;
      sql += `--   ${dup.policy1} vs ${dup.policy2}\n`;
    });
  }
  
  return sql;
}

async function saveResults(analysis) {
  const sqlDir = resolve(process.cwd(), 'scripts/sql');
  if (!existsSync(sqlDir)) {
    await import('fs/promises').then(fs => fs.mkdir(sqlDir, { recursive: true }));
  }
  
  const sql = generateOptimizedSQL(analysis);
  writeFileSync(resolve(sqlDir, 'optimize-rls-policies.sql'), sql);
  
  // Save JSON report
  const report = {
    timestamp: new Date().toISOString(),
    ...analysis,
    by_table: Object.fromEntries(
      Object.entries(analysis.by_table).map(([k, v]) => [k, v.length])
    )
  };
  
  writeFileSync(
    resolve(process.cwd(), 'reports/rls-optimization-report.json'),
    JSON.stringify(report, null, 2)
  );
}

function printReport(analysis) {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 RLS POLICY ANALYSIS');
  console.log('='.repeat(60));
  
  console.log(`\n📊 SAMMENDRAG:`);
  console.log(`   Totale policies:     ${analysis.total_policies}`);
  console.log(`   Tabeller med RLS:    ${analysis.tables_with_policies}`);
  console.log(`   Trenger optimalisering: ${analysis.needs_optimization.length}`);
  console.log(`   Potensielle duplikater: ${analysis.potential_duplicates.length}`);
  
  if (analysis.needs_optimization.length > 0) {
    console.log(`\n⚠️  POLICIES SOM TRENGER OPTIMALISERING:`);
    
    const byTable = {};
    analysis.needs_optimization.forEach(opt => {
      if (!byTable[opt.table]) byTable[opt.table] = 0;
      byTable[opt.table]++;
    });
    
    Object.entries(byTable)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([table, count]) => {
        console.log(`   ${table}: ${count} policies`);
      });
    
    console.log(`\n📝 SQL-fil generert: scripts/sql/optimize-rls-policies.sql`);
    console.log('   Inneholder DROP/CREATE statements for review.');
  } else {
    console.log('\n✅ Alle policies er allerede optimalisert!');
  }
  
  if (analysis.potential_duplicates.length > 0) {
    console.log(`\n🔍 POTENSIELLE DUPLIKATER:`);
    analysis.potential_duplicates.slice(0, 5).forEach(dup => {
      console.log(`   ${dup.table}: ${dup.policy1} ≈ ${dup.policy2}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

async function main() {
  try {
    const analysis = await analyzeRLSPolicies();
    await saveResults(analysis);
    printReport(analysis);
    
    if (analysis.needs_optimization.length > 50) {
      console.log('\n🔴 Exit code 1: Mange policies trenger optimalisering');
      process.exit(1);
    }
    if (analysis.needs_optimization.length > 0) {
      console.log('\n🟡 Exit code 2: Noen policies trenger oppmerksomhet');
      process.exit(2);
    }
    
    console.log('\n✅ Exit code 0: Alle policies er optimalisert');
    process.exit(0);
  } catch (err) {
    console.error('❌ Feil:', err.message);
    process.exit(3);
  }
}

main();
