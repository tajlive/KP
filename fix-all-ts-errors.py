#!/usr/bin/env python3
"""
Fix all TypeScript errors in the Klarpakke project
"""

import re
import os

def fix_client_admin_dashboard():
    """Fix TypeScript errors in ClientAdminDashboard.tsx"""
    filepath = "/Users/taj/klarpakke/src/app/[locale]/admin/ClientAdminDashboard.tsx"
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix: Add 'as const' to type properties in newActivity objects
    content = re.sub(
        r'type: "(user|trade|system)"(?!\s+as\s+const)',
        r'type: "\1" as const',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Fixed {filepath}")

def fix_hero_types():
    """Fix TypeScript errors in Hero.tsx - framer-motion types"""
    filepath = "/Users/taj/klarpakke/src/components/landing/Hero.tsx"
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix: Add 'as const' to type: "spring" in variants
    content = re.sub(
        r'type: "spring"(?!\s+as\s+const)',
        'type: "spring" as const',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Fixed {filepath}")

def fix_page_types():
    """Fix Next.js page component types - params as Promise"""
    pages = [
        ("src/app/[locale]/auto-trading-ai/page.tsx", "params.locale"),
        ("src/app/[locale]/auto-trading/page.tsx", "params.locale"),
        ("src/app/[locale]/dashboard/page.tsx", "params.locale"),
        ("src/app/[locale]/leaderboard/page.tsx", "params.locale"),
        ("src/app/[locale]/live-trading/page.tsx", "params.locale"),
        ("src/app/[locale]/login/page.tsx", "params.locale"),
        ("src/app/[locale]/settings/page.tsx", "params.locale"),
        ("src/app/[locale]/signals/page.tsx", "params.locale"),
    ]
    
    for page_path, access_pattern in pages:
        full_path = f"/Users/taj/klarpakke/{page_path}"
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, 'r') as f:
            content = f.read()
        
        # Check if params is already typed as Promise
        if 'params: Promise' not in content and 'params:' in content:
            # Replace params: { locale: string } with params: Promise<{ locale: string }>
            content = re.sub(
                r'params:\s*\{\s*locale:\s*string\s*\}',
                'params: Promise<{ locale: string }>',
                content
            )
            
            # Make function async if not already
            if 'export default async function' not in content and 'export default function' in content:
                content = content.replace(
                    'export default function',
                    'export default async function'
                )
        
        # Fix direct params.locale access - need to await params first
        if 'params: Promise<{ locale: string }>' in content:
            # Find where params.locale is used and replace with awaited locale
            # First check if we already have const { locale } = await params
            if 'const { locale } = await params' not in content and 'const { locale } = params' not in content:
                # Add the destructuring after the function signature
                # Find the function body start
                pattern = r'(export default async function \w+\([^)]+\)\s*\{)'
                match = re.search(pattern, content)
                if match:
                    func_start = match.end()
                    # Insert const { locale } = await params; after opening brace
                    content = content[:func_start] + '\n  const { locale } = await params;' + content[func_start:]
            
            # Now replace params.locale with locale
            content = re.sub(r'params\.locale(?!\s*=)', 'locale', content)
        
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"✅ Fixed {page_path}")

def main():
    print("🔧 Fixing TypeScript errors...\n")
    
    fix_client_admin_dashboard()
    fix_hero_types()
    fix_page_types()
    
    print("\n✅ All TypeScript fixes applied!")
    print("\n📊 Running final type check...")
    os.chdir("/Users/taj/klarpakke")
    os.system("npm run type-check 2>&1 | head -80")

if __name__ == "__main__":
    main()
