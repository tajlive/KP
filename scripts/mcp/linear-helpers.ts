/**
 * Hjelpefunksjoner for Linear MCP — pure funksjoner, testbare uten server.
 * (2026-08-12: security/reliability-hardening)
 */

/** Redigerer token-mønstre før noe skrives til logg (defense-in-depth). */
export function redactForLog(text: string): string {
  return text
    .replace(/lin_api_[A-Za-z0-9]{40,}/g, "[REDACTED]")
    .replace(/lin_vis_[A-Za-z0-9]+/g, "[REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, "[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(/\bhch-(at|rt)-[A-Za-z0-9-]{20,}\b/g, "[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [REDACTED]");
}

export interface ParsedIdentifier {
  teamKey: string;
  number: number;
}

/** Parser "KLA-261" → { teamKey: "KLA", number: 261 } (eller null ved ugyldig format). */
export function parseIdentifier(identifier: string): ParsedIdentifier | null {
  const m = identifier.match(/^([A-Z]+)-(\d+)$/i);
  if (!m) return null;
  return { teamKey: m[1].toUpperCase(), number: parseInt(m[2], 10) };
}

/** Bygger issue-filter for identifikator-oppslag (brukes av resolveIssueId). */
export function buildIdentifierFilter(identifier: string): { teamKey: string; number: number } | null {
  return parseIdentifier(identifier);
}
