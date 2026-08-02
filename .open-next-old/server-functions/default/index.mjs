globalThis.monorepoPackagePath = "";globalThis.openNextDebug = false;globalThis.openNextVersion = "4.1.0";globalThis.nextVersion = "16.2.12";
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
var __commonJS = (cb, mod3) => function __require2() {
  return mod3 || (0, cb[__getOwnPropNames(cb)[0]])((mod3 = { exports: {} }).exports, mod3), mod3.exports;
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
var __reExport = (target, mod3, secondTarget) => (__copyProps(target, mod3, "default"), secondTarget && __copyProps(secondTarget, mod3, "default"));
var __toESM = (mod3, isNodeMode, target) => (target = mod3 != null ? __create(__getProtoOf(mod3)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod3 || !mod3.__esModule ? __defProp(target, "default", { value: mod3, enumerable: true }) : target,
  mod3
));
var __toCommonJS = (mod3) => __copyProps(__defProp({}, "__esModule", { value: true }), mod3);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var IgnorableError, FatalError;
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
    IgnorableError = class extends Error {
      __openNextInternal = true;
      canIgnore = true;
      logLevel = 0;
      constructor(message) {
        super(message);
        this.name = "IgnorableError";
      }
    };
    FatalError = class extends Error {
      __openNextInternal = true;
      canIgnore = false;
      logLevel = 2;
      constructor(message) {
        super(message);
        this.name = "FatalError";
      }
    };
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
var parseHeaders, convertHeader;
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
    parseHeaders = (headers) => {
      const result = {};
      if (!headers) {
        return result;
      }
      for (const [key, value] of Object.entries(headers)) {
        if (value === void 0) {
          continue;
        }
        const keyLower = key.toLowerCase();
        if (keyLower === "location" && Array.isArray(value)) {
          if (value.length === 1 || value[0] === value[1]) {
            result[keyLower] = value[0];
          } else {
            warn("Multiple different values for Location header found. Using the last one");
            result[keyLower] = value[value.length - 1];
          }
          continue;
        }
        result[keyLower] = convertHeader(value);
      }
      return result;
    };
    convertHeader = (header) => {
      if (typeof header === "string") {
        return header;
      }
      if (Array.isArray(header)) {
        return header.join(",");
      }
      return String(header);
    };
  }
});

// node-built-in-modules:node:module
var node_module_exports = {};
import * as node_module_star from "node:module";
var init_node_module = __esm({
  "node-built-in-modules:node:module"() {
    __reExport(node_module_exports, node_module_star);
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream as ReadableStream2 } from "node:stream/web";
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

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
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

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-node.js
var cloudflare_node_exports = {};
__export(cloudflare_node_exports, {
  default: () => cloudflare_node_default
});
import { Writable } from "node:stream";
var NULL_BODY_STATUSES2, handler, cloudflare_node_default;
var init_cloudflare_node = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-node.js"() {
    NULL_BODY_STATUSES2 = /* @__PURE__ */ new Set([101, 204, 205, 304]);
    handler = async (handler3, converter2) => async (request, env, ctx, abortSignal) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const url = new URL(request.url);
      const { promise: promiseResponse, resolve: resolveResponse } = Promise.withResolvers();
      const streamCreator = {
        writeHeaders(prelude) {
          const { statusCode, cookies, headers } = prelude;
          const responseHeaders = new Headers(headers);
          for (const cookie of cookies) {
            responseHeaders.append("Set-Cookie", cookie);
          }
          if (url.hostname === "localhost") {
            responseHeaders.set("Content-Encoding", "identity");
          }
          if (NULL_BODY_STATUSES2.has(statusCode)) {
            const response2 = new Response(null, {
              status: statusCode,
              headers: responseHeaders
            });
            resolveResponse(response2);
            return new Writable({
              write(chunk, encoding, callback) {
                callback();
              }
            });
          }
          let controller;
          const readable = new ReadableStream({
            start(c) {
              controller = c;
            }
          });
          const response = new Response(readable, {
            status: statusCode,
            headers: responseHeaders
          });
          resolveResponse(response);
          return new Writable({
            write(chunk, encoding, callback) {
              try {
                controller.enqueue(chunk);
              } catch (e) {
                return callback(e);
              }
              callback();
            },
            final(callback) {
              controller.close();
              callback();
            },
            destroy(error2, callback) {
              if (error2) {
                controller.error(error2);
              } else {
                try {
                  controller.close();
                } catch {
                }
              }
              callback(error2);
            }
          });
        },
        // This is for passing along the original abort signal from the initial Request you retrieve in your worker
        // Ensures that the response we pass to NextServer is aborted if the request is aborted
        // By doing this `request.signal.onabort` will work in route handlers
        abortSignal,
        // There is no need to retain the chunks that were pushed to the response stream.
        retainChunks: false
      };
      ctx.waitUntil(handler3(internalEvent, {
        streamCreator,
        waitUntil: ctx.waitUntil.bind(ctx)
      }));
      return promiseResponse;
    };
    cloudflare_node_default = {
      wrapper: handler,
      name: "cloudflare-node",
      supportStreaming: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/tagCache/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var dummyTagCache, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/tagCache/dummy.js"() {
    dummyTagCache = {
      name: "dummy",
      mode: "original",
      getByPath: async () => {
        return [];
      },
      getByTag: async () => {
        return [];
      },
      getLastModified: async (_, lastModified) => {
        return lastModified ?? Date.now();
      },
      writeTags: async () => {
        return;
      },
      isStale: async (_path) => {
        return false;
      }
    };
    dummy_default = dummyTagCache;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/queue/dummy.js
var dummy_exports2 = {};
__export(dummy_exports2, {
  default: () => dummy_default2
});
var dummyQueue, dummy_default2;
var init_dummy2 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/queue/dummy.js"() {
    init_error();
    dummyQueue = {
      name: "dummy",
      send: async () => {
        throw new FatalError("Dummy queue is not implemented");
      }
    };
    dummy_default2 = dummyQueue;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/incrementalCache/dummy.js
var dummy_exports3 = {};
__export(dummy_exports3, {
  default: () => dummy_default3
});
var dummyIncrementalCache, dummy_default3;
var init_dummy3 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/incrementalCache/dummy.js"() {
    init_error();
    dummyIncrementalCache = {
      name: "dummy",
      get: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      },
      set: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      },
      delete: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      }
    };
    dummy_default3 = dummyIncrementalCache;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports4 = {};
__export(dummy_exports4, {
  default: () => dummy_default4
});
var resolver, dummy_default4;
var init_dummy4 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default4 = resolver;
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

// node_modules/@opennextjs/aws/dist/overrides/cdnInvalidation/dummy.js
var dummy_exports5 = {};
__export(dummy_exports5, {
  default: () => dummy_default5
});
var dummy_default5;
var init_dummy5 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/cdnInvalidation/dummy.js"() {
    dummy_default5 = {
      name: "dummy",
      invalidatePaths: (_) => {
        return Promise.resolve();
      }
    };
  }
});

// node_modules/@opennextjs/aws/dist/core/createMainHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/adapters/util.js
function setNodeEnv() {
  const processEnv = process.env;
  processEnv.NODE_ENV = process.env.NODE_ENV ?? "production";
}
function generateUniqueId() {
  return Math.random().toString(36).slice(2, 8);
}

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
import { AsyncLocalStorage } from "node:async_hooks";

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";
var SET_COOKIE_HEADER = "set-cookie";
var CANNOT_BE_USED = "This cannot be used in OpenNext";
var OpenNextNodeResponse = class extends Transform {
  fixHeadersFn;
  onEnd;
  streamCreator;
  initialHeaders;
  statusCode;
  statusMessage = "";
  headers = {};
  headersSent = false;
  _chunks = [];
  headersAlreadyFixed = false;
  _cookies = [];
  responseStream;
  bodyLength = 0;
  // To comply with the ServerResponse interface :
  strictContentLength = false;
  assignSocket(_socket) {
    throw new Error(CANNOT_BE_USED);
  }
  detachSocket(_socket) {
    throw new Error(CANNOT_BE_USED);
  }
  // We might have to revisit those 3 in the future
  writeContinue(_callback) {
    throw new Error(CANNOT_BE_USED);
  }
  writeEarlyHints(_hints, _callback) {
    throw new Error(CANNOT_BE_USED);
  }
  writeProcessing() {
    throw new Error(CANNOT_BE_USED);
  }
  /**
   * This is a dummy request object to comply with the ServerResponse interface
   * It will never be defined
   */
  req;
  chunkedEncoding = false;
  shouldKeepAlive = true;
  useChunkedEncodingByDefault = true;
  sendDate = false;
  connection = null;
  socket = null;
  setTimeout(_msecs, _callback) {
    throw new Error(CANNOT_BE_USED);
  }
  addTrailers(_headers) {
    throw new Error(CANNOT_BE_USED);
  }
  constructor(fixHeadersFn, onEnd, streamCreator, initialHeaders, statusCode) {
    super();
    this.fixHeadersFn = fixHeadersFn;
    this.onEnd = onEnd;
    this.streamCreator = streamCreator;
    this.initialHeaders = initialHeaders;
    if (statusCode && Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
      this.statusCode = statusCode;
    }
    streamCreator?.abortSignal?.addEventListener("abort", () => {
      this.destroy();
    });
  }
  // Necessary for next 12
  // We might have to implement all the methods here
  get originalResponse() {
    return this;
  }
  get finished() {
    return this.responseStream ? this.responseStream?.writableFinished : this.writableFinished;
  }
  setHeader(name, value) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      if (Array.isArray(value)) {
        this._cookies = value;
      } else {
        this._cookies = [value];
      }
    }
    this.headers[key] = value;
    return this;
  }
  removeHeader(name) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      this._cookies = [];
    } else {
      delete this.headers[key];
    }
    return this;
  }
  hasHeader(name) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      return this._cookies.length > 0;
    }
    return this.headers[key] !== void 0;
  }
  getHeaders() {
    return this.headers;
  }
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }
  getHeaderNames() {
    return Object.keys(this.headers);
  }
  // Only used directly in next@14+
  flushHeaders() {
    this.headersSent = true;
    const mergeHeadersPriority = globalThis.__openNextAls?.getStore()?.mergeHeadersPriority ?? "middleware";
    if (this.initialHeaders) {
      this.headers = mergeHeadersPriority === "middleware" ? {
        ...this.headers,
        ...this.initialHeaders
      } : {
        ...this.initialHeaders,
        ...this.headers
      };
      const initialCookies = parseSetCookieHeader(this.initialHeaders[SET_COOKIE_HEADER]?.toString());
      this._cookies = mergeHeadersPriority === "middleware" ? [...this._cookies, ...initialCookies] : [...initialCookies, ...this._cookies];
    }
    this.fixHeaders(this.headers);
    this.fixHeadersForError();
    this.headers[SET_COOKIE_HEADER] = this._cookies;
    const parsedHeaders = parseHeaders(this.headers);
    delete parsedHeaders[SET_COOKIE_HEADER];
    if (this.streamCreator) {
      this.responseStream = this.streamCreator?.writeHeaders({
        statusCode: this.statusCode ?? 200,
        cookies: this._cookies,
        headers: parsedHeaders
      });
      this.pipe(this.responseStream);
    }
  }
  appendHeader(name, value) {
    const key = name.toLowerCase();
    if (!this.hasHeader(key)) {
      return this.setHeader(key, value);
    }
    const existingHeader = this.getHeader(key);
    const toAppend = Array.isArray(value) ? value : [value];
    const newValue = Array.isArray(existingHeader) ? [...existingHeader, ...toAppend] : [existingHeader, ...toAppend];
    return this.setHeader(key, newValue);
  }
  writeHead(statusCode, statusMessage, headers) {
    let _headers = headers;
    let _statusMessage;
    if (typeof statusMessage === "string") {
      _statusMessage = statusMessage;
    } else {
      _headers = statusMessage;
    }
    const finalHeaders = this.headers;
    if (_headers) {
      if (Array.isArray(_headers)) {
        for (let i = 0; i < _headers.length; i += 2) {
          finalHeaders[_headers[i]] = _headers[i + 1];
        }
      } else {
        for (const key of Object.keys(_headers)) {
          finalHeaders[key] = _headers[key];
        }
      }
    }
    this.statusCode = statusCode;
    if (headers) {
      this.headers = finalHeaders;
    }
    this.flushHeaders();
    return this;
  }
  /**
   * OpenNext specific method
   */
  fixHeaders(headers) {
    if (this.headersAlreadyFixed) {
      return;
    }
    this.fixHeadersFn(headers);
    this.headersAlreadyFixed = true;
  }
  getFixedHeaders() {
    this.fixHeaders(this.headers);
    this.fixHeadersForError();
    this.headers[SET_COOKIE_HEADER] = this._cookies;
    return this.headers;
  }
  getBody() {
    return Buffer.concat(this._chunks);
  }
  _internalWrite(chunk, encoding) {
    const buffer = encoding === "buffer" ? chunk : Buffer.from(chunk, encoding);
    this.bodyLength += buffer.length;
    if (this.streamCreator?.retainChunks !== false) {
      this._chunks.push(buffer);
    }
    this.push(buffer);
    this.streamCreator?.onWrite?.();
  }
  _transform(chunk, encoding, callback) {
    if (!this.headersSent) {
      this.flushHeaders();
    }
    this._internalWrite(chunk, encoding);
    callback();
  }
  _flush(callback) {
    if (!this.headersSent) {
      this.flushHeaders();
    }
    globalThis.__openNextAls?.getStore()?.pendingPromiseRunner.add(this.onEnd(this.headers));
    this.streamCreator?.onFinish?.(this.bodyLength);
    if (this.bodyLength === 0 && // We use an env variable here because not all aws account have the same behavior
    // On some aws accounts the response will hang if the body is empty
    // We are modifying the response body here, this is not a good practice
    process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
      debug('Force writing "SOMETHING" to the response body');
      this.push("SOMETHING");
    }
    callback();
  }
  /**
   * New method in Node 18.15+
   * There are probably not used right now in Next.js, but better be safe than sorry
   */
  setHeaders(headers) {
    headers.forEach((value, key) => {
      this.setHeader(key, Array.isArray(value) ? value : value.toString());
    });
    return this;
  }
  /**
   * Next specific methods
   * On earlier versions of next.js, those methods are mandatory to make everything work
   */
  get sent() {
    return this.finished || this.headersSent;
  }
  getHeaderValues(name) {
    const values = this.getHeader(name);
    if (values === void 0)
      return void 0;
    return (Array.isArray(values) ? values : [values]).map((value) => value.toString());
  }
  send() {
    for (const chunk of this._chunks) {
      this.write(chunk);
    }
    this.end();
  }
  body(value) {
    this.write(value);
    return this;
  }
  onClose(callback) {
    this.on("close", callback);
  }
  redirect(destination, statusCode) {
    this.setHeader("Location", destination);
    this.statusCode = statusCode;
    if (statusCode === 308) {
      this.setHeader("Refresh", `0;url=${destination}`);
    }
    return this;
  }
  // For some reason, next returns the 500 error page with some cache-control headers
  // We need to fix that
  fixHeadersForError() {
    if (process.env.OPEN_NEXT_DANGEROUSLY_SET_ERROR_HEADERS === "true") {
      return;
    }
    if (this.statusCode === 404 || this.statusCode === 500) {
      this.headers["cache-control"] = "private, no-cache, no-store, max-age=0, must-revalidate";
    }
  }
};

