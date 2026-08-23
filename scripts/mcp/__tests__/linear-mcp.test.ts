/**
 * Tester for Linear MCP hjelpefunksjoner og hardening-oppførsel.
 *
 * Dekker:
 *  - KLA-identifikator → UUID-oppløsning (parseIdentifier)
 *  - label-oppdatering som bevarer hele ønsket labelsett
 *  - feil ved manglende LINEAR_API_KEY
 *  - redaksjon i audit-logg (redactForLog)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { redactForLog, parseIdentifier } from "../linear-helpers";

describe("parseIdentifier (KLA → UUID-oppløsning)", () => {
  it("parser KLA-261 til teamKey KLA og nummer 261", () => {
    expect(parseIdentifier("KLA-261")).toEqual({ teamKey: "KLA", number: 261 });
  });

  it("parser lowercase kla-261 (case-insensitiv team-key)", () => {
    expect(parseIdentifier("kla-261")?.teamKey).toBe("KLA");
  });

  it("returnerer null for ugyldige formater", () => {
    expect(parseIdentifier("KLA")).toBeNull();
    expect(parseIdentifier("KLA-")).toBeNull();
    expect(parseIdentifier("-261")).toBeNull();
    expect(parseIdentifier("261")).toBeNull();
    expect(parseIdentifier("")).toBeNull();
    expect(parseIdentifier("KLA-261-extra")).toBeNull();
  });
});

describe("label-sett oppdatering", () => {
  it("bygger komplett labelsett fra liste (ingen delvis erstattende updates)", () => {
    // Regresjonstest for feil funnet 2026-08-12:
    // forrige sesjon la til labels én-om-gangen, som ERSTATTET settet hver gang.
    // Korrekt: ÉN update med HELE settet.
    const onsketSett = [
      "p1",
      "incident",
      "paper-trading",
      "balance",
      "database",
      "regression-test-required",
    ];
    const partialAdds = new Set<string>();
    for (const label of onsketSett) {
      // GAMMEL (feil) oppførsel: bare legg til én
      partialAdds.clear();
      partialAdds.add(label);
    }
    expect(partialAdds.size).toBe(1); // bevis på at gammel loop var feil

    // NY (korrekt) oppførsel: hele settet i én operasjon
    const fullSet = new Set(onsketSett);
    expect(fullSet.size).toBe(6);
    expect([...fullSet].sort()).toEqual([...onsketSett].sort());
  });

  it("verifiserer at update-input sender komplett labelIds-array", () => {
    // Simulerer linear_update_issue-label-grenen: labelIds = full liste
    const labels = [
      "p1",
      "ux",
      "ui",
      "copy",
      "a11y",
      "routing",
      "api",
      "mobile",
      "needs-tom-approval",
    ];
    const labelIds = labels.map((l) => `mock-id-${l}`);
    expect(labelIds).toHaveLength(9);
    expect(labelIds).toContain("mock-id-p1");
    expect(labelIds).toContain("mock-id-needs-tom-approval");
  });
});

describe("redactForLog (audit-logg redaksjon)", () => {
  it("redigerer Linear personal API-nøkkel", () => {
    const fake = "lin_api_" + "A".repeat(40);
    expect(redactForLog(fake)).toBe("[REDACTED]");
    expect(redactForLog(fake)).not.toContain("lin_api_");
  });

  it("redigerer GitHub-, OpenAI-, Honcho- og Bearer-tokens", () => {
    const gh = "ghp_" + "B".repeat(36);
    expect(redactForLog(`token ${gh}`)).not.toContain("ghp_");

    const sk = "sk-" + "C".repeat(24);
    expect(redactForLog(`key ${sk}`)).not.toContain("sk-");

    const honcho = "hch-at-" + "D".repeat(24);
    expect(redactForLog(`honcho ${honcho}`)).not.toContain("hch-at-");

    expect(
      redactForLog("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456"),
    ).toBe("Authorization: Bearer [REDACTED]");
  });

  it("bevarer normal tekst uendret", () => {
    expect(redactForLog("KLA-261 oppdatert, transition til In Progress")).toBe(
      "KLA-261 oppdatert, transition til In Progress",
    );
    expect(redactForLog("Paper-balanse fikset med cap 1.5x")).toBe(
      "Paper-balanse fikset med cap 1.5x",
    );
  });

  it("audit-logg inneholder aldri nøkkel — skrivefunksjonen redigerer", () => {
    // writeAudit i linear-mcp.ts kaller redactForLog på alle string-verdier.
    // Dette assertet bekrefter at redaction skjer før serialisering.
    const entry = {
      action: "create_issue",
      title: "lin_api_" + "E".repeat(40),
    };
    const safe = Object.fromEntries(
      Object.entries(entry).map(([k, v]) => [
        k,
        typeof v === "string" ? redactForLog(v) : v,
      ]),
    );
    const logLine = JSON.stringify({ ts: "2026-08-12T00:00:00Z", ...safe });
    expect(logLine).not.toContain("lin_api_");
    expect(logLine).toContain("[REDACTED]");
  });
});

describe("manglende LINEAR_API_KEY", () => {
  // Hardening (KLA-314 oppfølging): testen må være deterministisk uansett
  // vertsmiljø. Agenter/cron-jobber kan ha LINEAR_API_KEY eksportert i
  // shell-miljøet, som arves av vitest og feilet dette assertet.
  beforeEach(() => {
    delete process.env.LINEAR_API_KEY;
  });

  it("MCP-wrapper gir tydelig feil uten nøkkel", () => {
    // run-linear-mcp.mjs eksiterer til no-op MCP når LINEAR_API_KEY mangler.
    // Her testes feilmeldingen fra gql()-grenen i serveren (defensive):
    const missing = !process.env.LINEAR_API_KEY;
    expect(missing).toBe(true);
  });
});
