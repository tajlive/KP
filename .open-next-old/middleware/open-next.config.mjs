var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js
var cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
function getCloudflareContext(options = { async: false }) {
  return options.async ? getCloudflareContextAsync() : getCloudflareContextSync();
}
function getCloudflareContextFromGlobalScope() {
  const global = globalThis;
  return global[cloudflareContextSymbol];
}
function inSSG() {
  const global = globalThis;
  return global.__NEXT_DATA__?.nextExport === true;
}
function getCloudflareContextSync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  if (inSSG()) {
    throw new Error(`

ERROR: \`getCloudflareContext\` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:
  - make sure that the call is not at the top level and that the route is not static
  - call \`getCloudflareContext({async: true})\` to use the \`async\` mode
  - avoid calling \`getCloudflareContext\` in the route
`);
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
async function getCloudflareContextAsync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  const inNodejsRuntime = process.env.NEXT_RUNTIME === "nodejs";
  if (inNodejsRuntime || inSSG()) {
    const cloudflareContext2 = await getCloudflareContextFromWrangler();
    addCloudflareContextToNodejsGlobal(cloudflareContext2);
    return cloudflareContext2;
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
function addCloudflareContextToNodejsGlobal(cloudflareContext) {
  const global = globalThis;
  global[cloudflareContextSymbol] = cloudflareContext;
}
async function getCloudflareContextFromWrangler(options) {
  const { getPlatformProxy } = await import(
    /* webpackIgnore: true */
    `${"__wrangler".replaceAll("_", "")}`
  );
  const environment = options?.environment ?? process.env.NEXT_DEV_WRANGLER_ENV;
  const { env, cf, ctx } = await getPlatformProxy({
    ...options,
    // The `env` passed to the fetch handler does not contain variables from `.env*` files.
    // because we invoke wrangler with `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV`=`"false"`.
    // Initializing `envFiles` with an empty list is the equivalent for this API call.
    envFiles: [],
    environment
  });
  return {
    env,
    cf,
    ctx
  };
}
var initOpenNextCloudflareForDevErrorMsg = `

ERROR: \`getCloudflareContext\` has been called without having called \`initOpenNextCloudflareForDev\` from the Next.js config file.
You should update your Next.js config file as shown below:

   \`\`\`
   // next.config.mjs

   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

   initOpenNextCloudflareForDev();

   const nextConfig = { ... };
   export default nextConfig;
   \`\`\`

`;

// node_modules/@opennextjs/cloudflare/dist/api/overrides/asset-resolver/index.js
var resolver = {
  name: "cloudflare-asset-resolver",
  async maybeGetAssetResult(event) {
    const { ASSETS } = getCloudflareContext().env;
    if (!ASSETS || !isUserWorkerFirst(globalThis.__ASSETS_RUN_WORKER_FIRST__, event.rawPath)) {
      return void 0;
    }
    const { method, headers } = event;
    if (method !== "GET" && method != "HEAD") {
      return void 0;
    }
    const url = new URL(event.rawPath, "https://assets.local");
    const response = await ASSETS.fetch(url, {
      headers,
      method
    });
    if (response.status === 404) {
      await response.body?.cancel();
      return void 0;
    }
    return {
      type: "core",
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: getResponseBody(method, response),
      isBase64Encoded: false
    };
  }
};
function getResponseBody(method, response) {
  if (method === "HEAD") {
    return null;
  }
  return response.body || new ReadableStream();
}
function isUserWorkerFirst(runWorkerFirst, pathname) {
  if (!Array.isArray(runWorkerFirst)) {
    return runWorkerFirst ?? false;
  }
  let hasPositiveMatch = false;
  for (let rule of runWorkerFirst) {
    let isPositiveRule = true;
    if (rule.startsWith("!")) {
      rule = rule.slice(1);
      isPositiveRule = false;
    } else if (hasPositiveMatch) {
      continue;
    }
    const match = new RegExp(`^${rule.replace(/([[\]().*+?^$|{}\\])/g, "\\$1").replace("\\*", ".*")}$`).test(pathname);
    if (match) {
      if (isPositiveRule) {
        hasPositiveMatch = true;
      } else {
        return false;
      }
    }
  }
  return hasPositiveMatch;
}
var asset_resolver_default = resolver;

// node_modules/@opennextjs/cloudflare/dist/api/config.js
function defineCloudflareConfig(config = {}) {
  const { incrementalCache, tagCache, queue, cachePurge, enableCacheInterception = false, routePreloadingBehavior = "none" } = config;
  return {
    default: {
      override: {
        wrapper: "cloudflare-node",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
        cdnInvalidation: resolveCdnInvalidation(cachePurge)
      },
      routePreloadingBehavior
    },
    // node:crypto is used to compute cache keys
    edgeExternals: ["node:crypto"],
    cloudflare: {
      useWorkerdCondition: true
    },
    dangerous: {
      enableCacheInterception
    },
    middleware: {
      external: true,
      override: {
        wrapper: "cloudflare-edge",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue)
      },
      assetResolver: () => asset_resolver_default
    }
  };
}
function resolveIncrementalCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveTagCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveQueue(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveCdnInvalidation(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}

// node_modules/@opennextjs/aws/dist/utils/error.js
var IgnorableError = class extends Error {
  constructor(message) {
    super(message);
    __publicField(this, "__openNextInternal", true);
    __publicField(this, "canIgnore", true);
    __publicField(this, "logLevel", 0);
    this.name = "IgnorableError";
  }
};
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
var DOWNPLAYED_ERROR_LOGS = [
  {
    clientName: "S3Client",
    commandName: "GetObjectCommand",
    errorName: "NoSuchKey"
  }
];
var isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/internal.js
import { createHash } from "node:crypto";
var debugCache = (name, ...args) => {
  if (process.env.NEXT_PRIVATE_DEBUG_CACHE) {
    console.log(`[${name}] `, ...args);
  }
};
var FALLBACK_BUILD_ID = "no-build-id";
var DEFAULT_PREFIX = "incremental-cache";
function computeCacheKey(key, options) {
  const { cacheType = "cache", prefix = DEFAULT_PREFIX, buildId = FALLBACK_BUILD_ID } = options;
  const hash = createHash("sha256").update(key).digest("hex");
  return `${prefix}/${buildId}/${hash}.${cacheType}`.replace(/\/+/g, "/");
}
function isPurgeCacheEnabled() {
  const cdnInvalidation = globalThis.openNextConfig?.default?.override?.cdnInvalidation;
  return cdnInvalidation !== void 0 && cdnInvalidation !== "dummy";
}
async function purgeCacheByTags(tags) {
  const { env } = getCloudflareContext();
  if (env.NEXT_CACHE_DO_PURGE) {
    const durableObject = env.NEXT_CACHE_DO_PURGE;
    const id = durableObject.idFromName("cache-purge");
    const obj = durableObject.get(id);
    await obj.purgeCacheByTags(tags);
  } else {
    await internalPurgeCacheByTags(env, tags);
  }
}
async function internalPurgeCacheByTags(env, tags) {
  if (!env.CACHE_PURGE_ZONE_ID || !env.CACHE_PURGE_API_TOKEN) {
    error("No cache zone ID or API token provided. Skipping cache purge.");
    return "missing-credentials";
  }
  let response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CACHE_PURGE_ZONE_ID}/purge_cache`, {
      headers: {
        Authorization: `Bearer ${env.CACHE_PURGE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({
        tags
      })
    });
    if (response.status === 429) {
      error("purgeCacheByTags: Rate limit exceeded. Skipping cache purge.");
      return "rate-limit-exceeded";
    }
    const bodyResponse = await response.json();
    if (!bodyResponse.success) {
      error("purgeCacheByTags: Cache purge failed. Errors:", bodyResponse.errors.map((error2) => `${error2.code}: ${error2.message}`));
      return "purge-failed";
    }
    debugCache("purgeCacheByTags", "Cache purged successfully for tags:", tags);
    return "purge-success";
  } catch (error2) {
    console.error("Error purging cache by tags:", error2);
    return "purge-failed";
  } finally {
    try {
      await response?.body?.cancel();
    } catch {
    }
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/incremental-cache/r2-incremental-cache.js
var NAME = "cf-r2-incremental-cache";
var BINDING_NAME = "NEXT_INC_CACHE_R2_BUCKET";
var PREFIX_ENV_NAME = "NEXT_INC_CACHE_R2_PREFIX";
var R2IncrementalCache = class {
  constructor() {
    __publicField(this, "name", NAME);
  }
  async get(key, cacheType) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache("R2IncrementalCache", `get ${key}`);
    try {
      const r2Object = await r2.get(this.getR2Key(key, cacheType));
      if (!r2Object)
        return null;
      return {
        value: await r2Object.json(),
        lastModified: r2Object.uploaded.getTime()
      };
    } catch (e) {
      error("Failed to get from cache", e);
      return null;
    }
  }
  async set(key, value, cacheType) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache("R2IncrementalCache", `set ${key}`);
    try {
      await r2.put(this.getR2Key(key, cacheType), JSON.stringify(value));
    } catch (e) {
      error("Failed to set to cache", e);
    }
  }
  async delete(key) {
    const r2 = getCloudflareContext().env[BINDING_NAME];
    if (!r2)
      throw new IgnorableError("No R2 bucket");
    debugCache("R2IncrementalCache", `delete ${key}`);
    try {
      await r2.delete(this.getR2Key(key));
    } catch (e) {
      error("Failed to delete from cache", e);
    }
  }
  getR2Key(key, cacheType) {
    return computeCacheKey(key, {
      prefix: getCloudflareContext().env[PREFIX_ENV_NAME],
      buildId: process.env.OPEN_NEXT_BUILD_ID,
      cacheType
    });
  }
};
var r2_incremental_cache_default = new R2IncrementalCache();

