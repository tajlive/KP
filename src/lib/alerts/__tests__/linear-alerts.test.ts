/**
 * Unit-tester for Linear-alert-helperen (Task 2A).
 * Mock-er global fetch — ingen nettverkskall.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  postLinearAlert,
  redactForLog,
  LINEAR_TEAM_KEY,
} from "../linear-alerts";

const FAKE_KEY = "lin_api_test_" + "x".repeat(40);

function jsonOk(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}
function jsonFail(status: number) {
  return { ok: false, status, json: async () => ({}) };
}

type Handler = (query: string, variables: Record<string, unknown>) => unknown;

function stubLinear(handler: Handler) {
  const fetchMock = vi.fn(async (_url: unknown, init: RequestInit) => {
    const parsed = JSON.parse(String(init?.body)) as {
      query: string;
      variables?: Record<string, unknown>;
    };
    return jsonOk({
      data: handler(String(parsed.query), parsed.variables ?? {}),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Standard workspace: team KLA, incident-label, RTS-prosjekt, tom issues-søk. */
const WORKSPACE: Handler = (query) => {
  if (query.includes("teams("))
    return { teams: { nodes: [{ id: "team-kla", key: LINEAR_TEAM_KEY }] } };
  if (query.includes("issueLabels"))
    return {
      issueLabels: {
        nodes: [
          { id: "lbl-incident", name: "incident" },
          { id: "lbl-p0", name: "p0" },
        ],
      },
    };
  if (query.includes("projects"))
    return {
      projects: {
        nodes: [{ id: "proj-rts", name: "Reliability & Trading Safety" }],
      },
    };
  if (query.includes("issues(")) return { issues: { nodes: [] } };
  if (query.includes("issueCreate"))
    return {
      issueCreate: {
        success: true,
        issue: {
          identifier: "KLA-500",
          url: "https://linear.app/klarpakke/issue/KLA-500",
        },
      },
    };
  throw new Error(`ukjent query: ${query.slice(0, 60)}`);
};

beforeEach(() => {
  vi.stubEnv("LINEAR_API_KEY", FAKE_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("postLinearAlert", () => {
  it("mangler LINEAR_API_KEY → fail-safe uten fetch-kall", async () => {
    vi.stubEnv("LINEAR_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "Krasj",
      body: "Detaljer",
      fingerprint: "sentry:1",
    });

    expect(result).toMatchObject({ ok: false, created: false });
    expect(result.error).toContain("mangler");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("oppretter issue med korrekte felt (team, label, prosjekt, prioritet, marker)", async () => {
    const fetchMock = stubLinear(WORKSPACE);

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "Krasj i dashboard",
      body: "Detaljert beskrivelse",
      fingerprint: "sentry:123",
      priority: 2,
      labels: ["incident"],
      project: "Reliability & Trading Safety",
    });

    expect(result.ok).toBe(true);
    expect(result.created).toBe(true);
    expect(result.identifier).toBe("KLA-500");
    expect(result.url).toContain("linear.app");

    // Finn issueCreate-kallet og valider variablene
    const createCall = fetchMock.mock.calls.find(([, init]) =>
      String((init as RequestInit).body).includes("issueCreate"),
    );
    expect(createCall).toBeDefined();
    const variables = JSON.parse(String((createCall?.[1] as RequestInit).body))
      .variables as Record<string, unknown>;
    expect(variables.t).toBe("team-kla");
    expect(variables.ti).toBe("🚨 SENTRY: Krasj i dashboard");
    expect(variables.pr).toBe(2);
    expect(variables.l).toEqual(["lbl-incident"]);
    expect(variables.p).toBe("proj-rts");
    expect(String(variables.d)).toContain(
      "(linear-alert-fingerprint:sentry:123)",
    );
  });

  it("dedup: samme fingerprint → gjenbruker eksisterende issue, ingen issueCreate", async () => {
    const fetchMock = stubLinear((query) => {
      if (query.includes("issues("))
        return {
          issues: {
            nodes: [
              {
                id: "iss-old",
                identifier: "KLA-42",
                url: "https://linear.app/klarpakke/issue/KLA-42",
              },
            ],
          },
        };
      return WORKSPACE(query, {});
    });

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "Krasj i dashboard",
      body: "Detaljer",
      fingerprint: "sentry:123",
      labels: ["incident"],
    });

    expect(result.ok).toBe(true);
    expect(result.created).toBe(false);
    expect(result.identifier).toBe("KLA-42");

    const createCalls = fetchMock.mock.calls.filter(([, init]) =>
      String((init as RequestInit).body).includes("issueCreate"),
    );
    expect(createCalls).toHaveLength(0);
  });

  it("Linear API-feil (500) → ok:false, kaster ikke", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonFail(500)),
    );

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "X",
      body: "Y",
      fingerprint: "sentry:9",
    });

    expect(result.ok).toBe(false);
    expect(result.created).toBe(false);
    expect(result.error).toContain("Linear API 500");
  });

  it("nettverksfeil (fetch kaster) → ok:false, kaster ikke", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "X",
      body: "Y",
      fingerprint: "sentry:10",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("ukjent label/prosjekt → best-effort: oppretter uten (ingen krasj)", async () => {
    stubLinear((query) => {
      if (query.includes("issueLabels"))
        return { issueLabels: { nodes: [{ id: "lbl-x", name: "annet" }] } };
      if (query.includes("projects"))
        return { projects: { nodes: [{ id: "p-x", name: "Annet prosjekt" }] } };
      return WORKSPACE(query, {});
    });

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "X",
      body: "Y",
      fingerprint: "sentry:11",
      labels: ["finnes-ikke"],
      project: "Finnes ikke",
    });

    expect(result.ok).toBe(true);
    expect(result.created).toBe(true);
  });

  it("team som ikke finnes → ok:false med forklaring", async () => {
    stubLinear((query) => {
      if (query.includes("teams(")) return { teams: { nodes: [] } };
      return WORKSPACE(query, {});
    });

    const result = await postLinearAlert({
      kind: "SENTRY",
      subject: "X",
      body: "Y",
      fingerprint: "sentry:12",
      teamKey: "FINNES_IKKE",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("FINNES_IKKE");
  });
});

describe("redactForLog", () => {
  it("redigerer lin_api_-nøkler og Bearer-tokens", () => {
    const secret = "lin_api_" + "A".repeat(48);
    const bearer = `Bearer ${"b".repeat(30)}`;
    const out = redactForLog(`feil med ${secret} og ${bearer}`);
    expect(out).not.toContain("A".repeat(48));
    expect(out).not.toContain("b".repeat(30));
    expect(out).toContain("[REDACTED]");
  });

  it("lar vanlig tekst stå urørt", () => {
    expect(redactForLog("Linear API 500")).toBe("Linear API 500");
  });
});
