import { MetadataRoute } from "next";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { sitemapClient, isSanityConfigured } from "@/lib/sanity/client";
import { groq } from "next-sanity";

// Cache sitemap for 1 hour — Sanity pages rarely change and this reduces API quota usage.
export const revalidate = 3600;

const baseUrl = "https://www.klarpakke.no";
const appDir = join(process.cwd(), "src/app/[locale]");

// Route groups that are PRIVATE (auth required) — NEVER include in sitemap
const EXCLUDED_GROUPS = [
  "(user)",
  "(admin)",
  "(auth)",
  "(onboarding)",
  "(commerce)",
];

// Other paths to exclude
const EXCLUDED_PATHS = [
  /^debug/,
  /^dev/,
  /^feil/,
  /^studio/,
  /^admin\//,
];

// Dynamic segment patterns that we skip (no known static values)
const DYNAMIC_SEGMENT_PATTERN = /\[.*\]/;

// Known static values for specific dynamic routes (add if you have dynamic
// routes with known slugs that do NOT have physical page files)
const STATIC_DYNAMIC_OVERRIDES: Record<string, string[]> = {
  // Example: "blog": ["post-1", "post-2"],
};

interface SitemapEntry {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

/**
 * Walk the Next.js App Router filesystem and discover public routes.
 * Only includes directories that contain a page.tsx or page.ts file.
 */
function discoverRoutes(
  dir: string,
  currentPath: string = "",
): SitemapEntry[] {
  const routes: SitemapEntry[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    // Check if this directory has a page file
    const hasPage = entries.some(
      (e) =>
        e.isFile() &&
        (e.name === "page.tsx" || e.name === "page.ts") &&
        !e.name.endsWith(".test.tsx"),
    );

    if (hasPage && currentPath) {
      const entry = createSitemapEntry(currentPath);
      if (entry) routes.push(entry);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const name = entry.name;

      // Skip private route groups
      if (EXCLUDED_GROUPS.includes(name)) continue;

      // Skip paths matching excluded patterns
      const testPath = currentPath ? `${currentPath}/${name}` : name;
      if (EXCLUDED_PATHS.some((pattern) => pattern.test(testPath))) continue;

      // Handle route groups: (marketing), (legal), etc.
      // They don't appear in the URL
      const isRouteGroup = name.startsWith("(") && name.endsWith(")");
      const segment = isRouteGroup ? "" : name;
      const nextPath = segment
        ? currentPath
          ? `${currentPath}/${segment}`
          : segment
        : currentPath;

      // Recurse into subdirectory
      const subRoutes = discoverRoutes(join(dir, name), nextPath);
      routes.push(...subRoutes);

      // Handle known static overrides for dynamic segments
      // (only needed when dynamic routes have known slugs without physical files)
      if (STATIC_DYNAMIC_OVERRIDES[testPath]) {
        for (const staticValue of STATIC_DYNAMIC_OVERRIDES[testPath]) {
          const staticPath = `${testPath}/${staticValue}`;
          const staticEntry = createSitemapEntry(staticPath);
          if (staticEntry) routes.push(staticEntry);
        }
      }
    }
  } catch {
    // Directory might not exist or be readable
  }

  return routes;
}

/**
 * Create a sitemap entry for a given path with appropriate priority/frequency.
 */
function createSitemapEntry(path: string): SitemapEntry | null {
  // Skip paths with unresolved dynamic segments
  if (DYNAMIC_SEGMENT_PATTERN.test(path) && !isKnownStaticPath(path)) {
    return null;
  }

  const isHome = path === "";

  // Priority & frequency based on path type
  if (isHome) {
    return { path, priority: 1.0, changeFrequency: "daily" };
  }

  if (path === "priser" || path === "copy-trading" || path === "paper-trading" || path === "live-trading") {
    return { path, priority: 0.9, changeFrequency: "weekly" };
  }

  if (path.startsWith("priser/")) {
    return { path, priority: 0.5, changeFrequency: "monthly" };
  }

  if (path.startsWith("kurs/") || path === "akademi" || path === "kurs") {
    return { path, priority: 0.7, changeFrequency: "weekly" };
  }

  if (
    path === "om-oss" ||
    path === "kontakt" ||
    path === "kalkulator" ||
    path === "binance-guide" ||
    path === "funding-arbitrage" ||
    path === "leaderboard" ||
    path === "tradere"
  ) {
    return { path, priority: 0.8, changeFrequency: "weekly" };
  }

  if (path === "personvern" || path === "vilkar" || path === "hjelp") {
    return { path, priority: 0.5, changeFrequency: "monthly" };
  }

  // Default for everything else
  return { path, priority: 0.6, changeFrequency: "weekly" };
}

/**
 * Check if a path with dynamic segments has known static values.
 */
function isKnownStaticPath(path: string): boolean {
  for (const [prefix, values] of Object.entries(STATIC_DYNAMIC_OVERRIDES)) {
    for (const value of values) {
      if (path === `${prefix}/${value}`) return true;
    }
  }
  return false;
}

/**
 * Fetch dynamic pages from Sanity CMS that are rendered via [...slug].
 */
async function fetchSanityPages(): Promise<SitemapEntry[]> {
  if (!isSanityConfigured()) return [];

  try {
    const pages = await sitemapClient.fetch<
      Array<{
        slug: string;
        language: string;
        publishedAt?: string;
      }>
    >(
      groq`
        *[_type == "page" && defined(slug.current) && defined(language)] {
          "slug": slug.current,
          language,
          publishedAt
        }
      `,
      {},
      { next: { revalidate: 3600 } },
    );

    return pages.map((page) => ({
      path: page.slug,
      priority: 0.6,
      changeFrequency: "weekly" as const,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("plan_limit_reached")) {
      console.warn(
        "[sitemap] Sanity API plan limit reached. Falling back to filesystem routes only.",
      );
    } else {
      console.warn("[sitemap] Failed to fetch Sanity pages:", err);
    }
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Discover filesystem routes
  const fileSystemRoutes = discoverRoutes(appDir);

  // 2. Fetch dynamic Sanity pages
  const sanityRoutes = await fetchSanityPages();

  // 3. Combine and deduplicate
  const allPaths = new Map<string, SitemapEntry>();

  for (const route of fileSystemRoutes) {
    allPaths.set(route.path, route);
  }

  for (const route of sanityRoutes) {
    // Sanity pages override filesystem defaults if they exist
    if (!allPaths.has(route.path)) {
      allPaths.set(route.path, route);
    }
  }

  // 4. Always ensure home page exists
  if (!allPaths.has("")) {
    allPaths.set("", { path: "", priority: 1.0, changeFrequency: "daily" });
  }

  // 5. Build sitemap with alternates for i18n
  const sitemap: MetadataRoute.Sitemap = [];

  for (const entry of allPaths.values()) {
    const noUrl = entry.path
      ? `${baseUrl}/${entry.path}`
      : baseUrl;
    const enUrl = entry.path
      ? `${baseUrl}/en/${entry.path}`
      : `${baseUrl}/en`;

    sitemap.push({
      url: noUrl,
      lastModified: now,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: {
        languages: {
          "no": noUrl,
          "en": enUrl,
          "x-default": noUrl,
        },
      },
    });
  }

  // 6. Sort by priority descending for readability
  sitemap.sort((a, b) => (b.priority ?? 0.5) - (a.priority ?? 0.5));

  return sitemap;
}
