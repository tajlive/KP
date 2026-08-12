/**
 * linear-alerts.ts — Sentral Linear-alert-helper (Task 2A, 2026-08-12).
 *
 * Én gjenbrukbar helper som erstatter Trello-kort-posting for automatiske
 * varsler (Sentry-webhook, auto-rollback, synthetic-monitor osv.).
 * Løsrevet fra Linear MCP-serveren (scripts/mcp) — ren GraphQL-klient via
 * fetch, så den kan brukes i Next.js route-handlere (runtime nodejs).
 *
 * Designbeslutninger:
 * - IDEMPOTENT: dedup på stabil fingerprint-markør i issue-beskrivelsen
 *   (`linear-alert-fingerprint:<fp>`), IKKE løs tittelmatching. Samme
 *   fingerprint → samme issue gjenbrukes, ingen spam.
 * - FAIL-SAFE: postLinearAlert kaster aldri. Feil → { ok: false, error }.
 *   Alert-feil skal aldri krasje hovedsystemet.
 * - INGEN LINEAR_API_KEY i kode/config/commit: leses fra process.env ved kall.
 * - Linear-API-nøkkel brukes UTEN Bearer-prefiks (Linear-API-krav).
 * - Timeout 5 s (AbortSignal.timeout) — hengende API blokkerer ikke caller.
 * - redactForLog for secret-redaksjon i alt som logges av callere.
 *
 * Prioritet (Linear): 0 = ingen, 1 = urgent, 2 = high, 3 = medium, 4 = low.
 */

export const LINEAR_API_URL = "https://api.linear.app/graphql";
export const LINEAR_TEAM_KEY = "KLA";
export const FINGERPRINT_MARKER = "linear-alert-fingerprint:";

const TIMEOUT_MS = 5000;
const MAX_TITLE_LENGTH = 140;
const MAX_BODY_LENGTH = 4000;

export type LinearPriority = 0 | 1 | 2 | 3 | 4;

export interface LinearAlertInput {
  /** Varseltype, f.eks. "SENTRY", "AUTO-ROLLBACK", "SYNTHETIC". */
  kind: string;
  /** Kort emne for tittelen (f.eks. Sentry-tittel). */
  subject: string;
  /** Markdown-beskrivelse. */
  body: string;
  /** Stabil fingerprint (f.eks. "sentry:12345") — grunnlag for dedup. */
  fingerprint: string;
  /** Linear-prioritet: 1=urgent, 2=high, 3=medium, 4=low, 0=ingen. */
  priority?: LinearPriority;
  /** Label-navn som skal påføres (best-effort — ukjente droppes). */
  labels?: string[];
  /** Prosjektnavn i workspace (best-effort — ukjent droppes). */
  project?: string;
  /** Team-key. Default "KLA". */
  teamKey?: string;
}

export interface LinearAlertResult {
  ok: boolean;
  /** true = ny issue opprettet, false = eksisterende gjenbrukt. */
  created: boolean;
  /** Issue-identifikator (f.eks. "KLA-500") ved suksess. */
  identifier?: string;
  /** Issue-URL ved suksess. */
  url?: string;
  /** Fingerprint som ble brukt (audit/evidence). */
  fingerprint?: string;
  /** Redigert feilmelding ved feil. */
  error?: string;
}

/**
 * Redigerer token-mønstre før noe skrives til logg (defense-in-depth).
 * Samme mønstre som scripts/mcp/linear-helpers.ts.
 */
export function redactForLog(text: string): string {
  return text
    .replace(/lin_api_[A-Za-z0-9]{40,}/g, "[REDACTED]")
    .replace(/lin_vis_[A-Za-z0-9]+/g, "[REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, "[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(/\bhch-(at|rt)-[A-Za-z0-9]{20,}\b/g, "[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [REDACTED]");
}

function getLinearApiKey(): string | null {
  const key = process.env.LINEAR_API_KEY;
  if (!key) return null;
  return key.trim() || null;
}

interface GqlResult<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const key = getLinearApiKey();
  if (!key) throw new Error("LINEAR_API_KEY mangler");
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Leser IKKE body her — feilkropp kan i verste fall ekkoe input.
    throw new Error(`Linear API ${res.status}`);
  }
  const json = (await res.json()) as GqlResult<T>;
  if (json.errors) {
    const first = json.errors[0]?.message ?? "ukjent";
    throw new Error(
      `Linear GraphQL-feil: ${redactForLog(first).slice(0, 200)}`,
    );
  }
  return json.data as T;
}

interface IdNameNode {
  id: string;
  name?: string;
}

async function findTeamId(teamKey: string): Promise<string | null> {
  const data = await gql<{
    teams: { nodes: Array<{ id: string; key: string }> };
  }>(
    `query($k: String){ teams(filter: { key: { eq: $k } }, first: 1) { nodes { id key } } }`,
    { k: teamKey },
  );
  return data.teams.nodes[0]?.id ?? null;
}

