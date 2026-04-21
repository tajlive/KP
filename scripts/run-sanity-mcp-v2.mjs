#!/usr/bin/env node
/**
 * Sanity MCP Server v2 — Read + Write via @sanity/client
 * Integrates with KIMI CLI as an MCP server over stdio.
 *
 * Features:
 *   - 8 MCP tools: query, get, create, update, patch, delete, publish, unpublish
 *   - Uses @sanity/client for reliable token auth (works with studio tokens)
 *   - Auto-detects read vs write token availability
 *   - Graceful fallbacks: returns empty arrays/objects on auth errors
 *
 * Setup:
 *   SANITY_API_READ_TOKEN  — API token with read access (from sanity.io/manage → API)
 *   SANITY_API_WRITE_TOKEN — API token with write access (from sanity.io/manage → API)
 *
 *   If tokens are missing/invalid, the server starts but tools return auth errors
 *   with a clear message telling you how to generate tokens.
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "fs";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = new URL("../.env.local", import.meta.url).pathname;
const envRaw = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

// ── Config ───────────────────────────────────────────────────────────────────
const PROJECT_ID = env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET    = env.NEXT_PUBLIC_SANITY_DATASET    || "production";
const API_VERSION= env.NEXT_PUBLIC_SANITY_API_VERSION|| "2024-04-07";
const READ_TOKEN = env.SANITY_API_READ_TOKEN;
const WRITE_TOKEN= env.SANITY_API_WRITE_TOKEN;

const AUTH_HELP =
  "Token invalid or missing. Generate API tokens at: https://www.sanity.io/manage/project/63qn23si/api → 'Tokens' → Add API token (Editor role for write, Viewer for read).";

// ── Clients ──────────────────────────────────────────────────────────────────
const readClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: false,
  token: READ_TOKEN,
});

const writeClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: false,
  token: WRITE_TOKEN || READ_TOKEN,
});

// ── Helper: handle auth errors ───────────────────────────────────────────────
function handleError(e, action) {
  if (e.statusCode === 401) {
    return {
      content: [{
        type: "text",
        text: `Sanity API 401: Unauthorized (${action}).\n${AUTH_HELP}`,
      }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text", text: `Sanity API ${e.statusCode || "error"}: ${e.message} (${action})` }],
    isError: true,
  };
}

// ── MCP Protocol ─────────────────────────────────────────────────────────────
const serverInfo = {
  name: "sanity-mcp-v2",
  version: "2.0.0",
  description: "Sanity CMS read + write via @sanity/client",
  protocolVersion: "2024-11-05",
  capabilities: { tools: {} },
};

const tools = [
  {
    name: "sanity_query",
    description: "Run a GROQ query against the Sanity dataset",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "GROQ query string" },
        params: { type: "object", description: "Optional GROQ parameters" },
      },
      required: ["query"],
    },
  },
  {
    name: "sanity_get_document",
    description: "Get a single Sanity document by _id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Document _id" },
      },
      required: ["id"],
    },
  },
  {
    name: "sanity_get_documents_by_type",
    description: "List all documents of a given _type",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Schema _type (e.g. 'faq', 'testimonial')" },
      },
      required: ["type"],
    },
  },
  {
    name: "sanity_create_document",
    description: "Create a new Sanity document",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Document _type" },
        data: { type: "object", description: "Document fields (no _id needed)" },
      },
      required: ["type", "data"],
    },
  },
  {
    name: "sanity_update_document",
    description: "Replace an entire document by _id",
    inputSchema: {
      type: "object",
      properties: {
        id:   { type: "string", description: "Document _id" },
        type: { type: "string", description: "Document _type" },
        data: { type: "object", description: "Full replacement document" },
      },
      required: ["id", "type", "data"],
    },
  },
  {
    name: "sanity_patch_document",
    description: "Partially update a document (set, unset, append, prepend)",
    inputSchema: {
      type: "object",
      properties: {
        id:     { type: "string", description: "Document _id" },
        set:    { type: "object", description: "Fields to set/overwrite" },
        unset:  { type: "array",  description: "Field paths to unset", items: { type: "string" } },
        append: { type: "object", description: "Array fields → values to append" },
        prepend:{ type: "object", description: "Array fields → values to prepend" },
      },
      required: ["id"],
    },
  },
  {
    name: "sanity_delete_document",
    description: "Delete a document by _id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Document _id" },
      },
      required: ["id"],
    },
  },
  {
    name: "sanity_publish_document",
    description: "Publish a draft document (removes _id prefix 'drafts.')",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Draft document _id (e.g. drafts.xyz123)" },
      },
      required: ["id"],
    },
  },
  {
    name: "sanity_unpublish_document",
    description: "Unpublish a document (creates draft, removes published)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Published document _id" },
      },
      required: ["id"],
    },
  },
];

// ── Tool handlers ────────────────────────────────────────────────────────────
const handlers = {
  async sanity_query({ query, params = {} }) {
    try {
      const docs = await readClient.fetch(query, params);
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
    } catch (e) { return handleError(e, "query"); }
  },

  async sanity_get_document({ id }) {
    try {
      const doc = await readClient.getDocument(id);
      if (!doc) return { content: [{ type: "text", text: `Document ${id} not found.` }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(doc, null, 2) }] };
    } catch (e) { return handleError(e, "getDocument"); }
  },

  async sanity_get_documents_by_type({ type }) {
    try {
      const docs = await readClient.fetch(`*[_type == $type]`, { type });
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
    } catch (e) { return handleError(e, "getDocumentsByType"); }
  },

  async sanity_create_document({ type, data }) {
    try {
      const doc = await writeClient.create({ _type: type, ...data });
      return { content: [{ type: "text", text: `Created: ${doc._id}\n${JSON.stringify(doc, null, 2)}` }] };
    } catch (e) { return handleError(e, "createDocument"); }
  },

  async sanity_update_document({ id, type, data }) {
    try {
      const doc = await writeClient.createOrReplace({ _id: id, _type: type, ...data });
      return { content: [{ type: "text", text: `Updated: ${doc._id}\n${JSON.stringify(doc, null, 2)}` }] };
    } catch (e) { return handleError(e, "updateDocument"); }
  },

  async sanity_patch_document({ id, set, unset, append, prepend }) {
    try {
      let patch = writeClient.patch(id);
      if (set)     patch = patch.set(set);
      if (unset)   patch = patch.unset(unset);
      if (append)  Object.entries(append).forEach(([k, v]) => { patch = patch.append(k, v); });
      if (prepend) Object.entries(prepend).forEach(([k, v]) => { patch = patch.prepend(k, v); });
      const doc = await patch.commit();
      return { content: [{ type: "text", text: `Patched: ${doc._id}\n${JSON.stringify(doc, null, 2)}` }] };
    } catch (e) { return handleError(e, "patchDocument"); }
  },

  async sanity_delete_document({ id }) {
    try {
      await writeClient.delete(id);
      return { content: [{ type: "text", text: `Deleted: ${id}` }] };
    } catch (e) { return handleError(e, "deleteDocument"); }
  },

  async sanity_publish_document({ id }) {
    try {
      const doc = await writeClient.fetch(`*[_id == $id][0]`, { id });
      if (!doc) return { content: [{ type: "text", text: `Draft ${id} not found.` }], isError: true };
      const published = await writeClient.createOrReplace({ ...doc, _id: doc._id.replace("drafts.", "") });
      await writeClient.delete(id);
      return { content: [{ type: "text", text: `Published: ${published._id}` }] };
    } catch (e) { return handleError(e, "publishDocument"); }
  },

  async sanity_unpublish_document({ id }) {
    try {
      const doc = await writeClient.fetch(`*[_id == $id][0]`, { id });
      if (!doc) return { content: [{ type: "text", text: `Document ${id} not found.` }], isError: true };
      const draft = await writeClient.createOrReplace({ ...doc, _id: `drafts.${id}` });
      await writeClient.delete(id);
      return { content: [{ type: "text", text: `Unpublished (draft): ${draft._id}` }] };
    } catch (e) { return handleError(e, "unpublishDocument"); }
  },
};

// ── Stdio transport ──────────────────────────────────────────────────────────
const { stdin, stdout } = process;
stdin.setEncoding("utf-8");

let buffer = "";
stdin.on("data", (chunk) => {
  buffer += chunk;
  let delim;
  while ((delim = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, delim).trim();
    buffer = buffer.slice(delim + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      stderrLog("Parse error: " + e.message + " | raw: " + line.slice(0, 200));
    }
  }
});

function stderrLog(msg) {
  process.stderr.write(`[sanity-mcp] ${msg}\n`);
}

function send(msg) {
  const json = JSON.stringify(msg);
  stdout.write(json + "\n");
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: serverInfo });
    return;
  }

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools } });
    return;
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};
    const handler = handlers[toolName];
    if (!handler) {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
      return;
    }
    handler(args).then((result) => {
      send({ jsonrpc: "2.0", id, result });
    }).catch((e) => {
      send({ jsonrpc: "2.0", id, error: { code: -32000, message: e.message } });
    });
    return;
  }

  // Unknown method
  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

// ── Boot log ─────────────────────────────────────────────────────────────────
stderrLog(`Booting Sanity MCP v2 (@sanity/client)`);
stderrLog(`  Project: ${PROJECT_ID}`);
stderrLog(`  Dataset: ${DATASET}`);
stderrLog(`  API Version: ${API_VERSION}`);
stderrLog(`  Read Token:  ${READ_TOKEN ? "★★★" : "MISSING"}`);
stderrLog(`  Write Token: ${WRITE_TOKEN ? "★★★" : "MISSING"}`);
stderrLog(`  ${!READ_TOKEN && !WRITE_TOKEN ? "WARNING: No tokens configured — tools will return auth errors" : "Ready"}`);
