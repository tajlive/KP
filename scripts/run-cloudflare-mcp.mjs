#!/usr/bin/env node
/**
 * ☁️ Cloudflare MCP Server
 * 
 * Gir tilgang til Cloudflare API for:
 - Zone management (DNS, SSL, caching)
 - Workers & Pages
 - Analytics
 * Load balancing
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load environment variables
function loadEnv() {
  const envPath = resolve(root, '.env.local');
  const env = {};
  if (!existsSync(envPath)) return env;
  
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eq = trimmed.indexOf('=');
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/\\"/g, '"');
        }
        env[key] = value;
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnv();
const TOKEN = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const ZONE_ID = env.CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID;

const BASE_URL = 'https://api.cloudflare.com/client/v4';

// MCP Server implementation
class CloudflareMCP {
  constructor() {
    this.serverInfo = {
      name: 'cloudflare-mcp',
      version: '1.0.0',
      description: 'Cloudflare API MCP Server'
    };
  }

  async api(path, options = {}) {
    if (!TOKEN) {
      throw new Error('CLOUDFLARE_API_TOKEN ikke satt');
    }

    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message || data?.message || res.statusText;
      throw new Error(`Cloudflare API HTTP ${res.status}: ${msg}`);
    }
    
    return data;
  }

  // ===== TOOLS =====

  async listZones() {
    const data = await this.api('/zones');
    return (data.result || []).map(z => ({
      id: z.id,
      name: z.name,
      status: z.status,
      plan: z.plan?.name,
      created: z.created_on
    }));
  }

  async getZoneDetails(zoneId) {
    const data = await this.api(`/zones/${zoneId}`);
    return data.result;
  }

  async listDNSRecords(zoneId) {
    const data = await this.api(`/zones/${zoneId}/dns_records`);
    return (data.result || []).map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: r.ttl,
      proxied: r.proxied
    }));
  }

  async createDNSRecord(zoneId, record) {
    const data = await this.api(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
    return data.result;
  }

  async purgeCache(zoneId, options = { purge_everything: true }) {
    const data = await this.api(`/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return data.result;
  }

  async getAnalytics(zoneId, since, until) {
    const params = new URLSearchParams();
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    
    const data = await this.api(`/zones/${zoneId}/analytics/dashboard?${params}`);
    return data.result;
  }

  async listWorkers() {
    if (!ACCOUNT_ID) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID ikke satt');
    }
    const data = await this.api(`/accounts/${ACCOUNT_ID}/workers/scripts`);
    return data.result || [];
  }

  async listPagesProjects() {
    if (!ACCOUNT_ID) {
      const accounts = await this.api('/accounts');
      const first = accounts.result?.[0]?.id;
      if (!first) throw new Error('Ingen konto funnet');
      
      const data = await this.api(`/accounts/${first}/pages/projects`);
      return (data.result || []).map(p => ({
        name: p.name,
        created: p.created_on,
        subdomain: p.subdomain,
        domains: p.domains
      }));
    }
    
    const data = await this.api(`/accounts/${ACCOUNT_ID}/pages/projects`);
    return (data.result || []).map(p => ({
      name: p.name,
      created: p.created_on,
      subdomain: p.subdomain,
      domains: p.domains
    }));
  }

  async getSSLSettings(zoneId) {
    const data = await this.api(`/zones/${zoneId}/settings/ssl`);
    return data.result;
  }

  async updateSSLSettings(zoneId, value) {
    const data = await this.api(`/zones/${zoneId}/settings/ssl`, {
      method: 'PATCH',
      body: JSON.stringify({ value })
    });
    return data.result;
  }

  // ===== MCP PROTOCOL =====

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'initialize':
        return { serverInfo: this.serverInfo };

      case 'tools/list':
        return {
          tools: [
            {
              name: 'list_zones',
              description: 'List alle Cloudflare zones',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_zone_details',
              description: 'Hent detaljer om en zone',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string', description: 'Zone ID' }
                },
                required: ['zoneId']
              }
            },
            {
              name: 'list_dns_records',
              description: 'List DNS records for en zone',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string', description: 'Zone ID (valgfri hvis CLOUDFLARE_ZONE_ID er satt)' }
                }
              }
            },
            {
              name: 'create_dns_record',
              description: 'Opprett ny DNS record',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' },
                  type: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT'] },
                  name: { type: 'string' },
                  content: { type: 'string' },
                  ttl: { type: 'number' },
                  proxied: { type: 'boolean' }
                },
                required: ['zoneId', 'type', 'name', 'content']
              }
            },
            {
              name: 'purge_cache',
              description: 'Tøm cache for en zone',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' },
                  purge_everything: { type: 'boolean', default: true }
                }
              }
            },
            {
              name: 'get_analytics',
              description: 'Hent analytics for en zone',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' },
                  since: { type: 'string', description: 'ISO 8601 timestamp' },
                  until: { type: 'string', description: 'ISO 8601 timestamp' }
                }
              }
            },
            {
              name: 'list_workers',
              description: 'List Cloudflare Workers',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'list_pages_projects',
              description: 'List Cloudflare Pages prosjekter',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_ssl_settings',
              description: 'Hent SSL innstillinger',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' }
                }
              }
            },
            {
              name: 'update_ssl_settings',
              description: 'Oppdater SSL innstillinger (off, flexible, full, strict)',
              inputSchema: {
                type: 'object',
                properties: {
                  zoneId: { type: 'string' },
                  value: { type: 'string', enum: ['off', 'flexible', 'full', 'strict'] }
                },
                required: ['zoneId', 'value']
              }
            }
          ]
        };

      case 'tools/call':
        const { name, arguments: args } = params;
        const targetZoneId = args.zoneId || ZONE_ID;

        switch (name) {
          case 'list_zones':
            return this.listZones();
          case 'get_zone_details':
            return this.getZoneDetails(args.zoneId);
          case 'list_dns_records':
            return this.listDNSRecords(targetZoneId);
          case 'create_dns_record':
            return this.createDNSRecord(args.zoneId, {
              type: args.type,
              name: args.name,
              content: args.content,
              ttl: args.ttl,
              proxied: args.proxied
            });
          case 'purge_cache':
            return this.purgeCache(targetZoneId, { purge_everything: args.purge_everything !== false });
          case 'get_analytics':
            return this.getAnalytics(targetZoneId, args.since, args.until);
          case 'list_workers':
            return this.listWorkers();
          case 'list_pages_projects':
            return this.listPagesProjects();
          case 'get_ssl_settings':
            return this.getSSLSettings(targetZoneId);
          case 'update_ssl_settings':
            return this.updateSSLSettings(args.zoneId, args.value);
          default:
            throw new Error(`Ukjent tool: ${name}`);
        }

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }
}

// Stdio transport for MCP
const mcp = new CloudflareMCP();

process.stdin.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  let lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const req = JSON.parse(line);
      const result = await mcp.handleRequest(req);
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: err.message }
      }) + '\n');
    }
  }
});

console.error('☁️  Cloudflare MCP Server started');
