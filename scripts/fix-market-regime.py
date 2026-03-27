#!/usr/bin/env python3
"""Fix SupabaseLike type in market-regime.ts — resolves to 'never' because
ReturnType<ReturnType<typeof createClient>['from']> kollapser når tabellen
ikke er i Database-typene."""

path = '/Users/taj/klarpakke/src/lib/auto-trading/market-regime.ts'

with open(path) as f:
    content = f.read()

old_type = '''import { createClient } from "@/lib/utils";

// Cast for supabase.from('market_data') when table is not in generated types
type SupabaseLike = {
  from: (table: string) => ReturnType<ReturnType<typeof createClient>["from"]>;
};'''

new_type = '''import { createClient } from "@/lib/utils";

// market_data er ikke i generated types — bruk flat interface uten Database-generics
interface MarketDataBuilder {
  select(cols: string): MarketDataBuilder;
  eq(col: string, val: unknown): MarketDataBuilder;
  order(col: string, opts?: { ascending?: boolean }): MarketDataBuilder;
  limit(n: number): MarketDataBuilder;
  single(): Promise<{  Record<string, unknown> | null; error: { message: string } | null }>;
}
interface UnTypedSupabaseClient {
  from(table: string): MarketDataBuilder;
}'''

if old_type in content:
    content = content.replace(old_type, new_type)
    print('FIXED: SupabaseLike -> UnTypedSupabaseClient (flat interface)')
else:
    # Fallback: bare oppdater type-definisjonen uansett
    print('WARN: exact match ikke funnet, prøver linje-for-linje')
    lines = content.split('\n')
    new_lines = []
    skip = False
    for line in lines:
        if '// Cast for supabase.from' in line or 'type SupabaseLike' in line:
            skip = True
        if skip and '};' in line:
            new_lines.append('// market_data er ikke i generated types — bruk flat interface')
            new_lines.append('interface MarketDataBuilder {')
            new_lines.append('  select(cols: string): MarketDataBuilder;')
            new_lines.append('  eq(col: string, val: unknown): MarketDataBuilder;')
            new_lines.append('  order(col: string, opts?: { ascending?: boolean }): MarketDataBuilder;')
            new_lines.append('  limit(n: number): MarketDataBuilder;')
            new_lines.append('  single(): Promise<{  Record<string, unknown> | null; error: { message: string } | null }>;')
            new_lines.append('}')
            new_lines.append('interface UnTypedSupabaseClient {')
            new_lines.append('  from(table: string): MarketDataBuilder;')
            new_lines.append('}')
            skip = False
            continue
        if not skip:
            new_lines.append(line)
    content = '\n'.join(new_lines)
    print('FIXED: via linje-for-linje erstatning')

# Erstatt alle (supabase as SupabaseLike) med (supabase as unknown as UnTypedSupabaseClient)
content = content.replace(
    '(supabase as SupabaseLike)',
    '(supabase as unknown as UnTypedSupabaseClient)'
)
print('FIXED: cast oppdatert -> unknown as UnTypedSupabaseClient')

with open(path, 'w') as f:
    f.write(content)

print(f'DONE: {path}')
