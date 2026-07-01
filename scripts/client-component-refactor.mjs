#!/usr/bin/env node
/**
 * Client Component Refactor Tool v1.0
 * Auto-analyserer og fjerner unødvendige "use client" direktiver.
 *
 * Bruk:
 *   node scripts/client-component-refactor.mjs --dry-run   (default — viser forslag)
 *   node scripts/client-component-refactor.mjs --fix       (faktisk fjerner)
 */
import { globSync } from 'glob';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = !args.includes('--fix');

// Patterns that DEFINITELY require client
const CLIENT_HOOKS = [
  'useState', 'useEffect', 'useReducer', 'useRef', 'useLayoutEffect',
  'useImperativeHandle', 'useSyncExternalStore', 'useTransition', 'useDeferredValue',
  'useFormStatus', 'useActionState',
  'useMemo', 'useCallback', 'useContext', 'useId', 'useDebugValue', 'useInsertionEffect',
  'useTranslations', 'useLocale', 'useMessages', 'useTimeZone',
  'useRouter', 'usePathname', 'useSearchParams', 'useParams',
  'useTheme', 'useQuery', 'useMutation', 'useInfiniteQuery',
  'useStore', 'useProgressStore', 'useAuth', 'useUser', 'useSession', 'useProfile',
];

const CLIENT_APIS = [
  'document.', 'window.', 'localStorage', 'sessionStorage', 'navigator.',
  'addEventListener', 'removeEventListener', 'IntersectionObserver',
  'ResizeObserver', 'MutationObserver', 'fetch(', 'fetch ',
  'WebSocket', 'XMLHttpRequest', 'EventSource',
];

const CLIENT_LIBS = [
  'framer-motion', 'chart.js', 'react-chartjs', 'recharts', 'html2canvas',
  'lightweight-charts', 'canvas-confetti', 'embla-carousel', 'react-countdown',
  'react-intersection-observer', 'react-hot-toast', 'sonner',
  'react-ts-tradingview-widgets',
];

const CLIENT_IMPORTS = [
  '@/lib/supabase/client',
  'next/navigation',
  'next-auth',
  '@supabase/ssr',
  'zustand',
];