// node_modules/@opennextjs/aws/dist/utils/semver.js
function compareSemver(v1, operator, v2) {
  let versionDiff = 0;
  if (v1 === "latest") {
    versionDiff = 1;
  } else {
    if (/^[^\d]/.test(v1)) {
      v1 = v1.substring(1);
    }
    if (/^[^\d]/.test(v2)) {
      v2 = v2.substring(1);
    }
    const [major1, minor1 = 0, patch1 = 0] = v1.split(".").map(Number);
    const [major2, minor2 = 0, patch2 = 0] = v2.split(".").map(Number);
    if (Number.isNaN(major1) || Number.isNaN(major2)) {
      throw new Error("The major version is required.");
    }
    if (major1 !== major2) {
      versionDiff = major1 - major2;
    } else if (minor1 !== minor2) {
      versionDiff = minor1 - minor2;
    } else if (patch1 !== patch2) {
      versionDiff = patch1 - patch2;
    }
  }
  switch (operator) {
    case "=":
      return versionDiff === 0;
    case ">=":
      return versionDiff >= 0;
    case "<=":
      return versionDiff <= 0;
    case ">":
      return versionDiff > 0;
    case "<":
      return versionDiff < 0;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/incremental-cache/regional-cache.js
var ONE_MINUTE_IN_SECONDS = 60;
var THIRTY_MINUTES_IN_SECONDS = ONE_MINUTE_IN_SECONDS * 30;
var RegionalCache = class {
  constructor(store, opts) {
    __publicField(this, "store");
    __publicField(this, "opts");
    __publicField(this, "name");
    __publicField(this, "localCache");
    var _a, _b, _c, _d;
    this.store = store;
    this.opts = opts;
    this.name = this.store.name;
    const { nextVersion } = globalThis;
    if (nextVersion) {
      if (compareSemver(nextVersion, "<", "16")) {
        (_a = this.opts).shouldLazilyUpdateOnCacheHit ?? (_a.shouldLazilyUpdateOnCacheHit = this.opts.mode === "long-lived" && !isPurgeCacheEnabled());
        (_b = this.opts).bypassTagCacheOnCacheHit ?? (_b.bypassTagCacheOnCacheHit = isPurgeCacheEnabled());
      } else {
        (_c = this.opts).bypassTagCacheOnCacheHit ?? (_c.bypassTagCacheOnCacheHit = false);
        if (this.opts.bypassTagCacheOnCacheHit) {
          debugCache("RegionalCache", `bypassTagCacheOnCacheHit is not recommended for Next 16+ as it is not compatible with SWR tags. Make sure to always use \`revalidateTag\` with \`{ expire: 0 }\` if you want to bypass the tag cache.`);
        }
        (_d = this.opts).shouldLazilyUpdateOnCacheHit ?? (_d.shouldLazilyUpdateOnCacheHit = !this.opts.bypassTagCacheOnCacheHit);
        if (this.opts.shouldLazilyUpdateOnCacheHit !== this.opts.bypassTagCacheOnCacheHit) {
          debugCache("RegionalCache", `\`shouldLazilyUpdateOnCacheHit\` and \`bypassTagCacheOnCacheHit\` are mutually exclusive for Next 16+.`);
        }
      }
    }
  }
  async get(key, cacheType) {
    try {
      const cache = await this.getCacheInstance();
      const urlKey = this.getCacheUrlKey(key, cacheType);
      const cachedResponse = await cache.match(urlKey);
      if (cachedResponse) {
        debugCache("RegionalCache", `get ${key} -> cached response`);
        if (this.opts.shouldLazilyUpdateOnCacheHit) {
          getCloudflareContext().ctx.waitUntil(this.store.get(key, cacheType).then(async (rawEntry2) => {
            const { value: value2, lastModified: lastModified2 } = rawEntry2 ?? {};
            if (value2 && typeof lastModified2 === "number") {
              await this.putToCache({ key, cacheType, entry: { value: value2, lastModified: lastModified2 } });
            }
          }));
        }
        const responseJson = await cachedResponse.json();
        return {
          ...responseJson,
          shouldBypassTagCache: this.opts.bypassTagCacheOnCacheHit
        };
      }
      const rawEntry = await this.store.get(key, cacheType);
      const { value, lastModified } = rawEntry ?? {};
      if (!value || typeof lastModified !== "number")
        return null;
      debugCache("RegionalCache", `get ${key} -> put to cache`);
      getCloudflareContext().ctx.waitUntil(this.putToCache({ key, cacheType, entry: { value, lastModified } }));
      return { value, lastModified };
    } catch (e) {
      error("Failed to get from regional cache", e);
      return null;
    }
  }
  async set(key, value, cacheType) {
    try {
      debugCache("RegionalCache", `set ${key}`);
      await this.store.set(key, value, cacheType);
      await this.putToCache({
        key,
        cacheType,
        entry: {
          value,
          // Note: `Date.now()` returns the time of the last IO rather than the actual time.
          //       See https://developers.cloudflare.com/workers/reference/security-model/
          lastModified: Date.now()
        }
      });
    } catch (e) {
      error(`Failed to set the regional cache`, e);
    }
  }
  async delete(key) {
    debugCache("RegionalCache", `delete ${key}`);
    try {
      await this.store.delete(key);
      const cache = await this.getCacheInstance();
      await cache.delete(this.getCacheUrlKey(key));
    } catch (e) {
      error("Failed to delete from regional cache", e);
    }
  }
  async getCacheInstance() {
    if (this.localCache)
      return this.localCache;
    this.localCache = await caches.open("incremental-cache");
    return this.localCache;
  }
  getCacheUrlKey(key, cacheType) {
    const buildId = process.env.OPEN_NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
    return "http://cache.local" + `/${buildId}/${key}`.replace(/\/+/g, "/") + `.${cacheType ?? "cache"}`;
  }
  async putToCache({ key, cacheType, entry }) {
    const urlKey = this.getCacheUrlKey(key, cacheType);
    const cache = await this.getCacheInstance();
    const age = this.opts.mode === "short-lived" ? ONE_MINUTE_IN_SECONDS : entry.value.revalidate || this.opts.defaultLongLivedTtlSec || THIRTY_MINUTES_IN_SECONDS;
    const tags = getTagsFromCacheEntry(entry) ?? [key];
    await cache.put(urlKey, new Response(JSON.stringify(entry), {
      headers: new Headers({
        "cache-control": `max-age=${age}`,
        ...tags.length > 0 ? {
          "cache-tag": tags.join(",")
        } : {}
      })
    }));
  }
};
function withRegionalCache(cache, opts) {
  return new RegionalCache(cache, opts);
}
function getTagsFromCacheEntry(entry) {
  if ("tags" in entry.value && entry.value.tags) {
    return entry.value.tags;
  }
  if ("meta" in entry.value && entry.value.meta && "headers" in entry.value.meta && entry.value.meta.headers) {
    const rawTags = entry.value.meta.headers["x-next-cache-tags"];
    if (typeof rawTags === "string") {
      return rawTags.split(",");
    }
  }
  if ("value" in entry.value) {
    return entry.value.tags;
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/queue/do-queue.js
var do_queue_default = {
  name: "durable-queue",
  send: async (msg) => {
    const durableObject = getCloudflareContext().env.NEXT_CACHE_DO_QUEUE;
    if (!durableObject)
      throw new IgnorableError("No durable object binding for cache revalidation");
    const id = durableObject.idFromName(msg.MessageGroupId);
    const stub = durableObject.get(id);
    await stub.revalidate({
      ...msg
    });
  }
};

// node_modules/@opennextjs/cloudflare/dist/api/overrides/tag-cache/d1-next-tag-cache.js
var NAME2 = "d1-next-mode-tag-cache";
var BINDING_NAME2 = "NEXT_TAG_CACHE_D1";
var _D1NextModeTagCache_instances, resolveTagValues_fn;
var D1NextModeTagCache = class {
  constructor() {
    __privateAdd(this, _D1NextModeTagCache_instances);
    __publicField(this, "mode", "nextMode");
    __publicField(this, "name", NAME2);
  }
  async getLastRevalidated(tags) {
    const { isDisabled, db } = this.getConfig();
    if (isDisabled || tags.length === 0) {
      return 0;
    }
    try {
      const result = await __privateMethod(this, _D1NextModeTagCache_instances, resolveTagValues_fn).call(this, tags, db);
      const revalidations = [...result.values()].filter((v) => v != null).map((v) => v.revalidatedAt);
      const timeMs = revalidations.length === 0 ? 0 : Math.max(...revalidations);
      debugCache("D1NextModeTagCache", `getLastRevalidated tags=${tags} -> ${timeMs}`);
      return timeMs;
    } catch (e) {
      error(e);
      return 0;
    }
  }
  async hasBeenRevalidated(tags, lastModified) {
    const { isDisabled, db } = this.getConfig();
    if (isDisabled || tags.length === 0) {
      return false;
    }
    try {
      const now = Date.now();
      const result = await __privateMethod(this, _D1NextModeTagCache_instances, resolveTagValues_fn).call(this, tags, db);
      const revalidated = [...result.values()].some((v) => {
        if (v == null)
          return false;
        const { revalidatedAt, expire } = v;
        if (expire != null)
          return expire <= now && expire > (lastModified ?? 0);
        return revalidatedAt > (lastModified ?? now);
      });
      debugCache("D1NextModeTagCache", `hasBeenRevalidated tags=${tags} at=${lastModified} -> ${revalidated}`);
      return revalidated;
    } catch (e) {
      error(e);
      return false;
    }
  }
  async writeTags(tags) {
    const { isDisabled, db } = this.getConfig();
    if (isDisabled || tags.length === 0)
      return Promise.resolve();
    const nowMs = Date.now();
    await db.batch(tags.map((tag) => {
      const tagStr = typeof tag === "string" ? tag : tag.tag;
      const stale = typeof tag === "string" ? nowMs : tag.stale ?? nowMs;
      const expire = typeof tag === "string" ? null : tag.expire ?? null;
      return db.prepare(`INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (?, ?, ?, ?)`).bind(this.getCacheKey(tagStr), stale, stale, expire);
    }));
    const tagStrings = tags.map((t) => typeof t === "string" ? t : t.tag);
    debugCache("D1NextModeTagCache", `writeTags tags=${tagStrings} time=${nowMs}`);
    if (isPurgeCacheEnabled()) {
      await purgeCacheByTags(tagStrings);
    }
  }
  async isStale(tags, lastModified) {
    const { isDisabled, db } = this.getConfig();
    if (isDisabled || tags.length === 0) {
      return false;
    }
    try {
      const now = Date.now();
      const result = await __privateMethod(this, _D1NextModeTagCache_instances, resolveTagValues_fn).call(this, tags, db);
      const isStale = [...result.values()].some((v) => {
        if (v == null)
          return false;
        const { revalidatedAt, stale, expire } = v;
        const lastModifiedOrNow = lastModified ?? now;
        const isInStaleWindow = stale != null && revalidatedAt > lastModifiedOrNow && lastModifiedOrNow <= stale;
        if (!isInStaleWindow)
          return false;
        return expire == null || expire > now;
      });
      debugCache("D1NextModeTagCache", `isStale tags=${tags} at=${lastModified} -> ${isStale}`);
      return isStale;
    } catch (e) {
      error(e);
      return false;
    }
  }
  getConfig() {
    const db = getCloudflareContext().env[BINDING_NAME2];
    if (!db)
      debugCache("No D1 database found");
    const isDisabled = Boolean(globalThis.openNextConfig.dangerous?.disableTagCache);
    return !db || isDisabled ? { isDisabled: true } : {
      isDisabled: false,
      db
    };
  }
  getCacheKey(key) {
    return `${this.getBuildId()}/${key}`.replaceAll("//", "/");
  }
  getBuildId() {
    return process.env.OPEN_NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
  }
  /**
   * @returns request scoped in-memory cache for tag values, or undefined if ALS is not available.
   */
  getItemsCache() {
    const store = globalThis.__openNextAls?.getStore();
    return store?.requestCache.getOrCreate("d1-nextMode:tagItems");
  }
};
_D1NextModeTagCache_instances = new WeakSet();
resolveTagValues_fn = async function(tags, db) {
  const result = /* @__PURE__ */ new Map();
  const uncachedTags = [];
  const itemsCache = this.getItemsCache();
  for (const tag of tags) {
    if (itemsCache?.has(tag)) {
      result.set(tag, itemsCache.get(tag) ?? null);
    } else {
      uncachedTags.push(tag);
    }
  }
  if (uncachedTags.length > 0) {
    const rows = await db.prepare(`SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag IN (${uncachedTags.map(() => "?").join(", ")})`).bind(...uncachedTags.map((tag) => this.getCacheKey(tag))).raw();
    const rowsByKey = new Map(rows.map((row) => [row[0], row]));
    for (const tag of uncachedTags) {
      const row = rowsByKey.get(this.getCacheKey(tag));
      const value = row ? {
        revalidatedAt: row[1] ?? 0,
        stale: row[2] ?? null,
        expire: row[3] ?? null
      } : null;
      itemsCache?.set(tag, value);
      result.set(tag, value);
    }
  }
  return result;
};
var d1_next_tag_cache_default = new D1NextModeTagCache();

// open-next.config.ts
var enableR2Cache = process.env.OPENNEXT_ENABLE_R2_CACHE !== "false";
var open_next_config_default = defineCloudflareConfig(
  enableR2Cache ? {
    incrementalCache: withRegionalCache(r2_incremental_cache_default, { mode: "long-lived" }),
    tagCache: d1_next_tag_cache_default,
    queue: do_queue_default
  } : {}
);
export {
  open_next_config_default as default
};