// node_modules/@opennextjs/aws/dist/http/request.js
import http from "node:http";
var IncomingMessage = class extends http.IncomingMessage {
  constructor({ method, url, headers, body, remoteAddress }) {
    super({
      encrypted: true,
      readable: false,
      remoteAddress,
      address: () => ({ port: 443 }),
      end: Function.prototype,
      destroy: Function.prototype
    });
    if (body) {
      headers["content-length"] ??= String(Buffer.byteLength(body));
    }
    Object.assign(this, {
      ip: remoteAddress,
      complete: true,
      httpVersion: "1.1",
      httpVersionMajor: "1",
      httpVersionMinor: "1",
      method,
      headers,
      body,
      url
    });
    this._read = () => {
      this.push(body);
      this.push(null);
    };
  }
};

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

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": { "_sentryRewriteFramesDistDir": ".next", "_sentryRewriteFramesAssetPrefixPath": "", "_sentryRelease": "7ab20df6d57ec9ec84cc04000a7c34900e241e3e", "NEXT_PUBLIC_SUPABASE_URL": "https://pskhryjzkobytnfwucrb.supabase.co", "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2hyeWp6a29ieXRuZnd1Y3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzI4NTcsImV4cCI6MjA5NzQ0ODg1N30.SAcjagaGKL_m8wk-wmu12PplGMCKVhdeMFHMkAdwUgI" }, "typescript": { "ignoreBuildErrors": false }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.mjs", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": false, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 2592e3, "formats": ["image/avif", "image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "pskhryjzkobytnfwucrb.supabase.co", "pathname": "/storage/v1/object/public/**" }, { "protocol": "https", "hostname": "**.tradingview.com" }, { "protocol": "https", "hostname": "**.coingecko.com" }, { "protocol": "https", "hostname": "i.pravatar.cc" }, { "protocol": "https", "hostname": "cdn.sanity.io" }], "qualities": [75], "unoptimized": true, "customCacheHandler": false }, "devIndicators": false, "onDemandEntries": { "maxInactiveAge": 36e5, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": { "serverFunctions": true, "browserToTerminal": "warn" }, "compiler": { "removeConsole": { "exclude": ["error", "warn"] } }, "expireTime": 31536e3, "staticPageGenerationTimeout": 120, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "/Users/taj/klarpakke", "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "appNewScrollHandler": false, "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "cachedNavigations": false, "partialFallbacks": false, "dynamicOnHover": false, "varyParams": false, "prefetchInlining": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 7, "memoryBasedWorkersCount": true, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "clientTraceMetadata": ["baggage", "sentry-trace"], "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "strictRouteTypes": false, "useTypeScriptCli": false, "viewTransition": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": true, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "gestureTransition": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": "warn", "lockDistDir": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": false, "turbopackInferModuleSideEffects": true, "turbopackPluginRuntimeStrategy": "childProcesses", "optimizePackageImports": ["lucide-react", "framer-motion", "date-fns", "recharts", "lightweight-charts", "@radix-ui/react-accordion", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "rxjs", "rxjs/operators", "@coinbase/cds-web", "@radix-ui/react-slot", "sonner", "next-themes", "react-ts-tradingview-widgets", "embla-carousel-react", "react-resizable-panels", "vaul", "cmdk", "input-otp", "react-day-picker", "@hookform/resolvers", "react-hook-form", "zustand", "immer", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "@mui/material", "@mui/icons-material", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.mjs", "transpilePackages": ["next-intl", "@tanstack/react-query", "styled-components", "sanity", "@sanity/vision", "next-sanity"], "outputFileTracingIncludes": { "**/*": ["./node_modules/pg-cloudflare/dist/**", "./node_modules/pg-cloudflare/esm/**", "./node_modules/xxhash-wasm/workerd/**", "./node_modules/xxhash-wasm/esm/**", "./node_modules/xxhash-wasm/cjs/**"] }, "outputFileTracingExcludes": { "**/*": ["./node_modules/opik/**", "./node_modules/boxen/**", "./node_modules/ora/**", "./node_modules/log-symbols/**", "./node_modules/widest-line/**", "./node_modules/ansi-align/**", "./node_modules/cli-spinners/**"] }, "reactCompiler": true, "serverExternalPackages": ["opik", "fsevents", "chokidar", "nunjucks", "amqplib", "connect", "dataloader", "express", "generic-pool", "graphql", "@hapi/hapi", "ioredis", "kafkajs", "koa", "lru-memoizer", "mongodb", "mongoose", "mysql", "mysql2", "knex", "pg", "pg-pool", "@node-redis/client", "@redis/client", "redis", "tedious"], "turbopack": { "resolveAlias": { "next-intl/config": "./src/i18n.ts" }, "debugIds": true, "rules": { "**/instrumentation-client.*": { "condition": { "not": "foreign" }, "loaders": [{ "loader": "/Users/taj/klarpakke/node_modules/@sentry/nextjs/build/cjs/config/loaders/valueInjectionLoader.js", "options": { "values": { "_sentryRouteManifest": '{"dynamicRoutes":[{"path":"/:locale","regex":"^/([^/]+)$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/akademi","regex":"^/([^/]+)/akademi$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/akademi/dashboard-guide","regex":"^/([^/]+)/akademi/dashboard-guide$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs","regex":"^/([^/]+)/kurs$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/:moduleSlug","regex":"^/([^/]+)/kurs/([^/]+)$","paramNames":["locale","moduleSlug"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/:moduleSlug/leksjon/:lessonSlug","regex":"^/([^/]+)/kurs/([^/]+)/leksjon/([^/]+)$","paramNames":["locale","moduleSlug","lessonSlug"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/grunnleggende/leksjon/introduksjon-til-krypto","regex":"^/([^/]+)/kurs/grunnleggende/leksjon/introduksjon-til-krypto$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kurs/strategi/leksjon/dollar-cost-averaging","regex":"^/([^/]+)/kurs/strategi/leksjon/dollar-cost-averaging$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/leksjon/:lessonId","regex":"^/([^/]+)/leksjon/([^/]+)$","paramNames":["locale","lessonId"],"hasOptionalPrefix":true},{"path":"/:locale/admin","regex":"^/([^/]+)/admin$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/ab-tests","regex":"^/([^/]+)/admin/ab-tests$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/analytics","regex":"^/([^/]+)/admin/analytics$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/auto-trading","regex":"^/([^/]+)/admin/auto-trading$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/auto-trading/sessions","regex":"^/([^/]+)/admin/auto-trading/sessions$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/campaign","regex":"^/([^/]+)/admin/campaign$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/deploy","regex":"^/([^/]+)/admin/deploy$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/forgot-password","regex":"^/([^/]+)/admin/forgot-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/health","regex":"^/([^/]+)/admin/health$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/login","regex":"^/([^/]+)/admin/login$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/marketing/ctas","regex":"^/([^/]+)/admin/marketing/ctas$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/monetization","regex":"^/([^/]+)/admin/monetization$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/monitor","regex":"^/([^/]+)/admin/monitor$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/reset-password","regex":"^/([^/]+)/admin/reset-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/settings","regex":"^/([^/]+)/admin/settings$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/students","regex":"^/([^/]+)/admin/students$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/support/impersonate","regex":"^/([^/]+)/admin/support/impersonate$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/sync-status","regex":"^/([^/]+)/admin/sync-status$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/system","regex":"^/([^/]+)/admin/system$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/trade-health","regex":"^/([^/]+)/admin/trade-health$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/trader-verifications","regex":"^/([^/]+)/admin/trader-verifications$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/users","regex":"^/([^/]+)/admin/users$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/v2","regex":"^/([^/]+)/admin/v2$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/admin/v3","regex":"^/([^/]+)/admin/v3$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/login","regex":"^/([^/]+)/login$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/register","regex":"^/([^/]+)/register$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/reset-password","regex":"^/([^/]+)/reset-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/update-password","regex":"^/([^/]+)/update-password$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/checkout","regex":"^/([^/]+)/checkout$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/checkout/success","regex":"^/([^/]+)/checkout/success$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/marketplace","regex":"^/([^/]+)/marketplace$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/cookies","regex":"^/([^/]+)/cookies$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/driftsfeil","regex":"^/([^/]+)/driftsfeil$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/personvern","regex":"^/([^/]+)/personvern$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/vilkar","regex":"^/([^/]+)/vilkar$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/about","regex":"^/([^/]+)/about$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/api-dokumentasjon","regex":"^/([^/]+)/api-dokumentasjon$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/binance-guide","regex":"^/([^/]+)/binance-guide$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/bots","regex":"^/([^/]+)/bots$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/hjelp","regex":"^/([^/]+)/hjelp$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kalkulator","regex":"^/([^/]+)/kalkulator$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/kontakt","regex":"^/([^/]+)/kontakt$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/mobiloversikt","regex":"^/([^/]+)/mobiloversikt$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/om-oss","regex":"^/([^/]+)/om-oss$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser","regex":"^/([^/]+)/priser$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser/cancel","regex":"^/([^/]+)/priser/cancel$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/priser/success","regex":"^/([^/]+)/priser/success$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding","regex":"^/([^/]+)/onboarding$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step1-welcome","regex":"^/([^/]+)/onboarding/step1-welcome$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step2-level","regex":"^/([^/]+)/onboarding/step2-level$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step3-trading-mode","regex":"^/([^/]+)/onboarding/step3-trading-mode$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step4-binance","regex":"^/([^/]+)/onboarding/step4-binance$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step4-first-trade","regex":"^/([^/]+)/onboarding/step4-first-trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/onboarding/step5-complete","regex":"^/([^/]+)/onboarding/step5-complete$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/velg-strategi","regex":"^/([^/]+)/velg-strategi$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/velkommen","regex":"^/([^/]+)/velkommen$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading","regex":"^/([^/]+)/copy-trading$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading/discover","regex":"^/([^/]+)/copy-trading/discover$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/copy-trading/traders/:id","regex":"^/([^/]+)/copy-trading/traders/([^/]+)$","paramNames":["locale","id"],"hasOptionalPrefix":true},{"path":"/:locale/jokertrade","regex":"^/([^/]+)/jokertrade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/leaderboard","regex":"^/([^/]+)/leaderboard$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/pilot","regex":"^/([^/]+)/pilot$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard","regex":"^/([^/]+)/dashboard$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/analysis","regex":"^/([^/]+)/dashboard/analysis$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/asset/:symbol","regex":"^/([^/]+)/dashboard/asset/([^/]+)$","paramNames":["locale","symbol"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/bot/:session_id","regex":"^/([^/]+)/dashboard/bot/([^/]+)$","paramNames":["locale","session_id"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/historikk","regex":"^/([^/]+)/dashboard/historikk$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/portfolio","regex":"^/([^/]+)/dashboard/portfolio$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/referral","regex":"^/([^/]+)/dashboard/referral$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/resultater","regex":"^/([^/]+)/dashboard/resultater$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/settings","regex":"^/([^/]+)/dashboard/settings$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/dashboard/trade","regex":"^/([^/]+)/dashboard/trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/handel","regex":"^/([^/]+)/handel$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/marked","regex":"^/([^/]+)/marked$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/profile","regex":"^/([^/]+)/profile$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/trade","regex":"^/([^/]+)/trade$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/vanlige-sporsmal","regex":"^/([^/]+)/vanlige-sporsmal$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/:slug*","regex":"^/([^/]+)/(.+)$","paramNames":["locale","slug"],"hasOptionalPrefix":true},{"path":"/:locale/feil/ikke-funnet","regex":"^/([^/]+)/feil/ikke-funnet$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/feil/ingen-tilgang","regex":"^/([^/]+)/feil/ingen-tilgang$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/:locale/feil/serverfeil","regex":"^/([^/]+)/feil/serverfeil$","paramNames":["locale"],"hasOptionalPrefix":true},{"path":"/studio/:tool*?","regex":"^/studio(?:/(.*))?$","paramNames":["tool"],"hasOptionalPrefix":false}],"staticRoutes":[{"path":"/"}],"isrRoutes":["/:locale/velg-strategi"]}', "_sentryNextJsVersion": "16.2.12" } } }] }, "**/instrumentation.*": { "condition": { "not": "foreign" }, "loaders": [{ "loader": "/Users/taj/klarpakke/node_modules/@sentry/nextjs/build/cjs/config/loaders/valueInjectionLoader.js", "options": { "values": { "__SENTRY_SERVER_MODULES__": { "@ai-sdk/openai": "^3.0.82", "@ai-sdk/perplexity": "^3.0.44", "@capacitor/cli": "^8.4.2", "@capacitor/core": "^8.4.2", "@capacitor/ios": "^8.4.2", "@coinbase/cds-web": "^9.6.1", "@hookform/resolvers": "^5.4.0", "@huggingface/inference": "^4.13.22", "@radix-ui/react-accordion": "^1.2.14", "@radix-ui/react-alert-dialog": "^1.1.17", "@radix-ui/react-aspect-ratio": "^1.1.10", "@radix-ui/react-avatar": "^1.2.0", "@radix-ui/react-checkbox": "^1.3.5", "@radix-ui/react-collapsible": "^1.1.12", "@radix-ui/react-context-menu": "^2.3.1", "@radix-ui/react-dialog": "^1.1.15", "@radix-ui/react-dropdown-menu": "^2.1.18", "@radix-ui/react-hover-card": "^1.1.17", "@radix-ui/react-label": "^2.1.10", "@radix-ui/react-popover": "^1.1.17", "@radix-ui/react-progress": "^1.1.10", "@radix-ui/react-radio-group": "^1.4.1", "@radix-ui/react-scroll-area": "^1.2.12", "@radix-ui/react-select": "^2.3.1", "@radix-ui/react-separator": "^1.1.10", "@radix-ui/react-slider": "^1.4.1", "@radix-ui/react-slot": "^1.2.4", "@radix-ui/react-switch": "^1.3.1", "@radix-ui/react-tabs": "^1.1.15", "@radix-ui/react-toggle": "^1.1.10", "@radix-ui/react-toggle-group": "^1.1.13", "@radix-ui/react-tooltip": "^1.2.10", "@react-email/render": "^2.0.9", "@sanity/assist": "^6.1.3", "@sanity/image-url": "^2.1.1", "@sanity/vision": "^6.1.0", "@sentry/nextjs": "^10.64.0", "@supabase/ssr": "^0.12.0", "@supabase/supabase-js": "^2.108.2", "@tanstack/react-query": "^5.101.1", "@upstash/redis": "^1.38.0", "ai": "^6.0.168", "canvas-confetti": "^1.9.4", "class-variance-authority": "^0.7.1", "clsx": "^2.1.1", "cmdk": "^1.1.1", "date-fns": "^4.4.0", "embla-carousel-react": "^8.6.0", "framer-motion": "^12.41.0", "immer": "^11.1.8", "lightweight-charts": "^5.2.0", "lucide-react": "^1.21.0", "next": "^16.2.9", "next-intl": "^4.13.0", "next-plausible": "^4.0.0", "next-sanity": "^13.1.1", "react": "^19.2.7", "react-day-picker": "^10.0.1", "react-dom": "^19.2.7", "react-hook-form": "^7.80.0", "react-is": "^19.2.7", "react-markdown": "^10.1.0", "react-resizable-panels": "^4.11.2", "recharts": "^3.9.0", "rehype-sanitize": "^6.0.0", "resend": "^6.12.2", "rxjs": "^7.8.2", "sanity": "^6.1.0", "sonner": "^2.0.7", "stripe": "^22.2.3", "styled-components": "^6.4.2", "svix": "^1.90.0", "tailwind-merge": "^3.6.0", "ua-parser-js": "^2.0.10", "vaul": "^1.1.2", "web-push": "^3.6.7", "zod": "^4.3.6", "zustand": "^5.0.14", "@axe-core/playwright": "^4.12.1", "@eslint/eslintrc": "^3.3.5", "@eslint/js": "^9.39.4", "@modelcontextprotocol/sdk": "^1.27.1", "@next/bundle-analyzer": "^16.2.10", "@opennextjs/cloudflare": "https://pkg.pr.new/@opennextjs/cloudflare@main", "@playwright/mcp": "^0.0.70", "@playwright/test": "^1.61.1", "@storybook/react": "^10.3.6", "@storybook/react-vite": "^10.4.6", "@stripe/mcp": "^0.3.3", "@tailwindcss/language-server": "^0.14.15", "@tailwindcss/postcss": "^4.3.1", "@testing-library/dom": "^10.4.1", "@testing-library/jest-dom": "^6.9.1", "@testing-library/react": "^16.3.2", "@testing-library/user-event": "^14.6.1", "@types/canvas-confetti": "^1.9.0", "@types/jest": "^30.0.0", "@types/node": "^26.0.0", "@types/pg": "^8.20.0", "@types/react": "^19.2.17", "@types/react-dom": "^19.2.3", "@types/testing-library__jest-dom": "^5.14.9", "@types/testing-library__react": "^10.0.1", "@types/ua-parser-js": "^0.7.39", "@types/web-push": "^3.6.4", "@typescript-eslint/eslint-plugin": "^8.59.0", "@typescript-eslint/parser": "^8.59.0", "@vitejs/plugin-react": "^6.0.3", "@vitest/coverage-v8": "^4.1.9", "allure-commandline": "^2.43.0", "allure-playwright": "^3.10.1", "autoprefixer": "^10.5.1", "axe-core": "^4.12.1", "axe-playwright": "^2.2.2", "babel-plugin-react-compiler": "^1.0.0", "canvas": "^3.2.3", "chrome-devtools-mcp": "^1.4.0", "cssnano": "^8.0.2", "csv-parse": "^7.0.0", "depcheck": "^1.4.7", "detect-secrets": "^1.0.6", "dotenv": "^17.4.2", "eslint": "^9.39.4", "eslint-config-next": "^16.2.9", "eslint-plugin-jsx-a11y": "^6.10.2", "eslint-plugin-react": "^7.37.5", "eslint-plugin-react-hooks": "^7.1.1", "husky": "^9.1.7", "jsdom": "^29.1.1", "knip": "^6.18.0", "lighthouse": "^13.4.0", "lint-staged": "^17.0.8", "perplexity-mcp": "^0.2.3", "postcss": "^8.5.25", "resend-mcp": "^2.9.0", "storybook": "^10.4.6", "tailwindcss": "^4.2.4", "ts-morph": "^28.0.0", "tsx": "^4.22.4", "typescript": "^6.0.3", "typescript-language-server": "^5.3.0", "vite": "^8.1.0", "vitest": "^4.1.9", "vscode-langservers-extracted": "^4.10.0", "wrangler": "^4.108.0", "ws": "^8.18.0", "yaml-language-server": "^1.23.0" }, "_sentryNextJsVersion": "16.2.12" } } }] } }, "root": "/Users/taj/klarpakke" }, "distDirRoot": ".next", "_originalRewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/paper-trading/:path*", "destination": "/api/paper-trading/:path*" }, { "source": "/leksjon/:lessonId", "destination": "/leksjon/[lessonId]" }], "fallback": [] }, "_originalRedirects": [{ "source": "/login", "destination": "/no/login", "permanent": true }, { "source": "/register", "destination": "/no/register", "permanent": true }, { "source": "/signup", "destination": "/register", "permanent": true }, { "source": "/:locale(no|en)/signup", "destination": "/:locale(no|en)/register", "permanent": true }, { "source": "/autotrade", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/:locale(no|en)/autotrade", "destination": "/:locale(no|en)/dashboard/auto-trade", "permanent": true }, { "source": "/paper-trading", "destination": "/handel", "permanent": true }, { "source": "/:locale(no|en)/paper-trading", "destination": "/:locale(no|en)/handel", "permanent": true }, { "source": "/paper-trading/:path*", "destination": "/handel", "permanent": true }, { "source": "/:locale(no|en)/paper-trading/:path*", "destination": "/:locale(no|en)/handel", "permanent": true }, { "source": "/live-trading", "destination": "/handel?mode=live", "permanent": true }, { "source": "/:locale(no|en)/live-trading", "destination": "/:locale(no|en)/handel?mode=live", "permanent": true }, { "source": "/:locale(no|en)/pricing", "destination": "/:locale(no|en)/priser", "permanent": true }, { "source": "/:locale(no|en)/learn", "destination": "/:locale(no|en)/kurs", "permanent": true }, { "source": "/:locale(no|en)/about", "destination": "/:locale(no|en)/om-oss", "permanent": true }, { "source": "/pricing", "destination": "/no/priser", "permanent": true }, { "source": "/learn", "destination": "/no/kurs", "permanent": true }, { "source": "/courses", "destination": "/no/kurs", "permanent": true }, { "source": "/courses/:path*", "destination": "/no/kurs/:path*", "permanent": true }, { "source": "/course/:path*", "destination": "/no/kurs/:path*", "permanent": true }, { "source": "/about", "destination": "/no/om-oss", "permanent": true }, { "source": "/contact", "destination": "/no/kontakt", "permanent": true }, { "source": "/privacy", "destination": "/no/personvern", "permanent": true }, { "source": "/terms", "destination": "/no/vilkar", "permanent": true }, { "source": "/blog", "destination": "/no", "permanent": false }, { "source": "/blog/:path*", "destination": "/no", "permanent": false }, { "source": "/dashbord", "destination": "/no/dashboard", "permanent": true }, { "source": "/:locale(no|en)/dashbord", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/marketplace", "destination": "/no/marketplace", "permanent": true }, { "source": "/settings", "destination": "/no/profile?tab=settings", "permanent": true }, { "source": "/om", "destination": "/no/om-oss", "permanent": true }, { "source": "/trading", "destination": "/no/dashboard/trade", "permanent": true }, { "source": "/portfolio", "destination": "/no/dashboard/portfolio", "permanent": true }, { "source": "/auto-trade", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/auto-trade/:path*", "destination": "/no/dashboard/auto-trade", "permanent": true }, { "source": "/handelshistorikk", "destination": "/dashboard/historikk", "permanent": true }, { "source": "/:locale(no|en)/handelshistorikk", "destination": "/:locale(no|en)/dashboard/historikk", "permanent": true }, { "source": "/admin-dashboard", "destination": "/admin", "permanent": true }, { "source": "/:locale(no|en)/admin-dashboard", "destination": "/:locale(no|en)/admin", "permanent": true }, { "source": "/leaderboard-preview", "destination": "/leaderboard", "permanent": true }, { "source": "/:locale(no|en)/leaderboard-preview", "destination": "/:locale(no|en)/leaderboard", "permanent": true }, { "source": "/super-admin", "destination": "/admin", "permanent": true }, { "source": "/:locale(no|en)/super-admin", "destination": "/:locale(no|en)/admin", "permanent": true }, { "source": "/beta-testing", "destination": "/no/dashboard", "permanent": true }, { "source": "/:locale(no|en)/beta-testing", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/signals", "destination": "/dashboard", "permanent": true }, { "source": "/:locale(no|en)/signals", "destination": "/:locale(no|en)/dashboard", "permanent": true }, { "source": "/simulator", "destination": "/no/paper-trading", "permanent": true }, { "source": "/api/webhooks/github/:path*", "destination": "/api/v1/webhooks/github/:path*", "permanent": true }, { "source": "/:locale(no|en)/simulator", "destination": "/:locale(no|en)/paper-trading", "permanent": true }, { "source": "/:locale(no|en)/settings", "destination": "/:locale(no|en)/profile?tab=settings", "permanent": true }, { "source": "/:locale(no|en)/om", "destination": "/:locale(no|en)/om-oss", "permanent": true }, { "source": "/konto", "destination": "/no/profile?tab=wallet", "permanent": true }, { "source": "/:locale(no|en)/konto", "destination": "/:locale(no|en)/profile?tab=wallet", "permanent": true }, { "source": "/innstillinger", "destination": "/no/profile?tab=settings", "permanent": true }, { "source": "/:locale(no|en)/innstillinger", "destination": "/:locale(no|en)/profile?tab=settings", "permanent": true }] };
var BuildId = "1785687792907";
var HtmlPages = ["/404", "/500"];
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/paper-trading/:path*", "destination": "/api/paper-trading/:path*", "regex": "^/api/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/leksjon/:lessonId", "destination": "/leksjon/[lessonId]", "regex": "^/leksjon(?:/([^/]+?))(?:/)?$" }], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }, { "source": "/login", "destination": "/no/login", "statusCode": 308, "regex": "^(?!/_next)/login(?:/)?$" }, { "source": "/register", "destination": "/no/register", "statusCode": 308, "regex": "^(?!/_next)/register(?:/)?$" }, { "source": "/signup", "destination": "/register", "statusCode": 308, "regex": "^(?!/_next)/signup(?:/)?$" }, { "source": "/:locale(no|en)/signup", "destination": "/:locale(no|en)/register", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/signup(?:/)?$" }, { "source": "/autotrade", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/autotrade(?:/)?$" }, { "source": "/:locale(no|en)/autotrade", "destination": "/:locale(no|en)/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/autotrade(?:/)?$" }, { "source": "/paper-trading", "destination": "/handel", "statusCode": 308, "regex": "^(?!/_next)/paper-trading(?:/)?$" }, { "source": "/:locale(no|en)/paper-trading", "destination": "/:locale(no|en)/handel", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/paper-trading(?:/)?$" }, { "source": "/paper-trading/:path*", "destination": "/handel", "statusCode": 308, "regex": "^(?!/_next)/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/:locale(no|en)/paper-trading/:path*", "destination": "/:locale(no|en)/handel", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/paper-trading(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/live-trading", "destination": "/handel?mode=live", "statusCode": 308, "regex": "^(?!/_next)/live-trading(?:/)?$" }, { "source": "/:locale(no|en)/live-trading", "destination": "/:locale(no|en)/handel?mode=live", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/live-trading(?:/)?$" }, { "source": "/:locale(no|en)/pricing", "destination": "/:locale(no|en)/priser", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/pricing(?:/)?$" }, { "source": "/:locale(no|en)/learn", "destination": "/:locale(no|en)/kurs", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/learn(?:/)?$" }, { "source": "/:locale(no|en)/about", "destination": "/:locale(no|en)/om-oss", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/about(?:/)?$" }, { "source": "/pricing", "destination": "/no/priser", "statusCode": 308, "regex": "^(?!/_next)/pricing(?:/)?$" }, { "source": "/learn", "destination": "/no/kurs", "statusCode": 308, "regex": "^(?!/_next)/learn(?:/)?$" }, { "source": "/courses", "destination": "/no/kurs", "statusCode": 308, "regex": "^(?!/_next)/courses(?:/)?$" }, { "source": "/courses/:path*", "destination": "/no/kurs/:path*", "statusCode": 308, "regex": "^(?!/_next)/courses(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/course/:path*", "destination": "/no/kurs/:path*", "statusCode": 308, "regex": "^(?!/_next)/course(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/about", "destination": "/no/om-oss", "statusCode": 308, "regex": "^(?!/_next)/about(?:/)?$" }, { "source": "/contact", "destination": "/no/kontakt", "statusCode": 308, "regex": "^(?!/_next)/contact(?:/)?$" }, { "source": "/privacy", "destination": "/no/personvern", "statusCode": 308, "regex": "^(?!/_next)/privacy(?:/)?$" }, { "source": "/terms", "destination": "/no/vilkar", "statusCode": 308, "regex": "^(?!/_next)/terms(?:/)?$" }, { "source": "/blog", "destination": "/no", "statusCode": 307, "regex": "^(?!/_next)/blog(?:/)?$" }, { "source": "/blog/:path*", "destination": "/no", "statusCode": 307, "regex": "^(?!/_next)/blog(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/dashbord", "destination": "/no/dashboard", "statusCode": 308, "regex": "^(?!/_next)/dashbord(?:/)?$" }, { "source": "/:locale(no|en)/dashbord", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/dashbord(?:/)?$" }, { "source": "/marketplace", "destination": "/no/marketplace", "statusCode": 308, "regex": "^(?!/_next)/marketplace(?:/)?$" }, { "source": "/settings", "destination": "/no/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)/settings(?:/)?$" }, { "source": "/om", "destination": "/no/om-oss", "statusCode": 308, "regex": "^(?!/_next)/om(?:/)?$" }, { "source": "/trading", "destination": "/no/dashboard/trade", "statusCode": 308, "regex": "^(?!/_next)/trading(?:/)?$" }, { "source": "/portfolio", "destination": "/no/dashboard/portfolio", "statusCode": 308, "regex": "^(?!/_next)/portfolio(?:/)?$" }, { "source": "/auto-trade", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/auto-trade(?:/)?$" }, { "source": "/auto-trade/:path*", "destination": "/no/dashboard/auto-trade", "statusCode": 308, "regex": "^(?!/_next)/auto-trade(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/handelshistorikk", "destination": "/dashboard/historikk", "statusCode": 308, "regex": "^(?!/_next)/handelshistorikk(?:/)?$" }, { "source": "/:locale(no|en)/handelshistorikk", "destination": "/:locale(no|en)/dashboard/historikk", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/handelshistorikk(?:/)?$" }, { "source": "/admin-dashboard", "destination": "/admin", "statusCode": 308, "regex": "^(?!/_next)/admin-dashboard(?:/)?$" }, { "source": "/:locale(no|en)/admin-dashboard", "destination": "/:locale(no|en)/admin", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/admin-dashboard(?:/)?$" }, { "source": "/leaderboard-preview", "destination": "/leaderboard", "statusCode": 308, "regex": "^(?!/_next)/leaderboard-preview(?:/)?$" }, { "source": "/:locale(no|en)/leaderboard-preview", "destination": "/:locale(no|en)/leaderboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/leaderboard-preview(?:/)?$" }, { "source": "/super-admin", "destination": "/admin", "statusCode": 308, "regex": "^(?!/_next)/super-admin(?:/)?$" }, { "source": "/:locale(no|en)/super-admin", "destination": "/:locale(no|en)/admin", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/super-admin(?:/)?$" }, { "source": "/beta-testing", "destination": "/no/dashboard", "statusCode": 308, "regex": "^(?!/_next)/beta-testing(?:/)?$" }, { "source": "/:locale(no|en)/beta-testing", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/beta-testing(?:/)?$" }, { "source": "/signals", "destination": "/dashboard", "statusCode": 308, "regex": "^(?!/_next)/signals(?:/)?$" }, { "source": "/:locale(no|en)/signals", "destination": "/:locale(no|en)/dashboard", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/signals(?:/)?$" }, { "source": "/simulator", "destination": "/no/paper-trading", "statusCode": 308, "regex": "^(?!/_next)/simulator(?:/)?$" }, { "source": "/api/webhooks/github/:path*", "destination": "/api/v1/webhooks/github/:path*", "statusCode": 308, "regex": "^(?!/_next)/api/webhooks/github(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/:locale(no|en)/simulator", "destination": "/:locale(no|en)/paper-trading", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/simulator(?:/)?$" }, { "source": "/:locale(no|en)/settings", "destination": "/:locale(no|en)/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/settings(?:/)?$" }, { "source": "/:locale(no|en)/om", "destination": "/:locale(no|en)/om-oss", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/om(?:/)?$" }, { "source": "/konto", "destination": "/no/profile?tab=wallet", "statusCode": 308, "regex": "^(?!/_next)/konto(?:/)?$" }, { "source": "/:locale(no|en)/konto", "destination": "/:locale(no|en)/profile?tab=wallet", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/konto(?:/)?$" }, { "source": "/innstillinger", "destination": "/no/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)/innstillinger(?:/)?$" }, { "source": "/:locale(no|en)/innstillinger", "destination": "/:locale(no|en)/profile?tab=settings", "statusCode": 308, "regex": "^(?!/_next)(?:/(no|en))/innstillinger(?:/)?$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_global-error", "regex": "^/_global\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/_global\\-error(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/api/admin/beta-signups", "regex": "^/api/admin/beta\\-signups(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/beta\\-signups(?:/)?$" }, { "page": "/api/admin/campaign/recent", "regex": "^/api/admin/campaign/recent(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/campaign/recent(?:/)?$" }, { "page": "/api/admin/campaign/stats", "regex": "^/api/admin/campaign/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/campaign/stats(?:/)?$" }, { "page": "/api/admin/cron-trigger", "regex": "^/api/admin/cron\\-trigger(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/cron\\-trigger(?:/)?$" }, { "page": "/api/admin/cta-analytics", "regex": "^/api/admin/cta\\-analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/cta\\-analytics(?:/)?$" }, { "page": "/api/admin/dashboard/data", "regex": "^/api/admin/dashboard/data(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/dashboard/data(?:/)?$" }, { "page": "/api/admin/errors", "regex": "^/api/admin/errors(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/errors(?:/)?$" }, { "page": "/api/admin/funnel/stats", "regex": "^/api/admin/funnel/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/funnel/stats(?:/)?$" }, { "page": "/api/admin/github-health", "regex": "^/api/admin/github\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/github\\-health(?:/)?$" }, { "page": "/api/admin/recent-signups", "regex": "^/api/admin/recent\\-signups(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/recent\\-signups(?:/)?$" }, { "page": "/api/admin/resend-health", "regex": "^/api/admin/resend\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/resend\\-health(?:/)?$" }, { "page": "/api/admin/sessions", "regex": "^/api/admin/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/sessions(?:/)?$" }, { "page": "/api/admin/stats", "regex": "^/api/admin/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/stats(?:/)?$" }, { "page": "/api/admin/stripe-health", "regex": "^/api/admin/stripe\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/stripe\\-health(?:/)?$" }, { "page": "/api/admin/students", "regex": "^/api/admin/students(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/students(?:/)?$" }, { "page": "/api/admin/support/cockpit-report", "regex": "^/api/admin/support/cockpit\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/cockpit\\-report(?:/)?$" }, { "page": "/api/admin/support/cockpit-report/status", "regex": "^/api/admin/support/cockpit\\-report/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/cockpit\\-report/status(?:/)?$" }, { "page": "/api/admin/support/impersonate/end", "regex": "^/api/admin/support/impersonate/end(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/impersonate/end(?:/)?$" }, { "page": "/api/admin/support/impersonate/start", "regex": "^/api/admin/support/impersonate/start(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/support/impersonate/start(?:/)?$" }, { "page": "/api/admin/test-binance-proxy", "regex": "^/api/admin/test\\-binance\\-proxy(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/test\\-binance\\-proxy(?:/)?$" }, { "page": "/api/admin/trade-health", "regex": "^/api/admin/trade\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trade\\-health(?:/)?$" }, { "page": "/api/admin/trade-health/fix", "regex": "^/api/admin/trade\\-health/fix(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trade\\-health/fix(?:/)?$" }, { "page": "/api/admin/trader-verifications", "regex": "^/api/admin/trader\\-verifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/trader\\-verifications(?:/)?$" }, { "page": "/api/admin/user-paper-balance", "regex": "^/api/admin/user\\-paper\\-balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/user\\-paper\\-balance(?:/)?$" }, { "page": "/api/admin/user-tier", "regex": "^/api/admin/user\\-tier(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/user\\-tier(?:/)?$" }, { "page": "/api/admin/users", "regex": "^/api/admin/users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/users(?:/)?$" }, { "page": "/api/admin/users/sync", "regex": "^/api/admin/users/sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/users/sync(?:/)?$" }, { "page": "/api/admin/verify", "regex": "^/api/admin/verify(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/verify(?:/)?$" }, { "page": "/api/ai/analyze-trade", "regex": "^/api/ai/analyze\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/analyze\\-trade(?:/)?$" }, { "page": "/api/ai/autopilot/activate", "regex": "^/api/ai/autopilot/activate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/activate(?:/)?$" }, { "page": "/api/ai/autopilot/pause", "regex": "^/api/ai/autopilot/pause(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/pause(?:/)?$" }, { "page": "/api/ai/autopilot/rebalance", "regex": "^/api/ai/autopilot/rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/rebalance(?:/)?$" }, { "page": "/api/ai/autopilot/resume", "regex": "^/api/ai/autopilot/resume(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/resume(?:/)?$" }, { "page": "/api/ai/autopilot/status", "regex": "^/api/ai/autopilot/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/status(?:/)?$" }, { "page": "/api/ai/autopilot/stop", "regex": "^/api/ai/autopilot/stop(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/autopilot/stop(?:/)?$" }, { "page": "/api/ai/chat", "regex": "^/api/ai/chat(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/chat(?:/)?$" }, { "page": "/api/ai/ensemble", "regex": "^/api/ai/ensemble(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/ensemble(?:/)?$" }, { "page": "/api/ai/ensemble-stats", "regex": "^/api/ai/ensemble\\-stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/ensemble\\-stats(?:/)?$" }, { "page": "/api/ai/explain-strategy", "regex": "^/api/ai/explain\\-strategy(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/explain\\-strategy(?:/)?$" }, { "page": "/api/ai/explain-trade", "regex": "^/api/ai/explain\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/explain\\-trade(?:/)?$" }, { "page": "/api/ai/insight", "regex": "^/api/ai/insight(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/insight(?:/)?$" }, { "page": "/api/ai/market-brief", "regex": "^/api/ai/market\\-brief(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/market\\-brief(?:/)?$" }, { "page": "/api/ai/sentiment", "regex": "^/api/ai/sentiment(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/ai/sentiment(?:/)?$" }, { "page": "/api/analytics", "regex": "^/api/analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics(?:/)?$" }, { "page": "/api/analytics/event", "regex": "^/api/analytics/event(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics/event(?:/)?$" }, { "page": "/api/analytics/track", "regex": "^/api/analytics/track(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/analytics/track(?:/)?$" }, { "page": "/api/auth/diagnose", "regex": "^/api/auth/diagnose(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/diagnose(?:/)?$" }, { "page": "/api/auth/logout", "regex": "^/api/auth/logout(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/logout(?:/)?$" }, { "page": "/api/auth/me", "regex": "^/api/auth/me(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/me(?:/)?$" }, { "page": "/api/auth/vipps-callback", "regex": "^/api/auth/vipps\\-callback(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/vipps\\-callback(?:/)?$" }, { "page": "/api/auth/vipps-url", "regex": "^/api/auth/vipps\\-url(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/auth/vipps\\-url(?:/)?$" }, { "page": "/api/backtest", "regex": "^/api/backtest(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/backtest(?:/)?$" }, { "page": "/api/binance/encrypt", "regex": "^/api/binance/encrypt(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/encrypt(?:/)?$" }, { "page": "/api/binance/keys", "regex": "^/api/binance/keys(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/keys(?:/)?$" }, { "page": "/api/binance/test", "regex": "^/api/binance/test(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance/test(?:/)?$" }, { "page": "/api/binance-leaders", "regex": "^/api/binance\\-leaders(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/binance\\-leaders(?:/)?$" }, { "page": "/api/chat", "regex": "^/api/chat(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/chat(?:/)?$" }, { "page": "/api/coin-prices", "regex": "^/api/coin\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/coin\\-prices(?:/)?$" }, { "page": "/api/copy-trading/discover", "regex": "^/api/copy\\-trading/discover(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/discover(?:/)?$" }, { "page": "/api/copy-trading/external-follow", "regex": "^/api/copy\\-trading/external\\-follow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/external\\-follow(?:/)?$" }, { "page": "/api/copy-trading/follow", "regex": "^/api/copy\\-trading/follow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/follow(?:/)?$" }, { "page": "/api/copy-trading/following", "regex": "^/api/copy\\-trading/following(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/following(?:/)?$" }, { "page": "/api/copy-trading/leaders", "regex": "^/api/copy\\-trading/leaders(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/leaders(?:/)?$" }, { "page": "/api/copy-trading/resolve-trader", "regex": "^/api/copy\\-trading/resolve\\-trader(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/resolve\\-trader(?:/)?$" }, { "page": "/api/copy-trading/unfollow", "regex": "^/api/copy\\-trading/unfollow(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/copy\\-trading/unfollow(?:/)?$" }, { "page": "/api/cron/adverse-selection", "regex": "^/api/cron/adverse\\-selection(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/adverse\\-selection(?:/)?$" }, { "page": "/api/cron/ai-engine", "regex": "^/api/cron/ai\\-engine(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/ai\\-engine(?:/)?$" }, { "page": "/api/cron/ai-metrics", "regex": "^/api/cron/ai\\-metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/ai\\-metrics(?:/)?$" }, { "page": "/api/cron/auto-trade", "regex": "^/api/cron/auto\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/auto\\-trade(?:/)?$" }, { "page": "/api/cron/backtest-live-gap", "regex": "^/api/cron/backtest\\-live\\-gap(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/backtest\\-live\\-gap(?:/)?$" }, { "page": "/api/cron/balance-drift-check", "regex": "^/api/cron/balance\\-drift\\-check(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/balance\\-drift\\-check(?:/)?$" }, { "page": "/api/cron/binance-sync", "regex": "^/api/cron/binance\\-sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/binance\\-sync(?:/)?$" }, { "page": "/api/cron/cron-health", "regex": "^/api/cron/cron\\-health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/cron\\-health(?:/)?$" }, { "page": "/api/cron/daily-summary", "regex": "^/api/cron/daily\\-summary(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/daily\\-summary(?:/)?$" }, { "page": "/api/cron/feature-loader", "regex": "^/api/cron/feature\\-loader(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/feature\\-loader(?:/)?$" }, { "page": "/api/cron/fill-rate-monitor", "regex": "^/api/cron/fill\\-rate\\-monitor(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/fill\\-rate\\-monitor(?:/)?$" }, { "page": "/api/cron/health-check", "regex": "^/api/cron/health\\-check(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/health\\-check(?:/)?$" }, { "page": "/api/cron/keepalive", "regex": "^/api/cron/keepalive(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/keepalive(?:/)?$" }, { "page": "/api/cron/market-impact", "regex": "^/api/cron/market\\-impact(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/market\\-impact(?:/)?$" }, { "page": "/api/cron/mifid2-export", "regex": "^/api/cron/mifid2\\-export(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/mifid2\\-export(?:/)?$" }, { "page": "/api/cron/monitoring-alert", "regex": "^/api/cron/monitoring\\-alert(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/monitoring\\-alert(?:/)?$" }, { "page": "/api/cron/outbox-recovery", "regex": "^/api/cron/outbox\\-recovery(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/outbox\\-recovery(?:/)?$" }, { "page": "/api/cron/pl-attribution", "regex": "^/api/cron/pl\\-attribution(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/pl\\-attribution(?:/)?$" }, { "page": "/api/cron/portfolio-rebalance", "regex": "^/api/cron/portfolio\\-rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/portfolio\\-rebalance(?:/)?$" }, { "page": "/api/cron/reconcile", "regex": "^/api/cron/reconcile(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/reconcile(?:/)?$" }, { "page": "/api/cron/signal-decay", "regex": "^/api/cron/signal\\-decay(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/signal\\-decay(?:/)?$" }, { "page": "/api/cron/signal-health-selfcheck", "regex": "^/api/cron/signal\\-health\\-selfcheck(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/signal\\-health\\-selfcheck(?:/)?$" }, { "page": "/api/cron/sync-prices", "regex": "^/api/cron/sync\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/sync\\-prices(?:/)?$" }, { "page": "/api/cron/tick", "regex": "^/api/cron/tick(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/tick(?:/)?$" }, { "page": "/api/cron/trading-tca", "regex": "^/api/cron/trading\\-tca(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/trading\\-tca(?:/)?$" }, { "page": "/api/cron/twap-execute", "regex": "^/api/cron/twap\\-execute(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/twap\\-execute(?:/)?$" }, { "page": "/api/cron/update-usdt-nok", "regex": "^/api/cron/update\\-usdt\\-nok(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cron/update\\-usdt\\-nok(?:/)?$" }, { "page": "/api/dashboard/bot-status", "regex": "^/api/dashboard/bot\\-status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/dashboard/bot\\-status(?:/)?$" }, { "page": "/api/dashboard/metrics", "regex": "^/api/dashboard/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/dashboard/metrics(?:/)?$" }, { "page": "/api/debug/i18n", "regex": "^/api/debug/i18n(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/debug/i18n(?:/)?$" }, { "page": "/api/email/send", "regex": "^/api/email/send(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/email/send(?:/)?$" }, { "page": "/api/error-report", "regex": "^/api/error\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/error\\-report(?:/)?$" }, { "page": "/api/exchanges/connections", "regex": "^/api/exchanges/connections(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/exchanges/connections(?:/)?$" }, { "page": "/api/exchanges/sync", "regex": "^/api/exchanges/sync(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/exchanges/sync(?:/)?$" }, { "page": "/api/fx/usdt-nok", "regex": "^/api/fx/usdt\\-nok(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/fx/usdt\\-nok(?:/)?$" }, { "page": "/api/gamification/achievements", "regex": "^/api/gamification/achievements(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/achievements(?:/)?$" }, { "page": "/api/gamification/award", "regex": "^/api/gamification/award(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/award(?:/)?$" }, { "page": "/api/gamification/stats", "regex": "^/api/gamification/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/gamification/stats(?:/)?$" }, { "page": "/api/health", "regex": "^/api/health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health(?:/)?$" }, { "page": "/api/health/oauth", "regex": "^/api/health/oauth(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/oauth(?:/)?$" }, { "page": "/api/health/sonar", "regex": "^/api/health/sonar(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/sonar(?:/)?$" }, { "page": "/api/health/websocket", "regex": "^/api/health/websocket(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/health/websocket(?:/)?$" }, { "page": "/api/klt/balance", "regex": "^/api/klt/balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/klt/balance(?:/)?$" }, { "page": "/api/klt/spending-options", "regex": "^/api/klt/spending\\-options(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/klt/spending\\-options(?:/)?$" }, { "page": "/api/leaderboard", "regex": "^/api/leaderboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leaderboard(?:/)?$" }, { "page": "/api/leaderboard/changes", "regex": "^/api/leaderboard/changes(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leaderboard/changes(?:/)?$" }, { "page": "/api/live/feed", "regex": "^/api/live/feed(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/live/feed(?:/)?$" }, { "page": "/api/live-feed", "regex": "^/api/live\\-feed(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/live\\-feed(?:/)?$" }, { "page": "/api/market/binance-24hr", "regex": "^/api/market/binance\\-24hr(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/binance\\-24hr(?:/)?$" }, { "page": "/api/market/binance-prices", "regex": "^/api/market/binance\\-prices(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/binance\\-prices(?:/)?$" }, { "page": "/api/market/snapshot", "regex": "^/api/market/snapshot(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market/snapshot(?:/)?$" }, { "page": "/api/market-intelligence", "regex": "^/api/market\\-intelligence(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/market\\-intelligence(?:/)?$" }, { "page": "/api/marketplace/listings", "regex": "^/api/marketplace/listings(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/listings(?:/)?$" }, { "page": "/api/marketplace/reviews", "regex": "^/api/marketplace/reviews(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/reviews(?:/)?$" }, { "page": "/api/marketplace/subscribe", "regex": "^/api/marketplace/subscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/marketplace/subscribe(?:/)?$" }, { "page": "/api/metrics", "regex": "^/api/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/metrics(?:/)?$" }, { "page": "/api/notifications", "regex": "^/api/notifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications(?:/)?$" }, { "page": "/api/notifications/send", "regex": "^/api/notifications/send(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/send(?:/)?$" }, { "page": "/api/notifications/send-push", "regex": "^/api/notifications/send\\-push(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/send\\-push(?:/)?$" }, { "page": "/api/notifications/subscribe", "regex": "^/api/notifications/subscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/subscribe(?:/)?$" }, { "page": "/api/notifications/unsubscribe", "regex": "^/api/notifications/unsubscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/notifications/unsubscribe(?:/)?$" }, { "page": "/api/og", "regex": "^/api/og(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/og(?:/)?$" }, { "page": "/api/onboarding/complete", "regex": "^/api/onboarding/complete(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/complete(?:/)?$" }, { "page": "/api/onboarding/events", "regex": "^/api/onboarding/events(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/events(?:/)?$" }, { "page": "/api/onboarding/first-paper-trade", "regex": "^/api/onboarding/first\\-paper\\-trade(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/first\\-paper\\-trade(?:/)?$" }, { "page": "/api/onboarding/start", "regex": "^/api/onboarding/start(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/onboarding/start(?:/)?$" }, { "page": "/api/paper-trading/balance", "regex": "^/api/paper\\-trading/balance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/balance(?:/)?$" }, { "page": "/api/paper-trading/execute", "regex": "^/api/paper\\-trading/execute(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/execute(?:/)?$" }, { "page": "/api/paper-trading/init", "regex": "^/api/paper\\-trading/init(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/init(?:/)?$" }, { "page": "/api/paper-trading/reset", "regex": "^/api/paper\\-trading/reset(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/paper\\-trading/reset(?:/)?$" }, { "page": "/api/pilot", "regex": "^/api/pilot(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot(?:/)?$" }, { "page": "/api/pilot-engine", "regex": "^/api/pilot\\-engine(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine(?:/)?$" }, { "page": "/api/pilot-engine/leaderboard", "regex": "^/api/pilot\\-engine/leaderboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine/leaderboard(?:/)?$" }, { "page": "/api/pilot-engine/notifications", "regex": "^/api/pilot\\-engine/notifications(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pilot\\-engine/notifications(?:/)?$" }, { "page": "/api/portfolio/chart", "regex": "^/api/portfolio/chart(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/chart(?:/)?$" }, { "page": "/api/portfolio/rebalance", "regex": "^/api/portfolio/rebalance(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/rebalance(?:/)?$" }, { "page": "/api/portfolio/summary", "regex": "^/api/portfolio/summary(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/portfolio/summary(?:/)?$" }, { "page": "/api/pricing", "regex": "^/api/pricing(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/pricing(?:/)?$" }, { "page": "/api/progress", "regex": "^/api/progress(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/progress(?:/)?$" }, { "page": "/api/revalidate", "regex": "^/api/revalidate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/revalidate(?:/)?$" }, { "page": "/api/send-email", "regex": "^/api/send\\-email(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/send\\-email(?:/)?$" }, { "page": "/api/signal/current", "regex": "^/api/signal/current(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/signal/current(?:/)?$" }, { "page": "/api/signal/explanation", "regex": "^/api/signal/explanation(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/signal/explanation(?:/)?$" }, { "page": "/api/stats", "regex": "^/api/stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats(?:/)?$" }, { "page": "/api/stats/active-users", "regex": "^/api/stats/active\\-users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats/active\\-users(?:/)?$" }, { "page": "/api/stats/users", "regex": "^/api/stats/users(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stats/users(?:/)?$" }, { "page": "/api/stripe/checkout", "regex": "^/api/stripe/checkout(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/checkout(?:/)?$" }, { "page": "/api/stripe/customer-portal", "regex": "^/api/stripe/customer\\-portal(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/customer\\-portal(?:/)?$" }, { "page": "/api/stripe/verify-session", "regex": "^/api/stripe/verify\\-session(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/stripe/verify\\-session(?:/)?$" }, { "page": "/api/telemetry/backtest", "regex": "^/api/telemetry/backtest(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/telemetry/backtest(?:/)?$" }, { "page": "/api/test/auth/login", "regex": "^/api/test/auth/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/test/auth/login(?:/)?$" }, { "page": "/api/test/set-onboarding", "regex": "^/api/test/set\\-onboarding(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/test/set\\-onboarding(?:/)?$" }, { "page": "/api/track/click", "regex": "^/api/track/click(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/click(?:/)?$" }, { "page": "/api/track/funnel", "regex": "^/api/track/funnel(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/funnel(?:/)?$" }, { "page": "/api/track/open", "regex": "^/api/track/open(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/track/open(?:/)?$" }, { "page": "/api/trading/auto-trade/activate", "regex": "^/api/trading/auto\\-trade/activate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/auto\\-trade/activate(?:/)?$" }, { "page": "/api/trading/mode", "regex": "^/api/trading/mode(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/mode(?:/)?$" }, { "page": "/api/trading/position", "regex": "^/api/trading/position(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/position(?:/)?$" }, { "page": "/api/trading/sessions", "regex": "^/api/trading/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/sessions(?:/)?$" }, { "page": "/api/trading/trigger", "regex": "^/api/trading/trigger(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/trigger(?:/)?$" }, { "page": "/api/trading/v3/beta/status", "regex": "^/api/trading/v3/beta/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/beta/status(?:/)?$" }, { "page": "/api/trading/v3/health", "regex": "^/api/trading/v3/health(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/health(?:/)?$" }, { "page": "/api/trading/v3/rl/signal", "regex": "^/api/trading/v3/rl/signal(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/rl/signal(?:/)?$" }, { "page": "/api/trading/v3/tax/eu-report", "regex": "^/api/trading/v3/tax/eu\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/tax/eu\\-report(?:/)?$" }, { "page": "/api/trading/v3/whitelabel/fees", "regex": "^/api/trading/v3/whitelabel/fees(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading/v3/whitelabel/fees(?:/)?$" }, { "page": "/api/trading-cockpit", "regex": "^/api/trading\\-cockpit(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit(?:/)?$" }, { "page": "/api/trading-cockpit/analytics", "regex": "^/api/trading\\-cockpit/analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/analytics(?:/)?$" }, { "page": "/api/trading-cockpit/initial", "regex": "^/api/trading\\-cockpit/initial(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/initial(?:/)?$" }, { "page": "/api/trading-cockpit/metrics", "regex": "^/api/trading\\-cockpit/metrics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/metrics(?:/)?$" }, { "page": "/api/trading-cockpit/sessions", "regex": "^/api/trading\\-cockpit/sessions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/sessions(?:/)?$" }, { "page": "/api/trading-cockpit/trades", "regex": "^/api/trading\\-cockpit/trades(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-cockpit/trades(?:/)?$" }, { "page": "/api/trading-sessions/create", "regex": "^/api/trading\\-sessions/create(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/trading\\-sessions/create(?:/)?$" }, { "page": "/api/user/auto-trading-config", "regex": "^/api/user/auto\\-trading\\-config(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/auto\\-trading\\-config(?:/)?$" }, { "page": "/api/user/badges", "regex": "^/api/user/badges(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/badges(?:/)?$" }, { "page": "/api/user/email-preferences", "regex": "^/api/user/email\\-preferences(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/email\\-preferences(?:/)?$" }, { "page": "/api/user/klt-wallet", "regex": "^/api/user/klt\\-wallet(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/klt\\-wallet(?:/)?$" }, { "page": "/api/user/notification-preferences", "regex": "^/api/user/notification\\-preferences(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/notification\\-preferences(?:/)?$" }, { "page": "/api/user/onboarding", "regex": "^/api/user/onboarding(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/onboarding(?:/)?$" }, { "page": "/api/user/profile", "regex": "^/api/user/profile(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/profile(?:/)?$" }, { "page": "/api/user/pulse", "regex": "^/api/user/pulse(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/pulse(?:/)?$" }, { "page": "/api/user/strategy-stats", "regex": "^/api/user/strategy\\-stats(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/strategy\\-stats(?:/)?$" }, { "page": "/api/user/trade-decisions", "regex": "^/api/user/trade\\-decisions(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trade\\-decisions(?:/)?$" }, { "page": "/api/user/trades", "regex": "^/api/user/trades(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trades(?:/)?$" }, { "page": "/api/user/trading-analytics", "regex": "^/api/user/trading\\-analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-analytics(?:/)?$" }, { "page": "/api/user/trading-diagnostics", "regex": "^/api/user/trading\\-diagnostics(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-diagnostics(?:/)?$" }, { "page": "/api/user/trading-logs", "regex": "^/api/user/trading\\-logs(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-logs(?:/)?$" }, { "page": "/api/user/trading-sessions/restart", "regex": "^/api/user/trading\\-sessions/restart(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/user/trading\\-sessions/restart(?:/)?$" }, { "page": "/api/webhooks/resend", "regex": "^/api/webhooks/resend(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/resend(?:/)?$" }, { "page": "/api/webhooks/sanity", "regex": "^/api/webhooks/sanity(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/sanity(?:/)?$" }, { "page": "/api/webhooks/stripe", "regex": "^/api/webhooks/stripe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/stripe(?:/)?$" }, { "page": "/api/webhooks/vipps", "regex": "^/api/webhooks/vipps(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/webhooks/vipps(?:/)?$" }, { "page": "/favicon.ico", "regex": "^/favicon\\.ico(?:/)?$", "routeKeys": {}, "namedRegex": "^/favicon\\.ico(?:/)?$" }, { "page": "/robots.txt", "regex": "^/robots\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/robots\\.txt(?:/)?$" }, { "page": "/sitemap.xml", "regex": "^/sitemap\\.xml(?:/)?$", "routeKeys": {}, "namedRegex": "^/sitemap\\.xml(?:/)?$" }], "dynamic": [{ "page": "/api/admin/errors/[id]/resolve", "regex": "^/api/admin/errors/([^/]+?)/resolve(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/admin/errors/(?<nxtPid>[^/]+?)/resolve(?:/)?$" }, { "page": "/api/copy-trading/trader/[id]", "regex": "^/api/copy\\-trading/trader/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/copy\\-trading/trader/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/courses/[id]", "regex": "^/api/courses/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/courses/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/paper-trading/trades/[trade_id]", "regex": "^/api/paper\\-trading/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrade_id": "nxtPtrade_id" }, "namedRegex": "^/api/paper\\-trading/trades/(?<nxtPtrade_id>[^/]+?)(?:/)?$" }, { "page": "/api/progress/[courseId]", "regex": "^/api/progress/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcourseId": "nxtPcourseId" }, "namedRegex": "^/api/progress/(?<nxtPcourseId>[^/]+?)(?:/)?$" }, { "page": "/api/trader-verifications/[trader_profile_id]", "regex": "^/api/trader\\-verifications/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrader_profile_id": "nxtPtrader_profile_id" }, "namedRegex": "^/api/trader\\-verifications/(?<nxtPtrader_profile_id>[^/]+?)(?:/)?$" }, { "page": "/api/trades/[tradeId]", "regex": "^/api/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtradeId": "nxtPtradeId" }, "namedRegex": "^/api/trades/(?<nxtPtradeId>[^/]+?)(?:/)?$" }, { "page": "/api/trading/v3/trades/[sessionId]", "regex": "^/api/trading/v3/trades/([^/]+?)(?:/)?$", "routeKeys": { "nxtPsessionId": "nxtPsessionId" }, "namedRegex": "^/api/trading/v3/trades/(?<nxtPsessionId>[^/]+?)(?:/)?$" }, { "page": "/api/trading-sessions/[id]/status", "regex": "^/api/trading\\-sessions/([^/]+?)/status(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/trading\\-sessions/(?<nxtPid>[^/]+?)/status(?:/)?$" }, { "page": "/studio/[[...tool]]", "regex": "^/studio(?:/(.+?))?(?:/)?$", "routeKeys": { "nxtPtool": "nxtPtool" }, "namedRegex": "^/studio(?:/(?<nxtPtool>.+?))?(?:/)?$" }, { "page": "/[locale]", "regex": "^/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)(?:/)?$" }, { "page": "/[locale]/about", "regex": "^/([^/]+?)/about(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/about(?:/)?$" }, { "page": "/[locale]/admin", "regex": "^/([^/]+?)/admin(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin(?:/)?$" }, { "page": "/[locale]/admin/ab-tests", "regex": "^/([^/]+?)/admin/ab\\-tests(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/ab\\-tests(?:/)?$" }, { "page": "/[locale]/admin/analytics", "regex": "^/([^/]+?)/admin/analytics(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/analytics(?:/)?$" }, { "page": "/[locale]/admin/auto-trading", "regex": "^/([^/]+?)/admin/auto\\-trading(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/auto\\-trading(?:/)?$" }, { "page": "/[locale]/admin/auto-trading/sessions", "regex": "^/([^/]+?)/admin/auto\\-trading/sessions(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/auto\\-trading/sessions(?:/)?$" }, { "page": "/[locale]/admin/campaign", "regex": "^/([^/]+?)/admin/campaign(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/campaign(?:/)?$" }, { "page": "/[locale]/admin/deploy", "regex": "^/([^/]+?)/admin/deploy(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/deploy(?:/)?$" }, { "page": "/[locale]/admin/forgot-password", "regex": "^/([^/]+?)/admin/forgot\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/forgot\\-password(?:/)?$" }, { "page": "/[locale]/admin/health", "regex": "^/([^/]+?)/admin/health(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/health(?:/)?$" }, { "page": "/[locale]/admin/login", "regex": "^/([^/]+?)/admin/login(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/login(?:/)?$" }, { "page": "/[locale]/admin/marketing/ctas", "regex": "^/([^/]+?)/admin/marketing/ctas(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/marketing/ctas(?:/)?$" }, { "page": "/[locale]/admin/monetization", "regex": "^/([^/]+?)/admin/monetization(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/monetization(?:/)?$" }, { "page": "/[locale]/admin/monitor", "regex": "^/([^/]+?)/admin/monitor(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/monitor(?:/)?$" }, { "page": "/[locale]/admin/reset-password", "regex": "^/([^/]+?)/admin/reset\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/reset\\-password(?:/)?$" }, { "page": "/[locale]/admin/settings", "regex": "^/([^/]+?)/admin/settings(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/settings(?:/)?$" }, { "page": "/[locale]/admin/students", "regex": "^/([^/]+?)/admin/students(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/students(?:/)?$" }, { "page": "/[locale]/admin/support/impersonate", "regex": "^/([^/]+?)/admin/support/impersonate(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/support/impersonate(?:/)?$" }, { "page": "/[locale]/admin/sync-status", "regex": "^/([^/]+?)/admin/sync\\-status(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/sync\\-status(?:/)?$" }, { "page": "/[locale]/admin/system", "regex": "^/([^/]+?)/admin/system(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/system(?:/)?$" }, { "page": "/[locale]/admin/trade-health", "regex": "^/([^/]+?)/admin/trade\\-health(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/trade\\-health(?:/)?$" }, { "page": "/[locale]/admin/trader-verifications", "regex": "^/([^/]+?)/admin/trader\\-verifications(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/trader\\-verifications(?:/)?$" }, { "page": "/[locale]/admin/users", "regex": "^/([^/]+?)/admin/users(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/users(?:/)?$" }, { "page": "/[locale]/admin/v2", "regex": "^/([^/]+?)/admin/v2(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/v2(?:/)?$" }, { "page": "/[locale]/admin/v3", "regex": "^/([^/]+?)/admin/v3(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/admin/v3(?:/)?$" }, { "page": "/[locale]/akademi", "regex": "^/([^/]+?)/akademi(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/akademi(?:/)?$" }, { "page": "/[locale]/akademi/dashboard-guide", "regex": "^/([^/]+?)/akademi/dashboard\\-guide(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/akademi/dashboard\\-guide(?:/)?$" }, { "page": "/[locale]/api-dokumentasjon", "regex": "^/([^/]+?)/api\\-dokumentasjon(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/api\\-dokumentasjon(?:/)?$" }, { "page": "/[locale]/binance-guide", "regex": "^/([^/]+?)/binance\\-guide(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/binance\\-guide(?:/)?$" }, { "page": "/[locale]/bots", "regex": "^/([^/]+?)/bots(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/bots(?:/)?$" }, { "page": "/[locale]/callback", "regex": "^/([^/]+?)/callback(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/callback(?:/)?$" }, { "page": "/[locale]/checkout", "regex": "^/([^/]+?)/checkout(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/checkout(?:/)?$" }, { "page": "/[locale]/checkout/success", "regex": "^/([^/]+?)/checkout/success(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/checkout/success(?:/)?$" }, { "page": "/[locale]/cookies", "regex": "^/([^/]+?)/cookies(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/cookies(?:/)?$" }, { "page": "/[locale]/copy-trading", "regex": "^/([^/]+?)/copy\\-trading(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading(?:/)?$" }, { "page": "/[locale]/copy-trading/discover", "regex": "^/([^/]+?)/copy\\-trading/discover(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading/discover(?:/)?$" }, { "page": "/[locale]/copy-trading/traders/[id]", "regex": "^/([^/]+?)/copy\\-trading/traders/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPid": "nxtPid" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/copy\\-trading/traders/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard", "regex": "^/([^/]+?)/dashboard(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard(?:/)?$" }, { "page": "/[locale]/dashboard/analysis", "regex": "^/([^/]+?)/dashboard/analysis(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/analysis(?:/)?$" }, { "page": "/[locale]/dashboard/asset/[symbol]", "regex": "^/([^/]+?)/dashboard/asset/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPsymbol": "nxtPsymbol" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/asset/(?<nxtPsymbol>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard/bot/[session_id]", "regex": "^/([^/]+?)/dashboard/bot/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPsession_id": "nxtPsession_id" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/bot/(?<nxtPsession_id>[^/]+?)(?:/)?$" }, { "page": "/[locale]/dashboard/historikk", "regex": "^/([^/]+?)/dashboard/historikk(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/historikk(?:/)?$" }, { "page": "/[locale]/dashboard/portfolio", "regex": "^/([^/]+?)/dashboard/portfolio(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/portfolio(?:/)?$" }, { "page": "/[locale]/dashboard/referral", "regex": "^/([^/]+?)/dashboard/referral(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/referral(?:/)?$" }, { "page": "/[locale]/dashboard/resultater", "regex": "^/([^/]+?)/dashboard/resultater(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/resultater(?:/)?$" }, { "page": "/[locale]/dashboard/settings", "regex": "^/([^/]+?)/dashboard/settings(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/settings(?:/)?$" }, { "page": "/[locale]/dashboard/trade", "regex": "^/([^/]+?)/dashboard/trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/dashboard/trade(?:/)?$" }, { "page": "/[locale]/driftsfeil", "regex": "^/([^/]+?)/driftsfeil(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/driftsfeil(?:/)?$" }, { "page": "/[locale]/feil/ikke-funnet", "regex": "^/([^/]+?)/feil/ikke\\-funnet(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/ikke\\-funnet(?:/)?$" }, { "page": "/[locale]/feil/ingen-tilgang", "regex": "^/([^/]+?)/feil/ingen\\-tilgang(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/ingen\\-tilgang(?:/)?$" }, { "page": "/[locale]/feil/serverfeil", "regex": "^/([^/]+?)/feil/serverfeil(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/feil/serverfeil(?:/)?$" }, { "page": "/[locale]/handel", "regex": "^/([^/]+?)/handel(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/handel(?:/)?$" }, { "page": "/[locale]/hjelp", "regex": "^/([^/]+?)/hjelp(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/hjelp(?:/)?$" }, { "page": "/[locale]/jokertrade", "regex": "^/([^/]+?)/jokertrade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/jokertrade(?:/)?$" }, { "page": "/[locale]/kalkulator", "regex": "^/([^/]+?)/kalkulator(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kalkulator(?:/)?$" }, { "page": "/[locale]/kontakt", "regex": "^/([^/]+?)/kontakt(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kontakt(?:/)?$" }, { "page": "/[locale]/kurs", "regex": "^/([^/]+?)/kurs(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs(?:/)?$" }, { "page": "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto", "regex": "^/([^/]+?)/kurs/grunnleggende/leksjon/introduksjon\\-til\\-krypto(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/grunnleggende/leksjon/introduksjon\\-til\\-krypto(?:/)?$" }, { "page": "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging", "regex": "^/([^/]+?)/kurs/strategi/leksjon/dollar\\-cost\\-averaging(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/strategi/leksjon/dollar\\-cost\\-averaging(?:/)?$" }, { "page": "/[locale]/kurs/[moduleSlug]", "regex": "^/([^/]+?)/kurs/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPmoduleSlug": "nxtPmoduleSlug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/(?<nxtPmoduleSlug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]", "regex": "^/([^/]+?)/kurs/([^/]+?)/leksjon/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPmoduleSlug": "nxtPmoduleSlug", "nxtPlessonSlug": "nxtPlessonSlug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/kurs/(?<nxtPmoduleSlug>[^/]+?)/leksjon/(?<nxtPlessonSlug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/leaderboard", "regex": "^/([^/]+?)/leaderboard(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/leaderboard(?:/)?$" }, { "page": "/[locale]/leksjon/[lessonId]", "regex": "^/([^/]+?)/leksjon/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPlessonId": "nxtPlessonId" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/leksjon/(?<nxtPlessonId>[^/]+?)(?:/)?$" }, { "page": "/[locale]/login", "regex": "^/([^/]+?)/login(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/login(?:/)?$" }, { "page": "/[locale]/marked", "regex": "^/([^/]+?)/marked(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/marked(?:/)?$" }, { "page": "/[locale]/marketplace", "regex": "^/([^/]+?)/marketplace(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/marketplace(?:/)?$" }, { "page": "/[locale]/mobiloversikt", "regex": "^/([^/]+?)/mobiloversikt(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/mobiloversikt(?:/)?$" }, { "page": "/[locale]/om-oss", "regex": "^/([^/]+?)/om\\-oss(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/om\\-oss(?:/)?$" }, { "page": "/[locale]/onboarding", "regex": "^/([^/]+?)/onboarding(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding(?:/)?$" }, { "page": "/[locale]/onboarding/step1-welcome", "regex": "^/([^/]+?)/onboarding/step1\\-welcome(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step1\\-welcome(?:/)?$" }, { "page": "/[locale]/onboarding/step2-level", "regex": "^/([^/]+?)/onboarding/step2\\-level(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step2\\-level(?:/)?$" }, { "page": "/[locale]/onboarding/step3-trading-mode", "regex": "^/([^/]+?)/onboarding/step3\\-trading\\-mode(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step3\\-trading\\-mode(?:/)?$" }, { "page": "/[locale]/onboarding/step4-binance", "regex": "^/([^/]+?)/onboarding/step4\\-binance(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step4\\-binance(?:/)?$" }, { "page": "/[locale]/onboarding/step4-first-trade", "regex": "^/([^/]+?)/onboarding/step4\\-first\\-trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step4\\-first\\-trade(?:/)?$" }, { "page": "/[locale]/onboarding/step5-complete", "regex": "^/([^/]+?)/onboarding/step5\\-complete(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/onboarding/step5\\-complete(?:/)?$" }, { "page": "/[locale]/personvern", "regex": "^/([^/]+?)/personvern(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/personvern(?:/)?$" }, { "page": "/[locale]/pilot", "regex": "^/([^/]+?)/pilot(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/pilot(?:/)?$" }, { "page": "/[locale]/priser", "regex": "^/([^/]+?)/priser(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser(?:/)?$" }, { "page": "/[locale]/priser/cancel", "regex": "^/([^/]+?)/priser/cancel(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser/cancel(?:/)?$" }, { "page": "/[locale]/priser/success", "regex": "^/([^/]+?)/priser/success(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/priser/success(?:/)?$" }, { "page": "/[locale]/profile", "regex": "^/([^/]+?)/profile(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/profile(?:/)?$" }, { "page": "/[locale]/register", "regex": "^/([^/]+?)/register(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/register(?:/)?$" }, { "page": "/[locale]/reset-password", "regex": "^/([^/]+?)/reset\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/reset\\-password(?:/)?$" }, { "page": "/[locale]/trade", "regex": "^/([^/]+?)/trade(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trade(?:/)?$" }, { "page": "/[locale]/update-password", "regex": "^/([^/]+?)/update\\-password(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/update\\-password(?:/)?$" }, { "page": "/[locale]/vanlige-sporsmal", "regex": "^/([^/]+?)/vanlige\\-sporsmal(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/vanlige\\-sporsmal(?:/)?$" }, { "page": "/[locale]/velg-strategi", "regex": "^/([^/]+?)/velg\\-strategi(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/velg\\-strategi(?:/)?$" }, { "page": "/[locale]/velkommen", "regex": "^/([^/]+?)/velkommen(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/velkommen(?:/)?$" }, { "page": "/[locale]/vilkar", "regex": "^/([^/]+?)/vilkar(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/vilkar(?:/)?$" }, { "page": "/[locale]/[...slug]", "regex": "^/([^/]+?)/(.+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/(?<nxtPslug>.+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var PrerenderManifest = { "version": 4, "routes": { "/": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/", "dataRoute": "/index.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_global-error": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_global-error", "dataRoute": "/_global-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/api/ai/sentiment": { "initialHeaders": { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600", "content-type": "application/json", "x-next-cache-tags": "_N_T_/layout,_N_T_/api/layout,_N_T_/api/ai/layout,_N_T_/api/ai/sentiment/layout,_N_T_/api/ai/sentiment/route,_N_T_/api/ai/sentiment" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 900, "initialExpireSeconds": 31536e3, "srcRoute": "/api/ai/sentiment", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/api/fx/usdt-nok": { "initialHeaders": { "cache-control": "public, s-maxage=30, stale-while-revalidate=300", "content-type": "application/json", "x-next-cache-tags": "_N_T_/layout,_N_T_/api/layout,_N_T_/api/fx/layout,_N_T_/api/fx/usdt-nok/layout,_N_T_/api/fx/usdt-nok/route,_N_T_/api/fx/usdt-nok" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 30, "initialExpireSeconds": 31536e3, "srcRoute": "/api/fx/usdt-nok", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 60, "initialExpireSeconds": 31536e3, "srcRoute": "/[locale]/driftsfeil", "dataRoute": "/en/driftsfeil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/favicon.ico": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/x-icon", "x-next-cache-tags": "_N_T_/layout,_N_T_/favicon.ico/layout,_N_T_/favicon.ico/route,_N_T_/favicon.ico" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/favicon.ico", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/no/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 60, "initialExpireSeconds": 31536e3, "srcRoute": "/[locale]/driftsfeil", "dataRoute": "/no/driftsfeil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/robots.txt": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "text/plain", "x-next-cache-tags": "_N_T_/layout,_N_T_/robots.txt/layout,_N_T_/robots.txt/route,_N_T_/robots.txt" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/robots.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": { "/[locale]/driftsfeil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/driftsfeil(?:/)?$", "dataRoute": "/[locale]/driftsfeil.rsc", "fallback": false, "fallbackRootParams": [], "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/driftsfeil\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "notFoundRoutes": [], "preview": { "previewModeId": "4eaf439f5b42886fbb062fb8cb96e061", "previewModeSigningKey": "2b952ce646aa80247e0cf1b3116da5807cc73d94dac94364dfb9280ae9f657d5", "previewModeEncryptionKey": "fca4a9594b13b9038c85559a03ad3f92922cdc3bb6f503cb198a6f7ba9c55492" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge/chunks/[root-of-the-server]__1_x6o4q._.js", "server/edge/chunks/[root-of-the-server]__0fsa3kx._.js", "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js"], "name": "middleware", "page": "/", "entrypoint": "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_0v0bcwd.js", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$", "originalSource": "/((?!_next/static|_next/image|favicon.ico|logo.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)).*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "1785687792907", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "tepN3di05FpNaylqbU13g5eje7l/MMFD+ERi8HTsWR0=", "__NEXT_PREVIEW_MODE_ID": "4eaf439f5b42886fbb062fb8cb96e061", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "fca4a9594b13b9038c85559a03ad3f92922cdc3bb6f503cb198a6f7ba9c55492", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "2b952ce646aa80247e0cf1b3116da5807cc73d94dac94364dfb9280ae9f657d5" } } }, "sortedMiddleware": ["/"], "functions": {} };
var AppPathRoutesManifest = { "/[locale]/(academy)/akademi/dashboard-guide/page": "/[locale]/akademi/dashboard-guide", "/[locale]/(academy)/akademi/page": "/[locale]/akademi", "/[locale]/(academy)/kurs/[moduleSlug]/leksjon/[lessonSlug]/page": "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]", "/[locale]/(academy)/kurs/[moduleSlug]/page": "/[locale]/kurs/[moduleSlug]", "/[locale]/(academy)/kurs/grunnleggende/leksjon/introduksjon-til-krypto/page": "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto", "/[locale]/(academy)/kurs/page": "/[locale]/kurs", "/[locale]/(academy)/kurs/strategi/leksjon/dollar-cost-averaging/page": "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging", "/[locale]/(academy)/leksjon/[lessonId]/page": "/[locale]/leksjon/[lessonId]", "/[locale]/(admin)/admin/ab-tests/page": "/[locale]/admin/ab-tests", "/[locale]/(admin)/admin/analytics/page": "/[locale]/admin/analytics", "/[locale]/(admin)/admin/auto-trading/page": "/[locale]/admin/auto-trading", "/[locale]/(admin)/admin/auto-trading/sessions/page": "/[locale]/admin/auto-trading/sessions", "/[locale]/(admin)/admin/campaign/page": "/[locale]/admin/campaign", "/[locale]/(admin)/admin/deploy/page": "/[locale]/admin/deploy", "/[locale]/(admin)/admin/forgot-password/page": "/[locale]/admin/forgot-password", "/[locale]/(admin)/admin/health/page": "/[locale]/admin/health", "/[locale]/(admin)/admin/login/page": "/[locale]/admin/login", "/[locale]/(admin)/admin/marketing/ctas/page": "/[locale]/admin/marketing/ctas", "/[locale]/(admin)/admin/monetization/page": "/[locale]/admin/monetization", "/[locale]/(admin)/admin/monitor/page": "/[locale]/admin/monitor", "/[locale]/(admin)/admin/page": "/[locale]/admin", "/[locale]/(admin)/admin/reset-password/page": "/[locale]/admin/reset-password", "/[locale]/(admin)/admin/settings/page": "/[locale]/admin/settings", "/[locale]/(admin)/admin/students/page": "/[locale]/admin/students", "/[locale]/(admin)/admin/support/impersonate/page": "/[locale]/admin/support/impersonate", "/[locale]/(admin)/admin/sync-status/page": "/[locale]/admin/sync-status", "/[locale]/(admin)/admin/system/page": "/[locale]/admin/system", "/[locale]/(admin)/admin/trade-health/page": "/[locale]/admin/trade-health", "/[locale]/(admin)/admin/trader-verifications/page": "/[locale]/admin/trader-verifications", "/[locale]/(admin)/admin/users/page": "/[locale]/admin/users", "/[locale]/(admin)/admin/v2/page": "/[locale]/admin/v2", "/[locale]/(admin)/admin/v3/page": "/[locale]/admin/v3", "/[locale]/(auth)/login/page": "/[locale]/login", "/[locale]/(auth)/register/page": "/[locale]/register", "/[locale]/(auth)/reset-password/page": "/[locale]/reset-password", "/[locale]/(auth)/update-password/page": "/[locale]/update-password", "/[locale]/(commerce)/checkout/page": "/[locale]/checkout", "/[locale]/(commerce)/checkout/success/page": "/[locale]/checkout/success", "/[locale]/(commerce)/marketplace/page": "/[locale]/marketplace", "/[locale]/(legal)/cookies/page": "/[locale]/cookies", "/[locale]/(legal)/driftsfeil/page": "/[locale]/driftsfeil", "/[locale]/(legal)/personvern/page": "/[locale]/personvern", "/[locale]/(legal)/vilkar/page": "/[locale]/vilkar", "/[locale]/(marketing)/about/page": "/[locale]/about", "/[locale]/(marketing)/api-dokumentasjon/page": "/[locale]/api-dokumentasjon", "/[locale]/(marketing)/binance-guide/page": "/[locale]/binance-guide", "/[locale]/(marketing)/bots/page": "/[locale]/bots", "/[locale]/(marketing)/hjelp/page": "/[locale]/hjelp", "/[locale]/(marketing)/kalkulator/page": "/[locale]/kalkulator", "/[locale]/(marketing)/kontakt/page": "/[locale]/kontakt", "/[locale]/(marketing)/mobiloversikt/page": "/[locale]/mobiloversikt", "/[locale]/(marketing)/om-oss/page": "/[locale]/om-oss", "/[locale]/(marketing)/priser/cancel/page": "/[locale]/priser/cancel", "/[locale]/(marketing)/priser/page": "/[locale]/priser", "/[locale]/(marketing)/priser/success/page": "/[locale]/priser/success", "/[locale]/(onboarding)/onboarding/page": "/[locale]/onboarding", "/[locale]/(onboarding)/onboarding/step1-welcome/page": "/[locale]/onboarding/step1-welcome", "/[locale]/(onboarding)/onboarding/step2-level/page": "/[locale]/onboarding/step2-level", "/[locale]/(onboarding)/onboarding/step3-trading-mode/page": "/[locale]/onboarding/step3-trading-mode", "/[locale]/(onboarding)/onboarding/step4-binance/page": "/[locale]/onboarding/step4-binance", "/[locale]/(onboarding)/onboarding/step4-first-trade/page": "/[locale]/onboarding/step4-first-trade", "/[locale]/(onboarding)/onboarding/step5-complete/page": "/[locale]/onboarding/step5-complete", "/[locale]/(onboarding)/velg-strategi/page": "/[locale]/velg-strategi", "/[locale]/(onboarding)/velkommen/page": "/[locale]/velkommen", "/[locale]/(social)/copy-trading/discover/page": "/[locale]/copy-trading/discover", "/[locale]/(social)/copy-trading/page": "/[locale]/copy-trading", "/[locale]/(social)/copy-trading/traders/[id]/page": "/[locale]/copy-trading/traders/[id]", "/[locale]/(social)/jokertrade/page": "/[locale]/jokertrade", "/[locale]/(social)/leaderboard/page": "/[locale]/leaderboard", "/[locale]/(social)/pilot/page": "/[locale]/pilot", "/[locale]/(user)/dashboard/analysis/page": "/[locale]/dashboard/analysis", "/[locale]/(user)/dashboard/asset/[symbol]/page": "/[locale]/dashboard/asset/[symbol]", "/[locale]/(user)/dashboard/bot/[session_id]/page": "/[locale]/dashboard/bot/[session_id]", "/[locale]/(user)/dashboard/historikk/page": "/[locale]/dashboard/historikk", "/[locale]/(user)/dashboard/page": "/[locale]/dashboard", "/[locale]/(user)/dashboard/portfolio/page": "/[locale]/dashboard/portfolio", "/[locale]/(user)/dashboard/referral/page": "/[locale]/dashboard/referral", "/[locale]/(user)/dashboard/resultater/page": "/[locale]/dashboard/resultater", "/[locale]/(user)/dashboard/settings/page": "/[locale]/dashboard/settings", "/[locale]/(user)/dashboard/trade/page": "/[locale]/dashboard/trade", "/[locale]/(user)/handel/page": "/[locale]/handel", "/[locale]/(user)/marked/page": "/[locale]/marked", "/[locale]/(user)/profile/page": "/[locale]/profile", "/[locale]/(user)/trade/page": "/[locale]/trade", "/[locale]/(user)/vanlige-sporsmal/page": "/[locale]/vanlige-sporsmal", "/[locale]/[...slug]/page": "/[locale]/[...slug]", "/[locale]/callback/route": "/[locale]/callback", "/[locale]/feil/ikke-funnet/page": "/[locale]/feil/ikke-funnet", "/[locale]/feil/ingen-tilgang/page": "/[locale]/feil/ingen-tilgang", "/[locale]/feil/serverfeil/page": "/[locale]/feil/serverfeil", "/[locale]/page": "/[locale]", "/_global-error/page": "/_global-error", "/_not-found/page": "/_not-found", "/api/admin/beta-signups/route": "/api/admin/beta-signups", "/api/admin/campaign/recent/route": "/api/admin/campaign/recent", "/api/admin/campaign/stats/route": "/api/admin/campaign/stats", "/api/admin/cron-trigger/route": "/api/admin/cron-trigger", "/api/admin/cta-analytics/route": "/api/admin/cta-analytics", "/api/admin/dashboard/data/route": "/api/admin/dashboard/data", "/api/admin/errors/[id]/resolve/route": "/api/admin/errors/[id]/resolve", "/api/admin/errors/route": "/api/admin/errors", "/api/admin/funnel/stats/route": "/api/admin/funnel/stats", "/api/admin/github-health/route": "/api/admin/github-health", "/api/admin/recent-signups/route": "/api/admin/recent-signups", "/api/admin/resend-health/route": "/api/admin/resend-health", "/api/admin/sessions/route": "/api/admin/sessions", "/api/admin/stats/route": "/api/admin/stats", "/api/admin/stripe-health/route": "/api/admin/stripe-health", "/api/admin/students/route": "/api/admin/students", "/api/admin/support/cockpit-report/route": "/api/admin/support/cockpit-report", "/api/admin/support/cockpit-report/status/route": "/api/admin/support/cockpit-report/status", "/api/admin/support/impersonate/end/route": "/api/admin/support/impersonate/end", "/api/admin/support/impersonate/start/route": "/api/admin/support/impersonate/start", "/api/admin/test-binance-proxy/route": "/api/admin/test-binance-proxy", "/api/admin/trade-health/fix/route": "/api/admin/trade-health/fix", "/api/admin/trade-health/route": "/api/admin/trade-health", "/api/admin/trader-verifications/route": "/api/admin/trader-verifications", "/api/admin/user-paper-balance/route": "/api/admin/user-paper-balance", "/api/admin/user-tier/route": "/api/admin/user-tier", "/api/admin/users/route": "/api/admin/users", "/api/admin/users/sync/route": "/api/admin/users/sync", "/api/admin/verify/route": "/api/admin/verify", "/api/ai/analyze-trade/route": "/api/ai/analyze-trade", "/api/ai/autopilot/activate/route": "/api/ai/autopilot/activate", "/api/ai/autopilot/pause/route": "/api/ai/autopilot/pause", "/api/ai/autopilot/rebalance/route": "/api/ai/autopilot/rebalance", "/api/ai/autopilot/resume/route": "/api/ai/autopilot/resume", "/api/ai/autopilot/status/route": "/api/ai/autopilot/status", "/api/ai/autopilot/stop/route": "/api/ai/autopilot/stop", "/api/ai/chat/route": "/api/ai/chat", "/api/ai/ensemble-stats/route": "/api/ai/ensemble-stats", "/api/ai/ensemble/route": "/api/ai/ensemble", "/api/ai/explain-strategy/route": "/api/ai/explain-strategy", "/api/ai/explain-trade/route": "/api/ai/explain-trade", "/api/ai/insight/route": "/api/ai/insight", "/api/ai/market-brief/route": "/api/ai/market-brief", "/api/ai/sentiment/route": "/api/ai/sentiment", "/api/analytics/event/route": "/api/analytics/event", "/api/analytics/route": "/api/analytics", "/api/analytics/track/route": "/api/analytics/track", "/api/auth/diagnose/route": "/api/auth/diagnose", "/api/auth/logout/route": "/api/auth/logout", "/api/auth/me/route": "/api/auth/me", "/api/auth/vipps-callback/route": "/api/auth/vipps-callback", "/api/auth/vipps-url/route": "/api/auth/vipps-url", "/api/backtest/route": "/api/backtest", "/api/binance-leaders/route": "/api/binance-leaders", "/api/binance/encrypt/route": "/api/binance/encrypt", "/api/binance/keys/route": "/api/binance/keys", "/api/binance/test/route": "/api/binance/test", "/api/chat/route": "/api/chat", "/api/coin-prices/route": "/api/coin-prices", "/api/copy-trading/discover/route": "/api/copy-trading/discover", "/api/copy-trading/external-follow/route": "/api/copy-trading/external-follow", "/api/copy-trading/follow/route": "/api/copy-trading/follow", "/api/copy-trading/following/route": "/api/copy-trading/following", "/api/copy-trading/leaders/route": "/api/copy-trading/leaders", "/api/copy-trading/resolve-trader/route": "/api/copy-trading/resolve-trader", "/api/copy-trading/trader/[id]/route": "/api/copy-trading/trader/[id]", "/api/copy-trading/unfollow/route": "/api/copy-trading/unfollow", "/api/courses/[id]/route": "/api/courses/[id]", "/api/cron/adverse-selection/route": "/api/cron/adverse-selection", "/api/cron/ai-engine/route": "/api/cron/ai-engine", "/api/cron/ai-metrics/route": "/api/cron/ai-metrics", "/api/cron/auto-trade/route": "/api/cron/auto-trade", "/api/cron/backtest-live-gap/route": "/api/cron/backtest-live-gap", "/api/cron/balance-drift-check/route": "/api/cron/balance-drift-check", "/api/cron/binance-sync/route": "/api/cron/binance-sync", "/api/cron/cron-health/route": "/api/cron/cron-health", "/api/cron/daily-summary/route": "/api/cron/daily-summary", "/api/cron/feature-loader/route": "/api/cron/feature-loader", "/api/cron/fill-rate-monitor/route": "/api/cron/fill-rate-monitor", "/api/cron/health-check/route": "/api/cron/health-check", "/api/cron/keepalive/route": "/api/cron/keepalive", "/api/cron/market-impact/route": "/api/cron/market-impact", "/api/cron/mifid2-export/route": "/api/cron/mifid2-export", "/api/cron/monitoring-alert/route": "/api/cron/monitoring-alert", "/api/cron/outbox-recovery/route": "/api/cron/outbox-recovery", "/api/cron/pl-attribution/route": "/api/cron/pl-attribution", "/api/cron/portfolio-rebalance/route": "/api/cron/portfolio-rebalance", "/api/cron/reconcile/route": "/api/cron/reconcile", "/api/cron/signal-decay/route": "/api/cron/signal-decay", "/api/cron/signal-health-selfcheck/route": "/api/cron/signal-health-selfcheck", "/api/cron/sync-prices/route": "/api/cron/sync-prices", "/api/cron/tick/route": "/api/cron/tick", "/api/cron/trading-tca/route": "/api/cron/trading-tca", "/api/cron/twap-execute/route": "/api/cron/twap-execute", "/api/cron/update-usdt-nok/route": "/api/cron/update-usdt-nok", "/api/dashboard/bot-status/route": "/api/dashboard/bot-status", "/api/dashboard/metrics/route": "/api/dashboard/metrics", "/api/debug/i18n/route": "/api/debug/i18n", "/api/email/send/route": "/api/email/send", "/api/error-report/route": "/api/error-report", "/api/exchanges/connections/route": "/api/exchanges/connections", "/api/exchanges/sync/route": "/api/exchanges/sync", "/api/fx/usdt-nok/route": "/api/fx/usdt-nok", "/api/gamification/achievements/route": "/api/gamification/achievements", "/api/gamification/award/route": "/api/gamification/award", "/api/gamification/stats/route": "/api/gamification/stats", "/api/health/oauth/route": "/api/health/oauth", "/api/health/route": "/api/health", "/api/health/sonar/route": "/api/health/sonar", "/api/health/websocket/route": "/api/health/websocket", "/api/klt/balance/route": "/api/klt/balance", "/api/klt/spending-options/route": "/api/klt/spending-options", "/api/leaderboard/changes/route": "/api/leaderboard/changes", "/api/leaderboard/route": "/api/leaderboard", "/api/live-feed/route": "/api/live-feed", "/api/live/feed/route": "/api/live/feed", "/api/market-intelligence/route": "/api/market-intelligence", "/api/market/binance-24hr/route": "/api/market/binance-24hr", "/api/market/binance-prices/route": "/api/market/binance-prices", "/api/market/snapshot/route": "/api/market/snapshot", "/api/marketplace/listings/route": "/api/marketplace/listings", "/api/marketplace/reviews/route": "/api/marketplace/reviews", "/api/marketplace/subscribe/route": "/api/marketplace/subscribe", "/api/metrics/route": "/api/metrics", "/api/notifications/route": "/api/notifications", "/api/notifications/send-push/route": "/api/notifications/send-push", "/api/notifications/send/route": "/api/notifications/send", "/api/notifications/subscribe/route": "/api/notifications/subscribe", "/api/notifications/unsubscribe/route": "/api/notifications/unsubscribe", "/api/og/route": "/api/og", "/api/onboarding/complete/route": "/api/onboarding/complete", "/api/onboarding/events/route": "/api/onboarding/events", "/api/onboarding/first-paper-trade/route": "/api/onboarding/first-paper-trade", "/api/onboarding/start/route": "/api/onboarding/start", "/api/paper-trading/balance/route": "/api/paper-trading/balance", "/api/paper-trading/execute/route": "/api/paper-trading/execute", "/api/paper-trading/init/route": "/api/paper-trading/init", "/api/paper-trading/reset/route": "/api/paper-trading/reset", "/api/paper-trading/trades/[trade_id]/route": "/api/paper-trading/trades/[trade_id]", "/api/pilot-engine/leaderboard/route": "/api/pilot-engine/leaderboard", "/api/pilot-engine/notifications/route": "/api/pilot-engine/notifications", "/api/pilot-engine/route": "/api/pilot-engine", "/api/pilot/route": "/api/pilot", "/api/portfolio/chart/route": "/api/portfolio/chart", "/api/portfolio/rebalance/route": "/api/portfolio/rebalance", "/api/portfolio/summary/route": "/api/portfolio/summary", "/api/pricing/route": "/api/pricing", "/api/progress/[courseId]/route": "/api/progress/[courseId]", "/api/progress/route": "/api/progress", "/api/revalidate/route": "/api/revalidate", "/api/send-email/route": "/api/send-email", "/api/signal/current/route": "/api/signal/current", "/api/signal/explanation/route": "/api/signal/explanation", "/api/stats/active-users/route": "/api/stats/active-users", "/api/stats/route": "/api/stats", "/api/stats/users/route": "/api/stats/users", "/api/stripe/checkout/route": "/api/stripe/checkout", "/api/stripe/customer-portal/route": "/api/stripe/customer-portal", "/api/stripe/verify-session/route": "/api/stripe/verify-session", "/api/telemetry/backtest/route": "/api/telemetry/backtest", "/api/test/auth/login/route": "/api/test/auth/login", "/api/test/set-onboarding/route": "/api/test/set-onboarding", "/api/track/click/route": "/api/track/click", "/api/track/funnel/route": "/api/track/funnel", "/api/track/open/route": "/api/track/open", "/api/trader-verifications/[trader_profile_id]/route": "/api/trader-verifications/[trader_profile_id]", "/api/trades/[tradeId]/route": "/api/trades/[tradeId]", "/api/trading-cockpit/analytics/route": "/api/trading-cockpit/analytics", "/api/trading-cockpit/initial/route": "/api/trading-cockpit/initial", "/api/trading-cockpit/metrics/route": "/api/trading-cockpit/metrics", "/api/trading-cockpit/route": "/api/trading-cockpit", "/api/trading-cockpit/sessions/route": "/api/trading-cockpit/sessions", "/api/trading-cockpit/trades/route": "/api/trading-cockpit/trades", "/api/trading-sessions/[id]/status/route": "/api/trading-sessions/[id]/status", "/api/trading-sessions/create/route": "/api/trading-sessions/create", "/api/trading/auto-trade/activate/route": "/api/trading/auto-trade/activate", "/api/trading/mode/route": "/api/trading/mode", "/api/trading/position/route": "/api/trading/position", "/api/trading/sessions/route": "/api/trading/sessions", "/api/trading/trigger/route": "/api/trading/trigger", "/api/trading/v3/beta/status/route": "/api/trading/v3/beta/status", "/api/trading/v3/health/route": "/api/trading/v3/health", "/api/trading/v3/rl/signal/route": "/api/trading/v3/rl/signal", "/api/trading/v3/tax/eu-report/route": "/api/trading/v3/tax/eu-report", "/api/trading/v3/trades/[sessionId]/route": "/api/trading/v3/trades/[sessionId]", "/api/trading/v3/whitelabel/fees/route": "/api/trading/v3/whitelabel/fees", "/api/user/auto-trading-config/route": "/api/user/auto-trading-config", "/api/user/badges/route": "/api/user/badges", "/api/user/email-preferences/route": "/api/user/email-preferences", "/api/user/klt-wallet/route": "/api/user/klt-wallet", "/api/user/notification-preferences/route": "/api/user/notification-preferences", "/api/user/onboarding/route": "/api/user/onboarding", "/api/user/profile/route": "/api/user/profile", "/api/user/pulse/route": "/api/user/pulse", "/api/user/strategy-stats/route": "/api/user/strategy-stats", "/api/user/trade-decisions/route": "/api/user/trade-decisions", "/api/user/trades/route": "/api/user/trades", "/api/user/trading-analytics/route": "/api/user/trading-analytics", "/api/user/trading-diagnostics/route": "/api/user/trading-diagnostics", "/api/user/trading-logs/route": "/api/user/trading-logs", "/api/user/trading-sessions/restart/route": "/api/user/trading-sessions/restart", "/api/webhooks/resend/route": "/api/webhooks/resend", "/api/webhooks/sanity/route": "/api/webhooks/sanity", "/api/webhooks/stripe/route": "/api/webhooks/stripe", "/api/webhooks/vipps/route": "/api/webhooks/vipps", "/favicon.ico/route": "/favicon.ico", "/page": "/", "/robots.txt/route": "/robots.txt", "/sitemap.xml/route": "/sitemap.xml", "/studio/[[...tool]]/page": "/studio/[[...tool]]" };
var FunctionsConfigManifest = { "version": 1, "functions": { "/": {}, "/[locale]": {}, "/[locale]/[...slug]": {}, "/[locale]/about": {}, "/[locale]/admin": {}, "/[locale]/admin/ab-tests": {}, "/[locale]/admin/analytics": {}, "/[locale]/admin/auto-trading": {}, "/[locale]/admin/auto-trading/sessions": {}, "/[locale]/admin/campaign": {}, "/[locale]/admin/deploy": {}, "/[locale]/admin/forgot-password": {}, "/[locale]/admin/health": {}, "/[locale]/admin/login": {}, "/[locale]/admin/marketing/ctas": {}, "/[locale]/admin/monetization": {}, "/[locale]/admin/monitor": {}, "/[locale]/admin/reset-password": {}, "/[locale]/admin/settings": {}, "/[locale]/admin/students": {}, "/[locale]/admin/support/impersonate": {}, "/[locale]/admin/sync-status": {}, "/[locale]/admin/system": {}, "/[locale]/admin/trade-health": {}, "/[locale]/admin/trader-verifications": {}, "/[locale]/admin/users": {}, "/[locale]/admin/v2": {}, "/[locale]/admin/v3": {}, "/[locale]/akademi": {}, "/[locale]/akademi/dashboard-guide": {}, "/[locale]/api-dokumentasjon": {}, "/[locale]/binance-guide": {}, "/[locale]/bots": {}, "/[locale]/checkout": {}, "/[locale]/checkout/success": {}, "/[locale]/cookies": {}, "/[locale]/copy-trading": {}, "/[locale]/copy-trading/discover": {}, "/[locale]/copy-trading/traders/[id]": {}, "/[locale]/dashboard": {}, "/[locale]/dashboard/analysis": {}, "/[locale]/dashboard/asset/[symbol]": {}, "/[locale]/dashboard/bot/[session_id]": {}, "/[locale]/dashboard/historikk": {}, "/[locale]/dashboard/portfolio": {}, "/[locale]/dashboard/referral": {}, "/[locale]/dashboard/resultater": {}, "/[locale]/dashboard/settings": {}, "/[locale]/dashboard/trade": {}, "/[locale]/driftsfeil": {}, "/[locale]/feil/ikke-funnet": {}, "/[locale]/feil/ingen-tilgang": {}, "/[locale]/feil/serverfeil": {}, "/[locale]/handel": {}, "/[locale]/hjelp": {}, "/[locale]/jokertrade": {}, "/[locale]/kalkulator": {}, "/[locale]/kontakt": {}, "/[locale]/kurs": {}, "/[locale]/kurs/[moduleSlug]": {}, "/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]": {}, "/[locale]/kurs/grunnleggende/leksjon/introduksjon-til-krypto": {}, "/[locale]/kurs/strategi/leksjon/dollar-cost-averaging": {}, "/[locale]/leaderboard": {}, "/[locale]/leksjon/[lessonId]": {}, "/[locale]/login": {}, "/[locale]/marked": {}, "/[locale]/marketplace": {}, "/[locale]/mobiloversikt": {}, "/[locale]/om-oss": {}, "/[locale]/onboarding": {}, "/[locale]/onboarding/step1-welcome": {}, "/[locale]/onboarding/step2-level": {}, "/[locale]/onboarding/step3-trading-mode": {}, "/[locale]/onboarding/step4-binance": {}, "/[locale]/onboarding/step4-first-trade": {}, "/[locale]/onboarding/step5-complete": {}, "/[locale]/personvern": {}, "/[locale]/pilot": {}, "/[locale]/priser": {}, "/[locale]/priser/cancel": {}, "/[locale]/priser/success": {}, "/[locale]/profile": {}, "/[locale]/register": {}, "/[locale]/reset-password": {}, "/[locale]/trade": {}, "/[locale]/update-password": {}, "/[locale]/vanlige-sporsmal": {}, "/[locale]/velg-strategi": {}, "/[locale]/velkommen": {}, "/[locale]/vilkar": {}, "/api/admin/beta-signups": {}, "/api/admin/cta-analytics": {}, "/api/admin/recent-signups": {}, "/api/admin/students": {}, "/api/admin/test-binance-proxy": {}, "/api/admin/trade-health": {}, "/api/admin/trade-health/fix": {}, "/api/admin/trader-verifications": {}, "/api/ai/analyze-trade": { "maxDuration": 30 }, "/api/ai/autopilot/activate": { "maxDuration": 60 }, "/api/ai/autopilot/pause": {}, "/api/ai/autopilot/rebalance": { "maxDuration": 300 }, "/api/ai/autopilot/resume": {}, "/api/ai/autopilot/status": {}, "/api/ai/autopilot/stop": {}, "/api/ai/chat": { "maxDuration": 60 }, "/api/ai/ensemble-stats": {}, "/api/ai/explain-strategy": { "maxDuration": 20 }, "/api/ai/explain-trade": { "maxDuration": 30 }, "/api/ai/insight": {}, "/api/ai/market-brief": {}, "/api/auth/vipps-callback": {}, "/api/auth/vipps-url": {}, "/api/chat": { "maxDuration": 30 }, "/api/coin-prices": {}, "/api/copy-trading/discover": {}, "/api/copy-trading/external-follow": {}, "/api/copy-trading/follow": {}, "/api/copy-trading/following": {}, "/api/copy-trading/leaders": {}, "/api/copy-trading/resolve-trader": {}, "/api/copy-trading/trader/[id]": {}, "/api/copy-trading/unfollow": {}, "/api/courses/[id]": {}, "/api/cron/ai-engine": { "maxDuration": 60 }, "/api/cron/ai-metrics": { "maxDuration": 60 }, "/api/cron/auto-trade": {}, "/api/cron/balance-drift-check": { "maxDuration": 30 }, "/api/cron/binance-sync": {}, "/api/cron/cron-health": {}, "/api/cron/feature-loader": { "maxDuration": 60 }, "/api/cron/outbox-recovery": {}, "/api/cron/portfolio-rebalance": {}, "/api/cron/reconcile": {}, "/api/cron/signal-health-selfcheck": {}, "/api/cron/tick": {}, "/api/cron/trading-tca": { "maxDuration": 30 }, "/api/cron/twap-execute": {}, "/api/cron/update-usdt-nok": { "maxDuration": 15 }, "/api/dashboard/bot-status": {}, "/api/dashboard/metrics": {}, "/api/email/send": {}, "/api/health": {}, "/api/health/websocket": {}, "/api/klt/balance": {}, "/api/klt/spending-options": {}, "/api/leaderboard": {}, "/api/leaderboard/changes": {}, "/api/live-feed": {}, "/api/live/feed": {}, "/api/market-intelligence": {}, "/api/market/snapshot": {}, "/api/marketplace/listings": {}, "/api/marketplace/subscribe": {}, "/api/notifications": {}, "/api/notifications/send-push": {}, "/api/notifications/subscribe": {}, "/api/notifications/unsubscribe": {}, "/api/pilot": {}, "/api/pilot-engine/leaderboard": {}, "/api/pilot-engine/notifications": {}, "/api/portfolio/rebalance": {}, "/api/pricing": {}, "/api/stripe/customer-portal": {}, "/api/trader-verifications/[trader_profile_id]": {}, "/api/trading/v3/trades/[sessionId]": {}, "/api/user/auto-trading-config": {}, "/api/user/badges": {}, "/api/user/email-preferences": {}, "/api/user/klt-wallet": {}, "/api/user/notification-preferences": {}, "/api/user/onboarding": {}, "/api/user/profile": {}, "/api/user/pulse": {}, "/api/user/strategy-stats": {}, "/api/user/trade-decisions": {}, "/api/user/trades": {}, "/api/user/trading-diagnostics": {}, "/api/user/trading-logs": {}, "/api/user/trading-sessions/restart": {}, "/api/webhooks/sanity": {}, "/api/webhooks/stripe": {}, "/api/webhooks/vipps": {}, "/studio/[[...tool]]": {} } };
var PagesManifest = { "/404": "pages/404.html", "/500": "pages/500.html" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.OPEN_NEXT_BUILD_ID = NextConfig.deploymentId ?? BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/patchAsyncStorage.js
var mod = (init_node_module(), __toCommonJS(node_module_exports));
var resolveFilename = mod._resolveFilename;

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto from "node:crypto";
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
function isLocalizedPath(path2) {
  return NextConfig.i18n?.locales.includes(path2.split("/")[1].toLowerCase()) ?? false;
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
function constructNextUrl(baseUrl, path2) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path2}`, baseUrl);
  return url.href;
}
function convertRes(res) {
  const statusCode = res.statusCode || 200;
  const headers = parseHeaders(res.getFixedHeaders());
  const isBase64Encoded = isBinaryContentType(headers["content-type"]) || !!headers["content-encoding"];
  const body = new ReadableStream3({
    pull(controller) {
      if (!res._chunks || res._chunks.length === 0) {
        controller.close();
        return;
      }
      controller.enqueue(res._chunks.shift());
    }
  });
  return {
    type: "core",
    statusCode,
    headers,
    body,
    isBase64Encoded
  };
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
function convertToQuery(querystring) {
  if (!querystring)
    return {};
  const query = new URLSearchParams(querystring);
  const queryObject = {};
  for (const key of query.keys()) {
    const queries = query.getAll(key);
    queryObject[key] = queries.length > 1 ? queries : queries[0];
  }
  return queryObject;
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
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function fixCacheHeaderForHtmlPages(internalEvent, headers) {
  if (internalEvent.rawPath === "/404" || internalEvent.rawPath === "/500") {
    if (process.env.OPEN_NEXT_DANGEROUSLY_SET_ERROR_HEADERS === "true") {
      return;
    }
    headers[CommonHeaders.CACHE_CONTROL] = "private, no-cache, no-store, max-age=0, must-revalidate";
    return;
  }
  const localizedPath = localizePath(internalEvent);
  if (HtmlPages.includes(localizedPath) && !internalEvent.headers["x-middleware-prefetch"]) {
    headers[CommonHeaders.CACHE_CONTROL] = "public, max-age=0, s-maxage=31536000, must-revalidate";
  }
}
function fixSWRCacheHeader(headers) {
  let cacheControl = headers[CommonHeaders.CACHE_CONTROL];
  if (!cacheControl)
    return;
  if (Array.isArray(cacheControl)) {
    cacheControl = cacheControl.join(",");
  }
  if (typeof cacheControl !== "string")
    return;
  headers[CommonHeaders.CACHE_CONTROL] = cacheControl.replace(/\bstale-while-revalidate(?!=)/, "stale-while-revalidate=2592000");
}
function addOpenNextHeader(headers) {
  if (NextConfig.poweredByHeader) {
    headers["X-OpenNext"] = "1";
  }
  if (globalThis.openNextDebug) {
    headers["X-OpenNext-Version"] = globalThis.openNextVersion;
  }
  if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
    headers["X-OpenNext-RequestId"] = globalThis.__openNextAls.getStore()?.requestId;
  }
}
async function revalidateIfRequired(host, rawPath, headers, req) {
  if (headers[CommonHeaders.NEXT_CACHE] === "STALE") {
    const internalMeta = req?.[Symbol.for("NextInternalRequestMeta")];
    const revalidateUrl = internalMeta?._nextDidRewrite ? rawPath.startsWith("/_next/data/") ? `/_next/data/${BuildId}${internalMeta?._nextRewroteUrl}.json` : internalMeta?._nextRewroteUrl : rawPath;
    try {
      const hash = (str) => crypto.createHash("md5").update(str).digest("hex");
      const lastModified = globalThis.__openNextAls.getStore()?.lastModified ?? 0;
      const eTag = `${headers.etag ?? headers.ETag ?? ""}`;
      await globalThis.queue.send({
        MessageBody: { host, url: revalidateUrl, eTag, lastModified },
        MessageDeduplicationId: hash(`${rawPath}-${lastModified}-${eTag}`),
        MessageGroupId: generateMessageGroupId(rawPath)
      });
    } catch (e) {
      error(`Failed to revalidate stale page ${rawPath}`, e);
    }
  }
}
function fixISRHeaders(headers) {
  const sMaxAgeRegex = /s-maxage=(\d+)/;
  const match = headers[CommonHeaders.CACHE_CONTROL]?.match(sMaxAgeRegex);
  const sMaxAge = match ? Number.parseInt(match[1]) : void 0;
  if (!sMaxAge) {
    return;
  }
  if (headers[CommonHeaders.NEXT_CACHE] === "REVALIDATED") {
    headers[CommonHeaders.CACHE_CONTROL] = "private, no-cache, no-store, max-age=0, must-revalidate";
    return;
  }
  const _lastModified = globalThis.__openNextAls.getStore()?.lastModified ?? 0;
  if (headers[CommonHeaders.NEXT_CACHE] === "HIT" && _lastModified > 0) {
    debug("cache-control", headers[CommonHeaders.CACHE_CONTROL], _lastModified, Date.now());
    if (sMaxAge && sMaxAge !== 31536e3) {
      const age = Math.round((Date.now() - _lastModified) / 1e3);
      const remainingTtl = Math.max(sMaxAge - age, 1);
      headers[CommonHeaders.CACHE_CONTROL] = `s-maxage=${remainingTtl}, stale-while-revalidate=2592000`;
    }
  }
  if (headers[CommonHeaders.NEXT_CACHE] !== "STALE")
    return;
  headers[CommonHeaders.CACHE_CONTROL] = "s-maxage=2, stale-while-revalidate=2592000";
}
function createServerResponse(routingResult, headers, responseStream) {
  const internalEvent = routingResult.internalEvent;
  return new OpenNextNodeResponse((_headers) => {
    fixCacheHeaderForHtmlPages(internalEvent, _headers);
    fixSWRCacheHeader(_headers);
    addOpenNextHeader(_headers);
    fixISRHeaders(_headers);
  }, async (_headers) => {
    await revalidateIfRequired(internalEvent.headers.host, internalEvent.rawPath, _headers);
    await invalidateCDNOnRequest(routingResult, _headers);
  }, responseStream, headers, routingResult.rewriteStatusCode);
}
async function invalidateCDNOnRequest(params, headers) {
  const { internalEvent, resolvedRoutes, initialURL } = params;
  const initialPath = new URL(initialURL).pathname;
  const isIsrRevalidation = internalEvent.headers["x-isr"] === "1";
  if (!isIsrRevalidation && headers[CommonHeaders.NEXT_CACHE] === "REVALIDATED") {
    await globalThis.cdnInvalidationHandler.invalidatePaths([
      {
        initialPath,
        rawPath: internalEvent.rawPath,
        resolvedRoutes
      }
    ]);
  }
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;

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
  return function matchRoute(path2) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path2));
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

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;

// node_modules/@opennextjs/aws/dist/core/util.js
init_logger();
import NextServer from "next/dist/server/next-server.js";

// node_modules/@opennextjs/aws/dist/core/require-hooks.js
init_logger();
var mod2 = (init_node_module(), __toCommonJS(node_module_exports));
var resolveFilename2 = mod2._resolveFilename;

// node_modules/@opennextjs/aws/dist/core/util.js
var cacheHandlerPath = __require.resolve("./cache.cjs");
var composableCacheHandlerPath = __require.resolve("./composable-cache.cjs");
var nextServer = new NextServer.default({
  conf: {
    ...NextConfig,
    // Next.js compression should be disabled because of a bug in the bundled
    // `compression` package — https://github.com/vercel/next.js/issues/11669
    compress: false,
    // By default, Next.js uses local disk to store ISR cache. We will use
    // our own cache handler to store the cache on S3.
    //#override stableIncrementalCache
    cacheHandler: cacheHandlerPath,
    cacheMaxMemorySize: 0,
    // We need to disable memory cache
    //#endOverride
    experimental: {
      ...NextConfig.experimental,
      // This uses the request.headers.host as the URL
      // https://github.com/vercel/next.js/blob/canary/packages/next/src/server/next-server.ts#L1749-L1754
      //#override trustHostHeader
      trustHostHeader: true,
      //#endOverride
      //#override composableCache
      cacheHandlers: {
        default: composableCacheHandlerPath
      }
      //#endOverride
    }
  },
  customServer: false,
  dev: false,
  dir: __dirname
});
var routesLoaded = false;
globalThis.__next_route_preloader = async (stage) => {
  if (routesLoaded) {
    return;
  }
  const thisFunction = globalThis.fnName ? globalThis.openNextConfig.functions[globalThis.fnName] : globalThis.openNextConfig.default;
  const routePreloadingBehavior = thisFunction?.routePreloadingBehavior ?? "none";
  if (routePreloadingBehavior === "none") {
    routesLoaded = true;
    return;
  }
  if (!("unstable_preloadEntries" in nextServer)) {
    debug("The current version of Next.js does not support route preloading. Skipping route preloading.");
    routesLoaded = true;
    return;
  }
  if (stage === "waitUntil" && routePreloadingBehavior === "withWaitUntil") {
    const waitUntil = globalThis.__openNextAls.getStore()?.waitUntil;
    if (!waitUntil) {
      error("You've tried to use the 'withWaitUntil' route preloading behavior, but the 'waitUntil' function is not available.");
      routesLoaded = true;
      return;
    }
    debug("Preloading entries with waitUntil");
    waitUntil?.(nextServer.unstable_preloadEntries());
    routesLoaded = true;
  } else if (stage === "start" && routePreloadingBehavior === "onStart" || stage === "warmerEvent" && routePreloadingBehavior === "onWarmerEvent" || stage === "onDemand") {
    const startTimestamp = Date.now();
    debug("Preloading entries");
    await nextServer.unstable_preloadEntries();
    debug("Preloading entries took", Date.now() - startTimestamp, "ms");
    routesLoaded = true;
  }
};
var requestHandler = (metadata) => "getRequestHandlerWithMetadata" in nextServer ? nextServer.getRequestHandlerWithMetadata(metadata) : nextServer.getRequestHandler();

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
globalThis.__openNextAls = new AsyncLocalStorage();
async function openNextHandler(internalEvent, options) {
  const initialHeaders = internalEvent.headers;
  const requestId = globalThis.openNextConfig.middleware?.external ? internalEvent.headers[INTERNAL_EVENT_REQUEST_ID] : Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: initialHeaders["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    await globalThis.__next_route_preloader("waitUntil");
    if (initialHeaders["x-forwarded-host"]) {
      initialHeaders.host = initialHeaders["x-forwarded-host"];
    }
    debug("internalEvent", internalEvent);
    const internalHeaders = {
      initialPath: initialHeaders[INTERNAL_HEADER_INITIAL_URL] ?? internalEvent.rawPath,
      resolvedRoutes: initialHeaders[INTERNAL_HEADER_RESOLVED_ROUTES] ? JSON.parse(initialHeaders[INTERNAL_HEADER_RESOLVED_ROUTES]) : [],
      rewriteStatusCode: Number.parseInt(initialHeaders[INTERNAL_HEADER_REWRITE_STATUS_CODE])
    };
    let routingResult = {
      internalEvent,
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      initialURL: internalEvent.url,
      ...internalHeaders
    };
    const headers = "type" in routingResult ? routingResult.headers : routingResult.internalEvent.headers;
    const overwrittenResponseHeaders = {};
    for (const [rawKey, value] of Object.entries(headers)) {
      if (!rawKey.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
        continue;
      }
      const key = rawKey.slice(MIDDLEWARE_HEADER_PREFIX_LEN);
      if (key !== "x-middleware-set-cookie") {
        overwrittenResponseHeaders[key] = value;
      }
      headers[key] = value;
      delete headers[rawKey];
    }
    if ("isExternalRewrite" in routingResult && routingResult.isExternalRewrite === true) {
      try {
        routingResult = await globalThis.proxyExternalRequest.proxy(routingResult.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        routingResult = {
          internalEvent: {
            type: "core",
            rawPath: "/500",
            method: "GET",
            headers: {},
            url: constructNextUrl(internalEvent.url, "/500"),
            query: {},
            cookies: {},
            remoteAddress: ""
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          isISR: false,
          origin: false,
          initialURL: internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if ("type" in routingResult) {
      if (options?.streamCreator) {
        const response = createServerResponse({
          internalEvent,
          isExternalRewrite: false,
          isISR: false,
          resolvedRoutes: [],
          origin: false,
          initialURL: internalEvent.url
        }, routingResult.headers, options.streamCreator);
        response.statusCode = routingResult.statusCode;
        response.flushHeaders();
        const [bodyToConsume, bodyToReturn] = routingResult.body.tee();
        for await (const chunk of bodyToConsume) {
          response.write(chunk);
        }
        response.end();
        routingResult.body = bodyToReturn;
      }
      return routingResult;
    }
    const preprocessedEvent = routingResult.internalEvent;
    debug("preprocessedEvent", preprocessedEvent);
    const { search, pathname, hash } = new URL(preprocessedEvent.url);
    const reqProps = {
      method: preprocessedEvent.method,
      url: `${pathname}${search}${hash}`,
      //WORKAROUND: We pass this header to the serverless function to mimic a prefetch request which will not trigger revalidation since we handle revalidation differently
      // There is 3 way we can handle revalidation:
      // 1. We could just let the revalidation go as normal, but due to race conditions the revalidation will be unreliable
      // 2. We could alter the lastModified time of our cache to make next believe that the cache is fresh, but this could cause issues with stale data since the cdn will cache the stale data as if it was fresh
      // 3. OUR CHOICE: We could pass a purpose prefetch header to the serverless function to make next believe that the request is a prefetch request and not trigger revalidation (This could potentially break in the future if next changes the behavior of prefetch requests)
      headers: {
        ...headers
      },
      body: preprocessedEvent.body,
      remoteAddress: preprocessedEvent.remoteAddress
    };
    const mergeHeadersPriority = globalThis.openNextConfig.dangerous?.headersAndCookiesPriority ? globalThis.openNextConfig.dangerous.headersAndCookiesPriority(preprocessedEvent) : "middleware";
    const store = globalThis.__openNextAls.getStore();
    if (store) {
      store.mergeHeadersPriority = mergeHeadersPriority;
    }
    const req = new IncomingMessage(reqProps);
    const res = createServerResponse(routingResult, overwrittenResponseHeaders, options?.streamCreator);
    await processRequest(req, res, routingResult);
    const { statusCode, headers: responseHeaders, isBase64Encoded, body } = convertRes(res);
    const internalResult = {
      type: internalEvent.type,
      statusCode,
      headers: responseHeaders,
      body,
      isBase64Encoded
    };
    return internalResult;
  });
}
async function processRequest(req, res, routingResult) {
  delete req.body;
  const initialURL = new URL(
    // We always assume that only the routing layer can set this header.
    routingResult.internalEvent.headers[INTERNAL_HEADER_INITIAL_URL] ?? routingResult.initialURL
  );
  let invokeStatus;
  if (routingResult.internalEvent.rawPath === "/500") {
    invokeStatus = 500;
  } else if (routingResult.internalEvent.rawPath === "/404") {
    invokeStatus = 404;
  }
  const requestMetadata = {
    isNextDataReq: routingResult.internalEvent.query.__nextDataReq === "1",
    initURL: routingResult.initialURL,
    initQuery: convertToQuery(initialURL.search),
    initProtocol: initialURL.protocol,
    defaultLocale: NextConfig.i18n?.defaultLocale,
    locale: routingResult.locale,
    middlewareInvoke: false,
    // By setting invokePath and invokeQuery we can bypass some of the routing logic in Next.js
    invokePath: routingResult.internalEvent.rawPath,
    invokeQuery: routingResult.internalEvent.query,
    // invokeStatus is only used for error pages
    invokeStatus
  };
  try {
    req.url = initialURL.pathname + convertToQueryString(routingResult.internalEvent.query);
    await requestHandler(requestMetadata)(req, res);
  } catch (e) {
    if (e.constructor.name === "NoFallbackError") {
      await handleNoFallbackError(req, res, routingResult, requestMetadata);
    } else {
      error("NextJS request failed.", e);
      await tryRenderError("500", res, routingResult.internalEvent);
    }
  }
}
async function handleNoFallbackError(req, res, routingResult, metadata, index = 1) {
  if (index >= 5) {
    await tryRenderError("500", res, routingResult.internalEvent);
    return;
  }
  if (index >= routingResult.resolvedRoutes.length) {
    await tryRenderError("404", res, routingResult.internalEvent);
    return;
  }
  try {
    await requestHandler({
      ...routingResult,
      invokeOutput: routingResult.resolvedRoutes[index].route,
      ...metadata
    })(req, res);
  } catch (e) {
    if (e.constructor.name === "NoFallbackError") {
      await handleNoFallbackError(req, res, routingResult, metadata, index + 1);
    } else {
      error("NextJS request failed.", e);
      await tryRenderError("500", res, routingResult.internalEvent);
    }
  }
}
async function tryRenderError(type, res, internalEvent) {
  try {
    const _req = new IncomingMessage({
      method: "GET",
      url: `/${type}`,
      headers: internalEvent.headers,
      body: internalEvent.body,
      remoteAddress: internalEvent.remoteAddress
    });
    const requestMetadata = {
      // By setting invokePath and invokeQuery we can bypass some of the routing logic in Next.js
      invokePath: type === "404" ? "/404" : "/500",
      invokeStatus: type === "404" ? 404 : 500,
      middlewareInvoke: false
    };
    await requestHandler(requestMetadata)(_req, res);
  } catch (e) {
    error("NextJS request failed.", e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      message: "Server failed to respond.",
      details: e
    }, null, 2));
  }
}

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
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_node(), cloudflare_node_exports));
  return m_1.default;
}
async function resolveTagCache(tagCache) {
  if (typeof tagCache === "function") {
    return tagCache();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveQueue(queue) {
  if (typeof queue === "function") {
    return queue();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy2(), dummy_exports2));
  return m_1.default;
}
async function resolveIncrementalCache(incrementalCache) {
  if (typeof incrementalCache === "function") {
    return incrementalCache();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy3(), dummy_exports3));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy4(), dummy_exports4));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}
async function resolveCdnInvalidation(cdnInvalidation) {
  if (typeof cdnInvalidation === "function") {
    return cdnInvalidation();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy5(), dummy_exports5));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createMainHandler.js
async function createMainHandler() {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  const thisFunction = globalThis.fnName ? config.functions[globalThis.fnName] : config.default;
  globalThis.serverId = generateUniqueId();
  globalThis.openNextConfig = config;
  await globalThis.__next_route_preloader("start");
  globalThis.queue = await resolveQueue(thisFunction.override?.queue);
  globalThis.incrementalCache = await resolveIncrementalCache(thisFunction.override?.incrementalCache);
  globalThis.tagCache = await resolveTagCache(thisFunction.override?.tagCache);
  if (config.middleware?.external !== true) {
    globalThis.assetResolver = await resolveAssetResolver(globalThis.openNextConfig.middleware?.assetResolver);
  }
  globalThis.proxyExternalRequest = await resolveProxyRequest(thisFunction.override?.proxyExternalRequest);
  globalThis.cdnInvalidationHandler = await resolveCdnInvalidation(thisFunction.override?.cdnInvalidation);
  const converter2 = await resolveConverter(thisFunction.override?.converter);
  const { wrapper, name } = await resolveWrapper(thisFunction.override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(openNextHandler, converter2);
}

// node_modules/@opennextjs/aws/dist/adapters/server-adapter.js
setNodeEnv();
setNextjsServerWorkingDirectory();
globalThis.internalFetch = fetch;
var handler2 = await createMainHandler();
function setNextjsServerWorkingDirectory() {
  process.chdir(__dirname);
}
export {
  handler2 as handler
};
