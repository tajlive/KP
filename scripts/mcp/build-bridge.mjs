#!/usr/bin/env node
/**
 * Bygg-script for KIMI Bridge
 * Kompilerer scripts/mcp/kimi-bridge.ts til scripts/mcp/dist/kimi-bridge.js
 * Bruker esbuild (allerede i repoet via Storybook).
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
    entryPoints: [resolve(__dirname, "kimi-bridge.ts")],
    outfile: resolve(outDir, "kimi-bridge.js"),
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    minify: true,
    sourcemap: true,
  });

  console.log(`✅ Bridge bygget: ${resolve(outDir, "kimi-bridge.js")}`);
} catch (err) {
  console.error("❌ Bygg feilet:", err.message);
  process.exit(1);
}
