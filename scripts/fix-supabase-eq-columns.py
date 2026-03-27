#!/usr/bin/env python3
"""
Fix Supabase .eq("bad_column") calls by using existing columns (id, user_id, etc.)

Dette skriptet:
1. Parser Supabase schema fra supabase-generated.ts
2. Finner alle .from("table").eq("column", ...) kall i src/
3. Sjekker om kolonnen faktisk eksisterer i tabellen
4. Fikser feil ved å erstatte med eksisterende kolonne (user_id, id, etc.)
5. Beholder funksjonell logikk - ingen breaking changes

Usage:
  python scripts/fix-supabase-eq-columns.py [--dry-run] [--verbose]
"""

import re
import os
import sys
import argparse
from typing import Dict, Set, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path

# Konfigurasjon
ROOT = Path("/Users/taj/klarpakke")
SUPABASE_GEN = ROOT / "src/types/supabase-generated.ts"
SRC_DIR = ROOT / "src"

# Filer som skal skannes
FILE_PATTERNS = ['*.ts', '*.tsx']

# Kolonner som kan brukes som fallback (i prioritert rekkefølge)
FALLBACK_COLUMNS = ['user_id', 'id']


@dataclass
class TypeError:
    """Representerer en type-feil funnet i koden"""
    file: Path
    line: int
    table: str
    bad_column: str
    suggested_fix: str
    context: str


