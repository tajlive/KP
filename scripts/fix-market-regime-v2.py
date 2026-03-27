#!/usr/bin/env python3
"""Fix MarketDataBuilder - må være PromiseLike for å støtte await uten .single()."""

path = '/Users/taj/klarpakke/src/lib/auto-trading/market-regime.ts'

with open(path) as f:
    content = f.read()

# Erstatting: oppdater interface med PromiseLike
old_iface = '''// market_data er ikke i generated types \u2014 bruk flat interface uten Database-generics
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

new_iface = '''// market_data er ikke i generated types \u2014 flat interface uten Database-generics
// Extends PromiseLike slik at await fungerer b\u00e5de med og uten .single()
type MarketDataRow = Record<string, unknown>;
interface MarketDataBuilder
  extends PromiseLike<{  MarketDataRow[] | null; error: { message: string } | null }> {
  select(cols: string): MarketDataBuilder;
  eq(col: string, val: unknown): MarketDataBuilder;
  order(col: string, opts?: { ascending?: boolean }): MarketDataBuilder;
  limit(n: number): MarketDataBuilder;
  single(): Promise<{  MarketDataRow | null; error: { message: string } | null }>;
}
interface UnTypedSupabaseClient {
  from(table: string): MarketDataBuilder;
}'''

if old_iface in content:
    content = content.replace(old_iface, new_iface)
    print('FIXED: MarketDataBuilder -> PromiseLike')
else:
    print('WARN: Pr\u00f8ver delvis erstatning')
    # Erstatt bare interface MarketDataBuilder {...}
    import re
    content = re.sub(
        r'interface MarketDataBuilder \{[^}]+\}',
        '''type MarketDataRow = Record<string, unknown>;
interface MarketDataBuilder
  extends PromiseLike<{  MarketDataRow[] | null; error: { message: string } | null }> {
  select(cols: string): MarketDataBuilder;
  eq(col: string, val: unknown): MarketDataBuilder;
  order(col: string, opts?: { ascending?: boolean }): MarketDataBuilder;
  limit(n: number): MarketDataBuilder;
  single(): Promise<{  MarketDataRow | null; error: { message: string } | null }>;
}''',
        content
    )
    print('FIXED: delvis regex-erstatning')

with open(path, 'w') as f:
    f.write(content)

print(f'DONE: {path}')
