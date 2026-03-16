#!/usr/bin/env node
/**
 * Linear API CLI – full tilgang med nøkkel fra .env.local.
 * Bruk når MCP ikke er tilgjengelig eller for scripting.
 *
 * Eksempel:
 *   node scripts/linear-api.mjs teams
 *   node scripts/linear-api.mjs issues
 *   node scripts/linear-api.mjs create "Tittel" "Beskrivelse" [teamId]
 *   node scripts/linear-api.mjs update <issueId> --status "Done"
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
        env[key] = value;
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnv();
const LINEAR_API_KEY = env.LINEAR_API_KEY || process.env.LINEAR_API_KEY;
const LINEAR_API_URL = "https://api.linear.app/graphql";

async function graphql(query, variables = {}) {
  if (!LINEAR_API_KEY) {
    throw new Error("LINEAR_API_KEY mangler. Legg den i .env.local eller export LINEAR_API_KEY.");
  }
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || json.message || res.statusText;
    throw new Error(`Linear API HTTP ${res.status}: ${msg}`);
  }
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

async function teams() {
  const data = await graphql(`
    query { teams { nodes { id name key } } }
  `);
  console.log(JSON.stringify(data.teams.nodes, null, 2));
  return data.teams.nodes;
}

async function issues(limit = 20) {
  const data = await graphql(
    `
    query Issues($first: Int!) {
      issues(first: $first, orderBy: updatedAt) {
        nodes {
          id identifier title state { name } url
        }
      }
    }
  `,
    { first: limit }
  );
  console.log(JSON.stringify(data.issues.nodes, null, 2));
  return data.issues.nodes;
}

async function createIssue(title, description = "", teamId) {
  let tid = teamId;
  if (!tid) {
    const data = await graphql(`query { teams { nodes { id name } } }`);
    const teams = data.teams?.nodes || [];
    if (teams.length === 0) throw new Error("Ingen team funnet. Angi teamId.");
    tid = teams[0].id;
  }
  const data = await graphql(
    `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }
  `,
    {
      input: {
        teamId: tid,
        title,
        description: description || undefined,
      },
    }
  );
  if (!data.issueCreate?.success) throw new Error("issueCreate feilet");
  console.log(JSON.stringify(data.issueCreate.issue, null, 2));
  return data.issueCreate.issue;
}

async function workflowStates(teamId) {
  if (!teamId) return [];
  const data = await graphql(
    `
    query WorkflowStates($teamId: ID!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }, first: 50) {
        nodes { id name }
      }
    }
  `,
    { teamId }
  );
  return data.workflowStates?.nodes || [];
}

async function getIssue(issueId) {
  const data = await graphql(
    `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id identifier team { id } state { id name }
      }
    }
  `,
    { id: issueId }
  );
  return data.issue;
}

async function updateIssue(issueId, opts) {
  const input = {};
  if (opts.status) {
    if (/^[0-9a-f-]{36}$/i.test(opts.status)) {
      input.stateId = opts.status;
    } else {
      const issue = await getIssue(issueId);
      const teamId = issue?.team?.id;
      const states = await workflowStates(teamId);
      const found = states.find((s) => s.name.toLowerCase() === opts.status.toLowerCase());
      if (found) input.stateId = found.id;
      else throw new Error(`Status '${opts.status}' ikke funnet. Bruk stateId (UUID) eller nøyaktig statusnavn.`);
    }
  }
  if (opts.title) input.title = opts.title;
  if (opts.description !== undefined) input.description = opts.description;
  const data = await graphql(
    `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier title state { name } url }
      }
    }
  `,
    { id: issueId, input }
  );
  if (!data.issueUpdate?.success) throw new Error("issueUpdate feilet");
  console.log(JSON.stringify(data.issueUpdate.issue, null, 2));
  return data.issueUpdate.issue;
}

const [,, cmd, ...rest] = process.argv;

async function main() {
  try {
    if (cmd === "teams") {
      await teams();
    } else if (cmd === "issues") {
      await issues(rest[0] ? parseInt(rest[0], 10) : 20);
    } else if (cmd === "create") {
      const [title, desc, teamId] = rest;
      if (!title) throw new Error("Bruk: linear-api.mjs create \"Tittel\" [Beskrivelse] [teamId]");
      await createIssue(title, desc, teamId);
    } else if (cmd === "update") {
      let id = rest[0];
      if (!id) throw new Error("Bruk: linear-api.mjs update <issueId|KLA-XXX> [--status Done] [--title \"...\"]");
      if (/^KLA-\d+$/i.test(id)) {
        const list = await graphql(
          `query FindIssue($first: Int!) {
            issues(first: $first, orderBy: updatedAt) {
              nodes { id identifier }
            }
          }`,
          { first: 200 }
        );
        const node = (list.issues?.nodes || []).find((n) => n.identifier === id);
        if (!node) throw new Error(`Issue ${id} ikke funnet.`);
        id = node.id;
      }
      const opts = {};
      for (let i = 1; i < rest.length; i++) {
        if (rest[i] === "--status" && rest[i + 1]) opts.status = rest[++i];
        else if (rest[i] === "--title" && rest[i + 1]) opts.title = rest[++i];
        else if (rest[i] === "--description" && rest[i + 1]) opts.description = rest[++i];
      }
      await updateIssue(id, opts);
    } else {
      console.log(`Bruk: node scripts/linear-api.mjs <teams|issues|create|update> ...`);
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
