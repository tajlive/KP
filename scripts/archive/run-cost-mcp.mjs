#!/usr/bin/env node
/**
 * Cost MCP Server v1.0
 * Kostnadsovervåking: Vercel + Supabase (der API tillater)
 */
import { createInterface } from 'readline';

const serverInfo = { name: 'cost-mcp', version: '1.0.0' };
const initResult = {
  protocolVersion: '2024-11-05',
  capabilities: { tools: {} },
  serverInfo,
};

const tools = [
  {
    name: 'getVercelCost',
    description: 'Hent Vercel usage/bandwidth (krever VERCEL_TOKEN).',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'Vercel team ID (optional)' }
      }
    }
  },
  {
    name: 'getSupabaseCost',
    description: 'Hent Supabase prosjekt-usage (krever SUPABASE_SERVICE_ROLE_KEY).',
    inputSchema: {
      type: 'object',
      properties: {
        projectRef: { type: 'string', description: 'Supabase project ref (default fra URL)' }
      }
    }
  },
  {
    name: 'getMonthlyEstimate',
    description: 'Estimer total månedlig kostnad basert på nåværende usage.',
    inputSchema: { type: 'object', properties: {} }
  }
];

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

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
      if (name === 'getVercelCost') {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Mangler VERCEL_TOKEN' }] } });
          return;
        }
        const team = args.teamId ? `?teamId=${args.teamId}` : '';
        const res = await fetch(`https://api.vercel.com/v1/user/events${team}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const text = `Vercel events: ${JSON.stringify(data, null, 2).slice(0, 1000)}\n\nMerk: Vercel billing API krever enterprise-plan for detaljert cost.`;
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });

      } else if (name === 'getSupabaseCost') {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const ref = args.projectRef || url?.match(/https:\/\/(.*)\.supabase\.co/)?.[1];
        if (!ref) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Kunne ikke finne project ref' }] } });
          return;
        }
        // Supabase har ikke offentlig cost-API; vi kan estimere fra DB-størrelse
        const rpcUrl = `${url}/rest/v1/rpc/exec_sql`;
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ query: `SELECT pg_size_pretty(pg_database_size(current_database())) as db_size, (SELECT count(*) FROM pg_stat_user_tables) as tables` })
        });
        const rows = await res.json();
        const text = `Supabase ${ref}:\nDB-størrelse: ${rows[0]?.db_size || 'N/A'}\nTabeller: ${rows[0]?.tables || 'N/A'}\n\nMerk: Supabase cost-API er begrenset. Sjekk dashboard for detaljer.`;
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });

      } else if (name === 'getMonthlyEstimate') {
        const text = `Månedlig estimate:\n- Vercel Pro: ~$20/mnd (estimat)\n- Supabase Pro: ~$25/mnd (estimat)\n- Binance API: gratis (rate limits)\n\nFor nøyaktig tall: sjekk respektive dashboards.`;
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
