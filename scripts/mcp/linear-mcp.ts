#!/usr/bin/env node
/**
 * Linear MCP — lokal MCP-server for Klarpakke Linear workspace.
 *
 * - GraphQL mot https://api.linear.app/graphql
 * - Laster LINEAR_API_KEY fra .env.local (via run-linear-mcp.mjs wrapper) eller prosessmiljø
 * - stdio-transport
 * - Audit-logg over write-handlinger til logs/linear-mcp-audit.log (uten secrets)
 *
 * Bygg:   node scripts/mcp/build-linear.mjs
 * Start:  node scripts/mcp/dist/linear-mcp.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { appendFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { redactForLog, parseIdentifier } from "./linear-helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const API_URL = "https://api.linear.app/graphql";

// ── AUDIT-LOGG ────────────────────────────────────────────────────────────────

function writeAudit(entry: Record<string, unknown>) {
  try {
    const logDir = resolve(REPO_ROOT, "logs");
    mkdirSync(logDir, { recursive: true });
    const safe = Object.fromEntries(
      Object.entries(entry).map(([k, v]) => [k, typeof v === "string" ? redactForLog(v) : v]),
    );
    appendFileSync(
      resolve(logDir, "linear-mcp-audit.log"),
      JSON.stringify({ ts: new Date().toISOString(), ...safe }) + "\n",
    );
  } catch {
    // logging skal aldri knekke verktøykall
  }
}

// ── GRAPHQL ───────────────────────────────────────────────────────────────────

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY mangler — start via run-linear-mcp.mjs (laster .env.local)");
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as any;
  if (!res.ok || json.errors) {
    const msg = json.errors?.map((e: any) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Linear API-feil: ${msg}`);
  }
  return json.data;
}

// ── HENTE HJELPERE ────────────────────────────────────────────────────────────

/** Resolver "KLA-261" → team-key + nummer → issue UUID */
async function resolveIssueId(identifier: string): Promise<string> {
  const parsed = parseIdentifier(identifier);
  if (!parsed) throw new Error(`Ugyldig identifikator: ${identifier} (forventet f.eks. KLA-261)`);
  const data = await gql(
    `query($k: String!, $n: Float!){ issues(filter: { team: { key: { eq: $k } }, number: { eq: $n } }) { nodes { id identifier } } }`,
    { k: parsed.teamKey, n: parsed.number },
  );
  const hit = data.issues.nodes[0];
  if (!hit) throw new Error(`Issue ${identifier} finnes ikke`);
  return hit.id;
}

async function findLabelId(name: string): Promise<string | null> {
  const data = await gql("{ issueLabels { nodes { id name } } }");
  const hit = data.issueLabels.nodes.find((l: any) => l.name === name);
  return hit ? hit.id : null;
}

async function findProjectId(name: string): Promise<string | null> {
  const data = await gql("{ projects { nodes { id name } } }");
  const hit = data.projects.nodes.find((p: any) => p.name === name);
  return hit ? hit.id : null;
}

async function findTeamId(name = "Klarpakke"): Promise<string | null> {
  const data = await gql("{ teams { nodes { id name key } } }");
  const hit = data.teams.nodes.find((t: any) => t.name === name);
  return hit ? hit.id : null;
}

