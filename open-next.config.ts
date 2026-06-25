import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// OpenNext Cloudflare configuration for Klarpakke.
//
// R2 incremental cache + D1 tag cache + DO revalidation queue are activated
// by setting OPENNEXT_ENABLE_R2_CACHE=true in the Cloudflare Workers Builds
// trigger environment variables (or locally in .env.local for testing).
//
// The required wrangler.jsonc bindings are:
//   r2_buckets: NEXT_INC_CACHE_R2_BUCKET
//   d1_databases: NEXT_TAG_CACHE_D1
//   services: WORKER_SELF_REFERENCE
//
// Use scripts/setup-cloudflare-resources.mjs to provision resources and enable
// the flag automatically.
//
// See: https://opennext.js.org/cloudflare/caching

const enableR2Cache = process.env.OPENNEXT_ENABLE_R2_CACHE === "true";

export default defineCloudflareConfig(
  enableR2Cache
    ? {
        incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
        tagCache: d1NextTagCache,
        queue: doQueue,
      }
    : {}
);
