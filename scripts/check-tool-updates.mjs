#!/usr/bin/env node
/**
 * Sjekker om KIMI Code CLI har nye versjoner.
 *
 * Bruk:
 *   node scripts/check-tool-updates.mjs          # menneskevennlig status
 *   node scripts/check-tool-updates.mjs --json   # JSON-output
 *   node scripts/check-tool-updates.mjs --write  # oppdater .tool-versions til siste
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TOOLS = [
  {
    name: "kimi-code",
    label: "KIMI Code CLI",
    source: "npm",
    packageName: "@moonshot-ai/kimi-code",
  },
];

const TOOL_VERSIONS_PATH = resolve(process.cwd(), ".tool-versions");

async function readPinnedVersions() {
  try {
    const content = await readFile(TOOL_VERSIONS_PATH, "utf8");
    const versions = {};
    for (const line of content.split("\n")) {
      const trimmed = line.replace(/#.*$/, "").trim();
      if (!trimmed) continue;
      const [name, version] = trimmed.split(/\s+/);
      if (name && version) versions[name] = version;
    }
    return versions;
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function fetchNpmLatest(packageName) {
  const encoded = encodeURIComponent(packageName);
  const res = await fetch(`https://registry.npmjs.org/${encoded}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
  const data = await res.json();
  return data["dist-tags"]?.latest;
}

async function fetchPypiLatest(packageName) {
  const res = await fetch(`https://pypi.org/pypi/${packageName}/json`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PyPI returned ${res.status}`);
  const data = await res.json();
  return data.info?.version;
}

async function getLatest(tool) {
  if (tool.source === "npm") return fetchNpmLatest(tool.packageName);
  if (tool.source === "pypi") return fetchPypiLatest(tool.packageName);
  throw new Error(`unknown source: ${tool.source}`);
}

function compareVersions(a, b) {
  const parse = (v) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const aa = parse(a);
  const bb = parse(b);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const diff = (aa[i] || 0) - (bb[i] || 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const writeMode = args.includes("--write");

  const pinned = await readPinnedVersions();
  const results = [];

  for (const tool of TOOLS) {
    const current = pinned[tool.name];
    let latest = null;
    let error = null;
    try {
      latest = await getLatest(tool);
    } catch (err) {
      error = err.message;
    }
    const outdated = latest && current ? compareVersions(latest, current) > 0 : false;
    results.push({
      name: tool.name,
      label: tool.label,
      packageName: tool.packageName,
      source: tool.source,
      current,
      latest,
      outdated,
      error,
    });
  }

  if (writeMode) {
    const lines = ["# Pinned tool versions for Klarpakke development environment", "# Updated automatically by scripts/update-tools.sh and .github/workflows/tool-updater.yml"];
    for (const r of results) {
      lines.push(`${r.name} ${r.latest || r.current || "unknown"}`);
    }
    await writeFile(TOOL_VERSIONS_PATH, lines.join("\n") + "\n", "utf8");
  }

  if (jsonMode) {
    console.log(JSON.stringify({ tools: results, hasUpdates: results.some((r) => r.outdated) }, null, 2));
  } else {
    for (const r of results) {
      if (r.error) {
        console.log(`❌ ${r.label}: feil ved sjekk – ${r.error}`);
      } else if (r.outdated) {
        console.log(`⬆️  ${r.label}: ${r.current} → ${r.latest}`);
      } else {
        console.log(`✅ ${r.label}: ${r.current || r.latest} (siste)`);
      }
    }
  }

  const hasError = results.some((r) => r.error);
  const hasUpdates = results.some((r) => r.outdated);

  if (hasError) process.exit(2);
  if (hasUpdates) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
