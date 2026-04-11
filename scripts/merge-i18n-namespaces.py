#!/usr/bin/env python3
"""
i18n Namespace Consolidation Script - Final Version
Merges all namespace files into ~15 consolidated namespaces
"""

import json
import os
import shutil
from pathlib import Path
from collections import defaultdict

# Base directories
MESSAGES_DIR = Path("/Users/taj/klarpakke/messages")
LOCALES = ["no", "en", "th", "zh"]

# Define the FINAL merge mapping: target_namespace -> [source_files]
# This now includes ALL files found in the locales
MERGE_MAP = {
    # 1. common (base + navigation + footer + metadata + meta + toasts + threeSteps)
    "common": [
        "base.json",
        "navigation.json",
        "footer.json",
        "metadata.json",
        "meta.json",
        "toasts.json",
        "threeSteps.json",
    ],
    # 2. auth (already consolidated)
    "auth": [
        "auth.json",
    ],
    # 3. dashboard (already consolidated)
    "dashboard": [
        "dashboard.json",
    ],
    # 4. trading (ALL trading-related files)
    "trading": [
        "trading.json",
        "tradeHistory.json",
        "orderHistory.json",
        "tradingResults.json",
        "liveTrading.json",
        "paperTrading.json",
        "copyTrading.json",
        "tradingGuide.json",
    ],
    # 5. account (settings + wallet + account)
    "account": [
        "settings.json",
        "wallet.json",
        "account.json",
    ],
    # 6. marketplace (ALL auto-trading related)
    "marketplace": [
        "autoTradingPage.json",
        "autoTrade.json",
        "autoTrading.json",
    ],
    # 7. notifications (already consolidated)
    "notifications": [
        "notifications.json",
    ],
    # 8. onboarding (onboarding + beta + threeSteps moved to common)
    "onboarding": [
        "onboarding.json",
        "beta.json",
    ],
    # 9. landing (landing + pricing + calculator + hero + contact)
    "landing": [
        "landing.json",
        "pricing.json",
        "calculator.json",
        "hero.json",
        "contact.json",
    ],
    # 10. errors (empty - create minimal)
    "errors": [],
    # 11. admin (adminDashboard + admin)
    "admin": [
        "adminDashboard.json",
        "admin.json",
    ],
    # 12. components (gamification + components)
    "components": [
        "gamification.json",
        "components.json",
    ],
    # 13. simulator (already consolidated)
    "simulator": [
        "simulator.json",
    ],
    # 14. education (ALL education-related)
    "education": [
        "courses.json",
        "quizPage.json",
        "binanceGuide.json",
        "learning.json",
        "coursePreview.json",
        "studieprogram.json",
        "interestTest.json",
        "tradingGuide.json",  # Also education-related
    ],
    # 15. checkout (checkout + payment + pricingSuccess + pricingCancel)
    "checkout": [
        "checkout.json",
        "payment.json",
        "pricingSuccess.json",
        "pricingCancel.json",
    ],
    # Additional namespaces for remaining files
    "about": [
        "about.json",
        "aboutUs.json",
    ],
    "competition": [
        "competition.json",
        "leagues.json",
    ],
    "help": [
        "helpPage.json",
        "help.json",
    ],
    "legal": [
        "legal.json",
    ],
    "tax": [
        "taxReport.json",
        "tax.json",
    ],
}


def load_json_file(filepath):
    """Load a JSON file, return empty dict if not found"""
    if not filepath.exists():
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"  Warning: Could not parse {filepath}: {e}")
        return None


def merge_namespace_files(locale_dir, source_files, target_ns):
    """Merge multiple source files into a target namespace"""
    merged = {}
    sources_used = []
    conflicts = []
    
    for src_file in source_files:
        src_path = locale_dir / src_file
        data = load_json_file(src_path)
        
        if data is None:
            continue
        
        sources_used.append(src_file)
        src_name = src_path.stem
        
        # Check for key conflicts at top level
        for key, value in data.items():
            if key in merged:
                # Key exists - nest under source name
                if src_name not in merged:
                    merged[src_name] = {}
                merged[src_name][key] = value
                conflicts.append(f"{key} -> {src_name}.{key}")
            else:
                merged[key] = value
    
    return merged, sources_used, conflicts


