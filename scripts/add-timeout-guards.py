#!/usr/bin/env python3
"""
Systematisk timeout-guard for API-endepunkter
Legger til AbortController (5s timeout) i alle API-ruter som bruker fetch()

Usage: python3 scripts/add-timeout-guards.py [--dry-run]
"""
import os, re, sys

API_DIR = 'src/app/api'
dry_run = '--dry-run' in sys.argv

def has_timeout(content):
    return bool(re.search(r'AbortController|AbortSignal|signal:', content))

def has_fetch(content):
    return bool(re.search(r'fetch\(', content))

def add_timeout(content):
    """Add AbortController timeout before first fetch() call"""
    lines = content.split('\n')
    
    # Find the function/export that contains fetch
    # Look for patterns: export async function GET/POST, or const handler
    has_export = False
    fetch_line = None
    
    for i, line in enumerate(lines):
        if re.search(r'export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)', line):
            has_export = True
        if 'fetch(' in line and fetch_line is None:
            fetch_line = i
    
    if fetch_line is None:
        return content
    
    # Find a good insertion point: just before the export function or after imports
    insert_at = None
    for i, line in enumerate(lines):
        if re.search(r'export\s+(async\s+)?function\s+(GET|POST)', line):
            insert_at = i
            break
    
    if insert_at is None:
        return content
    
    # Check if timeout is already there
    if has_timeout(content):
        return content
    
    timeout_block = [
        '  const controller = new AbortController();',
        '  const timeoutId = setTimeout(() => controller.abort(), 5000);',
        '',
    ]
    
    # Add cleanup after fetch
    cleanup_block = [
        '  clearTimeout(timeoutId);',
    ]
    
    result = []
    added_timeout = False
    for i, line in enumerate(lines):
        result.append(line)
        if i == insert_at and not added_timeout:
            # Add timeout vars after the function signature
            # Find the opening brace
            pass
    
    # Simpler approach: find the function body opening brace
    for i, line in enumerate(lines):
        if re.search(r'export\s+(async\s+)?function\s+(GET|POST)\s*\(', line):
            # Find the matching opening brace on the next line
            for j in range(i, min(i+5, len(lines))):
                if '{' in lines[j]:
                    indent = '  '
                    # Insert timeout vars
                    lines.insert(j+1, f'{indent}const controller = new AbortController();')
                    lines.insert(j+2, f'{indent}const timeoutId = setTimeout(() => controller.abort(), 5000);')
                    # Add signal to all fetch() calls
                    for k in range(j+3, len(lines)):
                        if 'fetch(' in lines[k] and 'signal:' not in lines[k]:
                            lines[k] = lines[k].replace('fetch(', 'fetch(', 1).rstrip()
                            if not lines[k].endswith(','):
                                lines[k] = lines[k][:-1] + ','
                            lines[k] += ' { signal: controller.signal }'
                    break
            break
    
    # Add cleanup after each fetch
    result = []
    for i, line in enumerate(lines):
        result.append(line)
        # Add clearTimeout right after each fetch() call
        if re.search(r'const\s+\w+\s*=\s*await\s+fetch\(', line):
            result.append('  clearTimeout(timeoutId);')
    
    return '\n'.join(result)

def main():
    modified = 0
    skipped = 0
    
    for root, dirs, files in os.walk(API_DIR):
        for f in files:
            if f != 'route.ts':
                continue
            fpath = os.path.join(root, f)
            with open(fpath) as fh:
                content = fh.read()
            
            if not has_fetch(content):
                continue
            if has_timeout(content):
                skipped += 1
                continue
            
            new_content = add_timeout(content)
            if new_content != content:
                if not dry_run:
                    with open(fpath, 'w') as fh:
                        fh.write(new_content)
                modified += 1
                print(f"{'📝' if dry_run else '✏️'} {fpath}")
    
    print(f"\n📊  {'Dry-run' if dry_run else 'Result'}: {modified} modifisert, {skipped} hadde allerede timeout")

if __name__ == '__main__':
    main()
