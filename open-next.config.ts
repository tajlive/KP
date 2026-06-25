import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext Cloudflare configuration for Klarpakke.
//
// Default config uses the built-in cache implementations. Once an R2 bucket
// named e.g. "klarpakke-incremental-cache" is provisioned and bound as
// NEXT_INC_CACHE_R2_BUCKET in wrangler.jsonc, switch to the R2 incremental
// cache with a regional cache for best ISR/fetch-cache performance:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({
//     incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
//   });
//
// See: https://opennext.js.org/cloudflare/caching

export default defineCloudflareConfig({});