def consolidate_locale(locale):
    """Consolidate all namespaces for a given locale"""
    locale_dir = MESSAGES_DIR / locale
    if not locale_dir.exists():
        print(f"Locale directory not found: {locale_dir}")
        return {}
    
    print(f"\n{'='*60}")
    print(f"Processing locale: {locale}")
    print(f"{'='*60}")
    
    results = {}
    
    # Create backup directory
    backup_dir = MESSAGES_DIR / f"backup_{locale}"
    backup_dir.mkdir(exist_ok=True)
    
    for target_ns, source_files in MERGE_MAP.items():
        if not source_files:
            # Create empty errors.json
            if target_ns == "errors":
                target_path = locale_dir / f"{target_ns}.json"
                with open(target_path, 'w', encoding='utf-8') as f:
                    json.dump({}, f, ensure_ascii=False, indent=2)
                print(f"  {target_ns}: Created empty")
                results[target_ns] = {'sources': [], 'keys': 0, 'conflicts': []}
            continue
        
        merged_data, sources_used, conflicts = merge_namespace_files(locale_dir, source_files, target_ns)
        
        if not sources_used:
            print(f"  {target_ns}: No source files found")
            continue
        
        # Write the merged file
        target_path = locale_dir / f"{target_ns}.json"
        
        # Backup existing target if it exists
        if target_path.exists():
            shutil.copy2(target_path, backup_dir / f"{target_ns}.json.bak")
        
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, ensure_ascii=False, indent=2)
        
        conflict_str = f", {len(conflicts)} conflicts" if conflicts else ""
        print(f"  {target_ns}: Merged {len(sources_used)} files -> {len(merged_data)} keys{conflict_str}")
        
        results[target_ns] = {
            'sources': sources_used,
            'keys': len(merged_data),
            'conflicts': conflicts
        }
    
    return results


def generate_i18n_ts():
    """Generate the new i18n.ts content with consolidated namespaces"""
    
    namespaces = list(MERGE_MAP.keys())
    
    var_decls = ",\n      ".join(namespaces)
    
    imports = []
    for ns in namespaces:
        imports.append(f"      import(`../messages/${{validLocale}}/{ns}.json`)")
        imports.append(f"        .then((m) => m.default)")
        imports.append(f"        .catch(() => import(\"../messages/en/{ns}.json\").then((m) => m.default)),")
    
    messages_obj = ",\n        ".join(namespaces)
    
    return f"""import {{ getRequestConfig }} from "next-intl/server";
import {{ Locale, defaultLocale, locales }} from "./i18n/config";

export default getRequestConfig(async ({{ requestLocale }}) => {{
  let validLocale: Locale = defaultLocale;
  try {{
    const locale = await requestLocale;
    validLocale = locales.includes(locale as Locale)
      ? (locale as Locale)
      : defaultLocale;
  }} catch {{
    // requestLocale can throw in edge/static contexts; keep defaultLocale
  }}

  try {{
    // Load all consolidated namespaces for the locale
    const [
      {var_decls}
    ] = await Promise.all([
{"\n".join(imports)}
    ]);

    return {{
      locale: validLocale,
      messages: {{
        {messages_obj}
      }},
      // Error handling - don't crash on missing messages
      onError(error) {{
        if (error.code === "INSUFFICIENT_PATH") {{
          // Suppress — happens during SSG for pages rendered without full request context
          return;
        }}
        console.error("[i18n ERROR]", error.code, error.message || error);
      }},
      getMessageFallback({{ namespace, key }}) {{
        // Return visible fallback so missing keys are obvious in UI
        return `[MISSING: ${{namespace ? namespace + "." : ""}}${{key}}]`;
      }},
    }};
  }} catch (err) {{
    // Fallback so production never crashes with "Locale Error" (digest)
    const common = await import("../messages/no/common.json")
      .then((m) => m.default)
      .catch(() => ({{}}));
    return {{
      locale: defaultLocale,
      messages: {{ common }},
      onError() {{}},
      getMessageFallback({{ namespace, key }}) {{
        return `[${{namespace ? namespace + "." : ""}}${{key}}]`;
      }},
    }};
  }}
}});
"""


