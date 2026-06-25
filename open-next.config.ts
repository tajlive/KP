import { readFileSync } from "node:fs";
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext Cloudflare configuration for Klarpakke.
//
// Default config uses the built-in cache implementations. Once an R2 bucket
// named e.g. "klarpakke-incremental-cache" is provisioned and bound as
// NEXT_INC_CACHE_R2_BUCKET in wrangler.jsonc, this config automatically switches
// to the R2 incremental cache with a regional cache for best ISR/fetch-cache
// performance. It also enables the D1 tag cache and self-reference queue used
// for on-demand revalidation.
//
// See: https://opennext.js.org/cloudflare/caching

let wranglerBindings: Record<string, unknown> | undefined;
try {
  // Parse wrangler.jsonc crudely: remove comments, then parse JSON.
  const raw = readFileSync("./wrangler.jsonc", "utf-8");
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  wranglerBindings = JSON.parse(stripped);
} catch {
  // If wrangler.jsonc is missing/unreadable we fall back to the default config.
}

interface WranglerBinding {
  binding?: string;
  bucket_name?: string;
  database_name?: string;
  database_id?: string;
  service?: string;
}

const hasR2Cache =
  wranglerBindings?.r2_buckets?.some(
    (b: WranglerBinding) => b.binding === "NEXT_INC_CACHE_R2_BUCKET"
  ) ?? false;

let cloudflareConfig: Parameters<typeof defineCloudflareConfig>[0] = {};

if (hasR2Cache) {
  const { default: r2IncrementalCache } = await import(
    "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
  );
  const { withRegionalCache } = await import(
    "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
  );
  const { default: d1TagCache } = await import(
    "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"
  );
  const { default: doQueue } = await import(
    "@opennextjs/cloudflare/overrides/queue/do-queue"
  );

  cloudflareConfig = {
    incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
    tagCache: d1TagCache,
    queue: doQueue,
  };
}

export default defineCloudflareConfig(cloudflareConfig);
