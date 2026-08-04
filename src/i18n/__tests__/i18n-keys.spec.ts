import { describe, it, expect } from "vitest";
import no from "../../../messages/no.json";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";

/**
 * i18n-keys.spec.ts — PROMPT #16 Del 0 (varig guard).
 *
 * Verifiserer at ALLE i18n-nøkler som koden refererer til faktisk
 * eksisterer i alle språkfiler. Dette er testen som ville fanget
 * /priser-regresjonen (pricingGrid vs meta.pricingGrid) FØR deploy.
 *
 * Kjøres obligatorisk i pre-commit (npm run test).
 */

type Messages = Record<string, unknown>;

function flattenKeys(obj: Messages, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Messages, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getNested(obj: Messages, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Messages)[part];
  }
  return current;
}

const locales: Record<string, Messages> = { no, en, zh };

describe("i18n key consistency", () => {
  const allKeys = flattenKeys(no);

  it("alle nøkler i no.json finnes i en.json", () => {
    const missing = allKeys.filter((k) => getNested(en, k) === undefined);
    expect(missing).toEqual([]);
  });

  it("alle nøkler i no.json finnes i zh.json", () => {
    const missing = allKeys.filter((k) => getNested(zh, k) === undefined);
    expect(missing).toEqual([]);
  });

  it("ingen nøkler i en.json mangler i no.json", () => {
    const enKeys = flattenKeys(en);
    const missing = enKeys.filter((k) => getNested(no, k) === undefined);
    expect(missing).toEqual([]);
  });

  // Kritiske namespaces som koden direkte refererer til
  const criticalNamespaces = [
    "meta.pricing",
    "meta.pricingGrid",
    "footer",
    "liveTicker",
    "trading.riskMetrics",
    "dashboard",
    "navigation",
  ];

  for (const ns of criticalNamespaces) {
    it(`kritisk namespace "${ns}" eksisterer i alle språk`, () => {
      for (const [locale, msgs] of Object.entries(locales)) {
        const value = getNested(msgs, ns);
        expect(
          value,
          `Namespace "${ns}" mangler i ${locale}.json`,
        ).toBeDefined();
        expect(
          typeof value,
          `Namespace "${ns}" i ${locale}.json er ikke et objekt`,
        ).toBe("object");
      }
    });
  }
});
