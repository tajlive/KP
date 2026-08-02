
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "4.1.0";globalThis.nextVersion = "16.2.12";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
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
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
function initializeOnce() {
  if (initialized)
    return;
  cachedOrigins = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
  const functions = globalThis.openNextConfig.functions ?? {};
  for (const key in functions) {
    if (key !== "default") {
      const value = functions[key];
      const regexes = [];
      for (const pattern of value.patterns) {
        const regexPattern = `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`;
        regexes.push(new RegExp(regexPattern));
      }
      cachedPatterns.push({
        key,
        patterns: value.patterns,
        regexes
      });
    }
  }
  initialized = true;
}
var cachedOrigins, cachedPatterns, initialized, envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    cachedPatterns = [];
    initialized = false;
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          initializeOnce();
          for (const { key, patterns, regexes } of cachedPatterns) {
            for (const regex of regexes) {
              if (regex.test(_path)) {
                debug("Using origin", key, patterns);
                return cachedOrigins[key];
              }
            }
          }
          if (_path.startsWith("/_next/image") && cachedOrigins.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return cachedOrigins.imageOptimizer;
          }
          if (cachedOrigins.default) {
            debug("Using default origin", cachedOrigins.default, _path);
            return cachedOrigins.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream as ReadableStream2 } from "node:stream/web";
function toReadableStream(value, isBase64) {
  return new ReadableStream2({
    pull(controller) {
      controller.enqueue(Buffer.from(value, isBase64 ? "base64" : "utf8"));
      controller.close();
    }
  }, { highWaterMark: 0 });
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream2({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream2({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          const cur = responseHeaders[key];
          if (cur === void 0) {
            responseHeaders[key] = value;
          } else if (Array.isArray(cur)) {
            cur.push(value);
          } else {
            responseHeaders[key] = [cur, value];
          }
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/edge/chunks/[root-of-the-server]__1_x6o4q._.js
var require_root_of_the_server_1_x6o4q = __commonJS({
  ".next/server/edge/chunks/[root-of-the-server]__1_x6o4q._.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__1_x6o4q._.js", 478500, (e, o, t) => {
      o.exports = e.x("node:async_hooks", () => (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports)));
    }, 435825, (e, o, t) => {
      self._ENTRIES ||= {};
      let h = Promise.resolve().then(() => e.i(558217));
      h.catch(() => {
      }), self._ENTRIES.middleware_middleware = new Proxy(h, { get(e2, o2) {
        if ("then" === o2) return (o3, t3) => e2.then(o3, t3);
        let t2 = (...t3) => e2.then((e3) => (0, e3[o2])(...t3));
        return t2.then = (t3, h2) => e2.then((e3) => e3[o2]).then(t3, h2), t2;
      } });
    }]);
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node_modules/@opentelemetry/api/build/esm/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@opentelemetry/api/build/esm/version.js"() {
    VERSION = "1.9.1";
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  const acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  const rejectedVersions = /* @__PURE__ */ new Set();
  const myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return () => false;
  }
  const ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    const globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    const globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION);
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal(type, instance, diag3, allowOverride = false) {
  var _a;
  const api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    const err = new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    const err = new Error(`@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${VERSION}`);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug(`@opentelemetry/api: Registered a global for ${type} v${VERSION}.`);
  return true;
}
function getGlobal(type) {
  var _a, _b;
  const globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag3) {
  diag3.debug(`@opentelemetry/api: Unregistering a global for ${type} v${VERSION}.`);
  const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global;
var init_global_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_version();
    init_semver();
    major = VERSION.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${major}`);
    _global = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  const logger = getGlobal("diag");
  if (!logger) {
    return;
  }
  return logger[funcName](namespace, ...args);
}
var DiagComponentLogger;
var init_ComponentLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_global_utils();
    DiagComponentLogger = class {
      constructor(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      debug(...args) {
        return logProxy("debug", this._namespace, args);
      }
      error(...args) {
        return logProxy("error", this._namespace, args);
      }
      info(...args) {
        return logProxy("info", this._namespace, args);
      }
      warn(...args) {
        return logProxy("warn", this._namespace, args);
      }
      verbose(...args) {
        return logProxy("verbose", this._namespace, args);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger = logger || {};
  function _filterFunc(funcName, theLevel) {
    const theFunc = logger[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_types();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/diag.js
var API_NAME, DiagAPI;
var init_diag = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    API_NAME = "diag";
    DiagAPI = class _DiagAPI {
      /** Get the singleton instance of the DiagAPI API */
      static instance() {
        if (!this._instance) {
          this._instance = new _DiagAPI();
        }
        return this._instance;
      }
      /**
       * Private internal constructor
       * @private
       */
      constructor() {
        function _logProxy(funcName) {
          return function(...args) {
            const logger = getGlobal("diag");
            if (!logger)
              return;
            return logger[funcName](...args);
          };
        }
        const self2 = this;
        const setLogger = (logger, optionsOrLogLevel = { logLevel: DiagLogLevel.INFO }) => {
          var _a, _b, _c;
          if (logger === self2) {
            const err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          const oldLogger = getGlobal("diag");
          const newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            const stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn(`Current logger will be overwritten from ${stack}`);
            newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
          }
          return registerGlobal("diag", newLogger, self2, true);
        };
        self2.setLogger = setLogger;
        self2.disable = () => {
          unregisterGlobal(API_NAME, self2);
        };
        self2.createComponentLogger = (options) => {
          return new DiagComponentLogger(options);
        };
        self2.verbose = _logProxy("verbose");
        self2.debug = _logProxy("debug");
        self2.info = _logProxy("info");
        self2.warn = _logProxy("warn");
        self2.error = _logProxy("error");
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var BaggageImpl;
var init_baggage_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    BaggageImpl = class _BaggageImpl {
      constructor(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      getEntry(key) {
        const entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      }
      getAllEntries() {
        return Array.from(this._entries.entries());
      }
      setEntry(key, entry) {
        const newBaggage = new _BaggageImpl(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      }
      removeEntry(key) {
        const newBaggage = new _BaggageImpl(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      }
      removeEntries(...keys) {
        const newBaggage = new _BaggageImpl(this._entries);
        for (const key of keys) {
          newBaggage._entries.delete(key);
        }
        return newBaggage;
      }
      clear() {
        return new _BaggageImpl();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries = {}) {
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error(`Cannot create baggage metadata from unknown type: ${typeof str}`);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString() {
      return str;
    }
  };
}
var diag;
var init_utils2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    BaseContext = class _BaseContext {
      /**
       * Construct a new context which inherits values from an optional parent context.
       *
       * @param parentContext a context from which to inherit values
       */
      constructor(parentContext) {
        const self2 = this;
        self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self2.getValue = (key) => self2._currentContext.get(key);
        self2.setValue = (key, value) => {
          const context2 = new _BaseContext(self2._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self2.deleteValue = (key) => {
          const context2 = new _BaseContext(self2._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
    };
    ROOT_CONTEXT = new BaseContext();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, _originalConsoleMethods, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    _originalConsoleMethods = {};
    if (typeof console !== "undefined") {
      const keys = [
        "error",
        "warn",
        "info",
        "debug",
        "trace",
        "log"
      ];
      for (const key of keys) {
        if (typeof console[key] === "function") {
          _originalConsoleMethods[key] = console[key];
        }
      }
    }
    DiagConsoleLogger = class {
      constructor() {
        function _consoleFunc(funcName) {
          return function(...args) {
            let theFunc = _originalConsoleMethods[funcName];
            if (typeof theFunc !== "function") {
              theFunc = _originalConsoleMethods["log"];
            }
            if (typeof theFunc !== "function" && console) {
              theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
            }
            if (typeof theFunc === "function") {
              return theFunc.apply(console, args);
            }
          };
        }
        for (let i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    NoopMeter = class {
      constructor() {
      }
      /**
       * @see {@link Meter.createGauge}
       */
      createGauge(_name, _options) {
        return NOOP_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createHistogram}
       */
      createHistogram(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      }
      /**
       * @see {@link Meter.createCounter}
       */
      createCounter(_name, _options) {
        return NOOP_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createUpDownCounter}
       */
      createUpDownCounter(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableGauge}
       */
      createObservableGauge(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createObservableCounter}
       */
      createObservableCounter(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableUpDownCounter}
       */
      createObservableUpDownCounter(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.addBatchObservableCallback}
       */
      addBatchObservableCallback(_callback, _observables) {
      }
      /**
       * @see {@link Meter.removeBatchObservableCallback}
       */
      removeBatchObservableCallback(_callback) {
      }
    };
    NoopMetric = class {
    };
    NoopCounterMetric = class extends NoopMetric {
      add(_value, _attributes) {
      }
    };
    NoopUpDownCounterMetric = class extends NoopMetric {
      add(_value, _attributes) {
      }
    };
    NoopGaugeMetric = class extends NoopMetric {
      record(_value, _attributes) {
      }
    };
    NoopHistogramMetric = class extends NoopMetric {
      record(_value, _attributes) {
      }
    };
    NoopObservableMetric = class {
      addCallback(_callback) {
      }
      removeCallback(_callback) {
      }
    };
    NoopObservableCounterMetric = class extends NoopObservableMetric {
    };
    NoopObservableGaugeMetric = class extends NoopObservableMetric {
    };
    NoopObservableUpDownCounterMetric = class extends NoopObservableMetric {
    };
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    defaultTextMapGetter = {
      get(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var NoopContextManager;
var init_NoopContextManager = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_context();
    NoopContextManager = class {
      active() {
        return ROOT_CONTEXT;
      }
      with(_context, fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      bind(_context, target) {
        return target;
      }
      enable() {
        return this;
      }
      disable() {
        return this;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/api/context.js
var API_NAME2, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    API_NAME2 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = class _ContextAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
      }
      /** Get the singleton instance of the Context API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _ContextAPI();
        }
        return this._instance;
      }
      /**
       * Set the current context manager.
       *
       * @returns true if the context manager was successfully registered, else false
       */
      setGlobalContextManager(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      }
      /**
       * Get the currently active context
       */
      active() {
        return this._getContextManager().active();
      }
      /**
       * Execute a function with an active context
       *
       * @param context context to be active during function execution
       * @param fn function to execute in a context
       * @param thisArg optional receiver to be used for calling fn
       * @param args optional arguments forwarded to fn
       */
      with(context2, fn, thisArg, ...args) {
        return this._getContextManager().with(context2, fn, thisArg, ...args);
      }
      /**
       * Bind a context to a target function or event emitter
       *
       * @param context context to bind to the event emitter or function. Defaults to the currently active context
       * @param target function or event emitter to bind
       */
      bind(context2, target) {
        return this._getContextManager().bind(context2, target);
      }
      _getContextManager() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      }
      /** Disable and remove the global context manager */
      disable() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_invalid_span_constants();
    NonRecordingSpan = class {
      constructor(spanContext = INVALID_SPAN_CONTEXT) {
        this._spanContext = spanContext;
      }
      // Returns a SpanContext.
      spanContext() {
        return this._spanContext;
      }
      // By default does nothing
      setAttribute(_key, _value) {
        return this;
      }
      // By default does nothing
      setAttributes(_attributes) {
        return this;
      }
      // By default does nothing
      addEvent(_name, _attributes) {
        return this;
      }
      addLink(_link) {
        return this;
      }
      addLinks(_links) {
        return this;
      }
      // By default does nothing
      setStatus(_status) {
        return this;
      }
      // By default does nothing
      updateName(_name) {
        return this;
      }
      // By default does nothing
      end(_endTime) {
      }
      // isRecording always returns false for NonRecordingSpan.
      isRecording() {
        return false;
      }
      // By default does nothing
      recordException(_exception, _time) {
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidHex(id, length) {
  if (typeof id !== "string" || id.length !== length)
    return false;
  let r = 0;
  for (let i = 0; i < id.length; i += 4) {
    r += (isHex[id.charCodeAt(i)] | 0) + (isHex[id.charCodeAt(i + 1)] | 0) + (isHex[id.charCodeAt(i + 2)] | 0) + (isHex[id.charCodeAt(i + 3)] | 0);
  }
  return r === length;
}
function isValidTraceId(traceId) {
  return isValidHex(traceId, 32) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return isValidHex(spanId, 16) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var isHex;
var init_spancontext_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_invalid_span_constants();
    init_NonRecordingSpan();
    isHex = new Uint8Array([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1
    ]);
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return spanContext !== null && typeof spanContext === "object" && "spanId" in spanContext && typeof spanContext["spanId"] === "string" && "traceId" in spanContext && typeof spanContext["traceId"] === "string" && "traceFlags" in spanContext && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = class {
      // startSpan starts a noop span.
      startSpan(name, options, context2 = contextApi.active()) {
        const root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        const parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      }
      startActiveSpan(name, arg2, arg3, arg4) {
        let opts;
        let ctx;
        let fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        const parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        const span = this.startSpan(name, opts, parentContext);
        const contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = class {
      constructor(provider, name, version, options) {
        this._provider = provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      startSpan(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      }
      startActiveSpan(_name, _options, _context, _fn) {
        const tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      }
      /**
       * Try to get a tracer from the proxy tracer provider.
       * If the proxy tracer provider has no delegate, return a noop tracer.
       */
      _getTracer() {
        if (this._delegate) {
          return this._delegate;
        }
        const tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_NoopTracer();
    NoopTracerProvider = class {
      getTracer(_name, _version, _options) {
        return new NoopTracer();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = class {
      /**
       * Get a {@link ProxyTracer}
       */
      getTracer(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      }
      getDelegate() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      }
      /**
       * Set the delegate tracer provider
       */
      setDelegate(delegate) {
        this._delegate = delegate;
      }
      getDelegateTracer(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
    VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
    VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = class _TraceStateImpl {
      constructor(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      set(key, value) {
        const traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      }
      unset(key) {
        const traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      }
      get(key) {
        return this._internalState.get(key);
      }
      serialize() {
        return Array.from(this._internalState.keys()).reduceRight((agg, key) => {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      }
      _parse(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reduceRight((agg, part) => {
          const listMember = part.trim();
          const i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            const key = listMember.slice(0, i);
            const value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      }
      // @ts-expect-error TS6133 Accessed in tests only.
      _keys() {
        return Array.from(this._internalState.keys()).reverse();
      }
      _clone() {
        const traceState = new _TraceStateImpl();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils3 = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_tracestate_impl();
  }
});

// node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_NoopMeter();
    NoopMeterProvider = class {
      getMeter(_name, _version, _options) {
        return NOOP_METER;
      }
    };
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME3, MetricsAPI;
var init_metrics = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME3 = "metrics";
    MetricsAPI = class _MetricsAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
      }
      /** Get the singleton instance of the Metrics API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _MetricsAPI();
        }
        return this._instance;
      }
      /**
       * Set the current global meter provider.
       * Returns true if the meter provider was successfully registered, else false.
       */
      setGlobalMeterProvider(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      }
      /**
       * Returns the global meter provider.
       */
      getMeterProvider() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      }
      /**
       * Returns a meter from the global meter provider.
       */
      getMeter(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      }
      /** Remove the global meter provider */
      disable() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    NoopTextMapPropagator = class {
      /** Noop inject function does nothing */
      inject(_context, _carrier) {
      }
      /** Noop extract function does nothing and returns the input context */
      extract(context2, _carrier) {
        return context2;
      }
      fields() {
        return [];
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils2();
    init_diag();
    API_NAME4 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = class _PropagationAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      /** Get the singleton instance of the Propagator API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _PropagationAPI();
        }
        return this._instance;
      }
      /**
       * Set the current propagator.
       *
       * @returns true if the propagator was successfully registered, else false
       */
      setGlobalPropagator(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      }
      /**
       * Inject context into a carrier to be propagated inter-process
       *
       * @param context Context carrying tracing data to inject
       * @param carrier carrier to inject context into
       * @param setter Function used to set values on the carrier
       */
      inject(context2, carrier, setter = defaultTextMapSetter) {
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      }
      /**
       * Extract context from a carrier
       *
       * @param context Context which the newly created context will inherit from
       * @param carrier Carrier to extract context from
       * @param getter Function used to extract keys from a carrier
       */
      extract(context2, carrier, getter = defaultTextMapGetter) {
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      }
      /**
       * Return a list of all fields which may be used by the propagator.
       */
      fields() {
        return this._getGlobalPropagator().fields();
      }
      /** Remove the global propagator */
      disable() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      }
      _getGlobalPropagator() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5, TraceAPI;
var init_trace = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME5 = "trace";
    TraceAPI = class _TraceAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      /** Get the singleton instance of the Trace API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _TraceAPI();
        }
        return this._instance;
      }
      /**
       * Set the current global tracer.
       *
       * @returns true if the tracer provider was successfully registered, else false
       */
      setGlobalTracerProvider(provider) {
        const success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      }
      /**
       * Returns the global tracer provider.
       */
      getTracerProvider() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      }
      /**
       * Returns a tracer from the global tracer provider.
       */
      getTracer(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      }
      /** Remove the global tracer provider */
      disable() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm = __esm({
  "node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_utils2();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils3();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// .next/server/edge/chunks/[root-of-the-server]__0fsa3kx._.js
var require_root_of_the_server_0fsa3kx = __commonJS({
  ".next/server/edge/chunks/[root-of-the-server]__0fsa3kx._.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__0fsa3kx._.js", 674398, (e, t, r) => {
    }, 940054, (e, t, r) => {
      "use strict";
      var n = Object.defineProperty, s = Object.getOwnPropertyDescriptor, i = Object.getOwnPropertyNames, a = Object.prototype.hasOwnProperty, o = {}, l = { RequestCookies: () => g, ResponseCookies: () => m, parseCookie: () => h, parseSetCookie: () => d, stringifyCookie: () => c };
      for (var u in l) n(o, u, { get: l[u], enumerable: true });
      function c(e2) {
        var t2;
        let r2 = ["path" in e2 && e2.path && `Path=${e2.path}`, "expires" in e2 && (e2.expires || 0 === e2.expires) && `Expires=${("number" == typeof e2.expires ? new Date(e2.expires) : e2.expires).toUTCString()}`, "maxAge" in e2 && "number" == typeof e2.maxAge && `Max-Age=${e2.maxAge}`, "domain" in e2 && e2.domain && `Domain=${e2.domain}`, "secure" in e2 && e2.secure && "Secure", "httpOnly" in e2 && e2.httpOnly && "HttpOnly", "sameSite" in e2 && e2.sameSite && `SameSite=${e2.sameSite}`, "partitioned" in e2 && e2.partitioned && "Partitioned", "priority" in e2 && e2.priority && `Priority=${e2.priority}`].filter(Boolean), n2 = `${e2.name}=${encodeURIComponent(null != (t2 = e2.value) ? t2 : "")}`;
        return 0 === r2.length ? n2 : `${n2}; ${r2.join("; ")}`;
      }
      function h(e2) {
        let t2 = /* @__PURE__ */ new Map();
        for (let r2 of e2.split(/; */)) {
          if (!r2) continue;
          let e3 = r2.indexOf("=");
          if (-1 === e3) {
            t2.set(r2, "true");
            continue;
          }
          let [n2, s2] = [r2.slice(0, e3), r2.slice(e3 + 1)];
          try {
            t2.set(n2, decodeURIComponent(null != s2 ? s2 : "true"));
          } catch {
          }
        }
        return t2;
      }
      function d(e2) {
        if (!e2) return;
        let [[t2, r2], ...n2] = h(e2), { domain: s2, expires: i2, httponly: a2, maxage: o2, path: l2, samesite: u2, secure: c2, partitioned: d2, priority: g2 } = Object.fromEntries(n2.map(([e3, t3]) => [e3.toLowerCase().replace(/-/g, ""), t3]));
        {
          var m2, y, _ = { name: t2, value: decodeURIComponent(r2), domain: s2, ...i2 && { expires: new Date(i2) }, ...a2 && { httpOnly: true }, ..."string" == typeof o2 && { maxAge: Number(o2) }, path: l2, ...u2 && { sameSite: p.includes(m2 = (m2 = u2).toLowerCase()) ? m2 : void 0 }, ...c2 && { secure: true }, ...g2 && { priority: f.includes(y = (y = g2).toLowerCase()) ? y : void 0 }, ...d2 && { partitioned: true } };
          let e3 = {};
          for (let t3 in _) _[t3] && (e3[t3] = _[t3]);
          return e3;
        }
      }
      t.exports = ((e2, t2, r2, o2) => {
        if (t2 && "object" == typeof t2 || "function" == typeof t2) for (let l2 of i(t2)) a.call(e2, l2) || l2 === r2 || n(e2, l2, { get: () => t2[l2], enumerable: !(o2 = s(t2, l2)) || o2.enumerable });
        return e2;
      })(n({}, "__esModule", { value: true }), o);
      var p = ["strict", "lax", "none"], f = ["low", "medium", "high"], g = class {
        constructor(e2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          const t2 = e2.get("cookie");
          if (t2) for (const [e3, r2] of h(t2)) this._parsed.set(e3, { name: e3, value: r2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed);
          if (!e2.length) return r2.map(([e3, t3]) => t3);
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter(([e3]) => e3 === n2).map(([e3, t3]) => t3);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2] = 1 === e2.length ? [e2[0].name, e2[0].value] : e2, n2 = this._parsed;
          return n2.set(t2, { name: t2, value: r2 }), this._headers.set("cookie", Array.from(n2).map(([e3, t3]) => c(t3)).join("; ")), this;
        }
        delete(e2) {
          let t2 = this._parsed, r2 = Array.isArray(e2) ? e2.map((e3) => t2.delete(e3)) : t2.delete(e2);
          return this._headers.set("cookie", Array.from(t2).map(([e3, t3]) => c(t3)).join("; ")), r2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((e2) => `${e2.name}=${encodeURIComponent(e2.value)}`).join("; ");
        }
      }, m = class {
        constructor(e2) {
          var t2, r2, n2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          const s2 = null != (n2 = null != (r2 = null == (t2 = e2.getSetCookie) ? void 0 : t2.call(e2)) ? r2 : e2.get("set-cookie")) ? n2 : [];
          for (const e3 of Array.isArray(s2) ? s2 : function(e4) {
            if (!e4) return [];
            var t3, r3, n3, s3, i2, a2 = [], o2 = 0;
            function l2() {
              for (; o2 < e4.length && /\s/.test(e4.charAt(o2)); ) o2 += 1;
              return o2 < e4.length;
            }
            for (; o2 < e4.length; ) {
              for (t3 = o2, i2 = false; l2(); ) if ("," === (r3 = e4.charAt(o2))) {
                for (n3 = o2, o2 += 1, l2(), s3 = o2; o2 < e4.length && "=" !== (r3 = e4.charAt(o2)) && ";" !== r3 && "," !== r3; ) o2 += 1;
                o2 < e4.length && "=" === e4.charAt(o2) ? (i2 = true, o2 = s3, a2.push(e4.substring(t3, n3)), t3 = o2) : o2 = n3 + 1;
              } else o2 += 1;
              (!i2 || o2 >= e4.length) && a2.push(e4.substring(t3, e4.length));
            }
            return a2;
          }(s2)) {
            const t3 = d(e3);
            t3 && this._parsed.set(t3.name, t3);
          }
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed.values());
          if (!e2.length) return r2;
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter((e3) => e3.name === n2);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2, n2] = 1 === e2.length ? [e2[0].name, e2[0].value, e2[0]] : e2, s2 = this._parsed;
          return s2.set(t2, function(e3 = { name: "", value: "" }) {
            return "number" == typeof e3.expires && (e3.expires = new Date(e3.expires)), e3.maxAge && (e3.expires = new Date(Date.now() + 1e3 * e3.maxAge)), (null === e3.path || void 0 === e3.path) && (e3.path = "/"), e3;
          }({ name: t2, value: r2, ...n2 })), function(e3, t3) {
            for (let [, r3] of (t3.delete("set-cookie"), e3)) {
              let e4 = c(r3);
              t3.append("set-cookie", e4);
            }
          }(s2, this._headers), this;
        }
        delete(...e2) {
          let [t2, r2] = "string" == typeof e2[0] ? [e2[0]] : [e2[0].name, e2[0]];
          return this.set({ ...r2, name: t2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(c).join("; ");
        }
      };
    }, 311646, (e) => {
      "use strict";
      var t, r, n, s, i, a, o, l, u, c, h, d;
      function p(e2) {
        return Symbol.for(e2);
      }
      class f {
        constructor(e2) {
          const t2 = this;
          t2._currentContext = e2 ? new Map(e2) : /* @__PURE__ */ new Map(), t2.getValue = (e3) => t2._currentContext.get(e3), t2.setValue = (e3, r2) => {
            let n2 = new f(t2._currentContext);
            return n2._currentContext.set(e3, r2), n2;
          }, t2.deleteValue = (e3) => {
            let r2 = new f(t2._currentContext);
            return r2._currentContext.delete(e3), r2;
          };
        }
      }
      let g = new f(), m = "1.9.1", y = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/, _ = function(e2) {
        let t2 = /* @__PURE__ */ new Set([e2]), r2 = /* @__PURE__ */ new Set(), n2 = e2.match(y);
        if (!n2) return () => false;
        let s2 = { major: +n2[1], minor: +n2[2], patch: +n2[3], prerelease: n2[4] };
        if (null != s2.prerelease) return function(t3) {
          return t3 === e2;
        };
        function i2(e3) {
          return r2.add(e3), false;
        }
        return function(e3) {
          if (t2.has(e3)) return true;
          if (r2.has(e3)) return false;
          let n3 = e3.match(y);
          if (!n3) return i2(e3);
          let a2 = { major: +n3[1], minor: +n3[2], patch: +n3[3], prerelease: n3[4] };
          if (null != a2.prerelease || s2.major !== a2.major) return i2(e3);
          if (0 === s2.major) return s2.minor === a2.minor && s2.patch <= a2.patch ? (t2.add(e3), true) : i2(e3);
          return s2.minor <= a2.minor ? (t2.add(e3), true) : i2(e3);
        };
      }(m), w = m.split(".")[0], b = Symbol.for(`opentelemetry.js.api.${w}`), v = "object" == typeof globalThis ? globalThis : "object" == typeof self ? self : e.g;
      function k(e2, t2, r2, n2 = false) {
        var s2;
        let i2 = v[b] = null != (s2 = v[b]) ? s2 : { version: m };
        if (!n2 && i2[e2]) {
          let t3 = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${e2}`);
          return r2.error(t3.stack || t3.message), false;
        }
        if (i2.version !== m) {
          let t3 = Error(`@opentelemetry/api: Registration of version v${i2.version} for ${e2} does not match previously registered API v${m}`);
          return r2.error(t3.stack || t3.message), false;
        }
        return i2[e2] = t2, r2.debug(`@opentelemetry/api: Registered a global for ${e2} v${m}.`), true;
      }
      function E(e2) {
        var t2, r2;
        let n2 = null == (t2 = v[b]) ? void 0 : t2.version;
        if (n2 && _(n2)) return null == (r2 = v[b]) ? void 0 : r2[e2];
      }
      function S(e2, t2) {
        t2.debug(`@opentelemetry/api: Unregistering a global for ${e2} v${m}.`);
        let r2 = v[b];
        r2 && delete r2[e2];
      }
      class T {
        constructor(e2) {
          this._namespace = e2.namespace || "DiagComponentLogger";
        }
        debug(...e2) {
          return R("debug", this._namespace, e2);
        }
        error(...e2) {
          return R("error", this._namespace, e2);
        }
        info(...e2) {
          return R("info", this._namespace, e2);
        }
        warn(...e2) {
          return R("warn", this._namespace, e2);
        }
        verbose(...e2) {
          return R("verbose", this._namespace, e2);
        }
      }
      function R(e2, t2, r2) {
        let n2 = E("diag");
        if (n2) return n2[e2](t2, ...r2);
      }
      (o = t || (t = {}))[o.NONE = 0] = "NONE", o[o.ERROR = 30] = "ERROR", o[o.WARN = 50] = "WARN", o[o.INFO = 60] = "INFO", o[o.DEBUG = 70] = "DEBUG", o[o.VERBOSE = 80] = "VERBOSE", o[o.ALL = 9999] = "ALL";
      class C {
        static instance() {
          return this._instance || (this._instance = new C()), this._instance;
        }
        constructor() {
          function e2(e3) {
            return function(...t2) {
              let r3 = E("diag");
              if (r3) return r3[e3](...t2);
            };
          }
          const r2 = this, n2 = (e3, n3 = { logLevel: t.INFO }) => {
            var s2, i2, a2;
            if (e3 === r2) {
              let e4 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
              return r2.error(null != (s2 = e4.stack) ? s2 : e4.message), false;
            }
            "number" == typeof n3 && (n3 = { logLevel: n3 });
            let o2 = E("diag"), l2 = function(e4, r3) {
              function n4(t2, n5) {
                let s3 = r3[t2];
                return "function" == typeof s3 && e4 >= n5 ? s3.bind(r3) : function() {
                };
              }
              return e4 < t.NONE ? e4 = t.NONE : e4 > t.ALL && (e4 = t.ALL), r3 = r3 || {}, { error: n4("error", t.ERROR), warn: n4("warn", t.WARN), info: n4("info", t.INFO), debug: n4("debug", t.DEBUG), verbose: n4("verbose", t.VERBOSE) };
            }(null != (i2 = n3.logLevel) ? i2 : t.INFO, e3);
            if (o2 && !n3.suppressOverrideMessage) {
              let e4 = null != (a2 = Error().stack) ? a2 : "<failed to generate stacktrace>";
              o2.warn(`Current logger will be overwritten from ${e4}`), l2.warn(`Current logger will overwrite one already registered from ${e4}`);
            }
            return k("diag", l2, r2, true);
          };
          r2.setLogger = n2, r2.disable = () => {
            S("diag", r2);
          }, r2.createComponentLogger = (e3) => new T(e3), r2.verbose = e2("verbose"), r2.debug = e2("debug"), r2.info = e2("info"), r2.warn = e2("warn"), r2.error = e2("error");
        }
      }
      let x = "context", O = new class {
        active() {
          return g;
        }
        with(e2, t2, r2, ...n2) {
          return t2.call(r2, ...n2);
        }
        bind(e2, t2) {
          return t2;
        }
        enable() {
          return this;
        }
        disable() {
          return this;
        }
      }();
      class A {
        static getInstance() {
          return this._instance || (this._instance = new A()), this._instance;
        }
        setGlobalContextManager(e2) {
          return k(x, e2, C.instance());
        }
        active() {
          return this._getContextManager().active();
        }
        with(e2, t2, r2, ...n2) {
          return this._getContextManager().with(e2, t2, r2, ...n2);
        }
        bind(e2, t2) {
          return this._getContextManager().bind(e2, t2);
        }
        _getContextManager() {
          return E(x) || O;
        }
        disable() {
          this._getContextManager().disable(), S(x, C.instance());
        }
      }
      let P = A.getInstance(), I = C.instance();
      class N {
      }
      class j {
        addCallback(e2) {
        }
        removeCallback(e2) {
        }
      }
      let $ = new class {
        createGauge(e2, t2) {
          return D;
        }
        createHistogram(e2, t2) {
          return U;
        }
        createCounter(e2, t2) {
          return L;
        }
        createUpDownCounter(e2, t2) {
          return M;
        }
        createObservableGauge(e2, t2) {
          return B;
        }
        createObservableCounter(e2, t2) {
          return q;
        }
        createObservableUpDownCounter(e2, t2) {
          return H;
        }
        addBatchObservableCallback(e2, t2) {
        }
        removeBatchObservableCallback(e2) {
        }
      }(), L = new class extends N {
        add(e2, t2) {
        }
      }(), D = new class extends N {
        record(e2, t2) {
        }
      }(), U = new class extends N {
        record(e2, t2) {
        }
      }(), M = new class extends N {
        add(e2, t2) {
        }
      }(), q = new class extends j {
      }(), B = new class extends j {
      }(), H = new class extends j {
      }(), G = new class {
        getMeter(e2, t2, r2) {
          return $;
        }
      }(), F = "metrics";
      class W {
        static getInstance() {
          return this._instance || (this._instance = new W()), this._instance;
        }
        setGlobalMeterProvider(e2) {
          return k(F, e2, C.instance());
        }
        getMeterProvider() {
          return E(F) || G;
        }
        getMeter(e2, t2, r2) {
          return this.getMeterProvider().getMeter(e2, t2, r2);
        }
        disable() {
          S(F, C.instance());
        }
      }
      let z = W.getInstance(), K = { get(e2, t2) {
        if (null != e2) return e2[t2];
      }, keys: (e2) => null == e2 ? [] : Object.keys(e2) }, V = { set(e2, t2, r2) {
        null != e2 && (e2[t2] = r2);
      } }, J = p("OpenTelemetry Baggage Key");
      function X(e2) {
        return e2.getValue(J) || void 0;
      }
      function Y() {
        return X(A.getInstance().active());
      }
      function Z(e2, t2) {
        return e2.setValue(J, t2);
      }
      function Q(e2) {
        return e2.deleteValue(J);
      }
      class ee {
        constructor(e2) {
          this._entries = e2 ? new Map(e2) : /* @__PURE__ */ new Map();
        }
        getEntry(e2) {
          let t2 = this._entries.get(e2);
          if (t2) return Object.assign({}, t2);
        }
        getAllEntries() {
          return Array.from(this._entries.entries());
        }
        setEntry(e2, t2) {
          let r2 = new ee(this._entries);
          return r2._entries.set(e2, t2), r2;
        }
        removeEntry(e2) {
          let t2 = new ee(this._entries);
          return t2._entries.delete(e2), t2;
        }
        removeEntries(...e2) {
          let t2 = new ee(this._entries);
          for (let r2 of e2) t2._entries.delete(r2);
          return t2;
        }
        clear() {
          return new ee();
        }
      }
      let et = Symbol("BaggageEntryMetadata"), er = C.instance();
      function en(e2 = {}) {
        return new ee(new Map(Object.entries(e2)));
      }
      let es = "propagation", ei = new class {
        inject(e2, t2) {
        }
        extract(e2, t2) {
          return e2;
        }
        fields() {
          return [];
        }
      }();
      class ea {
        constructor() {
          this.createBaggage = en, this.getBaggage = X, this.getActiveBaggage = Y, this.setBaggage = Z, this.deleteBaggage = Q;
        }
        static getInstance() {
          return this._instance || (this._instance = new ea()), this._instance;
        }
        setGlobalPropagator(e2) {
          return k(es, e2, C.instance());
        }
        inject(e2, t2, r2 = V) {
          return this._getGlobalPropagator().inject(e2, t2, r2);
        }
        extract(e2, t2, r2 = K) {
          return this._getGlobalPropagator().extract(e2, t2, r2);
        }
        fields() {
          return this._getGlobalPropagator().fields();
        }
        disable() {
          S(es, C.instance());
        }
        _getGlobalPropagator() {
          return E(es) || ei;
        }
      }
      let eo = ea.getInstance();
      (l = r || (r = {}))[l.NONE = 0] = "NONE", l[l.SAMPLED = 1] = "SAMPLED";
      let el = "0000000000000000", eu = "00000000000000000000000000000000", ec = { traceId: eu, spanId: el, traceFlags: r.NONE };
      class eh {
        constructor(e2 = ec) {
          this._spanContext = e2;
        }
        spanContext() {
          return this._spanContext;
        }
        setAttribute(e2, t2) {
          return this;
        }
        setAttributes(e2) {
          return this;
        }
        addEvent(e2, t2) {
          return this;
        }
        addLink(e2) {
          return this;
        }
        addLinks(e2) {
          return this;
        }
        setStatus(e2) {
          return this;
        }
        updateName(e2) {
          return this;
        }
        end(e2) {
        }
        isRecording() {
          return false;
        }
        recordException(e2, t2) {
        }
      }
      let ed = p("OpenTelemetry Context Key SPAN");
      function ep(e2) {
        return e2.getValue(ed) || void 0;
      }
      function ef() {
        return ep(A.getInstance().active());
      }
      function eg(e2, t2) {
        return e2.setValue(ed, t2);
      }
      function em(e2) {
        return e2.deleteValue(ed);
      }
      function ey(e2, t2) {
        return eg(e2, new eh(t2));
      }
      function e_(e2) {
        var t2;
        return null == (t2 = ep(e2)) ? void 0 : t2.spanContext();
      }
      let ew = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
      function eb(e2, t2) {
        if ("string" != typeof e2 || e2.length !== t2) return false;
        let r2 = 0;
        for (let t3 = 0; t3 < e2.length; t3 += 4) r2 += (0 | ew[e2.charCodeAt(t3)]) + (0 | ew[e2.charCodeAt(t3 + 1)]) + (0 | ew[e2.charCodeAt(t3 + 2)]) + (0 | ew[e2.charCodeAt(t3 + 3)]);
        return r2 === t2;
      }
      function ev(e2) {
        return eb(e2, 32) && e2 !== eu;
      }
      function ek(e2) {
        return eb(e2, 16) && e2 !== el;
      }
      function eE(e2) {
        return ev(e2.traceId) && ek(e2.spanId);
      }
      function eS(e2) {
        return new eh(e2);
      }
      let eT = A.getInstance();
      class eR {
        startSpan(e2, t2, r2 = eT.active()) {
          var n2;
          if (null == t2 ? void 0 : t2.root) return new eh();
          let s2 = r2 && e_(r2);
          return null !== (n2 = s2) && "object" == typeof n2 && "spanId" in n2 && "string" == typeof n2.spanId && "traceId" in n2 && "string" == typeof n2.traceId && "traceFlags" in n2 && "number" == typeof n2.traceFlags && eE(s2) ? new eh(s2) : new eh();
        }
        startActiveSpan(e2, t2, r2, n2) {
          let s2, i2, a2;
          if (arguments.length < 2) return;
          2 == arguments.length ? a2 = t2 : 3 == arguments.length ? (s2 = t2, a2 = r2) : (s2 = t2, i2 = r2, a2 = n2);
          let o2 = null != i2 ? i2 : eT.active(), l2 = this.startSpan(e2, s2, o2), u2 = eg(o2, l2);
          return eT.with(u2, a2, void 0, l2);
        }
      }
      let eC = new eR();
      class ex {
        constructor(e2, t2, r2, n2) {
          this._provider = e2, this.name = t2, this.version = r2, this.options = n2;
        }
        startSpan(e2, t2, r2) {
          return this._getTracer().startSpan(e2, t2, r2);
        }
        startActiveSpan(e2, t2, r2, n2) {
          let s2 = this._getTracer();
          return Reflect.apply(s2.startActiveSpan, s2, arguments);
        }
        _getTracer() {
          if (this._delegate) return this._delegate;
          let e2 = this._provider.getDelegateTracer(this.name, this.version, this.options);
          return e2 ? (this._delegate = e2, this._delegate) : eC;
        }
      }
      let eO = new class {
        getTracer(e2, t2, r2) {
          return new eR();
        }
      }();
      class eA {
        getTracer(e2, t2, r2) {
          var n2;
          return null != (n2 = this.getDelegateTracer(e2, t2, r2)) ? n2 : new ex(this, e2, t2, r2);
        }
        getDelegate() {
          var e2;
          return null != (e2 = this._delegate) ? e2 : eO;
        }
        setDelegate(e2) {
          this._delegate = e2;
        }
        getDelegateTracer(e2, t2, r2) {
          var n2;
          return null == (n2 = this._delegate) ? void 0 : n2.getTracer(e2, t2, r2);
        }
      }
      let eP = "trace";
      class eI {
        constructor() {
          this._proxyTracerProvider = new eA(), this.wrapSpanContext = eS, this.isSpanContextValid = eE, this.deleteSpan = em, this.getSpan = ep, this.getActiveSpan = ef, this.getSpanContext = e_, this.setSpan = eg, this.setSpanContext = ey;
        }
        static getInstance() {
          return this._instance || (this._instance = new eI()), this._instance;
        }
        setGlobalTracerProvider(e2) {
          let t2 = k(eP, this._proxyTracerProvider, C.instance());
          return t2 && this._proxyTracerProvider.setDelegate(e2), t2;
        }
        getTracerProvider() {
          return E(eP) || this._proxyTracerProvider;
        }
        getTracer(e2, t2) {
          return this.getTracerProvider().getTracer(e2, t2);
        }
        disable() {
          S(eP, C.instance()), this._proxyTracerProvider = new eA();
        }
      }
      let eN = eI.getInstance(), ej = { context: P, diag: I, metrics: z, propagation: eo, trace: eN };
      e.s(["default", 0, ej], 47071), e.i(47071);
      let e$ = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }], eL = {};
      if ("u" > typeof console) for (let e2 of ["error", "warn", "info", "debug", "trace", "log"]) "function" == typeof console[e2] && (eL[e2] = console[e2]);
      (u = n || (n = {}))[u.INT = 0] = "INT", u[u.DOUBLE = 1] = "DOUBLE", (c = s || (s = {}))[c.NOT_RECORD = 0] = "NOT_RECORD", c[c.RECORD = 1] = "RECORD", c[c.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED", (h = i || (i = {}))[h.INTERNAL = 0] = "INTERNAL", h[h.SERVER = 1] = "SERVER", h[h.CLIENT = 2] = "CLIENT", h[h.PRODUCER = 3] = "PRODUCER", h[h.CONSUMER = 4] = "CONSUMER", (d = a || (a = {}))[d.UNSET = 0] = "UNSET", d[d.OK = 1] = "OK", d[d.ERROR = 2] = "ERROR";
      let eD = "[_0-9a-z-*/]", eU = `[a-z]${eD}{0,255}`, eM = `[a-z0-9]${eD}{0,240}@[a-z]${eD}{0,13}`, eq = RegExp(`^(?:${eU}|${eM})$`), eB = /^[ -~]{0,255}[!-~]$/, eH = /,|=/;
      class eG {
        constructor(e2) {
          this._internalState = /* @__PURE__ */ new Map(), e2 && this._parse(e2);
        }
        set(e2, t2) {
          let r2 = this._clone();
          return r2._internalState.has(e2) && r2._internalState.delete(e2), r2._internalState.set(e2, t2), r2;
        }
        unset(e2) {
          let t2 = this._clone();
          return t2._internalState.delete(e2), t2;
        }
        get(e2) {
          return this._internalState.get(e2);
        }
        serialize() {
          return Array.from(this._internalState.keys()).reduceRight((e2, t2) => (e2.push(t2 + "=" + this.get(t2)), e2), []).join(",");
        }
        _parse(e2) {
          !(e2.length > 512) && (this._internalState = e2.split(",").reduceRight((e3, t2) => {
            let r2 = t2.trim(), n2 = r2.indexOf("=");
            if (-1 !== n2) {
              let s2 = r2.slice(0, n2), i2 = r2.slice(n2 + 1, t2.length);
              eq.test(s2) && eB.test(i2) && !eH.test(i2) && e3.set(s2, i2);
            }
            return e3;
          }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
        }
        _keys() {
          return Array.from(this._internalState.keys()).reverse();
        }
        _clone() {
          let e2 = new eG();
          return e2._internalState = new Map(this._internalState), e2;
        }
      }
      e.s(["DiagConsoleLogger", 0, class {
        constructor() {
          for (let e2 = 0; e2 < e$.length; e2++) this[e$[e2].n] = /* @__PURE__ */ function(e3) {
            return function(...t2) {
              let r2 = eL[e3];
              if ("function" != typeof r2 && (r2 = eL.log), "function" != typeof r2 && console && "function" != typeof (r2 = console[e3]) && (r2 = console.log), "function" == typeof r2) return r2.apply(console, t2);
            };
          }(e$[e2].c);
        }
      }, "DiagLogLevel", 0, t, "INVALID_SPANID", 0, el, "INVALID_SPAN_CONTEXT", 0, ec, "INVALID_TRACEID", 0, eu, "ProxyTracer", 0, ex, "ProxyTracerProvider", 0, eA, "ROOT_CONTEXT", 0, g, "SamplingDecision", 0, s, "SpanKind", 0, i, "SpanStatusCode", 0, a, "TraceFlags", 0, r, "ValueType", 0, n, "baggageEntryMetadataFromString", 0, function(e2) {
        return "string" != typeof e2 && (er.error(`Cannot create baggage metadata from unknown type: ${typeof e2}`), e2 = ""), { __TYPE__: et, toString: () => e2 };
      }, "context", 0, P, "createContextKey", 0, p, "createNoopMeter", 0, function() {
        return $;
      }, "createTraceState", 0, function(e2) {
        return new eG(e2);
      }, "default", 0, ej, "defaultTextMapGetter", 0, K, "defaultTextMapSetter", 0, V, "diag", 0, I, "isSpanContextValid", 0, eE, "isValidSpanId", 0, ek, "isValidTraceId", 0, ev, "metrics", 0, z, "propagation", 0, eo, "trace", 0, eN], 311646);
    }, 871498, (e, t, r) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "/ROOT/node_modules/next/dist/compiled/cookie/");
        var e2, r2, n, s, i = {};
        i.parse = function(t2, r3) {
          if ("string" != typeof t2) throw TypeError("argument str must be a string");
          for (var s2 = {}, i2 = t2.split(n), a = (r3 || {}).decode || e2, o = 0; o < i2.length; o++) {
            var l = i2[o], u = l.indexOf("=");
            if (!(u < 0)) {
              var c = l.substr(0, u).trim(), h = l.substr(++u, l.length).trim();
              '"' == h[0] && (h = h.slice(1, -1)), void 0 == s2[c] && (s2[c] = function(e3, t3) {
                try {
                  return t3(e3);
                } catch (t4) {
                  return e3;
                }
              }(h, a));
            }
          }
          return s2;
        }, i.serialize = function(e3, t2, n2) {
          var i2 = n2 || {}, a = i2.encode || r2;
          if ("function" != typeof a) throw TypeError("option encode is invalid");
          if (!s.test(e3)) throw TypeError("argument name is invalid");
          var o = a(t2);
          if (o && !s.test(o)) throw TypeError("argument val is invalid");
          var l = e3 + "=" + o;
          if (null != i2.maxAge) {
            var u = i2.maxAge - 0;
            if (isNaN(u) || !isFinite(u)) throw TypeError("option maxAge is invalid");
            l += "; Max-Age=" + Math.floor(u);
          }
          if (i2.domain) {
            if (!s.test(i2.domain)) throw TypeError("option domain is invalid");
            l += "; Domain=" + i2.domain;
          }
          if (i2.path) {
            if (!s.test(i2.path)) throw TypeError("option path is invalid");
            l += "; Path=" + i2.path;
          }
          if (i2.expires) {
            if ("function" != typeof i2.expires.toUTCString) throw TypeError("option expires is invalid");
            l += "; Expires=" + i2.expires.toUTCString();
          }
          if (i2.httpOnly && (l += "; HttpOnly"), i2.secure && (l += "; Secure"), i2.sameSite) switch ("string" == typeof i2.sameSite ? i2.sameSite.toLowerCase() : i2.sameSite) {
            case true:
            case "strict":
              l += "; SameSite=Strict";
              break;
            case "lax":
              l += "; SameSite=Lax";
              break;
            case "none":
              l += "; SameSite=None";
              break;
            default:
              throw TypeError("option sameSite is invalid");
          }
          return l;
        }, e2 = decodeURIComponent, r2 = encodeURIComponent, n = /; */, s = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, t.exports = i;
      })();
    }, 299734, (e, t, r) => {
      (() => {
        "use strict";
        let e2, r2, n, s, i;
        var a = { 993: (e3) => {
          var t2 = Object.prototype.hasOwnProperty, r3 = "~";
          function n2() {
          }
          function s2(e4, t3, r4) {
            this.fn = e4, this.context = t3, this.once = r4 || false;
          }
          function i2(e4, t3, n3, i3, a3) {
            if ("function" != typeof n3) throw TypeError("The listener must be a function");
            var o3 = new s2(n3, i3 || e4, a3), l2 = r3 ? r3 + t3 : t3;
            return e4._events[l2] ? e4._events[l2].fn ? e4._events[l2] = [e4._events[l2], o3] : e4._events[l2].push(o3) : (e4._events[l2] = o3, e4._eventsCount++), e4;
          }
          function a2(e4, t3) {
            0 == --e4._eventsCount ? e4._events = new n2() : delete e4._events[t3];
          }
          function o2() {
            this._events = new n2(), this._eventsCount = 0;
          }
          Object.create && (n2.prototype = /* @__PURE__ */ Object.create(null), new n2().__proto__ || (r3 = false)), o2.prototype.eventNames = function() {
            var e4, n3, s3 = [];
            if (0 === this._eventsCount) return s3;
            for (n3 in e4 = this._events) t2.call(e4, n3) && s3.push(r3 ? n3.slice(1) : n3);
            return Object.getOwnPropertySymbols ? s3.concat(Object.getOwnPropertySymbols(e4)) : s3;
          }, o2.prototype.listeners = function(e4) {
            var t3 = r3 ? r3 + e4 : e4, n3 = this._events[t3];
            if (!n3) return [];
            if (n3.fn) return [n3.fn];
            for (var s3 = 0, i3 = n3.length, a3 = Array(i3); s3 < i3; s3++) a3[s3] = n3[s3].fn;
            return a3;
          }, o2.prototype.listenerCount = function(e4) {
            var t3 = r3 ? r3 + e4 : e4, n3 = this._events[t3];
            return n3 ? n3.fn ? 1 : n3.length : 0;
          }, o2.prototype.emit = function(e4, t3, n3, s3, i3, a3) {
            var o3 = r3 ? r3 + e4 : e4;
            if (!this._events[o3]) return false;
            var l2, u2, c = this._events[o3], h = arguments.length;
            if (c.fn) {
              switch (c.once && this.removeListener(e4, c.fn, void 0, true), h) {
                case 1:
                  return c.fn.call(c.context), true;
                case 2:
                  return c.fn.call(c.context, t3), true;
                case 3:
                  return c.fn.call(c.context, t3, n3), true;
                case 4:
                  return c.fn.call(c.context, t3, n3, s3), true;
                case 5:
                  return c.fn.call(c.context, t3, n3, s3, i3), true;
                case 6:
                  return c.fn.call(c.context, t3, n3, s3, i3, a3), true;
              }
              for (u2 = 1, l2 = Array(h - 1); u2 < h; u2++) l2[u2 - 1] = arguments[u2];
              c.fn.apply(c.context, l2);
            } else {
              var d, p = c.length;
              for (u2 = 0; u2 < p; u2++) switch (c[u2].once && this.removeListener(e4, c[u2].fn, void 0, true), h) {
                case 1:
                  c[u2].fn.call(c[u2].context);
                  break;
                case 2:
                  c[u2].fn.call(c[u2].context, t3);
                  break;
                case 3:
                  c[u2].fn.call(c[u2].context, t3, n3);
                  break;
                case 4:
                  c[u2].fn.call(c[u2].context, t3, n3, s3);
                  break;
                default:
                  if (!l2) for (d = 1, l2 = Array(h - 1); d < h; d++) l2[d - 1] = arguments[d];
                  c[u2].fn.apply(c[u2].context, l2);
              }
            }
            return true;
          }, o2.prototype.on = function(e4, t3, r4) {
            return i2(this, e4, t3, r4, false);
          }, o2.prototype.once = function(e4, t3, r4) {
            return i2(this, e4, t3, r4, true);
          }, o2.prototype.removeListener = function(e4, t3, n3, s3) {
            var i3 = r3 ? r3 + e4 : e4;
            if (!this._events[i3]) return this;
            if (!t3) return a2(this, i3), this;
            var o3 = this._events[i3];
            if (o3.fn) o3.fn !== t3 || s3 && !o3.once || n3 && o3.context !== n3 || a2(this, i3);
            else {
              for (var l2 = 0, u2 = [], c = o3.length; l2 < c; l2++) (o3[l2].fn !== t3 || s3 && !o3[l2].once || n3 && o3[l2].context !== n3) && u2.push(o3[l2]);
              u2.length ? this._events[i3] = 1 === u2.length ? u2[0] : u2 : a2(this, i3);
            }
            return this;
          }, o2.prototype.removeAllListeners = function(e4) {
            var t3;
            return e4 ? (t3 = r3 ? r3 + e4 : e4, this._events[t3] && a2(this, t3)) : (this._events = new n2(), this._eventsCount = 0), this;
          }, o2.prototype.off = o2.prototype.removeListener, o2.prototype.addListener = o2.prototype.on, o2.prefixed = r3, o2.EventEmitter = o2, e3.exports = o2;
        }, 213: (e3) => {
          e3.exports = (e4, t2) => (t2 = t2 || (() => {
          }), e4.then((e5) => new Promise((e6) => {
            e6(t2());
          }).then(() => e5), (e5) => new Promise((e6) => {
            e6(t2());
          }).then(() => {
            throw e5;
          })));
        }, 574: (e3, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.default = function(e4, t3, r3) {
            let n2 = 0, s2 = e4.length;
            for (; s2 > 0; ) {
              let i2 = s2 / 2 | 0, a2 = n2 + i2;
              0 >= r3(e4[a2], t3) ? (n2 = ++a2, s2 -= i2 + 1) : s2 = i2;
            }
            return n2;
          };
        }, 821: (e3, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true });
          let n2 = r3(574);
          t2.default = class {
            constructor() {
              this._queue = [];
            }
            enqueue(e4, t3) {
              let r4 = { priority: (t3 = Object.assign({ priority: 0 }, t3)).priority, run: e4 };
              if (this.size && this._queue[this.size - 1].priority >= t3.priority) return void this._queue.push(r4);
              let s2 = n2.default(this._queue, r4, (e5, t4) => t4.priority - e5.priority);
              this._queue.splice(s2, 0, r4);
            }
            dequeue() {
              let e4 = this._queue.shift();
              return null == e4 ? void 0 : e4.run;
            }
            filter(e4) {
              return this._queue.filter((t3) => t3.priority === e4.priority).map((e5) => e5.run);
            }
            get size() {
              return this._queue.length;
            }
          };
        }, 816: (e3, t2, r3) => {
          let n2 = r3(213);
          class s2 extends Error {
            constructor(e4) {
              super(e4), this.name = "TimeoutError";
            }
          }
          let i2 = (e4, t3, r4) => new Promise((i3, a2) => {
            if ("number" != typeof t3 || t3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (t3 === 1 / 0) return void i3(e4);
            let o2 = setTimeout(() => {
              if ("function" == typeof r4) {
                try {
                  i3(r4());
                } catch (e5) {
                  a2(e5);
                }
                return;
              }
              let n3 = "string" == typeof r4 ? r4 : `Promise timed out after ${t3} milliseconds`, o3 = r4 instanceof Error ? r4 : new s2(n3);
              "function" == typeof e4.cancel && e4.cancel(), a2(o3);
            }, t3);
            n2(e4.then(i3, a2), () => {
              clearTimeout(o2);
            });
          });
          e3.exports = i2, e3.exports.default = i2, e3.exports.TimeoutError = s2;
        } }, o = {};
        function l(e3) {
          var t2 = o[e3];
          if (void 0 !== t2) return t2.exports;
          var r3 = o[e3] = { exports: {} }, n2 = true;
          try {
            a[e3](r3, r3.exports, l), n2 = false;
          } finally {
            n2 && delete o[e3];
          }
          return r3.exports;
        }
        l.ab = "/ROOT/node_modules/next/dist/compiled/p-queue/";
        var u = {};
        Object.defineProperty(u, "__esModule", { value: true }), e2 = l(993), r2 = l(816), n = l(821), s = () => {
        }, i = new r2.TimeoutError(), u.default = class extends e2 {
          constructor(e3) {
            var t2, r3, i2, a2;
            if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = s, this._resolveIdle = s, !("number" == typeof (e3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: n.default }, e3)).intervalCap && e3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (r3 = null == (t2 = e3.intervalCap) ? void 0 : t2.toString()) ? r3 : ""}\` (${typeof e3.intervalCap})`);
            if (void 0 === e3.interval || !(Number.isFinite(e3.interval) && e3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (a2 = null == (i2 = e3.interval) ? void 0 : i2.toString()) ? a2 : ""}\` (${typeof e3.interval})`);
            this._carryoverConcurrencyCount = e3.carryoverConcurrencyCount, this._isIntervalIgnored = e3.intervalCap === 1 / 0 || 0 === e3.interval, this._intervalCap = e3.intervalCap, this._interval = e3.interval, this._queue = new e3.queueClass(), this._queueClass = e3.queueClass, this.concurrency = e3.concurrency, this._timeout = e3.timeout, this._throwOnTimeout = true === e3.throwOnTimeout, this._isPaused = false === e3.autoStart;
          }
          get _doesIntervalAllowAnother() {
            return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
          }
          get _doesConcurrentAllowAnother() {
            return this._pendingCount < this._concurrency;
          }
          _next() {
            this._pendingCount--, this._tryToStartAnother(), this.emit("next");
          }
          _resolvePromises() {
            this._resolveEmpty(), this._resolveEmpty = s, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = s, this.emit("idle"));
          }
          _onResumeInterval() {
            this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
          }
          _isIntervalPaused() {
            let e3 = Date.now();
            if (void 0 === this._intervalId) {
              let t2 = this._intervalEnd - e3;
              if (!(t2 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                this._onResumeInterval();
              }, t2)), true;
              this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
            }
            return false;
          }
          _tryToStartAnother() {
            if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
            if (!this._isPaused) {
              let e3 = !this._isIntervalPaused();
              if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                let t2 = this._queue.dequeue();
                return !!t2 && (this.emit("active"), t2(), e3 && this._initializeIntervalIfNeeded(), true);
              }
            }
            return false;
          }
          _initializeIntervalIfNeeded() {
            this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
              this._onInterval();
            }, this._interval), this._intervalEnd = Date.now() + this._interval);
          }
          _onInterval() {
            0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
          }
          _processQueue() {
            for (; this._tryToStartAnother(); ) ;
          }
          get concurrency() {
            return this._concurrency;
          }
          set concurrency(e3) {
            if (!("number" == typeof e3 && e3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${e3}\` (${typeof e3})`);
            this._concurrency = e3, this._processQueue();
          }
          async add(e3, t2 = {}) {
            return new Promise((n2, s2) => {
              let a2 = async () => {
                this._pendingCount++, this._intervalCount++;
                try {
                  let a3 = void 0 === this._timeout && void 0 === t2.timeout ? e3() : r2.default(Promise.resolve(e3()), void 0 === t2.timeout ? this._timeout : t2.timeout, () => {
                    (void 0 === t2.throwOnTimeout ? this._throwOnTimeout : t2.throwOnTimeout) && s2(i);
                  });
                  n2(await a3);
                } catch (e4) {
                  s2(e4);
                }
                this._next();
              };
              this._queue.enqueue(a2, t2), this._tryToStartAnother(), this.emit("add");
            });
          }
          async addAll(e3, t2) {
            return Promise.all(e3.map(async (e4) => this.add(e4, t2)));
          }
          start() {
            return this._isPaused && (this._isPaused = false, this._processQueue()), this;
          }
          pause() {
            this._isPaused = true;
          }
          clear() {
            this._queue = new this._queueClass();
          }
          async onEmpty() {
            if (0 !== this._queue.size) return new Promise((e3) => {
              let t2 = this._resolveEmpty;
              this._resolveEmpty = () => {
                t2(), e3();
              };
            });
          }
          async onIdle() {
            if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((e3) => {
              let t2 = this._resolveIdle;
              this._resolveIdle = () => {
                t2(), e3();
              };
            });
          }
          get size() {
            return this._queue.size;
          }
          sizeBy(e3) {
            return this._queue.filter(e3).length;
          }
          get pending() {
            return this._pendingCount;
          }
          get isPaused() {
            return this._isPaused;
          }
          get timeout() {
            return this._timeout;
          }
          set timeout(e3) {
            this._timeout = e3;
          }
        }, t.exports = u;
      })();
    }, 951615, (e, t, r) => {
      t.exports = e.x("node:buffer", () => (init_node_buffer(), __toCommonJS(node_buffer_exports)));
    }, 369307, (e, t, r) => {
      "use strict";
      Object.defineProperty(r, "__esModule", { value: true });
      var n = { getTestReqInfo: function() {
        return l;
      }, withRequest: function() {
        return o;
      } };
      for (var s in n) Object.defineProperty(r, s, { enumerable: true, get: n[s] });
      let i = new (e.r(478500)).AsyncLocalStorage();
      function a(e2, t2) {
        let r2 = t2.header(e2, "next-test-proxy-port");
        if (!r2) return;
        let n2 = t2.url(e2);
        return { url: n2, proxyPort: Number(r2), testData: t2.header(e2, "next-test-data") || "" };
      }
      function o(e2, t2, r2) {
        let n2 = a(e2, t2);
        return n2 ? i.run(n2, r2) : r2();
      }
      function l(e2, t2) {
        let r2 = i.getStore();
        return r2 || (e2 && t2 ? a(e2, t2) : void 0);
      }
    }, 928325, (e, t, r) => {
      "use strict";
      var n = e.i(951615);
      Object.defineProperty(r, "__esModule", { value: true });
      var s = { handleFetch: function() {
        return u;
      }, interceptFetch: function() {
        return c;
      }, reader: function() {
        return o;
      } };
      for (var i in s) Object.defineProperty(r, i, { enumerable: true, get: s[i] });
      let a = e.r(369307), o = { url: (e2) => e2.url, header: (e2, t2) => e2.headers.get(t2) };
      async function l(e2, t2) {
        let { url: r2, method: s2, headers: i2, body: a2, cache: o2, credentials: l2, integrity: u2, mode: c2, redirect: h, referrer: d, referrerPolicy: p } = t2;
        return { testData: e2, api: "fetch", request: { url: r2, method: s2, headers: [...Array.from(i2), ["next-test-stack", function() {
          let e3 = (Error().stack ?? "").split("\n");
          for (let t3 = 1; t3 < e3.length; t3++) if (e3[t3].length > 0) {
            e3 = e3.slice(t3);
            break;
          }
          return (e3 = (e3 = (e3 = e3.filter((e4) => !e4.includes("/next/dist/"))).slice(0, 5)).map((e4) => e4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: a2 ? n.Buffer.from(await t2.arrayBuffer()).toString("base64") : null, cache: o2, credentials: l2, integrity: u2, mode: c2, redirect: h, referrer: d, referrerPolicy: p } };
      }
      async function u(e2, t2) {
        let r2 = (0, a.getTestReqInfo)(t2, o);
        if (!r2) return e2(t2);
        let { testData: s2, proxyPort: i2 } = r2, u2 = await l(s2, t2), c2 = await e2(`http://localhost:${i2}`, { method: "POST", body: JSON.stringify(u2), next: { internal: true } });
        if (!c2.ok) throw Object.defineProperty(Error(`Proxy request failed: ${c2.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let h = await c2.json(), { api: d } = h;
        switch (d) {
          case "continue":
            return e2(t2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${t2.method} ${t2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            return function(e3) {
              let { status: t3, headers: r3, body: s3 } = e3.response;
              return new Response(s3 ? n.Buffer.from(s3, "base64") : null, { status: t3, headers: new Headers(r3) });
            }(h);
          default:
            return d;
        }
      }
      function c(t2) {
        return e.g.fetch = function(e2, r2) {
          var n2;
          return (null == r2 || null == (n2 = r2.next) ? void 0 : n2.internal) ? t2(e2, r2) : u(t2, new Request(e2, r2));
        }, () => {
          e.g.fetch = t2;
        };
      }
    }, 494165, (e, t, r) => {
      "use strict";
      Object.defineProperty(r, "__esModule", { value: true });
      var n = { interceptTestApis: function() {
        return o;
      }, wrapRequestHandler: function() {
        return l;
      } };
      for (var s in n) Object.defineProperty(r, s, { enumerable: true, get: n[s] });
      let i = e.r(369307), a = e.r(928325);
      function o() {
        return (0, a.interceptFetch)(e.g.fetch);
      }
      function l(e2) {
        return (t2, r2) => (0, i.withRequest)(t2, a.reader, () => e2(t2, r2));
      }
    }, 154846, (e, t, r) => {
      !function() {
        "use strict";
        var e2 = { 114: function(e3) {
          function t2(e4) {
            if ("string" != typeof e4) throw TypeError("Path must be a string. Received " + JSON.stringify(e4));
          }
          function r3(e4, t3) {
            for (var r4, n3 = "", s = 0, i = -1, a = 0, o = 0; o <= e4.length; ++o) {
              if (o < e4.length) r4 = e4.charCodeAt(o);
              else if (47 === r4) break;
              else r4 = 47;
              if (47 === r4) {
                if (i === o - 1 || 1 === a) ;
                else if (i !== o - 1 && 2 === a) {
                  if (n3.length < 2 || 2 !== s || 46 !== n3.charCodeAt(n3.length - 1) || 46 !== n3.charCodeAt(n3.length - 2)) {
                    if (n3.length > 2) {
                      var l = n3.lastIndexOf("/");
                      if (l !== n3.length - 1) {
                        -1 === l ? (n3 = "", s = 0) : s = (n3 = n3.slice(0, l)).length - 1 - n3.lastIndexOf("/"), i = o, a = 0;
                        continue;
                      }
                    } else if (2 === n3.length || 1 === n3.length) {
                      n3 = "", s = 0, i = o, a = 0;
                      continue;
                    }
                  }
                  t3 && (n3.length > 0 ? n3 += "/.." : n3 = "..", s = 2);
                } else n3.length > 0 ? n3 += "/" + e4.slice(i + 1, o) : n3 = e4.slice(i + 1, o), s = o - i - 1;
                i = o, a = 0;
              } else 46 === r4 && -1 !== a ? ++a : a = -1;
            }
            return n3;
          }
          var n2 = { resolve: function() {
            for (var e4, n3, s = "", i = false, a = arguments.length - 1; a >= -1 && !i; a--) a >= 0 ? n3 = arguments[a] : (void 0 === e4 && (e4 = ""), n3 = e4), t2(n3), 0 !== n3.length && (s = n3 + "/" + s, i = 47 === n3.charCodeAt(0));
            if (s = r3(s, !i), i) if (s.length > 0) return "/" + s;
            else return "/";
            return s.length > 0 ? s : ".";
          }, normalize: function(e4) {
            if (t2(e4), 0 === e4.length) return ".";
            var n3 = 47 === e4.charCodeAt(0), s = 47 === e4.charCodeAt(e4.length - 1);
            return (0 !== (e4 = r3(e4, !n3)).length || n3 || (e4 = "."), e4.length > 0 && s && (e4 += "/"), n3) ? "/" + e4 : e4;
          }, isAbsolute: function(e4) {
            return t2(e4), e4.length > 0 && 47 === e4.charCodeAt(0);
          }, join: function() {
            if (0 == arguments.length) return ".";
            for (var e4, r4 = 0; r4 < arguments.length; ++r4) {
              var s = arguments[r4];
              t2(s), s.length > 0 && (void 0 === e4 ? e4 = s : e4 += "/" + s);
            }
            return void 0 === e4 ? "." : n2.normalize(e4);
          }, relative: function(e4, r4) {
            if (t2(e4), t2(r4), e4 === r4 || (e4 = n2.resolve(e4)) === (r4 = n2.resolve(r4))) return "";
            for (var s = 1; s < e4.length && 47 === e4.charCodeAt(s); ++s) ;
            for (var i = e4.length, a = i - s, o = 1; o < r4.length && 47 === r4.charCodeAt(o); ++o) ;
            for (var l = r4.length - o, u = a < l ? a : l, c = -1, h = 0; h <= u; ++h) {
              if (h === u) {
                if (l > u) {
                  if (47 === r4.charCodeAt(o + h)) return r4.slice(o + h + 1);
                  else if (0 === h) return r4.slice(o + h);
                } else a > u && (47 === e4.charCodeAt(s + h) ? c = h : 0 === h && (c = 0));
                break;
              }
              var d = e4.charCodeAt(s + h);
              if (d !== r4.charCodeAt(o + h)) break;
              47 === d && (c = h);
            }
            var p = "";
            for (h = s + c + 1; h <= i; ++h) (h === i || 47 === e4.charCodeAt(h)) && (0 === p.length ? p += ".." : p += "/..");
            return p.length > 0 ? p + r4.slice(o + c) : (o += c, 47 === r4.charCodeAt(o) && ++o, r4.slice(o));
          }, _makeLong: function(e4) {
            return e4;
          }, dirname: function(e4) {
            if (t2(e4), 0 === e4.length) return ".";
            for (var r4 = e4.charCodeAt(0), n3 = 47 === r4, s = -1, i = true, a = e4.length - 1; a >= 1; --a) if (47 === (r4 = e4.charCodeAt(a))) {
              if (!i) {
                s = a;
                break;
              }
            } else i = false;
            return -1 === s ? n3 ? "/" : "." : n3 && 1 === s ? "//" : e4.slice(0, s);
          }, basename: function(e4, r4) {
            if (void 0 !== r4 && "string" != typeof r4) throw TypeError('"ext" argument must be a string');
            t2(e4);
            var n3, s = 0, i = -1, a = true;
            if (void 0 !== r4 && r4.length > 0 && r4.length <= e4.length) {
              if (r4.length === e4.length && r4 === e4) return "";
              var o = r4.length - 1, l = -1;
              for (n3 = e4.length - 1; n3 >= 0; --n3) {
                var u = e4.charCodeAt(n3);
                if (47 === u) {
                  if (!a) {
                    s = n3 + 1;
                    break;
                  }
                } else -1 === l && (a = false, l = n3 + 1), o >= 0 && (u === r4.charCodeAt(o) ? -1 == --o && (i = n3) : (o = -1, i = l));
              }
              return s === i ? i = l : -1 === i && (i = e4.length), e4.slice(s, i);
            }
            for (n3 = e4.length - 1; n3 >= 0; --n3) if (47 === e4.charCodeAt(n3)) {
              if (!a) {
                s = n3 + 1;
                break;
              }
            } else -1 === i && (a = false, i = n3 + 1);
            return -1 === i ? "" : e4.slice(s, i);
          }, extname: function(e4) {
            t2(e4);
            for (var r4 = -1, n3 = 0, s = -1, i = true, a = 0, o = e4.length - 1; o >= 0; --o) {
              var l = e4.charCodeAt(o);
              if (47 === l) {
                if (!i) {
                  n3 = o + 1;
                  break;
                }
                continue;
              }
              -1 === s && (i = false, s = o + 1), 46 === l ? -1 === r4 ? r4 = o : 1 !== a && (a = 1) : -1 !== r4 && (a = -1);
            }
            return -1 === r4 || -1 === s || 0 === a || 1 === a && r4 === s - 1 && r4 === n3 + 1 ? "" : e4.slice(r4, s);
          }, format: function(e4) {
            var t3, r4;
            if (null === e4 || "object" != typeof e4) throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof e4);
            return t3 = e4.dir || e4.root, r4 = e4.base || (e4.name || "") + (e4.ext || ""), t3 ? t3 === e4.root ? t3 + r4 : t3 + "/" + r4 : r4;
          }, parse: function(e4) {
            t2(e4);
            var r4, n3 = { root: "", dir: "", base: "", ext: "", name: "" };
            if (0 === e4.length) return n3;
            var s = e4.charCodeAt(0), i = 47 === s;
            i ? (n3.root = "/", r4 = 1) : r4 = 0;
            for (var a = -1, o = 0, l = -1, u = true, c = e4.length - 1, h = 0; c >= r4; --c) {
              if (47 === (s = e4.charCodeAt(c))) {
                if (!u) {
                  o = c + 1;
                  break;
                }
                continue;
              }
              -1 === l && (u = false, l = c + 1), 46 === s ? -1 === a ? a = c : 1 !== h && (h = 1) : -1 !== a && (h = -1);
            }
            return -1 === a || -1 === l || 0 === h || 1 === h && a === l - 1 && a === o + 1 ? -1 !== l && (0 === o && i ? n3.base = n3.name = e4.slice(1, l) : n3.base = n3.name = e4.slice(o, l)) : (0 === o && i ? (n3.name = e4.slice(1, a), n3.base = e4.slice(1, l)) : (n3.name = e4.slice(o, a), n3.base = e4.slice(o, l)), n3.ext = e4.slice(a, l)), o > 0 ? n3.dir = e4.slice(0, o - 1) : i && (n3.dir = "/"), n3;
          }, sep: "/", delimiter: ":", win32: null, posix: null };
          n2.posix = n2, e3.exports = n2;
        } }, r2 = {};
        function n(t2) {
          var s = r2[t2];
          if (void 0 !== s) return s.exports;
          var i = r2[t2] = { exports: {} }, a = true;
          try {
            e2[t2](i, i.exports, n), a = false;
          } finally {
            a && delete r2[t2];
          }
          return i.exports;
        }
        n.ab = "/ROOT/node_modules/next/dist/compiled/path-browserify/", t.exports = n(114);
      }();
    }, 268886, (e, t, r) => {
      t.exports = e.r(154846);
    }, 267914, (e, t, r) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "/ROOT/node_modules/next/dist/compiled/path-to-regexp/");
        var e2 = {};
        (() => {
          function t2(e3, t3) {
            void 0 === t3 && (t3 = {});
            for (var r3 = function(e4) {
              for (var t4 = [], r4 = 0; r4 < e4.length; ) {
                var n3 = e4[r4];
                if ("*" === n3 || "+" === n3 || "?" === n3) {
                  t4.push({ type: "MODIFIER", index: r4, value: e4[r4++] });
                  continue;
                }
                if ("\\" === n3) {
                  t4.push({ type: "ESCAPED_CHAR", index: r4++, value: e4[r4++] });
                  continue;
                }
                if ("{" === n3) {
                  t4.push({ type: "OPEN", index: r4, value: e4[r4++] });
                  continue;
                }
                if ("}" === n3) {
                  t4.push({ type: "CLOSE", index: r4, value: e4[r4++] });
                  continue;
                }
                if (":" === n3) {
                  for (var s2 = "", i3 = r4 + 1; i3 < e4.length; ) {
                    var a3 = e4.charCodeAt(i3);
                    if (a3 >= 48 && a3 <= 57 || a3 >= 65 && a3 <= 90 || a3 >= 97 && a3 <= 122 || 95 === a3) {
                      s2 += e4[i3++];
                      continue;
                    }
                    break;
                  }
                  if (!s2) throw TypeError("Missing parameter name at ".concat(r4));
                  t4.push({ type: "NAME", index: r4, value: s2 }), r4 = i3;
                  continue;
                }
                if ("(" === n3) {
                  var o3 = 1, l2 = "", i3 = r4 + 1;
                  if ("?" === e4[i3]) throw TypeError('Pattern cannot start with "?" at '.concat(i3));
                  for (; i3 < e4.length; ) {
                    if ("\\" === e4[i3]) {
                      l2 += e4[i3++] + e4[i3++];
                      continue;
                    }
                    if (")" === e4[i3]) {
                      if (0 == --o3) {
                        i3++;
                        break;
                      }
                    } else if ("(" === e4[i3] && (o3++, "?" !== e4[i3 + 1])) throw TypeError("Capturing groups are not allowed at ".concat(i3));
                    l2 += e4[i3++];
                  }
                  if (o3) throw TypeError("Unbalanced pattern at ".concat(r4));
                  if (!l2) throw TypeError("Missing pattern at ".concat(r4));
                  t4.push({ type: "PATTERN", index: r4, value: l2 }), r4 = i3;
                  continue;
                }
                t4.push({ type: "CHAR", index: r4, value: e4[r4++] });
              }
              return t4.push({ type: "END", index: r4, value: "" }), t4;
            }(e3), n2 = t3.prefixes, i2 = void 0 === n2 ? "./" : n2, a2 = t3.delimiter, o2 = void 0 === a2 ? "/#?" : a2, l = [], u = 0, c = 0, h = "", d = function(e4) {
              if (c < r3.length && r3[c].type === e4) return r3[c++].value;
            }, p = function(e4) {
              var t4 = d(e4);
              if (void 0 !== t4) return t4;
              var n3 = r3[c], s2 = n3.type, i3 = n3.index;
              throw TypeError("Unexpected ".concat(s2, " at ").concat(i3, ", expected ").concat(e4));
            }, f = function() {
              for (var e4, t4 = ""; e4 = d("CHAR") || d("ESCAPED_CHAR"); ) t4 += e4;
              return t4;
            }, g = function(e4) {
              for (var t4 = 0; t4 < o2.length; t4++) {
                var r4 = o2[t4];
                if (e4.indexOf(r4) > -1) return true;
              }
              return false;
            }, m = function(e4) {
              var t4 = l[l.length - 1], r4 = e4 || (t4 && "string" == typeof t4 ? t4 : "");
              if (t4 && !r4) throw TypeError('Must have text between two parameters, missing text after "'.concat(t4.name, '"'));
              return !r4 || g(r4) ? "[^".concat(s(o2), "]+?") : "(?:(?!".concat(s(r4), ")[^").concat(s(o2), "])+?");
            }; c < r3.length; ) {
              var y = d("CHAR"), _ = d("NAME"), w = d("PATTERN");
              if (_ || w) {
                var b = y || "";
                -1 === i2.indexOf(b) && (h += b, b = ""), h && (l.push(h), h = ""), l.push({ name: _ || u++, prefix: b, suffix: "", pattern: w || m(b), modifier: d("MODIFIER") || "" });
                continue;
              }
              var v = y || d("ESCAPED_CHAR");
              if (v) {
                h += v;
                continue;
              }
              if (h && (l.push(h), h = ""), d("OPEN")) {
                var b = f(), k = d("NAME") || "", E = d("PATTERN") || "", S = f();
                p("CLOSE"), l.push({ name: k || (E ? u++ : ""), pattern: k && !E ? m(b) : E, prefix: b, suffix: S, modifier: d("MODIFIER") || "" });
                continue;
              }
              p("END");
            }
            return l;
          }
          function r2(e3, t3) {
            void 0 === t3 && (t3 = {});
            var r3 = i(t3), n2 = t3.encode, s2 = void 0 === n2 ? function(e4) {
              return e4;
            } : n2, a2 = t3.validate, o2 = void 0 === a2 || a2, l = e3.map(function(e4) {
              if ("object" == typeof e4) return new RegExp("^(?:".concat(e4.pattern, ")$"), r3);
            });
            return function(t4) {
              for (var r4 = "", n3 = 0; n3 < e3.length; n3++) {
                var i2 = e3[n3];
                if ("string" == typeof i2) {
                  r4 += i2;
                  continue;
                }
                var a3 = t4 ? t4[i2.name] : void 0, u = "?" === i2.modifier || "*" === i2.modifier, c = "*" === i2.modifier || "+" === i2.modifier;
                if (Array.isArray(a3)) {
                  if (!c) throw TypeError('Expected "'.concat(i2.name, '" to not repeat, but got an array'));
                  if (0 === a3.length) {
                    if (u) continue;
                    throw TypeError('Expected "'.concat(i2.name, '" to not be empty'));
                  }
                  for (var h = 0; h < a3.length; h++) {
                    var d = s2(a3[h], i2);
                    if (o2 && !l[n3].test(d)) throw TypeError('Expected all "'.concat(i2.name, '" to match "').concat(i2.pattern, '", but got "').concat(d, '"'));
                    r4 += i2.prefix + d + i2.suffix;
                  }
                  continue;
                }
                if ("string" == typeof a3 || "number" == typeof a3) {
                  var d = s2(String(a3), i2);
                  if (o2 && !l[n3].test(d)) throw TypeError('Expected "'.concat(i2.name, '" to match "').concat(i2.pattern, '", but got "').concat(d, '"'));
                  r4 += i2.prefix + d + i2.suffix;
                  continue;
                }
                if (!u) {
                  var p = c ? "an array" : "a string";
                  throw TypeError('Expected "'.concat(i2.name, '" to be ').concat(p));
                }
              }
              return r4;
            };
          }
          function n(e3, t3, r3) {
            void 0 === r3 && (r3 = {});
            var n2 = r3.decode, s2 = void 0 === n2 ? function(e4) {
              return e4;
            } : n2;
            return function(r4) {
              var n3 = e3.exec(r4);
              if (!n3) return false;
              for (var i2 = n3[0], a2 = n3.index, o2 = /* @__PURE__ */ Object.create(null), l = 1; l < n3.length; l++) !function(e4) {
                if (void 0 !== n3[e4]) {
                  var r5 = t3[e4 - 1];
                  "*" === r5.modifier || "+" === r5.modifier ? o2[r5.name] = n3[e4].split(r5.prefix + r5.suffix).map(function(e5) {
                    return s2(e5, r5);
                  }) : o2[r5.name] = s2(n3[e4], r5);
                }
              }(l);
              return { path: i2, index: a2, params: o2 };
            };
          }
          function s(e3) {
            return e3.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
          }
          function i(e3) {
            return e3 && e3.sensitive ? "" : "i";
          }
          function a(e3, t3, r3) {
            void 0 === r3 && (r3 = {});
            for (var n2 = r3.strict, a2 = void 0 !== n2 && n2, o2 = r3.start, l = r3.end, u = r3.encode, c = void 0 === u ? function(e4) {
              return e4;
            } : u, h = r3.delimiter, d = r3.endsWith, p = "[".concat(s(void 0 === d ? "" : d), "]|$"), f = "[".concat(s(void 0 === h ? "/#?" : h), "]"), g = void 0 === o2 || o2 ? "^" : "", m = 0; m < e3.length; m++) {
              var y = e3[m];
              if ("string" == typeof y) g += s(c(y));
              else {
                var _ = s(c(y.prefix)), w = s(c(y.suffix));
                if (y.pattern) if (t3 && t3.push(y), _ || w) if ("+" === y.modifier || "*" === y.modifier) {
                  var b = "*" === y.modifier ? "?" : "";
                  g += "(?:".concat(_, "((?:").concat(y.pattern, ")(?:").concat(w).concat(_, "(?:").concat(y.pattern, "))*)").concat(w, ")").concat(b);
                } else g += "(?:".concat(_, "(").concat(y.pattern, ")").concat(w, ")").concat(y.modifier);
                else {
                  if ("+" === y.modifier || "*" === y.modifier) throw TypeError('Can not repeat "'.concat(y.name, '" without a prefix and suffix'));
                  g += "(".concat(y.pattern, ")").concat(y.modifier);
                }
                else g += "(?:".concat(_).concat(w, ")").concat(y.modifier);
              }
            }
            if (void 0 === l || l) a2 || (g += "".concat(f, "?")), g += r3.endsWith ? "(?=".concat(p, ")") : "$";
            else {
              var v = e3[e3.length - 1], k = "string" == typeof v ? f.indexOf(v[v.length - 1]) > -1 : void 0 === v;
              a2 || (g += "(?:".concat(f, "(?=").concat(p, "))?")), k || (g += "(?=".concat(f, "|").concat(p, ")"));
            }
            return new RegExp(g, i(r3));
          }
          function o(e3, r3, n2) {
            if (e3 instanceof RegExp) {
              var s2;
              if (!r3) return e3;
              for (var l = /\((?:\?<(.*?)>)?(?!\?)/g, u = 0, c = l.exec(e3.source); c; ) r3.push({ name: c[1] || u++, prefix: "", suffix: "", modifier: "", pattern: "" }), c = l.exec(e3.source);
              return e3;
            }
            return Array.isArray(e3) ? (s2 = e3.map(function(e4) {
              return o(e4, r3, n2).source;
            }), new RegExp("(?:".concat(s2.join("|"), ")"), i(n2))) : a(t2(e3, n2), r3, n2);
          }
          Object.defineProperty(e2, "__esModule", { value: true }), e2.pathToRegexp = e2.tokensToRegexp = e2.regexpToFunction = e2.match = e2.tokensToFunction = e2.compile = e2.parse = void 0, e2.parse = t2, e2.compile = function(e3, n2) {
            return r2(t2(e3, n2), n2);
          }, e2.tokensToFunction = r2, e2.match = function(e3, t3) {
            var r3 = [];
            return n(o(e3, r3, t3), r3, t3);
          }, e2.regexpToFunction = n, e2.tokensToRegexp = a, e2.pathToRegexp = o;
        })(), t.exports = e2;
      })();
    }, 164445, (e, t, r) => {
      var n = { 226: function(t2, r2) {
        !function(n2) {
          "use strict";
          var s2 = "function", i2 = "undefined", a = "object", o = "string", l = "major", u = "model", c = "name", h = "type", d = "vendor", p = "version", f = "architecture", g = "console", m = "mobile", y = "tablet", _ = "smarttv", w = "wearable", b = "embedded", v = "Amazon", k = "Apple", E = "ASUS", S = "BlackBerry", T = "Browser", R = "Chrome", C = "Firefox", x = "Google", O = "Huawei", A = "Microsoft", P = "Motorola", I = "Opera", N = "Samsung", j = "Sharp", $ = "Sony", L = "Xiaomi", D = "Zebra", U = "Facebook", M = "Chromium OS", q = "Mac OS", B = function(e2, t3) {
            var r3 = {};
            for (var n3 in e2) t3[n3] && t3[n3].length % 2 == 0 ? r3[n3] = t3[n3].concat(e2[n3]) : r3[n3] = e2[n3];
            return r3;
          }, H = function(e2) {
            for (var t3 = {}, r3 = 0; r3 < e2.length; r3++) t3[e2[r3].toUpperCase()] = e2[r3];
            return t3;
          }, G = function(e2, t3) {
            return typeof e2 === o && -1 !== F(t3).indexOf(F(e2));
          }, F = function(e2) {
            return e2.toLowerCase();
          }, W = function(e2, t3) {
            if (typeof e2 === o) return e2 = e2.replace(/^\s\s*/, ""), typeof t3 === i2 ? e2 : e2.substring(0, 350);
          }, z = function(e2, t3) {
            for (var r3, n3, i3, o2, l2, u2, c2 = 0; c2 < t3.length && !l2; ) {
              var h2 = t3[c2], d2 = t3[c2 + 1];
              for (r3 = n3 = 0; r3 < h2.length && !l2 && h2[r3]; ) if (l2 = h2[r3++].exec(e2)) for (i3 = 0; i3 < d2.length; i3++) u2 = l2[++n3], typeof (o2 = d2[i3]) === a && o2.length > 0 ? 2 === o2.length ? typeof o2[1] == s2 ? this[o2[0]] = o2[1].call(this, u2) : this[o2[0]] = o2[1] : 3 === o2.length ? typeof o2[1] !== s2 || o2[1].exec && o2[1].test ? this[o2[0]] = u2 ? u2.replace(o2[1], o2[2]) : void 0 : this[o2[0]] = u2 ? o2[1].call(this, u2, o2[2]) : void 0 : 4 === o2.length && (this[o2[0]] = u2 ? o2[3].call(this, u2.replace(o2[1], o2[2])) : void 0) : this[o2] = u2 || void 0;
              c2 += 2;
            }
          }, K = function(e2, t3) {
            for (var r3 in t3) if (typeof t3[r3] === a && t3[r3].length > 0) {
              for (var n3 = 0; n3 < t3[r3].length; n3++) if (G(t3[r3][n3], e2)) return "?" === r3 ? void 0 : r3;
            } else if (G(t3[r3], e2)) return "?" === r3 ? void 0 : r3;
            return e2;
          }, V = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, J = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [p, [c, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [p, [c, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [c, p], [/opios[\/ ]+([\w\.]+)/i], [p, [c, I + " Mini"]], [/\bopr\/([\w\.]+)/i], [p, [c, I]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [c, p], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [p, [c, "UC" + T]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [p, [c, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [p, [c, "WeChat"]], [/konqueror\/([\w\.]+)/i], [p, [c, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [p, [c, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [p, [c, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[c, /(.+)/, "$1 Secure " + T], p], [/\bfocus\/([\w\.]+)/i], [p, [c, C + " Focus"]], [/\bopt\/([\w\.]+)/i], [p, [c, I + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [p, [c, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [p, [c, "Dolphin"]], [/coast\/([\w\.]+)/i], [p, [c, I + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [p, [c, "MIUI " + T]], [/fxios\/([-\w\.]+)/i], [p, [c, C]], [/\bqihu|(qi?ho?o?|360)browser/i], [[c, "360 " + T]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[c, /(.+)/, "$1 " + T], p], [/(comodo_dragon)\/([\w\.]+)/i], [[c, /_/g, " "], p], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [c, p], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [c], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[c, U], p], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [c, p], [/\bgsa\/([\w\.]+) .*safari\//i], [p, [c, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [p, [c, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [p, [c, R + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[c, R + " WebView"], p], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [p, [c, "Android " + T]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [c, p], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [p, [c, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [p, c], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [c, [p, K, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [c, p], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[c, "Netscape"], p], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [p, [c, C + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [c, p], [/(cobalt)\/([\w\.]+)/i], [c, [p, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[f, "amd64"]], [/(ia32(?=;))/i], [[f, F]], [/((?:i[346]|x)86)[;\)]/i], [[f, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[f, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[f, "armhf"]], [/windows (ce|mobile); ppc;/i], [[f, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[f, /ower/, "", F]], [/(sun4\w)[;\)]/i], [[f, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[f, F]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [u, [d, N], [h, y]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [u, [d, N], [h, m]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [u, [d, k], [h, m]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [u, [d, k], [h, y]], [/(macintosh);/i], [u, [d, k]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [u, [d, j], [h, m]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [u, [d, O], [h, y]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [u, [d, O], [h, m]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[u, /_/g, " "], [d, L], [h, m]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[u, /_/g, " "], [d, L], [h, y]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [u, [d, "OPPO"], [h, m]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [u, [d, "Vivo"], [h, m]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [u, [d, "Realme"], [h, m]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [u, [d, P], [h, m]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [u, [d, P], [h, y]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [u, [d, "LG"], [h, y]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [u, [d, "LG"], [h, m]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [u, [d, "Lenovo"], [h, y]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[u, /_/g, " "], [d, "Nokia"], [h, m]], [/(pixel c)\b/i], [u, [d, x], [h, y]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [u, [d, x], [h, m]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [u, [d, $], [h, m]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[u, "Xperia Tablet"], [d, $], [h, y]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [u, [d, "OnePlus"], [h, m]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [u, [d, v], [h, y]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[u, /(.+)/g, "Fire Phone $1"], [d, v], [h, m]], [/(playbook);[-\w\),; ]+(rim)/i], [u, d, [h, y]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [u, [d, S], [h, m]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [u, [d, E], [h, y]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [u, [d, E], [h, m]], [/(nexus 9)/i], [u, [d, "HTC"], [h, y]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [d, [u, /_/g, " "], [h, m]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [u, [d, "Acer"], [h, y]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [u, [d, "Meizu"], [h, m]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [d, u, [h, m]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [d, u, [h, y]], [/(surface duo)/i], [u, [d, A], [h, y]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [u, [d, "Fairphone"], [h, m]], [/(u304aa)/i], [u, [d, "AT&T"], [h, m]], [/\bsie-(\w*)/i], [u, [d, "Siemens"], [h, m]], [/\b(rct\w+) b/i], [u, [d, "RCA"], [h, y]], [/\b(venue[\d ]{2,7}) b/i], [u, [d, "Dell"], [h, y]], [/\b(q(?:mv|ta)\w+) b/i], [u, [d, "Verizon"], [h, y]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [u, [d, "Barnes & Noble"], [h, y]], [/\b(tm\d{3}\w+) b/i], [u, [d, "NuVision"], [h, y]], [/\b(k88) b/i], [u, [d, "ZTE"], [h, y]], [/\b(nx\d{3}j) b/i], [u, [d, "ZTE"], [h, m]], [/\b(gen\d{3}) b.+49h/i], [u, [d, "Swiss"], [h, m]], [/\b(zur\d{3}) b/i], [u, [d, "Swiss"], [h, y]], [/\b((zeki)?tb.*\b) b/i], [u, [d, "Zeki"], [h, y]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[d, "Dragon Touch"], u, [h, y]], [/\b(ns-?\w{0,9}) b/i], [u, [d, "Insignia"], [h, y]], [/\b((nxa|next)-?\w{0,9}) b/i], [u, [d, "NextBook"], [h, y]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[d, "Voice"], u, [h, m]], [/\b(lvtel\-)?(v1[12]) b/i], [[d, "LvTel"], u, [h, m]], [/\b(ph-1) /i], [u, [d, "Essential"], [h, m]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [u, [d, "Envizen"], [h, y]], [/\b(trio[-\w\. ]+) b/i], [u, [d, "MachSpeed"], [h, y]], [/\btu_(1491) b/i], [u, [d, "Rotor"], [h, y]], [/(shield[\w ]+) b/i], [u, [d, "Nvidia"], [h, y]], [/(sprint) (\w+)/i], [d, u, [h, m]], [/(kin\.[onetw]{3})/i], [[u, /\./g, " "], [d, A], [h, m]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [u, [d, D], [h, y]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [u, [d, D], [h, m]], [/smart-tv.+(samsung)/i], [d, [h, _]], [/hbbtv.+maple;(\d+)/i], [[u, /^/, "SmartTV"], [d, N], [h, _]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[d, "LG"], [h, _]], [/(apple) ?tv/i], [d, [u, k + " TV"], [h, _]], [/crkey/i], [[u, R + "cast"], [d, x], [h, _]], [/droid.+aft(\w)( bui|\))/i], [u, [d, v], [h, _]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [u, [d, j], [h, _]], [/(bravia[\w ]+)( bui|\))/i], [u, [d, $], [h, _]], [/(mitv-\w{5}) bui/i], [u, [d, L], [h, _]], [/Hbbtv.*(technisat) (.*);/i], [d, u, [h, _]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[d, W], [u, W], [h, _]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[h, _]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [d, u, [h, g]], [/droid.+; (shield) bui/i], [u, [d, "Nvidia"], [h, g]], [/(playstation [345portablevi]+)/i], [u, [d, $], [h, g]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [u, [d, A], [h, g]], [/((pebble))app/i], [d, u, [h, w]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [u, [d, k], [h, w]], [/droid.+; (glass) \d/i], [u, [d, x], [h, w]], [/droid.+; (wt63?0{2,3})\)/i], [u, [d, D], [h, w]], [/(quest( 2| pro)?)/i], [u, [d, U], [h, w]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [d, [h, b]], [/(aeobc)\b/i], [u, [d, v], [h, b]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [u, [h, m]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [u, [h, y]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[h, y]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[h, m]], [/(android[-\w\. ]{0,9});.+buil/i], [u, [d, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [p, [c, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [p, [c, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [c, p], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [p, c]], os: [[/microsoft (windows) (vista|xp)/i], [c, p], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [c, [p, K, V]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[c, "Windows"], [p, K, V]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[p, /_/g, "."], [c, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[c, q], [p, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [p, c], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [c, p], [/\(bb(10);/i], [p, [c, S]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [p, [c, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [p, [c, C + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [p, [c, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [p, [c, "watchOS"]], [/crkey\/([\d\.]+)/i], [p, [c, R + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[c, M], p], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [c, p], [/(sunos) ?([\w\.\d]*)/i], [[c, "Solaris"], p], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [c, p]] }, X = function(e2, t3) {
            if (typeof e2 === a && (t3 = e2, e2 = void 0), !(this instanceof X)) return new X(e2, t3).getResult();
            var r3 = typeof n2 !== i2 && n2.navigator ? n2.navigator : void 0, g2 = e2 || (r3 && r3.userAgent ? r3.userAgent : ""), _2 = r3 && r3.userAgentData ? r3.userAgentData : void 0, w2 = t3 ? B(J, t3) : J, b2 = r3 && r3.userAgent == g2;
            return this.getBrowser = function() {
              var e3, t4 = {};
              return t4[c] = void 0, t4[p] = void 0, z.call(t4, g2, w2.browser), t4[l] = typeof (e3 = t4[p]) === o ? e3.replace(/[^\d\.]/g, "").split(".")[0] : void 0, b2 && r3 && r3.brave && typeof r3.brave.isBrave == s2 && (t4[c] = "Brave"), t4;
            }, this.getCPU = function() {
              var e3 = {};
              return e3[f] = void 0, z.call(e3, g2, w2.cpu), e3;
            }, this.getDevice = function() {
              var e3 = {};
              return e3[d] = void 0, e3[u] = void 0, e3[h] = void 0, z.call(e3, g2, w2.device), b2 && !e3[h] && _2 && _2.mobile && (e3[h] = m), b2 && "Macintosh" == e3[u] && r3 && typeof r3.standalone !== i2 && r3.maxTouchPoints && r3.maxTouchPoints > 2 && (e3[u] = "iPad", e3[h] = y), e3;
            }, this.getEngine = function() {
              var e3 = {};
              return e3[c] = void 0, e3[p] = void 0, z.call(e3, g2, w2.engine), e3;
            }, this.getOS = function() {
              var e3 = {};
              return e3[c] = void 0, e3[p] = void 0, z.call(e3, g2, w2.os), b2 && !e3[c] && _2 && "Unknown" != _2.platform && (e3[c] = _2.platform.replace(/chrome os/i, M).replace(/macos/i, q)), e3;
            }, this.getResult = function() {
              return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
            }, this.getUA = function() {
              return g2;
            }, this.setUA = function(e3) {
              return g2 = typeof e3 === o && e3.length > 350 ? W(e3, 350) : e3, this;
            }, this.setUA(g2), this;
          };
          if (X.VERSION = "1.0.35", X.BROWSER = H([c, p, l]), X.CPU = H([f]), X.DEVICE = H([u, d, h, g, m, _, y, w, b]), X.ENGINE = X.OS = H([c, p]), typeof r2 !== i2) t2.exports && (r2 = t2.exports = X), r2.UAParser = X;
          else if (typeof define === s2 && define.amd) e.r, void 0 !== X && e.v(X);
          else typeof n2 !== i2 && (n2.UAParser = X);
          var Y = typeof n2 !== i2 && (n2.jQuery || n2.Zepto);
          if (Y && !Y.ua) {
            var Z = new X();
            Y.ua = Z.getResult(), Y.ua.get = function() {
              return Z.getUA();
            }, Y.ua.set = function(e2) {
              Z.setUA(e2);
              var t3 = Z.getResult();
              for (var r3 in t3) Y.ua[r3] = t3[r3];
            };
          }
        }(this);
      } }, s = {};
      function i(e2) {
        var t2 = s[e2];
        if (void 0 !== t2) return t2.exports;
        var r2 = s[e2] = { exports: {} }, a = true;
        try {
          n[e2].call(r2.exports, r2, r2.exports, i), a = false;
        } finally {
          a && delete s[e2];
        }
        return r2.exports;
      }
      i.ab = "/ROOT/node_modules/next/dist/compiled/ua-parser-js/", t.exports = i(226);
    }, 708946, (e, t, r) => {
      "use strict";
      var n = { H: null, A: null };
      function s(e2) {
        var t2 = "https://react.dev/errors/" + e2;
        if (1 < arguments.length) {
          t2 += "?args[]=" + encodeURIComponent(arguments[1]);
          for (var r2 = 2; r2 < arguments.length; r2++) t2 += "&args[]=" + encodeURIComponent(arguments[r2]);
        }
        return "Minified React error #" + e2 + "; visit " + t2 + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      var i = Array.isArray;
      function a() {
      }
      var o = Symbol.for("react.transitional.element"), l = Symbol.for("react.portal"), u = Symbol.for("react.fragment"), c = Symbol.for("react.strict_mode"), h = Symbol.for("react.profiler"), d = Symbol.for("react.forward_ref"), p = Symbol.for("react.suspense"), f = Symbol.for("react.memo"), g = Symbol.for("react.lazy"), m = Symbol.for("react.activity"), y = Symbol.for("react.view_transition"), _ = Symbol.iterator, w = Object.prototype.hasOwnProperty, b = Object.assign;
      function v(e2, t2, r2) {
        var n2 = r2.ref;
        return { $$typeof: o, type: e2, key: t2, ref: void 0 !== n2 ? n2 : null, props: r2 };
      }
      function k(e2) {
        return "object" == typeof e2 && null !== e2 && e2.$$typeof === o;
      }
      var E = /\/+/g;
      function S(e2, t2) {
        var r2, n2;
        return "object" == typeof e2 && null !== e2 && null != e2.key ? (r2 = "" + e2.key, n2 = { "=": "=0", ":": "=2" }, "$" + r2.replace(/[=:]/g, function(e3) {
          return n2[e3];
        })) : t2.toString(36);
      }
      function T(e2, t2, r2) {
        if (null == e2) return e2;
        var n2 = [], u2 = 0;
        return !function e3(t3, r3, n3, u3, c2) {
          var h2, d2, p2, f2 = typeof t3;
          ("undefined" === f2 || "boolean" === f2) && (t3 = null);
          var m2 = false;
          if (null === t3) m2 = true;
          else switch (f2) {
            case "bigint":
            case "string":
            case "number":
              m2 = true;
              break;
            case "object":
              switch (t3.$$typeof) {
                case o:
                case l:
                  m2 = true;
                  break;
                case g:
                  return e3((m2 = t3._init)(t3._payload), r3, n3, u3, c2);
              }
          }
          if (m2) return c2 = c2(t3), m2 = "" === u3 ? "." + S(t3, 0) : u3, i(c2) ? (n3 = "", null != m2 && (n3 = m2.replace(E, "$&/") + "/"), e3(c2, r3, n3, "", function(e4) {
            return e4;
          })) : null != c2 && (k(c2) && (h2 = c2, d2 = n3 + (null == c2.key || t3 && t3.key === c2.key ? "" : ("" + c2.key).replace(E, "$&/") + "/") + m2, c2 = v(h2.type, d2, h2.props)), r3.push(c2)), 1;
          m2 = 0;
          var y2 = "" === u3 ? "." : u3 + ":";
          if (i(t3)) for (var w2 = 0; w2 < t3.length; w2++) f2 = y2 + S(u3 = t3[w2], w2), m2 += e3(u3, r3, n3, f2, c2);
          else if ("function" == typeof (w2 = null === (p2 = t3) || "object" != typeof p2 ? null : "function" == typeof (p2 = _ && p2[_] || p2["@@iterator"]) ? p2 : null)) for (t3 = w2.call(t3), w2 = 0; !(u3 = t3.next()).done; ) f2 = y2 + S(u3 = u3.value, w2++), m2 += e3(u3, r3, n3, f2, c2);
          else if ("object" === f2) {
            if ("function" == typeof t3.then) return e3(function(e4) {
              switch (e4.status) {
                case "fulfilled":
                  return e4.value;
                case "rejected":
                  throw e4.reason;
                default:
                  switch ("string" == typeof e4.status ? e4.then(a, a) : (e4.status = "pending", e4.then(function(t4) {
                    "pending" === e4.status && (e4.status = "fulfilled", e4.value = t4);
                  }, function(t4) {
                    "pending" === e4.status && (e4.status = "rejected", e4.reason = t4);
                  })), e4.status) {
                    case "fulfilled":
                      return e4.value;
                    case "rejected":
                      throw e4.reason;
                  }
              }
              throw e4;
            }(t3), r3, n3, u3, c2);
            throw Error(s(31, "[object Object]" === (r3 = String(t3)) ? "object with keys {" + Object.keys(t3).join(", ") + "}" : r3));
          }
          return m2;
        }(e2, n2, "", "", function(e3) {
          return t2.call(r2, e3, u2++);
        }), n2;
      }
      function R(e2) {
        if (-1 === e2._status) {
          var t2 = (0, e2._result)();
          t2.then(function(r2) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 1, e2._result = r2, void 0 === t2.status && (t2.status = "fulfilled", t2.value = r2));
          }, function(r2) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 2, e2._result = r2, void 0 === t2.status && (t2.status = "rejected", t2.reason = r2));
          }), -1 === e2._status && (e2._status = 0, e2._result = t2);
        }
        if (1 === e2._status) return e2._result.default;
        throw e2._result;
      }
      function C() {
        return /* @__PURE__ */ new WeakMap();
      }
      function x() {
        return { s: 0, v: void 0, o: null, p: null };
      }
      r.Activity = m, r.Children = { map: T, forEach: function(e2, t2, r2) {
        T(e2, function() {
          t2.apply(this, arguments);
        }, r2);
      }, count: function(e2) {
        var t2 = 0;
        return T(e2, function() {
          t2++;
        }), t2;
      }, toArray: function(e2) {
        return T(e2, function(e3) {
          return e3;
        }) || [];
      }, only: function(e2) {
        if (!k(e2)) throw Error(s(143));
        return e2;
      } }, r.Fragment = u, r.Profiler = h, r.StrictMode = c, r.Suspense = p, r.ViewTransition = y, r.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = n, r.cache = function(e2) {
        return function() {
          var t2 = n.A;
          if (!t2) return e2.apply(null, arguments);
          var r2 = t2.getCacheForType(C);
          void 0 === (t2 = r2.get(e2)) && (t2 = x(), r2.set(e2, t2)), r2 = 0;
          for (var s2 = arguments.length; r2 < s2; r2++) {
            var i2 = arguments[r2];
            if ("function" == typeof i2 || "object" == typeof i2 && null !== i2) {
              var a2 = t2.o;
              null === a2 && (t2.o = a2 = /* @__PURE__ */ new WeakMap()), void 0 === (t2 = a2.get(i2)) && (t2 = x(), a2.set(i2, t2));
            } else null === (a2 = t2.p) && (t2.p = a2 = /* @__PURE__ */ new Map()), void 0 === (t2 = a2.get(i2)) && (t2 = x(), a2.set(i2, t2));
          }
          if (1 === t2.s) return t2.v;
          if (2 === t2.s) throw t2.v;
          try {
            var o2 = e2.apply(null, arguments);
            return (r2 = t2).s = 1, r2.v = o2;
          } catch (e3) {
            throw (o2 = t2).s = 2, o2.v = e3, e3;
          }
        };
      }, r.cacheSignal = function() {
        var e2 = n.A;
        return e2 ? e2.cacheSignal() : null;
      }, r.captureOwnerStack = function() {
        return null;
      }, r.cloneElement = function(e2, t2, r2) {
        if (null == e2) throw Error(s(267, e2));
        var n2 = b({}, e2.props), i2 = e2.key;
        if (null != t2) for (a2 in void 0 !== t2.key && (i2 = "" + t2.key), t2) w.call(t2, a2) && "key" !== a2 && "__self" !== a2 && "__source" !== a2 && ("ref" !== a2 || void 0 !== t2.ref) && (n2[a2] = t2[a2]);
        var a2 = arguments.length - 2;
        if (1 === a2) n2.children = r2;
        else if (1 < a2) {
          for (var o2 = Array(a2), l2 = 0; l2 < a2; l2++) o2[l2] = arguments[l2 + 2];
          n2.children = o2;
        }
        return v(e2.type, i2, n2);
      }, r.createElement = function(e2, t2, r2) {
        var n2, s2 = {}, i2 = null;
        if (null != t2) for (n2 in void 0 !== t2.key && (i2 = "" + t2.key), t2) w.call(t2, n2) && "key" !== n2 && "__self" !== n2 && "__source" !== n2 && (s2[n2] = t2[n2]);
        var a2 = arguments.length - 2;
        if (1 === a2) s2.children = r2;
        else if (1 < a2) {
          for (var o2 = Array(a2), l2 = 0; l2 < a2; l2++) o2[l2] = arguments[l2 + 2];
          s2.children = o2;
        }
        if (e2 && e2.defaultProps) for (n2 in a2 = e2.defaultProps) void 0 === s2[n2] && (s2[n2] = a2[n2]);
        return v(e2, i2, s2);
      }, r.createRef = function() {
        return { current: null };
      }, r.forwardRef = function(e2) {
        return { $$typeof: d, render: e2 };
      }, r.isValidElement = k, r.lazy = function(e2) {
        return { $$typeof: g, _payload: { _status: -1, _result: e2 }, _init: R };
      }, r.memo = function(e2, t2) {
        return { $$typeof: f, type: e2, compare: void 0 === t2 ? null : t2 };
      }, r.use = function(e2) {
        return n.H.use(e2);
      }, r.useCallback = function(e2, t2) {
        return n.H.useCallback(e2, t2);
      }, r.useDebugValue = function() {
      }, r.useId = function() {
        return n.H.useId();
      }, r.useMemo = function(e2, t2) {
        return n.H.useMemo(e2, t2);
      }, r.version = "19.3.0-canary-3f0b9e61-20260317";
    }, 40049, (e, t, r) => {
      "use strict";
      t.exports = e.r(708946);
    }, 478496, (e, t, r) => {
      "use strict";
      t.exports = s, t.exports.preferredCharsets = s;
      var n = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
      function s(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = e3.split(","), r3 = 0, s3 = 0; r3 < t3.length; r3++) {
            var i2 = function(e4, t4) {
              var r4 = n.exec(e4);
              if (!r4) return null;
              var s4 = r4[1], i3 = 1;
              if (r4[2]) for (var a2 = r4[2].split(";"), o2 = 0; o2 < a2.length; o2++) {
                var l = a2[o2].trim().split("=");
                if ("q" === l[0]) {
                  i3 = parseFloat(l[1]);
                  break;
                }
              }
              return { charset: s4, q: i3, i: t4 };
            }(t3[r3].trim(), r3);
            i2 && (t3[s3++] = i2);
          }
          return t3.length = s3, t3;
        }(void 0 === e2 ? "*" : e2 || "");
        if (!t2) return r2.filter(o).sort(i).map(a);
        var s2 = t2.map(function(e3, t3) {
          for (var n2 = { o: -1, q: 0, s: 0 }, s3 = 0; s3 < r2.length; s3++) {
            var i2 = function(e4, t4, r3) {
              var n3 = 0;
              if (t4.charset.toLowerCase() === e4.toLowerCase()) n3 |= 1;
              else if ("*" !== t4.charset) return null;
              return { i: r3, o: t4.i, q: t4.q, s: n3 };
            }(e3, r2[s3], t3);
            i2 && 0 > (n2.s - i2.s || n2.q - i2.q || n2.o - i2.o) && (n2 = i2);
          }
          return n2;
        });
        return s2.filter(o).sort(i).map(function(e3) {
          return t2[s2.indexOf(e3)];
        });
      }
      function i(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function a(e2) {
        return e2.charset;
      }
      function o(e2) {
        return e2.q > 0;
      }
    }, 364333, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredEncodings = i;
      var n = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
      function s(e2, t2, r2) {
        var n2 = 0;
        if (t2.encoding.toLowerCase() === e2.toLowerCase()) n2 |= 1;
        else if ("*" !== t2.encoding) return null;
        return { encoding: e2, i: r2, o: t2.i, q: t2.q, s: n2 };
      }
      function i(e2, t2, r2) {
        var i2 = function(e3) {
          for (var t3 = e3.split(","), r3 = false, i3 = 1, a2 = 0, o2 = 0; a2 < t3.length; a2++) {
            var l2 = function(e4, t4) {
              var r4 = n.exec(e4);
              if (!r4) return null;
              var s2 = r4[1], i4 = 1;
              if (r4[2]) for (var a3 = r4[2].split(";"), o3 = 0; o3 < a3.length; o3++) {
                var l3 = a3[o3].trim().split("=");
                if ("q" === l3[0]) {
                  i4 = parseFloat(l3[1]);
                  break;
                }
              }
              return { encoding: s2, q: i4, i: t4 };
            }(t3[a2].trim(), a2);
            l2 && (t3[o2++] = l2, r3 = r3 || s("identity", l2), i3 = Math.min(i3, l2.q || 1));
          }
          return r3 || (t3[o2++] = { encoding: "identity", q: i3, i: a2 }), t3.length = o2, t3;
        }(e2 || ""), u = r2 ? function(e3, t3) {
          if (e3.q !== t3.q) return t3.q - e3.q;
          var n2 = r2.indexOf(e3.encoding), s2 = r2.indexOf(t3.encoding);
          return -1 === n2 && -1 === s2 ? t3.s - e3.s || e3.o - t3.o || e3.i - t3.i : -1 !== n2 && -1 !== s2 ? n2 - s2 : -1 === n2 ? 1 : -1;
        } : a;
        if (!t2) return i2.filter(l).sort(u).map(o);
        var c = t2.map(function(e3, t3) {
          for (var r3 = { encoding: e3, o: -1, q: 0, s: 0 }, n2 = 0; n2 < i2.length; n2++) {
            var a2 = s(e3, i2[n2], t3);
            a2 && 0 > (r3.s - a2.s || r3.q - a2.q || r3.o - a2.o) && (r3 = a2);
          }
          return r3;
        });
        return c.filter(l).sort(u).map(function(e3) {
          return t2[c.indexOf(e3)];
        });
      }
      function a(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i;
      }
      function o(e2) {
        return e2.encoding;
      }
      function l(e2) {
        return e2.q > 0;
      }
    }, 675128, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredLanguages = i;
      var n = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
      function s(e2, t2) {
        var r2 = n.exec(e2);
        if (!r2) return null;
        var s2 = r2[1], i2 = r2[2], a2 = s2;
        i2 && (a2 += "-" + i2);
        var o2 = 1;
        if (r2[3]) for (var l2 = r2[3].split(";"), u = 0; u < l2.length; u++) {
          var c = l2[u].split("=");
          "q" === c[0] && (o2 = parseFloat(c[1]));
        }
        return { prefix: s2, suffix: i2, q: o2, i: t2, full: a2 };
      }
      function i(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = e3.split(","), r3 = 0, n3 = 0; r3 < t3.length; r3++) {
            var i2 = s(t3[r3].trim(), r3);
            i2 && (t3[n3++] = i2);
          }
          return t3.length = n3, t3;
        }(void 0 === e2 ? "*" : e2 || "");
        if (!t2) return r2.filter(l).sort(a).map(o);
        var n2 = t2.map(function(e3, t3) {
          for (var n3 = { o: -1, q: 0, s: 0 }, i2 = 0; i2 < r2.length; i2++) {
            var a2 = function(e4, t4, r3) {
              var n4 = s(e4);
              if (!n4) return null;
              var i3 = 0;
              if (t4.full.toLowerCase() === n4.full.toLowerCase()) i3 |= 4;
              else if (t4.prefix.toLowerCase() === n4.full.toLowerCase()) i3 |= 2;
              else if (t4.full.toLowerCase() === n4.prefix.toLowerCase()) i3 |= 1;
              else if ("*" !== t4.full) return null;
              return { i: r3, o: t4.i, q: t4.q, s: i3 };
            }(e3, r2[i2], t3);
            a2 && 0 > (n3.s - a2.s || n3.q - a2.q || n3.o - a2.o) && (n3 = a2);
          }
          return n3;
        });
        return n2.filter(l).sort(a).map(function(e3) {
          return t2[n2.indexOf(e3)];
        });
      }
      function a(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function o(e2) {
        return e2.full;
      }
      function l(e2) {
        return e2.q > 0;
      }
    }, 721105, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredMediaTypes = i;
      var n = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
      function s(e2, t2) {
        var r2 = n.exec(e2);
        if (!r2) return null;
        var s2 = /* @__PURE__ */ Object.create(null), i2 = 1, a2 = r2[2], o2 = r2[1];
        if (r2[3]) for (var l2 = function(e3) {
          for (var t3 = e3.split(";"), r3 = 1, n2 = 0; r3 < t3.length; r3++) u(t3[n2]) % 2 == 0 ? t3[++n2] = t3[r3] : t3[n2] += ";" + t3[r3];
          t3.length = n2 + 1;
          for (var r3 = 0; r3 < t3.length; r3++) t3[r3] = t3[r3].trim();
          return t3;
        }(r2[3]).map(c), h = 0; h < l2.length; h++) {
          var d = l2[h], p = d[0].toLowerCase(), f = d[1], g = f && '"' === f[0] && '"' === f[f.length - 1] ? f.slice(1, -1) : f;
          if ("q" === p) {
            i2 = parseFloat(g);
            break;
          }
          s2[p] = g;
        }
        return { type: o2, subtype: a2, params: s2, q: i2, i: t2 };
      }
      function i(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = function(e4) {
            for (var t4 = e4.split(","), r4 = 1, n4 = 0; r4 < t4.length; r4++) u(t4[n4]) % 2 == 0 ? t4[++n4] = t4[r4] : t4[n4] += "," + t4[r4];
            return t4.length = n4 + 1, t4;
          }(e3), r3 = 0, n3 = 0; r3 < t3.length; r3++) {
            var i2 = s(t3[r3].trim(), r3);
            i2 && (t3[n3++] = i2);
          }
          return t3.length = n3, t3;
        }(void 0 === e2 ? "*/*" : e2 || "");
        if (!t2) return r2.filter(l).sort(a).map(o);
        var n2 = t2.map(function(e3, t3) {
          for (var n3 = { o: -1, q: 0, s: 0 }, i2 = 0; i2 < r2.length; i2++) {
            var a2 = function(e4, t4, r3) {
              var n4 = s(e4), i3 = 0;
              if (!n4) return null;
              if (t4.type.toLowerCase() == n4.type.toLowerCase()) i3 |= 4;
              else if ("*" != t4.type) return null;
              if (t4.subtype.toLowerCase() == n4.subtype.toLowerCase()) i3 |= 2;
              else if ("*" != t4.subtype) return null;
              var a3 = Object.keys(t4.params);
              if (a3.length > 0) if (!a3.every(function(e5) {
                return "*" == t4.params[e5] || (t4.params[e5] || "").toLowerCase() == (n4.params[e5] || "").toLowerCase();
              })) return null;
              else i3 |= 1;
              return { i: r3, o: t4.i, q: t4.q, s: i3 };
            }(e3, r2[i2], t3);
            a2 && 0 > (n3.s - a2.s || n3.q - a2.q || n3.o - a2.o) && (n3 = a2);
          }
          return n3;
        });
        return n2.filter(l).sort(a).map(function(e3) {
          return t2[n2.indexOf(e3)];
        });
      }
      function a(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function o(e2) {
        return e2.type + "/" + e2.subtype;
      }
      function l(e2) {
        return e2.q > 0;
      }
      function u(e2) {
        for (var t2 = 0, r2 = 0; -1 !== (r2 = e2.indexOf('"', r2)); ) t2++, r2++;
        return t2;
      }
      function c(e2) {
        var t2, r2, n2 = e2.indexOf("=");
        return -1 === n2 ? t2 = e2 : (t2 = e2.slice(0, n2), r2 = e2.slice(n2 + 1)), [t2, r2];
      }
    }, 475398, (e, t, r) => {
      "use strict";
      var n = e.r(478496), s = e.r(364333), i = e.r(675128), a = e.r(721105);
      function o(e2) {
        if (!(this instanceof o)) return new o(e2);
        this.request = e2;
      }
      t.exports = o, t.exports.Negotiator = o, o.prototype.charset = function(e2) {
        var t2 = this.charsets(e2);
        return t2 && t2[0];
      }, o.prototype.charsets = function(e2) {
        return n(this.request.headers["accept-charset"], e2);
      }, o.prototype.encoding = function(e2, t2) {
        var r2 = this.encodings(e2, t2);
        return r2 && r2[0];
      }, o.prototype.encodings = function(e2, t2) {
        return s(this.request.headers["accept-encoding"], e2, (t2 || {}).preferred);
      }, o.prototype.language = function(e2) {
        var t2 = this.languages(e2);
        return t2 && t2[0];
      }, o.prototype.languages = function(e2) {
        return i(this.request.headers["accept-language"], e2);
      }, o.prototype.mediaType = function(e2) {
        var t2 = this.mediaTypes(e2);
        return t2 && t2[0];
      }, o.prototype.mediaTypes = function(e2) {
        return a(this.request.headers.accept, e2);
      }, o.prototype.preferredCharset = o.prototype.charset, o.prototype.preferredCharsets = o.prototype.charsets, o.prototype.preferredEncoding = o.prototype.encoding, o.prototype.preferredEncodings = o.prototype.encodings, o.prototype.preferredLanguage = o.prototype.language, o.prototype.preferredLanguages = o.prototype.languages, o.prototype.preferredMediaType = o.prototype.mediaType, o.prototype.preferredMediaTypes = o.prototype.mediaTypes;
    }, 399929, (e, t, r) => {
      "use strict";
      let n;
      Object.defineProperty(r, "__esModule", { value: true }), r.parseCookie = h, r.parse = h, r.stringifyCookie = function(e2, t2) {
        let r2 = t2?.encode || encodeURIComponent, n2 = [];
        for (let t3 of Object.keys(e2)) {
          let a2 = e2[t3];
          if (void 0 === a2) continue;
          if (!s.test(t3)) throw TypeError(`cookie name is invalid: ${t3}`);
          let o2 = r2(a2);
          if (!i.test(o2)) throw TypeError(`cookie val is invalid: ${a2}`);
          n2.push(`${t3}=${o2}`);
        }
        return n2.join("; ");
      }, r.stringifySetCookie = d, r.serialize = d, r.parseSetCookie = function(e2, t2) {
        let r2 = t2?.decode || m, n2 = e2.length, s2 = p(e2, 0, n2), i2 = f(e2, 0, s2), a2 = -1 === i2 ? { name: "", value: r2(g(e2, 0, s2)) } : { name: g(e2, 0, i2), value: r2(g(e2, i2 + 1, s2)) }, o2 = s2 + 1;
        for (; o2 < n2; ) {
          let t3 = p(e2, o2, n2), r3 = f(e2, o2, t3), s3 = -1 === r3 ? g(e2, o2, t3) : g(e2, o2, r3), i3 = -1 === r3 ? void 0 : g(e2, r3 + 1, t3);
          switch (s3.toLowerCase()) {
            case "httponly":
              a2.httpOnly = true;
              break;
            case "secure":
              a2.secure = true;
              break;
            case "partitioned":
              a2.partitioned = true;
              break;
            case "domain":
              a2.domain = i3;
              break;
            case "path":
              a2.path = i3;
              break;
            case "max-age":
              i3 && l.test(i3) && (a2.maxAge = Number(i3));
              break;
            case "expires":
              if (!i3) break;
              let u2 = new Date(i3);
              Number.isFinite(u2.valueOf()) && (a2.expires = u2);
              break;
            case "priority":
              if (!i3) break;
              let c2 = i3.toLowerCase();
              ("low" === c2 || "medium" === c2 || "high" === c2) && (a2.priority = c2);
              break;
            case "samesite":
              if (!i3) break;
              let h2 = i3.toLowerCase();
              ("lax" === h2 || "strict" === h2 || "none" === h2) && (a2.sameSite = h2);
          }
          o2 = t3 + 1;
        }
        return a2;
      }, r.stringifySetCookie = d, r.serialize = d;
      let s = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/, i = /^[\u0021-\u003A\u003C-\u007E]*$/, a = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, o = /^[\u0020-\u003A\u003D-\u007E]*$/, l = /^-?\d+$/, u = Object.prototype.toString, c = ((n = function() {
      }).prototype = /* @__PURE__ */ Object.create(null), n);
      function h(e2, t2) {
        let r2 = new c(), n2 = e2.length;
        if (n2 < 2) return r2;
        let s2 = t2?.decode || m, i2 = 0;
        do {
          let t3 = f(e2, i2, n2);
          if (-1 === t3) break;
          let a2 = p(e2, i2, n2);
          if (t3 > a2) {
            i2 = e2.lastIndexOf(";", t3 - 1) + 1;
            continue;
          }
          let o2 = g(e2, i2, t3);
          void 0 === r2[o2] && (r2[o2] = s2(g(e2, t3 + 1, a2))), i2 = a2 + 1;
        } while (i2 < n2);
        return r2;
      }
      function d(e2, t2, r2) {
        let n2 = "object" == typeof e2 ? e2 : { ...r2, name: e2, value: String(t2) }, l2 = ("object" == typeof t2 ? t2 : r2)?.encode || encodeURIComponent;
        if (!s.test(n2.name)) throw TypeError(`argument name is invalid: ${n2.name}`);
        let c2 = n2.value ? l2(n2.value) : "";
        if (!i.test(c2)) throw TypeError(`argument val is invalid: ${n2.value}`);
        let h2 = n2.name + "=" + c2;
        if (void 0 !== n2.maxAge) {
          if (!Number.isInteger(n2.maxAge)) throw TypeError(`option maxAge is invalid: ${n2.maxAge}`);
          h2 += "; Max-Age=" + n2.maxAge;
        }
        if (n2.domain) {
          if (!a.test(n2.domain)) throw TypeError(`option domain is invalid: ${n2.domain}`);
          h2 += "; Domain=" + n2.domain;
        }
        if (n2.path) {
          if (!o.test(n2.path)) throw TypeError(`option path is invalid: ${n2.path}`);
          h2 += "; Path=" + n2.path;
        }
        if (n2.expires) {
          var d2;
          if (d2 = n2.expires, "[object Date]" !== u.call(d2) || !Number.isFinite(n2.expires.valueOf())) throw TypeError(`option expires is invalid: ${n2.expires}`);
          h2 += "; Expires=" + n2.expires.toUTCString();
        }
        if (n2.httpOnly && (h2 += "; HttpOnly"), n2.secure && (h2 += "; Secure"), n2.partitioned && (h2 += "; Partitioned"), n2.priority) switch ("string" == typeof n2.priority ? n2.priority.toLowerCase() : void 0) {
          case "low":
            h2 += "; Priority=Low";
            break;
          case "medium":
            h2 += "; Priority=Medium";
            break;
          case "high":
            h2 += "; Priority=High";
            break;
          default:
            throw TypeError(`option priority is invalid: ${n2.priority}`);
        }
        if (n2.sameSite) switch ("string" == typeof n2.sameSite ? n2.sameSite.toLowerCase() : n2.sameSite) {
          case true:
          case "strict":
            h2 += "; SameSite=Strict";
            break;
          case "lax":
            h2 += "; SameSite=Lax";
            break;
          case "none":
            h2 += "; SameSite=None";
            break;
          default:
            throw TypeError(`option sameSite is invalid: ${n2.sameSite}`);
        }
        return h2;
      }
      function p(e2, t2, r2) {
        let n2 = e2.indexOf(";", t2);
        return -1 === n2 ? r2 : n2;
      }
      function f(e2, t2, r2) {
        let n2 = e2.indexOf("=", t2);
        return n2 < r2 ? n2 : -1;
      }
      function g(e2, t2, r2) {
        let n2 = t2, s2 = r2;
        do {
          let t3 = e2.charCodeAt(n2);
          if (32 !== t3 && 9 !== t3) break;
        } while (++n2 < s2);
        for (; s2 > n2; ) {
          let t3 = e2.charCodeAt(s2 - 1);
          if (32 !== t3 && 9 !== t3) break;
          s2--;
        }
        return e2.slice(n2, s2);
      }
      function m(e2) {
        if (-1 === e2.indexOf("%")) return e2;
        try {
          return decodeURIComponent(e2);
        } catch (t2) {
          return e2;
        }
      }
    }, 558217, (e) => {
      "use strict";
      let t, r, n, s, i, a, o, l, u, c;
      async function h() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      e.i(674398);
      let d = null;
      async function p() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        d || (d = h());
        let e10 = await d;
        if (null == e10 ? void 0 : e10.register) try {
          await e10.register();
        } catch (e11) {
          throw e11.message = `An error occurred while loading instrumentation hook: ${e11.message}`, e11;
        }
      }
      async function f(...e10) {
        let t10 = await h();
        try {
          var r10;
          await (null == t10 || null == (r10 = t10.onRequestError) ? void 0 : r10.call(t10, ...e10));
        } catch (e11) {
          console.error("Error in instrumentation.onRequestError:", e11);
        }
      }
      let g = null;
      function m() {
        return g || (g = p()), g;
      }
      function y(e10) {
        return `The edge runtime does not support Node.js '${e10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== e.g.process && (process.env = e.g.process.env, e.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(e10) {
          let t10 = new Proxy(function() {
          }, { get(t11, r10) {
            if ("then" === r10) return {};
            throw Object.defineProperty(Error(y(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(y(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(r10, n10, s10) {
            if ("function" == typeof s10[0]) return s10[0](t10);
            throw Object.defineProperty(Error(y(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => t10 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      m();
      class _ extends Error {
        constructor({ page: e10 }) {
          super(`The middleware "${e10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class w extends Error {
        constructor() {
          super("The request.page has been deprecated in favour of `URLPattern`.\n  Read more: https://nextjs.org/docs/messages/middleware-request-page\n  ");
        }
      }
      class b extends Error {
        constructor() {
          super("The request.ua has been removed in favour of `userAgent` function.\n  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent\n  ");
        }
      }
      let v = "x-prerender-revalidate", k = ".meta", E = "x-next-cache-tags", S = "x-next-revalidated-tags", T = "_N_T_", R = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function C(e10) {
        var t10, r10, n10, s10, i10, a10 = [], o2 = 0;
        function l2() {
          for (; o2 < e10.length && /\s/.test(e10.charAt(o2)); ) o2 += 1;
          return o2 < e10.length;
        }
        for (; o2 < e10.length; ) {
          for (t10 = o2, i10 = false; l2(); ) if ("," === (r10 = e10.charAt(o2))) {
            for (n10 = o2, o2 += 1, l2(), s10 = o2; o2 < e10.length && "=" !== (r10 = e10.charAt(o2)) && ";" !== r10 && "," !== r10; ) o2 += 1;
            o2 < e10.length && "=" === e10.charAt(o2) ? (i10 = true, o2 = s10, a10.push(e10.substring(t10, n10)), t10 = o2) : o2 = n10 + 1;
          } else o2 += 1;
          (!i10 || o2 >= e10.length) && a10.push(e10.substring(t10, e10.length));
        }
        return a10;
      }
      function x(e10) {
        let t10 = {}, r10 = [];
        if (e10) for (let [n10, s10] of e10.entries()) "set-cookie" === n10.toLowerCase() ? (r10.push(...C(s10)), t10[n10] = 1 === r10.length ? r10[0] : r10) : t10[n10] = s10;
        return t10;
      }
      function O(e10) {
        try {
          return String(new URL(String(e10)));
        } catch (t10) {
          throw Object.defineProperty(Error(`URL is malformed "${String(e10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: t10 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ...R, GROUP: { builtinReact: [R.reactServerComponents, R.actionBrowser], serverOnly: [R.reactServerComponents, R.actionBrowser, R.instrument, R.middleware], neutralTarget: [R.apiNode, R.apiEdge], clientOnly: [R.serverSideRendering, R.appPagesBrowser], bundled: [R.reactServerComponents, R.actionBrowser, R.serverSideRendering, R.appPagesBrowser, R.shared, R.instrument, R.middleware], appPages: [R.reactServerComponents, R.serverSideRendering, R.appPagesBrowser, R.actionBrowser] } });
      let A = Symbol("response"), P = Symbol("passThrough"), I = Symbol("waitUntil");
      class N {
        constructor(e10, t10) {
          this[P] = false, this[I] = t10 ? { kind: "external", function: t10 } : { kind: "internal", promises: [] };
        }
        respondWith(e10) {
          this[A] || (this[A] = Promise.resolve(e10));
        }
        passThroughOnException() {
          this[P] = true;
        }
        waitUntil(e10) {
          if ("external" === this[I].kind) return (0, this[I].function)(e10);
          this[I].promises.push(e10);
        }
      }
      class j extends N {
        constructor(e10) {
          var t10;
          super(e10.request, null == (t10 = e10.context) ? void 0 : t10.waitUntil), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function $(e10) {
        return e10.replace(/\/$/, "") || "/";
      }
      function L(e10) {
        let t10 = e10.indexOf("#"), r10 = e10.indexOf("?"), n10 = r10 > -1 && (t10 < 0 || r10 < t10);
        return n10 || t10 > -1 ? { pathname: e10.substring(0, n10 ? r10 : t10), query: n10 ? e10.substring(r10, t10 > -1 ? t10 : void 0) : "", hash: t10 > -1 ? e10.slice(t10) : "" } : { pathname: e10, query: "", hash: "" };
      }
      function D(e10, t10) {
        if (!e10.startsWith("/") || !t10) return e10;
        let { pathname: r10, query: n10, hash: s10 } = L(e10);
        return `${t10}${r10}${n10}${s10}`;
      }
      function U(e10, t10) {
        if (!e10.startsWith("/") || !t10) return e10;
        let { pathname: r10, query: n10, hash: s10 } = L(e10);
        return `${r10}${t10}${n10}${s10}`;
      }
      function M(e10, t10) {
        if ("string" != typeof e10) return false;
        let { pathname: r10 } = L(e10);
        return r10 === t10 || r10.startsWith(t10 + "/");
      }
      let q = /* @__PURE__ */ new WeakMap();
      function B(e10, t10) {
        let r10;
        if (!t10) return { pathname: e10 };
        let n10 = q.get(t10);
        n10 || (n10 = t10.map((e11) => e11.toLowerCase()), q.set(t10, n10));
        let s10 = e10.split("/", 2);
        if (!s10[1]) return { pathname: e10 };
        let i10 = s10[1].toLowerCase(), a10 = n10.indexOf(i10);
        return a10 < 0 ? { pathname: e10 } : (r10 = t10[a10], { pathname: e10 = e10.slice(r10.length + 1) || "/", detectedLocale: r10 });
      }
      let H = /^(?:127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)$/;
      function G(e10, t10) {
        let r10 = new URL(String(e10), t10 && String(t10));
        return H.test(r10.hostname) && (r10.hostname = "localhost"), r10;
      }
      let F = Symbol("NextURLInternal");
      class W {
        constructor(e10, t10, r10) {
          let n10, s10;
          "object" == typeof t10 && "pathname" in t10 || "string" == typeof t10 ? (n10 = t10, s10 = r10 || {}) : s10 = r10 || t10 || {}, this[F] = { url: G(e10, n10 ?? s10.base), options: s10, basePath: "" }, this.analyze();
        }
        analyze() {
          var e10, t10, r10, n10, s10;
          let i10 = function(e11, t11) {
            let { basePath: r11, i18n: n11, trailingSlash: s11 } = t11.nextConfig ?? {}, i11 = { pathname: e11, trailingSlash: "/" !== e11 ? e11.endsWith("/") : s11 };
            r11 && M(i11.pathname, r11) && (i11.pathname = function(e12, t12) {
              if (!M(e12, t12)) return e12;
              let r12 = e12.slice(t12.length);
              return r12.startsWith("/") ? r12 : `/${r12}`;
            }(i11.pathname, r11), i11.basePath = r11);
            let a11 = i11.pathname;
            if (i11.pathname.startsWith("/_next/data/") && i11.pathname.endsWith(".json")) {
              let e12 = i11.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              i11.buildId = e12[0], a11 = "index" !== e12[1] ? `/${e12.slice(1).join("/")}` : "/", true === t11.parseData && (i11.pathname = a11);
            }
            if (n11) {
              let e12 = t11.i18nProvider ? t11.i18nProvider.analyze(i11.pathname) : B(i11.pathname, n11.locales);
              i11.locale = e12.detectedLocale, i11.pathname = e12.pathname ?? i11.pathname, !e12.detectedLocale && i11.buildId && (e12 = t11.i18nProvider ? t11.i18nProvider.analyze(a11) : B(a11, n11.locales)).detectedLocale && (i11.locale = e12.detectedLocale);
            }
            return i11;
          }(this[F].url.pathname, { nextConfig: this[F].options.nextConfig, parseData: true, i18nProvider: this[F].options.i18nProvider }), a10 = function(e11, t11) {
            let r11;
            if (t11?.host && !Array.isArray(t11.host)) r11 = t11.host.toString().split(":", 1)[0];
            else {
              if (!e11.hostname) return;
              r11 = e11.hostname;
            }
            return r11.toLowerCase();
          }(this[F].url, this[F].options.headers);
          this[F].domainLocale = this[F].options.i18nProvider ? this[F].options.i18nProvider.detectDomainLocale(a10) : function(e11, t11, r11) {
            if (e11) {
              for (let n11 of (r11 && (r11 = r11.toLowerCase()), e11)) if (t11 === n11.domain?.split(":", 1)[0].toLowerCase() || r11 === n11.defaultLocale.toLowerCase() || n11.locales?.some((e12) => e12.toLowerCase() === r11)) return n11;
            }
          }(null == (t10 = this[F].options.nextConfig) || null == (e10 = t10.i18n) ? void 0 : e10.domains, a10);
          let o2 = (null == (r10 = this[F].domainLocale) ? void 0 : r10.defaultLocale) || (null == (s10 = this[F].options.nextConfig) || null == (n10 = s10.i18n) ? void 0 : n10.defaultLocale);
          this[F].url.pathname = i10.pathname, this[F].defaultLocale = o2, this[F].basePath = i10.basePath ?? "", this[F].buildId = i10.buildId, this[F].locale = i10.locale ?? o2, this[F].trailingSlash = i10.trailingSlash;
        }
        formatPathname() {
          var e10;
          let t10;
          return t10 = function(e11, t11, r10, n10) {
            if (!t11 || t11 === r10) return e11;
            let s10 = e11.toLowerCase();
            return !n10 && (M(s10, "/api") || M(s10, `/${t11.toLowerCase()}`)) ? e11 : D(e11, `/${t11}`);
          }((e10 = { basePath: this[F].basePath, buildId: this[F].buildId, defaultLocale: this[F].options.forceLocale ? void 0 : this[F].defaultLocale, locale: this[F].locale, pathname: this[F].url.pathname, trailingSlash: this[F].trailingSlash }).pathname, e10.locale, e10.buildId ? void 0 : e10.defaultLocale, e10.ignorePrefix), (e10.buildId || !e10.trailingSlash) && (t10 = $(t10)), e10.buildId && (t10 = U(D(t10, `/_next/data/${e10.buildId}`), "/" === e10.pathname ? "index.json" : ".json")), t10 = D(t10, e10.basePath), !e10.buildId && e10.trailingSlash ? t10.endsWith("/") ? t10 : U(t10, "/") : $(t10);
        }
        formatSearch() {
          return this[F].url.search;
        }
        get buildId() {
          return this[F].buildId;
        }
        set buildId(e10) {
          this[F].buildId = e10;
        }
        get locale() {
          return this[F].locale ?? "";
        }
        set locale(e10) {
          var t10, r10;
          if (!this[F].locale || !(null == (r10 = this[F].options.nextConfig) || null == (t10 = r10.i18n) ? void 0 : t10.locales.includes(e10))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${e10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[F].locale = e10;
        }
        get defaultLocale() {
          return this[F].defaultLocale;
        }
        get domainLocale() {
          return this[F].domainLocale;
        }
        get searchParams() {
          return this[F].url.searchParams;
        }
        get host() {
          return this[F].url.host;
        }
        set host(e10) {
          this[F].url.host = e10;
        }
        get hostname() {
          return this[F].url.hostname;
        }
        set hostname(e10) {
          this[F].url.hostname = e10;
        }
        get port() {
          return this[F].url.port;
        }
        set port(e10) {
          this[F].url.port = e10;
        }
        get protocol() {
          return this[F].url.protocol;
        }
        set protocol(e10) {
          this[F].url.protocol = e10;
        }
        get href() {
          let e10 = this.formatPathname(), t10 = this.formatSearch();
          return `${this.protocol}//${this.host}${e10}${t10}${this.hash}`;
        }
        set href(e10) {
          this[F].url = G(e10), this.analyze();
        }
        get origin() {
          return this[F].url.origin;
        }
        get pathname() {
          return this[F].url.pathname;
        }
        set pathname(e10) {
          this[F].url.pathname = e10;
        }
        get hash() {
          return this[F].url.hash;
        }
        set hash(e10) {
          this[F].url.hash = e10;
        }
        get search() {
          return this[F].url.search;
        }
        set search(e10) {
          this[F].url.search = e10;
        }
        get password() {
          return this[F].url.password;
        }
        set password(e10) {
          this[F].url.password = e10;
        }
        get username() {
          return this[F].url.username;
        }
        set username(e10) {
          this[F].url.username = e10;
        }
        get basePath() {
          return this[F].basePath;
        }
        set basePath(e10) {
          this[F].basePath = e10.startsWith("/") ? e10 : `/${e10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new W(String(this), this[F].options);
        }
      }
      var z, K, V, J, X, Y, Z, Q, ee, et, er, en, es, ei, ea, eo, el, eu, ec, eh, ed, ep, ef, eg, em, ey, e_, ew, eb, ev, ek, eE, eS, eT, eR, eC, ex, eO, eA = e.i(940054);
      let eP = Symbol("internal request");
      class eI extends Request {
        constructor(e10, t10 = {}) {
          const r10 = "string" != typeof e10 && "url" in e10 ? e10.url : String(e10);
          O(r10), e10 instanceof Request ? super(e10, t10) : super(r10, t10);
          const n10 = new W(r10, { headers: x(this.headers), nextConfig: t10.nextConfig });
          this[eP] = { cookies: new eA.RequestCookies(this.headers), nextUrl: n10, url: n10.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[eP].cookies;
        }
        get nextUrl() {
          return this[eP].nextUrl;
        }
        get page() {
          throw new w();
        }
        get ua() {
          throw new b();
        }
        get url() {
          return this[eP].url;
        }
      }
      class eN {
        static get(e10, t10, r10) {
          let n10 = Reflect.get(e10, t10, r10);
          return "function" == typeof n10 ? n10.bind(e10) : n10;
        }
        static set(e10, t10, r10, n10) {
          return Reflect.set(e10, t10, r10, n10);
        }
        static has(e10, t10) {
          return Reflect.has(e10, t10);
        }
        static deleteProperty(e10, t10) {
          return Reflect.deleteProperty(e10, t10);
        }
      }
      let ej = Symbol("internal response"), e$ = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function eL(e10, t10) {
        var r10;
        if (null == e10 || null == (r10 = e10.request) ? void 0 : r10.headers) {
          if (!(e10.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let r11 = [];
          for (let [n10, s10] of e10.request.headers) t10.set("x-middleware-request-" + n10, s10), r11.push(n10);
          t10.set("x-middleware-override-headers", r11.join(","));
        }
      }
      class eD extends Response {
        constructor(e10, t10 = {}) {
          super(e10, t10);
          const r10 = this.headers, n10 = new Proxy(new eA.ResponseCookies(r10), { get(e11, n11, s10) {
            switch (n11) {
              case "delete":
              case "set":
                return (...s11) => {
                  let i10 = Reflect.apply(e11[n11], e11, s11), a10 = new Headers(r10);
                  return i10 instanceof eA.ResponseCookies && r10.set("x-middleware-set-cookie", i10.getAll().map((e12) => (0, eA.stringifyCookie)(e12)).join(",")), eL(t10, a10), i10;
                };
              default:
                return eN.get(e11, n11, s10);
            }
          } });
          this[ej] = { cookies: n10, url: t10.url ? new W(t10.url, { headers: x(r10), nextConfig: t10.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[ej].cookies;
        }
        static json(e10, t10) {
          let r10 = Response.json(e10, t10);
          return new eD(r10.body, r10);
        }
        static redirect(e10, t10) {
          let r10 = "number" == typeof t10 ? t10 : (null == t10 ? void 0 : t10.status) ?? 307;
          if (!e$.has(r10)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let n10 = "object" == typeof t10 ? t10 : {}, s10 = new Headers(null == n10 ? void 0 : n10.headers);
          return s10.set("Location", O(e10)), new eD(null, { ...n10, headers: s10, status: r10 });
        }
        static rewrite(e10, t10) {
          let r10 = new Headers(null == t10 ? void 0 : t10.headers);
          return r10.set("x-middleware-rewrite", O(e10)), eL(t10, r10), new eD(null, { ...t10, headers: r10 });
        }
        static next(e10) {
          let t10 = new Headers(null == e10 ? void 0 : e10.headers);
          return t10.set("x-middleware-next", "1"), eL(e10, t10), new eD(null, { ...e10, headers: t10 });
        }
      }
      function eU(e10, t10) {
        let r10 = "string" == typeof t10 ? new URL(t10) : t10, n10 = new URL(e10, t10), s10 = n10.origin === r10.origin;
        return { url: s10 ? n10.toString().slice(r10.origin.length) : n10.toString(), isRelative: s10 };
      }
      let eM = "next-router-prefetch", eq = ["rsc", "next-router-state-tree", eM, "next-hmr-refresh", "next-router-segment-prefetch"], eB = "_rsc";
      function eH(e10) {
        return e10.startsWith("/") ? e10 : `/${e10}`;
      }
      function eG(e10) {
        return eH(e10.split("/").reduce((e11, t10, r10, n10) => t10 ? "(" === t10[0] && t10.endsWith(")") || "@" === t10[0] || ("page" === t10 || "route" === t10) && r10 === n10.length - 1 ? e11 : `${e11}/${t10}` : e11, ""));
      }
      class eF extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new eF();
        }
      }
      class eW extends Headers {
        constructor(e10) {
          super(), this.headers = new Proxy(e10, { get(t10, r10, n10) {
            if ("symbol" == typeof r10) return eN.get(t10, r10, n10);
            let s10 = r10.toLowerCase(), i10 = Object.keys(e10).find((e11) => e11.toLowerCase() === s10);
            if (void 0 !== i10) return eN.get(t10, i10, n10);
          }, set(t10, r10, n10, s10) {
            if ("symbol" == typeof r10) return eN.set(t10, r10, n10, s10);
            let i10 = r10.toLowerCase(), a10 = Object.keys(e10).find((e11) => e11.toLowerCase() === i10);
            return eN.set(t10, a10 ?? r10, n10, s10);
          }, has(t10, r10) {
            if ("symbol" == typeof r10) return eN.has(t10, r10);
            let n10 = r10.toLowerCase(), s10 = Object.keys(e10).find((e11) => e11.toLowerCase() === n10);
            return void 0 !== s10 && eN.has(t10, s10);
          }, deleteProperty(t10, r10) {
            if ("symbol" == typeof r10) return eN.deleteProperty(t10, r10);
            let n10 = r10.toLowerCase(), s10 = Object.keys(e10).find((e11) => e11.toLowerCase() === n10);
            return void 0 === s10 || eN.deleteProperty(t10, s10);
          } });
        }
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "append":
              case "delete":
              case "set":
                return eF.callable;
              default:
                return eN.get(e11, t10, r10);
            }
          } });
        }
        merge(e10) {
          return Array.isArray(e10) ? e10.join(", ") : e10;
        }
        static from(e10) {
          return e10 instanceof Headers ? e10 : new eW(e10);
        }
        append(e10, t10) {
          let r10 = this.headers[e10];
          "string" == typeof r10 ? this.headers[e10] = [r10, t10] : Array.isArray(r10) ? r10.push(t10) : this.headers[e10] = t10;
        }
        delete(e10) {
          delete this.headers[e10];
        }
        get(e10) {
          let t10 = this.headers[e10];
          return void 0 !== t10 ? this.merge(t10) : null;
        }
        has(e10) {
          return void 0 !== this.headers[e10];
        }
        set(e10, t10) {
          this.headers[e10] = t10;
        }
        forEach(e10, t10) {
          for (let [r10, n10] of this.entries()) e10.call(t10, n10, r10, this);
        }
        *entries() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase(), r10 = this.get(t10);
            yield [t10, r10];
          }
        }
        *keys() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase();
            yield t10;
          }
        }
        *values() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = this.get(e10);
            yield t10;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let ez = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class eK {
        disable() {
          throw ez;
        }
        getStore() {
        }
        run() {
          throw ez;
        }
        exit() {
          throw ez;
        }
        enterWith() {
          throw ez;
        }
        static bind(e10) {
          return e10;
        }
      }
      let eV = "u" > typeof globalThis && globalThis.AsyncLocalStorage;
      function eJ() {
        return eV ? new eV() : new eK();
      }
      let eX = eJ();
      class eY extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new eY();
        }
      }
      class eZ {
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "clear":
              case "delete":
              case "set":
                return eY.callable;
              default:
                return eN.get(e11, t10, r10);
            }
          } });
        }
      }
      let eQ = Symbol.for("next.mutated.cookies");
      class e0 {
        static wrap(e10, t10) {
          let r10 = new eA.ResponseCookies(new Headers());
          for (let t11 of e10.getAll()) r10.set(t11);
          let n10 = [], s10 = /* @__PURE__ */ new Set(), i10 = () => {
            let e11 = eX.getStore();
            if (e11 && (e11.pathWasRevalidated = 1), n10 = r10.getAll().filter((e12) => s10.has(e12.name)), t10) {
              let e12 = [];
              for (let t11 of n10) {
                let r11 = new eA.ResponseCookies(new Headers());
                r11.set(t11), e12.push(r11.toString());
              }
              t10(e12);
            }
          }, a10 = new Proxy(r10, { get(e11, t11, r11) {
            switch (t11) {
              case eQ:
                return n10;
              case "delete":
                return function(...t12) {
                  s10.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.delete(...t12), a10;
                  } finally {
                    i10();
                  }
                };
              case "set":
                return function(...t12) {
                  s10.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.set(...t12), a10;
                  } finally {
                    i10();
                  }
                };
              default:
                return eN.get(e11, t11, r11);
            }
          } });
          return a10;
        }
      }
      function e1(e10) {
        return "action" === e10.phase;
      }
      function e2(e10, t10) {
        if (!e1(e10)) throw new eY();
      }
      var e3 = ((z = e3 || {}).handleRequest = "BaseServer.handleRequest", z.run = "BaseServer.run", z.pipe = "BaseServer.pipe", z.getStaticHTML = "BaseServer.getStaticHTML", z.render = "BaseServer.render", z.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", z.renderToResponse = "BaseServer.renderToResponse", z.renderToHTML = "BaseServer.renderToHTML", z.renderError = "BaseServer.renderError", z.renderErrorToResponse = "BaseServer.renderErrorToResponse", z.renderErrorToHTML = "BaseServer.renderErrorToHTML", z.render404 = "BaseServer.render404", z), e4 = ((K = e4 || {}).loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", K.loadComponents = "LoadComponents.loadComponents", K), e5 = ((V = e5 || {}).getRequestHandler = "NextServer.getRequestHandler", V.getRequestHandlerWithMetadata = "NextServer.getRequestHandlerWithMetadata", V.getServer = "NextServer.getServer", V.getServerRequestHandler = "NextServer.getServerRequestHandler", V.createServer = "createServer.createServer", V), e6 = ((J = e6 || {}).compression = "NextNodeServer.compression", J.getBuildId = "NextNodeServer.getBuildId", J.createComponentTree = "NextNodeServer.createComponentTree", J.clientComponentLoading = "NextNodeServer.clientComponentLoading", J.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", J.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", J.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", J.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", J.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", J.sendRenderResult = "NextNodeServer.sendRenderResult", J.proxyRequest = "NextNodeServer.proxyRequest", J.runApi = "NextNodeServer.runApi", J.render = "NextNodeServer.render", J.renderHTML = "NextNodeServer.renderHTML", J.imageOptimizer = "NextNodeServer.imageOptimizer", J.getPagePath = "NextNodeServer.getPagePath", J.getRoutesManifest = "NextNodeServer.getRoutesManifest", J.findPageComponents = "NextNodeServer.findPageComponents", J.getFontManifest = "NextNodeServer.getFontManifest", J.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", J.getRequestHandler = "NextNodeServer.getRequestHandler", J.renderToHTML = "NextNodeServer.renderToHTML", J.renderError = "NextNodeServer.renderError", J.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", J.render404 = "NextNodeServer.render404", J.startResponse = "NextNodeServer.startResponse", J.route = "route", J.onProxyReq = "onProxyReq", J.apiResolver = "apiResolver", J.internalFetch = "internalFetch", J), e8 = ((X = e8 || {}).startServer = "startServer.startServer", X), e9 = ((Y = e9 || {}).getServerSideProps = "Render.getServerSideProps", Y.getStaticProps = "Render.getStaticProps", Y.renderToString = "Render.renderToString", Y.renderDocument = "Render.renderDocument", Y.createBodyResult = "Render.createBodyResult", Y), e7 = ((Z = e7 || {}).renderToString = "AppRender.renderToString", Z.renderToReadableStream = "AppRender.renderToReadableStream", Z.getBodyResult = "AppRender.getBodyResult", Z.fetch = "AppRender.fetch", Z), te = ((Q = te || {}).executeRoute = "Router.executeRoute", Q), tt = ((ee = tt || {}).runHandler = "Node.runHandler", ee), tr = ((et = tr || {}).runHandler = "AppRouteRouteHandlers.runHandler", et), tn = ((er = tn || {}).generateMetadata = "ResolveMetadata.generateMetadata", er.generateViewport = "ResolveMetadata.generateViewport", er), ts = ((en = ts || {}).execute = "Middleware.execute", en);
      let ti = /* @__PURE__ */ new Set(["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"]), ta = /* @__PURE__ */ new Set(["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"]);
      function to(e10) {
        return null !== e10 && "object" == typeof e10 && "then" in e10 && "function" == typeof e10.then;
      }
      let tl = process.env.NEXT_OTEL_PERFORMANCE_PREFIX, { context: tu, propagation: tc, trace: th, SpanStatusCode: td, SpanKind: tp, ROOT_CONTEXT: tf } = t = e.r(311646);
      class tg extends Error {
        constructor(e10, t10) {
          super(), this.bubble = e10, this.result = t10;
        }
      }
      let tm = (e10, t10) => {
        "object" == typeof t10 && null !== t10 && t10 instanceof tg && t10.bubble ? e10.setAttribute("next.bubble", true) : (t10 && (e10.recordException(t10), e10.setAttribute("error.type", t10.name)), e10.setStatus({ code: td.ERROR, message: null == t10 ? void 0 : t10.message })), e10.end();
      }, ty = /* @__PURE__ */ new Map(), t_ = t.createContextKey("next.rootSpanId"), tw = 0, tb = { set(e10, t10, r10) {
        e10.push({ key: t10, value: r10 });
      } }, tv = (o = new class e {
        getTracerInstance() {
          return th.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return tu;
        }
        getTracePropagationData() {
          let e10 = tu.active(), t10 = [];
          return tc.inject(e10, t10, tb), t10;
        }
        getActiveScopeSpan() {
          return th.getSpan(null == tu ? void 0 : tu.active());
        }
        withPropagatedContext(e10, t10, r10, n10 = false) {
          let s10 = tu.active();
          if (n10) {
            let n11 = tc.extract(tf, e10, r10);
            if (th.getSpanContext(n11)) return tu.with(n11, t10);
            let i11 = tc.extract(s10, e10, r10);
            return tu.with(i11, t10);
          }
          if (th.getSpanContext(s10)) return t10();
          let i10 = tc.extract(s10, e10, r10);
          return tu.with(i10, t10);
        }
        trace(...e10) {
          let [t10, r10, n10] = e10, { fn: s10, options: i10 } = "function" == typeof r10 ? { fn: r10, options: {} } : { fn: n10, options: { ...r10 } }, a10 = i10.spanName ?? t10;
          if (!ti.has(t10) && "1" !== process.env.NEXT_OTEL_VERBOSE || i10.hideSpan) return s10();
          let o2 = this.getSpanContext((null == i10 ? void 0 : i10.parentSpan) ?? this.getActiveScopeSpan());
          o2 || (o2 = (null == tu ? void 0 : tu.active()) ?? tf);
          let l2 = o2.getValue(t_), u2 = "number" != typeof l2 || !ty.has(l2), c2 = tw++;
          return i10.attributes = { "next.span_name": a10, "next.span_type": t10, ...i10.attributes }, tu.with(o2.setValue(t_, c2), () => this.getTracerInstance().startActiveSpan(a10, i10, (e11) => {
            let r11;
            tl && t10 && ta.has(t10) && (r11 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0);
            let n11 = false, a11 = () => {
              !n11 && (n11 = true, ty.delete(c2), r11 && performance.measure(`${tl}:next-${(t10.split(".").pop() || "").replace(/[A-Z]/g, (e12) => "-" + e12.toLowerCase())}`, { start: r11, end: performance.now() }));
            };
            if (u2 && ty.set(c2, new Map(Object.entries(i10.attributes ?? {}))), s10.length > 1) try {
              return s10(e11, (t11) => tm(e11, t11));
            } catch (t11) {
              throw tm(e11, t11), t11;
            } finally {
              a11();
            }
            try {
              let t11 = s10(e11);
              if (to(t11)) return t11.then((t12) => (e11.end(), t12)).catch((t12) => {
                throw tm(e11, t12), t12;
              }).finally(a11);
              return e11.end(), a11(), t11;
            } catch (t11) {
              throw tm(e11, t11), a11(), t11;
            }
          }));
        }
        wrap(...e10) {
          let t10 = this, [r10, n10, s10] = 3 === e10.length ? e10 : [e10[0], {}, e10[1]];
          return ti.has(r10) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let e11 = n10;
            "function" == typeof e11 && "function" == typeof s10 && (e11 = e11.apply(this, arguments));
            let i10 = arguments.length - 1, a10 = arguments[i10];
            if ("function" != typeof a10) return t10.trace(r10, e11, () => s10.apply(this, arguments));
            {
              let n11 = t10.getContext().bind(tu.active(), a10);
              return t10.trace(r10, e11, (e12, t11) => (arguments[i10] = function(e13) {
                return null == t11 || t11(e13), n11.apply(this, arguments);
              }, s10.apply(this, arguments)));
            }
          } : s10;
        }
        startSpan(...e10) {
          let [t10, r10] = e10, n10 = this.getSpanContext((null == r10 ? void 0 : r10.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(t10, r10, n10);
        }
        getSpanContext(e10) {
          return e10 ? th.setSpan(tu.active(), e10) : void 0;
        }
        getRootSpanAttributes() {
          let e10 = tu.active().getValue(t_);
          return ty.get(e10);
        }
        setRootSpanAttribute(e10, t10) {
          let r10 = tu.active().getValue(t_), n10 = ty.get(r10);
          n10 && !n10.has(e10) && n10.set(e10, t10);
        }
        withSpan(e10, t10) {
          let r10 = th.setSpan(tu.active(), e10);
          return tu.with(r10, t10);
        }
      }(), () => o), tk = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(tk);
      class tE {
        constructor(e10, t10, r10, n10) {
          var s10;
          const i10 = e10 && function(e11, t11) {
            let r11 = eW.from(e11.headers);
            return { isOnDemandRevalidate: r11.get(v) === t11.previewModeId, revalidateOnlyGenerated: r11.has("x-prerender-revalidate-if-generated") };
          }(t10, e10).isOnDemandRevalidate, a10 = null == (s10 = r10.get(tk)) ? void 0 : s10.value;
          this._isEnabled = !!(!i10 && a10 && e10 && a10 === e10.previewModeId), this._previewModeId = null == e10 ? void 0 : e10.previewModeId, this._mutableCookies = n10;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: tk, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: tk, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function tS(e10, t10) {
        if ("x-middleware-set-cookie" in e10.headers && "string" == typeof e10.headers["x-middleware-set-cookie"]) {
          let r10 = e10.headers["x-middleware-set-cookie"], n10 = new Headers();
          for (let e11 of C(r10)) n10.append("set-cookie", e11);
          for (let e11 of new eA.ResponseCookies(n10).getAll()) t10.set(e11);
        }
      }
      let tT = eJ();
      class tR extends Error {
        constructor(e10, t10) {
          super(`Invariant: ${e10.endsWith(".") ? e10 : e10 + "."} This is a bug in Next.js.`, t10), this.name = "InvariantError";
        }
      }
      var tC = ((es = {})[es.Before = 1] = "Before", es[es.EarlyStatic = 2] = "EarlyStatic", es[es.Static = 3] = "Static", es[es.EarlyRuntime = 4] = "EarlyRuntime", es[es.Runtime = 5] = "Runtime", es[es.Dynamic = 6] = "Dynamic", es[es.Abandoned = 7] = "Abandoned", es);
      function tx(e10) {
        switch (e10.type) {
          case "prerender":
          case "prerender-runtime":
          case "prerender-ppr":
          case "prerender-client":
          case "validation-client":
            return e10.prerenderResumeDataCache;
          case "request":
            if (e10.prerenderResumeDataCache) return e10.prerenderResumeDataCache;
          case "prerender-legacy":
          case "cache":
          case "private-cache":
          case "unstable-cache":
          case "generate-static-params":
            return null;
          default:
            return e10;
        }
      }
      var tO = e.i(299734), tA = e.i(951615);
      process.env.NEXT_PRIVATE_DEBUG_CACHE, Symbol.for("@next/cache-handlers");
      let tP = Symbol.for("@next/cache-handlers-map"), tI = Symbol.for("@next/cache-handlers-set"), tN = globalThis;
      function tj() {
        if (tN[tP]) return tN[tP].entries();
      }
      async function t$(e10, t10) {
        if (!e10) return t10();
        let r10 = tL(e10);
        try {
          return await t10();
        } finally {
          var n10, s10, i10, a10;
          let t11, o2, l2, u2, c2 = (n10 = r10, s10 = tL(e10), t11 = new Set(n10.pendingRevalidatedTags.map((e11) => {
            let t12 = "object" == typeof e11.profile ? JSON.stringify(e11.profile) : e11.profile || "";
            return `${e11.tag}:${t12}`;
          })), o2 = new Set(n10.pendingRevalidateWrites), { pendingRevalidatedTags: s10.pendingRevalidatedTags.filter((e11) => {
            let r11 = "object" == typeof e11.profile ? JSON.stringify(e11.profile) : e11.profile || "";
            return !t11.has(`${e11.tag}:${r11}`);
          }), pendingRevalidates: Object.fromEntries(Object.entries(s10.pendingRevalidates).filter(([e11]) => !(e11 in n10.pendingRevalidates))), pendingRevalidateWrites: s10.pendingRevalidateWrites.filter((e11) => !o2.has(e11)) });
          await (i10 = e10, l2 = [], (u2 = (null == (a10 = c2) ? void 0 : a10.pendingRevalidatedTags) ?? i10.pendingRevalidatedTags ?? []).length > 0 && l2.push(tD(u2, i10.incrementalCache, i10)), l2.push(...Object.values((null == a10 ? void 0 : a10.pendingRevalidates) ?? i10.pendingRevalidates ?? {})), l2.push(...(null == a10 ? void 0 : a10.pendingRevalidateWrites) ?? i10.pendingRevalidateWrites ?? []), 0 !== l2.length && Promise.all(l2).then(() => void 0));
        }
      }
      function tL(e10) {
        return { pendingRevalidatedTags: e10.pendingRevalidatedTags ? [...e10.pendingRevalidatedTags] : [], pendingRevalidates: { ...e10.pendingRevalidates }, pendingRevalidateWrites: e10.pendingRevalidateWrites ? [...e10.pendingRevalidateWrites] : [] };
      }
      async function tD(e10, t10, r10) {
        if (0 === e10.length) return;
        let n10 = function() {
          if (tN[tI]) return tN[tI].values();
        }(), s10 = [], i10 = /* @__PURE__ */ new Map();
        for (let t11 of e10) {
          let e11, r11 = t11.profile;
          for (let [t12] of i10) if ("string" == typeof t12 && "string" == typeof r11 && t12 === r11 || "object" == typeof t12 && "object" == typeof r11 && JSON.stringify(t12) === JSON.stringify(r11) || t12 === r11) {
            e11 = t12;
            break;
          }
          let n11 = e11 || r11;
          i10.has(n11) || i10.set(n11, []), i10.get(n11).push(t11.tag);
        }
        for (let [e11, o2] of i10) {
          let i11;
          if (e11) {
            let t11;
            if ("object" == typeof e11) t11 = e11;
            else if ("string" == typeof e11) {
              var a10;
              if (!(t11 = null == r10 || null == (a10 = r10.cacheLifeProfiles) ? void 0 : a10[e11])) throw Object.defineProperty(Error(`Invalid profile provided "${e11}" must be configured under cacheLife in next.config or be "max"`), "__NEXT_ERROR_CODE", { value: "E873", enumerable: false, configurable: true });
            }
            t11 && (i11 = { expire: t11.expire });
          }
          for (let t11 of n10 || []) e11 ? s10.push(null == t11.updateTags ? void 0 : t11.updateTags.call(t11, o2, i11)) : s10.push(null == t11.updateTags ? void 0 : t11.updateTags.call(t11, o2));
          t10 && s10.push(t10.revalidateTag(o2, i11));
        }
        await Promise.all(s10);
      }
      let tU = eJ();
      class tM {
        constructor({ waitUntil: e10, onClose: t10, onTaskError: r10 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = e10, this.onClose = t10, this.onTaskError = r10, this.callbackQueue = new tO.default(), this.callbackQueue.pause();
        }
        after(e10) {
          if (to(e10)) this.waitUntil || tq(), this.waitUntil(e10.catch((e11) => this.reportTaskError("promise", e11)));
          else if ("function" == typeof e10) this.addCallback(e10);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(e10) {
          var t10;
          this.waitUntil || tq();
          let r10 = tT.getStore();
          r10 && this.workUnitStores.add(r10);
          let n10 = tU.getStore(), s10 = n10 ? n10.rootTaskSpawnPhase : null == r10 ? void 0 : r10.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let i10 = (t10 = async () => {
            try {
              await tU.run({ rootTaskSpawnPhase: s10 }, () => e10());
            } catch (e11) {
              this.reportTaskError("function", e11);
            }
          }, eV ? eV.bind(t10) : eK.bind(t10));
          this.callbackQueue.add(i10);
        }
        async runCallbacksOnClose() {
          return await new Promise((e10) => this.onClose(e10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          for (let e11 of this.workUnitStores) e11.phase = "after";
          let e10 = eX.getStore();
          if (!e10) throw Object.defineProperty(new tR("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return t$(e10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(e10, t10) {
          if (console.error("promise" === e10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", t10), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, t10);
          } catch (e11) {
            console.error(Object.defineProperty(new tR("`onTaskError` threw while handling an error thrown from an `after` task", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function tq() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function tB(e10) {
        let t10, r10 = { then: (n10, s10) => (t10 || (t10 = Promise.resolve(e10())), t10.then((e11) => {
          r10.value = e11;
        }).catch(() => {
        }), t10.then(n10, s10)) };
        return r10;
      }
      class tH {
        onClose(e10) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", e10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function tG() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let tF = Symbol.for("@next/request-context"), tW = /[^\t\x20-\x7e]/, tz = /[^\t\x20-\x7e]+/g;
      function tK(e10) {
        return tW.test(e10) ? e10.replace(tz, (e11) => encodeURIComponent(e11)) : e10;
      }
      async function tV(e10, t10, r10) {
        let n10 = /* @__PURE__ */ new Set();
        for (let t11 of ((e11) => {
          let t12 = ["/layout"];
          if (e11.startsWith("/")) {
            let r11 = e11.split("/");
            for (let e12 = 1; e12 < r11.length + 1; e12++) {
              let n11 = r11.slice(0, e12).join("/");
              n11 && (n11.endsWith("/page") || n11.endsWith("/route") || (n11 = `${n11}${!n11.endsWith("/") ? "/" : ""}layout`), t12.push(n11));
            }
          }
          return t12;
        })(e10)) t11 = tK(`${T}${t11}`), n10.add(t11);
        if (t10 && (!r10 || 0 === r10.size)) {
          let e11 = tK(`${T}${t10}`);
          n10.add(e11);
        }
        n10.has(`${T}/`) && n10.add(`${T}/index`), n10.has(`${T}/index`) && n10.add(`${T}/`);
        let s10 = Array.from(n10);
        return { tags: s10, expirationsByCacheKind: function(e11) {
          let t11 = /* @__PURE__ */ new Map(), r11 = tj();
          if (r11) for (let [n11, s11] of r11) "getExpiration" in s11 && t11.set(n11, tB(async () => s11.getExpiration(e11)));
          return t11;
        }(s10) };
      }
      let tJ = Symbol.for("NextInternalRequestMeta");
      class tX extends eI {
        constructor(e10) {
          super(e10.input, e10.init), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let tY = { keys: (e10) => Array.from(e10.keys()), get: (e10, t10) => e10.get(t10) ?? void 0 }, tZ = (e10, t10) => tv().withPropagatedContext(e10.headers, t10, tY), tQ = false;
      async function t0(t10) {
        var r10, n10, s10, i10, a10;
        let o2, l2, u2, c2, h2;
        !function() {
          if (!tQ && (tQ = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
            let { interceptTestApis: t11, wrapRequestHandler: r11 } = e.r(494165);
            t11(), tZ = r11(tZ);
          }
        }(), await m();
        let d2 = void 0 !== globalThis.__BUILD_MANIFEST;
        t10.request.url = t10.request.url.replace(/\.rsc($|\?)/, "$1");
        let p2 = t10.bypassNextUrl ? new URL(t10.request.url) : new W(t10.request.url, { headers: t10.request.headers, nextConfig: t10.request.nextConfig });
        for (let e10 of [...p2.searchParams.keys()]) {
          let t11 = p2.searchParams.getAll(e10), r11 = function(e11) {
            for (let t12 of ["nxtP", "nxtI"]) if (e11 !== t12 && e11.startsWith(t12)) return e11.substring(t12.length);
            return null;
          }(e10);
          if (r11) {
            for (let e11 of (p2.searchParams.delete(r11), t11)) p2.searchParams.append(r11, e11);
            p2.searchParams.delete(e10);
          }
        }
        let f2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in p2 && (f2 = p2.buildId || "", p2.buildId = "");
        let g2 = function(e10) {
          let t11 = new Headers();
          for (let [r11, n11] of Object.entries(e10)) for (let e11 of Array.isArray(n11) ? n11 : [n11]) void 0 !== e11 && ("number" == typeof e11 && (e11 = e11.toString()), t11.append(r11, e11));
          return t11;
        }(t10.request.headers), y2 = g2.has("x-nextjs-data"), _2 = "1" === g2.get("rsc");
        y2 && "/index" === p2.pathname && (p2.pathname = "/");
        let w2 = /* @__PURE__ */ new Map();
        if (!d2) for (let e10 of eq) {
          let t11 = g2.get(e10);
          null !== t11 && (w2.set(e10, t11), g2.delete(e10));
        }
        let b2 = p2.searchParams.get(eB), v2 = new tX({ page: t10.page, input: ((c2 = (u2 = "string" == typeof p2) ? new URL(p2) : p2).searchParams.delete(eB), u2 ? c2.toString() : c2).toString(), init: { body: t10.request.body, headers: g2, method: t10.request.method, nextConfig: t10.request.nextConfig, signal: t10.request.signal } });
        t10.request.requestMeta && (a10 = t10.request.requestMeta, v2[tJ] = a10), y2 && Object.defineProperty(v2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && t10.IncrementalCache && (globalThis.__incrementalCache = new t10.IncrementalCache({ CurCacheHandler: t10.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: t10.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: tG() }) }));
        let k2 = t10.request.waitUntil ?? (null == (r10 = null == (h2 = globalThis[tF]) ? void 0 : h2.get()) ? void 0 : r10.waitUntil), E2 = new j({ request: v2, page: t10.page, context: k2 ? { waitUntil: k2 } : void 0 });
        if ((o2 = await tZ(v2, () => {
          if ("/middleware" === t10.page || "/src/middleware" === t10.page || "/proxy" === t10.page || "/src/proxy" === t10.page) {
            let e10 = E2.waitUntil.bind(E2), r11 = new tH();
            return tv().trace(ts.execute, { spanName: `middleware ${v2.method}`, attributes: { "http.target": v2.nextUrl.pathname, "http.method": v2.method } }, async () => {
              try {
                var n11, s11, i11, a11, o3, u3;
                let c3 = tG(), h3 = await tV("/", v2.nextUrl.pathname, null), d3 = (o3 = v2.nextUrl, u3 = (e11) => {
                  l2 = e11;
                }, function(e11, t11, r12, n12, s12, i12, a12, o4, l3, u4) {
                  function c4(e12) {
                    r12 && r12.setHeader("Set-Cookie", e12);
                  }
                  let h4 = {};
                  return { type: "request", phase: e11, implicitTags: i12, url: { pathname: n12.pathname, search: n12.search ?? "" }, rootParams: s12, get headers() {
                    return h4.headers || (h4.headers = function(e12) {
                      let t12 = eW.from(e12);
                      for (let e13 of eq) t12.delete(e13);
                      return eW.seal(t12);
                    }(t11.headers)), h4.headers;
                  }, get cookies() {
                    if (!h4.cookies) {
                      let e12 = new eA.RequestCookies(eW.from(t11.headers));
                      tS(t11, e12), h4.cookies = eZ.seal(e12);
                    }
                    return h4.cookies;
                  }, set cookies(value) {
                    h4.cookies = value;
                  }, get mutableCookies() {
                    if (!h4.mutableCookies) {
                      var d4, p4;
                      let e12, n13 = (d4 = t11.headers, p4 = a12 || (r12 ? c4 : void 0), e12 = new eA.RequestCookies(eW.from(d4)), e0.wrap(e12, p4));
                      tS(t11, n13), h4.mutableCookies = n13;
                    }
                    return h4.mutableCookies;
                  }, get userspaceMutableCookies() {
                    if (!h4.userspaceMutableCookies) {
                      var f3;
                      let e12;
                      f3 = this, h4.userspaceMutableCookies = e12 = new Proxy(f3.mutableCookies, { get(t12, r13, n13) {
                        switch (r13) {
                          case "delete":
                            return function(...r14) {
                              return e2(f3, "cookies().delete"), t12.delete(...r14), e12;
                            };
                          case "set":
                            return function(...r14) {
                              return e2(f3, "cookies().set"), t12.set(...r14), e12;
                            };
                          default:
                            return eN.get(t12, r13, n13);
                        }
                      } });
                    }
                    return h4.userspaceMutableCookies;
                  }, get draftMode() {
                    return h4.draftMode || (h4.draftMode = new tE(o4, t11, this.cookies, this.mutableCookies)), h4.draftMode;
                  }, renderResumeDataCache: null, isHmrRefresh: l3, serverComponentsHmrCache: u4 || globalThis.__serverComponentsHmrCache, fallbackParams: null };
                }("action", v2, void 0, o3, {}, h3, u3, c3, false, void 0)), p3 = function({ page: e11, renderOpts: t11, isPrefetchRequest: r12, buildId: n12, deploymentId: s12, previouslyRevalidatedTags: i12, nonce: a12 }) {
                  let o4 = !t11.shouldWaitOnAllReady && !t11.supportsDynamicResponse && !t11.isDraftMode && !t11.isPossibleServerAction, l3 = o4 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), u4 = { isStaticGeneration: o4, page: e11, route: eG(e11), incrementalCache: t11.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: t11.cacheLifeProfiles, isBuildTimePrerendering: t11.isBuildTimePrerendering, fetchCache: t11.fetchCache, isOnDemandRevalidate: t11.isOnDemandRevalidate, isDraftMode: t11.isDraftMode, isPrefetchRequest: r12, buildId: n12, deploymentId: s12, reactLoadableManifest: (null == t11 ? void 0 : t11.reactLoadableManifest) || {}, assetPrefix: (null == t11 ? void 0 : t11.assetPrefix) || "", nonce: a12, afterContext: function(e12) {
                    let { waitUntil: t12, onClose: r13, onAfterTaskError: n13 } = e12;
                    return new tM({ waitUntil: t12, onClose: r13, onTaskError: n13 });
                  }(t11), cacheComponentsEnabled: t11.cacheComponents, previouslyRevalidatedTags: i12, refreshTagsByCacheKind: function() {
                    let e12 = /* @__PURE__ */ new Map(), t12 = tj();
                    if (t12) for (let [r13, n13] of t12) "refreshTags" in n13 && e12.set(r13, tB(async () => n13.refreshTags()));
                    return e12;
                  }(), runInCleanSnapshot: eV ? eV.snapshot() : function(e12, ...t12) {
                    return e12(...t12);
                  }, shouldTrackFetchMetrics: l3, reactServerErrorsByDigest: /* @__PURE__ */ new Map() };
                  return t11.store = u4, u4;
                }({ page: "/", renderOpts: { cacheLifeProfiles: null == (s11 = t10.request.nextConfig) || null == (n11 = s11.experimental) ? void 0 : n11.cacheLife, cacheComponents: false, experimental: { isRoutePPREnabled: false, authInterrupts: !!(null == (a11 = t10.request.nextConfig) || null == (i11 = a11.experimental) ? void 0 : i11.authInterrupts) }, supportsDynamicResponse: true, waitUntil: e10, onClose: r11.onClose.bind(r11), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === v2.headers.get(eM), buildId: f2 ?? "", deploymentId: false, previouslyRevalidatedTags: [] });
                return await eX.run(p3, () => tT.run(d3, t10.handler, v2, E2));
              } finally {
                setTimeout(() => {
                  r11.dispatchClose();
                }, 0);
              }
            });
          }
          return t10.handler(v2, E2);
        })) && !(o2 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        o2 && l2 && o2.headers.set("set-cookie", l2);
        let S2 = null == o2 ? void 0 : o2.headers.get("x-middleware-rewrite");
        if (o2 && S2 && (_2 || !d2)) {
          let e10 = new W(S2, { forceLocale: true, headers: t10.request.headers, nextConfig: t10.request.nextConfig });
          d2 || e10.host !== v2.nextUrl.host || (e10.buildId = f2 || e10.buildId, o2.headers.set("x-middleware-rewrite", String(e10)));
          let { url: r11, isRelative: a11 } = eU(e10.toString(), p2.toString());
          !d2 && y2 && o2.headers.set("x-nextjs-rewrite", r11);
          let l3 = !a11 && (null == (i10 = t10.request.nextConfig) || null == (s10 = i10.experimental) || null == (n10 = s10.clientParamParsingOrigins) ? void 0 : n10.some((t11) => new RegExp(t11).test(e10.origin)));
          _2 && (a11 || l3) && (p2.pathname !== e10.pathname && o2.headers.set("x-nextjs-rewritten-path", e10.pathname), p2.search !== e10.search && o2.headers.set("x-nextjs-rewritten-query", e10.search.slice(1)));
        }
        if (o2 && S2 && _2 && b2) {
          let e10 = new URL(S2);
          e10.searchParams.has(eB) || (e10.searchParams.set(eB, b2), o2.headers.set("x-middleware-rewrite", e10.toString()));
        }
        let T2 = null == o2 ? void 0 : o2.headers.get("Location");
        if (o2 && T2 && !d2) {
          let e10 = new W(T2, { forceLocale: false, headers: t10.request.headers, nextConfig: t10.request.nextConfig });
          o2 = new Response(o2.body, o2), e10.host === p2.host && (e10.buildId = f2 || e10.buildId, o2.headers.set("Location", eU(e10, p2).url)), y2 && (o2.headers.delete("Location"), o2.headers.set("x-nextjs-redirect", eU(e10.toString(), p2.toString()).url));
        }
        let R2 = o2 || eD.next(), C2 = R2.headers.get("x-middleware-override-headers"), x2 = [];
        if (C2) {
          for (let [e10, t11] of w2) R2.headers.set(`x-middleware-request-${e10}`, t11), x2.push(e10);
          x2.length > 0 && R2.headers.set("x-middleware-override-headers", C2 + "," + x2.join(","));
        }
        return { response: R2, waitUntil: ("internal" === E2[I].kind ? Promise.all(E2[I].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: v2.fetchMetrics };
      }
      class t1 {
        constructor() {
          let e10, t10;
          this.promise = new Promise((r10, n10) => {
            e10 = r10, t10 = n10;
          }), this.resolve = e10, this.reject = t10;
        }
      }
      class t2 {
        constructor(e10, t10, r10) {
          this.prev = null, this.next = null, this.key = e10, this.data = t10, this.size = r10;
        }
      }
      class t3 {
        constructor() {
          this.prev = null, this.next = null;
        }
      }
      class t4 {
        constructor(e10, t10, r10) {
          this.cache = /* @__PURE__ */ new Map(), this.totalSize = 0, this.maxSize = e10, this.calculateSize = t10, this.onEvict = r10, this.head = new t3(), this.tail = new t3(), this.head.next = this.tail, this.tail.prev = this.head;
        }
        addToHead(e10) {
          e10.prev = this.head, e10.next = this.head.next, this.head.next.prev = e10, this.head.next = e10;
        }
        removeNode(e10) {
          e10.prev.next = e10.next, e10.next.prev = e10.prev;
        }
        moveToHead(e10) {
          this.removeNode(e10), this.addToHead(e10);
        }
        removeTail() {
          let e10 = this.tail.prev;
          return this.removeNode(e10), e10;
        }
        set(e10, t10) {
          let r10 = (null == this.calculateSize ? void 0 : this.calculateSize.call(this, t10)) ?? 1;
          if (r10 <= 0) throw Object.defineProperty(Error(`LRUCache: calculateSize returned ${r10}, but size must be > 0. Items with size 0 would never be evicted, causing unbounded cache growth.`), "__NEXT_ERROR_CODE", { value: "E1045", enumerable: false, configurable: true });
          if (r10 > this.maxSize) return console.warn("Single item size exceeds maxSize"), false;
          let n10 = this.cache.get(e10);
          if (n10) n10.data = t10, this.totalSize = this.totalSize - n10.size + r10, n10.size = r10, this.moveToHead(n10);
          else {
            let n11 = new t2(e10, t10, r10);
            this.cache.set(e10, n11), this.addToHead(n11), this.totalSize += r10;
          }
          for (; this.totalSize > this.maxSize && this.cache.size > 0; ) {
            let e11 = this.removeTail();
            this.cache.delete(e11.key), this.totalSize -= e11.size, null == this.onEvict || this.onEvict.call(this, e11.key, e11.data);
          }
          return true;
        }
        has(e10) {
          return this.cache.has(e10);
        }
        get(e10) {
          let t10 = this.cache.get(e10);
          if (t10) return this.moveToHead(t10), t10.data;
        }
        *[Symbol.iterator]() {
          let e10 = this.head.next;
          for (; e10 && e10 !== this.tail; ) {
            let t10 = e10;
            yield [t10.key, t10.data], e10 = e10.next;
          }
        }
        remove(e10) {
          let t10 = this.cache.get(e10);
          t10 && (this.removeNode(t10), this.cache.delete(e10), this.totalSize -= t10.size);
        }
        get size() {
          return this.cache.size;
        }
        get currentSize() {
          return this.totalSize;
        }
      }
      let { env: t5, stdout: t6 } = (null == (ev = globalThis) ? void 0 : ev.process) ?? {}, t8 = t5 && !t5.NO_COLOR && (t5.FORCE_COLOR || (null == t6 ? void 0 : t6.isTTY) && !t5.CI && "dumb" !== t5.TERM), t9 = (e10, t10, r10, n10) => {
        let s10 = e10.substring(0, n10) + r10, i10 = e10.substring(n10 + t10.length), a10 = i10.indexOf(t10);
        return ~a10 ? s10 + t9(i10, t10, r10, a10) : s10 + i10;
      }, t7 = (e10, t10, r10 = e10) => t8 ? (n10) => {
        let s10 = "" + n10, i10 = s10.indexOf(t10, e10.length);
        return ~i10 ? e10 + t9(s10, t10, r10, i10) + t10 : e10 + s10 + t10;
      } : String, re2 = t7("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m");
      t7("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"), t7("\x1B[3m", "\x1B[23m"), t7("\x1B[4m", "\x1B[24m"), t7("\x1B[7m", "\x1B[27m"), t7("\x1B[8m", "\x1B[28m"), t7("\x1B[9m", "\x1B[29m"), t7("\x1B[30m", "\x1B[39m");
      let rt = t7("\x1B[31m", "\x1B[39m"), rr = t7("\x1B[32m", "\x1B[39m"), rn = t7("\x1B[33m", "\x1B[39m");
      t7("\x1B[34m", "\x1B[39m");
      let rs = t7("\x1B[35m", "\x1B[39m");
      t7("\x1B[38;2;173;127;168m", "\x1B[39m"), t7("\x1B[36m", "\x1B[39m");
      let ri = t7("\x1B[37m", "\x1B[39m");
      t7("\x1B[90m", "\x1B[39m"), t7("\x1B[40m", "\x1B[49m"), t7("\x1B[41m", "\x1B[49m"), t7("\x1B[42m", "\x1B[49m"), t7("\x1B[43m", "\x1B[49m"), t7("\x1B[44m", "\x1B[49m"), t7("\x1B[45m", "\x1B[49m"), t7("\x1B[46m", "\x1B[49m"), t7("\x1B[47m", "\x1B[49m"), ri(re2("\u25CB")), rt(re2("\u2A2F")), rn(re2("\u26A0")), ri(re2(" ")), rr(re2("\u2713")), rs(re2("\xBB")), new t4(1e4, (e10) => e10.length), new t4(1e4, (e10) => e10.length);
      var ra = ((ei = {}).APP_PAGE = "APP_PAGE", ei.APP_ROUTE = "APP_ROUTE", ei.PAGES = "PAGES", ei.FETCH = "FETCH", ei.REDIRECT = "REDIRECT", ei.IMAGE = "IMAGE", ei), ro = ((ea = {}).APP_PAGE = "APP_PAGE", ea.APP_ROUTE = "APP_ROUTE", ea.PAGES = "PAGES", ea.FETCH = "FETCH", ea.IMAGE = "IMAGE", ea);
      function rl() {
      }
      new TextEncoder();
      let ru = new TextEncoder();
      function rc(e10) {
        return new ReadableStream({ start(t10) {
          t10.enqueue(ru.encode(e10)), t10.close();
        } });
      }
      function rh(e10) {
        return new ReadableStream({ start(t10) {
          t10.enqueue(e10), t10.close();
        } });
      }
      async function rd(e10, t10) {
        let r10 = new TextDecoder("utf-8", { fatal: true }), n10 = "";
        for await (let s10 of e10) {
          if (null == t10 ? void 0 : t10.aborted) return n10;
          n10 += r10.decode(s10, { stream: true });
        }
        return n10 + r10.decode();
      }
      let rp = "ResponseAborted";
      class rf extends Error {
        constructor(...e10) {
          super(...e10), this.name = rp;
        }
      }
      let rg = 0, rm = 0, ry = 0;
      function r_(e10) {
        return (null == e10 ? void 0 : e10.name) === "AbortError" || (null == e10 ? void 0 : e10.name) === rp;
      }
      async function rw(e10, t10, r10) {
        try {
          let n10, { errored: s10, destroyed: i10 } = t10;
          if (s10 || i10) return;
          let a10 = (n10 = new AbortController(), t10.once("close", () => {
            t10.writableFinished || n10.abort(new rf());
          }), n10), o2 = function(e11, t11) {
            let r11 = false, n11 = new t1();
            function s11() {
              n11.resolve();
            }
            e11.on("drain", s11), e11.once("close", () => {
              e11.off("drain", s11), n11.resolve();
            });
            let i11 = new t1();
            return e11.once("finish", () => {
              i11.resolve();
            }), new WritableStream({ write: async (t12) => {
              if (!r11) {
                if (r11 = true, "performance" in globalThis && process.env.NEXT_OTEL_PERFORMANCE_PREFIX) {
                  let e12 = function(e13 = {}) {
                    let t13 = 0 === rg ? void 0 : { clientComponentLoadStart: rg, clientComponentLoadTimes: rm, clientComponentLoadCount: ry };
                    return e13.reset && (rg = 0, rm = 0, ry = 0), t13;
                  }();
                  e12 && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-client-component-loading`, { start: e12.clientComponentLoadStart, end: e12.clientComponentLoadStart + e12.clientComponentLoadTimes });
                }
                e11.flushHeaders(), tv().trace(e6.startResponse, { spanName: "start response" }, () => void 0);
              }
              try {
                let r12 = e11.write(t12);
                "flush" in e11 && "function" == typeof e11.flush && e11.flush(), r12 || (await n11.promise, n11 = new t1());
              } catch (t13) {
                throw e11.end(), Object.defineProperty(Error("failed to write chunk to response", { cause: t13 }), "__NEXT_ERROR_CODE", { value: "E321", enumerable: false, configurable: true });
              }
            }, abort: (t12) => {
              e11.writableFinished || e11.destroy(t12);
            }, close: async () => {
              if (t11 && await t11, !e11.writableFinished) return e11.end(), i11.promise;
            } });
          }(t10, r10);
          await e10.pipeTo(o2, { signal: a10.signal });
        } catch (e11) {
          if (r_(e11)) return;
          throw Object.defineProperty(Error("failed to pipe response", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E180", enumerable: false, configurable: true });
        }
      }
      class rb {
        static #e = this.EMPTY = new rb(null, { metadata: {}, contentType: null });
        static fromStatic(e10, t10) {
          return new rb(e10, { metadata: {}, contentType: t10 });
        }
        constructor(e10, { contentType: t10, waitUntil: r10, metadata: n10 }) {
          this.response = e10, this.contentType = t10, this.metadata = n10, this.waitUntil = r10;
        }
        assignMetadata(e10) {
          Object.assign(this.metadata, e10);
        }
        get isNull() {
          return null === this.response;
        }
        get isDynamic() {
          return "string" != typeof this.response;
        }
        toUnchunkedString(e10 = false) {
          if (null === this.response) return "";
          if ("string" != typeof this.response) {
            if (!e10) throw Object.defineProperty(new tR("dynamic responses cannot be unchunked. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E732", enumerable: false, configurable: true });
            return rd(this.readable);
          }
          return this.response;
        }
        get readable() {
          return null === this.response ? new ReadableStream({ start(e10) {
            e10.close();
          } }) : "string" == typeof this.response ? rc(this.response) : tA.Buffer.isBuffer(this.response) ? rh(this.response) : Array.isArray(this.response) ? function(...e10) {
            if (0 === e10.length) return new ReadableStream({ start(e11) {
              e11.close();
            } });
            if (1 === e10.length) return e10[0];
            let { readable: t10, writable: r10 } = new TransformStream(), n10 = e10[0].pipeTo(r10, { preventClose: true }), s10 = 1;
            for (; s10 < e10.length - 1; s10++) {
              let t11 = e10[s10];
              n10 = n10.then(() => t11.pipeTo(r10, { preventClose: true }));
            }
            let i10 = e10[s10];
            return (n10 = n10.then(() => i10.pipeTo(r10))).catch(rl), t10;
          }(...this.response) : this.response;
        }
        coerce() {
          return null === this.response ? [] : "string" == typeof this.response ? [rc(this.response)] : Array.isArray(this.response) ? this.response : tA.Buffer.isBuffer(this.response) ? [rh(this.response)] : [this.response];
        }
        pipeThrough(e10) {
          this.response = this.readable.pipeThrough(e10);
        }
        unshift(e10) {
          this.response = this.coerce(), this.response.unshift(e10);
        }
        push(e10) {
          this.response = this.coerce(), this.response.push(e10);
        }
        async pipeTo(e10) {
          try {
            await this.readable.pipeTo(e10, { preventClose: true }), this.waitUntil && await this.waitUntil, await e10.close();
          } catch (t10) {
            if (r_(t10)) return void await e10.abort(t10);
            throw t10;
          }
        }
        async pipeToNodeResponse(e10) {
          await rw(this.readable, e10, this.waitUntil);
        }
      }
      function rv(e10, t10) {
        if (!e10) return t10;
        let r10 = parseInt(e10, 10);
        return Number.isFinite(r10) && r10 > 0 ? r10 : t10;
      }
      rv(process.env.NEXT_PRIVATE_RESPONSE_CACHE_TTL, 1e4), rv(process.env.NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE, 150);
      var rk = e.i(268886);
      let rE = /* @__PURE__ */ new Map(), rS = (e10, t10) => {
        for (let r10 of e10) {
          let e11 = rE.get(r10), n10 = null == e11 ? void 0 : e11.expired;
          if ("number" == typeof n10 && n10 <= Date.now() && n10 > t10) return true;
        }
        return false;
      }, rT = (e10, t10) => {
        for (let r10 of e10) {
          let e11 = rE.get(r10), n10 = (null == e11 ? void 0 : e11.stale) ?? 0;
          if ("number" == typeof n10 && n10 > t10) return true;
        }
        return false;
      };
      class rR {
        constructor(e10) {
          this.fs = e10, this.tasks = [];
        }
        findOrCreateTask(e10) {
          for (let t11 of this.tasks) if (t11[0] === e10) return t11;
          let t10 = this.fs.mkdir(e10);
          t10.catch(() => {
          });
          let r10 = [e10, t10, []];
          return this.tasks.push(r10), r10;
        }
        append(e10, t10) {
          let r10 = this.findOrCreateTask(rk.default.dirname(e10)), n10 = r10[1].then(() => this.fs.writeFile(e10, t10));
          n10.catch(() => {
          }), r10[2].push(n10);
        }
        wait() {
          return Promise.all(this.tasks.flatMap((e10) => e10[2]));
        }
      }
      function rC(e10) {
        return (null == e10 ? void 0 : e10.length) || 0;
      }
      class rx {
        static #e = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor(e10) {
          this.fs = e10.fs, this.flushToDisk = e10.flushToDisk, this.serverDistDir = e10.serverDistDir, this.revalidatedTags = e10.revalidatedTags, e10.maxMemoryCacheSize ? rx.memoryCache ? rx.debug && console.log("FileSystemCache: memory store already initialized") : (rx.debug && console.log("FileSystemCache: using memory store for fetch cache"), rx.memoryCache = function(e11) {
            return r || (r = new t4(e11, function({ value: e12 }) {
              var t10, r10;
              if (!e12) return 25;
              if (e12.kind === ra.REDIRECT) return JSON.stringify(e12.props).length;
              if (e12.kind === ra.IMAGE) throw Object.defineProperty(Error("invariant image should not be incremental-cache"), "__NEXT_ERROR_CODE", { value: "E501", enumerable: false, configurable: true });
              if (e12.kind === ra.FETCH) return JSON.stringify(e12.data || "").length;
              if (e12.kind === ra.APP_ROUTE) return e12.body.length;
              return e12.kind === ra.APP_PAGE ? Math.max(1, e12.html.length + rC(e12.rscData) + ((null == (r10 = e12.postponed) ? void 0 : r10.length) || 0) + function(e13) {
                if (!e13) return 0;
                let t11 = 0;
                for (let [r11, n10] of e13) t11 += r11.length + rC(n10);
                return t11;
              }(e12.segmentData)) : e12.html.length + ((null == (t10 = JSON.stringify(e12.pageData)) ? void 0 : t10.length) || 0);
            })), r;
          }(e10.maxMemoryCacheSize)) : rx.debug && console.log("FileSystemCache: not using memory store for fetch cache");
        }
        resetRequestCache() {
        }
        async revalidateTag(e10, t10) {
          if (e10 = "string" == typeof e10 ? [e10] : e10, rx.debug && console.log("FileSystemCache: revalidateTag", e10, t10), 0 === e10.length) return;
          let r10 = Date.now();
          for (let n10 of e10) {
            let e11 = rE.get(n10) || {};
            if (t10) {
              let s10 = { ...e11 };
              s10.stale = r10, void 0 !== t10.expire && (s10.expired = r10 + 1e3 * t10.expire), rE.set(n10, s10);
            } else rE.set(n10, { ...e11, expired: r10 });
          }
        }
        async get(...e10) {
          var t10, r10, n10, s10, i10, a10;
          let [o2, l2] = e10, { kind: u2 } = l2, c2 = null == (t10 = rx.memoryCache) ? void 0 : t10.get(o2);
          if (rx.debug && (u2 === ro.FETCH ? console.log("FileSystemCache: get", o2, l2.tags, u2, !!c2) : console.log("FileSystemCache: get", o2, u2, !!c2)), (null == c2 || null == (r10 = c2.value) ? void 0 : r10.kind) === ra.APP_PAGE || (null == c2 || null == (n10 = c2.value) ? void 0 : n10.kind) === ra.APP_ROUTE || (null == c2 || null == (s10 = c2.value) ? void 0 : s10.kind) === ra.PAGES) {
            let e11 = null == (a10 = c2.value.headers) ? void 0 : a10[E];
            if ("string" == typeof e11) {
              let t11 = e11.split(",");
              if (t11.length > 0 && rS(t11, c2.lastModified)) return rx.debug && console.log("FileSystemCache: expired tags", t11), null;
            }
          } else if ((null == c2 || null == (i10 = c2.value) ? void 0 : i10.kind) === ra.FETCH) {
            let e11 = l2.kind === ro.FETCH ? [...l2.tags || [], ...l2.softTags || []] : [];
            if (e11.some((e12) => this.revalidatedTags.includes(e12))) return rx.debug && console.log("FileSystemCache: was revalidated", e11), null;
            if (rS(e11, c2.lastModified)) return rx.debug && console.log("FileSystemCache: expired tags", e11), null;
          }
          return c2 ?? null;
        }
        async set(e10, t10, r10) {
          var n10;
          if (null == (n10 = rx.memoryCache) || n10.set(e10, { value: t10, lastModified: Date.now() }), rx.debug && console.log("FileSystemCache: set", e10), !this.flushToDisk || !t10) return;
          let s10 = new rR(this.fs);
          if (t10.kind === ra.APP_ROUTE) {
            let r11 = this.getFilePath(`${e10}.body`, ro.APP_ROUTE);
            s10.append(r11, t10.body);
            let n11 = { headers: t10.headers, status: t10.status, postponed: void 0, segmentPaths: void 0, prefetchHints: void 0 };
            s10.append(r11.replace(/\.body$/, k), JSON.stringify(n11, null, 2));
          } else if (t10.kind === ra.PAGES || t10.kind === ra.APP_PAGE) {
            let n11 = t10.kind === ra.APP_PAGE, i10 = this.getFilePath(`${e10}.html`, n11 ? ro.APP_PAGE : ro.PAGES);
            if (s10.append(i10, t10.html), r10.fetchCache || r10.isFallback || r10.isRoutePPREnabled || s10.append(this.getFilePath(`${e10}${n11 ? ".rsc" : ".json"}`, n11 ? ro.APP_PAGE : ro.PAGES), n11 ? t10.rscData : JSON.stringify(t10.pageData)), (null == t10 ? void 0 : t10.kind) === ra.APP_PAGE) {
              let e11;
              if (t10.segmentData) {
                e11 = [];
                let r12 = i10.replace(/\.html$/, ".segments");
                for (let [n12, i11] of t10.segmentData) {
                  e11.push(n12);
                  let t11 = r12 + n12 + ".segment.rsc";
                  s10.append(t11, i11);
                }
              }
              let r11 = { headers: t10.headers, status: t10.status, postponed: t10.postponed, segmentPaths: e11, prefetchHints: void 0 };
              s10.append(i10.replace(/\.html$/, k), JSON.stringify(r11));
            }
          } else if (t10.kind === ra.FETCH) {
            let n11 = this.getFilePath(e10, ro.FETCH);
            s10.append(n11, JSON.stringify({ ...t10, tags: r10.fetchCache ? r10.tags : [] }));
          }
          await s10.wait();
        }
        getFilePath(e10, t10) {
          switch (t10) {
            case ro.FETCH:
              return rk.default.join(this.serverDistDir, "..", "cache", "fetch-cache", e10);
            case ro.PAGES:
              return rk.default.join(this.serverDistDir, "pages", e10);
            case ro.IMAGE:
            case ro.APP_PAGE:
            case ro.APP_ROUTE:
              return rk.default.join(this.serverDistDir, "app", e10);
            default:
              throw Object.defineProperty(Error(`Unexpected file path kind: ${t10}`), "__NEXT_ERROR_CODE", { value: "E479", enumerable: false, configurable: true });
          }
        }
      }
      let rO = ["(..)(..)", "(.)", "(..)", "(...)"], rA = /\/[^/]*\[[^/]+\][^/]*(?=\/|$)/, rP = /\/\[[^/]+\](?=\/|$)/;
      function rI(e10) {
        return e10.replace(/(?:\/index)?\/?$/, "") || "/";
      }
      class rN {
        static #e = this.cacheControls = /* @__PURE__ */ new Map();
        constructor(e10) {
          this.prerenderManifest = e10;
        }
        get(e10) {
          let t10 = rN.cacheControls.get(e10);
          if (t10) return t10;
          let r10 = this.prerenderManifest.routes[e10];
          if (r10) {
            let { initialRevalidateSeconds: e11, initialExpireSeconds: t11 } = r10;
            if (void 0 !== e11) return { revalidate: e11, expire: t11 };
          }
          let n10 = this.prerenderManifest.dynamicRoutes[e10];
          if (n10) {
            let { fallbackRevalidate: e11, fallbackExpire: t11 } = n10;
            if (void 0 !== e11) return { revalidate: e11, expire: t11 };
          }
        }
        set(e10, t10) {
          rN.cacheControls.set(e10, t10);
        }
        clear() {
          rN.cacheControls.clear();
        }
      }
      function rj(e10) {
        let t10 = "buffer" in e10 ? new Uint8Array(e10.buffer, e10.byteOffset, e10.byteLength) : new Uint8Array(e10), r10 = "";
        for (let e11 of t10) r10 += e11.toString(16).padStart(2, "0");
        return r10;
      }
      async function r$(e10) {
        {
          let t10 = new TextEncoder().encode(e10);
          return rj(await crypto.subtle.digest("SHA-256", t10));
        }
      }
      e.i(267914);
      class rL {
        static #e = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor({ fs: e10, dev: t10, flushToDisk: r10, minimalMode: n10, serverDistDir: s10, requestHeaders: i10, maxMemoryCacheSize: a10, getPrerenderManifest: o2, fetchCacheKeyPrefix: l2, CurCacheHandler: u2, allowedRevalidateHeaderKeys: c2 }) {
          var h2, d2, p2, f2;
          this.locks = /* @__PURE__ */ new Map(), this.hasCustomCacheHandler = !!u2;
          const g2 = Symbol.for("@next/cache-handlers"), m2 = globalThis;
          if (u2) rL.debug && console.log("IncrementalCache: using custom cache handler", u2.name);
          else {
            const t11 = m2[g2];
            (null == t11 ? void 0 : t11.FetchCache) ? (u2 = t11.FetchCache, rL.debug && console.log("IncrementalCache: using global FetchCache cache handler")) : e10 && s10 && (rL.debug && console.log("IncrementalCache: using filesystem cache handler"), u2 = rx);
          }
          process.env.__NEXT_TEST_MAX_ISR_CACHE && (a10 = parseInt(process.env.__NEXT_TEST_MAX_ISR_CACHE, 10)), this.dev = t10, this.disableForTestmode = "true" === process.env.NEXT_PRIVATE_TEST_PROXY, this.minimalMode = n10, this.requestHeaders = i10, this.allowedRevalidateHeaderKeys = c2, this.prerenderManifest = o2(), this.cacheControls = new rN(this.prerenderManifest), this.fetchCacheKeyPrefix = l2;
          let y2 = [];
          i10[v] === (null == (d2 = this.prerenderManifest) || null == (h2 = d2.preview) ? void 0 : h2.previewModeId) && (this.isOnDemandRevalidate = true), n10 && (y2 = this.revalidatedTags = function(e11, t11) {
            return "string" == typeof e11[S] && e11["x-next-revalidate-tag-token"] === t11 ? e11[S].split(",") : [];
          }(i10, null == (f2 = this.prerenderManifest) || null == (p2 = f2.preview) ? void 0 : p2.previewModeId)), u2 && (this.cacheHandler = new u2({ dev: t10, fs: e10, flushToDisk: r10, serverDistDir: s10, revalidatedTags: y2, maxMemoryCacheSize: a10, _requestHeaders: i10, fetchCacheKeyPrefix: l2 }));
        }
        calculateRevalidate(e10, t10, r10, n10) {
          if (r10) return Math.floor(performance.timeOrigin + performance.now() - 1e3);
          let s10 = this.cacheControls.get(rI(e10)), i10 = s10 ? s10.revalidate : !n10 && 1;
          return "number" == typeof i10 ? 1e3 * i10 + t10 : i10;
        }
        _getPathname(e10, t10) {
          return t10 ? e10 : /^\/index(\/|$)/.test(e10) && !function(e11, t11 = true) {
            return (void 0 !== e11.split("/").find((e12) => rO.find((t12) => e12.startsWith(t12))) && (e11 = function(e12) {
              let t12, r10, n10;
              for (let s10 of e12.split("/")) if (r10 = rO.find((e13) => s10.startsWith(e13))) {
                [t12, n10] = e12.split(r10, 2);
                break;
              }
              if (!t12 || !r10 || !n10) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Must be in the format /<intercepting route>/(..|...|..)(..)/<intercepted route>`), "__NEXT_ERROR_CODE", { value: "E269", enumerable: false, configurable: true });
              switch (t12 = eG(t12), r10) {
                case "(.)":
                  n10 = "/" === t12 ? `/${n10}` : t12 + "/" + n10;
                  break;
                case "(..)":
                  if ("/" === t12) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Cannot use (..) marker at the root level, use (.) instead.`), "__NEXT_ERROR_CODE", { value: "E207", enumerable: false, configurable: true });
                  n10 = t12.split("/").slice(0, -1).concat(n10).join("/");
                  break;
                case "(...)":
                  n10 = "/" + n10;
                  break;
                case "(..)(..)":
                  let s10 = t12.split("/");
                  if (s10.length <= 2) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Cannot use (..)(..) marker at the root level or one level up.`), "__NEXT_ERROR_CODE", { value: "E486", enumerable: false, configurable: true });
                  n10 = s10.slice(0, -2).concat(n10).join("/");
                  break;
                default:
                  throw Object.defineProperty(Error("Invariant: unexpected marker"), "__NEXT_ERROR_CODE", { value: "E112", enumerable: false, configurable: true });
              }
              return { interceptingRoute: t12, interceptedRoute: n10 };
            }(e11).interceptedRoute), t11) ? rP.test(e11) : rA.test(e11);
          }(e10) ? `/index${e10}` : "/" === e10 ? "/index" : eH(e10);
        }
        resetRequestCache() {
          var e10, t10;
          null == (t10 = this.cacheHandler) || null == (e10 = t10.resetRequestCache) || e10.call(t10);
        }
        async lock(e10) {
          for (; ; ) {
            let t11 = this.locks.get(e10);
            if (rL.debug && console.log("IncrementalCache: lock get", e10, !!t11), !t11) break;
            await t11;
          }
          let { resolve: t10, promise: r10 } = new t1();
          return rL.debug && console.log("IncrementalCache: successfully locked", e10), this.locks.set(e10, r10), () => {
            t10(), this.locks.delete(e10);
          };
        }
        async revalidateTag(e10, t10) {
          var r10;
          return null == (r10 = this.cacheHandler) ? void 0 : r10.revalidateTag(e10, t10);
        }
        async generateSimpleCacheKey(e10) {
          return r$(JSON.stringify(["v4", this.fetchCacheKeyPrefix || "", e10]));
        }
        async generateCacheKey(e10, t10 = {}) {
          let r10 = [], n10 = new TextEncoder(), s10 = null, i10 = t10.body;
          if (i10) if ("object" == typeof i10 && "byteLength" in i10) r10.push(`bytes:${rj(i10)}`), t10._ogBody = i10;
          else if ("function" == typeof i10.getReader) {
            let e11 = [];
            try {
              await i10.pipeTo(new WritableStream({ write(t11) {
                e11.push("string" == typeof t11 ? n10.encode(t11) : t11);
              } }));
              let s11 = e11.reduce((e12, t11) => e12 + t11.length, 0), a11 = new Uint8Array(s11), o2 = 0;
              for (let t11 of e11) a11.set(t11, o2), o2 += t11.length;
              r10.push(`bytes:${rj(a11)}`), t10._ogBody = a11;
            } catch (e12) {
              console.error("Problem reading body", e12);
            }
          } else if ("function" == typeof i10.keys) for (let [e11, n11] of (s10 = "[object FormData]" === String(i10) ? "multipart/form-data; boundary=" : "application/x-www-form-urlencoded;charset=UTF-8", t10._ogBody = i10, i10.entries())) r10.push(`key:${e11}`), "string" == typeof n11 ? r10.push(`str:${n11}`) : r10.push("file", n11.name, n11.type, `bytes:${rj(await n11.arrayBuffer())}`);
          else if ("function" == typeof i10.arrayBuffer) {
            let e11 = await i10.arrayBuffer();
            r10.push("blob", i10.type, `bytes:${rj(e11)}`), t10._ogBody = new Blob([e11], { type: i10.type }), s10 = i10.type;
          } else if ("string" == typeof i10) r10.push(`str:${i10}`), t10._ogBody = i10, s10 = "text/plain;charset=UTF-8";
          else throw Object.defineProperty(Error(`Unsupported body type: ${typeof i10}`), "__NEXT_ERROR_CODE", { value: "E1145", enumerable: false, configurable: true });
          let a10 = "function" == typeof (t10.headers || {}).keys ? Object.fromEntries(t10.headers) : Object.assign({}, t10.headers);
          return "traceparent" in a10 && delete a10.traceparent, "tracestate" in a10 && delete a10.tracestate, r$(JSON.stringify(["v4", this.fetchCacheKeyPrefix || "", e10, t10.method, s10, a10, t10.mode, t10.redirect, t10.credentials, t10.referrer, t10.referrerPolicy, t10.integrity, t10.cache, r10]));
        }
        async get(e10, t10) {
          var r10, n10, s10, i10, a10, o2, l2;
          let u2, c2;
          if (t10.kind === ro.FETCH) {
            let r11 = tT.getStore(), n11 = r11 ? function(e11) {
              switch (e11.type) {
                case "request":
                case "prerender":
                case "prerender-runtime":
                case "prerender-client":
                case "validation-client":
                  if (e11.renderResumeDataCache) return e11.renderResumeDataCache;
                case "prerender-ppr":
                  return e11.prerenderResumeDataCache ?? null;
                case "cache":
                case "private-cache":
                case "unstable-cache":
                case "prerender-legacy":
                case "generate-static-params":
                  return null;
                default:
                  return e11;
              }
            }(r11) : null;
            if (n11) {
              let r12 = n11.fetch.get(e10);
              if ((null == r12 ? void 0 : r12.kind) === ra.FETCH) {
                let n12 = eX.getStore();
                if (![...t10.tags || [], ...t10.softTags || []].some((e11) => {
                  var t11, r13;
                  return (null == (t11 = this.revalidatedTags) ? void 0 : t11.includes(e11)) || (null == n12 || null == (r13 = n12.pendingRevalidatedTags) ? void 0 : r13.some((t12) => t12.tag === e11));
                })) return rL.debug && console.log("IncrementalCache: rdc:hit", e10), { isStale: false, value: r12 };
                rL.debug && console.log("IncrementalCache: rdc:revalidated-tag", e10);
              } else rL.debug && console.log("IncrementalCache: rdc:miss", e10);
            } else rL.debug && console.log("IncrementalCache: rdc:no-resume-data");
          }
          if (this.disableForTestmode || this.dev && (t10.kind !== ro.FETCH || "no-cache" === this.requestHeaders["cache-control"])) return null;
          e10 = this._getPathname(e10, t10.kind === ro.FETCH);
          let h2 = await (null == (r10 = this.cacheHandler) ? void 0 : r10.get(e10, t10));
          if (t10.kind === ro.FETCH) {
            if (!h2) return null;
            if ((null == (s10 = h2.value) ? void 0 : s10.kind) !== ra.FETCH) throw Object.defineProperty(new tR(`Expected cached value for cache key ${JSON.stringify(e10)} to be a "FETCH" kind, got ${JSON.stringify(null == (i10 = h2.value) ? void 0 : i10.kind)} instead.`), "__NEXT_ERROR_CODE", { value: "E653", enumerable: false, configurable: true });
            let r11 = eX.getStore(), n11 = [...t10.tags || [], ...t10.softTags || []];
            if (n11.some((e11) => {
              var t11, n12;
              return (null == (t11 = this.revalidatedTags) ? void 0 : t11.includes(e11)) || (null == r11 || null == (n12 = r11.pendingRevalidatedTags) ? void 0 : n12.some((t12) => t12.tag === e11));
            })) return rL.debug && console.log("IncrementalCache: expired tag", e10), null;
            let a11 = tT.getStore();
            if (a11) {
              let t11 = tx(a11);
              t11 && (rL.debug && console.log("IncrementalCache: rdc:set", e10), t11.fetch.set(e10, h2.value));
            }
            let o3 = t10.revalidate || h2.value.revalidate, l3 = (performance.timeOrigin + performance.now() - (h2.lastModified || 0)) / 1e3 > o3, u3 = h2.value.data;
            return rS(n11, h2.lastModified) ? null : (rT(n11, h2.lastModified) && (l3 = true), { isStale: l3, value: { kind: ra.FETCH, data: u3, revalidate: o3 } });
          }
          if ((null == h2 || null == (n10 = h2.value) ? void 0 : n10.kind) === ra.FETCH) throw Object.defineProperty(new tR(`Expected cached value for cache key ${JSON.stringify(e10)} not to be a ${JSON.stringify(t10.kind)} kind, got "FETCH" instead.`), "__NEXT_ERROR_CODE", { value: "E652", enumerable: false, configurable: true });
          let d2 = null, { isFallback: p2 } = t10, f2 = this.cacheControls.get(rI(e10));
          if ((null == h2 ? void 0 : h2.lastModified) === -1) u2 = -1, c2 = -31536e6;
          else {
            let r11 = performance.timeOrigin + performance.now(), n11 = (null == h2 ? void 0 : h2.lastModified) || r11;
            if (void 0 === (u2 = false !== (c2 = this.calculateRevalidate(e10, n11, this.dev ?? false, t10.isFallback)) && c2 < r11 || void 0) && ((null == h2 || null == (a10 = h2.value) ? void 0 : a10.kind) === ra.APP_PAGE || (null == h2 || null == (o2 = h2.value) ? void 0 : o2.kind) === ra.APP_ROUTE)) {
              let e11 = null == (l2 = h2.value.headers) ? void 0 : l2[E];
              if ("string" == typeof e11) {
                let t11 = e11.split(",");
                t11.length > 0 && (rS(t11, n11) ? u2 = -1 : rT(t11, n11) && (u2 = true));
              }
            }
          }
          return h2 && (d2 = { isStale: u2, cacheControl: f2, revalidateAfter: c2, value: h2.value, isFallback: p2 }), !h2 && this.prerenderManifest.notFoundRoutes.includes(e10) && (d2 = { isStale: u2, value: null, cacheControl: f2, revalidateAfter: c2, isFallback: p2 }, this.set(e10, d2.value, { ...t10, cacheControl: f2 })), d2;
        }
        async set(e10, t10, r10) {
          if ((null == t10 ? void 0 : t10.kind) === ra.FETCH) {
            let r11 = tT.getStore(), n11 = r11 ? tx(r11) : null;
            n11 && (rL.debug && console.log("IncrementalCache: rdc:set", e10), n11.fetch.set(e10, t10));
          }
          if (this.disableForTestmode || this.dev && !r10.fetchCache) return;
          e10 = this._getPathname(e10, r10.fetchCache);
          let n10 = JSON.stringify(t10).length;
          if (r10.fetchCache && n10 > 2097152 && !this.hasCustomCacheHandler && !r10.isImplicitBuildTimeCache) {
            let t11 = `Failed to set Next.js data cache for ${r10.fetchUrl || e10}, items over 2MB can not be cached (${n10} bytes)`;
            if (this.dev) throw Object.defineProperty(Error(t11), "__NEXT_ERROR_CODE", { value: "E1003", enumerable: false, configurable: true });
            console.warn(t11);
            return;
          }
          try {
            var s10;
            !r10.fetchCache && r10.cacheControl && this.cacheControls.set(rI(e10), r10.cacheControl), await (null == (s10 = this.cacheHandler) ? void 0 : s10.set(e10, t10, r10));
          } catch (t11) {
            console.warn("Failed to update prerender cache for", e10, t11);
          }
        }
      }
      e.i(164445);
      var rD = e.i(40049);
      class rU extends Error {
        constructor(e10) {
          super(`Dynamic server usage: ${e10}`), this.description = e10, this.digest = "DYNAMIC_SERVER_USAGE";
        }
      }
      let rM = "function" == typeof rD.default.unstable_postpone;
      function rq(e10, t10) {
        return `Route ${e10} needs to bail out of prerendering at this point because it used ${t10}. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error`;
      }
      if (false === ((eo = rq("%%%", "^^^")).includes("needs to bail out of prerendering at this point because it used") && eo.includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error"))) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      function rB(e10, t10, r10) {
        return "string" == typeof e10 ? e10 : e10[t10] || r10;
      }
      function rH(e10) {
        let t10 = function() {
          try {
            return "true" === process.env._next_intl_trailing_slash;
          } catch {
            return false;
          }
        }(), [r10, ...n10] = e10.split("#"), s10 = n10.join("#"), i10 = r10;
        if ("/" !== i10) {
          let e11 = i10.endsWith("/");
          t10 && !e11 ? i10 += "/" : !t10 && e11 && (i10 = i10.slice(0, -1));
        }
        return s10 && (i10 += "#" + s10), i10;
      }
      function rG(e10, t10) {
        let r10 = rH(e10), n10 = rH(t10);
        return rW(r10).test(n10);
      }
      function rF(e10, t10) {
        return "never" !== t10.mode && t10.prefixes?.[e10] || "/" + e10;
      }
      function rW(e10) {
        let t10 = e10.replace(/\/\[\[(\.\.\.[^\]]+)\]\]/g, "(?:/(.*))?").replace(/\[\[(\.\.\.[^\]]+)\]\]/g, "(?:/(.*))?").replace(/\[(\.\.\.[^\]]+)\]/g, "(.+)").replace(/\[([^\]]+)\]/g, "([^/]+)");
        return RegExp(`^${t10}$`);
      }
      function rz(e10) {
        return e10.includes("[[...");
      }
      function rK(e10) {
        return e10.includes("[...");
      }
      function rV(e10) {
        return e10.includes("[");
      }
      function rJ(e10, t10) {
        let r10 = e10.split("/"), n10 = t10.split("/"), s10 = Math.max(r10.length, n10.length);
        for (let e11 = 0; e11 < s10; e11++) {
          let t11 = r10[e11], s11 = n10[e11];
          if (!t11 && s11) return -1;
          if (t11 && !s11) return 1;
          if (t11 || s11) {
            if (!rV(t11) && rV(s11)) return -1;
            if (rV(t11) && !rV(s11)) return 1;
            if (!rK(t11) && rK(s11)) return -1;
            if (rK(t11) && !rK(s11)) return 1;
            if (!rz(t11) && rz(s11)) return -1;
            if (rz(t11) && !rz(s11)) return 1;
          }
        }
        return 0;
      }
      function rX(e10, t10, r10, n10) {
        let s10 = "";
        return s10 += function(e11, t11) {
          if (!t11) return e11;
          let r11 = e11 = e11.replace(/\[\[/g, "[").replace(/\]\]/g, "]");
          return Object.entries(t11).forEach(([e12, t12]) => {
            r11 = r11.replace(`[${e12}]`, t12);
          }), r11;
        }(r10, function(e11, t11) {
          let r11 = rH(t11), n11 = rH(e11), s11 = rW(n11).exec(r11);
          if (!s11) return;
          let i10 = {}, a10 = n11.match(/\[([^\]]+)\]/g) ?? [];
          for (let e12 = 1; e12 < s11.length; e12++) {
            let t12 = a10[e12 - 1];
            if (!t12) continue;
            let r12 = t12.replace(/[[\]]/g, ""), n12 = s11[e12] ?? "";
            i10[r12] = n12;
          }
          return i10;
        }(t10, e10)), s10 = rH(s10);
      }
      function rY(e10, t10, r10) {
        e10.endsWith("/") || (e10 += "/");
        let n10 = rZ(t10, r10), s10 = RegExp(`^(${n10.map(([, e11]) => e11.replaceAll("/", "\\/")).join("|")})/(.*)`, "i"), i10 = e10.match(s10), a10 = i10 ? "/" + i10[2] : e10;
        return "/" !== a10 && (a10 = rH(a10)), a10;
      }
      function rZ(e10, t10, r10 = true) {
        let n10 = e10.map((e11) => [e11, rF(e11, t10)]);
        return r10 && n10.sort((e11, t11) => t11[1].length - e11[1].length), n10;
      }
      function rQ(e10, t10, r10, n10) {
        let s10 = rZ(t10, r10);
        for (let [t11, r11] of (n10 && s10.sort(([e11], [t12]) => {
          if (e11 === n10.defaultLocale) return -1;
          if (t12 === n10.defaultLocale) return 1;
          let r12 = n10.locales.includes(e11), s11 = n10.locales.includes(t12);
          return r12 && !s11 ? -1 : !r12 && s11 ? 1 : 0;
        }), s10)) {
          let n11, s11;
          if (e10 === r11 || e10.startsWith(r11 + "/")) n11 = s11 = true;
          else {
            let t12 = e10.toLowerCase(), i10 = r11.toLowerCase();
            (t12 === i10 || t12.startsWith(i10 + "/")) && (n11 = false, s11 = true);
          }
          if (s11) return { locale: t11, prefix: r11, matchedPrefix: e10.slice(0, r11.length), exact: n11 };
        }
      }
      function r0(e10, t10, r10) {
        var n10;
        let s10, i10 = e10;
        return t10 && (n10 = i10, s10 = t10, /^\/(\?.*)?$/.test(n10) && (n10 = n10.slice(1)), i10 = s10 += n10), r10 && (i10 += r10), i10;
      }
      function r1(e10) {
        return e10.get("x-forwarded-host") ?? e10.get("host") ?? void 0;
      }
      function r2(e10, t10) {
        return t10.defaultLocale === e10 || t10.locales.includes(e10);
      }
      function r3(e10, t10, r10) {
        let n10;
        return e10 && r2(t10, e10) && (n10 = e10), n10 || (n10 = r10.find((e11) => e11.defaultLocale === t10)), n10 || (n10 = r10.find((e11) => e11.locales.includes(t10))), n10;
      }
      RegExp("\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)"), RegExp("\\n\\s+at __next_metadata_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_viewport_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_outlet_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_instant_validation_boundary__[\\n\\s]");
      function r4(e10, t10, r10, n10) {
        let s10 = null == n10 || "number" == typeof n10 || "boolean" == typeof n10 ? n10 : r10(n10), i10 = t10.get(s10);
        return void 0 === i10 && (i10 = e10.call(this, n10), t10.set(s10, i10)), i10;
      }
      function r5(e10, t10, r10) {
        let n10 = Array.prototype.slice.call(arguments, 3), s10 = r10(n10), i10 = t10.get(s10);
        return void 0 === i10 && (i10 = e10.apply(this, n10), t10.set(s10, i10)), i10;
      }
      var r6 = class {
        constructor() {
          this.cache = /* @__PURE__ */ Object.create(null);
        }
        get(e10) {
          return this.cache[e10];
        }
        set(e10, t10) {
          this.cache[e10] = t10;
        }
      };
      let r8 = { "written-new": [{ paradigmLocales: { _locales: "en en_GB es es_419 pt_BR pt_PT" } }, { $enUS: { _value: "AS+CA+GU+MH+MP+PH+PR+UM+US+VI" } }, { $cnsar: { _value: "HK+MO" } }, { $americas: { _value: "019" } }, { $maghreb: { _value: "MA+DZ+TN+LY+MR+EH" } }, { no: { _desired: "nb", _distance: "1" } }, { bs: { _desired: "hr", _distance: "4" } }, { bs: { _desired: "sh", _distance: "4" } }, { hr: { _desired: "sh", _distance: "4" } }, { sr: { _desired: "sh", _distance: "4" } }, { aa: { _desired: "ssy", _distance: "4" } }, { de: { _desired: "gsw", _distance: "4", _oneway: "true" } }, { de: { _desired: "lb", _distance: "4", _oneway: "true" } }, { no: { _desired: "da", _distance: "8" } }, { nb: { _desired: "da", _distance: "8" } }, { ru: { _desired: "ab", _distance: "30", _oneway: "true" } }, { en: { _desired: "ach", _distance: "30", _oneway: "true" } }, { nl: { _desired: "af", _distance: "20", _oneway: "true" } }, { en: { _desired: "ak", _distance: "30", _oneway: "true" } }, { en: { _desired: "am", _distance: "30", _oneway: "true" } }, { es: { _desired: "ay", _distance: "20", _oneway: "true" } }, { ru: { _desired: "az", _distance: "30", _oneway: "true" } }, { ur: { _desired: "bal", _distance: "20", _oneway: "true" } }, { ru: { _desired: "be", _distance: "20", _oneway: "true" } }, { en: { _desired: "bem", _distance: "30", _oneway: "true" } }, { hi: { _desired: "bh", _distance: "30", _oneway: "true" } }, { en: { _desired: "bn", _distance: "30", _oneway: "true" } }, { zh: { _desired: "bo", _distance: "20", _oneway: "true" } }, { fr: { _desired: "br", _distance: "20", _oneway: "true" } }, { es: { _desired: "ca", _distance: "20", _oneway: "true" } }, { fil: { _desired: "ceb", _distance: "30", _oneway: "true" } }, { en: { _desired: "chr", _distance: "20", _oneway: "true" } }, { ar: { _desired: "ckb", _distance: "30", _oneway: "true" } }, { fr: { _desired: "co", _distance: "20", _oneway: "true" } }, { fr: { _desired: "crs", _distance: "20", _oneway: "true" } }, { sk: { _desired: "cs", _distance: "20" } }, { en: { _desired: "cy", _distance: "20", _oneway: "true" } }, { en: { _desired: "ee", _distance: "30", _oneway: "true" } }, { en: { _desired: "eo", _distance: "30", _oneway: "true" } }, { es: { _desired: "eu", _distance: "20", _oneway: "true" } }, { da: { _desired: "fo", _distance: "20", _oneway: "true" } }, { nl: { _desired: "fy", _distance: "20", _oneway: "true" } }, { en: { _desired: "ga", _distance: "20", _oneway: "true" } }, { en: { _desired: "gaa", _distance: "30", _oneway: "true" } }, { en: { _desired: "gd", _distance: "20", _oneway: "true" } }, { es: { _desired: "gl", _distance: "20", _oneway: "true" } }, { es: { _desired: "gn", _distance: "20", _oneway: "true" } }, { hi: { _desired: "gu", _distance: "30", _oneway: "true" } }, { en: { _desired: "ha", _distance: "30", _oneway: "true" } }, { en: { _desired: "haw", _distance: "20", _oneway: "true" } }, { fr: { _desired: "ht", _distance: "20", _oneway: "true" } }, { ru: { _desired: "hy", _distance: "30", _oneway: "true" } }, { en: { _desired: "ia", _distance: "30", _oneway: "true" } }, { en: { _desired: "ig", _distance: "30", _oneway: "true" } }, { en: { _desired: "is", _distance: "20", _oneway: "true" } }, { id: { _desired: "jv", _distance: "20", _oneway: "true" } }, { en: { _desired: "ka", _distance: "30", _oneway: "true" } }, { fr: { _desired: "kg", _distance: "30", _oneway: "true" } }, { ru: { _desired: "kk", _distance: "30", _oneway: "true" } }, { en: { _desired: "km", _distance: "30", _oneway: "true" } }, { en: { _desired: "kn", _distance: "30", _oneway: "true" } }, { en: { _desired: "kri", _distance: "30", _oneway: "true" } }, { tr: { _desired: "ku", _distance: "30", _oneway: "true" } }, { ru: { _desired: "ky", _distance: "30", _oneway: "true" } }, { it: { _desired: "la", _distance: "20", _oneway: "true" } }, { en: { _desired: "lg", _distance: "30", _oneway: "true" } }, { fr: { _desired: "ln", _distance: "30", _oneway: "true" } }, { en: { _desired: "lo", _distance: "30", _oneway: "true" } }, { en: { _desired: "loz", _distance: "30", _oneway: "true" } }, { fr: { _desired: "lua", _distance: "30", _oneway: "true" } }, { hi: { _desired: "mai", _distance: "20", _oneway: "true" } }, { en: { _desired: "mfe", _distance: "30", _oneway: "true" } }, { fr: { _desired: "mg", _distance: "30", _oneway: "true" } }, { en: { _desired: "mi", _distance: "20", _oneway: "true" } }, { en: { _desired: "ml", _distance: "30", _oneway: "true" } }, { ru: { _desired: "mn", _distance: "30", _oneway: "true" } }, { hi: { _desired: "mr", _distance: "30", _oneway: "true" } }, { id: { _desired: "ms", _distance: "30", _oneway: "true" } }, { en: { _desired: "mt", _distance: "30", _oneway: "true" } }, { en: { _desired: "my", _distance: "30", _oneway: "true" } }, { en: { _desired: "ne", _distance: "30", _oneway: "true" } }, { nb: { _desired: "nn", _distance: "20" } }, { no: { _desired: "nn", _distance: "20" } }, { en: { _desired: "nso", _distance: "30", _oneway: "true" } }, { en: { _desired: "ny", _distance: "30", _oneway: "true" } }, { en: { _desired: "nyn", _distance: "30", _oneway: "true" } }, { fr: { _desired: "oc", _distance: "20", _oneway: "true" } }, { en: { _desired: "om", _distance: "30", _oneway: "true" } }, { en: { _desired: "or", _distance: "30", _oneway: "true" } }, { en: { _desired: "pa", _distance: "30", _oneway: "true" } }, { en: { _desired: "pcm", _distance: "20", _oneway: "true" } }, { en: { _desired: "ps", _distance: "30", _oneway: "true" } }, { es: { _desired: "qu", _distance: "30", _oneway: "true" } }, { de: { _desired: "rm", _distance: "20", _oneway: "true" } }, { en: { _desired: "rn", _distance: "30", _oneway: "true" } }, { fr: { _desired: "rw", _distance: "30", _oneway: "true" } }, { hi: { _desired: "sa", _distance: "30", _oneway: "true" } }, { en: { _desired: "sd", _distance: "30", _oneway: "true" } }, { en: { _desired: "si", _distance: "30", _oneway: "true" } }, { en: { _desired: "sn", _distance: "30", _oneway: "true" } }, { en: { _desired: "so", _distance: "30", _oneway: "true" } }, { en: { _desired: "sq", _distance: "30", _oneway: "true" } }, { en: { _desired: "st", _distance: "30", _oneway: "true" } }, { id: { _desired: "su", _distance: "20", _oneway: "true" } }, { en: { _desired: "sw", _distance: "30", _oneway: "true" } }, { en: { _desired: "ta", _distance: "30", _oneway: "true" } }, { en: { _desired: "te", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tg", _distance: "30", _oneway: "true" } }, { en: { _desired: "ti", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tk", _distance: "30", _oneway: "true" } }, { en: { _desired: "tlh", _distance: "30", _oneway: "true" } }, { en: { _desired: "tn", _distance: "30", _oneway: "true" } }, { en: { _desired: "to", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tt", _distance: "30", _oneway: "true" } }, { en: { _desired: "tum", _distance: "30", _oneway: "true" } }, { zh: { _desired: "ug", _distance: "20", _oneway: "true" } }, { ru: { _desired: "uk", _distance: "20", _oneway: "true" } }, { en: { _desired: "ur", _distance: "30", _oneway: "true" } }, { ru: { _desired: "uz", _distance: "30", _oneway: "true" } }, { fr: { _desired: "wo", _distance: "30", _oneway: "true" } }, { en: { _desired: "xh", _distance: "30", _oneway: "true" } }, { en: { _desired: "yi", _distance: "30", _oneway: "true" } }, { en: { _desired: "yo", _distance: "30", _oneway: "true" } }, { zh: { _desired: "za", _distance: "20", _oneway: "true" } }, { en: { _desired: "zu", _distance: "30", _oneway: "true" } }, { ar: { _desired: "aao", _distance: "10", _oneway: "true" } }, { ar: { _desired: "abh", _distance: "10", _oneway: "true" } }, { ar: { _desired: "abv", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acm", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acq", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acw", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acx", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acy", _distance: "10", _oneway: "true" } }, { ar: { _desired: "adf", _distance: "10", _oneway: "true" } }, { ar: { _desired: "aeb", _distance: "10", _oneway: "true" } }, { ar: { _desired: "aec", _distance: "10", _oneway: "true" } }, { ar: { _desired: "afb", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ajp", _distance: "10", _oneway: "true" } }, { ar: { _desired: "apc", _distance: "10", _oneway: "true" } }, { ar: { _desired: "apd", _distance: "10", _oneway: "true" } }, { ar: { _desired: "arq", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ars", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ary", _distance: "10", _oneway: "true" } }, { ar: { _desired: "arz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "auz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "avl", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayh", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayl", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayn", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayp", _distance: "10", _oneway: "true" } }, { ar: { _desired: "bbz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "pga", _distance: "10", _oneway: "true" } }, { ar: { _desired: "shu", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ssh", _distance: "10", _oneway: "true" } }, { az: { _desired: "azb", _distance: "10", _oneway: "true" } }, { et: { _desired: "vro", _distance: "10", _oneway: "true" } }, { ff: { _desired: "ffm", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fub", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fue", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuf", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuh", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fui", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuq", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuv", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gnw", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gui", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gun", _distance: "10", _oneway: "true" } }, { gn: { _desired: "nhd", _distance: "10", _oneway: "true" } }, { iu: { _desired: "ikt", _distance: "10", _oneway: "true" } }, { kln: { _desired: "enb", _distance: "10", _oneway: "true" } }, { kln: { _desired: "eyo", _distance: "10", _oneway: "true" } }, { kln: { _desired: "niq", _distance: "10", _oneway: "true" } }, { kln: { _desired: "oki", _distance: "10", _oneway: "true" } }, { kln: { _desired: "pko", _distance: "10", _oneway: "true" } }, { kln: { _desired: "sgc", _distance: "10", _oneway: "true" } }, { kln: { _desired: "tec", _distance: "10", _oneway: "true" } }, { kln: { _desired: "tuy", _distance: "10", _oneway: "true" } }, { kok: { _desired: "gom", _distance: "10", _oneway: "true" } }, { kpe: { _desired: "gkp", _distance: "10", _oneway: "true" } }, { luy: { _desired: "ida", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lkb", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lko", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lks", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lri", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lrm", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lsm", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lto", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lts", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lwg", _distance: "10", _oneway: "true" } }, { luy: { _desired: "nle", _distance: "10", _oneway: "true" } }, { luy: { _desired: "nyd", _distance: "10", _oneway: "true" } }, { luy: { _desired: "rag", _distance: "10", _oneway: "true" } }, { lv: { _desired: "ltg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bhr", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bjq", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bmm", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bzc", _distance: "10", _oneway: "true" } }, { mg: { _desired: "msh", _distance: "10", _oneway: "true" } }, { mg: { _desired: "skg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "tdx", _distance: "10", _oneway: "true" } }, { mg: { _desired: "tkg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "txy", _distance: "10", _oneway: "true" } }, { mg: { _desired: "xmv", _distance: "10", _oneway: "true" } }, { mg: { _desired: "xmw", _distance: "10", _oneway: "true" } }, { mn: { _desired: "mvf", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bjn", _distance: "10", _oneway: "true" } }, { ms: { _desired: "btj", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bve", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bvu", _distance: "10", _oneway: "true" } }, { ms: { _desired: "coa", _distance: "10", _oneway: "true" } }, { ms: { _desired: "dup", _distance: "10", _oneway: "true" } }, { ms: { _desired: "hji", _distance: "10", _oneway: "true" } }, { ms: { _desired: "id", _distance: "10", _oneway: "true" } }, { ms: { _desired: "jak", _distance: "10", _oneway: "true" } }, { ms: { _desired: "jax", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kvb", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kvr", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kxd", _distance: "10", _oneway: "true" } }, { ms: { _desired: "lce", _distance: "10", _oneway: "true" } }, { ms: { _desired: "lcf", _distance: "10", _oneway: "true" } }, { ms: { _desired: "liw", _distance: "10", _oneway: "true" } }, { ms: { _desired: "max", _distance: "10", _oneway: "true" } }, { ms: { _desired: "meo", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mfa", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mfb", _distance: "10", _oneway: "true" } }, { ms: { _desired: "min", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mqg", _distance: "10", _oneway: "true" } }, { ms: { _desired: "msi", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mui", _distance: "10", _oneway: "true" } }, { ms: { _desired: "orn", _distance: "10", _oneway: "true" } }, { ms: { _desired: "ors", _distance: "10", _oneway: "true" } }, { ms: { _desired: "pel", _distance: "10", _oneway: "true" } }, { ms: { _desired: "pse", _distance: "10", _oneway: "true" } }, { ms: { _desired: "tmw", _distance: "10", _oneway: "true" } }, { ms: { _desired: "urk", _distance: "10", _oneway: "true" } }, { ms: { _desired: "vkk", _distance: "10", _oneway: "true" } }, { ms: { _desired: "vkt", _distance: "10", _oneway: "true" } }, { ms: { _desired: "xmm", _distance: "10", _oneway: "true" } }, { ms: { _desired: "zlm", _distance: "10", _oneway: "true" } }, { ms: { _desired: "zmi", _distance: "10", _oneway: "true" } }, { ne: { _desired: "dty", _distance: "10", _oneway: "true" } }, { om: { _desired: "gax", _distance: "10", _oneway: "true" } }, { om: { _desired: "hae", _distance: "10", _oneway: "true" } }, { om: { _desired: "orc", _distance: "10", _oneway: "true" } }, { or: { _desired: "spv", _distance: "10", _oneway: "true" } }, { ps: { _desired: "pbt", _distance: "10", _oneway: "true" } }, { ps: { _desired: "pst", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qub", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qud", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quf", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qug", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quk", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qul", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qup", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qur", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qus", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quw", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qux", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quy", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qva", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qve", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvi", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvj", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvl", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvm", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvn", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvo", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvp", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvs", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvw", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvz", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwa", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qws", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxa", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxl", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxn", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxo", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxp", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxr", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxt", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxu", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxw", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sdc", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sdn", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sro", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aae", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aat", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aln", _distance: "10", _oneway: "true" } }, { syr: { _desired: "aii", _distance: "10", _oneway: "true" } }, { uz: { _desired: "uzs", _distance: "10", _oneway: "true" } }, { yi: { _desired: "yih", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cdo", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cjy", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cpx", _distance: "10", _oneway: "true" } }, { zh: { _desired: "czh", _distance: "10", _oneway: "true" } }, { zh: { _desired: "czo", _distance: "10", _oneway: "true" } }, { zh: { _desired: "gan", _distance: "10", _oneway: "true" } }, { zh: { _desired: "hak", _distance: "10", _oneway: "true" } }, { zh: { _desired: "hsn", _distance: "10", _oneway: "true" } }, { zh: { _desired: "lzh", _distance: "10", _oneway: "true" } }, { zh: { _desired: "mnp", _distance: "10", _oneway: "true" } }, { zh: { _desired: "nan", _distance: "10", _oneway: "true" } }, { zh: { _desired: "wuu", _distance: "10", _oneway: "true" } }, { zh: { _desired: "yue", _distance: "10", _oneway: "true" } }, { "*": { _desired: "*", _distance: "80" } }, { "en-Latn": { _desired: "am-Ethi", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "az-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "bn-Beng", _distance: "10", _oneway: "true" } }, { "zh-Hans": { _desired: "bo-Tibt", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "hy-Armn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ka-Geor", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "km-Khmr", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "kn-Knda", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "lo-Laoo", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ml-Mlym", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "my-Mymr", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ne-Deva", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "or-Orya", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "pa-Guru", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ps-Arab", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "sd-Arab", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "si-Sinh", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ta-Taml", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "te-Telu", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ti-Ethi", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "tk-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ur-Arab", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "uz-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "yi-Hebr", _distance: "10", _oneway: "true" } }, { "sr-Cyrl": { _desired: "sr-Latn", _distance: "5" } }, { "zh-Hans": { _desired: "za-Latn", _distance: "10", _oneway: "true" } }, { "zh-Hans": { _desired: "zh-Hani", _distance: "20", _oneway: "true" } }, { "zh-Hant": { _desired: "zh-Hani", _distance: "20", _oneway: "true" } }, { "ar-Arab": { _desired: "ar-Latn", _distance: "20", _oneway: "true" } }, { "bn-Beng": { _desired: "bn-Latn", _distance: "20", _oneway: "true" } }, { "gu-Gujr": { _desired: "gu-Latn", _distance: "20", _oneway: "true" } }, { "hi-Deva": { _desired: "hi-Latn", _distance: "20", _oneway: "true" } }, { "kn-Knda": { _desired: "kn-Latn", _distance: "20", _oneway: "true" } }, { "ml-Mlym": { _desired: "ml-Latn", _distance: "20", _oneway: "true" } }, { "mr-Deva": { _desired: "mr-Latn", _distance: "20", _oneway: "true" } }, { "ta-Taml": { _desired: "ta-Latn", _distance: "20", _oneway: "true" } }, { "te-Telu": { _desired: "te-Latn", _distance: "20", _oneway: "true" } }, { "zh-Hans": { _desired: "zh-Latn", _distance: "20", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Latn", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hani", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hira", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Kana", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hrkt", _distance: "5", _oneway: "true" } }, { "ja-Hrkt": { _desired: "ja-Hira", _distance: "5", _oneway: "true" } }, { "ja-Hrkt": { _desired: "ja-Kana", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Hani", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Hang", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Jamo", _distance: "5", _oneway: "true" } }, { "ko-Hang": { _desired: "ko-Jamo", _distance: "5", _oneway: "true" } }, { "*-*": { _desired: "*-*", _distance: "50" } }, { "ar-*-$maghreb": { _desired: "ar-*-$maghreb", _distance: "4" } }, { "ar-*-$!maghreb": { _desired: "ar-*-$!maghreb", _distance: "4" } }, { "ar-*-*": { _desired: "ar-*-*", _distance: "5" } }, { "en-*-$enUS": { _desired: "en-*-$enUS", _distance: "4" } }, { "en-*-GB": { _desired: "en-*-$!enUS", _distance: "3" } }, { "en-*-$!enUS": { _desired: "en-*-$!enUS", _distance: "4" } }, { "en-*-*": { _desired: "en-*-*", _distance: "5" } }, { "es-*-$americas": { _desired: "es-*-$americas", _distance: "4" } }, { "es-*-$!americas": { _desired: "es-*-$!americas", _distance: "4" } }, { "es-*-*": { _desired: "es-*-*", _distance: "5" } }, { "pt-*-$americas": { _desired: "pt-*-$americas", _distance: "4" } }, { "pt-*-$!americas": { _desired: "pt-*-$!americas", _distance: "4" } }, { "pt-*-*": { _desired: "pt-*-*", _distance: "5" } }, { "zh-Hant-$cnsar": { _desired: "zh-Hant-$cnsar", _distance: "4" } }, { "zh-Hant-$!cnsar": { _desired: "zh-Hant-$!cnsar", _distance: "4" } }, { "zh-Hant-*": { _desired: "zh-Hant-*", _distance: "5" } }, { "*-*-*": { _desired: "*-*-*", _distance: "4" } }] }, r9 = { "001": ["001", "001-status-grouping", "002", "005", "009", "011", "013", "014", "015", "017", "018", "019", "021", "029", "030", "034", "035", "039", "053", "054", "057", "061", "142", "143", "145", "150", "151", "154", "155", "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DG", "DJ", "DK", "DM", "DO", "DZ", "EA", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "EU", "EZ", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "IC", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "QO", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "UN", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"], "002": ["002", "002-status-grouping", "011", "014", "015", "017", "018", "202", "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ", "DZ", "EA", "EG", "EH", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "IC", "IO", "KE", "KM", "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SD", "SH", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TF", "TG", "TN", "TZ", "UG", "YT", "ZA", "ZM", "ZW"], "003": ["003", "013", "021", "029", "AG", "AI", "AW", "BB", "BL", "BM", "BQ", "BS", "BZ", "CA", "CR", "CU", "CW", "DM", "DO", "GD", "GL", "GP", "GT", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PM", "PR", "SV", "SX", "TC", "TT", "US", "VC", "VG", "VI"], "005": ["005", "AR", "BO", "BR", "BV", "CL", "CO", "EC", "FK", "GF", "GS", "GY", "PE", "PY", "SR", "UY", "VE"], "009": ["009", "053", "054", "057", "061", "AC", "AQ", "AS", "AU", "CC", "CK", "CP", "CX", "DG", "FJ", "FM", "GU", "HM", "KI", "MH", "MP", "NC", "NF", "NR", "NU", "NZ", "PF", "PG", "PN", "PW", "QO", "SB", "TA", "TK", "TO", "TV", "UM", "VU", "WF", "WS"], "011": ["011", "BF", "BJ", "CI", "CV", "GH", "GM", "GN", "GW", "LR", "ML", "MR", "NE", "NG", "SH", "SL", "SN", "TG"], "013": ["013", "BZ", "CR", "GT", "HN", "MX", "NI", "PA", "SV"], "014": ["014", "BI", "DJ", "ER", "ET", "IO", "KE", "KM", "MG", "MU", "MW", "MZ", "RE", "RW", "SC", "SO", "SS", "TF", "TZ", "UG", "YT", "ZM", "ZW"], "015": ["015", "DZ", "EA", "EG", "EH", "IC", "LY", "MA", "SD", "TN"], "017": ["017", "AO", "CD", "CF", "CG", "CM", "GA", "GQ", "ST", "TD"], "018": ["018", "BW", "LS", "NA", "SZ", "ZA"], "019": ["003", "005", "013", "019", "019-status-grouping", "021", "029", "419", "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BQ", "BR", "BS", "BV", "BZ", "CA", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF", "GL", "GP", "GS", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY", "SR", "SV", "SX", "TC", "TT", "US", "UY", "VC", "VE", "VG", "VI"], "021": ["021", "BM", "CA", "GL", "PM", "US"], "029": ["029", "AG", "AI", "AW", "BB", "BL", "BQ", "BS", "CU", "CW", "DM", "DO", "GD", "GP", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "PR", "SX", "TC", "TT", "VC", "VG", "VI"], "030": ["030", "CN", "HK", "JP", "KP", "KR", "MN", "MO", "TW"], "034": ["034", "AF", "BD", "BT", "IN", "IR", "LK", "MV", "NP", "PK"], "035": ["035", "BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN"], "039": ["039", "AD", "AL", "BA", "ES", "GI", "GR", "HR", "IT", "ME", "MK", "MT", "PT", "RS", "SI", "SM", "VA", "XK"], "053": ["053", "AU", "CC", "CX", "HM", "NF", "NZ"], "054": ["054", "FJ", "NC", "PG", "SB", "VU"], "057": ["057", "FM", "GU", "KI", "MH", "MP", "NR", "PW", "UM"], "061": ["061", "AS", "CK", "NU", "PF", "PN", "TK", "TO", "TV", "WF", "WS"], 142: ["030", "034", "035", "142", "143", "145", "AE", "AF", "AM", "AZ", "BD", "BH", "BN", "BT", "CN", "CY", "GE", "HK", "ID", "IL", "IN", "IQ", "IR", "JO", "JP", "KG", "KH", "KP", "KR", "KW", "KZ", "LA", "LB", "LK", "MM", "MN", "MO", "MV", "MY", "NP", "OM", "PH", "PK", "PS", "QA", "SA", "SG", "SY", "TH", "TJ", "TL", "TM", "TR", "TW", "UZ", "VN", "YE"], 143: ["143", "KG", "KZ", "TJ", "TM", "UZ"], 145: ["145", "AE", "AM", "AZ", "BH", "CY", "GE", "IL", "IQ", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE"], 150: ["039", "150", "151", "154", "155", "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CQ", "CZ", "DE", "DK", "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SJ", "SK", "SM", "UA", "VA", "XK"], 151: ["151", "BG", "BY", "CZ", "HU", "MD", "PL", "RO", "RU", "SK", "UA"], 154: ["154", "AX", "CQ", "DK", "EE", "FI", "FO", "GB", "GG", "IE", "IM", "IS", "JE", "LT", "LV", "NO", "SE", "SJ"], 155: ["155", "AT", "BE", "CH", "DE", "FR", "LI", "LU", "MC", "NL"], 202: ["011", "014", "017", "018", "202", "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "IO", "KE", "KM", "LR", "LS", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SH", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TF", "TG", "TZ", "UG", "YT", "ZA", "ZM", "ZW"], 419: ["005", "013", "029", "419", "AG", "AI", "AR", "AW", "BB", "BL", "BO", "BQ", "BR", "BS", "BV", "BZ", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF", "GP", "GS", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PR", "PY", "SR", "SV", "SX", "TC", "TT", "UY", "VC", "VE", "VG", "VI"], EU: ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "EU", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"], EZ: ["AT", "BE", "CY", "DE", "EE", "ES", "EZ", "FI", "FR", "GR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"], QO: ["AC", "AQ", "CP", "DG", "QO", "TA"], UN: ["AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TD", "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TZ", "UA", "UG", "UN", "US", "UY", "UZ", "VC", "VE", "VN", "VU", "WS", "YE", "ZA", "ZM", "ZW"] }, r7 = /-u(?:-[0-9a-z]{2,8})+/gi;
      function ne(e10, t10, r10 = Error) {
        if (!e10) throw new r10(t10);
      }
      function nt(e10, t10, r10) {
        let [n10, s10, i10] = t10.split("-"), a10 = true;
        if (i10 && "$" === i10[0]) {
          let t11 = "!" !== i10[1], n11 = (t11 ? r10[i10.slice(1)] : r10[i10.slice(2)]).map((e11) => r9[e11] || [e11]).reduce((e11, t12) => [...e11, ...t12], []);
          a10 &&= n11.indexOf(e10.region || "") > -1 == t11;
        } else a10 &&= !e10.region || "*" === i10 || i10 === e10.region;
        return a10 &&= !e10.script || "*" === s10 || s10 === e10.script, a10 &&= !e10.language || "*" === n10 || n10 === e10.language;
      }
      function nr(e10) {
        return [e10.language, e10.script, e10.region].filter(Boolean).join("-");
      }
      function nn(e10, t10, r10) {
        for (let n10 of r10.matches) {
          let s10 = nt(e10, n10.desired, r10.matchVariables) && nt(t10, n10.supported, r10.matchVariables);
          if (n10.oneway || s10 || (s10 = nt(e10, n10.supported, r10.matchVariables) && nt(t10, n10.desired, r10.matchVariables)), s10) {
            let s11 = 10 * n10.distance;
            if (r10.paradigmLocales.indexOf(nr(e10)) > -1 != r10.paradigmLocales.indexOf(nr(t10)) > -1) return s11 - 1;
            return s11;
          }
        }
        throw Error("No matching distance found");
      }
      let ns = (el = function(e10, t10) {
        let r10 = new Intl.Locale(e10).maximize(), s10 = new Intl.Locale(t10).maximize(), i10 = { language: r10.language, script: r10.script || "", region: r10.region || "" }, a10 = { language: s10.language, script: s10.script || "", region: s10.region || "" }, o2 = 0, l2 = function() {
          if (!n) {
            let e11 = r8["written-new"][0]?.paradigmLocales?._locales.split(" "), t11 = r8["written-new"].slice(1, 5);
            n = { matches: r8["written-new"].slice(5).map((e12) => {
              let t12 = Object.keys(e12)[0], r11 = e12[t12];
              return { supported: t12, desired: r11._desired, distance: +r11._distance, oneway: "true" === r11.oneway };
            }, {}), matchVariables: t11.reduce((e12, t12) => {
              let r11 = Object.keys(t12)[0], n10 = t12[r11];
              return e12[r11.slice(1)] = n10._value.split("+"), e12;
            }, {}), paradigmLocales: [...e11, ...e11.map((e12) => new Intl.Locale(e12.replace(/_/g, "-")).maximize().toString())] };
          }
          return n;
        }();
        return i10.language !== a10.language && (o2 += nn({ language: r10.language, script: "", region: "" }, { language: s10.language, script: "", region: "" }, l2)), i10.script !== a10.script && (o2 += nn({ language: r10.language, script: i10.script, region: "" }, { language: s10.language, script: a10.script, region: "" }, l2)), i10.region !== a10.region && (o2 += nn(i10, a10, l2)), o2;
      }, l = (eu = { serializer: (e10) => `${e10[0]}|${e10[1]}` }).cache ? eu.cache : { create: function() {
        return new r6();
      } }, u = eu && eu.serializer ? eu.serializer : function() {
        return JSON.stringify(arguments);
      }, (eu && eu.strategy ? eu.strategy : function(e10, t10) {
        var r10, n10;
        let s10 = 1 === e10.length ? r4 : r5;
        return r10 = t10.cache.create(), n10 = t10.serializer, s10.bind(this, e10, r10, n10);
      })(el, { cache: l, serializer: u })), ni = /* @__PURE__ */ new WeakMap();
      function na(e10) {
        return Intl.getCanonicalLocales(e10)[0];
      }
      let no = /* @__PURE__ */ new WeakMap();
      var nl = e.i(475398);
      function nu(e10, t10, r10) {
        let n10, s10 = new nl.default({ headers: { "accept-language": e10.get("accept-language") || void 0 } }).languages();
        try {
          var i10;
          let e11 = t10.slice().sort((e12, t11) => t11.length - e12.length);
          i10 = function(e12, t11, r11, n11, s11, i11) {
            let a10, o2;
            if ("lookup" === r11.localeMatcher) a10 = function(e13, t12, r12) {
              let n12 = { locale: "" };
              for (let r13 of t12) {
                let t13 = r13.replace(r7, ""), s12 = function(e14, t14) {
                  let r14 = no.get(e14);
                  r14 || (r14 = new Set(e14), no.set(e14, r14));
                  let n13 = t14;
                  for (; ; ) {
                    if (r14.has(n13)) return n13;
                    let e15 = n13.lastIndexOf("-");
                    if (!~e15) return;
                    e15 >= 2 && "-" === n13[e15 - 2] && (e15 -= 2), n13 = n13.slice(0, e15);
                  }
                }(e13, t13);
                if (s12) return n12.locale = s12, r13 !== t13 && (n12.extension = r13.slice(t13.length, r13.length)), n12;
              }
              return n12.locale = r12(), n12;
            }(Array.from(e12), t11, i11);
            else {
              var l2;
              let r12, n12, s12, o3, u3;
              l2 = Array.from(e12), s12 = [], o3 = t11.reduce((e13, t12) => {
                let r13 = t12.replace(r7, "");
                return s12.push(r13), e13[r13] = t12, e13;
              }, {}), (u3 = function(e13, t12, r13 = 838) {
                let n13 = 1 / 0, s13 = { matchedDesiredLocale: "", distances: {} }, i12 = ni.get(t12);
                i12 || (i12 = t12.map((e14) => {
                  try {
                    return Intl.getCanonicalLocales([e14])[0] || e14;
                  } catch {
                    return e14;
                  }
                }), ni.set(t12, i12));
                let a11 = new Set(i12);
                for (let t13 = 0; t13 < e13.length; t13++) {
                  let r14 = e13[t13];
                  if (a11.has(r14)) {
                    let e14 = 0 + 40 * t13;
                    if (s13.distances[r14] = { [r14]: e14 }, e14 < n13 && (n13 = e14, s13.matchedDesiredLocale = r14, s13.matchedSupportedLocale = r14), 0 === t13) return s13;
                  }
                }
                for (let t13 = 0; t13 < e13.length; t13++) {
                  let r14 = e13[t13];
                  try {
                    let e14 = new Intl.Locale(r14).maximize().toString();
                    if (e14 !== r14) {
                      let i13 = function(e15) {
                        let t14 = [], r15 = e15;
                        for (; r15; ) {
                          t14.push(r15);
                          let e16 = r15.lastIndexOf("-");
                          if (-1 === e16) break;
                          r15 = r15.substring(0, e16);
                        }
                        return t14;
                      }(e14);
                      for (let o4 = 0; o4 < i13.length; o4++) {
                        let l3 = i13[o4];
                        if (l3 !== r14 && a11.has(l3)) {
                          let i14;
                          try {
                            i14 = new Intl.Locale(l3).maximize().toString() === e14 ? 0 + 40 * t13 : 10 * o4 + 40 * t13;
                          } catch {
                            i14 = 10 * o4 + 40 * t13;
                          }
                          s13.distances[r14] || (s13.distances[r14] = {}), s13.distances[r14][l3] = i14, i14 < n13 && (n13 = i14, s13.matchedDesiredLocale = r14, s13.matchedSupportedLocale = l3);
                          break;
                        }
                      }
                    }
                  } catch {
                  }
                }
                return s13.matchedSupportedLocale && 0 === n13 || (n13 = 1 / 0, e13.forEach((e14, r14) => {
                  s13.distances[e14] || (s13.distances[e14] = {}), i12.forEach((i13, a12) => {
                    let o4 = t12[a12], l3 = ns(e14, i13) + 0 + 40 * r14;
                    s13.distances[e14][o4] = l3, l3 < n13 && (n13 = l3, s13.matchedDesiredLocale = e14, s13.matchedSupportedLocale = o4);
                  });
                }), n13 >= r13 && (s13.matchedDesiredLocale = void 0, s13.matchedSupportedLocale = void 0)), s13;
              }(s12, l2)).matchedSupportedLocale && u3.matchedDesiredLocale && (r12 = u3.matchedSupportedLocale, n12 = o3[u3.matchedDesiredLocale].slice(u3.matchedDesiredLocale.length) || void 0), a10 = r12 ? { locale: r12, extension: n12 } : { locale: i11() };
            }
            null == a10 && (a10 = { locale: i11(), extension: "" });
            let u2 = a10.locale, c2 = s11[u2], h2 = { locale: "en", dataLocale: u2 };
            o2 = a10.extension ? function(e13) {
              let t12;
              ne(e13 === e13.toLowerCase(), "Expected extension to be lowercase"), ne("-u-" === e13.slice(0, 3), "Expected extension to be a Unicode locale extension");
              let r12 = [], n12 = [], s12 = e13.length, i12 = 3;
              for (; i12 < s12; ) {
                let a11, o3 = e13.indexOf("-", i12);
                a11 = -1 === o3 ? s12 - i12 : o3 - i12;
                let l3 = e13.slice(i12, i12 + a11);
                ne(a11 >= 2, "Expected a subtag to have at least 2 characters"), void 0 === t12 && 2 != a11 ? -1 === r12.indexOf(l3) && r12.push(l3) : 2 === a11 ? (t12 = { key: l3, value: "" }, void 0 === n12.find((e14) => e14.key === t12?.key) && n12.push(t12)) : t12?.value === "" ? t12.value = l3 : (ne(void 0 !== t12, "Expected keyword to be defined"), t12.value += "-" + l3), i12 += a11 + 1;
              }
              return { attributes: r12, keywords: n12 };
            }(a10.extension).keywords : [];
            let d2 = [];
            for (let e13 of n11) {
              let t12, n12 = c2?.[e13] ?? [];
              ne(Array.isArray(n12), `keyLocaleData for ${e13} must be an array`);
              let s12 = n12[0];
              ne(void 0 === s12 || "string" == typeof s12, "value must be a string or undefined");
              let i12 = o2.find((t13) => t13.key === e13);
              if (i12) {
                let r12 = i12.value;
                "" !== r12 ? n12.indexOf(r12) > -1 && (t12 = { key: e13, value: s12 = r12 }) : n12.indexOf("true") > -1 && (t12 = { key: e13, value: s12 = "true" });
              }
              let a11 = r11[e13];
              ne(null == a11 || "string" == typeof a11, "optionsValue must be a string or undefined"), "string" == typeof a11 && "" === (a11 = function(e14, t13) {
                let r12 = t13.toLowerCase();
                return ne(void 0 !== e14, "ukey must be defined"), r12;
              }(e13.toLowerCase(), a11)) && (a11 = "true"), a11 !== s12 && n12.indexOf(a11) > -1 && (s12 = a11, t12 = void 0), t12 && d2.push(t12), h2[e13] = s12;
            }
            return d2.length > 0 && (u2 = function(e13, t12, r12) {
              ne(-1 === e13.indexOf("-u-"), "Expected locale to not have a Unicode locale extension");
              let n12 = "-u";
              for (let e14 of t12) n12 += `-${e14}`;
              for (let e14 of r12) {
                let { key: t13, value: r13 } = e14;
                n12 += `-${t13}`, "" !== r13 && (n12 += `-${r13}`);
              }
              if ("-u" === n12) return na(e13);
              let s12 = e13.indexOf("-x-");
              return na(-1 === s12 ? e13 + n12 : e13.slice(0, s12) + n12 + e13.slice(s12));
            }(u2, [], d2)), h2.locale = u2, h2;
          }(e11, Intl.getCanonicalLocales(s10), { localeMatcher: "best fit" }, [], {}, () => r10).locale, n10 = t10.find((e12) => e12.toLowerCase() === i10.toLowerCase());
        } catch {
        }
        return n10;
      }
      function nc(e10, t10) {
        if (e10.localeCookie && t10.has(e10.localeCookie.name)) {
          let r10 = t10.get(e10.localeCookie.name)?.value;
          if (r10 && e10.locales.includes(r10)) return r10;
        }
      }
      function nh(e10, t10, r10, n10) {
        let s10;
        return n10 && (s10 = rQ(n10, e10.locales, e10.localePrefix)?.locale), !s10 && e10.localeDetection && (s10 = nc(e10, r10)), !s10 && e10.localeDetection && (s10 = nu(t10, e10.locales, e10.defaultLocale)), s10 || (s10 = e10.defaultLocale), s10;
      }
      let nd = ["no", "en"];
      process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH;
      let np = new Set(nd), nf = "https://www.klarpakke.no", ng = /* @__PURE__ */ new Set([nf, "http://localhost:3000"]);
      function nm(e10) {
        return e10.trim().replace(/[\r\n]/g, "");
      }
      let ny = { "/dashboard/activity": "/dashboard/historikk", "/handelshistorikk": "/dashboard/historikk", "/dashboard/trading": "/trade", "/dashboard/trade": "/trade", "/dashboard/autopilot": "/dashboard/auto-trade", "/bots": "/dashboard/auto-trade", "/dashboard/innstillinger": "/profile?tab=settings", "/handel": "/trade", "/auto-trading": "/dashboard/auto-trade", "/auto-trading-ai": "/dashboard/auto-trade", "/innlogging": "/login", "/registrer": "/register", "/paper": "/trade?mode=paper", "/handel?mode=paper": "/trade?mode=paper", "/handel?mode=live": "/trade?mode=live" }, n_ = new Set(nd), nw = ["/login", "/register", "/glemt-passord", "/registrer", "/callback", "/update-password", "/admin/reset-password", "/admin/login"], nb = RegExp(`^(${nd.join("|")})$`);
      function nv(e10, t10) {
        let r10 = t10.startsWith("/") ? t10 : `/${t10}`;
        return `/${e10}${r10}`;
      }
      function nk(e10) {
        let t10 = e10.split("/").filter(Boolean);
        if (0 === t10.length) return { locale: "no", strippedPath: "/" };
        let r10 = t10[0] ?? "";
        if (nb.test(r10)) {
          let e11 = t10.slice(1);
          return { locale: r10, strippedPath: e11.length ? `/${e11.join("/")}` : "/" };
        }
        return { locale: "no", strippedPath: `/${t10.join("/")}` };
      }
      let nE = /* @__PURE__ */ new Set(["/login", "/register", "/glemt-passord", "/registrer"]), nS = (c = { ...ec = { locales: ["no", "en"], defaultLocale: "no", localePrefix: "always", localeDetection: false }, localePrefix: "object" == typeof (ed = ec.localePrefix) ? ed : { mode: ed || "always" }, localeCookie: !!((eh = ec.localeCookie) ?? 1) && { name: "NEXT_LOCALE", sameSite: "lax", ..."object" == typeof eh && eh }, localeDetection: ec.localeDetection ?? true, alternateLinks: ec.alternateLinks ?? true }, function(e10) {
        var t10, r10;
        let n10;
        try {
          n10 = decodeURI(e10.nextUrl.pathname);
        } catch {
          return eD.next();
        }
        let s10 = n10.replace(/\\/g, "%5C").replace(/[\t\n\r]/g, "").replace(/\/+/g, "/"), { domain: i10, locale: a10 } = (t10 = e10.headers, r10 = e10.cookies, c.domains ? function(e11, t11, r11, n11) {
          let s11, i11 = function(e12, t12) {
            let r12 = r1(e12);
            if (r12) return t12.find((e13) => e13.domain === r12);
          }(t11, e11.domains);
          if (!i11) return { locale: nh(e11, t11, r11, n11) };
          if (n11) {
            let t12 = rQ(n11, e11.locales, e11.localePrefix, i11)?.locale;
            if (t12) {
              if (!r2(t12, i11)) return { locale: t12, domain: i11 };
              s11 = t12;
            }
          }
          if (!s11 && e11.localeDetection) {
            let t12 = nc(e11, r11);
            t12 && r2(t12, i11) && (s11 = t12);
          }
          if (!s11 && e11.localeDetection) {
            let e12 = nu(t11, i11.locales, i11.defaultLocale);
            e12 && (s11 = e12);
          }
          return s11 || (s11 = i11.defaultLocale), { locale: s11, domain: i11 };
        }(c, t10, r10, s10) : { locale: nh(c, t10, r10, s10) }), o2 = i10 ? i10.defaultLocale === a10 : a10 === c.defaultLocale, l2 = c.domains?.filter((e11) => r2(a10, e11)) || [], u2 = null != c.domains && !i10;
        function h2(t11) {
          var r11;
          let n11 = new URL(t11, e10.url);
          e10.nextUrl.basePath && (r11 = n11.pathname, n11.pathname = rH(e10.nextUrl.basePath + r11));
          let s11 = new Headers(e10.headers);
          return s11.set("X-NEXT-INTL-LOCALE", a10), rH(e10.nextUrl.pathname) !== rH(n11.pathname) ? eD.rewrite(n11, { request: { headers: s11 } }) : eD.next({ request: { headers: s11 } });
        }
        function d2(t11, r11) {
          var n11;
          let s11 = new URL(t11, e10.url);
          if (s11.pathname = rH(s11.pathname), l2.length > 0 && !r11 && i10) {
            let e11 = r3(i10, a10, l2);
            if (e11) {
              r11 = e11.domain;
              let t12 = e11.localePrefix || c.localePrefix.mode;
              e11.defaultLocale === a10 && "as-needed" === t12 && (s11.pathname = rY(s11.pathname, c.locales, c.localePrefix));
            }
          }
          return r11 && (s11.host = r11, e10.headers.get("x-forwarded-host")) && (s11.protocol = e10.headers.get("x-forwarded-proto") ?? e10.nextUrl.protocol, s11.port = r11.split(":")[1] ?? e10.headers.get("x-forwarded-port") ?? ""), e10.nextUrl.basePath && (n11 = s11.pathname, s11.pathname = rH(e10.nextUrl.basePath + n11)), b2 = true, eD.redirect(s11.toString());
        }
        let p2 = rY(s10, c.locales, c.localePrefix), f2 = rQ(s10, c.locales, c.localePrefix, i10), g2 = null != f2, m2 = i10?.localePrefix || c.localePrefix.mode, y2 = "never" === m2 || o2 && "as-needed" === m2, _2, w2, b2, v2 = p2, k2 = c.pathnames;
        if (k2) {
          let t11;
          if ([t11, w2] = function(e11, t12, r11) {
            for (let n11 of Object.keys(e11).sort(rJ)) {
              let s11 = e11[n11];
              if ("string" == typeof s11) {
                if (rG(s11, t12)) return [void 0, n11];
              } else {
                let i11 = Object.entries(s11), a11 = i11.findIndex(([e12]) => e12 === r11);
                for (let [r12] of (a11 > 0 && i11.unshift(i11.splice(a11, 1)[0]), i11)) if (rG(rB(e11[n11], r12, n11), t12)) return [r12, n11];
              }
            }
            for (let r12 of Object.keys(e11)) if (rG(r12, t12)) return [void 0, r12];
            return [void 0, void 0];
          }(k2, p2, a10), w2) {
            let r11 = k2[w2], n11 = rB(r11, a10, w2);
            if (rG(n11, p2)) v2 = rX(p2, n11, w2);
            else {
              let s11;
              s11 = t11 ? rB(r11, t11, w2) : w2;
              let i11 = y2 ? void 0 : rF(a10, c.localePrefix);
              _2 = d2(r0(rX(p2, s11, n11), i11, e10.nextUrl.search));
            }
          }
        }
        if (!_2) if ("/" !== v2 || g2) {
          let t11 = r0(v2, `/${a10}`, e10.nextUrl.search);
          if (g2) {
            let r11 = r0(p2, f2.prefix, e10.nextUrl.search);
            if ("never" === m2) _2 = d2(r0(p2, void 0, e10.nextUrl.search));
            else if (f2.exact) if (o2 && y2) _2 = d2(r0(p2, void 0, e10.nextUrl.search));
            else if (c.domains) {
              let e11 = r3(i10, f2.locale, l2);
              _2 = i10?.domain === e11?.domain || u2 ? h2(t11) : d2(r11, e11?.domain);
            } else _2 = h2(t11);
            else _2 = d2(r11);
          } else _2 = y2 ? h2(t11) : d2(r0(p2, rF(a10, c.localePrefix), e10.nextUrl.search));
        } else _2 = y2 ? h2(r0(v2, `/${a10}`, e10.nextUrl.search)) : d2(r0(p2, rF(a10, c.localePrefix), e10.nextUrl.search));
        return function(e11, t11, r11, n11, s11) {
          if (!n11.localeCookie) return;
          let { name: i11, ...a11 } = n11.localeCookie, o3 = e11.cookies.has(i11);
          o3 && e11.cookies.get(i11)?.value !== r11 ? t11.cookies.set(i11, r11, { path: e11.nextUrl.basePath || void 0, ...a11 }) : o3 || nu(e11.headers, s11?.locales || n11.locales, n11.defaultLocale) === r11 || t11.cookies.set(i11, r11, { path: e11.nextUrl.basePath || void 0, ...a11 });
        }(e10, _2, a10, c, i10), !b2 && "never" !== m2 && c.alternateLinks && c.locales.length > 1 && _2.headers.set("Link", function({ internalTemplateName: e11, localizedPathnames: t11, request: r11, resolvedLocale: n11, routing: s11 }) {
          let i11 = r11.nextUrl.clone(), a11 = r1(r11.headers);
          function o3(e12, t12) {
            var n12;
            return e12.pathname = rH(e12.pathname), r11.nextUrl.basePath && ((e12 = new URL(e12)).pathname = (n12 = e12.pathname, rH(r11.nextUrl.basePath + n12))), `<${e12.toString()}>; rel="alternate"; hreflang="${t12}"`;
          }
          function l3(r12, s12) {
            return t11 && "object" == typeof t11 ? rX(r12, t11[n11] ?? e11, t11[s12] ?? e11) : r12;
          }
          a11 && (i11.port = "", i11.host = a11), i11.protocol = r11.headers.get("x-forwarded-proto") ?? i11.protocol, i11.pathname = rY(i11.pathname, s11.locales, s11.localePrefix);
          let u3 = rZ(s11.locales, s11.localePrefix, false).flatMap(([e12, r12]) => {
            let n12;
            function a12(e13) {
              return "/" === e13 ? r12 : r12 + e13;
            }
            if (s11.domains) return s11.domains.filter((t12) => r2(e12, t12)).map((t12) => {
              (n12 = new URL(i11)).port = "", n12.host = t12.domain, n12.pathname = l3(i11.pathname, e12);
              let r13 = t12.localePrefix || s11.localePrefix.mode;
              return e12 === t12.defaultLocale && "always" !== r13 || (n12.pathname = a12(n12.pathname)), o3(n12, e12);
            });
            {
              let r13;
              r13 = t11 && "object" == typeof t11 ? l3(i11.pathname, e12) : i11.pathname, e12 === s11.defaultLocale && "always" !== s11.localePrefix.mode || (r13 = a12(r13)), n12 = new URL(r13, i11);
            }
            return o3(n12, e12);
          });
          if (!s11.domains || 0 === s11.domains.length) {
            let e12 = l3(i11.pathname, s11.defaultLocale);
            if (e12) {
              let t12 = new URL(e12, i11);
              u3.push(o3(t12, "x-default"));
            }
          }
          return u3.join(", ");
        }({ routing: c, internalTemplateName: w2, localizedPathnames: null != w2 && k2 ? k2[w2] : void 0, request: e10, resolvedLocale: a10 })), _2;
      });
      class nT extends Error {
        constructor(e10, t10 = "FunctionsError", r10) {
          super(e10), this.name = t10, this.context = r10;
        }
        toJSON() {
          return { name: this.name, message: this.message, context: this.context };
        }
      }
      class nR extends nT {
        constructor(e10) {
          super("Failed to send a request to the Edge Function", "FunctionsFetchError", e10);
        }
      }
      class nC extends nT {
        constructor(e10) {
          super("Relay Error invoking the Edge Function", "FunctionsRelayError", e10);
        }
      }
      class nx extends nT {
        constructor(e10) {
          super("Edge Function returned a non-2xx status code", "FunctionsHttpError", e10);
        }
      }
      (ep = ek || (ek = {})).Any = "any", ep.ApNortheast1 = "ap-northeast-1", ep.ApNortheast2 = "ap-northeast-2", ep.ApSouth1 = "ap-south-1", ep.ApSoutheast1 = "ap-southeast-1", ep.ApSoutheast2 = "ap-southeast-2", ep.CaCentral1 = "ca-central-1", ep.EuCentral1 = "eu-central-1", ep.EuWest1 = "eu-west-1", ep.EuWest2 = "eu-west-2", ep.EuWest3 = "eu-west-3", ep.SaEast1 = "sa-east-1", ep.UsEast1 = "us-east-1", ep.UsWest1 = "us-west-1", ep.UsWest2 = "us-west-2";
      function nO(e10, t10) {
        var r10 = {};
        for (var n10 in e10) Object.prototype.hasOwnProperty.call(e10, n10) && 0 > t10.indexOf(n10) && (r10[n10] = e10[n10]);
        if (null != e10 && "function" == typeof Object.getOwnPropertySymbols) for (var s10 = 0, n10 = Object.getOwnPropertySymbols(e10); s10 < n10.length; s10++) 0 > t10.indexOf(n10[s10]) && Object.prototype.propertyIsEnumerable.call(e10, n10[s10]) && (r10[n10[s10]] = e10[n10[s10]]);
        return r10;
      }
      "function" == typeof SuppressedError && SuppressedError;
      class nA {
        constructor(e10, { headers: t10 = {}, customFetch: r10, region: n10 = ek.Any } = {}) {
          this.url = e10, this.headers = t10, this.region = n10, this.fetch = /* @__PURE__ */ ((e11) => e11 ? (...t11) => e11(...t11) : (...e12) => fetch(...e12))(r10);
        }
        setAuth(e10) {
          this.headers.Authorization = `Bearer ${e10}`;
        }
        invoke(e10) {
          var t10, r10, n10, s10;
          return t10 = this, r10 = arguments, n10 = void 0, s10 = function* (e11, t11 = {}) {
            var r11;
            let n11, s11;
            try {
              let i10, { headers: a10, method: o2, body: l2, signal: u2, timeout: c2 } = t11, h2 = {}, { region: d2 } = t11;
              d2 || (d2 = this.region);
              let p2 = new URL(`${this.url}/${e11}`);
              d2 && "any" !== d2 && (h2["x-region"] = d2, p2.searchParams.set("forceFunctionRegion", d2)), l2 && (a10 && !Object.prototype.hasOwnProperty.call(a10, "Content-Type") || !a10) ? "u" > typeof Blob && l2 instanceof Blob || l2 instanceof ArrayBuffer ? (h2["Content-Type"] = "application/octet-stream", i10 = l2) : "string" == typeof l2 ? (h2["Content-Type"] = "text/plain", i10 = l2) : "u" > typeof FormData && l2 instanceof FormData ? i10 = l2 : (h2["Content-Type"] = "application/json", i10 = JSON.stringify(l2)) : i10 = !l2 || "string" == typeof l2 || "u" > typeof Blob && l2 instanceof Blob || l2 instanceof ArrayBuffer || "u" > typeof FormData && l2 instanceof FormData ? l2 : JSON.stringify(l2);
              let f2 = u2;
              c2 && (s11 = new AbortController(), n11 = setTimeout(() => s11.abort(), c2), u2 ? (f2 = s11.signal, u2.addEventListener("abort", () => s11.abort())) : f2 = s11.signal);
              let g2 = yield this.fetch(p2.toString(), { method: o2 || "POST", headers: Object.assign(Object.assign(Object.assign({}, h2), this.headers), a10), body: i10, signal: f2 }).catch((e12) => {
                throw new nR(e12);
              }), m2 = g2.headers.get("x-relay-error");
              if (m2 && "true" === m2) throw new nC(g2);
              if (!g2.ok) throw new nx(g2);
              let y2 = (null != (r11 = g2.headers.get("Content-Type")) ? r11 : "text/plain").split(";")[0].trim();
              return { data: "application/json" === y2 ? yield g2.json() : "application/octet-stream" === y2 || "application/pdf" === y2 ? yield g2.blob() : "text/event-stream" === y2 ? g2 : "multipart/form-data" === y2 ? yield g2.formData() : yield g2.text(), error: null, response: g2 };
            } catch (e12) {
              return { data: null, error: e12, response: e12 instanceof nx || e12 instanceof nC ? e12.context : void 0 };
            } finally {
              n11 && clearTimeout(n11);
            }
          }, new (n10 || (n10 = Promise))(function(e11, i10) {
            function a10(e12) {
              try {
                l2(s10.next(e12));
              } catch (e13) {
                i10(e13);
              }
            }
            function o2(e12) {
              try {
                l2(s10.throw(e12));
              } catch (e13) {
                i10(e13);
              }
            }
            function l2(t11) {
              var r11;
              t11.done ? e11(t11.value) : ((r11 = t11.value) instanceof n10 ? r11 : new n10(function(e12) {
                e12(r11);
              })).then(a10, o2);
            }
            l2((s10 = s10.apply(t10, r10 || [])).next());
          });
        }
      }
      let nP = (e10) => Math.min(1e3 * 2 ** e10, 3e4), nI = [520, 503], nN = ["GET", "HEAD", "OPTIONS"];
      var nj = class extends Error {
        constructor(e10) {
          super(e10.message), this.name = "PostgrestError", this.details = e10.details, this.hint = e10.hint, this.code = e10.code;
        }
        toJSON() {
          return { name: this.name, message: this.message, details: this.details, hint: this.hint, code: this.code };
        }
      };
      function n$(e10, t10) {
        return new Promise((r10) => {
          if (null == t10 ? void 0 : t10.aborted) return void r10();
          let n10 = setTimeout(() => {
            null == t10 || t10.removeEventListener("abort", s10), r10();
          }, e10);
          function s10() {
            clearTimeout(n10), r10();
          }
          null == t10 || t10.addEventListener("abort", s10);
        });
      }
      var nL = class {
        constructor(e10) {
          var t10, r10, n10, s10, i10;
          this.shouldThrowOnError = false, this.retryEnabled = true, this.method = e10.method, this.url = e10.url, this.headers = new Headers(e10.headers), this.schema = e10.schema, this.body = e10.body, this.shouldThrowOnError = null != (t10 = e10.shouldThrowOnError) && t10, this.signal = e10.signal, this.isMaybeSingle = null != (r10 = e10.isMaybeSingle) && r10, this.shouldStripNulls = null != (n10 = e10.shouldStripNulls) && n10, this.urlLengthLimit = null != (s10 = e10.urlLengthLimit) ? s10 : 8e3, this.retryEnabled = null == (i10 = e10.retry) || i10, e10.fetch ? this.fetch = e10.fetch : this.fetch = fetch;
        }
        throwOnError() {
          return this.shouldThrowOnError = true, this;
        }
        stripNulls() {
          if ("text/csv" === this.headers.get("Accept")) throw Error("stripNulls() cannot be used with csv()");
          return this.shouldStripNulls = true, this;
        }
        setHeader(e10, t10) {
          return this.headers = new Headers(this.headers), this.headers.set(e10, t10), this;
        }
        retry(e10) {
          return this.retryEnabled = e10, this;
        }
        then(e10, t10) {
          var r10 = this;
          if (void 0 === this.schema || (["GET", "HEAD"].includes(this.method) ? this.headers.set("Accept-Profile", this.schema) : this.headers.set("Content-Profile", this.schema)), "GET" !== this.method && "HEAD" !== this.method && this.headers.set("Content-Type", "application/json"), this.shouldStripNulls) {
            let e11 = this.headers.get("Accept");
            "application/vnd.pgrst.object+json" === e11 ? this.headers.set("Accept", "application/vnd.pgrst.object+json;nulls=stripped") : e11 && "application/json" !== e11 || this.headers.set("Accept", "application/vnd.pgrst.array+json;nulls=stripped");
          }
          let n10 = this.fetch, s10 = (async () => {
            let e11 = 0;
            for (; ; ) {
              var t11, s11, i10, a10, o2;
              let l2, u2 = {};
              r10.headers.forEach((e12, t12) => {
                u2[t12] = e12;
              }), e11 > 0 && (u2["X-Retry-Count"] = String(e11));
              try {
                l2 = await n10(r10.url.toString(), { method: r10.method, headers: u2, body: JSON.stringify(r10.body, (e12, t12) => "bigint" == typeof t12 ? t12.toString() : t12), signal: r10.signal });
              } catch (t12) {
                if ((null == t12 ? void 0 : t12.name) === "AbortError" || (null == t12 ? void 0 : t12.code) === "ABORT_ERR" || !nN.includes(r10.method)) throw t12;
                if (r10.retryEnabled && e11 < 3) {
                  let t13 = nP(e11);
                  e11++, await n$(t13, r10.signal);
                  continue;
                }
                throw t12;
              }
              if (t11 = r10.method, s11 = l2.status, i10 = e11, r10.retryEnabled && !(i10 >= 3) && nN.includes(t11) && nI.includes(s11) && 1) {
                let t12 = null != (a10 = null == (o2 = l2.headers) ? void 0 : o2.get("Retry-After")) ? a10 : null, n11 = null !== t12 ? 1e3 * Math.max(0, parseInt(t12, 10) || 0) : nP(e11);
                await l2.text(), e11++, await n$(n11, r10.signal);
                continue;
              }
              return await r10.processResponse(l2);
            }
          })();
          return this.shouldThrowOnError || (s10 = s10.catch((e11) => {
            var t11, r11, n11, s11, i10, a10;
            let o2 = "", l2 = "", u2 = "", c2 = null == e11 ? void 0 : e11.cause;
            if (c2) {
              let t12 = null != (r11 = null == c2 ? void 0 : c2.message) ? r11 : "", a11 = null != (n11 = null == c2 ? void 0 : c2.code) ? n11 : "";
              o2 = `${null != (s11 = null == e11 ? void 0 : e11.name) ? s11 : "FetchError"}: ${null == e11 ? void 0 : e11.message}

Caused by: ${null != (i10 = null == c2 ? void 0 : c2.name) ? i10 : "Error"}: ${t12}`, a11 && (o2 += ` (${a11})`), (null == c2 ? void 0 : c2.stack) && (o2 += `
${c2.stack}`);
            } else o2 = null != (a10 = null == e11 ? void 0 : e11.stack) ? a10 : "";
            let h2 = this.url.toString().length;
            return (null == e11 ? void 0 : e11.name) === "AbortError" || (null == e11 ? void 0 : e11.code) === "ABORT_ERR" ? (u2 = "", l2 = "Request was aborted (timeout or manual cancellation)", h2 > this.urlLengthLimit && (l2 += `. Note: Your request URL is ${h2} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`)) : ((null == c2 ? void 0 : c2.name) === "HeadersOverflowError" || (null == c2 ? void 0 : c2.code) === "UND_ERR_HEADERS_OVERFLOW") && (u2 = "", l2 = "HTTP headers exceeded server limits (typically 16KB)", h2 > this.urlLengthLimit && (l2 += `. Your request URL is ${h2} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`)), { success: false, error: { message: `${null != (t11 = null == e11 ? void 0 : e11.name) ? t11 : "FetchError"}: ${null == e11 ? void 0 : e11.message}`, details: o2, hint: l2, code: u2 }, data: null, count: null, status: 0, statusText: "" };
          })), s10.then(e10, t10);
        }
        async processResponse(e10) {
          var t10, r10, n10;
          let s10 = null, i10 = null, a10 = null, o2 = e10.status, l2 = e10.statusText;
          if (e10.ok) {
            if ("HEAD" !== this.method) {
              let t11 = await e10.text();
              if ("" === t11) ;
              else if ("text/csv" === this.headers.get("Accept")) i10 = t11;
              else if (this.headers.get("Accept") && (null == (n10 = this.headers.get("Accept")) ? void 0 : n10.includes("application/vnd.pgrst.plan+text"))) i10 = t11;
              else try {
                i10 = JSON.parse(t11);
              } catch (e11) {
                if (s10 = { message: t11 }, i10 = null, this.shouldThrowOnError) throw new nj({ message: t11, details: "", hint: "", code: "" });
              }
            }
            let u2 = null == (t10 = this.headers.get("Prefer")) ? void 0 : t10.match(/count=(exact|planned|estimated)/), c2 = null == (r10 = e10.headers.get("content-range")) ? void 0 : r10.split("/");
            u2 && c2 && c2.length > 1 && (a10 = parseInt(c2[1])), this.isMaybeSingle && Array.isArray(i10) && (i10.length > 1 ? (s10 = { code: "PGRST116", details: `Results contain ${i10.length} rows, application/vnd.pgrst.object+json requires 1 row`, hint: null, message: "JSON object requested, multiple (or no) rows returned" }, i10 = null, a10 = null, o2 = 406, l2 = "Not Acceptable") : i10 = 1 === i10.length ? i10[0] : null);
          } else {
            let t11 = await e10.text();
            try {
              s10 = JSON.parse(t11), Array.isArray(s10) && 404 === e10.status && (i10 = [], s10 = null, o2 = 200, l2 = "OK");
            } catch (r11) {
              404 === e10.status && "" === t11 ? (o2 = 204, l2 = "No Content") : s10 = { message: t11 };
            }
            if (s10 && this.shouldThrowOnError) throw new nj(s10);
          }
          return { success: null === s10, error: s10, data: i10, count: a10, status: o2, statusText: l2 };
        }
        returns() {
          return this;
        }
        overrideTypes() {
          return this;
        }
      }, nD = class extends nL {
        throwOnError() {
          return super.throwOnError();
        }
        select(e10) {
          let t10 = false, r10 = (null != e10 ? e10 : "*").split("").map((e11) => /\s/.test(e11) && !t10 ? "" : ('"' === e11 && (t10 = !t10), e11)).join("");
          return this.url.searchParams.set("select", r10), this.headers.append("Prefer", "return=representation"), this;
        }
        order(e10, { ascending: t10 = true, nullsFirst: r10, foreignTable: n10, referencedTable: s10 = n10 } = {}) {
          let i10 = s10 ? `${s10}.order` : "order", a10 = this.url.searchParams.get(i10);
          return this.url.searchParams.set(i10, `${a10 ? `${a10},` : ""}${e10}.${t10 ? "asc" : "desc"}${void 0 === r10 ? "" : r10 ? ".nullsfirst" : ".nullslast"}`), this;
        }
        limit(e10, { foreignTable: t10, referencedTable: r10 = t10 } = {}) {
          let n10 = void 0 === r10 ? "limit" : `${r10}.limit`;
          return this.url.searchParams.set(n10, `${e10}`), this;
        }
        range(e10, t10, { foreignTable: r10, referencedTable: n10 = r10 } = {}) {
          let s10 = void 0 === n10 ? "offset" : `${n10}.offset`, i10 = void 0 === n10 ? "limit" : `${n10}.limit`;
          return this.url.searchParams.set(s10, `${e10}`), this.url.searchParams.set(i10, `${t10 - e10 + 1}`), this;
        }
        abortSignal(e10) {
          return this.signal = e10, this;
        }
        single() {
          return this.headers.set("Accept", "application/vnd.pgrst.object+json"), this;
        }
        maybeSingle() {
          return this.isMaybeSingle = true, this;
        }
        csv() {
          return this.headers.set("Accept", "text/csv"), this;
        }
        geojson() {
          return this.headers.set("Accept", "application/geo+json"), this;
        }
        explain({ analyze: e10 = false, verbose: t10 = false, settings: r10 = false, buffers: n10 = false, wal: s10 = false, format: i10 = "text" } = {}) {
          var a10;
          let o2 = [e10 ? "analyze" : null, t10 ? "verbose" : null, r10 ? "settings" : null, n10 ? "buffers" : null, s10 ? "wal" : null].filter(Boolean).join("|"), l2 = null != (a10 = this.headers.get("Accept")) ? a10 : "application/json";
          return this.headers.set("Accept", `application/vnd.pgrst.plan+${i10}; for="${l2}"; options=${o2};`), this;
        }
        rollback() {
          return this.headers.append("Prefer", "tx=rollback"), this;
        }
        returns() {
          return this;
        }
        maxAffected(e10) {
          return this.headers.append("Prefer", "handling=strict"), this.headers.append("Prefer", `max-affected=${e10}`), this;
        }
      };
      let nU = RegExp("[,()]");
      var nM = class extends nD {
        throwOnError() {
          return super.throwOnError();
        }
        eq(e10, t10) {
          return this.url.searchParams.append(e10, `eq.${t10}`), this;
        }
        neq(e10, t10) {
          return this.url.searchParams.append(e10, `neq.${t10}`), this;
        }
        gt(e10, t10) {
          return this.url.searchParams.append(e10, `gt.${t10}`), this;
        }
        gte(e10, t10) {
          return this.url.searchParams.append(e10, `gte.${t10}`), this;
        }
        lt(e10, t10) {
          return this.url.searchParams.append(e10, `lt.${t10}`), this;
        }
        lte(e10, t10) {
          return this.url.searchParams.append(e10, `lte.${t10}`), this;
        }
        like(e10, t10) {
          return this.url.searchParams.append(e10, `like.${t10}`), this;
        }
        likeAllOf(e10, t10) {
          return this.url.searchParams.append(e10, `like(all).{${t10.join(",")}}`), this;
        }
        likeAnyOf(e10, t10) {
          return this.url.searchParams.append(e10, `like(any).{${t10.join(",")}}`), this;
        }
        ilike(e10, t10) {
          return this.url.searchParams.append(e10, `ilike.${t10}`), this;
        }
        ilikeAllOf(e10, t10) {
          return this.url.searchParams.append(e10, `ilike(all).{${t10.join(",")}}`), this;
        }
        ilikeAnyOf(e10, t10) {
          return this.url.searchParams.append(e10, `ilike(any).{${t10.join(",")}}`), this;
        }
        regexMatch(e10, t10) {
          return this.url.searchParams.append(e10, `match.${t10}`), this;
        }
        regexIMatch(e10, t10) {
          return this.url.searchParams.append(e10, `imatch.${t10}`), this;
        }
        is(e10, t10) {
          return this.url.searchParams.append(e10, `is.${t10}`), this;
        }
        isDistinct(e10, t10) {
          return this.url.searchParams.append(e10, `isdistinct.${t10}`), this;
        }
        in(e10, t10) {
          let r10 = Array.from(new Set(t10)).map((e11) => "string" == typeof e11 && nU.test(e11) ? `"${e11}"` : `${e11}`).join(",");
          return this.url.searchParams.append(e10, `in.(${r10})`), this;
        }
        notIn(e10, t10) {
          let r10 = Array.from(new Set(t10)).map((e11) => "string" == typeof e11 && nU.test(e11) ? `"${e11}"` : `${e11}`).join(",");
          return this.url.searchParams.append(e10, `not.in.(${r10})`), this;
        }
        contains(e10, t10) {
          return "string" == typeof t10 ? this.url.searchParams.append(e10, `cs.${t10}`) : Array.isArray(t10) ? this.url.searchParams.append(e10, `cs.{${t10.join(",")}}`) : this.url.searchParams.append(e10, `cs.${JSON.stringify(t10)}`), this;
        }
        containedBy(e10, t10) {
          return "string" == typeof t10 ? this.url.searchParams.append(e10, `cd.${t10}`) : Array.isArray(t10) ? this.url.searchParams.append(e10, `cd.{${t10.join(",")}}`) : this.url.searchParams.append(e10, `cd.${JSON.stringify(t10)}`), this;
        }
        rangeGt(e10, t10) {
          return this.url.searchParams.append(e10, `sr.${t10}`), this;
        }
        rangeGte(e10, t10) {
          return this.url.searchParams.append(e10, `nxl.${t10}`), this;
        }
        rangeLt(e10, t10) {
          return this.url.searchParams.append(e10, `sl.${t10}`), this;
        }
        rangeLte(e10, t10) {
          return this.url.searchParams.append(e10, `nxr.${t10}`), this;
        }
        rangeAdjacent(e10, t10) {
          return this.url.searchParams.append(e10, `adj.${t10}`), this;
        }
        overlaps(e10, t10) {
          return "string" == typeof t10 ? this.url.searchParams.append(e10, `ov.${t10}`) : this.url.searchParams.append(e10, `ov.{${t10.join(",")}}`), this;
        }
        textSearch(e10, t10, { config: r10, type: n10 } = {}) {
          let s10 = "";
          "plain" === n10 ? s10 = "pl" : "phrase" === n10 ? s10 = "ph" : "websearch" === n10 && (s10 = "w");
          let i10 = void 0 === r10 ? "" : `(${r10})`;
          return this.url.searchParams.append(e10, `${s10}fts${i10}.${t10}`), this;
        }
        match(e10) {
          return Object.entries(e10).filter(([e11, t10]) => void 0 !== t10).forEach(([e11, t10]) => {
            this.url.searchParams.append(e11, `eq.${t10}`);
          }), this;
        }
        not(e10, t10, r10) {
          return this.url.searchParams.append(e10, `not.${t10}.${r10}`), this;
        }
        or(e10, { foreignTable: t10, referencedTable: r10 = t10 } = {}) {
          let n10 = r10 ? `${r10}.or` : "or";
          return this.url.searchParams.append(n10, `(${e10})`), this;
        }
        filter(e10, t10, r10) {
          return this.url.searchParams.append(e10, `${t10}.${r10}`), this;
        }
      }, nq = class {
        constructor(e10, { headers: t10 = {}, schema: r10, fetch: n10, urlLengthLimit: s10 = 8e3, retry: i10 }) {
          this.url = e10, this.headers = new Headers(t10), this.schema = r10, this.fetch = n10, this.urlLengthLimit = s10, this.retry = i10;
        }
        cloneRequestState() {
          return { url: new URL(this.url.toString()), headers: new Headers(this.headers) };
        }
        select(e10, t10) {
          let { head: r10 = false, count: n10 } = null != t10 ? t10 : {}, s10 = false, i10 = (null != e10 ? e10 : "*").split("").map((e11) => /\s/.test(e11) && !s10 ? "" : ('"' === e11 && (s10 = !s10), e11)).join(""), { url: a10, headers: o2 } = this.cloneRequestState();
          return a10.searchParams.set("select", i10), n10 && o2.append("Prefer", `count=${n10}`), new nM({ method: r10 ? "HEAD" : "GET", url: a10, headers: o2, schema: this.schema, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        insert(e10, { count: t10, defaultToNull: r10 = true } = {}) {
          var n10;
          let { url: s10, headers: i10 } = this.cloneRequestState();
          if (t10 && i10.append("Prefer", `count=${t10}`), r10 || i10.append("Prefer", "missing=default"), Array.isArray(e10)) {
            let t11 = e10.reduce((e11, t12) => e11.concat(Object.keys(t12)), []);
            if (t11.length > 0) {
              let e11 = [...new Set(t11)].map((e12) => `"${e12}"`);
              s10.searchParams.set("columns", e11.join(","));
            }
          }
          return new nM({ method: "POST", url: s10, headers: i10, schema: this.schema, body: e10, fetch: null != (n10 = this.fetch) ? n10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        upsert(e10, { onConflict: t10, ignoreDuplicates: r10 = false, count: n10, defaultToNull: s10 = true } = {}) {
          var i10;
          let { url: a10, headers: o2 } = this.cloneRequestState();
          if (o2.append("Prefer", `resolution=${r10 ? "ignore" : "merge"}-duplicates`), void 0 !== t10 && a10.searchParams.set("on_conflict", t10), n10 && o2.append("Prefer", `count=${n10}`), s10 || o2.append("Prefer", "missing=default"), Array.isArray(e10)) {
            let t11 = e10.reduce((e11, t12) => e11.concat(Object.keys(t12)), []);
            if (t11.length > 0) {
              let e11 = [...new Set(t11)].map((e12) => `"${e12}"`);
              a10.searchParams.set("columns", e11.join(","));
            }
          }
          return new nM({ method: "POST", url: a10, headers: o2, schema: this.schema, body: e10, fetch: null != (i10 = this.fetch) ? i10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        update(e10, { count: t10 } = {}) {
          var r10;
          let { url: n10, headers: s10 } = this.cloneRequestState();
          return t10 && s10.append("Prefer", `count=${t10}`), new nM({ method: "PATCH", url: n10, headers: s10, schema: this.schema, body: e10, fetch: null != (r10 = this.fetch) ? r10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        delete({ count: e10 } = {}) {
          var t10;
          let { url: r10, headers: n10 } = this.cloneRequestState();
          return e10 && n10.append("Prefer", `count=${e10}`), new nM({ method: "DELETE", url: r10, headers: n10, schema: this.schema, fetch: null != (t10 = this.fetch) ? t10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
      };
      function nB(e10) {
        return (nB = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e11) {
          return typeof e11;
        } : function(e11) {
          return e11 && "function" == typeof Symbol && e11.constructor === Symbol && e11 !== Symbol.prototype ? "symbol" : typeof e11;
        })(e10);
      }
      function nH(e10, t10) {
        var r10 = Object.keys(e10);
        if (Object.getOwnPropertySymbols) {
          var n10 = Object.getOwnPropertySymbols(e10);
          t10 && (n10 = n10.filter(function(t11) {
            return Object.getOwnPropertyDescriptor(e10, t11).enumerable;
          })), r10.push.apply(r10, n10);
        }
        return r10;
      }
      function nG(e10) {
        for (var t10 = 1; t10 < arguments.length; t10++) {
          var r10 = null != arguments[t10] ? arguments[t10] : {};
          t10 % 2 ? nH(Object(r10), true).forEach(function(t11) {
            !function(e11, t12, r11) {
              var n10;
              (n10 = function(e12, t13) {
                if ("object" != nB(e12) || !e12) return e12;
                var r12 = e12[Symbol.toPrimitive];
                if (void 0 !== r12) {
                  var n11 = r12.call(e12, t13 || "default");
                  if ("object" != nB(n11)) return n11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === t13 ? String : Number)(e12);
              }(t12, "string"), (t12 = "symbol" == nB(n10) ? n10 : n10 + "") in e11) ? Object.defineProperty(e11, t12, { value: r11, enumerable: true, configurable: true, writable: true }) : e11[t12] = r11;
            }(e10, t11, r10[t11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e10, Object.getOwnPropertyDescriptors(r10)) : nH(Object(r10)).forEach(function(t11) {
            Object.defineProperty(e10, t11, Object.getOwnPropertyDescriptor(r10, t11));
          });
        }
        return e10;
      }
      var nF = class e10 {
        constructor(e11, { headers: t10 = {}, schema: r10, fetch: n10, timeout: s10, urlLengthLimit: i10 = 8e3, retry: a10 } = {}) {
          this.url = e11, this.headers = new Headers(t10), this.schemaName = r10, this.urlLengthLimit = i10;
          const o2 = null != n10 ? n10 : globalThis.fetch;
          void 0 !== s10 && s10 > 0 ? this.fetch = (e12, t11) => {
            let r11 = new AbortController(), n11 = setTimeout(() => r11.abort(), s10), i11 = null == t11 ? void 0 : t11.signal;
            if (i11) {
              if (i11.aborted) return clearTimeout(n11), o2(e12, t11);
              let s11 = () => {
                clearTimeout(n11), r11.abort();
              };
              return i11.addEventListener("abort", s11, { once: true }), o2(e12, nG(nG({}, t11), {}, { signal: r11.signal })).finally(() => {
                clearTimeout(n11), i11.removeEventListener("abort", s11);
              });
            }
            return o2(e12, nG(nG({}, t11), {}, { signal: r11.signal })).finally(() => clearTimeout(n11));
          } : this.fetch = o2, this.retry = a10;
        }
        from(e11) {
          if (!e11 || "string" != typeof e11 || "" === e11.trim()) throw Error("Invalid relation name: relation must be a non-empty string.");
          return new nq(new URL(`${this.url}/${e11}`), { headers: new Headers(this.headers), schema: this.schemaName, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        schema(t10) {
          return new e10(this.url, { headers: this.headers, schema: t10, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        rpc(e11, t10 = {}, { head: r10 = false, get: n10 = false, count: s10 } = {}) {
          var i10;
          let a10, o2, l2 = new URL(`${this.url}/rpc/${e11}`), u2 = (e12) => null !== e12 && "object" == typeof e12 && (!Array.isArray(e12) || e12.some(u2)), c2 = r10 && Object.values(t10).some(u2);
          c2 ? (a10 = "POST", o2 = t10) : r10 || n10 ? (a10 = r10 ? "HEAD" : "GET", Object.entries(t10).filter(([e12, t11]) => void 0 !== t11).map(([e12, t11]) => [e12, Array.isArray(t11) ? `{${t11.join(",")}}` : `${t11}`]).forEach(([e12, t11]) => {
            l2.searchParams.append(e12, t11);
          })) : (a10 = "POST", o2 = t10);
          let h2 = new Headers(this.headers);
          return c2 ? h2.set("Prefer", s10 ? `count=${s10},return=minimal` : "return=minimal") : s10 && h2.set("Prefer", `count=${s10}`), new nM({ method: a10, url: l2, headers: h2, schema: this.schemaName, body: o2, fetch: null != (i10 = this.fetch) ? i10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
      };
      let nW = class {
        static detectEnvironment() {
          var t10;
          if ("u" > typeof WebSocket) return { type: "native", wsConstructor: WebSocket };
          let r10 = globalThis;
          if ("u" > typeof globalThis && void 0 !== r10.WebSocket) return { type: "native", wsConstructor: r10.WebSocket };
          let n10 = e.g;
          if (n10 && void 0 !== n10.WebSocket) return { type: "native", wsConstructor: n10.WebSocket };
          if ("u" > typeof globalThis && void 0 !== r10.WebSocketPair && void 0 === globalThis.WebSocket) return { type: "cloudflare", error: "Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.", workaround: "Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime." };
          if ("u" > typeof globalThis && r10.EdgeRuntime || "u" > typeof navigator && (null == (t10 = navigator.userAgent) ? void 0 : t10.includes("Vercel-Edge"))) return { type: "unsupported", error: "Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.", workaround: "Use serverless functions or a different deployment target for WebSocket functionality." };
          let s10 = globalThis.process;
          if (s10) {
            let e10 = s10.versions;
            if (e10 && e10.node) {
              let t11 = parseInt(e10.node.replace(/^v/, "").split(".")[0]);
              return t11 >= 22 ? void 0 !== globalThis.WebSocket ? { type: "native", wsConstructor: globalThis.WebSocket } : { type: "unsupported", error: `Node.js ${t11} detected but native WebSocket not found.`, workaround: "Provide a WebSocket implementation via the transport option." } : { type: "unsupported", error: `Node.js ${t11} detected without native WebSocket support.`, workaround: 'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })' };
            }
          }
          return { type: "unsupported", error: "Unknown JavaScript runtime without WebSocket support.", workaround: "Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation." };
        }
        static getWebSocketConstructor() {
          let e10 = this.detectEnvironment();
          if (e10.wsConstructor) return e10.wsConstructor;
          let t10 = e10.error || "WebSocket not supported in this environment.";
          throw e10.workaround && (t10 += `

Suggested solution: ${e10.workaround}`), Error(t10);
        }
        static isWebSocketSupported() {
          try {
            let e10 = this.detectEnvironment();
            return "native" === e10.type || "ws" === e10.type;
          } catch (e10) {
            return false;
          }
        }
      }, nz = "2.0.0", nK = "errored", nV = "joined", nJ = { close: "phx_close", error: "phx_error", join: "phx_join", reply: "phx_reply", leave: "phx_leave", access_token: "access_token" };
      class nX {
        constructor(e10) {
          this.HEADER_LENGTH = 1, this.USER_BROADCAST_PUSH_META_LENGTH = 6, this.KINDS = { userBroadcastPush: 3, userBroadcast: 4 }, this.BINARY_ENCODING = 0, this.JSON_ENCODING = 1, this.BROADCAST_EVENT = "broadcast", this.allowedMetadataKeys = [], this.allowedMetadataKeys = null != e10 ? e10 : [];
        }
        encode(e10, t10) {
          return e10.event !== this.BROADCAST_EVENT || e10.payload instanceof ArrayBuffer || "string" != typeof e10.payload.event ? t10(JSON.stringify([e10.join_ref, e10.ref, e10.topic, e10.event, e10.payload])) : t10(this._binaryEncodeUserBroadcastPush(e10));
        }
        _binaryEncodeUserBroadcastPush(e10) {
          var t10;
          return this._isArrayBuffer(null == (t10 = e10.payload) ? void 0 : t10.payload) ? this._encodeBinaryUserBroadcastPush(e10) : this._encodeJsonUserBroadcastPush(e10);
        }
        _encodeBinaryUserBroadcastPush(e10) {
          var t10, r10;
          let n10 = null != (r10 = null == (t10 = e10.payload) ? void 0 : t10.payload) ? r10 : new ArrayBuffer(0);
          return this._encodeUserBroadcastPush(e10, this.BINARY_ENCODING, n10);
        }
        _encodeJsonUserBroadcastPush(e10) {
          var t10, r10;
          let n10 = null != (r10 = null == (t10 = e10.payload) ? void 0 : t10.payload) ? r10 : {}, s10 = new TextEncoder().encode(JSON.stringify(n10)).buffer;
          return this._encodeUserBroadcastPush(e10, this.JSON_ENCODING, s10);
        }
        _encodeUserBroadcastPush(e10, t10, r10) {
          let n10 = e10.topic, s10 = null != (p2 = e10.ref) ? p2 : "", i10 = null != (f2 = e10.join_ref) ? f2 : "", a10 = e10.payload.event, o2 = this.allowedMetadataKeys ? this._pick(e10.payload, this.allowedMetadataKeys) : {}, l2 = 0 === Object.keys(o2).length ? "" : JSON.stringify(o2);
          if (i10.length > 255) throw Error(`joinRef length ${i10.length} exceeds maximum of 255`);
          if (s10.length > 255) throw Error(`ref length ${s10.length} exceeds maximum of 255`);
          if (n10.length > 255) throw Error(`topic length ${n10.length} exceeds maximum of 255`);
          if (a10.length > 255) throw Error(`userEvent length ${a10.length} exceeds maximum of 255`);
          if (l2.length > 255) throw Error(`metadata length ${l2.length} exceeds maximum of 255`);
          let u2 = this.USER_BROADCAST_PUSH_META_LENGTH + i10.length + s10.length + n10.length + a10.length + l2.length, c2 = new ArrayBuffer(this.HEADER_LENGTH + u2), h2 = new DataView(c2), d2 = 0;
          h2.setUint8(d2++, this.KINDS.userBroadcastPush), h2.setUint8(d2++, i10.length), h2.setUint8(d2++, s10.length), h2.setUint8(d2++, n10.length), h2.setUint8(d2++, a10.length), h2.setUint8(d2++, l2.length), h2.setUint8(d2++, t10), Array.from(i10, (e11) => h2.setUint8(d2++, e11.charCodeAt(0))), Array.from(s10, (e11) => h2.setUint8(d2++, e11.charCodeAt(0))), Array.from(n10, (e11) => h2.setUint8(d2++, e11.charCodeAt(0))), Array.from(a10, (e11) => h2.setUint8(d2++, e11.charCodeAt(0))), Array.from(l2, (e11) => h2.setUint8(d2++, e11.charCodeAt(0)));
          var p2, f2, g2 = new Uint8Array(c2.byteLength + r10.byteLength);
          return g2.set(new Uint8Array(c2), 0), g2.set(new Uint8Array(r10), c2.byteLength), g2.buffer;
        }
        decode(e10, t10) {
          if (this._isArrayBuffer(e10)) return t10(this._binaryDecode(e10));
          if ("string" == typeof e10) {
            let [r10, n10, s10, i10, a10] = JSON.parse(e10);
            return t10({ join_ref: r10, ref: n10, topic: s10, event: i10, payload: a10 });
          }
          return t10({});
        }
        _binaryDecode(e10) {
          let t10 = new DataView(e10), r10 = t10.getUint8(0), n10 = new TextDecoder();
          if (r10 === this.KINDS.userBroadcast) return this._decodeUserBroadcast(e10, t10, n10);
        }
        _decodeUserBroadcast(e10, t10, r10) {
          let n10 = t10.getUint8(1), s10 = t10.getUint8(2), i10 = t10.getUint8(3), a10 = t10.getUint8(4), o2 = this.HEADER_LENGTH + 4, l2 = r10.decode(e10.slice(o2, o2 + n10));
          o2 += n10;
          let u2 = r10.decode(e10.slice(o2, o2 + s10));
          o2 += s10;
          let c2 = r10.decode(e10.slice(o2, o2 + i10));
          o2 += i10;
          let h2 = e10.slice(o2, e10.byteLength), d2 = a10 === this.JSON_ENCODING ? JSON.parse(r10.decode(h2)) : h2, p2 = { type: this.BROADCAST_EVENT, event: u2, payload: d2 };
          return i10 > 0 && (p2.meta = JSON.parse(c2)), { join_ref: null, ref: null, topic: l2, event: this.BROADCAST_EVENT, payload: p2 };
        }
        _isArrayBuffer(e10) {
          var t10;
          return e10 instanceof ArrayBuffer || (null == (t10 = null == e10 ? void 0 : e10.constructor) ? void 0 : t10.name) === "ArrayBuffer";
        }
        _pick(e10, t10) {
          return e10 && "object" == typeof e10 ? Object.fromEntries(Object.entries(e10).filter(([e11]) => t10.includes(e11))) : {};
        }
      }
      (ef = eE || (eE = {})).abstime = "abstime", ef.bool = "bool", ef.date = "date", ef.daterange = "daterange", ef.float4 = "float4", ef.float8 = "float8", ef.int2 = "int2", ef.int4 = "int4", ef.int4range = "int4range", ef.int8 = "int8", ef.int8range = "int8range", ef.json = "json", ef.jsonb = "jsonb", ef.money = "money", ef.numeric = "numeric", ef.oid = "oid", ef.reltime = "reltime", ef.text = "text", ef.time = "time", ef.timestamp = "timestamp", ef.timestamptz = "timestamptz", ef.timetz = "timetz", ef.tsrange = "tsrange", ef.tstzrange = "tstzrange";
      let nY = (e10, t10, r10 = {}) => {
        var n10;
        let s10 = null != (n10 = r10.skipTypes) ? n10 : [];
        return t10 ? Object.keys(t10).reduce((r11, n11) => (r11[n11] = nZ(n11, e10, t10, s10), r11), {}) : {};
      }, nZ = (e10, t10, r10, n10) => {
        let s10 = t10.find((t11) => t11.name === e10), i10 = null == s10 ? void 0 : s10.type, a10 = r10[e10];
        return i10 && !n10.includes(i10) ? nQ(i10, a10) : n0(a10);
      }, nQ = (e10, t10) => {
        if ("_" === e10.charAt(0)) return n4(t10, e10.slice(1, e10.length));
        switch (e10) {
          case eE.bool:
            return n1(t10);
          case eE.float4:
          case eE.float8:
          case eE.int2:
          case eE.int4:
          case eE.int8:
          case eE.numeric:
          case eE.oid:
            return n2(t10);
          case eE.json:
          case eE.jsonb:
            return n3(t10);
          case eE.timestamp:
            return n5(t10);
          case eE.abstime:
          case eE.date:
          case eE.daterange:
          case eE.int4range:
          case eE.int8range:
          case eE.money:
          case eE.reltime:
          case eE.text:
          case eE.time:
          case eE.timestamptz:
          case eE.timetz:
          case eE.tsrange:
          case eE.tstzrange:
          default:
            return n0(t10);
        }
      }, n0 = (e10) => e10, n1 = (e10) => {
        switch (e10) {
          case "t":
            return true;
          case "f":
            return false;
          default:
            return e10;
        }
      }, n2 = (e10) => {
        if ("string" == typeof e10) {
          let t10 = parseFloat(e10);
          if (!Number.isNaN(t10)) return t10;
        }
        return e10;
      }, n3 = (e10) => {
        if ("string" == typeof e10) try {
          return JSON.parse(e10);
        } catch (e11) {
        }
        return e10;
      }, n4 = (e10, t10) => {
        if ("string" != typeof e10) return e10;
        let r10 = e10.length - 1, n10 = e10[r10];
        if ("{" === e10[0] && "}" === n10) {
          let n11, s10 = e10.slice(1, r10);
          try {
            n11 = JSON.parse("[" + s10 + "]");
          } catch (e11) {
            n11 = s10 ? s10.split(",") : [];
          }
          return n11.map((e11) => nQ(t10, e11));
        }
        return e10;
      }, n5 = (e10) => "string" == typeof e10 ? e10.replace(" ", "T") : e10, n6 = (e10) => {
        let t10 = new URL(e10);
        return t10.protocol = t10.protocol.replace(/^ws/i, "http"), t10.pathname = t10.pathname.replace(/\/+$/, "").replace(/\/socket\/websocket$/i, "").replace(/\/socket$/i, "").replace(/\/websocket$/i, ""), "" === t10.pathname || "/" === t10.pathname ? t10.pathname = "/api/broadcast" : t10.pathname = t10.pathname + "/api/broadcast", t10.href;
      };
      var n8 = (e10) => "function" == typeof e10 ? e10 : function() {
        return e10;
      }, n9 = ("u" > typeof self ? self : null) || globalThis, n7 = "closed", se = "errored", st = "joined", sr = "joining", sn = "leaving", ss = "phx_close", si = "phx_error", sa = "phx_reply", so = "phx_leave", sl = "websocket", su = "base64url.bearer.phx.", sc = class {
        constructor(e10, t10, r10, n10) {
          this.channel = e10, this.event = t10, this.payload = r10 || function() {
            return {};
          }, this.receivedResp = null, this.timeout = n10, this.timeoutTimer = null, this.recHooks = [], this.sent = false, this.ref = void 0;
        }
        resend(e10) {
          this.timeout = e10, this.reset(), this.send();
        }
        send() {
          this.hasReceived("timeout") || (this.startTimeout(), this.sent = true, this.channel.socket.push({ topic: this.channel.topic, event: this.event, payload: this.payload(), ref: this.ref, join_ref: this.channel.joinRef() }));
        }
        receive(e10, t10) {
          return this.hasReceived(e10) && t10(this.receivedResp.response), this.recHooks.push({ status: e10, callback: t10 }), this;
        }
        reset() {
          this.cancelRefEvent(), this.ref = null, this.refEvent = null, this.receivedResp = null, this.sent = false;
        }
        destroy() {
          this.cancelRefEvent(), this.cancelTimeout();
        }
        matchReceive({ status: e10, response: t10, _ref: r10 }) {
          this.recHooks.filter((t11) => t11.status === e10).forEach((e11) => e11.callback(t10));
        }
        cancelRefEvent() {
          this.refEvent && this.channel.off(this.refEvent);
        }
        cancelTimeout() {
          clearTimeout(this.timeoutTimer), this.timeoutTimer = null;
        }
        startTimeout() {
          this.timeoutTimer && this.cancelTimeout(), this.ref = this.channel.socket.makeRef(), this.refEvent = this.channel.replyEventName(this.ref), this.channel.on(this.refEvent, (e10) => {
            this.cancelRefEvent(), this.cancelTimeout(), this.receivedResp = e10, this.matchReceive(e10);
          }), this.timeoutTimer = setTimeout(() => {
            this.trigger("timeout", {});
          }, this.timeout);
        }
        hasReceived(e10) {
          return this.receivedResp && this.receivedResp.status === e10;
        }
        trigger(e10, t10) {
          this.channel.trigger(this.refEvent, { status: e10, response: t10 });
        }
      }, sh = class {
        constructor(e10, t10) {
          this.callback = e10, this.timerCalc = t10, this.timer = void 0, this.tries = 0;
        }
        reset() {
          this.tries = 0, clearTimeout(this.timer);
        }
        scheduleTimeout() {
          clearTimeout(this.timer), this.timer = setTimeout(() => {
            this.tries = this.tries + 1, this.callback();
          }, this.timerCalc(this.tries + 1));
        }
      }, sd = class {
        constructor(e10, t10, r10) {
          this.state = n7, this.topic = e10, this.params = n8(t10 || {}), this.socket = r10, this.bindings = [], this.bindingRef = 0, this.timeout = this.socket.timeout, this.joinedOnce = false, this.joinPush = new sc(this, "phx_join", this.params, this.timeout), this.pushBuffer = [], this.stateChangeRefs = [], this.rejoinTimer = new sh(() => {
            this.socket.isConnected() && this.rejoin();
          }, this.socket.rejoinAfterMs), this.stateChangeRefs.push(this.socket.onError(() => this.rejoinTimer.reset())), this.stateChangeRefs.push(this.socket.onOpen(() => {
            this.rejoinTimer.reset(), this.isErrored() && this.rejoin();
          })), this.joinPush.receive("ok", () => {
            this.state = st, this.rejoinTimer.reset(), this.pushBuffer.forEach((e11) => e11.send()), this.pushBuffer = [];
          }), this.joinPush.receive("error", (e11) => {
            this.state = se, this.socket.hasLogger() && this.socket.log("channel", `error ${this.topic}`, e11), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.onClose(() => {
            this.rejoinTimer.reset(), this.socket.hasLogger() && this.socket.log("channel", `close ${this.topic}`), this.state = n7, this.socket.remove(this);
          }), this.onError((e11) => {
            this.socket.hasLogger() && this.socket.log("channel", `error ${this.topic}`, e11), this.isJoining() && this.joinPush.reset(), this.state = se, this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.joinPush.receive("timeout", () => {
            this.socket.hasLogger() && this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout), new sc(this, so, n8({}), this.timeout).send(), this.state = se, this.joinPush.reset(), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.on(sa, (e11, t11) => {
            this.trigger(this.replyEventName(t11), e11);
          });
        }
        join(e10 = this.timeout) {
          if (!this.joinedOnce) return this.timeout = e10, this.joinedOnce = true, this.rejoin(), this.joinPush;
          throw Error("tried to join multiple times. 'join' can only be called a single time per channel instance");
        }
        teardown() {
          this.pushBuffer.forEach((e10) => e10.destroy()), this.pushBuffer = [], this.rejoinTimer.reset(), this.joinPush.destroy(), this.state = n7, this.bindings = [];
        }
        onClose(e10) {
          this.on(ss, e10);
        }
        onError(e10) {
          return this.on(si, (t10) => e10(t10));
        }
        on(e10, t10) {
          let r10 = this.bindingRef++;
          return this.bindings.push({ event: e10, ref: r10, callback: t10 }), r10;
        }
        off(e10, t10) {
          this.bindings = this.bindings.filter((r10) => r10.event !== e10 || void 0 !== t10 && t10 !== r10.ref);
        }
        canPush() {
          return this.socket.isConnected() && this.isJoined();
        }
        push(e10, t10, r10 = this.timeout) {
          if (t10 = t10 || {}, !this.joinedOnce) throw Error(`tried to push '${e10}' to '${this.topic}' before joining. Use channel.join() before pushing events`);
          let n10 = new sc(this, e10, function() {
            return t10;
          }, r10);
          return this.canPush() ? n10.send() : (n10.startTimeout(), this.pushBuffer.push(n10)), n10;
        }
        leave(e10 = this.timeout) {
          this.rejoinTimer.reset(), this.joinPush.cancelTimeout(), this.state = sn;
          let t10 = () => {
            this.socket.hasLogger() && this.socket.log("channel", `leave ${this.topic}`), this.trigger(ss, "leave");
          }, r10 = new sc(this, so, n8({}), e10);
          return r10.receive("ok", () => t10()).receive("timeout", () => t10()), r10.send(), this.canPush() || r10.trigger("ok", {}), r10;
        }
        onMessage(e10, t10, r10) {
          return t10;
        }
        filterBindings(e10, t10, r10) {
          return true;
        }
        isMember(e10, t10, r10, n10) {
          return this.topic === e10 && (!n10 || n10 === this.joinRef() || (this.socket.hasLogger() && this.socket.log("channel", "dropping outdated message", { topic: e10, event: t10, payload: r10, joinRef: n10 }), false));
        }
        joinRef() {
          return this.joinPush.ref;
        }
        rejoin(e10 = this.timeout) {
          this.isLeaving() || (this.socket.leaveOpenTopic(this.topic), this.state = sr, this.joinPush.resend(e10));
        }
        trigger(e10, t10, r10, n10) {
          let s10 = this.onMessage(e10, t10, r10, n10);
          if (t10 && !s10) throw Error("channel onMessage callbacks must return the payload, modified or unmodified");
          let i10 = this.bindings.filter((n11) => n11.event === e10 && this.filterBindings(n11, t10, r10));
          for (let e11 = 0; e11 < i10.length; e11++) i10[e11].callback(s10, r10, n10 || this.joinRef());
        }
        replyEventName(e10) {
          return `chan_reply_${e10}`;
        }
        isClosed() {
          return this.state === n7;
        }
        isErrored() {
          return this.state === se;
        }
        isJoined() {
          return this.state === st;
        }
        isJoining() {
          return this.state === sr;
        }
        isLeaving() {
          return this.state === sn;
        }
      }, sp = class {
        static request(e10, t10, r10, n10, s10, i10, a10) {
          if (n9.XDomainRequest) {
            let r11 = new n9.XDomainRequest();
            return this.xdomainRequest(r11, e10, t10, n10, s10, i10, a10);
          }
          if (n9.XMLHttpRequest) {
            let o2 = new n9.XMLHttpRequest();
            return this.xhrRequest(o2, e10, t10, r10, n10, s10, i10, a10);
          }
          if (n9.fetch && n9.AbortController) return this.fetchRequest(e10, t10, r10, n10, s10, i10, a10);
          throw Error("No suitable XMLHttpRequest implementation found");
        }
        static fetchRequest(e10, t10, r10, n10, s10, i10, a10) {
          let o2 = { method: e10, headers: r10, body: n10 }, l2 = null;
          return s10 && (l2 = new AbortController(), setTimeout(() => l2.abort(), s10), o2.signal = l2.signal), n9.fetch(t10, o2).then((e11) => e11.text()).then((e11) => this.parseJSON(e11)).then((e11) => a10 && a10(e11)).catch((e11) => {
            "AbortError" === e11.name && i10 ? i10() : a10 && a10(null);
          }), l2;
        }
        static xdomainRequest(e10, t10, r10, n10, s10, i10, a10) {
          return e10.timeout = s10, e10.open(t10, r10), e10.onload = () => {
            let t11 = this.parseJSON(e10.responseText);
            a10 && a10(t11);
          }, i10 && (e10.ontimeout = i10), e10.onprogress = () => {
          }, e10.send(n10), e10;
        }
        static xhrRequest(e10, t10, r10, n10, s10, i10, a10, o2) {
          for (let [s11, a11] of (e10.open(t10, r10, true), e10.timeout = i10, Object.entries(n10))) e10.setRequestHeader(s11, a11);
          return e10.onerror = () => o2 && o2(null), e10.onreadystatechange = () => {
            4 === e10.readyState && o2 && o2(this.parseJSON(e10.responseText));
          }, a10 && (e10.ontimeout = a10), e10.send(s10), e10;
        }
        static parseJSON(e10) {
          if (!e10 || "" === e10) return null;
          try {
            return JSON.parse(e10);
          } catch {
            return console && console.log("failed to parse JSON response", e10), null;
          }
        }
        static serialize(e10, t10) {
          let r10 = [];
          for (var n10 in e10) {
            if (!Object.prototype.hasOwnProperty.call(e10, n10)) continue;
            let s10 = t10 ? `${t10}[${n10}]` : n10, i10 = e10[n10];
            "object" == typeof i10 ? r10.push(this.serialize(i10, s10)) : r10.push(encodeURIComponent(s10) + "=" + encodeURIComponent(i10));
          }
          return r10.join("&");
        }
        static appendParams(e10, t10) {
          if (0 === Object.keys(t10).length) return e10;
          let r10 = e10.match(/\?/) ? "&" : "?";
          return `${e10}${r10}${this.serialize(t10)}`;
        }
      }, sf = class {
        constructor(e10, t10) {
          t10 && 2 === t10.length && t10[1].startsWith(su) && (this.authToken = atob(t10[1].slice(su.length))), this.endPoint = null, this.token = null, this.skipHeartbeat = true, this.reqs = /* @__PURE__ */ new Set(), this.awaitingBatchAck = false, this.currentBatch = null, this.currentBatchTimer = null, this.batchBuffer = [], this.onopen = function() {
          }, this.onerror = function() {
          }, this.onmessage = function() {
          }, this.onclose = function() {
          }, this.pollEndpoint = this.normalizeEndpoint(e10), this.readyState = 0, setTimeout(() => this.poll(), 0);
        }
        normalizeEndpoint(e10) {
          return e10.replace("ws://", "http://").replace("wss://", "https://").replace(RegExp("(.*)/" + sl), "$1/longpoll");
        }
        endpointURL() {
          return sp.appendParams(this.pollEndpoint, { token: this.token });
        }
        closeAndRetry(e10, t10, r10) {
          this.close(e10, t10, r10), this.readyState = 0;
        }
        ontimeout() {
          this.onerror("timeout"), this.closeAndRetry(1005, "timeout", false);
        }
        isActive() {
          return 1 === this.readyState || 0 === this.readyState;
        }
        poll() {
          let e10 = { Accept: "application/json" };
          this.authToken && (e10["X-Phoenix-AuthToken"] = this.authToken), this.ajax("GET", e10, null, () => this.ontimeout(), (e11) => {
            if (e11) {
              var { status: t10, token: r10, messages: n10 } = e11;
              if (410 === t10 && null !== this.token) {
                this.onerror(410), this.closeAndRetry(3410, "session_gone", false);
                return;
              }
              this.token = r10;
            } else t10 = 0;
            switch (t10) {
              case 200:
                n10.forEach((e12) => {
                  setTimeout(() => this.onmessage({ data: e12 }), 0);
                }), this.poll();
                break;
              case 204:
                this.poll();
                break;
              case 410:
                this.readyState = 1, this.onopen({}), this.poll();
                break;
              case 403:
                this.onerror(403), this.close(1008, "forbidden", false);
                break;
              case 0:
              case 500:
                this.onerror(500), this.closeAndRetry(1011, "internal server error", 500);
                break;
              default:
                throw Error(`unhandled poll status ${t10}`);
            }
          });
        }
        send(e10) {
          "string" != typeof e10 && (e10 = ((e11) => {
            let t10 = "", r10 = new Uint8Array(e11), n10 = r10.byteLength;
            for (let e12 = 0; e12 < n10; e12++) t10 += String.fromCharCode(r10[e12]);
            return btoa(t10);
          })(e10)), this.currentBatch ? this.currentBatch.push(e10) : this.awaitingBatchAck ? this.batchBuffer.push(e10) : (this.currentBatch = [e10], this.currentBatchTimer = setTimeout(() => {
            this.batchSend(this.currentBatch), this.currentBatch = null;
          }, 0));
        }
        batchSend(e10) {
          this.awaitingBatchAck = true, this.ajax("POST", { "Content-Type": "application/x-ndjson" }, e10.join("\n"), () => this.onerror("timeout"), (e11) => {
            this.awaitingBatchAck = false, e11 && 200 === e11.status ? this.batchBuffer.length > 0 && (this.batchSend(this.batchBuffer), this.batchBuffer = []) : (this.onerror(e11 && e11.status), this.closeAndRetry(1011, "internal server error", false));
          });
        }
        close(e10, t10, r10) {
          for (let e11 of this.reqs) e11.abort();
          this.readyState = 3;
          let n10 = Object.assign({ code: 1e3, reason: void 0, wasClean: true }, { code: e10, reason: t10, wasClean: r10 });
          this.batchBuffer = [], clearTimeout(this.currentBatchTimer), this.currentBatchTimer = null, "u" > typeof CloseEvent ? this.onclose(new CloseEvent("close", n10)) : this.onclose(n10);
        }
        ajax(e10, t10, r10, n10, s10) {
          let i10, a10 = () => {
            this.reqs.delete(i10), n10();
          };
          i10 = sp.request(e10, this.endpointURL(), t10, r10, this.timeout, a10, (e11) => {
            this.reqs.delete(i10), this.isActive() && s10(e11);
          }), this.reqs.add(i10);
        }
      }, sg = class e10 {
        constructor(t10, r10 = {}) {
          let n10 = r10.events || { state: "presence_state", diff: "presence_diff" };
          this.state = {}, this.pendingDiffs = [], this.channel = t10, this.joinRef = null, this.caller = { onJoin: function() {
          }, onLeave: function() {
          }, onSync: function() {
          } }, this.channel.on(n10.state, (t11) => {
            let { onJoin: r11, onLeave: n11, onSync: s10 } = this.caller;
            this.joinRef = this.channel.joinRef(), this.state = e10.syncState(this.state, t11, r11, n11), this.pendingDiffs.forEach((t12) => {
              this.state = e10.syncDiff(this.state, t12, r11, n11);
            }), this.pendingDiffs = [], s10();
          }), this.channel.on(n10.diff, (t11) => {
            let { onJoin: r11, onLeave: n11, onSync: s10 } = this.caller;
            this.inPendingSyncState() ? this.pendingDiffs.push(t11) : (this.state = e10.syncDiff(this.state, t11, r11, n11), s10());
          });
        }
        onJoin(e11) {
          this.caller.onJoin = e11;
        }
        onLeave(e11) {
          this.caller.onLeave = e11;
        }
        onSync(e11) {
          this.caller.onSync = e11;
        }
        list(t10) {
          return e10.list(this.state, t10);
        }
        inPendingSyncState() {
          return !this.joinRef || this.joinRef !== this.channel.joinRef();
        }
        static syncState(e11, t10, r10, n10) {
          let s10 = this.clone(e11), i10 = {}, a10 = {};
          return this.map(s10, (e12, r11) => {
            t10[e12] || (a10[e12] = r11);
          }), this.map(t10, (e12, t11) => {
            let r11 = s10[e12];
            if (r11) {
              let n11 = t11.metas.map((e13) => e13.phx_ref), s11 = r11.metas.map((e13) => e13.phx_ref), o2 = t11.metas.filter((e13) => 0 > s11.indexOf(e13.phx_ref)), l2 = r11.metas.filter((e13) => 0 > n11.indexOf(e13.phx_ref));
              o2.length > 0 && (i10[e12] = t11, i10[e12].metas = o2), l2.length > 0 && (a10[e12] = this.clone(r11), a10[e12].metas = l2);
            } else i10[e12] = t11;
          }), this.syncDiff(s10, { joins: i10, leaves: a10 }, r10, n10);
        }
        static syncDiff(e11, t10, r10, n10) {
          let { joins: s10, leaves: i10 } = this.clone(t10);
          return r10 || (r10 = function() {
          }), n10 || (n10 = function() {
          }), this.map(s10, (t11, n11) => {
            let s11 = e11[t11];
            if (e11[t11] = this.clone(n11), s11) {
              let r11 = e11[t11].metas.map((e12) => e12.phx_ref), n12 = s11.metas.filter((e12) => 0 > r11.indexOf(e12.phx_ref));
              e11[t11].metas.unshift(...n12);
            }
            r10(t11, s11, n11);
          }), this.map(i10, (t11, r11) => {
            let s11 = e11[t11];
            if (!s11) return;
            let i11 = r11.metas.map((e12) => e12.phx_ref);
            s11.metas = s11.metas.filter((e12) => 0 > i11.indexOf(e12.phx_ref)), n10(t11, s11, r11), 0 === s11.metas.length && delete e11[t11];
          }), e11;
        }
        static list(e11, t10) {
          return t10 || (t10 = function(e12, t11) {
            return t11;
          }), this.map(e11, (e12, r10) => t10(e12, r10));
        }
        static map(e11, t10) {
          return Object.getOwnPropertyNames(e11).map((r10) => t10(r10, e11[r10]));
        }
        static clone(e11) {
          return JSON.parse(JSON.stringify(e11));
        }
      }, sm = { HEADER_LENGTH: 1, META_LENGTH: 4, KINDS: { push: 0, reply: 1, broadcast: 2 }, encode(e10, t10) {
        return e10.payload.constructor === ArrayBuffer ? t10(this.binaryEncode(e10)) : t10(JSON.stringify([e10.join_ref, e10.ref, e10.topic, e10.event, e10.payload]));
      }, decode(e10, t10) {
        if (e10.constructor === ArrayBuffer) return t10(this.binaryDecode(e10));
        {
          let [r10, n10, s10, i10, a10] = JSON.parse(e10);
          return t10({ join_ref: r10, ref: n10, topic: s10, event: i10, payload: a10 });
        }
      }, binaryEncode(e10) {
        let { join_ref: t10, ref: r10, event: n10, topic: s10, payload: i10 } = e10, a10 = this.META_LENGTH + t10.length + r10.length + s10.length + n10.length, o2 = new ArrayBuffer(this.HEADER_LENGTH + a10), l2 = new DataView(o2), u2 = 0;
        l2.setUint8(u2++, this.KINDS.push), l2.setUint8(u2++, t10.length), l2.setUint8(u2++, r10.length), l2.setUint8(u2++, s10.length), l2.setUint8(u2++, n10.length), Array.from(t10, (e11) => l2.setUint8(u2++, e11.charCodeAt(0))), Array.from(r10, (e11) => l2.setUint8(u2++, e11.charCodeAt(0))), Array.from(s10, (e11) => l2.setUint8(u2++, e11.charCodeAt(0))), Array.from(n10, (e11) => l2.setUint8(u2++, e11.charCodeAt(0)));
        var c2 = new Uint8Array(o2.byteLength + i10.byteLength);
        return c2.set(new Uint8Array(o2), 0), c2.set(new Uint8Array(i10), o2.byteLength), c2.buffer;
      }, binaryDecode(e10) {
        let t10 = new DataView(e10), r10 = t10.getUint8(0), n10 = new TextDecoder();
        switch (r10) {
          case this.KINDS.push:
            return this.decodePush(e10, t10, n10);
          case this.KINDS.reply:
            return this.decodeReply(e10, t10, n10);
          case this.KINDS.broadcast:
            return this.decodeBroadcast(e10, t10, n10);
        }
      }, decodePush(e10, t10, r10) {
        let n10 = t10.getUint8(1), s10 = t10.getUint8(2), i10 = t10.getUint8(3), a10 = this.HEADER_LENGTH + this.META_LENGTH - 1, o2 = r10.decode(e10.slice(a10, a10 + n10));
        a10 += n10;
        let l2 = r10.decode(e10.slice(a10, a10 + s10));
        a10 += s10;
        let u2 = r10.decode(e10.slice(a10, a10 + i10));
        return a10 += i10, { join_ref: o2, ref: null, topic: l2, event: u2, payload: e10.slice(a10, e10.byteLength) };
      }, decodeReply(e10, t10, r10) {
        let n10 = t10.getUint8(1), s10 = t10.getUint8(2), i10 = t10.getUint8(3), a10 = t10.getUint8(4), o2 = this.HEADER_LENGTH + this.META_LENGTH, l2 = r10.decode(e10.slice(o2, o2 + n10));
        o2 += n10;
        let u2 = r10.decode(e10.slice(o2, o2 + s10));
        o2 += s10;
        let c2 = r10.decode(e10.slice(o2, o2 + i10));
        o2 += i10;
        let h2 = r10.decode(e10.slice(o2, o2 + a10));
        return o2 += a10, { join_ref: l2, ref: u2, topic: c2, event: sa, payload: { status: h2, response: e10.slice(o2, e10.byteLength) } };
      }, decodeBroadcast(e10, t10, r10) {
        let n10 = t10.getUint8(1), s10 = t10.getUint8(2), i10 = this.HEADER_LENGTH + 2, a10 = r10.decode(e10.slice(i10, i10 + n10));
        i10 += n10;
        let o2 = r10.decode(e10.slice(i10, i10 + s10));
        return i10 += s10, { join_ref: null, ref: null, topic: a10, event: o2, payload: e10.slice(i10, e10.byteLength) };
      } }, sy = class {
        constructor(e10, t10 = {}) {
          this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] }, this.channels = [], this.sendBuffer = [], this.ref = 0, this.fallbackRef = null, this.timeout = t10.timeout || 1e4, this.transport = t10.transport || n9.WebSocket || sf, this.conn = void 0, this.primaryPassedHealthCheck = false, this.longPollFallbackMs = t10.longPollFallbackMs, this.fallbackTimer = null;
          let r10 = null;
          try {
            r10 = n9 && n9.sessionStorage;
          } catch {
          }
          this.sessionStore = t10.sessionStorage || r10, this.establishedConnections = 0, this.defaultEncoder = sm.encode.bind(sm), this.defaultDecoder = sm.decode.bind(sm), this.closeWasClean = true, this.disconnecting = false, this.binaryType = t10.binaryType || "arraybuffer", this.connectClock = 1, this.pageHidden = false, this.encode = void 0, this.decode = void 0, this.transport !== sf ? (this.encode = t10.encode || this.defaultEncoder, this.decode = t10.decode || this.defaultDecoder) : (this.encode = this.defaultEncoder, this.decode = this.defaultDecoder), this.heartbeatIntervalMs = t10.heartbeatIntervalMs || 3e4, this.autoSendHeartbeat = t10.autoSendHeartbeat ?? true, this.heartbeatCallback = t10.heartbeatCallback ?? (() => {
          }), this.rejoinAfterMs = (e11) => t10.rejoinAfterMs ? t10.rejoinAfterMs(e11) : [1e3, 2e3, 5e3][e11 - 1] || 1e4, this.reconnectAfterMs = (e11) => t10.reconnectAfterMs ? t10.reconnectAfterMs(e11) : [10, 50, 100, 150, 200, 250, 500, 1e3, 2e3][e11 - 1] || 5e3, this.logger = t10.logger || null, !this.logger && t10.debug && (this.logger = (e11, t11, r11) => {
            console.log(`${e11}: ${t11}`, r11);
          }), this.longpollerTimeout = t10.longpollerTimeout || 2e4, this.params = n8(t10.params || {}), this.endPoint = `${e10}/${sl}`, this.vsn = t10.vsn || "2.0.0", this.heartbeatTimeoutTimer = null, this.heartbeatTimer = null, this.heartbeatSentAt = null, this.pendingHeartbeatRef = null, this.reconnectTimer = new sh(() => {
            if (this.pageHidden) {
              this.log("Not reconnecting as page is hidden!"), this.teardown();
              return;
            }
            this.teardown(async () => {
              t10.beforeReconnect && await t10.beforeReconnect(), this.connect();
            });
          }, this.reconnectAfterMs), this.authToken = t10.authToken;
        }
        getLongPollTransport() {
          return sf;
        }
        replaceTransport(e10) {
          this.connectClock++, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.conn && (this.conn.close(), this.conn = null), this.transport = e10;
        }
        protocol() {
          return location.protocol.match(/^https/) ? "wss" : "ws";
        }
        endPointURL() {
          let e10 = sp.appendParams(sp.appendParams(this.endPoint, this.params()), { vsn: this.vsn });
          return "/" !== e10.charAt(0) ? e10 : "/" === e10.charAt(1) ? `${this.protocol()}:${e10}` : `${this.protocol()}://${location.host}${e10}`;
        }
        disconnect(e10, t10, r10) {
          this.connectClock++, this.disconnecting = true, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.teardown(() => {
            this.disconnecting = false, e10 && e10();
          }, t10, r10);
        }
        connect(e10) {
          e10 && (console && console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor"), this.params = n8(e10)), (!this.conn || this.disconnecting) && (this.longPollFallbackMs && this.transport !== sf ? this.connectWithFallback(sf, this.longPollFallbackMs) : this.transportConnect());
        }
        log(e10, t10, r10) {
          this.logger && this.logger(e10, t10, r10);
        }
        hasLogger() {
          return null !== this.logger;
        }
        onOpen(e10) {
          let t10 = this.makeRef();
          return this.stateChangeCallbacks.open.push([t10, e10]), t10;
        }
        onClose(e10) {
          let t10 = this.makeRef();
          return this.stateChangeCallbacks.close.push([t10, e10]), t10;
        }
        onError(e10) {
          let t10 = this.makeRef();
          return this.stateChangeCallbacks.error.push([t10, e10]), t10;
        }
        onMessage(e10) {
          let t10 = this.makeRef();
          return this.stateChangeCallbacks.message.push([t10, e10]), t10;
        }
        onHeartbeat(e10) {
          this.heartbeatCallback = e10;
        }
        ping(e10) {
          if (!this.isConnected()) return false;
          let t10 = this.makeRef(), r10 = Date.now();
          this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: t10 });
          let n10 = this.onMessage((s10) => {
            s10.ref === t10 && (this.off([n10]), e10(Date.now() - r10));
          });
          return true;
        }
        transportName(e10) {
          return e10 === sf ? "LongPoll" : e10.name;
        }
        transportConnect() {
          let e10;
          this.connectClock++, this.closeWasClean = false, this.authToken && (e10 = ["phoenix", `${su}${btoa(this.authToken).replace(/=/g, "")}`]), this.conn = new this.transport(this.endPointURL(), e10), this.conn.binaryType = this.binaryType, this.conn.timeout = this.longpollerTimeout, this.conn.onopen = () => this.onConnOpen(), this.conn.onerror = (e11) => this.onConnError(e11), this.conn.onmessage = (e11) => this.onConnMessage(e11), this.conn.onclose = (e11) => this.onConnClose(e11);
        }
        getSession(e10) {
          return this.sessionStore && this.sessionStore.getItem(e10);
        }
        storeSession(e10, t10) {
          this.sessionStore && this.sessionStore.setItem(e10, t10);
        }
        connectWithFallback(e10, t10 = 2500) {
          let r10, n10;
          clearTimeout(this.fallbackTimer);
          let s10 = false, i10 = true, a10 = this.transportName(e10), o2 = (t11) => {
            this.log("transport", `falling back to ${a10}...`, t11), this.off([r10, n10]), i10 = false, this.replaceTransport(e10), this.transportConnect();
          };
          if (this.getSession(`phx:fallback:${a10}`)) return o2("memorized");
          this.fallbackTimer = setTimeout(o2, t10), n10 = this.onError((e11) => {
            this.log("transport", "error", e11), i10 && !s10 && (clearTimeout(this.fallbackTimer), o2(e11));
          }), this.fallbackRef && this.off([this.fallbackRef]), this.fallbackRef = this.onOpen(() => {
            if (s10 = true, !i10) {
              let t11 = this.transportName(e10);
              return this.primaryPassedHealthCheck || this.storeSession(`phx:fallback:${t11}`, "true"), this.log("transport", `established ${t11} fallback`);
            }
            clearTimeout(this.fallbackTimer), this.fallbackTimer = setTimeout(o2, t10), this.ping((e11) => {
              this.log("transport", "connected to primary after", e11), this.primaryPassedHealthCheck = true, clearTimeout(this.fallbackTimer);
            });
          }), this.transportConnect();
        }
        clearHeartbeats() {
          clearTimeout(this.heartbeatTimer), clearTimeout(this.heartbeatTimeoutTimer);
        }
        onConnOpen() {
          this.hasLogger() && this.log("transport", `connected to ${this.endPointURL()}`), this.closeWasClean = false, this.disconnecting = false, this.establishedConnections++, this.flushSendBuffer(), this.reconnectTimer.reset(), this.autoSendHeartbeat && this.resetHeartbeat(), this.triggerStateCallbacks("open");
        }
        heartbeatTimeout() {
          if (this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.hasLogger() && this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
            try {
              this.heartbeatCallback("timeout");
            } catch (e10) {
              this.log("error", "error in heartbeat callback", e10);
            }
            this.triggerChanError(Error("heartbeat timeout")), this.closeWasClean = false, this.teardown(() => this.reconnectTimer.scheduleTimeout(), 1e3, "heartbeat timeout");
          }
        }
        resetHeartbeat() {
          this.conn && this.conn.skipHeartbeat || (this.pendingHeartbeatRef = null, this.clearHeartbeats(), this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
        }
        teardown(e10, t10, r10) {
          if (!this.conn) return e10 && e10();
          let n10 = this.conn;
          this.waitForBufferDone(n10, () => {
            t10 ? n10.close(t10, r10 || "") : n10.close(), this.waitForSocketClosed(n10, () => {
              this.conn === n10 && (this.conn.onopen = function() {
              }, this.conn.onerror = function() {
              }, this.conn.onmessage = function() {
              }, this.conn.onclose = function() {
              }, this.conn = null), e10 && e10();
            });
          });
        }
        waitForBufferDone(e10, t10, r10 = 1) {
          5 !== r10 && e10.bufferedAmount ? setTimeout(() => {
            this.waitForBufferDone(e10, t10, r10 + 1);
          }, 150 * r10) : t10();
        }
        waitForSocketClosed(e10, t10, r10 = 1) {
          5 === r10 || 3 === e10.readyState ? t10() : setTimeout(() => {
            this.waitForSocketClosed(e10, t10, r10 + 1);
          }, 150 * r10);
        }
        onConnClose(e10) {
          this.conn && (this.conn.onclose = () => {
          }), this.hasLogger() && this.log("transport", "close", e10), this.triggerChanError(e10), this.clearHeartbeats(), this.closeWasClean || this.reconnectTimer.scheduleTimeout(), this.triggerStateCallbacks("close", e10);
        }
        onConnError(e10) {
          this.hasLogger() && this.log("transport", "error", e10);
          let t10 = this.transport, r10 = this.establishedConnections;
          this.triggerStateCallbacks("error", e10, t10, r10), (t10 === this.transport || r10 > 0) && this.triggerChanError(e10);
        }
        triggerChanError(e10) {
          this.channels.forEach((t10) => {
            t10.isErrored() || t10.isLeaving() || t10.isClosed() || t10.trigger(si, e10);
          });
        }
        connectionState() {
          switch (this.conn && this.conn.readyState) {
            case 0:
              return "connecting";
            case 1:
              return "open";
            case 2:
              return "closing";
            default:
              return "closed";
          }
        }
        isConnected() {
          return "open" === this.connectionState();
        }
        remove(e10) {
          this.off(e10.stateChangeRefs), this.channels = this.channels.filter((t10) => t10 !== e10);
        }
        off(e10) {
          for (let t10 in this.stateChangeCallbacks) this.stateChangeCallbacks[t10] = this.stateChangeCallbacks[t10].filter(([t11]) => -1 === e10.indexOf(t11));
        }
        channel(e10, t10 = {}) {
          let r10 = new sd(e10, t10, this);
          return this.channels.push(r10), r10;
        }
        push(e10) {
          if (this.hasLogger()) {
            let { topic: t10, event: r10, payload: n10, ref: s10, join_ref: i10 } = e10;
            this.log("push", `${t10} ${r10} (${i10}, ${s10})`, n10);
          }
          this.isConnected() ? this.encode(e10, (e11) => this.conn.send(e11)) : this.sendBuffer.push(() => this.encode(e10, (e11) => this.conn.send(e11)));
        }
        makeRef() {
          let e10 = this.ref + 1;
          return e10 === this.ref ? this.ref = 0 : this.ref = e10, this.ref.toString();
        }
        sendHeartbeat() {
          if (!this.isConnected()) {
            try {
              this.heartbeatCallback("disconnected");
            } catch (e10) {
              this.log("error", "error in heartbeat callback", e10);
            }
            return;
          }
          if (this.pendingHeartbeatRef) return void this.heartbeatTimeout();
          this.pendingHeartbeatRef = this.makeRef(), this.heartbeatSentAt = Date.now(), this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.pendingHeartbeatRef });
          try {
            this.heartbeatCallback("sent");
          } catch (e10) {
            this.log("error", "error in heartbeat callback", e10);
          }
          this.heartbeatTimeoutTimer = setTimeout(() => this.heartbeatTimeout(), this.heartbeatIntervalMs);
        }
        flushSendBuffer() {
          this.isConnected() && this.sendBuffer.length > 0 && (this.sendBuffer.forEach((e10) => e10()), this.sendBuffer = []);
        }
        onConnMessage(e10) {
          this.decode(e10.data, (e11) => {
            let { topic: t10, event: r10, payload: n10, ref: s10, join_ref: i10 } = e11;
            if (s10 && s10 === this.pendingHeartbeatRef) {
              let e12 = this.heartbeatSentAt ? Date.now() - this.heartbeatSentAt : void 0;
              this.clearHeartbeats();
              try {
                this.heartbeatCallback("ok" === n10.status ? "ok" : "error", e12);
              } catch (e13) {
                this.log("error", "error in heartbeat callback", e13);
              }
              this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.autoSendHeartbeat && (this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
            }
            this.hasLogger() && this.log("receive", `${n10.status || ""} ${t10} ${r10} ${s10 && "(" + s10 + ")" || ""}`.trim(), n10);
            for (let e12 = 0; e12 < this.channels.length; e12++) {
              let a10 = this.channels[e12];
              a10.isMember(t10, r10, n10, i10) && a10.trigger(r10, n10, s10, i10);
            }
            this.triggerStateCallbacks("message", e11);
          });
        }
        triggerStateCallbacks(e10, ...t10) {
          try {
            this.stateChangeCallbacks[e10].forEach(([r10, n10]) => {
              try {
                n10(...t10);
              } catch (t11) {
                this.log("error", `error in ${e10} callback`, t11);
              }
            });
          } catch (t11) {
            this.log("error", `error triggering ${e10} callbacks`, t11);
          }
        }
        leaveOpenTopic(e10) {
          let t10 = this.channels.find((t11) => t11.topic === e10 && (t11.isJoined() || t11.isJoining()));
          t10 && (this.hasLogger() && this.log("transport", `leaving duplicate topic "${e10}"`), t10.leave());
        }
      };
      class s_ {
        constructor(e10, t10) {
          const r10 = function(e11) {
            return (null == e11 ? void 0 : e11.events) && { events: e11.events };
          }(t10);
          this.presence = new sg(e10.getChannel(), r10), this.presence.onJoin((t11, r11, n10) => {
            let s10 = s_.onJoinPayload(t11, r11, n10);
            e10.getChannel().trigger("presence", s10);
          }), this.presence.onLeave((t11, r11, n10) => {
            let s10 = s_.onLeavePayload(t11, r11, n10);
            e10.getChannel().trigger("presence", s10);
          }), this.presence.onSync(() => {
            e10.getChannel().trigger("presence", { event: "sync" });
          });
        }
        get state() {
          return s_.transformState(this.presence.state);
        }
        static transformState(e10) {
          return Object.getOwnPropertyNames(e10 = JSON.parse(JSON.stringify(e10))).reduce((t10, r10) => {
            let n10 = e10[r10];
            return t10[r10] = sw(n10), t10;
          }, {});
        }
        static onJoinPayload(e10, t10, r10) {
          return { event: "join", key: e10, currentPresences: sb(t10), newPresences: sw(r10) };
        }
        static onLeavePayload(e10, t10, r10) {
          return { event: "leave", key: e10, currentPresences: sb(t10), leftPresences: sw(r10) };
        }
      }
      function sw(e10) {
        return e10.metas.map((e11) => (e11.presence_ref = e11.phx_ref, delete e11.phx_ref, delete e11.phx_ref_prev, e11));
      }
      function sb(e10) {
        return (null == e10 ? void 0 : e10.metas) ? sw(e10) : [];
      }
      (eg = eS || (eS = {})).SYNC = "sync", eg.JOIN = "join", eg.LEAVE = "leave";
      class sv {
        get state() {
          return this.presenceAdapter.state;
        }
        constructor(e10, t10) {
          this.channel = e10, this.presenceAdapter = new s_(this.channel.channelAdapter, t10);
        }
      }
      class sk {
        constructor(e10, t10, r10) {
          const n10 = function(e11) {
            return { config: Object.assign({ broadcast: { ack: false, self: false }, presence: { key: "", enabled: false }, private: false }, e11.config) };
          }(r10);
          this.channel = e10.getSocket().channel(t10, n10), this.socket = e10;
        }
        get state() {
          return this.channel.state;
        }
        set state(e10) {
          this.channel.state = e10;
        }
        get joinedOnce() {
          return this.channel.joinedOnce;
        }
        get joinPush() {
          return this.channel.joinPush;
        }
        get rejoinTimer() {
          return this.channel.rejoinTimer;
        }
        on(e10, t10) {
          return this.channel.on(e10, t10);
        }
        off(e10, t10) {
          this.channel.off(e10, t10);
        }
        subscribe(e10) {
          return this.channel.join(e10);
        }
        unsubscribe(e10) {
          return this.channel.leave(e10);
        }
        teardown() {
          this.channel.teardown();
        }
        onClose(e10) {
          this.channel.onClose(e10);
        }
        onError(e10) {
          return this.channel.onError(e10);
        }
        push(e10, t10, r10) {
          let n10;
          try {
            n10 = this.channel.push(e10, t10, r10);
          } catch (t11) {
            throw Error(`tried to push '${e10}' to '${this.channel.topic}' before joining. Use channel.subscribe() before pushing events`);
          }
          if (this.channel.pushBuffer.length > 100) {
            let e11 = this.channel.pushBuffer.shift();
            e11.cancelTimeout(), this.socket.log("channel", `discarded push due to buffer overflow: ${e11.event}`, e11.payload());
          }
          return n10;
        }
        updateJoinPayload(e10) {
          let t10 = this.channel.joinPush.payload();
          this.channel.joinPush.payload = () => Object.assign(Object.assign({}, t10), e10);
        }
        canPush() {
          return this.socket.isConnected() && this.state === nV;
        }
        isJoined() {
          return this.state === nV;
        }
        isJoining() {
          return "joining" === this.state;
        }
        isClosed() {
          return "closed" === this.state;
        }
        isLeaving() {
          return "leaving" === this.state;
        }
        updateFilterBindings(e10) {
          this.channel.filterBindings = e10;
        }
        updatePayloadTransform(e10) {
          this.channel.onMessage = e10;
        }
        getChannel() {
          return this.channel;
        }
      }
      (em = eT || (eT = {})).ALL = "*", em.INSERT = "INSERT", em.UPDATE = "UPDATE", em.DELETE = "DELETE", (ey = eR || (eR = {})).BROADCAST = "broadcast", ey.PRESENCE = "presence", ey.POSTGRES_CHANGES = "postgres_changes", ey.SYSTEM = "system", (e_ = eC || (eC = {})).SUBSCRIBED = "SUBSCRIBED", e_.TIMED_OUT = "TIMED_OUT", e_.CLOSED = "CLOSED", e_.CHANNEL_ERROR = "CHANNEL_ERROR";
      class sE {
        get state() {
          return this.channelAdapter.state;
        }
        set state(e10) {
          this.channelAdapter.state = e10;
        }
        get joinedOnce() {
          return this.channelAdapter.joinedOnce;
        }
        get timeout() {
          return this.socket.timeout;
        }
        get joinPush() {
          return this.channelAdapter.joinPush;
        }
        get rejoinTimer() {
          return this.channelAdapter.rejoinTimer;
        }
        constructor(e10, t10 = { config: {} }, r10) {
          var n10, s10;
          if (this.topic = e10, this.params = t10, this.socket = r10, this.bindings = {}, this.subTopic = e10.replace(/^realtime:/i, ""), this.params.config = Object.assign({ broadcast: { ack: false, self: false }, presence: { key: "", enabled: false }, private: false }, t10.config), this.channelAdapter = new sk(this.socket.socketAdapter, e10, this.params), this.presence = new sv(this), this._onClose(() => {
            this.socket._remove(this);
          }), this._updateFilterTransform(), this.broadcastEndpointURL = n6(this.socket.socketAdapter.endPointURL()), this.private = this.params.config.private || false, !this.private && (null == (s10 = null == (n10 = this.params.config) ? void 0 : n10.broadcast) ? void 0 : s10.replay)) throw Error(`tried to use replay on public channel '${this.topic}'. It must be a private channel.`);
        }
        subscribe(e10, t10 = this.timeout) {
          var r10, n10, s10;
          if (this.socket.isConnected() || this.socket.connect(), this.channelAdapter.isClosed()) {
            let { config: { broadcast: i10, presence: a10, private: o2 } } = this.params, l2 = null != (n10 = null == (r10 = this.bindings.postgres_changes) ? void 0 : r10.map((e11) => e11.filter)) ? n10 : [], u2 = !!this.bindings[eR.PRESENCE] && this.bindings[eR.PRESENCE].length > 0 || (null == (s10 = this.params.config.presence) ? void 0 : s10.enabled) === true, c2 = {}, h2 = { broadcast: i10, presence: Object.assign(Object.assign({}, a10), { enabled: u2 }), postgres_changes: l2, private: o2 };
            this.socket.accessTokenValue && (c2.access_token = this.socket.accessTokenValue), this._onError((t11) => {
              null == e10 || e10(eC.CHANNEL_ERROR, function(e11) {
                if (e11 instanceof Error) return e11;
                if ("string" == typeof e11) return Error(e11);
                if (e11 && "object" == typeof e11) {
                  if ("number" == typeof e11.code) {
                    let t12 = "string" == typeof e11.reason && e11.reason ? ` (${e11.reason})` : "";
                    return Error(`socket closed: ${e11.code}${t12}`, { cause: e11 });
                  }
                  return Error("channel error: transport failure", { cause: e11 });
                }
                return Error("channel error: connection lost");
              }(t11));
            }), this._onClose(() => null == e10 ? void 0 : e10(eC.CLOSED)), this.updateJoinPayload(Object.assign({ config: h2 }, c2)), this._updateFilterMessage(), this.channelAdapter.subscribe(t10).receive("ok", async ({ postgres_changes: t11 }) => {
              if (this.socket._isManualToken() || this.socket.setAuth(), void 0 === t11) {
                null == e10 || e10(eC.SUBSCRIBED);
                return;
              }
              this._updatePostgresBindings(t11, e10);
            }).receive("error", (t11) => {
              this.state = nK;
              let r11 = Object.values(t11).join(", ") || "error";
              null == e10 || e10(eC.CHANNEL_ERROR, Error(r11, { cause: t11 }));
            }).receive("timeout", () => {
              null == e10 || e10(eC.TIMED_OUT);
            });
          }
          return this;
        }
        _updatePostgresBindings(e10, t10) {
          var r10;
          let n10 = this.bindings.postgres_changes, s10 = null != (r10 = null == n10 ? void 0 : n10.length) ? r10 : 0, i10 = [];
          for (let r11 = 0; r11 < s10; r11++) {
            let s11 = n10[r11], { filter: { event: a10, schema: o2, table: l2, filter: u2 } } = s11, c2 = e10 && e10[r11];
            if (c2 && c2.event === a10 && sE.isFilterValueEqual(c2.schema, o2) && sE.isFilterValueEqual(c2.table, l2) && sE.isFilterValueEqual(c2.filter, u2)) i10.push(Object.assign(Object.assign({}, s11), { id: c2.id }));
            else {
              this.unsubscribe(), this.state = nK, null == t10 || t10(eC.CHANNEL_ERROR, Error("mismatch between server and client bindings for postgres changes"));
              return;
            }
          }
          this.bindings.postgres_changes = i10, this.state != nK && t10 && t10(eC.SUBSCRIBED);
        }
        presenceState() {
          return this.presence.state;
        }
        async track(e10, t10 = {}) {
          return await this.send({ type: "presence", event: "track", payload: e10 }, t10.timeout || this.timeout);
        }
        async untrack(e10 = {}) {
          return await this.send({ type: "presence", event: "untrack" }, e10);
        }
        on(e10, t10, r10) {
          let n10 = this.channelAdapter.isJoined() || this.channelAdapter.isJoining(), s10 = e10 === eR.PRESENCE || e10 === eR.POSTGRES_CHANGES;
          if (n10 && s10) throw this.socket.log("channel", `cannot add \`${e10}\` callbacks for ${this.topic} after \`subscribe()\`.`), Error(`cannot add \`${e10}\` callbacks for ${this.topic} after \`subscribe()\`.`);
          return this._on(e10, t10, r10);
        }
        async httpSend(e10, t10, r10 = {}) {
          var n10;
          if (null == t10) return Promise.reject(Error("Payload is required for httpSend()"));
          let s10 = t10 instanceof ArrayBuffer || ArrayBuffer.isView(t10), i10 = { apikey: this.socket.apiKey ? this.socket.apiKey : "", "Content-Type": s10 ? "application/octet-stream" : "application/json" };
          this.socket.accessTokenValue && (i10.Authorization = `Bearer ${this.socket.accessTokenValue}`);
          let a10 = new URL(this.broadcastEndpointURL);
          a10.pathname += `/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(e10)}`, this.private && a10.searchParams.set("private", "true");
          let o2 = { method: "POST", headers: i10, body: s10 ? t10 : JSON.stringify(t10) }, l2 = await this._fetchWithTimeout(a10.toString(), o2, null != (n10 = r10.timeout) ? n10 : this.timeout);
          if (202 === l2.status) return { success: true };
          if (404 === l2.status) return Promise.reject(Error("httpSend() requires Realtime server v2.97.0 or newer; the endpoint returned 404. Update your Supabase CLI to a recent version, or upgrade the Realtime server in your self-hosted setup. See https://github.com/supabase/supabase-js/blob/master/packages/core/realtime-js/migrations/httpsend-server-version.md"));
          let u2 = l2.statusText;
          try {
            let e11 = await l2.json();
            u2 = e11.error || e11.message || u2;
          } catch (e11) {
          }
          return Promise.reject(Error(u2));
        }
        async send(e10, t10 = {}) {
          var r10, n10;
          if (this.channelAdapter.canPush() || "broadcast" !== e10.type) return new Promise((r11) => {
            var n11, s10, i10;
            let a10 = this.channelAdapter.push(e10.type, e10, t10.timeout || this.timeout);
            "broadcast" !== e10.type || (null == (i10 = null == (s10 = null == (n11 = this.params) ? void 0 : n11.config) ? void 0 : s10.broadcast) ? void 0 : i10.ack) || r11("ok"), a10.receive("ok", () => r11("ok")), a10.receive("error", () => r11("error")), a10.receive("timeout", () => r11("timed out"));
          });
          {
            console.warn("Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.");
            let { event: s10, payload: i10 } = e10, a10 = { apikey: this.socket.apiKey ? this.socket.apiKey : "", "Content-Type": "application/json" };
            this.socket.accessTokenValue && (a10.Authorization = `Bearer ${this.socket.accessTokenValue}`);
            let o2 = { method: "POST", headers: a10, body: JSON.stringify({ messages: [{ topic: this.subTopic, event: s10, payload: i10, private: this.private }] }) };
            try {
              let e11 = await this._fetchWithTimeout(this.broadcastEndpointURL, o2, null != (r10 = t10.timeout) ? r10 : this.timeout);
              return await (null == (n10 = e11.body) ? void 0 : n10.cancel()), e11.ok ? "ok" : "error";
            } catch (e11) {
              if (e11 instanceof Error && "AbortError" === e11.name) return "timed out";
              return "error";
            }
          }
        }
        updateJoinPayload(e10) {
          this.channelAdapter.updateJoinPayload(e10);
        }
        async unsubscribe(e10 = this.timeout) {
          return new Promise((t10) => {
            this.channelAdapter.unsubscribe(e10).receive("ok", () => t10("ok")).receive("timeout", () => t10("timed out")).receive("error", () => t10("error"));
          });
        }
        teardown() {
          this.channelAdapter.teardown();
        }
        async _fetchWithTimeout(e10, t10, r10) {
          let n10 = new AbortController(), s10 = setTimeout(() => n10.abort(), r10), i10 = await this.socket.fetch(e10, Object.assign(Object.assign({}, t10), { signal: n10.signal }));
          return clearTimeout(s10), i10;
        }
        _on(e10, t10, r10) {
          let n10 = e10.toLocaleLowerCase(), s10 = this.channelAdapter.on(e10, r10), i10 = { type: n10, filter: t10, callback: r10, ref: s10 };
          return this.bindings[n10] ? this.bindings[n10].push(i10) : this.bindings[n10] = [i10], this._updateFilterMessage(), this;
        }
        _onClose(e10) {
          this.channelAdapter.onClose(e10);
        }
        _onError(e10) {
          this.channelAdapter.onError(e10);
        }
        _updateFilterMessage() {
          this.channelAdapter.updateFilterBindings((e10, t10, r10) => {
            var n10, s10, i10, a10, o2, l2, u2;
            let c2 = e10.event.toLocaleLowerCase();
            if (this._notThisChannelEvent(c2, r10)) return false;
            let h2 = null == (n10 = this.bindings[c2]) ? void 0 : n10.find((t11) => t11.ref === e10.ref);
            if (!h2) return true;
            if (!["broadcast", "presence", "postgres_changes"].includes(c2)) return h2.type.toLocaleLowerCase() === c2;
            if ("id" in h2) {
              let e11 = h2.id, r11 = null == (s10 = h2.filter) ? void 0 : s10.event;
              return e11 && (null == (i10 = t10.ids) ? void 0 : i10.includes(e11)) && ("*" === r11 || (null == r11 ? void 0 : r11.toLocaleLowerCase()) === (null == (a10 = t10.data) ? void 0 : a10.type.toLocaleLowerCase()));
            }
            {
              let e11 = null == (l2 = null == (o2 = null == h2 ? void 0 : h2.filter) ? void 0 : o2.event) ? void 0 : l2.toLocaleLowerCase();
              return "*" === e11 || e11 === (null == (u2 = null == t10 ? void 0 : t10.event) ? void 0 : u2.toLocaleLowerCase());
            }
          });
        }
        _notThisChannelEvent(e10, t10) {
          let { close: r10, error: n10, leave: s10, join: i10 } = nJ;
          return t10 && [r10, n10, s10, i10].includes(e10) && t10 !== this.joinPush.ref;
        }
        _updateFilterTransform() {
          this.channelAdapter.updatePayloadTransform((e10, t10, r10) => {
            if ("object" == typeof t10 && "ids" in t10) {
              let e11 = t10.data, { schema: r11, table: n10, commit_timestamp: s10, type: i10, errors: a10 } = e11;
              return Object.assign(Object.assign({}, { schema: r11, table: n10, commit_timestamp: s10, eventType: i10, new: {}, old: {}, errors: a10 }), this._getPayloadRecords(e11));
            }
            return t10;
          });
        }
        copyBindings(e10) {
          if (this.joinedOnce) throw Error("cannot copy bindings into joined channel");
          for (let t10 in e10.bindings) for (let r10 of e10.bindings[t10]) this._on(r10.type, r10.filter, r10.callback);
        }
        static isFilterValueEqual(e10, t10) {
          return (null != e10 ? e10 : void 0) === (null != t10 ? t10 : void 0);
        }
        _getPayloadRecords(e10) {
          let t10 = { new: {}, old: {} };
          return ("INSERT" === e10.type || "UPDATE" === e10.type) && (t10.new = nY(e10.columns, e10.record)), ("UPDATE" === e10.type || "DELETE" === e10.type) && (t10.old = nY(e10.columns, e10.old_record)), t10;
        }
      }
      class sS {
        constructor(e10, t10) {
          this.socket = new sy(e10, t10);
        }
        get timeout() {
          return this.socket.timeout;
        }
        get endPoint() {
          return this.socket.endPoint;
        }
        get transport() {
          return this.socket.transport;
        }
        get heartbeatIntervalMs() {
          return this.socket.heartbeatIntervalMs;
        }
        get heartbeatCallback() {
          return this.socket.heartbeatCallback;
        }
        set heartbeatCallback(e10) {
          this.socket.heartbeatCallback = e10;
        }
        get heartbeatTimer() {
          return this.socket.heartbeatTimer;
        }
        get pendingHeartbeatRef() {
          return this.socket.pendingHeartbeatRef;
        }
        get reconnectTimer() {
          return this.socket.reconnectTimer;
        }
        get vsn() {
          return this.socket.vsn;
        }
        get encode() {
          return this.socket.encode;
        }
        get decode() {
          return this.socket.decode;
        }
        get reconnectAfterMs() {
          return this.socket.reconnectAfterMs;
        }
        get sendBuffer() {
          return this.socket.sendBuffer;
        }
        get stateChangeCallbacks() {
          return this.socket.stateChangeCallbacks;
        }
        connect() {
          this.socket.connect();
        }
        disconnect(e10, t10, r10, n10 = 1e4) {
          return new Promise((s10) => {
            setTimeout(() => s10("timeout"), n10), this.socket.disconnect(() => {
              e10(), s10("ok");
            }, t10, r10);
          });
        }
        push(e10) {
          this.socket.push(e10);
        }
        log(e10, t10, r10) {
          this.socket.log(e10, t10, r10);
        }
        makeRef() {
          return this.socket.makeRef();
        }
        onOpen(e10) {
          this.socket.onOpen(e10);
        }
        onClose(e10) {
          this.socket.onClose(e10);
        }
        onError(e10) {
          this.socket.onError(e10);
        }
        onMessage(e10) {
          this.socket.onMessage(e10);
        }
        isConnected() {
          return this.socket.isConnected();
        }
        isConnecting() {
          return "connecting" == this.socket.connectionState();
        }
        isDisconnecting() {
          return "closing" == this.socket.connectionState();
        }
        connectionState() {
          return this.socket.connectionState();
        }
        endPointURL() {
          return this.socket.endPointURL();
        }
        sendHeartbeat() {
          this.socket.sendHeartbeat();
        }
        getSocket() {
          return this.socket;
        }
      }
      let sT = [1e3, 2e3, 5e3, 1e4], sR = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
      class sC {
        get endPoint() {
          return this.socketAdapter.endPoint;
        }
        get timeout() {
          return this.socketAdapter.timeout;
        }
        get transport() {
          return this.socketAdapter.transport;
        }
        get heartbeatCallback() {
          return this.socketAdapter.heartbeatCallback;
        }
        get heartbeatIntervalMs() {
          return this.socketAdapter.heartbeatIntervalMs;
        }
        get heartbeatTimer() {
          return this.worker ? this._workerHeartbeatTimer : this.socketAdapter.heartbeatTimer;
        }
        get pendingHeartbeatRef() {
          return this.worker ? this._pendingWorkerHeartbeatRef : this.socketAdapter.pendingHeartbeatRef;
        }
        get reconnectTimer() {
          return this.socketAdapter.reconnectTimer;
        }
        get vsn() {
          return this.socketAdapter.vsn;
        }
        get encode() {
          return this.socketAdapter.encode;
        }
        get decode() {
          return this.socketAdapter.decode;
        }
        get reconnectAfterMs() {
          return this.socketAdapter.reconnectAfterMs;
        }
        get sendBuffer() {
          return this.socketAdapter.sendBuffer;
        }
        get stateChangeCallbacks() {
          return this.socketAdapter.stateChangeCallbacks;
        }
        constructor(e10, t10) {
          var r10;
          if (this.channels = [], this.accessTokenValue = null, this.accessToken = null, this.apiKey = null, this.httpEndpoint = "", this.headers = {}, this.params = {}, this.ref = 0, this.serializer = new nX(), this._manuallySetToken = false, this._authPromise = null, this._workerHeartbeatTimer = void 0, this._pendingWorkerHeartbeatRef = null, this._pendingDisconnectTimer = null, this._disconnectOnEmptyChannelsAfterMs = 0, this._resolveFetch = (e11) => e11 ? (...t11) => e11(...t11) : (...e12) => fetch(...e12), !(null == (r10 = null == t10 ? void 0 : t10.params) ? void 0 : r10.apikey)) throw Error("API key is required to connect to Realtime");
          this.apiKey = t10.params.apikey;
          const n10 = this._initializeOptions(t10);
          this.socketAdapter = new sS(e10, n10), this.httpEndpoint = n6(e10), this.fetch = this._resolveFetch(null == t10 ? void 0 : t10.fetch);
        }
        connect() {
          if (!(this.isConnecting() || this.isDisconnecting() || this.isConnected())) {
            this.accessToken && !this._authPromise && this._setAuthSafely("connect"), this._setupConnectionHandlers();
            try {
              this.socketAdapter.connect();
            } catch (t10) {
              let e10 = t10.message;
              if (e10.includes("Node.js")) throw Error(`${e10}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`);
              throw Error(`WebSocket not available: ${e10}`);
            }
            this._handleNodeJsRaceCondition();
          }
        }
        endpointURL() {
          return this.socketAdapter.endPointURL();
        }
        async disconnect(e10, t10) {
          return (this._cancelPendingDisconnect(), this.isDisconnecting()) ? "ok" : await this.socketAdapter.disconnect(() => {
            clearInterval(this._workerHeartbeatTimer), this._terminateWorker();
          }, e10, t10);
        }
        getChannels() {
          return this.channels;
        }
        async removeChannel(e10) {
          let t10 = await e10.unsubscribe();
          return "ok" === t10 && e10.teardown(), t10;
        }
        async removeAllChannels() {
          let e10 = this.channels.map(async (e11) => {
            let t11 = await e11.unsubscribe();
            return e11.teardown(), t11;
          }), t10 = await Promise.all(e10);
          return await this.disconnect(), t10;
        }
        log(e10, t10, r10) {
          this.socketAdapter.log(e10, t10, r10);
        }
        connectionState() {
          return this.socketAdapter.connectionState() || "closed";
        }
        isConnected() {
          return this.socketAdapter.isConnected();
        }
        isConnecting() {
          return this.socketAdapter.isConnecting();
        }
        isDisconnecting() {
          return this.socketAdapter.isDisconnecting();
        }
        channel(e10, t10 = { config: {} }) {
          let r10 = `realtime:${e10}`, n10 = this.getChannels().find((e11) => e11.topic === r10);
          if (n10) return n10;
          {
            let r11 = new sE(`realtime:${e10}`, t10, this);
            return this._cancelPendingDisconnect(), this.channels.push(r11), r11;
          }
        }
        push(e10) {
          this.socketAdapter.push(e10);
        }
        async setAuth(e10 = null) {
          this._authPromise = this._performAuth(e10);
          try {
            await this._authPromise;
          } finally {
            this._authPromise = null;
          }
        }
        _isManualToken() {
          return this._manuallySetToken;
        }
        async sendHeartbeat() {
          this.socketAdapter.sendHeartbeat();
        }
        onHeartbeat(e10) {
          this.socketAdapter.heartbeatCallback = this._wrapHeartbeatCallback(e10);
        }
        _makeRef() {
          return this.socketAdapter.makeRef();
        }
        _remove(e10) {
          this.channels = this.channels.filter((t10) => t10.topic !== e10.topic), 0 === this.channels.length && (this.log("transport", "no channels remaining, scheduling disconnect"), this._schedulePendingDisconnect());
        }
        _schedulePendingDisconnect() {
          if (this._cancelPendingDisconnect(), 0 === this._disconnectOnEmptyChannelsAfterMs) {
            this.log("transport", "disconnecting immediately - no channels"), this.disconnect();
            return;
          }
          this._pendingDisconnectTimer = setTimeout(() => {
            this._pendingDisconnectTimer = null, 0 === this.channels.length && (this.log("transport", "deferred disconnect fired - no channels, disconnecting"), this.disconnect());
          }, this._disconnectOnEmptyChannelsAfterMs), this.log("transport", `deferred disconnect scheduled in ${this._disconnectOnEmptyChannelsAfterMs}ms`);
        }
        _cancelPendingDisconnect() {
          null !== this._pendingDisconnectTimer && (this.log("transport", "pending disconnect cancelled - channel activity detected"), clearTimeout(this._pendingDisconnectTimer), this._pendingDisconnectTimer = null);
        }
        async _performAuth(e10 = null) {
          let t10, r10 = false;
          if (e10) t10 = e10, r10 = true;
          else if (this.accessToken) try {
            t10 = await this.accessToken();
          } catch (e11) {
            this.log("error", "Error fetching access token from callback", e11), t10 = this.accessTokenValue;
          }
          else t10 = this.accessTokenValue;
          r10 ? this._manuallySetToken = true : this.accessToken && (this._manuallySetToken = false), this.accessTokenValue != t10 && (this.accessTokenValue = t10, this.channels.forEach((e11) => {
            let r11 = { access_token: t10, version: "realtime-js/2.108.2" };
            t10 && e11.updateJoinPayload(r11), e11.joinedOnce && e11.channelAdapter.isJoined() && e11.channelAdapter.push(nJ.access_token, { access_token: t10 });
          }));
        }
        async _waitForAuthIfNeeded() {
          this._authPromise && await this._authPromise;
        }
        _setAuthSafely(e10 = "general") {
          this._isManualToken() || this.setAuth().catch((t10) => {
            this.log("error", `Error setting auth in ${e10}`, t10);
          });
        }
        _setupConnectionHandlers() {
          this.socketAdapter.onOpen(() => {
            (this._authPromise || (this.accessToken && !this.accessTokenValue ? this.setAuth() : Promise.resolve())).catch((e10) => {
              this.log("error", "error waiting for auth on connect", e10);
            }), this.worker && !this.workerRef && this._startWorkerHeartbeat();
          }), this.socketAdapter.onClose(() => {
            this.worker && this.workerRef && this._terminateWorker();
          }), this.socketAdapter.onMessage((e10) => {
            e10.ref && e10.ref === this._pendingWorkerHeartbeatRef && (this._pendingWorkerHeartbeatRef = null);
          });
        }
        _handleNodeJsRaceCondition() {
          this.socketAdapter.isConnected() && this.socketAdapter.getSocket().onConnOpen();
        }
        _wrapHeartbeatCallback(e10) {
          return (t10, r10) => {
            "sent" == t10 && this._setAuthSafely(), e10 && e10(t10, r10);
          };
        }
        _startWorkerHeartbeat() {
          this.workerUrl ? this.log("worker", `starting worker for from ${this.workerUrl}`) : this.log("worker", "starting default worker");
          let e10 = this._workerObjectUrl(this.workerUrl);
          this.workerRef = new Worker(e10), this.workerRef.onerror = (e11) => {
            this.log("worker", "worker error", e11.message), this._terminateWorker(), this.disconnect();
          }, this.workerRef.onmessage = (e11) => {
            "keepAlive" === e11.data.event && this.sendHeartbeat();
          }, this.workerRef.postMessage({ event: "start", interval: this.heartbeatIntervalMs });
        }
        _terminateWorker() {
          this.workerRef && (this.log("worker", "terminating worker"), this.workerRef.terminate(), this.workerRef = void 0);
        }
        _workerObjectUrl(e10) {
          let t10;
          if (e10) t10 = e10;
          else {
            let e11 = new Blob([sR], { type: "application/javascript" });
            t10 = URL.createObjectURL(e11);
          }
          return t10;
        }
        _initializeOptions(e10) {
          var t10, r10, n10, s10, i10, a10, o2, l2, u2, c2, h2, d2;
          let p2, f2;
          this.worker = null != (t10 = null == e10 ? void 0 : e10.worker) && t10, this.accessToken = null != (r10 = null == e10 ? void 0 : e10.accessToken) ? r10 : null;
          let g2 = {};
          g2.timeout = null != (n10 = null == e10 ? void 0 : e10.timeout) ? n10 : 1e4, g2.heartbeatIntervalMs = null != (s10 = null == e10 ? void 0 : e10.heartbeatIntervalMs) ? s10 : 25e3, this._disconnectOnEmptyChannelsAfterMs = null != (i10 = null == e10 ? void 0 : e10.disconnectOnEmptyChannelsAfterMs) ? i10 : 2 * (null != (a10 = null == e10 ? void 0 : e10.heartbeatIntervalMs) ? a10 : 25e3), g2.transport = null != (o2 = null == e10 ? void 0 : e10.transport) ? o2 : nW.getWebSocketConstructor(), g2.params = null == e10 ? void 0 : e10.params, g2.logger = null == e10 ? void 0 : e10.logger, g2.heartbeatCallback = this._wrapHeartbeatCallback(null == e10 ? void 0 : e10.heartbeatCallback), g2.sessionStorage = null != (l2 = null == e10 ? void 0 : e10.sessionStorage) ? l2 : function() {
            let e11;
            try {
              if ("u" > typeof globalThis && globalThis.sessionStorage) return globalThis.sessionStorage;
            } catch (e12) {
            }
            return e11 = /* @__PURE__ */ new Map(), { get length() {
              return e11.size;
            }, clear() {
              e11.clear();
            }, getItem: (t11) => e11.has(t11) ? e11.get(t11) : null, key(t11) {
              var r11;
              return null != (r11 = Array.from(e11.keys())[t11]) ? r11 : null;
            }, removeItem(t11) {
              e11.delete(t11);
            }, setItem(t11, r11) {
              e11.set(t11, String(r11));
            } };
          }(), g2.reconnectAfterMs = null != (u2 = null == e10 ? void 0 : e10.reconnectAfterMs) ? u2 : (e11) => sT[e11 - 1] || 1e4;
          let m2 = null != (c2 = null == e10 ? void 0 : e10.vsn) ? c2 : nz;
          switch (m2) {
            case "1.0.0":
              p2 = (e11, t11) => t11(JSON.stringify(e11)), f2 = (e11, t11) => t11(JSON.parse(e11));
              break;
            case nz:
              p2 = this.serializer.encode.bind(this.serializer), f2 = this.serializer.decode.bind(this.serializer);
              break;
            default:
              throw Error(`Unsupported serializer version: ${g2.vsn}`);
          }
          return g2.vsn = m2, g2.encode = null != (h2 = null == e10 ? void 0 : e10.encode) ? h2 : p2, g2.decode = null != (d2 = null == e10 ? void 0 : e10.decode) ? d2 : f2, g2.beforeReconnect = this._reconnectAuth.bind(this), ((null == e10 ? void 0 : e10.logLevel) || (null == e10 ? void 0 : e10.log_level)) && (this.logLevel = e10.logLevel || e10.log_level, g2.params = Object.assign(Object.assign({}, g2.params), { log_level: this.logLevel })), this.worker && (this.workerUrl = null == e10 ? void 0 : e10.workerUrl, g2.autoSendHeartbeat = !this.worker), g2;
        }
        async _reconnectAuth() {
          await this._waitForAuthIfNeeded(), this.isConnected() || this.connect();
        }
      }
      var sx = class extends Error {
        constructor(e10, t10) {
          super(e10), this.name = "IcebergError", this.status = t10.status, this.icebergType = t10.icebergType, this.icebergCode = t10.icebergCode, this.details = t10.details, this.isCommitStateUnknown = "CommitStateUnknownException" === t10.icebergType || [500, 502, 504].includes(t10.status) && t10.icebergType?.includes("CommitState") === true;
        }
        isNotFound() {
          return 404 === this.status;
        }
        isConflict() {
          return 409 === this.status;
        }
        isAuthenticationTimeout() {
          return 419 === this.status;
        }
      };
      async function sO(e10) {
        return e10 && "none" !== e10.type ? "bearer" === e10.type ? { Authorization: `Bearer ${e10.token}` } : "header" === e10.type ? { [e10.name]: e10.value } : "custom" === e10.type ? await e10.getHeaders() : {} : {};
      }
      function sA(e10) {
        return e10.join("");
      }
      var sP = class {
        constructor(e10, t10 = "") {
          this.client = e10, this.prefix = t10;
        }
        async listNamespaces(e10) {
          let t10 = e10 ? { parent: sA(e10.namespace) } : void 0;
          return (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces`, query: t10 })).data.namespaces.map((e11) => ({ namespace: e11 }));
        }
        async createNamespace(e10, t10) {
          let r10 = { namespace: e10.namespace, properties: t10?.properties };
          return (await this.client.request({ method: "POST", path: `${this.prefix}/namespaces`, body: r10 })).data;
        }
        async dropNamespace(e10) {
          await this.client.request({ method: "DELETE", path: `${this.prefix}/namespaces/${sA(e10.namespace)}` });
        }
        async loadNamespaceMetadata(e10) {
          return { properties: (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${sA(e10.namespace)}` })).data.properties };
        }
        async namespaceExists(e10) {
          try {
            return await this.client.request({ method: "HEAD", path: `${this.prefix}/namespaces/${sA(e10.namespace)}` }), true;
          } catch (e11) {
            if (e11 instanceof sx && 404 === e11.status) return false;
            throw e11;
          }
        }
        async createNamespaceIfNotExists(e10, t10) {
          try {
            return await this.createNamespace(e10, t10);
          } catch (e11) {
            if (e11 instanceof sx && 409 === e11.status) return;
            throw e11;
          }
        }
      };
      function sI(e10) {
        return e10.join("");
      }
      var sN = class {
        constructor(e10, t10 = "", r10) {
          this.client = e10, this.prefix = t10, this.accessDelegation = r10;
        }
        async listTables(e10) {
          return (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables` })).data.identifiers;
        }
        async createTable(e10, t10) {
          let r10 = {};
          return this.accessDelegation && (r10["X-Iceberg-Access-Delegation"] = this.accessDelegation), (await this.client.request({ method: "POST", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables`, body: t10, headers: r10 })).data.metadata;
        }
        async updateTable(e10, t10) {
          let r10 = await this.client.request({ method: "POST", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables/${e10.name}`, body: t10 });
          return { "metadata-location": r10.data["metadata-location"], metadata: r10.data.metadata };
        }
        async dropTable(e10, t10) {
          await this.client.request({ method: "DELETE", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables/${e10.name}`, query: { purgeRequested: String(t10?.purge ?? false) } });
        }
        async loadTable(e10) {
          let t10 = {};
          return this.accessDelegation && (t10["X-Iceberg-Access-Delegation"] = this.accessDelegation), (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables/${e10.name}`, headers: t10 })).data.metadata;
        }
        async tableExists(e10) {
          let t10 = {};
          this.accessDelegation && (t10["X-Iceberg-Access-Delegation"] = this.accessDelegation);
          try {
            return await this.client.request({ method: "HEAD", path: `${this.prefix}/namespaces/${sI(e10.namespace)}/tables/${e10.name}`, headers: t10 }), true;
          } catch (e11) {
            if (e11 instanceof sx && 404 === e11.status) return false;
            throw e11;
          }
        }
        async createTableIfNotExists(e10, t10) {
          try {
            return await this.createTable(e10, t10);
          } catch (r10) {
            if (r10 instanceof sx && 409 === r10.status) return await this.loadTable({ namespace: e10.namespace, name: t10.name });
            throw r10;
          }
        }
      }, sj = class {
        constructor(e10) {
          let t10 = "v1";
          e10.catalogName && (t10 += `/${e10.catalogName}`);
          const r10 = e10.baseUrl.endsWith("/") ? e10.baseUrl : `${e10.baseUrl}/`;
          this.client = function(e11) {
            let t11 = e11.fetchImpl ?? globalThis.fetch;
            return { async request({ method: r11, path: n10, query: s10, body: i10, headers: a10 }) {
              let o2 = function(e12, t12, r12) {
                let n11 = new URL(t12, e12);
                if (r12) for (let [e13, t13] of Object.entries(r12)) void 0 !== t13 && n11.searchParams.set(e13, t13);
                return n11.toString();
              }(e11.baseUrl, n10, s10), l2 = await sO(e11.auth), u2 = await t11(o2, { method: r11, headers: { ...i10 ? { "Content-Type": "application/json" } : {}, ...l2, ...a10 }, body: i10 ? JSON.stringify(i10) : void 0 }), c2 = await u2.text(), h2 = (u2.headers.get("content-type") || "").includes("application/json"), d2 = h2 && c2 ? JSON.parse(c2) : c2;
              if (!u2.ok) {
                let e12 = h2 ? d2 : void 0, t12 = e12?.error;
                throw new sx(t12?.message ?? `Request failed with status ${u2.status}`, { status: u2.status, icebergType: t12?.type, icebergCode: t12?.code, details: e12 });
              }
              return { status: u2.status, headers: u2.headers, data: d2 };
            } };
          }({ baseUrl: r10, auth: e10.auth, fetchImpl: e10.fetch }), this.accessDelegation = e10.accessDelegation?.join(","), this.namespaceOps = new sP(this.client, t10), this.tableOps = new sN(this.client, t10, this.accessDelegation);
        }
        async listNamespaces(e10) {
          return this.namespaceOps.listNamespaces(e10);
        }
        async createNamespace(e10, t10) {
          return this.namespaceOps.createNamespace(e10, t10);
        }
        async dropNamespace(e10) {
          await this.namespaceOps.dropNamespace(e10);
        }
        async loadNamespaceMetadata(e10) {
          return this.namespaceOps.loadNamespaceMetadata(e10);
        }
        async listTables(e10) {
          return this.tableOps.listTables(e10);
        }
        async createTable(e10, t10) {
          return this.tableOps.createTable(e10, t10);
        }
        async updateTable(e10, t10) {
          return this.tableOps.updateTable(e10, t10);
        }
        async dropTable(e10, t10) {
          await this.tableOps.dropTable(e10, t10);
        }
        async loadTable(e10) {
          return this.tableOps.loadTable(e10);
        }
        async namespaceExists(e10) {
          return this.namespaceOps.namespaceExists(e10);
        }
        async tableExists(e10) {
          return this.tableOps.tableExists(e10);
        }
        async createNamespaceIfNotExists(e10, t10) {
          return this.namespaceOps.createNamespaceIfNotExists(e10, t10);
        }
        async createTableIfNotExists(e10, t10) {
          return this.tableOps.createTableIfNotExists(e10, t10);
        }
      };
      function s$(e10) {
        return (s$ = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e11) {
          return typeof e11;
        } : function(e11) {
          return e11 && "function" == typeof Symbol && e11.constructor === Symbol && e11 !== Symbol.prototype ? "symbol" : typeof e11;
        })(e10);
      }
      function sL(e10, t10) {
        var r10 = Object.keys(e10);
        if (Object.getOwnPropertySymbols) {
          var n10 = Object.getOwnPropertySymbols(e10);
          t10 && (n10 = n10.filter(function(t11) {
            return Object.getOwnPropertyDescriptor(e10, t11).enumerable;
          })), r10.push.apply(r10, n10);
        }
        return r10;
      }
      function sD(e10) {
        for (var t10 = 1; t10 < arguments.length; t10++) {
          var r10 = null != arguments[t10] ? arguments[t10] : {};
          t10 % 2 ? sL(Object(r10), true).forEach(function(t11) {
            !function(e11, t12, r11) {
              var n10;
              (n10 = function(e12, t13) {
                if ("object" != s$(e12) || !e12) return e12;
                var r12 = e12[Symbol.toPrimitive];
                if (void 0 !== r12) {
                  var n11 = r12.call(e12, t13 || "default");
                  if ("object" != s$(n11)) return n11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === t13 ? String : Number)(e12);
              }(t12, "string"), (t12 = "symbol" == s$(n10) ? n10 : n10 + "") in e11) ? Object.defineProperty(e11, t12, { value: r11, enumerable: true, configurable: true, writable: true }) : e11[t12] = r11;
            }(e10, t11, r10[t11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e10, Object.getOwnPropertyDescriptors(r10)) : sL(Object(r10)).forEach(function(t11) {
            Object.defineProperty(e10, t11, Object.getOwnPropertyDescriptor(r10, t11));
          });
        }
        return e10;
      }
      var sU = class extends Error {
        constructor(e10, t10 = "storage", r10, n10) {
          super(e10), this.__isStorageError = true, this.namespace = t10, this.name = "vectors" === t10 ? "StorageVectorsError" : "StorageError", this.status = r10, this.statusCode = n10;
        }
        toJSON() {
          return { name: this.name, message: this.message, status: this.status, statusCode: this.statusCode };
        }
      };
      function sM(e10) {
        return "object" == typeof e10 && null !== e10 && "__isStorageError" in e10;
      }
      var sq = class extends sU {
        constructor(e10, t10, r10, n10 = "storage") {
          super(e10, n10, t10, r10), this.name = "vectors" === n10 ? "StorageVectorsApiError" : "StorageApiError", this.status = t10, this.statusCode = r10;
        }
        toJSON() {
          return sD({}, super.toJSON());
        }
      }, sB = class extends sU {
        constructor(e10, t10, r10 = "storage") {
          super(e10, r10), this.name = "vectors" === r10 ? "StorageVectorsUnknownError" : "StorageUnknownError", this.originalError = t10;
        }
      };
      function sH(e10, t10, r10) {
        let n10 = sD({}, e10), s10 = t10.toLowerCase();
        for (let e11 of Object.keys(n10)) e11.toLowerCase() === s10 && delete n10[e11];
        return n10[s10] = r10, n10;
      }
      let sG = (e10) => {
        if (Array.isArray(e10)) return e10.map((e11) => sG(e11));
        if ("function" == typeof e10 || e10 !== Object(e10)) return e10;
        let t10 = {};
        return Object.entries(e10).forEach(([e11, r10]) => {
          t10[e11.replace(/([-_][a-z])/gi, (e12) => e12.toUpperCase().replace(/[-_]/g, ""))] = sG(r10);
        }), t10;
      }, sF = (e10) => {
        if ("object" == typeof e10 && null !== e10) {
          if ("string" == typeof e10.msg) return e10.msg;
          if ("string" == typeof e10.message) return e10.message;
          if ("string" == typeof e10.error_description) return e10.error_description;
          if ("string" == typeof e10.error) return e10.error;
          if ("object" == typeof e10.error && null !== e10.error) {
            let t10 = e10.error;
            if ("string" == typeof t10.message) return t10.message;
          }
        }
        return JSON.stringify(e10);
      }, sW = async (e10, t10, r10, n10) => {
        if (null !== e10 && "object" == typeof e10 && "json" in e10 && "function" == typeof e10.json) {
          let r11 = parseInt(String(e10.status), 10);
          Number.isFinite(r11) || (r11 = 500), e10.json().then((e11) => {
            let s10 = (null == e11 ? void 0 : e11.statusCode) || (null == e11 ? void 0 : e11.code) || r11 + "";
            t10(new sq(sF(e11), r11, s10, n10));
          }).catch(() => {
            let s10 = r11 + "";
            t10(new sq(e10.statusText || `HTTP ${r11} error`, r11, s10, n10));
          });
        } else t10(new sB(sF(e10), e10, n10));
      };
      async function sz(e10, t10, r10, n10, s10, i10, a10) {
        return new Promise((o2, l2) => {
          e10(r10, ((e11, t11, r11, n11) => {
            let s11 = { method: e11, headers: (null == t11 ? void 0 : t11.headers) || {} };
            if ("GET" === e11 || "HEAD" === e11 || !n11) return sD(sD({}, s11), r11);
            if (((e12) => {
              if ("object" != typeof e12 || null === e12) return false;
              let t12 = Object.getPrototypeOf(e12);
              return (null === t12 || t12 === Object.prototype || null === Object.getPrototypeOf(t12)) && !(Symbol.toStringTag in e12) && !(Symbol.iterator in e12);
            })(n11)) {
              var i11;
              let e12, r12 = (null == t11 ? void 0 : t11.headers) || {};
              for (let [t12, n12] of Object.entries(r12)) "content-type" === t12.toLowerCase() && (e12 = n12);
              s11.headers = sH(r12, "Content-Type", null != (i11 = e12) ? i11 : "application/json"), s11.body = JSON.stringify(n11);
            } else s11.body = n11;
            return (null == t11 ? void 0 : t11.duplex) && (s11.duplex = t11.duplex), sD(sD({}, s11), r11);
          })(t10, n10, s10, i10)).then((e11) => {
            if (!e11.ok) throw e11;
            if (null == n10 ? void 0 : n10.noResolveJson) return e11;
            if ("vectors" === a10) {
              let t11 = e11.headers.get("content-type");
              if ("0" === e11.headers.get("content-length") || 204 === e11.status || !t11 || !t11.includes("application/json")) return {};
            }
            return e11.json();
          }).then((e11) => o2(e11)).catch((e11) => sW(e11, l2, n10, a10));
        });
      }
      function sK(e10 = "storage") {
        return { get: async (t10, r10, n10, s10) => sz(t10, "GET", r10, n10, s10, void 0, e10), post: async (t10, r10, n10, s10, i10) => sz(t10, "POST", r10, s10, i10, n10, e10), put: async (t10, r10, n10, s10, i10) => sz(t10, "PUT", r10, s10, i10, n10, e10), head: async (t10, r10, n10, s10) => sz(t10, "HEAD", r10, sD(sD({}, n10), {}, { noResolveJson: true }), s10, void 0, e10), remove: async (t10, r10, n10, s10, i10) => sz(t10, "DELETE", r10, s10, i10, n10, e10) };
      }
      let { get: sV, post: sJ, put: sX, head: sY, remove: sZ } = sK("storage"), sQ = sK("vectors");
      var s0 = class {
        constructor(e10, t10 = {}, r10, n10 = "storage") {
          this.shouldThrowOnError = false, this.url = e10, this.headers = function(e11) {
            let t11 = {};
            for (let [r11, n11] of Object.entries(e11)) t11[r11.toLowerCase()] = n11;
            return t11;
          }(t10), this.fetch = /* @__PURE__ */ ((e11) => e11 ? (...t11) => e11(...t11) : (...e12) => fetch(...e12))(r10), this.namespace = n10;
        }
        throwOnError() {
          return this.shouldThrowOnError = true, this;
        }
        setHeader(e10, t10) {
          return this.headers = sH(this.headers, e10, t10), this;
        }
        async handleOperation(e10) {
          try {
            return { data: await e10(), error: null };
          } catch (e11) {
            if (this.shouldThrowOnError) throw e11;
            if (sM(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
      };
      s = Symbol.toStringTag;
      var s1 = class {
        constructor(e10, t10) {
          this.downloadFn = e10, this.shouldThrowOnError = t10, this[s] = "StreamDownloadBuilder", this.promise = null;
        }
        then(e10, t10) {
          return this.getPromise().then(e10, t10);
        }
        catch(e10) {
          return this.getPromise().catch(e10);
        }
        finally(e10) {
          return this.getPromise().finally(e10);
        }
        getPromise() {
          return this.promise || (this.promise = this.execute()), this.promise;
        }
        async execute() {
          try {
            return { data: (await this.downloadFn()).body, error: null };
          } catch (e10) {
            if (this.shouldThrowOnError) throw e10;
            if (sM(e10)) return { data: null, error: e10 };
            throw e10;
          }
        }
      };
      i = Symbol.toStringTag;
      var s2 = class {
        constructor(e10, t10) {
          this.downloadFn = e10, this.shouldThrowOnError = t10, this[i] = "BlobDownloadBuilder", this.promise = null;
        }
        asStream() {
          return new s1(this.downloadFn, this.shouldThrowOnError);
        }
        then(e10, t10) {
          return this.getPromise().then(e10, t10);
        }
        catch(e10) {
          return this.getPromise().catch(e10);
        }
        finally(e10) {
          return this.getPromise().finally(e10);
        }
        getPromise() {
          return this.promise || (this.promise = this.execute()), this.promise;
        }
        async execute() {
          try {
            return { data: await (await this.downloadFn()).blob(), error: null };
          } catch (e10) {
            if (this.shouldThrowOnError) throw e10;
            if (sM(e10)) return { data: null, error: e10 };
            throw e10;
          }
        }
      };
      let s3 = { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }, s4 = { cacheControl: "3600", contentType: "text/plain;charset=UTF-8", upsert: false };
      var s5 = class extends s0 {
        constructor(e10, t10 = {}, r10, n10) {
          super(e10, t10, n10, "storage"), this.bucketId = r10;
        }
        async uploadOrUpdate(e10, t10, r10, n10) {
          var s10 = this;
          return s10.handleOperation(async () => {
            let i10, a10 = sD(sD({}, s4), n10), o2 = sD(sD({}, s10.headers), "POST" === e10 && { "x-upsert": String(a10.upsert) }), l2 = a10.metadata;
            if ("u" > typeof Blob && r10 instanceof Blob ? ((i10 = new FormData()).append("cacheControl", a10.cacheControl), l2 && i10.append("metadata", s10.encodeMetadata(l2)), i10.append("", r10)) : "u" > typeof FormData && r10 instanceof FormData ? ((i10 = r10).has("cacheControl") || i10.append("cacheControl", a10.cacheControl), l2 && !i10.has("metadata") && i10.append("metadata", s10.encodeMetadata(l2))) : (i10 = r10, o2["cache-control"] = `max-age=${a10.cacheControl}`, o2["content-type"] = a10.contentType, l2 && (o2["x-metadata"] = s10.toBase64(s10.encodeMetadata(l2))), ("u" > typeof ReadableStream && i10 instanceof ReadableStream || i10 && "object" == typeof i10 && "pipe" in i10 && "function" == typeof i10.pipe) && !a10.duplex && (a10.duplex = "half")), null == n10 ? void 0 : n10.headers) for (let [e11, t11] of Object.entries(n10.headers)) o2 = sH(o2, e11, t11);
            let u2 = s10._removeEmptyFolders(t10), c2 = s10._getFinalPath(u2), h2 = await ("PUT" == e10 ? sX : sJ)(s10.fetch, `${s10.url}/object/${c2}`, i10, sD({ headers: o2 }, (null == a10 ? void 0 : a10.duplex) ? { duplex: a10.duplex } : {}));
            return { path: u2, id: h2.Id, fullPath: h2.Key };
          });
        }
        async upload(e10, t10, r10) {
          return this.uploadOrUpdate("POST", e10, t10, r10);
        }
        async uploadToSignedUrl(e10, t10, r10, n10) {
          var s10 = this;
          let i10 = s10._removeEmptyFolders(e10), a10 = s10._getFinalPath(i10), o2 = new URL(s10.url + `/object/upload/sign/${a10}`);
          return o2.searchParams.set("token", t10), s10.handleOperation(async () => {
            let e11, t11 = sD(sD({}, s4), n10), a11 = sD(sD({}, s10.headers), { "x-upsert": String(t11.upsert) }), l2 = t11.metadata;
            if ("u" > typeof Blob && r10 instanceof Blob ? ((e11 = new FormData()).append("cacheControl", t11.cacheControl), l2 && e11.append("metadata", s10.encodeMetadata(l2)), e11.append("", r10)) : "u" > typeof FormData && r10 instanceof FormData ? ((e11 = r10).has("cacheControl") || e11.append("cacheControl", t11.cacheControl), l2 && !e11.has("metadata") && e11.append("metadata", s10.encodeMetadata(l2))) : (e11 = r10, a11["cache-control"] = `max-age=${t11.cacheControl}`, a11["content-type"] = t11.contentType, l2 && (a11["x-metadata"] = s10.toBase64(s10.encodeMetadata(l2))), ("u" > typeof ReadableStream && e11 instanceof ReadableStream || e11 && "object" == typeof e11 && "pipe" in e11 && "function" == typeof e11.pipe) && !t11.duplex && (t11.duplex = "half")), null == n10 ? void 0 : n10.headers) for (let [e12, t12] of Object.entries(n10.headers)) a11 = sH(a11, e12, t12);
            return { path: i10, fullPath: (await sX(s10.fetch, o2.toString(), e11, sD({ headers: a11 }, (null == t11 ? void 0 : t11.duplex) ? { duplex: t11.duplex } : {}))).Key };
          });
        }
        async createSignedUploadUrl(e10, t10) {
          var r10 = this;
          return r10.handleOperation(async () => {
            let n10 = r10._getFinalPath(e10), s10 = sD({}, r10.headers);
            (null == t10 ? void 0 : t10.upsert) && (s10["x-upsert"] = "true");
            let i10 = await sJ(r10.fetch, `${r10.url}/object/upload/sign/${n10}`, {}, { headers: s10 }), a10 = new URL(r10.url + i10.url), o2 = a10.searchParams.get("token");
            if (!o2) throw new sU("No token returned by API");
            return { signedUrl: a10.toString(), path: e10, token: o2 };
          });
        }
        async update(e10, t10, r10) {
          return this.uploadOrUpdate("PUT", e10, t10, r10);
        }
        async move(e10, t10, r10) {
          var n10 = this;
          return n10.handleOperation(async () => await sJ(n10.fetch, `${n10.url}/object/move`, { bucketId: n10.bucketId, sourceKey: e10, destinationKey: t10, destinationBucket: null == r10 ? void 0 : r10.destinationBucket }, { headers: n10.headers }));
        }
        async copy(e10, t10, r10) {
          var n10 = this;
          return n10.handleOperation(async () => ({ path: (await sJ(n10.fetch, `${n10.url}/object/copy`, { bucketId: n10.bucketId, sourceKey: e10, destinationKey: t10, destinationBucket: null == r10 ? void 0 : r10.destinationBucket }, { headers: n10.headers })).Key }));
        }
        async createSignedUrl(e10, t10, r10) {
          var n10 = this;
          return n10.handleOperation(async () => {
            let s10 = n10._getFinalPath(e10), i10 = "object" == typeof (null == r10 ? void 0 : r10.transform) && null !== r10.transform && Object.keys(r10.transform).length > 0, a10 = await sJ(n10.fetch, `${n10.url}/object/sign/${s10}`, sD({ expiresIn: t10 }, i10 ? { transform: r10.transform } : {}), { headers: n10.headers }), o2 = new URLSearchParams();
            (null == r10 ? void 0 : r10.download) && o2.set("download", true === r10.download ? "" : r10.download), (null == r10 ? void 0 : r10.cacheNonce) != null && o2.set("cacheNonce", String(r10.cacheNonce));
            let l2 = o2.toString();
            return { signedUrl: encodeURI(`${n10.url}${a10.signedURL}${l2 ? `&${l2}` : ""}`) };
          });
        }
        async createSignedUrls(e10, t10, r10) {
          var n10 = this;
          return n10.handleOperation(async () => {
            let s10 = await sJ(n10.fetch, `${n10.url}/object/sign/${n10.bucketId}`, { expiresIn: t10, paths: e10 }, { headers: n10.headers }), i10 = new URLSearchParams();
            (null == r10 ? void 0 : r10.download) && i10.set("download", true === r10.download ? "" : r10.download), (null == r10 ? void 0 : r10.cacheNonce) != null && i10.set("cacheNonce", String(r10.cacheNonce));
            let a10 = i10.toString();
            return s10.map((e11) => sD(sD({}, e11), {}, { signedUrl: e11.signedURL ? encodeURI(`${n10.url}${e11.signedURL}${a10 ? `&${a10}` : ""}`) : null }));
          });
        }
        download(e10, t10, r10) {
          let n10 = "object" == typeof (null == t10 ? void 0 : t10.transform) && null !== t10.transform && Object.keys(t10.transform).length > 0 ? "render/image/authenticated" : "object", s10 = new URLSearchParams();
          (null == t10 ? void 0 : t10.transform) && this.applyTransformOptsToQuery(s10, t10.transform), (null == t10 ? void 0 : t10.cacheNonce) != null && s10.set("cacheNonce", String(t10.cacheNonce));
          let i10 = s10.toString(), a10 = this._getFinalPath(e10);
          return new s2(() => sV(this.fetch, `${this.url}/${n10}/${a10}${i10 ? `?${i10}` : ""}`, { headers: this.headers, noResolveJson: true }, r10), this.shouldThrowOnError);
        }
        async info(e10) {
          var t10 = this;
          let r10 = t10._getFinalPath(e10);
          return t10.handleOperation(async () => sG(await sV(t10.fetch, `${t10.url}/object/info/${r10}`, { headers: t10.headers })));
        }
        async exists(e10) {
          var t10;
          let r10 = this._getFinalPath(e10);
          try {
            return await sY(this.fetch, `${this.url}/object/${r10}`, { headers: this.headers }), { data: true, error: null };
          } catch (e11) {
            if (this.shouldThrowOnError) throw e11;
            if (sM(e11)) {
              let r11 = e11 instanceof sq ? e11.status : e11 instanceof sB ? null == (t10 = e11.originalError) ? void 0 : t10.status : void 0;
              if (void 0 !== r11 && [400, 404].includes(r11)) return { data: false, error: e11 };
            }
            throw e11;
          }
        }
        getPublicUrl(e10, t10) {
          let r10 = this._getFinalPath(e10), n10 = new URLSearchParams();
          (null == t10 ? void 0 : t10.download) && n10.set("download", true === t10.download ? "" : t10.download), (null == t10 ? void 0 : t10.transform) && this.applyTransformOptsToQuery(n10, t10.transform), (null == t10 ? void 0 : t10.cacheNonce) != null && n10.set("cacheNonce", String(t10.cacheNonce));
          let s10 = n10.toString(), i10 = "object" == typeof (null == t10 ? void 0 : t10.transform) && null !== t10.transform && Object.keys(t10.transform).length > 0 ? "render/image" : "object";
          return { data: { publicUrl: encodeURI(`${this.url}/${i10}/public/${r10}`) + (s10 ? `?${s10}` : "") } };
        }
        async remove(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sZ(t10.fetch, `${t10.url}/object/${t10.bucketId}`, { prefixes: e10 }, { headers: t10.headers }));
        }
        async list(e10, t10, r10) {
          var n10 = this;
          return n10.handleOperation(async () => {
            let s10 = sD(sD(sD({}, s3), t10), {}, { prefix: e10 || "" });
            return await sJ(n10.fetch, `${n10.url}/object/list/${n10.bucketId}`, s10, { headers: n10.headers }, r10);
          });
        }
        async listV2(e10, t10) {
          var r10 = this;
          return r10.handleOperation(async () => {
            let n10 = sD({}, e10);
            return await sJ(r10.fetch, `${r10.url}/object/list-v2/${r10.bucketId}`, n10, { headers: r10.headers }, t10);
          });
        }
        encodeMetadata(e10) {
          return JSON.stringify(e10);
        }
        toBase64(e10) {
          return void 0 !== tA.Buffer ? tA.Buffer.from(e10).toString("base64") : btoa(e10);
        }
        _getFinalPath(e10) {
          return `${this.bucketId}/${e10.replace(/^\/+/, "")}`;
        }
        _removeEmptyFolders(e10) {
          return e10.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
        }
        applyTransformOptsToQuery(e10, t10) {
          return t10.width && e10.set("width", t10.width.toString()), t10.height && e10.set("height", t10.height.toString()), t10.resize && e10.set("resize", t10.resize), t10.format && e10.set("format", t10.format), t10.quality && e10.set("quality", t10.quality.toString()), e10;
        }
      };
      let s6 = { "X-Client-Info": "storage-js/2.108.2" };
      var s8 = class extends s0 {
        constructor(e10, t10 = {}, r10, n10) {
          const s10 = new URL(e10);
          (null == n10 ? void 0 : n10.useNewHostname) && /supabase\.(co|in|red)$/.test(s10.hostname) && !s10.hostname.includes("storage.supabase.") && (s10.hostname = s10.hostname.replace("supabase.", "storage.supabase.")), super(s10.href.replace(/\/$/, ""), sD(sD({}, s6), t10), r10, "storage");
        }
        async listBuckets(e10) {
          var t10 = this;
          return t10.handleOperation(async () => {
            let r10 = t10.listBucketOptionsToQueryString(e10);
            return await sV(t10.fetch, `${t10.url}/bucket${r10}`, { headers: t10.headers });
          });
        }
        async getBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sV(t10.fetch, `${t10.url}/bucket/${e10}`, { headers: t10.headers }));
        }
        async createBucket(e10, t10 = { public: false }) {
          var r10 = this;
          return r10.handleOperation(async () => await sJ(r10.fetch, `${r10.url}/bucket`, { id: e10, name: e10, type: t10.type, public: t10.public, file_size_limit: t10.fileSizeLimit, allowed_mime_types: t10.allowedMimeTypes }, { headers: r10.headers }));
        }
        async updateBucket(e10, t10) {
          var r10 = this;
          return r10.handleOperation(async () => await sX(r10.fetch, `${r10.url}/bucket/${e10}`, { id: e10, name: e10, public: t10.public, file_size_limit: t10.fileSizeLimit, allowed_mime_types: t10.allowedMimeTypes }, { headers: r10.headers }));
        }
        async emptyBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sJ(t10.fetch, `${t10.url}/bucket/${e10}/empty`, {}, { headers: t10.headers }));
        }
        async deleteBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sZ(t10.fetch, `${t10.url}/bucket/${e10}`, {}, { headers: t10.headers }));
        }
        listBucketOptionsToQueryString(e10) {
          let t10 = {};
          return e10 && ("limit" in e10 && (t10.limit = String(e10.limit)), "offset" in e10 && (t10.offset = String(e10.offset)), e10.search && (t10.search = e10.search), e10.sortColumn && (t10.sortColumn = e10.sortColumn), e10.sortOrder && (t10.sortOrder = e10.sortOrder)), Object.keys(t10).length > 0 ? "?" + new URLSearchParams(t10).toString() : "";
        }
      }, s9 = class extends s0 {
        constructor(e10, t10 = {}, r10) {
          super(e10.replace(/\/$/, ""), sD(sD({}, s6), t10), r10, "storage");
        }
        async createBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sJ(t10.fetch, `${t10.url}/bucket`, { name: e10 }, { headers: t10.headers }));
        }
        async listBuckets(e10) {
          var t10 = this;
          return t10.handleOperation(async () => {
            let r10 = new URLSearchParams();
            (null == e10 ? void 0 : e10.limit) !== void 0 && r10.set("limit", e10.limit.toString()), (null == e10 ? void 0 : e10.offset) !== void 0 && r10.set("offset", e10.offset.toString()), (null == e10 ? void 0 : e10.sortColumn) && r10.set("sortColumn", e10.sortColumn), (null == e10 ? void 0 : e10.sortOrder) && r10.set("sortOrder", e10.sortOrder), (null == e10 ? void 0 : e10.search) && r10.set("search", e10.search);
            let n10 = r10.toString(), s10 = n10 ? `${t10.url}/bucket?${n10}` : `${t10.url}/bucket`;
            return await sV(t10.fetch, s10, { headers: t10.headers });
          });
        }
        async deleteBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sZ(t10.fetch, `${t10.url}/bucket/${e10}`, {}, { headers: t10.headers }));
        }
        from(e10) {
          var t10 = this;
          if (!(!(!e10 || "string" != typeof e10 || 0 === e10.length || e10.length > 100 || e10.trim() !== e10 || e10.includes("/") || e10.includes("\\")) && /^[\w!.\*'() &$@=;:+,?-]+$/.test(e10))) throw new sU("Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.");
          let r10 = new sj({ baseUrl: this.url, catalogName: e10, auth: { type: "custom", getHeaders: async () => t10.headers }, fetch: this.fetch }), n10 = this.shouldThrowOnError;
          return new Proxy(r10, { get(e11, t11) {
            let r11 = e11[t11];
            return "function" != typeof r11 ? r11 : async (...t12) => {
              try {
                return { data: await r11.apply(e11, t12), error: null };
              } catch (e12) {
                if (n10) throw e12;
                return { data: null, error: e12 };
              }
            };
          } });
        }
      }, s7 = class extends s0 {
        constructor(e10, t10 = {}, r10) {
          super(e10.replace(/\/$/, ""), sD(sD({}, s6), {}, { "Content-Type": "application/json" }, t10), r10, "vectors");
        }
        async createIndex(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/CreateIndex`, e10, { headers: t10.headers }) || {});
        }
        async getIndex(e10, t10) {
          var r10 = this;
          return r10.handleOperation(async () => await sQ.post(r10.fetch, `${r10.url}/GetIndex`, { vectorBucketName: e10, indexName: t10 }, { headers: r10.headers }));
        }
        async listIndexes(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/ListIndexes`, e10, { headers: t10.headers }));
        }
        async deleteIndex(e10, t10) {
          var r10 = this;
          return r10.handleOperation(async () => await sQ.post(r10.fetch, `${r10.url}/DeleteIndex`, { vectorBucketName: e10, indexName: t10 }, { headers: r10.headers }) || {});
        }
      }, ie = class extends s0 {
        constructor(e10, t10 = {}, r10) {
          super(e10.replace(/\/$/, ""), sD(sD({}, s6), {}, { "Content-Type": "application/json" }, t10), r10, "vectors");
        }
        async putVectors(e10) {
          var t10 = this;
          if (e10.vectors.length < 1 || e10.vectors.length > 500) throw Error("Vector batch size must be between 1 and 500 items");
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/PutVectors`, e10, { headers: t10.headers }) || {});
        }
        async getVectors(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/GetVectors`, e10, { headers: t10.headers }));
        }
        async listVectors(e10) {
          var t10 = this;
          if (void 0 !== e10.segmentCount) {
            if (e10.segmentCount < 1 || e10.segmentCount > 16) throw Error("segmentCount must be between 1 and 16");
            if (void 0 !== e10.segmentIndex && (e10.segmentIndex < 0 || e10.segmentIndex >= e10.segmentCount)) throw Error(`segmentIndex must be between 0 and ${e10.segmentCount - 1}`);
          }
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/ListVectors`, e10, { headers: t10.headers }));
        }
        async queryVectors(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/QueryVectors`, e10, { headers: t10.headers }));
        }
        async deleteVectors(e10) {
          var t10 = this;
          if (e10.keys.length < 1 || e10.keys.length > 500) throw Error("Keys batch size must be between 1 and 500 items");
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/DeleteVectors`, e10, { headers: t10.headers }) || {});
        }
      }, it = class extends s0 {
        constructor(e10, t10 = {}, r10) {
          super(e10.replace(/\/$/, ""), sD(sD({}, s6), {}, { "Content-Type": "application/json" }, t10), r10, "vectors");
        }
        async createBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/CreateVectorBucket`, { vectorBucketName: e10 }, { headers: t10.headers }) || {});
        }
        async getBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/GetVectorBucket`, { vectorBucketName: e10 }, { headers: t10.headers }));
        }
        async listBuckets(e10 = {}) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/ListVectorBuckets`, e10, { headers: t10.headers }));
        }
        async deleteBucket(e10) {
          var t10 = this;
          return t10.handleOperation(async () => await sQ.post(t10.fetch, `${t10.url}/DeleteVectorBucket`, { vectorBucketName: e10 }, { headers: t10.headers }) || {});
        }
      }, ir = class extends it {
        constructor(e10, t10 = {}) {
          super(e10, t10.headers || {}, t10.fetch);
        }
        from(e10) {
          return new is(this.url, this.headers, e10, this.fetch);
        }
        async createBucket(e10) {
          return super.createBucket.call(this, e10);
        }
        async getBucket(e10) {
          return super.getBucket.call(this, e10);
        }
        async listBuckets(e10 = {}) {
          return super.listBuckets.call(this, e10);
        }
        async deleteBucket(e10) {
          return super.deleteBucket.call(this, e10);
        }
      }, is = class extends s7 {
        constructor(e10, t10, r10, n10) {
          super(e10, t10, n10), this.vectorBucketName = r10;
        }
        async createIndex(e10) {
          return super.createIndex.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName }));
        }
        async listIndexes(e10 = {}) {
          return super.listIndexes.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName }));
        }
        async getIndex(e10) {
          return super.getIndex.call(this, this.vectorBucketName, e10);
        }
        async deleteIndex(e10) {
          return super.deleteIndex.call(this, this.vectorBucketName, e10);
        }
        index(e10) {
          return new ii(this.url, this.headers, this.vectorBucketName, e10, this.fetch);
        }
      }, ii = class extends ie {
        constructor(e10, t10, r10, n10, s10) {
          super(e10, t10, s10), this.vectorBucketName = r10, this.indexName = n10;
        }
        async putVectors(e10) {
          return super.putVectors.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async getVectors(e10) {
          return super.getVectors.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async listVectors(e10 = {}) {
          return super.listVectors.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async queryVectors(e10) {
          return super.queryVectors.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async deleteVectors(e10) {
          return super.deleteVectors.call(this, sD(sD({}, e10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
      }, ia = class extends s8 {
        constructor(e10, t10 = {}, r10, n10) {
          super(e10, t10, r10, n10);
        }
        from(e10) {
          return new s5(this.url, this.headers, e10, this.fetch);
        }
        get vectors() {
          return new ir(this.url + "/vector", { headers: this.headers, fetch: this.fetch });
        }
        get analytics() {
          return new s9(this.url + "/iceberg", this.headers, this.fetch);
        }
      };
      let io = "2.108.2", il = { "X-Client-Info": `gotrue-js/${io}` }, iu = "X-Supabase-Api-Version", ic = { "2024-01-01": { timestamp: Date.parse("2024-01-01T00:00:00.0Z"), name: "2024-01-01" } }, ih = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
      class id extends Error {
        constructor(e10, t10, r10) {
          super(e10), this.__isAuthError = true, this.name = "AuthError", this.status = t10, this.code = r10;
        }
        toJSON() {
          return { name: this.name, message: this.message, status: this.status, code: this.code };
        }
      }
      function ip(e10) {
        return "object" == typeof e10 && null !== e10 && "__isAuthError" in e10;
      }
      class ig extends id {
        constructor(e10, t10, r10) {
          super(e10, t10, r10), this.name = "AuthApiError", this.status = t10, this.code = r10;
        }
      }
      class im extends id {
        constructor(e10, t10) {
          super(e10), this.name = "AuthUnknownError", this.originalError = t10;
        }
      }
      class iy extends id {
        constructor(e10, t10, r10, n10) {
          super(e10, r10, n10), this.name = t10, this.status = r10;
        }
      }
      class i_ extends iy {
        constructor() {
          super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
        }
      }
      function iw(e10) {
        return ip(e10) && "AuthSessionMissingError" === e10.name;
      }
      class ib extends iy {
        constructor() {
          super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
        }
      }
      class iv extends iy {
        constructor(e10) {
          super(e10, "AuthInvalidCredentialsError", 400, void 0);
        }
      }
      class ik extends iy {
        constructor(e10, t10 = null) {
          super(e10, "AuthImplicitGrantRedirectError", 500, void 0), this.details = null, this.details = t10;
        }
        toJSON() {
          return Object.assign(Object.assign({}, super.toJSON()), { details: this.details });
        }
      }
      class iE extends iy {
        constructor() {
          super("PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.", "AuthPKCECodeVerifierMissingError", 400, "pkce_code_verifier_not_found");
        }
      }
      class iS extends iy {
        constructor(e10, t10) {
          super(e10, "AuthRetryableFetchError", t10, void 0);
        }
      }
      function iT(e10) {
        return ip(e10) && "AuthRetryableFetchError" === e10.name;
      }
      class iR extends iy {
        constructor(e10 = "Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)") {
          super(e10, "AuthRefreshDiscardedError", 409, void 0);
        }
      }
      class iC extends iy {
        constructor(e10, t10, r10) {
          super(e10, "AuthWeakPasswordError", t10, "weak_password"), this.reasons = r10;
        }
        toJSON() {
          return Object.assign(Object.assign({}, super.toJSON()), { reasons: this.reasons });
        }
      }
      class ix extends iy {
        constructor(e10) {
          super(e10, "AuthInvalidJwtError", 400, "invalid_jwt");
        }
      }
      let iO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split(""), iA = " 	\n\r=".split(""), iP = (() => {
        let e10 = Array(128);
        for (let t10 = 0; t10 < e10.length; t10 += 1) e10[t10] = -1;
        for (let t10 = 0; t10 < iA.length; t10 += 1) e10[iA[t10].charCodeAt(0)] = -2;
        for (let t10 = 0; t10 < iO.length; t10 += 1) e10[iO[t10].charCodeAt(0)] = t10;
        return e10;
      })();
      function iI(e10, t10, r10) {
        if (null !== e10) for (t10.queue = t10.queue << 8 | e10, t10.queuedBits += 8; t10.queuedBits >= 6; ) r10(iO[t10.queue >> t10.queuedBits - 6 & 63]), t10.queuedBits -= 6;
        else if (t10.queuedBits > 0) for (t10.queue = t10.queue << 6 - t10.queuedBits, t10.queuedBits = 6; t10.queuedBits >= 6; ) r10(iO[t10.queue >> t10.queuedBits - 6 & 63]), t10.queuedBits -= 6;
      }
      function iN(e10, t10, r10) {
        let n10 = iP[e10];
        if (n10 > -1) for (t10.queue = t10.queue << 6 | n10, t10.queuedBits += 6; t10.queuedBits >= 8; ) r10(t10.queue >> t10.queuedBits - 8 & 255), t10.queuedBits -= 8;
        else if (-2 === n10) return;
        else throw Error(`Invalid Base64-URL character "${String.fromCharCode(e10)}"`);
      }
      function ij(e10) {
        let t10 = [], r10 = (e11) => {
          t10.push(String.fromCodePoint(e11));
        }, n10 = { utf8seq: 0, codepoint: 0 }, s10 = { queue: 0, queuedBits: 0 }, i10 = (e11) => {
          !function(e12, t11, r11) {
            if (0 === t11.utf8seq) {
              if (e12 <= 127) return r11(e12);
              for (let r12 = 1; r12 < 6; r12 += 1) if ((e12 >> 7 - r12 & 1) == 0) {
                t11.utf8seq = r12;
                break;
              }
              if (2 === t11.utf8seq) t11.codepoint = 31 & e12;
              else if (3 === t11.utf8seq) t11.codepoint = 15 & e12;
              else if (4 === t11.utf8seq) t11.codepoint = 7 & e12;
              else throw Error("Invalid UTF-8 sequence");
              t11.utf8seq -= 1;
            } else if (t11.utf8seq > 0) {
              if (e12 <= 127) throw Error("Invalid UTF-8 sequence");
              t11.codepoint = t11.codepoint << 6 | 63 & e12, t11.utf8seq -= 1, 0 === t11.utf8seq && r11(t11.codepoint);
            }
          }(e11, n10, r10);
        };
        for (let t11 = 0; t11 < e10.length; t11 += 1) iN(e10.charCodeAt(t11), s10, i10);
        return t10.join("");
      }
      function i$(e10) {
        let t10 = [], r10 = { queue: 0, queuedBits: 0 }, n10 = (e11) => {
          t10.push(e11);
        };
        for (let t11 = 0; t11 < e10.length; t11 += 1) iN(e10.charCodeAt(t11), r10, n10);
        return new Uint8Array(t10);
      }
      function iL(e10) {
        let t10 = [], r10 = { queue: 0, queuedBits: 0 }, n10 = (e11) => {
          t10.push(e11);
        };
        return e10.forEach((e11) => iI(e11, r10, n10)), iI(null, r10, n10), t10.join("");
      }
      let iD = (e10) => e10 ? (...t10) => e10(...t10) : (...e11) => fetch(...e11), iU = async (e10, t10, r10) => {
        await e10.setItem(t10, JSON.stringify(r10));
      }, iM = async (e10, t10) => {
        let r10 = await e10.getItem(t10);
        if (!r10) return null;
        try {
          return JSON.parse(r10);
        } catch (e11) {
          return null;
        }
      }, iq = async (e10, t10) => {
        await e10.removeItem(t10);
      };
      class iB {
        constructor() {
          this.promise = new iB.promiseConstructor((e10, t10) => {
            this.resolve = e10, this.reject = t10;
          });
        }
      }
      function iH(e10) {
        let t10 = e10.split(".");
        if (3 !== t10.length) throw new ix("Invalid JWT structure");
        for (let e11 = 0; e11 < t10.length; e11++) if (!ih.test(t10[e11])) throw new ix("JWT not in base64url format");
        return { header: JSON.parse(ij(t10[0])), payload: JSON.parse(ij(t10[1])), signature: i$(t10[2]), raw: { header: t10[0], payload: t10[1] } };
      }
      async function iG(e10) {
        return await new Promise((t10) => {
          setTimeout(() => t10(null), e10);
        });
      }
      function iF(e10) {
        return ("0" + e10.toString(16)).substr(-2);
      }
      async function iW(e10) {
        let t10 = new TextEncoder().encode(e10);
        return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", t10))).map((e11) => String.fromCharCode(e11)).join("");
      }
      async function iz(e10) {
        return "u" > typeof crypto && void 0 !== crypto.subtle && "u" > typeof TextEncoder ? btoa(await iW(e10)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : (console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256."), e10);
      }
      async function iK(e10, t10, r10 = false) {
        let n10 = function() {
          let e11 = new Uint32Array(56);
          if ("u" < typeof crypto) {
            let e12 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~", t11 = e12.length, r11 = "";
            for (let n11 = 0; n11 < 56; n11++) r11 += e12.charAt(Math.floor(Math.random() * t11));
            return r11;
          }
          return crypto.getRandomValues(e11), Array.from(e11, iF).join("");
        }(), s10 = n10;
        r10 && (s10 += "/recovery"), await iU(e10, `${t10}-code-verifier`, s10);
        let i10 = await iz(n10), a10 = n10 === i10 ? "plain" : "s256";
        return [i10, a10];
      }
      iB.promiseConstructor = Promise;
      let iV = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i, iJ = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      function iX(e10) {
        if (!iJ.test(e10)) throw Error("@supabase/auth-js: Expected parameter to be UUID but is not");
      }
      function iY(e10) {
        if (!e10.passkey) throw Error("@supabase/auth-js: the passkey API is experimental and disabled by default. Enable it by passing `auth: { experimental: { passkey: true } }` to createClient (or to the GoTrueClient constructor).");
      }
      function iZ() {
        return new Proxy({}, { get: (e10, t10) => {
          if ("__isUserNotAvailableProxy" === t10) return true;
          if ("symbol" == typeof t10) {
            let e11 = t10.toString();
            if ("Symbol(Symbol.toPrimitive)" === e11 || "Symbol(Symbol.toStringTag)" === e11 || "Symbol(util.inspect.custom)" === e11) return;
          }
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${t10}" property of the session object is not supported. Please use getUser() instead.`);
        }, set: (e10, t10) => {
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${t10}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
        }, deleteProperty: (e10, t10) => {
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${t10}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
        } });
      }
      function iQ(e10) {
        return JSON.parse(JSON.stringify(e10));
      }
      let i0 = (e10) => {
        if ("object" == typeof e10 && null !== e10) {
          if ("string" == typeof e10.msg) return e10.msg;
          if ("string" == typeof e10.message) return e10.message;
          if ("string" == typeof e10.error_description) return e10.error_description;
          if ("string" == typeof e10.error) return e10.error;
        }
        return JSON.stringify(e10);
      }, i1 = [500, 501, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530];
      async function i2(e10) {
        var t10;
        let r10, n10;
        if (!("object" == typeof e10 && null !== e10 && "status" in e10 && "ok" in e10 && "json" in e10 && "function" == typeof e10.json)) throw new iS(i0(e10), 0);
        if (i1.includes(e10.status)) throw new iS(i0(e10), e10.status);
        try {
          r10 = await e10.json();
        } catch (e11) {
          throw new im(i0(e11), e11);
        }
        let s10 = function(e11) {
          let t11 = e11.headers.get(iu);
          if (!t11 || !t11.match(iV)) return null;
          try {
            return /* @__PURE__ */ new Date(`${t11}T00:00:00.0Z`);
          } catch (e12) {
            return null;
          }
        }(e10);
        if (s10 && s10.getTime() >= ic["2024-01-01"].timestamp && "object" == typeof r10 && r10 && "string" == typeof r10.code ? n10 = r10.code : "object" == typeof r10 && r10 && "string" == typeof r10.error_code && (n10 = r10.error_code), n10) {
          if ("weak_password" === n10) throw new iC(i0(r10), e10.status, (null == (t10 = r10.weak_password) ? void 0 : t10.reasons) || []);
          else if ("session_not_found" === n10) throw new i_();
        } else if ("object" == typeof r10 && r10 && "object" == typeof r10.weak_password && r10.weak_password && Array.isArray(r10.weak_password.reasons) && r10.weak_password.reasons.length && r10.weak_password.reasons.reduce((e11, t11) => e11 && "string" == typeof t11, true)) throw new iC(i0(r10), e10.status, r10.weak_password.reasons);
        throw new ig(i0(r10), e10.status || 500, n10);
      }
      async function i3(e10, t10, r10, n10) {
        var s10;
        let i10 = Object.assign({}, null == n10 ? void 0 : n10.headers);
        i10[iu] || (i10[iu] = ic["2024-01-01"].name), (null == n10 ? void 0 : n10.jwt) && (i10.Authorization = `Bearer ${n10.jwt}`);
        let a10 = null != (s10 = null == n10 ? void 0 : n10.query) ? s10 : {};
        (null == n10 ? void 0 : n10.redirectTo) && (a10.redirect_to = n10.redirectTo);
        let o2 = Object.keys(a10).length ? "?" + new URLSearchParams(a10).toString() : "", l2 = await i4(e10, t10, r10 + o2, { headers: i10, noResolveJson: null == n10 ? void 0 : n10.noResolveJson }, {}, null == n10 ? void 0 : n10.body);
        return (null == n10 ? void 0 : n10.xform) ? null == n10 ? void 0 : n10.xform(l2) : { data: Object.assign({}, l2), error: null };
      }
      async function i4(e10, t10, r10, n10, s10, i10) {
        let a10, o2, l2 = (o2 = { method: t10, headers: (null == n10 ? void 0 : n10.headers) || {} }, "GET" === t10 ? o2 : (o2.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, null == n10 ? void 0 : n10.headers), o2.body = JSON.stringify(i10), Object.assign(Object.assign({}, o2), s10)));
        try {
          a10 = await e10(r10, Object.assign({}, l2));
        } catch (e11) {
          throw console.error(e11), new iS(i0(e11), 0);
        }
        if (a10.ok || await i2(a10), null == n10 ? void 0 : n10.noResolveJson) return a10;
        try {
          return await a10.json();
        } catch (e11) {
          await i2(e11);
        }
      }
      function i5(e10) {
        var t10, r10, n10;
        let s10 = null;
        (n10 = e10).access_token && n10.refresh_token && n10.expires_in && (s10 = Object.assign({}, e10), e10.expires_at || (s10.expires_at = (r10 = e10.expires_in, Math.round(Date.now() / 1e3) + r10)));
        return { data: { session: s10, user: null != (t10 = e10.user) ? t10 : "string" == typeof (null == e10 ? void 0 : e10.id) ? e10 : null }, error: null };
      }
      function i6(e10) {
        let t10 = i5(e10);
        return !t10.error && e10.weak_password && "object" == typeof e10.weak_password && Array.isArray(e10.weak_password.reasons) && e10.weak_password.reasons.length && e10.weak_password.message && "string" == typeof e10.weak_password.message && e10.weak_password.reasons.reduce((e11, t11) => e11 && "string" == typeof t11, true) && (t10.data.weak_password = e10.weak_password), t10;
      }
      function i8(e10) {
        var t10;
        return { data: { user: null != (t10 = e10.user) ? t10 : e10 }, error: null };
      }
      function i9(e10) {
        return { data: e10, error: null };
      }
      function i7(e10) {
        let { action_link: t10, email_otp: r10, hashed_token: n10, redirect_to: s10, verification_type: i10 } = e10;
        return { data: { properties: { action_link: t10, email_otp: r10, hashed_token: n10, redirect_to: s10, verification_type: i10 }, user: Object.assign({}, nO(e10, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"])) }, error: null };
      }
      function ae(e10) {
        return e10;
      }
      let at = ["global", "local", "others"];
      class ar {
        constructor({ url: e10 = "", headers: t10 = {}, fetch: r10, experimental: n10 }) {
          this.url = e10, this.headers = t10, this.fetch = iD(r10), this.experimental = null != n10 ? n10 : {}, this.mfa = { listFactors: this._listFactors.bind(this), deleteFactor: this._deleteFactor.bind(this) }, this.oauth = { listClients: this._listOAuthClients.bind(this), createClient: this._createOAuthClient.bind(this), getClient: this._getOAuthClient.bind(this), updateClient: this._updateOAuthClient.bind(this), deleteClient: this._deleteOAuthClient.bind(this), regenerateClientSecret: this._regenerateOAuthClientSecret.bind(this) }, this.customProviders = { listProviders: this._listCustomProviders.bind(this), createProvider: this._createCustomProvider.bind(this), getProvider: this._getCustomProvider.bind(this), updateProvider: this._updateCustomProvider.bind(this), deleteProvider: this._deleteCustomProvider.bind(this) }, this.passkey = { listPasskeys: this._adminListPasskeys.bind(this), deletePasskey: this._adminDeletePasskey.bind(this) };
        }
        async signOut(e10, t10 = at[0]) {
          if (0 > at.indexOf(t10)) throw Error(`@supabase/auth-js: Parameter scope must be one of ${at.join(", ")}`);
          try {
            return await i3(this.fetch, "POST", `${this.url}/logout?scope=${t10}`, { headers: this.headers, jwt: e10, noResolveJson: true }), { data: null, error: null };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async inviteUserByEmail(e10, t10 = {}) {
          try {
            return await i3(this.fetch, "POST", `${this.url}/invite`, { body: { email: e10, data: t10.data }, headers: this.headers, redirectTo: t10.redirectTo, xform: i8 });
          } catch (e11) {
            if (ip(e11)) return { data: { user: null }, error: e11 };
            throw e11;
          }
        }
        async generateLink(e10) {
          try {
            let { options: t10 } = e10, r10 = nO(e10, ["options"]), n10 = Object.assign(Object.assign({}, r10), t10);
            return "newEmail" in r10 && (n10.new_email = null == r10 ? void 0 : r10.newEmail, delete n10.newEmail), await i3(this.fetch, "POST", `${this.url}/admin/generate_link`, { body: n10, headers: this.headers, xform: i7, redirectTo: null == t10 ? void 0 : t10.redirectTo });
          } catch (e11) {
            if (ip(e11)) return { data: { properties: null, user: null }, error: e11 };
            throw e11;
          }
        }
        async createUser(e10) {
          try {
            return await i3(this.fetch, "POST", `${this.url}/admin/users`, { body: e10, headers: this.headers, xform: i8 });
          } catch (e11) {
            if (ip(e11)) return { data: { user: null }, error: e11 };
            throw e11;
          }
        }
        async listUsers(e10) {
          var t10, r10, n10, s10, i10, a10, o2;
          try {
            let l2 = { nextPage: null, lastPage: 0, total: 0 }, u2 = await i3(this.fetch, "GET", `${this.url}/admin/users`, { headers: this.headers, noResolveJson: true, query: { page: null != (r10 = null == (t10 = null == e10 ? void 0 : e10.page) ? void 0 : t10.toString()) ? r10 : "", per_page: null != (s10 = null == (n10 = null == e10 ? void 0 : e10.perPage) ? void 0 : n10.toString()) ? s10 : "" }, xform: ae });
            if (u2.error) throw u2.error;
            let c2 = await u2.json(), h2 = null != (i10 = u2.headers.get("x-total-count")) ? i10 : 0, d2 = null != (o2 = null == (a10 = u2.headers.get("link")) ? void 0 : a10.split(",")) ? o2 : [];
            return d2.length > 0 && (d2.forEach((e11) => {
              let t11 = parseInt(e11.split(";")[0].split("=")[1].substring(0, 1)), r11 = JSON.parse(e11.split(";")[1].split("=")[1]);
              l2[`${r11}Page`] = t11;
            }), l2.total = parseInt(h2)), { data: Object.assign(Object.assign({}, c2), l2), error: null };
          } catch (e11) {
            if (ip(e11)) return { data: { users: [] }, error: e11 };
            throw e11;
          }
        }
        async getUserById(e10) {
          iX(e10);
          try {
            return await i3(this.fetch, "GET", `${this.url}/admin/users/${e10}`, { headers: this.headers, xform: i8 });
          } catch (e11) {
            if (ip(e11)) return { data: { user: null }, error: e11 };
            throw e11;
          }
        }
        async updateUserById(e10, t10) {
          iX(e10);
          try {
            return await i3(this.fetch, "PUT", `${this.url}/admin/users/${e10}`, { body: t10, headers: this.headers, xform: i8 });
          } catch (e11) {
            if (ip(e11)) return { data: { user: null }, error: e11 };
            throw e11;
          }
        }
        async deleteUser(e10, t10 = false) {
          iX(e10);
          try {
            return await i3(this.fetch, "DELETE", `${this.url}/admin/users/${e10}`, { headers: this.headers, body: { should_soft_delete: t10 }, xform: i8 });
          } catch (e11) {
            if (ip(e11)) return { data: { user: null }, error: e11 };
            throw e11;
          }
        }
        async _listFactors(e10) {
          iX(e10.userId);
          try {
            let { data: t10, error: r10 } = await i3(this.fetch, "GET", `${this.url}/admin/users/${e10.userId}/factors`, { headers: this.headers, xform: (e11) => ({ data: { factors: e11 }, error: null }) });
            return { data: t10, error: r10 };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _deleteFactor(e10) {
          iX(e10.userId), iX(e10.id);
          try {
            return { data: await i3(this.fetch, "DELETE", `${this.url}/admin/users/${e10.userId}/factors/${e10.id}`, { headers: this.headers }), error: null };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _listOAuthClients(e10) {
          var t10, r10, n10, s10, i10, a10, o2;
          try {
            let l2 = { nextPage: null, lastPage: 0, total: 0 }, u2 = await i3(this.fetch, "GET", `${this.url}/admin/oauth/clients`, { headers: this.headers, noResolveJson: true, query: { page: null != (r10 = null == (t10 = null == e10 ? void 0 : e10.page) ? void 0 : t10.toString()) ? r10 : "", per_page: null != (s10 = null == (n10 = null == e10 ? void 0 : e10.perPage) ? void 0 : n10.toString()) ? s10 : "" }, xform: ae });
            if (u2.error) throw u2.error;
            let c2 = await u2.json(), h2 = null != (i10 = u2.headers.get("x-total-count")) ? i10 : 0, d2 = null != (o2 = null == (a10 = u2.headers.get("link")) ? void 0 : a10.split(",")) ? o2 : [];
            return d2.length > 0 && (d2.forEach((e11) => {
              let t11 = parseInt(e11.split(";")[0].split("=")[1].substring(0, 1)), r11 = JSON.parse(e11.split(";")[1].split("=")[1]);
              l2[`${r11}Page`] = t11;
            }), l2.total = parseInt(h2)), { data: Object.assign(Object.assign({}, c2), l2), error: null };
          } catch (e11) {
            if (ip(e11)) return { data: { clients: [] }, error: e11 };
            throw e11;
          }
        }
        async _createOAuthClient(e10) {
          try {
            return await i3(this.fetch, "POST", `${this.url}/admin/oauth/clients`, { body: e10, headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _getOAuthClient(e10) {
          try {
            return await i3(this.fetch, "GET", `${this.url}/admin/oauth/clients/${e10}`, { headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _updateOAuthClient(e10, t10) {
          try {
            return await i3(this.fetch, "PUT", `${this.url}/admin/oauth/clients/${e10}`, { body: t10, headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _deleteOAuthClient(e10) {
          try {
            return await i3(this.fetch, "DELETE", `${this.url}/admin/oauth/clients/${e10}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _regenerateOAuthClientSecret(e10) {
          try {
            return await i3(this.fetch, "POST", `${this.url}/admin/oauth/clients/${e10}/regenerate_secret`, { headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _listCustomProviders(e10) {
          try {
            let t10 = {};
            return (null == e10 ? void 0 : e10.type) && (t10.type = e10.type), await i3(this.fetch, "GET", `${this.url}/admin/custom-providers`, { headers: this.headers, query: t10, xform: (e11) => {
              var t11;
              return { data: { providers: null != (t11 = null == e11 ? void 0 : e11.providers) ? t11 : [] }, error: null };
            } });
          } catch (e11) {
            if (ip(e11)) return { data: { providers: [] }, error: e11 };
            throw e11;
          }
        }
        async _createCustomProvider(e10) {
          try {
            return await i3(this.fetch, "POST", `${this.url}/admin/custom-providers`, { body: e10, headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _getCustomProvider(e10) {
          try {
            return await i3(this.fetch, "GET", `${this.url}/admin/custom-providers/${e10}`, { headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _updateCustomProvider(e10, t10) {
          try {
            return await i3(this.fetch, "PUT", `${this.url}/admin/custom-providers/${e10}`, { body: t10, headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _deleteCustomProvider(e10) {
          try {
            return await i3(this.fetch, "DELETE", `${this.url}/admin/custom-providers/${e10}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _adminListPasskeys(e10) {
          iY(this.experimental), iX(e10.userId);
          try {
            return await i3(this.fetch, "GET", `${this.url}/admin/users/${e10.userId}/passkeys`, { headers: this.headers, xform: (e11) => ({ data: e11, error: null }) });
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
        async _adminDeletePasskey(e10) {
          iY(this.experimental), iX(e10.userId), iX(e10.passkeyId);
          try {
            return await i3(this.fetch, "DELETE", `${this.url}/admin/users/${e10.userId}/passkeys/${e10.passkeyId}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            throw e11;
          }
        }
      }
      function an(e10 = {}) {
        return { getItem: (t10) => e10[t10] || null, setItem: (t10, r10) => {
          e10[t10] = r10;
        }, removeItem: (t10) => {
          delete e10[t10];
        } };
      }
      class as extends Error {
        constructor(e10) {
          super(e10), this.isAcquireTimeout = true;
        }
      }
      function ai(e10) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(e10)) throw Error(`@supabase/auth-js: Address "${e10}" is invalid.`);
        return e10.toLowerCase();
      }
      class aa extends Error {
        constructor({ message: e10, code: t10, cause: r10, name: n10 }) {
          var s10;
          super(e10, { cause: r10 }), this.__isWebAuthnError = true, this.name = null != (s10 = null != n10 ? n10 : r10 instanceof Error ? r10.name : void 0) ? s10 : "Unknown Error", this.code = t10;
        }
        toJSON() {
          return { name: this.name, message: this.message, code: this.code };
        }
      }
      class ao extends aa {
        constructor(e10, t10) {
          super({ code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: t10, message: e10 }), this.name = "WebAuthnUnknownError", this.originalError = t10;
        }
      }
      let al = new class {
        createNewAbortSignal() {
          if (this.controller) {
            let e11 = Error("Cancelling existing WebAuthn API call for new one");
            e11.name = "AbortError", this.controller.abort(e11);
          }
          let e10 = new AbortController();
          return this.controller = e10, e10.signal;
        }
        cancelCeremony() {
          if (this.controller) {
            let e10 = Error("Manually cancelling existing WebAuthn API call");
            e10.name = "AbortError", this.controller.abort(e10), this.controller = void 0;
          }
        }
      }();
      function au(e10) {
        if (!e10) throw Error("Credential creation options are required");
        if ("u" > typeof PublicKeyCredential && "parseCreationOptionsFromJSON" in PublicKeyCredential && "function" == typeof PublicKeyCredential.parseCreationOptionsFromJSON) return PublicKeyCredential.parseCreationOptionsFromJSON(e10);
        let { challenge: t10, user: r10, excludeCredentials: n10 } = e10, s10 = nO(e10, ["challenge", "user", "excludeCredentials"]), i10 = i$(t10).buffer, a10 = Object.assign(Object.assign({}, r10), { id: i$(r10.id).buffer }), o2 = Object.assign(Object.assign({}, s10), { challenge: i10, user: a10 });
        if (n10 && n10.length > 0) {
          o2.excludeCredentials = Array(n10.length);
          for (let e11 = 0; e11 < n10.length; e11++) {
            let t11 = n10[e11];
            o2.excludeCredentials[e11] = Object.assign(Object.assign({}, t11), { id: i$(t11.id).buffer, type: t11.type || "public-key", transports: t11.transports });
          }
        }
        return o2;
      }
      function ac(e10) {
        if (!e10) throw Error("Credential request options are required");
        if ("u" > typeof PublicKeyCredential && "parseRequestOptionsFromJSON" in PublicKeyCredential && "function" == typeof PublicKeyCredential.parseRequestOptionsFromJSON) return PublicKeyCredential.parseRequestOptionsFromJSON(e10);
        let { challenge: t10, allowCredentials: r10 } = e10, n10 = nO(e10, ["challenge", "allowCredentials"]), s10 = i$(t10).buffer, i10 = Object.assign(Object.assign({}, n10), { challenge: s10 });
        if (r10 && r10.length > 0) {
          i10.allowCredentials = Array(r10.length);
          for (let e11 = 0; e11 < r10.length; e11++) {
            let t11 = r10[e11];
            i10.allowCredentials[e11] = Object.assign(Object.assign({}, t11), { id: i$(t11.id).buffer, type: t11.type || "public-key", transports: t11.transports });
          }
        }
        return i10;
      }
      function ah(e10) {
        var t10;
        return "toJSON" in e10 && "function" == typeof e10.toJSON ? e10.toJSON() : { id: e10.id, rawId: e10.id, response: { attestationObject: iL(new Uint8Array(e10.response.attestationObject)), clientDataJSON: iL(new Uint8Array(e10.response.clientDataJSON)) }, type: "public-key", clientExtensionResults: e10.getClientExtensionResults(), authenticatorAttachment: null != (t10 = e10.authenticatorAttachment) ? t10 : void 0 };
      }
      function ad(e10) {
        var t10;
        if ("toJSON" in e10 && "function" == typeof e10.toJSON) return e10.toJSON();
        let r10 = e10.getClientExtensionResults(), n10 = e10.response;
        return { id: e10.id, rawId: e10.id, response: { authenticatorData: iL(new Uint8Array(n10.authenticatorData)), clientDataJSON: iL(new Uint8Array(n10.clientDataJSON)), signature: iL(new Uint8Array(n10.signature)), userHandle: n10.userHandle ? iL(new Uint8Array(n10.userHandle)) : void 0 }, type: "public-key", clientExtensionResults: r10, authenticatorAttachment: null != (t10 = e10.authenticatorAttachment) ? t10 : void 0 };
      }
      function ap(e10) {
        return "localhost" === e10 || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e10);
      }
      async function af(e10) {
        try {
          let t10 = await navigator.credentials.create(e10);
          if (!t10) return { data: null, error: new ao("Empty credential response", t10) };
          if (!(t10 instanceof PublicKeyCredential)) return { data: null, error: new ao("Browser returned unexpected credential type", t10) };
          return { data: t10, error: null };
        } catch (t10) {
          return { data: null, error: function({ error: e11, options: t11 }) {
            var r10, n10, s10;
            let { publicKey: i10 } = t11;
            if (!i10) throw Error("options was missing required publicKey property");
            if ("AbortError" === e11.name) {
              if (t11.signal instanceof AbortSignal) return new aa({ message: "Registration ceremony was sent an abort signal", code: "ERROR_CEREMONY_ABORTED", cause: e11 });
            } else if ("ConstraintError" === e11.name) {
              if ((null == (r10 = i10.authenticatorSelection) ? void 0 : r10.requireResidentKey) === true) return new aa({ message: "Discoverable credentials were required but no available authenticator supported it", code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT", cause: e11 });
              else if ("conditional" === t11.mediation && (null == (n10 = i10.authenticatorSelection) ? void 0 : n10.userVerification) === "required") return new aa({ message: "User verification was required during automatic registration but it could not be performed", code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE", cause: e11 });
              else if ((null == (s10 = i10.authenticatorSelection) ? void 0 : s10.userVerification) === "required") return new aa({ message: "User verification was required but no available authenticator supported it", code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT", cause: e11 });
            } else if ("InvalidStateError" === e11.name) return new aa({ message: "The authenticator was previously registered", code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", cause: e11 });
            else if ("NotAllowedError" === e11.name) return new aa({ message: e11.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e11 });
            else if ("NotSupportedError" === e11.name) return new aa(0 === i10.pubKeyCredParams.filter((e12) => "public-key" === e12.type).length ? { message: 'No entry in pubKeyCredParams was of type "public-key"', code: "ERROR_MALFORMED_PUBKEYCREDPARAMS", cause: e11 } : { message: "No available authenticator supported any of the specified pubKeyCredParams algorithms", code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG", cause: e11 });
            else if ("SecurityError" === e11.name) {
              let t12 = window.location.hostname;
              if (!ap(t12)) return new aa({ message: `${window.location.hostname} is an invalid domain`, code: "ERROR_INVALID_DOMAIN", cause: e11 });
              if (i10.rp.id !== t12) return new aa({ message: `The RP ID "${i10.rp.id}" is invalid for this domain`, code: "ERROR_INVALID_RP_ID", cause: e11 });
            } else if ("TypeError" === e11.name) {
              if (i10.user.id.byteLength < 1 || i10.user.id.byteLength > 64) return new aa({ message: "User ID was not between 1 and 64 characters", code: "ERROR_INVALID_USER_ID_LENGTH", cause: e11 });
            } else if ("UnknownError" === e11.name) return new aa({ message: "The authenticator was unable to process the specified options, or could not create a new credential", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: e11 });
            return new aa({ message: "a Non-Webauthn related error has occurred", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e11 });
          }({ error: t10, options: e10 }) };
        }
      }
      async function ag(e10) {
        try {
          let t10 = await navigator.credentials.get(e10);
          if (!t10) return { data: null, error: new ao("Empty credential response", t10) };
          if (!(t10 instanceof PublicKeyCredential)) return { data: null, error: new ao("Browser returned unexpected credential type", t10) };
          return { data: t10, error: null };
        } catch (t10) {
          return { data: null, error: function({ error: e11, options: t11 }) {
            let { publicKey: r10 } = t11;
            if (!r10) throw Error("options was missing required publicKey property");
            if ("AbortError" === e11.name) {
              if (t11.signal instanceof AbortSignal) return new aa({ message: "Authentication ceremony was sent an abort signal", code: "ERROR_CEREMONY_ABORTED", cause: e11 });
            } else if ("NotAllowedError" === e11.name) return new aa({ message: e11.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e11 });
            else if ("SecurityError" === e11.name) {
              let t12 = window.location.hostname;
              if (!ap(t12)) return new aa({ message: `${window.location.hostname} is an invalid domain`, code: "ERROR_INVALID_DOMAIN", cause: e11 });
              if (r10.rpId !== t12) return new aa({ message: `The RP ID "${r10.rpId}" is invalid for this domain`, code: "ERROR_INVALID_RP_ID", cause: e11 });
            } else if ("UnknownError" === e11.name) return new aa({ message: "The authenticator was unable to process the specified options, or could not create a new assertion signature", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: e11 });
            return new aa({ message: "a Non-Webauthn related error has occurred", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: e11 });
          }({ error: t10, options: e10 }) };
        }
      }
      let am = { hints: ["security-key"], authenticatorSelection: { authenticatorAttachment: "cross-platform", requireResidentKey: false, userVerification: "preferred", residentKey: "discouraged" }, attestation: "direct" }, ay = { userVerification: "preferred", hints: ["security-key"], attestation: "direct" };
      function a_(...e10) {
        let t10 = (e11) => null !== e11 && "object" == typeof e11 && !Array.isArray(e11), r10 = (e11) => e11 instanceof ArrayBuffer || ArrayBuffer.isView(e11), n10 = {};
        for (let s10 of e10) if (s10) for (let e11 in s10) {
          let i10 = s10[e11];
          if (void 0 !== i10) if (Array.isArray(i10)) n10[e11] = i10;
          else if (r10(i10)) n10[e11] = i10;
          else if (t10(i10)) {
            let r11 = n10[e11];
            t10(r11) ? n10[e11] = a_(r11, i10) : n10[e11] = a_(i10);
          } else n10[e11] = i10;
        }
        return n10;
      }
      class aw {
        constructor(e10) {
          this.client = e10, this.enroll = this._enroll.bind(this), this.challenge = this._challenge.bind(this), this.verify = this._verify.bind(this), this.authenticate = this._authenticate.bind(this), this.register = this._register.bind(this);
        }
        async _enroll(e10) {
          return this.client.mfa.enroll(Object.assign(Object.assign({}, e10), { factorType: "webauthn" }));
        }
        async _challenge({ factorId: e10, webauthn: t10, friendlyName: r10, signal: n10 }, s10) {
          var i10, a10, o2, l2, u2;
          try {
            let { data: c2, error: h2 } = await this.client.mfa.challenge({ factorId: e10, webauthn: t10 });
            if (!c2) return { data: null, error: h2 };
            let d2 = null != n10 ? n10 : al.createNewAbortSignal();
            if ("create" === c2.webauthn.type) {
              let { user: e11 } = c2.webauthn.credential_options.publicKey;
              if (!e11.name) if (r10) e11.name = `${e11.id}:${r10}`;
              else {
                let t11 = (await this.client.getUser()).data.user, r11 = (null == (i10 = null == t11 ? void 0 : t11.user_metadata) ? void 0 : i10.name) || (null == t11 ? void 0 : t11.email) || (null == t11 ? void 0 : t11.id) || "User";
                e11.name = `${e11.id}:${r11}`;
              }
              e11.displayName || (e11.displayName = e11.name);
            }
            switch (c2.webauthn.type) {
              case "create": {
                let t11 = (a10 = c2.webauthn.credential_options.publicKey, o2 = null == s10 ? void 0 : s10.create, a_(am, a10, o2 || {})), { data: r11, error: n11 } = await af({ publicKey: t11, signal: d2 });
                if (r11) return { data: { factorId: e10, challengeId: c2.id, webauthn: { type: c2.webauthn.type, credential_response: r11 } }, error: null };
                return { data: null, error: n11 };
              }
              case "request": {
                let t11 = (l2 = c2.webauthn.credential_options.publicKey, u2 = null == s10 ? void 0 : s10.request, a_(ay, l2, u2 || {})), { data: r11, error: n11 } = await ag(Object.assign(Object.assign({}, c2.webauthn.credential_options), { publicKey: t11, signal: d2 }));
                if (r11) return { data: { factorId: e10, challengeId: c2.id, webauthn: { type: c2.webauthn.type, credential_response: r11 } }, error: null };
                return { data: null, error: n11 };
              }
            }
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            return { data: null, error: new im("Unexpected error in challenge", e11) };
          }
        }
        async _verify({ challengeId: e10, factorId: t10, webauthn: r10 }) {
          return this.client.mfa.verify({ factorId: t10, challengeId: e10, webauthn: r10 });
        }
        async _authenticate({ factorId: e10, webauthn: { rpId: t10, rpOrigins: r10, signal: n10 } = {} }, s10) {
          if (!t10) return { data: null, error: new id("rpId is required for WebAuthn authentication") };
          try {
            1;
            return { data: null, error: new im("Browser does not support WebAuthn", null) };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            return { data: null, error: new im("Unexpected error in authenticate", e11) };
          }
        }
        async _register({ friendlyName: e10, webauthn: { rpId: t10, rpOrigins: r10, signal: n10 } = {} }, s10) {
          if (!t10) return { data: null, error: new id("rpId is required for WebAuthn registration") };
          try {
            1;
            return { data: null, error: new im("Browser does not support WebAuthn", null) };
          } catch (e11) {
            if (ip(e11)) return { data: null, error: e11 };
            return { data: null, error: new im("Unexpected error in register", e11) };
          }
        }
      }
      if ("object" != typeof globalThis) try {
        Object.defineProperty(Object.prototype, "__magic__", { get: function() {
          return this;
        }, configurable: true }), __magic__.globalThis = __magic__, delete Object.prototype.__magic__;
      } catch (e10) {
        "u" > typeof self && (self.globalThis = self);
      }
      let ab = { url: "http://localhost:9999", storageKey: "supabase.auth.token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, headers: il, flowType: "implicit", debug: false, hasCustomAuthorizationHeader: false, throwOnError: false, lockAcquireTimeout: 5e3, skipAutoInitialize: false, experimental: {} }, av = {};
      class ak {
        get jwks() {
          var e10, t10;
          return null != (t10 = null == (e10 = av[this.storageKey]) ? void 0 : e10.jwks) ? t10 : { keys: [] };
        }
        set jwks(e10) {
          av[this.storageKey] = Object.assign(Object.assign({}, av[this.storageKey]), { jwks: e10 });
        }
        get jwks_cached_at() {
          var e10, t10;
          return null != (t10 = null == (e10 = av[this.storageKey]) ? void 0 : e10.cachedAt) ? t10 : Number.MIN_SAFE_INTEGER;
        }
        set jwks_cached_at(e10) {
          av[this.storageKey] = Object.assign(Object.assign({}, av[this.storageKey]), { cachedAt: e10 });
        }
        constructor(e10) {
          var t10, r10;
          this.userStorage = null, this.memoryStorage = null, this.stateChangeEmitters = /* @__PURE__ */ new Map(), this.autoRefreshTicker = null, this.autoRefreshTickTimeout = null, this.visibilityChangedCallback = null, this.refreshingDeferred = null, this.lastRefreshFailure = null, this._sessionRemovalEpoch = 0, this.initializePromise = null, this.detectSessionInUrl = true, this.hasCustomAuthorizationHeader = false, this.suppressGetSessionWarning = false, this.lock = null, this.lockAcquired = false, this.pendingInLock = [], this.broadcastChannel = null, this.logger = console.log;
          const n10 = Object.assign(Object.assign({}, ab), e10);
          this.storageKey = n10.storageKey, this.instanceID = null != (t10 = ak.nextInstanceID[this.storageKey]) ? t10 : 0, ak.nextInstanceID[this.storageKey] = this.instanceID + 1, this.logDebugMessages = !!n10.debug, "function" == typeof n10.debug && (this.logger = n10.debug), this.instanceID, this.persistSession = n10.persistSession, this.autoRefreshToken = n10.autoRefreshToken, this.experimental = null != (r10 = n10.experimental) ? r10 : {}, this.admin = new ar({ url: n10.url, headers: n10.headers, fetch: n10.fetch, experimental: this.experimental }), this.url = n10.url, this.headers = n10.headers, this.fetch = iD(n10.fetch), this.detectSessionInUrl = n10.detectSessionInUrl, this.flowType = n10.flowType, this.hasCustomAuthorizationHeader = n10.hasCustomAuthorizationHeader, this.throwOnError = n10.throwOnError, this.lockAcquireTimeout = n10.lockAcquireTimeout, null != n10.lock && (this.lock = n10.lock), this.jwks || (this.jwks = { keys: [] }, this.jwks_cached_at = Number.MIN_SAFE_INTEGER), this.mfa = { verify: this._verify.bind(this), enroll: this._enroll.bind(this), unenroll: this._unenroll.bind(this), challenge: this._challenge.bind(this), listFactors: this._listFactors.bind(this), challengeAndVerify: this._challengeAndVerify.bind(this), getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this), webauthn: new aw(this) }, this.oauth = { getAuthorizationDetails: this._getAuthorizationDetails.bind(this), approveAuthorization: this._approveAuthorization.bind(this), denyAuthorization: this._denyAuthorization.bind(this), listGrants: this._listOAuthGrants.bind(this), revokeGrant: this._revokeOAuthGrant.bind(this) }, this.passkey = { startRegistration: this._startPasskeyRegistration.bind(this), verifyRegistration: this._verifyPasskeyRegistration.bind(this), startAuthentication: this._startPasskeyAuthentication.bind(this), verifyAuthentication: this._verifyPasskeyAuthentication.bind(this), list: this._listPasskeys.bind(this), update: this._updatePasskey.bind(this), delete: this._deletePasskey.bind(this) }, this.persistSession ? (n10.storage ? this.storage = n10.storage : (this.memoryStorage = {}, this.storage = an(this.memoryStorage)), n10.userStorage && (this.userStorage = n10.userStorage)) : (this.memoryStorage = {}, this.storage = an(this.memoryStorage)), n10.skipAutoInitialize || this.initialize().catch((e11) => {
            this._debug("#initialize()", "error", e11);
          });
        }
        isThrowOnErrorEnabled() {
          return this.throwOnError;
        }
        _returnResult(e10) {
          if (this.throwOnError && e10 && e10.error) throw e10.error;
          return e10;
        }
        _logPrefix() {
          return `GoTrueClient@${this.storageKey}:${this.instanceID} (${io}) ${(/* @__PURE__ */ new Date()).toISOString()}`;
        }
        _debug(...e10) {
          return this.logDebugMessages && this.logger(this._logPrefix(), ...e10), this;
        }
        async initialize() {
          return this.initializePromise || (this.initializePromise = (async () => null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._initialize()) : await this._initialize())()), await this.initializePromise;
        }
        async _initialize() {
          try {
            return await this._recoverAndRefresh(), { error: null };
          } catch (e10) {
            if (ip(e10)) return this._returnResult({ error: e10 });
            return this._returnResult({ error: new im("Unexpected error during initialization", e10) });
          } finally {
            await this._handleVisibilityChange(), this._debug("#_initialize()", "end");
          }
        }
        async signInAnonymously(e10) {
          var t10, r10, n10;
          try {
            let { data: s10, error: i10 } = await i3(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, body: { data: null != (r10 = null == (t10 = null == e10 ? void 0 : e10.options) ? void 0 : t10.data) ? r10 : {}, gotrue_meta_security: { captcha_token: null == (n10 = null == e10 ? void 0 : e10.options) ? void 0 : n10.captchaToken } }, xform: i5 });
            if (i10 || !s10) return this._returnResult({ data: { user: null, session: null }, error: i10 });
            let a10 = s10.session, o2 = s10.user;
            return s10.session && (await this._saveSession(s10.session), await this._notifyAllSubscribers("SIGNED_IN", a10)), this._returnResult({ data: { user: o2, session: a10 }, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signUp(e10) {
          var t10, r10, n10;
          try {
            let s10;
            if ("email" in e10) {
              let { email: r11, password: n11, options: i11 } = e10, a11 = null, o3 = null;
              "pkce" === this.flowType && ([a11, o3] = await iK(this.storage, this.storageKey)), s10 = await i3(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, redirectTo: null == i11 ? void 0 : i11.emailRedirectTo, body: { email: r11, password: n11, data: null != (t10 = null == i11 ? void 0 : i11.data) ? t10 : {}, gotrue_meta_security: { captcha_token: null == i11 ? void 0 : i11.captchaToken }, code_challenge: a11, code_challenge_method: o3 }, xform: i5 });
            } else if ("phone" in e10) {
              let { phone: t11, password: i11, options: a11 } = e10;
              s10 = await i3(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, body: { phone: t11, password: i11, data: null != (r10 = null == a11 ? void 0 : a11.data) ? r10 : {}, channel: null != (n10 = null == a11 ? void 0 : a11.channel) ? n10 : "sms", gotrue_meta_security: { captcha_token: null == a11 ? void 0 : a11.captchaToken } }, xform: i5 });
            } else throw new iv("You must provide either an email or phone number and a password");
            let { data: i10, error: a10 } = s10;
            if (a10 || !i10) return await iq(this.storage, `${this.storageKey}-code-verifier`), this._returnResult({ data: { user: null, session: null }, error: a10 });
            let o2 = i10.session, l2 = i10.user;
            return i10.session && (await this._saveSession(i10.session), await this._notifyAllSubscribers("SIGNED_IN", o2)), this._returnResult({ data: { user: l2, session: o2 }, error: null });
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithPassword(e10) {
          try {
            let t10;
            if ("email" in e10) {
              let { email: r11, password: n11, options: s10 } = e10;
              t10 = await i3(this.fetch, "POST", `${this.url}/token?grant_type=password`, { headers: this.headers, body: { email: r11, password: n11, gotrue_meta_security: { captcha_token: null == s10 ? void 0 : s10.captchaToken } }, xform: i6 });
            } else if ("phone" in e10) {
              let { phone: r11, password: n11, options: s10 } = e10;
              t10 = await i3(this.fetch, "POST", `${this.url}/token?grant_type=password`, { headers: this.headers, body: { phone: r11, password: n11, gotrue_meta_security: { captcha_token: null == s10 ? void 0 : s10.captchaToken } }, xform: i6 });
            } else throw new iv("You must provide either an email or phone number and a password");
            let { data: r10, error: n10 } = t10;
            if (n10) return this._returnResult({ data: { user: null, session: null }, error: n10 });
            if (!r10 || !r10.session || !r10.user) {
              let e11 = new ib();
              return this._returnResult({ data: { user: null, session: null }, error: e11 });
            }
            return r10.session && (await this._saveSession(r10.session), await this._notifyAllSubscribers("SIGNED_IN", r10.session)), this._returnResult({ data: Object.assign({ user: r10.user, session: r10.session }, r10.weak_password ? { weakPassword: r10.weak_password } : null), error: n10 });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithOAuth(e10) {
          var t10, r10, n10, s10;
          return await this._handleProviderSignIn(e10.provider, { redirectTo: null == (t10 = e10.options) ? void 0 : t10.redirectTo, scopes: null == (r10 = e10.options) ? void 0 : r10.scopes, queryParams: null == (n10 = e10.options) ? void 0 : n10.queryParams, skipBrowserRedirect: null == (s10 = e10.options) ? void 0 : s10.skipBrowserRedirect });
        }
        async exchangeCodeForSession(e10) {
          return (await this.initializePromise, null != this.lock) ? this._acquireLock(this.lockAcquireTimeout, async () => this._exchangeCodeForSession(e10)) : this._exchangeCodeForSession(e10);
        }
        async signInWithWeb3(e10) {
          let { chain: t10 } = e10;
          switch (t10) {
            case "ethereum":
              return await this.signInWithEthereum(e10);
            case "solana":
              return await this.signInWithSolana(e10);
            default:
              throw Error(`@supabase/auth-js: Unsupported chain "${t10}"`);
          }
        }
        async signInWithEthereum(e10) {
          var t10, r10, n10, s10, i10, a10, o2, l2, u2, c2, h2, d2;
          let p2, f2;
          if ("message" in e10) p2 = e10.message, f2 = e10.signature;
          else {
            let { chain: c3, wallet: h3, statement: g2, options: m2 } = e10;
            if ("object" != typeof h3 || !(null == m2 ? void 0 : m2.url)) throw Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
            let y2 = new URL(null != (t10 = null == m2 ? void 0 : m2.url) ? t10 : window.location.href), _2 = await h3.request({ method: "eth_requestAccounts" }).then((e11) => e11).catch(() => {
              throw Error("@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid");
            });
            if (!_2 || 0 === _2.length) throw Error("@supabase/auth-js: No accounts available. Please ensure the wallet is connected.");
            let w2 = ai(_2[0]), b2 = null == (r10 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : r10.chainId;
            b2 || (b2 = parseInt(await h3.request({ method: "eth_chainId" }), 16)), p2 = function(e11) {
              var t11;
              let { chainId: r11, domain: n11, expirationTime: s11, issuedAt: i11 = /* @__PURE__ */ new Date(), nonce: a11, notBefore: o3, requestId: l3, resources: u3, scheme: c4, uri: h4, version: d3 } = e11;
              if (!Number.isInteger(r11)) throw Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${r11}`);
              if (!n11) throw Error('@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.');
              if (a11 && a11.length < 8) throw Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${a11}`);
              if (!h4) throw Error('@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.');
              if ("1" !== d3) throw Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${d3}`);
              if (null == (t11 = e11.statement) ? void 0 : t11.includes("\n")) throw Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${e11.statement}`);
              let p3 = ai(e11.address), f3 = c4 ? `${c4}://${n11}` : n11, g3 = e11.statement ? `${e11.statement}
` : "", m3 = `${f3} wants you to sign in with your Ethereum account:
${p3}

${g3}`, y3 = `URI: ${h4}
Version: ${d3}
Chain ID: ${r11}${a11 ? `
Nonce: ${a11}` : ""}
Issued At: ${i11.toISOString()}`;
              if (s11 && (y3 += `
Expiration Time: ${s11.toISOString()}`), o3 && (y3 += `
Not Before: ${o3.toISOString()}`), l3 && (y3 += `
Request ID: ${l3}`), u3) {
                let e12 = "\nResources:";
                for (let t12 of u3) {
                  if (!t12 || "string" != typeof t12) throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${t12}`);
                  e12 += `
- ${t12}`;
                }
                y3 += e12;
              }
              return `${m3}
${y3}`;
            }({ domain: y2.host, address: w2, statement: g2, uri: y2.href, version: "1", chainId: b2, nonce: null == (n10 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : n10.nonce, issuedAt: null != (i10 = null == (s10 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : s10.issuedAt) ? i10 : /* @__PURE__ */ new Date(), expirationTime: null == (a10 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : a10.expirationTime, notBefore: null == (o2 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : o2.notBefore, requestId: null == (l2 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : l2.requestId, resources: null == (u2 = null == m2 ? void 0 : m2.signInWithEthereum) ? void 0 : u2.resources }), f2 = await h3.request({ method: "personal_sign", params: [(d2 = p2, "0x" + Array.from(new TextEncoder().encode(d2), (e11) => e11.toString(16).padStart(2, "0")).join("")), w2] });
          }
          try {
            let { data: t11, error: r11 } = await i3(this.fetch, "POST", `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: "ethereum", message: p2, signature: f2 }, (null == (c2 = e10.options) ? void 0 : c2.captchaToken) ? { gotrue_meta_security: { captcha_token: null == (h2 = e10.options) ? void 0 : h2.captchaToken } } : null), xform: i5 });
            if (r11) throw r11;
            if (!t11 || !t11.session || !t11.user) {
              let e11 = new ib();
              return this._returnResult({ data: { user: null, session: null }, error: e11 });
            }
            return t11.session && (await this._saveSession(t11.session), await this._notifyAllSubscribers("SIGNED_IN", t11.session)), this._returnResult({ data: Object.assign({}, t11), error: r11 });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithSolana(e10) {
          var t10, r10, n10, s10, i10, a10, o2, l2, u2, c2, h2, d2;
          let p2, f2;
          if ("message" in e10) p2 = e10.message, f2 = e10.signature;
          else {
            let { chain: h3, wallet: d3, statement: g2, options: m2 } = e10;
            if ("object" != typeof d3 || !(null == m2 ? void 0 : m2.url)) throw Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
            let y2 = new URL(null != (t10 = null == m2 ? void 0 : m2.url) ? t10 : window.location.href);
            if ("signIn" in d3 && d3.signIn) {
              let e11, t11 = await d3.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, null == m2 ? void 0 : m2.signInWithSolana), { version: "1", domain: y2.host, uri: y2.href }), g2 ? { statement: g2 } : null));
              if (Array.isArray(t11) && t11[0] && "object" == typeof t11[0]) e11 = t11[0];
              else if (t11 && "object" == typeof t11 && "signedMessage" in t11 && "signature" in t11) e11 = t11;
              else throw Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
              if ("signedMessage" in e11 && "signature" in e11 && ("string" == typeof e11.signedMessage || e11.signedMessage instanceof Uint8Array) && e11.signature instanceof Uint8Array) p2 = "string" == typeof e11.signedMessage ? e11.signedMessage : new TextDecoder().decode(e11.signedMessage), f2 = e11.signature;
              else throw Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
            } else {
              if (!("signMessage" in d3) || "function" != typeof d3.signMessage || !("publicKey" in d3) || "object" != typeof d3 || !d3.publicKey || !("toBase58" in d3.publicKey) || "function" != typeof d3.publicKey.toBase58) throw Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
              p2 = [`${y2.host} wants you to sign in with your Solana account:`, d3.publicKey.toBase58(), ...g2 ? ["", g2, ""] : [""], "Version: 1", `URI: ${y2.href}`, `Issued At: ${null != (n10 = null == (r10 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : r10.issuedAt) ? n10 : (/* @__PURE__ */ new Date()).toISOString()}`, ...(null == (s10 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : s10.notBefore) ? [`Not Before: ${m2.signInWithSolana.notBefore}`] : [], ...(null == (i10 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : i10.expirationTime) ? [`Expiration Time: ${m2.signInWithSolana.expirationTime}`] : [], ...(null == (a10 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : a10.chainId) ? [`Chain ID: ${m2.signInWithSolana.chainId}`] : [], ...(null == (o2 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : o2.nonce) ? [`Nonce: ${m2.signInWithSolana.nonce}`] : [], ...(null == (l2 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : l2.requestId) ? [`Request ID: ${m2.signInWithSolana.requestId}`] : [], ...(null == (c2 = null == (u2 = null == m2 ? void 0 : m2.signInWithSolana) ? void 0 : u2.resources) ? void 0 : c2.length) ? ["Resources", ...m2.signInWithSolana.resources.map((e12) => `- ${e12}`)] : []].join("\n");
              let e11 = await d3.signMessage(new TextEncoder().encode(p2), "utf8");
              if (!e11 || !(e11 instanceof Uint8Array)) throw Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
              f2 = e11;
            }
          }
          try {
            let { data: t11, error: r11 } = await i3(this.fetch, "POST", `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: "solana", message: p2, signature: iL(f2) }, (null == (h2 = e10.options) ? void 0 : h2.captchaToken) ? { gotrue_meta_security: { captcha_token: null == (d2 = e10.options) ? void 0 : d2.captchaToken } } : null), xform: i5 });
            if (r11) throw r11;
            if (!t11 || !t11.session || !t11.user) {
              let e11 = new ib();
              return this._returnResult({ data: { user: null, session: null }, error: e11 });
            }
            return t11.session && (await this._saveSession(t11.session), await this._notifyAllSubscribers("SIGNED_IN", t11.session)), this._returnResult({ data: Object.assign({}, t11), error: r11 });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async _exchangeCodeForSession(e10) {
          let t10 = await iM(this.storage, `${this.storageKey}-code-verifier`), [r10, n10] = (null != t10 ? t10 : "").split("/");
          try {
            if (!r10 && "pkce" === this.flowType) throw new iE();
            let { data: t11, error: s10 } = await i3(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, { headers: this.headers, body: { auth_code: e10, code_verifier: r10 }, xform: i5 });
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), s10) throw s10;
            if (!t11 || !t11.session || !t11.user) {
              let e11 = new ib();
              return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: e11 });
            }
            return t11.session && (await this._saveSession(t11.session), await this._notifyAllSubscribers("recovery" === n10 ? "PASSWORD_RECOVERY" : "SIGNED_IN", t11.session)), this._returnResult({ data: Object.assign(Object.assign({}, t11), { redirectType: null != n10 ? n10 : null }), error: s10 });
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithIdToken(e10) {
          try {
            let { options: t10, provider: r10, token: n10, access_token: s10, nonce: i10 } = e10, { data: a10, error: o2 } = await i3(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, { headers: this.headers, body: { provider: r10, id_token: n10, access_token: s10, nonce: i10, gotrue_meta_security: { captcha_token: null == t10 ? void 0 : t10.captchaToken } }, xform: i5 });
            if (o2) return this._returnResult({ data: { user: null, session: null }, error: o2 });
            if (!a10 || !a10.session || !a10.user) {
              let e11 = new ib();
              return this._returnResult({ data: { user: null, session: null }, error: e11 });
            }
            return a10.session && (await this._saveSession(a10.session), await this._notifyAllSubscribers("SIGNED_IN", a10.session)), this._returnResult({ data: a10, error: o2 });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithOtp(e10) {
          var t10, r10, n10, s10, i10;
          try {
            if ("email" in e10) {
              let { email: n11, options: s11 } = e10, i11 = null, a10 = null;
              "pkce" === this.flowType && ([i11, a10] = await iK(this.storage, this.storageKey));
              let { error: o2 } = await i3(this.fetch, "POST", `${this.url}/otp`, { headers: this.headers, body: { email: n11, data: null != (t10 = null == s11 ? void 0 : s11.data) ? t10 : {}, create_user: null == (r10 = null == s11 ? void 0 : s11.shouldCreateUser) || r10, gotrue_meta_security: { captcha_token: null == s11 ? void 0 : s11.captchaToken }, code_challenge: i11, code_challenge_method: a10 }, redirectTo: null == s11 ? void 0 : s11.emailRedirectTo });
              return this._returnResult({ data: { user: null, session: null }, error: o2 });
            }
            if ("phone" in e10) {
              let { phone: t11, options: r11 } = e10, { data: a10, error: o2 } = await i3(this.fetch, "POST", `${this.url}/otp`, { headers: this.headers, body: { phone: t11, data: null != (n10 = null == r11 ? void 0 : r11.data) ? n10 : {}, create_user: null == (s10 = null == r11 ? void 0 : r11.shouldCreateUser) || s10, gotrue_meta_security: { captcha_token: null == r11 ? void 0 : r11.captchaToken }, channel: null != (i10 = null == r11 ? void 0 : r11.channel) ? i10 : "sms" } });
              return this._returnResult({ data: { user: null, session: null, messageId: null == a10 ? void 0 : a10.message_id }, error: o2 });
            }
            throw new iv("You must provide either an email or phone number.");
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async verifyOtp(e10) {
          var t10, r10;
          try {
            let n10, s10;
            "options" in e10 && (n10 = null == (t10 = e10.options) ? void 0 : t10.redirectTo, s10 = null == (r10 = e10.options) ? void 0 : r10.captchaToken);
            let { data: i10, error: a10 } = await i3(this.fetch, "POST", `${this.url}/verify`, { headers: this.headers, body: Object.assign(Object.assign({}, e10), { gotrue_meta_security: { captcha_token: s10 } }), redirectTo: n10, xform: i5 });
            if (a10) throw a10;
            if (!i10) throw Error("An error occurred on token verification.");
            let o2 = i10.session, l2 = i10.user;
            return (null == o2 ? void 0 : o2.access_token) && (await this._saveSession(o2), await this._notifyAllSubscribers("recovery" == e10.type ? "PASSWORD_RECOVERY" : "SIGNED_IN", o2)), this._returnResult({ data: { user: l2, session: o2 }, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async signInWithSSO(e10) {
          var t10, r10, n10, s10;
          try {
            let i10 = null, a10 = null;
            "pkce" === this.flowType && ([i10, a10] = await iK(this.storage, this.storageKey));
            let o2 = await i3(this.fetch, "POST", `${this.url}/sso`, { body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in e10 ? { provider_id: e10.providerId } : null), "domain" in e10 ? { domain: e10.domain } : null), { redirect_to: null != (r10 = null == (t10 = e10.options) ? void 0 : t10.redirectTo) ? r10 : void 0 }), (null == (n10 = null == e10 ? void 0 : e10.options) ? void 0 : n10.captchaToken) ? { gotrue_meta_security: { captcha_token: e10.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: i10, code_challenge_method: a10 }), headers: this.headers, xform: i9 });
            return null == (s10 = o2.data) || s10.url, this._returnResult(o2);
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async reauthenticate() {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._reauthenticate()) : await this._reauthenticate();
        }
        async _reauthenticate() {
          try {
            return await this._useSession(async (e10) => {
              let { data: { session: t10 }, error: r10 } = e10;
              if (r10) throw r10;
              if (!t10) throw new i_();
              let { error: n10 } = await i3(this.fetch, "GET", `${this.url}/reauthenticate`, { headers: this.headers, jwt: t10.access_token });
              return this._returnResult({ data: { user: null, session: null }, error: n10 });
            });
          } catch (e10) {
            if (ip(e10)) return this._returnResult({ data: { user: null, session: null }, error: e10 });
            throw e10;
          }
        }
        async resend(e10) {
          try {
            let t10 = `${this.url}/resend`;
            if ("email" in e10) {
              let { email: r10, type: n10, options: s10 } = e10, i10 = null, a10 = null;
              "pkce" === this.flowType && ([i10, a10] = await iK(this.storage, this.storageKey));
              let { error: o2 } = await i3(this.fetch, "POST", t10, { headers: this.headers, body: { email: r10, type: n10, gotrue_meta_security: { captcha_token: null == s10 ? void 0 : s10.captchaToken }, code_challenge: i10, code_challenge_method: a10 }, redirectTo: null == s10 ? void 0 : s10.emailRedirectTo });
              return o2 && await iq(this.storage, `${this.storageKey}-code-verifier`), this._returnResult({ data: { user: null, session: null }, error: o2 });
            }
            if ("phone" in e10) {
              let { phone: r10, type: n10, options: s10 } = e10, { data: i10, error: a10 } = await i3(this.fetch, "POST", t10, { headers: this.headers, body: { phone: r10, type: n10, gotrue_meta_security: { captcha_token: null == s10 ? void 0 : s10.captchaToken } } });
              return this._returnResult({ data: { user: null, session: null, messageId: null == i10 ? void 0 : i10.message_id }, error: a10 });
            }
            throw new iv("You must provide either an email or phone number and a type");
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async getSession() {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => this._useSession(async (e10) => e10)) : await this._useSession(async (e10) => e10);
        }
        async _acquireLock(e10, t10) {
          this._debug("#_acquireLock", "begin", e10);
          try {
            if (this.lockAcquired) {
              let e11 = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve(), r10 = (async () => (await e11, await t10()))();
              return this.pendingInLock.push((async () => {
                try {
                  await r10;
                } catch (e12) {
                }
              })()), r10;
            }
            return await this.lock(`lock:${this.storageKey}`, e10, async () => {
              this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
              try {
                this.lockAcquired = true;
                let e11 = t10();
                for (this.pendingInLock.push((async () => {
                  try {
                    await e11;
                  } catch (e12) {
                  }
                })()), await e11; this.pendingInLock.length; ) {
                  let e12 = [...this.pendingInLock];
                  await Promise.all(e12), this.pendingInLock.splice(0, e12.length);
                }
                return await e11;
              } finally {
                this._debug("#_acquireLock", "lock released for storage key", this.storageKey), this.lockAcquired = false;
              }
            });
          } finally {
            this._debug("#_acquireLock", "end");
          }
        }
        async _useSession(e10) {
          this._debug("#_useSession", "begin");
          try {
            let t10 = await this.__loadSession();
            return await e10(t10);
          } finally {
            this._debug("#_useSession", "end");
          }
        }
        async __loadSession() {
          this._debug("#__loadSession()", "begin"), null == this.lock || this.lockAcquired || this._debug("#__loadSession()", "used outside of an acquired lock!", Error().stack);
          try {
            let t10 = null, r10 = await iM(this.storage, this.storageKey);
            if (this._debug("#getSession()", "session from storage", r10), null !== r10 && (this._isValidSession(r10) ? t10 = r10 : (this._debug("#getSession()", "session from storage is not valid"), await this._removeSession())), !t10) return { data: { session: null }, error: null };
            let n10 = !!t10.expires_at && 1e3 * t10.expires_at - Date.now() < 9e4;
            if (this._debug("#__loadSession()", `session has${n10 ? "" : " not"} expired`, "expires_at", t10.expires_at), !n10) {
              if (this.userStorage) {
                let e11 = await iM(this.userStorage, this.storageKey + "-user");
                (null == e11 ? void 0 : e11.user) ? t10.user = e11.user : t10.user = iZ();
              }
              if (this.storage.isServer && t10.user && !t10.user.__isUserNotAvailableProxy) {
                var e10;
                let r11 = { value: this.suppressGetSessionWarning };
                t10.user = (e10 = t10.user, new Proxy(e10, { get: (e11, t11, n11) => {
                  if ("__isInsecureUserWarningProxy" === t11) return true;
                  if ("symbol" == typeof t11) {
                    let r12 = t11.toString();
                    if ("Symbol(Symbol.toPrimitive)" === r12 || "Symbol(Symbol.toStringTag)" === r12 || "Symbol(util.inspect.custom)" === r12 || "Symbol(nodejs.util.inspect.custom)" === r12) return Reflect.get(e11, t11, n11);
                  }
                  return r11.value || "string" != typeof t11 || (console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server."), r11.value = true), Reflect.get(e11, t11, n11);
                } })), r11.value && (this.suppressGetSessionWarning = true);
              }
              return { data: { session: t10 }, error: null };
            }
            let { data: s10, error: i10 } = await this._callRefreshToken(t10.refresh_token);
            if (i10) {
              if (t10.expires_at && 1e3 * t10.expires_at > Date.now()) {
                let e11 = await iM(this.storage, this.storageKey);
                if (e11 && e11.refresh_token === t10.refresh_token) return this._returnResult({ data: { session: t10 }, error: null });
              }
              return this._returnResult({ data: { session: null }, error: i10 });
            }
            return this._returnResult({ data: { session: s10 }, error: null });
          } finally {
            this._debug("#__loadSession()", "end");
          }
        }
        async getUser(e10) {
          let t10;
          return e10 ? await this._getUser(e10) : (await this.initializePromise, (t10 = null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._getUser()) : await this._getUser()).data.user && (this.suppressGetSessionWarning = true), t10);
        }
        async _getUser(e10) {
          try {
            if (e10) return await i3(this.fetch, "GET", `${this.url}/user`, { headers: this.headers, jwt: e10, xform: i8 });
            return await this._useSession(async (e11) => {
              var t10, r10, n10;
              let { data: s10, error: i10 } = e11;
              if (i10) throw i10;
              return (null == (t10 = s10.session) ? void 0 : t10.access_token) || this.hasCustomAuthorizationHeader ? await i3(this.fetch, "GET", `${this.url}/user`, { headers: this.headers, jwt: null != (n10 = null == (r10 = s10.session) ? void 0 : r10.access_token) ? n10 : void 0, xform: i8 }) : { data: { user: null }, error: new i_() };
            });
          } catch (e11) {
            if (ip(e11)) return iw(e11) && (await this._removeSession(), await iq(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ data: { user: null }, error: e11 });
            throw e11;
          }
        }
        async updateUser(e10, t10 = {}) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._updateUser(e10, t10)) : await this._updateUser(e10, t10);
        }
        async _updateUser(e10, t10 = {}) {
          try {
            return await this._useSession(async (r10) => {
              let { data: n10, error: s10 } = r10;
              if (s10) throw s10;
              if (!n10.session) throw new i_();
              let i10 = n10.session, a10 = null, o2 = null;
              "pkce" === this.flowType && null != e10.email && ([a10, o2] = await iK(this.storage, this.storageKey));
              let { data: l2, error: u2 } = await i3(this.fetch, "PUT", `${this.url}/user`, { headers: this.headers, redirectTo: null == t10 ? void 0 : t10.emailRedirectTo, body: Object.assign(Object.assign({}, e10), { code_challenge: a10, code_challenge_method: o2 }), jwt: i10.access_token, xform: i8 });
              if (u2) throw u2;
              return i10.user = l2.user, await this._saveSession(i10), await this._notifyAllSubscribers("USER_UPDATED", i10), this._returnResult({ data: { user: i10.user }, error: null });
            });
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null }, error: e11 });
            throw e11;
          }
        }
        async setSession(e10) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._setSession(e10)) : await this._setSession(e10);
        }
        async _setSession(e10) {
          try {
            if (!e10.access_token || !e10.refresh_token) throw new i_();
            let t10 = Date.now() / 1e3, r10 = t10, n10 = true, s10 = null, { payload: i10 } = iH(e10.access_token);
            if (i10.exp && (n10 = (r10 = i10.exp) <= t10), n10) {
              let { data: t11, error: r11 } = await this._callRefreshToken(e10.refresh_token);
              if (r11) return this._returnResult({ data: { user: null, session: null }, error: r11 });
              if (!t11) return { data: { user: null, session: null }, error: null };
              s10 = t11;
            } else {
              let { data: n11, error: i11 } = await this._getUser(e10.access_token);
              if (i11) return this._returnResult({ data: { user: null, session: null }, error: i11 });
              s10 = { access_token: e10.access_token, refresh_token: e10.refresh_token, user: n11.user, token_type: "bearer", expires_in: r10 - t10, expires_at: r10 }, await this._saveSession(s10), await this._notifyAllSubscribers("SIGNED_IN", s10);
            }
            return this._returnResult({ data: { user: s10.user, session: s10 }, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { session: null, user: null }, error: e11 });
            throw e11;
          }
        }
        async refreshSession(e10) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._refreshSession(e10)) : await this._refreshSession(e10);
        }
        async _refreshSession(e10) {
          try {
            return await this._useSession(async (t10) => {
              var r10;
              if (!e10) {
                let { data: n11, error: s11 } = t10;
                if (s11) throw s11;
                e10 = null != (r10 = n11.session) ? r10 : void 0;
              }
              if (!(null == e10 ? void 0 : e10.refresh_token)) throw new i_();
              let { data: n10, error: s10 } = await this._callRefreshToken(e10.refresh_token);
              return s10 ? this._returnResult({ data: { user: null, session: null }, error: s10 }) : n10 ? this._returnResult({ data: { user: n10.user, session: n10 }, error: null }) : this._returnResult({ data: { user: null, session: null }, error: null });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
            throw e11;
          }
        }
        async _getSessionFromURL(e10, t10) {
          try {
            throw new ik("No browser detected.");
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: { session: null, redirectType: null }, error: e11 });
            throw e11;
          }
        }
        _isImplicitGrantCallback(e10) {
          return "function" == typeof this.detectSessionInUrl ? this.detectSessionInUrl(new URL(window.location.href), e10) : !!(e10.access_token || e10.error || e10.error_description || e10.error_code);
        }
        async _isPKCECallback(e10) {
          let t10 = await iM(this.storage, `${this.storageKey}-code-verifier`);
          return !!(e10.code && t10);
        }
        async signOut(e10 = { scope: "global" }) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._signOut(e10)) : await this._signOut(e10);
        }
        async _signOut({ scope: e10 } = { scope: "global" }) {
          return await this._useSession(async (t10) => {
            var r10;
            let { data: n10, error: s10 } = t10;
            if (s10 && !iw(s10)) return this._returnResult({ error: s10 });
            let i10 = null == (r10 = n10.session) ? void 0 : r10.access_token;
            if (i10) {
              let { error: t11 } = await this.admin.signOut(i10, e10);
              if (t11 && !(ip(t11) && "AuthApiError" === t11.name && (404 === t11.status || 401 === t11.status || 403 === t11.status) || iw(t11))) return this._returnResult({ error: t11 });
            }
            return "others" !== e10 && (await this._removeSession(), await iq(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ error: null });
          });
        }
        onAuthStateChange(e10) {
          let t10 = Symbol("auth-callback"), r10 = { id: t10, callback: e10, unsubscribe: () => {
            this._debug("#unsubscribe()", "state change callback with id removed", t10), this.stateChangeEmitters.delete(t10);
          } };
          return this._debug("#onAuthStateChange()", "registered callback with id", t10), this.stateChangeEmitters.set(t10, r10), (async () => {
            await this.initializePromise, null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => {
              this._emitInitialSession(t10);
            }) : await this._emitInitialSession(t10);
          })(), { data: { subscription: r10 } };
        }
        async _emitInitialSession(e10) {
          return await this._useSession(async (t10) => {
            var r10, n10;
            try {
              let { data: { session: n11 }, error: s10 } = t10;
              if (s10) throw s10;
              await (null == (r10 = this.stateChangeEmitters.get(e10)) ? void 0 : r10.callback("INITIAL_SESSION", n11)), this._debug("INITIAL_SESSION", "callback id", e10, "session", n11);
            } catch (t11) {
              await (null == (n10 = this.stateChangeEmitters.get(e10)) ? void 0 : n10.callback("INITIAL_SESSION", null)), this._debug("INITIAL_SESSION", "callback id", e10, "error", t11), iw(t11) ? console.warn(t11) : console.error(t11);
            }
          });
        }
        async resetPasswordForEmail(e10, t10 = {}) {
          let r10 = null, n10 = null;
          "pkce" === this.flowType && ([r10, n10] = await iK(this.storage, this.storageKey, true));
          try {
            return await i3(this.fetch, "POST", `${this.url}/recover`, { body: { email: e10, code_challenge: r10, code_challenge_method: n10, gotrue_meta_security: { captcha_token: t10.captchaToken } }, headers: this.headers, redirectTo: t10.redirectTo });
          } catch (e11) {
            if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async getUserIdentities() {
          var e10;
          try {
            let { data: t10, error: r10 } = await this.getUser();
            if (r10) throw r10;
            return this._returnResult({ data: { identities: null != (e10 = t10.user.identities) ? e10 : [] }, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async linkIdentity(e10) {
          return "token" in e10 ? this.linkIdentityIdToken(e10) : this.linkIdentityOAuth(e10);
        }
        async linkIdentityOAuth(e10) {
          try {
            let { data: t10, error: r10 } = await this._useSession(async (t11) => {
              var r11, n10, s10, i10, a10;
              let { data: o2, error: l2 } = t11;
              if (l2) throw l2;
              let u2 = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, e10.provider, { redirectTo: null == (r11 = e10.options) ? void 0 : r11.redirectTo, scopes: null == (n10 = e10.options) ? void 0 : n10.scopes, queryParams: null == (s10 = e10.options) ? void 0 : s10.queryParams, skipBrowserRedirect: true });
              return await i3(this.fetch, "GET", u2, { headers: this.headers, jwt: null != (a10 = null == (i10 = o2.session) ? void 0 : i10.access_token) ? a10 : void 0 });
            });
            if (r10) throw r10;
            return this._returnResult({ data: { provider: e10.provider, url: null == t10 ? void 0 : t10.url }, error: null });
          } catch (t10) {
            if (ip(t10)) return this._returnResult({ data: { provider: e10.provider, url: null }, error: t10 });
            throw t10;
          }
        }
        async linkIdentityIdToken(e10) {
          return await this._useSession(async (t10) => {
            var r10;
            try {
              let { error: n10, data: { session: s10 } } = t10;
              if (n10) throw n10;
              let { options: i10, provider: a10, token: o2, access_token: l2, nonce: u2 } = e10, { data: c2, error: h2 } = await i3(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, { headers: this.headers, jwt: null != (r10 = null == s10 ? void 0 : s10.access_token) ? r10 : void 0, body: { provider: a10, id_token: o2, access_token: l2, nonce: u2, link_identity: true, gotrue_meta_security: { captcha_token: null == i10 ? void 0 : i10.captchaToken } }, xform: i5 });
              if (h2) return this._returnResult({ data: { user: null, session: null }, error: h2 });
              if (!c2 || !c2.session || !c2.user) return this._returnResult({ data: { user: null, session: null }, error: new ib() });
              return c2.session && (await this._saveSession(c2.session), await this._notifyAllSubscribers("USER_UPDATED", c2.session)), this._returnResult({ data: c2, error: h2 });
            } catch (e11) {
              if (await iq(this.storage, `${this.storageKey}-code-verifier`), ip(e11)) return this._returnResult({ data: { user: null, session: null }, error: e11 });
              throw e11;
            }
          });
        }
        async unlinkIdentity(e10) {
          try {
            return await this._useSession(async (t10) => {
              var r10, n10;
              let { data: s10, error: i10 } = t10;
              if (i10) throw i10;
              return await i3(this.fetch, "DELETE", `${this.url}/user/identities/${e10.identity_id}`, { headers: this.headers, jwt: null != (n10 = null == (r10 = s10.session) ? void 0 : r10.access_token) ? n10 : void 0 });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _refreshAccessToken(e10) {
          let t10 = "#_refreshAccessToken()";
          this._debug(t10, "begin");
          try {
            var r10, n10;
            let s10 = Date.now();
            return await (r10 = async (r11) => (r11 > 0 && await iG(200 * Math.pow(2, r11 - 1)), this._debug(t10, "refreshing attempt", r11), await i3(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, { body: { refresh_token: e10 }, headers: this.headers, xform: i5 })), n10 = (e11, t11) => {
              let r11 = 200 * Math.pow(2, e11);
              return t11 && iT(t11) && Date.now() + r11 - s10 < 3e4;
            }, new Promise((e11, t11) => {
              (async () => {
                for (let s11 = 0; s11 < 1 / 0; s11++) try {
                  let t12 = await r10(s11);
                  if (!n10(s11, null, t12)) return void e11(t12);
                } catch (e12) {
                  if (!n10(s11, e12)) return void t11(e12);
                }
              })();
            }));
          } catch (e11) {
            if (this._debug(t10, "error", e11), ip(e11)) return this._returnResult({ data: { session: null, user: null }, error: e11 });
            throw e11;
          } finally {
            this._debug(t10, "end");
          }
        }
        _isValidSession(e10) {
          return "object" == typeof e10 && null !== e10 && "access_token" in e10 && "refresh_token" in e10 && "expires_at" in e10;
        }
        async _handleProviderSignIn(e10, t10) {
          let r10 = await this._getUrlForProvider(`${this.url}/authorize`, e10, { redirectTo: t10.redirectTo, scopes: t10.scopes, queryParams: t10.queryParams });
          return this._debug("#_handleProviderSignIn()", "provider", e10, "options", t10, "url", r10), { data: { provider: e10, url: r10 }, error: null };
        }
        async _recoverAndRefresh() {
          var e10, t10;
          let r10 = "#_recoverAndRefresh()";
          this._debug(r10, "begin");
          try {
            let n10 = await iM(this.storage, this.storageKey);
            if (n10 && this.userStorage) {
              let t11 = await iM(this.userStorage, this.storageKey + "-user");
              !this.storage.isServer && Object.is(this.storage, this.userStorage) && !t11 && (t11 = { user: n10.user }, await iU(this.userStorage, this.storageKey + "-user", t11)), n10.user = null != (e10 = null == t11 ? void 0 : t11.user) ? e10 : iZ();
            } else if (n10 && !n10.user && !n10.user) {
              let e11 = await iM(this.storage, this.storageKey + "-user");
              e11 && (null == e11 ? void 0 : e11.user) ? (n10.user = e11.user, await iq(this.storage, this.storageKey + "-user"), await iU(this.storage, this.storageKey, n10)) : n10.user = iZ();
            }
            if (this._debug(r10, "session from storage", n10), !this._isValidSession(n10)) {
              this._debug(r10, "session is not valid"), null !== n10 && await this._removeSession();
              return;
            }
            let s10 = (null != (t10 = n10.expires_at) ? t10 : 1 / 0) * 1e3 - Date.now() < 9e4;
            if (this._debug(r10, `session has${s10 ? "" : " not"} expired with margin of 90000s`), s10) {
              if (this.autoRefreshToken && n10.refresh_token) {
                let { error: e11 } = await this._callRefreshToken(n10.refresh_token);
                e11 && (ip(e11) && "AuthRefreshDiscardedError" === e11.name ? this._debug(r10, "refresh discarded by commit guard", e11) : this._debug(r10, "refresh failed", e11));
              }
            } else if (n10.user && true === n10.user.__isUserNotAvailableProxy) try {
              let { data: e11, error: t11 } = await this._getUser(n10.access_token);
              !t11 && (null == e11 ? void 0 : e11.user) ? (n10.user = e11.user, await this._saveSession(n10), await this._notifyAllSubscribers("SIGNED_IN", n10)) : this._debug(r10, "could not get user data, skipping SIGNED_IN notification");
            } catch (e11) {
              console.error("Error getting user data:", e11), this._debug(r10, "error getting user data, skipping SIGNED_IN notification", e11);
            }
            else await this._notifyAllSubscribers("SIGNED_IN", n10);
          } catch (e11) {
            this._debug(r10, "error", e11), console.error(e11);
            return;
          } finally {
            this._debug(r10, "end");
          }
        }
        async _callRefreshToken(e10) {
          var t10, r10;
          if (!e10) throw new i_();
          if (this.refreshingDeferred) return this.refreshingDeferred.promise;
          if (this.lastRefreshFailure && this.lastRefreshFailure.refreshToken === e10 && Date.now() < this.lastRefreshFailure.expiresAt) return this._debug("#_callRefreshToken()", "returning cached failure (cooldown active)"), this.lastRefreshFailure.result;
          let n10 = "#_callRefreshToken()";
          this._debug(n10, "begin");
          try {
            this.refreshingDeferred = new iB();
            let t11 = await iM(this.storage, this.storageKey), { data: r11, error: s10 } = await this._refreshAccessToken(e10);
            if (s10) throw s10;
            if (!r11.session) throw new i_();
            let i10 = await iM(this.storage, this.storageKey);
            if (null !== t11 && (null === i10 || i10.refresh_token !== t11.refresh_token)) {
              this._debug(n10, "commit guard: storage changed since refresh started, discarding rotated tokens", { startedWith: "present", nowHolds: i10 ? "replaced" : "cleared" });
              let e11 = { data: null, error: new iR() };
              return this.refreshingDeferred.resolve(e11), e11;
            }
            let a10 = this._sessionRemovalEpoch;
            if (await this._saveSession(r11.session), this._sessionRemovalEpoch !== a10) {
              this._debug(n10, "commit guard (post-save): _removeSession ran during _saveSession, undoing write"), await iq(this.storage, this.storageKey), this.userStorage && await iq(this.userStorage, this.storageKey + "-user");
              let e11 = { data: null, error: new iR() };
              return this.refreshingDeferred.resolve(e11), e11;
            }
            await this._notifyAllSubscribers("TOKEN_REFRESHED", r11.session);
            let o2 = { data: r11.session, error: null };
            return this.lastRefreshFailure = null, this.refreshingDeferred.resolve(o2), o2;
          } catch (s10) {
            if (this._debug(n10, "error", s10), ip(s10)) {
              let r11 = { data: null, error: s10 };
              if (!iT(s10)) {
                let e11 = await iM(this.storage, this.storageKey);
                (null == e11 ? void 0 : e11.expires_at) && 1e3 * e11.expires_at > Date.now() ? this._debug(n10, "proactive refresh failed, access token still valid \u2014 preserving session") : await this._removeSession();
              }
              return this.lastRefreshFailure = { refreshToken: e10, result: r11, expiresAt: Date.now() + 6e4 }, null == (t10 = this.refreshingDeferred) || t10.resolve(r11), r11;
            }
            throw null == (r10 = this.refreshingDeferred) || r10.reject(s10), s10;
          } finally {
            this.refreshingDeferred = null, this._debug(n10, "end");
          }
        }
        async _notifyAllSubscribers(e10, t10, r10 = true) {
          let n10 = `#_notifyAllSubscribers(${e10})`;
          this._debug(n10, "begin", t10, `broadcast = ${r10}`);
          try {
            this.broadcastChannel && r10 && this.broadcastChannel.postMessage({ event: e10, session: t10 });
            let n11 = [], s10 = Array.from(this.stateChangeEmitters.values()).map(async (r11) => {
              try {
                await r11.callback(e10, t10);
              } catch (e11) {
                n11.push(e11);
              }
            });
            if (await Promise.all(s10), n11.length > 0) {
              for (let e11 = 0; e11 < n11.length; e11 += 1) console.error(n11[e11]);
              throw n11[0];
            }
          } finally {
            this._debug(n10, "end");
          }
        }
        async _saveSession(e10) {
          this._debug("#_saveSession()", e10), this.suppressGetSessionWarning = true, await iq(this.storage, `${this.storageKey}-code-verifier`);
          let t10 = Object.assign({}, e10), r10 = t10.user && true === t10.user.__isUserNotAvailableProxy;
          if (this.userStorage) {
            !r10 && t10.user && await iU(this.userStorage, this.storageKey + "-user", { user: t10.user });
            let e11 = Object.assign({}, t10);
            delete e11.user;
            let n10 = iQ(e11);
            await iU(this.storage, this.storageKey, n10);
          } else {
            let e11 = iQ(t10);
            await iU(this.storage, this.storageKey, e11);
          }
        }
        async _removeSession() {
          this._sessionRemovalEpoch += 1, this._debug("#_removeSession()"), this.lastRefreshFailure = null, this.suppressGetSessionWarning = false, await iq(this.storage, this.storageKey), await iq(this.storage, this.storageKey + "-code-verifier"), await iq(this.storage, this.storageKey + "-user"), this.userStorage && await iq(this.userStorage, this.storageKey + "-user"), await this._notifyAllSubscribers("SIGNED_OUT", null);
        }
        _removeVisibilityChangedCallback() {
          this._debug("#_removeVisibilityChangedCallback()"), this.visibilityChangedCallback, this.visibilityChangedCallback = null;
        }
        async _startAutoRefresh() {
          await this._stopAutoRefresh(), this._debug("#_startAutoRefresh()");
          let e10 = setInterval(() => this._autoRefreshTokenTick(), 3e4);
          this.autoRefreshTicker = e10, e10 && "object" == typeof e10 && "function" == typeof e10.unref ? e10.unref() : "u" > typeof Deno && "function" == typeof Deno.unrefTimer && Deno.unrefTimer(e10);
          let t10 = setTimeout(async () => {
            await this.initializePromise, await this._autoRefreshTokenTick();
          }, 0);
          this.autoRefreshTickTimeout = t10, t10 && "object" == typeof t10 && "function" == typeof t10.unref ? t10.unref() : "u" > typeof Deno && "function" == typeof Deno.unrefTimer && Deno.unrefTimer(t10);
        }
        async _stopAutoRefresh() {
          this._debug("#_stopAutoRefresh()");
          let e10 = this.autoRefreshTicker;
          this.autoRefreshTicker = null, e10 && clearInterval(e10);
          let t10 = this.autoRefreshTickTimeout;
          this.autoRefreshTickTimeout = null, t10 && clearTimeout(t10);
        }
        async startAutoRefresh() {
          this._removeVisibilityChangedCallback(), await this._startAutoRefresh();
        }
        async stopAutoRefresh() {
          this._removeVisibilityChangedCallback(), await this._stopAutoRefresh();
        }
        async dispose() {
          var e10;
          this._removeVisibilityChangedCallback(), await this._stopAutoRefresh(), null == (e10 = this.broadcastChannel) || e10.close(), this.broadcastChannel = null, this.stateChangeEmitters.clear();
        }
        async _autoRefreshTokenTick() {
          if (this._debug("#_autoRefreshTokenTick()", "begin"), null != this.lock) {
            try {
              await this._acquireLock(0, async () => {
                try {
                  let e10 = Date.now();
                  try {
                    return await this._useSession(async (t10) => {
                      let { data: { session: r10 } } = t10;
                      if (!r10 || !r10.refresh_token || !r10.expires_at) return void this._debug("#_autoRefreshTokenTick()", "no session");
                      let n10 = Math.floor((1e3 * r10.expires_at - e10) / 3e4);
                      this._debug("#_autoRefreshTokenTick()", `access token expires in ${n10} ticks, a tick lasts 30000ms, refresh threshold is 3 ticks`), n10 <= 3 && await this._callRefreshToken(r10.refresh_token);
                    });
                  } catch (e11) {
                    console.error("Auto refresh tick failed with error. This is likely a transient error.", e11);
                  }
                } finally {
                  this._debug("#_autoRefreshTokenTick()", "end");
                }
              });
            } catch (e10) {
              if (e10 instanceof as) this._debug("auto refresh token tick lock not available");
              else throw e10;
            }
            return;
          }
          if (null !== this.refreshingDeferred) return void this._debug("#_autoRefreshTokenTick()", "refresh already in flight, skipping");
          try {
            let e10 = Date.now();
            try {
              await this._useSession(async (t10) => {
                let { data: { session: r10 } } = t10;
                if (!r10 || !r10.refresh_token || !r10.expires_at) return void this._debug("#_autoRefreshTokenTick()", "no session");
                let n10 = Math.floor((1e3 * r10.expires_at - e10) / 3e4);
                this._debug("#_autoRefreshTokenTick()", `access token expires in ${n10} ticks, a tick lasts 30000ms, refresh threshold is 3 ticks`), n10 <= 3 && await this._callRefreshToken(r10.refresh_token);
              });
            } catch (e11) {
              console.error("Auto refresh tick failed with error. This is likely a transient error.", e11);
            }
          } finally {
            this._debug("#_autoRefreshTokenTick()", "end");
          }
        }
        async _handleVisibilityChange() {
          return this._debug("#_handleVisibilityChange()"), this.autoRefreshToken && this.startAutoRefresh(), false;
        }
        async _onVisibilityChanged(e10) {
          let t10 = `#_onVisibilityChanged(${e10})`;
          if (this._debug(t10, "visibilityState", document.visibilityState), "visible" === document.visibilityState) {
            if (this.autoRefreshToken && this._startAutoRefresh(), !e10) if (await this.initializePromise, null != this.lock) await this._acquireLock(this.lockAcquireTimeout, async () => {
              "visible" !== document.visibilityState ? this._debug(t10, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting") : await this._recoverAndRefresh();
            });
            else {
              if ("visible" !== document.visibilityState) return void this._debug(t10, "visibilityState is no longer visible, skipping recovery");
              await this._recoverAndRefresh();
            }
          } else "hidden" === document.visibilityState && this.autoRefreshToken && this._stopAutoRefresh();
        }
        async _getUrlForProvider(e10, t10, r10) {
          let n10 = [`provider=${encodeURIComponent(t10)}`];
          if ((null == r10 ? void 0 : r10.redirectTo) && n10.push(`redirect_to=${encodeURIComponent(r10.redirectTo)}`), (null == r10 ? void 0 : r10.scopes) && n10.push(`scopes=${encodeURIComponent(r10.scopes)}`), "pkce" === this.flowType) {
            let [e11, t11] = await iK(this.storage, this.storageKey), r11 = new URLSearchParams({ code_challenge: `${encodeURIComponent(e11)}`, code_challenge_method: `${encodeURIComponent(t11)}` });
            n10.push(r11.toString());
          }
          if (null == r10 ? void 0 : r10.queryParams) {
            let e11 = new URLSearchParams(r10.queryParams);
            n10.push(e11.toString());
          }
          return (null == r10 ? void 0 : r10.skipBrowserRedirect) && n10.push(`skip_http_redirect=${r10.skipBrowserRedirect}`), `${e10}?${n10.join("&")}`;
        }
        async _unenroll(e10) {
          try {
            return await this._useSession(async (t10) => {
              var r10;
              let { data: n10, error: s10 } = t10;
              return s10 ? this._returnResult({ data: null, error: s10 }) : await i3(this.fetch, "DELETE", `${this.url}/factors/${e10.factorId}`, { headers: this.headers, jwt: null == (r10 = null == n10 ? void 0 : n10.session) ? void 0 : r10.access_token });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _enroll(e10) {
          try {
            return await this._useSession(async (t10) => {
              var r10, n10;
              let { data: s10, error: i10 } = t10;
              if (i10) return this._returnResult({ data: null, error: i10 });
              let a10 = Object.assign({ friendly_name: e10.friendlyName, factor_type: e10.factorType }, "phone" === e10.factorType ? { phone: e10.phone } : "totp" === e10.factorType ? { issuer: e10.issuer } : {}), { data: o2, error: l2 } = await i3(this.fetch, "POST", `${this.url}/factors`, { body: a10, headers: this.headers, jwt: null == (r10 = null == s10 ? void 0 : s10.session) ? void 0 : r10.access_token });
              return l2 ? this._returnResult({ data: null, error: l2 }) : ("totp" === e10.factorType && "totp" === o2.type && (null == (n10 = null == o2 ? void 0 : o2.totp) ? void 0 : n10.qr_code) && (o2.totp.qr_code = `data:image/svg+xml;utf-8,${o2.totp.qr_code}`), this._returnResult({ data: o2, error: null }));
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _verify(e10) {
          let t10 = async () => {
            try {
              return await this._useSession(async (t11) => {
                var r10;
                let { data: n10, error: s10 } = t11;
                if (s10) return this._returnResult({ data: null, error: s10 });
                let i10 = Object.assign({ challenge_id: e10.challengeId }, "webauthn" in e10 ? { webauthn: Object.assign(Object.assign({}, e10.webauthn), { credential_response: "create" === e10.webauthn.type ? ah(e10.webauthn.credential_response) : ad(e10.webauthn.credential_response) }) } : { code: e10.code }), { data: a10, error: o2 } = await i3(this.fetch, "POST", `${this.url}/factors/${e10.factorId}/verify`, { body: i10, headers: this.headers, jwt: null == (r10 = null == n10 ? void 0 : n10.session) ? void 0 : r10.access_token });
                return o2 ? this._returnResult({ data: null, error: o2 }) : (await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + a10.expires_in }, a10)), await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", a10), this._returnResult({ data: a10, error: o2 }));
              });
            } catch (e11) {
              if (ip(e11)) return this._returnResult({ data: null, error: e11 });
              throw e11;
            }
          };
          return null != this.lock ? this._acquireLock(this.lockAcquireTimeout, t10) : t10();
        }
        async _challenge(e10) {
          let t10 = async () => {
            try {
              return await this._useSession(async (t11) => {
                var r10;
                let { data: n10, error: s10 } = t11;
                if (s10) return this._returnResult({ data: null, error: s10 });
                let i10 = await i3(this.fetch, "POST", `${this.url}/factors/${e10.factorId}/challenge`, { body: e10, headers: this.headers, jwt: null == (r10 = null == n10 ? void 0 : n10.session) ? void 0 : r10.access_token });
                if (i10.error) return i10;
                let { data: a10 } = i10;
                if ("webauthn" !== a10.type) return { data: a10, error: null };
                switch (a10.webauthn.type) {
                  case "create":
                    return { data: Object.assign(Object.assign({}, a10), { webauthn: Object.assign(Object.assign({}, a10.webauthn), { credential_options: Object.assign(Object.assign({}, a10.webauthn.credential_options), { publicKey: au(a10.webauthn.credential_options.publicKey) }) }) }), error: null };
                  case "request":
                    return { data: Object.assign(Object.assign({}, a10), { webauthn: Object.assign(Object.assign({}, a10.webauthn), { credential_options: Object.assign(Object.assign({}, a10.webauthn.credential_options), { publicKey: ac(a10.webauthn.credential_options.publicKey) }) }) }), error: null };
                }
              });
            } catch (e11) {
              if (ip(e11)) return this._returnResult({ data: null, error: e11 });
              throw e11;
            }
          };
          return null != this.lock ? this._acquireLock(this.lockAcquireTimeout, t10) : t10();
        }
        async _challengeAndVerify(e10) {
          let { data: t10, error: r10 } = await this._challenge({ factorId: e10.factorId });
          return r10 ? this._returnResult({ data: null, error: r10 }) : await this._verify({ factorId: e10.factorId, challengeId: t10.id, code: e10.code });
        }
        async _listFactors() {
          var e10;
          let { data: { user: t10 }, error: r10 } = await this.getUser();
          if (r10) return { data: null, error: r10 };
          let n10 = { all: [], phone: [], totp: [], webauthn: [] };
          for (let r11 of null != (e10 = null == t10 ? void 0 : t10.factors) ? e10 : []) n10.all.push(r11), "verified" === r11.status && n10[r11.factor_type].push(r11);
          return { data: n10, error: null };
        }
        async _getAuthenticatorAssuranceLevel(e10) {
          var t10, r10, n10, s10;
          if (e10) try {
            let { payload: n11 } = iH(e10), s11 = null;
            n11.aal && (s11 = n11.aal);
            let i11 = s11, { data: { user: a11 }, error: o3 } = await this.getUser(e10);
            if (o3) return this._returnResult({ data: null, error: o3 });
            (null != (r10 = null == (t10 = null == a11 ? void 0 : a11.factors) ? void 0 : t10.filter((e11) => "verified" === e11.status)) ? r10 : []).length > 0 && (i11 = "aal2");
            let l3 = n11.amr || [];
            return { data: { currentLevel: s11, nextLevel: i11, currentAuthenticationMethods: l3 }, error: null };
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
          let { data: { session: i10 }, error: a10 } = await this.getSession();
          if (a10) return this._returnResult({ data: null, error: a10 });
          if (!i10) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null };
          let { payload: o2 } = iH(i10.access_token), l2 = null;
          o2.aal && (l2 = o2.aal);
          let u2 = l2;
          return (null != (s10 = null == (n10 = i10.user.factors) ? void 0 : n10.filter((e11) => "verified" === e11.status)) ? s10 : []).length > 0 && (u2 = "aal2"), { data: { currentLevel: l2, nextLevel: u2, currentAuthenticationMethods: o2.amr || [] }, error: null };
        }
        async _getAuthorizationDetails(e10) {
          try {
            return await this._useSession(async (t10) => {
              let { data: { session: r10 }, error: n10 } = t10;
              return n10 ? this._returnResult({ data: null, error: n10 }) : r10 ? await i3(this.fetch, "GET", `${this.url}/oauth/authorizations/${e10}`, { headers: this.headers, jwt: r10.access_token, xform: (e11) => ({ data: e11, error: null }) }) : this._returnResult({ data: null, error: new i_() });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _approveAuthorization(e10, t10) {
          try {
            return await this._useSession(async (t11) => {
              let { data: { session: r10 }, error: n10 } = t11;
              if (n10) return this._returnResult({ data: null, error: n10 });
              if (!r10) return this._returnResult({ data: null, error: new i_() });
              let s10 = await i3(this.fetch, "POST", `${this.url}/oauth/authorizations/${e10}/consent`, { headers: this.headers, jwt: r10.access_token, body: { action: "approve" }, xform: (e11) => ({ data: e11, error: null }) });
              return s10.data && s10.data.redirect_url, s10;
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _denyAuthorization(e10, t10) {
          try {
            return await this._useSession(async (t11) => {
              let { data: { session: r10 }, error: n10 } = t11;
              if (n10) return this._returnResult({ data: null, error: n10 });
              if (!r10) return this._returnResult({ data: null, error: new i_() });
              let s10 = await i3(this.fetch, "POST", `${this.url}/oauth/authorizations/${e10}/consent`, { headers: this.headers, jwt: r10.access_token, body: { action: "deny" }, xform: (e11) => ({ data: e11, error: null }) });
              return s10.data && s10.data.redirect_url, s10;
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _listOAuthGrants() {
          try {
            return await this._useSession(async (e10) => {
              let { data: { session: t10 }, error: r10 } = e10;
              return r10 ? this._returnResult({ data: null, error: r10 }) : t10 ? await i3(this.fetch, "GET", `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: t10.access_token, xform: (e11) => ({ data: e11, error: null }) }) : this._returnResult({ data: null, error: new i_() });
            });
          } catch (e10) {
            if (ip(e10)) return this._returnResult({ data: null, error: e10 });
            throw e10;
          }
        }
        async _revokeOAuthGrant(e10) {
          try {
            return await this._useSession(async (t10) => {
              let { data: { session: r10 }, error: n10 } = t10;
              return n10 ? this._returnResult({ data: null, error: n10 }) : r10 ? (await i3(this.fetch, "DELETE", `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: r10.access_token, query: { client_id: e10.clientId }, noResolveJson: true }), { data: {}, error: null }) : this._returnResult({ data: null, error: new i_() });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async fetchJwk(e10, t10 = { keys: [] }) {
          let r10 = t10.keys.find((t11) => t11.kid === e10);
          if (r10) return r10;
          let n10 = Date.now();
          if ((r10 = this.jwks.keys.find((t11) => t11.kid === e10)) && this.jwks_cached_at + 6e5 > n10) return r10;
          let { data: s10, error: i10 } = await i3(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, { headers: this.headers });
          if (i10) throw i10;
          return s10.keys && 0 !== s10.keys.length && (this.jwks = s10, this.jwks_cached_at = n10, r10 = s10.keys.find((t11) => t11.kid === e10)) ? r10 : null;
        }
        async getClaims(e10, t10 = {}) {
          try {
            let s10, i10 = e10;
            if (!i10) {
              let { data: e11, error: t11 } = await this.getSession();
              if (t11 || !e11.session) return this._returnResult({ data: null, error: t11 });
              i10 = e11.session.access_token;
            }
            let { header: a10, payload: o2, signature: l2, raw: { header: u2, payload: c2 } } = iH(i10);
            if (!(null == t10 ? void 0 : t10.allowExpired)) try {
              var r10, n10 = o2.exp;
              if (!n10) throw Error("Missing exp claim");
              if (n10 <= Math.floor(Date.now() / 1e3)) throw Error("JWT has expired");
            } catch (e11) {
              throw new ix(e11 instanceof Error ? e11.message : "JWT validation failed");
            }
            let h2 = !a10.alg || a10.alg.startsWith("HS") || !a10.kid || !("crypto" in globalThis && "subtle" in globalThis.crypto) ? null : await this.fetchJwk(a10.kid, (null == t10 ? void 0 : t10.keys) ? { keys: t10.keys } : null == t10 ? void 0 : t10.jwks);
            if (!h2) {
              let { error: e11 } = await this.getUser(i10);
              if (e11) throw e11;
              return { data: { claims: o2, header: a10, signature: l2 }, error: null };
            }
            let d2 = function(e11) {
              switch (e11) {
                case "RS256":
                  return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } };
                case "ES256":
                  return { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } };
                default:
                  throw Error("Invalid alg claim");
              }
            }(a10.alg), p2 = await crypto.subtle.importKey("jwk", h2, d2, true, ["verify"]);
            if (!await crypto.subtle.verify(d2, p2, l2, (r10 = `${u2}.${c2}`, s10 = [], !function(e11, t11) {
              for (let r11 = 0; r11 < e11.length; r11 += 1) {
                let n11 = e11.charCodeAt(r11);
                if (n11 > 55295 && n11 <= 56319) {
                  let t12 = (n11 - 55296) * 1024 & 65535;
                  n11 = (e11.charCodeAt(r11 + 1) - 56320 & 65535 | t12) + 65536, r11 += 1;
                }
                !function(e12, t12) {
                  if (e12 <= 127) return t12(e12);
                  if (e12 <= 2047) {
                    t12(192 | e12 >> 6), t12(128 | 63 & e12);
                    return;
                  }
                  if (e12 <= 65535) {
                    t12(224 | e12 >> 12), t12(128 | e12 >> 6 & 63), t12(128 | 63 & e12);
                    return;
                  }
                  if (e12 <= 1114111) {
                    t12(240 | e12 >> 18), t12(128 | e12 >> 12 & 63), t12(128 | e12 >> 6 & 63), t12(128 | 63 & e12);
                    return;
                  }
                  throw Error(`Unrecognized Unicode codepoint: ${e12.toString(16)}`);
                }(n11, t11);
              }
            }(r10, (e11) => s10.push(e11)), new Uint8Array(s10)))) throw new ix("Invalid JWT signature");
            return { data: { claims: o2, header: a10, signature: l2 }, error: null };
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async signInWithPasskey(e10) {
          var t10, r10, n10;
          iY(this.experimental);
          try {
            1;
            return this._returnResult({ data: null, error: new im("Browser does not support WebAuthn", null) });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async registerPasskey(e10) {
          var t10, r10;
          iY(this.experimental);
          try {
            1;
            return this._returnResult({ data: null, error: new im("Browser does not support WebAuthn", null) });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _startPasskeyRegistration() {
          iY(this.experimental);
          try {
            return await this._useSession(async (e10) => {
              let { data: { session: t10 }, error: r10 } = e10;
              if (r10) return this._returnResult({ data: null, error: r10 });
              if (!t10) return this._returnResult({ data: null, error: new i_() });
              let { data: n10, error: s10 } = await i3(this.fetch, "POST", `${this.url}/passkeys/registration/options`, { headers: this.headers, jwt: t10.access_token, body: {} });
              return s10 ? this._returnResult({ data: null, error: s10 }) : this._returnResult({ data: n10, error: null });
            });
          } catch (e10) {
            if (ip(e10)) return this._returnResult({ data: null, error: e10 });
            throw e10;
          }
        }
        async _verifyPasskeyRegistration(e10) {
          iY(this.experimental);
          try {
            return await this._useSession(async (t10) => {
              let { data: { session: r10 }, error: n10 } = t10;
              if (n10) return this._returnResult({ data: null, error: n10 });
              if (!r10) return this._returnResult({ data: null, error: new i_() });
              let { data: s10, error: i10 } = await i3(this.fetch, "POST", `${this.url}/passkeys/registration/verify`, { headers: this.headers, jwt: r10.access_token, body: { challenge_id: e10.challengeId, credential: e10.credential } });
              return i10 ? this._returnResult({ data: null, error: i10 }) : this._returnResult({ data: s10, error: null });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _startPasskeyAuthentication(e10) {
          var t10;
          iY(this.experimental);
          try {
            let { data: r10, error: n10 } = await i3(this.fetch, "POST", `${this.url}/passkeys/authentication/options`, { headers: this.headers, body: { gotrue_meta_security: { captcha_token: null == (t10 = null == e10 ? void 0 : e10.options) ? void 0 : t10.captchaToken } } });
            if (n10) return this._returnResult({ data: null, error: n10 });
            return this._returnResult({ data: r10, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _verifyPasskeyAuthentication(e10) {
          iY(this.experimental);
          try {
            let { data: t10, error: r10 } = await i3(this.fetch, "POST", `${this.url}/passkeys/authentication/verify`, { headers: this.headers, body: { challenge_id: e10.challengeId, credential: e10.credential }, xform: i5 });
            if (r10) return this._returnResult({ data: null, error: r10 });
            return t10.session && (await this._saveSession(t10.session), await this._notifyAllSubscribers("SIGNED_IN", t10.session)), this._returnResult({ data: t10, error: null });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _listPasskeys() {
          iY(this.experimental);
          try {
            return await this._useSession(async (e10) => {
              let { data: { session: t10 }, error: r10 } = e10;
              if (r10) return this._returnResult({ data: null, error: r10 });
              if (!t10) return this._returnResult({ data: null, error: new i_() });
              let { data: n10, error: s10 } = await i3(this.fetch, "GET", `${this.url}/passkeys`, { headers: this.headers, jwt: t10.access_token, xform: (e11) => ({ data: e11, error: null }) });
              return s10 ? this._returnResult({ data: null, error: s10 }) : this._returnResult({ data: n10, error: null });
            });
          } catch (e10) {
            if (ip(e10)) return this._returnResult({ data: null, error: e10 });
            throw e10;
          }
        }
        async _updatePasskey(e10) {
          iY(this.experimental);
          try {
            return await this._useSession(async (t10) => {
              let { data: { session: r10 }, error: n10 } = t10;
              if (n10) return this._returnResult({ data: null, error: n10 });
              if (!r10) return this._returnResult({ data: null, error: new i_() });
              let { data: s10, error: i10 } = await i3(this.fetch, "PATCH", `${this.url}/passkeys/${e10.passkeyId}`, { headers: this.headers, jwt: r10.access_token, body: { friendly_name: e10.friendlyName } });
              return i10 ? this._returnResult({ data: null, error: i10 }) : this._returnResult({ data: s10, error: null });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
        async _deletePasskey(e10) {
          iY(this.experimental);
          try {
            return await this._useSession(async (t10) => {
              let { data: { session: r10 }, error: n10 } = t10;
              if (n10) return this._returnResult({ data: null, error: n10 });
              if (!r10) return this._returnResult({ data: null, error: new i_() });
              let { error: s10 } = await i3(this.fetch, "DELETE", `${this.url}/passkeys/${e10.passkeyId}`, { headers: this.headers, jwt: r10.access_token, noResolveJson: true });
              return s10 ? this._returnResult({ data: null, error: s10 }) : this._returnResult({ data: null, error: null });
            });
          } catch (e11) {
            if (ip(e11)) return this._returnResult({ data: null, error: e11 });
            throw e11;
          }
        }
      }
      ak.nextInstanceID = {};
      let aE = ak, aS = "";
      "u" > typeof Deno ? (aS = "deno", a = null == (ex = Deno.version) ? void 0 : ex.deno) : "u" > typeof document ? aS = "web" : "u" > typeof navigator && "ReactNative" === navigator.product ? aS = "react-native" : (aS = "node", a = "u" > typeof process ? null == (eO = process.version) ? void 0 : eO.replace(/^v/, "") : void 0);
      let aT = [`runtime=${aS}`];
      a && aT.push(`runtime-version=${a}`);
      let aR = { headers: { "X-Client-Info": `supabase-js/2.108.2; ${aT.join("; ")}` } }, aC = { schema: "public" }, ax = { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "implicit" }, aO = {}, aA = { enabled: false, respectSamplingDecision: true }, aP = null;
      function aI(e10) {
        return (aI = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e11) {
          return typeof e11;
        } : function(e11) {
          return e11 && "function" == typeof Symbol && e11.constructor === Symbol && e11 !== Symbol.prototype ? "symbol" : typeof e11;
        })(e10);
      }
      function aN(e10, t10) {
        var r10 = Object.keys(e10);
        if (Object.getOwnPropertySymbols) {
          var n10 = Object.getOwnPropertySymbols(e10);
          t10 && (n10 = n10.filter(function(t11) {
            return Object.getOwnPropertyDescriptor(e10, t11).enumerable;
          })), r10.push.apply(r10, n10);
        }
        return r10;
      }
      function aj(e10) {
        for (var t10 = 1; t10 < arguments.length; t10++) {
          var r10 = null != arguments[t10] ? arguments[t10] : {};
          t10 % 2 ? aN(Object(r10), true).forEach(function(t11) {
            !function(e11, t12, r11) {
              var n10;
              (n10 = function(e12, t13) {
                if ("object" != aI(e12) || !e12) return e12;
                var r12 = e12[Symbol.toPrimitive];
                if (void 0 !== r12) {
                  var n11 = r12.call(e12, t13 || "default");
                  if ("object" != aI(n11)) return n11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === t13 ? String : Number)(e12);
              }(t12, "string"), (t12 = "symbol" == aI(n10) ? n10 : n10 + "") in e11) ? Object.defineProperty(e11, t12, { value: r11, enumerable: true, configurable: true, writable: true }) : e11[t12] = r11;
            }(e10, t11, r10[t11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e10, Object.getOwnPropertyDescriptors(r10)) : aN(Object(r10)).forEach(function(t11) {
            Object.defineProperty(e10, t11, Object.getOwnPropertyDescriptor(r10, t11));
          });
        }
        return e10;
      }
      async function a$(e10, t10, r10) {
        if (!function(e11, t11) {
          let r11;
          if (!e11 || !t11 || 0 === t11.length) return false;
          if (e11 instanceof URL) r11 = e11;
          else try {
            r11 = new URL(e11);
          } catch (e12) {
            return false;
          }
          for (let e12 of t11) try {
            if ("string" == typeof e12) {
              if (function(e13, t12) {
                if (t12 === e13) return true;
                if (t12.startsWith("*.")) {
                  let r12 = t12.slice(2);
                  if (e13.endsWith(r12) && (e13 === r12 || e13.endsWith("." + r12))) return true;
                }
                return false;
              }(r11.hostname, e12)) return true;
            } else if (e12 instanceof RegExp) {
              if (e12.test(r11.hostname)) return true;
            } else if ("function" == typeof e12 && e12(r11)) return true;
          } catch (e13) {
            continue;
          }
          return false;
        }("string" == typeof e10 || e10 instanceof URL ? e10 : e10.url, t10)) return null;
        let n10 = await function() {
          var e11, t11, r11, n11;
          return e11 = this, t11 = void 0, r11 = void 0, n11 = function* () {
            try {
              let e12 = yield (null === aP && (aP = Promise.resolve().then(() => (init_esm(), esm_exports)).catch(() => null)), aP);
              if (!e12 || !e12.propagation || !e12.context) return null;
              let t12 = {};
              e12.propagation.inject(e12.context.active(), t12);
              let r12 = t12.traceparent;
              if (!r12) return null;
              return { traceparent: r12, tracestate: t12.tracestate, baggage: t12.baggage };
            } catch (e12) {
              return null;
            }
          }, new (r11 || (r11 = Promise))(function(s10, i10) {
            function a10(e12) {
              try {
                l2(n11.next(e12));
              } catch (e13) {
                i10(e13);
              }
            }
            function o2(e12) {
              try {
                l2(n11.throw(e12));
              } catch (e13) {
                i10(e13);
              }
            }
            function l2(e12) {
              var t12;
              e12.done ? s10(e12.value) : ((t12 = e12.value) instanceof r11 ? t12 : new r11(function(e13) {
                e13(t12);
              })).then(a10, o2);
            }
            l2((n11 = n11.apply(e11, t11 || [])).next());
          });
        }();
        if (!n10 || !n10.traceparent) return null;
        if (r10) {
          let e11 = function(e12) {
            if (!e12 || "string" != typeof e12) return null;
            let t11 = e12.split("-");
            if (4 !== t11.length) return null;
            let [r11, n11, s10, i10] = t11;
            if (2 !== r11.length || 32 !== n11.length || 16 !== s10.length || 2 !== i10.length) return null;
            let a10 = /^[0-9a-f]+$/i;
            return a10.test(r11) && a10.test(n11) && a10.test(s10) && a10.test(i10) && "00000000000000000000000000000000" !== n11 && "0000000000000000" !== s10 ? { version: r11, traceId: n11, parentId: s10, traceFlags: i10, isSampled: (1 & parseInt(i10, 16)) == 1 } : null;
          }(n10.traceparent);
          if (e11 && !e11.isSampled) return null;
        }
        return n10;
      }
      function aL(e10) {
        return "boolean" == typeof e10 ? { enabled: e10 } : e10;
      }
      var aD = class extends aE {
        constructor(e10) {
          super(e10);
        }
      }, aU = class {
        constructor(e10, t10, r10) {
          var n10, s10, i10;
          this.supabaseUrl = e10, this.supabaseKey = t10;
          const a10 = function(e11) {
            let t11 = null == e11 ? void 0 : e11.trim();
            if (!t11) throw Error("supabaseUrl is required.");
            if (!t11.match(/^https?:\/\//i)) throw Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
            try {
              return new URL(t11.endsWith("/") ? t11 : t11 + "/");
            } catch (e12) {
              throw Error("Invalid supabaseUrl: Provided URL is malformed.");
            }
          }(e10);
          if (!t10) throw Error("supabaseKey is required.");
          this.realtimeUrl = new URL("realtime/v1", a10), this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws"), this.authUrl = new URL("auth/v1", a10), this.storageUrl = new URL("storage/v1", a10), this.functionsUrl = new URL("functions/v1", a10);
          const o2 = `sb-${a10.hostname.split(".")[0]}-auth-token`, l2 = function(e11, t11) {
            var r11, n11, s11, i11, a11, o3;
            let { db: l3, auth: u2, realtime: c2, global: h2 } = e11, { db: d2, auth: p2, realtime: f2, global: g2 } = t11, m2 = aL(e11.tracePropagation), y2 = aL(t11.tracePropagation), _2 = { db: aj(aj({}, d2), l3), auth: aj(aj({}, p2), u2), realtime: aj(aj({}, f2), c2), storage: {}, global: aj(aj(aj({}, g2), h2), {}, { headers: aj(aj({}, null != (r11 = null == g2 ? void 0 : g2.headers) ? r11 : {}), null != (n11 = null == h2 ? void 0 : h2.headers) ? n11 : {}) }), tracePropagation: { enabled: null != (s11 = null != (i11 = null == m2 ? void 0 : m2.enabled) ? i11 : null == y2 ? void 0 : y2.enabled) && s11, respectSamplingDecision: null == (a11 = null != (o3 = null == m2 ? void 0 : m2.respectSamplingDecision) ? o3 : null == y2 ? void 0 : y2.respectSamplingDecision) || a11 }, accessToken: async () => "" };
            return e11.accessToken ? _2.accessToken = e11.accessToken : delete _2.accessToken, _2;
          }(null != r10 ? r10 : {}, { db: aC, realtime: aO, auth: aj(aj({}, ax), {}, { storageKey: o2 }), global: aR, tracePropagation: aA });
          this.settings = l2, this.storageKey = null != (n10 = l2.auth.storageKey) ? n10 : "", this.headers = null != (s10 = l2.global.headers) ? s10 : {}, l2.accessToken ? (this.accessToken = l2.accessToken, this.auth = new Proxy({}, { get: (e11, t11) => {
            throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t11)} is not possible`);
          } })) : this.auth = this._initSupabaseAuthClient(null != (i10 = l2.auth) ? i10 : {}, this.headers, l2.global.fetch), this.fetch = ((e11, t11, r11, n11, s11) => {
            let i11 = n11 ? (...e12) => n11(...e12) : (...e12) => fetch(...e12), a11 = Headers, o3 = (null == s11 ? void 0 : s11.enabled) === true, l3 = (null == s11 ? void 0 : s11.respectSamplingDecision) !== false, u2 = o3 ? function(e12) {
              let t12 = [];
              try {
                let r12 = new URL(e12);
                t12.push(r12.hostname);
              } catch (e13) {
              }
              return t12.push("*.supabase.co", "*.supabase.in"), t12.push("localhost", "127.0.0.1", "[::1]"), t12;
            }(t11) : null;
            return async (t12, n12) => {
              var s12;
              let o4 = null != (s12 = await r11()) ? s12 : e11, c2 = new a11(null == n12 ? void 0 : n12.headers);
              if (c2.has("apikey") || c2.set("apikey", e11), c2.has("Authorization") || c2.set("Authorization", `Bearer ${o4}`), u2) {
                let e12 = await a$(t12, u2, l3);
                e12 && (e12.traceparent && !c2.has("traceparent") && c2.set("traceparent", e12.traceparent), e12.tracestate && !c2.has("tracestate") && c2.set("tracestate", e12.tracestate), e12.baggage && !c2.has("baggage") && c2.set("baggage", e12.baggage));
              }
              return i11(t12, aj(aj({}, n12), {}, { headers: c2 }));
            };
          })(t10, e10, this._getAccessToken.bind(this), l2.global.fetch, l2.tracePropagation), this.realtime = this._initRealtimeClient(aj({ headers: this.headers, accessToken: this._getAccessToken.bind(this), fetch: this.fetch }, l2.realtime)), this.accessToken && Promise.resolve(this.accessToken()).then((e11) => this.realtime.setAuth(e11)).catch((e11) => console.warn("Failed to set initial Realtime auth token:", e11)), this.rest = new nF(new URL("rest/v1", a10).href, { headers: this.headers, schema: l2.db.schema, fetch: this.fetch, timeout: l2.db.timeout, urlLengthLimit: l2.db.urlLengthLimit }), this.storage = new ia(this.storageUrl.href, this.headers, this.fetch, null == r10 ? void 0 : r10.storage), l2.accessToken || this._listenForAuthEvents();
        }
        get functions() {
          return new nA(this.functionsUrl.href, { headers: this.headers, customFetch: this.fetch });
        }
        from(e10) {
          return this.rest.from(e10);
        }
        schema(e10) {
          return this.rest.schema(e10);
        }
        rpc(e10, t10 = {}, r10 = { head: false, get: false, count: void 0 }) {
          return this.rest.rpc(e10, t10, r10);
        }
        channel(e10, t10 = { config: {} }) {
          return this.realtime.channel(e10, t10);
        }
        getChannels() {
          return this.realtime.getChannels();
        }
        removeChannel(e10) {
          return this.realtime.removeChannel(e10);
        }
        removeAllChannels() {
          return this.realtime.removeAllChannels();
        }
        async _getAccessToken() {
          var e10, t10;
          if (this.accessToken) return await this.accessToken();
          let { data: r10 } = await this.auth.getSession();
          return null != (e10 = null == (t10 = r10.session) ? void 0 : t10.access_token) ? e10 : this.supabaseKey;
        }
        _initSupabaseAuthClient({ autoRefreshToken: e10, persistSession: t10, detectSessionInUrl: r10, storage: n10, userStorage: s10, storageKey: i10, flowType: a10, lock: o2, debug: l2, throwOnError: u2, experimental: c2, lockAcquireTimeout: h2, skipAutoInitialize: d2 }, p2, f2) {
          let g2 = { Authorization: `Bearer ${this.supabaseKey}`, apikey: `${this.supabaseKey}` };
          return new aD({ url: this.authUrl.href, headers: aj(aj({}, g2), p2), storageKey: i10, autoRefreshToken: e10, persistSession: t10, detectSessionInUrl: r10, storage: n10, userStorage: s10, flowType: a10, lock: o2, debug: l2, throwOnError: u2, experimental: c2, fetch: f2, lockAcquireTimeout: h2, skipAutoInitialize: d2, hasCustomAuthorizationHeader: Object.keys(this.headers).some((e11) => "authorization" === e11.toLowerCase()) });
        }
        _initRealtimeClient(e10) {
          return new sC(this.realtimeUrl.href, aj(aj({}, e10), {}, { params: aj(aj({}, { apikey: this.supabaseKey }), null == e10 ? void 0 : e10.params) }));
        }
        _listenForAuthEvents() {
          return this.auth.onAuthStateChange((e10, t10) => {
            this._handleTokenChanged(e10, "CLIENT", null == t10 ? void 0 : t10.access_token);
          });
        }
        _handleTokenChanged(e10, t10, r10) {
          ("TOKEN_REFRESHED" === e10 || "SIGNED_IN" === e10) && this.changedAccessToken !== r10 ? (this.changedAccessToken = r10, this.realtime.setAuth(r10)) : "SIGNED_OUT" === e10 && (this.realtime.setAuth(), "STORAGE" == t10 && this.auth.signOut(), this.changedAccessToken = void 0);
        }
      };
      let aM = (e10, t10, r10) => new aU(e10, t10, r10);
      (function() {
        let e10 = globalThis.process;
        if (!e10) return false;
        let t10 = e10.version;
        if (null == t10) return false;
        let r10 = t10.match(/^v(\d+)\./);
        return !!r10 && 18 >= parseInt(r10[1], 10);
      })() && console.warn("\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217");
      var aq = e.i(399929);
      let aB = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 3456e4 }, aH = /^(.*)[.](0|[1-9][0-9]*)$/;
      function aG(e10, t10) {
        if (e10 === t10) return true;
        let r10 = e10.match(aH);
        return !!r10 && r10[1] === t10;
      }
      function aF(e10, t10, r10) {
        let n10 = r10 ?? 3180, s10 = encodeURIComponent(t10);
        if (s10.length <= n10) return [{ name: e10, value: t10 }];
        let i10 = [];
        for (; s10.length > 0; ) {
          let e11 = s10.slice(0, n10), t11 = e11.lastIndexOf("%");
          t11 > n10 - 3 && (e11 = e11.slice(0, t11));
          let r11 = "";
          for (; e11.length > 0; ) try {
            r11 = decodeURIComponent(e11);
            break;
          } catch (t12) {
            if (t12 instanceof URIError && "%" === e11.at(-3) && e11.length > 3) e11 = e11.slice(0, e11.length - 3);
            else throw t12;
          }
          i10.push(r11), s10 = s10.slice(e11.length);
        }
        return i10.map((t11, r11) => ({ name: `${e10}.${r11}`, value: t11 }));
      }
      async function aW(e10, t10) {
        let r10 = await t10(e10);
        if (r10) return r10;
        let n10 = [];
        for (let r11 = 0; ; r11++) {
          let s10 = `${e10}.${r11}`, i10 = await t10(s10);
          if (!i10) break;
          n10.push(i10);
        }
        return n10.length > 0 ? n10.join("") : null;
      }
      aq.parse, aq.serialize;
      let az = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split(""), aK = " 	\n\r=".split(""), aV = (() => {
        let e10 = Array(128);
        for (let t10 = 0; t10 < e10.length; t10 += 1) e10[t10] = -1;
        for (let t10 = 0; t10 < aK.length; t10 += 1) e10[aK[t10].charCodeAt(0)] = -2;
        for (let t10 = 0; t10 < az.length; t10 += 1) e10[az[t10].charCodeAt(0)] = t10;
        return e10;
      })();
      function aJ(e10) {
        let t10 = [], r10 = 0, n10 = 0;
        if (function(e11, t11) {
          for (let r11 = 0; r11 < e11.length; r11 += 1) {
            let n11 = e11.charCodeAt(r11);
            if (n11 > 55295 && n11 <= 56319) {
              let t12 = (n11 - 55296) * 1024 & 65535;
              n11 = (e11.charCodeAt(r11 + 1) - 56320 & 65535 | t12) + 65536, r11 += 1;
            }
            !function(e12, t12) {
              if (e12 <= 127) return t12(e12);
              if (e12 <= 2047) {
                t12(192 | e12 >> 6), t12(128 | 63 & e12);
                return;
              }
              if (e12 <= 65535) {
                t12(224 | e12 >> 12), t12(128 | e12 >> 6 & 63), t12(128 | 63 & e12);
                return;
              }
              if (e12 <= 1114111) {
                t12(240 | e12 >> 18), t12(128 | e12 >> 12 & 63), t12(128 | e12 >> 6 & 63), t12(128 | 63 & e12);
                return;
              }
              throw Error(`Unrecognized Unicode codepoint: ${e12.toString(16)}`);
            }(n11, t11);
          }
        }(e10, (e11) => {
          for (r10 = r10 << 8 | e11, n10 += 8; n10 >= 6; ) {
            let e12 = r10 >> n10 - 6 & 63;
            t10.push(az[e12]), n10 -= 6;
          }
        }), n10 > 0) for (r10 <<= 6 - n10, n10 = 6; n10 >= 6; ) {
          let e11 = r10 >> n10 - 6 & 63;
          t10.push(az[e11]), n10 -= 6;
        }
        return t10.join("");
      }
      let aX = "base64-";
      function aY(e10) {
        let t10;
        if (!e10.startsWith(aX)) return e10;
        try {
          t10 = function(e11) {
            let t11 = [], r10 = (e12) => {
              t11.push(String.fromCodePoint(e12));
            }, n10 = { utf8seq: 0, codepoint: 0 }, s10 = 0, i10 = 0;
            for (let t12 = 0; t12 < e11.length; t12 += 1) {
              let a10 = aV[e11.charCodeAt(t12)];
              if (a10 > -1) for (s10 = s10 << 6 | a10, i10 += 6; i10 >= 8; ) (function(e12, t13, r11) {
                if (0 === t13.utf8seq) {
                  if (e12 <= 127) return r11(e12);
                  for (let r12 = 1; r12 < 6; r12 += 1) if ((e12 >> 7 - r12 & 1) == 0) {
                    t13.utf8seq = r12;
                    break;
                  }
                  if (2 === t13.utf8seq) t13.codepoint = 31 & e12;
                  else if (3 === t13.utf8seq) t13.codepoint = 15 & e12;
                  else if (4 === t13.utf8seq) t13.codepoint = 7 & e12;
                  else throw Error("Invalid UTF-8 sequence");
                  t13.utf8seq -= 1;
                } else if (t13.utf8seq > 0) {
                  if (e12 <= 127) throw Error("Invalid UTF-8 sequence");
                  t13.codepoint = t13.codepoint << 6 | 63 & e12, t13.utf8seq -= 1, 0 === t13.utf8seq && r11(t13.codepoint);
                }
              })(s10 >> i10 - 8 & 255, n10, r10), i10 -= 8;
              else if (-2 === a10) continue;
              else throw Error(`Invalid Base64-URL character "${e11.at(t12)}" at position ${t12}`);
            }
            return t11.join("");
          }(e10.substring(aX.length));
        } catch (e11) {
          return console.warn("@supabase/ssr: could not base64url-decode chunked cookie value, treating as absent. Cookie chunks may have been written partially across responses.", e11), null;
        }
        try {
          JSON.parse(t10);
        } catch {
          return console.warn("@supabase/ssr: chunked cookie decoded to invalid JSON, treating as absent. This usually indicates that cookie chunks from different writes were combined (e.g. response committed before all Set-Cookie headers were sent)."), null;
        }
        return t10;
      }
      async function aZ({ getAll: e10, setAll: t10, setItems: r10, removedItems: n10 }, s10) {
        let i10 = s10.cookieEncoding, a10 = s10.cookieOptions ?? null, o2 = await e10([...r10 ? Object.keys(r10) : [], ...n10 ? Object.keys(n10) : []]), l2 = o2?.map(({ name: e11 }) => e11) || [], u2 = Object.keys(n10).flatMap((e11) => l2.filter((t11) => aG(t11, e11))), c2 = Object.keys(r10).flatMap((e11) => {
          let t11 = new Set(l2.filter((t12) => aG(t12, e11))), n11 = r10[e11];
          "base64url" === i10 && (n11 = aX + aJ(n11));
          let s11 = aF(e11, n11);
          return s11.forEach((e12) => {
            t11.delete(e12.name);
          }), u2.push(...t11), s11;
        }), h2 = { ...aB, ...a10, maxAge: 0 }, d2 = { ...aB, ...a10, maxAge: aB.maxAge };
        delete h2.name, delete d2.name;
        let p2 = h2.domain && u2.length > 0 ? (() => {
          let { domain: e11, ...t11 } = h2;
          return t11;
        })() : null;
        await t10([...u2.map((e11) => ({ name: e11, value: "", options: h2 })), ...p2 ? u2.map((e11) => ({ name: e11, value: "", options: p2 })) : [], ...c2.map(({ name: e11, value: t11 }) => ({ name: e11, value: t11, options: d2 }))], { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" });
      }
      let aQ = false, a0 = ["@supabase/auth-helpers-nextjs", "@supabase/auth-helpers-react", "@supabase/auth-helpers-remix", "@supabase/auth-helpers-sveltekit"];
      function a1(e10, t10, r10) {
        if (!function() {
          if (aQ || "u" < typeof process || !process.env?.npm_package_name) return;
          let e11 = process.env.npm_package_name;
          a0.includes(e11) && (aQ = true, console.warn(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551 \u26A0\uFE0F  IMPORTANT: Package Consolidation Notice                                \u2551
\u2551                                                                            \u2551
\u2551 The ${e11.padEnd(35)} package name is deprecated.  \u2551
\u2551                                                                            \u2551
\u2551 You are now using @supabase/ssr - a unified solution for all frameworks.  \u2551
\u2551                                                                            \u2551
\u2551 The auth-helpers packages have been consolidated into @supabase/ssr       \u2551
\u2551 to provide better maintenance and consistent APIs across frameworks.      \u2551
\u2551                                                                            \u2551
\u2551 Please update your package.json to use @supabase/ssr directly:            \u2551
\u2551   npm uninstall ${e11.padEnd(42)} \u2551
\u2551   npm install @supabase/ssr                                               \u2551
\u2551                                                                            \u2551
\u2551 For more information, visit:                                              \u2551
\u2551 https://supabase.com/docs/guides/auth/server-side                         \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
    `));
        }(), !e10 || !t10) throw Error(`Your project's URL and Key are required to create a Supabase client!

Check your Supabase project's API settings to find these values

https://supabase.com/dashboard/project/_/settings/api`);
        let { storage: n10, getAll: s10, setAll: i10, setItems: a10, removedItems: o2 } = function(e11, t11) {
          let r11, n11, s11 = e11.cookies ?? null, i11 = e11.cookieEncoding, a11 = {}, o3 = {}, l3 = () => {
            let e12 = (0, aq.parse)(document.cookie);
            return Object.keys(e12).map((t12) => ({ name: t12, value: e12[t12] ?? "" }));
          }, u2 = (e12) => {
            e12.forEach(({ name: e13, value: t12, options: r12 }) => {
              document.cookie = (0, aq.serialize)(e13, t12, r12);
            });
          };
          if (s11) if ("get" in s11) {
            let e12 = async (e13) => {
              let t12 = e13.flatMap((e14) => [e14, ...Array.from({ length: 5 }).map((t13, r13) => `${e14}.${r13}`)]), r12 = [];
              for (let e14 = 0; e14 < t12.length; e14 += 1) {
                let n12 = await s11.get(t12[e14]);
                (n12 || "string" == typeof n12) && r12.push({ name: t12[e14], value: n12 });
              }
              return r12;
            };
            if (r11 = async (t12) => await e12(t12), "set" in s11 && "remove" in s11) n11 = async (e13) => {
              for (let t12 = 0; t12 < e13.length; t12 += 1) {
                let { name: r12, value: n12, options: i12 } = e13[t12];
                n12 ? await s11.set(r12, n12, i12) : await s11.remove(r12, i12);
              }
            };
            else if (t11) n11 = async () => {
              console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
            };
            else throw Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
          } else if ("getAll" in s11) if (r11 = async () => await s11.getAll(), "setAll" in s11) n11 = s11.setAll;
          else if (t11) n11 = async () => {
            console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
          };
          else throw Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
          else if (t11 || 1) throw Error(`@supabase/ssr: ${t11 ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).`);
          else r11 = () => l3(), n11 = u2;
          else if (t11 || 1) if (t11) throw Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
          else r11 = () => [], n11 = () => {
            throw Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
          };
          else r11 = () => l3(), n11 = u2;
          return t11 ? { getAll: r11, setAll: n11, setItems: a11, removedItems: o3, storage: { isServer: true, getItem: async (e12) => {
            if ("string" == typeof a11[e12]) return a11[e12];
            if (o3[e12]) return null;
            let t12 = await r11([e12]), n12 = await aW(e12, async (e13) => {
              let r12 = t12?.find(({ name: t13 }) => t13 === e13) || null;
              return r12 ? r12.value : null;
            });
            return n12 ? "string" != typeof n12 ? n12 : aY(n12) : null;
          }, setItem: async (t12, s12) => {
            t12.endsWith("-code-verifier") && await aZ({ getAll: r11, setAll: n11, setItems: { [t12]: s12 }, removedItems: {} }, { cookieOptions: e11?.cookieOptions ?? null, cookieEncoding: i11 }), a11[t12] = s12, delete o3[t12];
          }, removeItem: async (e12) => {
            delete a11[e12], o3[e12] = true;
          } } } : { getAll: r11, setAll: n11, setItems: a11, removedItems: o3, storage: { isServer: false, getItem: async (e12) => {
            let t12 = await r11([e12]), n12 = await aW(e12, async (e13) => {
              let r12 = t12?.find(({ name: t13 }) => t13 === e13) || null;
              return r12 ? r12.value : null;
            });
            return n12 ? aY(n12) : null;
          }, setItem: async (t12, s12) => {
            let a12 = await r11([t12]), o4 = new Set((a12?.map(({ name: e12 }) => e12) || []).filter((e12) => aG(e12, t12))), l4 = s12;
            "base64url" === i11 && (l4 = aX + aJ(s12));
            let u3 = aF(t12, l4);
            u3.forEach(({ name: e12 }) => {
              o4.delete(e12);
            });
            let c2 = { ...aB, ...e11?.cookieOptions, maxAge: 0 }, h2 = { ...aB, ...e11?.cookieOptions, maxAge: aB.maxAge };
            delete c2.name, delete h2.name;
            let d2 = c2.domain ? (() => {
              let { domain: e12, ...t13 } = c2;
              return t13;
            })() : null, p2 = [...[...o4].map((e12) => ({ name: e12, value: "", options: c2 })), ...d2 ? [...o4].map((e12) => ({ name: e12, value: "", options: d2 })) : [], ...u3.map(({ name: e12, value: t13 }) => ({ name: e12, value: t13, options: h2 }))];
            p2.length > 0 && await n11(p2, {});
          }, removeItem: async (t12) => {
            let s12 = await r11([t12]), i12 = (s12?.map(({ name: e12 }) => e12) || []).filter((e12) => aG(e12, t12));
            if (0 === i12.length) return;
            let a12 = { ...aB, ...e11?.cookieOptions, maxAge: 0 };
            delete a12.name;
            let o4 = i12.map((e12) => ({ name: e12, value: "", options: a12 }));
            if (a12.domain) {
              let { domain: e12, ...t13 } = a12;
              o4.push(...i12.map((e13) => ({ name: e13, value: "", options: t13 })));
            }
            await n11(o4, {});
          } } };
        }({ ...r10, cookieEncoding: r10?.cookieEncoding ?? "base64url" }, true), l2 = aM(e10, t10, { ...r10, global: { ...r10?.global, headers: { ...r10?.global?.headers, "X-Client-Info": "supabase-ssr/0.12.0 createServerClient" } }, auth: { ...r10?.cookieOptions?.name ? { storageKey: r10.cookieOptions.name } : null, ...r10?.auth, flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false, persistSession: true, skipAutoInitialize: true, storage: n10, ...r10?.cookies && "encode" in r10.cookies && "tokens-only" === r10.cookies.encode ? { userStorage: r10?.auth?.userStorage ?? /* @__PURE__ */ function(e11 = {}) {
          return { getItem: (t11) => e11[t11] || null, setItem: (t11, r11) => {
            e11[t11] = r11;
          }, removeItem: (t11) => {
            delete e11[t11];
          } };
        }() } : null } });
        return l2.auth.onAuthStateChange(async (e11) => {
          (Object.keys(a10).length > 0 || Object.keys(o2).length > 0) && ("SIGNED_IN" === e11 || "TOKEN_REFRESHED" === e11 || "USER_UPDATED" === e11 || "PASSWORD_RECOVERY" === e11 || "SIGNED_OUT" === e11 || "MFA_CHALLENGE_VERIFIED" === e11) && await aZ({ getAll: s10, setAll: i10, setItems: a10, removedItems: o2 }, { cookieOptions: r10?.cookieOptions ?? null, cookieEncoding: r10?.cookieEncoding ?? "base64url" });
        }), l2;
      }
      let a2 = process.env.NEXT_PUBLIC_GLITCHTIP_DSN ?? "https://beff674f32d350fe882f0d8a1c75566a@o4511701230747648.ingest.de.sentry.io/4511701234483280", a3 = [];
      function a4() {
        let e10 = a3[a3.length - 1];
        return e10 || { extras: {}, tags: {}, user: null };
      }
      async function a5(e10) {
        try {
          let t10 = process.env.NEXT_PUBLIC_GLITCHTIP_DSN ?? "https://beff674f32d350fe882f0d8a1c75566a@o4511701230747648.ingest.de.sentry.io/4511701234483280";
          if (!t10) return;
          let r10 = new URL(t10), n10 = r10.pathname.replace("/", "");
          r10.username;
          let s10 = r10.hostname, i10 = r10.protocol, a10 = r10.port ? `:${r10.port}` : "", o2 = `${i10}//${s10}${a10}/api/${n10}/envelope/`, l2 = JSON.stringify({ event_id: e10.eventId, dsn: t10, sent_at: (/* @__PURE__ */ new Date()).toISOString(), sdk: { name: "klarpakke-sentry", version: "1.0.0" } }), u2 = JSON.stringify({ type: "event", content_type: "application/json" }), c2 = JSON.stringify({ event_id: e10.eventId, timestamp: e10.timestamp, level: e10.level, logger: "hermes", message: e10.message || e10.logentry, exception: e10.exception ? { values: [e10.exception] } : void 0, tags: e10.tags || {}, extra: e10.extra || {}, user: e10.user || {}, logentry: e10.logentry, platform: "javascript", sdk: { name: "klarpakke-sentry", version: "1.0.0" } }), h2 = `${l2}
${u2}
${c2}`;
          await fetch(o2, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: h2 });
        } catch {
        }
      }
      var a6 = ((ew = {}).GOOGLE_OAUTH_FAILED = "auth:google:oauth_failed", ew.GOOGLE_OAUTH_CANCELLED = "auth:google:cancelled", ew.GOOGLE_OAUTH_POPUP_BLOCKED = "auth:google:popup_blocked", ew.MICROSOFT_OAUTH_FAILED = "auth:microsoft:oauth_failed", ew.LINKEDIN_OAUTH_FAILED = "auth:linkedin:oauth_failed", ew.VIPPS_OAUTH_FAILED = "auth:vipps:oauth_failed", ew.PKCE_EXCHANGE_FAILED = "auth:pkce:exchange_failed", ew.PKCE_CODE_MISSING = "auth:pkce:code_missing", ew.PKCE_VERIFIER_MISSING = "auth:pkce:verifier_missing", ew.CALLBACK_ERROR = "auth:callback:error", ew.SESSION_INVALID = "auth:session:invalid", ew.SESSION_EXPIRED = "auth:session:expired", ew.SESSION_REFRESH_FAILED = "auth:session:refresh_failed", ew.REFRESH_TOKEN_FAILED = "auth:session:refresh_token_failed", ew.EMAIL_LOGIN_FAILED = "auth:email:login_failed", ew.EMAIL_SIGNUP_FAILED = "auth:email:signup_failed", ew.PASSWORD_RESET_FAILED = "auth:password:reset_failed", ew.INVALID_RESET_TOKEN = "auth:password:invalid_token", ew.MAGIC_LINK_FAILED = "auth:magic_link:failed", ew.CONFIG_MISSING = "auth:config:missing", ew.CONFIG_INVALID = "auth:config:invalid", ew.UNKNOWN = "auth:unknown", ew);
      function a8(e10, t10, r10 = {}) {
        let n10 = t10 instanceof Error ? t10.message : String(t10), s10 = t10 instanceof Error ? t10.stack : void 0, i10 = Error(`[${e10}] ${n10}`);
        s10 && (i10.stack = s10), function(e11, t11) {
          let r11 = a4(), n11 = { ...r11.extras, ...t11?.extra }, s11 = { ...r11.tags, ...t11?.tags }, i11 = r11.level ?? "error", a10 = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
          if (!a2) {
            let t12;
            return t12 = { type: "exception", level: i11, data: e11, ...{ extras: n11, tags: s11 }, user: a4().user, timestamp: (/* @__PURE__ */ new Date()).toISOString() }, "fatal" === i11 || "error" === i11 ? console.error("[GlitchTip]", t12) : "warning" === i11 && console.warn("[GlitchTip]", t12);
          }
          a5({ eventId: a10, timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: i11, message: e11 instanceof Error ? e11.message : String(e11), exception: { type: e11 instanceof Error ? e11.constructor.name : "Error", value: e11 instanceof Error ? e11.message : String(e11), stacktrace: e11 instanceof Error ? e11.stack : void 0 }, tags: { ...s11 }, extra: { ...n11 }, user: a4().user });
        }(i10, { tags: { auth_code: e10, auth_provider: r10.provider || "unknown", auth_method: r10.method || "unknown", locale: r10.locale || "no" }, extra: { ...r10, originalError: n10 } });
      }
      (eb = {}).LOGIN_STARTED = "auth:login:started", eb.LOGIN_SUCCESS = "auth:login:success", eb.LOGIN_FAILED = "auth:login:failed", eb.LOGOUT = "auth:logout", eb.SIGNUP_STARTED = "auth:signup:started", eb.SIGNUP_SUCCESS = "auth:signup:success", eb.SESSION_REFRESHED = "auth:session:refreshed", eb.MAGIC_LINK_SENT = "auth:magic_link:sent", eb.PASSWORD_RESET_REQUESTED = "auth:password:reset_requested", eb.PASSWORD_RESET_STARTED = "auth:password:reset_started", eb.PASSWORD_RESET_SUCCESS = "auth:password:reset_success";
      let a9 = /* @__PURE__ */ new Map();
      function a7(e10) {
        return a9.has(e10) || a9.set(e10, { locked: false, promise: null, lastResult: null, lastFailureAt: 0, failureCount: 0 }), a9.get(e10);
      }
      function oe(e10) {
        return new Response(e10.body, { status: e10.status, headers: { "content-type": "application/json" } });
      }
      async function ot(e10, t10, r10, n10, s10) {
        if (n10.lastResult) return oe(n10.lastResult);
        n10.locked = true, n10.lastResult = null;
        let i10 = e10(t10, r10).then(async (e11) => {
          let t11 = await e11.text();
          return e11.status >= 400 ? (n10.failureCount++, n10.lastFailureAt = Date.now(), t11.includes("Already Used") || a8(a6.REFRESH_TOKEN_FAILED, Error(`Refresh status ${e11.status}`), { ...s10, attemptCount: n10.failureCount, body: t11.slice(0, 200) }), { ok: false, status: e11.status, body: t11 }) : (n10.failureCount = 0, n10.lastResult = { ok: true, status: e11.status, body: t11 }, n10.lastResult);
        }).catch((e11) => (n10.failureCount++, n10.lastFailureAt = Date.now(), a8(a6.REFRESH_TOKEN_FAILED, e11, s10), { ok: false, status: 503, body: JSON.stringify({ error: e11.message }) })).finally(() => {
          n10.locked = false, setTimeout(() => {
            n10.lastResult = null;
          }, 2e3);
        });
        return n10.promise = i10, oe(await i10);
      }
      function or(e10) {
        let t10 = e10.headers.get("host") || "", r10 = t10.startsWith("www.") ? t10.replace("www.", "") : t10;
        return r10.includes(":") ? void 0 : `.${r10}`;
      }
      function on(e10, t10) {
        var r10, n10;
        let s10 = or(e10), i10 = e10.headers.get("host") || "", a10 = !(i10.startsWith("localhost") || i10.startsWith("127.0.0.1")), o2 = "https://pskhryjzkobytnfwucrb.supabase.co".trim(), l2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2hyeWp6a29ieXRuZnd1Y3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzI4NTcsImV4cCI6MjA5NzQ0ODg1N30.SAcjagaGKL_m8wk-wmu12PplGMCKVhdeMFHMkAdwUgI".trim();
        if (!o2 || !l2) throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
        return a1(o2, l2, { cookieEncoding: "raw", cookies: { getAll: () => e10.cookies.getAll(), setAll(e11) {
          e11.forEach(({ name: e12, value: r11, options: n11 }) => {
            t10.cookies.set(e12, r11, { ...n11, path: "/", sameSite: "lax", secure: a10, domain: s10 });
          });
        } }, global: { fetch: (r10 = globalThis.fetch, n10 = { source: "middleware", path: e10.nextUrl.pathname }, async (e11, t11) => {
          if (!String(e11).includes("grant_type=refresh_token")) return r10(e11, t11);
          let s11 = n10.userId || `${n10.source}:global`, i11 = a7(s11);
          if (function(e12) {
            let t12 = a7(e12);
            if (t12.failureCount >= 3) {
              if (Date.now() - t12.lastFailureAt < 3e4) return true;
              t12.failureCount = 0;
            }
            return false;
          }(s11)) return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Refresh rate limited by client circuit breaker" }), { status: 400, headers: { "content-type": "application/json" } });
          if ("browser" === n10.source && "u" > typeof navigator && navigator.locks) return navigator.locks.request("sb-auth-token-refresh-lock", { ifAvailable: false }, async () => ot(r10, e11, t11, i11, n10));
          if (i11.locked && i11.promise) {
            try {
              await Promise.race([i11.promise, new Promise((e12, t12) => setTimeout(() => t12(Error("Timeout")), 1e4))]);
            } catch {
            }
            if (i11.lastResult) return oe(i11.lastResult);
          }
          return ot(r10, e11, t11, i11, n10);
        }) } });
      }
      function os(e10, t10, r10, n10) {
        let s10 = eD.redirect(e10, n10);
        s10.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate"), s10.headers.set("CDN-Cache-Control", "no-store, max-age=0");
        let i10 = or(t10), a10 = t10.headers.get("host") || "", o2 = !(a10.startsWith("localhost") || a10.startsWith("127.0.0.1"));
        return r10.cookies.getAll().forEach((e11) => {
          s10.cookies.set(e11.name, e11.value, { path: "/", domain: i10, sameSite: "lax", secure: o2, httpOnly: true });
        }), t10.cookies.getAll().forEach((e11) => {
          (e11.name.includes("sb-") || e11.name.includes("auth-token")) && (s10.cookies.get(e11.name) || s10.cookies.set(e11.name, e11.value, { path: "/", domain: i10, sameSite: "lax", secure: o2, httpOnly: true }));
        }), s10;
      }
      class oi extends Error {
        constructor(...e10) {
          super(...e10), this.code = "NEXT_STATIC_GEN_BAILOUT";
        }
      }
      class oa extends Error {
        constructor(e10, t10) {
          super(`During prerendering, ${t10} rejects when the prerender is complete. Typically these errors are handled by React but if you move ${t10} to a different context by using \`setTimeout\`, \`after\`, or similar functions you may observe this error and you should handle it in that context. This occurred at route "${e10}".`), this.route = e10, this.expression = t10, this.digest = "HANGING_PROMISE_REJECTION";
        }
      }
      let oo = /* @__PURE__ */ new WeakMap();
      function ol() {
      }
      let ou = { current: null }, oc = "function" == typeof rD.cache ? rD.cache : (e10) => e10, oh = console.warn;
      function od(e10) {
        return function(...t10) {
          oh(e10(...t10));
        };
      }
      oc((e10) => {
        try {
          oh(ou.current);
        } finally {
          ou.current = null;
        }
      });
      let op = /* @__PURE__ */ new WeakMap();
      function of(e10) {
        let t10 = op.get(e10);
        if (t10) return t10;
        let r10 = Promise.resolve(e10);
        return op.set(e10, r10), r10;
      }
      od(function(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`cookies()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E830", enumerable: false, configurable: true });
      }), /* @__PURE__ */ new WeakMap(), od(function(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`headers()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E836", enumerable: false, configurable: true });
      }), /* @__PURE__ */ new WeakMap(), od(function(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`draftMode()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E835", enumerable: false, configurable: true });
      });
      let og = ["/dashboard", "/innstillinger", "/admin", "/checkout", "/akademi", "/handel", "/konto", "/leagues", "/copy-trading", "/marketplace", "/profile", "/trade"];
      async function om(e10, t10) {
        let { pathname: r10 } = e10.nextUrl, { locale: n10, strippedPath: s10 } = nk(r10), i10 = s10.startsWith("/onboarding");
        if (!og.some((e11) => s10 === e11 || s10.startsWith(`${e11}/`)) && !i10) return null;
        let a10 = on(e10, t10), { data: { user: o2 } } = await a10.auth.getUser();
        if (!o2) return null;
        let l2 = e10.cookies.get("kp_onboarding_status")?.value === "completed";
        if (!l2) try {
          let { data: r11 } = await a10.from("user_profiles").select("onboarding_completed, setup_completed_at").eq("id", o2.id).maybeSingle();
          if (r11 && (true === r11.onboarding_completed || null != r11.setup_completed_at) && (l2 = true), l2) {
            let r12, n11, s11 = e10.headers.get("host") || "", i11 = s11.startsWith("localhost") || s11.startsWith("127.0.0.1");
            t10.cookies.set("kp_onboarding_status", "completed", { path: "/", maxAge: 2592e3, sameSite: "lax", secure: !i11, ...i11 ? {} : { domain: (n11 = (r12 = e10.headers.get("host") || "").startsWith("www.") ? r12.replace("www.", "") : r12).includes(":") ? void 0 : `.${n11}` } });
          }
        } catch (e11) {
          console.error("Error checking onboarding status:", e11);
        }
        return i10 && l2 ? os(new URL(nv(n10, "/dashboard"), e10.url), e10, t10) : null;
      }
      let oy = ["student", "bachelor", "master", "phd", "professor"], o_ = { student: 0, bachelor: 1, master: 2, phd: 3, professor: 4 }, ow = [{ path: "/trade", minLevel: 1, requireQuery: { mode: "live" } }, { path: "/dashboard/bots", minLevel: 2 }], ob = "kp_tier";
      async function ov(e10, t10, r10) {
        var n10, s10;
        let { pathname: i10, searchParams: a10 } = e10.nextUrl, { locale: o2, strippedPath: l2 } = nk(i10), u2 = ow.find((e11) => function(e12, t11, r11) {
          if (!(t11 === e12.path || t11.startsWith(`${e12.path}/`))) return false;
          if ("requireQuery" in e12 && e12.requireQuery) {
            for (let [t12, n11] of Object.entries(e12.requireQuery)) if (r11.get(t12) !== n11) return false;
          }
          return true;
        }(e11, l2, a10));
        if (!u2) return null;
        let c2 = e10.cookies.get(ob)?.value;
        if (!c2) {
          let s11 = on(e10, t10), { data: i11 } = await s11.from("user_profiles").select("tier").eq("id", r10).maybeSingle();
          c2 = (n10 = i11?.tier) && oy.includes(n10) ? n10 : "student";
          let a11 = e10.headers.get("host") || "", o3 = a11.startsWith("localhost") || a11.startsWith("127.0.0.1");
          t10.cookies.set(ob, c2, { path: "/", maxAge: 3600, sameSite: "lax", secure: !o3, httpOnly: true, ...o3 ? {} : { domain: or(e10) } });
        }
        if (s10 = c2, (oy.includes(s10) ? o_[s10] : 0) < u2.minLevel) {
          let r11 = new URL(`/${o2}/priser`, e10.url);
          return r11.searchParams.set("upgrade", "true"), os(r11, e10, t10);
        }
        return null;
      }
      async function ok(e10) {
        let t10 = new TextEncoder(), r10 = await crypto.subtle.digest("SHA-256", t10.encode(e10));
        return crypto.subtle.importKey("raw", r10, "AES-GCM", false, ["encrypt", "decrypt"]);
      }
      async function oE(e10, t10) {
        try {
          if (!e10.startsWith("v1.")) return null;
          let r10 = new Uint8Array(function(e11) {
            let t11 = e11.replace(/-/g, "+").replace(/_/g, "/"), r11 = atob(t11.padEnd(t11.length + (4 - t11.length % 4) % 4, "=")), n11 = new Uint8Array(r11.length);
            for (let e12 = 0; e12 < r11.length; e12++) n11[e12] = r11.charCodeAt(e12);
            return n11.buffer;
          }(e10.slice(3)));
          if (r10.length < 13) return null;
          let n10 = r10.slice(0, 12), s10 = r10.slice(12), i10 = await ok(t10), a10 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: n10 }, i10, s10), o2 = new TextDecoder();
          return JSON.parse(o2.decode(a10));
        } catch {
          return null;
        }
      }
      let oS = ["/dashboard", "/innstillinger", "/settings", "/admin", "/checkout", "/akademi", "/handel", "/konto", "/leagues", "/copy-trading", "/marketplace", "/profile", "/trade"], oT = ["/login", "/register", "/registrer", "/glemt-passord"], oR = "__impersonate", oC = "__impersonation_banner";
      function ox(e10) {
        if (e10) try {
          let [t10] = new URL(e10).hostname.split(".");
          return t10;
        } catch {
          return;
        }
      }
      async function oO(e10) {
        try {
          let t10 = function() {
            let e11 = "https://pskhryjzkobytnfwucrb.supabase.co".trim(), t11 = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
            if (!e11 || !t11) throw Error("Missing Supabase environment variables");
            return aM(e11, t11, { auth: { persistSession: false, autoRefreshToken: false } });
          }(), { data: r10, error: n10 } = await t10.from("support_impersonation_sessions").select("id, expires_at, ended_at, revoked_at").eq("token_jti", e10.jti).eq("target_user_id", e10.targetUserId).maybeSingle();
          if (n10 || !r10 || r10.ended_at || r10.revoked_at || new Date(r10.expires_at) <= /* @__PURE__ */ new Date()) return null;
          let { data: s10 } = await t10.from("user_profiles").select("email, display_name").eq("id", e10.targetUserId).maybeSingle();
          return { targetUserId: e10.targetUserId, targetEmail: s10?.email ?? void 0, targetDisplayName: s10?.display_name ?? void 0, expiresAt: e10.expiresAt };
        } catch (e11) {
          return console.warn("[middleware] Impersonation session validation failed:", e11), null;
        }
      }
      function oA(e10, t10) {
        var r10;
        let n10, s10 = or(e10);
        t10.cookies.set(oR, "", { maxAge: 0, path: "/", domain: s10, httpOnly: true, secure: true, sameSite: "lax" }), t10.cookies.set(oC, "", { maxAge: 0, path: "/", domain: s10, httpOnly: false, secure: true, sameSite: "lax" });
        let { locale: i10 } = nk(e10.nextUrl.pathname);
        return r10 = new URL(nv(i10, "/admin/support/impersonate"), e10.url), (n10 = eD.redirect(r10, 302)).headers.set("Cache-Control", "no-store, max-age=0, must-revalidate"), n10.headers.set("CDN-Cache-Control", "no-store, max-age=0"), n10;
      }
      async function oP(e10, t10) {
        let r10;
        t10 = t10 ?? eD.next();
        let n10 = e10.nextUrl.pathname, { strippedPath: s10 } = nk(n10);
        if ("/callback" === s10) {
          e10.nextUrl.searchParams.get("code");
          let r11 = e10.nextUrl.searchParams.get("error"), i11 = nk(n10).locale;
          return r11 && console.error(`[Auth Callback] OAuth error: ${r11}`, { locale: i11, path: s10, referer: e10.headers.get("referer") }), t10;
        }
        if (s10.startsWith("/api")) return t10;
        let i10 = oS.some((e11) => s10.startsWith(e11)), a10 = oT.some((e11) => s10 === e11 || s10.startsWith(`${e11}/`)), o2 = s10.startsWith("/onboarding"), l2 = (r10 = s10.split("?")[0] ?? s10, !!nE.has(r10) || [...nE].some((e11) => "/login" !== e11 && r10.startsWith(`${e11}/`))), u2 = nk(n10).locale;
        if (!(i10 || a10 || l2 || o2)) return t10;
        let c2 = null, h2 = e10.cookies.get(oR);
        if (h2?.value) {
          var d2, p2;
          let r11, n11, s11, i11, a11, o3, l3, u3, f3, g3 = process.env.IMPERSONATION_SECRET;
          if (!g3) return console.warn("[middleware] IMPERSONATION_SECRET missing \u2014 rejecting impersonation"), oA(e10, t10);
          let m2 = await oE(h2.value, g3);
          if (!m2) return console.warn("[middleware] Failed to decrypt impersonation cookie"), oA(e10, t10);
          let y2 = await oO(m2);
          if (!y2) return console.warn("[middleware] Invalid or expired impersonation session"), oA(e10, t10);
          d2 = m2, p2 = y2, i11 = (r11 = ox(s11 = "https://pskhryjzkobytnfwucrb.supabase.co")) ? `sb-${r11}-auth-token` : "sb-auth-token", a11 = (n11 = ox(s11)) ? `sb-${n11}-refresh-token` : "sb-refresh-token", o3 = function(e11) {
            try {
              let t11 = JSON.parse(atob(e11.split(".")[1]));
              return "number" == typeof t11.exp ? t11.exp : null;
            } catch {
              return null;
            }
          }(d2.accessToken), l3 = Math.floor(Date.now() / 1e3), f3 = Math.max(0, (u3 = o3 ?? l3 + 3600) - l3), c2 = { authCookies: [{ name: i11, value: JSON.stringify({ access_token: d2.accessToken, refresh_token: d2.refreshToken, expires_at: u3, expires_in: f3, token_type: "bearer" }) }, { name: a11, value: d2.refreshToken }], banner: p2 };
          let _2 = or(e10), w2 = Math.max(0, Math.floor(new Date(y2.expiresAt).getTime() / 1e3) - Math.floor(Date.now() / 1e3));
          for (let e11 of c2.authCookies) t10.cookies.set(e11.name, e11.value, { httpOnly: true, secure: true, sameSite: "none", domain: _2, path: "/" });
          t10.cookies.set(oC, JSON.stringify(c2.banner), { httpOnly: false, secure: true, sameSite: "lax", domain: _2, path: "/", maxAge: w2 });
        }
        let f2 = function(e11, t11, r11) {
          let n11 = "https://pskhryjzkobytnfwucrb.supabase.co".trim(), s11 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2hyeWp6a29ieXRuZnd1Y3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzI4NTcsImV4cCI6MjA5NzQ0ODg1N30.SAcjagaGKL_m8wk-wmu12PplGMCKVhdeMFHMkAdwUgI".trim();
          if (e11 && t11) {
            let i11, a11, o3 = (a11 = (i11 = e11.headers.get("host") || "").startsWith("www.") ? i11.replace("www.", "") : i11).includes(":") ? void 0 : `.${a11}`, l3 = e11.headers.get("host") || "", u3 = !(l3.startsWith("localhost") || l3.startsWith("127.0.0.1"));
            return a1(n11, s11, { cookieEncoding: "raw", cookies: { getAll: () => {
              let t12 = e11.cookies.getAll();
              if (!r11 || 0 === r11.length) return t12;
              let n12 = {};
              for (let e12 of r11) n12[e12.name] = true;
              return [...t12.filter((e12) => !n12[e12.name] && !e12.name.startsWith("sb-") && "__impersonation_banner" !== e12.name && "__impersonate" !== e12.name), ...r11];
            }, setAll: (e12) => {
              e12.forEach((e13) => {
                let { name: r12, value: n12, options: s12 } = e13;
                t11.cookies.set(r12, n12, { ...s12, path: "/", domain: o3, sameSite: "lax", secure: u3 });
              });
            } }, global: { fetch: globalThis.fetch } });
          }
          return (async () => {
            let e12 = await function e13() {
              let t12 = "cookies", r12 = eX.getStore(), n12 = tT.getStore();
              if (r12) {
                let l3;
                if (n12 && "after" === n12.phase && (null == (l3 = tU.getStore()) ? void 0 : l3.rootTaskSpawnPhase) !== "action") throw Object.defineProperty(Error(`Route ${r12.route} used \`cookies()\` inside \`after()\`. This is not supported. If you need this data inside an \`after()\` callback, use \`cookies()\` outside of the callback. See more info here: https://nextjs.org/docs/canary/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", { value: "E843", enumerable: false, configurable: true });
                if (r12.forceStatic) return of(eZ.seal(new eA.RequestCookies(new Headers({}))));
                if (r12.dynamicShouldError) throw Object.defineProperty(new oi(`Route ${r12.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`cookies()\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", { value: "E849", enumerable: false, configurable: true });
                if (n12) switch (n12.type) {
                  case "cache":
                    let u3 = Object.defineProperty(Error(`Route ${r12.route} used \`cookies()\` inside "use cache". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`cookies()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E831", enumerable: false, configurable: true });
                    throw Error.captureStackTrace(u3, e13), r12.invalidDynamicUsageError ??= u3, u3;
                  case "unstable-cache":
                    throw Object.defineProperty(Error(`Route ${r12.route} used \`cookies()\` inside a function cached with \`unstable_cache()\`. Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`cookies()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", { value: "E846", enumerable: false, configurable: true });
                  case "generate-static-params":
                    throw Object.defineProperty(Error(`Route ${r12.route} used \`cookies()\` inside \`generateStaticParams\`. This is not supported because \`generateStaticParams\` runs at build time without an HTTP request. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context`), "__NEXT_ERROR_CODE", { value: "E1123", enumerable: false, configurable: true });
                  case "prerender":
                    var s12, i11, a11 = r12, o3 = n12;
                    let c3 = op.get(o3);
                    if (c3) return c3;
                    let h3 = function(e14, t13, r13) {
                      if (e14.aborted) return Promise.reject(new oa(t13, r13));
                      {
                        let n13 = new Promise((n14, s13) => {
                          let i12 = s13.bind(null, new oa(t13, r13)), a12 = oo.get(e14);
                          if (a12) a12.push(i12);
                          else {
                            let t14 = [i12];
                            oo.set(e14, t14), e14.addEventListener("abort", () => {
                              for (let e15 = 0; e15 < t14.length; e15++) t14[e15]();
                            }, { once: true });
                          }
                        });
                        return n13.catch(ol), n13;
                      }
                    }(o3.renderSignal, a11.route, "`cookies()`");
                    return op.set(o3, h3), h3;
                  case "prerender-client":
                  case "validation-client":
                    let d3 = "`cookies`";
                    throw Object.defineProperty(new tR(`${d3} must not be used within a Client Component. Next.js should be preventing ${d3} from being included in Client Components statically, but did not in this case.`), "__NEXT_ERROR_CODE", { value: "E1037", enumerable: false, configurable: true });
                  case "prerender-ppr":
                    return s12 = r12.route, i11 = n12.dynamicTracking, void (function() {
                      if (!rM) throw Object.defineProperty(Error("Invariant: React.unstable_postpone is not defined. This suggests the wrong version of React was loaded. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E224", enumerable: false, configurable: true });
                    }(), i11 && i11.dynamicAccesses.push({ stack: i11.isDebugDynamicAccesses ? Error().stack : void 0, expression: t12 }), rD.default.unstable_postpone(rq(s12, t12)));
                  case "prerender-legacy":
                    let p3 = Object.defineProperty(new rU(`Route ${r12.route} couldn't be rendered statically because it used \`${t12}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", { value: "E558", enumerable: false, configurable: true });
                    throw n12.revalidate = 0, r12.dynamicUsageDescription = t12, r12.dynamicUsageStack = p3.stack, p3;
                  case "prerender-runtime":
                    return function(e14, t13) {
                      let { stagedRendering: r13 } = e14;
                      return r13 ? r13.waitForStage(r13.currentStage === tC.EarlyStatic || r13.currentStage === tC.EarlyRuntime ? tC.EarlyRuntime : tC.Runtime).then(() => t13) : t13;
                    }(n12, of(n12.cookies));
                  case "private-cache":
                    return of(n12.cookies);
                  case "request":
                    let f3;
                    if (!function(e14) {
                      switch (e14.type) {
                        case "cache":
                        case "unstable-cache":
                        case "private-cache":
                          return;
                      }
                    }(n12), f3 = e1(n12) ? n12.userspaceMutableCookies : n12.cookies, !n12.asyncApiPromises) return of(f3);
                    {
                      let e14, t13 = !!(e14 = n12.stagedRendering) && (e14.currentStage === tC.EarlyStatic || e14.currentStage === tC.EarlyRuntime);
                      if (f3 === n12.mutableCookies) return t13 ? n12.asyncApiPromises.earlyMutableCookies : n12.asyncApiPromises.mutableCookies;
                      return t13 ? n12.asyncApiPromises.earlyCookies : n12.asyncApiPromises.cookies;
                    }
                }
              }
              throw Object.defineProperty(Error(`\`${t12}\` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context`), "__NEXT_ERROR_CODE", { value: "E251", enumerable: false, configurable: true });
            }();
            return a1(n11, s11, { cookieEncoding: "raw", auth: { autoRefreshToken: false }, cookies: { getAll: () => e12.getAll(), setAll: (t12) => {
              try {
                t12.forEach((t13) => {
                  let { name: r12, value: n12, options: s12 } = t13;
                  e12.set(r12, n12, s12);
                });
              } catch (e13) {
                console.warn("[RSC] Failed to persist refreshed auth cookies:", e13);
              }
            } }, global: { fetch: globalThis.fetch } });
          })();
        }(e10, t10, c2?.authCookies), { data: { user: g2 } } = await f2.auth.getUser();
        if (g2 && l2) return os(new URL(function(e11, t11) {
          let r11 = n_.has(t11) ? t11 : "no", n11 = `/${r11}/dashboard`;
          if (null == e11) return n11;
          let s11 = e11.trim();
          if ("" === s11) return n11;
          try {
            s11 = decodeURIComponent(s11);
          } catch {
          }
          if (Array.from(s11).some((e12) => {
            let t12 = e12.charCodeAt(0);
            return t12 < 32 || 127 === t12;
          }) || /^[a-z][a-z0-9+.-]*:/i.test(s11)) return n11;
          let i11 = s11;
          if (!i11.startsWith("/") || i11.startsWith("//")) return n11;
          let a11 = i11.split("?")[0] ?? i11, o3 = a11.toLowerCase();
          if (nw.some((e12) => o3 === e12 || o3.startsWith(`${e12}/`))) return n11;
          let l3 = a11.split("/")[1];
          return l3 && !n_.has(l3) ? n11 : i11;
        }(e10.nextUrl.searchParams.get("next"), u2), e10.url), e10, t10);
        if (g2 && a10) return os(new URL(nv(u2, "/dashboard"), e10.url), e10, t10, 302);
        if (i10 && !g2) {
          let r11 = new URL(nv(u2, "/login"), e10.url);
          return r11.searchParams.set("next", n10), os(r11, e10, t10);
        }
        if (g2 && (i10 || o2)) {
          let r11 = await om(e10, t10);
          if (r11) return r11;
        }
        if (g2) {
          let r11 = await ov(e10, t10, g2.id);
          if (r11) return r11;
        }
        return t10;
      }
      let oI = /* @__PURE__ */ new Map();
      setInterval(() => {
        let e10 = Date.now();
        for (let [t10, r10] of oI) e10 > r10.resetAt && oI.delete(t10);
      }, 3e5);
      let oN = { "/api/trading": { max: 60, windowMs: 6e4 }, "/api/ai/chat": { max: 20, windowMs: 6e4 }, "/api/binance": { max: 30, windowMs: 6e4 }, "/api/webhooks/stripe": { max: 100, windowMs: 6e4 }, "/api/cron": { max: 100, windowMs: 6e4 } }, oj = ["/login", "/register", "/registrer", "/glemt-passord", "/forgot-password", "/reset-password", "/update-password", "/callback", "/admin", "/dashboard", "/profile", "/innstillinger", "/settings", "/konto", "/leagues", "/trade", "/autopilot", "/marked", "/copy-trading", "/marketplace", "/checkout", "/onboarding", "/velg-strategi", "/velkommen"], o$ = ["/", "/priser", "/kontakt", "/om-oss", "/vilkar", "/personvern", "/cookies"], oL = null, oD = /* @__PURE__ */ function(...e10) {
        return async (t10) => {
          let r10 = eD.next();
          for (let n10 of e10) if (function(e11) {
            let t11 = e11.status, r11 = e11.headers.get("location"), n11 = e11.headers.get("x-middleware-stop");
            return t11 >= 300 && t11 < 400 ? !!r11 : 200 !== t11 || !!n11;
          }(r10 = await n10(t10, r10))) break;
          return r10;
        };
      }(function(e10, t10) {
        let r10 = e10.headers.get("X-Correlation-Id") ?? function() {
          let e11 = "abcdefghijklmnopqrstuvwxyz0123456789", t11 = "";
          for (let r11 = 0; r11 < 12; r11++) t11 += e11[Math.floor(Math.random() * e11.length)];
          return `req_${t11}`;
        }();
        oL = r10;
        let n10 = t10 ?? eD.next();
        return n10.headers.set("X-Correlation-Id", r10), n10;
      }, function(e10) {
        let t10 = e10.nextUrl.pathname;
        if (t10.startsWith("/auth/") || t10.startsWith("/api/") || "/login" === t10 || "/register" === t10) {
          let e11 = eD.next();
          return e11.headers.set("x-kp-auth-route", "skipped-i18n"), e11;
        }
        let { locale: r10, strippedPath: n10 } = nk(t10), s10 = n10.split("/").filter(Boolean);
        if (s10.length > 0 && nb.test(s10[0])) {
          let t11 = s10[0], i11 = n10.replace(RegExp(`^/${t11}(/?|$)`), "/");
          return eD.redirect(new URL(nv(r10, i11), e10.url), 308);
        }
        if ("/" === n10 && e10.nextUrl.searchParams.has("code")) {
          let t11 = new URL(function(e11 = "no") {
            let t12, r11 = nm(function() {
              let e12 = "https://klarpakke.vercel.app".trim();
              if (e12) {
                let t13 = function(e13) {
                  try {
                    return new URL(nm(e13)).origin;
                  } catch {
                    return nf;
                  }
                }(e12);
                return ng.has(t13) ? nm(e12) : (console.warn(`[auth/config] NEXT_PUBLIC_APP_URL origin ${t13} is not in the allowed list, falling back to ${nf}.`), nf);
              }
              return nf;
            }());
            try {
              t12 = new URL(r11).origin;
            } catch {
              t12 = nf;
            }
            let n11 = np.has(e11) ? e11 : "no";
            return `${t12}/${n11}/callback`;
          }(r10));
          return e10.nextUrl.searchParams.forEach((e11, r11) => {
            t11.searchParams.set(r11, e11);
          }), eD.redirect(t11, 302);
        }
        if ("/beta" === n10 || n10.startsWith("/beta/")) {
          let t11 = e10.nextUrl.clone();
          return n10.includes("live-trading") ? (t11.pathname = nv(r10, "/handel"), t11.searchParams.set("mode", "live")) : n10.includes("auto-trade") ? t11.pathname = nv(r10, "/dashboard/auto-trade") : (n10.includes("connect-exchange"), t11.pathname = nv(r10, "/dashboard")), eD.redirect(t11, 308);
        }
        if ("/settings" === n10 || n10.startsWith("/settings/")) {
          let t11 = "/settings" === n10 ? "" : n10.slice(9), s11 = `/profile?tab=settings${t11}`;
          return eD.redirect(new URL(nv(r10, s11), e10.url), 308);
        }
        if ("/konto" === n10 || n10.startsWith("/konto/")) return eD.redirect(new URL(nv(r10, "/profile?tab=wallet"), e10.url), 307);
        if ("/innstillinger" === n10 || n10.startsWith("/innstillinger/")) return eD.redirect(new URL(nv(r10, "/profile?tab=settings"), e10.url), 307);
        for (let [t11, s11] of Object.entries(ny)) if (n10 === t11 || n10.startsWith(`${t11}/`)) {
          let t12 = s11.startsWith("/") ? s11 : `/${s11}`;
          return eD.redirect(new URL(nv(r10, t12), e10.url), 308);
        }
        let i10 = new Headers(e10.headers);
        return i10.set("x-kp-stripped-path", n10), i10.set("x-kp-locale", r10), nS(new eI(e10, { headers: i10 }));
      }, oP, (e10, t10) => {
        let r10 = e10.nextUrl.pathname, n10 = Object.keys(oN).find((e11) => r10.startsWith(e11));
        if (!n10) return t10 ?? eD.next();
        let s10 = oN[n10], i10 = e10.headers.get("cf-connecting-ip") ?? e10.headers.get("x-forwarded-for") ?? "unknown", a10 = `${i10}:${n10}`, o2 = Date.now(), l2 = oI.get(a10);
        !l2 || o2 > l2.resetAt ? (l2 = { count: 1, resetAt: o2 + s10.windowMs }, oI.set(a10, l2)) : l2.count++;
        let u2 = Math.max(0, s10.max - l2.count), c2 = eD.next();
        return (c2.headers.set("X-RateLimit-Limit", String(s10.max)), c2.headers.set("X-RateLimit-Remaining", String(u2)), c2.headers.set("X-RateLimit-Reset", String(l2.resetAt)), l2.count > s10.max) ? new eD(JSON.stringify({ error: "Too many requests", retryAfter: Math.ceil((l2.resetAt - o2) / 1e3) }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((l2.resetAt - o2) / 1e3)), "X-RateLimit-Limit": String(s10.max), "X-RateLimit-Remaining": "0" } }) : c2;
      }, (e10, t10) => {
        let r10 = t10 ?? eD.next(), n10 = function() {
          try {
            let e11 = new Uint8Array(16);
            crypto.getRandomValues(e11);
            let t11 = Array.from(e11, (e12) => String.fromCharCode(e12)).join("");
            return btoa(t11).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
          } catch {
            return null;
          }
        }(), s10 = Object.entries({ "default-src": ["'self'"], "script-src": ["'self'", "'unsafe-inline'", "https://pskhryjzkobytnfwucrb.supabase.co", "https://*.tradingview.com", "https://plausible.io"], "style-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "blob:", "data:", "https://pskhryjzkobytnfwucrb.supabase.co", "https://*.tradingview.com", "https://*.coingecko.com", "https://klarpakke.no", "https://www.klarpakke.no"], "font-src": ["'self'", "data:", "https://r2cdn.perplexity.ai"], "worker-src": ["'self'", "blob:"], "object-src": ["'none'"], "base-uri": ["'self'"], "form-action": ["'self'"], "frame-ancestors": ["'none'"], "connect-src": ["'self'", "https://pskhryjzkobytnfwucrb.supabase.co", "wss://pskhryjzkobytnfwucrb.supabase.co", "https://api.binance.com", "https://api.coingecko.com", "wss://stream.binance.com:9443", "https://*.sanity.io", "wss://*.sanity.io", "https://plausible.io", "https://o4509555622608896.ingest.de.sentry.io", "https://*.ingest.de.sentry.io"], "frame-src": ["'self'"], "upgrade-insecure-requests": [] }).map(([e11, t11]) => `${e11} ${t11.join(" ")}`).join("; ");
        return r10.headers.set("Content-Security-Policy", s10), n10 && r10.headers.set("X-CSP-Nonce", n10), r10;
      }, (e10, t10) => {
        let r10, n10 = t10 ?? eD.next(), s10 = e10.nextUrl.pathname;
        if (s10.startsWith("/api/") || "/api" === s10) return n10;
        let { strippedPath: i10 } = nk(s10);
        return (r10 = i10.toLowerCase(), oj.some((e11) => r10 === e11 || r10.startsWith(`${e11}/`))) ? (n10.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate"), n10.headers.set("CDN-Cache-Control", "no-store, max-age=0"), n10) : (o$.some((e11) => i10 === e11 || i10.startsWith(`${e11}/`)) && n10.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=3600"), n10);
      });
      e.s(["config", 0, { matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*)"] }, "default", 0, oD], 196592);
      let oU = { ...e.i(196592) }, oM = "/middleware", oq = oU.middleware || oU.default;
      if ("function" != typeof oq) throw new class extends Error {
        constructor(e10) {
          super(e10), this.stack = "";
        }
      }(`The Middleware file "${oM}" must export a function named \`middleware\` or a default function.`);
      let oB = (e10) => t0({ ...e10, IncrementalCache: rL, incrementalCacheHandler: null, page: oM, handler: async (...e11) => {
        try {
          return await oq(...e11);
        } catch (s10) {
          let t10 = e11[0], r10 = new URL(t10.url), n10 = r10.pathname + r10.search;
          throw await f(s10, { path: n10, method: t10.method, headers: Object.fromEntries(t10.headers.entries()) }, { routerKind: "Pages Router", routePath: "/proxy", routeType: "proxy", revalidateReason: void 0 }), s10;
        }
      } });
      async function oH(e10, t10) {
        let r10 = await oB({ request: { url: e10.url, method: e10.method, headers: x(e10.headers), nextConfig: { basePath: "", i18n: "", trailingSlash: false, experimental: { cacheLife: { default: { stale: 300, revalidate: 900, expire: 4294967294 }, seconds: { stale: 30, revalidate: 1, expire: 60 }, minutes: { stale: 300, revalidate: 60, expire: 3600 }, hours: { stale: 300, revalidate: 3600, expire: 86400 }, days: { stale: 300, revalidate: 86400, expire: 604800 }, weeks: { stale: 300, revalidate: 604800, expire: 2592e3 }, max: { stale: 300, revalidate: 2592e3, expire: 31536e3 } }, authInterrupts: false, clientParamParsingOrigins: [] } }, page: { name: oM }, body: "GET" !== e10.method && "HEAD" !== e10.method ? e10.body ?? void 0 : void 0, waitUntil: t10.waitUntil, requestMeta: t10.requestMeta, signal: t10.signal || new AbortController().signal } });
        return null == t10.waitUntil || t10.waitUntil.call(t10, r10.waitUntil), r10.response;
      }
      e.s(["default", 0, oB, "handler", 0, oH], 558217);
    }]);
  }
});

// .next/server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js
var require_turbopack_node_modules_next_dist_esm_build_templates_edge_wrapper_0v0bcwd = __commonJS({
  ".next/server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js", { otherChunks: ["chunks/[root-of-the-server]__1_x6o4q._.js", "chunks/[root-of-the-server]__0fsa3kx._.js"], runtimeModuleIds: [435825] }]), (() => {
      let e;
      if (!Array.isArray(globalThis.TURBOPACK)) return;
      let t = ["NEXT_DEPLOYMENT_ID", "NEXT_CLIENT_ASSET_SUFFIX"];
      var r, n = ((r = n || {})[r.Runtime = 0] = "Runtime", r[r.Parent = 1] = "Parent", r[r.Update = 2] = "Update", r);
      let o = /* @__PURE__ */ new WeakMap();
      function u(e2, t2) {
        this.m = e2, this.e = t2;
      }
      let l = u.prototype, i = Object.prototype.hasOwnProperty, a = "u" > typeof Symbol && Symbol.toStringTag;
      function s(e2, t2, r2) {
        i.call(e2, t2) || Object.defineProperty(e2, t2, r2);
      }
      function c(e2, t2) {
        let r2 = e2[t2];
        return r2 || (r2 = f(t2), e2[t2] = r2), r2;
      }
      function f(e2) {
        return { exports: {}, error: void 0, id: e2, namespaceObject: void 0 };
      }
      function h(e2, t2) {
        s(e2, "__esModule", { value: true }), a && s(e2, a, { value: "Module" });
        let r2 = 0;
        for (; r2 < t2.length; ) {
          let n2 = t2[r2++], o2 = t2[r2++];
          if ("number" == typeof o2) if (0 === o2) s(e2, n2, { value: t2[r2++], enumerable: true, writable: false });
          else throw Error(`unexpected tag: ${o2}`);
          else "function" == typeof t2[r2] ? s(e2, n2, { get: o2, set: t2[r2++], enumerable: true }) : s(e2, n2, { get: o2, enumerable: true });
        }
        Object.seal(e2);
      }
      function d(e2, t2) {
        (null != t2 ? c(this.c, t2) : this.m).exports = e2;
      }
      l.s = function(e2, t2) {
        let r2, n2;
        null != t2 ? n2 = (r2 = c(this.c, t2)).exports : (r2 = this.m, n2 = this.e), r2.namespaceObject = n2, h(n2, e2);
      }, l.j = function(e2, t2) {
        var r2, n2;
        let u2, l2, a2;
        null != t2 ? l2 = (u2 = c(this.c, t2)).exports : (u2 = this.m, l2 = this.e);
        let s2 = (r2 = u2, n2 = l2, (a2 = o.get(r2)) || (o.set(r2, a2 = []), r2.exports = r2.namespaceObject = new Proxy(n2, { get(e3, t3) {
          if (i.call(e3, t3) || "default" === t3 || "__esModule" === t3) return Reflect.get(e3, t3);
          for (let e4 of a2) {
            let r3 = Reflect.get(e4, t3);
            if (void 0 !== r3) return r3;
          }
        }, ownKeys(e3) {
          let t3 = Reflect.ownKeys(e3);
          for (let e4 of a2) for (let r3 of Reflect.ownKeys(e4)) "default" === r3 || t3.includes(r3) || t3.push(r3);
          return t3;
        } })), a2);
        "object" == typeof e2 && null !== e2 && s2.push(e2);
      }, l.v = d, l.n = function(e2, t2) {
        let r2;
        (r2 = null != t2 ? c(this.c, t2) : this.m).exports = r2.namespaceObject = e2;
      };
      let p = Object.getPrototypeOf ? (e2) => Object.getPrototypeOf(e2) : (e2) => e2.__proto__, m = [null, p({}), p([]), p(p)];
      function b(e2, t2, r2) {
        let n2 = [], o2 = -1;
        for (let t3 = e2; ("object" == typeof t3 || "function" == typeof t3) && !m.includes(t3); t3 = p(t3)) for (let r3 of Object.getOwnPropertyNames(t3)) n2.push(r3, /* @__PURE__ */ function(e3, t4) {
          return () => e3[t4];
        }(e2, r3)), -1 === o2 && "default" === r3 && (o2 = n2.length - 1);
        return r2 && o2 >= 0 || (o2 >= 0 ? n2.splice(o2, 1, 0, e2) : n2.push("default", 0, e2)), h(t2, n2), t2;
      }
      function y(e2) {
        return "function" == typeof e2 ? function(...t2) {
          return e2.apply(this, t2);
        } : /* @__PURE__ */ Object.create(null);
      }
      function g(e2) {
        let t2 = K(e2, this.m);
        if (t2.namespaceObject) return t2.namespaceObject;
        let r2 = t2.exports;
        return t2.namespaceObject = b(r2, y(r2), r2 && r2.__esModule);
      }
      function w(e2) {
        let t2 = e2.indexOf("#");
        -1 !== t2 && (e2 = e2.substring(0, t2));
        let r2 = e2.indexOf("?");
        return -1 !== r2 && (e2 = e2.substring(0, r2)), e2;
      }
      function O(e2) {
        return "string" == typeof e2 ? e2 : e2.path;
      }
      function _() {
        let e2, t2;
        return { promise: new Promise((r2, n2) => {
          t2 = n2, e2 = r2;
        }), resolve: e2, reject: t2 };
      }
      l.i = g, l.A = function(e2) {
        return this.r(e2)(g.bind(this));
      }, l.t = "function" == typeof __require ? __require : function() {
        throw Error("Unexpected use of runtime require");
      }, l.r = function(e2) {
        return K(e2, this.m).exports;
      }, l.f = function(e2) {
        function t2(t3) {
          if (t3 = w(t3), i.call(e2, t3)) return e2[t3].module();
          let r2 = Error(`Cannot find module '${t3}'`);
          throw r2.code = "MODULE_NOT_FOUND", r2;
        }
        return t2.keys = () => Object.keys(e2), t2.resolve = (t3) => {
          if (t3 = w(t3), i.call(e2, t3)) return e2[t3].id();
          let r2 = Error(`Cannot find module '${t3}'`);
          throw r2.code = "MODULE_NOT_FOUND", r2;
        }, t2.import = async (e3) => await t2(e3), t2;
      };
      let k = Symbol("turbopack queues"), j = Symbol("turbopack exports"), C = Symbol("turbopack error");
      function P(e2) {
        e2 && 1 !== e2.status && (e2.status = 1, e2.forEach((e3) => e3.queueCount--), e2.forEach((e3) => e3.queueCount-- ? e3.queueCount++ : e3()));
      }
      l.a = function(e2, t2) {
        let r2 = this.m, n2 = t2 ? Object.assign([], { status: -1 }) : void 0, o2 = /* @__PURE__ */ new Set(), { resolve: u2, reject: l2, promise: i2 } = _(), a2 = Object.assign(i2, { [j]: r2.exports, [k]: (e3) => {
          n2 && e3(n2), o2.forEach(e3), a2.catch(() => {
          });
        } }), s2 = { get: () => a2, set(e3) {
          e3 !== a2 && (a2[j] = e3);
        } };
        Object.defineProperty(r2, "exports", s2), Object.defineProperty(r2, "namespaceObject", s2), e2(function(e3) {
          let t3 = e3.map((e4) => {
            if (null !== e4 && "object" == typeof e4) {
              if (k in e4) return e4;
              if (null != e4 && "object" == typeof e4 && "then" in e4 && "function" == typeof e4.then) {
                let t4 = Object.assign([], { status: 0 }), r4 = { [j]: {}, [k]: (e5) => e5(t4) };
                return e4.then((e5) => {
                  r4[j] = e5, P(t4);
                }, (e5) => {
                  r4[C] = e5, P(t4);
                }), r4;
              }
            }
            return { [j]: e4, [k]: () => {
            } };
          }), r3 = () => t3.map((e4) => {
            if (e4[C]) throw e4[C];
            return e4[j];
          }), { promise: u3, resolve: l3 } = _(), i3 = Object.assign(() => l3(r3), { queueCount: 0 });
          function a3(e4) {
            e4 !== n2 && !o2.has(e4) && (o2.add(e4), e4 && 0 === e4.status && (i3.queueCount++, e4.push(i3)));
          }
          return t3.map((e4) => e4[k](a3)), i3.queueCount ? u3 : r3();
        }, function(e3) {
          e3 ? l2(a2[C] = e3) : u2(a2[j]), P(n2);
        }), n2 && -1 === n2.status && (n2.status = 0);
      };
      let v = function(e2) {
        let t2 = new URL(e2, "x:/"), r2 = {};
        for (let e3 in t2) r2[e3] = t2[e3];
        for (let t3 in r2.href = e2, r2.pathname = e2.replace(/[?#].*/, ""), r2.origin = r2.protocol = "", r2.toString = r2.toJSON = (...t4) => e2, r2) Object.defineProperty(this, t3, { enumerable: true, configurable: true, value: r2[t3] });
      };
      function E(e2, t2) {
        throw Error(`Invariant: ${t2(e2)}`);
      }
      v.prototype = URL.prototype, l.U = v, l.z = function(e2) {
        throw Error("dynamic usage of require is not supported");
      }, l.g = globalThis;
      let U = u.prototype, x = /* @__PURE__ */ new Map();
      l.M = x;
      let R = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map();
      async function $(e2, t2, r2) {
        let n2;
        if ("string" == typeof r2) return q(e2, t2, A(r2));
        let o2 = r2.included || [], u2 = o2.map((e3) => !!x.has(e3) || R.get(e3));
        if (u2.length > 0 && u2.every((e3) => e3)) return void await Promise.all(u2);
        let l2 = r2.moduleChunks || [], i2 = l2.map((e3) => M.get(e3)).filter((e3) => e3);
        if (i2.length > 0) {
          if (i2.length === l2.length) return void await Promise.all(i2);
          let r3 = /* @__PURE__ */ new Set();
          for (let e3 of l2) M.has(e3) || r3.add(e3);
          for (let n3 of r3) {
            let r4 = q(e2, t2, A(n3));
            M.set(n3, r4), i2.push(r4);
          }
          n2 = Promise.all(i2);
        } else {
          for (let o3 of (n2 = q(e2, t2, A(r2.path)), l2)) M.has(o3) || M.set(o3, n2);
        }
        for (let e3 of o2) R.has(e3) || R.set(e3, n2);
        await n2;
      }
      U.l = function(e2) {
        return $(n.Parent, this.m.id, e2);
      };
      let T = Promise.resolve(void 0), S = /* @__PURE__ */ new WeakMap();
      function q(t2, r2, o2) {
        let u2 = e.loadChunkCached(t2, o2), l2 = S.get(u2);
        if (void 0 === l2) {
          let e2 = S.set.bind(S, u2, T);
          l2 = u2.then(e2).catch((e3) => {
            let u3;
            switch (t2) {
              case n.Runtime:
                u3 = `as a runtime dependency of chunk ${r2}`;
                break;
              case n.Parent:
                u3 = `from module ${r2}`;
                break;
              case n.Update:
                u3 = "from an HMR update";
                break;
              default:
                E(t2, (e4) => `Unknown source type: ${e4}`);
            }
            let l3 = Error(`Failed to load chunk ${o2} ${u3}${e3 ? `: ${e3}` : ""}`, e3 ? { cause: e3 } : void 0);
            throw l3.name = "ChunkLoadError", l3;
          }), S.set(u2, l2);
        }
        return l2;
      }
      function A(e2) {
        return `${e2.split("/").map((e3) => encodeURIComponent(e3)).join("/")}`;
      }
      U.L = function(e2) {
        return q(n.Parent, this.m.id, e2);
      }, U.R = function(e2) {
        let t2 = this.r(e2);
        return t2?.default ?? t2;
      }, U.P = function(e2) {
        return `/ROOT/${e2 ?? ""}`;
      }, U.q = function(e2, t2) {
        d.call(this, `${e2}`, t2);
      }, U.b = function(e2, r2, n2, o2) {
        let u2 = "SharedWorker" === e2.name, l2 = [n2.map((e3) => A(e3)).reverse(), ""];
        for (let e3 of t) l2.push(globalThis[e3]);
        let i2 = new URL(A(r2), location.origin), a2 = JSON.stringify(l2);
        return u2 ? i2.searchParams.set("params", a2) : i2.hash = "#params=" + encodeURIComponent(a2), new e2(i2, o2 ? { ...o2, type: void 0 } : void 0);
      };
      let N = /\.js(?:\?[^#]*)?(?:#.*)?$/;
      l.w = function(t2, r2, o2) {
        return e.loadWebAssembly(n.Parent, this.m.id, t2, r2, o2);
      }, l.u = function(t2, r2) {
        return e.loadWebAssemblyModule(n.Parent, this.m.id, t2, r2);
      };
      let I = {};
      l.c = I;
      let K = (e2, t2) => {
        let r2 = I[e2];
        if (r2) {
          if (r2.error) throw r2.error;
          return r2;
        }
        return L(e2, n.Parent, t2.id);
      };
      function L(e2, t2, r2) {
        let n2 = x.get(e2);
        if ("function" != typeof n2) throw Error(function(e3, t3, r3) {
          let n3;
          switch (t3) {
            case 0:
              n3 = `as a runtime entry of chunk ${r3}`;
              break;
            case 1:
              n3 = `because it was required from module ${r3}`;
              break;
            case 2:
              n3 = "because of an HMR update";
              break;
            default:
              E(t3, (e4) => `Unknown source type: ${e4}`);
          }
          return `Module ${e3} was instantiated ${n3}, but the module factory is not available.`;
        }(e2, t2, r2));
        let o2 = f(e2), l2 = o2.exports;
        I[e2] = o2;
        let i2 = new u(o2, l2);
        try {
          n2(i2, o2, l2);
        } catch (e3) {
          throw o2.error = e3, e3;
        }
        return o2.namespaceObject && o2.exports !== o2.namespaceObject && b(o2.exports, o2.namespaceObject), o2;
      }
      function W(t2) {
        let r2, n2 = function(e2) {
          if ("string" == typeof e2) return e2;
          if (e2) return { src: e2.getAttribute("src") };
          if ("u" > typeof TURBOPACK_NEXT_CHUNK_URLS) return { src: TURBOPACK_NEXT_CHUNK_URLS.pop() };
          throw Error("chunk path empty but not in a worker");
        }(t2[0]);
        return 2 === t2.length ? r2 = t2[1] : (r2 = void 0, !function(e2, t3) {
          let r3 = 1;
          for (; r3 < e2.length; ) {
            let n3, o2 = r3 + 1;
            for (; o2 < e2.length && "function" != typeof e2[o2]; ) o2++;
            if (o2 === e2.length) throw Error("malformed chunk format, expected a factory function");
            let u2 = e2[o2];
            for (let u3 = r3; u3 < o2; u3++) {
              let r4 = e2[u3], o3 = t3.get(r4);
              if (o3) {
                n3 = o3;
                break;
              }
            }
            let l2 = n3 ?? u2, i2 = false;
            for (let n4 = r3; n4 < o2; n4++) {
              let r4 = e2[n4];
              t3.has(r4) || (i2 || (l2 === u2 && Object.defineProperty(u2, "name", { value: "module evaluation" }), i2 = true), t3.set(r4, l2));
            }
            r3 = o2 + 1;
          }
        }(t2, x)), e.registerChunk(n2, r2);
      }
      function B(e2, t2, r2 = false) {
        let n2;
        try {
          n2 = t2();
        } catch (t3) {
          throw Error(`Failed to load external module ${e2}: ${t3}`);
        }
        return !r2 || n2.__esModule ? n2 : b(n2, y(n2), true);
      }
      l.y = async function(e2) {
        let t2;
        try {
          t2 = await import(e2);
        } catch (t3) {
          throw Error(`Failed to load external module ${e2}: ${t3}`);
        }
        return t2 && t2.__esModule && t2.default && "default" in t2.default ? b(t2.default, y(t2), true) : t2;
      }, B.resolve = (e2, t2) => __require.resolve(e2, t2), l.x = B, e = { registerChunk(e2, t2) {
        let r2 = function(e3) {
          if ("string" == typeof e3) return e3;
          let t3 = decodeURIComponent(e3.src.replace(/[?#].*$/, ""));
          return t3.startsWith("") ? t3.slice(0) : t3;
        }(e2);
        F.add(r2), function(e3) {
          let t3 = D.get(e3);
          if (null != t3) {
            for (let r3 of t3) r3.requiredChunks.delete(e3), 0 === r3.requiredChunks.size && X(r3.runtimeModuleIds, r3.chunkPath);
            D.delete(e3);
          }
        }(r2), null != t2 && (0 === t2.otherChunks.length ? X(t2.runtimeModuleIds, r2) : function(e3, t3, r3) {
          let n2 = /* @__PURE__ */ new Set(), o2 = { runtimeModuleIds: r3, chunkPath: e3, requiredChunks: n2 };
          for (let e4 of t3) {
            let t4 = O(e4);
            if (F.has(t4)) continue;
            n2.add(t4);
            let r4 = D.get(t4);
            null == r4 && (r4 = /* @__PURE__ */ new Set(), D.set(t4, r4)), r4.add(o2);
          }
          0 === o2.requiredChunks.size && X(o2.runtimeModuleIds, o2.chunkPath);
        }(r2, t2.otherChunks.filter((e3) => {
          var t3;
          return t3 = O(e3), N.test(t3);
        }), t2.runtimeModuleIds));
      }, loadChunkCached(e2, t2) {
        throw Error("chunk loading is not supported");
      }, async loadWebAssembly(e2, t2, r2, n2, o2) {
        let u2 = await H(r2, n2);
        return await WebAssembly.instantiate(u2, o2);
      }, loadWebAssemblyModule: async (e2, t2, r2, n2) => H(r2, n2) };
      let F = /* @__PURE__ */ new Set(), D = /* @__PURE__ */ new Map();
      function X(e2, t2) {
        for (let r2 of e2) !function(e3, t3) {
          let r3 = I[t3];
          if (r3) {
            if (r3.error) throw r3.error;
            return;
          }
          L(t3, n.Runtime, e3);
        }(t2, r2);
      }
      async function H(e2, t2) {
        let r2;
        try {
          r2 = t2();
        } catch (e3) {
        }
        if (!r2) throw Error(`dynamically loading WebAssembly is not supported in this runtime as global was not injected for chunk '${e2}'`);
        return r2;
      }
      let z = globalThis.TURBOPACK;
      globalThis.TURBOPACK = { push: W }, z.forEach(W);
    })();
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(path3);
  } catch {
  }
  const correspondingRoute = routes.find((route) => route.regex.some((r) => {
    const regex = new RegExp(r);
    return regex.test(path3) || decodedPath !== void 0 && regex.test(decodedPath);
  }));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$"] }];
    require_root_of_the_server_1_x6o4q();
    require_root_of_the_server_0fsa3kx();
    require_turbopack_node_modules_next_dist_esm_build_templates_edge_wrapper_0v0bcwd();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/requestCache.js
var RequestCache = class {
  _caches = /* @__PURE__ */ new Map();
  /**
   * Returns the Map registered under `key`.
   * If no Map exists yet for that key, a new empty Map is created, stored, and returned.
   * Repeated calls with the same key always return the **same** Map instance.
   */
  getOrCreate(key) {
    let cache = this._caches.get(key);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      this._caches.set(key, cache);
    }
    return cache;
  }
};

// node_modules/@opennextjs/aws/dist/utils/promise.js
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set(),
    requestCache: new RequestCache()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": { "_sentryRewriteFramesDistDir": ".next", "_sentryRewriteFramesAssetPrefixPath": "", "_sentryRelease": "7ab20df6d57ec9ec84cc04000a7c34900e241e3e", "NEXT_PUBLIC_SUPABASE_URL": "https://pskhryjzkobytnfwucrb.supabase.co", "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2hyeWp6a29ieXRuZnd1Y3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzI4NTcsImV4cCI6MjA5NzQ0ODg1N30.SAcjagaGKL_m8wk-wmu12PplGMCKVhdeMFHMkAdwUgI" }, "typescript": { "ignoreBuildErrors": false }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.mjs", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": false, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 2592e3, "formats": ["image/avif", "image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "pskhryjzkobytnfwucrb.supabase.co", "pathname": "/storage/v1/object/public/**" }, { "protocol": "https", "hostname": "**.tradingview.com" }, { "protocol": "https", "hostname": "**.coingecko.com" }, { "protocol": "https", "hostname": "i.pravatar.cc" }, { "protocol": "https", "hostname": "cdn.sanity.io" }], "qualities": [75], "unoptimized": true, "customCacheHandler": false }, "devIndicators": false, "onDemandEntries": { "maxInactiveAge": 36e5, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": { "serverFunctions": true, "browserToTerminal": "warn" }, "compiler": { "removeConsole": { "exclude": ["error", "warn"] } }, "expireTime": 31536e3, "staticPageGenerationTimeout": 120, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "/Users/taj/klarpakke", "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "appNewScrollHandler": false, "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "cachedNavigations": false, "partialFallbacks": false, "dynamicOnHover": false, "varyParams": false, "prefetchInlining": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 7, "memoryBasedWorkersCount": true, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "clientTraceMetadata": ["baggage", "sentry-trace"], "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "strictRouteTypes": false, "useTypeScriptCli": false, "viewTransition": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": true, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "gestureTransition": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": "warn", "lockDistDir": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": false, "turbopackInferModuleSideEffects": true, "turbopackPluginRuntimeStrategy": "childProcesses", "optimizePackageImports": ["lucide-react", "framer-motion", "date-fns", "recharts", "lightweight-charts", "@radix-ui/react-accordion", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "rxjs", "rxjs/operators", "@coinbase/cds-web", "@radix-ui/react-slot", "sonner", "next-themes", "react-ts-tradingview-widgets", "embla-carousel-react", "react-resizable-panels", "vaul", "cmdk", "input-otp", "react-day-picker", "@hookform/resolvers", "react-hook-form", "zustand", "immer", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "@mui/material", "@mui/icons-material", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.mjs", "transpilePackages": ["next-intl", "@tanstack/react-query", "styled-components", "sanity", "@sanity/vision", "next-sanity"], "outputFileTracingIncludes": { "**/*": ["./node_modules/pg-cloudflare/dist/**", "./node_modules/pg-cloudflare/esm/**", "./node_modules/xxhash-wasm/workerd/**", "./node_modules/xxhash-wasm/esm/**", "./node_modules/xxhash-wasm/cjs/**"] }, "outputFileTracingExcludes": { "**/*": ["./node_modules/opik/**", "./node_modules/boxen/**", "./node_modules/ora/**", "./node_modules/log-symbols/**", "./node_modules/widest-line/**", "./node_modules/ansi-align/**", "./node_modules/cli-spinners/**"] }, "reactCompiler": true, "serverExternalPackages": ["opik", "fsevents", "chokidar", "nunjucks", "amqplib", "connect", "dataloader", "express", "generic-pool", "graphql", "@hapi/hapi", "ioredis", "kafkajs", "koa", "lru-memoizer", "mongodb", "mongoose", "mysql", "mysql2", "knex", "pg", "pg-pool", "@node-redis/client", "@redis/client", "redis", "tedious"], "turbopack": { "resolveAlias": { "next-intl/config": "./src/i18n.ts" }, "debugIds": true, "rules": { "**/instrumentation-client.*": { "condition": { "not": "foreign" }, "loaders": [{ "loader": "/Users/taj/klarpakke/node_modules/@sentry/nextjs/build/cjs/config/loaders/valueInjectionLoader.js", "options": { "values": { "_sentryRouteManifest": '{"dynamicRoutes":[{"path":"/:locale","regex":"^/([^/]+)$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/akademi","regex":"^/([^/]+)/akademi$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/akademi/dashboard-guide","regex":"^/([^/]+)/akademi/dashboard-guide$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs","regex":"^/([^/]+)/kurs$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/:moduleSlug","regex":"^/([^/]+)/kurs/([^/]+)$","paramNames":["locale","moduleSlug"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/:moduleSlug/leksjon/:lessonSlug","regex":"^/([^/]+)/kurs/([^/]+)/leksjon/([^/]+)$","paramNames":["locale","moduleSlug","lessonSlug"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/grunnleggende/leksjon/introduksjon-til-krypto","regex":"^/([^/]+)/kurs/grunnleggende/leksjon/introduksjon-til-krypto$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/strategi/leksjon/dollar-cost-averaging","regex":"^/([^/]+)/kurs/strategi/leksjon/dollar-cost-averaging$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/leksjon/:lessonId","regex":"^/([^/]+)/leksjon/([^/]+)$","paramNames":["locale","lessonId"],"hasOptionalPrefix":true},{"path":"/:locale/admin","regex":"^/([^/]+)/admin$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/ab-tests","regex":"^/([^/]+)/admin/ab-tests$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/analytics","regex":"^/([^/]+)/admin/analytics$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/auto-trading","regex":"^/([^/]+)/admin/auto-trading$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/auto-trading/sessions","regex":"^/([^/]+)/admin/auto-trading/sessions$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/campaign","regex":"^/([^/]+)/admin/campaign$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/deploy","regex":"^/([^/]+)/admin/deploy$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/forgot-password","regex":"^/([^/]+)/admin/forgot-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/health","regex":"^/([^/]+)/admin/health$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/login","regex":"^/([^/]+)/admin/login$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/marketing/ctas","regex":"^/([^/]+)/admin/marketing/ctas$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/monetization","regex":"^/([^/]+)/admin/monetization$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/monitor","regex":"^/([^/]+)/admin/monitor$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/reset-password","regex":"^/([^/]+)/admin/reset-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/settings","regex":"^/([^/]+)/admin/settings$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/students","regex":"^/([^/]+)/admin/students$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/support/impersonate","regex":"^/([^/]+)/admin/support/impersonate$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/sync-status","regex":"^/([^/]+)/admin/sync-status$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/system","regex":"^/([^/]+)/admin/system$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/trade-health","regex":"^/([^/]+)/admin/trade-health$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/trader-verifications","regex":"^/([^/]+)/admin/trader-verifications$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/users","regex":"^/([^/]+)/admin/users$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/v2","regex":"^/([^/]+)/admin/v2$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/v3","regex":"^/([^/]+)/admin/v3$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/login","regex":"^/([^/]+)/login$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/register","regex":"^/([^/]+)/register$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/reset-password","regex":"^/([^/]+)/reset-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/update-password","regex":"^/([^/]+)/update-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/checkout","regex":"^/([^/]+)/checkout$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/checkout/success","regex":"^/([^/]+)/checkout/success$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/marketplace","regex":"^/([^/]+)/marketplace$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/cookies","regex":"^/([^/]+)/cookies$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/driftsfeil","regex":"^/([^/]+)/driftsfeil$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/personvern","regex":"^/([^/]+)/personvern$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/vilkar","regex":"^/([^/]+)/vilkar$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/about","regex":"^/([^/]+)/about$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/api-dokumentasjon","regex":"^/([^/]+)/api-dokumentasjon$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/binance-guide","regex":"^/([^/]+)/binance-guide$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/bots","regex":"^/([^/]+)/bots$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/hjelp","regex":"^/([^/]+)/hjelp$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kalkulator","regex":"^/([^/]+)/kalkulator$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kontakt","regex":"^/([^/]+)/kontakt$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/mobiloversikt","regex":"^/([^/]+)/mobiloversikt$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/om-oss","regex":"^/([^/]+)/om-oss$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser","regex":"^/([^/]+)/priser$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser/cancel","regex":"^/([^/]+)/priser/cancel$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser/success","regex":"^/([^/]+)/priser/success$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding","regex":"^/([^/]+)/onboarding$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step1-welcome","regex":"^/([^/]+)/onboarding/step1-welcome$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step2-level","regex":"^/([^/]+)/onboarding/step2-level$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step3-trading-mode","regex":"^/([^/]+)/onboarding/step3-trading-mode$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step4-binance","regex":"^/([^/]+)/onboarding/step4-binance$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step4-first-trade","regex":"^/([^/]+)/onboarding/step4-first-trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step5-complete","regex":"^/([^/]+)/onboarding/step5-complete$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/velg-strategi","regex":"^/([^/]+)/velg-strategi$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/velkommen","regex":"^/([^/]+)/velkommen$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading","regex":"^/([^/]+)/copy-trading$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading/discover","regex":"^/([^/]+)/copy-trading/discover$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading/traders/:id","regex":"^/([^/]+)/copy-trading/traders/([^/]+)$","paramNames":["locale","id"],"hasOptionalPrefix":true},{"path":"/:locale/jokertrade","regex":"^/([^/]+)/jokertrade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/leaderboard","regex":"^/([^/]+)/leaderboard$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/pilot","regex":"^/([^/]+)/pilot$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard","regex":"^/([^/]+)/dashboard$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/analysis","regex":"^/([^/]+)/dashboard/analysis$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/asset/:symbol","regex":"^/([^/]+)/dashboard/asset/([^/]+)$","paramNames":["locale","symbol"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/bot/:session_id","regex":"^/([^/]+)/dashboard/bot/([^/]+)$","paramNames":["locale","session_id"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/historikk","regex":"^/([^/]+)/dashboard/historikk$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/portfolio","regex":"^/([^/]+)/dashboard/portfolio$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/referral","regex":"^/([^/]+)/dashboard/referral$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/resultater","regex":"^/([^/]+)/dashboard/resultater$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/settings","regex":"^/([^/]+)/dashboard/settings$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/trade","regex":"^/([^/]+)/dashboard/trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/handel","regex":"^/([^/]+)/handel$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/marked","regex":"^/([^/]+)/marked$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/profile","regex":"^/([^/]+)/profile$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/trade","regex":"^/([^/]+)/trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/vanlige-sporsmal","regex":"^/([^/]+)/vanlige-sporsmal$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/:slug*","regex":"^/([^/]+)/(.+)$","paramNames":["locale","slug"],"hasOptionalPrefix":true},{"path":"/:locale/feil/ikke-funnet","regex":"^/([^/]+)/feil/ikke-funnet$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/feil/ingen-tilgang","regex":"^/([^/]+)/feil/ingen-tilgang$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/feil/serverfeil","regex":"^/([^/]+)/feil/serverfeil$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/studio/:tool*?","regex":"^/studio(?:/(.*))?$","paramNames":["tool"],"hasOptionalPrefix":false}],"staticRoutes":[{"path":"/"}],"isrRoutes":["/:locale/velg-strategi"]}', "_sentryNextJsVersion": "16.2.12" } } }] }, "**/instrumentation.*": { "condition": { "not": "foreign" }, "loaders": [{ "loader": "/Users/taj/klarpakke/node_modules/@sentry/nextjs/build/cjs/config/loaders/valueInjectionLoader.js", "options": { "values": { "__SENTRY_SERVER_MODULES__": { "@ai-sdk/openai": "^3.0.82", "@ai-sdk/perplexity": "^3.0.44", "@capacitor/cli": "^8.4.2", "@capacitor/core": "^8.4.2", "@capacitor/ios": "^8.4.2", "@coinbase/cds-web": "^9.6.1", "@hookform/resolvers": "^5.4.0", "@huggingface/inference": "^4.13.22", "@radix-ui/react-accordion": "^1.2.14", "@radix-ui/react-alert-dialog": "^1.1.17", "@radix-ui/react-aspect-ratio": "^1.1.10", "@radix-ui/react-avatar": "^1.2.0", "@radix-ui/react-checkbox": "^1.3.5", "@radix-ui/react-collapsible": "^1.1.12", "@radix-ui/react-context-menu": "^2.3.1", "@radix-ui/react-dialog": "^1.1.15", "@radix-ui/react-dropdown-menu": "^2.1.18", "@radix-ui/react-hover-card": "^1.1.17", "@radix-ui/react-label": "^2.1.10", "@radix-ui/react-popover": "^1.1.17", "@radix-ui/react-progress": "^1.1.10", "@radix-ui/react-radio-group": "^1.4.1", "@radix-ui/react-scroll-area": "^1.2.12", "@radix-ui/react-select": "^2.3.1", "@radix-ui/react-separator": "^1.1.10", "@radix-ui/react-slider": "^1.4.1", "@radix-ui/react-slot": "^1.2.4", "@radix-ui/react-switch": "^1.3.1", "@radix-ui/react-tabs": "^1.1.15", "@radix-ui/react-toggle": "^1.1.10", "@radix-ui/react-toggle-group": "^1.1.13", "@radix-ui/react-tooltip": "^1.2.10", "@react-email/render": "^2.0.9", "@sanity/assist": "^6.1.3", "@sanity/image-url": "^2.1.1", "@sanity/vision": "^6.1.0", "@sentry/nextjs": "^10.64.0", "@supabase/ssr": "^0.12.0", "@supabase/supabase-js": "^2.108.2", "@tanstack/react-query": "^5.101.1", "@upstash/redis": "^1.38.0", "ai": "^6.0.168", "canvas-confetti": "^1.9.4", "class-variance-authority": "^0.7.1", "clsx": "^2.1.1", "cmdk": "^1.1.1", "date-fns": "^4.4.0", "embla-carousel-react": "^8.6.0", "framer-motion": "^12.41.0", "immer": "^11.1.8", "lightweight-charts": "^5.2.0", "lucide-react": "^1.21.0", "next": "^16.2.9", "next-intl": "^4.13.0", "next-plausible": "^4.0.0", "next-sanity": "^13.1.1", "react": "^19.2.7", "react-day-picker": "^10.0.1", "react-dom": "^19.2.7", "react-hook-form": "^7.80.0", "react-is": "^19.2.7", "react-markdown": "^10.1.0", "react-resizable-panels": "^4.11.2", "recharts": "^3.9.0", "rehype-sanitize": "^6.0.0", "resend": "^6.12.2", "rxjs": "^7.8.2", "sanity": "^6.1.0", "sonner": "^2.0.7", "stripe": "^22.2.3", "styled-components": "^6.4.2", "svix": "^1.90.0", "tailwind-merge": "^3.6.0", "ua-parser-js": "^2.0.10", "vaul": "^1.1.2", "web-push": "^3.6.7", "zod": "^4.3.6", "zustand": "^5.0.14", "@axe-core/playwright": "^4.12.1", "@eslint/eslintrc": "^3.3.5", "@eslint/js": "^9.39.4", "@modelcontextprotocol/sdk": "^1.27.1", "@next/bundle-analyzer": "^16.2.10", "@opennextjs/cloudflare": "https://pkg.pr.new/@opennextjs/cloudflare@main", "@playwright/mcp": "^0.0.70", "@playwright/test": "^1.61.1", "@storybook/react": "^10.3.6", "@storybook/react-vite": "^10.4.6", "@stripe/mcp": "^0.3.3", "@tailwindcss/language-server": "^0.14.15", "@tailwindcss/postcss": "^4.3.1", "@testing-library/dom": "^10.4.1", "@testing-library/jest-dom": "^6.9.1", "@testing-library/react": "^16.3.2", "@testing-library/user-event": "^14.6.1", "@types/canvas-confetti": "^1.9.0", "@types/jest": "^30.0.0", "@types/node": "^26.0.0", "@types/pg": "^8.20.0", "@types/react": "^19.2.17", "@types/react-dom": "^19.2.3", "@types/testing-library__jest-dom": "^5.14.9", "@types/testing-library__react": "^10.0.1", "@types/ua-parser-js": "^0.7.39", "@types/web-push": "^3.6.4", "@typescript-eslint/eslint-plugin": "^8.59.0", "@typescript-eslint/parser": "^8.59.0", "@vitejs/plugin-react": "^6.0.3", "@vitest/coverage-v8": "^4.1.9", "allure-commandline": "^2.43.0", "allure-playwright": "^3.10.1", "autoprefixer": "^10.5.1", "axe-core": "^4.12.1", "axe-playwright": "^2.2.2", "babel-plugin-react-compiler": "^1.0.0", "canvas": "^3.2.3", "chrome-devtools-mcp": "^1.4.0", "cssnano": "^8.0.2", "csv-parse": "^7.0.0", "depcheck": "^1.4.7", "detect-secrets": "^1.0.6", "dotenv": "^17.4.2", "eslint": "^9.39.4", "eslint-config-next": "^16.2.9", "eslint-plugin-jsx-a11y": "^6.10.2", "eslint-plugin-react": "^7.37.5", "eslint-plugin-react-hooks": "^7.1.1", "husky": "^9.1.7", "jsdom": "^29.1.1", "knip": "^6.18.0", "lighthouse": "^13.4.0", "lint-staged": "^17.0.8", "perplexity-mcp": "^0.2.3", "postcss": "^8.5.25", "resend-mcp": "^2.9.0", "storybook": "^10.4.6", "tailwindcss": "^4.2.4", "ts-morph": "^28.0.0", "tsx": "^4.22.4", "typescript": "^6.0.3", "typescript-language-server": "^5.3.0", "vite": "^8.1.0", "vitest": "^4.1.9", "vscode-langservers-extracted": "^4.10.0", "wrangler": "^4.108.0", "ws": "^8.18.0", "yaml-language-server": "^1.23.0" }, "_sentryNextJsVersion": "16.2.12" } } }] } }, "root": "/Users/taj/klarpakke" }, "distDirRoot": ".next", "_originalRewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/paper-trading/:path*", "destination": "/api/paper-trading/:path*" }, { "source": "/leksjon/:lessonId", "destination": "/leksjon/[lessonId]" }], "fallback": [] }, "_originalRedirects": [{ "source": "/login", "destination": "/no/login", "permanent": true }, { "source": "/register", "destination": "/no/register", "permanent": true }, { "source": "/signup", "destination": "/register", "permanent": true }, { "source": "/:locale(no|en)/signup", "destination": "/:locale(no|en)/register", "permanent": true }, { "source": "/autotrade", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/:locale(no|en)/autotrade", "destination": "/:locale(no|en)/dashboard/auto-trade", "permanent": true }, { "source": "/paper-trading", "destination": "/handel", "permanent": true }, { "source": "/:locale(no|en)/paper-trading", "destination": "/:locale(no|en)/handel", "permanent": true }, { "source": "/paper-trading/:path*", "destination": "/handel", "permanent": true }, { "source": "/:locale(no|en)/paper-trading/:path*", "destination": "/:locale(no|en)/handel", "permanent": true }, { "source": "/live-trading", "destination": "/handel?mode=live", "permanent": true }, { "source": "/:locale(no|en)/live-trading", "destination": "/:locale(no|en)/handel?mode=live", "permanent": true }, { "source": "/:locale(no|en)/pricing", "destination": "/:locale(no|en)/priser", "permanent": true }, { "source": "/:locale(no|en)/learn", "destination": "/:locale(no|en)/kurs", "permanent": true }, { "source": "/:locale(no|en)/about", "destination": "/:locale(no|en)/om-oss", "permanent": true }, { "source": "/pricing", "destination": "/no/priser", "permanent": true }, { "source": "/learn", "destination": "/no/kurs", "permanent": true }, { "source": "/courses", "destination": "/no/kurs", "permanent": true }, { "source": "/courses/:path*", "destination": "/no/kurs/:path*", "permanent": true }, { "source": "/course/:path*", "destination": "/no/kurs/:path*", "permanent": true }, { "source": "/about", "destination": "/no/om-oss", "permanent": true }, { "source": "/contact", "destination": "/no/kontakt", "permanent": true }, { "source": "/privacy", "destination": "/no/personvern", "permanent": true }, { "source": "/terms", "destination": "/no/vilkar", "permanent": true }, { "source": "/blog", "destination": "/no", "permanent": false }, { "source": "/blog/:path*", "destination": "/no", "permanent": false }, { "source": "/dashbord", "destination": "/no/dashboard", "permanent": true }, { "source": "/:locale(no|en)/dashbord", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/marketplace", "destination": "/no/marketplace", "permanent": true }, { "source": "/settings", "destination": "/no/profile?tab=settings", "permanent": true }, { "source": "/om", "destination": "/no/om-oss", "permanent": true }, { "source": "/trading", "destination": "/no/dashboard/trade", "permanent": true }, { "source": "/portfolio", "destination": "/no/dashboard/portfolio", "permanent": true }, { "source": "/auto-trade", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/auto-trade/:path*", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/handelshistorikk", "destination": "/dashboard/historikk", "permanent": true }, { "source": "/:locale(no|en)/handelshistorikk", "destination": "/:locale(no|en)/dashboard/historikk", "permanent": true }, { "source": "/admin-dashboard", "destination": "/admin", "permanent": true }, { "source": "/:locale(no|en)/admin-dashboard", "destination": "/:locale(no|en)/admin", "permanent": true }, { "source": "/leaderboard-preview", "destination": "/leaderboard", "permanent": true }, { "source": "/:locale(no|en)/leaderboard-preview", "destination": "/:locale(no|en)/leaderboard", "permanent": true }, { "source": "/super-admin", "destination": "/admin", "permanent": true }, { "source": "/:locale(no|en)/super-admin", "destination": "/:locale(no|en)/admin", "permanent": true }, { "source": "/beta-testing", "destination": "/no/dashboard", "permanent": true }, { "source": "/:locale(no|en)/beta-testing", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/signals", "destination": "/dashboard", "permanent": true }, { "source": "/:locale(no|en)/signals", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/simulator", "destination": "/no/paper-trading", "permanent": true }, { "source": "/api/webhooks/github/:path*", "destination": "/api/v1/webhooks/github/:path*", "permanent": true }, { "source": "/:locale(no|en)/simulator", "destination": "/:locale(no|en)/paper-trading", "permanent": true }, { "source": "/:locale(no|en)/settings", "destination": "/:locale(no|en)/profile?tab=settings", "permanent": true }, { "source": "/:locale(no|en)/om", "destination": "/:locale(no|en)/om-oss", "permanent": true }, { "source": "/konto", "destination": "/no/profile?tab=wallet", "permanent": true }, { "source": "/:locale(no|en)/konto", "destination": "/:locale(no|en)/profile?tab=wallet", "permanent": true }, { "source": "/innstillinger", "destination": "/no/profile?tab=settings", "permanent": true }, { "source": "/:locale(no|en)/innstillinger", "destination": "/:locale(no|en)/profile?tab=settings", "permanent": true }] };
var BuildId = "1785687792907";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/paper-trading/:path*", "destination": "/api/paper-trading/:path*", "regex": "^/api/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/leksjon/:lessonId", "destination": "/leksjon/[lessonId]", "regex": "^/leksjon(?:/([^/]+?))(?:/)?$" }], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }, { "source": "/login", "destination": "/no/login", "statusCode": 308, "regex": "^(?!/_next)/login(?:/)?$" }, { "source": "/register", "destination": "/no/register", "statusCode": 308, "regex": "^(?!/_next)/register(?:/)?$" }, { "source": "/signup", "destination": "/register", "statusCode": 308, "regex": "^(?!/_next)/signup(?:/)?$" }, { "source": "/:locale(no|en)/signup", "destination": "/:locale(no|en)/register", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/signup(?:/)?$" }, { "source": "/autotrade", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/autotrade(?:/)?$" }, { "source": "/:locale(no|en)/autotrade", "destination": "/:locale(no|en)/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/autotrade(?:/)?$" }, { "source": "/paper-trading", "destination": "/handel", "statusCode": 308, "regex": "^(?!/_next)/paper-trading(?:/)?$" }, { "source": "/:locale(no|en)/paper-trading", "destination": "/:locale(no|en)/handel", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/paper-trading(?:/)?$" }, { "source": "/paper-trading/:path*", "destination": "/handel", "statusCode": 308, "regex": "^(?!/_next)/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/:locale(no|en)/paper-trading/:path*", "destination": "/:locale(no|en)/handel", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/live-trading", "destination": "/handel?mode=live", "statusCode": 308, "regex": "^(?!/_next)/live-trading(?:/)?$" }, { "source": "/:locale(no|en)/live-trading", "destination": "/:locale(no|en)/handel?mode=live", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/live-trading(?:/)?$" }, { "source": "/:locale(no|en)/pricing", "destination": "/:locale(no|en)/priser", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/pricing(?:/)?$" }, { "source": "/:locale(no|en)/learn", "destination": "/:locale(no|en)/kurs", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/learn(?:/)?$" }, { "source": "/:locale(no|en)/about", "destination": "/:locale(no|en)/om-oss", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/about(?:/)?$" }, { "source": "/pricing", "destination": "/no/priser", "statusCode": 308, "regex": "^(?!/_next)/pricing(?:/)?$" }, { "source": "/learn", "destination": "/no/kurs", "statusCode": 308, "regex": "^(?!/_next)/learn(?:/)?$" }, { "source": "/courses", "destination": "/no/kurs", "statusCode": 308, "regex": "^(?!/_next)/courses(?:/)?$" }, { "source": "/courses/:path*", "destination": "/no/kurs/:path*", "statusCode": 308, "regex": "^(?!/_next)/courses(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/course/:path*", "destination": "/no/kurs/:path*", "statusCode": 308, "regex": "^(?!/_next)/course(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/about", "destination": "/no/om-oss", "statusCode": 308, "regex": "^(?!/_next)/about(?:/)?$" }, { "source": "/contact", "destination": "/no/kontakt", "statusCode": 308, "regex": "^(?!/_next)/contact(?:/)?$" }, { "source": "/privacy", "destination": "/no/personvern", "statusCode": 308, "regex": "^(?!/_next)/privacy(?:/)?$" }, { "source": "/terms", "destination": "/no/vilkar", "statusCode": 308, "regex": "^(?!/_next)/terms(?:/)?$" }, { "source": "/blog", "destination": "/no", "statusCode": 307, "regex": "^(?!/_next)/blog(?:/)?$" }, { "source": "/blog/:path*", "destination": "/no", "statusCode": 307, "regex": "^(?!/_next)/blog(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/dashbord", "destination": "/no/dashboard", "statusCode": 308, "regex": "^(?!/_next)/dashbord(?:/)?$" }, { "source": "/:locale(no|en)/dashbord", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/dashbord(?:/)?$" }, { "source": "/marketplace", "destination": "/no/marketplace", "statusCode": 308, "regex": "^(?!/_next)/marketplace(?:/)?$" }, { "source": "/settings", "destination": "/no/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)/settings(?:/)?$" }, { "source": "/om", "destination": "/no/om-oss", "statusCode": 308, "regex": "^(?!/_next)/om(?:/)?$" }, { "source": "/trading", "destination": "/no/dashboard/trade", "statusCode": 308, "regex": "^(?!/_next)/trading(?:/)?$" }, { "source": "/portfolio", "destination": "/no/dashboard/portfolio", "statusCode": 308, "regex": "^(?!/_next)/portfolio(?:/)?$" }, { "source": "/auto-trade", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/auto-trade(?:/)?$" }, { "source": "/auto-trade/:path*", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/auto-trade(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/handelshistorikk", "destination": "/dashboard/historikk", "statusCode": 308, "regex": "^(?!/_next)/handelshistorikk(?:/)?$" }, { "source": "/:locale(no|en)/handelshistorikk", "destination": "/:locale(no|en)/dashboard/historikk", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/handelshistorikk(?:/)?$" }, { "source": "/admin-dashboard", "destination": "/admin", "statusCode": 308, "regex": "^(?!/_next)/admin-dashboard(?:/)?$" }, { "source": "/:locale(no|en)/admin-dashboard", "destination": "/:locale(no|en)/admin", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/admin-dashboard(?:/)?$" }, { "source": "/leaderboard-preview", "destination": "/leaderboard", "statusCode": 308, "regex": "^(?!/_next)/leaderboard-preview(?:/)?$" }, { "source": "/:locale(no|en)/leaderboard-preview", "destination": "/:locale(no|en)/leaderboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/leaderboard-preview(?:/)?$" }, { "source": "/super-admin", "destination": "/admin", "statusCode": 308, "regex": "^(?!/_next)/super-admin(?:/)?$" }, { "source": "/:locale(no|en)/super-admin", "destination": "/:locale(no|en)/admin", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/super-admin(?:/)?$" }, { "source": "/beta-testing", "destination": "/no/dashboard", "statusCode": 308, "regex": "^(?!/_next)/beta-testing(?:/)?$" }, { "source": "/:locale(no|en)/beta-testing", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/beta-testing(?:/)?$" }, { "source": "/signals", "destination": "/dashboard", "statusCode": 308, "regex": "^(?!/_next)/signals(?:/)?$" }, { "source": "/:locale(no|en)/signals", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/signals(?:/)?$" }, { "source": "/simulator", "destination": "/no/paper-trading", "statusCode": 308, "regex": "^(?!/_next)/simulator(?:/)?$" }, { "source": "/api/webhooks/github/:path*", "destination": "/api/v1/webhooks/github/:path*", "statusCode": 308, "regex": "^(?!/_next)/api/webhooks/github(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/:locale(no|en)/simulator", "destination": "/:locale(no|en)/paper-trading", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/simulator(?:/)?$" }, { "source": "/:locale(no|en)/settings", "destination": "/:locale(no|en)/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/settings(?:/)?$" }, { "source": "/:locale(no|en)/om", "destination": "/:locale(no|en)/om-oss", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/om(?:/)?$" }, { "source": "/konto", "destination": "/no/profile?tab=wallet", "statusCode": 308, "regex": "^(?!/_next)/konto(?:/)?$" }, { "source": "/:locale(no|en)/konto", "destination": "/:locale(no|en)/profile?tab=wallet", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/konto(?:/)?$" }, { "source": "/innstillinger", "destination": "/no/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)/innstillinger(?:/)?$" }, { "source": "/:locale(no|en)/innstillinger", "destination": "/:locale(no|en)/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/innstillinger(?:/)?$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_global-error", "regex": "^/_global\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/_global\\-error(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/api/admin/beta-signups", "regex": "^/api/admin/beta\\-signups(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/beta\\-signups(?:/)?$" }, { "page": "/api/admin/campaign/recent", "regex": "^/api/admin/campaign/recent(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/campaign/recent(?:/)?$" }, { "page": "/api/admin/campaign/stats", "regex": "^/api/admin/campaign/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/campaign/stats(?:/)?$" }, { "page": "/api/admin/cron-trigger", "regex": "^/api/admin/cron\\-trigger(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/cron\\-trigger(?:/)?$" }, { "page": "/api/admin/cta-analytics", "regex": "^/api/admin/cta\\-analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/cta\\-analytics(?:/)?$" }, { "page": "/api/admin/dashboard/data", "regex": "^/api/admin/dashboard/data(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/dashboard/data(?:/)?$" }, { "page": "/api/admin/errors", "regex": "^/api/admin/errors(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/errors(?:/)?$" }, { "page": "/api/admin/funnel/stats", "regex": "^/api/admin/funnel/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/funnel/stats(?:/)?$" }, { "page": "/api/admin/github-health", "regex": "^/api/admin/github\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/github\\-health(?:/)?$" }, { "page": "/api/admin/recent-signups", "regex": "^/api/admin/recent\\-signups(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/recent\\-signups(?:/)?$" }, { "page": "/api/admin/resend-health", "regex": "^/api/admin/resend\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/resend\\-health(?:/)?$" }, { "page": "/api/admin/sessions", "regex": "^/api/admin/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/sessions(?:/)?$" }, { "page": "/api/admin/stats", "regex": "^/api/admin/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/stats(?:/)?$" }, { "page": "/api/admin/stripe-health", "regex": "^/api/admin/stripe\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/stripe\\-health(?:/)?$" }, { "page": "/api/admin/students", "regex": "^/api/admin/students(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/students(?:/)?$" }, { "page": "/api/admin/support/cockpit-report", "regex": "^/api/admin/support/cockpit\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/cockpit\\-report(?:/)?$" }, { "page": "/api/admin/support/cockpit-report/status", "regex": "^/api/admin/support/cockpit\\-report/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/cockpit\\-report/status(?:/)?$" }, { "page": "/api/admin/support/impersonate/end", "regex": "^/api/admin/support/impersonate/end(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/impersonate/end(?:/)?$" }, { "page": "/api/admin/support/impersonate/start", "regex": "^/api/admin/support/impersonate/start(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/impersonate/start(?:/)?$" }, { "page": "/api/admin/test-binance-proxy", "regex": "^/api/admin/test\\-binance\\-proxy(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/test\\-binance\\-proxy(?:/)?$" }, { "page": "/api/admin/trade-health", "regex": "^/api/admin/trade\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trade\\-health(?:/)?$" }, { "page": "/api/admin/trade-health/fix", "regex": "^/api/admin/trade\\-health/fix(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trade\\-health/fix(?:/)?$" }, { "page": "/api/admin/trader-verifications", "regex": "^/api/admin/trader\\-verifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trader\\-verifications(?:/)?$" }, { "page": "/api/admin/user-paper-balance", "regex": "^/api/admin/user\\-paper\\-balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/user\\-paper\\-balance(?:/)?$" }, { "page": "/api/admin/user-tier", "regex": "^/api/admin/user\\-tier(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/user\\-tier(?:/)?$" }, { "page": "/api/admin/users", "regex": "^/api/admin/users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/users(?:/)?$" }, { "page": "/api/admin/users/sync", "regex": "^/api/admin/users/sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/users/sync(?:/)?$" }, { "page": "/api/admin/verify", "regex": "^/api/admin/verify(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/verify(?:/)?$" }, { "page": "/api/ai/analyze-trade", "regex": "^/api/ai/analyze\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/analyze\\-trade(?:/)?$" }, { "page": "/api/ai/autopilot/activate", "regex": "^/api/ai/autopilot/activate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/activate(?:/)?$" }, { "page": "/api/ai/autopilot/pause", "regex": "^/api/ai/autopilot/pause(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/pause(?:/)?$" }, { "page": "/api/ai/autopilot/rebalance", "regex": "^/api/ai/autopilot/rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/rebalance(?:/)?$" }, { "page": "/api/ai/autopilot/resume", "regex": "^/api/ai/autopilot/resume(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/resume(?:/)?$" }, { "page": "/api/ai/autopilot/status", "regex": "^/api/ai/autopilot/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/status(?:/)?$" }, { "page": "/api/ai/autopilot/stop", "regex": "^/api/ai/autopilot/stop(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/stop(?:/)?$" }, { "page": "/api/ai/chat", "regex": "^/api/ai/chat(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/chat(?:/)?$" }, { "page": "/api/ai/ensemble", "regex": "^/api/ai/ensemble(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/ensemble(?:/)?$" }, { "page": "/api/ai/ensemble-stats", "regex": "^/api/ai/ensemble\\-stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/ensemble\\-stats(?:/)?$" }, { "page": "/api/ai/explain-strategy", "regex": "^/api/ai/explain\\-strategy(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/explain\\-strategy(?:/)?$" }, { "page": "/api/ai/explain-trade", "regex": "^/api/ai/explain\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/explain\\-trade(?:/)?$" }, { "page": "/api/ai/insight", "regex": "^/api/ai/insight(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/insight(?:/)?$" }, { "page": "/api/ai/market-brief", "regex": "^/api/ai/market\\-brief(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/market\\-brief(?:/)?$" }, { "page": "/api/ai/sentiment", "regex": "^/api/ai/sentiment(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/sentiment(?:/)?$" }, { "page": "/api/analytics", "regex": "^/api/analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics(?:/)?$" }, { "page": "/api/analytics/event", "regex": "^/api/analytics/event(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics/event(?:/)?$" }, { "page": "/api/analytics/track", "regex": "^/api/analytics/track(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics/track(?:/)?$" }, { "page": "/api/auth/diagnose", "regex": "^/api/auth/diagnose(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/diagnose(?:/)?$" }, { "page": "/api/auth/logout", "regex": "^/api/auth/logout(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/logout(?:/)?$" }, { "page": "/api/auth/me", "regex": "^/api/auth/me(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/me(?:/)?$" }, { "page": "/api/auth/vipps-callback", "regex": "^/api/auth/vipps\\-callback(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/vipps\\-callback(?:/)?$" }, { "page": "/api/auth/vipps-url", "regex": "^/api/auth/vipps\\-url(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/vipps\\-url(?:/)?$" }, { "page": "/api/backtest", "regex": "^/api/backtest(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/backtest(?:/)?$" }, { "page": "/api/binance/encrypt", "regex": "^/api/binance/encrypt(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/encrypt(?:/)?$" }, { "page": "/api/binance/keys", "regex": "^/api/binance/keys(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/keys(?:/)?$" }, { "page": "/api/binance/test", "regex": "^/api/binance/test(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/test(?:/)?$" }, { "page": "/api/binance-leaders", "regex": "^/api/binance\\-leaders(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance\\-leaders(?:/)?$" }, { "page": "/api/chat", "regex": "^/api/chat(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/chat(?:/)?$" }, { "page": "/api/coin-prices", "regex": "^/api/coin\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/coin\\-prices(?:/)?$" }, { "page": "/api/copy-trading/discover", "regex": "^/api/copy\\-trading/discover(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/discover(?:/)?$" }, { "page": "/api/copy-trading/external-follow", "regex": "^/api/copy\\-trading/external\\-follow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/external\\-follow(?:/)?$" }, { "page": "/api/copy-trading/follow", "regex": "^/api/copy\\-trading/follow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/follow(?:/)?$" }, { "page": "/api/copy-trading/following", "regex": "^/api/copy\\-trading/following(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/following(?:/)?$" }, { "page": "/api/copy-trading/leaders", "regex": "^/api/copy\\-trading/leaders(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/leaders(?:/)?$" }, { "page": "/api/copy-trading/resolve-trader", "regex": "^/api/copy\\-trading/resolve\\-trader(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/resolve\\-trader(?:/)?$" }, { "page": "/api/copy-trading/unfollow", "regex": "^/api/copy\\-trading/unfollow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/unfollow(?:/)?$" }, { "page": "/api/cron/adverse-selection", "regex": "^/api/cron/adverse\\-selection(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/adverse\\-selection(?:/)?$" }, { "page": "/api/cron/ai-engine", "regex": "^/api/cron/ai\\-engine(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/ai\\-engine(?:/)?$" }, { "page": "/api/cron/ai-metrics", "regex": "^/api/cron/ai\\-metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/ai\\-metrics(?:/)?$" }, { "page": "/api/cron/auto-trade", "regex": "^/api/cron/auto\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/auto\\-trade(?:/)?$" }, { "page": "/api/cron/backtest-live-gap", "regex": "^/api/cron/backtest\\-live\\-gap(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/backtest\\-live\\-gap(?:/)?$" }, { "page": "/api/cron/balance-drift-check", "regex": "^/api/cron/balance\\-drift\\-check(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/balance\\-drift\\-check(?:/)?$" }, { "page": "/api/cron/binance-sync", "regex": "^/api/cron/binance\\-sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/binance\\-sync(?:/)?$" }, { "page": "/api/cron/cron-health", "regex": "^/api/cron/cron\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/cron\\-health(?:/)?$" }, { "page": "/api/cron/daily-summary", "regex": "^/api/cron/daily\\-summary(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/daily\\-summary(?:/)?$" }, { "page": "/api/cron/feature-loader", "regex": "^/api/cron/feature\\-loader(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/feature\\-loader(?:/)?$" }, { "page": "/api/cron/fill-rate-monitor", "regex": "^/api/cron/fill\\-rate\\-monitor(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/fill\\-rate\\-monitor(?:/)?$" }, { "page": "/api/cron/health-check", "regex": "^/api/cron/health\\-check(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/health\\-check(?:/)?$" }, { "page": "/api/cron/keepalive", "regex": "^/api/cron/keepalive(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/keepalive(?:/)?$" }, { "page": "/api/cron/market-impact", "regex": "^/api/cron/market\\-impact(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/market\\-impact(?:/)?$" }, { "page": "/api/cron/mifid2-export", "regex": "^/api/cron/mifid2\\-export(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/mifid2\\-export(?:/)?$" }, { "page": "/api/cron/monitoring-alert", "regex": "^/api/cron/monitoring\\-alert(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/monitoring\\-alert(?:/)?$" }, { "page": "/api/cron/outbox-recovery", "regex": "^/api/cron/outbox\\-recovery(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/outbox\\-recovery(?:/)?$" }, { "page": "/api/cron/pl-attribution", "regex": "^/api/cron/pl\\-attribution(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/pl\\-attribution(?:/)?$" }, { "page": "/api/cron/portfolio-rebalance", "regex": "^/api/cron/portfolio\\-rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/portfolio\\-rebalance(?:/)?$" }, { "page": "/api/cron/reconcile", "regex": "^/api/cron/reconcile(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/reconcile(?:/)?$" }, { "page": "/api/cron/signal-decay", "regex": "^/api/cron/signal\\-decay(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/signal\\-decay(?:/)?$" }, { "page": "/api/cron/signal-health-selfcheck", "regex": "^/api/cron/signal\\-health\\-selfcheck(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/signal\\-health\\-selfcheck(?:/)?$" }, { "page": "/api/cron/sync-prices", "regex": "^/api/cron/sync\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/sync\\-prices(?:/)?$" }, { "page": "/api/cron/tick", "regex": "^/api/cron/tick(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/tick(?:/)?$" }, { "page": "/api/cron/trading-tca", "regex": "^/api/cron/trading\\-tca(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/trading\\-tca(?:/)?$" }, { "page": "/api/cron/twap-execute", "regex": "^/api/cron/twap\\-execute(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/twap\\-execute(?:/)?$" }, { "page": "/api/cron/update-usdt-nok", "regex": "^/api/cron/update\\-usdt\\-nok(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/update\\-usdt\\-nok(?:/)?$" }, { "page": "/api/dashboard/bot-status", "regex": "^/api/dashboard/bot\\-status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/dashboard/bot\\-status(?:/)?$" }, { "page": "/api/dashboard/metrics", "regex": "^/api/dashboard/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/dashboard/metrics(?:/)?$" }, { "page": "/api/debug/i18n", "regex": "^/api/debug/i18n(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/debug/i18n(?:/)?$" }, { "page": "/api/email/send", "regex": "^/api/email/send(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/email/send(?:/)?$" }, { "page": "/api/error-report", "regex": "^/api/error\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/error\\-report(?:/)?$" }, { "page": "/api/exchanges/connections", "regex": "^/api/exchanges/connections(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/exchanges/connections(?:/)?$" }, { "page": "/api/exchanges/sync", "regex": "^/api/exchanges/sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/exchanges/sync(?:/)?$" }, { "page": "/api/fx/usdt-nok", "regex": "^/api/fx/usdt\\-nok(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/fx/usdt\\-nok(?:/)?$" }, { "page": "/api/gamification/achievements", "regex": "^/api/gamification/achievements(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/achievements(?:/)?$" }, { "page": "/api/gamification/award", "regex": "^/api/gamification/award(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/award(?:/)?$" }, { "page": "/api/gamification/stats", "regex": "^/api/gamification/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/stats(?:/)?$" }, { "page": "/api/health", "regex": "^/api/health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health(?:/)?$" }, { "page": "/api/health/oauth", "regex": "^/api/health/oauth(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/oauth(?:/)?$" }, { "page": "/api/health/sonar", "regex": "^/api/health/sonar(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/sonar(?:/)?$" }, { "page": "/api/health/websocket", "regex": "^/api/health/websocket(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/websocket(?:/)?$" }, { "page": "/api/klt/balance", "regex": "^/api/klt/balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/klt/balance(?:/)?$" }, { "page": "/api/klt/spending-options", "regex": "^/api/klt/spending\\-options(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/klt/spending\\-options(?:/)?$" }, { "page": "/api/leaderboard", "regex": "^/api/leaderboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leaderboard(?:/)?$" }, { "page": "/api/leaderboard/changes", "regex": "^/api/leaderboard/changes(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leaderboard/changes(?:/)?$" }, { "page": "/api/live/feed", "regex": "^/api/live/feed(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/live/feed(?:/)?$" }, { "page": "/api/live-feed", "regex": "^/api/live\\-feed(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/live\\-feed(?:/)?$" }, { "page": "/api/market/binance-24hr", "regex": "^/api/market/binance\\-24hr(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/binance\\-24hr(?:/)?$" }, { "page": "/api/market/binance-prices", "regex": "^/api/market/binance\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/binance\\-prices(?:/)?$" }, { "page": "/api/market/snapshot", "regex": "^/api/market/snapshot(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/snapshot(?:/)?$" }, { "page": "/api/market-intelligence", "regex": "^/api/market\\-intelligence(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market\\-intelligence(?:/)?$" }, { "page": "/api/marketplace/listings", "regex": "^/api/marketplace/listings(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/listings(?:/)?$" }, { "page": "/api/marketplace/reviews", "regex": "^/api/marketplace/reviews(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/reviews(?:/)?$" }, { "page": "/api/marketplace/subscribe", "regex": "^/api/marketplace/subscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/subscribe(?:/)?$" }, { "page": "/api/metrics", "regex": "^/api/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/metrics(?:/)?$" }, { "page": "/api/notifications", "regex": "^/api/notifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications(?:/)?$" }, { "page": "/api/notifications/send", "regex": "^/api/notifications/send(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/send(?:/)?$" }, { "page": "/api/notifications/send-push", "regex": "^/api/notifications/send\\-push(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/send\\-push(?:/)?$" }, { "page": "/api/notifications/subscribe", "regex": "^/api/notifications/subscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/subscribe(?:/)?$" }, { "page": "/api/notifications/unsubscribe", "regex": "^/api/notifications/unsubscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/unsubscribe(?:/)?$" }, { "page": "/api/og", "regex": "^/api/og(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/og(?:/)?$" }, { "page": "/api/onboarding/complete", "regex": "^/api/onboarding/complete(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/complete(?:/)?$" }, { "page": "/api/onboarding/events", "regex": "^/api/onboarding/events(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/events(?:/)?$" }, { "page": "/api/onboarding/first-paper-trade", "regex": "^/api/onboarding/first\\-paper\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/first\\-paper\\-trade(?:/)?$" }, { "page": "/api/onboarding/start", "regex": "^/api/onboarding/start(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/start(?:/)?$" }, { "page": "/api/paper-trading/balance", "regex": "^/api/paper\\-trading/balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/balance(?:/)?$" }, { "page": "/api/paper-trading/execute", "regex": "^/api/paper\\-trading/execute(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/execute(?:/)?$" }, { "page": "/api/paper-trading/init", "regex": "^/api/paper\\-trading/init(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/init(?:/)?$" }, { "page": "/api/paper-trading/reset", "regex": "^/api/paper\\-trading/reset(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/reset(?:/)?$" }, { "page": "/api/pilot", "regex": "^/api/pilot(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot(?:/)?$" }, { "page": "/api/pilot-engine", "regex": "^/api/pilot\\-engine(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine(?:/)?$" }, { "page": "/api/pilot-engine/leaderboard", "regex": "^/api/pilot\\-engine/leaderboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine/leaderboard(?:/)?$" }, { "page": "/api/pilot-engine/notifications", "regex": "^/api/pilot\\-engine/notifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine/notifications(?:/)?$" }, { "page": "/api/portfolio/chart", "regex": "^/api/portfolio/chart(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/chart(?:/)?$" }, { "page": "/api/portfolio/rebalance", "regex": "^/api/portfolio/rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/rebalance(?:/)?$" }, { "page": "/api/portfolio/summary", "regex": "^/api/portfolio/summary(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/summary(?:/)?$" }, { "page": "/api/pricing", "regex": "^/api/pricing(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pricing(?:/)?$" }, { "page": "/api/progress", "regex": "^/api/progress(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/progress(?:/)?$" }, { "page": "/api/revalidate", "regex": "^/api/revalidate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/revalidate(?:/)?$" }, { "page": "/api/send-email", "regex": "^/api/send\\-email(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/send\\-email(?:/)?$" }, { "page": "/api/signal/current", "regex": "^/api/signal/current(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/signal/current(?:/)?$" }, { "page": "/api/signal/explanation", "regex": "^/api/signal/explanation(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/signal/explanation(?:/)?$" }, { "page": "/api/stats", "regex": "^/api/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats(?:/)?$" }, { "page": "/api/stats/active-users", "regex": "^/api/stats/active\\-users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats/active\\-users(?:/)?$" }, { "page": "/api/stats/users", "regex": "^/api/stats/users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats/users(?:/)?$" }, { "page": "/api/stripe/checkout", "regex": "^/api/stripe/checkout(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/checkout(?:/)?$" }, { "page": "/api/stripe/customer-portal", "regex": "^/api/stripe/customer\\-portal(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/customer\\-portal(?:/)?$" }, { "page": "/api/stripe/verify-session", "regex": "^/api/stripe/verify\\-session(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/verify\\-session(?:/)?$" }, { "page": "/api/telemetry/backtest", "regex": "^/api/telemetry/backtest(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/telemetry/backtest(?:/)?$" }, { "page": "/api/test/auth/login", "regex": "^/api/test/auth/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/test/auth/login(?:/)?$" }, { "page": "/api/test/set-onboarding", "regex": "^/api/test/set\\-onboarding(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/test/set\\-onboarding(?:/)?$" }, { "page": "/api/track/click", "regex": "^/api/track/click(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/click(?:/)?$" }, { "page": "/api/track/funnel", "regex": "^/api/track/funnel(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/funnel(?:/)?$" }, { "page": "/api/track/open", "regex": "^/api/track/open(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/open(?:/)?$" }, { "page": "/api/trading/auto-trade/activate", "regex": "^/api/trading/auto\\-trade/activate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/auto\\-trade/activate(?:/)?$" }, { "page": "/api/trading/mode", "regex": "^/api/trading/mode(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/mode(?:/)?$" }, { "page": "/api/trading/position", "regex": "^/api/trading/position(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/position(?:/)?$" }, { "page": "/api/trading/sessions", "regex": "^/api/trading/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/sessions(?:/)?$" }, { "page": "/api/trading/trigger", "regex": "^/api/trading/trigger(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/trigger(?:/)?$" }, { "page": "/api/trading/v3/beta/status", "regex": "^/api/trading/v3/beta/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/beta/status(?:/)?$" }, { "page": "/api/trading/v3/health", "regex": "^/api/trading/v3/health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/health(?:/)?$" }, { "page": "/api/trading/v3/rl/signal", "regex": "^/api/trading/v3/rl/signal(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/rl/signal(?:/)?$" }, { "page": "/api/trading/v3/tax/eu-report", "regex": "^/api/trading/v3/tax/eu\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/tax/eu\\-report(?:/)?$" }, { "page": "/api/trading/v3/whitelabel/fees", "regex": "^/api/trading/v3/whitelabel/fees(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/whitelabel/fees(?:/)?$" }, { "page": "/api/trading-cockpit", "regex": "^/api/trading\\-cockpit(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit(?:/)?$" }, { "page": "/api/trading-cockpit/analytics", "regex": "^/api/trading\\-cockpit/analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/analytics(?:/)?$" }, { "page": "/api/trading-cockpit/initial", "regex": "^/api/trading\\-cockpit/initial(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/initial(?:/)?$" }, { "page": "/api/trading-cockpit/metrics", "regex": "^/api/trading\\-cockpit/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/metrics(?:/)?$" }, { "page": "/api/trading-cockpit/sessions", "regex": "^/api/trading\\-cockpit/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/sessions(?:/)?$" }, { "page": "/api/trading-cockpit/trades", "regex": "^/api/trading\\-cockpit/trades(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/trades(?:/)?$" }, { "page": "/api/trading-sessions/create", "regex": "^/api/trading\\-sessions/create(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-sessions/create(?:/)?$" }, { "page": "/api/user/auto-trading-config", "regex": "^/api/user/auto\\-trading\\-config(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/auto\\-trading\\-config(?:/)?$" }, { "page": "/api/user/badges", "regex": "^/api/user/badges(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/badges(?:/)?$" }, { "page": "/api/user/email-preferences", "regex": "^/api/user/email\\-preferences(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/email\\-preferences(?:/)?$" }, { "page": "/api/user/klt-wallet", "regex": "^/api/user/klt\\-wallet(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/klt\\-wallet(?:/)?$" }, { "page": "/api/user/notification-preferences", "regex": "^/api/user/notification\\-preferences(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/notification\\-preferences(?:/)?$" }, { "page": "/api/user/onboarding", "regex": "^/api/user/onboarding(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/onboarding(?:/)?$" }, { "page": "/api/user/profile", "regex": "^/api/user/profile(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/profile(?:/)?$" }, { "page": "/api/user/pulse", "regex": "^/api/user/pulse(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/pulse(?:/)?$" }, { "page": "/api/user/strategy-stats", "regex": "^/api/user/strategy\\-stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/strategy\\-stats(?:/)?$" }, { "page": "/api/user/trade-decisions", "regex": "^/api/user/trade\\-decisions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trade\\-decisions(?:/)?$" }, { "page": "/api/user/trades", "regex": "^/api/user/trades(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trades(?:/)?$" }, { "page": "/api/user/trading-analytics", "regex": "^/api/user/trading\\-analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-analytics(?:/)?$" }, { "page": "/api/user/trading-diagnostics", "regex": "^/api/user/trading\\-diagnostics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-diagnostics(?:/)?$" }, { "page": "/api/user/trading-logs", "regex": "^/api/user/trading\\-logs(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-logs(?:/)?$" }, { "page": "/api/user/trading-sessions/restart", "regex": "^/api/user/trading\\-sessions/restart(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-sessions/restart(?:/)?$" }, { "page": "/api/webhooks/resend", "regex": "^/api/webhooks/resend(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/resend(?:/)?$" }, { "page": "/api/webhooks/sanity", "regex": "^/api/webhooks/sanity(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/sanity(?:/)?$" }, { "page": "/api/webhooks/stripe", "regex": "^/api/webhooks/stripe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/stripe(?:/)?$" }, { "page": "/api/webhooks/vipps", "regex": "^/api/webhooks/vipps(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/vipps(?:/)?$" }, { "page": "/favicon.ico", "regex": "^/favicon\\.ico(?:/)?$", "routeKeys": {}, "namedRegex": "^/favicon\\.ico(?:/)?$" }, { "page": "/robots.txt", "regex": "^/robots\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/robots\\.txt(?:/)?$" }, { "page": "/sitemap.xml", "regex": "^/sitemap\\.xml(?:/)?$", "routeKeys": {}, "namedRegex": "^/sitemap\\.xml(?:/)?$" }], "dynamic": [{ "page": "/api/admin/errors/[id]/resolve", "regex": "^/api/admin/errors/([^/]+?)/resolve(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/admin/errors/(?<nxtPid>[^/]+?)/resolve(?:/)?$" }, { "page": "/api/copy-trading/trader/[id]", "regex": "^/api/copy\\-trading/trader/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/copy\\-trading/trader/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/courses/[id]", "regex": "^/api/courses/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/courses/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/paper-trading/trades/[trade_id]", "regex": "^/api/paper\\-trading/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrade_id": "nxtPtrade_id" }, "namedRegex": "^/api/paper\\-trading/trades/(?<nxtPtrade_id>[^/]+?)(?:/)?$" }, { "page": "/api/progress/[courseId]", "regex": "^/api/progress/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcourseId": "nxtPcourseId" }, "namedRegex": "^/api/progress/(?<nxtPcourseId>[^/]+?)(?:/)?$" }, { "page": "/api/trader-verifications/[trader_profile_id]", "regex": "^/api/trader\\-verifications/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrader_profile_id": "nxtPtrader_profile_id" }, "namedRegex": "^/api/trader\\-verifications/(?<nxtPtrader_profile_id>[^/]+?)(?:/)?$" }, { "page": "/api/trades/[tradeId]", "regex": "^/api/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtradeId": "nxtPtradeId" }, "namedRegex": "^/api/trades/(?<nxtPtradeId>[^/]+?)(?:/)?$" }, { "page": "/api/trading/v3/trades/[sessionId]", "regex": "^/api/trading/v3/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPsessionId": "nxtPsessionId" }, "namedRegex": "^/api/trading/v3/trades/(?<nxtPsessionId>[^/]+?)(?:/)?$" }, { "page": "/api/trading-sessions/[id]/status", "regex": "^/api/trading\\-sessions/([^/]+?)/status(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/trading\\-sessions/(?<nxtPid>[^/]+?)/status(?:/)?$" }, { "page": "/studio/[[...tool]]", "regex": "^/studio(?:/(.+?))?(?:/)?$", "routeKeys": { "nxtPtool": "nxtPtool" }, "namedRegex": "^/studio(?:/(?<nxtPtool>.+?))?(?:/)?$" }, { "page": "/[locale]", "regex": "^/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)(?:/)?$" }, { "page": "/[locale]/about", "regex": "^/([^/]+?)/about(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/about(?:/)?$" }, { "page": "/[locale]/admin", "regex": "^/([^/]+?)/admin(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin(?:/)?$" }, { "page": "/[locale]/admin/ab-tests", "regex": "^/([^/]+?)/admin/ab\\-tests(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/ab\\-tests(?:/)?$" }, { "page": "/[locale]/admin/analytics", "regex": "^/([^/]+?)/admin/analytics(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/analytics(?:/)?$" }, { "page": "/[locale]/admin/auto-trading", "regex": "^/([^/]+?)/admin/auto\\-trading(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/auto\\-trading(?:/)?$" }, { "page": "/[locale]/admin/auto-trading/sessions", "regex": "^/([^/]+?)/admin/auto\\-trading/sessions(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/auto\\-trading/sessions(?:/)?$" }, { "page": "/[locale]/admin/campaign", "regex": "^/([^/]+?)/admin/campaign(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/campaign(?:/)?$" }, { "page": "/[locale]/admin/deploy", "regex": "^/([^/]+?)/admin/deploy(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/deploy(?:/)?$" }, { "page": "/[locale]/admin/forgot-password", "regex": "^/([^/]+?)/admin/forgot\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/forgot\\-password(?:/)?$" }, { "page": "/[locale]/admin/health", "regex": "^/([^/]+?)/admin/health(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/health(?:/)?$" }, { "page": "/[locale]/admin/login", "regex": "^/([^/]+?)/admin/login(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/login(?:/)?$" }, { "page": "/[locale]/admin/marketing/ctas", "regex": "^/([^/]+?)/admin/marketing/ctas(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/marketing/ctas(?:/)?$" }, { "page": "/[locale]/admin/monetization", "regex": "^/([^/]+?)/admin/monetization(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/monetization(?:/)?$" }, { "page": "/[locale]/admin/monitor", "regex": "^/([^/]+?)/admin/monitor(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/monitor(?:/)?$" }, { "page": "/[locale]/admin/reset-password", "regex": "^/([^/]+?)/admin/reset\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/reset\\-password(?:/)?$" }, { "page": "/[locale]/admin/settings", "regex": "^/([^/]+?)/admin/settings(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/settings(?:/)?$" }, { "page": "/[locale]/admin/students", "regex": "^/([^/]+?)/admin/students(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/students(?:/)?$" }, { "page": "/[locale]/admin/support/impersonate", "regex": "^/([^/]+?)/admin/support/impersonate(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/support/impersonate(?:/)?$" }, { "page": "/[locale]/admin/sync-status", "regex": "^/([^/]+?)/admin/sync\\-status(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/sync\\-status(?:/)?$" }, { "page": "/[locale]/admin/system", "regex": "^/([^/]+?)/admin/system(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/system(?:/)?$" }, { "page": "/[locale]/admin/trade-health", "regex": "^/([^/]+?)/admin/trade\\-health(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/trade\\-health(?:/)?$" }, { "page": "/[locale]/admin/trader-verifications", "regex": "^/([^/]+?)/admin/trader\\-verifications(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/trader\\-verifications(?:/)?$" }, { "page": "/[locale]/admin/users", "regex": "^/([^/]+?)/admin/users(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/users(?:/)?$" }, { "page": "/[locale]/admin/v2", "regex": "^/([^/]+?)/admin/v2(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/v2(?:/)?$" }, { "page": "/[locale]/admin/v3", "regex": "^/([^/]+?)/admin/v3(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/v3(?:/)?$" }, { "page": "/[locale]/akademi", "regex": "^/([^/]+?)/akademi(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/akademi(?:/)?$" }, { "page": "/[locale]/akademi/dashboard-guide", "regex": "^/([^/]+?)/akademi/dashboard\\-guide(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/akademi/dashboard\\-guide(?:/)?$" }, { "page": "/[locale]/api-dokumentasjon", "regex": "^/([^/]+?)/api\\-dokumentasjon(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/api\\-dokumentasjon(?:/)?$" }, { "page": "/[locale]/binance-guide", "regex": "^/([^/]+?)/binance\\-guide(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/binance\\-guide(?:/)?$" }, { "page": "/[locale]/bots", "regex": "^/([^/]+?)/bots(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/bots(?:/)?$" }, { "page": "/[locale]/callback", "regex": "^/([^/]+?)/callback(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/callback(?:/)?$" }, { "page": "/[locale]/checkout", "regex": "^/([^/]+?)/checkout(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/checkout(?:/)?$" }, { "page": "/[locale]/checkout/success", "regex": "^/([^/]+?)/checkout/success(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/checkout/success(?:/)?$" }, { "page": "/[locale]/cookies", "regex": "^/([^/]+?)/cookies(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/cookies(?:/)?$" }, { "page": "/[locale]/copy-trading", "regex": "^/([^/]+?)/copy\\-trading(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading(?:/)?$" }, { "page": "/[locale]/copy-trading/discover", "regex": "^/([^/]+?)/copy\\-trading/discover(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading/discover(?:/)?$" }, { "page": "/[locale]/copy-trading/traders/[id]", "regex": "^/([^/]+?)/copy\\-trading/traders/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPid": "nxtPid" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading/traders/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard", "regex": "^/([^/]+?)/dashboard(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard(?:/)?$" }, { "page": "/[locale]/dashboard/analysis", "regex": "^/([^/]+?)/dashboard/analysis(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/analysis(?:/)?$" }, { "page": "/[locale]/dashboard/asset/[symbol]", "regex": "^/([^/]+?)/dashboard/asset/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPsymbol": "nxtPsymbol" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/asset/(?<nxtPsymbol>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard/bot/[session_id]", "regex": "^/([^/]+?)/dashboard/bot/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPsession_id": "nxtPsession_id" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/bot/(?<nxtPsession_id>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard/historikk", "regex": "^/([^/]+?)/dashboard/historikk(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/historikk(?:/)?$" }, { "page": "/[locale]/dashboard/portfolio", "regex": "^/([^/]+?)/dashboard/portfolio(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/portfolio(?:/)?$" }, { "page": "/[locale]/dashboard/referral", "regex": "^/([^/]+?)/dashboard/referral(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/referral(?:/)?$" }, { "page": "/[locale]/dashboard/resultater", "regex": "^/([^/]+?)/dashboard/resultater(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/resultater(?:/)?$" }, { "page": "/[locale]/dashboard/settings", "regex": "^/([^/]+?)/dashboard/settings(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/settings(?:/)?$" }, { "page": "/[locale]/dashboard/trade", "regex": "^/([^/]+?)/dashboard/trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/trade(?:/)?$" }, { "page": "/[locale]/driftsfeil", "regex": "^/([^/]+?)/driftsfeil(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/driftsfeil(?:/)?$" }, { "page": "/[locale]/feil/ikke-funnet", "regex": "^/([^/]+?)/feil/ikke\\-funnet(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/ikke\\-funnet(?:/)?$" }, { "page": "/[locale]/feil/ingen-tilgang", "regex": "^/([^/]+?)/feil/ingen\\-tilgang(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/ingen\\-tilgang(?:/)?$" }, { "page": "/[locale]/feil/serverfeil", "regex": "^/([^/]+?)/feil/serverfeil(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/serverfeil(?:/)?$" }, { "page": "/[locale]/handel", "regex": "^/([^/]+?)/handel(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/handel(?:/)?$" }, { "page": "/[locale]/hjelp", "regex": "^/([^/]+?)/hjelp(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/hjelp(?:/)?$" }, { "page": "/[locale]/jokertrade", "regex": "^/([^/]+?)/jokertrade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/jokertrade(?:/)?$" }, { "page": "/[locale]/kalkulator", "regex": "^/([^/]+?)/kalkulator(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kalkulator(?:/)?$" }, { "page": "/[locale]/kontakt", "regex": "^/([^/]+?)/kontakt(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kontakt(?:/)?$" }, { "page": "/[locale]/kurs", "regex": "^/([^/]+?)/kurs(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs(?:/)?$" }, { "page": "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto", "regex": "^/([^/]+?)/kurs/grunnleggende/leksjon/introduksjon\\-til\\-krypto(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/grunnleggende/leksjon/introduksjon\\-til\\-krypto(?:/)?$" }, { "page": "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging", "regex": "^/([^/]+?)/kurs/strategi/leksjon/dollar\\-cost\\-averaging(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/strategi/leksjon/dollar\\-cost\\-averaging(?:/)?$" }, { "page": "/[locale]/kurs/[moduleSlug]", "regex": "^/([^/]+?)/kurs/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPmoduleSlug": "nxtPmoduleSlug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/(?<nxtPmoduleSlug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]", "regex": "^/([^/]+?)/kurs/([^/]+?)/leksjon/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPmoduleSlug": "nxtPmoduleSlug", "nxtPlessonSlug": "nxtPlessonSlug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/(?<nxtPmoduleSlug>[^/]+?)/leksjon/(?<nxtPlessonSlug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/leaderboard", "regex": "^/([^/]+?)/leaderboard(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/leaderboard(?:/)?$" }, { "page": "/[locale]/leksjon/[lessonId]", "regex": "^/([^/]+?)/leksjon/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPlessonId": "nxtPlessonId" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/leksjon/(?<nxtPlessonId>[^/]+?)(?:/)?$" }, { "page": "/[locale]/login", "regex": "^/([^/]+?)/login(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/login(?:/)?$" }, { "page": "/[locale]/marked", "regex": "^/([^/]+?)/marked(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/marked(?:/)?$" }, { "page": "/[locale]/marketplace", "regex": "^/([^/]+?)/marketplace(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/marketplace(?:/)?$" }, { "page": "/[locale]/mobiloversikt", "regex": "^/([^/]+?)/mobiloversikt(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/mobiloversikt(?:/)?$" }, { "page": "/[locale]/om-oss", "regex": "^/([^/]+?)/om\\-oss(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/om\\-oss(?:/)?$" }, { "page": "/[locale]/onboarding", "regex": "^/([^/]+?)/onboarding(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding(?:/)?$" }, { "page": "/[locale]/onboarding/step1-welcome", "regex": "^/([^/]+?)/onboarding/step1\\-welcome(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step1\\-welcome(?:/)?$" }, { "page": "/[locale]/onboarding/step2-level", "regex": "^/([^/]+?)/onboarding/step2\\-level(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step2\\-level(?:/)?$" }, { "page": "/[locale]/onboarding/step3-trading-mode", "regex": "^/([^/]+?)/onboarding/step3\\-trading\\-mode(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step3\\-trading\\-mode(?:/)?$" }, { "page": "/[locale]/onboarding/step4-binance", "regex": "^/([^/]+?)/onboarding/step4\\-binance(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step4\\-binance(?:/)?$" }, { "page": "/[locale]/onboarding/step4-first-trade", "regex": "^/([^/]+?)/onboarding/step4\\-first\\-trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step4\\-first\\-trade(?:/)?$" }, { "page": "/[locale]/onboarding/step5-complete", "regex": "^/([^/]+?)/onboarding/step5\\-complete(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step5\\-complete(?:/)?$" }, { "page": "/[locale]/personvern", "regex": "^/([^/]+?)/personvern(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/personvern(?:/)?$" }, { "page": "/[locale]/pilot", "regex": "^/([^/]+?)/pilot(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/pilot(?:/)?$" }, { "page": "/[locale]/priser", "regex": "^/([^/]+?)/priser(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser(?:/)?$" }, { "page": "/[locale]/priser/cancel", "regex": "^/([^/]+?)/priser/cancel(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser/cancel(?:/)?$" }, { "page": "/[locale]/priser/success", "regex": "^/([^/]+?)/priser/success(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser/success(?:/)?$" }, { "page": "/[locale]/profile", "regex": "^/([^/]+?)/profile(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/profile(?:/)?$" }, { "page": "/[locale]/register", "regex": "^/([^/]+?)/register(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/register(?:/)?$" }, { "page": "/[locale]/reset-password", "regex": "^/([^/]+?)/reset\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/reset\\-password(?:/)?$" }, { "page": "/[locale]/trade", "regex": "^/([^/]+?)/trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trade(?:/)?$" }, { "page": "/[locale]/update-password", "regex": "^/([^/]+?)/update\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/update\\-password(?:/)?$" }, { "page": "/[locale]/vanlige-sporsmal", "regex": "^/([^/]+?)/vanlige\\-sporsmal(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/vanlige\\-sporsmal(?:/)?$" }, { "page": "/[locale]/velg-strategi", "regex": "^/([^/]+?)/velg\\-strategi(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/velg\\-strategi(?:/)?$" }, { "page": "/[locale]/velkommen", "regex": "^/([^/]+?)/velkommen(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/velkommen(?:/)?$" }, { "page": "/[locale]/vilkar", "regex": "^/([^/]+?)/vilkar(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/vilkar(?:/)?$" }, { "page": "/[locale]/[...slug]", "regex": "^/([^/]+?)/(.+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/(?<nxtPslug>.+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [{ "source": "/:path*", "headers": [{ "key": "X-Frame-Options", "value": "DENY" }, { "key": "X-Content-Type-Options", "value": "nosniff" }, { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }, { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" }, { "key": "X-DNS-Prefetch-Control", "value": "on" }, { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }, { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }, { "key": "Cross-Origin-Resource-Policy", "value": "cross-origin" }, { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }, { "key": "Link", "value": '<https://klarpakke.no/:path*>; rel="canonical"' }], "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/studio(.*)", "headers": [{ "key": "X-Frame-Options", "value": "SAMEORIGIN" }], "regex": "^/studio(.*)(?:/)?$" }];
var PrerenderManifest = { "version": 4, "routes": { "/": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/", "dataRoute": "/index.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_global-error": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_global-error", "dataRoute": "/_global-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/api/ai/sentiment": { "initialHeaders": { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600", "content-type": "application/json", "x-next-cache-tags": "_N_T_/layout,_N_T_/api/layout,_N_T_/api/ai/layout,_N_T_/api/ai/sentiment/layout,_N_T_/api/ai/sentiment/route,_N_T_/api/ai/sentiment" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 900, "initialExpireSeconds": 31536e3, "srcRoute": "/api/ai/sentiment", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/api/fx/usdt-nok": { "initialHeaders": { "cache-control": "public, s-maxage=30, stale-while-revalidate=300", "content-type": "application/json", "x-next-cache-tags": "_N_T_/layout,_N_T_/api/layout,_N_T_/api/fx/layout,_N_T_/api/fx/usdt-nok/layout,_N_T_/api/fx/usdt-nok/route,_N_T_/api/fx/usdt-nok" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 30, "initialExpireSeconds": 31536e3, "srcRoute": "/api/fx/usdt-nok", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 60, "initialExpireSeconds": 31536e3, "srcRoute": "/[locale]/driftsfeil", "dataRoute": "/en/driftsfeil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/favicon.ico": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/x-icon", "x-next-cache-tags": "_N_T_/layout,_N_T_/favicon.ico/layout,_N_T_/favicon.ico/route,_N_T_/favicon.ico" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/favicon.ico", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/no/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 60, "initialExpireSeconds": 31536e3, "srcRoute": "/[locale]/driftsfeil", "dataRoute": "/no/driftsfeil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/robots.txt": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "text/plain", "x-next-cache-tags": "_N_T_/layout,_N_T_/robots.txt/layout,_N_T_/robots.txt/route,_N_T_/robots.txt" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/robots.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": { "/[locale]/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/driftsfeil(?:/)?$", "dataRoute": "/[locale]/driftsfeil.rsc", "fallback": false, "fallbackRootParams": [], "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/driftsfeil\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "notFoundRoutes": [], "preview": { "previewModeId": "4eaf439f5b42886fbb062fb8cb96e061", "previewModeSigningKey": "2b952ce646aa80247e0cf1b3116da5807cc73d94dac94364dfb9280ae9f657d5", "previewModeEncryptionKey": "fca4a9594b13b9038c85559a03ad3f92922cdc3bb6f503cb198a6f7ba9c55492" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge/chunks/[root-of-the-server]__1_x6o4q._.js", "server/edge/chunks/[root-of-the-server]__0fsa3kx._.js", "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js"], "name": "middleware", "page": "/", "entrypoint": "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$", "originalSource": "/((?!_next/static|_next/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "1785687792907", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "tepN3di05FpNaylqbU13g5eje7l/MMFD+ERi8HTsWR0=", "__NEXT_PREVIEW_MODE_ID": "4eaf439f5b42886fbb062fb8cb96e061", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "fca4a9594b13b9038c85559a03ad3f92922cdc3bb6f503cb198a6f7ba9c55492", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "2b952ce646aa80247e0cf1b3116da5807cc73d94dac94364dfb9280ae9f657d5" } } }, "sortedMiddleware": ["/"], "functions": {} };
var AppPathRoutesManifest = { "/[locale]/(academy)/akademi/dashboard-guide/page": "/[locale]/akademi/dashboard-guide", "/[locale]/(academy)/akademi/page": "/[locale]/akademi", "/[locale]/(academy)/kurs/[moduleSlug]/leksjon/[lessonSlug]/page": "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]", "/[locale]/(academy)/kurs/[moduleSlug]/page": "/[locale]/kurs/[moduleSlug]", "/[locale]/(academy)/kurs/grunnleggende/leksjon/introduksjon-til-krypto/page": "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto", "/[locale]/(academy)/kurs/page": "/[locale]/kurs", "/[locale]/(academy)/kurs/strategi/leksjon/dollar-cost-averaging/page": "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging", "/[locale]/(academy)/leksjon/[lessonId]/page": "/[locale]/leksjon/[lessonId]", "/[locale]/(admin)/admin/ab-tests/page": "/[locale]/admin/ab-tests", "/[locale]/(admin)/admin/analytics/page": "/[locale]/admin/analytics", "/[locale]/(admin)/admin/auto-trading/page": "/[locale]/admin/auto-trading", "/[locale]/(admin)/admin/auto-trading/sessions/page": "/[locale]/admin/auto-trading/sessions", "/[locale]/(admin)/admin/campaign/page": "/[locale]/admin/campaign", "/[locale]/(admin)/admin/deploy/page": "/[locale]/admin/deploy", "/[locale]/(admin)/admin/forgot-password/page": "/[locale]/admin/forgot-password", "/[locale]/(admin)/admin/health/page": "/[locale]/admin/health", "/[locale]/(admin)/admin/login/page": "/[locale]/admin/login", "/[locale]/(admin)/admin/marketing/ctas/page": "/[locale]/admin/marketing/ctas", "/[locale]/(admin)/admin/monetization/page": "/[locale]/admin/monetization", "/[locale]/(admin)/admin/monitor/page": "/[locale]/admin/monitor", "/[locale]/(admin)/admin/page": "/[locale]/admin", "/[locale]/(admin)/admin/reset-password/page": "/[locale]/admin/reset-password", "/[locale]/(admin)/admin/settings/page": "/[locale]/admin/settings", "/[locale]/(admin)/admin/students/page": "/[locale]/admin/students", "/[locale]/(admin)/admin/support/impersonate/page": "/[locale]/admin/support/impersonate", "/[locale]/(admin)/admin/sync-status/page": "/[locale]/admin/sync-status", "/[locale]/(admin)/admin/system/page": "/[locale]/admin/system", "/[locale]/(admin)/admin/trade-health/page": "/[locale]/admin/trade-health", "/[locale]/(admin)/admin/trader-verifications/page": "/[locale]/admin/trader-verifications", "/[locale]/(admin)/admin/users/page": "/[locale]/admin/users", "/[locale]/(admin)/admin/v2/page": "/[locale]/admin/v2", "/[locale]/(admin)/admin/v3/page": "/[locale]/admin/v3", "/[locale]/(auth)/login/page": "/[locale]/login", "/[locale]/(auth)/register/page": "/[locale]/register", "/[locale]/(auth)/reset-password/page": "/[locale]/reset-password", "/[locale]/(auth)/update-password/page": "/[locale]/update-password", "/[locale]/(commerce)/checkout/page": "/[locale]/checkout", "/[locale]/(commerce)/checkout/success/page": "/[locale]/checkout/success", "/[locale]/(commerce)/marketplace/page": "/[locale]/marketplace", "/[locale]/(legal)/cookies/page": "/[locale]/cookies", "/[locale]/(legal)/driftsfeil/page": "/[locale]/driftsfeil", "/[locale]/(legal)/personvern/page": "/[locale]/personvern", "/[locale]/(legal)/vilkar/page": "/[locale]/vilkar", "/[locale]/(marketing)/about/page": "/[locale]/about", "/[locale]/(marketing)/api-dokumentasjon/page": "/[locale]/api-dokumentasjon", "/[locale]/(marketing)/binance-guide/page": "/[locale]/binance-guide", "/[locale]/(marketing)/bots/page": "/[locale]/bots", "/[locale]/(marketing)/hjelp/page": "/[locale]/hjelp", "/[locale]/(marketing)/kalkulator/page": "/[locale]/kalkulator", "/[locale]/(marketing)/kontakt/page": "/[locale]/kontakt", "/[locale]/(marketing)/mobiloversikt/page": "/[locale]/mobiloversikt", "/[locale]/(marketing)/om-oss/page": "/[locale]/om-oss", "/[locale]/(marketing)/priser/cancel/page": "/[locale]/priser/cancel", "/[locale]/(marketing)/priser/page": "/[locale]/priser", "/[locale]/(marketing)/priser/success/page": "/[locale]/priser/success", "/[locale]/(onboarding)/onboarding/page": "/[locale]/onboarding", "/[locale]/(onboarding)/onboarding/step1-welcome/page": "/[locale]/onboarding/step1-welcome", "/[locale]/(onboarding)/onboarding/step2-level/page": "/[locale]/onboarding/step2-level", "/[locale]/(onboarding)/onboarding/step3-trading-mode/page": "/[locale]/onboarding/step3-trading-mode", "/[locale]/(onboarding)/onboarding/step4-binance/page": "/[locale]/onboarding/step4-binance", "/[locale]/(onboarding)/onboarding/step4-first-trade/page": "/[locale]/onboarding/step4-first-trade", "/[locale]/(onboarding)/onboarding/step5-complete/page": "/[locale]/onboarding/step5-complete", "/[locale]/(onboarding)/velg-strategi/page": "/[locale]/velg-strategi", "/[locale]/(onboarding)/velkommen/page": "/[locale]/velkommen", "/[locale]/(social)/copy-trading/discover/page": "/[locale]/copy-trading/discover", "/[locale]/(social)/copy-trading/page": "/[locale]/copy-trading", "/[locale]/(social)/copy-trading/traders/[id]/page": "/[locale]/copy-trading/traders/[id]", "/[locale]/(social)/jokertrade/page": "/[locale]/jokertrade", "/[locale]/(social)/leaderboard/page": "/[locale]/leaderboard", "/[locale]/(social)/pilot/page": "/[locale]/pilot", "/[locale]/(user)/dashboard/analysis/page": "/[locale]/dashboard/analysis", "/[locale]/(user)/dashboard/asset/[symbol]/page": "/[locale]/dashboard/asset/[symbol]", "/[locale]/(user)/dashboard/bot/[session_id]/page": "/[locale]/dashboard/bot/[session_id]", "/[locale]/(user)/dashboard/historikk/page": "/[locale]/dashboard/historikk", "/[locale]/(user)/dashboard/page": "/[locale]/dashboard", "/[locale]/(user)/dashboard/portfolio/page": "/[locale]/dashboard/portfolio", "/[locale]/(user)/dashboard/referral/page": "/[locale]/dashboard/referral", "/[locale]/(user)/dashboard/resultater/page": "/[locale]/dashboard/resultater", "/[locale]/(user)/dashboard/settings/page": "/[locale]/dashboard/settings", "/[locale]/(user)/dashboard/trade/page": "/[locale]/dashboard/trade", "/[locale]/(user)/handel/page": "/[locale]/handel", "/[locale]/(user)/marked/page": "/[locale]/marked", "/[locale]/(user)/profile/page": "/[locale]/profile", "/[locale]/(user)/trade/page": "/[locale]/trade", "/[locale]/(user)/vanlige-sporsmal/page": "/[locale]/vanlige-sporsmal", "/[locale]/[...slug]/page": "/[locale]/[...slug]", "/[locale]/callback/route": "/[locale]/callback", "/[locale]/feil/ikke-funnet/page": "/[locale]/feil/ikke-funnet", "/[locale]/feil/ingen-tilgang/page": "/[locale]/feil/ingen-tilgang", "/[locale]/feil/serverfeil/page": "/[locale]/feil/serverfeil", "/[locale]/page": "/[locale]", "/_global-error/page": "/_global-error", "/_not-found/page": "/_not-found", "/api/admin/beta-signups/route": "/api/admin/beta-signups", "/api/admin/campaign/recent/route": "/api/admin/campaign/recent", "/api/admin/campaign/stats/route": "/api/admin/campaign/stats", "/api/admin/cron-trigger/route": "/api/admin/cron-trigger", "/api/admin/cta-analytics/route": "/api/admin/cta-analytics", "/api/admin/dashboard/data/route": "/api/admin/dashboard/data", "/api/admin/errors/[id]/resolve/route": "/api/admin/errors/[id]/resolve", "/api/admin/errors/route": "/api/admin/errors", "/api/admin/funnel/stats/route": "/api/admin/funnel/stats", "/api/admin/github-health/route": "/api/admin/github-health", "/api/admin/recent-signups/route": "/api/admin/recent-signups", "/api/admin/resend-health/route": "/api/admin/resend-health", "/api/admin/sessions/route": "/api/admin/sessions", "/api/admin/stats/route": "/api/admin/stats", "/api/admin/stripe-health/route": "/api/admin/stripe-health", "/api/admin/students/route": "/api/admin/students", "/api/admin/support/cockpit-report/route": "/api/admin/support/cockpit-report", "/api/admin/support/cockpit-report/status/route": "/api/admin/support/cockpit-report/status", "/api/admin/support/impersonate/end/route": "/api/admin/support/impersonate/end", "/api/admin/support/impersonate/start/route": "/api/admin/support/impersonate/start", "/api/admin/test-binance-proxy/route": "/api/admin/test-binance-proxy", "/api/admin/trade-health/fix/route": "/api/admin/trade-health/fix", "/api/admin/trade-health/route": "/api/admin/trade-health", "/api/admin/trader-verifications/route": "/api/admin/trader-verifications", "/api/admin/user-paper-balance/route": "/api/admin/user-paper-balance", "/api/admin/user-tier/route": "/api/admin/user-tier", "/api/admin/users/route": "/api/admin/users", "/api/admin/users/sync/route": "/api/admin/users/sync", "/api/admin/verify/route": "/api/admin/verify", "/api/ai/analyze-trade/route": "/api/ai/analyze-trade", "/api/ai/autopilot/activate/route": "/api/ai/autopilot/activate", "/api/ai/autopilot/pause/route": "/api/ai/autopilot/pause", "/api/ai/autopilot/rebalance/route": "/api/ai/autopilot/rebalance", "/api/ai/autopilot/resume/route": "/api/ai/autopilot/resume", "/api/ai/autopilot/status/route": "/api/ai/autopilot/status", "/api/ai/autopilot/stop/route": "/api/ai/autopilot/stop", "/api/ai/chat/route": "/api/ai/chat", "/api/ai/ensemble-stats/route": "/api/ai/ensemble-stats", "/api/ai/ensemble/route": "/api/ai/ensemble", "/api/ai/explain-strategy/route": "/api/ai/explain-strategy", "/api/ai/explain-trade/route": "/api/ai/explain-trade", "/api/ai/insight/route": "/api/ai/insight", "/api/ai/market-brief/route": "/api/ai/market-brief", "/api/ai/sentiment/route": "/api/ai/sentiment", "/api/analytics/event/route": "/api/analytics/event", "/api/analytics/route": "/api/analytics", "/api/analytics/track/route": "/api/analytics/track", "/api/auth/diagnose/route": "/api/auth/diagnose", "/api/auth/logout/route": "/api/auth/logout", "/api/auth/me/route": "/api/auth/me", "/api/auth/vipps-callback/route": "/api/auth/vipps-callback", "/api/auth/vipps-url/route": "/api/auth/vipps-url", "/api/backtest/route": "/api/backtest", "/api/binance-leaders/route": "/api/binance-leaders", "/api/binance/encrypt/route": "/api/binance/encrypt", "/api/binance/keys/route": "/api/binance/keys", "/api/binance/test/route": "/api/binance/test", "/api/chat/route": "/api/chat", "/api/coin-prices/route": "/api/coin-prices", "/api/copy-trading/discover/route": "/api/copy-trading/discover", "/api/copy-trading/external-follow/route": "/api/copy-trading/external-follow", "/api/copy-trading/follow/route": "/api/copy-trading/follow", "/api/copy-trading/following/route": "/api/copy-trading/following", "/api/copy-trading/leaders/route": "/api/copy-trading/leaders", "/api/copy-trading/resolve-trader/route": "/api/copy-trading/resolve-trader", "/api/copy-trading/trader/[id]/route": "/api/copy-trading/trader/[id]", "/api/copy-trading/unfollow/route": "/api/copy-trading/unfollow", "/api/courses/[id]/route": "/api/courses/[id]", "/api/cron/adverse-selection/route": "/api/cron/adverse-selection", "/api/cron/ai-engine/route": "/api/cron/ai-engine", "/api/cron/ai-metrics/route": "/api/cron/ai-metrics", "/api/cron/auto-trade/route": "/api/cron/auto-trade", "/api/cron/backtest-live-gap/route": "/api/cron/backtest-live-gap", "/api/cron/balance-drift-check/route": "/api/cron/balance-drift-check", "/api/cron/binance-sync/route": "/api/cron/binance-sync", "/api/cron/cron-health/route": "/api/cron/cron-health", "/api/cron/daily-summary/route": "/api/cron/daily-summary", "/api/cron/feature-loader/route": "/api/cron/feature-loader", "/api/cron/fill-rate-monitor/route": "/api/cron/fill-rate-monitor", "/api/cron/health-check/route": "/api/cron/health-check", "/api/cron/keepalive/route": "/api/cron/keepalive", "/api/cron/market-impact/route": "/api/cron/market-impact", "/api/cron/mifid2-export/route": "/api/cron/mifid2-export", "/api/cron/monitoring-alert/route": "/api/cron/monitoring-alert", "/api/cron/outbox-recovery/route": "/api/cron/outbox-recovery", "/api/cron/pl-attribution/route": "/api/cron/pl-attribution", "/api/cron/portfolio-rebalance/route": "/api/cron/portfolio-rebalance", "/api/cron/reconcile/route": "/api/cron/reconcile", "/api/cron/signal-decay/route": "/api/cron/signal-decay", "/api/cron/signal-health-selfcheck/route": "/api/cron/signal-health-selfcheck", "/api/cron/sync-prices/route": "/api/cron/sync-prices", "/api/cron/tick/route": "/api/cron/tick", "/api/cron/trading-tca/route": "/api/cron/trading-tca", "/api/cron/twap-execute/route": "/api/cron/twap-execute", "/api/cron/update-usdt-nok/route": "/api/cron/update-usdt-nok", "/api/dashboard/bot-status/route": "/api/dashboard/bot-status", "/api/dashboard/metrics/route": "/api/dashboard/metrics", "/api/debug/i18n/route": "/api/debug/i18n", "/api/email/send/route": "/api/email/send", "/api/error-report/route": "/api/error-report", "/api/exchanges/connections/route": "/api/exchanges/connections", "/api/exchanges/sync/route": "/api/exchanges/sync", "/api/fx/usdt-nok/route": "/api/fx/usdt-nok", "/api/gamification/achievements/route": "/api/gamification/achievements", "/api/gamification/award/route": "/api/gamification/award", "/api/gamification/stats/route": "/api/gamification/stats", "/api/health/oauth/route": "/api/health/oauth", "/api/health/route": "/api/health", "/api/health/sonar/route": "/api/health/sonar", "/api/health/websocket/route": "/api/health/websocket", "/api/klt/balance/route": "/api/klt/balance", "/api/klt/spending-options/route": "/api/klt/spending-options", "/api/leaderboard/changes/route": "/api/leaderboard/changes", "/api/leaderboard/route": "/api/leaderboard", "/api/live-feed/route": "/api/live-feed", "/api/live/feed/route": "/api/live/feed", "/api/market-intelligence/route": "/api/market-intelligence", "/api/market/binance-24hr/route": "/api/market/binance-24hr", "/api/market/binance-prices/route": "/api/market/binance-prices", "/api/market/snapshot/route": "/api/market/snapshot", "/api/marketplace/listings/route": "/api/marketplace/listings", "/api/marketplace/reviews/route": "/api/marketplace/reviews", "/api/marketplace/subscribe/route": "/api/marketplace/subscribe", "/api/metrics/route": "/api/metrics", "/api/notifications/route": "/api/notifications", "/api/notifications/send-push/route": "/api/notifications/send-push", "/api/notifications/send/route": "/api/notifications/send", "/api/notifications/subscribe/route": "/api/notifications/subscribe", "/api/notifications/unsubscribe/route": "/api/notifications/unsubscribe", "/api/og/route": "/api/og", "/api/onboarding/complete/route": "/api/onboarding/complete", "/api/onboarding/events/route": "/api/onboarding/events", "/api/onboarding/first-paper-trade/route": "/api/onboarding/first-paper-trade", "/api/onboarding/start/route": "/api/onboarding/start", "/api/paper-trading/balance/route": "/api/paper-trading/balance", "/api/paper-trading/execute/route": "/api/paper-trading/execute", "/api/paper-trading/init/route": "/api/paper-trading/init", "/api/paper-trading/reset/route": "/api/paper-trading/reset", "/api/paper-trading/trades/[trade_id]/route": "/api/paper-trading/trades/[trade_id]", "/api/pilot-engine/leaderboard/route": "/api/pilot-engine/leaderboard", "/api/pilot-engine/notifications/route": "/api/pilot-engine/notifications", "/api/pilot-engine/route": "/api/pilot-engine", "/api/pilot/route": "/api/pilot", "/api/portfolio/chart/route": "/api/portfolio/chart", "/api/portfolio/rebalance/route": "/api/portfolio/rebalance", "/api/portfolio/summary/route": "/api/portfolio/summary", "/api/pricing/route": "/api/pricing", "/api/progress/[courseId]/route": "/api/progress/[courseId]", "/api/progress/route": "/api/progress", "/api/revalidate/route": "/api/revalidate", "/api/send-email/route": "/api/send-email", "/api/signal/current/route": "/api/signal/current", "/api/signal/explanation/route": "/api/signal/explanation", "/api/stats/active-users/route": "/api/stats/active-users", "/api/stats/route": "/api/stats", "/api/stats/users/route": "/api/stats/users", "/api/stripe/checkout/route": "/api/stripe/checkout", "/api/stripe/customer-portal/route": "/api/stripe/customer-portal", "/api/stripe/verify-session/route": "/api/stripe/verify-session", "/api/telemetry/backtest/route": "/api/telemetry/backtest", "/api/test/auth/login/route": "/api/test/auth/login", "/api/test/set-onboarding/route": "/api/test/set-onboarding", "/api/track/click/route": "/api/track/click", "/api/track/funnel/route": "/api/track/funnel", "/api/track/open/route": "/api/track/open", "/api/trader-verifications/[trader_profile_id]/route": "/api/trader-verifications/[trader_profile_id]", "/api/trades/[tradeId]/route": "/api/trades/[tradeId]", "/api/trading-cockpit/analytics/route": "/api/trading-cockpit/analytics", "/api/trading-cockpit/initial/route": "/api/trading-cockpit/initial", "/api/trading-cockpit/metrics/route": "/api/trading-cockpit/metrics", "/api/trading-cockpit/route": "/api/trading-cockpit", "/api/trading-cockpit/sessions/route": "/api/trading-cockpit/sessions", "/api/trading-cockpit/trades/route": "/api/trading-cockpit/trades", "/api/trading-sessions/[id]/status/route": "/api/trading-sessions/[id]/status", "/api/trading-sessions/create/route": "/api/trading-sessions/create", "/api/trading/auto-trade/activate/route": "/api/trading/auto-trade/activate", "/api/trading/mode/route": "/api/trading/mode", "/api/trading/position/route": "/api/trading/position", "/api/trading/sessions/route": "/api/trading/sessions", "/api/trading/trigger/route": "/api/trading/trigger", "/api/trading/v3/beta/status/route": "/api/trading/v3/beta/status", "/api/trading/v3/health/route": "/api/trading/v3/health", "/api/trading/v3/rl/signal/route": "/api/trading/v3/rl/signal", "/api/trading/v3/tax/eu-report/route": "/api/trading/v3/tax/eu-report", "/api/trading/v3/trades/[sessionId]/route": "/api/trading/v3/trades/[sessionId]", "/api/trading/v3/whitelabel/fees/route": "/api/trading/v3/whitelabel/fees", "/api/user/auto-trading-config/route": "/api/user/auto-trading-config", "/api/user/badges/route": "/api/user/badges", "/api/user/email-preferences/route": "/api/user/email-preferences", "/api/user/klt-wallet/route": "/api/user/klt-wallet", "/api/user/notification-preferences/route": "/api/user/notification-preferences", "/api/user/onboarding/route": "/api/user/onboarding", "/api/user/profile/route": "/api/user/profile", "/api/user/pulse/route": "/api/user/pulse", "/api/user/strategy-stats/route": "/api/user/strategy-stats", "/api/user/trade-decisions/route": "/api/user/trade-decisions", "/api/user/trades/route": "/api/user/trades", "/api/user/trading-analytics/route": "/api/user/trading-analytics", "/api/user/trading-diagnostics/route": "/api/user/trading-diagnostics", "/api/user/trading-logs/route": "/api/user/trading-logs", "/api/user/trading-sessions/restart/route": "/api/user/trading-sessions/restart", "/api/webhooks/resend/route": "/api/webhooks/resend", "/api/webhooks/sanity/route": "/api/webhooks/sanity", "/api/webhooks/stripe/route": "/api/webhooks/stripe", "/api/webhooks/vipps/route": "/api/webhooks/vipps", "/favicon.ico/route": "/favicon.ico", "/page": "/", "/robots.txt/route": "/robots.txt", "/sitemap.xml/route": "/sitemap.xml", "/studio/[[...tool]]/page": "/studio/[[...tool]]" };
var FunctionsConfigManifest = { "version": 1, "functions": { "/": {}, "/[locale]": {}, "/[locale]/[...slug]": {}, "/[locale]/about": {}, "/[locale]/admin": {}, "/[locale]/admin/ab-tests": {}, "/[locale]/admin/analytics": {}, "/[locale]/admin/auto-trading": {}, "/[locale]/admin/auto-trading/sessions": {}, "/[locale]/admin/campaign": {}, "/[locale]/admin/deploy": {}, "/[locale]/admin/forgot-password": {}, "/[locale]/admin/health": {}, "/[locale]/admin/login": {}, "/[locale]/admin/marketing/ctas": {}, "/[locale]/admin/monetization": {}, "/[locale]/admin/monitor": {}, "/[locale]/admin/reset-password": {}, "/[locale]/admin/settings": {}, "/[locale]/admin/students": {}, "/[locale]/admin/support/impersonate": {}, "/[locale]/admin/sync-status": {}, "/[locale]/admin/system": {}, "/[locale]/admin/trade-health": {}, "/[locale]/admin/trader-verifications": {}, "/[locale]/admin/users": {}, "/[locale]/admin/v2": {}, "/[locale]/admin/v3": {}, "/[locale]/akademi": {}, "/[locale]/akademi/dashboard-guide": {}, "/[locale]/api-dokumentasjon": {}, "/[locale]/binance-guide": {}, "/[locale]/bots": {}, "/[locale]/checkout": {}, "/[locale]/checkout/success": {}, "/[locale]/cookies": {}, "/[locale]/copy-trading": {}, "/[locale]/copy-trading/discover": {}, "/[locale]/copy-trading/traders/[id]": {}, "/[locale]/dashboard": {}, "/[locale]/dashboard/analysis": {}, "/[locale]/dashboard/asset/[symbol]": {}, "/[locale]/dashboard/bot/[session_id]": {}, "/[locale]/dashboard/historikk": {}, "/[locale]/dashboard/portfolio": {}, "/[locale]/dashboard/referral": {}, "/[locale]/dashboard/resultater": {}, "/[locale]/dashboard/settings": {}, "/[locale]/dashboard/trade": {}, "/[locale]/driftsfeil": {}, "/[locale]/feil/ikke-funnet": {}, "/[locale]/feil/ingen-tilgang": {}, "/[locale]/feil/serverfeil": {}, "/[locale]/handel": {}, "/[locale]/hjelp": {}, "/[locale]/jokertrade": {}, "/[locale]/kalkulator": {}, "/[locale]/kontakt": {}, "/[locale]/kurs": {}, "/[locale]/kurs/[moduleSlug]": {}, "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]": {}, "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto": {}, "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging": {}, "/[locale]/leaderboard": {}, "/[locale]/leksjon/[lessonId]": {}, "/[locale]/login": {}, "/[locale]/marked": {}, "/[locale]/marketplace": {}, "/[locale]/mobiloversikt": {}, "/[locale]/om-oss": {}, "/[locale]/onboarding": {}, "/[locale]/onboarding/step1-welcome": {}, "/[locale]/onboarding/step2-level": {}, "/[locale]/onboarding/step3-trading-mode": {}, "/[locale]/onboarding/step4-binance": {}, "/[locale]/onboarding/step4-first-trade": {}, "/[locale]/onboarding/step5-complete": {}, "/[locale]/personvern": {}, "/[locale]/pilot": {}, "/[locale]/priser": {}, "/[locale]/priser/cancel": {}, "/[locale]/priser/success": {}, "/[locale]/profile": {}, "/[locale]/register": {}, "/[locale]/reset-password": {}, "/[locale]/trade": {}, "/[locale]/update-password": {}, "/[locale]/vanlige-sporsmal": {}, "/[locale]/velg-strategi": {}, "/[locale]/velkommen": {}, "/[locale]/vilkar": {}, "/api/admin/beta-signups": {}, "/api/admin/cta-analytics": {}, "/api/admin/recent-signups": {}, "/api/admin/students": {}, "/api/admin/test-binance-proxy": {}, "/api/admin/trade-health": {}, "/api/admin/trade-health/fix": {}, "/api/admin/trader-verifications": {}, "/api/ai/analyze-trade": { "maxDuration": 30 }, "/api/ai/autopilot/activate": { "maxDuration": 60 }, "/api/ai/autopilot/pause": {}, "/api/ai/autopilot/rebalance": { "maxDuration": 300 }, "/api/ai/autopilot/resume": {}, "/api/ai/autopilot/status": {}, "/api/ai/autopilot/stop": {}, "/api/ai/chat": { "maxDuration": 60 }, "/api/ai/ensemble-stats": {}, "/api/ai/explain-strategy": { "maxDuration": 20 }, "/api/ai/explain-trade": { "maxDuration": 30 }, "/api/ai/insight": {}, "/api/ai/market-brief": {}, "/api/auth/vipps-callback": {}, "/api/auth/vipps-url": {}, "/api/chat": { "maxDuration": 30 }, "/api/coin-prices": {}, "/api/copy-trading/discover": {}, "/api/copy-trading/external-follow": {}, "/api/copy-trading/follow": {}, "/api/copy-trading/following": {}, "/api/copy-trading/leaders": {}, "/api/copy-trading/resolve-trader": {}, "/api/copy-trading/trader/[id]": {}, "/api/copy-trading/unfollow": {}, "/api/courses/[id]": {}, "/api/cron/ai-engine": { "maxDuration": 60 }, "/api/cron/ai-metrics": { "maxDuration": 60 }, "/api/cron/auto-trade": {}, "/api/cron/balance-drift-check": { "maxDuration": 30 }, "/api/cron/binance-sync": {}, "/api/cron/cron-health": {}, "/api/cron/feature-loader": { "maxDuration": 60 }, "/api/cron/outbox-recovery": {}, "/api/cron/portfolio-rebalance": {}, "/api/cron/reconcile": {}, "/api/cron/signal-health-selfcheck": {}, "/api/cron/tick": {}, "/api/cron/trading-tca": { "maxDuration": 30 }, "/api/cron/twap-execute": {}, "/api/cron/update-usdt-nok": { "maxDuration": 15 }, "/api/dashboard/bot-status": {}, "/api/dashboard/metrics": {}, "/api/email/send": {}, "/api/health": {}, "/api/health/websocket": {}, "/api/klt/balance": {}, "/api/klt/spending-options": {}, "/api/leaderboard": {}, "/api/leaderboard/changes": {}, "/api/live-feed": {}, "/api/live/feed": {}, "/api/market-intelligence": {}, "/api/market/snapshot": {}, "/api/marketplace/listings": {}, "/api/marketplace/subscribe": {}, "/api/notifications": {}, "/api/notifications/send-push": {}, "/api/notifications/subscribe": {}, "/api/notifications/unsubscribe": {}, "/api/pilot": {}, "/api/pilot-engine/leaderboard": {}, "/api/pilot-engine/notifications": {}, "/api/portfolio/rebalance": {}, "/api/pricing": {}, "/api/stripe/customer-portal": {}, "/api/trader-verifications/[trader_profile_id]": {}, "/api/trading/v3/trades/[sessionId]": {}, "/api/user/auto-trading-config": {}, "/api/user/badges": {}, "/api/user/email-preferences": {}, "/api/user/klt-wallet": {}, "/api/user/notification-preferences": {}, "/api/user/onboarding": {}, "/api/user/profile": {}, "/api/user/pulse": {}, "/api/user/strategy-stats": {}, "/api/user/trade-decisions": {}, "/api/user/trades": {}, "/api/user/trading-diagnostics": {}, "/api/user/trading-logs": {}, "/api/user/trading-sessions/restart": {}, "/api/webhooks/sanity": {}, "/api/webhooks/stripe": {}, "/api/webhooks/vipps": {}, "/studio/[[...tool]]": {} } };
var PagesManifest = { "/404": "pages/404.html", "/500": "pages/500.html" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.OPEN_NEXT_BUILD_ID = NextConfig.deploymentId ?? BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();
import { ReadableStream as ReadableStream3 } from "node:stream/web";

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    const nextUrl = constructNextUrl(internalEvent.url, `/${detectedLocale}${NextConfig.trailingSlash ? "/" : ""}`);
    const queryString = convertToQueryString(internalEvent.query);
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: `${nextUrl}${queryString}`
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (!pattern.test(url))
    return false;
  if (host) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.host !== host;
    } catch {
      return !url.includes(host);
    }
  }
  return true;
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  return new ReadableStream3({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location2, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location2)) {
    return location2;
  }
  const locationURL = new URL(location2);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();

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

// node_modules/@opennextjs/aws/dist/utils/cache.js
async function isStale(key, tags, lastModified) {
  if (!compareSemver(globalThis.nextVersion, ">=", "16.0.0")) {
    return false;
  }
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.isStale?.(tags, lastModified) ?? false;
  }
  return await globalThis.tagCache.isStale?.(key, lastModified) ?? false;
}
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
var NEXT_SEGMENT_PREFETCH_HEADER = "next-router-segment-prefetch";
var NEXT_PRERENDER_HEADER = "x-nextjs-prerender";
var NEXT_POSTPONED_HEADER = "x-nextjs-postponed";
async function computeCacheControl(path3, body, host, revalidate, lastModified, isStaleFromTagCache = false) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest?.routes ?? {}).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  const isSSG = finalRevalidate === CACHE_ONE_YEAR;
  const remainingTtl = Math.max(finalRevalidate - age, 1);
  const isStaleFromTime = !isSSG && remainingTtl === 1;
  const isStale2 = isStaleFromTime || isStaleFromTagCache;
  if (!isSSG || isStaleFromTagCache) {
    const sMaxAge = isStaleFromTagCache ? 1 : remainingTtl;
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate,
      isStaleFromTagCache
    });
    if (isStale2) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale2 ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
function getBodyForAppRouter(event, cachedValue) {
  if (cachedValue.type !== "app") {
    throw new Error("getBodyForAppRouter called with non-app cache value");
  }
  try {
    const segmentHeader = `${event.headers[NEXT_SEGMENT_PREFETCH_HEADER]}`;
    const isSegmentResponse = Boolean(segmentHeader) && segmentHeader in (cachedValue.segmentData || {}) && !NextConfig.experimental?.prefetchInlining;
    const body = isSegmentResponse ? cachedValue.segmentData[segmentHeader] : cachedValue.rsc;
    return {
      body,
      additionalHeaders: isSegmentResponse ? { [NEXT_PRERENDER_HEADER]: "1", [NEXT_POSTPONED_HEADER]: "2" } : {}
    };
  } catch (e) {
    error("Error while getting body for app router from cache:", e);
    return { body: cachedValue.rsc, additionalHeaders: {} };
  }
}
async function generateResult(event, localizedPath, cachedValue, lastModified, isStaleFromTagCache = false) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  let additionalHeaders = {};
  if (cachedValue.type === "app") {
    isDataRequest = event.headers.rsc === "1";
    if (isDataRequest) {
      const { body: appRouterBody, additionalHeaders: appHeaders } = getBodyForAppRouter(event, cachedValue);
      body = appRouterBody;
      additionalHeaders = appHeaders;
    } else {
      body = cachedValue.html;
    }
    type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
  } else if (cachedValue.type === "page") {
    isDataRequest = Boolean(event.query.__nextDataReq);
    body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
    type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
  } else {
    throw new Error("generateResult called with unsupported cache value type, only 'app' and 'page' are supported");
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified, isStaleFromTagCache);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER,
      ...additionalHeaders
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => escapePathDelimiters(decodeURIComponent(segment), true)).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  try {
    localizedPath = decodePathParams(localizedPath) || "/";
  } catch {
    return event;
  }
  const cacheKey = localizedPath === "/" ? "/index" : localizedPath;
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest?.routes ?? {}).includes(localizedPath) || Object.values(PrerenderManifest?.dynamicRoutes ?? {}).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(cacheKey);
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      const tags = getTagsFromValue(cachedData.value);
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(cacheKey, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const _isStale = cachedData.shouldBypassTagCache ? false : await isStale(cacheKey, tags, cachedData.lastModified ?? Date.now());
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified, _isStale);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re2 = pathToRegexp(str, keys, options);
  return regexpToFunction(re2, keys, options);
}
function regexpToFunction(re2, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re2.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !(event.query.__nextDataReq === "1") && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      headers: {
        ...internalEvent.headers,
        "x-nextjs-data": "1"
      },
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes = {}, routes = {} } = prerenderManifest ?? {};
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest?.preview?.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(normalizedPath);
  } catch {
  }
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath) || decodedPath !== void 0 && r.test(decodedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
var NEXT_INTERNAL_HEADERS = [
  "x-middleware-rewrite",
  "x-middleware-redirect",
  "x-middleware-set-cookie",
  "x-middleware-skip",
  "x-middleware-override-headers",
  "x-middleware-next",
  "x-now-route-matches",
  "x-matched-path",
  "x-nextjs-data",
  "x-next-resume-state-length"
];
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      const lowerCaseKey = key.toLowerCase();
      if (lowerCaseKey.startsWith(INTERNAL_HEADER_PREFIX) || lowerCaseKey.startsWith(MIDDLEWARE_HEADER_PREFIX) || NEXT_INTERNAL_HEADERS.includes(lowerCaseKey)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
