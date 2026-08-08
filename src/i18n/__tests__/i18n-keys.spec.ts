import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
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
    "trading.cockpit",
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

  /**
   * Kildekode-audit: alle nøkler koden kaller via t()/useTranslations MÅ finnes
   * i no.json. Nøkler er relative til filens useTranslations("ns")-namespace.
   * Fanger regresjoner der en nøkkel mangler i ALLE språk likt (paritetstesten
   * over er blind for det — den sammenligner kun språk seg imellom). Dette er
   * testen som ville fanget trading.cockpit.trades.dateRange / .status /
   * .titleCount (2026-08-08: vist som rå nøkkelstier i prod).
   */
  it("alle t()-nøkler i src/ finnes i no.json", () => {
    const SRC = resolve(process.cwd(), "src");
    const files = new Set<string>();

    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skann ikke testfiler (assertion-tekster er støy) eller byggmapper
          if (
            !["node_modules", ".next", "__tests__", "__mocks__"].includes(
              entry.name,
            )
          ) {
            walk(full);
          }
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.add(full);
        }
      }
    }
    walk(SRC);

    const missing = new Set<string>();

    for (const file of files) {
      const src = readFileSync(file, "utf8");

      // Namespaces filen bruker: useTranslations("x") / getTranslations("x")
      const namespaces = new Set<string>();
      const nsRe = /(?:useTranslations|getTranslations)\(\s*["']([^"']+)["']\s*\)/g;
      let nm: RegExpExecArray | null;
      while ((nm = nsRe.exec(src)) !== null) namespaces.add(nm[1]);
      if (namespaces.size === 0) continue; // ingen i18n her

      // Statiske nøkler: t("ns.key") / t('ns.key') — word boundary unngår
      // it( / format( / import( osv.
      const staticRe = /\bt\(\s*["']([^"']+)["']/g;
      let m: RegExpExecArray | null;
      while ((m = staticRe.exec(src)) !== null) {
        const key = m[1];
        // Støyfilter: må ligne en i18n-nøkkel
        if (!key.includes(".")) continue; // ikke namespace-form
        if (/^[./@$0-9]/.test(key)) continue; // sti/url/verdi
        if (/\s/.test(key)) continue; // naturlig språk / testnavn
        if (key.includes("://")) continue; // url
        if (key.startsWith("ns.")) continue; // dokumentasjonseksempel
        // Finnes nøkkelen under noen av filens namespaces (+ rot)?
        const found = [...namespaces].some(
          (ns) =>
            getNested(no, `${ns}.${key}`) !== undefined ||
            getNested(no, key) !== undefined,
        );
        if (!found) missing.add(`${file.split("/").slice(-2).join("/")}: ${key}`);
      }

      // Template-prefikser: t(`ns.${x}.y`) → verifiser prefikset før første ${}
      const tmplRe = /\bt\(`([^`]+)`/g;
      while ((m = tmplRe.exec(src)) !== null) {
        const prefix = m[1].split("${")[0].replace(/\.$/, "");
        if (!prefix.includes(".")) continue;
        const found = [...namespaces].some(
          (ns) =>
            getNested(no, `${ns}.${prefix}`) !== undefined ||
            getNested(no, prefix) !== undefined,
        );
        if (!found) missing.add(`${file.split("/").slice(-2).join("/")}: ${prefix}…`);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });
});