const EVENT_HANDLER_REGEX = /on[A-Z][a-zA-Z]+={/;

function analyzeFile(filePath, content) {
  const lines = content.split('\n');
  const useClientIndex = lines.findIndex(l => {
    const t = l.trim().replace(/;$/, '');
    return t === '"use client"' || t === "'use client'";
  });
  if (useClientIndex === -1) return null;

  const codeWithoutDirective = lines.slice(useClientIndex + 1).join('\n');

  const usedHooks = CLIENT_HOOKS.filter(h => {
    const regex = new RegExp(`\\b${h}\\b[<(]`);
    return regex.test(codeWithoutDirective);
  });

  const usedApis = CLIENT_APIS.filter(a => codeWithoutDirective.includes(a));
  const usedLibs = CLIENT_LIBS.filter(l => codeWithoutDirective.includes(l));
  const usedClientImports = CLIENT_IMPORTS.filter(i => codeWithoutDirective.includes(i));
  const hasEventHandlers = EVENT_HANDLER_REGEX.test(codeWithoutDirective);

  const reasons = [];
  if (usedHooks.length) reasons.push(`${usedHooks.length} hooks`);
  if (usedApis.length) reasons.push(`${usedApis.length} browser APIs`);
  if (usedLibs.length) reasons.push(`${usedLibs.length} client libs`);
  if (usedClientImports.length) reasons.push(`${usedClientImports.length} client imports`);
  if (hasEventHandlers) reasons.push('event handlers');

  const isSafeToRemove = reasons.length === 0;

  return {
    file: filePath,
    useClientIndex,
    isSafeToRemove,
    reasons,
    usedHooks,
    usedApis,
    usedLibs,
    usedClientImports,
    hasEventHandlers,
    lineCount: lines.length,
  };
}

function main() {
  const files = globSync('src/**/*.{ts,tsx}', {
    ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    cwd: root,
  });
  const safeToRemove = [];
  const needsRefactor = [];
  const mustStay = [];

  for (const file of files) {
    const fullPath = resolve(root, file);
    const content = readFileSync(fullPath, 'utf-8');
    const hasClient = content.includes('"use client"') || content.includes("'use client'");
    if (!hasClient) continue;
    const analysis = analyzeFile(file, content);
    if (!analysis) continue;

    if (analysis.isSafeToRemove) {
      safeToRemove.push(analysis);
    } else if (analysis.usedHooks.length <= 1 && !analysis.usedApis.length && !analysis.usedLibs.length && !analysis.usedClientImports.length && !analysis.hasEventHandlers) {
      // Only 1 hook — might be refactored by lifting it to a parent or using a server-friendly alternative
      needsRefactor.push(analysis);
    } else {
      mustStay.push(analysis);
    }
  }

  console.log(`🔍 Analyzed ${safeToRemove.length + needsRefactor.length + mustStay.length} "use client" files\n`);

  if (safeToRemove.length > 0) {
    console.log(`✅ ${safeToRemove.length} files SAFE to remove "use client":`);
    for (const a of safeToRemove.sort((x, y) => y.lineCount - x.lineCount)) {
      console.log(`   ${String(a.lineCount).padStart(4)} lines | ${a.file}`);
    }
  }

  if (needsRefactor.length > 0) {
    console.log(`\n🔧 ${needsRefactor.length} files MAYBE refactorable (1 hook, no APIs/libs):`);
    for (const a of needsRefactor.slice(0, 15).sort((x, y) => y.lineCount - x.lineCount)) {
      console.log(`   ${String(a.lineCount).padStart(4)} lines | hook: ${a.usedHooks[0]} | ${a.file}`);
    }
  }

  if (mustStay.length > 0) {
    console.log(`\n🔒 ${mustStay.length} files MUST keep "use client"`);
    for (const a of mustStay.slice(0, 10).sort((x, y) => y.lineCount - x.lineCount)) {
      console.log(`   ${String(a.lineCount).padStart(4)} lines | ${a.reasons.join(', ')} | ${a.file}`);
    }
    if (mustStay.length > 10) {
      console.log(`   ... and ${mustStay.length - 10} more`);
    }
  }

  // Apply fixes if --fix
  if (!dryRun && safeToRemove.length > 0) {
    console.log(`\n🛠️  Applying fixes...`);
    let fixed = 0;
    for (const a of safeToRemove) {
      const fullPath = resolve(root, a.file);
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.splice(a.useClientIndex, 1);
      // Remove leading blank lines if any
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      writeFileSync(fullPath, lines.join('\n'));
      fixed++;
      console.log(`   ✓ ${a.file}`);
    }
    console.log(`\n✅ Fixed ${fixed} files`);
  } else if (dryRun && safeToRemove.length > 0) {
    console.log(`\n🏃 Dry run — no changes made. Use --fix to apply.`);
  }

  // Record trend
  const historyPath = resolve(root, '.kimi/client-component-history.jsonl');
  const historyDir = dirname(historyPath);
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
  appendFileSync(historyPath, JSON.stringify({
    ts: new Date().toISOString(),
    total: safeToRemove.length + needsRefactor.length + mustStay.length,
    safe: safeToRemove.length,
    refactor: needsRefactor.length,
    keep: mustStay.length,
  }) + '\n');

  // Generate report
  const reportLines = [
    `# 🧩 Client Component Report — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `## Summary`,
    `| Category | Count |`,
    `|----------|-------|`,
    `| Safe to remove | ${safeToRemove.length} |`,
    `| Needs refactor | ${needsRefactor.length} |`,
    `| Must keep | ${mustStay.length} |`,
    `| **Total** | **${safeToRemove.length + needsRefactor.length + mustStay.length}** |`,
    '',
    `## Safe to Remove`,
    ...safeToRemove.map(a => `- ${a.file} (${a.lineCount} lines)`),
    '',
    `## Needs Refactor`,
    ...needsRefactor.slice(0, 30).map(a => `- ${a.file} — uses ${a.usedHooks.join(', ')}`),
    '',
    `---`,
    `Generated by \`scripts/client-component-refactor.mjs\``,
  ];

  const reportPath = resolve(root, '.kimi/ai-health-reports/client-components-report.md');
  writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`\n💾 Report saved to .kimi/ai-health-reports/client-components-report.md`);
}

main();
