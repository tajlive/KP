#!/usr/bin/env node
/**
 * Bygg-script for Linear MCP
 * Kompilerer scripts/mcp/linear-mcp.ts til scripts/mcp/dist/linear-mcp.js
 * Samme mønster som build-bridge.mjs (esbuild).
 */

import { build } from "esbuild";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "dist");

try {
  mkdirSync(outDir, { recursive: true });

  await build({
    entryPoints: [resolve(__dirname, "linear-mcp.ts")],
    outfile: resolve(outDir, "linear-mcp.js"),
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    minify: true,
    sourcemap: true,
    external: ["@modelcontextprotocol/sdk"],
  });

  console.log(`✅ Linear MCP bygget: ${resolve(outDir, "linear-mcp.js")}`);
} catch (err) {
  console.error("❌ Bygg feilet:", err.message);
  process.exit(1);
}
