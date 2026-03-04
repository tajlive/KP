#!/usr/bin/env node
/**
 * SQL Generator - Smart SQL creation helper
 * 
 * Usage:
 *   node scripts/sql-generator.js table <table_name> [columns...]
 *   node scripts/sql-generator.js column <table> <column> <type>
 *   node scripts/sql-generator.js function <name> <params>
 *   node scripts/sql-generator.js trigger <table> <event>
 * 
 * Examples:
 *   node scripts/sql-generator.js table user_badges user_id:uuid badge_name:text earned_at:timestamp
 *   node scripts/sql-generator.js column profiles tier text
 *   node scripts/sql-generator.js function calculate_discount user_id:uuid amount:integer
 */

import fs from 'fs/promises';
import path from 'path';

const timestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
};

const generateMigrationHeader = (description) => `-- ============================================================================
-- ${description}
-- Generated: ${new Date().toISOString()}
-- ============================================================================

`;

const generateTableSQL = (tableName, columns) => {
  const colDefs = columns.map(col => {
    const [name, type] = col.split(':');
    const pgType = {
      'uuid': 'UUID',
      'text': 'TEXT',
      'int': 'INTEGER',
      'integer': 'INTEGER',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'timestamp': 'TIMESTAMPTZ',
      'date': 'DATE',
      'json': 'JSONB',
      'numeric': 'NUMERIC',
    }[type] || 'TEXT';
    
    if (name === 'id') return `    id UUID DEFAULT gen_random_uuid() PRIMARY KEY`;
    if (name === 'user_id') return `    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`;
    if (name === 'created_at') return `    created_at TIMESTAMPTZ DEFAULT NOW()`;
    if (name === 'updated_at') return `    updated_at TIMESTAMPTZ DEFAULT NOW()`;
    
    return `    ${name} ${pgType}`;
  });

  // Add default columns if not present
  if (!columns.find(c => c.startsWith('id:'))) colDefs.unshift('    id UUID DEFAULT gen_random_uuid() PRIMARY KEY');
  if (!columns.find(c => c.startsWith('created_at:'))) colDefs.push('    created_at TIMESTAMPTZ DEFAULT NOW()');
  if (!columns.find(c => c.startsWith('updated_at:'))) colDefs.push('    updated_at TIMESTAMPTZ DEFAULT NOW()');

  return `CREATE TABLE IF NOT EXISTS ${tableName} (
${colDefs.join(',\n')}
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_${tableName}_user ON ${tableName}(user_id);
${columns.find(c => c.startsWith('created_at:')) ? `CREATE INDEX IF NOT EXISTS idx_${tableName}_created ON ${tableName}(created_at DESC);` : ''}

-- RLS
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ${tableName}"
    ON ${tableName} FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage ${tableName}"
    ON ${tableName} FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_${tableName}_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_${tableName}_timestamp ON ${tableName};
CREATE TRIGGER update_${tableName}_timestamp
    BEFORE UPDATE ON ${tableName}
    FOR EACH ROW
    EXECUTE FUNCTION update_${tableName}_timestamp();

COMMENT ON TABLE ${tableName} IS 'Auto-generated table';
`;
};

const generateColumnSQL = (table, column, type) => {
  const pgType = {
    'uuid': 'UUID',
    'text': 'TEXT',
    'int': 'INTEGER',
    'integer': 'INTEGER',
    'bool': 'BOOLEAN',
    'boolean': 'BOOLEAN',
    'timestamp': 'TIMESTAMPTZ',
    'date': 'DATE',
    'json': 'JSONB',
    'numeric': 'NUMERIC',
  }[type] || 'TEXT';

  return `DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}') THEN
        ALTER TABLE ${table} ADD COLUMN ${column} ${pgType};
    END IF;
END $$;

COMMENT ON COLUMN ${table}.${column} IS 'Added ${new Date().toISOString().split('T')[0]}';
`;
};