/** Lister alle labels og matcher på navn (samme mønster som Linear MCP). */
async function findLabelIds(names: string[]): Promise<string[]> {
  const data = await gql<{ issueLabels: { nodes: IdNameNode[] } }>(
    `query { issueLabels { nodes { id name } } }`,
  );
  const byName = new Map(
    data.issueLabels.nodes
      .filter((n): n is Required<IdNameNode> => typeof n.name === "string")
      .map((n) => [n.name, n.id]),
  );
  return names.flatMap((n) => (byName.has(n) ? [byName.get(n) as string] : []));
}

/** Finner prosjekt-id på navn (samme mønster som Linear MCP). */
async function findProjectId(name: string): Promise<string | null> {
  const data = await gql<{ projects: { nodes: IdNameNode[] } }>(
    `query { projects { nodes { id name } } }`,
  );
  const hit = data.projects.nodes.find((p) => p.name === name);
  return hit ? hit.id : null;
}

interface ExistingIssue {
  id: string;
  identifier: string;
  url: string;
}

/** Dedup: finnes det allerede en issue med denne fingerprint-markøren i teamet? */
async function findExistingIssue(
  teamId: string,
  fingerprint: string,
): Promise<ExistingIssue | null> {
  const marker = `${FINGERPRINT_MARKER}${fingerprint}`;
  const data = await gql<{ issues: { nodes: ExistingIssue[] } }>(
    `query($t: ID!, $m: String){ issues(filter: { team: { id: { eq: $t } }, description: { contains: $m } }, first: 1) { nodes { id identifier url } } }`,
    { t: teamId, m: marker },
  );
  return data.issues.nodes[0] ?? null;
}

interface CreatedIssue {
  identifier: string;
  url: string;
}

async function createIssue(input: {
  teamId: string;
  title: string;
  description: string;
  priority: number;
  labelIds: string[];
  projectId: string | null;
}): Promise<CreatedIssue> {
  const data = await gql<{
    issueCreate: { success: boolean; issue: CreatedIssue };
  }>(
    `mutation($t: ID!, $ti: String!, $d: String!, $pr: Float, $l: [ID!], $p: ID){
       issueCreate(input: { teamId: $t, title: $ti, description: $d, priority: $pr, labelIds: $l, projectId: $p }) {
         success
         issue { identifier url }
       }
     }`,
    {
      t: input.teamId,
      ti: input.title,
      d: input.description,
      pr: input.priority || null,
      l: input.labelIds.length ? input.labelIds : null,
      p: input.projectId,
    },
  );
  if (!data.issueCreate.success || !data.issueCreate.issue) {
    throw new Error("issueCreate mislyktes");
  }
  return data.issueCreate.issue;
}

/**
 * Oppretter (eller gjenbruker) et Linear-alert-issue. Kaster aldri.
 *
 * Flyt: team → fingerprint-dedup → label/prosjekt-routing (best-effort) → opprett.
 * Returverdi er audit/evidence: created-flagg + identifier + url.
 */
export async function postLinearAlert(
  input: LinearAlertInput,
): Promise<LinearAlertResult> {
  const {
    kind,
    subject,
    body,
    fingerprint,
    priority = 0,
    labels = [],
    project,
    teamKey = LINEAR_TEAM_KEY,
  } = input;

  try {
    const teamId = await findTeamId(teamKey);
    if (!teamId)
      return {
        ok: false,
        created: false,
        fingerprint,
        error: `Team «${teamKey}» finnes ikke`,
      };

    // 1) Dedup på fingerprint — samme hendelse → samme issue.
    const existing = await findExistingIssue(teamId, fingerprint);
    if (existing) {
      return {
        ok: true,
        created: false,
        identifier: existing.identifier,
        url: existing.url,
        fingerprint,
      };
    }

    // 2) Routing (best-effort — manglende label/prosjekt skal ikke drepe alerten).
    const labelIds = labels.length ? await findLabelIds(labels) : [];
    const projectId = project ? await findProjectId(project) : null;

    // 3) Opprett med fingerprint-markør i beskrivelsen (dedup-grunnlag for fremtiden).
    const title = `🚨 ${kind}: ${subject}`.slice(0, MAX_TITLE_LENGTH);
    const description = `${body.slice(0, MAX_BODY_LENGTH)}\n\n(${FINGERPRINT_MARKER}${fingerprint})`;
    const created = await createIssue({
      teamId,
      title,
      description,
      priority,
      labelIds,
      projectId,
    });

    return {
      ok: true,
      created: true,
      identifier: created.identifier,
      url: created.url,
      fingerprint,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      created: false,
      fingerprint,
      error: redactForLog(message),
    };
  }
}