// ── SERVER ─────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "linear-hermes", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: "linear_viewer",
    description: "Hent innlogget Linear-bruker (id, navn, email).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "linear_teams",
    description: "List alle teams (id, navn, key).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "linear_workflows",
    description: "List alle workflows og deres states.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "linear_labels",
    description: "List alle issue-labels (id, navn).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "linear_projects",
    description: "List alle prosjekter (id, navn, state).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "linear_search_issues",
    description: "Søk issues etter tittel/identifikator.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Søketekst" },
        limit: { type: "number", default: 10 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_get_issue",
    description: "Hent én issue med detaljer (id, tittel, status, labels, project, beskrivelse).",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "f.eks. KLA-261" },
      },
      required: ["identifier"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_create_team",
    description: "Opprett team.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_create_project",
    description: "Opprett prosjekt i Klarpakke-teamet.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        state: { type: "string", default: "planned" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_create_label",
    description: "Opprett label i Klarpakke-teamet.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_create_issue",
    description: "Opprett issue i Klarpakke-teamet.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        project: { type: "string", description: "Prosjektnavn" },
        labels: { type: "array", items: { type: "string" }, description: "Labelnavn" },
        priority: { type: "number", description: "0-4 (4=urgent)" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_update_issue",
    description: "Oppdater issue (tittel, beskrivelse, priority, labels).",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "f.eks. KLA-261" },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "number" },
        labels: { type: "array", items: { type: "string" } },
      },
      required: ["identifier"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_add_comment",
    description: "Legg til kommentar på issue.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "f.eks. KLA-261" },
        body: { type: "string" },
      },
      required: ["identifier", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_transition_issue",
    description: "Flytt issue til en workflow-state (f.eks. 'In Progress', 'Done').",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "f.eks. KLA-261" },
        state: { type: "string" },
      },
      required: ["identifier", "state"],
      additionalProperties: false,
    },
  },
  {
    name: "linear_archive_issue",
    description: "Arkiver issue.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "f.eks. KLA-261" },
      },
      required: ["identifier"],
      additionalProperties: false,
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "linear_viewer": {
        const data = await gql("{ viewer { id name email } }");
        return { content: [{ type: "text", text: JSON.stringify(data.viewer) }] };
      }

      case "linear_teams": {
        const data = await gql("{ teams { nodes { id name key } } }");
        return { content: [{ type: "text", text: JSON.stringify(data.teams.nodes) }] };
      }

      case "linear_workflows": {
        const data = await gql("{ workflows { nodes { id name states { nodes { id name type } } } } }");
        return { content: [{ type: "text", text: JSON.stringify(data.workflows.nodes) }] };
      }

      case "linear_labels": {
        const data = await gql("{ issueLabels { nodes { id name } } }");
        return { content: [{ type: "text", text: JSON.stringify(data.issueLabels.nodes) }] };
      }

      case "linear_projects": {
        const data = await gql("{ projects { nodes { id name state } } }");
        return { content: [{ type: "text", text: JSON.stringify(data.projects.nodes) }] };
      }

      case "linear_search_issues": {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        const data = await gql(
          `query($q: String!, $l: Int!){ issues(filter: { title: { containsIgnoreCase: $q } }, first: $l) { nodes { id identifier title state { name } } } }`,
          { q: query, l: limit },
        );
        return { content: [{ type: "text", text: JSON.stringify(data.issues.nodes) }] };
      }

      case "linear_get_issue": {
        const { identifier } = args as { identifier: string };
        const issueId = await resolveIssueId(identifier);
        const data = await gql(
          `query($id: String!){ issue(id: $id) { id identifier title description state { name } labels { nodes { name } } project { name } url } }`,
          { id: issueId },
        );
        if (!data.issue) throw new Error(`Issue ${identifier} finnes ikke`);
        return { content: [{ type: "text", text: JSON.stringify(data.issue) }] };
      }

      case "linear_create_team": {
        const { name, description = "" } = args as { name: string; description?: string };
        const data = await gql(
          `mutation($n: String!, $d: String!){ teamCreate(input: { name: $n, description: $d }) { success team { id name key } } }`,
          { n: name, d: description },
        );
        writeAudit({ action: "create_team", name });
        return { content: [{ type: "text", text: JSON.stringify(data.teamCreate) }] };
      }

      case "linear_create_project": {
        const { name, description = "", state = "planned" } = args as {
          name: string;
          description?: string;
          state?: string;
        };
        const teamId = await findTeamId();
        if (!teamId) throw new Error("Klarpakke-team finnes ikke — opprett det først");
        const data = await gql(
          `mutation($n: String!, $d: String!, $t: String!, $s: String!){ projectCreate(input: { name: $n, description: $d, teamIds: [$t], state: $s }) { success project { id name url } } }`,
          { n: name, d: description, t: teamId, s: state },
        );
        writeAudit({ action: "create_project", name });
        return { content: [{ type: "text", text: JSON.stringify(data.projectCreate) }] };
      }

      case "linear_create_label": {
        const { name } = args as { name: string };
        const teamId = await findTeamId();
        if (!teamId) throw new Error("Klarpakke-team finnes ikke");
        const existing = await findLabelId(name);
        if (existing) return { content: [{ type: "text", text: JSON.stringify({ success: true, reused: true, id: existing }) }] };
        const data = await gql(
          `mutation($n: String!, $t: String!){ issueLabelCreate(input: { name: $n, teamId: $t }) { success issueLabel { id name } } }`,
          { n: name, t: teamId },
        );
        writeAudit({ action: "create_label", name });
        return { content: [{ type: "text", text: JSON.stringify(data.issueLabelCreate) }] };
      }

      case "linear_create_issue": {
        const { title, description = "", project, labels = [], priority } = args as {
          title: string;
          description?: string;
          project?: string;
          labels?: string[];
          priority?: number;
        };
        const teamId = await findTeamId();
        if (!teamId) throw new Error("Klarpakke-team finnes ikke");

        // Idempotens: hopp over hvis identisk åpen issue allerede finnes
        const existing = await gql(
          `query($t: String!, $ti: String!){ issues(filter: { team: { id: { eq: $t } }, title: { eq: $ti } }, first: 1) { nodes { id identifier title } } }`,
          { t: teamId, ti: title },
        );
        if (existing.issues.nodes.length > 0) {
          const dup = existing.issues.nodes[0];
          writeAudit({ action: "create_issue_skipped_duplicate", title });
          return { content: [{ type: "text", text: JSON.stringify({ success: true, reused: true, identifier: dup.identifier }) }] };
        }

        const projectId = project ? await findProjectId(project) : null;
        if (project && !projectId) throw new Error(`Prosjekt «${project}» finnes ikke`);

        const labelIds: string[] = [];
        for (const l of labels) {
          const lid = await findLabelId(l);
          if (lid) labelIds.push(lid);
          else throw new Error(`Label «${l}» finnes ikke`);
        }

        const data = await gql(
          `mutation($t: String!, $ti: String!, $d: String!, $p: ID, $l: [ID!], $pr: Float){ issueCreate(input: { teamId: $t, title: $ti, description: $d, projectId: $p, labelIds: $l, priority: $pr }) { success issue { id identifier title url } } }`,
          { t: teamId, ti: title, d: description, p: projectId, l: labelIds.length ? labelIds : null, pr: priority ?? null },
        );
        writeAudit({ action: "create_issue", title });
        return { content: [{ type: "text", text: JSON.stringify(data.issueCreate) }] };
      }

      case "linear_update_issue": {
        const { identifier, title, description, priority, labels } = args as {
          identifier: string;
          title?: string;
          description?: string;
          priority?: number;
          labels?: string[];
        };
        const issueId = await resolveIssueId(identifier);

        const input: Record<string, unknown> = {};
        if (title !== undefined) input.title = title;
        if (description !== undefined) input.description = description;
        if (priority !== undefined) input.priority = priority;
        if (labels !== undefined) {
          const labelIds: string[] = [];
          for (const l of labels) {
            const lid = await findLabelId(l);
            if (lid) labelIds.push(lid);
          }
          input.labelIds = labelIds;
        }

        const data = await gql(
          `mutation($id: String!, $input: IssueUpdateInput!){ issueUpdate(id: $id, input: $input) { success issue { id identifier title } } }`,
          { id: issueId, input },
        );
        writeAudit({ action: "update_issue", identifier, fields: Object.keys(input) });
        return { content: [{ type: "text", text: JSON.stringify(data.issueUpdate) }] };
      }

      case "linear_add_comment": {
        const { identifier, body } = args as { identifier: string; body: string };
        const issueId = await resolveIssueId(identifier);
        const data = await gql(
          `mutation($id: String!, $b: String!){ commentCreate(input: { issueId: $id, body: $b }) { success comment { id } } }`,
          { id: issueId, b: body },
        );
        writeAudit({ action: "add_comment", identifier });
        return { content: [{ type: "text", text: JSON.stringify(data.commentCreate) }] };
      }

      case "linear_transition_issue": {
        const { identifier, state } = args as { identifier: string; state: string };
        const issueId = await resolveIssueId(identifier);

        const workflows = await gql("{ workflows { nodes { states { nodes { id name } } } } }");
        const allStates = workflows.workflows.nodes.flatMap((w: any) => w.states.nodes);
        const stateMatch = allStates.find((s: any) => s.name.toLowerCase() === state.toLowerCase());
        if (!stateMatch) throw new Error(`State «${state}» finnes ikke i workspace-workflows`);

        const data = await gql(
          `mutation($id: String!, $s: String!){ issueUpdate(id: $id, input: { stateId: $s }) { success issue { id identifier state { name } } } }`,
          { id: issueId, s: stateMatch.id },
        );
        writeAudit({ action: "transition_issue", identifier, state });
        return { content: [{ type: "text", text: JSON.stringify(data.issueUpdate) }] };
      }

      case "linear_archive_issue": {
        const { identifier } = args as { identifier: string };
        const issueId = await resolveIssueId(identifier);
        const data = await gql(
          `mutation($id: String!){ issueArchive(id: $id) { success } }`,
          { id: issueId },
        );
        writeAudit({ action: "archive_issue", identifier });
        return { content: [{ type: "text", text: JSON.stringify(data.issueArchive) }] };
      }

      default:
        throw new Error(`Ukjent verktøy: ${name}`);
    }
  } catch (err: any) {
    writeAudit({ action: name, error: err.message });
    return {
      content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
