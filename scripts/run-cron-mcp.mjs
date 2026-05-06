#!/usr/bin/env node
/**
 * Cron MCP Server v1.0
 * Styring av pg_cron jobs via Supabase SQL
 */
import { createInterface } from 'readline';

const serverInfo = { name: 'cron-mcp', version: '1.0.0' };
const initResult = {
  protocolVersion: '2024-11-05',
  capabilities: { tools: {} },
  serverInfo,
};

const tools = [
  {
    name: 'listCronJobs',
    description: 'List alle aktive pg_cron jobs i Supabase.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'toggleCronJob',
    description: 'Slå av eller på en pg_cron job.',
    inputSchema: {
      type: 'object',
      properties: {
        jobname: { type: 'string', description: 'Navn på jobben (f.eks. klarpakke-prices)' },
        active: { type: 'boolean', description: 'true = aktiv, false = inaktiv' }
      },
      required: ['jobname', 'active']
    }
  },
  {
    name: 'getCronLogs',
    description: 'Hent siste HTTP-responser fra pg_cron (net._http_response).',
    inputSchema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Timer tilbake (default: 2)', default: 2 }
      }
    }
  }
];

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

async function execSql(query) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
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
      if (name === 'listCronJobs') {
        const rows = await execSql(`SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'klarpakke-%' ORDER BY jobname`);
        const text = rows.length ? rows.map(r => `${r.jobname}: ${r.schedule} [${r.active ? 'AKTIV' : 'INAKTIV'}]`).join('\n') : 'Ingen klarpakke-cron jobs funnet.';
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } else if (name === 'toggleCronJob') {
        await execSql(`UPDATE cron.job SET active = ${args.active ? 'true' : 'false'} WHERE jobname = '${args.jobname.replace(/'/g, "''")}'`);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${args.jobname} satt til ${args.active ? 'AKTIV' : 'INAKTIV'}` }] } });
      } else if (name === 'getCronLogs') {
        const hours = args.hours || 2;
        const rows = await execSql(`SELECT status_code, count(*) as cnt FROM net._http_response WHERE created > NOW() - INTERVAL '${hours} hours' GROUP BY status_code ORDER BY cnt DESC`);
        const text = rows.length ? rows.map(r => `HTTP ${r.status_code}: ${r.cnt} ganger`).join('\n') : `Ingen cron-responser siste ${hours} timer.`;
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
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