def list_files_to_delete():
    """List all source files that will be deleted after merge"""
    all_sources = set()
    for sources in MERGE_MAP.values():
        all_sources.update(sources)
    return all_sources


def cleanup_old_files(locale, dry_run=True):
    """Delete old files that have been merged"""
    locale_dir = MESSAGES_DIR / locale
    files_to_delete = list_files_to_delete()
    
    print(f"\n{'='*60}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Cleaning up old files for: {locale}")
    print(f"{'='*60}")
    
    deleted = []
    for filename in files_to_delete:
        filepath = locale_dir / filename
        if filepath.exists():
            # Check if this file is now in a merged namespace
            should_delete = False
            for target_ns, sources in MERGE_MAP.items():
                if filename in sources:
                    target_file = locale_dir / f"{target_ns}.json"
                    if target_file.exists():
                        should_delete = True
                        break
            
            if should_delete:
                if not dry_run:
                    try:
                        filepath.unlink()
                        print(f"  Deleted: {filename}")
                    except Exception as e:
                        print(f"  Error deleting {filename}: {e}")
                        continue
                else:
                    print(f"  Would delete: {filename}")
                deleted.append(filename)
    
    print(f"  Total {'would be ' if dry_run else ''}deleted: {len(deleted)} files")
    return deleted


def main():
    print("="*60)
    print("i18n Namespace Consolidation - FINAL")
    print("="*60)
    print(f"\nTarget: {len(MERGE_MAP)} consolidated namespaces")
    print(f"Locales: {', '.join(LOCALES)}")
    
    # Count expected source files
    all_sources = list_files_to_delete()
    print(f"\nFiles to merge: {len(all_sources)}")
    
    # Process each locale
    all_results = {}
    for locale in LOCALES:
        results = consolidate_locale(locale)
        all_results[locale] = results
    
    # Generate new i18n.ts
    print(f"\n{'='*60}")
    print("Generating new i18n.ts")
    print(f"{'='*60}")
    new_i18n_content = generate_i18n_ts()
    i18n_path = Path("/Users/taj/klarpakke/src/i18n.ts")
    
    # Backup old i18n.ts
    backup_path = Path(str(i18n_path) + ".final.backup")
    shutil.copy2(i18n_path, backup_path)
    print(f"  Backup created: {backup_path}")
    
    with open(i18n_path, 'w', encoding='utf-8') as f:
        f.write(new_i18n_content)
    print(f"  Written: {i18n_path}")
    
    # Show files that would be deleted
    for locale in LOCALES:
        cleanup_old_files(locale, dry_run=True)
    
    # Summary
    print(f"\n{'='*60}")
    print("CONSOLIDATION SUMMARY")
    print(f"{'='*60}")
    
    total_keys_all = 0
    for locale, results in all_results.items():
        if results:
            print(f"\n{locale.upper()}:")
            total_keys = sum(r['keys'] for r in results.values())
            total_conflicts = sum(len(r['conflicts']) for r in results.values())
            total_keys_all += total_keys
            print(f"  Namespaces: {len(results)}")
            print(f"  Total keys: {total_keys}")
            print(f"  Conflicts: {total_conflicts}")
    
    print(f"\nTotal keys across all locales: {total_keys_all}")
    
    # Save report
    report = {
        "merge_map": {k: v for k, v in MERGE_MAP.items()},
        "results": all_results,
        "total_namespaces": len(MERGE_MAP),
        "files_to_delete": sorted(list(all_sources)),
    }
    report_path = MESSAGES_DIR / "consolidation-report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nReport saved to: {report_path}")
    
    print(f"\n{'='*60}")
    print("NEXT STEPS:")
    print("  1. Review the generated files in each locale directory")
    print("  2. Run 'python scripts/merge-i18n-namespaces.py --cleanup' to delete old files")
    print("  3. Update code imports that reference old namespace names")
    print("  4. Test the application")
    print(f"{'='*60}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--cleanup":
        print("\n⚠️  CLEANUP MODE - Deleting old files...\n")
        for locale in LOCALES:
            cleanup_old_files(locale, dry_run=False)
    else:
        main()
