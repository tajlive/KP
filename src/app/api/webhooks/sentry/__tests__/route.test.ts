/**
 * Regresjonstester for Sentry-webhook → Linear (Task 2B).
 * Mock-er global fetch — ingen nettverkskall mot Linear eller Sentry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { POST } from "../route";

const SECRET = "test-sentry-secret";
const FAKE_LINEAR_KEY = "test-linear-key";

function hmac(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

function makeRequest(
  payload: unknown,
  opts: { signature?: string | null; resource?: string } = {},
): Request {
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.signature !== null) {
    headers["sentry-hook-signature"] = opts.signature ?? hmac(raw);
  }
  if (opts.resource) headers["sentry-hook-resource"] = opts.resource;
  return new Request("https://klarpakke.no/api/webhooks/sentry", {
    method: "POST",
    body: raw,
    headers,
  });
}

const eventPayload = {
  data: {
    event: {
      event_id: "e2",
      title: "TypeError i Dashboard",
      level: "error",
      culprit: "src/components/dashboard.tsx",
      web_url: "https://klarpakke.sentry.io/e2",
    },
  },
};

const issuePayload = {
  data: {
    issue: {
      id: "10001",
      title: "Krasj i BestemorPanel",
      level: "fatal",
      culprit: "src/foo.ts",
      web_url: "https://klarpakke.sentry.io/i1",
    },
  },
};

interface StubOptions {
  /** Eksisterende issue å returnere fra dedup-søk (null = ingen). */
  existing?: { identifier: string; url: string } | null;
  /** Linear svarer 500 på alt. */
  fail?: boolean;
  /** Fetch kaster (nettverksfeil) med denne meldingen. */
  rejectWith?: string;
  /** Antall issueCreate-kall som allerede er gjort (stateful gjenbruk). */
  mutationCount?: { value: number };
}

function stubLinearApi(opts: StubOptions = {}) {
  const mutations: Array<Record<string, unknown>> = [];
  const fetchMock = vi.fn(async (_url: unknown, init: RequestInit) => {
    const { query, variables } = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    if (opts.rejectWith) throw new Error(opts.rejectWith);
    if (opts.fail) return { ok: false, status: 500, json: async () => ({}) };
    if (query.includes("teams("))
      return {
        ok: true,
        json: async () => ({
          data: { teams: { nodes: [{ id: "team-kla" }] } },
        }),
      };
    if (query.includes("issueLabels"))
      return {
        ok: true,
        json: async () => ({
          data: {
            issueLabels: { nodes: [{ id: "lbl-incident", name: "incident" }] },
          },
        }),
      };
    if (query.includes("projects"))
      return {
        ok: true,
        json: async () => ({
          data: {
            projects: {
              nodes: [{ id: "proj-rts", name: "Reliability & Trading Safety" }],
            },
          },
        }),
      };
    if (query.includes("issues(")) {
      const existing =
        opts.mutationCount && opts.mutationCount.value > 0
          ? [
              {
                id: "iss-1",
                identifier: "KLA-600",
                url: "https://linear.app/klarpakke/issue/KLA-600",
              },
            ]
          : opts.existing
            ? [{ id: "iss-1", ...opts.existing }]
            : [];
      return {
        ok: true,
        json: async () => ({ data: { issues: { nodes: existing } } }),
      };
    }
    if (query.includes("issueCreate")) {
      if (opts.mutationCount) opts.mutationCount.value += 1;
      mutations.push(variables);
      return {
        ok: true,
        json: async () => ({
          data: {
            issueCreate: {
              success: true,
              issue: {
                identifier: "KLA-600",
                url: "https://linear.app/klarpakke/issue/KLA-600",
              },
            },
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ data: {} }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, mutations };
}

beforeEach(() => {
  vi.stubEnv("SENTRY_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("LINEAR_API_KEY", FAKE_LINEAR_KEY);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Sentry webhook → Linear", () => {
  it("gyldig Sentry-event → oppretter Linear incident (ruting + prioritet + fingerprint)", async () => {
    const { mutations } = stubLinearApi();

    const res = await POST(
      makeRequest(eventPayload, { resource: "event_alert" }),
    );
    const body = (await res.json()) as {
      ok: boolean;
      linear: { ok: boolean; created: boolean; identifier?: string };
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.linear.ok).toBe(true);
    expect(body.linear.created).toBe(true);
    expect(body.linear.identifier).toBe("KLA-600");

    expect(mutations).toHaveLength(1);
    const vars = mutations[0];
    expect(vars.pr).toBe(2); // error → high
    expect(vars.l).toEqual(["lbl-incident"]);
    expect(vars.p).toBe("proj-rts");
    expect(String(vars.d)).toContain(
      "(linear-alert-fingerprint:sentry:event:e2)",
    );
  });

  it("issue-payload med level fatal → prioritet urgent (1) + fingerprint på issue.id", async () => {
    const { mutations } = stubLinearApi();

    await POST(makeRequest(issuePayload, { resource: "issue" }));

    expect(mutations).toHaveLength(1);
    expect(mutations[0].pr).toBe(1); // fatal → urgent
    expect(String(mutations[0].d)).toContain(
      "(linear-alert-fingerprint:sentry:10001)",
    );
  });

  it("samme hendelse gjentatt → gjenbruker issue, ingen issue-spam", async () => {
    const counter = { value: 0 };
    const { mutations } = stubLinearApi({ mutationCount: counter });

    const first = await POST(
      makeRequest(eventPayload, { resource: "event_alert" }),
    );
    const firstBody = (await first.json()) as { linear: { created: boolean } };
    expect(firstBody.linear.created).toBe(true);

    const second = await POST(
      makeRequest(eventPayload, { resource: "event_alert" }),
    );
    const secondBody = (await second.json()) as {
      linear: { created: boolean; identifier?: string };
    };
    expect(secondBody.linear.created).toBe(false);
    expect(secondBody.linear.identifier).toBe("KLA-600");

    expect(mutations).toHaveLength(1); // kun det første kallet opprettet
  });

  it("ugyldig signatur → 401 og INGEN Linear-write", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeRequest(eventPayload, {
        signature: "ugyldig",
        resource: "event_alert",
      }),
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Linear utilgjengelig → 200 med kontrollert feil (ingen krasj, ingen retry-storm)", async () => {
    stubLinearApi({ fail: true });

    const res = await POST(
      makeRequest(eventPayload, { resource: "event_alert" }),
    );
    const body = (await res.json()) as {
      ok: boolean;
      linear: { ok: boolean; error?: string };
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.linear.ok).toBe(false);
    expect(body.linear.error).toContain("Linear API 500");
  });

  it("secrets/tokens havner ikke i logs (redaksjon)", async () => {
    const rawSecret = `lin_api_${"A".repeat(48)}`;
    stubLinearApi({ rejectWith: `nettverksfeil: ${rawSecret}` });

    const res = await POST(
      makeRequest(eventPayload, { resource: "event_alert" }),
    );
    const body = (await res.json()) as { linear: { error?: string } };

    expect(res.status).toBe(200);
    expect(body.linear.error).not.toContain("A".repeat(48));
    expect(body.linear.error).toContain("[REDACTED]");

    const errorArgs = (
      console.error as unknown as ReturnType<typeof vi.fn>
    ).mock.calls
      .flat()
      .join(" ");
    expect(errorArgs).not.toContain("A".repeat(48));
    expect(errorArgs).toContain("[REDACTED]");
  });

  it("bevarer skip-semantikk for irrelevant resource", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(makeRequest({}, { resource: "comment" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: "comment" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
