#!/usr/bin/env node
/**
 * Feature Flag MCP Server v1.0
 * DB-baserte feature flags via Supabase
 */
import { createInterface } from 'readline';

const serverInfo = { name: 'featureflag-mcp', version: '1.0.0' };
const initResult = {
  protocolVersion: '2024-11-05',
  capabilities: { tools: {} },
  serverInfo,
};

const tools = [
  {
    name: 'listFlags',
    description: 'List alle feature flags.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'toggleFlag',
    description: 'Slå av/på en feature flag.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Flag-nøkkel' },
        enabled: { type: 'boolean', description: 'true/false' }
      },
      required: ['key', 'enabled']
    }
  },
  {
    name: 'createFlag',
    description: 'Opprett ny feature flag (hvis tabellen finnes).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Unik nøkkel' },
        description: { type: 'string', description: 'Beskrivelse' },
        enabled: { type: 'boolean', default: false }
      },
      required: ['key']
    }
  }
];

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

async function supabaseRpc(functionName, args = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/' + functionName;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function execSql(query) {
  return supabaseRpc('exec_sql', { query });
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;

  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: initResult });
  } else if (method === 'notifications/initialized') {
    // no-op
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools } });
  } else if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      if (name === 'listFlags') {
        const rows = await execSql(`SELECT key, enabled, description, updated_at FROM feature_flags ORDER BY key`);
        const text = rows.length ? rows.map(r => `${r.key}: ${r.enabled ? 'ON' : 'OFF'} — ${r.description || ''}`).join('\n') : 'Ingen feature flags. Tabellen finnes kanskje ikke ennå.';
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } else if (name === 'toggleFlag') {
        await execSql(`UPDATE feature_flags SET enabled = ${args.enabled}, updated_at = NOW() WHERE key = '${args.key.replace(/'/g, "''")}'`);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${args.key} → ${args.enabled ? 'ON' : 'OFF'}` }] } });
      } else if (name === 'createFlag') {
        await execSql(`INSERT INTO feature_flags (key, description, enabled) VALUES ('${args.key.replace(/'/g, "''")}', '${(args.description || '').replace(/'/g, "''")}', ${args.enabled ?? false}) ON CONFLICT (key) DO NOTHING`);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Flag '${args.key}' opprettet` }] } });
      } else {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found: ' + name } });
      }
    } catch (err) {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Feil: ' + err.message }] } });
    }
  } else {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});