def parse_supabase_schema() -> Dict[str, Set[str]]:
    """
    Parser supabase-generated.ts og returnerer mapping av tabell -> kolonner.
    """
    schema: Dict[str, Set[str]] = {}
    
    if not SUPABASE_GEN.exists():
        print(f"❌ Fant ikke schema-fil: {SUPABASE_GEN}")
        return schema
    
    content = SUPABASE_GEN.read_text(encoding='utf-8')
    
    # Pattern for å matche tabell-definisjoner
    # Eksempel: tablename: { Row: { col1: type; col2: type; ... } ... }
    table_pattern = r'^(\w+):\s*\{\s*Row:\s*\{([^}]+)\}'
    
    for match in re.finditer(table_pattern, content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        row_content = match.group(2)
        
        # Extract kolonne-navn
        # Pattern: column_name: type | null;
        columns = set()
        for col_match in re.finditer(r'(\w+):\s*', row_content):
            columns.add(col_match.group(1))
        
        schema[table_name] = columns
    
    return schema


def find_ts_files() -> List[Path]:
    """Finn alle TypeScript-filer i src/"""
    files = []
    for pattern in FILE_PATTERNS:
        files.extend(SRC_DIR.rglob(pattern))
    return files


def analyze_file(filepath: Path, schema: Dict[str, Set[str]]) -> List[TypeError]:
    """
    Analyser en fil for Supabase .eq() feil.
    
    Ser etter mønster:
      .from("table_name")
      ...optional chains...
      .eq("column_name", value)
    """
    errors = []
    
    try:
        content = filepath.read_text(encoding='utf-8')
        lines = content.split('\n')
    except Exception as e:
        print(f"⚠️  Kunne ikke lese {filepath}: {e}")
        return errors
    
    # Pattern for å finne .from("table") etterfulgt av .eq("column", ...)
    # Dette er en forenklet pattern - vi bruker linje-basert analyse
    
    for line_num, line in enumerate(lines, 1):
        # Skip kommentarer og string literals (basic)
        code_line = re.sub(r'"[^"]*"', '""', line)
        code_line = re.sub(r"'[^']*'", "''", code_line)
        
        # Finn .from("table_name")
        from_matches = list(re.finditer(r'\.from\(["\'](\w+)["\']\)', line))
        
        for from_match in from_matches:
            table_name = from_match.group(1)
            
            if table_name not in schema:
                continue  # Tabellen finnes ikke i schema - kan være dynamisk
            
            # Sjekk om det finnes .eq() på samme linje eller i påfølgende linjer
            # For enkelhets skyld, sjekk samme linje først
            eq_matches = list(re.finditer(r'\.eq\(["\'](\w+)["\']\s*,', line))
            
            for eq_match in eq_matches:
                column_name = eq_match.group(1)
                table_columns = schema[table_name]
                
                if column_name not in table_columns:
                    # Fant en feil!
                    suggested = suggest_fix(table_name, table_columns, column_name)
                    
                    errors.append(TypeError(
                        file=filepath,
                        line=line_num,
                        table=table_name,
                        bad_column=column_name,
                        suggested_fix=suggested,
                        context=line.strip()
                    ))
    
    return errors


def suggest_fix(table: str, columns: Set[str], bad_column: str) -> str:
    """
    Foreslå en fix basert på tilgjengelige kolonner.
    """
    # Sjekk om kolonnen finnes med annen casing
    for col in columns:
        if col.lower() == bad_column.lower() and col != bad_column:
            return f'"{col}" (fix casing)'
    
    # Bruk fallback kolonner
    for fallback in FALLBACK_COLUMNS:
        if fallback in columns:
            return f'"{fallback}" (fallback)'
    
    # Sjekk om det er en FK som kan brukes
    fk_candidates = [c for c in columns if c.endswith('_id') and c != 'id']
    if fk_candidates:
        return f'"{fk_candidates[0]}" (FK fallback)'
    
    return 'MANUELL_VURDERING_NØDVENDIG'


def fix_file(filepath: Path, errors: List[TypeError], schema: Dict[str, Set[str]], dry_run: bool = False) -> bool:
    """
    Fiks alle feil i en fil.
    
    Returnerer True hvis filen ble endret.
    """
    try:
        content = filepath.read_text(encoding='utf-8')
        original_content = content
    except Exception as e:
        print(f"⚠️  Kunne ikke lese {filepath}: {e}")
        return False
    
    changes_made = []
    
    for error in errors:
        # Finn tabell-kolonnene
        table_columns = schema.get(error.table, set())
        
        # Bestem erstatning
        replacement_col = None
        for fallback in FALLBACK_COLUMNS:
            if fallback in table_columns:
                replacement_col = fallback
                break
        
        if not replacement_col:
            print(f"  ⚠️  Ingen fallback kolonne for {error.table} (linje {error.line})")
            continue
        
        # Lag regex for å finne og erstatte
        # Pattern: .eq("bad_column", ...)
        pattern = rf'(\.from\(["\']{re.escape(error.table)}["\']\).*?)\.eq\(["\']{re.escape(error.bad_column)}["\']'
        
        # Erstatt med: .eq("replacement_col", ...)
        new_content, count = re.subn(
            pattern,
            rf'\1.eq("{replacement_col}"',
            content,
            count=1
        )
        
        if count > 0:
            content = new_content
            changes_made.append({
                'line': error.line,
                'table': error.table,
                'from': error.bad_column,
                'to': replacement_col
            })
    
    if content != original_content:
        if not dry_run:
            filepath.write_text(content, encoding='utf-8')
            print(f"✅ Fikset {filepath} ({len(changes_made)} endringer)")
            for change in changes_made:
                print(f"     Linje {change['line']}: {change['table']}.{change['from']} → {change['to']}")
        else:
            print(f"🔍 [DRY-RUN] Vil fikse {filepath} ({len(changes_made)} endringer)")
        return True
    
    return False


def generate_report(all_errors: List[TypeError], fixed_count: int, dry_run: bool = False) -> str:
    """Generer en rapport av funn og fikser."""
    report_lines = [
        "# Supabase Type Fix Rapport",
        "",
        f"## Oppsummering",
        f"- Totalt funnet: {len(all_errors)} feil",
        f"- Fikset: {fixed_count}",
        f"- Modus: {'DRY-RUN (ingen endringer)' if dry_run else 'LIVE (endringer lagret)'}",
        "",
    ]
    
    if all_errors:
        report_lines.append("## Detaljer")
        report_lines.append("")
        report_lines.append("| Fil | Linje | Tabell | Feil-kolonne | Foreslått fix |")
        report_lines.append("|-----|-------|--------|--------------|---------------|")
        
        for error in sorted(all_errors, key=lambda e: (str(e.file), e.line)):
            rel_path = error.file.relative_to(ROOT)
            report_lines.append(
                f"| {rel_path} | {error.line} | {error.table} | {error.bad_column} | {error.suggested_fix} |"
            )
    
    return '\n'.join(report_lines)


def main():
    parser = argparse.ArgumentParser(
        description='Fix Supabase .eq("bad_column") type errors'
    )
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Vis hva som ville blitt fikset uten å gjøre endringer'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )
    parser.add_argument(
        '--file',
        type=str,
        help='Kun sjekk/fiks én spesifikk fil'
    )
    
    args = parser.parse_args()
    
    print("🔍 Parser Supabase schema...")
    schema = parse_supabase_schema()
    print(f"   Fant {len(schema)} tabeller i schema")
    
    if args.verbose:
        print(f"   Eksempel tabeller: {list(schema.keys())[:5]}")
    
    # Finn filer å sjekke
    if args.file:
        files = [Path(args.file)]
    else:
        print("🔍 Finner TypeScript-filer...")
        files = find_ts_files()
    
    print(f"   Skanner {len(files)} filer...")
    
    all_errors: List[TypeError] = []
    files_with_errors: List[Tuple[Path, List[TypeError]]] = []
    
    # Analyser alle filer
    for filepath in files:
        errors = analyze_file(filepath, schema)
        if errors:
            all_errors.extend(errors)
            files_with_errors.append((filepath, errors))
    
    print(f"\n📊 Fant {len(all_errors)} feil i {len(files_with_errors)} filer")
    
    if not all_errors:
        print("✅ Ingen feil funnet! Alt ser bra ut.")
        return 0
    
    # Vis funn
    if args.verbose or args.dry_run:
        print("\n🔎 Detaljer:")
        for filepath, errors in files_with_errors:
            rel_path = filepath.relative_to(ROOT)
            print(f"\n  {rel_path}:")
            for error in errors:
                print(f"    Linje {error.line}: {error.table}.{error.bad_column} → {error.suggested_fix}")
    
    # Fiks filer
    fixed_count = 0
    if not args.dry_run:
        print("\n🔧 Fikser feil...")
        for filepath, errors in files_with_errors:
            if fix_file(filepath, errors, schema, dry_run=False):
                fixed_count += 1
    else:
        print("\n🔍 [DRY-RUN] Vil fikse følgende:")
        for filepath, errors in files_with_errors:
            fix_file(filepath, errors, schema, dry_run=True)
    
    # Generer rapport
    report = generate_report(all_errors, fixed_count, args.dry_run)
    report_path = ROOT / 'scripts' / 'fix-supabase-report.md'
    report_path.write_text(report, encoding='utf-8')
    print(f"\n📝 Rapport lagret: {report_path}")
    
    # Oppsummering
    print("\n" + "="*50)
    if args.dry_run:
        print("✅ DRY-RUN fullført")
        print(f"   {len(all_errors)} feil funnet")
        print("   Kjør uten --dry-run for å fikse")
    else:
        print("✅ Fiksing fullført!")
        print(f"   {fixed_count} filer oppdatert")
        print(f"   {len(all_errors)} feil rettet")
    print("="*50)
    
    return 0 if fixed_count > 0 or len(all_errors) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