const generateFunctionSQL = (name, params) => {
  const paramDefs = params.map(p => {
    const [name, type] = p.split(':');
    const pgType = {
      'uuid': 'UUID',
      'text': 'TEXT',
      'int': 'INTEGER',
      'integer': 'INTEGER',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'timestamp': 'TIMESTAMPTZ',
    }[type] || 'TEXT';
    return `    p_${name} ${pgType}`;
  }).join(',\n');

  return `CREATE OR REPLACE FUNCTION ${name}(
${paramDefs}
)
RETURNS TABLE (result JSONB) AS $$
BEGIN
    -- TODO: Implement logic
    RETURN QUERY SELECT jsonb_build_object('status', 'not implemented');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ${name} IS 'Auto-generated function';
`;
};

const generateTriggerSQL = (table, event) => {
  const functionName = `${table}_${event.toLowerCase()}_trigger`;
  
  return `CREATE OR REPLACE FUNCTION ${functionName}()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- TODO: Insert logic
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- TODO: Update logic
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- TODO: Delete logic
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ${functionName} ON ${table};
CREATE TRIGGER ${functionName}
    BEFORE ${event} ON ${table}
    FOR EACH ROW
    EXECUTE FUNCTION ${functionName}();
`;
};

const main = async () => {
  const [, , command, ...args] = process.argv;

  if (!command) {
    console.log('SQL Generator - Smart SQL creation\n');
    console.log('Usage:');
    console.log('  node scripts/sql-generator.js table <name> [cols...]');
    console.log('  node scripts/sql-generator.js column <table> <col> <type>');
    console.log('  node scripts/sql-generator.js function <name> [params...]');
    console.log('  node scripts/sql-generator.js trigger <table> <INSERT|UPDATE|DELETE>');
    console.log('\nExamples:');
    console.log('  node scripts/sql-generator.js table user_badges user_id:uuid name:text');
    console.log('  node scripts/sql-generator.js column profiles tier text');
    console.log('  node scripts/sql-generator.js function award_badge user_id:uuid badge:text');
    process.exit(1);
  }

  let sql = '';
  let filename = '';

  switch (command) {
    case 'table':
      const [tableName, ...columns] = args;
      if (!tableName) {
        console.error('❌ Table name required');
        process.exit(1);
      }
      sql = generateMigrationHeader(`Create ${tableName} table`) + generateTableSQL(tableName, columns);
      filename = `${timestamp()}_create_${tableName}.sql`;
      break;

    case 'column':
      const [colTable, colName, colType] = args;
      if (!colTable || !colName || !colType) {
        console.error('❌ Usage: column <table> <column> <type>');
        process.exit(1);
      }
      sql = generateMigrationHeader(`Add ${colName} to ${colTable}`) + generateColumnSQL(colTable, colName, colType);
      filename = `${timestamp()}_add_${colName}_to_${colTable}.sql`;
      break;

    case 'function':
      const [funcName, ...funcParams] = args;
      if (!funcName) {
        console.error('❌ Function name required');
        process.exit(1);
      }
      sql = generateMigrationHeader(`Create ${funcName} function`) + generateFunctionSQL(funcName, funcParams);
      filename = `${timestamp()}_create_${funcName}_function.sql`;
      break;

    case 'trigger':
      const [trigTable, trigEvent] = args;
      if (!trigTable || !trigEvent) {
        console.error('❌ Usage: trigger <table> <INSERT|UPDATE|DELETE>');
        process.exit(1);
      }
      sql = generateMigrationHeader(`Add ${trigEvent} trigger to ${trigTable}`) + generateTriggerSQL(trigTable, trigEvent);
      filename = `${timestamp()}_${trigTable}_${trigEvent.toLowerCase()}_trigger.sql`;
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }

  // Save file
  const filepath = path.join('supabase', 'migrations', filename);
  await fs.writeFile(filepath, sql);

  console.log('\n✅ SQL Generated!\n');
  console.log(`File: ${filepath}`);
  console.log('\nPreview:');
  console.log('─'.repeat(60));
  console.log(sql.split('\n').slice(0, 15).join('\n'));
  console.log('─'.repeat(60));
  console.log('\nTo execute:');
  console.log(`  node scripts/ai-sql-runner.js ${filepath}`);
};

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
