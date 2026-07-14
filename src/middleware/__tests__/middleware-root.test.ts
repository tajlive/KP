/**
 * Verifiserer at Next.js root middleware.ts eksisterer.
 *
 * Uten denne filen kjorer ingen av src/middleware/*.ts-funksjonene,
 * inkludert auth, i18n, CSP, rate-limit og cache-control.
 *
 * Importerer ikke modulen direkte (krever Next.js server runtime),
 * men verifiserer filstruktur og exports via regex.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIDDLEWARE_PATH = path.resolve(__dirname, "../../../src/middleware.ts");

describe("src/middleware.ts", () => {
  it("finnes pa rotniva (kreves av Next.js)", () => {
    const exists = fs.existsSync(MIDDLEWARE_PATH);
    expect(exists, `Forventet ${MIDDLEWARE_PATH} a eksistere`).toBe(true);
  });

  it("eksporterer default function (chain)", () => {
    const content = fs.readFileSync(MIDDLEWARE_PATH, "utf-8");
    expect(content).toMatch(/export\s+default/i);
    // Skal inneholde chain()-komposisjon
    expect(content).toContain("chain(");
    expect(content).toContain("i18nMiddleware");
    expect(content).toContain("authMiddleware");
    expect(content).toContain("rateLimitMiddleware");
    expect(content).toContain("cspMiddleware");
    expect(content).toContain("cacheControlMiddleware");
  });

  it("har config.matcher med riktig regex", () => {
    const content = fs.readFileSync(MIDDLEWARE_PATH, "utf-8");
    expect(content).toContain("matcher");
    expect(content).toContain("_next/static"); // Skip static files
  });
});
