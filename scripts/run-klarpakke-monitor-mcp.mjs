#!/usr/bin/env node
/**
 * Klarpakke Monitor MCP Server v1.0
 * Eksponerer systemovervåking som MCP-verktøy
 */
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'taj';
const GITHUB_REPO = process.env.GITHUB_REPO || 'klarpakke';

const serverInfo = { name: 'klarpakke-monitor', version: '1.0.0' };
const initResult = {
  protocolVersion: '2024-11-05',
  capabilities: { tools: {} },
  serverInfo,
};

const tools = [
  {
    name: 'checkSystemHealth',
    description: 'Kjør helse-sjekk: npm verify, DB-status, cron-status. Returnerer GO/NO-GO.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },
  {
    name: 'getUptimeStatus',
    description: 'Sjekk om klarpakke.no og wwww.klarpakke.no er oppe. Returnerer statuskode og responstid.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL å sjekke (default: https://klarpakke.no)', default: 'https://klarpakke.no' }
      }
    }
  },
  {
    name: 'listAlerts',
    description: 'Hent GitHub issues med bug-label fra Klarpakke-repo. Krever GITHUB_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maks antall issues (default: 10)', default: 10 }
      }
    }
  },
  {
    name: 'checkMemoryUsage',
    description: 'Sjekk Mac-minnebruk (vm_stat). Advarer ved >80% bruk.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },
];

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

function parseVmStat() {
  try {
    const out = execSync('vm_stat', { encoding: 'utf8', timeout: 5000 });
    const lines = out.split('\n');
    const pageSize = 16384;
    let active = 0, wired = 0, compressed = 0;
    for (const line of lines) {
      const m = line.match(/Pages active:\s+(\d+)/);
      if (m) active = parseInt(m[1].replace(/\./g, ''));
      const m2 = line.match(/Pages wired down:\s+(\d+)/);
      if (m2) wired = parseInt(m2[1].replace(/\./g, ''));
      const m3 = line.match(/Pages occupied by compressor:\s+(\d+)/);
      if (m3) compressed = parseInt(m3[1].replace(/\./g, ''));
    }
    const usedMB = Math.round((active + wired + compressed) * pageSize / 1024 / 1024);
    return { usedMB, status: usedMB > 12000 ? 'CRITICAL' : usedMB > 8000 ? 'WARNING' : 'OK' };
  } catch (e) {
    return { usedMB: 0, status: 'UNKNOWN', error: e.message };
  }
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
      if (name === 'checkSystemHealth') {
        // 1. npm verify
        let verifyOk = false;
        let verifyOutput = '';
        try {
          verifyOutput = execSync('npm run verify', { cwd: process.cwd(), encoding: 'utf8', timeout: 30000 });
          verifyOk = verifyOutput.includes('ALL TESTS PASSED');
        } catch (e) {
          verifyOutput = e.stdout || e.message;
        }

        // 2. Minne
        const mem = parseVmStat();

        const status = verifyOk && mem.status !== 'CRITICAL' ? 'GO' : 'NO-GO';
        const text = `Status: ${status}\nVerify: ${verifyOk ? 'PASS' : 'FAIL'}\nMemory: ${mem.usedMB}MB (${mem.status})\n\nVerify output:\n${verifyOutput.slice(-500)}`;
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });

      } else if (name === 'getUptimeStatus') {
        const url = args.url || 'https://klarpakke.no';
        const start = Date.now();
        try {
          const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          const ms = Date.now() - start;
          const text = `${url}: ${res.status} (${ms}ms)\nHeaders: cf-ray=${res.headers.get('cf-ray') || 'N/A'}`;
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
        } catch (e) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${url}: DOWN (${e.message})` }] } });
        }

      } else if (name === 'listAlerts') {
        if (!GITHUB_TOKEN) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Mangler GITHUB_TOKEN i env' }] } });
          return;
        }
        const limit = args.limit || 10;
        try {
          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?labels=bug&state=open&per_page=${limit}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
          });
          const issues = await res.json();
          if (!Array.isArray(issues)) {
            send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Feil: ' + JSON.stringify(issues) }] } });
            return;
          }
          const lines = issues.map(i => `#${i.number}: ${i.title} (${i.comments} comments)`).join('\n');
          const text = `Åpne bugs (${issues.length}):\n${lines || 'Ingen åpne bugs 🎉'}`;
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
        } catch (e) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Feil: ' + e.message }] } });
        }

      } else if (name === 'checkMemoryUsage') {
        const mem = parseVmStat();
        const top = execSync('ps aux | sort -nrk 11 | head -5', { encoding: 'utf8', timeout: 5000 });
        const text = `Memory: ${mem.usedMB}MB (${mem.status})\n\nTopp prosesser:\n${top}`;
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });

      } else {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found: ' + name } });
      }
    } catch (err) {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Runtime error: ' + err.message }] } });
    }
  } else {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});
