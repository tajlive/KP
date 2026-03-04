#!/usr/bin/env node
/**
 * SQL Migration Runner via Supabase MCP
 * Kjør: node scripts/run-sql-migration.js
 */

const fs = require('fs');
const path = require('path');

// Les SQL fil
const sqlFile = process.argv[2] || 'supabase/migrations/001_trading_system.sql';
const sqlContent = fs.readFileSync(path.join(process.cwd(), sqlFile), 'utf8');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🗄️  SQL MIGRATION RUNNER                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`SQL-fil: ${sqlFile}`);
console.log(`Størrelse: ${sqlContent.length} tegn`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('For å kjøre denne SQL-en automatisk via MCP:');
console.log('');
console.log('1. Bruk Supabase MCP tool: execute_sql');
console.log('2. Lim inn SQL under:');
console.log('');
console.log('```sql');
console.log(sqlContent.substring(0, 500) + '...');
console.log('```');
console.log('');
console.log('ELLER kjør direkte med Supabase CLI:');
console.log('');
console.log(`supabase db execute --file ${sqlFile}`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Lagre SQL til temp for enkel kopiering
const tempFile = '/tmp/migration_to_run.sql';
fs.writeFileSync(tempFile, sqlContent);
console.log(`✓ SQL lagret til: ${tempFile}`);
console.log('');
