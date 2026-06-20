#!/usr/bin/env node
/**
 * 📝 Minimal .env file parser/writer.
 *
 * This parser intentionally does NOT handle shell quoting, variable
 * expansion, or command substitution. It reads simple KEY=VALUE lines and
 * preserves comments/blank lines.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, chmodSync } from "fs";
import { dirname } from "path";

/**
 * Parse a .env-style file.
 * @param {string} path
 * @returns {Array<{key?: string, value?: string, comment?: string, raw: string}>}
 */
export function parseEnvFile(path) {
  if (!existsSync(path)) {
    return [];
  }

  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  const entries = [];

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      entries.push({ comment: raw, raw });
      continue;
    }

    const eqIndex = raw.indexOf("=");
    if (eqIndex === -1) {
      // Line without '=' — preserve as a comment-like line
      entries.push({ comment: raw, raw });
      continue;
    }

    const key = raw.slice(0, eqIndex).trim();
    const value = raw.slice(eqIndex + 1); // keep raw value, do not unquote
    entries.push({ key, value, raw });
  }

  return entries;
}

/**
 * Build a .env-style string from parsed entries.
 * @param {Array<{key?: string, value?: string, comment?: string}>} entries
 * @returns {string}
 */
export function formatEnvFile(entries) {
  const lines = [];

  for (const entry of entries) {
    if (entry.key !== undefined) {
      lines.push(`${entry.key}=${entry.value}`);
    } else if (entry.comment !== undefined) {
      lines.push(entry.comment);
    }
  }

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

/**
 * Write entries to a .env-style file, creating parent directories if needed.
 * Sets file permissions to 0o600.
 * @param {string} path
 * @param {Array<{key?: string, value?: string, comment?: string}>} entries
 */
export function writeEnvFile(path, entries) {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp.${process.pid}`;
  writeFileSync(tmpPath, formatEnvFile(entries), "utf8");
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, path);
  chmodSync(path, 0o600);
}
