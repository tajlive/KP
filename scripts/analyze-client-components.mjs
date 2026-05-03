#!/usr/bin/env node
/**
 * Analyze "use client" files to find TRUE candidates for Server Component conversion.
 * Excludes files using next-intl, next/navigation, or other framework hooks that require client.
 */
import { globSync } from "glob";
import { readFileSync } from "fs";

const files = globSync("src/**/*.{ts,tsx}", {
  ignore: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
});

// Hooks that REQUIRE client rendering
const CLIENT_HOOKS = [
  "useState", "useEffect", "useReducer", "useRef", "useLayoutEffect",
  "useImperativeHandle", "useSyncExternalStore", "useTransition", "useDeferredValue",
  "useFormStatus", "useActionState",
  // next-intl
  "useTranslations", "useLocale", "useMessages", "useTimeZone",
  // next/navigation
  "useRouter", "usePathname", "useSearchParams", "useParams",
  // next themes
  "useTheme",
  // react-query
  "useQuery", "useMutation", "useInfiniteQuery",
  // zustand
  "useStore", "useProgressStore",
  // custom hooks that likely need client
  "useAuth", "useUser", "useSession", "useProfile",
];

const CLIENT_APIS = [
  "document.", "window.", "localStorage", "sessionStorage", "navigator.",
  "fetch(", "addEventListener", "removeEventListener", "location.",
  "history.", "alert(", "confirm(", "prompt(", "IntersectionObserver",
  "ResizeObserver", "MutationObserver",
];

const CLIENT_LIBS = [
  "framer-motion", "chart.js", "react-chartjs", "recharts", "html2canvas",
  "lightweight-charts", "canvas-confetti", "embla-carousel", "react-countdown",
  "react-intersection-observer", "react-hot-toast", "sonner",
];

const candidates = [];
const withClientCode = [];

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  if (!content.includes('"use client"')) continue;

  const usedHooks = CLIENT_HOOKS.filter(h => {
    // Match hook calls: useXxx( or useXxx< or = useXxx
    const regex = new RegExp(`\\b${h}\\b[<(]`);
    return regex.test(content);
  });
  const usedClientApis = CLIENT_APIS.filter(a => content.includes(a));
  const usedClientLibs = CLIENT_LIBS.filter(l => content.includes(l));
  const hasEventHandlers = /on[A-Z][a-zA-Z]+={/.test(content);
  const lines = content.split("\n").length;

  if (usedHooks.length === 0 && usedClientApis.length === 0 && !hasEventHandlers && usedClientLibs.length === 0) {
    candidates.push({ file, lines, reason: "No client hooks, APIs, or libs" });
  } else {
    withClientCode.push({ file, lines, hooks: usedHooks, apis: usedClientApis, libs: usedClientLibs, handlers: hasEventHandlers });
  }
}

console.log(`🔍 Found ${candidates.length} TRUE candidates for Server Component conversion:`);
candidates.sort((a, b) => b.lines - a.lines);
candidates.forEach(c => {
  console.log(`   ${String(c.lines).padStart(4)} lines | ${c.file}`);
});

console.log(`\n⚠️  ${withClientCode.length} files need "use client" (hooks/client APIs):`);
withClientCode.sort((a, b) => b.lines - a.lines);
withClientCode.slice(0, 10).forEach(c => {
  const reasons = [];
  if (c.hooks.length) reasons.push(`${c.hooks.length} hooks`);
  if (c.apis.length) reasons.push(`${c.apis.length} browser APIs`);
  if (c.libs.length) reasons.push(`${c.libs.length} client libs`);
  if (c.handlers) reasons.push("event handlers");
  console.log(`   ${String(c.lines).padStart(4)} lines | ${reasons.join(", ")} | ${c.file.replace("src/", "")}`);
});

console.log(`\n📊 Summary: ${candidates.length} / ${candidates.length + withClientCode.length} "use client" files could become Server Components`);
