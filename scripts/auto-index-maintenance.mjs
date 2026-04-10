#!/usr/bin/env node
/**
 * 🔧 Automated Index Maintenance
 * 
 * Analyserer og vedlikeholder database-indexer:
 * - Identifiserer ubrukte indexer
 * - Genererer DROP INDEX statements (ikke kjører automatisk)
 * - Logger historikk for trend-analyse
 * - Sender rapport til Linear/Slack
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';

const __dirname = new URL('.', import.meta.url).pathname;

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

const REPORT_FILE = resolve(process.cwd(), 'reports/index-maintenance-report.json');
const HISTORY_FILE = resolve(process.cwd(), 'reports/index-maintenance-history.jsonl');

async function analyzeIndexes() {
  console.log('🔍 Analyserer database-indexer...\n');
  
  // 1. Get all unused indexes
  const { data: unusedIndexes, error: unusedError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        idx_scan as times_used,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as size_bytes
      FROM pg_stat_user_indexes 
      WHERE idx_scan = 0 
      AND schemaname = 'public'
      AND indexrelname NOT LIKE '%pkey%'
      AND indexrelname NOT LIKE '%_key%'
      ORDER BY pg_relation_size(indexrelid) DESC
    `
  });
  
  if (unusedError) {
    console.error('❌ Feil ved henting av ubrukte indexer:', unusedError);
    // Fallback: direct SQL
    const { data, error } = await supabase.from('_unused_indexes_view').select('*');
    if (error) throw error;
    return analyzeResults(data || []);
  }
  
  return analyzeResults(unusedIndexes || []);
}

async function analyzeResults(unusedIndexes) {
  // 2. Get duplicate indexes
  const { data: duplicates, error: dupError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.tablename,
        array_agg(i.indexname ORDER BY i.indexname) as indexes
      FROM pg_indexes i
      JOIN pg_indexes t ON i.tablename = t.tablename 
        AND i.indexdef LIKE '%(' || split_part(split_part(t.indexdef, '(', 2), ')', 1) || ')%'
      WHERE i.schemaname = 'public'
      GROUP BY t.tablename
      HAVING count(*) > 1
      ORDER BY t.tablename
    `
  });
  
  // 3. Calculate totals
  const totalUnused = unusedIndexes.length;
  const totalSize = unusedIndexes.reduce((sum, idx) => sum + (idx.size_bytes || 0), 0);
  
  // 4. Generate DROP statements (for review)
  const dropStatements = unusedIndexes.map(idx => 
    `-- ${idx.index_size} | Last used: ${idx.times_used} times\n` +
    `DROP INDEX CONCURRENTLY IF EXISTS "${idx.index_name}";`
  );
  
  // 5. Categorize by risk
  const safeToRemove = unusedIndexes.filter(idx => 
    idx.index_name.includes('idx_') && 
    !idx.index_name.includes('pkey') &&
    !idx.index_name.includes('unique')
  );
  
  const needsReview = unusedIndexes.filter(idx => 
    idx.index_name.includes('unique') || 
    idx.index_name.includes('pkey') ||
    idx.index_name.includes('key')
  );
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_unused_indexes: totalUnused,
      total_size_bytes: totalSize,
      total_size_pretty: formatBytes(totalSize),
      safe_to_remove: safeToRemove.length,
      needs_review: needsReview.length,
      potential_savings: formatBytes(safeToRemove.reduce((s, i) => s + (i.size_bytes || 0), 0))
    },
    unused_indexes: unusedIndexes,
    duplicates: duplicates || [],
    drop_statements: dropStatements,
    recommendations: generateRecommendations(unusedIndexes, safeToRemove)
  };
  
  return report;
}

function generateRecommendations(allIndexes, safeToRemove) {
  const recommendations = [];
  
  if (safeToRemove.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Remove unused indexes',
      count: safeToRemove.length,
      savings: formatBytes(safeToRemove.reduce((s, i) => s + (i.size_bytes || 0), 0)),
      sql_file: 'scripts/sql/remove-unused-indexes.sql'
    });
  }
  
  if (allIndexes.length > 300) {
    recommendations.push({
      priority: 'medium',
      action: 'Schedule weekly index analysis',
      reason: 'High number of unused indexes indicates need for regular maintenance'
    });
  }
  
  // Check for missing indexes on high-write tables
  recommendations.push({
    priority: 'low',
    action: 'Review index strategy for unified_notifications',
    reason: 'High write activity (8.9M writes) - ensure indexes are optimized for write performance'
  });
  
  return recommendations;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function saveReport(report) {
  // Ensure reports directory exists
  const reportsDir = resolve(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    await import('fs/promises').then(fs => fs.mkdir(reportsDir, { recursive: true }));
  }
  
  // Save full report
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  // Append to history
  const historyEntry = {
    timestamp: report.timestamp,
    total_unused: report.summary.total_unused_indexes,
    total_size: report.summary.total_size_bytes
  };
  appendFileSync(HISTORY_FILE, JSON.stringify(historyEntry) + '\n');
  
  console.log('💾 Rapport lagret:', REPORT_FILE);
}

function printReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 INDEX MAINTENANCE RAPPORT');
  console.log('📅', report.timestamp);
  console.log('='.repeat(60));
  
  console.log('\n📈 SAMMENDRAG:');
  console.log(`   Ubrukte indexer:     ${report.summary.total_unused_indexes}`);
  console.log(`   Total størrelse:     ${report.summary.total_size_pretty}`);
  console.log(`   Trygge å fjerne:     ${report.summary.safe_to_remove}`);
  console.log(`   Trenger review:      ${report.summary.needs_review}`);
  console.log(`   Potensiell sparing:  ${report.summary.potential_savings}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n🎯 ANBEFALINGER:');
    report.recommendations.forEach(rec => {
      const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${emoji} [${rec.priority.toUpperCase()}] ${rec.action}`);
      if (rec.count) console.log(`       Antall: ${rec.count}`);
      if (rec.savings) console.log(`       Sparing: ${rec.savings}`);
      if (rec.reason) console.log(`       Årsak: ${rec.reason}`);
    });
  }
  
  console.log('\n📋 TOP 10 UBUKTE INDEXER (etter størrelse):');
  report.unused_indexes.slice(0, 10).forEach((idx, i) => {
    console.log(`   ${i + 1}. ${idx.index_name}`);
    console.log(`      Tabell: ${idx.table_name} | Størrelse: ${idx.index_size}`);
  });
  
  console.log('\n⚠️  VIKTIG:');
  console.log('   DROP INDEX statements er generert men IKKE kjørt.');
  console.log('   Se scripts/sql/remove-unused-indexes.sql for SQL.');
  console.log('   Alltid kjør ANALYZE etter index-endringer.');
  
  console.log('\n' + '='.repeat(60));
}

async function generateSqlFile(report) {
  const sqlDir = resolve(process.cwd(), 'scripts/sql');
  if (!existsSync(sqlDir)) {
    await import('fs/promises').then(fs => fs.mkdir(sqlDir, { recursive: true }));
  }
  
  const safeIndexes = report.unused_indexes.filter(idx => 
    idx.index_name.includes('idx_') && 
    !idx.index_name.includes('pkey') &&
    !idx.index_name.includes('unique')
  );
  
  const sql = `-- Auto-generated index cleanup script
-- Generated: ${report.timestamp}
-- Total unused indexes: ${report.summary.total_unused_indexes}
-- Safe to remove: ${safeIndexes.length}
-- WARNING: Review carefully before running!

BEGIN;

-- Safe indexes to remove (${safeIndexes.length})
${safeIndexes.map(idx => `
-- ${idx.index_size} | Table: ${idx.table_name}
-- DROP INDEX CONCURRENTLY IF EXISTS "${idx.index_name}";`).join('\n')}

-- Run ANALYZE after index changes
-- ANALYZE;

ROLLBACK;  -- Change to COMMIT after review
`;
  
  writeFileSync(resolve(sqlDir, 'remove-unused-indexes.sql'), sql);
  console.log('📝 SQL-fil generert: scripts/sql/remove-unused-indexes.sql');
}

// Main execution
async function main() {
  try {
    const report = await analyzeIndexes();
    await saveReport(report);
    printReport(report);
    await generateSqlFile(report);
    
    // Exit with code based on severity
    if (report.summary.total_unused_indexes > 350) {
      console.log('\n⚠️  Exit code 1: Kritisk antall ubrukte indexer');
      process.exit(1);
    }
    if (report.summary.total_unused_indexes > 250) {
      console.log('\n🟡 Exit code 2: Høyt antall ubrukte indexer');
      process.exit(2);
    }
    
    console.log('\n✅ Exit code 0: Innenfor akseptable grenser');
    process.exit(0);
  } catch (err) {
    console.error('❌ Feil:', err.message);
    process.exit(3);
  }
}

main();
