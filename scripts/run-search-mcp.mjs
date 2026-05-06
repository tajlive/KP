#!/usr/bin/env node
/**
 * Search MCP Server v1.0
 * Avansert søk i trades/users via Supabase
 */
import { createInterface } from 'readline';

const serverInfo = { name: 'search-mcp', version: '1.0.0' };
const initResult = {
  protocolVersion: '2024-11-05',
  capabilities: { tools: {} },
  serverInfo,
};

const tools = [
  {
    name: 'searchTrades',
    description: 'Søk i trades etter symbol, session_id, eller outcome.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Trading pair (f.eks. BTCUSDT)' },
        session_id: { type: 'string', description: 'Session UUID' },
        limit: { type: 'number', default: 20 }
      }
    }
  },
  {
    name: 'searchUsers',
    description: 'Søk i users etter email eller navn.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Søkestreng' },
        limit: { type: 'number', default: 20 }
      },
      required: ['query']
    }
  },
  {
    name: 'globalSearch',
    description: 'Søk i trades og users samtidig.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Søkestreng' },
        limit: { type: 'number', default: 10 }
      },
      required: ['query']
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
      if (name === 'searchTrades') {
        let where = '1=1';
        if (args.symbol) where += ` AND symbol ILIKE '%${args.symbol.replace(/'/g, "''")}%'`;
        if (args.session_id) where += ` AND session_id = '${args.session_id.replace(/'/g, "''")}'`;
        const rows = await execSql(`SELECT id, symbol, action, entry_price, exit_price, pnl, created_at FROM trades WHERE ${where} ORDER BY created_at DESC LIMIT ${Math.min(args.limit || 20, 100)}`);
        const text = rows.length ? rows.map(r => `${r.symbol} ${r.action}: ${r.pnl || 0} @ ${r.created_at?.slice(0,10)}`).join('\n') : 'Ingen trades funnet.';
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } else if (name === 'searchUsers') {
        const q = args.query.replace(/'/g, "''");
        const rows = await execSql(`SELECT id, email, full_name, role, created_at FROM profiles WHERE email ILIKE '%${q}%' OR full_name ILIKE '%${q}%' ORDER BY created_at DESC LIMIT ${Math.min(args.limit || 20, 100)}`);
        const text = rows.length ? rows.map(r => `${r.email} (${r.full_name || 'Ukjent'}) — ${r.role} @ ${r.created_at?.slice(0,10)}`).join('\n') : 'Ingen brukere funnet.';
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } else if (name === 'globalSearch') {
        const q = args.query.replace(/'/g, "''");
        const limit = Math.min(args.limit || 10, 50);
        const trades = await execSql(`SELECT 'trade' as type, id, symbol, action, pnl, created_at FROM trades WHERE symbol ILIKE '%${q}%' LIMIT ${limit}`);
        const users = await execSql(`SELECT 'user' as type, id, email, full_name, role, created_at FROM profiles WHERE email ILIKE '%${q}%' OR full_name ILIKE '%${q}%' LIMIT ${limit}`);
        const all = [...trades, ...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
        const text = all.length ? all.map(r => `[${r.type.toUpperCase()}] ${r.symbol || r.email} — ${r.created_at?.slice(0,10)}`).join('\n') : 'Ingen treff.';
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
