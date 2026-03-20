#!/usr/bin/env node
/**
 * Kjører `husky` kun når repo har `.git` (lokal utvikling).
 * På Vercel/CI er `.git` ikke med i deploy-artefakt → unngår «.git can't be found» i build-logg.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitMeta = join(root, ".git");
if (!existsSync(gitMeta)) {
  process.exit(0);
}

const huskyBin = join(root, "node_modules", "husky", "bin.js");
if (!existsSync(huskyBin)) {
  process.exit(0);
}

const r = spawnSync(process.execPath, [huskyBin], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 0);
