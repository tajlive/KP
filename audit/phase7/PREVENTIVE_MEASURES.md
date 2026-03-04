# Preventive Measures - FASE 7

## 1. Schema Migrations i CI/CD

### .github/workflows/schema-validation.yml
```yaml
name: Schema Validation

on:
  push:
    paths:
      - 'supabase/migrations/**'
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Validate Migrations
        run: |
          supabase db diff --schema public > /tmp/schema-diff.sql
          if [ -s /tmp/schema-diff.sql ]; then
            echo "❌ Uncommitted schema changes detected!"
            cat /tmp/schema-diff.sql
            exit 1
          fi
          echo "✅ Schema is up to date"
```

## 2. Pre-commit Hooks

### .husky/pre-commit
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Type check
npm run type-check || exit 1

# Lint
npm run lint || exit 1

# Test database schema consistency
node scripts/validate-schema.js || exit 1

# Run unit tests
npm run test:unit || exit 1

echo "✅ All checks passed!"
```

### scripts/validate-schema.js
```javascript
/**
 * Validerer at TypeScript typer matcher database schema
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function validateSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Hent alle tabell definisjoner
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (error) {
    console.error('❌ Failed to fetch schema:', error);
    process.exit(1);
  }
  
  const tradingTables = tables
    .filter(t => t.table_name.includes('trading') || t.table_name.includes('session'))
    .map(t => t.table_name);
  
  console.log('📊 Trading-related tables found:', tradingTables);
  
  // Sjekk for duplikate tabeller
  const duplicates = findDuplicateTables(tradingTables);
  if (duplicates.length > 0) {
    console.error('❌ Duplicate table patterns found:', duplicates);
    process.exit(1);
  }
  
  console.log('✅ Schema validation passed');
}

function findDuplicateTables(tables) {
  const patterns = ['trading_sessions', 'auto_trading_sessions', 'paper_accounts'];
  const found = patterns.filter(p => tables.includes(p));
  if (found.length > 1) {
    return ['Multiple session table patterns: ' + found.join(', ')];
  }
  return [];
}

validateSchema();
```

## 3. Monitoring Dashboard

### src/app/api/monitoring/metrics/route.ts
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  // Samle metrics
  const metrics = await Promise.all([
    // Aktive sessions
    supabase.from('trading_sessions').select('*', { count: 'exact' }).eq('status', 'active'),
    supabase.from('auto_trading_sessions').select('*', { count: 'exact' }).eq('status', 'active'),
    
    // Trades siste time
    supabase.from('trades').select('*', { count: 'exact' }).gte('executed_at', new Date(Date.now() - 3600000).toISOString()),
    supabase.from('auto_trading_trades').select('*', { count: 'exact' }).gte('opened_at', new Date(Date.now() - 3600000).toISOString()),
    
    // Failed trades
    supabase.from('trades').select('*', { count: 'exact' }).eq('status', 'failed'),
  ]);
  
  return NextResponse.json({
    sessions: {
      trading_sessions: metrics[0].count || 0,
      auto_trading_sessions: metrics[1].count || 0,
    },
    trades: {
      last_hour: {
        trades: metrics[2].count || 0,
        auto_trading_trades: metrics[3].count || 0,
      },
      failed: metrics[4].count || 0,
    },
    timestamp: new Date().toISOString(),
  });
}
```

## 4. Database Schema Best Practices

### Regler for fremtidige endringer:

1. **ALDRIG** opprett duplikate tabeller for samme konsept
2. **ALLTID** bruk konsistente navnekonvensjoner
3. **ALLTID** dokumenter breaking changes
4. **ALLTID** inkluder migrering scripts i PR

### Naming Convention:

| Entity | Singular | Plural |
|--------|----------|--------|
| Session | `trading_session` | `trading_sessions` |
| Trade | `trade` | `trades` |
| Config | `user_config` | `user_configs` |

## 5. Testing Requirements

### Påkrevde tester for alle nye features:

```typescript
// 1. Unit test
// 2. Integration test
// 3. E2E test

describe('Feature: X', () => {
  describe('Unit', () => { /* ... */ });
  describe('Integration', () => { /* ... */ });
  describe('E2E', () => { /* ... */ });
});
```

## 6. Code Review Checklist

- [ ] Ingen nye duplikate tabeller
- [ ] Alle DB operasjoner har error handling
- [ ] Sentry logging på alle catch blocks
- [ ] TypeScript typer matcher database
- [ ] E2E test inkludert
- [ ] Migration script inkludert
- [ ] Dokumentasjon oppdatert
